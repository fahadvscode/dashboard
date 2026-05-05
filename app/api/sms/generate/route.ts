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

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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
    const fjLandingPage = project.fj_landing_page || ''
    const preconLandingPage = project.precon_factory_landing_page || ''

    // Create professional SMS prompts based on best practices
    const fjPrompt = `You are an expert SMS marketing copywriter specializing in real estate. Create a professional, concise SMS marketing message for a pre-construction property.

BEST PRACTICES TO FOLLOW:
- Keep it under 160 characters if possible (max 300)
- Create urgency and FOMO (Fear of Missing Out)
- Use 1-2 professional emojis maximum (🏢 🏙️ 📍 ✨ 💎)
- Clear call-to-action at the end
- Professional tone
- Focus on ONE key benefit or feature
- Include the landing page link at the very end

PROJECT DETAILS:
- Project: ${projectName}
- Builder: ${builder}
- Location: ${city}
- Price: ${price}
- Bedrooms: ${bedrooms}
- Features: ${features}
- Quick Facts: ${quickFacts}
- Landing Page: ${fjLandingPage}

BRAND: FJ (Fahad Javed) - Professional real estate brand

Create a short, professional SMS message that will get HIGH CLICK-THROUGH RATES. Put the link at the very end. Be concise and powerful.

IMPORTANT: Return ONLY the SMS message text, no explanations or additional text.`

    const preconPrompt = `You are an expert SMS marketing copywriter specializing in real estate. Create a professional, concise SMS marketing message for a pre-construction property.

BEST PRACTICES TO FOLLOW:
- Keep it under 160 characters if possible (max 300)
- Create urgency and FOMO (Fear of Missing Out)
- Use 1-2 professional emojis maximum (🏢 🏙️ 📍 ✨ 💎)
- Clear call-to-action at the end
- Professional tone
- Focus on ONE key benefit or feature
- Include the landing page link at the very end

PROJECT DETAILS:
- Project: ${projectName}
- Builder: ${builder}
- Location: ${city}
- Price: ${price}
- Bedrooms: ${bedrooms}
- Features: ${features}
- Quick Facts: ${quickFacts}
- Landing Page: ${preconLandingPage}

BRAND: Precon Factory - Premium pre-construction property marketplace

Create a short, professional SMS message that will get HIGH CLICK-THROUGH RATES. Put the link at the very end. Be concise and powerful.

IMPORTANT: Return ONLY the SMS message text, no explanations or additional text.`

    // Generate FJ SMS
    const fjResponse = await fetch(DEEPSEEK_API_URL, {
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
            content: 'You are an expert SMS marketing copywriter. You write concise, professional, high-converting SMS messages. You always follow character limits and best practices for SMS marketing.'
          },
          {
            role: 'user',
            content: fjPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!fjResponse.ok) {
      const errorText = await fjResponse.text()
      console.error('DeepSeek FJ API Error:', errorText)
      throw new Error('Failed to generate FJ SMS')
    }

    const fjData = await fjResponse.json()
    const fjMessage = fjData.choices[0].message.content.trim()

    // Generate Precon Factory SMS
    const preconResponse = await fetch(DEEPSEEK_API_URL, {
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
            content: 'You are an expert SMS marketing copywriter. You write concise, professional, high-converting SMS messages. You always follow character limits and best practices for SMS marketing.'
          },
          {
            role: 'user',
            content: preconPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!preconResponse.ok) {
      const errorText = await preconResponse.text()
      console.error('DeepSeek Precon API Error:', errorText)
      throw new Error('Failed to generate Precon Factory SMS')
    }

    const preconData = await preconResponse.json()
    const preconMessage = preconData.choices[0].message.content.trim()

    return NextResponse.json({
      fj: fjMessage,
      precon: preconMessage
    })

  } catch (error) {
    console.error('Error generating SMS:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate SMS messages' },
      { status: 500 }
    )
  }
}

