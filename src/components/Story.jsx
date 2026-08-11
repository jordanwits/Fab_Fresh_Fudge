import { useReveal } from '../hooks/useReveal.js'

const STORY_IMG = '/images/OurStory.webp'

// Icons are inline paths on a 16-grid — the site carries no icon library.
const VALUES = [
  {
    label: 'Cut by hand',
    // knife: tapered blade, then a rounded handle butted against the bolster
    paths: ['M1.2 10.2 5 5.8h4.9v4.4H1.2Z', 'M9.9 7h3.3a1.6 1.6 0 0 1 0 3.2H9.9'],
  },
  {
    label: 'Family-run since 2022',
    paths: [
      'M6 7.6a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
      'M2.2 13.4c0-2.1 1.7-3.4 3.8-3.4s3.8 1.3 3.8 3.4',
      'M11.6 7.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z',
      'M11 9.9c1.7 0 2.8 1.3 2.8 3.5',
    ],
  },
  {
    label: 'Made in the North State',
    paths: ['M1.5 12.8h13L9.6 4.2 6.9 8.6 5.4 6.8 1.5 12.8Z'],
  },
]

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

            <ul className="story-values">
              {VALUES.map((value) => (
                <li key={value.label}>
                  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                    {value.paths.map((d) => (
                      <path
                        key={d}
                        d={d}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>
                  {value.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
