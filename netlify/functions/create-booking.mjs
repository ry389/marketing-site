const CONFIRMATION_PATH = '/booking-confirmed';

const redirect = (location, statusCode = 303) => ({
  statusCode,
  headers: {
    Location: location,
    'Cache-Control': 'no-store',
  },
  body: '',
});

const json = (body, statusCode = 200) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

const getField = (formData, key) => String(formData.get(key) || '').trim();

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const escapeIcsText = (value = '') =>
  String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n');

const formatIcsDate = (date = new Date()) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const formatLocalIcsDateTime = ({ date, time, durationMinutes = 0 }) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes + durationMinutes, 0);
  const pad = (value) => String(value).padStart(2, '0');

  return `${localDate.getFullYear()}${pad(localDate.getMonth() + 1)}${pad(localDate.getDate())}T${pad(
    localDate.getHours()
  )}${pad(localDate.getMinutes())}00`;
};

const getConfirmationUrl = (event, fields) => {
  const origin = event.headers.origin || `https://${event.headers.host}`;
  const url = new URL(CONFIRMATION_PATH, origin);

  Object.entries(fields).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}`;
};

const getMailtoUrl = ({ to, subject, body }) => {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const getActionLinks = ({ booking, hostEmail }) => {
  const meetingDetails = `${booking.meeting_date_label || booking.meeting_date} at ${
    booking.meeting_time_label || booking.meeting_time
  }${booking.timezone ? ` (${booking.timezone.replaceAll('_', ' ')})` : ''}`;

  return {
    cancel: getMailtoUrl({
      to: hostEmail,
      subject: 'Cancel discovery call',
      body: `Hi Ryan,\n\nI can no longer make our discovery call booked for ${meetingDetails}.\n\nName: ${
        booking.name || ''
      }\nCompany: ${booking.company || ''}\nEmail: ${booking.email || ''}`,
    }),
    reschedule: getMailtoUrl({
      to: hostEmail,
      subject: 'Propose a new discovery call time',
      body: `Hi Ryan,\n\nI need to propose a new time for our discovery call currently booked for ${meetingDetails}.\n\nSuggested times:\n1. \n2. \n3. \n\nName: ${
        booking.name || ''
      }\nCompany: ${booking.company || ''}\nEmail: ${booking.email || ''}`,
    }),
  };
};

const getInvite = ({ booking, hostEmail, meetLink }) => {
  const duration = Number.parseInt(booking.meeting_duration, 10) || 30;
  const timezone = booking.timezone || 'UTC';
  const start = formatLocalIcsDateTime({ date: booking.meeting_date, time: booking.meeting_time });
  const end = formatLocalIcsDateTime({ date: booking.meeting_date, time: booking.meeting_time, durationMinutes: duration });
  const uid = `booking-${booking.meeting_date}-${booking.meeting_time}-${Date.now()}@citedstories.com`;
  const actionLinks = hostEmail ? getActionLinks({ booking, hostEmail }) : {};
  const description = [
    'Discovery call with Cited Stories.',
    meetLink ? `Join: ${meetLink}` : '',
    actionLinks.cancel ? `Cancel: ${actionLinks.cancel}` : '',
    actionLinks.reschedule ? `Propose a new time: ${actionLinks.reschedule}` : '',
    '',
    `Name: ${booking.name || 'Not provided'}`,
    `Company: ${booking.company || 'Not provided'}`,
    `Email: ${booking.email || 'Not provided'}`,
    booking.context ? `Context: ${booking.context}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const attendees = [booking.email, hostEmail]
    .filter(Boolean)
    .map(
      (email) =>
        `ATTENDEE;CN=${escapeIcsText(email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`
    );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cited Stories//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate()}`,
    `DTSTART;TZID=${timezone}:${start}`,
    `DTEND;TZID=${timezone}:${end}`,
    'SUMMARY:Discovery call with Cited Stories',
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(meetLink || 'Google Meet link to follow')}`,
    hostEmail ? `ORGANIZER;CN=Cited Stories:mailto:${hostEmail}` : '',
    ...attendees,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return {
    description,
    ics: `${lines.join('\r\n')}\r\n`,
  };
};

const sendResendEmail = async ({ resendApiKey, payload }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend invite email failed: ${response.status} ${errorText}`);
  }
};

const sendBookingInvite = async ({ booking, hostEmail, meetLink }) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BOOKING_FROM_EMAIL;

  if (!resendApiKey || !fromEmail || !hostEmail || !meetLink || !booking.email) {
    console.error('Booking invite email missing configuration', {
      resendConfigured: Boolean(resendApiKey),
      fromEmailConfigured: Boolean(fromEmail),
      hostEmailConfigured: Boolean(hostEmail),
      meetLinkConfigured: Boolean(meetLink),
      bookerEmailConfigured: Boolean(booking.email),
    });
    throw new Error('Booking invite email is not fully configured.');
  }

  const fromAddress = `Cited Stories <${fromEmail}>`;
  const invite = getInvite({ booking, hostEmail, meetLink });
  const safeName = escapeHtml(booking.name || 'there');
  const safeCompany = escapeHtml(booking.company || 'Not provided');
  const safeBookerEmail = escapeHtml(booking.email);
  const safeContext = escapeHtml(booking.context || 'Not provided');
  const safeDate = escapeHtml(booking.meeting_date_label || booking.meeting_date);
  const safeTime = escapeHtml(booking.meeting_time_label || booking.meeting_time);
  const safeTimezone = escapeHtml((booking.timezone || '').replaceAll('_', ' '));
  const safeMeetLink = escapeHtml(meetLink);
  const actionLinks = getActionLinks({ booking, hostEmail });
  const safeCancelLink = escapeHtml(actionLinks.cancel);
  const safeRescheduleLink = escapeHtml(actionLinks.reschedule);
  const attachment = {
    filename: 'cited-stories-discovery-call.ics',
    content: Buffer.from(invite.ics).toString('base64'),
  };
  const bookerHtml = `
    <p>Hi ${safeName},</p>
    <p>Your discovery call with Cited Stories is booked for <strong>${safeDate} at ${safeTime}</strong>${
      safeTimezone ? ` (${safeTimezone})` : ''
    }.</p>
    ${meetLink ? `<p><a href="${safeMeetLink}">Join the Google Meet</a></p>` : ''}
    <p>If you can no longer make it, you can <a href="${safeCancelLink}">cancel the meeting</a> or <a href="${safeRescheduleLink}">propose a new time</a>.</p>
    <p>A calendar invite is attached.</p>
    <p>We look forward to meeting with you,<br />Cited Stories</p>
  `;
  const hostHtml = `
    <p>New discovery call booked.</p>
    <p><strong>${safeName}</strong> from <strong>${safeCompany}</strong> booked for <strong>${safeDate} at ${safeTime}</strong>${
      safeTimezone ? ` (${safeTimezone})` : ''
    }.</p>
    <p>Email: <a href="mailto:${safeBookerEmail}">${safeBookerEmail}</a></p>
    <p>Context: ${safeContext}</p>
    ${meetLink ? `<p><a href="${safeMeetLink}">Join the Google Meet</a></p>` : ''}
    <p>A calendar invite is attached.</p>
  `;

  await Promise.all([
    sendResendEmail({
      resendApiKey,
      payload: {
        from: fromAddress,
        to: [booking.email],
        subject: 'Discovery call booked with Cited Stories',
        html: bookerHtml,
        attachments: [attachment],
      },
    }),
    sendResendEmail({
      resendApiKey,
      payload: {
        from: fromAddress,
        to: [hostEmail],
        reply_to: booking.email,
        subject: `Discovery call booked with Cited Stories: ${booking.company || booking.name || booking.email}`,
        html: hostHtml,
        attachments: [attachment],
      },
    }),
  ]);
};

export const handler = async (event) => {
  const wantsJson = event.headers.accept?.includes('application/json');

  if (event.httpMethod !== 'POST') {
    if (wantsJson) return json({ ok: false, error: 'Method not allowed' }, 405);
    return redirect('/book-a-meeting', 303);
  }

  const formData = new URLSearchParams(event.body || '');
  const formStartedAt = Number.parseInt(getField(formData, 'form_started_at'), 10);
  const submittedTooQuickly = Number.isFinite(formStartedAt) && Date.now() - formStartedAt < 2500;
  const honeypot = getField(formData, 'website');

  if (honeypot || submittedTooQuickly) {
    if (wantsJson) return json({ ok: false, error: 'Spam check failed' }, 400);
    return redirect('/book-a-meeting', 303);
  }

  const booking = {
    meeting_type: getField(formData, 'meeting_type') || 'discovery_call',
    meeting_duration: getField(formData, 'meeting_duration') || '30',
    booking_status: 'confirmed',
    meeting_date: getField(formData, 'meeting_date'),
    meeting_date_label: getField(formData, 'meeting_date_label'),
    meeting_time: getField(formData, 'meeting_time'),
    meeting_time_label: getField(formData, 'meeting_time_label'),
    timezone: getField(formData, 'timezone'),
    name: getField(formData, 'name'),
    email: getField(formData, 'email'),
    company: getField(formData, 'company'),
    context: getField(formData, 'context'),
  };

  if (!booking.meeting_date || !booking.meeting_time || !booking.email) {
    if (wantsJson) return json({ ok: false, error: 'Missing booking details' }, 400);
    return redirect('/book-a-meeting', 303);
  }

  const hostEmail = process.env.BOOKING_HOST_EMAIL;
  const meetLink = process.env.BOOKING_MEET_LINK;

  try {
    await sendBookingInvite({ booking, hostEmail, meetLink });
  } catch (error) {
    console.error('Booking invite email failed', error);
    if (wantsJson) {
      return json(
        {
          ok: false,
          error: 'The booking was received, but the calendar invite email could not be sent.',
        },
        502
      );
    }
  }

  console.info('Booking requested', {
    hostEmailConfigured: Boolean(hostEmail),
    meetLinkConfigured: Boolean(meetLink),
    meetingDate: booking.meeting_date,
    meetingTime: booking.meeting_time,
    timezone: booking.timezone,
    company: booking.company,
  });

  const confirmationPath = getConfirmationUrl(event, booking);

  if (wantsJson) {
    return json({ ok: true, confirmationPath });
  }

  return redirect(confirmationPath);
};
