/**
 * The dashboard's only icon set.
 *
 * Hand-rolled inline SVG, matching how the public site draws its icons — one
 * 24px grid, 1.75 stroke, round caps and joins, `currentColor` throughout, no
 * fills. Adding a second icon library would break the visual vocabulary, so
 * anything new gets drawn here on the same grid.
 *
 * Icons are decorative by default (aria-hidden). Pass a `title` only when the
 * icon is the sole content of a control and nothing else names it.
 */

const PATHS = {
  search: <><circle cx="11" cy="11" r="6.25" /><path d="m20 20-4.2-4.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  trash: (
    <>
      <path d="M4 7h16M10 4h4M9 7v12M15 7v12" />
      <path d="M6 7l1 13.5h10L18 7" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l11-11a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 17.5 4.7-4.4a2 2 0 0 1 2.7 0l3 2.8M15 15.5l1.6-1.4a2 2 0 0 1 2.6 0l1.2 1" />
    </>
  ),
  upload: <><path d="M12 16V4.5M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></>,
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </>
  ),
  logout: <><path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" /><path d="M11 12h9.5M17 8.5l3.5 3.5-3.5 3.5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  star: <path d="m12 4 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8Z" />,
  sparkle: <><path d="m12 4 1.7 4.8L18.5 10l-4.8 1.2L12 16l-1.7-4.8L5.5 10l4.8-1.2Z" /><path d="M18 15.5 18.7 18l2.3.7-2.3.8-.7 2.5-.7-2.5-2.3-.8 2.3-.7Z" /></>,
  slash: <><circle cx="12" cy="12" r="8" /><path d="m6.5 6.5 11 11" /></>,
  dots: <><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /></>,
  alert: <><path d="M12 8v5" /><circle cx="12" cy="16.6" r="1.1" /><circle cx="12" cy="12" r="8.5" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4.5V10h-5.5" /></>,
  external: <><path d="M13.5 4.5H20V11" /><path d="M20 4.5 11 13.5" /><path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 8 7.1 5a1.6 1.6 0 0 0 1.8 0L20 8" /></>,
  eye: <><path d="M2.8 12S6.5 6 12 6s9.2 6 9.2 6-3.7 6-9.2 6-9.2-6-9.2-6Z" /><circle cx="12" cy="12" r="2.75" /></>,
  eyeOff: <><path d="M9.9 6.3A8.6 8.6 0 0 1 12 6c5.5 0 9.2 6 9.2 6a17 17 0 0 1-2.6 3.2M6.4 8A17 17 0 0 0 2.8 12S6.5 18 12 18a8.7 8.7 0 0 0 3.4-.7" /><path d="M10 10a2.75 2.75 0 0 0 3.9 3.9M4 4l16 16" /></>,
  tag: <><path d="M4.5 11.2V5.5a1 1 0 0 1 1-1h5.7a1 1 0 0 1 .7.3l7.4 7.4a1.5 1.5 0 0 1 0 2.1l-5 5a1.5 1.5 0 0 1-2.1 0L4.8 12a1 1 0 0 1-.3-.7Z" /><circle cx="8.6" cy="8.6" r="1.2" /></>,
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </g>
  ),
  pin: <><path d="M12 21v-6.5" /><path d="M8 3.5h8l-1 5.2 2.6 2.4a1 1 0 0 1-.7 1.7H7.1a1 1 0 0 1-.7-1.7L9 8.7Z" /></>,
}

export default function Icon({ name, size = 20, title, className = '', strokeWidth = 1.75 }) {
  const path = PATHS[name]
  if (!path) return null

  return (
    <svg
      className={`ic ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  )
}
