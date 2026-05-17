'use client'
import { PlayerProvider } from '@/lib/player-context'
import { BgProvider } from '@/lib/background-context'
import Sidebar from '@/components/layout/Sidebar'
import GlobalBg from '@/components/layout/GlobalBg'
import { useEffect, useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <PlayerProvider>
      <BgProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
          <GlobalBg />
          <Sidebar />
          <div style={{
            flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            paddingTop: isMobile ? 52 : 0,
          }}>
            {children}
          </div>
        </div>
      </BgProvider>
    </PlayerProvider>
  )
}
