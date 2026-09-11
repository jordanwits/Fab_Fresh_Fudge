import { useReveal } from '../hooks/useReveal.js'
import { CORPORATE_TIERS, CONTACT } from '../data/site.js'

const GIFT_IMG = '/images/corporate.jpg'

export default function Corporate() {
  const ref = useReveal()

  return (
    <section className="corporate" id="corporate" ref={ref}>
      <div className="container corporate-grid">
        <div className="corporate-copy" data-reveal>
          <h2>Corporate gifts that actually get eaten</h2>
          <p className="corporate-lede">
            Skip the branded water bottle. Send clients and teams a box of
            hand-stirred fudge with your logo on the ribbon. We handle the
            packing, the cards, and the shipping list.
          </p>

          <ul className="tier-list">
            {CORPORATE_TIERS.map((t) => (
              // The admin can edit these now, so two tiers can share a name
              // and the description is optional -- key off the record's id
              // where there is one, and skip the blurb rather than printing an
              // empty paragraph into the ladder.
              <li className="tier-row" key={t.id || t.name}>
                <div className="tier-head">
                  <h3>{t.name}</h3>
                  <span className="tier-price">{t.price}</span>
                </div>
                <p className="tier-size">{t.size}</p>
                {t.blurb ? <p className="tier-blurb">{t.blurb}</p> : null}
              </li>
            ))}
          </ul>

          <div className="corporate-actions">
            <a
              className="btn btn-butter btn-lg"
              href={`mailto:${CONTACT.email}?subject=Corporate%20gift%20quote`}
            >
              Request a quote
            </a>
            <p>
              Volume pricing from 10+ boxes · custom cards included ·
              nationwide shipping
            </p>
          </div>
        </div>

        <figure className="corporate-photo" data-reveal>
          <img
            src={GIFT_IMG}
            alt="Dark gift boxes tied with gold ribbon, ready to ship"
            loading="lazy"
            width="900"
            height="900"
          />
          <figcaption>
            Your logo, our fudge: a gift nobody regifts.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
