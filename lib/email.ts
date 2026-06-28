import { Resend } from 'resend'

// Sender shown to recipients. Must be on a domain verified in Resend
// (e.g. schedo.me). Override with MAIL_FROM.
const FROM = process.env.MAIL_FROM || 'Schedo <contact@schedo.me>'

// Where replies go.
const REPLY_TO = process.env.MAIL_REPLY_TO || 'contact@schedo.me'

// Transactional email via Resend. Requires RESEND_API_KEY and a verified
// sending domain. If the key is unset, sending is a silent no-op (so local/dev
// without creds doesn't error).
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

async function send(opts: { to: string; subject: string; html: string }) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
}

interface BookingEmailParams {
  guestEmail: string
  guestName: string
  providerName: string
  providerEmail?: string
  date: string
  startTime: string
  endTime: string
  profession: string
  /** Tokenized self-service link for the guest to view/cancel/reschedule. */
  manageUrl?: string
}

const manageLine = (url?: string) =>
  url ? `<p><a href="${url}">Manage, reschedule, or cancel your booking</a></p>` : ''

export async function sendInstantConfirmation(p: BookingEmailParams) {
  await Promise.all([
    send({
      to: p.guestEmail,
      subject: `Booking confirmed with ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> (${p.profession}) is confirmed.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLine(p.manageUrl)}
<p>— Schedo</p>`,
    }),
    p.providerEmail
      ? send({
          to: p.providerEmail,
          subject: `New booking from ${p.guestName}`,
          html: `<p>You have a new confirmed booking from <strong>${p.guestName}</strong>.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>View it in your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>.</p>`,
        })
      : Promise.resolve(),
  ])
}

export async function sendRequestSubmitted(p: BookingEmailParams) {
  await Promise.all([
    send({
      to: p.guestEmail,
      subject: `Booking request sent to ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking request with <strong>${p.providerName}</strong> (${p.profession}) has been sent.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLine(p.manageUrl)}
<p>We'll let you know once they confirm. — Schedo</p>`,
    }),
    p.providerEmail
      ? send({
          to: p.providerEmail,
          subject: `New booking request from ${p.guestName}`,
          html: `<p>You have a new booking request from <strong>${p.guestName}</strong>.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p><a href="${process.env.NEXTAUTH_URL}/dashboard">Accept or decline in your dashboard</a>.</p>`,
        })
      : Promise.resolve(),
  ])
}

export async function sendRequestAccepted(p: Omit<BookingEmailParams, 'providerEmail'>) {
  await send({
    to: p.guestEmail,
    subject: `Booking confirmed — ${p.providerName} accepted your request`,
    html: `<p>Hi ${p.guestName},</p>
<p>Great news! <strong>${p.providerName}</strong> has confirmed your booking.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLine(p.manageUrl)}
<p>— Schedo</p>`,
  })
}

export async function sendRequestDeclined(p: {
  guestEmail: string
  guestName: string
  providerName: string
  date: string
}) {
  await send({
    to: p.guestEmail,
    subject: `Booking request declined`,
    html: `<p>Hi ${p.guestName},</p>
<p>Unfortunately, <strong>${p.providerName}</strong> is unable to take your booking for ${p.date}.</p>
<p><a href="${process.env.NEXTAUTH_URL}/search">Search for another provider</a>. — Schedo</p>`,
  })
}

export async function sendProviderBookingCancelled(p: {
  providerEmail: string
  guestName: string
  date: string
  startTime: string
  endTime: string
}) {
  await send({
    to: p.providerEmail,
    subject: `Booking cancelled by ${p.guestName}`,
    html: `<p><strong>${p.guestName}</strong> cancelled their booking.</p>
<p><strong>Was:</strong> ${p.date} · ${p.startTime}–${p.endTime}</p>
<p>That slot is now free again. View your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>.</p>`,
  })
}

export async function sendProviderBookingRescheduled(p: {
  providerEmail: string
  guestName: string
  date: string
  startTime: string
  endTime: string
}) {
  await send({
    to: p.providerEmail,
    subject: `Booking rescheduled by ${p.guestName}`,
    html: `<p><strong>${p.guestName}</strong> rescheduled their booking.</p>
<p><strong>New time:</strong> ${p.date} · ${p.startTime}–${p.endTime}</p>
<p>View it in your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>.</p>`,
  })
}

export async function sendBookingCancelled(p: {
  guestEmail: string
  guestName: string
  providerName: string
  date: string
}) {
  await send({
    to: p.guestEmail,
    subject: `Booking cancelled — ${p.providerName}`,
    html: `<p>Hi ${p.guestName},</p>
<p>We're sorry — <strong>${p.providerName}</strong> has had to cancel your confirmed booking on ${p.date}.</p>
<p><a href="${process.env.NEXTAUTH_URL}/search">Find another provider</a>. — Schedo</p>`,
  })
}
