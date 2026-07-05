import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data, error } = await db
    .from('instagram_triggers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const body = await req.json()
  const { data, error } = await db
    .from('instagram_triggers')
    .insert({
      type: body.type,
      keyword: body.keyword || null,
      keyword_match: body.keyword_match || 'contains',
      response_message: body.response_message,
      also_reply_comment: body.also_reply_comment || false,
      comment_reply_text: body.comment_reply_text || null,
      active: true,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const db = await createClient()
  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await db
    .from('instagram_triggers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const db = await createClient()
  const { id } = await req.json()
  const { error } = await db.from('instagram_triggers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
