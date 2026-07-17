import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = Promise<{ id: string }>

const BUCKET = 'client-files'
const MAX_MB = 10

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: files, error } = await db
    .from('client_files')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generar signed URLs (válidas 1 hora)
  const withUrls = await Promise.all(
    (files || []).map(async (f) => {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(f.path, 3600)
      return { ...f, url: data?.signedUrl ?? null }
    })
  )

  return NextResponse.json(withUrls)
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = createAdminClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `El archivo supera los ${MAX_MB}MB` }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: meta, error: dbError } = await db.from('client_files').insert({
    client_id: id,
    nombre:    file.name,
    path,
    tipo:      ext,
    size:      file.size,
  }).select().single()

  if (dbError) {
    await db.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 3600)
  return NextResponse.json({ ...meta, url: signed?.signedUrl ?? null }, { status: 201 })
}
