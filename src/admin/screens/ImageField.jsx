import { useEffect, useRef, useState } from 'react'
import { backend } from '../backend/adapter.js'
import Icon from '../ui/Icon.jsx'
import Button from '../ui/Button.jsx'

/**
 * The flavor photo: upload a new one, or reuse one already on the site.
 *
 * Two halves because the client needs both. Most of the time they're pointing a
 * flavor at a photo that already exists in public/images/flavors/, which is a
 * picker, not an upload. When they've shot something new, it's a drop target.
 *
 * The third control is framing. The public flavor card crops a 4:3 window out
 * of a tall photo, so an un-framed upload gets sliced through the middle. The
 * preview here is the same 4:3 window, and clicking it sets the point that
 * stays in view — the same `focal` value the site reads.
 */

const NUDGE = 5

function clampPercent(n) {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function parseFocal(focal) {
  const [x, y] = String(focal || '50% 50%')
    .split(' ')
    .map((part) => Number.parseFloat(part))
  return {
    x: Number.isFinite(x) ? clampPercent(x) : 50,
    y: Number.isFinite(y) ? clampPercent(y) : 50,
  }
}

export default function ImageField({ value, focal, onChange, onFocalChange, alt }) {
  const [library, setLibrary] = useState([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const point = parseFocal(focal)

  useEffect(() => {
    if (!libraryOpen || library.length) return
    let cancelled = false
    backend.media
      .library()
      .then((list) => !cancelled && setLibrary(list))
      .catch(() => !cancelled && setError("Couldn't load the photo library."))
    return () => {
      cancelled = true
    }
  }, [libraryOpen, library.length])

  const handleFiles = async (files) => {
    const file = files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { url } = await backend.media.upload(file)
      onChange(url)
      // A fresh photo has never been framed, so start from centre rather than
      // inheriting the last photo's crop.
      onFocalChange('50% 50%')
    } catch (err) {
      setError(err?.message || "That photo couldn't be uploaded.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const setFocalFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = clampPercent(((e.clientX - rect.left) / rect.width) * 100)
    const y = clampPercent(((e.clientY - rect.top) / rect.height) * 100)
    onFocalChange(`${x}% ${y}%`)
  }

  const nudge = (e) => {
    const moves = {
      ArrowLeft: [-NUDGE, 0],
      ArrowRight: [NUDGE, 0],
      ArrowUp: [0, -NUDGE],
      ArrowDown: [0, NUDGE],
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    onFocalChange(`${clampPercent(point.x + move[0])}% ${clampPercent(point.y + move[1])}%`)
  }

  return (
    <div className="imagefield">
      <div className="field__top">
        <span className="field__label" id="photo-label">
          Photo
        </span>
        {value ? (
          <span className="field__counter">
            Framing {point.x}% {point.y}%
          </span>
        ) : null}
      </div>

      <div className="imagefield__main">
        <div
          className={`imagefield__stage${dragging ? ' is-dragging' : ''}${
            uploading ? ' is-uploading' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
        >
          {value ? (
            <button
              type="button"
              className="imagefield__preview"
              onClick={setFocalFromEvent}
              onKeyDown={nudge}
              aria-labelledby="photo-label"
              aria-describedby="photo-framing-hint"
            >
              <img src={value} alt={alt} style={{ objectPosition: `${point.x}% ${point.y}%` }} />
              <span
                className="imagefield__crosshair"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                aria-hidden="true"
              />
            </button>
          ) : (
            <div className="imagefield__placeholder">
              <Icon name="image" size={24} />
              <p>
                <strong>Drop a photo here</strong>
                <span>or use the buttons</span>
              </p>
            </div>
          )}

          {uploading ? (
            <div className="imagefield__busy" role="status">
              <span className="btn__spinner" aria-hidden="true" />
              <span>Adding photo…</span>
            </div>
          ) : null}

          {dragging ? (
            <div className="imagefield__dropzone" aria-hidden="true">
              <Icon name="upload" size={24} />
              <span>Drop to upload</span>
            </div>
          ) : null}
        </div>

        <div className="imagefield__side">
          <div className="imagefield__actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="visually-hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              size="sm"
              icon="upload"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              Upload
            </Button>
            <Button
              size="sm"
              icon="image"
              iconEnd={libraryOpen ? 'chevronDown' : undefined}
              onClick={() => setLibraryOpen((v) => !v)}
              aria-expanded={libraryOpen}
              disabled={uploading}
            >
              Choose existing
            </Button>
            {value ? (
              <Button
                size="sm"
                variant="quiet"
                icon="trash"
                onClick={() => {
                  onChange('')
                  setError('')
                }}
                disabled={uploading}
              >
                Remove
              </Button>
            ) : null}
          </div>

          <p className="field__hint" id="photo-framing-hint">
            {value
              ? 'Click the photo to set what stays in view when the site crops it. Arrow keys nudge it.'
              : 'Cards on the site crop to this shape. Around 1400px on the long edge works well.'}
          </p>

          {error ? (
            <p className="field__error" role="alert">
              <Icon name="alert" size={15} />
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {libraryOpen ? (
        <div className="library">
          <p className="library__note">
            {library.length
              ? `${library.length} photos already on the site.`
              : 'Loading photos…'}
          </p>
          <ul className="library__grid">
            {library.map((src) => {
              const selected = src === value
              return (
                <li key={src}>
                  <button
                    type="button"
                    className={`library__item${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onChange(src)
                      setError('')
                      setLibraryOpen(false)
                    }}
                    aria-pressed={selected}
                    title={decodeURIComponent(src.split('/').pop())}
                  >
                    <img src={src} alt="" loading="lazy" width="160" height="120" />
                    {selected ? (
                      <span className="library__check" aria-hidden="true">
                        <Icon name="check" size={14} strokeWidth={2.5} />
                      </span>
                    ) : null}
                    <span className="visually-hidden">
                      {decodeURIComponent(src.split('/').pop())}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
