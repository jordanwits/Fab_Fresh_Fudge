import { useReveal } from '../hooks/useReveal.js'
import { EVENTS } from '../data/site.js'

export default function Events() {
  const ref = useReveal()

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

        <ol className="event-list">
          {EVENTS.map((e, i) => (
            <li className="event-row" key={e.name} data-reveal style={{ '--stagger': `${i * 60}ms` }}>
              <div className="event-date" aria-hidden="true">
                <span className="event-month">{e.month}</span>
                <span className="event-day">{e.day}</span>
              </div>
              <div className="event-info">
                <h3>{e.name}</h3>
                <p className="event-place">{e.place}</p>
                <p className="event-detail">{e.detail}</p>
              </div>
              <span className="event-tag">Free samples</span>
            </li>
          ))}
        </ol>

        <p className="events-note" data-reveal>
          Booking us for your festival or market?{' '}
          <a href="mailto:hello@fabfreshfudge.com?subject=Event%20inquiry">
            Get in touch
          </a>
          .
        </p>
      </div>
    </section>
  )
}
