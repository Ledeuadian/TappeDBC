import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { LinkIcon, WifiOffIcon, XIcon, DownloadIcon, MapPinIcon, LoaderCircleIcon } from 'lucide-react'
import { useCards } from '../../context/CardContext.jsx'
import BusinessCard from '../../components/BusinessCard.jsx'
import { buildVCard, collectPhones, collectEmails } from '../../components/OfflineContactQR.jsx'
import { getCurrentPosition, reverseGeocode } from '../../lib/geocode.js'

/**
 * Share page — mirrors the My Cards grid (no "View Preview" link, no
 * delete). For each card it shows two download actions:
 *   • Online QR  — PNG of the public link (`/c/<slug>`).
 *   • Offline QR — pop-up with a vCard QR (name, phone(s), email(s),
 *                  the card's online URL, and a generation-date note)
 *                  that can be downloaded as a PNG.
 */
export default function SharePage() {
  const { cards } = useCards()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 px-6 sm:px-10 pt-5 pb-8 max-w-6xl w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Share</h1>
          <p className="text-sm text-slate-500 mt-1">
            Download a QR for each card — online (link) or offline (vCard).
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <ShareCardItem
              key={card.id}
              card={card}
              onOpenEditor={() => navigate(`/dashboard/cards/${card.id}`)}
            />
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-slate-500">No cards yet — create your first one!</p>
          )}
        </div>
      </main>

      {/* Bottom segmented toggle — same as the Overview page */}
      <nav className="px-6 pb-8 pt-4">
        <div className="max-w-sm mx-auto bg-slate-100 rounded-xl p-1.5 flex">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 rounded-xl py-4 text-base font-semibold transition text-slate-500 hover:text-slate-700"
          >
            My Cards
          </button>
          <button
            className="flex-1 rounded-xl py-5 text-base font-semibold transition bg-black text-white"
          >
            Share
          </button>
        </div>
      </nav>
    </div>
  )
}

/** One tile: card thumbnail + Online / Offline QR download buttons. */
function ShareCardItem({ card, onOpenEditor }) {
  const onlineUrl = `${window.location.origin}/c/${card.slug}`
  const hasOfflinePhones = collectPhones(card).length > 0
  const slug = slugify(card.name)
  const [showOnlineQr, setShowOnlineQr] = useState(false)
  const [showOfflineQr, setShowOfflineQr] = useState(false)

  return (
    <div className="relative group">
      {/* Online + Offline download buttons — top slot, side by side */}
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => setShowOnlineQr(true)}
          title="Show online link QR"
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold border transition active:scale-[0.98] whitespace-nowrap"
          style={{
            background: '#0f172a',
            color: '#ffffff',
            borderColor: '#0f172a',
          }}
        >
          <LinkIcon className="h-4 w-4 shrink-0" />
          Online QR
        </button>
        <button
          type="button"
          onClick={() => hasOfflinePhones && setShowOfflineQr(true)}
          disabled={!hasOfflinePhones}
          title={hasOfflinePhones ? 'Show offline contact QR' : 'Add a phone number to enable offline sharing.'}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold border transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            background: hasOfflinePhones ? '#0f172a' : '#f8fafc',
            color: hasOfflinePhones ? '#ffffff' : '#64748b',
            borderColor: hasOfflinePhones ? '#0f172a' : '#e2e8f0',
          }}
        >
          <WifiOffIcon className="h-4 w-4 shrink-0" />
          Offline QR
        </button>
      </div>

      {/* Card thumbnail — clicking opens the editor, just like My Cards */}
      <button
        type="button"
        onClick={onOpenEditor}
        className="block w-full text-left"
        aria-label={`Edit ${card.name || 'card'}`}
      >
        <BusinessCard card={card} className="group-hover:shadow-md transition" />
      </button>

      {/* Online QR pop-up — previews the QR encoding the card's public
          URL, with a download option. */}
      {showOnlineQr && (
        <OnlineQrModal
          card={card}
          onlineUrl={onlineUrl}
          canvasId={`qr-online-${card.id}`}
          filename={`${slug}-online-qr.png`}
          onClose={() => setShowOnlineQr(false)}
        />
      )}

      {/* Offline QR pop-up — captures date-time + this device's location
          on generate, embeds both into the vCard NOTE, then offers the
          QR preview + download. */}
      {showOfflineQr && (
        <OfflineQrModal
          card={card}
          onlineUrl={onlineUrl}
          canvasId={`qr-offline-${card.id}`}
          filename={`${slug}-offline-qr.png`}
          onClose={() => setShowOfflineQr(false)}
        />
      )}
    </div>
  )
}

/** Pop-up that previews the online QR (the card's public URL) and lets
 *  the owner download it as a PNG. */
function OnlineQrModal({ card, onlineUrl, canvasId, filename, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="relative w-full max-w-xs rounded-2xl p-6 text-center bg-white border border-slate-200 shadow-xl">
        {/* Close button — top-right */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <h3 className="text-base font-bold text-slate-900">{card.name || 'Online QR'}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Scanning opens this card's public page
        </p>

        {/* QR preview — SVG for crisp rendering in the pop-up itself */}
        <div className="mt-4 mx-auto w-fit p-3 rounded-2xl bg-white border border-slate-200">
          <QRCodeSVG value={onlineUrl} size={200} level="M" marginSize={0} />
        </div>

        {/* The encoded URL */}
        <p className="mt-3 text-[11px] text-slate-400 break-all">{onlineUrl}</p>

        {/* Hidden 512px canvas used for the PNG download */}
        <div className="sr-only" aria-hidden="true">
          <QRCodeCanvas id={canvasId} value={onlineUrl} size={512} level="M" includeMargin />
        </div>

        <DownloadButton
          canvasId={canvasId}
          filename={filename}
          label="Download QR"
          icon={<DownloadIcon className="h-4 w-4 shrink-0" />}
          full
        />
      </div>
    </div>
  )
}

/**
 * Offline QR pop-up. Two states:
 *   1. 'generate' — asks the user for geolocation, then builds the vCard
 *      with the CURRENT date-time and THIS device's location embedded.
 *   2. 'ready'    — shows the QR preview + Download button.
 */
function OfflineQrModal({ card, onlineUrl, canvasId, filename, onClose }) {
  // 'generate' | 'locating' | 'ready'
  const [step, setStep] = useState('generate')
  // Embedded stamps: { when: <ISO-ish date-time>, where: <address or coords> }
  const [stamps, setStamps] = useState(null)
  const [locDenied, setLocDenied] = useState(false)

  const handleGenerate = async () => {
    setStep('locating')
    const when = new Date()

    // Ask the browser for THIS device's location (prompts the user).
    const coords = await getCurrentPosition()

    let where = null
    if (coords) {
      // Reverse-geocode to a structured address. Falls back to raw
      // lat/lng if both providers fail (sparse area, blocked, etc.).
      const geo = await reverseGeocode(coords.lat, coords.lng)
      where = geo.formatted || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
    } else {
      setLocDenied(true)
    }

    setStamps({
      when: when.toLocaleString(),
      where,
    })
    setStep('ready')
  }

  // vCard payload — name, company, job title, phone(s), email(s),
  // online URL, and the date-time + location captured at generation
  // time on this device.
  const vcard = buildVCard({
    name: card.name || '',
    company: card.company || '',
    title: card.title || '',
    phones: collectPhones(card),
    emails: collectEmails(card),
    url: onlineUrl,
    note: stamps
      ? [
          `Meeting date/time: ${stamps.when}`,
          stamps.where ? `Meeting location: ${stamps.where}` : null,
        ]
          .filter(Boolean)
          .join('\\n')
      : '',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="relative w-full max-w-xs rounded-2xl p-6 text-center bg-white border border-slate-200 shadow-xl">
        {/* Close button — top-right */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <h3 className="text-base font-bold text-slate-900">{card.name || 'Offline QR'}</h3>

        {step === 'generate' && (
          <>
            <p className="mt-1 text-xs text-slate-500">
              This will embed today's date-time and your current location into the QR.
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Your browser will ask for location permission. Denying it is fine — the QR just won't include an address.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full mt-5 rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white active:scale-[0.98] transition"
            >
              Generate Offline QR
            </button>
          </>
        )}

        {step === 'locating' && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <LoaderCircleIcon className="h-6 w-6 animate-spin text-slate-400" />
            <p className="text-xs text-slate-500">Capturing date-time &amp; location…</p>
          </div>
        )}

        {step === 'ready' && (
          <>
            <p className="mt-1 text-xs text-slate-500">
              Scan to save the contact — works without internet
            </p>

            {/* QR preview — SVG for crisp rendering in the pop-up itself */}
            <div className="mt-4 mx-auto w-fit p-3 rounded-2xl bg-white border border-slate-200">
              <QRCodeSVG value={vcard} size={200} level="M" marginSize={0} />
            </div>

            {/* What's embedded */}
            <div className="mt-3 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center justify-center gap-1">
                <MapPinIcon className="h-3 w-3 shrink-0" />
                {locDenied
                  ? 'Location not included (permission denied)'
                  : stamps.where || 'Location unavailable'}
              </p>
              <p>{stamps.when}</p>
              <p>
                Includes name, phone{collectEmails(card).length > 0 ? ', email' : ''}, and this card's online link
              </p>
            </div>

            {/* Hidden 512px canvas used for the PNG download */}
            <div className="sr-only" aria-hidden="true">
              <QRCodeCanvas id={canvasId} value={vcard} size={512} level="M" includeMargin />
            </div>

            <DownloadButton
              canvasId={canvasId}
              filename={filename}
              label="Download QR"
              icon={<DownloadIcon className="h-4 w-4 shrink-0" />}
              full
            />
          </>
        )}
      </div>
    </div>
  )
}

/** Triggers a PNG download from a hidden <canvas> rendered by qrcode.react. */
function DownloadButton({ canvasId, filename, label, icon, disabled, disabledReason, full = false }) {
  const onClick = () => {
    if (!canvasId) return
    const canvas = document.getElementById(canvasId)
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : label}
      className={`${full ? 'w-full mt-4' : 'flex-1 min-w-0'} inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold border transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
      style={{
        background: disabled ? '#f8fafc' : '#0f172a',
        color: disabled ? '#64748b' : '#ffffff',
        borderColor: disabled ? '#e2e8f0' : '#0f172a',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function slugify(s) {
  return (
    String(s || 'card')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'card'
  )
}
