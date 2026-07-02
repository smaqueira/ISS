import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL || 'ventas@tudominio.com'
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Intelligent Sales System'

export async function sendProposalEmail(params: {
  to: string
  client_name: string
  subject: string
  body: string
}) {
  return resend.emails.send({
    from: `${COMPANY} <${FROM}>`,
    to: params.to,
    subject: params.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="color: #374151; line-height: 1.6;">${params.body.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          Para no recibir más emails, respondé con "NO GRACIAS".
        </p>
      </div>
    `,
  })
}

export async function sendFollowUpEmail(params: {
  to: string
  client_name: string
  subject: string
  body: string
  followup_number: number
}) {
  return resend.emails.send({
    from: `${COMPANY} <${FROM}>`,
    to: params.to,
    subject: params.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="color: #374151; line-height: 1.6;">${params.body.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          Para no recibir más emails, respondé con "NO GRACIAS".
        </p>
      </div>
    `,
  })
}

export async function sendInternalAlert(params: {
  subject: string
  message: string
  client_name: string
  score?: number
}) {
  const adminEmail = process.env.ADMIN_EMAIL || FROM
  return resend.emails.send({
    from: `Sistema <${FROM}>`,
    to: adminEmail,
    subject: `🔔 ${params.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">Alerta del Sistema</h2>
        <p><strong>Cliente:</strong> ${params.client_name}</p>
        ${params.score ? `<p><strong>Score:</strong> ${params.score}/100</p>` : ''}
        <p style="color: #374151;">${params.message}</p>
      </div>
    `,
  })
}
