// Carga TODOS los contactos existentes (paginado, sin el tope de 1000 de
// Supabase) para deduplicar la prospección por nombre, teléfono e Instagram.

function normIg(v: string): string {
  return v.toLowerCase()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/^@/, '')
    .replace(/[/?].*$/, '')
    .trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cargarExistentes(db: any): Promise<{ names: Set<string>; phones: Set<string>; instagrams: Set<string> }> {
  const names = new Set<string>()
  const phones = new Set<string>()
  const instagrams = new Set<string>()

  for (let offset = 0; ; offset += 1000) {
    const { data } = await db.from('clients').select('name, phone, instagram').order('id').range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const c of data as { name?: string; phone?: string; instagram?: string }[]) {
      if (c.name) names.add(c.name.toLowerCase().trim())
      if (c.phone) phones.add(c.phone)
      if (c.instagram) { const h = normIg(c.instagram); if (h) instagrams.add(h) }
    }
    if (data.length < 1000) break
  }

  return { names, phones, instagrams }
}
