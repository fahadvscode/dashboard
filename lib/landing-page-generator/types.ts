export type PropertyType = 'condo' | 'townhome' | 'detached' | 'semi-detached' | 'mixed'

export type TemplateStyle =
  | 'hero-focus'
  | 'split-layout'
  | 'storytelling'
  | 'gallery-first'
  | 'minimal-premium'
  | 'map-focused'

export type ImageOption = 'manual' | 'ai-generated' | 'both'
export type ThankYouAction = 'message' | 'redirect'

export interface ProjectConfig {
  projectName: string
  folderName: string
  description: string
  location: string
  city: string
  neighborhood: string
  developer: string
  propertyType: PropertyType
  priceRange: string
  units: string
  features: string[]
  occupancy: string
  additionalInfo: string

  domain: string
  primaryKeyword: string
  secondaryKeywords: string[]

  template: TemplateStyle

  imageOption: ImageOption
  images: ProjectImage[]

  ga4Id: string
  gtmId: string
  metaPixelId: string

  tableName: string
  thankYouAction: ThankYouAction
  thankYouRedirectUrl: string

  supabaseUrl: string
  supabaseAnonKey: string
}

export interface ProjectImage {
  slot: string
  file?: File
  src: string
  alt: string
  isAiGenerated?: boolean
}

export interface GeneratedContent {
  heroHeadline: string
  heroSubheadline: string
  metaTitle: string
  metaDescription: string
  aboutSection: string
  features: FeatureItem[]
  locationDescription: string
  faqs: FAQ[]
  ctaText: string
  additionalSections: ContentSection[]
}

export interface ContentSection {
  heading: string
  content: string
}

export interface FeatureItem {
  title: string
  description: string
  icon: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface TemplateInfo {
  id: TemplateStyle
  name: string
  description: string
  previewGradient: string
  layoutPreview: string
}

export const TEMPLATE_OPTIONS: TemplateInfo[] = [
  {
    id: 'hero-focus',
    name: 'Hero Focus',
    description: 'Full-screen hero image with floating lead form. Features and project details scroll below with bold section breaks.',
    previewGradient: 'from-slate-900 to-blue-900',
    layoutPreview: 'hero-form-features-faq-footer',
  },
  {
    id: 'split-layout',
    name: 'Split Layout',
    description: 'Content on the left, sticky lead form on the right. Clean two-column design that keeps the form always visible while scrolling.',
    previewGradient: 'from-emerald-800 to-teal-900',
    layoutPreview: 'sidebar-form-scroll-content',
  },
  {
    id: 'storytelling',
    name: 'Storytelling Scroll',
    description: 'Long-form single-page narrative. Sections flow naturally with the form appearing at multiple scroll points for maximum conversions.',
    previewGradient: 'from-amber-800 to-orange-900',
    layoutPreview: 'narrative-multi-cta-sections',
  },
  {
    id: 'gallery-first',
    name: 'Gallery First',
    description: 'Image gallery and carousel dominate the page. Compact form above the fold, with details and features below.',
    previewGradient: 'from-purple-800 to-violet-900',
    layoutPreview: 'gallery-form-details-faq',
  },
  {
    id: 'minimal-premium',
    name: 'Minimal Premium',
    description: 'Clean whitespace-heavy design with luxury feel. Elegant typography, centered form, and refined section transitions.',
    previewGradient: 'from-neutral-800 to-stone-900',
    layoutPreview: 'minimal-centered-elegant',
  },
  {
    id: 'map-focused',
    name: 'Location & Map',
    description: 'Location and neighborhood context take center stage. Map section prominent with nearby amenities, transit, and schools highlighted.',
    previewGradient: 'from-cyan-800 to-sky-900',
    layoutPreview: 'map-location-form-details',
  },
]

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'condo', label: 'Condominium' },
  { value: 'townhome', label: 'Townhome' },
  { value: 'detached', label: 'Detached Home' },
  { value: 'semi-detached', label: 'Semi-Detached' },
  { value: 'mixed', label: 'Mixed (Multiple Types)' },
]

export interface GenerationResult {
  success: boolean
  projectPath: string
  sql: string
  tableName: string
  domain: string
  folderName: string
  errors: string[]
  zipBase64?: string
  wroteToDisk?: boolean
}

export interface GenerationProgress {
  step: string
  message: string
  progress: number
}
