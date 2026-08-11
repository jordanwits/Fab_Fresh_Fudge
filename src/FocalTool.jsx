import { useCallback, useEffect, useRef, useState } from 'react'
import { FLAVORS } from './data/flavors.js'

/**
 * Dev-only framing tool — open the site with `?focal` to use it.
 *
 * Drag a flavor photo inside its frame to choose where the crop sits, then bake
 * the values back into src/data/flavors.js. The two frames per row are the real
 * shapes a photo has to survive: 4/3 is the flavor card, 1/1 is the box slot and
 * picker thumb. Both read the same object-position, so a value has to work in
 * both. Delete this file, its mount in main.jsx, and the vite plugin when done.
 */

const WITH_PHOTOS = FLAVORS.filter((f) => f.img)

const parse = (focal) => {
  const m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(focal ?? '')
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [50, 64]
}
const clamp = (n) => Math.max(0, Math.min(100, n))

function Frame({ src, ratio, label, pos, onDrag }) {
  const boxRef = useRef(null)
  const imgRef = useRef(null)
  const drag = useRef(null)

  const down = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY }
  }

  const move = (e) => {
    if (!drag.current) return
    const box = boxRef.current
    const img = imgRef.current
    if (!box || !img || !img.naturalWidth) return

    // Replicate object-fit: cover to learn how much image hides outside the box.
    const bw = box.clientWidth
    const bh = box.clientHeight
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight)
    const overflowX = img.naturalWidth * scale - bw
    const overflowY = img.naturalHeight * scale - bh

    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current = { x: e.clientX, y: e.clientY }

    // Dragging the photo down reveals what sits above it: a smaller position %.
    onDrag(
      overflowX > 0 ? (-dx / overflowX) * 100 : 0,
      overflowY > 0 ? (-dy / overflowY) * 100 : 0
    )
  }

  const up = (e) => {
    drag.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div className="ft-frameWrap">
      <div
        ref={boxRef}
        className="ft-frame"
        style={{ aspectRatio: ratio }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          style={{ objectPosition: `${pos[0]}% ${pos[1]}%` }}
        />
      </div>
      <span className="ft-frameLabel">{label}</span>
    </div>
  )
}

export default function FocalTool() {
  const [pos, setPos] = useState(() =>
    Object.fromEntries(WITH_PHOTOS.map((f) => [f.id, parse(f.focal)]))
  )
  const [initial] = useState(pos)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const nudge = useCallback((id, dxPct, dyPct) => {
    setPos((p) => {
      const [x, y] = p[id]
      return { ...p, [id]: [clamp(x + dxPct), clamp(y + dyPct)] }
    })
  }, [])

  const set = (id, axis, v) =>
    setPos((p) => {
      const next = [...p[id]]
      next[axis] = clamp(v)
      return { ...p, [id]: next }
    })

  const isDirty = (id) =>
    Math.round(pos[id][0]) !== Math.round(initial[id][0]) ||
    Math.round(pos[id][1]) !== Math.round(initial[id][1])

  const payload = () =>
    Object.fromEntries(
      Object.entries(pos).map(([id, [x, y]]) => [
        id,
        `${Math.round(x)}% ${Math.round(y)}%`,
      ])
    )

  const bake = async () => {
    // This rewrites a source file in a project with no git history, so make it
    // deliberate: a stray pointerup on this button has cost a value before.
    const changed = WITH_PHOTOS.filter((f) => isDirty(f.id))
    if (!changed.length) {
      setStatus('Nothing changed — nothing to bake.')
      return
    }
    const list = changed
      .map((f) => `  ${f.name}: ${Math.round(pos[f.id][1])}%`)
      .join('\n')
    if (!window.confirm(`Write ${changed.length} value(s) to src/data/flavors.js?\n\n${list}`)) {
      setStatus('Cancelled.')
      return
    }

    setBusy(true)
    setStatus('Baking…')
    try {
      const res = await fetch('/__focal-bake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ focal: payload() }),
      })
      const json = await res.json()
      setStatus(res.ok ? `✓ ${json.message}` : `✗ ${json.error ?? 'failed'}`)
    } catch (err) {
      setStatus(`✗ ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payload(), null, 2))
    setStatus('✓ JSON copied to clipboard')
  }

  useEffect(() => {
    const stop = (e) => e.preventDefault()
    document.addEventListener('dragstart', stop)
    return () => document.removeEventListener('dragstart', stop)
  }, [])

  const changedCount = WITH_PHOTOS.filter((f) => isDirty(f.id)).length

  return (
    <main className="ft">
      <header className="ft-bar">
        <div>
          <h1>Flavor photo framing</h1>
          <p>
            Drag a photo to move the crop — down reveals more of the top. Both
            frames share one value, because every place this photo appears reads
            the same object-position.
          </p>
        </div>
        <div className="ft-actions">
          <span className="ft-count">{changedCount} changed</span>
          <button onClick={copy}>Copy JSON</button>
          <button className="ft-primary" onClick={bake} disabled={busy}>
            Bake into flavors.js
          </button>
        </div>
      </header>

      {status && <p className="ft-status">{status}</p>}

      <div className="ft-rows">
        {WITH_PHOTOS.map((f) => {
          const p = pos[f.id]
          return (
            <section className={`ft-row${isDirty(f.id) ? ' is-dirty' : ''}`} key={f.id}>
              <div className="ft-meta">
                <h2>{f.name}</h2>
                <code>
                  {Math.round(p[0])}% {Math.round(p[1])}%
                </code>
                <label>
                  vertical
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(p[1])}
                    onChange={(e) => set(f.id, 1, Number(e.target.value))}
                  />
                </label>
                <label>
                  horizontal
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(p[0])}
                    onChange={(e) => set(f.id, 0, Number(e.target.value))}
                  />
                </label>
                <button
                  className="ft-reset"
                  onClick={() => setPos((s) => ({ ...s, [f.id]: initial[f.id] }))}
                >
                  reset
                </button>
              </div>
              <Frame
                src={f.img}
                ratio="4 / 3"
                label="flavor card (4:3)"
                pos={p}
                onDrag={(dx, dy) => nudge(f.id, dx, dy)}
              />
              <Frame
                src={f.img}
                ratio="1 / 1"
                label="box slot & picker thumb (1:1)"
                pos={p}
                onDrag={(dx, dy) => nudge(f.id, dx, dy)}
              />
            </section>
          )
        })}
      </div>

      <style>{`
        .ft { min-height: 100vh; background: #10121a; color: #eee; max-width: 1200px;
              margin: 0 auto; padding: 24px 20px 80px;
              font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
        .ft h1 { font-family: inherit; font-size: 20px; font-weight: 600; margin: 0 0 4px; color: #fff; }
        .ft h2 { font-family: inherit; font-size: 15px; font-weight: 600; margin: 0 0 6px; color: #fff; }
        .ft p { margin: 0; color: #9aa4b2; max-width: 62ch; }
        .ft-bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 24px;
                  align-items: flex-start; justify-content: space-between;
                  background: #171a24; padding: 16px; border: 1px solid #2a3040;
                  border-radius: 10px; margin-bottom: 16px; }
        .ft-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .ft-count { color: #9aa4b2; font-variant-numeric: tabular-nums; }
        .ft button { background: #242a38; color: #eee; border: 1px solid #39415400;
                     border-color: #394154; border-radius: 6px; padding: 8px 14px;
                     font: inherit; cursor: pointer; }
        .ft button:hover { background: #2e3547; }
        .ft button.ft-primary { background: #2f6feb; border-color: #2f6feb; color: #fff; }
        .ft button.ft-primary:disabled { opacity: .5; cursor: default; }
        .ft-status { margin: 0 0 16px; padding: 10px 14px; background: #171a24;
                     border: 1px solid #2a3040; border-radius: 8px; color: #cfe6ff; }
        .ft-rows { display: flex; flex-direction: column; gap: 14px; }
        .ft-row { display: grid; grid-template-columns: 210px 1fr 1fr; gap: 16px;
                  align-items: start; background: #171a24; border: 1px solid #2a3040;
                  border-radius: 10px; padding: 14px; }
        .ft-row.is-dirty { border-color: #2f6feb; }
        .ft-meta code { display: inline-block; margin-bottom: 10px; color: #ffd479;
                        font-variant-numeric: tabular-nums; }
        .ft-meta label { display: block; font-size: 12px; color: #9aa4b2; margin-bottom: 6px; }
        .ft-meta input { width: 100%; }
        .ft-reset { padding: 4px 10px !important; font-size: 12px; margin-top: 4px; }
        .ft-frameWrap { display: flex; flex-direction: column; gap: 6px; }
        .ft-frame { position: relative; overflow: hidden; border-radius: 6px;
                    background: #000; cursor: grab; touch-action: none; }
        .ft-frame:active { cursor: grabbing; }
        .ft-frame img { width: 100%; height: 100%; object-fit: cover; display: block;
                        user-select: none; -webkit-user-drag: none; }
        .ft-frameLabel { font-size: 12px; color: #9aa4b2; }
        @media (max-width: 900px) { .ft-row { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  )
}
