import { createClient } from '@supabase/supabase-js'
import type { Reel, RealJob, ReelPublication, AutomationRule } from './types'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function listReels(filters?: { estado?: string; plataforma?: string; limit?: number }) {
  const db = getDb()
  let q = db.from('reels').select('*').order('created_at', { ascending: false })
  if (filters?.estado) q = q.eq('estado', filters.estado)
  if (filters?.plataforma) q = q.eq('plataforma', filters.plataforma)
  if (filters?.limit) q = q.limit(filters.limit)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as Reel[]
}

export async function getReel(id: string) {
  const db = getDb()
  const { data, error } = await db.from('reels').select('*').eq('id', id).single()
  if (error) throw error
  return data as Reel
}

export async function createReel(reel: Partial<Reel>) {
  const db = getDb()
  const { data, error } = await db.from('reels').insert(reel).select().single()
  if (error) throw error
  return data as Reel
}

export async function updateReel(id: string, patch: Partial<Reel>) {
  const db = getDb()
  const { data, error } = await db
    .from('reels')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Reel
}

export async function deleteReel(id: string) {
  const db = getDb()
  const { error } = await db.from('reels').delete().eq('id', id)
  if (error) throw error
}

export async function listJobs(reelId?: string) {
  const db = getDb()
  let q = db.from('reel_jobs').select('*').order('created_at', { ascending: false })
  if (reelId) q = q.eq('reel_id', reelId)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as RealJob[]
}

export async function createJob(job: Partial<RealJob>) {
  const db = getDb()
  const { data, error } = await db.from('reel_jobs').insert(job).select().single()
  if (error) throw error
  return data as RealJob
}

export async function updateJob(id: string, patch: Partial<RealJob>) {
  const db = getDb()
  const { data, error } = await db
    .from('reel_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as RealJob
}

export async function listPublications(reelId?: string) {
  const db = getDb()
  let q = db.from('reel_publications').select('*').order('created_at', { ascending: false })
  if (reelId) q = q.eq('reel_id', reelId)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as ReelPublication[]
}

export async function listAutomationRules() {
  const db = getDb()
  const { data, error } = await db.from('reel_automation_rules').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as AutomationRule[]
}

export async function toggleAutomationRule(id: string, activa: boolean) {
  const db = getDb()
  const { error } = await db.from('reel_automation_rules').update({ activa }).eq('id', id)
  if (error) throw error
}

export async function getReelStats() {
  const db = getDb()
  const [total, publicados, pendientes, programados] = await Promise.all([
    db.from('reels').select('*', { count: 'exact', head: true }),
    db.from('reels').select('*', { count: 'exact', head: true }).eq('estado', 'publicado'),
    db.from('reels').select('*', { count: 'exact', head: true }).in('estado', ['borrador', 'listo']),
    db.from('reel_publications').select('*', { count: 'exact', head: true }).eq('estado', 'programado'),
  ])
  return {
    total: total.count || 0,
    publicados: publicados.count || 0,
    pendientes: pendientes.count || 0,
    programados: programados.count || 0,
  }
}
