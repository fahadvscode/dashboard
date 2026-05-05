# SMS Integration with Twilio

## Overview
The lead management system now includes **two-way SMS communication** powered by Twilio. You can send text messages to leads AND receive their replies!

## Features
- ✅ Send SMS messages to leads directly from the lead detail modal
- ✅ Receive incoming SMS from leads automatically
- ✅ View all conversations in the **SMS Conversations** page
- ✅ Reply to messages directly from the conversations interface
- ✅ Real-time message updates using Supabase subscriptions
- ✅ Automatic lead matching by phone number
- ✅ Complete message history tracking
- ✅ Works in both FJ Leads and Precon Factory Leads pages

## Twilio Configuration

Store credentials only in environment variables (Vercel / `.env.local`). **Never commit** Account SID, Auth Token, or API keys to git.

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

## How to Use

### Sending SMS from Lead Cards:
1. **Navigate to Leads Page**: Go to either FJ Leads or Precon Factory Leads
2. **Open Lead Details**: Click on any lead row to open their detail modal
3. **Send SMS**: 
   - Scroll to the "Send SMS" section in the lead card
   - Type your message in the text area
   - Click the "Send SMS" button
4. **Confirmation**: You'll see a success message when the SMS is sent

### Managing Conversations:
1. **Open Conversations**: Click "SMS Conversations" in the sidebar
2. **View Messages**: See all conversations grouped by phone number
3. **Select Conversation**: Click on any conversation to view the full message history
4. **Reply**: Type your message in the reply box and click "Send" or press Enter
5. **Real-time Updates**: New messages appear automatically - no refresh needed!

### Receiving SMS:
- When a lead replies to your message, it automatically appears in the Conversations page
- The system matches incoming messages to leads by phone number
- Unread message counts show on each conversation

## API Endpoints

### Send SMS
- **Route**: `/api/leads/send-sms`
- **Method**: POST
- **Body**:
  ```json
  {
    "to": "+1234567890",
    "message": "Your message here",
    "leadName": "John Doe",
    "leadId": "lead-uuid",
    "leadTable": "fj_leads"
  }
  ```

### Receive SMS (Webhook)
- **Route**: `/api/sms/webhook`
- **Method**: POST
- **Used by**: Twilio to send incoming messages
- **Configuration**: See `TWILIO_WEBHOOK_SETUP.md` for complete setup instructions

## Error Handling
- If the lead has no phone number, the button will be disabled
- If the message is empty, the button will be disabled
- Any Twilio errors will be displayed to the user
- Network errors are caught and displayed with user-friendly messages

## Files Created/Modified
1. `/app/api/leads/send-sms/route.ts` - API route for sending SMS
2. `/app/api/sms/webhook/route.ts` - Webhook endpoint for receiving SMS
3. `/app/conversations/page.tsx` - Two-way conversations interface
4. `/app/precon-leads/page.tsx` - Added SMS UI and logic
5. `/app/fj-leads/page.tsx` - Added SMS UI and logic
6. `/components/Sidebar.tsx` - Added SMS Conversations link
7. `sms_conversations_table.sql` - Database schema for message storage
8. `package.json` - Added Twilio SDK dependency

## Database Setup Required
Before using the SMS features, you must create the `sms_conversations` table:
1. Go to: https://cfzuypbljirmibmxpabi.supabase.co/project/_/sql/new
2. Copy contents from `sms_conversations_table.sql`
3. Paste and click "Run"

## Twilio Webhook Configuration Required
To receive incoming SMS, configure your Twilio webhook:
📖 See `TWILIO_WEBHOOK_SETUP.md` for complete instructions

## Troubleshooting

### SMS Not Sending
1. Verify Twilio credentials are correct
2. Check that the Twilio phone number is verified and active
3. Ensure the recipient's phone number is in the correct format (E.164)
4. Check Twilio console for any account restrictions or errors

### Button Disabled
- Ensure the lead has a phone number
- Type a message in the text area
- Check browser console for any JavaScript errors

