import { NextRequest, NextResponse } from 'next/server'
import { getSerperKeys, searchSerper } from '@/lib/link-hunt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function limpiarHandle(raw: string): string {
  return raw.trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?].*$/, '')
    .trim()
    .toLowerCase()
}

// Del título de Google saca el nombre del negocio:
// "Nombre del Negocio (@handle) • Fotos y videos de Instagram" -> "Nombre del Negocio"
function nombreDesdeTitulo(title: string): string {
  let t = title
  t = t.split(/\s*\(@/)[0]           // cortar en " (@handle)"
  t = t.split(/\s*[•·|]\s*/)[0]      // cortar en " • ... " / " · " / " | "
  t = t.replace(/\s*on Instagram.*$/i, '').replace(/\s*en Instagram.*$/i, '')
  return t.trim()
}

export async function POST(req: NextRequest) {
  const { handle: raw } = await req.json()
  const handle = limpiarHandle(typeof raw === 'string' ? raw : '')
  if (!handle) return NextResponse.json({ error: 'Falta el usuario de Instagram' }, { status: 400 })

  const keys = await getSerperKeys()
  if (!keys.length) return NextResponse.json({ handle, name: null })

  let organics: { link?: string; title?: string; snippet?: string }[] = []
  for (const key of keys) {
    organics = await searchSerper(`${handle} instagram`, key)
    if (organics.length) break
  }

  // Preferir el resultado que apunta al perfil exacto
  const perfil = organics.find(o => (o.link || '').toLowerCase().includes(`instagram.com/${handle}`))
    || organics.find(o => (o.link || '').toLowerCase().includes('instagram.com/'))
  const name = perfil?.title ? nombreDesdeTitulo(perfil.title) : null

  return NextResponse.json({ handle, name: name && name.length > 1 ? name : null })
}
