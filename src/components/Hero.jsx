const HERO_IMG = '/images/hero-shasta.jpg'

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-media" aria-hidden="true">
        <img
          src={HERO_IMG}
          alt=""
          width="1080"
          height="672"
          fetchpriority="high"
          decoding="async"
        />
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-stamp hero-rise" style={{ '--d': '40ms' }}>
            Hand-stirred · Small batch · Shipped fresh
          </p>

          <h1 className="hero-rise" style={{ '--d': '120ms' }}>
            Real fudge, shipped straight to your&nbsp;door.
          </h1>

          <p className="hero-lede hero-rise" style={{ '--d': '200ms' }}>
            Real butter, real cream, and twenty flavors stirred the
            old-fashioned way, cut thick off the slab and shipped fresh to
            your door.
          </p>

          <div className="hero-actions hero-rise" style={{ '--d': '280ms' }}>
            <a className="btn btn-primary btn-lg" href="#shop">
              Shop the flavor case
            </a>
            <a className="btn btn-ghost btn-lg" href="#build-a-box">
              Build your six-pack
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  d="M2 8h11M9 3.5 13.5 8 9 12.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>

        <a className="hero-scroll" href="#shop">
          <span className="hero-scroll-label">Cut fresh, every morning</span>
          <span className="hero-scroll-dot" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M8 2.5v11M3.5 9 8 13.5 12.5 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </a>
      </div>
    </section>
  )
}
