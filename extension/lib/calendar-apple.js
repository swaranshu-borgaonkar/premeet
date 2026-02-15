// ─── Apple Calendar (CalDAV) Integration ──────────────────
// Enterprise tier only. Uses CalDAV protocol to fetch events
// from Apple Calendar / iCloud Calendar.
//
// CalDAV is a standard protocol (RFC 4791) that uses HTTP/WebDAV
// with XML payloads to access calendar data.

/**
 * Fetch events from Apple Calendar via CalDAV.
 * Requires stored CalDAV credentials (username + app-specific password).
 */
export async function fetchAppleCalendarEvents(credentials, timeMin, timeMax) {
  const { serverUrl, username, password } = credentials;

  // CalDAV REPORT request for calendar events in time range
  const calendarQuery = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${formatCalDAVDate(timeMin)}" end="${formatCalDAVDate(timeMax)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

  const response = await fetch(serverUrl, {
    method: 'REPORT',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Authorization: 'Basic ' + btoa(`${username}:${password}`),
      Depth: '1',
    },
    body: calendarQuery,
  });

  if (!response.ok) {
    throw new Error(`CalDAV error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseCalDAVResponse(xml);
}

/**
 * Parse CalDAV multi-status XML response into normalized events.
 */
function parseCalDAVResponse(xml) {
  const events = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const responses = doc.querySelectorAll('response');

  for (const resp of responses) {
    const calData = resp.querySelector('calendar-data');
    if (!calData?.textContent) continue;

    const icalText = calData.textContent;
    const event = parseICalEvent(icalText);
    if (event) events.push(event);
  }

  return events;
}

/**
 * Parse a single iCalendar VEVENT into normalized event format.
 */
function parseICalEvent(icalText) {
  const lines = icalText.split(/\r?\n/);
  const event = {
    provider: 'apple',
    id: '',
    title: '',
    start: '',
    end: '',
    attendees: [],
    location: '',
    isAllDay: false,
  };

  let inEvent = false;
  let inAttendee = false;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; continue; }
    if (line === 'END:VEVENT') { inEvent = false; continue; }
    if (!inEvent) continue;

    if (line.startsWith('UID:')) {
      event.id = line.substring(4);
    } else if (line.startsWith('SUMMARY:')) {
      event.title = line.substring(8);
    } else if (line.startsWith('DTSTART')) {
      const val = extractICalValue(line);
      event.start = parseICalDate(val);
      if (line.includes('VALUE=DATE:')) event.isAllDay = true;
    } else if (line.startsWith('DTEND')) {
      const val = extractICalValue(line);
      event.end = parseICalDate(val);
    } else if (line.startsWith('LOCATION:')) {
      event.location = line.substring(9);
    } else if (line.startsWith('ATTENDEE')) {
      const email = extractAttendeeEmail(line);
      if (email) event.attendees.push({ email });
    }
  }

  if (!event.id || !event.start) return null;
  return event;
}

function extractICalValue(line) {
  const colonIndex = line.indexOf(':');
  return colonIndex >= 0 ? line.substring(colonIndex + 1) : '';
}

function extractAttendeeEmail(line) {
  const mailtoMatch = line.match(/mailto:([^\s;]+)/i);
  return mailtoMatch ? mailtoMatch[1] : null;
}

function parseICalDate(dateStr) {
  // Handle format: 20260214T093000Z or 20260214
  if (dateStr.length === 8) {
    // Date only
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T00:00:00.000Z`;
  }

  const cleaned = dateStr.replace(/[^0-9TZ]/g, '');
  if (cleaned.length >= 15) {
    const y = cleaned.substring(0, 4);
    const m = cleaned.substring(4, 6);
    const d = cleaned.substring(6, 8);
    const h = cleaned.substring(9, 11);
    const min = cleaned.substring(11, 13);
    const s = cleaned.substring(13, 15);
    const tz = cleaned.endsWith('Z') ? 'Z' : '';
    return `${y}-${m}-${d}T${h}:${min}:${s}${tz}`;
  }

  return dateStr;
}

function formatCalDAVDate(isoDate) {
  // Convert ISO 8601 to CalDAV format: 20260214T000000Z
  return new Date(isoDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Discover CalDAV calendar URLs for an Apple ID.
 * Uses well-known CalDAV endpoint.
 */
export async function discoverAppleCalendars(username, password) {
  const wellKnownUrl = 'https://caldav.icloud.com/.well-known/caldav';

  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`;

  const response = await fetch(wellKnownUrl, {
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Authorization: 'Basic ' + btoa(`${username}:${password}`),
      Depth: '1',
    },
    body: propfindBody,
  });

  if (!response.ok) {
    throw new Error(`CalDAV discovery failed: ${response.status}`);
  }

  const xml = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const calendars = [];
  const responses = doc.querySelectorAll('response');

  for (const resp of responses) {
    const href = resp.querySelector('href')?.textContent;
    const name = resp.querySelector('displayname')?.textContent;
    const resourceType = resp.querySelector('resourcetype');
    const isCalendar = resourceType?.querySelector('calendar');

    if (href && isCalendar) {
      calendars.push({ url: href, name: name || 'Untitled Calendar' });
    }
  }

  return calendars;
}
