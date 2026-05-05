# 📅 GTA Lowrise Bookings - SMS Notifications Setup

## Overview
Set up automatic SMS notifications for GTA Lowrise bookings (same as FJ and Precon Factory).

## ✅ What Was Added

### 1. SMS Notification Trigger
- ✅ Database trigger on `gta_lowrise_bookings` INSERT
- ✅ Sends SMS to 3 phones: 6478981739, 4168296121, 4163994289
- ✅ Creates Google Calendar event automatically

### 2. API Endpoint Updated
- ✅ `/api/bookings/notify` now supports `gta_lowrise_bookings`

### 3. Dashboard Page Created
- ✅ `/gta-lowrise-bookings` page with teal branding
- ✅ View all bookings in table format
- ✅ Bulk delete functionality
- ✅ Export to CSV
- ✅ Send SMS from booking modal

### 4. Sidebar Navigation
- ✅ Added "GTA Lowrise Bookings" link

---

## 🚀 Setup Instructions

### Step 1: Run SQL in Supabase

Run this in Supabase SQL Editor:

```sql
-- File: setup_gta_lowrise_booking_notifications.sql
```

This creates:
- Database trigger on `gta_lowrise_bookings`
- Calls existing `notify_new_booking()` function

**Expected output:**
```
✅ GTA Lowrise booking notification trigger created!
📱 SMS notifications will be sent to: 6478981739, 4168296121, 4163994289
🔔 Trigger active on: gta_lowrise_bookings
📆 Google Calendar events will be auto-created
```

---

### Step 2: Already Deployed! ✅

The code changes have been pushed to Vercel.

---

## 📱 SMS Format

When a booking comes in:

```
🔔 New GTA Lowrise Booking!

👤 John Smith
📧 john@example.com
📱 416-555-1234
🏢 Project: Luxury Townhomes
🆔 Project ID: 12345
📅 Date: 2025-01-10
🕐 Time: 2:00 PM
🎯 Type: Site Visit
💬 Message: Looking forward to the visit
🌐 Project URL: https://...
⏰ Just now

👉 View in Dashboard: https://.../gta-lowrise-bookings
```

---

## 🧪 Testing

### Test 1: Insert a Booking

```sql
INSERT INTO gta_lowrise_bookings (
  firstname, 
  lastname, 
  email, 
  phone,
  appointment_date,
  appointment_time,
  appointment_type,
  message,
  project_name,
  project_id,
  status
)
VALUES (
  'Test', 
  'User',
  'test@gta.com',
  '416-555-1234',
  '2025-01-15',
  '2:00 PM',
  'Site Visit',
  'Looking forward to seeing the models',
  'Luxury Townhomes',
  '12345',
  'scheduled'
);
```

**Expected within 5 seconds:**
- ✅ SMS sent to 3 phone numbers
- ✅ Google Calendar event created
- ✅ Booking appears at `/gta-lowrise-bookings`

---

## 🎯 Features

All the same as FJ and Precon Factory bookings:

✅ **Automatic SMS notifications**  
✅ **Google Calendar integration**  
✅ **Dashboard table view**  
✅ **Bulk selection & delete**  
✅ **Export to CSV**  
✅ **Booking detail modal**  
✅ **Send SMS to client**  
✅ **Delete individual bookings**  

---

## 📊 Summary

| System | Table | Route | SMS | Calendar |
|--------|-------|-------|-----|----------|
| **FJ Bookings** | fj_bookings | /fj-bookings | ✅ | ✅ |
| **Precon Factory** | precon_factory_bookings | /precon-bookings | ✅ | ✅ |
| **GTA Lowrise** | gta_lowrise_bookings | /gta-lowrise-bookings | ✅ | ✅ |

**All three systems work identically!** 🎉

