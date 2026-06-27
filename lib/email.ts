import nodemailer from 'nodemailer'

// Transactional email via Gmail SMTP (nodemailer). Requires GMAIL_USER +
// GMAIL_APP_PASSWORD (a 16-char Google App Password). If either is unset,
// email sending is a silent no-op (so local/dev without creds doesn't error).
function getTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

const FROM = process.env.GMAIL_USER ? `Schedo <${process.env.GMAIL_USER}>` : 'Schedo'

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
  const tx = getTransport()
  if (!tx) return
  await Promise.all([
    tx.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking confirmed with ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> (${p.profession}) is confirmed.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>— Schedo</p>`,
    }),
    p.providerEmail
      ? tx.sendMail({
          from: FROM,
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
  const tx = getTransport()
  if (!tx) return
  await Promise.all([
    tx.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking request sent to ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking request with <strong>${p.providerName}</strong> (${p.profession}) has been sent.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>We'll let you know once they confirm. — Schedo</p>`,
    }),
    p.providerEmail
      ? tx.sendMail({
          from: FROM,
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
  const tx = getTransport()
  if (!tx) return
  await tx.sendMail({
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
  const tx = getTransport()
  if (!tx) return
  await tx.sendMail({
    from: FROM,
    to: p.guestEmail,
    subject: `Booking request declined`,
    html: `<p>Hi ${p.guestName},</p>
<p>Unfortunately, <strong>${p.providerName}</strong> is unable to take your booking for ${p.date}.</p>
<p><a href="${process.env.NEXTAUTH_URL}/search">Search for another provider</a>. — Schedo</p>`,
  })
}

export async function sendBookingCancelled(p: {
  guestEmail: string
  guestName: string
  providerName: string
  date: string
}) {
  const tx = getTransport()
  if (!tx) return
  await tx.sendMail({
    from: FROM,
    to: p.guestEmail,
    subject: `Booking cancelled — ${p.providerName}`,
    html: `<p>Hi ${p.guestName},</p>
<p>We're sorry — <strong>${p.providerName}</strong> has had to cancel your confirmed booking on ${p.date}.</p>
<p><a href="${process.env.NEXTAUTH_URL}/search">Find another provider</a>. — Schedo</p>`,
  })
}
