import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;

/**
 * Generate course description using Claude AI
 * Analyzes module and lesson structure to create intelligent summary
 * @param {string} courseTitle - The course title
 * @param {string} courseType - The course type (specialism/skill/subject)
 * @param {Array} modules - Array of module objects with lessons
 * @returns {Promise<string>} Generated description (max 250 chars)
 */
export async function generateCourseDescription(courseTitle, courseType, modules) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true // Only for admin tools
  });

  // Build prompt from course structure
  const modulesList = modules.map((module, idx) => {
    const lessonsList = (module.lessons || []).map(l => `  - ${l.name}`).join('\n');
    return `Module ${idx + 1}: ${module.name}\n${lessonsList}`;
  }).join('\n\n');

  const typeContext = {
    'specialism': 'This is a career-focused course designed to prepare learners for a specific profession.',
    'skill': 'This is a skill-building course focused on developing a particular ability or competency.',
    'subject': 'This is an academic subject course covering theoretical and practical knowledge in a topic area.'
  };

  const prompt = `Generate a compelling course description for "${courseTitle}".

${typeContext[courseType] || typeContext['specialism']}

Course Structure:
${modulesList}

Requirements:
- Maximum 250 characters (strict limit)
- Focus on learning outcomes and benefits
- Professional and engaging tone
- No marketing fluff, be specific and practical
- Mention key skills or knowledge areas covered

Return ONLY the description text, no other commentary.`;

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 150,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let description = message.content[0].text.trim();

    // Ensure under 250 characters
    if (description.length > 250) {
      description = description.substring(0, 247) + '...';
    }

    return description;
  } catch (error) {
    console.error('Error generating description with Claude:', error);
    throw new Error('Failed to generate description. Please try again.');
  }
}
