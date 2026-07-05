import { createClient } from '@/lib/supabase/server'

const GRAPH_API = 'https://graph.facebook.com/v19.0'

async function getCredentials() {
  const db = await createClient()
  const { data } = await db.from('settings').select('key, value').in('key', [
    'INSTAGRAM_ACCESS_TOKEN',
    'INSTAGRAM_PAGE_ID',
  ])
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return {
    token: map['INSTAGRAM_ACCESS_TOKEN'] || '',
    pageId: map['INSTAGRAM_PAGE_ID'] || '',
  }
}

export async function sendInstagramDM(
  recipientId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const { token, pageId } = await getCredentials()
  if (!token || !pageId) return { ok: false, error: 'Credenciales de Instagram no configuradas' }

  try {
    const res = await fetch(`${GRAPH_API}/${pageId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error enviando DM' }
  }
}

export async function replyToComment(
  commentId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const { token } = await getCredentials()
  if (!token) return { ok: false, error: 'Token no configurado' }

  try {
    const res = await fetch(`${GRAPH_API}/${commentId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error respondiendo comentario' }
  }
}

function matchesKeyword(text: string, keyword: string, matchType: string): boolean {
  const t = text.toLowerCase().trim()
  const k = keyword.toLowerCase().trim()
  if (matchType === 'exact') return t === k
  if (matchType === 'starts_with') return t.startsWith(k)
  return t.includes(k)  // 'contains' por defecto
}

interface Trigger {
  id: string
  type: string
  keyword: string | null
  keyword_match: string
  response_message: string
  also_reply_comment: boolean
  comment_reply_text: string | null
  active: boolean
  sent_count: number
}

export async function handleIncomingDM(
  senderId: string,
  senderUsername: string | undefined,
  messageText: string,
): Promise<void> {
  const db = await createClient()

  // Registrar/actualizar conversación
  const { data: conv } = await db
    .from('instagram_conversations')
    .upsert({ instagram_user_id: senderId, username: senderUsername || null }, { onConflict: 'instagram_user_id' })
    .select()
    .single()

  const isFirstContact = !conv || !conv.welcome_sent

  // Si es primer contacto → buscar trigger de bienvenida
  if (isFirstContact) {
    const { data: welcomeTrigger } = await db
      .from('instagram_triggers')
      .select('*')
      .eq('type', 'welcome')
      .eq('active', true)
      .single()

    if (welcomeTrigger) {
      await sendAndLog(db, senderId, senderUsername, welcomeTrigger, 'welcome', messageText)
      await db
        .from('instagram_conversations')
        .upsert({ instagram_user_id: senderId, username: senderUsername || null, welcome_sent: true, last_dm_at: new Date().toISOString() }, { onConflict: 'instagram_user_id' })
      return
    }
  }

  // Buscar trigger por keyword en DMs
  const { data: triggers } = await db
    .from('instagram_triggers')
    .select('*')
    .eq('type', 'dm_keyword')
    .eq('active', true)

  if (!triggers) return

  for (const trigger of triggers as Trigger[]) {
    if (trigger.keyword && matchesKeyword(messageText, trigger.keyword, trigger.keyword_match)) {
      await sendAndLog(db, senderId, senderUsername, trigger, 'dm_keyword', messageText)
      await db
        .from('instagram_conversations')
        .upsert({ instagram_user_id: senderId, username: senderUsername || null, last_dm_at: new Date().toISOString() }, { onConflict: 'instagram_user_id' })
      return
    }
  }
}

export async function handleIncomingComment(
  commenterId: string,
  commenterUsername: string | undefined,
  commentText: string,
  commentId: string,
): Promise<void> {
  const db = await createClient()

  const { data: triggers } = await db
    .from('instagram_triggers')
    .select('*')
    .eq('type', 'comment_keyword')
    .eq('active', true)

  if (!triggers) return

  for (const trigger of triggers as Trigger[]) {
    if (trigger.keyword && matchesKeyword(commentText, trigger.keyword, trigger.keyword_match)) {
      // Enviar DM
      await sendAndLog(db, commenterId, commenterUsername, trigger, 'comment_keyword', commentText)

      // Responder públicamente al comentario si está configurado
      if (trigger.also_reply_comment && trigger.comment_reply_text) {
        await replyToComment(commentId, trigger.comment_reply_text)
      }
      return
    }
  }
}

export async function handleStoryMention(
  mentionerId: string,
  mentionerUsername: string | undefined,
): Promise<void> {
  const db = await createClient()

  const { data: trigger } = await db
    .from('instagram_triggers')
    .select('*')
    .eq('type', 'story_mention')
    .eq('active', true)
    .single()

  if (!trigger) return
  await sendAndLog(db, mentionerId, mentionerUsername, trigger, 'story_mention', '@mention')
}

async function sendAndLog(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  username: string | undefined,
  trigger: Trigger,
  triggerType: string,
  triggerText: string,
): Promise<void> {
  const result = await sendInstagramDM(userId, trigger.response_message)

  await db.from('instagram_dm_logs').insert({
    trigger_id: trigger.id,
    instagram_user_id: userId,
    username: username || null,
    trigger_type: triggerType,
    trigger_text: triggerText,
    response_sent: trigger.response_message,
    success: result.ok,
    error_msg: result.error || null,
  })

  if (result.ok) {
    await db
      .from('instagram_triggers')
      .update({ sent_count: (trigger.sent_count || 0) + 1 })
      .eq('id', trigger.id)
  }
}
