'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BgContextType {
  bgUrl: string | null
  isDark: boolean
  setBg: (url: string | null, dark: boolean) => void
}

const BgContext = createContext<BgContextType>({ bgUrl: null, isDark: false, setBg: () => {} })

export function BgProvider({ children }: { children: React.ReactNode }) {
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('background_url, background_is_dark').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { setBgUrl(data.background_url); setIsDark(data.background_is_dark ?? false) }
        })
    })
  }, [])

  const setBg = (url: string | null, dark: boolean) => { setBgUrl(url); setIsDark(dark) }

  return <BgContext.Provider value={{ bgUrl, isDark, setBg }}>{children}</BgContext.Provider>
}

export function useBg() { return useContext(BgContext) }
