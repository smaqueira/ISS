import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

async function getCompanySettings() {
  try {
    const db = await createClient()
    const { data } = await db.from('settings').select('key, value').in('key', [
      'COMPANY_NAME', 'COMPANY_LOGO_URL', 'COMPANY_DESCRIPTION', 'COMPANY_SLOGAN'
    ])
    return Object.fromEntries((data || []).map(r => [r.key, r.value]))
  } catch {
    return {}
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getCompanySettings()
  const name = s.COMPANY_NAME || 'Catálogo'
  const description = s.COMPANY_SLOGAN || s.COMPANY_DESCRIPTION || 'Ver productos y precios'
  const logo = s.COMPANY_LOGO_URL || null

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      ...(logo ? { images: [{ url: logo, width: 400, height: 400 }] } : {}),
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: name,
      description,
      ...(logo ? { images: [logo] } : {}),
    },
  }
}

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
