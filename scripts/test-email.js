/**
 * Quick test script to send a test email
 * Usage: node scripts/test-email.js your@email.com
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple test email HTML (no React dependencies needed)
const testEmailHtml = (firstName) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
      <img src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png"
           width="140" alt="Ignite" style="margin-bottom: 20px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Test Email Working!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #525252; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
        Hey ${firstName},
      </p>
      <p style="color: #525252; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
        This is a test email from your Ignite Education platform. If you're seeing this, your email integration is working correctly!
      </p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #166534; font-size: 14px; margin: 0;">
          ✅ Resend API connected<br>
          ✅ Audience sync ready<br>
          ✅ Broadcasts enabled
        </p>
      </div>

      <p style="color: #525252; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        You can now send broadcasts to your users via the Resend dashboard.
      </p>

      <!-- Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://resend.com/broadcasts"
           style="background-color: #ec4899; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Go to Resend Broadcasts
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0;">
        Sent from Ignite Education<br>
        <a href="https://ignite.education" style="color: #ec4899;">ignite.education</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

async function main() {
  const toEmail = process.argv[2];

  if (!toEmail) {
    console.log('Usage: node scripts/test-email.js your@email.com');
    process.exit(1);
  }

  console.log(`📧 Sending test email to ${toEmail}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Ignite <hello@ignite.education>',
      to: toEmail,
      subject: '🧪 Test Email - Ignite Education',
      html: testEmailHtml('there'),
    });

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('   Email ID:', data.id);
    console.log(`\n📬 Check your inbox at ${toEmail}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
