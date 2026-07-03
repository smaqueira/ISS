import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/ai/client'
import { getSetting } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const { client_name, rubro, items } = await req.json()

  const companyName = await getSetting('COMPANY_NAME') || 'nuestra empresa'
  const itemsText = (items || []).map((i: { name: string; qty: number; unit: string; unit_price: number }) =>
    `${i.qty} ${i.unit} de ${i.name} a $${i.unit_price}`
  ).join(', ')

  const intro = await ask(
    `Escribí una introducción profesional y cálida para una cotización comercial.
Cliente: ${client_name}${rubro ? ` (${rubro})` : ''}.
Empresa que cotiza: ${companyName}.
Productos cotizados: ${itemsText || 'productos varios'}.
Máximo 3 oraciones. Tono formal pero cercano. Sin saludos genéricos tipo "Estimado cliente".
Solo el párrafo de introducción, sin asunto ni firma.`,
    200
  )

  const notes = await ask(
    `Escribí una nota de cierre para una cotización comercial dirigida a ${client_name}.
Debe incluir: vigencia de la cotización (7 días), disponibilidad para consultas, y un llamado a la acción para confirmar.
Máximo 2 oraciones. Tono profesional y directo.
Solo el texto, sin títulos.`,
    150
  )

  return NextResponse.json({ intro, notes })
}
