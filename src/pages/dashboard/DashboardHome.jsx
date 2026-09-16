import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCards } from '../../context/CardContext.jsx'
import BusinessCard from '../../components/BusinessCard.jsx'

export default function DashboardHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cards, createCard } = useCards()
  const [tab, setTab] = useState('my-cards')

  // Just open the editor in "new card" mode — no DB row is created until
  // the user actually saves or uploads something.
  const handleAddCard = () => {
    navigate('/dashboard/cards/new')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header — hamburger top-left */}
      <header className="px-6 pt-5 pb-2">
        <button
          className="p-1 -ml-1 text-black"
          aria-label="Open menu"
          onClick={() => navigate('/dashboard/settings')}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      {/* Center content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {tab === 'my-cards' ? (
          cards.length === 0 ? (
            <button onClick={handleAddCard} className="flex flex-col items-center group">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 grid place-items-center group-active:scale-95 transition">
                <PlusIcon className="h-8 w-8 text-black" strokeWidth={1.5} />
              </div>
              <p className="mt-3 text-sm font-bold text-black">Add Card</p>
            </button>
          ) : (
            <div className="w-full max-w-sm">
              <div className="grid gap-4">
                {cards.map((card) => (
                  <div key={card.id} className="relative">
                    {/* "Preview" link above the card → public card view */}
                    <div className="mb-2 flex justify-center text-sm">
                      <Link
                        to={`/c/${card.slug}`}
                        state={{ draft: card }}
                        className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4"
                      >
                        Preview
                      </Link>
                    </div>

                    {/* Card thumbnail → card editor */}
                    <Link to={`/dashboard/cards/${card.id}`}>
                      <BusinessCard card={card} className="hover:shadow-md transition" />
                    </Link>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddCard}
                className="mt-6 mx-auto flex flex-col items-center group"
              >
                <div className="h-16 w-16 rounded-2xl bg-slate-100 grid place-items-center group-active:scale-95 transition">
                  <PlusIcon className="h-8 w-8 text-black" strokeWidth={1.5} />
                </div>
                <p className="mt-3 text-sm font-bold text-black">Add Card</p>
              </button>
            </div>
          )
        ) : (
          <div className="text-center">
            <div className="h-28 w-28 rounded-3xl bg-slate-100 grid place-items-center mx-auto">
              <PlusIcon className="h-12 w-12 text-black" strokeWidth={1.5} />
            </div>
            <p className="mt-5 text-lg font-bold text-black">Share</p>
            <p className="mt-2 text-sm text-slate-500">
              Share options appear here once you have a card.
            </p>
          </div>
        )}
      </main>

      {/* Bottom segmented toggle */}
      <nav className="px-6 pb-8 pt-4">
        <div className="max-w-sm mx-auto bg-slate-100 rounded-xl p-1.5 flex">
          <button
            onClick={() => setTab('my-cards')}
            className={`flex-1 rounded-xl py-4 text-base font-semibold transition ${
              tab === 'my-cards'
                ? 'bg-black text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Cards
          </button>
          <button
            onClick={() => navigate('/dashboard/share')}
            className={`flex-1 rounded-xl py-5 text-base font-semibold transition ${
              tab === 'share'
                ? 'bg-black text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Share
          </button>
        </div>
      </nav>
    </div>
  )
}
