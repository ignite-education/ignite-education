# Resend Email Integration Setup

This guide will help you set up Resend for automated emails in Ignite.

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. You get **3,000 emails/month** free

## Step 2: Get API Key

1. Once logged in, go to **API Keys** in the sidebar
2. Click **Create API Key**
3. Name it something like "Ignite Production"
4. Copy the API key (starts with `re_`)

## Step 3: Verify Your Domain

For production emails, you need to verify your domain:

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter `ignite.education`
4. Add the DNS records to your domain (usually through your domain registrar)
5. Wait for verification (usually a few minutes)

**For testing**, you can use Resend's test email addresses without domain verification.

## Step 4: Add Environment Variable

Add your Resend API key to your environment:

### Local Development (.env file):
```
RESEND_API_KEY=re_your_api_key_here
```

### Production (Render.com):
1. Go to your Render dashboard
2. Select your backend service (ignite-education-api)
3. Go to **Environment** tab
4. Add new environment variable:
   - Key: `RESEND_API_KEY`
   - Value: `re_your_api_key_here`
5. Click **Save Changes** (this will redeploy your server)

## Step 5: Test the Integration

### Test Welcome Email:
1. Create a new user account on Ignite
2. Check the email inbox for the welcome email
3. Check server logs for confirmation: `✅ Email sent successfully`

### Test from Terminal:
```bash
curl -X POST https://ignite-education-api.onrender.com/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "userId": "your-test-user-id"
  }'
```

## Email Templates

We have 3 email templates ready:

1. **Welcome Email** (`emails/templates/WelcomeEmail.jsx`)
   - Triggered on: User signup
   - Subject: "Welcome to Ignite, {firstName}!"

2. **Module Complete Email** (`emails/templates/ModuleCompleteEmail.jsx`)
   - Triggered on: Module completion
   - Subject: "🎉 You completed {moduleName}!"

3. **Course Complete Email** (`emails/templates/CourseCompleteEmail.jsx`)
   - Triggered on: Course completion
   - Subject: "🎓 Congratulations on completing {courseName}!"

## Triggering Emails

### From Frontend Code:
```javascript
import { sendWelcomeEmail, sendModuleCompleteEmail, sendCourseCompleteEmail } from '../lib/email';

// Welcome email (already integrated in signup)
await sendWelcomeEmail(userId);

// Module complete email
await sendModuleCompleteEmail(userId, 'Module 1: Introduction', 'Product Manager');

// Course complete email
await sendCourseCompleteEmail(userId, 'Product Manager');
```

### Integration Points:

#### ✅ Already Integrated:
- **Signup**: Welcome email sent in `AuthContext.jsx`

#### 🔜 To Integrate:
- **Module Complete**: Add to ProgressHub.jsx when user marks module complete
- **Course Complete**: Add to ProgressHub.jsx when user completes all modules

## Monitoring & Analytics

View email stats in Resend dashboard:
- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Logs of all sent emails

## Sending Marketing Emails (Ad-hoc)

For newsletters and announcements, you can either:

### Option A: Use Resend Broadcasts (Recommended)
1. Log in to Resend dashboard
2. Go to **Broadcasts**
3. Create a new broadcast
4. Select your audience (you can import from your database)
5. Write your email
6. Send or schedule

### Option B: Programmatic Batch Send
Create an admin endpoint to send to all users:

```javascript
// Add this to server.js for admin use
app.post('/api/send-newsletter', verifyAdmin, async (req, res) => {
  const { subject, content } = req.body;

  // Get all users who opted in
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('marketing_emails', true);

  // Send in batches
  for (const user of users) {
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
    await resend.emails.send({
      from: 'Ignite <hello@ignite.education>',
      to: authUser.email,
      subject: subject,
      html: content
    });
  }

  res.json({ success: true, sent: users.length });
});
```

## Troubleshooting

### Email not sending?
1. Check server logs for errors
2. Verify `RESEND_API_KEY` is set correctly
3. Check Resend dashboard for failed sends
4. Ensure domain is verified (for production)

### Emails going to spam?
1. Verify your domain with Resend
2. Add SPF, DKIM records (Resend provides these)
3. Warm up your domain (send gradually increasing volumes)

### Need help?
- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com

## Cost & Limits

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- All features included

**Pro Tier ($20/month):**
- 50,000 emails/month
- Unlimited daily sends
- Custom domains
- Priority support

For Ignite's current scale, the free tier should be sufficient!
