import { Resend } from 'resend'
import { getSetting } from '@/lib/settings'

export async function sendProposalEmail(params: {
  to: string
  client_name: string
  subject: string
  body: string
}) {
  const [apiKey, from, company] = await Promise.all([
    getSetting('RESEND_API_KEY'),
    getSetting('RESEND_FROM_EMAIL'),
    getSetting('COMPANY_NAME'),
  ])

  const resend = new Resend(apiKey)

  return resend.emails.send({
    from: `${company} <${from}>`,
    to: params.to,
    subject: params.subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <p style="color:#374151;line-height:1.7;font-size:15px">${params.body.replace(/\n/g, '<br>')}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:11px">Para no recibir más emails, respondé con "NO GRACIAS".</p>
      </div>
    `,
  })
}

export async function sendInternalAlert(subject: string, message: string) {
  const [apiKey, from, adminEmail, company] = await Promise.all([
    getSetting('RESEND_API_KEY'),
    getSetting('RESEND_FROM_EMAIL'),
    getSetting('ADMIN_EMAIL'),
    getSetting('COMPANY_NAME'),
  ])

  const resend = new Resend(apiKey)

  return resend.emails.send({
    from: `${company} <${from}>`,
    to: adminEmail,
    subject: `🔔 ${subject}`,
    html: `<div style="font-family:Arial,sans-serif;padding:20px"><p>${message}</p></div>`,
  })
}
