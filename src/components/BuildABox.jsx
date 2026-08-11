import { useState } from 'react'
import { useReveal } from '../hooks/useReveal.js'
import {
  BOX_PRICE,
  BOX_SIZE,
  FLAVORS,
  SQUARE_PRICE,
  flavorById,
  stockFirst,
} from '../data/flavors.js'

const PICKER_FLAVORS = stockFirst(FLAVORS)

export default function BuildABox({ box, onAdd, onRemove, onClear }) {
  const ref = useReveal()
  const [confirmed, setConfirmed] = useState(false)
  const full = box.length >= BOX_SIZE
  const remaining = BOX_SIZE - box.length
  const savings = (SQUARE_PRICE * BOX_SIZE - BOX_PRICE).toFixed(2)

  const counts = box.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})

  const handleCheckout = () => {
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 2600)
  }

  return (
    <section className="build" id="build-a-box" ref={ref}>
      <div className="container build-grid">
        <div className="build-intro" data-reveal>
          <h2>Build a Box</h2>
          <p className="build-lede">
            Six thick-cut squares, any flavors you like, even six of the same
            one. We cut them fresh, tuck them in parchment, and ship them in
            our signature box.
          </p>

          <div className="build-box-visual" role="status" aria-live="polite">
            <p className="build-count">
              {full ? (
                <>Your box is full. Nicely done.</>
              ) : (
                <>
                  <strong>{box.length}</strong> of {BOX_SIZE} squares picked
                  {box.length > 0 && (
                    <>, room for {remaining} more</>
                  )}
                </>
              )}
            </p>
            <div className="box-slots">
              {Array.from({ length: BOX_SIZE }).map((_, i) => {
                const id = box[i]
                const flavor = id ? flavorById(id) : null
                return (
                  <div key={i} className={`box-slot${flavor ? ' is-filled' : ''}`}>
                    {flavor ? (
                      <button
                        className="slot-content"
                        onClick={() => onRemove(i)}
                        aria-label={`Remove ${flavor.name} from slot ${i + 1}`}
                        title="Click to remove"
                      >
                        {flavor.img ? (
                          <img
                            src={flavor.img}
                            alt=""
                            loading="lazy"
                            style={{ '--focal': flavor.focal }}
                          />
                        ) : (
                          <span className="slot-new" aria-hidden="true">
                            NEW
                          </span>
                        )}
                        <span className="slot-name">{flavor.name}</span>
                        <span className="slot-x" aria-hidden="true">
                          ×
                        </span>
                      </button>
                    ) : (
                      <span className="slot-empty" aria-hidden="true">
                        {i + 1}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="build-foot">
              <div className="build-price">
                <strong>${BOX_PRICE.toFixed(2)}</strong>
                <span>six-pack box · save ${savings}</span>
              </div>
              <div className="build-actions">
                {box.length > 0 && (
                  <button className="btn-text" onClick={onClear}>
                    Start over
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  disabled={!full}
                  onClick={handleCheckout}
                >
                  {confirmed
                    ? 'Added to cart ✓'
                    : full
                      ? 'Add box to cart'
                      : `Pick ${remaining} more`}
                </button>
              </div>
            </div>
          </div>
          <p className="build-finePrint">
            Mint flavors are bold, so we ship them in their own box to keep
            the others true. Checkout connects to the client’s Square store.
          </p>
        </div>

        <div className="build-picker" data-reveal>
          <h3 className="picker-title">Tap a flavor to drop it in</h3>
          <ul className="picker-list">
            {PICKER_FLAVORS.map((f) => {
              const count = counts[f.id] || 0
              const soldOut = Boolean(f.soldOut)
              return (
                <li key={f.id}>
                  <button
                    className={`picker-item${count ? ' has-some' : ''}${soldOut ? ' is-soldout' : ''}`}
                    onClick={() => onAdd(f.id)}
                    disabled={full || soldOut}
                    aria-label={
                      soldOut
                        ? `${f.name} is sold out`
                        : `Add ${f.name} to box${count ? ` (${count} in box)` : ''}`
                    }
                  >
                    <span className="picker-thumb" aria-hidden="true">
                      {f.img ? (
                        <img
                          src={f.img}
                          alt=""
                          loading="lazy"
                          style={{ '--focal': f.focal }}
                        />
                      ) : (
                        <span className="picker-thumb-new">NEW</span>
                      )}
                    </span>
                    <span className="picker-name">{f.name}</span>
                    {count > 0 && (
                      <span className="picker-count" aria-hidden="true">
                        ×{count}
                      </span>
                    )}
                    <span
                      className={soldOut ? 'picker-sold' : 'picker-plus'}
                      aria-hidden="true"
                    >
                      {soldOut ? 'Sold out' : '+'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
