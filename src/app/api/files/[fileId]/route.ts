import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

type Params = Promise<{ fileId: string }>

const BUCKET = 'client-files'

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const store = await cookies()
  if (store.get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { fileId } = await params
  const db = createAdminClient()

  const { data: file, error: fetchError } = await db
    .from('client_files').select('path').eq('id', fileId).single()

  if (fetchError || !file) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  await db.storage.from(BUCKET).remove([file.path])

  const { error } = await db.from('client_files').delete().eq('id', fileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
