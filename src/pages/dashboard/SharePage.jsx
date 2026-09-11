import { useParams, Link } from 'react-router-dom'
import { useCards } from '../../context/CardContext.jsx'

// Simple inline QR placeholder — replace with a real QR generator lib later.
function QRPlaceholder({ url }) {
  return (
    <div className="h-48 w-48 rounded-xl bg-white border border-slate-200 grid place-items-center text-center p-4">
      <div>
        <div className="text-4xl">▦</div>
        <p className="mt-2 text-[10px] text-slate-500 break-all">{url}</p>
      </div>
    </div>
  )
}

export default function SharePage() {
  const { cardId } = useParams()
  const { getCard } = useCards()
  const card = getCard(cardId)

  if (!card) return <div className="p-10 text-slate-600">Card not found.</div>

  const shareUrl = `${window.location.origin}/c/${card.slug}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    alert('Link copied!')
  }

  return (
    <div className="p-6 sm:p-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Share your card</h1>
      <p className="text-sm text-slate-500 mt-1">{card.name}</p>

      <div className="mt-8 card p-6 flex flex-col sm:flex-row items-center gap-8">
        <QRPlaceholder url={shareUrl} />
        <div className="flex-1 w-full space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Your public link</label>
            <div className="mt-1 flex gap-2">
              <input readOnly className="input" value={shareUrl} />
              <button onClick={copyLink} className="btn-secondary shrink-0">Copy</button>
            </div>
          </div>
          <Link to={`/c/${card.slug}`} target="_blank" className="btn-primary w-full">
            Open public card ↗
          </Link>
        </div>
      </div>
    </div>
  )
}
