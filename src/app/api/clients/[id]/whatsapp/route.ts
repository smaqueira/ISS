import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProposal } from '@/lib/ai/proposals'

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  if (!client || !client.phone) return NextResponse.json({ error: 'Sin teléfono' }, { status: 400 })

  const proposal = await generateProposal({ name: client.name, rubro: client.rubro || 'negocio', type: client.type, city: client.city })
  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(proposal.whatsapp)}`

  return NextResponse.json({ url, message: proposal.whatsapp })
}
