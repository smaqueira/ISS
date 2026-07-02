import { getSetting } from '@/lib/settings'

interface PlaceResult {
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
  types: string[]
}

export async function searchPlaces(query: string, city: string): Promise<PlaceResult[]> {
  const apiKey = await getSetting('GOOGLE_PLACES_API_KEY')
  if (!apiKey) throw new Error('Google Places API Key no configurada')

  const q = encodeURIComponent(`${query} ${city}`)
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${apiKey}&language=es`

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK') return []

  const results: PlaceResult[] = []

  for (const place of data.results.slice(0, 20)) {
    const detail = await getPlaceDetail(place.place_id, apiKey)
    results.push({
      name: place.name,
      address: place.formatted_address,
      phone: detail?.phone,
      website: detail?.website,
      rating: place.rating,
      types: place.types || [],
    })
  }

  return results
}

async function getPlaceDetail(placeId: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK') return null
  return { phone: data.result?.formatted_phone_number, website: data.result?.website }
}
