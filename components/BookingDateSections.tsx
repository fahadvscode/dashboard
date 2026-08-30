import { Fragment, type ReactNode } from 'react'
import { formatBookingDay, groupBookingsByDate } from '@/lib/bookingDateFilter'

export default function BookingDateSections<T extends { id: string; appointment_date?: string | null }>({
  bookings,
  renderCard,
}: {
  bookings: T[]
  renderCard: (booking: T) => ReactNode
}) {
  const groups = groupBookingsByDate(bookings)

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.date}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {formatBookingDay(group.date)} · {group.items.length}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((booking) => (
              <Fragment key={booking.id}>{renderCard(booking)}</Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
