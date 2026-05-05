# 🚀 SMS Conversations - Quick Start Guide

## ✅ What's Been Added

Your dashboard now has **full two-way SMS communication**! Here's what's new:

### 1. SMS Conversations Page
- **Location**: Click "SMS Conversations" in the sidebar
- **Features**:
  - View all conversations in one place
  - See message history with each lead
  - Reply to messages directly
  - Real-time updates (no refresh needed!)
  - Unread message indicators

### 2. Enhanced Lead Cards
- Send SMS button in lead detail modals
- Tracks all outgoing messages
- Links messages to specific leads

### 3. Automatic Incoming SMS
- Leads can reply to your messages
- Replies appear automatically in Conversations page
- System matches messages to leads by phone number

---

## 🎯 3-Step Setup

### Step 1: Create Database Table (Required)
1. Go to: https://cfzuypbljirmibmxpabi.supabase.co/project/_/sql/new
2. Copy contents from `sms_conversations_table.sql`
3. Click **"Run"**

### Step 2: Configure Twilio Webhook (Required for Receiving SMS)
1. Go to: https://console.twilio.com/phone-numbers
2. Click your number: **(647) 558-0012**
3. Under "Messaging Configuration":
   - When a message comes in: **Webhook**
   - URL: `https://your-production-domain.vercel.app/api/sms/webhook`
   - Method: **HTTP POST**
4. Click **"Save"**

### Step 3: Test It Out!
1. Send an SMS from a lead card
2. Text your Twilio number from your phone
3. Check the Conversations page - you should see your messages!

---

## 📱 How to Use

### Send SMS to a Lead:
1. Go to FJ Leads or Precon Factory Leads
2. Click on any lead
3. Scroll to "Send SMS" section
4. Type your message and click "Send SMS"

### View & Reply to Conversations:
1. Click **"SMS Conversations"** in sidebar
2. Select a conversation from the list
3. View message history
4. Type reply and press Enter or click Send

---

## 🎨 UI Features

- **Left Panel**: All conversations sorted by most recent
- **Main Chat**: Message history (blue = you, gray = lead)
- **Reply Box**: Send new messages instantly
- **Real-time**: New messages appear automatically
- **Unread Badges**: See which conversations have new messages

---

## 📋 Files You Need to Know About

- `sms_conversations_table.sql` - Run this in Supabase
- `TWILIO_WEBHOOK_SETUP.md` - Complete webhook setup guide
- `SMS_SETUP.md` - Detailed SMS feature documentation

---

## ⚡ Quick Test

**Test Sending:**
```
1. Open a lead with phone number
2. Click lead card
3. Send SMS
4. Check Conversations page
```

**Test Receiving:**
```
1. Text your Twilio number: (647) 558-0012
2. Check Conversations page
3. You should see the message!
```

---

## 🐛 Common Issues

**"Table doesn't exist" error**
→ Run the SQL from `sms_conversations_table.sql` in Supabase

**Not receiving incoming SMS**
→ Configure Twilio webhook (see Step 2 above)

**Messages not appearing**
→ Check browser console for errors
→ Verify webhook URL in Twilio is correct

---

## 🎉 You're Ready!

Everything is set up and ready to use. Just complete the 3-step setup above and you'll have full two-way SMS communication with your leads!

**Need Help?**
- See `TWILIO_WEBHOOK_SETUP.md` for detailed webhook instructions
- See `SMS_SETUP.md` for complete feature documentation
- Check Twilio logs: https://console.twilio.com/monitor/logs/sms

