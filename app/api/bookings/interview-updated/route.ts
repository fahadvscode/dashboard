import { NextRequest, NextResponse } from 'next/server'
import {
  prepareInterviewBooking,
  interviewSlotOrTimeChanged,
  syncInterviewCancellation,
  syncInterviewReschedule,
} from '@/lib/interviewBookingSync'
import { isBookingStatusCanceled } from '@/lib/bookingTimes'

const DASHBOARD_SYNC_SOURCES = new Set(['dashboard_cancel', 'dashboard_reschedule'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const oldRecord = (body.old_record || body.OLD || {}) as Record<string, unknown>
    const newRecord = (body.new_record || body.NEW || body) as Record<string, unknown>

    if (!newRecord.id) {
      return NextResponse.json({ error: 'Missing booking record.' }, { status: 400 })
    }

    const syncSource = String(newRecord.last_sync_source || '')
    if (DASHBOARD_SYNC_SOURCES.has(syncSource)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Already synced from Property Dashboard.',
      })
    }

    const oldBooking = prepareInterviewBooking(oldRecord)
    const newBooking = prepareInterviewBooking(newRecord)

    const wasCancelled = isBookingStatusCanceled(oldBooking.status)
    const isCancelled = isBookingStatusCanceled(newBooking.status)
    const becameCancelled = !wasCancelled && isCancelled
    const rescheduled =
      !isCancelled && interviewSlotOrTimeChanged(oldBooking, newBooking) && !becameCancelled

    if (!becameCancelled && !rescheduled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No interview reschedule or cancellation change detected.',
      })
    }

    const sourceLabel = 'via fahadsells.com manage page'
    const result = becameCancelled
      ? await syncInterviewCancellation(oldBooking, newBooking, sourceLabel)
      : await syncInterviewReschedule(oldBooking, newBooking, sourceLabel)

    return NextResponse.json({
      success: true,
      change: becameCancelled ? 'cancelled' : 'rescheduled',
      ...result,
    })
  } catch (error) {
    console.error('Error syncing interview booking update:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync interview booking update',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
