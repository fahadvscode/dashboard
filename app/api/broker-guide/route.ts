import { NextRequest, NextResponse } from 'next/server'
import { brokerErrorResponse, createBrokerProject, listBrokerProjects, rejectUnlessBroker } from '@/lib/brokerGuideServer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied
  try {
    const projects = await listBrokerProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Broker guide list failed:', error)
    return brokerErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied
  try {
    const body = await request.json()
    return await createBrokerProject(body)
  } catch (error) {
    console.error('Broker guide create failed:', error)
    return brokerErrorResponse(error)
  }
}
