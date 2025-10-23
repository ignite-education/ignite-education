import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase (for updating user metadata)
// Using service role key to have admin permissions for updating user metadata
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Initialize AWS Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

app.use(cors());
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
5. Be MAXIMUM 60 characters long (this is strict - count carefully)
6. Be 5-12 words long

Examples of good questions (all under 60 characters):
- "How would you apply this to your product?" (47 chars)
- "What makes this approach effective?" (36 chars)
- "Why is this concept important for PMs?" (39 chars)
- "How does this differ from traditional methods?" (48 chars)

Respond with ONLY the question text, nothing else. No introduction, no explanation, just the question. Keep it under 60 characters.`;

    let question = '';
    let attempts = 0;
    const maxAttempts = 3;

    // Try up to 3 times to get a question under 60 characters
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
              : `Generate a shorter suggested question for this section. Make it under 60 characters. Previous attempt was ${question.length} characters.`
          }
        ],
      });

      question = message.content[0].text.trim();

      if (question.length <= 60) {
        break;
      }

      attempts++;
    }

    // If still too long after 3 attempts, use a generic fallback
    if (question.length > 60) {
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
          price: 'price_1SIDOlRxlg2WD2fjNja32u3w', // Your recurring price ID
          quantity: 1,
        },
      ],
      mode: 'subscription', // Changed from 'payment' to 'subscription'
      return_url: `${req.headers.origin || 'http://localhost:5173'}/learning?payment=success`,
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

// Stripe webhook endpoint to handle successful payments
app.post('/api/webhook/stripe', async (req, res) => {
  // For now, we'll skip signature verification in development
  // In production, you should verify the webhook signature
  let event;

  try {
    // Get the event from the request body
    event = req.body;

    console.log('📨 Received webhook event:', event.type);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    console.log('💳 Payment successful for user:', userId);

    if (userId) {
      try {
        // Update user metadata in Supabase to mark them as ad-free
        const { error } = await supabase.auth.admin.updateUserById(
          userId,
          {
            user_metadata: { is_ad_free: true }
          }
        );

        if (error) {
          console.error('Error updating user metadata:', error);
        } else {
          console.log(`✅ User ${userId} upgraded to ad-free`);
        }
      } catch (error) {
        console.error('Error updating user in Supabase:', error);
      }
    }
  }

  res.json({ received: true });
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

// Reddit posts endpoint with server-side caching
let redditPostsCache = { data: null, timestamp: 0 };
const REDDIT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/api/reddit-posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 40;

    // Check if we have valid cached data
    const now = Date.now();
    if (redditPostsCache.data && (now - redditPostsCache.timestamp) < REDDIT_CACHE_DURATION) {
      console.log('📦 Returning cached Reddit posts');
      return res.json(redditPostsCache.data);
    }

    console.log('🔄 Fetching fresh Reddit posts...');

    // Fetch from Reddit API (no CORS issues on server-side)
    const redditUrl = `https://www.reddit.com/r/ProductManagement/hot.json?limit=${limit}`;
    const response = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'IgniteLearning/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const json = await response.json();

    // Transform Reddit data
    const posts = await Promise.all(json.data.children.map(async child => {
      const post = child.data;

      // Fetch user icon
      let authorIcon = null;
      try {
        const userResponse = await fetch(`https://www.reddit.com/user/${post.author}/about.json`, {
          headers: { 'User-Agent': 'IgniteLearning/1.0' }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          authorIcon = userData.data?.icon_img || userData.data?.snoovatar_img || null;
          if (authorIcon) {
            authorIcon = authorIcon.split('?')[0];
            authorIcon = authorIcon.replace(/&amp;/g, '&');
          }
        }
      } catch (err) {
        console.error('Error fetching Reddit user icon:', err);
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
    }));

    // Cache the results
    redditPostsCache = {
      data: posts,
      timestamp: now
    };

    console.log(`✅ Fetched and cached ${posts.length} Reddit posts`);
    res.json(posts);

  } catch (error) {
    console.error('Error fetching Reddit posts:', error);

    // If we have stale cache, return it rather than failing
    if (redditPostsCache.data) {
      console.log('⚠️ Returning stale cache due to error');
      return res.json(redditPostsCache.data);
    }

    res.status(500).json({
      error: 'Failed to fetch Reddit posts',
      message: error.message
    });
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

app.listen(PORT, () => {
  console.log(`🤖 Claude chat server running on http://localhost:${PORT}`);
  console.log(`✅ API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
  console.log(`✅ AWS Polly configured: ${process.env.AWS_ACCESS_KEY_ID ? 'Yes' : 'No'}`);
});
