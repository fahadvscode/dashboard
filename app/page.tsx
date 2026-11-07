import Link from 'next/link'

export default function FrontPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-white">
      <Link
        href="/home"
        className="rounded-full bg-[#0C5C35] px-8 py-3 text-base font-semibold text-white"
      >
        Dashboard
      </Link>
    </main>
  )
}
