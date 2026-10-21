import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'

// Self-hosted type system — no runtime network dependency.
// Display grotesk for headlines, neutral sans for interface copy,
// clinical monospace for system data and metadata.
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/ibm-plex-mono/700.css'

import './globals.css'
import './live.css'

export const metadata: Metadata = {
  title: 'VitalTwin — Your Health. Simulated. Understood.',
  description:
    'A personal health digital twin that learns your baseline, watches simulated signals, and explains what it sees. A calm, explainable health intelligence prototype.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#EAE6DA',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
