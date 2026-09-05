/**
 * Flavor ids are slugs, and the public site keys off them -- Build-a-Box stores
 * ids, `flavorById` looks them up, and photo filenames follow them. They are
 * generated from the name on create and locked afterwards.
 */

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/['\u2019]/g, '') // s'mores -> smores, not s-mores
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export const isSlug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

/** Append -2, -3... until the slug is free. */
export function uniqueSlug(base, taken) {
  const seed = slugify(base) || 'flavor'
  if (!taken.includes(seed)) return seed
  let n = 2
  while (taken.includes(`${seed}-${n}`)) n += 1
  return `${seed}-${n}`
}

/** Short, collision-resistant id for records the site doesn't key off. */
export function randomId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}
