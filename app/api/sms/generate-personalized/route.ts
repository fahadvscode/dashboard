import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'AI SMS is not configured.' }, { status: 503 })
    }

    const { projectId, leadName, brand } = await request.json()

    if (!projectId || !leadName || !brand) {
      return NextResponse.json(
        { error: 'Project ID, lead name, and brand are required' },
        { status: 400 }
      )
    }

    // Fetch project data from Supabase
    const { data: project, error: fetchError } = await supabase
      .from('canada_properties')
      .select('*')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Extract key information
    const projectName = project.project_name || 'New Development'
    const builder = project.builder || 'Premium Builder'
    const city = project.city || 'GTA'
    const price = (project.price && typeof project.price === 'string') ? project.price.substring(0, 50) : 'Contact for pricing'
    const bedrooms = project.bedrooms || 'Multiple options'
    const features = project.features || ''
    const quickFacts = project.quick_facts || ''
    
    // Select landing page based on brand
    const landingPage = brand === 'fj' 
      ? (project.fj_landing_page || '') 
      : (project.precon_factory_landing_page || '')

    const brandName = brand === 'fj' ? 'FJ (Fahad Javed)' : 'Precon Factory'

    // Create personalized SMS prompt
    const prompt = `You are an expert SMS marketing copywriter specializing in real estate. Create a PERSONALIZED, professional, concise SMS marketing message for a pre-construction property.

BEST PRACTICES TO FOLLOW:
- Keep it under 160 characters if possible (max 300)
- START with "Hi ${leadName}," or "${leadName}," to personalize
- Create urgency and FOMO (Fear of Missing Out)
- Use 1-2 professional emojis maximum (🏢 🏙️ 📍 ✨ 💎)
- Clear call-to-action at the end
- Professional, conversational tone
- Focus on ONE key benefit or feature
- Include the landing page link at the very end
- Make it feel personal, not generic

PROJECT DETAILS:
- Project: ${projectName}
- Builder: ${builder}
- Location: ${city}
- Price: ${price}
- Bedrooms: ${bedrooms}
- Features: ${features}
- Quick Facts: ${quickFacts}
- Landing Page: ${landingPage}

LEAD NAME: ${leadName}
BRAND: ${brandName} - Professional real estate brand

Create a short, PERSONALIZED SMS message that addresses ${leadName} by name and will get HIGH CLICK-THROUGH RATES. Put the link at the very end. Be concise, personal, and powerful.

IMPORTANT: Return ONLY the SMS message text, no explanations or additional text. The message MUST start with the lead's name.`

    // Generate personalized SMS
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SMS marketing copywriter. You write concise, professional, personalized, high-converting SMS messages. You always start messages with the recipient\'s name to create a personal connection.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API Error:', errorText)
      throw new Error('Failed to generate personalized SMS')
    }

    const data = await response.json()
    const message = data.choices[0].message.content.trim()

    return NextResponse.json({
      message: message,
      projectName: projectName,
      city: city
    })

  } catch (error) {
    console.error('Error generating personalized SMS:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate personalized SMS' },
      { status: 500 }
    )
  }
}

