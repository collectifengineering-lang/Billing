import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../lib/AuthContext'
import { MigrationProvider } from '../lib/migrationContext'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: 'Billing Platform',
  description: 'Billing and project management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          <MigrationProvider>
            <Toaster position="top-right" />
            {children}
          </MigrationProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 