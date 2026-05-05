# 📄 Rental Application Email System - Setup Guide

## Overview

Automated system to send OREA Rental Application Form 410 to rental leads with a professional email from Fahad Javed Real Estate.

---

## ✅ Features

- ✅ **"Send Application" button** in rental leads table (quick access)
- ✅ **"Send Application" section** in lead detail modal (full details)
- ✅ **Professional branded email** with Fahad Javed Real Estate branding
- ✅ **PDF attachment** - Official OREA Form 410
- ✅ **Visual tracking** - Shows if application was already sent
- ✅ **Resend capability** - Can resend if needed

---

## 🚀 Setup Instructions

### Step 1: Upload the PDF File

**IMPORTANT:** You need to upload the rental application PDF to the project.

1. Rename the PDF file to: `rental-application.pdf`
2. Place it in the `public` folder:
   ```
   /property-dashboard/public/rental-application.pdf
   ```

### Step 2: Deploy to Production

Once the PDF is uploaded, deploy:
```bash
cd /Users/fahadjaved/Documents/Python/dashboard/property-dashboard
vercel --prod
```

---

## 📧 Email Content

The email sent to leads includes:

### Subject Line:
> 🏠 Your Rental Application - Fahad Javed Real Estate

### Email Contains:
- ✅ Professional branded header
- ✅ Clear instructions on how to fill out the form
- ✅ List of required information
- ✅ Important disclaimers
- ✅ **Contact Information:**
  - 📧 info@fahadsold.com
  - 📞 647.898.1739
- ✅ PDF attachment (OREA Form 410)

---

## 🎯 How to Use

### From the Rental Leads Table:

1. Click the **📤 Send icon** in the Actions column
2. Confirm you want to send
3. Email is sent immediately
4. Icon changes to ✅ indicating it was sent

### From the Lead Detail Modal:

1. Open any rental lead by clicking on it
2. Scroll to **"Send Rental Application"** section (blue gradient box)
3. Click **"Send Application"** button
4. Confirmation popup appears
5. Email is sent with PDF attached
6. Status updates to show "Application already sent"

---

## 📱 Button Locations

### Table View:
```
Actions Column → 📤 Send Icon (before Delete icon)
```

### Modal View:
```
Right Sidebar → After "Send SMS" section → Blue gradient box
```

---

## 🔍 Visual Indicators

- **📤 Blue Send Icon** = Not sent yet
- **📄 Green File Icon** = Already sent
- **Green banner in modal** = "Application already sent to this lead"
- **Button text changes** = "Send Application" → "Resend Application"

---

## ✉️ Email Template Highlights

The email is professionally designed with:

- **Modern HTML template** with gradients and styling
- **Step-by-step instructions** for filling out the form
- **Important checklist** of required information:
  - Personal information and date of birth
  - Current and previous addresses
  - Employment history
  - References and banking information

- **Disclaimers** about:
  - OREA official form
  - Confidentiality
  - Credit checks
  - Processing time (24-48 hours)

- **Contact section** with Fahad Javed Real Estate details

---

## 🛠️ Technical Details

### API Endpoint:
`/api/rental-leads/send-application`

### Method:
POST

### Payload:
```json
{
  "leadId": "uuid",
  "email": "lead@example.com",
  "name": "John Doe"
}
```

### Response:
```json
{
  "success": true,
  "messageId": "...",
  "message": "Rental application sent successfully"
}
```

---

## 📋 Requirements

1. ✅ PDF file uploaded to `/public/rental-application.pdf`
2. ✅ Gmail credentials configured:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
3. ✅ System deployed to Vercel

---

## 🎨 Customization

### Change Email Content:
Edit: `/app/api/rental-leads/send-application/route.ts`
- Update `emailHtml` variable for email design
- Update contact info if needed

### Change PDF Filename:
Edit line in API: `filename: 'Rental_Application_OREA_Form_410.pdf'`

### Add More Recipients:
Currently sends to the lead's email only. Can add CC/BCC if needed.

---

## ✅ Testing

1. Create a test rental lead with your email
2. Click "Send Application" button
3. Check your email for:
   - ✅ Professional email received
   - ✅ PDF attached
   - ✅ Fahad Javed Real Estate branding
   - ✅ All contact details correct

---

## 🎉 Complete!

Once the PDF is uploaded and deployed, the rental application system will be fully functional!

**Quick Start:**
1. Upload `rental-application.pdf` to `/public/` folder
2. Deploy with `vercel --prod`
3. Test by sending to yourself
4. Ready to use with real leads!


