import Link from 'next/link'
import ConstantContactReport from '@/components/ConstantContactReport'

export default function FrontPage() {
  return (
    <main className="min-h-[100dvh] bg-[#F6F7F4]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ConstantContactReport />
        <div className="mt-10 flex justify-center pb-8">
          <Link
            href="/home"
            className="rounded-full bg-[#0C5C35] px-8 py-3 text-base font-semibold text-white"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
