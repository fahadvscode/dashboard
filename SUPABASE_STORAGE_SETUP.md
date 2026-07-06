# 📦 Supabase Storage Setup for Rental Application

## Overview

The rental application PDF is now stored in **Supabase Storage** instead of the local public folder. This is better because you can update the PDF without redeploying!

---

## 🚀 Setup Instructions

### Step 1: Create Storage Bucket

1. Go to **Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. Click **Storage** in the left sidebar

3. Click **"New Bucket"**

4. **Create the bucket:**
   - **Name:** `rental-documents`
   - **Public bucket:** ✅ YES (check this box)
   - Click **"Create bucket"**

---

### Step 2: Upload the PDF

1. Click on the **`rental-documents`** bucket you just created

2. Click **"Upload file"** button

3. Select your PDF file:
   - Original name: `rental app (1).pdf` or `rental-application.pdf`
   - **IMPORTANT:** Rename it to exactly: `rental-application.pdf`

4. Click **Upload**

---

### Step 3: Verify Upload

After uploading, you should see:

```
rental-documents/
  └── rental-application.pdf
```

Click on the file to verify it's there and accessible.

---

### Step 4: Set Bucket Policies (Public Access)

**IMPORTANT:** Make the bucket publicly accessible so the API can download it.

1. In the **Storage** section, click on **Policies** tab

2. For the `rental-documents` bucket, click **"New Policy"**

3. Choose **"For full customization"**

4. Use this policy:

**Policy Name:** `Public read access`

**Target roles:** `public`

**Allowed operation:** `SELECT`

**Policy definition:**
```sql
bucket_id = 'rental-documents'
```

5. Click **"Review"** → **"Save policy"**

---

## ✅ Benefits of Supabase Storage

✅ **Update anytime** - Change PDF without redeploying code
✅ **Centralized** - One source of truth
✅ **Accessible** - Can be used by multiple systems
✅ **No code changes needed** - Just replace the file in Supabase
✅ **Version control** - Can keep multiple versions if needed

---

## 🔧 How It Works

### When Application is Sent:

1. API calls Supabase Storage
2. Downloads `rental-application.pdf` from `rental-documents` bucket
3. Converts to buffer
4. Attaches to email
5. Sends to lead

### File Path in Storage:
```
rental-documents/rental-application.pdf
```

### Public URL (use CDN — not raw supabase.co):
```
https://images.preconfactory.com/storage/v1/object/public/rental-documents/rental-application.pdf
```

Media upload tool and landing pages should always use `images.preconfactory.com` so Cloudflare caches at the edge.

### API Endpoint:
```
/api/rental-leads/send-application
```

---

## 📋 Troubleshooting

### Error: "PDF not found in storage"

**Cause:** File not uploaded or bucket doesn't exist

**Fix:**
1. Check bucket name is exactly: `rental-documents`
2. Check file name is exactly: `rental-application.pdf`
3. Verify file uploaded successfully

---

### Error: "Access denied"

**Cause:** Bucket is not public or policy not set

**Fix:**
1. Go to Storage → rental-documents
2. Click **Policies** tab
3. Add public read policy (see Step 4 above)

---

### Need to Update the PDF?

**Easy!** Just:
1. Go to Supabase Storage
2. Click `rental-documents` bucket
3. Delete old `rental-application.pdf`
4. Upload new version with same name
5. **Done!** No code changes or redeployment needed

---

## 🎯 Quick Start Checklist

- [ ] Create `rental-documents` bucket in Supabase Storage
- [ ] Make bucket **public**
- [ ] Upload `rental-application.pdf` to the bucket
- [ ] Set public read policy
- [ ] Deploy the updated code
- [ ] Test by sending application to a test email

---

## 📸 Visual Guide

### Creating the Bucket:
```
Supabase Dashboard → Storage → New Bucket
Name: rental-documents
Public: ✅ YES
```

### Uploading the File:
```
Storage → rental-documents → Upload file
Select: rental-application.pdf
```

### Setting Policy:
```
Storage → Policies → New Policy
Bucket: rental-documents
Target: public
Operation: SELECT (read)
```

---

## 🎉 Ready!

Once you complete these steps:
1. ✅ Run SQL: `add_rental_application_tracking.sql`
2. ✅ Upload PDF to Supabase Storage
3. ✅ Deploy the code

The rental application system will be fully functional with cloud storage!

---

## 💡 Pro Tip

You can also organize files better:

```
rental-documents/
  ├── rental-application.pdf
  ├── rental-agreement-template.pdf
  ├── move-in-checklist.pdf
  └── ... (other rental documents)
```

Just update the path in the code if you want subfolders!

