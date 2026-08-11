import { useReveal } from '../hooks/useReveal.js'
import { SPECIAL } from '../data/site.js'

export default function Specials() {
  const ref = useReveal()

  return (
    <section className="specials" id="specials" ref={ref} aria-label="Current special">
      <div className="container specials-inner" data-reveal>
        <div className="specials-copy">
          <p className="specials-kicker">{SPECIAL.kicker}</p>
          <h2>{SPECIAL.title}</h2>
          <p>{SPECIAL.body}</p>
        </div>
        <div className="specials-code">
          <span>use code</span>
          <strong>{SPECIAL.code}</strong>
        </div>
      </div>
    </section>
  )
}
