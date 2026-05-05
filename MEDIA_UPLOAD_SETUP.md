# 📤 Media Upload Setup Guide

## Overview

The Media Upload feature allows you to upload images and videos to Supabase Storage and get instant public URLs for sharing.

---

## 🚀 Setup Instructions

### Step 1: Create Storage Bucket in Supabase

1. Go to **Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. Click **Storage** in the left sidebar

3. Click **"New Bucket"**

4. **Create the bucket:**
   - **Name:** `media-uploads`
   - **Public bucket:** ✅ YES (check this box)
   - **File size limit:** 50MB (default)
   - Click **"Create bucket"**

---

### Step 2: Set Bucket Policies (Public Access)

**IMPORTANT:** Make the bucket publicly accessible so uploaded files can be accessed via public URLs.

1. In the **Storage** section, click on **Policies** tab

2. For the `media-uploads` bucket, click **"New Policy"**

3. Choose **"For full customization"**

4. Create two policies:

#### Policy 1: Public Read Access

**Policy Name:** `Public read access for media uploads`

**Target roles:** `public`

**Allowed operation:** `SELECT`

**Policy definition:**
```sql
bucket_id = 'media-uploads'
```

Click **"Review"** → **"Save policy"**

#### Policy 2: Authenticated Upload Access

**Policy Name:** `Authenticated users can upload`

**Target roles:** `authenticated`

**Allowed operation:** `INSERT`

**Policy definition:**
```sql
bucket_id = 'media-uploads'
```

Click **"Review"** → **"Save policy"**

---

### Step 3: Configure CORS (Optional)

If you plan to access files from different domains:

1. Go to **Settings** → **API**
2. Scroll to **CORS Settings**
3. Add your domain or use `*` for all domains (development only)

---

## ✅ Features

✅ **Drag & Drop** - Simply drag files into the upload area
✅ **Multiple files** - Upload multiple images/videos at once
✅ **Instant URLs** - Get public URLs immediately after upload
✅ **One-click copy** - Copy URLs to clipboard with one click
✅ **Image preview** - See thumbnails of uploaded images
✅ **File management** - Remove files from the list (UI only)
✅ **Type validation** - Only images and videos allowed
✅ **Size limit** - Max 50MB per file

---

## 📋 Supported File Types

### Images
- PNG
- JPG/JPEG
- GIF
- WEBP
- BMP
- SVG

### Videos
- MP4
- MOV
- AVI
- WEBM
- MKV

---

## 🎯 How It Works

1. **Upload**: User drags/selects files
2. **Validation**: System checks file type and size
3. **Storage**: File uploads to Supabase `media-uploads` bucket
4. **URL Generation**: System generates public URL
5. **Display**: URL shown with copy button
6. **Share**: User copies and shares the URL anywhere

---

## 🔧 File Naming

Files are automatically renamed with timestamps to prevent conflicts:

```
Original: my-photo.jpg
Stored as: 1706234567890_my-photo.jpg
```

This ensures:
- No file overwrites
- Unique URLs
- Easy sorting by date

---

## 💡 Use Cases

- Upload property photos for emails/SMS
- Share project videos with clients
- Store marketing materials
- Create shareable content links
- Quick media hosting for campaigns

---

## 📸 Access the Feature

**Dashboard Navigation:**
```
Sidebar → Media Upload
```

**Direct URL:**
```
https://your-dashboard.vercel.app/media-upload
```

---

## 🛠️ Troubleshooting

### Error: "Failed to upload"

**Possible causes:**
1. Bucket doesn't exist or wrong name
2. Missing upload policy
3. File too large (>50MB)
4. Invalid file type

**Fix:**
1. Verify bucket name is exactly: `media-uploads`
2. Check bucket is marked as **Public**
3. Verify upload policy exists
4. Check file size and type

---

### Error: "Access denied"

**Cause:** Missing public read policy

**Fix:**
1. Go to Storage → media-uploads → Policies
2. Add public read policy (see Step 2 above)
3. Test by uploading a file

---

### Files Upload But URLs Don't Work

**Cause:** Bucket not public

**Fix:**
1. Go to Storage → media-uploads
2. Click settings (gear icon)
3. Ensure "Public bucket" is checked
4. Add public read policy if missing

---

## 🎉 Quick Start Checklist

- [ ] Create `media-uploads` bucket in Supabase Storage
- [ ] Make bucket **public**
- [ ] Set public read policy (SELECT)
- [ ] Set authenticated upload policy (INSERT)
- [ ] Deploy the updated code
- [ ] Test by uploading an image
- [ ] Verify public URL works

---

## 🔐 Security Notes

- Bucket is public for **reading** only
- Only authenticated dashboard users can upload
- No anonymous uploads allowed
- Files are permanently stored
- Consider adding storage cleanup script for old files

---

## 📊 Storage Management

### View Uploaded Files

1. Go to Supabase Dashboard → Storage
2. Click `media-uploads` bucket
3. See all uploaded files with sizes and dates

### Delete Files

Files can be deleted from:
1. **Supabase Dashboard** - Permanent deletion
2. **Media Upload UI** - Removes from list only (file stays in storage)

### Monitor Usage

Check storage usage in Supabase Dashboard:
- Project Settings → Usage
- Storage section shows total usage

---

## 🚀 Deployment

After creating the bucket:

```bash
cd property-dashboard
vercel --prod --yes
```

The feature will be live at:
```
https://property-dashboard-three.vercel.app/media-upload
```

---

## 💼 Pro Tips

1. **Organize files**: Consider creating subfolders in the bucket:
   - `properties/`
   - `marketing/`
   - `clients/`

2. **Cleanup old files**: Set up a cron job to delete files older than X days

3. **Add watermarks**: Extend the feature to add watermarks to images

4. **Generate thumbnails**: Create thumbnail versions for faster loading

5. **Track uploads**: Add a database table to track who uploaded what and when

---

## 📚 Technical Details

**Frontend:** Next.js 14 App Router
**Storage:** Supabase Storage
**Max file size:** 50MB
**Bucket name:** `media-uploads`
**Access:** Public read, Authenticated write

**Code location:**
- Page: `app/media-upload/page.tsx`
- Sidebar: `components/Sidebar.tsx`
- Supabase client: `lib/supabase.ts`

---

## ✨ Future Enhancements

- [ ] Bulk delete from UI
- [ ] Image compression before upload
- [ ] Video thumbnail generation
- [ ] Upload progress bar
- [ ] File categories/tags
- [ ] Search uploaded files
- [ ] Generate QR codes for URLs
- [ ] Direct social media sharing

---

Ready to upload! 🚀
