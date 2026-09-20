import { Link, useNavigate } from 'react-router-dom'
import { useCards } from '../../context/CardContext.jsx'
import BusinessCard from '../../components/BusinessCard.jsx'

export default function MyCardsPage() {
  const { cards, createCard, deleteCard } = useCards()
  const navigate = useNavigate()

  return (
    <div className="p-6 sm:p-10 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My cards</h1>
          <p className="text-sm text-slate-500 mt-1">All your digital business cards.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => createCard({ name: 'New card', title: '', company: '', theme: 'violet' })}
        >
          + New card
        </button>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.id} className="relative group">
            {/* "Preview" link above the card → public card view */}
            <div className="mb-2 flex justify-center text-sm">
              <button
                type="button"
                onClick={() => navigate(`/c/${card.slug}`, { state: { draft: card } })}
                className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 active:scale-95 transition"
              >
                Preview
              </button>
            </div>

            {/* Card thumbnail → card editor */}
            <Link
              to={`/dashboard/cards/${card.id}`}
              className="block rounded-2xl p-[3px] shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)] hover:shadow-[0_0_80px_-10px_rgba(255,255,255,0.55)] transition"
            >
              <BusinessCard card={card} className="group-hover:shadow-none transition-shadow" />
            </Link>

            {/* Delete on hover — bottom-right */}
            <button
              onClick={() => deleteCard(card.id)}
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg bg-white/90 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition"
            >
              Delete
            </button>
          </div>
        ))}
        {cards.length === 0 && (
          <p className="text-sm text-slate-500">No cards yet — create your first one!</p>
        )}
      </div>
    </div>
  )
}
