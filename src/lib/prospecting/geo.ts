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
