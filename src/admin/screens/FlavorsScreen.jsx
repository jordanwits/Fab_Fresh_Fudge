import { Fragment, useEffect, useMemo, useState } from 'react'
import { CATEGORIES, stockFirst } from '../../data/flavors.js'
import { useData } from '../state/DataContext.jsx'
import { useClosing } from '../lib/useClosing.js'
import { useDragSort } from '../lib/useDragSort.js'
import { useToast } from '../state/ToastContext.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState, ErrorState, LoadingRegion, RowSkeleton } from '../ui/States.jsx'
import FlavorEditor from './FlavorEditor.jsx'

/**
 * The flavor case, as a table.
 *
 * A table rather than a grid of cards because the job here is comparison and
 * upkeep — which of the twenty are sold out, which are missing a photo — and
 * rows scan for that in a way a photo grid doesn't. The photo is still the
 * first column, because that's how the client thinks about a flavor.
 *
 * The sold-out switch lives in the row rather than behind the editor: it's the
 * one thing that changes weekly, and making it a two-click inline toggle is the
 * single biggest thing this tool does for them.
 */

const SORTS = [
  { key: 'catalog', label: 'Site order' },
  { key: 'name', label: 'Name A–Z' },
]

const CAT_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]))

function StockSwitch({ flavor, onChange }) {
  const id = `stock-${flavor.id}`
  return (
    <span className="stock">
      <input
        type="checkbox"
        id={id}
        checked={!flavor.soldOut}
        onChange={(e) => onChange(flavor.id, !e.target.checked)}
      />
      <label htmlFor={id} className="stock__face">
        <span className="switch switch--stock" aria-hidden="true">
          <span className="switch__track">
            <span className="switch__thumb" />
          </span>
        </span>
        <span className="stock__text">{flavor.soldOut ? 'Sold out' : 'In stock'}</span>
        <span className="visually-hidden">
          {flavor.name} is {flavor.soldOut ? 'sold out' : 'in stock'}
        </span>
      </label>
    </span>
  )
}

export default function FlavorsScreen() {
  const {
    flavors,
    loading,
    loadError,
    refresh,
    createFlavor,
    updateFlavor,
    deleteFlavor,
    setSoldOut,
    reorderFlavors,
  } = useData()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('catalog')
  const [editing, setEditing] = useState(null) // { flavor } | { flavor: null } for new
  const [deleting, setDeleting] = useState(null)
  const [deletePending, setDeletePending] = useState(false)
  // Phone-only reorder mode. A grip that is always live on a list you scroll
  // with your thumb invites grabs you didn't mean; desktop keeps the handles
  // out permanently, where there is a cursor and room for them.
  const [reordering, setReordering] = useState(false)

  // Both overlays unmount on close, so the form resets between opens. These
  // keep their content alive just long enough for the exit animation.
  const editingHeld = useClosing(editing)
  const deletingHeld = useClosing(deleting)

  const soldOutCount = flavors.filter((f) => f.soldOut).length
  const missingPhoto = flavors.filter((f) => !f.img).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = flavors.filter((f) => {
      const matchesQuery =
        !q || f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
      const matchesCat = cat === 'all' || f.cats.includes(cat)
      return matchesQuery && matchesCat
    })

    // "Site order" has to be the site's order, not the raw catalog: Shop.jsx
    // renders stockFirst(), so a sold-out flavor never appears above an
    // in-stock one no matter where it sits in flavors.js.
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else list = stockFirst(list)

    return list
  }, [flavors, query, cat, sort])

  // Reordering only makes sense against the real list, not a filtered slice of
  // it — "move up" past hidden rows would jump unpredictably.
  const canReorder = sort === 'catalog' && cat === 'all' && !query.trim()
  const isFiltered = Boolean(query.trim()) || cat !== 'all'

  // The two stock groups, as displayed. A row may only be dragged inside its
  // own group, because the site will re-sort across the boundary anyway.
  const inStockCount = useMemo(() => filtered.filter((f) => !f.soldOut).length, [filtered])
  const showGroups = canReorder && inStockCount > 0 && inStockCount < filtered.length

  // Sorting or filtering retires the handles, so the mode has to retire with
  // them rather than leaving a "Done" button over a list that can't be dragged.
  useEffect(() => {
    if (!canReorder) setReordering(false)
  }, [canReorder])

  const sorting = useDragSort({
    count: filtered.length,
    disabled: !canReorder,
    describe: (i) => filtered[i]?.name,
    describeGroup: (i) => (filtered[i]?.soldOut ? 'Sold out' : 'In stock'),
    bounds: (i) =>
      filtered[i]?.soldOut ? [inStockCount, filtered.length - 1] : [0, inStockCount - 1],
    onReorder: (from, to) => {
      const next = [...filtered]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      reorderFlavors(next.map((f) => f.id))
    },
  })

  const handleSave = async (payload, isNew) => {
    if (isNew) await createFlavor(payload)
    else await updateFlavor(payload.id, payload)
  }

  const handleDelete = async () => {
    setDeletePending(true)
    try {
      await deleteFlavor(deleting)
      setDeleting(null)
      setEditing(null)
    } catch (err) {
      toast.error("Couldn't delete", err?.message || 'Try again in a moment.')
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="page-head__title">Flavors</h1>
          <p className="page-head__meta">
            {loading ? (
              'Loading the flavor case…'
            ) : (
              <>
                <strong>{flavors.length}</strong> on the site
                <span className="dot" aria-hidden="true" />
                <span className={soldOutCount ? 'is-amber' : undefined}>
                  {soldOutCount} sold out
                </span>
                {missingPhoto ? (
                  <>
                    <span className="dot" aria-hidden="true" />
                    <span className="is-amber">{missingPhoto} without a photo</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => setEditing({ flavor: null })}
          disabled={loading || Boolean(loadError)}
        >
          Add flavor
        </Button>
      </header>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={17} className="search__icon" />
          <input
            type="search"
            className="input search__input"
            placeholder="Search flavors"
            value={query}
            aria-label="Search flavors by name or description"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="search__clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={15} />
            </button>
          ) : null}
        </div>

        <div className="toolbar__filters" role="group" aria-label="Filter by flavor type">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`pill${cat === c.key ? ' is-active' : ''}`}
              aria-pressed={cat === c.key}
              onClick={() => setCat(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="select-wrap">
          <span className="visually-hidden">Sort flavors</span>
          <select
            className="input select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="select-wrap__chevron" />
        </label>
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={refresh} />
      ) : loading ? (
        <LoadingRegion label="Loading flavors">
          <RowSkeleton rows={7} />
        </LoadingRegion>
      ) : flavors.length === 0 ? (
        <EmptyState
          icon="image"
          title="No flavors yet"
          body="Flavors fill the case on the front page and the Build-a-Box picker. Add your first one to get the site going."
          action={
            <Button variant="primary" icon="plus" onClick={() => setEditing({ flavor: null })}>
              Add your first flavor
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nothing matches that"
          body={
            query.trim()
              ? `No flavor mentions “${query.trim()}”.`
              : `No flavors are filed under ${CAT_LABELS[cat]}.`
          }
          action={
            <Button
              variant="secondary"
              icon="close"
              onClick={() => {
                setQuery('')
                setCat('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {isFiltered ? (
            <p className="result-note" role="status">
              Showing {filtered.length} of {flavors.length}
            </p>
          ) : null}

          {canReorder ? (
            <div className="reorder-bar">
              <Button
                size="sm"
                variant={reordering ? 'primary' : 'secondary'}
                icon={reordering ? 'check' : 'grip'}
                aria-pressed={reordering}
                onClick={() => setReordering((v) => !v)}
              >
                {reordering ? 'Done' : 'Reorder'}
              </Button>
            </div>
          ) : null}

          <div className={`table-wrap${reordering ? ' is-reordering' : ''}`}>
            <table className="table">
              <caption className="visually-hidden">
                Flavors on the site. Each row can be edited, reordered, or deleted.
              </caption>
              <thead>
                <tr>
                  {canReorder ? (
                    <th scope="col" className="col-drag">
                      <span className="visually-hidden">Reorder</span>
                    </th>
                  ) : null}
                  <th scope="col" className="col-photo">
                    <span className="visually-hidden">Photo</span>
                  </th>
                  <th scope="col" className="col-flavor">
                    Flavor
                  </th>
                  <th scope="col" className="col-cats">
                    Filters
                  </th>
                  <th scope="col" className="col-badges">
                    Badges
                  </th>
                  <th scope="col" className="col-stock">
                    Stock
                  </th>
                  <th scope="col" className="col-actions">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody ref={sorting.containerRef}>
                {filtered.map((f, i) => {
                  const drag = canReorder ? sorting.itemProps(i) : {}
                  const rowClass = [f.soldOut ? 'is-soldout' : '', drag.className || '']
                    .filter(Boolean)
                    .join(' ')
                  // A heading at each stock boundary, so the reason a row won't
                  // drag past a certain point is on screen rather than implied.
                  const startsGroup =
                    showGroups && (i === 0 || filtered[i - 1].soldOut !== f.soldOut)
                  return (
                  <Fragment key={f.id}>
                  {startsGroup ? (
                    <tr className="group-row">
                      <td colSpan={7}>
                        <span className={`group-row__label${f.soldOut ? ' is-sold' : ''}`}>
                          {f.soldOut ? 'Sold out' : 'In stock'}
                          <span className="group-row__count">
                            {f.soldOut ? filtered.length - inStockCount : inStockCount}
                          </span>
                        </span>
                        <span className="group-row__note">
                          {f.soldOut
                            ? 'Shown after every in-stock flavor on the site.'
                            : 'Shown first on the site.'}
                        </span>
                      </td>
                    </tr>
                  ) : null}
                  <tr {...drag} className={rowClass || undefined}>
                    {canReorder ? (
                      <td className="col-drag">
                        <button {...sorting.handleProps(i)}>
                          <Icon name="grip" size={18} />
                        </button>
                      </td>
                    ) : null}
                    <td className="col-photo">
                      {f.img ? (
                        <img
                          className="thumb"
                          src={f.img}
                          alt=""
                          loading="lazy"
                          width="56"
                          height="42"
                          style={{ objectPosition: f.focal || '50% 50%' }}
                        />
                      ) : (
                        <span className="thumb thumb--empty" title="No photo yet">
                          <Icon name="image" size={16} />
                        </span>
                      )}
                    </td>

                    <td className="col-flavor">
                      <button
                        type="button"
                        className="row-title"
                        onClick={() => setEditing({ flavor: f })}
                      >
                        {f.name}
                      </button>
                      <p className="row-desc">{f.desc}</p>
                      {f.note ? (
                        <p className="row-note">
                          <Icon name="alert" size={12} />
                          {f.note}
                        </p>
                      ) : null}
                    </td>

                    <td className="col-cats">
                      <span className="tag-row">
                        {f.cats.map((c) => (
                          <span className="tag" key={c}>
                            {CAT_LABELS[c] || c}
                          </span>
                        ))}
                      </span>
                    </td>

                    <td className="col-badges">
                      <span className="tag-row">
                        {f.popular ? (
                          <span className="tag tag--butter">
                            <Icon name="star" size={12} />
                            Fan favorite
                          </span>
                        ) : null}
                        {f.isNew ? (
                          <span className="tag tag--blue">
                            <Icon name="sparkle" size={12} />
                            New
                          </span>
                        ) : null}
                        {!f.popular && !f.isNew ? (
                          <span className="tag tag--none">—</span>
                        ) : null}
                      </span>
                    </td>

                    <td className="col-stock">
                      <StockSwitch flavor={f} onChange={setSoldOut} />
                    </td>

                    <td className="col-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setEditing({ flavor: f })}
                          aria-label={`Edit ${f.name}`}
                          title="Edit"
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => setDeleting(f)}
                          aria-label={`Delete ${f.name}`}
                          title="Delete"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* The handles' aria-describedby target. Kept off screen: a keyboard
              user gets no hint from a grip icon that space picks it up. */}
          {canReorder ? (
            <p className="visually-hidden" id="dragsort-help">
              Press space or enter to pick up, the arrow keys to move, space again to drop,
              escape to cancel. Flavors move only within their stock group.
            </p>
          ) : null}

          {/* Drag has no natural announcement; this narrates it for screen readers. */}
          <p className="visually-hidden" role="status" aria-live="polite">
            {sorting.liveMessage}
          </p>
        </>
      )}

      {editingHeld ? (
        <FlavorEditor
          open={Boolean(editing)}
          flavor={editingHeld.flavor}
          allFlavors={flavors}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={(f) => setDeleting(f)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deletingHeld?.name || 'this flavor'}?`}
        body={
          <>
            <p>
              It disappears from the flavor case, the Build-a-Box picker, and any filter it was
              under.
            </p>
            <p className="confirm__aside">This can&rsquo;t be undone.</p>
          </>
        }
        confirmLabel="Delete flavor"
        pending={deletePending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
