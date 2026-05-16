import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'White Label Player',
  description: 'Your private music library',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
