import { PlayerProvider } from '@/lib/player-context'
import { BgProvider } from '@/lib/background-context'
import Sidebar from '@/components/layout/Sidebar'
import GlobalBg from '@/components/layout/GlobalBg'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <BgProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
          <GlobalBg />
          <Sidebar />
          {children}
        </div>
      </BgProvider>
    </PlayerProvider>
  )
}
