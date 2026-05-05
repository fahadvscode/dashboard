# 🚀 Deployment Guide

## Option 1: Quick Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New" → "Project"**
3. Import your Git repository or **"Continue with GitHub"**
4. **Add Environment Variables** (copy values from Supabase **Project Settings → API**; never commit real keys):
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` `public` key
   - `SUPABASE_SERVICE_KEY` — `service_role` key (server-only; bypasses RLS)
5. Click **"Deploy"**

## Option 2: Deploy via Vercel CLI

### Step 1: Login to Vercel
```bash
npx vercel login
```

### Step 2: Add Environment Variables in Vercel Dashboard
Go to your project settings and add the three environment variables above.

### Step 3: Deploy
```bash
cd property-dashboard
npx vercel --prod
```

## Option 3: Connect to GitHub

1. **Initialize Git** (if not already done):
```bash
cd property-dashboard
git init
git add .
git commit -m "Initial commit - Property Dashboard"
```

2. **Create GitHub Repository**:
   - Go to GitHub and create a new repository
   - Name it `property-dashboard`

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/property-dashboard.git
git branch -M main
git push -u origin main
```

4. **Connect Vercel to GitHub**:
   - Go to Vercel Dashboard
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Add environment variables (see Option 1)
   - Deploy!

## 🎯 After Deployment

Once deployed, your dashboard will be live at:
- **Production**: `https://property-dashboard.vercel.app` (or your custom domain)
- **Preview**: Every git push creates a preview deployment

## ⚙️ Vercel Pro Features You Can Use

With your Vercel Pro account, you get:
- ✅ **Custom Domains** - Add your own domain
- ✅ **Team Collaboration** - Invite team members
- ✅ **Password Protection** - Protect your dashboard
- ✅ **Analytics** - Track usage and performance
- ✅ **More Build Time** - Faster deployments
- ✅ **Priority Support** - 24/7 support

## 🔒 Security Notes

- Environment variables are encrypted and secure in Vercel
- Consider adding password protection via Vercel dashboard
- The `.env.local` file is gitignored and won't be pushed to GitHub

## 📊 Monitoring

Access your deployment logs and analytics:
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Select your project
- View: Deployments, Analytics, Logs, Settings

## 🔄 Automatic Deployments

If you connect to GitHub:
- **Production branch (main)**: Auto-deploys to production
- **Other branches**: Auto-creates preview deployments
- **Pull Requests**: Preview deployments for testing

## 🌐 Custom Domain

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain (e.g., `dashboard.yourdomain.com`)
3. Follow DNS configuration instructions
4. SSL certificate auto-generated

---

Need help? Check [Vercel Documentation](https://vercel.com/docs) or contact support!

