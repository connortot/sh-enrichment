'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Nav({ email }: { email: string }) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-[#008DDA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <a href="/companies" className="flex items-center hover:opacity-80 transition-opacity">
          <img
            src="/logo-white.svg"
            alt="Logo"
            className="h-7 w-auto"
          />
        </a>
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-xs">{email}</span>
          <button
            onClick={signOut}
            className="text-white/70 hover:text-white text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
