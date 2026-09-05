/**
 * Events are edited as real dates but rendered by the public site as a little
 * fudge-square date chip built from two display strings (`month` = 'Jun',
 * `day` = '20-21'). Rather than make the client hand-type those, the editor
 * collects ISO dates and these helpers derive the chip on write -- so a record
 * written here drops straight into src/components/Events.jsx unchanged.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Parse 'YYYY-MM-DD' into a LOCAL midnight Date.
 *
 * `new Date('2027-06-20')` parses as UTC midnight, which is the previous day in
 * every negative-offset timezone -- the classic off-by-one that makes an event
 * show up a day early in California. Splitting the parts avoids it entirely.
 */
export function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Today at local midnight, so same-day events still count as upcoming. */
export function todayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Derive the site's `{ month, day }` date chip from a start/end pair.
 *
 *   Jun 20 only            -> { month: 'Jun', day: '20' }
 *   Jun 20 to Jun 21       -> { month: 'Jun', day: '20-21' }   (en dash)
 *   Jun 30 to Jul 2        -> { month: 'Jun', day: '30-Jul 2' }
 */
export function toDateChip(startISO, endISO) {
  const start = parseISO(startISO)
  if (!start) return { month: '', day: '' }

  const month = MONTHS[start.getMonth()]
  const end = parseISO(endISO)

  if (!end || end.getTime() <= start.getTime()) {
    return { month, day: String(start.getDate()) }
  }
  if (end.getMonth() === start.getMonth() && end.getFullYear() === start.getFullYear()) {
    return { month, day: `${start.getDate()}\u2013${end.getDate()}` }
  }
  return { month, day: `${start.getDate()}\u2013${MONTHS[end.getMonth()]} ${end.getDate()}` }
}

/** True once the event's last day has fully passed. */
export function isPast(event) {
  const last = parseISO(event.endDate) || parseISO(event.startDate)
  return last ? last.getTime() < todayStart().getTime() : false
}

/** 'Sat, Jun 20 - Sun, Jun 21, 2027' for the admin list, which has room for it. */
export function formatRange(startISO, endISO) {
  const start = parseISO(startISO)
  if (!start) return 'No date set'

  const opts = { weekday: 'short', month: 'short', day: 'numeric' }
  const end = parseISO(endISO)
  const startText = start.toLocaleDateString('en-US', opts)

  if (!end || end.getTime() <= start.getTime()) {
    return `${startText}, ${start.getFullYear()}`
  }
  const endText = end.toLocaleDateString('en-US', opts)
  return `${startText} \u2013 ${endText}, ${end.getFullYear()}`
}

/** Plain-language distance, e.g. 'in 12 days' / 'today' / '3 weeks ago'. */
export function relativeDay(startISO) {
  const start = parseISO(startISO)
  if (!start) return ''
  const days = Math.round((start.getTime() - todayStart().getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0) {
    if (days < 14) return `in ${days} days`
    if (days < 60) return `in ${Math.round(days / 7)} weeks`
    return `in ${Math.round(days / 30)} months`
  }
  const ago = Math.abs(days)
  if (ago < 14) return `${ago} days ago`
  if (ago < 60) return `${Math.round(ago / 7)} weeks ago`
  return `${Math.round(ago / 30)} months ago`
}

/** Soonest first; undated records sink to the bottom. */
export function byDate(a, b) {
  const at = parseISO(a.startDate)?.getTime() ?? Infinity
  const bt = parseISO(b.startDate)?.getTime() ?? Infinity
  return at - bt
}
