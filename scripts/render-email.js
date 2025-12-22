/**
 * Render React Email templates to HTML
 * Usage: node scripts/render-email.js [template-name]
 * Example: node scripts/render-email.js WelcomeEmail
 */

import { render } from '@react-email/render';
import * as React from 'react';
import fs from 'fs';
import path from 'path';

// Dynamic import the template
const templateName = process.argv[2] || 'WelcomeEmail';

async function main() {
  try {
    // Import the template
    const templatePath = `../emails/templates/${templateName}.jsx`;
    const { default: EmailTemplate } = await import(templatePath);

    // Render to HTML with sample data
    const html = await render(React.createElement(EmailTemplate, {
      firstName: '{{first_name}}',  // Resend merge tag
    }));

    // Output to console and file
    const outputPath = `emails/output/${templateName}.html`;

    // Ensure output directory exists
    if (!fs.existsSync('emails/output')) {
      fs.mkdirSync('emails/output', { recursive: true });
    }

    fs.writeFileSync(outputPath, html);

    console.log(`✅ Rendered ${templateName} to ${outputPath}`);
    console.log(`\n📋 Copy the HTML from: ${outputPath}`);
    console.log('\n--- HTML Preview (first 500 chars) ---');
    console.log(html.substring(0, 500) + '...');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
