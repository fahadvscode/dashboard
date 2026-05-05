import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface ProjectRecommendation {
  project: any
  matchScore: number
  reasoning: string
  pitch: string
  keyDifferentiators: string[]
}

export async function POST(request: NextRequest) {
  try {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'AI recommendations are not configured.' }, { status: 503 })
    }

    const { lead, originalProject } = await request.json()

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead data is required' },
        { status: 400 }
      )
    }

    // If we have the original project details, use them
    let originalProjectData = originalProject

    // If project_name is provided but no full project data, try to fetch it
    if (!originalProjectData && lead.project_name) {
      const { data: project } = await supabase
        .from('canada_properties')
        .select('*')
        .ilike('project_name', `%${lead.project_name}%`)
        .limit(1)
        .single()
      
      originalProjectData = project
    }

    // Find similar projects from database
    let query = supabase
      .from('canada_properties')
      .select('*')
      .limit(20)

    // If we have original project, match based on its attributes
    if (originalProjectData) {
      // Match city
      if (originalProjectData.city) {
        query = query.eq('city', originalProjectData.city)
      }

      // Try to match bedroom count (extract number from bedrooms string)
      if (originalProjectData.bedrooms) {
        const bedroomMatch = originalProjectData.bedrooms.match(/(\d+)/)
        if (bedroomMatch) {
          const bedroomCount = bedroomMatch[1]
          query = query.ilike('bedrooms', `%${bedroomCount}%`)
        }
      }
    }

    const { data: similarProjects, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch similar projects' },
        { status: 500 }
      )
    }

    if (!similarProjects || similarProjects.length === 0) {
      return NextResponse.json({
        success: true,
        originalProject: originalProjectData,
        recommendations: []
      })
    }

    // Filter out the original project if it's in the results
    const filteredProjects = originalProjectData 
      ? similarProjects.filter(p => p.id !== originalProjectData.id)
      : similarProjects

    // Use AI to rank and generate pitches for top projects
    const projectsForAI = filteredProjects.slice(0, 10).map(p => ({
      id: p.id,
      name: p.project_name,
      builder: p.builder,
      city: p.city,
      price: (p.price && typeof p.price === 'string') ? p.price.substring(0, 100) : 'Contact for pricing',
      bedrooms: p.bedrooms,
      features: (p.features && typeof p.features === 'string') ? p.features.substring(0, 200) : '',
      quickFacts: (p.quick_facts && typeof p.quick_facts === 'string') ? p.quick_facts.substring(0, 200) : ''
    }))

    const prompt = `You are an expert real estate sales consultant. Analyze these projects and recommend the TOP 5 best matches for this lead.

LEAD INFORMATION:
- Name: ${lead.firstname || ''} ${lead.lastname || ''}
- Message: ${lead.message || 'No specific requirements mentioned'}
- Project Inquired: ${originalProjectData?.project_name || lead.project_name || 'Not specified'}

${originalProjectData ? `
ORIGINAL PROJECT DETAILS:
- Name: ${originalProjectData.project_name}
- Builder: ${originalProjectData.builder || 'N/A'}
- Location: ${originalProjectData.city || 'N/A'}
- Price: ${(originalProjectData.price && typeof originalProjectData.price === 'string') ? originalProjectData.price.substring(0, 100) : 'N/A'}
- Bedrooms: ${originalProjectData.bedrooms || 'N/A'}
- Features: ${(originalProjectData.features && typeof originalProjectData.features === 'string') ? originalProjectData.features.substring(0, 200) : 'N/A'}
` : ''}

AVAILABLE SIMILAR PROJECTS:
${JSON.stringify(projectsForAI, null, 2)}

Provide your analysis in the following JSON format (respond with ONLY valid JSON, no markdown):

{
  "recommendations": [
    {
      "projectId": "<project id>",
      "matchScore": <number 0-100>,
      "reasoning": "<1-2 sentences why this is a good match>",
      "pitch": "<compelling 1-sentence pitch for this project>",
      "keyDifferentiators": ["<differentiator1>", "<differentiator2>", "<differentiator3>"]
    }
  ]
}

Return the TOP 5 projects ranked by match score (highest first). Consider:
- Location match
- Price similarity (±20%)
- Bedroom count match
- Similar features/amenities
- Builder reputation
- Value proposition

Make the pitch compelling and highlight what makes each project special. Keep it concise and sales-focused.`

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
            content: 'You are an expert real estate sales consultant. You analyze projects and provide structured JSON recommendations. You always return valid JSON without markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API Error:', errorText)
      throw new Error('Failed to generate recommendations')
    }

    const data = await response.json()
    let recommendationsText = data.choices[0].message.content.trim()
    
    // Remove markdown code blocks if present
    recommendationsText = recommendationsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    const aiRecommendations = JSON.parse(recommendationsText)

    // Match AI recommendations with full project data
    const fullRecommendations: ProjectRecommendation[] = aiRecommendations.recommendations
      .map((rec: any) => {
        const project = filteredProjects.find(p => p.id === rec.projectId)
        if (!project) return null
        
        return {
          project,
          matchScore: rec.matchScore,
          reasoning: rec.reasoning,
          pitch: rec.pitch,
          keyDifferentiators: rec.keyDifferentiators
        }
      })
      .filter((rec: any) => rec !== null)

    return NextResponse.json({
      success: true,
      originalProject: originalProjectData,
      recommendations: fullRecommendations
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate recommendations',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

