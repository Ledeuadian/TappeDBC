import { useEffect, useRef, useState } from 'react'

/**
 * Image position picker — drag the image inside a fixed frame to choose
 * which portion is visible. Saves back the chosen crop as
 *   { x: %, y: %, scale }
 * (`scale` lets the user zoom in/out; defaults to "cover" if untouched.)
 *
 * Returns the chosen crop on Save; null on Cancel.
 */
export default function ImagePositionPicker({ src, initial, onSave, onCancel }) {
  const [pos, setPos] = useState({ x: initial?.x ?? 50, y: initial?.y ?? 50, scale: initial?.scale ?? 1 })
  const draggingRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0, baseX: 50, baseY: 50 })
  const wrapRef = useRef(null)

  // Pointer handlers — drag the underlying image by translating it inside a
  // larger-than-frame canvas (200% wide × 200% tall), then snap to %
  const onPointerDown = (e) => {
    draggingRef.current = true
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!draggingRef.current || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    // Map pixel deltas to percentage of the frame
    const dx = ((e.clientX - startRef.current.x) / rect.width) * 100
    const dy = ((e.clientY - startRef.current.y) / rect.height) * 100
    setPos((p) => ({
      ...p,
      x: clamp(startRef.current.baseX - dx, 0, 100),
      y: clamp(startRef.current.baseY - dy, 0, 100),
    }))
  }

  const onPointerUp = (e) => {
    draggingRef.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return // only zoom when Ctrl/Cmd held, avoids hijacking scroll
    e.preventDefault()
    setPos((p) => ({
      ...p,
      scale: clamp(p.scale + (e.deltaY < 0 ? 0.1 : -0.1), 1, 2.5),
    }))
  }

  // Reset zoom/pan when src changes
  useEffect(() => {
    setPos({ x: initial?.x ?? 50, y: initial?.y ?? 50, scale: initial?.scale ?? 1 })
  }, [src, initial?.x, initial?.y, initial?.scale])

  const imgStyle = {
    // Render the image at 200% so the user can drag it around inside the frame.
    width: '200%',
    height: '200%',
    objectFit: 'cover',
    objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale})`,
    transformOrigin: 'center',
    transition: draggingRef.current ? 'none' : 'transform 0.15s ease',
    cursor: draggingRef.current ? 'grabbing' : 'grab',
    userSelect: 'none',
    pointerEvents: 'none',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <p className="text-white text-sm text-center mb-3">
          Drag to reposition · Hold Ctrl/Cmd + scroll to zoom
        </p>

        {/* The frame — fixed size; image is dragged inside it via object-position */}
        <div
          ref={wrapRef}
          className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-zinc-700"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <img src={src} alt="" draggable={false} style={imgStyle} />
        </div>

        {/* Reset + scale slider */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPos({ x: 50, y: 50, scale: 1 })}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Reset
          </button>
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.05"
            value={pos.scale}
            onChange={(e) =>
              setPos((p) => ({ ...p, scale: clamp(parseFloat(e.target.value), 1, 2.5) }))
            }
            className="flex-1 accent-orange-500"
          />
          <span className="text-xs text-zinc-400 w-10 text-right">
            {Math.round(pos.scale * 100)}%
          </span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-zinc-800 text-white text-sm font-semibold py-3 hover:bg-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(pos)}
            className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold py-3 hover:brightness-110 active:scale-[0.98] transition"
          >
            Save Position
          </button>
        </div>
      </div>
    </div>
  )
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
