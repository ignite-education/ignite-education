import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { render } from '@react-email/render';
import React from 'react';
import axios from 'axios';
import NodeCache from 'node-cache';
import cron from 'node-cron';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Stripe (optional - only if key is provided)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Initialize Supabase (for updating user metadata)
// Using service role key to have admin permissions for updating user metadata
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ FATAL: SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Initialize Resend (optional) - will be loaded dynamically when needed
let resend = null;

// Initialize LinkedIn posts cache with 24-hour TTL
const linkedInCache = new NodeCache({ stdTTL: 24 * 60 * 60 }); // 24 hours in seconds
const LINKEDIN_CACHE_KEY = 'linkedin_posts';

// ============================================================================
// EMAIL UNSUBSCRIBE HELPERS
// ============================================================================

// Secret key for signing unsubscribe tokens (use env var in production)
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || crypto.randomBytes(32).toString('hex');

// Generate a secure unsubscribe token for a user
function generateUnsubscribeToken(userId) {
  const payload = {
    userId,
    exp: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year expiry
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

// Verify and decode an unsubscribe token
function verifyUnsubscribeToken(token) {
  try {
    const [data, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) {
      return null; // Token expired
    }
    return payload;
  } catch {
    return null;
  }
}

// Define which email types are marketing (respect preference) vs transactional (always send)
const MARKETING_EMAIL_TYPES = ['inactivity_reminder', 'promotional'];

// Base URL for the API (use env var in production)
const API_BASE_URL = process.env.API_BASE_URL || 'https://ignite.education';

app.use(cors());

// Stripe webhook endpoint MUST come before express.json() to receive raw body for signature verification
app.post('/api/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  console.log('\n🔔 ============ WEBHOOK RECEIVED ============');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📍 Headers:', JSON.stringify(req.headers, null, 2));

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature for security
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      console.log('🔐 Verifying webhook signature...');
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook signature verified successfully');
    } else {
      // Fallback for development (not recommended for production)
      console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - skipping signature verification');
      event = JSON.parse(req.body.toString());
    }

    console.log('📨 Event type:', event.type);
    console.log('📦 Event ID:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification FAILED');
    console.error('❌ Error:', err.message);
    console.error('❌ Stack:', err.stack);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    console.log('\n💳 ============ PAYMENT COMPLETED ============');
    console.log('💰 Session ID:', session.id);
    console.log('👤 User ID from metadata:', userId);
    console.log('📄 Full session data:', JSON.stringify(session, null, 2));

    if (!userId) {
      console.error('❌ ERROR: No userId found in session metadata!');
      console.error('❌ Metadata received:', JSON.stringify(session.metadata, null, 2));
      return res.status(400).json({ error: 'Missing userId in metadata' });
    }

    try {
      console.log('🔄 Attempting to update user in Supabase...');
      console.log('🔄 User ID:', userId);
      console.log('🔄 Setting is_ad_free: true');

      const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: { 
            is_ad_free: true,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active'
          }
        }
      );

      if (error) {
        console.error('❌ Supabase update FAILED');
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ ============ USER UPDATED SUCCESSFULLY ============');
      console.log('✅ User ID:', userId);
      console.log('✅ Updated data:', JSON.stringify(data, null, 2));
      console.log('✅ User is now ad-free!\n');

      // Send subscription confirmation email
      try {
        const response = await fetch(`http://localhost:${PORT}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'subscription_confirm', userId })
        });
        if (response.ok) {
          console.log('📧 Subscription confirmation email sent');
        } else {
          console.error('❌ Failed to send subscription confirmation email');
        }
      } catch (emailErr) {
        console.error('❌ Error sending subscription confirmation email:', emailErr.message);
      }

      // Sync to Resend - move from PM Free to PM Paid
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;

        if (userEmail && process.env.RESEND_AUDIENCE_PM_FREE && process.env.RESEND_AUDIENCE_PM_PAID) {
          if (!resend) {
            const { Resend } = await import('resend');
            resend = new Resend(process.env.RESEND_API_KEY);
          }

          // Remove from PM Free
          try {
            await resend.contacts.remove({
              audienceId: process.env.RESEND_AUDIENCE_PM_FREE,
              email: userEmail
            });
            console.log(`📋 Removed ${userEmail} from PM Free audience`);
          } catch (removeErr) {
            console.log(`📋 Note: ${userEmail} may not have been in PM Free audience`);
          }

          // Add to PM Paid
          await resend.contacts.create({
            email: userEmail,
            firstName: userData?.user?.user_metadata?.first_name || '',
            lastName: userData?.user?.user_metadata?.last_name || '',
            unsubscribed: false,
            audienceId: process.env.RESEND_AUDIENCE_PM_PAID
          });
          console.log(`📋 Added ${userEmail} to PM Paid audience`);
        }
      } catch (audienceErr) {
        console.error('❌ Error syncing Resend audience on subscription start:', audienceErr.message);
        // Don't fail the webhook - audience sync is non-critical
      }

    } catch (error) {
      console.error('❌ Exception during Supabase update');
      console.error('❌ Error:', error.message);
      console.error('❌ Stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    console.log('\n🚫 ============ SUBSCRIPTION CANCELED ============');
    console.log('🔑 Subscription ID:', subscription.id);
    console.log('👤 Customer ID:', customerId);

    try {
      // Find user by stripe_customer_id
      console.log('🔍 Finding user with customer ID:', customerId);
      
      // Query all users to find the one with this customer_id
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        return res.status(500).json({ error: listError.message });
      }

      const user = users.find(u => u.user_metadata?.stripe_customer_id === customerId);

      if (!user) {
        console.error('❌ No user found with customer ID:', customerId);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('✅ Found user:', user.id);
      console.log('🔄 Setting is_ad_free: false');

      // Update user to remove ad-free status
      const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            is_ad_free: false,
            subscription_status: 'canceled'
          }
        }
      );

      if (error) {
        console.error('❌ Failed to update user:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ ============ SUBSCRIPTION CANCELED SUCCESSFULLY ============');
      console.log('✅ User ID:', user.id);
      console.log('✅ User is now on free plan\n');

      // Send subscription cancelled email
      try {
        const response = await fetch(`http://localhost:${PORT}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'subscription_cancelled', userId: user.id })
        });
        if (response.ok) {
          console.log('📧 Subscription cancelled email sent');
        } else {
          console.error('❌ Failed to send subscription cancelled email');
        }
      } catch (emailErr) {
        console.error('❌ Error sending subscription cancelled email:', emailErr.message);
      }

      // Sync to Resend - move from PM Paid back to PM Free
      try {
        const userEmail = user.email;

        if (userEmail && process.env.RESEND_AUDIENCE_PM_FREE && process.env.RESEND_AUDIENCE_PM_PAID) {
          if (!resend) {
            const { Resend } = await import('resend');
            resend = new Resend(process.env.RESEND_API_KEY);
          }

          // Remove from PM Paid
          try {
            await resend.contacts.remove({
              audienceId: process.env.RESEND_AUDIENCE_PM_PAID,
              email: userEmail
            });
            console.log(`📋 Removed ${userEmail} from PM Paid audience`);
          } catch (removeErr) {
            console.log(`📋 Note: ${userEmail} may not have been in PM Paid audience`);
          }

          // Add to PM Free
          await resend.contacts.create({
            email: userEmail,
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
            unsubscribed: false,
            audienceId: process.env.RESEND_AUDIENCE_PM_FREE
          });
          console.log(`📋 Added ${userEmail} to PM Free audience`);
        }
      } catch (audienceErr) {
        console.error('❌ Error syncing Resend audience on subscription cancel:', audienceErr.message);
      }

    } catch (error) {
      console.error('❌ Exception during subscription cancellation');
      console.error('❌ Error:', error.message);
      console.error('❌ Stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const status = subscription.status;

    console.log('\n🔄 ============ SUBSCRIPTION UPDATED ============');
    console.log('🔑 Subscription ID:', subscription.id);
    console.log('👤 Customer ID:', customerId);
    console.log('📊 Status:', status);

    try {
      // Find user by stripe_customer_id
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        return res.status(500).json({ error: listError.message });
      }

      const user = users.find(u => u.user_metadata?.stripe_customer_id === customerId);

      if (!user) {
        console.error('❌ No user found with customer ID:', customerId);
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine if user should be ad-free based on subscription status
      const isAdFree = ['active', 'trialing'].includes(status);

      console.log('🔄 Updating user status. is_ad_free:', isAdFree, 'subscription_status:', status);

      const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            is_ad_free: isAdFree,
            subscription_status: status
          }
        }
      );

      if (error) {
        console.error('❌ Failed to update user:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ ============ SUBSCRIPTION UPDATED SUCCESSFULLY ============');
      console.log('✅ User ID:', user.id);
      console.log('✅ New status:', status, '\n');

      // Sync to Resend based on subscription status change
      try {
        const userEmail = user.email;

        if (userEmail && process.env.RESEND_AUDIENCE_PM_FREE && process.env.RESEND_AUDIENCE_PM_PAID) {
          if (!resend) {
            const { Resend } = await import('resend');
            resend = new Resend(process.env.RESEND_API_KEY);
          }

          if (isAdFree) {
            // Subscription became active - move to PM Paid
            try {
              await resend.contacts.remove({
                audienceId: process.env.RESEND_AUDIENCE_PM_FREE,
                email: userEmail
              });
            } catch (e) { /* Ignore */ }

            await resend.contacts.create({
              email: userEmail,
              firstName: user.user_metadata?.first_name || '',
              lastName: user.user_metadata?.last_name || '',
              unsubscribed: false,
              audienceId: process.env.RESEND_AUDIENCE_PM_PAID
            });
            console.log(`📋 Moved ${userEmail} to PM Paid audience`);
          } else {
            // Subscription became inactive - move to PM Free
            try {
              await resend.contacts.remove({
                audienceId: process.env.RESEND_AUDIENCE_PM_PAID,
                email: userEmail
              });
            } catch (e) { /* Ignore */ }

            await resend.contacts.create({
              email: userEmail,
              firstName: user.user_metadata?.first_name || '',
              lastName: user.user_metadata?.last_name || '',
              unsubscribed: false,
              audienceId: process.env.RESEND_AUDIENCE_PM_FREE
            });
            console.log(`📋 Moved ${userEmail} to PM Free audience`);
          }
        }
      } catch (audienceErr) {
        console.error('❌ Error syncing Resend audience on subscription update:', audienceErr.message);
      }

    } catch (error) {
      console.error('❌ Exception during subscription update');
      console.error('❌ Error:', error.message);
      console.error('❌ Stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  } else {
    console.log('ℹ️  Event type not handled:', event.type);
  }

  console.log('✅ Responding to Stripe with success\n');
  res.json({ received: true });
});

// Parse JSON for all other routes (increased limit for large lesson contexts in Knowledge Check)
app.use(express.json({ limit: '5mb' }));

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lessonContext } = req.body;

    // Build system prompt with lesson context
    const systemPrompt = `You are Will, a professional AI tutor helping students master Product Management.

${lessonContext ? `Current Lesson Context:\n${lessonContext}\n` : ''}

ABOUT IGNITE EDUCATION (use this to answer questions about Ignite):
- Ignite Education is an online learning platform building a smarter, more personalised era of education
- Courses are built by industry professionals and feature AI-powered interactive learning
- Key features include: Chat with Will (AI tutor), Smart Notes, Voice Over narration, Knowledge Checks, and Flashcards - all personalised to each learner
- Office Hours: Premium subscribers can get 1:1 support from course leaders at a time that suits them
- Courses available include Product Management, Cyber Security, Data Analysis, and UX Design
- The platform transforms careers through interactive courses, real-world projects, and personalised feedback

FORMATTING RULES:
- NEVER use emojis or emoticons of any kind
- NEVER use exclamation points (!)
- ALWAYS use British English spelling and vocabulary (organise, colour, analyse, realise, etc.)
- Use **bold** for key terms and important concepts
- Keep paragraphs short and scannable

BULLET POINT RULES (important):
- Use bullet points (•) ONLY for actual list items, not for introductory or transitional sentences
- Sentences that introduce a list (e.g., "Common reasons include:") should be regular paragraph text, NOT bulleted
- Sentences containing examples inline (e.g., "Examples include X and Y") should be regular paragraph text, NOT bulleted
- Only bullet the specific items being listed, not the context around them
- Closing/summary sentences should be regular paragraph text, NOT bulleted

Your role:
- Provide clear, helpful explanations that aid understanding
- Use examples from the lesson context when relevant
- Answer the question directly, then provide supporting detail if helpful`;

    // Convert messages to Claude format
    const claudeMessages = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Call Claude API - trying multiple models
    let modelToUse = 'claude-haiku-4-5-20241022';

    const message = await anthropic.messages.create({
      model: modelToUse,
      max_tokens: 512,
      system: systemPrompt,
      messages: claudeMessages,
    });

    // Extract response text
    let responseText = message.content[0].text;

    // Remove common introductory phrases that Will uses
    const introPatterns = [
      /^Certainly[.,]\s*/i,
      /^Of course[.,]\s*/i,
      /^Sure[.,]\s*/i,
      /^Absolutely[.,]\s*/i,
      /^Yes[.,]\s*/i,
      /^Indeed[.,]\s*/i,
      /^Right[.,]\s*/i,
      /^Well[.,]\s*/i,
      /^Great question[.,]\s*/i,
      /^Good question[.,]\s*/i,
      /^Let me explain[.,]\s*/i,
      /^I'd be happy to explain[.,]\s*/i,
      /^I can help with that[.,]\s*/i,
      /^Allow me to clarify[.,]\s*/i,
    ];

    // Apply each pattern to remove intro phrases
    for (const pattern of introPatterns) {
      responseText = responseText.replace(pattern, '');
    }

    // Capitalize the first letter after removal
    if (responseText.length > 0) {
      responseText = responseText.charAt(0).toUpperCase() + responseText.slice(1);
    }

    // Convert any dash bullets to dot bullets (•)
    // Match lines starting with - or — followed by space
    responseText = responseText.replace(/^[-–—]\s+/gm, '• ');

    res.json({
      success: true,
      response: responseText
    });

  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Claude chat server is running' });
});

// Knowledge Check - Get a random question from the pre-generated question bank
app.post('/api/knowledge-check/question', async (req, res) => {
  try {
    const {
      courseId,
      moduleNumber,
      lessonNumber,
      questionNumber,
      totalQuestions,
      previousQA,
      isAboutPriorLessons
    } = req.body;

    // Get IDs of previously asked questions to avoid repetition
    const askedQuestionIds = previousQA?.map(qa => qa.questionId).filter(Boolean) || [];

    let questions;
    let error;

    if (isAboutPriorLessons) {
      // For recall questions: fetch from ALL prior lessons (before current)
      // Query: (module < current) OR (module = current AND lesson < current)
      const { data, error: queryError } = await supabase
        .from('lesson_questions')
        .select('*')
        .eq('course_id', courseId)
        .or(`module_number.lt.${moduleNumber},and(module_number.eq.${moduleNumber},lesson_number.lt.${lessonNumber})`);

      questions = data;
      error = queryError;
    } else {
      // For current lesson questions: fetch from current lesson only
      const { data, error: queryError } = await supabase
        .from('lesson_questions')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber);

      questions = data;
      error = queryError;
    }

    if (error) {
      console.error('Database error fetching questions:', error);
      throw new Error('Failed to fetch questions from database');
    }

    // Filter out already asked questions
    const availableQuestions = (questions || []).filter(q => !askedQuestionIds.includes(q.id));

    if (availableQuestions.length === 0) {
      // No questions available - either none generated or all have been asked
      console.log(`⚠️ No available questions for ${courseId} M${moduleNumber}L${lessonNumber} (isAboutPriorLessons: ${isAboutPriorLessons})`);
      return res.status(404).json({
        success: false,
        error: 'No questions available',
        needsGeneration: true
      });
    }

    // Progressive difficulty for 3-question knowledge checks:
    // Question 1 (recall from prior lessons) → Medium
    // Question 2 (current lesson) → Easy
    // Question 3 (current lesson) → Medium
    const targetDifficulty = questionNumber === 2 ? 'easy' : 'medium';

    // Filter by target difficulty first
    let filteredByDifficulty = availableQuestions.filter(q => q.difficulty === targetDifficulty);

    // Fallback: if no questions of target difficulty available, use any available question
    if (filteredByDifficulty.length === 0) {
      console.log(`⚠️ No ${targetDifficulty} questions available, falling back to any difficulty`);
      filteredByDifficulty = availableQuestions;
    }

    // Pick a random question from the filtered set
    const randomIndex = Math.floor(Math.random() * filteredByDifficulty.length);
    const selectedQuestion = filteredByDifficulty[randomIndex];

    console.log(`✅ Selected ${selectedQuestion.difficulty} question ${questionNumber}/${totalQuestions} for ${courseId} M${moduleNumber}L${lessonNumber} (from ${isAboutPriorLessons ? 'prior lessons' : 'current lesson'})`);

    res.json({
      success: true,
      question: selectedQuestion.question_text,
      questionId: selectedQuestion.id,
      difficulty: selectedQuestion.difficulty,
      // Include source info for recall questions
      sourceModule: selectedQuestion.module_number,
      sourceLesson: selectedQuestion.lesson_number
    });

  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Knowledge Check - Evaluate answer
app.post('/api/knowledge-check/evaluate', async (req, res) => {
  try {
    const { lessonContext, question, answer, feedbackInstructions } = req.body;

    // Build feedback rules - use provided instructions or defaults
    const feedbackRules = feedbackInstructions || `If correct: Brief praise (1-2 sentences). If incorrect: Acknowledge their attempt, then provide the correct answer.`;

    const systemPrompt = `You are Will, an AI tutor evaluating a student's answer to a knowledge check question.

Lesson Content:
${lessonContext}

Question Asked: ${question}

Student's Answer: ${answer}

EVALUATION CRITERIA:
- Be somewhat lenient - if they show they understand the core concept, mark it correct even if they don't have every detail
- IMPORTANT: Use British English spelling throughout (e.g., 'prioritise' not 'prioritize', 'organisation' not 'organization', 'colour' not 'color', 'analyse' not 'analyze', 'behaviour' not 'behavior')
- Use a calm, professional tone - avoid excessive exclamation points (use at most one per response)

CRITICAL - SOURCE OF TRUTH:
- Your feedback and correct answers MUST come ONLY from the "Lesson Content" above
- Do NOT use external knowledge or general industry definitions
- If the lesson teaches something specific, use EXACTLY what the lesson says, even if it differs from common industry terminology
- Quote or paraphrase directly from the lesson content when providing the correct answer

CRITICAL FEEDBACK RULES (YOU MUST FOLLOW THESE EXACTLY):
${feedbackRules}

FORMATTING RULES:
- MAXIMUM 3 SENTENCES TOTAL - this is a strict limit, never exceed it
- Write feedback as plain prose only
- NEVER use bullet points, dashes, or lists
- NEVER use line breaks or newlines within the feedback
- Keep feedback concise and direct

Respond in JSON format:
{
  "isCorrect": true or false,
  "feedback": "Your feedback in 3 sentences or fewer, no line breaks or bullet points"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Evaluate this answer and provide feedback in JSON format.'
        }
      ],
    });

    const responseText = message.content[0].text;

    // Parse JSON response
    let evaluation;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing evaluation:', parseError);
      // Fallback: assume correct if response is positive
      const isPositive = responseText.toLowerCase().includes('correct') ||
                        responseText.toLowerCase().includes('great') ||
                        responseText.toLowerCase().includes('good');
      evaluation = {
        isCorrect: isPositive,
        feedback: responseText
      };
    }

    res.json({
      success: true,
      isCorrect: evaluation.isCorrect,
      feedback: evaluation.feedback
    });

  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// KNOWLEDGE CHECK QUESTION BANK - Pre-generated questions stored in database
// ============================================================================

// Generate and store knowledge check questions for a lesson (admin endpoint)
app.post('/api/admin/generate-lesson-questions', async (req, res) => {
  try {
    const { courseId, moduleNumber, lessonNumber, forceRegenerate = false } = req.body;

    console.log(`📝 Generating knowledge check questions for ${courseId} M${moduleNumber}L${lessonNumber}`);

    // 1. Fetch lesson sections
    const { data: sections, error: sectionsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_number', moduleNumber)
      .eq('lesson_number', lessonNumber)
      .order('section_number', { ascending: true });

    if (sectionsError || !sections || sections.length === 0) {
      console.error('❌ No lesson content found:', sectionsError);
      return res.status(404).json({ success: false, error: 'No lesson content found' });
    }

    // 2. Extract lesson text for question generation
    const lessonName = sections[0]?.lesson_name || `Module ${moduleNumber}, Lesson ${lessonNumber}`;
    const lessonText = sections
      .filter(s => s.content_type === 'paragraph' || s.content_type === 'heading')
      .map(s => {
        if (s.content_type === 'heading') {
          return s.content?.text || s.title || '';
        }
        return s.content?.text || (typeof s.content === 'string' ? s.content : '') || '';
      })
      .filter(text => text.trim().length > 0)
      .join('\n\n');

    if (!lessonText.trim()) {
      return res.status(400).json({ success: false, error: 'No text content found in lesson' });
    }

    const contentHash = crypto.createHash('sha256').update(lessonText).digest('hex');

    // 3. Check if questions already exist with same hash (skip if unchanged)
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('lesson_questions')
        .select('id, content_hash')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber)
        .limit(1);

      if (existing && existing.length > 0 && existing[0].content_hash === contentHash) {
        console.log('⏭️  Questions already exist and content unchanged, skipping');
        return res.json({
          success: true,
          message: 'Questions already exist and content unchanged',
          skipped: true
        });
      }
    }

    // 4. Generate 10 questions using Claude
    const systemPrompt = `You are Will, an AI tutor creating knowledge check questions for a lesson.

LANGUAGE REQUIREMENT:
- Use BRITISH ENGLISH spelling throughout
- Examples: "organise" not "organize", "colour" not "color", "analyse" not "analyze", "behaviour" not "behavior"

Your task:
Generate EXACTLY 10 open-ended knowledge check questions based on this lesson content.

REQUIREMENTS:
1. Generate exactly 10 questions - no more, no less
2. Questions should be open-ended (NOT multiple choice)
3. Questions should test understanding, not just recall
4. Vary difficulty: 3 easy, 7 medium (no hard questions)
5. Questions should be answerable from the lesson content alone
6. Be friendly and encouraging in tone
7. Each question should be clear and specific
8. Cover the full breadth of the lesson content

Lesson Name: ${lessonName}

Lesson Content:
${lessonText}

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {"text": "Question 1 here?", "difficulty": "easy"},
    {"text": "Question 2 here?", "difficulty": "easy"},
    {"text": "Question 3 here?", "difficulty": "easy"},
    {"text": "Question 4 here?", "difficulty": "medium"},
    {"text": "Question 5 here?", "difficulty": "medium"},
    {"text": "Question 6 here?", "difficulty": "medium"},
    {"text": "Question 7 here?", "difficulty": "medium"},
    {"text": "Question 8 here?", "difficulty": "medium"},
    {"text": "Question 9 here?", "difficulty": "medium"},
    {"text": "Question 10 here?", "difficulty": "medium"}
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate exactly 10 knowledge check questions in JSON format.'
        }
      ],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const questionsData = JSON.parse(jsonMatch[0]);
    const questions = questionsData.questions || [];

    if (questions.length === 0) {
      throw new Error('No questions generated');
    }

    console.log(`✅ Generated ${questions.length} questions`);

    // 5. Delete existing questions for this lesson
    const { error: deleteError } = await supabase
      .from('lesson_questions')
      .delete()
      .eq('course_id', courseId)
      .eq('module_number', moduleNumber)
      .eq('lesson_number', lessonNumber);

    if (deleteError) {
      console.warn('Warning: Could not delete existing questions:', deleteError);
    }

    // 6. Insert new questions
    const questionsToInsert = questions.map(q => ({
      course_id: courseId,
      module_number: moduleNumber,
      lesson_number: lessonNumber,
      question_text: q.text,
      difficulty: q.difficulty || 'medium',
      content_hash: contentHash
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('lesson_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to save questions: ${insertError.message}`);
    }

    console.log(`💾 Saved ${inserted.length} questions to database`);

    res.json({
      success: true,
      questionCount: inserted.length,
      contentHash
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check question status for a lesson (admin endpoint)
app.get('/api/admin/lesson-questions-status/:courseId/:module/:lesson', async (req, res) => {
  try {
    const { courseId, module, lesson } = req.params;
    const moduleNum = parseInt(module);
    const lessonNum = parseInt(lesson);

    // Get current content hash from lesson
    const { data: sections } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_number', moduleNum)
      .eq('lesson_number', lessonNum)
      .order('section_number', { ascending: true });

    const lessonText = (sections || [])
      .filter(s => s.content_type === 'paragraph' || s.content_type === 'heading')
      .map(s => {
        if (s.content_type === 'heading') {
          return s.content?.text || s.title || '';
        }
        return s.content?.text || (typeof s.content === 'string' ? s.content : '') || '';
      })
      .filter(text => text.trim().length > 0)
      .join('\n\n');

    const currentHash = lessonText.trim() ? crypto.createHash('sha256').update(lessonText).digest('hex') : null;

    // Check existing questions
    const { data: questions, error } = await supabase
      .from('lesson_questions')
      .select('id, content_hash, created_at')
      .eq('course_id', courseId)
      .eq('module_number', moduleNum)
      .eq('lesson_number', lessonNum);

    const hasQuestions = !error && questions && questions.length > 0;
    const questionHash = questions?.[0]?.content_hash || null;
    const needsRegeneration = hasQuestions ? (questionHash !== currentHash) : true;

    res.json({
      hasQuestions,
      questionCount: questions?.length || 0,
      contentHash: currentHash,
      questionHash,
      needsRegeneration,
      lastGenerated: questions?.[0]?.created_at || null
    });
  } catch (error) {
    console.error('Error checking question status:', error);
    res.status(500).json({ error: 'Failed to check question status' });
  }
});

// Update a single question (admin endpoint)
app.put('/api/admin/lesson-questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question_text, difficulty } = req.body;

    if (!question_text || !question_text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question text is required'
      });
    }

    // Validate difficulty if provided
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty. Must be: easy, medium, or hard'
      });
    }

    const updateData = {
      question_text: question_text.trim(),
      updated_at: new Date().toISOString()
    };

    if (difficulty) {
      updateData.difficulty = difficulty;
    }

    const { data, error } = await supabase
      .from('lesson_questions')
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update question: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    console.log(`✏️ Updated question ${questionId}`);

    res.json({
      success: true,
      question: data
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a question (admin endpoint)
app.delete('/api/admin/lesson-questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const { error } = await supabase
      .from('lesson_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }

    console.log(`🗑️ Deleted question ${questionId}`);

    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate a single replacement question for a lesson (admin endpoint)
app.post('/api/admin/generate-single-question', async (req, res) => {
  try {
    const { courseId, moduleNumber, lessonNumber, difficulty, existingQuestions } = req.body;

    // 1. Fetch lesson content
    const { data: sections, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_number', moduleNumber)
      .eq('lesson_number', lessonNumber)
      .order('section_number', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch lesson: ${fetchError.message}`);
    }

    if (!sections || sections.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }

    const lessonName = sections[0]?.lesson_name || 'Unknown Lesson';
    const lessonText = sections
      .filter(s => s.content_type === 'paragraph' || s.content_type === 'heading')
      .map(s => {
        if (s.content_type === 'heading') {
          return s.content?.text || s.title || '';
        }
        return s.content?.text || (typeof s.content === 'string' ? s.content : '') || '';
      })
      .filter(text => text.trim().length > 0)
      .join('\n\n');

    if (!lessonText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No lesson content found'
      });
    }

    // 2. Generate a single question using Claude
    const existingQuestionsText = (existingQuestions || []).join('\n- ');

    const systemPrompt = `You are Will, an AI tutor creating a knowledge check question for a lesson.

LANGUAGE REQUIREMENT:
- Use BRITISH ENGLISH spelling throughout

Your task:
Generate exactly ONE ${difficulty || 'medium'} difficulty open-ended question based on this lesson content.

REQUIREMENTS:
1. Generate exactly 1 question - no more, no less
2. The question should be open-ended (NOT multiple choice)
3. The question should test understanding, not just recall
4. The question should be answerable from the lesson content alone
5. Be friendly and encouraging in tone
6. The question should be clear and specific
7. IMPORTANT: The question must be DIFFERENT from these existing questions:
${existingQuestionsText ? `- ${existingQuestionsText}` : '(none)'}

Lesson Name: ${lessonName}

Lesson Content:
${lessonText}

Respond ONLY with valid JSON in this exact format:
{
  "question": "Your question here?",
  "difficulty": "${difficulty || 'medium'}"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate exactly 1 unique knowledge check question in JSON format.'
        }
      ],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const questionData = JSON.parse(jsonMatch[0]);

    // 3. Get content hash for the question
    const contentHash = crypto.createHash('sha256').update(lessonText).digest('hex');

    // 4. Save to database
    const { data: inserted, error: insertError } = await supabase
      .from('lesson_questions')
      .insert({
        course_id: courseId,
        module_number: moduleNumber,
        lesson_number: lessonNumber,
        question_text: questionData.question,
        difficulty: questionData.difficulty || difficulty || 'medium',
        content_hash: contentHash
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save question: ${insertError.message}`);
    }

    console.log(`✨ Generated new ${inserted.difficulty} question for ${courseId} M${moduleNumber}L${lessonNumber}`);

    res.json({
      success: true,
      question: inserted
    });

  } catch (error) {
    console.error('Error generating single question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate and store flashcards for a lesson (admin/setup endpoint)
app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { courseName, moduleNumber, lessonNumber, lessonContext } = req.body;

    console.log(`📝 Flashcard generation request for: Course: ${courseName}, Module: ${moduleNumber}, Lesson: ${lessonNumber}`);
    console.log(`📄 Lesson context length: ${lessonContext?.length || 0} characters`);

    if (!lessonContext || lessonContext.trim().length === 0) {
      console.error('❌ Error: No lesson context provided');
      return res.status(400).json({
        success: false,
        error: 'No lesson content provided'
      });
    }

    const systemPrompt = `You are Will, an AI tutor creating flashcards to help students review lesson content.

LANGUAGE REQUIREMENT - VERY IMPORTANT:
- Use BRITISH ENGLISH spelling and phrasing throughout all questions and answers
- Examples: "organise" not "organize", "colour" not "color", "analyse" not "analyze", "behaviour" not "behavior"
- Use British terminology: "whilst" not "while", "amongst" not "among", "favour" not "favor"
- This applies to ALL text in questions and answers

Your task:
Generate EXACTLY 15 flashcard questions based on the key concepts from this lesson.

CRITICAL REQUIREMENTS:
- You MUST generate exactly 15 flashcards, no more and no less
- Count your flashcards before responding to ensure there are exactly 15
- If you have fewer than 15, add more questions covering additional aspects of the lesson
- EVERY question MUST be phrased as an actual question ending with a question mark (?)
- Use varied question types (What is...? How does...? Why is...? What are...? How can...? etc.)
- DO NOT use statements like "Explain the role..." or "Describe the process..."
- DO use questions like "What is the role of...?" or "How does the process work?"
- Cover the full breadth of the lesson content - basic concepts, intermediate topics, and advanced applications
- Questions should be self-contained (make sense without additional context)

ANSWER FORMAT - CRITICALLY IMPORTANT - READ THIS CAREFULLY:
EVERY SINGLE ANSWER MUST USE BULLET POINTS ONLY. NO EXCEPTIONS.

RULES YOU MUST FOLLOW:
1. EVERY answer starts with the • character
2. EVERY line in the answer is a bullet point
3. Use MAXIMUM 5 bullet points per answer (3-5 is ideal, NEVER exceed 5)
4. DO NOT write any paragraphs
5. DO NOT write any sentences that don't start with •
6. Each bullet point should be a complete, informative statement
7. BOLD important keywords and concepts using **bold text** syntax
8. Use bold formatting to emphasize key terms, important names, critical concepts, and significant numbers

CORRECT FORMAT (this is what you MUST do):
• First key point about the concept with **important term** in bold
• Second key point with **critical details** and context highlighted
• Third key point explaining **practical application** or benefits
• Fourth key point with an **example** or additional insight

EXAMPLES OF GOOD BOLD USAGE:
• **Data analytics** involves examining datasets to draw **actionable insights**
• The **GDPR** requires companies to protect **personal data** and privacy
• **Machine learning** algorithms can identify **patterns** in large datasets

WRONG FORMAT (DO NOT DO THIS):
• A bullet point
Then a paragraph of text...

WRONG FORMAT (DO NOT DO THIS):
A sentence without a bullet point.
• Then a bullet point

Lesson Content:
${lessonContext}

Respond ONLY with valid JSON in this exact format with exactly 15 flashcards:
{
  "flashcards": [
    {"question": "Question 1 text here", "answer": "• Key point 1\\n• Key point 2\\n• Key point 3\\n• Key point 4"},
    {"question": "Question 2 text here", "answer": "• Key point 1\\n• Key point 2\\n• Key point 3"},
    ... continue until you have exactly 15 flashcards ...
    {"question": "Question 15 text here", "answer": "• Key point 1\\n• Key point 2\\n• Key point 3\\n• Key point 4\\n• Key point 5"}
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate exactly 15 flashcards for this lesson in JSON format. CRITICAL REQUIREMENTS:\n\n1. EXACTLY 15 flashcards - count them before responding\n2. EVERY answer must be ONLY bullet points using the • character\n3. NO paragraphs, NO sentences without bullets\n4. MAXIMUM 5 bullet points per answer (3-5 is ideal, NEVER exceed 5)\n5. Every line in every answer starts with •\n\nDo not deviate from this format.'
        }
      ],
    });

    const responseText = message.content[0].text;
    console.log('🤖 AI Response received, parsing...');

    // Parse JSON response
    let flashcardsData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        flashcardsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing flashcards:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate flashcards'
      });
    }

    const flashcards = flashcardsData.flashcards || [];
    const count = flashcards.length;

    // Log and warn if not exactly 15
    if (count !== 15) {
      console.warn(`⚠️  Warning: Generated ${count} flashcards instead of 15 for Module ${moduleNumber}, Lesson ${lessonNumber}`);
    } else {
      console.log(`✅ Successfully generated exactly 15 flashcards for Module ${moduleNumber}, Lesson ${lessonNumber}`);
    }

    res.json({
      success: true,
      flashcards: flashcards,
      count: count
    });

  } catch (error) {
    console.error('❌ Error generating flashcards:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate flashcards'
    });
  }
});

// Generate suggested question for H2 section based on content
app.post('/api/generate-suggested-question', async (req, res) => {
  try {
    const { sectionContent } = req.body;

    const systemPrompt = `You are Will, an AI tutor creating a suggested question for a section of lesson content.

Section Content:
${sectionContent}

Your task:
Based on this section content, generate ONE suggested question that would help students engage deeply with the material. The question should:
1. Be open-ended and encourage critical thinking
2. Focus on understanding key concepts or practical application
3. Be answerable based on the section content provided
4. Be conversational and natural (avoid overly academic language)
5. Be MAXIMUM 55 characters long (this is strict - count carefully)
6. Be 5-12 words long

Examples of good questions (all under 55 characters):
- "How would you apply this to your product?" (47 chars)
- "What makes this approach effective?" (36 chars)
- "Why is this concept important for PMs?" (39 chars)
- "How does this differ from other methods?" (41 chars)

Respond with ONLY the question text, nothing else. No introduction, no explanation, just the question. Keep it under 55 characters.`;

    let question = '';
    let attempts = 0;
    const maxAttempts = 3;

    // Try up to 3 times to get a question under 55 characters
    while (attempts < maxAttempts) {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20241022',
        max_tokens: 100,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: attempts === 0
              ? 'Generate a suggested question for this section.'
              : `Generate a shorter suggested question for this section. Make it under 55 characters. Previous attempt was ${question.length} characters.`
          }
        ],
      });

      question = message.content[0].text.trim();

      if (question.length <= 55) {
        break;
      }

      attempts++;
    }

    // If still too long after 3 attempts, use a generic fallback
    if (question.length > 55) {
      question = "What are the key concepts here?";
    }

    res.json({
      success: true,
      question: question
    });

  } catch (error) {
    console.error('Error generating suggested question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create Stripe checkout session for ad-free upgrade
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', // Enable embedded checkout
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1SUC1vRxlg2WD2fjH3QYiayu', // Your recurring price ID
          quantity: 1,
        },
      ],
      mode: 'subscription', // Changed from 'payment' to 'subscription'
      return_url: `${req.headers.origin || 'http://localhost:5173'}/progress?payment=success`,
      metadata: {
        userId: userId,
      },
    });

    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Stripe billing portal session for subscription management
app.post('/api/create-billing-portal-session', async (req, res) => {
  try {
    const { userId } = req.body;

    console.log('\n🎫 ============ CREATING BILLING PORTAL SESSION ============');
    console.log('👤 User ID:', userId);

    if (!userId) {
      console.error('❌ No userId provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user's Stripe customer ID from Supabase
    console.log('🔍 Fetching user data from Supabase...');
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    const customerId = userData.user?.user_metadata?.stripe_customer_id;
    console.log('🔑 Stripe Customer ID:', customerId);

    if (!customerId) {
      console.error('❌ No stripe_customer_id found for user');
      return res.status(400).json({ error: 'No active subscription found. Please subscribe first.' });
    }

    // Create billing portal session
    console.log('🚀 Creating Stripe billing portal session...');
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || 'https://www.ignite.education'}/progress`,
    });

    console.log('✅ ============ PORTAL SESSION CREATED ============');
    console.log('🔗 Portal URL:', session.url);
    console.log('');

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ ============ PORTAL SESSION CREATION FAILED ============');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('');
    res.status(500).json({ error: error.message });
  }
});


// Text-to-speech endpoint using ElevenLabs
app.post('/api/text-to-speech', async (req, res) => {
  try {
    let { text, voiceGender } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // ElevenLabs has a 5000 character limit for standard plans
    // Truncate text if it exceeds the limit
    const MAX_CHARS = 5000;
    if (text.length > MAX_CHARS) {
      console.log(`⚠️ Text too long (${text.length} chars), truncating to ${MAX_CHARS} chars`);
      text = text.substring(0, MAX_CHARS);
      // Try to end at a sentence boundary
      const lastPeriod = text.lastIndexOf('.');
      if (lastPeriod > MAX_CHARS - 200) {
        text = text.substring(0, lastPeriod + 1);
      }
    }

    // Select voice based on gender preference
    let voiceId;
    if (voiceGender === 'male') {
      // George - British male voice (warm, clear)
      voiceId = 'JBFqnCBsd6RMkjVDRZzb';
    } else {
      // Alice - British female voice (default)
      voiceId = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
    }

    // Generate speech with ElevenLabs
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      model_id: 'eleven_multilingual_v2', // High quality model with emotional range
      output_format: 'mp3_44100_128', // 44.1kHz, 128kbps - good balance of quality and size
      voice_settings: {
        stability: 0.5, // Balance between consistency and expressiveness
        similarity_boost: 0.75, // Maintain voice characteristics
        style: 0.0, // Neutral style
        use_speaker_boost: true // Enhance voice clarity
      }
    });

    // Set response headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked'
    });

    // Stream the audio data to the client
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.send(audioBuffer);

  } catch (error) {
    console.error('Error generating speech with ElevenLabs:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message
    });
  }
});

// Text-to-speech with character-level timestamps endpoint (with caching)
app.post('/api/text-to-speech-timestamps', async (req, res) => {
  try {
    let { text, voiceGender, courseName } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // ElevenLabs has a 5000 character limit for standard plans
    // Truncate text if it exceeds the limit
    const MAX_CHARS = 5000;
    if (text.length > MAX_CHARS) {
      console.log(`⚠️ Text too long (${text.length} chars), truncating to ${MAX_CHARS} chars`);
      text = text.substring(0, MAX_CHARS);
      // Try to end at a sentence boundary
      const lastPeriod = text.lastIndexOf('.');
      if (lastPeriod > MAX_CHARS - 200) {
        text = text.substring(0, lastPeriod + 1);
      }
    }

    // Select voice based on gender preference
    let voiceId;
    if (voiceGender === 'male') {
      // George - British male voice (warm, clear)
      voiceId = 'JBFqnCBsd6RMkjVDRZzb';
    } else {
      // Alice - British female voice (default)
      voiceId = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
    }

    // 1. Calculate SHA-256 hash of the text for cache lookup
    const contentHash = crypto.createHash('sha256').update(text).digest('hex');
    console.log('🔍 Cache lookup for hash:', contentHash.substring(0, 12) + '...');

    // 2. Check cache in database
    const { data: cached, error: cacheError } = await supabase
      .from('narration_cache')
      .select('*')
      .eq('content_hash', contentHash)
      .single();

    if (cached && !cacheError) {
      // 3a. CACHE HIT - Update access metrics and return cached data
      console.log('✅ Cache HIT - returning cached audio');
      
      await supabase
        .from('narration_cache')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: cached.access_count + 1
        })
        .eq('id', cached.id);

      return res.json({
        audio_base64: cached.audio_base64,
        alignment: cached.alignment_data,
        cached: true
      });
    }

    // 3b. CACHE MISS - Generate new audio
    console.log('❌ Cache MISS - generating new audio with ElevenLabs');
    console.log('🎤 Generating speech with timestamps for text:', text.substring(0, 100) + '...');

    // Generate speech with timestamps using ElevenLabs
    const response = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, {
      text: text,
      model_id: 'eleven_multilingual_v2', // High quality model with emotional range
      output_format: 'mp3_44100_128', // 44.1kHz, 128kbps - good balance of quality and size
      voice_settings: {
        stability: 0.5, // Balance between consistency and expressiveness
        similarity_boost: 0.75, // Maintain voice characteristics
        style: 0.0, // Neutral style
        use_speaker_boost: true // Enhance voice clarity
      }
    });

    console.log('✅ Speech generated successfully with timestamps');

    // Convert camelCase properties to snake_case to match frontend expectations
    const result = {
      audio_base64: response.audioBase64,
      alignment: response.alignment ? {
        characters: response.alignment.characters,
        character_start_times_seconds: response.alignment.characterStartTimesSeconds,
        character_end_times_seconds: response.alignment.characterEndTimesSeconds
      } : null
    };

    const charCount = result.alignment && result.alignment.characters ? result.alignment.characters.length : 0;
    console.log('📊 Alignment data: ' + charCount + ' characters tracked');

    // 4. Store in cache for future requests
    const { error: insertError } = await supabase
      .from('narration_cache')
      .insert({
        course_name: courseName || null,
        content_hash: contentHash,
        original_text: text,
        audio_base64: result.audio_base64,
        alignment_data: result.alignment,
        voice_gender: voiceGender,
        voice_id: voiceId,
        access_count: 1
      });

    if (insertError) {
      console.error('⚠️ Failed to cache audio:', insertError);
      // Don't fail the request if caching fails, just log it
    } else {
      console.log('💾 Audio cached successfully');
    }

    // Return JSON response with both audio and timestamps
    res.json({
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('Error generating speech with timestamps:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to generate speech with timestamps',
      message: error.message
    });
  }
});

// ============================================
// PRE-GENERATED LESSON AUDIO ENDPOINTS
// ============================================

// Helper: Extract text from lesson sections
const extractLessonText = (lessonName, sections) => {
  const textParts = [lessonName]; // Start with lesson title

  for (const section of sections) {
    if (section.content_type === 'heading' && section.content?.text) {
      textParts.push(section.content.text);
    } else if (section.content_type === 'paragraph' && section.content?.text) {
      // Strip markdown formatting for cleaner narration
      let text = section.content.text;
      text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
      text = text.replace(/\*(.*?)\*/g, '$1'); // Remove italic
      text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links, keep text
      // Strip bullet characters at line start to match frontend word count
      // Frontend renders bullets as separate elements, not as part of word spans
      text = text.replace(/^[•–—]\s*/gm, ''); // Remove bullet chars at line start (not hyphens)
      text = text.replace(/\n-\s+/g, '\n'); // Remove dash bullets at line start
      textParts.push(text);
    } else if (section.content_type === 'list' && section.content?.items) {
      textParts.push(section.content.items.join('. '));
    }
  }

  return textParts.join('. ');
};

// Helper: Build section markers from sections and alignment data
const buildSectionMarkers = (lessonName, sections, fullText, alignment) => {
  const markers = [];
  let charPosition = 0;

  // Helper to find time for a character position
  const getTimeForChar = (charPos) => {
    if (!alignment || !alignment.characters) return 0;
    const idx = Math.min(charPos, alignment.characters.length - 1);
    return alignment.character_start_times_seconds[idx] || 0;
  };

  const getEndTimeForChar = (charPos) => {
    if (!alignment || !alignment.characters) return 0;
    const idx = Math.min(charPos, alignment.characters.length - 1);
    return alignment.character_end_times_seconds[idx] || 0;
  };

  // Add lesson title as first marker
  const titleEnd = lessonName.length;
  markers.push({
    section_index: -1, // -1 for title
    type: 'title',
    text: lessonName,
    char_start: 0,
    char_end: titleEnd,
    time_start: getTimeForChar(0),
    time_end: getEndTimeForChar(titleEnd)
  });
  charPosition = titleEnd + 2; // Account for ". " separator

  // Add markers for each section
  sections.forEach((section, index) => {
    let sectionText = '';

    if (section.content_type === 'heading' && section.content?.text) {
      sectionText = section.content.text;
    } else if (section.content_type === 'paragraph' && section.content?.text) {
      let text = section.content.text;
      text = text.replace(/\*\*(.*?)\*\*/g, '$1');
      text = text.replace(/\*(.*?)\*/g, '$1');
      text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
      sectionText = text;
    } else if (section.content_type === 'list' && section.content?.items) {
      sectionText = section.content.items.join('. ');
    }

    if (sectionText) {
      const charEnd = charPosition + sectionText.length;
      markers.push({
        section_index: index,
        type: section.content_type,
        text: sectionText.substring(0, 100) + (sectionText.length > 100 ? '...' : ''),
        char_start: charPosition,
        char_end: charEnd,
        time_start: getTimeForChar(charPosition),
        time_end: getEndTimeForChar(charEnd)
      });
      charPosition = charEnd + 2; // Account for ". " separator
    }
  });

  return markers;
};

// Helper: Chunk text for ElevenLabs limit
const chunkText = (text, maxChars = 4800) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks;
};

// GET /api/lesson-audio/:courseId/:module/:lesson - Get pre-generated audio
// Returns single audio file with word timestamps for perfect highlighting
app.get('/api/lesson-audio/:courseId/:module/:lesson', async (req, res) => {
  try {
    const { courseId, module, lesson } = req.params;

    const { data, error } = await supabase
      .from('lesson_audio')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_number', parseInt(module))
      .eq('lesson_number', parseInt(lesson))
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Audio not found for this lesson' });
    }

    // NEW FORMAT: Single audio file with word timestamps (like blog audio)
    if (data.audio_url && data.word_timestamps) {
      res.json({
        audio_url: data.audio_url,
        word_timestamps: data.word_timestamps,
        title_word_count: data.title_word_count || 0,
        full_text: data.full_text,
        duration_seconds: data.duration_seconds,
        content_hash: data.content_hash,
        created_at: data.created_at
      });
    }
    // LEGACY: Per-section audio format (backward compatibility)
    else if (data.section_audio) {
      res.json({
        section_audio: data.section_audio,
        full_text: data.full_text,
        duration_seconds: data.duration_seconds,
        content_hash: data.content_hash,
        created_at: data.created_at
      });
    } else {
      // Very old legacy format
      res.json({
        audio_base64: data.audio_base64,
        alignment_data: data.alignment_data,
        section_markers: data.section_markers,
        full_text: data.full_text,
        duration_seconds: data.duration_seconds,
        content_hash: data.content_hash,
        created_at: data.created_at
      });
    }
  } catch (error) {
    console.error('Error fetching lesson audio:', error);
    res.status(500).json({ error: 'Failed to fetch lesson audio', message: error.message });
  }
});

// GET /api/admin/lesson-audio-status/:courseId/:module/:lesson - Check audio status
app.get('/api/admin/lesson-audio-status/:courseId/:module/:lesson', async (req, res) => {
  try {
    const { courseId, module, lesson } = req.params;
    const moduleNum = parseInt(module);
    const lessonNum = parseInt(lesson);

    // Fetch lesson sections to calculate current content hash
    const { data: sections, error: sectionsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_number', moduleNum)
      .eq('lesson_number', lessonNum)
      .order('section_number', { ascending: true });

    if (sectionsError) {
      return res.status(500).json({ error: 'Failed to fetch lesson sections', message: sectionsError.message });
    }

    // Get lesson name from first section or default
    const lessonName = sections?.[0]?.lesson_name || `Lesson ${lessonNum}`;
    const fullText = extractLessonText(lessonName, sections || []);
    const currentHash = crypto.createHash('sha256').update(fullText).digest('hex');

    // Check existing audio
    const { data: audio, error: audioError } = await supabase
      .from('lesson_audio')
      .select('content_hash, created_at, duration_seconds')
      .eq('course_id', courseId)
      .eq('module_number', moduleNum)
      .eq('lesson_number', lessonNum)
      .single();

    const hasAudio = !audioError && audio;
    const audioHash = audio?.content_hash || null;
    const needsRegeneration = hasAudio ? (audioHash !== currentHash) : true;

    res.json({
      hasAudio,
      contentHash: currentHash,
      audioHash,
      needsRegeneration,
      lastGenerated: audio?.created_at || null,
      durationSeconds: audio?.duration_seconds || null,
      characterCount: fullText.length
    });
  } catch (error) {
    console.error('Error checking lesson audio status:', error);
    res.status(500).json({ error: 'Failed to check audio status', message: error.message });
  }
});

// DELETE /api/admin/lesson-audio/:courseId/:module/:lesson - Delete lesson audio (database + storage)
app.delete('/api/admin/lesson-audio/:courseId/:module/:lesson', async (req, res) => {
  try {
    const { courseId, module, lesson } = req.params;
    const moduleNum = parseInt(module);
    const lessonNum = parseInt(lesson);

    console.log(`🗑️ Deleting audio for ${courseId} M${moduleNum}L${lessonNum}`);

    // 1. Delete from lesson_audio table
    const { error: dbError } = await supabase
      .from('lesson_audio')
      .delete()
      .eq('course_id', courseId)
      .eq('module_number', moduleNum)
      .eq('lesson_number', lessonNum);

    if (dbError) {
      console.error('Error deleting from database:', dbError);
      return res.status(500).json({ error: 'Failed to delete from database', message: dbError.message });
    }

    // 2. Delete from storage
    const storagePath = `${courseId}/${moduleNum}/${lessonNum}/full.mp3`;
    const { error: storageError } = await supabase.storage
      .from('lesson-audio')
      .remove([storagePath]);

    if (storageError) {
      console.warn('Warning: Could not delete from storage (may not exist):', storageError.message);
    }

    console.log(`✅ Deleted audio for ${courseId} M${moduleNum}L${lessonNum}`);
    res.json({
      success: true,
      message: `Deleted audio for ${courseId} module ${moduleNum} lesson ${lessonNum}`,
      deletedPath: storagePath
    });
  } catch (error) {
    console.error('Error deleting lesson audio:', error);
    res.status(500).json({ error: 'Failed to delete lesson audio', message: error.message });
  }
});

// POST /api/admin/generate-lesson-audio - Generate audio for a lesson
// NEW: Generates per-section audio for perfect word highlighting sync
app.post('/api/admin/generate-lesson-audio', async (req, res) => {
  try {
    const { courseId, moduleNumber, lessonNumber, forceRegenerate = false, voiceGender = 'male' } = req.body;

    console.log(`🎤 Generating single-file lesson audio for ${courseId} M${moduleNumber}L${lessonNumber}`);

    // 1. Fetch lesson sections
    const { data: sections, error: sectionsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_number', moduleNumber)
      .eq('lesson_number', lessonNumber)
      .order('section_number', { ascending: true });

    if (sectionsError) {
      return res.status(500).json({ error: 'Failed to fetch lesson sections', message: sectionsError.message });
    }

    if (!sections || sections.length === 0) {
      return res.status(404).json({ error: 'No sections found for this lesson' });
    }

    // 2. Extract full text for TTS and hash calculation
    // Normalize text same as frontend: collapse whitespace, join with spaces
    const lessonName = sections[0]?.lesson_name || `Module ${moduleNumber}, Lesson ${lessonNumber}`;
    const fullText = extractLessonText(lessonName, sections);

    // Normalize the full text to match frontend word splitting
    const normalizedText = fullText.replace(/\s+/g, ' ').trim();
    const contentHash = crypto.createHash('sha256').update(normalizedText).digest('hex');

    console.log(`📝 Lesson text: ${normalizedText.length} characters, hash: ${contentHash.substring(0, 12)}...`);
    console.log(`📝 Word count: ${normalizedText.split(' ').filter(w => w.length > 0).length} words`);

    // 3. Check if audio already exists with same hash (check for new single-file format)
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('lesson_audio')
        .select('id, content_hash, audio_url, word_timestamps')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber)
        .single();

      // Check for new single-file format (audio_url + word_timestamps)
      if (existing && existing.content_hash === contentHash && existing.audio_url && existing.word_timestamps) {
        console.log('✅ Single-file audio already exists with same hash, skipping regeneration');
        return res.json({
          success: true,
          skipped: true,
          message: 'Audio already up to date',
          contentHash
        });
      }
    }

    // 4. Select voice
    let voiceId;
    if (voiceGender === 'male') {
      voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George - British male
    } else {
      voiceId = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2'; // Alice - British female
    }

    // 5. Generate single audio file for entire lesson (like blog audio)
    console.log(`🎵 Generating audio for entire lesson: "${lessonName.substring(0, 50)}..."`);

    const response = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, {
      text: normalizedText,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    // Debug: Log response structure to verify SDK format
    console.log('📊 ElevenLabs response keys:', Object.keys(response || {}));

    if (!response || !response.audioBase64) {
      console.error('❌ ElevenLabs response missing audioBase64:', response);
      return res.status(500).json({ error: 'ElevenLabs returned empty audio response' });
    }

    const endTimes = response.alignment?.characterEndTimesSeconds || [];
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    // 6. Upload single audio file to Storage
    const audioBuffer = Buffer.from(response.audioBase64, 'base64');
    const storagePath = `${courseId}/${moduleNumber}/${lessonNumber}/full.mp3`;

    console.log(`📤 Uploading ${storagePath} (${(audioBuffer.length / 1024).toFixed(1)} KB)...`);

    const { error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return res.status(500).json({ error: 'Failed to upload audio', message: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lesson-audio')
      .getPublicUrl(storagePath);

    const audioUrl = urlData.publicUrl;
    console.log(`✅ Uploaded to ${audioUrl}`);

    // 7. Convert character timestamps to word timestamps (like blog audio)
    // IMPORTANT: Matches frontend word splitting exactly
    const wordTimestamps = [];
    if (response.alignment) {
      const chars = response.alignment.characters;
      const startTimes = response.alignment.characterStartTimesSeconds;
      const endTimesArr = response.alignment.characterEndTimesSeconds;

      let currentWord = '';
      let wordStart = null;
      let wordEnd = null;
      let wordIndex = 0;

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        // Since text is pre-normalized, only space is a word boundary
        const isSpace = char === ' ';

        if (isSpace) {
          // End of a word - save it if we have one
          if (currentWord.length > 0 && wordStart !== null) {
            wordTimestamps.push({
              word: currentWord,
              start: wordStart,
              end: wordEnd,
              index: wordIndex
            });
            wordIndex++;
            currentWord = '';
            wordStart = null;
            wordEnd = null;
          }
        } else {
          // Part of a word
          if (wordStart === null) {
            wordStart = startTimes[i];
          }
          wordEnd = endTimesArr[i];
          currentWord += char;
        }
      }

      // Don't forget the last word if text doesn't end with space
      if (currentWord.length > 0 && wordStart !== null) {
        wordTimestamps.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd,
          index: wordIndex
        });
      }
    }

    console.log(`📊 Generated ${wordTimestamps.length} word timestamps`);

    // 8. Calculate title word count for frontend skip-highlight
    const titleWords = lessonName.replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0);
    const titleWordCount = titleWords.length;
    console.log(`📊 Title has ${titleWordCount} words (indices 0-${titleWordCount - 1} should skip highlight)`);

    // 9. Store metadata in database (new single-file format)
    const upsertData = {
      course_id: courseId,
      module_number: moduleNumber,
      lesson_number: lessonNumber,
      content_hash: contentHash,
      lesson_name: lessonName,
      full_text: normalizedText,
      audio_url: audioUrl,
      word_timestamps: wordTimestamps,
      title_word_count: titleWordCount, // Frontend uses this to skip highlighting title words
      voice_gender: voiceGender,
      voice_id: voiceId,
      duration_seconds: duration,
      character_count: normalizedText.length,
      // Clear old per-section data
      section_audio: null,
      updated_at: new Date().toISOString()
    };

    console.log('💾 Storing lesson audio metadata in database...');
    console.log(`  word_timestamps count: ${wordTimestamps.length}`);

    const { data: insertedAudio, error: insertError } = await supabase
      .from('lesson_audio')
      .upsert(upsertData, {
        onConflict: 'course_id,module_number,lesson_number'
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('❌ Error storing lesson audio metadata:', insertError);
      console.error('  Error code:', insertError.code);
      console.error('  Error message:', insertError.message);
      console.error('  Error details:', insertError.details);
      console.error('  Error hint:', insertError.hint);
      return res.status(500).json({ error: 'Failed to store lesson audio', message: insertError.message });
    }

    console.log(`💾 Single-file audio metadata stored successfully for ${courseId} M${moduleNumber}L${lessonNumber}`);

    res.json({
      success: true,
      lessonAudio: {
        id: insertedAudio.id,
        course_id: courseId,
        module_number: moduleNumber,
        lesson_number: lessonNumber,
        audio_url: audioUrl,
        word_count: wordTimestamps.length,
        title_word_count: titleWordCount,
        duration_seconds: duration,
        character_count: normalizedText.length,
        content_hash: contentHash,
        created_at: insertedAudio.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error generating lesson audio:', error);
    console.error('  Stack:', error.stack);
    res.status(500).json({
      error: 'Failed to generate lesson audio',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// BLOG AUDIO GENERATION ENDPOINT
// ============================================================================

/**
 * Generate pre-recorded audio narration for a blog post
 * Stores audio in Supabase Storage and metadata in blog_post_audio table
 */
app.post('/api/admin/generate-blog-audio', async (req, res) => {
  try {
    const { blogPostId, forceRegenerate = false, voiceGender = 'male' } = req.body;

    if (!blogPostId) {
      return res.status(400).json({ error: 'Blog post ID is required' });
    }

    console.log(`🎤 Generating blog audio for post ${blogPostId}`);

    // 1. Fetch blog post content
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id, title, content, slug')
      .eq('id', blogPostId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Blog post not found', message: postError?.message });
    }

    // 2. Extract plain text from HTML content
    // IMPORTANT: This must match the frontend's textNormalization.js extractTextFromHtml
    // The key fix is adding spaces BEFORE block-level elements to match browser textContent behavior
    // Without this, text from adjacent blocks gets joined: "<p>Hello</p><p>World</p>" -> "HelloWorld"
    const extractTextFromHtml = (html) => {
      if (!html) return '';
      let text = html
        // Remove script and style tags entirely (including content)
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // CRITICAL: Replace blog-line-break spans with a space (they represent line breaks in text)
        // Without the space, words on either side get joined: "ever.<br>There's" -> "ever.There's"
        .replace(/<span class="blog-line-break"><\/span>/gi, ' ')
        // CRITICAL FIX: Add space BEFORE block-level elements to match browser textContent behavior
        // This prevents words from being joined across block boundaries
        .replace(/<(p|div|br|h[1-6]|li|tr|td|th|blockquote|pre|hr)[^>]*>/gi, ' ')
        // Remove all remaining HTML tags
        .replace(/<[^>]+>/g, '')
        // Decode common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        // Collapse all whitespace to single spaces and trim
        .replace(/\s+/g, ' ')
        .trim();
      return text;
    };

    const plainText = extractTextFromHtml(post.content);
    const contentHash = crypto.createHash('sha256').update(plainText).digest('hex');

    console.log(`📝 Blog text: ${plainText.length} characters, hash: ${contentHash.substring(0, 12)}...`);

    // 3. Check if audio already exists with same hash
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('blog_post_audio')
        .select('id, content_hash, audio_url')
        .eq('blog_post_id', blogPostId)
        .single();

      if (existing && existing.content_hash === contentHash && existing.audio_url) {
        console.log('✅ Blog audio already exists with same hash, skipping regeneration');
        return res.json({
          success: true,
          skipped: true,
          message: 'Audio already up to date',
          contentHash
        });
      }
    }

    // 4. Select voice
    let voiceId;
    if (voiceGender === 'male') {
      voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George - British male
    } else {
      voiceId = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2'; // Alice - British female
    }

    // 5. Generate audio with timestamps
    console.log(`🎵 Generating audio for blog post: "${post.title.substring(0, 50)}..."`);

    const response = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, {
      text: plainText,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    const endTimes = response.alignment?.characterEndTimesSeconds || [];
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    // 6. Upload audio to Storage
    const audioBuffer = Buffer.from(response.audioBase64, 'base64');
    const storagePath = `blog/${post.slug}/narration.mp3`;

    console.log(`📤 Uploading ${storagePath} (${(audioBuffer.length / 1024).toFixed(1)} KB)...`);

    const { error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return res.status(500).json({ error: 'Failed to upload audio', message: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lesson-audio')
      .getPublicUrl(storagePath);

    const audioUrl = urlData.publicUrl;
    console.log(`✅ Uploaded to ${audioUrl}`);

    // 7. Convert character timestamps to word timestamps for highlighting
    // IMPORTANT: Since text is pre-normalized to single spaces, we only split on space character
    // This matches the frontend's splitIntoWords() which uses text.split(' ')
    const wordTimestamps = [];
    if (response.alignment) {
      const chars = response.alignment.characters;
      const startTimes = response.alignment.characterStartTimesSeconds;
      const endTimesArr = response.alignment.characterEndTimesSeconds;

      let currentWord = '';
      let wordStart = null;
      let wordEnd = null;

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        // Since text is pre-normalized, only space is a word boundary
        const isSpace = char === ' ';

        if (isSpace) {
          // End of a word - save it if we have one
          if (currentWord.length > 0 && wordStart !== null) {
            wordTimestamps.push({
              word: currentWord,
              start: wordStart,
              end: wordEnd
            });
            currentWord = '';
            wordStart = null;
            wordEnd = null;
          }
        } else {
          // Part of a word
          if (wordStart === null) {
            wordStart = startTimes[i];
          }
          wordEnd = endTimesArr[i];
          currentWord += char;
        }
      }

      // Don't forget the last word if text doesn't end with space
      if (currentWord.length > 0 && wordStart !== null) {
        wordTimestamps.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd
        });
      }
    }

    // 8. Store metadata in database
    const upsertData = {
      blog_post_id: blogPostId,
      audio_url: audioUrl,
      word_timestamps: wordTimestamps,
      duration_seconds: duration,
      content_hash: contentHash,
      updated_at: new Date().toISOString()
    };

    console.log('💾 Storing blog audio metadata in database...');

    const { data: insertedAudio, error: insertError } = await supabase
      .from('blog_post_audio')
      .upsert(upsertData, {
        onConflict: 'blog_post_id'
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('❌ Error storing blog audio metadata:', insertError);
      return res.status(500).json({ error: 'Failed to store audio metadata', message: insertError.message });
    }

    console.log(`✅ Blog audio generated successfully: ${duration.toFixed(2)}s`);

    res.json({
      success: true,
      blogAudio: {
        id: insertedAudio.id,
        blog_post_id: blogPostId,
        audio_url: audioUrl,
        duration_seconds: duration,
        word_count: wordTimestamps.length,
        content_hash: contentHash,
        created_at: insertedAudio.created_at
      }
    });
  } catch (error) {
    console.error('Error generating blog audio:', error);
    res.status(500).json({ error: 'Failed to generate blog audio', message: error.message });
  }
});

// ============================================================================
// END BLOG AUDIO GENERATION ENDPOINT
// ============================================================================

let redditRateLimitResetTime = 0;
let redditRequestCount = 0;
let lastRedditRequestTime = 0;
let redditOAuthToken = { token: null, timestamp: 0 };

const REDDIT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (increased from 5)
const REDDIT_CACHE_MINIMUM_REFRESH = 2 * 60 * 1000; // 2 minutes minimum between refreshes
const REDDIT_TOKEN_DURATION = 55 * 60 * 1000; // 55 minutes (tokens last 60min, refresh early)
const REDDIT_REQUEST_DELAY = 1100; // 1.1 seconds between requests (stay under 60/min limit)
const REDDIT_MAX_REQUESTS_PER_MINUTE = 55; // Conservative limit (Reddit allows 60)
const REDDIT_CACHE_VERSION = 5; // Increment this to invalidate all caches (reverted to simple hot posts)

// Rate limiter: ensures we don't exceed Reddit's rate limits
async function waitForRateLimit() {
  const now = Date.now();

  // Reset counter if a minute has passed
  if (now - redditRateLimitResetTime > 60000) {
    redditRequestCount = 0;
    redditRateLimitResetTime = now;
  }

  // If we've hit the limit, wait until the minute resets
  if (redditRequestCount >= REDDIT_MAX_REQUESTS_PER_MINUTE) {
    const waitTime = 60000 - (now - redditRateLimitResetTime);
    if (waitTime > 0) {
      console.log(`⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      redditRequestCount = 0;
      redditRateLimitResetTime = Date.now();
    }
  }

  // Ensure minimum delay between requests
  const timeSinceLastRequest = now - lastRedditRequestTime;
  if (timeSinceLastRequest < REDDIT_REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, REDDIT_REQUEST_DELAY - timeSinceLastRequest));
  }

  lastRedditRequestTime = Date.now();
  redditRequestCount++;
}

// Get or refresh OAuth token (cached to avoid repeated token requests)
async function getRedditOAuthToken() {
  const now = Date.now();

  // Return cached token if still valid
  if (redditOAuthToken.token && (now - redditOAuthToken.timestamp) < REDDIT_TOKEN_DURATION) {
    console.log('🔑 Using cached Reddit OAuth token');
    return redditOAuthToken.token;
  }

  // Validate environment variables
  if (!process.env.VITE_REDDIT_CLIENT_ID || !process.env.VITE_REDDIT_CLIENT_SECRET) {
    throw new Error('Reddit API credentials not configured. Please set VITE_REDDIT_CLIENT_ID and VITE_REDDIT_CLIENT_SECRET environment variables.');
  }

  console.log('🔑 Fetching new Reddit OAuth token...');
  await waitForRateLimit();

  const authString = Buffer.from(`${process.env.VITE_REDDIT_CLIENT_ID}:${process.env.VITE_REDDIT_CLIENT_SECRET}`).toString('base64');

  const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`Reddit OAuth error: ${tokenResponse.status}`, errorText);
    throw new Error(`Reddit OAuth error: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  redditOAuthToken = {
    token: tokenData.access_token,
    timestamp: now
  };

  console.log('✅ Reddit OAuth token cached');
  return redditOAuthToken.token;
}

app.get('/api/reddit-posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 40;
    const forceRefresh = req.query.refresh === 'true';
    const subreddit = req.query.subreddit || 'ProductManagement'; // Get subreddit from query param
    const now = Date.now();

    console.log(`📡 Reddit posts requested for r/${subreddit}`);

    // Check if we have valid cached data for this specific subreddit
    const cachedData = redditPostsCache[subreddit];
    const cacheAge = cachedData ? (now - cachedData.timestamp) : Infinity;
    const hasCorrectVersion = cachedData && cachedData.version === REDDIT_CACHE_VERSION;
    const hasValidCache = cachedData && cacheAge < REDDIT_CACHE_DURATION && hasCorrectVersion;
    const canRefresh = cacheAge >= REDDIT_CACHE_MINIMUM_REFRESH;

    // Return cache if valid and not forcing refresh, or if too soon to refresh
    if (hasValidCache && (!forceRefresh || !canRefresh)) {
      const cacheMinutesOld = Math.floor(cacheAge / 60000);
      console.log(`📦 Returning cached Reddit posts for r/${subreddit} (${cacheMinutesOld}m old)`);
      return res.json(cachedData.data);
    }

    // If forcing refresh but too soon, warn and return cache
    if (forceRefresh && !canRefresh && cachedData) {
      const waitSeconds = Math.ceil((REDDIT_CACHE_MINIMUM_REFRESH - cacheAge) / 1000);
      console.log(`⏳ Refresh requested but cache too fresh. Wait ${waitSeconds}s. Returning cached data.`);
      return res.json(cachedData.data);
    }

    console.log(`🔄 Fetching fresh Reddit posts from r/${subreddit}...`);

    // Get OAuth access token (cached)
    const accessToken = await getRedditOAuthToken();

    // Rate limit before fetching posts
    await waitForRateLimit();

    // Fetch from Reddit OAuth API - use dynamic subreddit
    const redditUrl = `https://oauth.reddit.com/r/${subreddit}/hot?limit=${limit}`;
    console.log(`🌐 Fetching from: ${redditUrl}`);
    const response = await fetch(redditUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Reddit API error: ${response.status}`, errorText);
      throw new Error(`Reddit API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const json = await response.json();

    // Transform Reddit data including user profile pictures
    // Reddit includes snoovatar/profile images in post data via sr_detail.icon_img
    const posts = json.data.children.map(child => {
      const post = child.data;

      // Extract author profile picture from various possible fields
      // Reddit provides these in the post data, no extra API calls needed
      let authorIcon = null;
      if (post.sr_detail?.icon_img) {
        authorIcon = post.sr_detail.icon_img;
      } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
        // Sometimes Reddit puts user avatars in thumbnail for user posts
        authorIcon = post.thumbnail;
      }

      return {
        id: post.id,
        author: post.author,
        author_icon: authorIcon,
        created_at: new Date(post.created_utc * 1000).toISOString(),
        title: post.title,
        content: post.selftext || '',
        tag: post.link_flair_text || 'Discussion',
        upvotes: post.ups,
        comments: post.num_comments,
        url: `https://reddit.com${post.permalink}`
      };
    });

    // Cache the results for this specific subreddit
    redditPostsCache[subreddit] = {
      data: posts,
      timestamp: now,
      version: REDDIT_CACHE_VERSION
    };

    console.log(`✅ Fetched and cached ${posts.length} Reddit posts from r/${subreddit}`);
    res.json(posts);

  } catch (error) {
    console.error('❌ Error fetching Reddit posts:', error.message);
    console.error('❌ Error stack:', error.stack);

    // If we have stale cache for this subreddit, return it rather than failing
    const cachedData = redditPostsCache[subreddit];
    if (cachedData && cachedData.data) {
      console.log(`⚠️ Returning stale cache for r/${subreddit} due to error`);
      return res.json(cachedData.data);
    }

    // Return empty array instead of error to prevent frontend from breaking
    console.log('⚠️ Returning empty array due to Reddit API error');
    console.log('💡 Check that VITE_REDDIT_CLIENT_ID and VITE_REDDIT_CLIENT_SECRET are set in environment variables');
    res.json([]);
  }
});

// Fetch Reddit comments for a specific post
app.get('/api/reddit-comments', async (req, res) => {
  try {
    const { subreddit, postId } = req.query;

    if (!subreddit || !postId) {
      return res.status(400).json({ error: 'subreddit and postId are required' });
    }

    console.log(`📡 Reddit comments requested for r/${subreddit}/comments/${postId}`);

    // Get OAuth access token (cached)
    const accessToken = await getRedditOAuthToken();

    // Rate limit before fetching comments
    await waitForRateLimit();

    // Fetch from Reddit OAuth API
    const redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}`;
    console.log(`🌐 Fetching comments from: ${redditUrl}`);
    const response = await fetch(redditUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Reddit API error: ${response.status}`, errorText);
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const json = await response.json();

    // Reddit returns [post_data, comments_data]
    const commentsData = json[1]?.data?.children || [];

    // Transform comment data including author icons
    const comments = commentsData
      .filter(child => child.kind === 't1') // Only include actual comments (not "more" objects)
      .map(child => {
        // Extract author icon if available
        let authorIcon = null;
        if (child.data.author_flair_background_color) {
          authorIcon = child.data.author_flair_background_color;
        }

        return {
          id: child.data.id,
          name: child.data.name,
          author: child.data.author,
          author_icon: authorIcon,
          body: child.data.body,
          created_utc: child.data.created_utc,
          score: child.data.score
        };
      });

    console.log(`✅ Fetched ${comments.length} Reddit comments for post ${postId}`);
    res.json(comments);

  } catch (error) {
    console.error('❌ Error fetching Reddit comments:', error.message);
    console.error('❌ Error stack:', error.stack);

    // Return empty array instead of error to prevent frontend from breaking
    console.log('⚠️ Returning empty array due to Reddit API error');
    res.json([]);
  }
});

// Reddit flairs cache - centralized for all users
let redditFlairsCache = {}; // Object: { [subreddit]: { flairs, timestamp } }
const REDDIT_FLAIRS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fetch Reddit flairs for a subreddit (cached centrally)
app.get('/api/reddit-flairs', async (req, res) => {
  try {
    const { subreddit } = req.query;

    if (!subreddit) {
      return res.status(400).json({ error: 'subreddit parameter is required' });
    }

    console.log(`📡 Reddit flairs requested for r/${subreddit}`);

    // Check cache first
    const cachedData = redditFlairsCache[subreddit];
    const now = Date.now();
    const cacheAge = cachedData ? now - cachedData.timestamp : Infinity;

    if (cachedData && cacheAge < REDDIT_FLAIRS_CACHE_DURATION) {
      const hoursOld = Math.floor(cacheAge / (60 * 60 * 1000));
      console.log(`💾 Returning cached flairs for r/${subreddit} (${hoursOld}h old)`);
      return res.json(cachedData.flairs);
    }

    // Fetch fresh flairs from Reddit
    console.log(`🔄 Fetching fresh flairs from r/${subreddit}...`);

    await waitForRateLimit();
    const accessToken = await getRedditOAuthToken();

    const redditUrl = `https://oauth.reddit.com/r/${subreddit}/api/link_flair_v2`;
    console.log(`🌐 Fetching flairs from: ${redditUrl}`);

    const response = await fetch(redditUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Reddit API error: ${response.status}`, errorText);

      // Return stale cache if available
      if (cachedData) {
        console.log(`⚠️ Returning stale cache for r/${subreddit} due to error`);
        return res.json(cachedData.flairs);
      }

      throw new Error(`Reddit API error: ${response.status}`);
    }

    const flairs = await response.json();
    console.log(`✅ Fetched ${flairs.length} flairs for r/${subreddit}`);

    // Cache the flairs
    redditFlairsCache[subreddit] = {
      flairs: flairs,
      timestamp: now
    };

    console.log(`💾 Cached flairs for r/${subreddit} (valid for 24h)`);
    res.json(flairs);

  } catch (error) {
    console.error('❌ Error fetching Reddit flairs:', error.message);

    // Return stale cache if available
    const cachedData = redditFlairsCache[req.query.subreddit];
    if (cachedData) {
      console.log(`⚠️ Returning stale cache due to error`);
      return res.json(cachedData.flairs);
    }

    // Return empty array instead of error
    console.log('⚠️ Returning empty array due to Reddit API error');
    res.json([]);
  }
});

// Fetch real jobs endpoint using LinkedIn job search
app.post('/api/fetch-jobs', async (req, res) => {
  try {
    const { course } = req.body;

    // Use Claude to scrape and parse job listings from LinkedIn
    const searchQuery = course === 'Product Management' ? 'product manager' : course.toLowerCase();

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `I need you to provide 5 realistic ${course} job listings from top tech companies. Each listing should include:
- A specific, realistic job title
- A well-known company name (Google, Meta, Microsoft, Amazon, Apple, Netflix, Stripe, Airbnb, etc.)
- A compelling 1-2 sentence job description that sounds authentic
- Experience level: Entry-Level, Mid-Level, Senior, or Executive
- A working URL to the company's careers page with a search filter for "${searchQuery}" jobs

For the URLs, use these formats:
- Google: https://www.google.com/about/careers/applications/jobs/results/?q=${encodeURIComponent(searchQuery)}
- Meta: https://www.metacareers.com/jobs/?q=${encodeURIComponent(searchQuery)}
- Microsoft: https://careers.microsoft.com/professionals/us/en/search-results?keywords=${encodeURIComponent(searchQuery)}
- Amazon: https://www.amazon.jobs/en/search?base_query=${encodeURIComponent(searchQuery)}
- Apple: https://jobs.apple.com/en-us/search?search=${encodeURIComponent(searchQuery)}
- Netflix: https://jobs.netflix.com/search?q=${encodeURIComponent(searchQuery)}
- Stripe: https://stripe.com/jobs/search?q=${encodeURIComponent(searchQuery)}
- Airbnb: https://careers.airbnb.com/positions/?search=${encodeURIComponent(searchQuery)}

Return ONLY valid JSON in this exact format:
{
  "jobs": [
    {
      "title": "Senior Product Manager, Consumer",
      "company": "Google",
      "description": "Lead product strategy for Google Search features, working with cross-functional teams to deliver innovative solutions that impact billions of users.",
      "level": "Senior",
      "url": "https://www.google.com/about/careers/applications/jobs/results/?q=product%20manager"
    }
  ]
}`
      }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const jobsResponse = JSON.parse(jsonMatch[0]);
    res.json({ jobs: jobsResponse.jobs || [] });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Delete user endpoint (admin only)
app.delete('/api/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`Admin ${req.user.id} attempting to delete user ${userId}`);

    // Delete from auth.users using service role
    const { data: authData, error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return res.status(500).json({
        error: 'Failed to delete user from auth',
        details: authError.message
      });
    }

    console.log('User deleted from auth successfully:', authData);

    // Delete from public.users table
    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('Error deleting user from database:', dbError);
      // Don't fail if user was already deleted from public.users
      if (dbError.code !== 'PGRST116') {
        return res.status(500).json({
          error: 'User deleted from auth but failed to delete from database',
          details: dbError.message
        });
      }
    }

    console.log('User deleted from database successfully');

    res.json({
      success: true,
      message: 'User deleted successfully from both auth and database',
      userId
    });
  } catch (error) {
    console.error('Error in delete user endpoint:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error.message
    });
  }
});

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { type, userId, data = {} } = req.body;
    console.log(`📧 Sending ${type} email to user ${userId}`);

    // Get user details from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    // Get user email from auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      throw new Error('Failed to fetch user email');
    }

    const userEmail = authUser.email;
    const firstName = user?.first_name || 'there';

    // Check if this is a marketing email and if user has unsubscribed
    const isMarketingEmail = MARKETING_EMAIL_TYPES.includes(type);
    const marketingEmailsEnabled = authUser.user_metadata?.marketing_emails !== false;

    if (isMarketingEmail && !marketingEmailsEnabled) {
      console.log(`📧 Skipping ${type} email - user ${userId} has unsubscribed from marketing emails`);
      return res.json({
        success: true,
        message: 'User has unsubscribed from marketing emails',
        skipped: true
      });
    }

    // Prepare email based on type
    let subject, htmlContent;

    switch (type) {
      case 'welcome':
        // Course welcome email (sent when user enrolls in a course)
        const courseName = data.courseName || 'your course';
        subject = `Welcome to Ignite`;
        const WelcomeEmail = (await import('./emails/templates/WelcomeEmail.js')).default;
        htmlContent = await render(React.createElement(WelcomeEmail, { firstName, courseName }));
        break;

      case 'first_lesson':
        subject = `Great start, ${firstName}! You completed your first lesson`;
        const FirstLessonEmail = (await import('./emails/templates/FirstLessonEmail.js')).default;
        htmlContent = await render(React.createElement(FirstLessonEmail, {
          firstName,
          lessonName: data.lessonName,
          courseName: data.courseName
        }));
        break;

      case 'module_complete':
        subject = `You completed ${data.moduleName}!`;
        const ModuleCompleteEmail = (await import('./emails/templates/ModuleCompleteEmail.js')).default;
        htmlContent = await render(React.createElement(ModuleCompleteEmail, {
          firstName,
          moduleName: data.moduleName,
          courseName: data.courseName
        }));
        break;

      case 'course_complete':
        subject = `Congratulations on completing ${data.courseName}!`;
        const CourseCompleteEmail = (await import('./emails/templates/CourseCompleteEmail.js')).default;
        htmlContent = await render(React.createElement(CourseCompleteEmail, {
          firstName,
          courseName: data.courseName
        }));
        break;

      case 'subscription_confirm':
        subject = `Welcome to Ignite Premium, ${firstName}!`;
        const SubscriptionConfirmEmail = (await import('./emails/templates/SubscriptionConfirmEmail.js')).default;
        htmlContent = await render(React.createElement(SubscriptionConfirmEmail, { firstName }));
        break;

      case 'subscription_cancelled':
        subject = `Your Ignite subscription has been cancelled`;
        const SubscriptionCancelledEmail = (await import('./emails/templates/SubscriptionCancelledEmail.js')).default;
        htmlContent = await render(React.createElement(SubscriptionCancelledEmail, { firstName }));
        break;

      case 'inactivity_reminder':
        subject = `We miss you, ${firstName}! Your course is waiting`;
        const InactivityReminderEmail = (await import('./emails/templates/InactivityReminderEmail.js')).default;
        htmlContent = await render(React.createElement(InactivityReminderEmail, {
          firstName,
          daysSinceLogin: data.daysSinceLogin || 14,
          courseName: data.courseName || 'your course'
        }));
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email with Resend (dynamically import if not already loaded)
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ Resend not configured - skipping email send');
      return res.json({
        success: true,
        message: 'Email sending disabled (Resend not configured)',
        emailId: null
      });
    }

    // Dynamically import Resend only when needed
    if (!resend) {
      const { Resend } = await import('resend');
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    // Generate unsubscribe token and URL for this user
    const unsubscribeToken = generateUnsubscribeToken(userId);
    const unsubscribeUrl = `${API_BASE_URL}/api/unsubscribe?token=${unsubscribeToken}`;

    // Replace placeholder unsubscribe URL with the tokenized URL
    const finalHtml = htmlContent.replace(
      /https:\/\/ignite\.education\/unsubscribe/g,
      unsubscribeUrl
    );

    // Build email options
    const emailOptions = {
      from: 'Ignite <hello@ignite.education>',
      to: userEmail,
      subject,
      html: finalHtml,
    };

    // Add List-Unsubscribe headers for marketing emails (RFC 8058 compliant)
    if (isMarketingEmail) {
      emailOptions.headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }

    const { data: emailData, error: emailError } = await resend.emails.send(emailOptions);

    if (emailError) {
      console.error('❌ Resend error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log(`✅ Email sent successfully:`, emailData);
    res.json({ success: true, emailId: emailData.id });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// EMAIL UNSUBSCRIBE ENDPOINTS
// ============================================================================

// Unsubscribe endpoint - handles both GET (email link) and POST (one-click)
app.get('/api/unsubscribe', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Unsubscribe Error</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Invalid Link</h1>
            <p>This unsubscribe link is invalid or missing a token.</p>
          </body>
        </html>
      `);
    }

    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Link Expired</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Link Expired</h1>
            <p>This unsubscribe link has expired. Please update your email preferences in your account settings.</p>
            <a href="https://ignite.education" style="color: #ef0b72;">Go to Ignite</a>
          </body>
        </html>
      `);
    }

    // Update user's marketing_emails preference to false
    const { error } = await supabase.auth.admin.updateUserById(payload.userId, {
      user_metadata: { marketing_emails: false }
    });

    if (error) {
      console.error('❌ Failed to unsubscribe user:', error);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Something went wrong</h1>
            <p>We couldn't process your unsubscribe request. Please try again or contact support.</p>
          </body>
        </html>
      `);
    }

    console.log(`✅ User ${payload.userId} unsubscribed from marketing emails`);

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center; padding: 20px; }
            h1 { color: #1a1a1a; }
            p { color: #525252; line-height: 1.6; }
            .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
            a { color: #ef0b72; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>You've been unsubscribed</h1>
          <p>You will no longer receive marketing emails from Ignite.</p>
          <p>You will still receive important account and course-related emails.</p>
          <p style="margin-top: 30px;">
            <a href="https://ignite.education">Return to Ignite</a>
          </p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    res.status(500).send('An error occurred');
  }
});

// POST endpoint for RFC 8058 one-click unsubscribe
app.post('/api/unsubscribe', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const token = req.query.token || req.body.token;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Update user's marketing_emails preference to false
    const { error } = await supabase.auth.admin.updateUserById(payload.userId, {
      user_metadata: { marketing_emails: false }
    });

    if (error) {
      console.error('❌ Failed to unsubscribe user:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }

    console.log(`✅ User ${payload.userId} unsubscribed via one-click`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ One-click unsubscribe error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// ============================================================================
// RESEND AUDIENCE MANAGEMENT ENDPOINTS
// ============================================================================

// Add a contact to a single Resend audience
app.post('/api/resend/add-contact', async (req, res) => {
  try {
    const { email, firstName, lastName, audienceId } = req.body;

    if (!email || !audienceId) {
      return res.status(400).json({ error: 'Missing required fields: email and audienceId' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ Resend not configured - skipping contact add');
      return res.json({ success: true, message: 'Resend not configured', contactId: null });
    }

    // Dynamically import Resend only when needed
    if (!resend) {
      const { Resend } = await import('resend');
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    const { data, error } = await resend.contacts.create({
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      unsubscribed: false,
      audienceId
    });

    if (error) {
      // Check if it's a duplicate contact error (contact already exists)
      if (error.message?.includes('already exists')) {
        console.log(`📋 Contact ${email} already exists in audience`);
        return res.json({ success: true, message: 'Contact already exists', contactId: null });
      }
      throw new Error(error.message);
    }

    console.log(`✅ Added contact ${email} to audience ${audienceId}`);
    res.json({ success: true, contactId: data?.id });

  } catch (error) {
    console.error('❌ Error adding contact to audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync a contact to multiple audiences at once
app.post('/api/resend/sync-contact', async (req, res) => {
  try {
    const { email, firstName, lastName, audienceIds } = req.body;

    if (!email || !audienceIds || !Array.isArray(audienceIds)) {
      return res.status(400).json({ error: 'Missing required fields: email and audienceIds (array)' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ Resend not configured - skipping contact sync');
      return res.json({ success: true, message: 'Resend not configured', results: [] });
    }

    // Dynamically import Resend only when needed
    if (!resend) {
      const { Resend } = await import('resend');
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    const results = [];
    for (const audienceId of audienceIds) {
      if (!audienceId) continue; // Skip empty audience IDs

      try {
        const { data, error } = await resend.contacts.create({
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          unsubscribed: false,
          audienceId
        });

        if (error) {
          if (error.message?.includes('already exists')) {
            results.push({ audienceId, status: 'exists' });
          } else {
            results.push({ audienceId, status: 'error', error: error.message });
          }
        } else {
          results.push({ audienceId, status: 'added', contactId: data?.id });
        }
      } catch (err) {
        results.push({ audienceId, status: 'error', error: err.message });
      }
    }

    console.log(`✅ Synced contact ${email} to ${audienceIds.length} audiences`);
    res.json({ success: true, results });

  } catch (error) {
    console.error('❌ Error syncing contact to audiences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update contact properties in an audience
app.patch('/api/resend/update-contact', async (req, res) => {
  try {
    const { audienceId, contactId, email, properties } = req.body;

    if (!audienceId || (!contactId && !email)) {
      return res.status(400).json({ error: 'Missing required fields: audienceId and (contactId or email)' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ Resend not configured - skipping contact update');
      return res.json({ success: true, message: 'Resend not configured' });
    }

    // Dynamically import Resend only when needed
    if (!resend) {
      const { Resend } = await import('resend');
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    // If we have email but not contactId, we need to find the contact first
    let targetContactId = contactId;
    if (!targetContactId && email) {
      // List contacts and find by email
      const { data: contacts, error: listError } = await resend.contacts.list({ audienceId });
      if (listError) throw new Error(listError.message);

      const contact = contacts?.data?.find(c => c.email === email);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found in audience' });
      }
      targetContactId = contact.id;
    }

    const { error } = await resend.contacts.update({
      audienceId,
      id: targetContactId,
      ...properties
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`✅ Updated contact ${targetContactId} in audience ${audienceId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove a contact from an audience
app.delete('/api/resend/remove-contact', async (req, res) => {
  try {
    const { audienceId, email } = req.body;

    if (!audienceId || !email) {
      return res.status(400).json({ error: 'Missing required fields: audienceId and email' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ Resend not configured - skipping contact removal');
      return res.json({ success: true, message: 'Resend not configured' });
    }

    // Dynamically import Resend only when needed
    if (!resend) {
      const { Resend } = await import('resend');
      resend = new Resend(process.env.RESEND_API_KEY);
    }

    const { error } = await resend.contacts.remove({
      audienceId,
      email
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`✅ Removed contact ${email} from audience ${audienceId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error removing contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// REDDIT CACHE SYSTEM - Database-backed daily caching
// ============================================================================

const SUBREDDITS_TO_CACHE = ['ProductManagement', 'cybersecurity'];
const POSTS_PER_SUBREDDIT = 50;
const COMMENTS_PER_POST = 50;

// Fetch and cache Reddit data for a specific subreddit
async function fetchAndCacheRedditData(subreddit) {
  try {
    console.log(`\n🔄 Starting Reddit cache refresh for r/${subreddit}...`);

    const accessToken = await getRedditOAuthToken();
    await waitForRateLimit();

    // Fetch posts
    const postsUrl = `https://oauth.reddit.com/r/${subreddit}/hot?limit=${POSTS_PER_SUBREDDIT}`;
    const postsResponse = await fetch(postsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
      }
    });

    if (!postsResponse.ok) {
      throw new Error(`Failed to fetch posts: ${postsResponse.status}`);
    }

    const postsJson = await postsResponse.json();
    const posts = postsJson.data.children.map(child => child.data);

    console.log(`✅ Fetched ${posts.length} posts from r/${subreddit}`);

    // Batch fetch user avatars for unique authors
    console.log('🔄 Fetching user avatars...');
    const uniqueAuthors = [...new Set(posts.map(p => p.author))].filter(author => author && author !== '[deleted]');
    const authorAvatars = {};

    // Limit to first 25 authors to stay within rate limits (60 requests/min)
    const authorsToFetch = uniqueAuthors.slice(0, 25);
    let avatarsFetched = 0;

    for (const author of authorsToFetch) {
      try {
        await waitForRateLimit();
        const userUrl = `https://oauth.reddit.com/user/${author}/about`;
        const userResponse = await fetch(userUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Try icon_img first (Snoo avatar), then snoovatar_img as fallback
          const avatarUrl = userData.data?.icon_img || userData.data?.snoovatar_img;
          if (avatarUrl) {
            // Clean up the URL (Reddit sometimes returns URLs with HTML entities)
            authorAvatars[author] = avatarUrl.replace(/&amp;/g, '&');
            avatarsFetched++;
          }
        }
      } catch (err) {
        console.error(`  ⚠️ Error fetching avatar for u/${author}:`, err.message);
      }
    }

    console.log(`✅ Fetched ${avatarsFetched} user avatars from ${authorsToFetch.length} unique authors`);

    // Store posts in database
    let postsStored = 0;
    let commentsStored = 0;

    for (const post of posts) {
      // Insert or update post
      const { error: postError } = await supabase
        .from('reddit_posts_cache')
        .upsert({
          id: post.id,
          subreddit: subreddit,
          author: post.author,
          author_icon: authorAvatars[post.author] || null, // Use fetched avatar URL from batch fetch
          created_at: new Date(post.created_utc * 1000).toISOString(),
          title: post.title,
          content: post.selftext || '',
          tag: post.link_flair_text || 'Discussion',
          upvotes: post.ups,
          comments_count: post.num_comments,
          url: `https://reddit.com${post.permalink}`,
          fetched_at: new Date().toISOString()
        }, {
          onConflict: 'id,subreddit'
        });

      if (postError) {
        console.error(`Error storing post ${post.id}:`, postError);
        continue;
      }

      postsStored++;

      // Fetch and store comments for this post (limit to top posts to save API calls)
      if (postsStored <= 50) { // Fetch comments for all displayed posts
        try {
          await waitForRateLimit();

          const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${post.id}`;
          const commentsResponse = await fetch(commentsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': process.env.VITE_REDDIT_USER_AGENT || 'IgniteLearning/1.0'
            }
          });

          if (commentsResponse.ok) {
            const commentsJson = await commentsResponse.json();
            const commentsData = commentsJson[1]?.data?.children || [];

            const comments = commentsData
              .filter(child => child.kind === 't1')
              .slice(0, COMMENTS_PER_POST);

            // Store comments
            for (const comment of comments) {
              const { error: commentError } = await supabase
                .from('reddit_comments_cache')
                .upsert({
                  id: comment.data.id,
                  post_id: post.id,
                  subreddit: subreddit,
                  author: comment.data.author,
                  author_icon: authorAvatars[comment.data.author] || null, // Use fetched avatar URL from batch fetch
                  body: comment.data.body,
                  created_utc: comment.data.created_utc,
                  score: comment.data.score,
                  fetched_at: new Date().toISOString()
                }, {
                  onConflict: 'id'
                });

              if (!commentError) commentsStored++;
            }

            console.log(`  ✅ Stored ${comments.length} comments for post ${post.id}`);
          }
        } catch (err) {
          console.error(`  ⚠️ Error fetching comments for post ${post.id}:`, err.message);
        }
      }
    }

    // Update fetch log
    await supabase
      .from('reddit_fetch_log')
      .upsert({
        subreddit: subreddit,
        last_fetch_at: new Date().toISOString(),
        posts_count: postsStored,
        comments_count: commentsStored,
        status: 'success'
      }, {
        onConflict: 'subreddit'
      });

    console.log(`✅ Cache refresh complete for r/${subreddit}: ${postsStored} posts, ${commentsStored} comments\n`);

    return { success: true, posts: postsStored, comments: commentsStored };

  } catch (error) {
    console.error(`❌ Error caching Reddit data for r/${subreddit}:`, error);

    // Log failure
    await supabase
      .from('reddit_fetch_log')
      .upsert({
        subreddit: subreddit,
        last_fetch_at: new Date().toISOString(),
        posts_count: 0,
        comments_count: 0,
        status: `error: ${error.message}`
      }, {
        onConflict: 'subreddit'
      });

    return { success: false, error: error.message };
  }
}

// Endpoint to manually trigger cache refresh (for testing and cron)
app.post('/api/reddit-cache/refresh', async (req, res) => {
  try {
    const results = [];

    for (const subreddit of SUBREDDITS_TO_CACHE) {
      const result = await fetchAndCacheRedditData(subreddit);
      results.push({ subreddit, ...result });
    }

    res.json({
      success: true,
      message: 'Reddit cache refresh completed',
      results
    });

  } catch (error) {
    console.error('Error in cache refresh:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// New endpoint: Get cached Reddit posts from database
app.get('/api/reddit-posts-cached', async (req, res) => {
  try {
    const subreddit = req.query.subreddit || 'ProductManagement';
    const limit = parseInt(req.query.limit) || 20;

    console.log(`📦 Fetching cached posts for r/${subreddit} (limit: ${limit})`);

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Try to get posts from last 14 days, sorted by upvotes
    let { data, error } = await supabase
      .from('reddit_posts_cache')
      .select('*')
      .eq('subreddit', subreddit)
      .gte('created_at', fourteenDaysAgo)
      .order('upvotes', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Fallback: if no recent posts, get top posts regardless of age
    if (!data || data.length === 0) {
      console.log(`⚠️ No posts in last 14 days, falling back to all-time top posts`);
      const fallback = await supabase
        .from('reddit_posts_cache')
        .select('*')
        .eq('subreddit', subreddit)
        .order('upvotes', { ascending: false })
        .limit(limit);

      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    // Transform to match frontend expected format
    const posts = (data || []).map(post => ({
      id: post.id,
      author: post.author,
      author_icon: post.author_icon,
      created_at: post.created_at,
      title: post.title,
      content: post.content,
      tag: post.tag,
      upvotes: post.upvotes,
      comments: post.comments_count,
      url: post.url
    }));

    console.log(`✅ Returned ${posts.length} cached posts from database`);
    res.json(posts);

  } catch (error) {
    console.error('Error fetching cached posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: Get cached Reddit comments from database
app.get('/api/reddit-comments-cached', async (req, res) => {
  try {
    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }

    console.log(`📦 Fetching cached comments for post ${postId}`);

    const { data, error } = await supabase
      .from('reddit_comments_cache')
      .select('*')
      .eq('post_id', postId)
      .order('score', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match frontend expected format
    const comments = (data || []).map(comment => ({
      id: comment.id,
      name: `t1_${comment.id}`,
      author: comment.author,
      author_icon: comment.author_icon,
      body: comment.body,
      created_utc: comment.created_utc,
      score: comment.score
    }));

    console.log(`✅ Returned ${comments.length} cached comments from database`);
    res.json(comments);

  } catch (error) {
    console.error('Error fetching cached comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule daily cache refresh at 6 AM UTC (no startup refresh to avoid Reddit rate limits)
const scheduleNextRefresh = () => {
  const now = new Date();
  const next6AM = new Date();
  next6AM.setUTCHours(6, 0, 0, 0);

  // If it's past 6 AM today, schedule for tomorrow
  if (now >= next6AM) {
    next6AM.setDate(next6AM.getDate() + 1);
  }

  const msUntilNext = next6AM.getTime() - now.getTime();

  console.log(`⏰ Next Reddit cache refresh scheduled for: ${next6AM.toISOString()}`);

  setTimeout(async () => {
    console.log('\n⏰ Daily Reddit cache refresh triggered');
    for (const subreddit of SUBREDDITS_TO_CACHE) {
      await fetchAndCacheRedditData(subreddit);
    }
    // Schedule next refresh
    scheduleNextRefresh();
  }, msUntilNext);
};

scheduleNextRefresh();

// ============================================================================
// END REDDIT CACHE SYSTEM
// ============================================================================

// ============================================================================
// CERTIFICATE ENDPOINTS
// ============================================================================

// Generate a certificate for a user when they complete a course
app.post('/api/certificate/generate', async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: 'userId and courseId are required' });
    }

    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, enrolled_course')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Map course IDs to readable course names
    const courseNames = {
      'product-management': 'Product Manager',
      'product-manager': 'Product Manager'
      // Add more course mappings as needed
    };

    const courseDisplayName = courseNames[courseId] || courseId;
    const userName = `${userData.first_name} ${userData.last_name}`;

    // Generate a unique certificate number (format: IGN-YYYY-XXXXXX)
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const certificateNumber = `IGN-${year}-${randomNum}`;

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existingCert) {
      // Certificate already exists, return it
      return res.json({
        success: true,
        certificate: existingCert
      });
    }

    // Create certificate record
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert({
        user_id: userId,
        course_id: courseId,
        course_name: courseDisplayName,
        certificate_number: certificateNumber,
        user_name: userName,
        issued_date: new Date().toISOString()
      })
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate:', certError);
      return res.status(500).json({ error: 'Failed to create certificate' });
    }

    res.json({
      success: true,
      certificate: certificate
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific certificate by certificate ID
app.get('/api/certificate/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      success: true,
      certificate: certificate
    });

  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a certificate by certificate number (for public verification)
app.get('/api/certificate/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_number', certificateNumber)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      success: true,
      certificate: certificate
    });

  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all certificates for a user
app.get('/api/certificate/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('issued_date', { ascending: false });

    if (error) {
      console.error('Error fetching user certificates:', error);
      return res.status(500).json({ error: 'Failed to fetch certificates' });
    }

    res.json({
      success: true,
      certificates: certificates || []
    });

  } catch (error) {
    console.error('Error fetching user certificates:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// END CERTIFICATE ENDPOINTS
// ============================================================================
// LINKEDIN POSTS INTEGRATION - BRIGHT DATA WEB SCRAPER API
// ============================================================================

/**
 * Fetch LinkedIn company posts from Bright Data Web Scraper API
 * Using the simpler, direct API approach (not the dataset trigger method)
 * Cost: $0.001 per data point or pay-as-you-go
 */
async function fetchLinkedInPostsFromBrightData() {
  const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY;
  const LINKEDIN_SCHOOL_URL = 'https://www.linkedin.com/school/ignite-courses/';

  if (!BRIGHT_DATA_API_KEY) {
    console.warn('⚠️  BRIGHT_DATA_API_KEY not configured - using mock data');
    return getMockLinkedInPosts();
  }

  try {
    console.log('🔗 Fetching LinkedIn posts from Bright Data Web Scraper API...');

    // Use Bright Data's Web Scraper API for LinkedIn Companies
    // This is a direct HTTP call - much simpler than the dataset trigger approach
    const response = await axios.post(
      'https://api.brightdata.com/datasets/v3/trigger',
      [{ url: LINKEDIN_SCHOOL_URL }],
      {
        params: {
          dataset_id: 'gd_l1vikfnt1wgvvqz95w', // LinkedIn Company Scraper dataset ID
          format: 'json',
          uncompressed_webhook: true
        },
        headers: {
          'Authorization': `Bearer ${BRIGHT_DATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    console.log('✅ Bright Data API response received');

    // The response contains the snapshot_id - we need to fetch the actual data
    const snapshotId = response.data.snapshot_id;
    
    if (!snapshotId) {
      console.error('❌ No snapshot_id in response');
      return getMockLinkedInPosts();
    }

    // Wait a bit for data to be ready
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second wait

    // Fetch the actual data
    const dataResponse = await axios.get(
      `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
      {
        headers: {
          'Authorization': `Bearer ${BRIGHT_DATA_API_KEY}`
        }
      }
    );

    if (dataResponse.data && Array.isArray(dataResponse.data)) {
      const companyData = dataResponse.data[0]; // First result is our company
      
      // Extract posts from company data
      const posts = (companyData?.posts || [])
        .slice(0, 5) // Get latest 5 posts
        .map((post, idx) => ({
          id: post.post_url || `bright-${Date.now()}-${idx}`,
          text: post.text || '',
          created: post.posted_date ? new Date(post.posted_date).getTime() : Date.now() - (idx * 24 * 60 * 60 * 1000),
          author: companyData.name || 'Ignite Education',
          likes: post.num_likes || 0,
          comments: post.num_comments || 0,
          shares: post.num_shares || post.num_reposts || 0,
          url: post.post_url || LINKEDIN_SCHOOL_URL
        }));

      if (posts.length > 0) {
        console.log(`✅ Successfully extracted ${posts.length} LinkedIn posts`);
        return posts;
      }
    }

    console.warn('⚠️  No posts found in Bright Data response');
    return getMockLinkedInPosts();

  } catch (error) {
    console.error('❌ Error fetching from Bright Data:', error.response?.data || error.message);
    return getMockLinkedInPosts();
  }
}

/**
 * Get LinkedIn posts (with caching)
 * Checks cache first, then fetches from Bright Data if needed
 */
async function getLinkedInPosts() {
  // Check cache first
  const cachedPosts = linkedInCache.get(LINKEDIN_CACHE_KEY);
  
  if (cachedPosts) {
    console.log('📦 Returning cached LinkedIn posts');
    return cachedPosts;
  }

  // Fetch fresh data from Bright Data
  console.log('🔄 Cache miss - fetching fresh LinkedIn posts');
  const posts = await fetchLinkedInPostsFromBrightData();
  
  // Cache the results (24 hour TTL set in NodeCache initialization)
  linkedInCache.set(LINKEDIN_CACHE_KEY, posts);
  
  return posts;
}

/**
 * Fallback mock data when API is unavailable
 */
function getMockLinkedInPosts() {
  return [
    {
      id: '7366907418041090049',
      text: 'Want to get into Product Management? Every week, we round up the best opportunities.\n\nGraduate Product Manager at Evernote (UK/Italy)\nProgramme Manager Graduate at TikTok (UK)\nProduct Manager Intern at TikTok (UK)\nProduct Owner (Graduate) at Revolut (UK)\nAssistant Product Marketing Manager at Huel (UK)\nProduct Manager (Subscriptions) at Spotify (UK/Sweden)\nProduct Manager (Developer Marketplace) at Vodafone (UK)\nProduct Manager at Selfridges (UK)\n\nKnow of any others? Share them in the comments!\n\n#ProductManagement #EntryLevelJobs',
      created: new Date('2025-01-13').getTime(),
      author: 'Ignite Education',
      likes: 1,
      comments: 0,
      shares: 0,
      url: 'https://www.linkedin.com/school/ignite-courses/'
    },
    {
      id: '2',
      text: 'Join thousands of learners upskilling with Ignite. Our courses are completely free and designed for everyone. 💡',
      created: Date.now() - 5 * 24 * 60 * 60 * 1000,
      author: 'Ignite Education',
      likes: 63,
      comments: 15,
      shares: 21,
      url: 'https://www.linkedin.com/school/ignite-courses/'
    },
    {
      id: '3',
      text: 'New module just dropped in our Cybersecurity course! Dive into threat detection and incident response. 🔒',
      created: Date.now() - 7 * 24 * 60 * 60 * 1000,
      author: 'Ignite Education',
      likes: 89,
      comments: 23,
      shares: 34,
      url: 'https://www.linkedin.com/school/ignite-courses/'
    },
    {
      id: '4',
      text: 'Check out our latest graduates who landed amazing roles in tech! Your success story could be next. 🎓',
      created: Date.now() - 10 * 24 * 60 * 60 * 1000,
      author: 'Ignite Education',
      likes: 102,
      comments: 31,
      shares: 45,
      url: 'https://www.linkedin.com/school/ignite-courses/'
    },
    {
      id: '5',
      text: 'Free webinar next week: Breaking into Tech - Tips from Industry Leaders. Register now! 🚀',
      created: Date.now() - 14 * 24 * 60 * 60 * 1000,
      author: 'Ignite Education',
      likes: 127,
      comments: 18,
      shares: 56,
      url: 'https://www.linkedin.com/school/ignite-courses/'
    }
  ];
}

/**
 * API Endpoint: Get LinkedIn posts
 * Returns cached posts or fetches fresh data if cache expired
 */
app.get('/api/linkedin/posts', async (req, res) => {
  try {
    const posts = await getLinkedInPosts();
    const requestedCount = parseInt(req.query.count) || 5;
    
    // Return only the requested number of posts
    res.json(posts.slice(0, requestedCount));
  } catch (error) {
    console.error('❌ Error in /api/linkedin/posts endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch LinkedIn posts',
      posts: getMockLinkedInPosts().slice(0, parseInt(req.query.count) || 5)
    });
  }
});

/**
 * Manual cache refresh endpoint (for testing or manual updates)
 */
app.get('/api/linkedin/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual LinkedIn cache refresh requested');
    
    // Clear cache
    linkedInCache.del(LINKEDIN_CACHE_KEY);
    
    // Fetch fresh data
    const posts = await getLinkedInPosts();
    
    res.json({
      success: true,
      message: 'LinkedIn posts cache refreshed',
      posts: posts,
      cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('❌ Error refreshing LinkedIn cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache'
    });
  }
});

/**
 * Scheduled daily update of LinkedIn posts
 * Runs at 3 AM every day to refresh the cache
 * This ensures the cache is always warm and API costs are minimized
 */
cron.schedule('0 3 * * *', async () => {
  console.log('⏰ Running scheduled LinkedIn posts update (3 AM daily)');
  
  try {
    // Clear cache to force fresh fetch
    linkedInCache.del(LINKEDIN_CACHE_KEY);
    
    // Fetch and cache new posts
    await getLinkedInPosts();
    
    console.log('✅ Scheduled LinkedIn posts update completed successfully');
  } catch (error) {
    console.error('❌ Error in scheduled LinkedIn posts update:', error);
  }
}, {
  timezone: "America/New_York" // Adjust to your timezone
});

// Log that the cron job is scheduled
console.log('⏰ LinkedIn posts cron job scheduled: Daily at 3 AM');

/**
 * Inactivity reminder email cron job
 * Runs at 10 AM every day to check for users inactive for 14+ days
 * Sends a reminder email to encourage them to return
 */
cron.schedule('0 10 * * *', async () => {
  console.log('⏰ Running inactivity reminder check (10 AM daily)');

  try {
    // Calculate the date 14 days ago
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffDate = fourteenDaysAgo.toISOString();

    // Find users who:
    // 1. Have completed onboarding (enrolled in a course)
    // 2. Last active 14+ days ago
    // 3. Haven't received an inactivity email in the last 30 days (to avoid spam)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const emailCutoff = thirtyDaysAgo.toISOString();

    const { data: inactiveUsers, error } = await supabase
      .from('users')
      .select('id, first_name, enrolled_course, last_active_at, inactivity_email_sent_at')
      .eq('onboarding_completed', true)
      .not('enrolled_course', 'is', null)
      .lt('last_active_at', cutoffDate);

    if (error) {
      console.error('❌ Error fetching inactive users:', error);
      return;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log('✅ No inactive users found');
      return;
    }

    console.log(`📋 Found ${inactiveUsers.length} potentially inactive users`);

    let emailsSent = 0;

    for (const user of inactiveUsers) {
      // Skip if we sent them an inactivity email in the last 30 days
      if (user.inactivity_email_sent_at && user.inactivity_email_sent_at > emailCutoff) {
        console.log(`⏭️ Skipping user ${user.id} - already emailed recently`);
        continue;
      }

      // Calculate days since last activity
      const lastActive = new Date(user.last_active_at);
      const daysSinceLogin = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      // Get course display name
      const courseName = user.enrolled_course === 'product-manager'
        ? 'Product Manager'
        : user.enrolled_course === 'cybersecurity'
          ? 'Cybersecurity'
          : user.enrolled_course;

      try {
        // Send inactivity reminder email
        const response = await fetch(`http://localhost:${PORT}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'inactivity_reminder',
            userId: user.id,
            data: { daysSinceLogin, courseName }
          })
        });

        if (response.ok) {
          // Update the user record to track when we sent the email
          await supabase
            .from('users')
            .update({ inactivity_email_sent_at: new Date().toISOString() })
            .eq('id', user.id);

          emailsSent++;
          console.log(`📧 Sent inactivity reminder to user ${user.id} (${daysSinceLogin} days inactive)`);
        } else {
          console.error(`❌ Failed to send inactivity email to user ${user.id}`);
        }
      } catch (emailErr) {
        console.error(`❌ Error sending inactivity email to user ${user.id}:`, emailErr.message);
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Inactivity reminder check completed. Sent ${emailsSent} emails.`);
  } catch (error) {
    console.error('❌ Error in inactivity reminder cron:', error);
  }
}, {
  timezone: "America/New_York"
});

console.log('⏰ Inactivity reminder cron job scheduled: Daily at 10 AM');

// ============================================================================
// END LINKEDIN ENDPOINTS
// ============================================================================
// ============================================================================
// ============================================================================

// ============================================================================
// SITEMAP ENDPOINT - Dynamic sitemap with blog posts
// ============================================================================

/**
 * Dynamic sitemap endpoint
 * Generates XML sitemap including static pages and all published blog posts
 */
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Fetch all published blog posts
    const { data: blogPosts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts for sitemap:', error);
    }

    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/welcome', priority: '0.9', changefreq: 'weekly' },
      { loc: '/privacy', priority: '0.5', changefreq: 'monthly' },
      { loc: '/terms', priority: '0.5', changefreq: 'monthly' },
      { loc: '/reset-password', priority: '0.3', changefreq: 'yearly' },
      { loc: '/courses/product-manager', priority: '0.8', changefreq: 'weekly' },
      { loc: '/courses/cyber-security-analyst', priority: '0.8', changefreq: 'weekly' },
      { loc: '/courses/data-analyst', priority: '0.8', changefreq: 'weekly' },
      { loc: '/courses/ux-designer', priority: '0.8', changefreq: 'weekly' },
    ];

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Static Pages -->`;

    // Add static pages
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>https://www.ignite.education${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Add blog posts
    if (blogPosts && blogPosts.length > 0) {
      xml += `

  <!-- Blog Posts -->`;

      for (const post of blogPosts) {
        const lastmod = post.updated_at
          ? new Date(post.updated_at).toISOString().split('T')[0]
          : new Date(post.published_at).toISOString().split('T')[0];

        xml += `
  <url>
    <loc>https://www.ignite.education/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// ============================================================================
// END SITEMAP ENDPOINT
// ============================================================================

app.listen(PORT, () => {
  console.log(`🤖 Claude chat server running on http://localhost:${PORT}`);
  console.log(`✅ API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ ElevenLabs configured: ${process.env.ELEVENLABS_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ Resend configured: ${process.env.RESEND_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ LinkedIn configured: ${process.env.VITE_LINKEDIN_CLIENT_ID && process.env.VITE_LINKEDIN_CLIENT_SECRET ? 'Yes' : 'No'}`);
});
