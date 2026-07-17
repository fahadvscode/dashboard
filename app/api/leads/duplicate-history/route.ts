import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Normalize strings for comparison (lowercase, trim, remove extra spaces)
function normalizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Check if two names match (fuzzy matching for typos/variations)
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeString(name1)
  const n2 = normalizeString(name2)
  
  // Exact match
  if (n1 === n2) return true
  
  // Check if one name contains the other (handles "John" vs "John Smith")
  if (n1.includes(n2) || n2.includes(n1)) return true
  
  // Check initials match (e.g., "John D" matches "John Doe")
  const n1Words = n1.split(' ')
  const n2Words = n2.split(' ')
  
  // First word must match
  if (n1Words[0] && n2Words[0] && n1Words[0] === n2Words[0]) {
    // If one has only first name and other has first+last, consider match
    if (n1Words.length === 1 || n2Words.length === 1) return true
    
    // Check if last names match or are similar
    if (n1Words.length > 1 && n2Words.length > 1) {
      const last1 = n1Words[n1Words.length - 1]
      const last2 = n2Words[n2Words.length - 1]
      // Last name match or one is initial
      if (last1 === last2 || last1.length === 1 || last2.length === 1) {
        return true
      }
    }
  }
  
  return false
}

// Check if phone numbers match (normalized)
function phonesMatch(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  if (!phone1 || !phone2) return false
  
  // Remove all non-digit characters
  const p1 = phone1.replace(/\D/g, '')
  const p2 = phone2.replace(/\D/g, '')
  
  // Exact match
  if (p1 === p2) return true
  
  // Match last 7 or 10 digits (handles country codes)
  if (p1.length >= 7 && p2.length >= 7) {
    const last7_1 = p1.slice(-7)
    const last7_2 = p2.slice(-7)
    if (last7_1 === last7_2) return true
  }
  
  return false
}

// Check if emails match (normalized)
function emailsMatch(email1: string | null | undefined, email2: string | null | undefined): boolean {
  if (!email1 || !email2) return false
  return normalizeString(email1) === normalizeString(email2)
}

export async function POST(request: NextRequest) {
  try {
    const { email, phone, firstname, lastname, currentTable, currentLeadId } = await request.json()

    if (!email && !phone && !firstname && !lastname) {
      return NextResponse.json(
        { error: 'Email, phone, or name is required' },
        { status: 400 }
      )
    }

    const duplicateHistory: any[] = []
    const tablesToCheck = ['fj_leads', 'precon_factory_leads', 'precon_factory_website_leads', 'gta_lowrise_leads', 'rental_leads', 'cornerstone_leads', 'novella_leads', 'lakeview_village_leads', 'rollingwood_leads', 'enclave', 'hawthorne_east_village', 'bronte_trails', 'spruce_trails', 'meadowvale_brooks', 'the_legacy', 'ivy_rouge_landing_leads', 'abacot_hill_leads']

    // Check both tables
    for (const tableName of tablesToCheck) {
      try {
        // Build smart matching conditions
        // We'll fetch candidates and filter in JavaScript for better matching
        
        // Get all leads from this table (we'll filter after)
        let query = supabase
          .from(tableName)
          .select('*')
          .neq('id', currentLeadId || '') // Exclude current lead
        
        const { data: candidates, error: queryError } = await query

        if (queryError) {
          console.error(`Error querying ${tableName}:`, queryError)
          continue
        }

        if (!candidates || candidates.length === 0) continue

        // Smart filtering: match on email, phone, or name
        const matches = candidates.filter((lead: any) => {
          // Match by email (exact)
          if (email && emailsMatch(email, lead.email)) return true
          
          // Match by phone (normalized)
          if (phone && phonesMatch(phone, lead.phone)) return true
          
          // Match by name (smart matching) - handle both firstname/lastname and first_name/last_name
          const leadFirst = lead.firstname || lead.first_name || ''
          const leadLast = lead.lastname || lead.last_name || ''
          const currentFullName = `${firstname || ''} ${lastname || ''}`.trim()
          const leadFullName = `${leadFirst} ${leadLast}`.trim()
          
          if (currentFullName && leadFullName && namesMatch(currentFullName, leadFullName)) {
            // If names match, also check if we have phone or email match
            // This handles cases like "John Doe" with different emails
            if (phone && phonesMatch(phone, lead.phone)) return true
            if (email && emailsMatch(email, lead.email)) return true
            
            // If name matches and we have phone or email, it's likely a match
            // But be careful - require at least name + (phone OR email) match
            if ((phone && lead.phone) || (email && lead.email)) {
              return true
            }
          }
          
          // Match by phone + name (even if email differs)
          if (phone && phonesMatch(phone, lead.phone) && firstname && leadFirst) {
            const currentFirst = normalizeString(firstname)
            const leadFirstNorm = normalizeString(leadFirst)
            if (currentFirst === leadFirstNorm || currentFirst.includes(leadFirstNorm) || leadFirstNorm.includes(currentFirst)) {
              return true
            }
          }
          
          // Match by email + name (even if phone differs)
          if (email && emailsMatch(email, lead.email) && firstname && leadFirst) {
            const currentFirst = normalizeString(firstname)
            const leadFirstNorm2 = normalizeString(leadFirst)
            if (currentFirst === leadFirstNorm2 || currentFirst.includes(leadFirstNorm2) || leadFirstNorm2.includes(currentFirst)) {
              return true
            }
          }
          
          return false
        })

        // Format duplicate history
        for (const lead of matches) {
          // Normalize call history
          let callHistory: any[] = []
          if (lead.call_history) {
            try {
              if (typeof lead.call_history === 'string') {
                callHistory = JSON.parse(lead.call_history)
              } else if (Array.isArray(lead.call_history)) {
                callHistory = lead.call_history
              }
            } catch (e) {
              callHistory = []
            }
          }

          const displayName = 
            tableName === 'fj_leads' ? 'FJ Leads' :
            tableName === 'precon_factory_leads' ? 'Precon Factory Leads' :
            tableName === 'precon_factory_website_leads' ? 'Precon Factory Website Leads' :
            tableName === 'gta_lowrise_leads' ? 'GTA Lowrise Leads' :
            tableName === 'rental_leads' ? 'Rental Leads' :
            tableName === 'cornerstone_leads' ? 'Cornerstone' :
            tableName === 'novella_leads' ? 'Novella' :
            tableName === 'lakeview_village_leads' ? 'Lakeview Village' :
            tableName === 'rollingwood_leads' ? 'Rollingwood' :
            tableName === 'enclave' ? 'Enclave' :
            tableName === 'hawthorne_east_village' ? 'Hawthorne East Village' :
            tableName === 'bronte_trails' ? 'Bronte Trails' :
            tableName === 'spruce_trails' ? 'Spruce Trails' :
            tableName === 'meadowvale_brooks' ? 'Meadowvale Brooks' :
            tableName === 'the_legacy' ? 'The Legacy' :
            tableName === 'ivy_rouge_landing_leads' ? 'Ivy Rouge' :
            tableName === 'abacot_hill_leads' ? 'Abacot Hill' :
            tableName
          
          duplicateHistory.push({
            id: lead.id,
            table: tableName,
            tableName: displayName,
            firstname: lead.firstname || lead.first_name,
            lastname: lead.lastname || lead.last_name,
            email: lead.email,
            phone: lead.phone,
            project_name: lead.project_name || lead.source || 'N/A',
            project_id: lead.project_id || null,
            status: lead.status || 'N/A',
            lead_temperature: lead.lead_temperature || 'warm',
            priority: lead.priority || null,
            isagent: lead.isagent || false,
            created_at: lead.created_at,
            call_count: lead.call_count || 0,
            call_history: callHistory,
            last_note: lead.last_note || null,
            subject: lead.subject || null,
            message: lead.message || null,
            redirect_link: lead.redirect_link || null
          })
        }
      } catch (error) {
        console.error(`Error processing ${tableName}:`, error)
        // Continue with other table
      }
    }

    // Sort by created_at (newest first)
    duplicateHistory.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      success: true,
      duplicates: duplicateHistory
    })

  } catch (error) {
    console.error('Error fetching duplicate history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch duplicate history' },
      { status: 500 }
    )
  }
}

