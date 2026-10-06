import { CONTACT } from '../data/site.js'

export default function Footer({ season, onRequestQuote }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img
            src="/images/Logos/Fab Fresh Color.png"
            alt="Fab Fresh Fudge"
            width="76"
            height="76"
            className="footer-logo"
          />
          <p>
            Small-batch fudge, hand-stirred and shipped fresh. Find us online
            or under the striped tent at a fair near you.
          </p>
          <div className="footer-social">
            <a href={CONTACT.instagram} aria-label="Fabulous Fudge on Instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.2" cy="6.8" r="1.3" fill="currentColor" />
              </svg>
            </a>
            <a href={CONTACT.facebook} aria-label="Fabulous Fudge on Facebook">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M14 8.5V7c0-.8.7-1.5 1.5-1.5H17V2.5h-2.5A4.5 4.5 0 0 0 10 7v1.5H7.5V12H10v9.5h4V12h2.5l.5-3.5h-3Z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>

        <nav className="footer-nav" aria-label="Footer">
          <h3>Visit</h3>
          <a href="#shop">Shop</a>
          <a href="#build-a-box">Build a Box</a>
          <a href="#our-story">Our Story</a>
          <a href="#reviews">Reviews</a>
          <a href="#events">Events</a>
          <a href="#corporate">Corporate Gifts</a>
        </nav>

        <div className="footer-contact">
          <h3>Say hello</h3>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <p>
            Questions about an order, an event, or a flavor idea? We read
            everything.
          </p>
          {season && !season.open && (
            // Out of season the shop still ships, packed with ice, for a price
            // they work out by hand.
            <button type="button" className="footer-quote" onClick={onRequestQuote}>
              Ask about summer shipping
            </button>
          )}
        </div>
      </div>

      <div className="container footer-base">
        <p>© {new Date().getFullYear()} Fabulous Fudge · fabfreshfudge.com</p>
        <p>
          Site by <a href="https://westwavecreative.com">West Wave Creative</a>
        </p>
      </div>
    </footer>
  )
}
