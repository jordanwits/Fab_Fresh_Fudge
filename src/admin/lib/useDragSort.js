import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag-to-reorder for a vertical list, on pointer events.
 *
 * Pointer events rather than HTML5 drag-and-drop: the native API ignores touch
 * entirely, can't be styled, and fires a ghost image we don't want. One pointer
 * code path covers mouse, pen and touch.
 *
 * No library. dnd-kit would do this well, but it is ~40 kB for one list in a
 * project whose only dependencies are react and react-dom, and the interaction
 * here is a single-axis list with no cross-container dragging.
 *
 * Two ways in, because drag is not reachable by keyboard:
 *   - pointer: press the handle and move.
 *   - keyboard: focus the handle, Space or Enter to pick up, arrows to move,
 *     Space/Enter to drop, Escape to cancel. Every step is announced through
 *     `liveMessage`, which the caller renders into a live region.
 *
 * While dragging, the moved row follows the pointer and the rows it passes
 * shift by exactly the moved row's height — the gap it left behind — so the
 * list reads as if the row were already in its new slot.
 *
 * Usage:
 *   const sort = useDragSort({ count, disabled, onReorder, describe })
 *   <tbody ref={sort.containerRef}>
 *     <tr {...sort.itemProps(i)}>
 *       <button {...sort.handleProps(i)}>…</button>
 */

// How close to the viewport edge a drag has to get before the page scrolls
// itself, and how fast it scrolls once it is right at the edge.
const EDGE_ZONE = 76
const EDGE_MAX_SPEED = 16

export function useDragSort({
  count,
  disabled = false,
  onReorder,
  describe,
  /**
   * Optional `(index) => [min, max]` limiting how far an item may travel.
   * The flavor table uses it to pen each row inside its stock group, because
   * the public site always renders in-stock flavors ahead of sold-out ones —
   * a drag across that line would promise an order the site cannot produce.
   */
  bounds,
  /** Optional `(index) => string` naming the group, for announcements. */
  describeGroup,
}) {
  const containerRef = useRef(null)
  const [active, setActive] = useState(null) // { from, to, mode, offset }
  const [live, setLive] = useState('')

  // Pointer moves fire far faster than React needs to re-render. The live
  // geometry lives in refs; state only carries what changes the layout.
  const geom = useRef(null)
  const activeRef = useRef(null)
  const frame = useRef(0)
  const edgeSpeed = useRef(0)
  const pointerY = useRef(0)

  const commit = (next) => {
    activeRef.current = next
    setActive(next)
  }

  const label = useCallback((i) => describe?.(i) ?? `Item ${i + 1}`, [describe])

  const rangeFor = useCallback(
    (i) => {
      const [min, max] = bounds?.(i) ?? [0, count - 1]
      return [Math.max(0, min), Math.min(count - 1, max)]
    },
    [bounds, count]
  )

  /** "position 2 of 10 in In stock" — counted inside the group, not the list. */
  const placeOf = useCallback(
    (from, index) => {
      const [min, max] = rangeFor(from)
      const group = describeGroup?.(from)
      return `position ${index - min + 1} of ${max - min + 1}${group ? ` in ${group}` : ''}`
    },
    [rangeFor, describeGroup]
  )

  /** Row boxes in document space, so auto-scroll doesn't invalidate them. */
  const measure = useCallback(() => {
    const els = Array.from(containerRef.current?.querySelectorAll('[data-sortable]') || [])
    const rects = els.map((el) => el.getBoundingClientRect())
    return {
      heights: rects.map((r) => r.height),
      centers: rects.map((r) => r.top + r.height / 2 + window.scrollY),
    }
  }, [])

  /** Which slot the dragged row's centre has moved into, penned to its group. */
  const targetFor = useCallback(
    (from, draggedCenter) => {
      const g = geom.current
      if (!g) return from
      const [min, max] = rangeFor(from)
      let to = from
      for (let i = from - 1; i >= min; i--) {
        if (draggedCenter < g.centers[i]) to = i
        else break
      }
      for (let i = from + 1; i <= max && i < g.centers.length; i++) {
        if (draggedCenter > g.centers[i]) to = i
        else break
      }
      return to
    },
    [rangeFor]
  )

  const applyPointer = useCallback(() => {
    const state = activeRef.current
    const g = geom.current
    if (!state || !g || state.mode !== 'pointer') return

    const docY = pointerY.current + window.scrollY
    const offset = docY - g.startDocY
    const to = targetFor(state.from, g.centers[state.from] + offset)

    if (offset !== state.offset || to !== state.to) {
      commit({ ...state, offset, to })
    }
  }, [targetFor])

  // Auto-scroll loop. Without it, a list taller than the viewport can only be
  // reordered as far as the fold.
  const runFrame = useCallback(() => {
    frame.current = 0
    const state = activeRef.current
    if (!state || state.mode !== 'pointer') return

    const y = pointerY.current
    let speed = 0
    if (y < EDGE_ZONE) speed = -EDGE_MAX_SPEED * (1 - y / EDGE_ZONE)
    else if (y > window.innerHeight - EDGE_ZONE)
      speed = EDGE_MAX_SPEED * (1 - (window.innerHeight - y) / EDGE_ZONE)

    edgeSpeed.current = speed
    if (speed) {
      window.scrollBy(0, speed)
      applyPointer()
    }
    frame.current = requestAnimationFrame(runFrame)
  }, [applyPointer])

  const stop = useCallback(
    (didDrop) => {
      const state = activeRef.current
      cancelAnimationFrame(frame.current)
      frame.current = 0
      edgeSpeed.current = 0
      document.body.classList.remove('is-dragsorting')
      commit(null)
      geom.current = null

      if (!state) return
      if (didDrop && state.to !== state.from) {
        setLive(`${label(state.from)} moved to ${placeOf(state.from, state.to)}.`)
        onReorder(state.from, state.to)
      } else if (!didDrop) {
        setLive('Reordering cancelled.')
      } else {
        setLive('')
      }
    },
    [label, placeOf, onReorder]
  )

  // Pointer listeners live on the window so a fast drag that outruns the row
  // still tracks, and a release outside the table still lands.
  useEffect(() => {
    if (!active || active.mode !== 'pointer') return

    const onMove = (e) => {
      pointerY.current = e.clientY
      applyPointer()
      if (!frame.current) frame.current = requestAnimationFrame(runFrame)
    }
    const onUp = () => stop(true)
    const onCancel = () => stop(false)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        stop(false)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [active, applyPointer, runFrame, stop])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const startPointer = (index) => (e) => {
    if (disabled || e.button !== 0 || activeRef.current) return
    e.preventDefault()

    const g = measure()
    if (!g.heights.length) return
    geom.current = { ...g, startDocY: e.clientY + window.scrollY }
    pointerY.current = e.clientY

    document.body.classList.add('is-dragsorting')
    commit({ from: index, to: index, offset: 0, mode: 'pointer' })
    setLive(`${label(index)} picked up, ${placeOf(index, index)}.`)
  }

  const onHandleKeyDown = (index) => (e) => {
    if (disabled) return
    const state = activeRef.current
    const dragging = state?.mode === 'keyboard'

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!dragging) {
        const g = measure()
        if (!g.heights.length) return
        geom.current = { ...g, startDocY: 0 }
        commit({ from: index, to: index, offset: 0, mode: 'keyboard' })
        setLive(
          `${label(index)} picked up, ${placeOf(index, index)}. ` +
            'Use the up and down arrow keys to move it, space to drop, escape to cancel.'
        )
      } else {
        stop(true)
      }
      return
    }

    if (!dragging) return

    if (e.key === 'Escape') {
      e.preventDefault()
      stop(false)
      return
    }

    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!step) return
    e.preventDefault()

    const [min, max] = rangeFor(state.from)
    const to = Math.min(max, Math.max(min, state.to + step))
    if (to === state.to) {
      // Silently refusing to move looks like a broken key. Say why.
      const group = describeGroup?.(state.from)
      setLive(
        group
          ? `Already ${step < 0 ? 'first' : 'last'} in ${group}. Flavors can't move between stock groups.`
          : `Already ${step < 0 ? 'first' : 'last'}.`
      )
      return
    }
    commit({ ...state, to })
    setLive(`${label(state.from)}, ${placeOf(state.from, to)}.`)
  }

  /**
   * How far row `index` slides while a drag is in flight. The moved row tracks
   * the pointer; everything between its old and new slot shifts by the height
   * of the gap it left.
   */
  const shiftFor = (index) => {
    const state = active
    const g = geom.current
    if (!state || !g) return 0

    const { from, to } = state
    if (index === from) {
      if (state.mode === 'pointer') return state.offset
      // Keyboard has no pointer to follow, so the row is placed by summing the
      // heights of the rows it has passed.
      let d = 0
      if (to > from) for (let i = from + 1; i <= to; i++) d += g.heights[i]
      if (to < from) for (let i = to; i < from; i++) d -= g.heights[i]
      return d
    }
    if (to > from && index > from && index <= to) return -g.heights[from]
    if (to < from && index >= to && index < from) return g.heights[from]
    return 0
  }

  const itemProps = (index) => {
    const isActive = active?.from === index
    const shift = shiftFor(index)
    return {
      'data-sortable': '',
      className: isActive ? 'is-dragging' : shift ? 'is-shifted' : undefined,
      style: shift
        ? {
            transform: `translateY(${shift}px)`,
            // The moved row must not animate to the pointer, or it lags behind
            // the cursor. Everything it displaces should ease.
            transition: isActive && active.mode === 'pointer' ? 'none' : undefined,
          }
        : undefined,
    }
  }

  const handleProps = (index) => ({
    type: 'button',
    className: 'drag-handle',
    onPointerDown: startPointer(index),
    onKeyDown: onHandleKeyDown(index),
    disabled,
    'aria-label': `Reorder ${label(index)}, currently ${placeOf(index, index)}`,
    'aria-describedby': 'dragsort-help',
    'aria-pressed': active?.from === index && active.mode === 'keyboard' ? true : undefined,
  })

  return {
    containerRef,
    itemProps,
    handleProps,
    liveMessage: live,
    isDragging: Boolean(active),
    activeIndex: active?.from ?? null,
  }
}
