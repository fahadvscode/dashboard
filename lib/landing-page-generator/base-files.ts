import type { ProjectConfig, GeneratedContent } from './types'

export function generatePackageJson(config: ProjectConfig): string {
  return JSON.stringify(
    {
      name: config.folderName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {
        '@supabase/supabase-js': '^2.78.0',
        next: '^15.3.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4',
        '@types/node': '^20',
        '@types/react': '^19',
        '@types/react-dom': '^19',
        typescript: '^5',
        tailwindcss: '^4',
      },
    },
    null,
    2
  )
}

export function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2
  )
}

export function generateNextConfig(): string {
  const lines = [
    "import type { NextConfig } from 'next'",
    '',
    'const nextConfig: NextConfig = {',
    "  output: 'export',",
    '  images: { unoptimized: true },',
    '  trailingSlash: true,',
    '}',
    '',
    'export default nextConfig',
    '',
  ]
  return lines.join('\n')
}

export function generatePostcssConfig(): string {
  const lines = [
    'const config = {',
    '  plugins: {',
    '    "@tailwindcss/postcss": {},',
    '  },',
    '};',
    '',
    'export default config;',
    '',
  ]
  return lines.join('\n')
}

export function generateGitignore(): string {
  return [
    'node_modules/',
    '.next/',
    'out/',
    '.env',
    '.env.local',
    '.env*.local',
    '*.tsbuildinfo',
    'next-env.d.ts',
    '',
  ].join('\n')
}

export function generateEnvLocal(config: ProjectConfig): string {
  return [
    'NEXT_PUBLIC_SUPABASE_URL=' + config.supabaseUrl,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=' + config.supabaseAnonKey,
    'NEXT_PUBLIC_TABLE_NAME=' + config.tableName,
    'NEXT_PUBLIC_PROJECT_NAME=' + config.projectName,
    '',
  ].join('\n')
}

export function generateGlobalsCss(): string {
  return `@import "tailwindcss";

:root {
  --color-primary: #1a1a2e;
  --color-accent: #e2725b;
  --color-accent-hover: #d4604a;
  --color-bg: #ffffff;
  --color-bg-alt: #f8f9fa;
  --color-text: #1a1a2e;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: var(--color-accent);
  color: white;
}

.fade-in {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-up {
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
`
}

export function generateRootLayout(config: ProjectConfig, content: GeneratedContent): string {
  const esc = (s: string) => s.replace(/'/g, "\\'").replace(/`/g, '\\`')
  const domain = config.domain.replace(/^https?:\/\//, '')
  const canonicalUrl = 'https://' + domain

  const schemaOrg = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: config.projectName,
    description: content.metaDescription,
    url: canonicalUrl,
    ...(config.priceRange && { price: config.priceRange }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: config.city,
      addressRegion: 'ON',
      addressCountry: 'CA',
    },
  })

  let faqSchemaTag = ''
  if (content.faqs.length > 0) {
    const faqSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
    faqSchemaTag = [
      '        <script',
      '          type="application/ld+json"',
      "          dangerouslySetInnerHTML={{ __html: '" + faqSchema.replace(/'/g, "\\'") + "' }}",
      '        />',
    ].join('\n')
  }

  const analyticsHeadLines: string[] = []

  if (config.gtmId) {
    analyticsHeadLines.push(
      '        <script',
      '          dangerouslySetInnerHTML={{',
      "            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" + config.gtmId + "');`",
      '          }}',
      '        />'
    )
  }

  if (config.ga4Id) {
    analyticsHeadLines.push(
      '        <script async src={"https://www.googletagmanager.com/gtag/js?id=' + config.ga4Id + '"} />',
      '        <script',
      '          dangerouslySetInnerHTML={{',
      "            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','" + config.ga4Id + "');`",
      '          }}',
      '        />'
    )
  }

  if (config.metaPixelId) {
    analyticsHeadLines.push(
      '        <script',
      '          dangerouslySetInnerHTML={{',
      "            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','" + config.metaPixelId + "');fbq('track','PageView');`",
      '          }}',
      '        />'
    )
  }

  let gtmNoscript = ''
  if (config.gtmId) {
    gtmNoscript = [
      '        <noscript>',
      '          <iframe',
      '            src={"https://www.googletagmanager.com/ns.html?id=' + config.gtmId + '"}',
      '            height="0"',
      '            width="0"',
      '            style={{ display: "none", visibility: "hidden" }}',
      '          />',
      '        </noscript>',
    ].join('\n')
  }

  const lines = [
    "import type { Metadata } from 'next'",
    "import './globals.css'",
    '',
    'export const metadata: Metadata = {',
    "  title: '" + esc(content.metaTitle) + "',",
    "  description: '" + esc(content.metaDescription) + "',",
    "  metadataBase: new URL('" + canonicalUrl + "'),",
    "  alternates: { canonical: '/' },",
    '  openGraph: {',
    "    title: '" + esc(content.metaTitle) + "',",
    "    description: '" + esc(content.metaDescription) + "',",
    "    url: '" + canonicalUrl + "',",
    "    siteName: '" + esc(config.projectName) + "',",
    "    type: 'website',",
    "    locale: 'en_CA',",
    '  },',
    '  twitter: {',
    "    card: 'summary_large_image',",
    "    title: '" + esc(content.metaTitle) + "',",
    "    description: '" + esc(content.metaDescription) + "',",
    '  },',
    '  robots: { index: true, follow: true },',
    '}',
    '',
    'export default function RootLayout({ children }: { children: React.ReactNode }) {',
    '  return (',
    '    <html lang="en">',
    '      <head>',
    '        <link rel="preconnect" href="https://fonts.googleapis.com" />',
    '        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />',
    '        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />',
    ...analyticsHeadLines,
    '        <script',
    '          type="application/ld+json"',
    "          dangerouslySetInnerHTML={{ __html: '" + schemaOrg.replace(/'/g, "\\'") + "' }}",
    '        />',
    ...(faqSchemaTag ? [faqSchemaTag] : []),
    '      </head>',
    '      <body className="antialiased">',
    ...(gtmNoscript ? [gtmNoscript] : []),
    '        {children}',
    '      </body>',
    '    </html>',
    '  )',
    '}',
    '',
  ]

  return lines.join('\n')
}

export function generateLeadFormComponent(config: ProjectConfig): string {
  const esc = (s: string) => s.replace(/'/g, "\\'")

  const redirectBlock = config.thankYouAction === 'redirect' && config.thankYouRedirectUrl
    ? "\n      setTimeout(() => { window.location.href = '" + config.thankYouRedirectUrl + "' }, 2000)"
    : ''

  const lines = [
    "'use client'",
    '',
    "import { useState } from 'react'",
    "import { createClient } from '@supabase/supabase-js'",
    '',
    'const supabase = createClient(',
    '  process.env.NEXT_PUBLIC_SUPABASE_URL!,',
    '  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!',
    ')',
    '',
    "const TABLE_NAME = process.env.NEXT_PUBLIC_TABLE_NAME || '" + config.tableName + "'",
    '',
    'interface LeadFormProps {',
    '  className?: string',
    '  compact?: boolean',
    '}',
    '',
    "export default function LeadForm({ className = '', compact = false }: LeadFormProps) {",
    '  const [form, setForm] = useState({',
    "    first_name: '',",
    "    last_name: '',",
    "    email: '',",
    "    phone: '',",
    '    is_broker: false,',
    '  })',
    '  const [submitting, setSubmitting] = useState(false)',
    '  const [submitted, setSubmitted] = useState(false)',
    "  const [error, setError] = useState('')",
    '',
    '  const handleSubmit = async (e: React.FormEvent) => {',
    '    e.preventDefault()',
    '    setSubmitting(true)',
    "    setError('')",
    '',
    '    try {',
    '      const { error: dbError } = await supabase.from(TABLE_NAME).insert({',
    '        first_name: form.first_name.trim(),',
    '        last_name: form.last_name.trim(),',
    '        email: form.email.trim().toLowerCase(),',
    '        phone: form.phone.trim(),',
    '        is_broker: form.is_broker,',
    "        source: typeof window !== 'undefined' ? window.location.hostname : '',",
    "        page_path: typeof window !== 'undefined' ? window.location.pathname : '/',",
    '      })',
    '',
    '      if (dbError) throw dbError',
    '',
    "      if (typeof window !== 'undefined') {",
    '        const w = window as Record<string, unknown>',
    "        if (typeof w.gtag === 'function') (w.gtag as Function)('event', 'generate_lead', { event_category: 'form', event_label: '" + esc(config.projectName) + "' })",
    "        if (typeof w.fbq === 'function') (w.fbq as Function)('track', 'Lead')",
    '      }',
    '',
    '      setSubmitted(true)' + redirectBlock,
    '    } catch (err) {',
    "      setError('Something went wrong. Please try again.')",
    "      console.error('Form submission error:', err)",
    '    } finally {',
    '      setSubmitting(false)',
    '    }',
    '  }',
    '',
    '  if (submitted) {',
    '    return (',
    '      <div className={"text-center py-8 " + className}>',
    '        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">',
    '          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">',
    '            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />',
    '          </svg>',
    '        </div>',
    '        <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>',
    '        <p className="text-gray-600">We have received your information and will be in touch shortly.</p>',
    '      </div>',
    '    )',
    '  }',
    '',
    '  return (',
    '    <form onSubmit={handleSubmit} className={className}>',
    '      <div className={compact ? "grid gap-3 grid-cols-1" : "grid gap-3 grid-cols-1 sm:grid-cols-2"}>',
    '        <div>',
    '          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">',
    '            First Name *',
    '          </label>',
    '          <input',
    '            id="first_name"',
    '            type="text"',
    '            required',
    '            value={form.first_name}',
    '            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}',
    '            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors"',
    '            placeholder="First name"',
    '          />',
    '        </div>',
    '        <div>',
    '          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">',
    '            Last Name *',
    '          </label>',
    '          <input',
    '            id="last_name"',
    '            type="text"',
    '            required',
    '            value={form.last_name}',
    '            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}',
    '            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors"',
    '            placeholder="Last name"',
    '          />',
    '        </div>',
    '      </div>',
    '      <div className="mt-3">',
    '        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">',
    '          Email *',
    '        </label>',
    '        <input',
    '          id="email"',
    '          type="email"',
    '          required',
    '          value={form.email}',
    '          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}',
    '          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors"',
    '          placeholder="you@email.com"',
    '        />',
    '      </div>',
    '      <div className="mt-3">',
    '        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">',
    '          Phone *',
    '        </label>',
    '        <input',
    '          id="phone"',
    '          type="tel"',
    '          required',
    '          value={form.phone}',
    '          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}',
    '          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors"',
    '          placeholder="(416) 555-0123"',
    '        />',
    '      </div>',
    '      <div className="mt-4">',
    '        <label className="flex items-center gap-3 cursor-pointer">',
    '          <input',
    '            type="checkbox"',
    '            checked={form.is_broker}',
    '            onChange={(e) => setForm((f) => ({ ...f, is_broker: e.target.checked }))}',
    '            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"',
    '          />',
    '          <span className="text-sm text-gray-700">I am a Realtor / Broker</span>',
    '        </label>',
    '      </div>',
    '      {error && (',
    '        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">',
    '          {error}',
    '        </div>',
    '      )}',
    '      <button',
    '        type="submit"',
    '        disabled={submitting}',
    '        className="mt-4 w-full rounded-lg bg-[#e2725b] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#d4604a] disabled:opacity-60 transition-colors"',
    '      >',
    "        {submitting ? 'Submitting...' : 'Get Exclusive Access'}",
    '      </button>',
    '      <p className="mt-3 text-xs text-gray-500 text-center">',
    "        By submitting, you agree to our{' '}",
    '        <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>.',
    '        We respect your privacy and will never share your information.',
    '      </p>',
    '    </form>',
    '  )',
    '}',
    '',
  ]

  return lines.join('\n')
}

export function generateFooterComponent(config: ProjectConfig): string {
  const esc = (s: string) => s.replace(/'/g, "\\'")
  const developerLine = config.developer
    ? '            <p className="text-sm">By ' + esc(config.developer) + '</p>'
    : ''
  const locationLine = config.location
    ? '            <p className="text-sm mt-1">' + esc(config.location) + '</p>'
    : ''

  const lines = [
    'export default function Footer() {',
    '  return (',
    '    <footer className="bg-gray-900 text-gray-400 py-12">',
    '      <div className="max-w-6xl mx-auto px-4 sm:px-6">',
    '        <div className="flex flex-col md:flex-row justify-between items-start gap-8">',
    '          <div>',
    '            <h3 className="text-white font-semibold text-lg mb-2">' + esc(config.projectName) + '</h3>',
    ...(developerLine ? [developerLine] : []),
    ...(locationLine ? [locationLine] : []),
    '          </div>',
    '          <div className="text-sm space-y-2">',
    '            <a href="/privacy" className="block hover:text-white transition-colors">Privacy Policy</a>',
    '          </div>',
    '        </div>',
    '        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">',
    '          <p>&copy; {new Date().getFullYear()} ' + esc(config.projectName) + '. All rights reserved.</p>',
    '          <p className="mt-1">',
    "            Prices and specifications are subject to change without notice.",
    "            Renderings are artist&apos;s concept. E.&amp;O.E.",
    '          </p>',
    '        </div>',
    '      </div>',
    '    </footer>',
    '  )',
    '}',
    '',
  ]

  return lines.join('\n')
}

export function generatePrivacyPage(config: ProjectConfig): string {
  const esc = (s: string) => s.replace(/'/g, "\\'")

  const lines = [
    "import type { Metadata } from 'next'",
    '',
    'export const metadata: Metadata = {',
    "  title: 'Privacy Policy | " + esc(config.projectName) + "',",
    "  description: 'Privacy policy for " + esc(config.projectName) + "',",
    '  robots: { index: false, follow: false },',
    '}',
    '',
    'export default function PrivacyPage() {',
    '  return (',
    '    <main className="min-h-screen bg-white py-16 px-4 sm:px-6">',
    '      <div className="max-w-3xl mx-auto">',
    '        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>',
    '        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">',
    "          <p>Last updated: {new Date().toLocaleDateString('en-CA')}</p>",
    '',
    '          <h2 className="text-lg font-semibold text-gray-900 mt-8">Information We Collect</h2>',
    '          <p>',
    '            When you submit a form on this website, we collect your first name, last name,',
    '            email address, phone number, and whether you are a licensed realtor or broker.',
    '          </p>',
    '',
    '          <h2 className="text-lg font-semibold text-gray-900 mt-8">How We Use Your Information</h2>',
    '          <p>',
    '            We use the information you provide to send you details about ' + esc(config.projectName) + ',',
    '            including pricing, floor plans, and availability updates. Your information may be',
    '            shared with the project developer and authorized sales representatives.',
    '          </p>',
    '',
    '          <h2 className="text-lg font-semibold text-gray-900 mt-8">Data Storage &amp; Security</h2>',
    '          <p>',
    '            Your data is stored securely using industry-standard encryption and hosted on',
    '            servers located in Canada and the United States. We take reasonable measures to',
    '            protect your personal information from unauthorized access or disclosure.',
    '          </p>',
    '',
    '          <h2 className="text-lg font-semibold text-gray-900 mt-8">Your Rights</h2>',
    '          <p>',
    '            Under PIPEDA (Personal Information Protection and Electronic Documents Act), you',
    '            have the right to access, correct, or delete your personal information. To make a',
    '            request, contact us using the information below.',
    '          </p>',
    '',
    '          <h2 className="text-lg font-semibold text-gray-900 mt-8">Cookies &amp; Analytics</h2>',
    '          <p>',
    '            This website may use cookies and third-party analytics services (such as Google',
    '            Analytics) to understand how visitors interact with our site. These tools collect',
    '            information anonymously and report website trends without identifying individual visitors.',
    '          </p>',
    '',
    '          <h2 className="text-lg font-semibold text-gray-900 mt-8">Contact</h2>',
    '          <p>',
    '            If you have questions about this privacy policy or wish to exercise your data rights,',
    '            please contact us through the form on our main page.',
    '          </p>',
    '        </div>',
    '        <div className="mt-12">',
    '          <a href="/" className="text-sm font-medium text-gray-900 hover:underline">&larr; Back to ' + esc(config.projectName) + '</a>',
    '        </div>',
    '      </div>',
    '    </main>',
    '  )',
    '}',
    '',
  ]

  return lines.join('\n')
}

export function generateSupabaseClient(): string {
  const lines = [
    "import { createClient } from '@supabase/supabase-js'",
    '',
    'export const supabase = createClient(',
    '  process.env.NEXT_PUBLIC_SUPABASE_URL!,',
    '  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!',
    ')',
    '',
  ]
  return lines.join('\n')
}

export function generateReadme(config: ProjectConfig): string {
  const domain = config.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `# ${config.projectName}

Landing page generated by PropDash.

## Local folder

Unzip this project into:

\`Documents/Jaydeep Data/Landing Pages/${config.folderName}\`

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deploy to Vercel

\`\`\`bash
npx vercel --yes
npx vercel --prod
\`\`\`

Then connect the custom domain **${domain}** in the Vercel project settings.

DNS:

- A record \`@\` → \`76.76.21.21\`
- CNAME \`www\` → \`cname.vercel-dns.com\`

## Database

Run \`setup.sql\` in the Supabase SQL Editor so leads save and trigger SMS / email / Sheets.
`
}
