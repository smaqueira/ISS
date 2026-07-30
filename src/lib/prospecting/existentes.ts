// Carga TODOS los contactos existentes (paginado, sin el tope de 1000 de
// Supabase) para deduplicar la prospección por nombre, teléfono e Instagram.

// Normaliza nombre: minúsculas, sin acentos, espacios colapsados.
export function normName(v?: string | null): string {
  return (v || '').toLowerCase().normalize('NFD')
    .split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')
    .replace(/\s+/g, ' ').trim()
}

// Normaliza teléfono: solo dígitos (ignora +, espacios, guiones, paréntesis).
export function normPhone(v?: string | null): string {
  return (v || '').replace(/\D/g, '')
}

// Extrae el @usuario de Instagram desde un @, una URL de instagram.com, o
// un "sitio web" que en realidad es el Instagram del negocio (caso típico de Google).
export function igFromAny(v?: string | null): string | null {
  if (!v) return null
  const s = v.trim()
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
  if (m) return m[1].toLowerCase()
  if (s.startsWith('@')) return s.slice(1).toLowerCase().replace(/[/?].*$/, '') || null
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cargarExistentes(db: any): Promise<{ names: Set<string>; phones: Set<string>; instagrams: Set<string> }> {
  const names = new Set<string>()
  const phones = new Set<string>()
  const instagrams = new Set<string>()

  for (let offset = 0; ; offset += 1000) {
    const { data } = await db.from('clients').select('name, phone, instagram, website').order('id').range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const c of data as { name?: string; phone?: string; instagram?: string; website?: string }[]) {
      if (c.name) names.add(normName(c.name))
      const ph = normPhone(c.phone); if (ph) phones.add(ph)
      const ig = igFromAny(c.instagram) || igFromAny(c.website); if (ig) instagrams.add(ig)
    }
    if (data.length < 1000) break
  }

  return { names, phones, instagrams }
}
