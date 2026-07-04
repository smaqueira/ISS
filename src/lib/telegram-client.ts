import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { createClient } from '@/lib/supabase/server'

let _client: TelegramClient | null = null

function creds() {
  return {
    apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
    apiHash: process.env.TELEGRAM_API_HASH || '',
  }
}

export async function getConnectedClient(): Promise<TelegramClient | null> {
  const { apiId, apiHash } = creds()
  if (!apiId || !apiHash) return null

  if (_client) {
    try {
      if (await _client.checkAuthorization()) return _client
    } catch { /* fall through */ }
    _client = null
  }

  const db = await createClient()
  const { data } = await db.from('settings').select('value').eq('key', 'TELEGRAM_SESSION').single()
  const sessionStr = data?.value || ''
  if (!sessionStr) return null

  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, { connectionRetries: 3 })
  await client.connect()
  if (!await client.checkAuthorization()) return null

  _client = client
  return client
}

export async function freshClient(sessionStr = ''): Promise<TelegramClient> {
  const { apiId, apiHash } = creds()
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, { connectionRetries: 3 })
  await client.connect()
  return client
}

export async function saveSession(client: TelegramClient) {
  const sessionStr = (client.session as StringSession).save()
  const db = await createClient()
  await db.from('settings').upsert({ key: 'TELEGRAM_SESSION', value: sessionStr })
  _client = client
}

export async function clearSession() {
  const db = await createClient()
  await Promise.all([
    db.from('settings').delete().eq('key', 'TELEGRAM_SESSION'),
    db.from('settings').delete().eq('key', 'TELEGRAM_PHONE_HASH'),
    db.from('settings').delete().eq('key', 'TELEGRAM_PHONE'),
  ])
  if (_client) {
    try { await _client.disconnect() } catch { /* ignore */ }
    _client = null
  }
}
