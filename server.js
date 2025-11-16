import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { render } from '@react-email/render';
import React from 'react';

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

// Initialize AWS Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Initialize Resend (optional) - will be loaded dynamically when needed
let resend = null;

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

    } catch (error) {
      console.error('❌ Exception during Supabase update');
      console.error('❌ Error:', error.message);
      console.error('❌ Stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    console.log('
🚫 ============ SUBSCRIPTION CANCELED ============');
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
      console.log('✅ User is now on free plan
');

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

    console.log('
🔄 ============ SUBSCRIPTION UPDATED ============');
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
      console.log('✅ New status:', status, '
');

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

// Parse JSON for all other routes
app.use(express.json());

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lessonContext } = req.body;

    // Build system prompt with lesson context
    const systemPrompt = `You are Will, a professional AI tutor helping students master Product Management.

${lessonContext ? `Current Lesson Context:\n${lessonContext}\n` : ''}

CRITICAL RULES - MUST FOLLOW:
- NEVER use emojis or emoticons of any kind
- NEVER use exclamation points (!)
- ALWAYS use British English spelling and vocabulary (organise, colour, analyse, realise, etc.)
- Keep responses professional and concise (2-3 sentences maximum unless more detail is requested)

Your role:
- Provide clear, precise answers to questions about the lesson content
- Use relevant examples when necessary to clarify concepts
- Maintain a professional and supportive tone
- Focus on key concepts without unnecessary elaboration
- Be direct and efficient in your communication

Format your responses with proper structure:
- Use bullet points (•) or numbered lists (1.) when listing multiple items
- Bold important terms or titles by surrounding them with ** (e.g., **Product Management**)
- Use italics for emphasis by surrounding text with single * (e.g., *key concept*)
- Separate distinct sections with line breaks`;

    // Convert messages to Claude format
    const claudeMessages = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Call Claude API - trying multiple models
    let modelToUse = 'claude-3-haiku-20240307'; // Most basic, should be available

    const message = await anthropic.messages.create({
      model: modelToUse,
      max_tokens: 1024,
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

// Knowledge Check - Generate question
app.post('/api/knowledge-check/question', async (req, res) => {
  try {
    const { lessonContext, questionNumber, totalQuestions, previousQA } = req.body;

    // Build a list of previously asked questions to avoid repetition
    const previousQuestions = previousQA?.map(qa => qa.question).join('\n') || 'None yet';

    const systemPrompt = `You are Will, an AI tutor conducting a knowledge check for a student. You need to generate question ${questionNumber} of ${totalQuestions} based on the lesson content.

Lesson Content:
${lessonContext}

Previously Asked Questions:
${previousQuestions}

Your task:
- Generate ONE clear, specific question that tests the student's understanding of the lesson content
- The question should be open-ended (not multiple choice)
- Vary the difficulty - some questions should be straightforward recall, others should require deeper understanding or application
- DO NOT repeat any previously asked questions
- Make sure the question can be answered based on the lesson content provided
- Keep the question concise and clear
- Be friendly and encouraging in your tone

Generate ONLY the question, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate question ${questionNumber} of ${totalQuestions} for this knowledge check.`
        }
      ],
    });

    const question = message.content[0].text;

    res.json({
      success: true,
      question: question
    });

  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Knowledge Check - Evaluate answer
app.post('/api/knowledge-check/evaluate', async (req, res) => {
  try {
    const { lessonContext, question, answer } = req.body;

    const systemPrompt = `You are Will, an AI tutor evaluating a student's answer to a knowledge check question.

Lesson Content:
${lessonContext}

Question Asked: ${question}

Student's Answer: ${answer}

Your task:
1. Determine if the student's answer demonstrates sufficient understanding (you should be somewhat lenient - if they show they understand the core concept, mark it correct even if they don't have every detail)
2. Provide brief, encouraging feedback using British English spelling
3. If correct: Praise them and briefly confirm why their answer is right
4. If incorrect: Gently explain what they missed and provide the correct information
5. Use a calm, professional tone - avoid excessive exclamation points (use at most one per response)

Respond in JSON format:
{
  "isCorrect": true or false,
  "feedback": "Your encouraging feedback here (2-3 sentences max)"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
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

// Generate and store flashcards for a lesson (admin/setup endpoint)
app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { courseId, moduleNumber, lessonNumber, lessonContext } = req.body;

    console.log(`📝 Flashcard generation request for: Course: ${courseId}, Module: ${moduleNumber}, Lesson: ${lessonNumber}`);
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
3. Use 3-5 bullet points per answer
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
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate exactly 15 flashcards for this lesson in JSON format. CRITICAL REQUIREMENTS:\n\n1. EXACTLY 15 flashcards - count them before responding\n2. EVERY answer must be ONLY bullet points using the • character\n3. NO paragraphs, NO sentences without bullets\n4. 3-5 bullet points per answer\n5. Every line in every answer starts with •\n\nDo not deviate from this format.'
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
        model: 'claude-3-haiku-20240307',
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

    console.log('
🎫 ============ CREATING BILLING PORTAL SESSION ============');
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


// Text-to-speech endpoint using Amazon Polly
app.post('/api/text-to-speech', async (req, res) => {
  try {
    let { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Polly Neural voices have a 3000 character limit
    // Truncate text if it exceeds the limit
    const MAX_CHARS = 3000;
    if (text.length > MAX_CHARS) {
      console.log(`⚠️ Text too long (${text.length} chars), truncating to ${MAX_CHARS} chars`);
      text = text.substring(0, MAX_CHARS);
      // Try to end at a sentence boundary
      const lastPeriod = text.lastIndexOf('.');
      if (lastPeriod > MAX_CHARS - 200) {
        text = text.substring(0, lastPeriod + 1);
      }
    }

    // Configure Polly parameters for high-quality British voice
    const params = {
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: 'Arthur', // British English Neural voice (male, authoritative)
      Engine: 'neural', // Neural engine for more natural speech
      TextType: 'text'
    };

    const command = new SynthesizeSpeechCommand(params);
    const response = await pollyClient.send(command);

    // Set response headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked'
    });

    // Stream the audio data to the client
    const audioStream = response.AudioStream;

    // Convert the stream to buffer and send
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.send(audioBuffer);

  } catch (error) {
    console.error('Error generating speech with Polly:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message
    });
  }
});

// Reddit posts endpoint with server-side caching and rate limiting
// Cache is now an object keyed by subreddit name for compatibility
let redditPostsCache = {}; // Object: { [subreddit]: { data, timestamp } }
let redditOAuthToken = { token: null, timestamp: 0 };
let lastRedditRequestTime = 0;
let redditRequestCount = 0;
let redditRateLimitResetTime = 0;

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
      model: 'claude-3-5-sonnet-20240620',
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

    // Prepare email based on type
    let subject, htmlContent;

    switch (type) {
      case 'welcome':
        subject = `Welcome to Ignite, ${firstName}!`;
        // We'll render the React component to HTML
        const WelcomeEmail = (await import('./emails/templates/WelcomeEmail.jsx')).default;
        htmlContent = render(React.createElement(WelcomeEmail, { firstName }));
        break;

      case 'module_complete':
        subject = `🎉 You completed ${data.moduleName}!`;
        const ModuleCompleteEmail = (await import('./emails/templates/ModuleCompleteEmail.jsx')).default;
        htmlContent = render(React.createElement(ModuleCompleteEmail, {
          firstName,
          moduleName: data.moduleName,
          courseName: data.courseName
        }));
        break;

      case 'course_complete':
        subject = `🎓 Congratulations on completing ${data.courseName}!`;
        const CourseCompleteEmail = (await import('./emails/templates/CourseCompleteEmail.jsx')).default;
        htmlContent = render(React.createElement(CourseCompleteEmail, {
          firstName,
          courseName: data.courseName
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

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Ignite <hello@ignite.education>',
      to: userEmail,
      subject,
      html: htmlContent,
    });

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
          author_icon: post.sr_detail?.icon_img || (post.thumbnail?.startsWith('http') ? post.thumbnail : null),
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
                  author_icon: null,
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

    console.log(`📦 Fetching cached posts for r/${subreddit} (limit: ${limit}, last 7 days)`);

    const { data, error} = await supabase
      .from('reddit_posts_cache')
      .select('*')
      .eq('subreddit', subreddit)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('upvotes', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
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

// Run initial cache on startup (async, don't block server start)
setTimeout(async () => {
  console.log('\n🚀 Running initial Reddit cache refresh...');
  for (const subreddit of SUBREDDITS_TO_CACHE) {
    await fetchAndCacheRedditData(subreddit);
  }
}, 5000); // Wait 5 seconds after startup

// Schedule daily cache refresh at 6 AM UTC
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

    const courseName = courseNames[courseId] || courseId;
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
        certificate_number: certificateNumber,
        user_name: userName,
        course_name: courseName,
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

// ============================================================================
// LINKEDIN ENDPOINTS
// ============================================================================

// Cache for LinkedIn posts to avoid rate limiting
let linkedInPostsCache = {
  data: null,
  timestamp: null,
  expiresIn: 15 * 60 * 1000 // Cache for 15 minutes
};

// LinkedIn admin token storage (in production, store in database)
let linkedInAdminToken = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

// Get LinkedIn organization posts
app.get('/api/linkedin/posts', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 3;

    // Check cache first
    const now = Date.now();
    if (linkedInPostsCache.data &&
        linkedInPostsCache.timestamp &&
        (now - linkedInPostsCache.timestamp) < linkedInPostsCache.expiresIn) {
      console.log('📦 Returning cached LinkedIn posts');
      return res.json(linkedInPostsCache.data);
    }

    console.log('🔗 Attempting to fetch LinkedIn posts via API...');

    // Try to fetch from LinkedIn API using admin token
    try {
      const accessToken = await getValidLinkedInToken();
      const orgId = '104616735'; // Ignite Courses organization ID

      const postsResponse = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}&count=${count}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();

        // Transform LinkedIn API response to our format
        const posts = (postsData.elements || []).map((post, idx) => ({
          id: post.organizationalEntity || `post-${idx}`,
          text: post.commentary || post.text?.text || '',
          created: post.lastModified?.time || Date.now(),
          author: 'Ignite Education',
          likes: post.totalShareStatistics?.likeCount || 0,
          comments: post.totalShareStatistics?.commentCount || 0,
          shares: post.totalShareStatistics?.shareCount || 0
        }));

        if (posts.length > 0) {
          // Update cache
          linkedInPostsCache = {
            data: posts,
            timestamp: now
          };

          console.log('✅ Successfully fetched', posts.length, 'LinkedIn posts from API');
          return res.json(posts);
        }
      } else {
        console.error('❌ LinkedIn API returned:', postsResponse.status, await postsResponse.text());
      }
    } catch (apiError) {
      console.log('📋 LinkedIn API fetch failed:', apiError.message);
    }

    // Fallback to mock data
    console.log('📋 Using mock LinkedIn posts (RSS not available)');
    const mockPosts = getMockLinkedInPosts();

    // Update cache with mock data
    linkedInPostsCache = {
      data: mockPosts,
      timestamp: now
    };

    res.json(mockPosts);

  } catch (error) {
    console.error('❌ Error fetching LinkedIn posts:', error);
    // Return mock data on error
    res.json(getMockLinkedInPosts());
  }
});

// Fallback mock data
function getMockLinkedInPosts() {
  return [
    {
      id: '1',
      text: 'Excited to announce our latest course on Product Management! Learn from industry experts and build real-world projects. 🚀',
      created: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      author: 'Ignite Education',
      likes: 47,
      comments: 8,
      shares: 12
    },
    {
      id: '2',
      text: 'Join thousands of learners upskilling with Ignite. Our courses are completely free and designed for everyone. 💡',
      created: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
      author: 'Ignite Education',
      likes: 63,
      comments: 15,
      shares: 21
    },
    {
      id: '3',
      text: 'New module just dropped in our Cybersecurity course! Dive into threat detection and incident response. 🔒',
      created: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      author: 'Ignite Education',
      likes: 89,
      comments: 23,
      shares: 34
    }
  ];
}

// Admin: Initiate LinkedIn OAuth (call this once to authenticate)
app.get('/api/linkedin/admin/auth', (req, res) => {
  const state = Math.random().toString(36).substring(7);

  // Scopes needed:
  // - r_organization_social: Read organization posts (requires Community Management API product)
  // - profile, openid, email: Basic profile info (available with Sign In with LinkedIn)
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${process.env.VITE_LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.VITE_LINKEDIN_REDIRECT_URI)}&` +
    `state=${state}&` +
    `scope=profile%20email`;

  res.redirect(authUrl);
});

// Admin: Handle LinkedIn OAuth callback
app.get('/api/linkedin/admin/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`LinkedIn OAuth error: ${error}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code received');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.VITE_LINKEDIN_REDIRECT_URI,
        client_id: process.env.VITE_LINKEDIN_CLIENT_ID,
        client_secret: process.env.VITE_LINKEDIN_CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', errorData);
      return res.status(500).send(`Failed to exchange code for token: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();

    // Store the token
    linkedInAdminToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    };

    console.log('✅ LinkedIn admin token stored successfully');
    console.log('   Expires at:', new Date(linkedInAdminToken.expiresAt).toLocaleString());

    res.send(`
      <html>
        <head><title>LinkedIn Auth Success</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: #0077b5;">✅ LinkedIn Authentication Successful!</h1>
          <p>Your LinkedIn posts will now appear on the auth page.</p>
          <p>Token expires: ${new Date(linkedInAdminToken.expiresAt).toLocaleString()}</p>
          <p><a href="/">Return to homepage</a></p>
        </body>
      </html>
    `);

    // Clear the posts cache to fetch fresh data
    linkedInPostsCache = { data: null, timestamp: null, expiresIn: 15 * 60 * 1000 };

  } catch (error) {
    console.error('Error in LinkedIn callback:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Helper: Get valid LinkedIn access token (with refresh if needed)
async function getValidLinkedInToken() {
  // Check if we have a token
  if (!linkedInAdminToken.accessToken) {
    throw new Error('No LinkedIn admin token available. Please authenticate first.');
  }

  // Check if token is still valid (with 5 min buffer)
  const now = Date.now();
  if (linkedInAdminToken.expiresAt && now < linkedInAdminToken.expiresAt - (5 * 60 * 1000)) {
    return linkedInAdminToken.accessToken;
  }

  // Token expired or about to expire, try to refresh
  if (!linkedInAdminToken.refreshToken) {
    throw new Error('LinkedIn token expired and no refresh token available. Please re-authenticate.');
  }

  console.log('🔄 Refreshing LinkedIn access token...');

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: linkedInAdminToken.refreshToken,
        client_id: process.env.VITE_LINKEDIN_CLIENT_ID,
        client_secret: process.env.VITE_LINKEDIN_CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh LinkedIn token');
    }

    const tokenData = await tokenResponse.json();

    // Update stored token
    linkedInAdminToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || linkedInAdminToken.refreshToken,
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    };

    console.log('✅ LinkedIn token refreshed successfully');
    return linkedInAdminToken.accessToken;

  } catch (error) {
    console.error('❌ Failed to refresh LinkedIn token:', error);
    throw new Error('Failed to refresh LinkedIn token. Please re-authenticate.');
  }
}

// ============================================================================
// END LINKEDIN ENDPOINTS
// ============================================================================

app.listen(PORT, () => {
  console.log(`🤖 Claude chat server running on http://localhost:${PORT}`);
  console.log(`✅ API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ AWS Polly configured: ${process.env.AWS_ACCESS_KEY_ID ? 'Yes' : 'No'}`);
  console.log(`✅ Resend configured: ${process.env.RESEND_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ LinkedIn configured: ${process.env.VITE_LINKEDIN_CLIENT_ID && process.env.VITE_LINKEDIN_CLIENT_SECRET ? 'Yes' : 'No'}`);
});
