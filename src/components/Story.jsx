import { useReveal } from '../hooks/useReveal.js'

const STORY_IMG = '/images/OurStory.webp'

export default function Story() {
  const ref = useReveal()

  return (
    <section className="story" id="our-story" ref={ref}>
      <div className="container">
        <div className="story-head" data-reveal>
          <p className="story-kicker">Our story · Est. 2022</p>
          <h2>
            Meet the Ragles, <em>your fudge family</em>
          </h2>
        </div>

        <figure className="story-figure" data-reveal>
          <img
            className="story-photo"
            src={STORY_IMG}
            alt="Bryan and Becca Ragle, the family behind Fab Fresh Fudge"
            loading="lazy"
            width="940"
            height="1052"
          />
          <figcaption className="story-caption">
            <span className="story-est">Est. 2022</span>
          </figcaption>
        </figure>

        <div className="story-body">
          <aside className="story-aside" data-reveal>
            <blockquote className="story-quote">
              “We love what we do and enjoy sharing our quality products with
              all of you.”
            </blockquote>
            <p className="story-sign">— Team Ragle</p>
          </aside>

          <div className="story-prose" data-reveal>
            <p>
              Fab Fresh Fudge is the Ragle family’s fourth act. Bryan &amp;
              Becca took it on in 2022, rolled up their sleeves, and haven’t
              looked back since.
            </p>
            <p>
              You may already know us. Over the years we’ve sold Cutco cutlery
              and doTERRA oils, and we still run Best Tutors Ever. Some folks
              call us “seasoned entrepreneurs.” Mostly we just love good work
              and good people, which these days means stirring small batches of
              fudge and packing up for fairs and markets across Northern
              California, Southern Oregon &amp; Northern Nevada.
            </p>
            <p>
              Every batch is cut fresh, never mass-produced, and made the way
              fudge should be: by hand, with real ingredients, by folks who will
              probably hand it to you themselves. We can’t wait to share it with
              you.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
