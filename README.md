# 🏢 Property Dashboard

Modern, lightweight dashboard for managing Canada properties and leads.

## ✨ Features

### 📊 **Canada Properties (Main Page)**
- 🔥 **Latest Projects** - Visual cards showing recently updated properties
- 🔍 **Advanced Search** - Search across ID, project name, builder, address, city
- 🎯 **Smart Filters** - Filter by city, bedrooms, bathrooms
- 📋 **Data Table** - Sortable, paginated table with 3,224+ properties
- 📥 **Export** - Download data as CSV
- 👁️ **Quick View** - Modal for property details

### 📅 **FJ Bookings**
- View all calendar appointments
- Status tracking (scheduled, completed, cancelled)
- Contact information at a glance
- Export functionality

### 📧 **FJ Leads**
- View all email leads from FJ
- Filter by: All, Agents, Buyers, New
- Contact details and project info
- Timeline tracking

### 🏭 **Precon Factory Bookings**
- Precon Factory appointment management
- Same features as FJ Bookings

### 📮 **Precon Factory Leads**
- Precon Factory email leads
- Filter by type and status
- Complete lead information

## 🔒 Password Protection

The dashboard login uses a password from your environment. **There is no default password** — logins fail until you set it.

Set this in `.env.local` (local) and in Vercel → Settings → Environment Variables (production):

```bash
NEXT_PUBLIC_DASHBOARD_PASSWORD=your_secure_password_here
```

Use a long random value. This variable is bundled for the client login screen, so it is a simple gate rather than strong confidentiality against someone who can read your built JavaScript.

**Session:** Users stay logged in for 24 hours after successful login.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd property-dashboard
npm install
```

### 2. Set Up Environment Variables

The `.env.local` file should contain:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_DASHBOARD_PASSWORD=your_secure_password
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Date Utils**: date-fns

## 📁 Project Structure

```
property-dashboard/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Canada Properties (home)
│   ├── fj-bookings/         # FJ Bookings page
│   ├── fj-leads/            # FJ Leads page
│   ├── precon-bookings/     # Precon Factory Bookings
│   └── precon-leads/        # Precon Factory Leads
├── components/              # React components
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── LatestProjects.tsx   # Latest properties section
│   ├── SearchFilters.tsx    # Search & filter UI
│   └── PropertiesTable.tsx  # Main data table
├── lib/
│   └── supabase.ts          # Supabase client setup
└── .env.local               # Environment variables
```

## 🎨 Key Features

### Latest Projects Section
Shows the 6 most recently updated properties with:
- Property image
- Project name and builder
- City, bedrooms, bathrooms
- Price
- "Updated X days ago" timestamp

### Advanced Search & Filters
- Real-time search across all columns
- City dropdown (auto-populated from database)
- Bedrooms filter
- Bathrooms filter
- Clear filters button

### Data Table
- Pagination (20 items per page)
- Sortable columns
- Quick actions (view details, visit website)
- Export to CSV
- Modal for detailed property view

## 🔧 Building for Production

```bash
npm run build
npm start
```

## 📊 Database Tables

The dashboard connects to these Supabase tables:
- `canada_properties` - 3,224 properties
- `fj_bookings` - 8 bookings
- `fj_leads` - 31 leads
- `precon_factory_bookings` - 1 booking
- `precon_factory_leads` - 14 leads

## 🎯 Performance

- ⚡ Fast page loads with Next.js App Router
- 🔄 Efficient data fetching with pagination
- 📱 Fully responsive design
- 🎨 Smooth animations and transitions

## 📝 Notes

- No authentication required - direct database access
- All data fetched in real-time from Supabase
- Lightweight and modern UI
- Export functionality for all data tables

---

Built with ❤️ using Next.js + Supabase
