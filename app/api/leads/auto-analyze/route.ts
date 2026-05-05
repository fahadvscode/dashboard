import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'AI analysis is not configured.' }, { status: 503 })
    }

    const { leadId, tableName, lead } = await request.json()

    if (!leadId || !tableName || !lead) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`🤖 Auto-analyzing ${tableName} lead: ${leadId}`)

    // Prepare lead data for analysis
    const leadInfo = `
LEAD INFORMATION:
Name: ${lead.firstname || ''} ${lead.lastname || ''}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Project Inquired: ${lead.project_name || 'Not specified'}
Message: ${lead.message || 'No message provided'}
Lead Type: ${lead.isagent ? 'Agent' : 'Buyer'}
Status: ${lead.status || 'New'}
Source: ${lead.source || 'Unknown'}
Created: ${lead.created_at || 'Unknown'}
`

    const prompt = `You are an expert real estate lead analyst. Analyze this lead and provide a comprehensive assessment.

${leadInfo}

Provide your analysis in the following JSON format (respond with ONLY valid JSON, no markdown, no explanations):

{
  "score": <number 0-100>,
  "confidence": "<high|medium|low>",
  "insights": {
    "budget": "<extracted budget range or 'Not mentioned'>",
    "timeline": "<extracted timeline or 'Not mentioned'>",
    "priorities": ["<priority1>", "<priority2>", ...],
    "buyerType": "<Investor|End-user|First-time buyer|Upgrader|Agent>",
    "urgency": "<high|medium|low>"
  },
  "reasoning": "<2-3 sentence explanation of the score>",
  "keyPoints": ["<point1>", "<point2>", "<point3>"]
}

SCORING CRITERIA (0-100):
- 90-100: Hot lead - Detailed inquiry, clear intent, complete contact info, specific requirements
- 70-89: Warm lead - Good details, some urgency indicators, mostly complete info
- 50-69: Moderate lead - Basic inquiry, generic message, may need nurturing
- 30-49: Cold lead - Minimal info, generic inquiry, incomplete details
- 0-29: Very cold - Bot-like, no useful information, incomplete contact

Consider:
1. Message quality and detail level
2. Urgency indicators (ASAP, urgent, soon, timeline mentions)
3. Budget/financing mentions
4. Specific questions or requirements
5. Contact information completeness
6. Agent vs direct buyer
7. Project specificity

Extract insights from the message content. Be specific and actionable.`

    // Call DeepSeek AI
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
            content: 'You are an expert real estate lead analyst. You analyze leads and provide structured JSON responses with scores and insights. You always return valid JSON without markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API Error:', errorText)
      throw new Error('Failed to analyze lead with AI')
    }

    const data = await response.json()
    let analysisText = data.choices[0].message.content.trim()
    
    // Remove markdown code blocks if present
    analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    const analysis = JSON.parse(analysisText)

    // Store AI analysis in database
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        ai_score: analysis.score,
        ai_confidence: analysis.confidence,
        ai_budget: analysis.insights.budget,
        ai_timeline: analysis.insights.timeline,
        ai_priorities: analysis.insights.priorities,
        ai_buyer_type: analysis.insights.buyerType,
        ai_urgency: analysis.insights.urgency,
        ai_reasoning: analysis.reasoning,
        ai_key_points: analysis.keyPoints,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('Error storing AI analysis:', updateError)
      throw updateError
    }

    console.log(`✅ AI analysis complete for ${tableName} lead: ${leadId} (Score: ${analysis.score})`)

    return NextResponse.json({
      success: true,
      leadId,
      tableName,
      score: analysis.score,
      analysis
    })

  } catch (error) {
    console.error('Error in auto-analyze:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to auto-analyze lead',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

