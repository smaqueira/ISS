import { getSetting } from '@/lib/settings'

async function getConfig() {
  const [token, chatId] = await Promise.all([
    getSetting('TELEGRAM_BOT_TOKEN'),
    getSetting('TELEGRAM_CHAT_ID'),
  ])
  return { token, chatId }
}

export async function sendMessage(text: string, chatId?: string) {
  const config = await getConfig()
  const id = chatId || config.chatId
  if (!config.token || !id) return
  await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: id, text, parse_mode: 'Markdown' }),
  })
}

export async function sendAlert(text: string) {
  return sendMessage(`⚡️ ${text}`)
}
