# 📧 Gmail App Password Setup for Email Notifications

## Overview

This guide will help you set up a Gmail App Password for `info@qikfill.com` to send lead notification emails.

---

## 🔐 Step 1: Enable 2-Step Verification

App Passwords require 2-Step Verification to be enabled on your Google account.

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in with `info@qikfill.com`
3. Under **"How you sign in to Google"**, click **2-Step Verification**
4. Follow the prompts to set it up (you'll need your phone)
5. Once enabled, you'll see a checkmark ✅

---

## 🔑 Step 2: Generate App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Or: Google Account → Security → 2-Step Verification → App passwords (at bottom)
2. Sign in with `info@qikfill.com` if prompted
3. Under **"Select app"**, choose **Mail**
4. Under **"Select device"**, choose **Other (Custom name)**
5. Enter name: `Property Dashboard Lead Notifications`
6. Click **Generate**
7. Google will show you a 16-character password like: `abcd efgh ijkl mnop`
8. **Copy this password** (you won't be able to see it again!)

---

## 🔧 Step 3: Add to Vercel Environment Variables

Add these environment variables to your Vercel project:

### Via Vercel Dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **property-dashboard**
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

**Variable 1:**
- **Key**: `GMAIL_USER`
- **Value**: `info@qikfill.com`
- **Environment**: Production, Preview, Development
- Click **Save**

**Variable 2:**
- **Key**: `GMAIL_APP_PASSWORD`
- **Value**: `[paste the 16-character password from Step 2]`
- **Environment**: Production, Preview, Development
- Click **Save**

5. **Redeploy** your application

---

## 📋 Environment Variables Summary

```bash
# Gmail SMTP Configuration
GMAIL_USER=info@qikfill.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # Replace with your actual app password
```

---

## 🧪 Step 4: Test Email Notifications

After adding environment variables and redeploying:

### Test with a Lead Insert:

Run this in **Supabase SQL Editor**:

```sql
INSERT INTO fj_leads (
  firstname,
  lastname,
  email,
  phone,
  project_name,
  source,
  isagent
) VALUES (
  'Test',
  'Email',
  'test@example.com',
  '1234567890',
  'Test Project',
  'Website',
  false
);
```

### Expected Results:

1. ✅ **SMS sent** to: `6478981739`, `4168296121`, `4163994289`
2. ✅ **Emails sent** to: `info@fahadsold.com`, `info@preconfactory.com`
3. ✅ **From**: `info@qikfill.com`

### Check Email:

1. Check inbox at `info@fahadsold.com` and `info@preconfactory.com`
2. Look for email with subject: `🔔 New FJ Lead: Test Email`
3. Email should have:
   - Professional HTML design
   - All lead details (name, email, phone, project)
   - Button to view in dashboard
   - Same information as SMS

---

## 🔍 Troubleshooting

### "Invalid login" or "Authentication failed"

**Cause**: App password not set correctly or 2-Step Verification not enabled.

**Fix**:
1. Verify 2-Step Verification is enabled
2. Generate a new App Password
3. Update `GMAIL_APP_PASSWORD` in Vercel
4. Redeploy

### "Less secure app access"

**Note**: App Passwords are the secure way to authenticate. You don't need to enable "less secure app access" (that's deprecated).

### Emails not arriving

**Check**:
1. Spam/Junk folders at `info@fahadsold.com` and `info@preconfactory.com`
2. Vercel logs for errors:
   - Go to Vercel Dashboard → Logs
   - Look for errors in `/api/leads/notify`
3. Verify environment variables are set correctly

### Gmail rate limits

Gmail has sending limits:
- **Free Gmail**: ~500 emails/day
- **Google Workspace**: ~2,000 emails/day

For your use case (2 emails per lead), this should be more than enough.

---

## 📧 Email Recipients

Currently configured to send to:
- `info@fahadsold.com`
- `info@preconfactory.com`

**To add more recipients**, edit the array in `/app/api/leads/notify/route.ts`:

```typescript
const notificationEmails = ['info@fahadsold.com', 'info@preconfactory.com', 'another@email.com']
```

---

## 🔒 Security Best Practices

✅ **DO:**
- Use App Passwords (not your actual Gmail password)
- Store App Password in environment variables only
- Keep App Password secret
- Revoke and regenerate if compromised

❌ **DON'T:**
- Commit App Password to Git
- Share App Password publicly
- Use your actual Gmail password for SMTP
- Enable "less secure app access"

---

## 🎨 Email Design

The email includes:
- **Professional HTML template** with gradient header
- **All lead details** in a clean format
- **Call-to-action button** to view in dashboard
- **Plain text fallback** for email clients that don't support HTML
- **Responsive design** that works on mobile and desktop

---

## 📝 What Gets Sent

### Email Subject:
```
🔔 New [Source] Lead: [Firstname] [Lastname]
```

### Email Content:
- Lead name
- Email address
- Phone number
- Project name
- Project ID (if available)
- Landing page URL (if available)
- Lead type (Agent/Buyer)
- Timestamp
- Link to dashboard

**Same information as SMS**, but in a beautiful HTML format!

---

## ✅ Setup Checklist

- [ ] 2-Step Verification enabled on `info@qikfill.com`
- [ ] App Password generated
- [ ] `GMAIL_USER` added to Vercel environment variables
- [ ] `GMAIL_APP_PASSWORD` added to Vercel environment variables
- [ ] Application redeployed
- [ ] Test lead inserted
- [ ] Emails received at `info@fahadsold.com` and `info@preconfactory.com`

---

## 🎉 Summary

Once set up, every new lead will automatically:
1. Send SMS to team members (existing functionality)
2. Send professional HTML email to `info@fahadsold.com` and `info@preconfactory.com`
3. All sent from `info@qikfill.com` using secure Gmail SMTP

No manual intervention needed - fully automated! 🚀

