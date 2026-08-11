import { useState } from 'react'
import { useReveal } from '../hooks/useReveal.js'
import { CATEGORIES, FLAVORS, SQUARE_PRICE, stockFirst } from '../data/flavors.js'

const INITIAL_COUNT = 8

function FlavorCard({ flavor, onAdd, boxFull, index }) {
  const [justAdded, setJustAdded] = useState(false)
  const soldOut = Boolean(flavor.soldOut)

  const handleAdd = () => {
    onAdd(flavor.id)
    if (!boxFull) {
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1100)
    }
  }

  return (
    <article
      className={`flavor-card${soldOut ? ' is-soldout' : ''}`}
      data-reveal
      style={{ '--stagger': `${(index % 4) * 60}ms` }}
    >
      <div className="flavor-photo">
        {flavor.img ? (
          <img
            src={`${flavor.img}`}
            alt={`${flavor.name} fudge, cut into thick squares`}
            loading="lazy"
            width="600"
            height="450"
            style={{ '--focal': flavor.focal }}
          />
        ) : (
          <div className="flavor-photo-new" aria-hidden="true">
            <span>fresh off the slab</span>
          </div>
        )}
        {/* One badge slot, so sold-out takes the corner from the others. */}
        {soldOut ? (
          <span className="badge badge-sold">Sold out</span>
        ) : (
          <>
            {flavor.popular && <span className="badge badge-butter">Fan favorite</span>}
            {flavor.isNew && <span className="badge badge-blue">New flavor</span>}
          </>
        )}
      </div>
      <div className="flavor-body">
        <h3>{flavor.name}</h3>
        <p>{flavor.desc}</p>
        {flavor.note && <p className="flavor-note">{flavor.note}</p>}
      </div>
      <div className="flavor-foot">
        <div className="flavor-price">
          <strong>${SQUARE_PRICE.toFixed(2)}</strong>
          <span>{soldOut ? 'back in the next batch' : '¼ lb square'}</span>
        </div>
        {soldOut ? (
          <span className="btn-add is-soldout" aria-hidden="true">
            Sold out
          </span>
        ) : (
          <button
            className={`btn-add${justAdded ? ' is-added' : ''}`}
            onClick={handleAdd}
            disabled={boxFull && !justAdded}
            aria-label={
              boxFull
                ? `Box is full, ${flavor.name} not added`
                : `Add ${flavor.name} to your six-pack box`
            }
          >
            {justAdded ? (
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path
                  d="m2.5 8.5 3.5 3.5 7.5-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path
                  d="M8 2.5v11M2.5 8h11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span>{justAdded ? 'In the box' : 'Add to box'}</span>
          </button>
        )}
      </div>
    </article>
  )
}

export default function Shop({ onAdd, boxFull }) {
  const [cat, setCat] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const ref = useReveal()

  const filtered = stockFirst(
    cat === 'all' ? FLAVORS : FLAVORS.filter((f) => f.cats.includes(cat))
  )
  const visible = cat === 'all' && !showAll ? filtered.slice(0, INITIAL_COUNT) : filtered
  const hiddenCount = filtered.length - visible.length

  return (
    <section className="shop" id="shop" ref={ref}>
      <div className="container">
        <div className="section-head" data-reveal>
          <h2>The flavor case</h2>
          <p>
            Every square is cut from a slab we stirred ourselves. Pick your
            favorites one at a time, or drop six straight into a{' '}
            <a href="#build-a-box">Build-a-Box</a>.
          </p>
        </div>

        <div className="filter-row" role="group" aria-label="Filter flavors" data-reveal>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip${cat === c.key ? ' is-active' : ''}`}
              aria-pressed={cat === c.key}
              onClick={() => {
                setCat(c.key)
                setShowAll(true)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flavor-grid">
          {visible.map((f, i) => (
            <FlavorCard
              key={f.id}
              flavor={f}
              onAdd={onAdd}
              boxFull={boxFull}
              index={i}
            />
          ))}
        </div>

        {hiddenCount > 0 && (
          <div className="shop-more" data-reveal>
            <button className="btn btn-outline" onClick={() => setShowAll(true)}>
              Show all {FLAVORS.length} flavors
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
