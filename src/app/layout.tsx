import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vitto Mare — Panel',
  description: 'Panel de administración',
  icons: {
    icon: 'https://vittomare.com/logo-vitto-mare.png',
    apple: 'https://vittomare.com/logo-vitto-mare.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
