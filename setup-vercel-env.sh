#!/bin/bash
# Add Supabase env vars in Vercel (paste values from Supabase → Project Settings → API).
# Do not commit real keys into this script.
#
# Example (run from repo root, logged into Vercel CLI):
#   echo "YOUR_PROJECT_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
#   echo "YOUR_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
#   echo "YOUR_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_KEY production
#
echo "Edit this script with your values or run the vercel env add commands manually."
echo "Then: cd property-dashboard && vercel --prod"
