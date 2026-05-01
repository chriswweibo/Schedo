import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.RESEND_FROM ?? 'Schedo <noreply@schedo.app>'

interface BookingEmailParams {
  guestEmail: string
  guestName: string
  providerName: string
  providerEmail?: string
  date: string
  startTime: string
  endTime: string
  profession: string
}

export async function sendInstantConfirmation(p: BookingEmailParams) {
  const resend = getResend()
  if (!resend) return
  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking confirmed with ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> (${p.profession}) is confirmed.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>— Schedo</p>`,
    }),
    p.providerEmail &&
      resend.emails.send({
        from: FROM,
        to: p.providerEmail,
        subject: `New booking from ${p.guestName}`,
        html: `<p>You have a new confirmed booking from <strong>${p.guestName}</strong>.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>View it in your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>.</p>`,
      }),
  ])
}

export async function sendRequestSubmitted(p: BookingEmailParams) {
  const resend = getResend()
  if (!resend) return
  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking request sent to ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking request with <strong>${p.providerName}</strong> (${p.profession}) has been sent.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>We'll let you know once they confirm. — Schedo</p>`,
    }),
    p.providerEmail &&
      resend.emails.send({
        from: FROM,
        to: p.providerEmail,
        subject: `New booking request from ${p.guestName}`,
        html: `<p>You have a new booking request from <strong>${p.guestName}</strong>.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p><a href="${process.env.NEXTAUTH_URL}/dashboard">Accept or decline in your dashboard</a>.</p>`,
      }),
  ])
}

export async function sendRequestAccepted(p: Omit<BookingEmailParams, 'providerEmail'>) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to: p.guestEmail,
    subject: `Booking confirmed — ${p.providerName} accepted your request`,
    html: `<p>Hi ${p.guestName},</p>
<p>Great news! <strong>${p.providerName}</strong> has confirmed your booking.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>— Schedo</p>`,
  })
}

export async function sendRequestDeclined(p: {
  guestEmail: string
  guestName: string
  providerName: string
  date: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to: p.guestEmail,
    subject: `Booking request declined`,
    html: `<p>Hi ${p.guestName},</p>
<p>Unfortunately, <strong>${p.providerName}</strong> is unable to take your booking for ${p.date}.</p>
<p><a href="${process.env.NEXTAUTH_URL}/search">Search for another provider</a>. — Schedo</p>`,
  })
}
