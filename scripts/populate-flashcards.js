/**
 * Script to generate and populate flashcards for lessons
 *
 * Usage:
 * node scripts/populate-flashcards.js <courseId> <moduleNumber> <lessonNumber>
 *
 * Example:
 * node scripts/populate-flashcards.js product-manager 1 1
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getLessonContent(courseId, moduleNumber, lessonNumber) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_number', moduleNumber)
    .eq('lesson_number', lessonNumber)
    .order('order_index');

  if (error) {
    throw new Error(`Error fetching lesson: ${error.message}`);
  }

  return data;
}

async function generateFlashcards(lessonSections, lessonName, moduleNumber) {
  const lessonContext = `
Lesson: ${lessonName}
Module: ${moduleNumber}

Sections:
${lessonSections.map(section => `
Title: ${section.title}
Content: ${typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
`).join('\n---\n')}
  `.trim();

  const systemPrompt = `You are Will, an AI tutor creating flashcards to help students review lesson content.

Lesson Content:
${lessonContext}

Your task:
Generate exactly 15 flashcard questions based on the key concepts from this lesson. Each flashcard should:
1. Have a clear, specific question that tests understanding of the lesson content
2. Have a concise but complete answer (2-4 sentences)
3. Focus on important concepts, key takeaways, and practical applications from the lesson
4. Use varied question types (what, how, why, explain, compare, apply, etc.)
5. Cover the full breadth of the lesson - from basic concepts to advanced applications
6. Be self-contained (the question and answer should make sense without additional context)

Respond in JSON format with an array of exactly 15 flashcards:
{
  "flashcards": [
    {
      "question": "Question text here",
      "answer": "Answer text here"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Generate exactly 15 flashcards for this lesson in JSON format.'
      }
    ],
  });

  const responseText = message.content[0].text;

  // Parse JSON response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const flashcardsData = JSON.parse(jsonMatch[0]);
  return flashcardsData.flashcards || [];
}

async function saveFlashcards(courseId, moduleNumber, lessonNumber, flashcards) {
  // First, delete any existing flashcards for this lesson
  const { error: deleteError } = await supabase
    .from('flashcards')
    .delete()
    .eq('course_id', courseId)
    .eq('module_number', moduleNumber)
    .eq('lesson_number', lessonNumber);

  if (deleteError) {
    console.warn('Warning deleting existing flashcards:', deleteError.message);
  }

  // Insert new flashcards
  const flashcardsToInsert = flashcards.map(card => ({
    course_id: courseId,
    module_number: moduleNumber,
    lesson_number: lessonNumber,
    question: card.question,
    answer: card.answer
  }));

  const { data, error } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert)
    .select();

  if (error) {
    throw new Error(`Error saving flashcards: ${error.message}`);
  }

  return data;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node scripts/populate-flashcards.js <courseId> <moduleNumber> <lessonNumber>');
    console.error('Example: node scripts/populate-flashcards.js product-manager 1 1');
    process.exit(1);
  }

  const [courseId, moduleNumber, lessonNumber] = args;
  const moduleNum = parseInt(moduleNumber);
  const lessonNum = parseInt(lessonNumber);

  console.log(`\n🚀 Generating flashcards for:`);
  console.log(`   Course: ${courseId}`);
  console.log(`   Module: ${moduleNum}`);
  console.log(`   Lesson: ${lessonNum}\n`);

  try {
    // Fetch lesson content
    console.log('📚 Fetching lesson content...');
    const lessonSections = await getLessonContent(courseId, moduleNum, lessonNum);

    if (!lessonSections || lessonSections.length === 0) {
      throw new Error('No lesson content found');
    }

    const lessonName = lessonSections[0]?.lesson_name || 'Unknown Lesson';
    console.log(`   Found lesson: "${lessonName}" with ${lessonSections.length} sections\n`);

    // Generate flashcards
    console.log('🤖 Generating 15 flashcards with AI...');
    const flashcards = await generateFlashcards(lessonSections, lessonName, moduleNum);

    if (flashcards.length !== 15) {
      console.warn(`⚠️  Warning: Generated ${flashcards.length} flashcards instead of 15`);
    } else {
      console.log(`   ✅ Generated ${flashcards.length} flashcards\n`);
    }

    // Save to database
    console.log('💾 Saving flashcards to database...');
    const saved = await saveFlashcards(courseId, moduleNum, lessonNum, flashcards);
    console.log(`   ✅ Saved ${saved.length} flashcards\n`);

    console.log('✨ Done! Flashcards are now available for this lesson.\n');

    // Show preview
    console.log('📋 Preview of first 3 flashcards:');
    flashcards.slice(0, 3).forEach((card, i) => {
      console.log(`\n${i + 1}. Q: ${card.question}`);
      console.log(`   A: ${card.answer}`);
    });
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
