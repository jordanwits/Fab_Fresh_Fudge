import { useEffect, useState } from 'react'
import { useData } from '../state/DataContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { useClosing } from '../lib/useClosing.js'
import { useDragSort } from '../lib/useDragSort.js'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState, ErrorState, LoadingRegion, RowSkeleton } from '../ui/States.jsx'
import PackageEditor from './PackageEditor.jsx'

/**
 * The corporate gift tiers.
 *
 * A short ordered list, laid out the way the site lays it out: name and price
 * on one line, contents under it, the sentence under that. The client should be
 * able to read this screen and the live section side by side and see the same
 * ladder.
 *
 * Reordering is the flavor table's, moved over whole: the same `useDragSort`,
 * the same grip handle and keyboard fallback, and on a phone the same Reorder
 * mode rather than a handle left live under a scrolling thumb. What does NOT
 * carry over is the stock grouping — the site prints these in array order, full
 * stop, so there is no boundary for a drag to promise across and a package may
 * be dragged anywhere in the list.
 */

function PackageRow({ pkg, index, drag, handleProps, onEdit, onDelete }) {
  return (
    // The spread carries useDragSort's own className, so the merged one has to
    // be written after it or the row loses either `pkg-item` or `is-dragging`.
    <li {...drag} className={`pkg-item${drag.className ? ` ${drag.className}` : ''}`}>
      <div className="pkg-item__rank">
        <span className="pkg-item__num" aria-hidden="true">
          {index + 1}
        </span>
        {handleProps ? (
          <button {...handleProps}>
            <Icon name="grip" size={18} />
          </button>
        ) : null}
      </div>

      <div className="pkg-item__body">
        <div className="pkg-item__head">
          <button type="button" className="row-title" onClick={onEdit}>
            {pkg.name}
          </button>
          <span className="pkg-item__price">{pkg.price || '—'}</span>
        </div>
        <p className="pkg-item__size">{pkg.size}</p>
        {pkg.blurb ? <p className="row-desc">{pkg.blurb}</p> : null}
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onEdit}
          aria-label={`Edit ${pkg.name}`}
          title="Edit"
        >
          <Icon name="pencil" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={onDelete}
          aria-label={`Delete ${pkg.name}`}
          title="Delete"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  )
}

export default function PackagesScreen() {
  const {
    packages,
    loading,
    loadError,
    refresh,
    createPackage,
    updatePackage,
    deletePackage,
    reorderPackages,
  } = useData()
  const toast = useToast()

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletePending, setDeletePending] = useState(false)
  // Phone-only reorder mode, for the reason the flavor table has one: a grip
  // that is always live on a list you scroll with your thumb collects grabs you
  // didn't mean. Desktop keeps the handles out permanently.
  const [reordering, setReordering] = useState(false)

  // Keeps the drawer and the confirm populated through their exit animation.
  const editingHeld = useClosing(editing)
  const deletingHeld = useClosing(deleting)

  // One package has nothing to be dragged against, and the handle would be a
  // control that never does anything.
  const canReorder = packages.length > 1

  // Deleting down to one package retires the mode with the handles, rather
  // than stranding a "Done" button over a list that no longer drags.
  useEffect(() => {
    if (!canReorder) setReordering(false)
  }, [canReorder])

  const sorting = useDragSort({
    count: packages.length,
    disabled: !canReorder,
    describe: (i) => packages[i]?.name,
    onReorder: (from, to) => {
      const next = [...packages]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      reorderPackages(next.map((p) => p.id))
    },
  })

  const handleSave = async (payload, isNew) => {
    if (isNew) await createPackage(payload)
    else await updatePackage(editing.pkg.id, payload)
  }

  const handleDelete = async () => {
    setDeletePending(true)
    try {
      await deletePackage(deleting)
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
          <h1 className="page-head__title">Corporate Gifts</h1>
          <p className="page-head__meta">
            {loading ? (
              'Loading gift packages…'
            ) : packages.length ? (
              <>
                <strong>{packages.length}</strong>{' '}
                {packages.length === 1 ? 'package' : 'packages'}
                <span className="dot" aria-hidden="true" />
                listed top to bottom on the site
              </>
            ) : (
              <>No packages listed right now</>
            )}
          </p>
        </div>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => setEditing({ pkg: null })}
          disabled={loading || Boolean(loadError)}
        >
          Add package
        </Button>
      </header>

      {loadError ? (
        <ErrorState message={loadError} onRetry={refresh} />
      ) : loading ? (
        <LoadingRegion label="Loading gift packages">
          <RowSkeleton rows={3} />
        </LoadingRegion>
      ) : packages.length ? (
        <>
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

          <ul
            className={`pkg-list${reordering ? ' is-reordering' : ''}`}
            ref={sorting.containerRef}
          >
            {packages.map((p, i) => (
              <PackageRow
                key={p.id}
                pkg={p}
                index={i}
                drag={canReorder ? sorting.itemProps(i) : {}}
                handleProps={canReorder ? sorting.handleProps(i) : null}
                onEdit={() => setEditing({ pkg: p })}
                onDelete={() => setDeleting(p)}
              />
            ))}
          </ul>

          {/* The handles' aria-describedby target. Kept off screen: a keyboard
              user gets no hint from a grip icon that space picks it up. */}
          {canReorder ? (
            <p className="visually-hidden" id="dragsort-help">
              Press space or enter to pick up, the arrow keys to move, space again to drop,
              escape to cancel.
            </p>
          ) : null}

          {/* Drag has no natural announcement; this narrates it for screen readers. */}
          <p className="visually-hidden" role="status" aria-live="polite">
            {sorting.liveMessage}
          </p>

          <p className="pkg-foot">
            <Icon name="mail" size={14} />
            The &ldquo;Request a quote&rdquo; button under these emails you directly. Prices
            here are the starting point customers see, not a checkout.
          </p>
        </>
      ) : (
        <EmptyState
          icon="gift"
          title="No gift packages yet"
          body="These are the tiers under “Corporate gifts” on the website — the six-pack, the dozen, the whole slab. With none listed, that part of the section is empty."
          action={
            <Button variant="primary" icon="plus" onClick={() => setEditing({ pkg: null })}>
              Add a package
            </Button>
          }
        />
      )}

      {editingHeld ? (
        <PackageEditor
          open={Boolean(editing)}
          pkg={editingHeld.pkg}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={(p) => setDeleting(p)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deletingHeld?.name || 'this package'}?`}
        body={
          <>
            <p>It comes off the Corporate Gifts section on the website.</p>
            <p className="confirm__aside">This can&rsquo;t be undone.</p>
          </>
        }
        confirmLabel="Delete package"
        pending={deletePending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
