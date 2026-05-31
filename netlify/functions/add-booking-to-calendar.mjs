const redirect = (location, statusCode = 302) => ({
  statusCode,
  headers: {
    Location: location,
    'Cache-Control': 'no-store',
  },
  body: '',
});

const getParam = (params, key) => String(params.get(key) || '').trim();

const formatGoogleDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export const handler = async (event) => {
  const origin = event.headers.origin || `https://${event.headers.host}`;
  const params = new URLSearchParams(event.rawQuery || '');
  const meetingDate = getParam(params, 'meeting_date');
  const meetingTime = getParam(params, 'meeting_time');

  if (!meetingDate || !meetingTime) {
    return redirect(new URL('/book-a-meeting', origin).toString());
  }

  const meetingDuration = Number.parseInt(getParam(params, 'meeting_duration'), 10) || 30;
  const timezone = getParam(params, 'timezone');
  const name = getParam(params, 'name');
  const email = getParam(params, 'email');
  const company = getParam(params, 'company');
  const context = getParam(params, 'context');
  const meetLink = process.env.BOOKING_MEET_LINK || '';
  const hostEmail = process.env.BOOKING_HOST_EMAIL || '';
  const startDate = new Date(`${meetingDate}T${meetingTime}:00`);
  const endDate = new Date(startDate.getTime() + meetingDuration * 60 * 1000);

  const details = [
    'Strategy call with Cited Stories.',
    meetLink ? `Join: ${meetLink}` : '',
    '',
    `Name: ${name || 'Not provided'}`,
    `Company: ${company || 'Not provided'}`,
    `Email: ${email || 'Not provided'}`,
    context ? `Context: ${context}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const calendarParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Strategy call with Cited Stories',
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details,
    location: meetLink || 'Google Meet link to follow',
  });

  if (timezone) {
    calendarParams.set('ctz', timezone);
  }

  if (hostEmail) {
    calendarParams.set('add', hostEmail);
  }

  return redirect(`https://calendar.google.com/calendar/render?${calendarParams.toString()}`);
};
