import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'White Label Player',
  description: 'Your private music library',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @font-face {
            font-family: 'StealThis';
            src: url('/StealThisFont.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
