import { Resend } from 'resend'

interface QuoteNotification {
  to: string
  companyName: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  serviceType?: string
  message?: string
  timeline?: string
  customFields?: Record<string,string>
  estimatedAmount?: number | null
  sourceUrl?: string
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendQuoteNotification(data: QuoteNotification) {
  const amountLine = data.estimatedAmount
    ? `<p><strong>Estimated Amount:</strong> R${data.estimatedAmount.toLocaleString()}</p>`
    : '<p><em>This quote needs manual pricing — please review and respond to the customer.</em></p>'

  const serviceLine = data.serviceType ? `<p><strong>Service:</strong> ${data.serviceType}</p>` : ''
  const phoneLine = data.customerPhone ? `<p><strong>Phone:</strong> ${data.customerPhone}</p>` : ''
  const messageLine = data.message ? `<p><strong>Message:</strong><br/>${data.message.replace(/\n/g, '<br/>')}</p>` : ''
  const sourceLine = data.sourceUrl ? `<p><strong>Source:</strong> ${data.sourceUrl}</p>` : ''
  const timelineLine = data.timeline ? `<p><strong>Timeline:</strong> ${data.timeline}</p>` : ''
  const customFieldsLines = data.customFields
    ? Object.entries(data.customFields)
        .map(([k,v]) => `<p><strong>${k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}:</strong> ${v}</p>`)
        .join('')
    : ''

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C8963E">New Quote Request</h2>
      <div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:16px 0">
        <p><strong>Customer:</strong> ${data.customerName}</p>
        ${data.customerEmail ? `<p><strong>Email:</strong> <a href="mailto:${data.customerEmail}">${data.customerEmail}</a></p>` : ''}
        ${phoneLine}
        ${serviceLine}
        ${timelineLine}
        ${customFieldsLines}
        ${sourceLine}
        ${amountLine}
        ${messageLine}
      </div>
      <p style="color:#888;font-size:12px;margin-top:24px">
        Sent via QuoteHub — <a href="https://quotehub.co.za">quotehub.co.za</a>
      </p>
    </div>
  `

  if (resend && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'QuoteHub <quotes@brandaisolutions.co.za>',
        to: data.to,
        subject: `New Quote Request — ${data.customerName}`,
        html,
      })
    } catch (error) {
      console.error('Resend email failed:', error)
    }
  } else {
    console.log('[EMAIL STUB] Would send to', data.to)
    console.log('[EMAIL STUB] Subject:', `New Quote Request — ${data.customerName}`)
  }
}
