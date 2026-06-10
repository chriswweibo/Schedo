import nodemailer from 'nodemailer'

function getTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const FROM = `Schedo <${process.env.GMAIL_USER ?? 'noreply@schedo.app'}>`

interface BookingEmailParams {
  guestEmail: string
  guestName: string
  providerName: string
  providerEmail?: string
  date: string
  startTime: string
  endTime: string
  profession: string
  manageToken?: string
}

function manageLink(token?: string): string {
  if (!token) return ''
  return `<p><a href="${process.env.NEXTAUTH_URL}/booking/manage/${token}">Need to change something? Manage your booking</a></p>`
}

export async function sendInstantConfirmation(p: BookingEmailParams) {
  const transport = getTransport()
  if (!transport) return
  await Promise.all([
    transport.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking confirmed with ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> (${p.profession}) is confirmed.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLink(p.manageToken)}
<p>— Schedo</p>`,
    }),
    p.providerEmail &&
      transport.sendMail({
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
  const transport = getTransport()
  if (!transport) return
  await Promise.all([
    transport.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking request sent to ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking request with <strong>${p.providerName}</strong> (${p.profession}) has been sent.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLink(p.manageToken)}
<p>We'll let you know once they confirm. — Schedo</p>`,
    }),
    p.providerEmail &&
      transport.sendMail({
        from: FROM,
        to: p.providerEmail,
        subject: `New booking request from ${p.guestName}`,
        html: `<p>You have a new booking request from <strong>${p.guestName}</strong>.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p><a href="${process.env.NEXTAUTH_URL}/dashboard">Accept or decline in your dashboard</a>.</p>`,
      }),
  ])
}

export async function sendRequestAccepted(p: BookingEmailParams) {
  const transport = getTransport()
  if (!transport) return
  await Promise.all([
    transport.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: `Booking confirmed — ${p.providerName} accepted your request`,
      html: `<p>Hi ${p.guestName},</p>
<p>Great news! <strong>${p.providerName}</strong> has confirmed your booking.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLink(p.manageToken)}
<p>— Schedo</p>`,
    }),
    p.providerEmail &&
      transport.sendMail({
        from: FROM,
        to: p.providerEmail,
        subject: `Booking confirmed with ${p.guestName}`,
        html: `<p>You confirmed a booking with <strong>${p.guestName}</strong>.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>View it in your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>.</p>`,
      }),
  ])
}

export async function sendRequestDeclined(p: {
  guestEmail: string
  guestName: string
  providerName: string
  date: string
}) {
  const transport = getTransport()
  if (!transport) return
  await transport.sendMail({
    from: FROM,
    to: p.guestEmail,
    subject: `Booking request declined`,
    html: `<p>Hi ${p.guestName},</p>
<p>Unfortunately, <strong>${p.providerName}</strong> is unable to take your booking for ${p.date}.</p>
<p><a href="${process.env.NEXTAUTH_URL}/search">Search for another provider</a>. — Schedo</p>`,
  })
}

export async function sendBookingCancelledByGuest(p: {
  providerEmail?: string
  guestName: string
  date: string
  startTime: string
  endTime: string
}) {
  const transport = getTransport()
  if (!transport || !p.providerEmail) return
  await transport.sendMail({
    from: FROM,
    to: p.providerEmail,
    subject: `Booking cancelled by ${p.guestName}`,
    html: `<p><strong>${p.guestName}</strong> cancelled their booking.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>The slot is now free. — Schedo</p>`,
  })
}

export async function sendBookingRescheduledByGuest(p: BookingEmailParams & { pending: boolean }) {
  const transport = getTransport()
  if (!transport) return
  await Promise.all([
    transport.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: p.pending
        ? `Reschedule request sent to ${p.providerName}`
        : `Booking rescheduled — ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> has been moved to:</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${p.pending ? '<p>This new time is pending the provider\'s approval.</p>' : ''}
${manageLink(p.manageToken)}
<p>— Schedo</p>`,
    }),
    p.providerEmail &&
      transport.sendMail({
        from: FROM,
        to: p.providerEmail,
        subject: `${p.guestName} rescheduled their booking`,
        html: `<p><strong>${p.guestName}</strong> moved their booking to:</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${p.pending ? `<p><a href="${process.env.NEXTAUTH_URL}/dashboard">Accept or decline in your dashboard</a>.</p>` : '<p>View it in your <a href="' + process.env.NEXTAUTH_URL + '/dashboard">dashboard</a>.</p>'}`,
      }),
  ])
}

export async function sendBookingDetailsUpdatedByGuest(p: {
  providerEmail?: string
  guestName: string
  date: string
  startTime: string
  endTime: string
}) {
  const transport = getTransport()
  if (!transport || !p.providerEmail) return
  await transport.sendMail({
    from: FROM,
    to: p.providerEmail,
    subject: `${p.guestName} updated their booking details`,
    html: `<p><strong>${p.guestName}</strong> updated their contact details / notes for the booking on ${p.date} at ${p.startTime} – ${p.endTime}.</p>
<p>View it in your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>. — Schedo</p>`,
  })
}
