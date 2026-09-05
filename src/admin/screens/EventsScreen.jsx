import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { useClosing } from '../lib/useClosing.js'
import { formatRange, isPast, relativeDay } from '../lib/eventDate.js'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState, ErrorState, LoadingRegion, RowSkeleton } from '../ui/States.jsx'
import EventEditor from './EventEditor.jsx'

/**
 * The show schedule.
 *
 * A list rather than a table: a show is four short fields, and the date chip
 * carries the scanning work a header row would otherwise do. The rows echo the
 * public Events section closely enough that the client can see what they're
 * editing without leaving the page.
 *
 * Past shows are split off and collapsed. They're kept rather than deleted —
 * last year's fair is next year's fair — but they shouldn't compete with the
 * schedule that still matters.
 */

function EventRow({ event, past, onEdit, onDelete }) {
  return (
    <li className={`event-item${past ? ' is-past' : ''}`}>
      <span className="date-chip" aria-hidden="true">
        <span className="date-chip__month">{event.month || '—'}</span>
        <span className="date-chip__day">{event.day || '—'}</span>
      </span>

      <div className="event-item__body">
        <button type="button" className="row-title" onClick={onEdit}>
          {event.name}
        </button>
        <p className="event-item__place">
          <Icon name="pin" size={13} />
          {event.place}
        </p>
        {event.detail ? <p className="row-desc">{event.detail}</p> : null}
        <p className="event-item__when">
          <time dateTime={event.startDate}>{formatRange(event.startDate, event.endDate)}</time>
          <span className="dot" aria-hidden="true" />
          <span className={past ? undefined : 'is-blue'}>{relativeDay(event.startDate)}</span>
        </p>
      </div>

      {event.tag ? (
        <span className="tag tag--blue event-item__tag">
          <Icon name="tag" size={12} />
          {event.tag}
        </span>
      ) : null}

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onEdit}
          aria-label={`Edit ${event.name}`}
          title="Edit"
        >
          <Icon name="pencil" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={onDelete}
          aria-label={`Delete ${event.name}`}
          title="Delete"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  )
}

export default function EventsScreen() {
  const { events, loading, loadError, refresh, createEvent, updateEvent, deleteEvent } = useData()
  const toast = useToast()

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletePending, setDeletePending] = useState(false)
  const [showPast, setShowPast] = useState(false)

  // Keeps the drawer and the confirm populated through their exit animation.
  const editingHeld = useClosing(editing)
  const deletingHeld = useClosing(deleting)

  const { upcoming, past } = useMemo(() => {
    const upcomingList = []
    const pastList = []
    events.forEach((e) => (isPast(e) ? pastList : upcomingList).push(e))
    // Most recent first for past: last weekend's show is the one you'd revisit.
    pastList.reverse()
    return { upcoming: upcomingList, past: pastList }
  }, [events])

  const handleSave = async (payload, isNew) => {
    if (isNew) await createEvent(payload)
    else await updateEvent(editing.event.id, payload)
  }

  const handleDelete = async () => {
    setDeletePending(true)
    try {
      await deleteEvent(deleting)
      setDeleting(null)
      setEditing(null)
    } catch (err) {
      toast.error("Couldn't delete", err?.message || 'Try again in a moment.')
    } finally {
      setDeletePending(false)
    }
  }

  const nextUp = upcoming[0]

  return (
    <>
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="page-head__title">Shows</h1>
          <p className="page-head__meta">
            {loading ? (
              'Loading the schedule…'
            ) : nextUp ? (
              <>
                <strong>{upcoming.length}</strong> upcoming
                <span className="dot" aria-hidden="true" />
                next is {nextUp.name}, {relativeDay(nextUp.startDate)}
              </>
            ) : (
              <>Nothing on the schedule right now</>
            )}
          </p>
        </div>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => setEditing({ event: null })}
          disabled={loading || Boolean(loadError)}
        >
          Add show
        </Button>
      </header>

      {loadError ? (
        <ErrorState message={loadError} onRetry={refresh} />
      ) : loading ? (
        <LoadingRegion label="Loading shows">
          <RowSkeleton rows={4} />
        </LoadingRegion>
      ) : (
        <>
          {upcoming.length ? (
            <ul className="event-list">
              {upcoming.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  past={false}
                  onEdit={() => setEditing({ event: e })}
                  onDelete={() => setDeleting(e)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="calendar"
              title={past.length ? 'No shows coming up' : 'No shows on the schedule'}
              body={
                past.length
                  ? "The Events section on the site is empty until something is dated in the future. Past shows are still saved below if you're doing one again."
                  : 'Markets, fairs and festivals go here, and appear on the site under “Upcoming shows”.'
              }
              action={
                <Button variant="primary" icon="plus" onClick={() => setEditing({ event: null })}>
                  Add a show
                </Button>
              }
            />
          )}

          {past.length ? (
            <section className="past">
              <button
                type="button"
                className="past__toggle"
                onClick={() => setShowPast((v) => !v)}
                aria-expanded={showPast}
              >
                <Icon name={showPast ? 'chevronDown' : 'chevronRight'} size={16} />
                <span>
                  Past shows <span className="past__count">{past.length}</span>
                </span>
              </button>
              {showPast ? (
                <>
                  <p className="past__note">
                    These are hidden on the website. Edit the dates to bring one back.
                  </p>
                  <ul className="event-list event-list--past">
                    {past.map((e) => (
                      <EventRow
                        key={e.id}
                        event={e}
                        past
                        onEdit={() => setEditing({ event: e })}
                        onDelete={() => setDeleting(e)}
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {editingHeld ? (
        <EventEditor
          open={Boolean(editing)}
          event={editingHeld.event}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={(e) => setDeleting(e)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deletingHeld?.name || 'this show'}?`}
        body={
          <>
            <p>It comes off the schedule on the website.</p>
            <p className="confirm__aside">This can&rsquo;t be undone.</p>
          </>
        }
        confirmLabel="Delete show"
        pending={deletePending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
