import { NextRequest, NextResponse } from 'next/server'
import { brokerErrorResponse, deleteBrokerProject, rejectUnlessBroker, updateBrokerProject } from '@/lib/brokerGuideServer'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied
  try {
    const { id } = await context.params
    const body = await request.json()
    return await updateBrokerProject(id, body)
  } catch (error) {
    console.error('Broker guide update failed:', error)
    return brokerErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied
  try {
    const { id } = await context.params
    return await deleteBrokerProject(id)
  } catch (error) {
    console.error('Broker guide delete failed:', error)
    return brokerErrorResponse(error)
  }
}
