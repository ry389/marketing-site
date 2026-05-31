const CONFIRMATION_PATH = '/booking-confirmed';

const redirect = (location, statusCode = 303) => ({
  statusCode,
  headers: {
    Location: location,
    'Cache-Control': 'no-store',
  },
  body: '',
});

const getField = (formData, key) => String(formData.get(key) || '').trim();

const getConfirmationUrl = (event, fields) => {
  const origin = event.headers.origin || `https://${event.headers.host}`;
  const url = new URL(CONFIRMATION_PATH, origin);

  Object.entries(fields).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}`;
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return redirect('/book-a-meeting', 303);
  }

  const formData = new URLSearchParams(event.body || '');
  const formStartedAt = Number.parseInt(getField(formData, 'form_started_at'), 10);
  const submittedTooQuickly = Number.isFinite(formStartedAt) && Date.now() - formStartedAt < 2500;
  const honeypot = getField(formData, 'website');

  if (honeypot || submittedTooQuickly) {
    return redirect('/book-a-meeting', 303);
  }

  const booking = {
    meeting_type: getField(formData, 'meeting_type') || 'strategy_call',
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

  const hostEmail = process.env.BOOKING_HOST_EMAIL;

  // Keep host routing server-side. Wire calendar/email provider calls here when the booking backend is added.
  console.info('Booking requested', {
    hostEmailConfigured: Boolean(hostEmail),
    meetingDate: booking.meeting_date,
    meetingTime: booking.meeting_time,
    timezone: booking.timezone,
    company: booking.company,
  });

  return redirect(getConfirmationUrl(event, booking));
};
