import { useReveal } from '../hooks/useReveal.js'
import { REVIEWS } from '../data/site.js'

function Stars({ n }) {
  return (
    <span className="stars" role="img" aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}
    </span>
  )
}

export default function Reviews() {
  const ref = useReveal()
  const featured = REVIEWS.find((r) => r.featured)
  const rest = REVIEWS.filter((r) => !r.featured)

  return (
    <section className="reviews" id="reviews" ref={ref}>
      <div className="container">
        <div className="reviews-featured" data-reveal>
          <Stars n={featured.stars} />
          <blockquote>
            <p>“{featured.quote}”</p>
          </blockquote>
          <cite>
            {featured.name} <span>· {featured.context}</span>
          </cite>
        </div>

        <div className="reviews-grid">
          {rest.map((r, i) => (
            <figure
              className="review-card"
              key={r.name}
              data-reveal
              style={{ '--stagger': `${i * 70}ms` }}
            >
              <Stars n={r.stars} />
              <blockquote>
                <p>“{r.quote}”</p>
              </blockquote>
              <figcaption>
                {r.name} <span>· {r.context}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
