import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'COFR CRM',
  description: 'Vessel COFR renewal pipeline management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white text-[#3C3C3B] antialiased">{children}</body>
    </html>
  )
}
