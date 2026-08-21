import type { ProjectConfig, GeneratedContent } from './types'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

export interface ResearchedDetails {
  description: string
  location: string
  neighborhood: string
  propertyType: string
  priceRange: string
  units: string
  features: string[]
  occupancy: string
  primaryKeyword: string
  secondaryKeywords: string[]
}

export async function researchProject(
  projectName: string,
  city: string,
  developer: string,
  apiKey: string
): Promise<ResearchedDetails> {
  const prompt = `You are a Canadian real estate research expert. Research the following preconstruction project and return ALL details you can find. If you cannot find exact details, provide realistic estimates based on the developer's typical projects and the city's market.

PROJECT: ${projectName}
CITY: ${city}
DEVELOPER: ${developer}

Return ONLY valid JSON with no extra text:
{
  "description": "2-3 paragraph description of the project (300-400 words). What is it? What makes it special? Who is it for?",
  "location": "Specific address or intersection if known, otherwise best guess for the area",
  "neighborhood": "The neighborhood name where this project is located",
  "propertyType": "One of: condo, townhome, detached, semi-detached, mixed",
  "priceRange": "Starting from $XXX,XXX (realistic for this city and developer)",
  "units": "Number of units, floors, and unit size range if known",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5", "feature 6"],
  "occupancy": "Estimated occupancy year",
  "primaryKeyword": "best SEO keyword for this project (e.g. 'new condos in toronto')",
  "secondaryKeywords": ["keyword 1", "keyword 2", "keyword 3"]
}

Be specific. Use real facts when available. For unknown details, make realistic inferences based on the developer, city, and project name.`

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a Canadian preconstruction real estate research expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      console.error('DeepSeek research error:', await response.text())
      return buildFallbackResearch(projectName, city, developer)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(jsonStr)
      return {
        description: String(parsed.description || ''),
        location: String(parsed.location || ''),
        neighborhood: String(parsed.neighborhood || ''),
        propertyType: String(parsed.propertyType || 'condo'),
        priceRange: String(parsed.priceRange || ''),
        units: String(parsed.units || ''),
        features: Array.isArray(parsed.features) ? parsed.features.map(String) : [],
        occupancy: String(parsed.occupancy || ''),
        primaryKeyword: String(parsed.primaryKeyword || ''),
        secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords.map(String) : [],
      }
    } catch {
      return buildFallbackResearch(projectName, city, developer)
    }
  } catch {
    return buildFallbackResearch(projectName, city, developer)
  }
}

function buildFallbackResearch(projectName: string, city: string, developer: string): ResearchedDetails {
  return {
    description: `${projectName} is an exciting new preconstruction development by ${developer} in ${city}. This project offers modern living spaces designed for today's homebuyers, combining thoughtful architecture with premium finishes and amenities.`,
    location: city,
    neighborhood: city,
    propertyType: 'condo',
    priceRange: '',
    units: '',
    features: ['Modern architecture', 'Premium finishes', 'Rooftop amenities', 'Fitness centre', 'Concierge service', 'Underground parking'],
    occupancy: '',
    primaryKeyword: `new ${projectName.toLowerCase()} ${city.toLowerCase()}`,
    secondaryKeywords: [`${city.toLowerCase()} preconstruction`, `new homes ${city.toLowerCase()}`, `${developer.toLowerCase()} developments`],
  }
}

export async function generateProjectContent(
  config: ProjectConfig,
  apiKey: string
): Promise<GeneratedContent> {
  const prompt = buildPrompt(config)

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a real estate marketing copywriter specializing in Canadian preconstruction homes. Write compelling, SEO-optimized content. Always respond with valid JSON only, no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('DeepSeek API error:', errBody)
      return buildFallbackContent(config)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(jsonStr)
      return validateContent(parsed, config)
    } catch {
      console.error('Failed to parse DeepSeek response as JSON')
      return buildFallbackContent(config)
    }
  } catch (err) {
    console.error('DeepSeek API call failed:', err)
    return buildFallbackContent(config)
  }
}

function buildPrompt(config: ProjectConfig): string {
  return `Generate landing page content for a Canadian preconstruction real estate project. Return ONLY valid JSON with no extra text.

PROJECT DETAILS:
- Name: ${config.projectName}
- Description: ${config.description || 'N/A'}
- Location: ${config.location || 'N/A'}
- City: ${config.city || 'N/A'}
- Neighborhood: ${config.neighborhood || 'N/A'}
- Developer: ${config.developer || 'N/A'}
- Property Type: ${config.propertyType}
- Price Range: ${config.priceRange || 'N/A'}
- Units: ${config.units || 'N/A'}
- Key Features: ${config.features.join(', ') || 'N/A'}
- Occupancy: ${config.occupancy || 'N/A'}
- Additional Info: ${config.additionalInfo || 'N/A'}

SEO TARGET:
- Primary Keyword: ${config.primaryKeyword || config.projectName}
- Secondary Keywords: ${config.secondaryKeywords.join(', ') || 'N/A'}
- Domain: ${config.domain}

Return this exact JSON structure:
{
  "heroHeadline": "compelling headline under 60 chars with project name",
  "heroSubheadline": "2-sentence subheadline highlighting key selling point, under 120 chars",
  "metaTitle": "SEO title under 60 chars including project name and city",
  "metaDescription": "SEO meta description under 155 chars with call to action",
  "aboutSection": "2-3 paragraphs about the project (400-500 words). Include the primary keyword naturally. Make it informative and compelling for both humans and AI search engines.",
  "features": [
    {"title": "Feature Name", "description": "1-2 sentence description", "icon": "emoji"},
    {"title": "Feature Name", "description": "1-2 sentence description", "icon": "emoji"},
    {"title": "Feature Name", "description": "1-2 sentence description", "icon": "emoji"},
    {"title": "Feature Name", "description": "1-2 sentence description", "icon": "emoji"},
    {"title": "Feature Name", "description": "1-2 sentence description", "icon": "emoji"},
    {"title": "Feature Name", "description": "1-2 sentence description", "icon": "emoji"}
  ],
  "locationDescription": "2-3 paragraphs about the neighborhood, transit, schools, amenities (300-400 words). Include city name and neighborhood. Be specific with real facts when possible.",
  "faqs": [
    {"question": "What is [Project Name]?", "answer": "clear, factual answer"},
    {"question": "Where is [Project Name] located?", "answer": "specific location details"},
    {"question": "What are the prices at [Project Name]?", "answer": "pricing info"},
    {"question": "When will [Project Name] be completed?", "answer": "occupancy info"},
    {"question": "What types of homes are available?", "answer": "property type details"},
    {"question": "Who is the developer?", "answer": "developer info"}
  ],
  "ctaText": "short CTA text like 'Register for VIP Access'",
  "additionalSections": [
    {"heading": "section heading", "content": "section content paragraph"}
  ]
}`
}

function validateContent(parsed: Record<string, unknown>, config: ProjectConfig): GeneratedContent {
  return {
    heroHeadline: String(parsed.heroHeadline || `Welcome to ${config.projectName}`),
    heroSubheadline: String(
      parsed.heroSubheadline ||
        `Discover your new home in ${config.city || 'an exceptional location'}.`
    ),
    metaTitle: String(
      parsed.metaTitle ||
        `${config.projectName} | New ${config.propertyType} in ${config.city || 'Ontario'}`
    ).slice(0, 60),
    metaDescription: String(
      parsed.metaDescription ||
        `Explore ${config.projectName} — new ${config.propertyType} homes ${config.priceRange ? 'from ' + config.priceRange : ''} in ${config.city || 'Ontario'}. Register today for VIP access.`
    ).slice(0, 155),
    aboutSection: String(parsed.aboutSection || config.description || ''),
    features: Array.isArray(parsed.features)
      ? parsed.features.map((f: Record<string, unknown>) => ({
          title: String(f.title || ''),
          description: String(f.description || ''),
          icon: String(f.icon || '✨'),
        }))
      : buildDefaultFeatures(config),
    locationDescription: String(
      parsed.locationDescription || `${config.projectName} is located in ${config.neighborhood || config.city || 'a prime location'}.`
    ),
    faqs: Array.isArray(parsed.faqs)
      ? parsed.faqs.map((f: Record<string, unknown>) => ({
          question: String(f.question || ''),
          answer: String(f.answer || ''),
        }))
      : buildDefaultFaqs(config),
    ctaText: String(parsed.ctaText || 'Register for VIP Access'),
    additionalSections: Array.isArray(parsed.additionalSections)
      ? parsed.additionalSections.map((s: Record<string, unknown>) => ({
          heading: String(s.heading || ''),
          content: String(s.content || ''),
        }))
      : [],
  }
}

function buildDefaultFeatures(config: ProjectConfig): GeneratedContent['features'] {
  const items = config.features.slice(0, 6)
  if (items.length === 0) {
    return [
      { title: 'Modern Design', description: 'Contemporary architecture with premium finishes.', icon: '🏠' },
      { title: 'Prime Location', description: `Located in ${config.city || 'a desirable neighborhood'}.`, icon: '📍' },
      { title: 'Investment Value', description: 'Strong potential for long-term appreciation.', icon: '📈' },
      { title: 'Quality Construction', description: `Built by ${config.developer || 'an experienced developer'}.`, icon: '🔨' },
      { title: 'Community Living', description: 'Thoughtfully planned community with amenities.', icon: '🌳' },
      { title: 'Smart Home Ready', description: 'Pre-wired for smart home technology.', icon: '💡' },
    ]
  }
  return items.map((f) => ({ title: f, description: '', icon: '✨' }))
}

function buildDefaultFaqs(config: ProjectConfig): GeneratedContent['faqs'] {
  return [
    {
      question: `What is ${config.projectName}?`,
      answer: config.description || `${config.projectName} is a new ${config.propertyType} development in ${config.city || 'Ontario'}.`,
    },
    {
      question: `Where is ${config.projectName} located?`,
      answer: `${config.projectName} is located ${config.location ? 'at ' + config.location : ''} in ${config.neighborhood || ''} ${config.city || 'Ontario'}.`.trim(),
    },
    {
      question: `What are the prices at ${config.projectName}?`,
      answer: config.priceRange ? `Prices start ${config.priceRange}.` : 'Contact us for current pricing.',
    },
    {
      question: `When will ${config.projectName} be ready?`,
      answer: config.occupancy ? `Estimated occupancy is ${config.occupancy}.` : 'Contact us for occupancy timeline.',
    },
    {
      question: `Who is building ${config.projectName}?`,
      answer: config.developer ? `${config.projectName} is developed by ${config.developer}.` : 'Contact us for developer information.',
    },
  ]
}

export function buildFallbackContent(config: ProjectConfig): GeneratedContent {
  return {
    heroHeadline: `Welcome to ${config.projectName}`,
    heroSubheadline: `Discover your new home in ${config.city || 'an exceptional location'}.`,
    metaTitle: `${config.projectName} | New ${config.propertyType} in ${config.city || 'Ontario'}`.slice(0, 60),
    metaDescription: `Explore ${config.projectName} — new ${config.propertyType} homes in ${config.city || 'Ontario'}. Register today for exclusive VIP access and pricing.`.slice(0, 155),
    aboutSection: config.description || `${config.projectName} is an exciting new ${config.propertyType} development in ${config.city || 'Ontario'}.`,
    features: buildDefaultFeatures(config),
    locationDescription: `${config.projectName} is situated in ${config.neighborhood || config.city || 'a prime location'}, offering convenient access to transit, schools, shopping, and dining.`,
    faqs: buildDefaultFaqs(config),
    ctaText: 'Register for VIP Access',
    additionalSections: [],
  }
}
