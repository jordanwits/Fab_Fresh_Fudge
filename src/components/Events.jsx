import { useReveal } from '../hooks/useReveal.js'
import { CONTACT, EVENTS } from '../data/site.js'
import { SHOP_TIME_ZONE } from '../data/checkout.js'

/** Today as 'YYYY-MM-DD' on the shop's clock, comparable with the ISO dates. */
const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIME_ZONE }).format(new Date())

export default function Events() {
  const ref = useReveal()
  // EVENTS arrive sorted by date. The site is only republished when something
  // is saved, so a show drops off here on the day after it ends rather than
  // waiting for the next publish. Undated entries stay.
  const today = todayISO()
  const upcoming = EVENTS.filter((e) => {
    const last = e.endDate || e.startDate
    return !last || last >= today
  })

  return (
    <section className="events" id="events" ref={ref}>
      <div className="container">
        <div className="section-head" data-reveal>
          <h2>Upcoming shows</h2>
          <p>
            The fudge tastes best with a paper bag and a sunny afternoon. Come
            say hi, samples are always free.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <p className="events-empty" data-reveal>
            No shows on the calendar right now. New dates go up here first, and on{' '}
            <a href={CONTACT.instagram}>Instagram</a>.
          </p>
        ) : (
          <ol className="event-list">
            {upcoming.map((e, i) => (
              <li className="event-row" key={e.id || e.name} data-reveal style={{ '--stagger': `${i * 60}ms` }}>
                <div className="event-date" aria-hidden="true">
                  <span className="event-month">{e.month}</span>
                  <span className="event-day">{e.day}</span>
                </div>
                <div className="event-info">
                  <h3>{e.name}</h3>
                  <p className="event-place">{e.place}</p>
                  <p className="event-detail">{e.detail}</p>
                </div>
                {e.tag ? <span className="event-tag">{e.tag}</span> : null}
              </li>
            ))}
          </ol>
        )}

        <p className="events-note" data-reveal>
          Booking us for your festival or market?{' '}
          <a href={`mailto:${CONTACT.email}?subject=Event%20inquiry`}>
            Get in touch
          </a>
          .
        </p>
      </div>
    </section>
  )
}
