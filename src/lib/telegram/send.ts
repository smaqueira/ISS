import { getSetting } from '@/lib/settings'

interface InlineButton {
  text: string
  callback_data: string
}

async function getConfig() {
  const [token, chatId] = await Promise.all([
    getSetting('TELEGRAM_BOT_TOKEN'),
    getSetting('TELEGRAM_CHAT_ID'),
  ])
  return { token, chatId }
}

async function tgPost(token: string, method: string, body: object) {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function sendMessage(text: string, chatId?: string, buttons?: InlineButton[][]) {
  const config = await getConfig()
  const id = chatId || config.chatId
  if (!config.token || !id) return
  const payload: Record<string, unknown> = { chat_id: id, text, parse_mode: 'Markdown' }
  if (buttons) payload.reply_markup = { inline_keyboard: buttons }
  await tgPost(config.token, 'sendMessage', payload)
}

export async function answerCallback(token: string, callbackQueryId: string, text?: string) {
  await tgPost(token, 'answerCallbackQuery', { callback_query_id: callbackQueryId, text })
}

export async function sendAlert(text: string) {
  return sendMessage(`⚡️ ${text}`)
}
