// Filtra resultados que no son de Argentina (Google a veces trae homónimos del
// exterior). Filtro POSITIVO: la dirección tiene que mencionar Argentina / Buenos
// Aires / CABA. Se hace así a propósito para NO descartar direcciones de CABA que
// están en calles con nombre de país (Uruguay, Chile, México, Perú, etc.).
const AR = /argentina|buenos\s*aires|c\.?a\.?b\.?a|capital\s*federal|prov(\.|incia)?\s*de\s*bs\.?\s*as/i

export function esDeArgentina(address?: string | null): boolean {
  const a = (address || '').trim()
  if (!a) return true // sin dirección no descartamos (la búsqueda ya apunta a AR)
  return AR.test(a)
}

// Nombre de país extranjero en la dirección. Se usa junto con !esDeArgentina para
// detectar (no auto-borrar) contactos del exterior ya cargados, sin marcar las
// calles de CABA con nombre de país (esas igual tienen "Buenos Aires" en la dir).
const EXTRANJERO = /\b(uruguay|montevideo|chile|santiago\s+de\s+chile|brasil|brazil|s[ãa]o\s*paulo|rio\s+de\s+janeiro|paraguay|asunci[oó]n|bolivia|per[uú]|lima|espa[ñn]a|spain|madrid|barcelona|m[eé]xico|mexico|colombia|bogot[aá]|estados\s+unidos|united\s+states|ecuador|venezuela|panam[aá]|portugal|italia|francia|paris)\b/i

export function paisExtranjero(address?: string | null): boolean {
  return EXTRANJERO.test((address || '').toLowerCase())
}

// Extrae la dirección de las notas de un contacto prospectado
// ("… Dirección: X. Rating: Y") o usa la nota tal cual (prospección manual).
export function direccionDeNotas(notes?: string | null): string {
  if (!notes) return ''
  const m = notes.match(/direcci[oó]n:\s*(.+?)(?:\.\s*rating|$)/i)
  return (m ? m[1] : notes).trim()
}
