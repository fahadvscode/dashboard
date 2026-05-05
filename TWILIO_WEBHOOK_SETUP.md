# 📱 Twilio SMS Two-Way Conversation Setup

## Overview
Your dashboard now supports **two-way SMS conversations** with leads. You can send messages and receive replies automatically!

## Features
- ✅ Send SMS from lead detail cards
- ✅ Receive incoming SMS from leads
- ✅ View all conversations in one place
- ✅ Real-time message updates
- ✅ Lead association with phone numbers
- ✅ Message history tracking

---

## 🚀 Quick Setup

### Step 1: Create Database Table

Run the SQL file in your Supabase SQL Editor:

1. Go to: https://cfzuypbljirmibmxpabi.supabase.co/project/_/sql/new
2. Copy the contents from `sms_conversations_table.sql`
3. Paste and click **"Run"**

This creates the `sms_conversations` table to store all your SMS messages.

---

### Step 2: Configure Twilio Webhook

To receive incoming SMS, configure your Twilio webhook:

#### 2a. Get Your Webhook URL

**Local Development:**
```
http://localhost:3000/api/sms/webhook
```
(Use ngrok for testing: `ngrok http 3000`)

**Production:**
```
https://your-domain.vercel.app/api/sms/webhook
```

#### 2b. Configure in Twilio Console

1. **Go to Twilio Console**: https://console.twilio.com/
2. **Navigate to**: Phone Numbers → Manage → Active Numbers
3. **Click your number**: (647) 558-0012
4. **Scroll to "Messaging Configuration"**
5. **Under "A MESSAGE COMES IN"**:
   - Select: **Webhook**
   - URL: `https://your-domain.vercel.app/api/sms/webhook`
   - Method: **HTTP POST**
6. **Click "Save"**

#### Example Configuration:
```
Configure with:
✓ When a message comes in: Webhook
✓ URL: https://property-dashboard-xyz.vercel.app/api/sms/webhook
✓ HTTP Method: POST
```

---

### Step 3: Test the Integration

#### Test Sending SMS:
1. Go to FJ Leads or Precon Factory Leads
2. Click on a lead with a phone number
3. Scroll to "Send SMS" section
4. Type a message and click "Send SMS"
5. Check your Supabase `sms_conversations` table

#### Test Receiving SMS:
1. Have someone text your Twilio number: (647) 558-0012
2. The message should appear in your Conversations page
3. Check browser console and Supabase table for confirmation

#### View Conversations:
1. Click **"SMS Conversations"** in the sidebar
2. See all conversations grouped by phone number
3. Click a conversation to view messages
4. Reply directly from the interface

---

## 🛠 Troubleshooting

### Issue: Not receiving incoming SMS

**Solution 1: Check Webhook URL**
- Verify the webhook URL is correct in Twilio Console
- Make sure it ends with `/api/sms/webhook`
- Ensure it's using HTTPS (not HTTP) in production

**Solution 2: Check Twilio Logs**
- Go to: https://console.twilio.com/monitor/logs/sms
- Look for recent incoming messages
- Check for webhook errors

**Solution 3: Test the Webhook**
```bash
curl -X POST https://your-domain.vercel.app/api/sms/webhook \
  -d "MessageSid=SM123" \
  -d "From=+1234567890" \
  -d "To=+16475580012" \
  -d "Body=Test message"
```

### Issue: Messages not showing in Conversations page

**Check Database:**
```sql
SELECT * FROM sms_conversations ORDER BY created_at DESC LIMIT 10;
```

**Check Browser Console:**
- Open Developer Tools (F12)
- Look for errors in Console tab
- Check Network tab for failed requests

### Issue: Can't send SMS

**Verify Environment Variables:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

---

## 📊 Database Schema

The `sms_conversations` table structure:

```sql
CREATE TABLE sms_conversations (
  id UUID PRIMARY KEY,
  message_sid TEXT UNIQUE,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  status TEXT,
  lead_name TEXT,
  lead_id TEXT,
  lead_table TEXT, -- 'fj_leads' or 'precon_factory_leads'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔐 Security Best Practices

### Enable Webhook Validation (Optional but Recommended)

Uncomment the validation code in `app/api/sms/webhook/route.ts`:

```typescript
const twilioSignature = request.headers.get('x-twilio-signature') || ''
const url = request.url
const params = Object.fromEntries(formData.entries())
const isValid = twilio.validateRequest(authToken, twilioSignature, url, params)
if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
}
```

This ensures only Twilio can send webhooks to your endpoint.

---

## 📱 Using the Conversations Page

### Features:
- **Left Sidebar**: List of all conversations
  - Shows lead name and phone number
  - Displays last message preview
  - Shows unread message count
  - Sorts by most recent activity

- **Main Chat Area**: 
  - View full conversation history
  - Outbound messages (blue, right-aligned)
  - Inbound messages (gray, left-aligned)
  - Timestamps for all messages

- **Reply Box**:
  - Type and send replies
  - Press Enter to send (Shift+Enter for new line)
  - Real-time delivery

### Real-Time Updates:
The page automatically updates when new messages arrive - no refresh needed!

---

## 🎯 Next Steps

1. ✅ **Run the SQL** to create the database table
2. ✅ **Configure Twilio webhook** with your production URL
3. ✅ **Test sending** an SMS from a lead card
4. ✅ **Test receiving** by texting your Twilio number
5. ✅ **View conversations** in the SMS Conversations page

---

## 📞 Support

**Twilio Console**: https://console.twilio.com/  
**Supabase Dashboard**: https://cfzuypbljirmibmxpabi.supabase.co/  

### Useful Twilio Links:
- SMS Logs: https://console.twilio.com/monitor/logs/sms
- Phone Numbers: https://console.twilio.com/phone-numbers
- Messaging Services: https://console.twilio.com/messaging/services

---

## 💡 Tips

- **Testing Locally**: Use ngrok to expose your local server:
  ```bash
  ngrok http 3000
  # Use the ngrok URL in Twilio webhook config
  ```

- **Message History**: All messages are stored permanently in the database

- **Lead Matching**: The system automatically matches incoming SMS to leads by phone number

- **No Lead Match**: If an unknown number texts you, the conversation still appears but shows "Unknown Lead"

---

## 🎉 You're All Set!

Your SMS conversation system is now ready! Start sending messages to leads and track all your conversations in one place.

