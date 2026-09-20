import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { appOrigin } from '../../lib/appUrl.js'

/** Canonical invite URL + message */
const getInviteUrl = () => appOrigin()
const getInviteText = (url) => `Check out Tappe — digital business cards: ${url}`

// Tappe's official social share pages. These are universal links: on a phone they
// open the native Facebook / Instagram app automatically, and on desktop they load
// in the browser.
const FACEBOOK_SHARE_URL = 'https://www.facebook.com/share/19cRbZWgGh/?mibextid=wwXIfr'
const INSTAGRAM_SHARE_URL = 'https://www.instagram.com/get.tappe?stkn=ajM2M3VidGw1MGI1&utm_source=qr'

const buildShareLink = (platform) => {
  const url = getInviteUrl()
  const text = getInviteText(url)
  const enc = encodeURIComponent
  switch (platform) {
    case 'messenger':
      return `https://m.me/share?link=${enc(url)}&text=${enc(text)}`
    case 'whatsapp':
      return `https://wa.me/?text=${enc(text)}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`
    case 'facebook':
      return FACEBOOK_SHARE_URL
    case 'instagram':
      return INSTAGRAM_SHARE_URL
    case 'sms':
      return `sms:?&body=${enc(text)}`
    case 'email':
      return `mailto:?subject=${enc('Tappe — Digital Business Cards')}&body=${enc(text)}`
    default:
      return url
  }
}

// Inline icons — keep stroke currentColor so parent color drives them
const IconBack = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconQr = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <line x1="14" y1="14" x2="14" y2="17" />
    <line x1="14" y1="20" x2="17" y2="20" />
    <line x1="17" y1="14" x2="17" y2="17" />
    <line x1="20" y1="14" x2="20" y2="17" />
    <line x1="17" y1="17" x2="20" y2="17" />
  </svg>
)

const IconLink = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IconCheck = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-600">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconDots = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

export default function InviteFriendsPage() {
  const navigate = useNavigate()
  const [qrOpen, setQrOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteUrl())
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  const handleMoreOptions = async () => {
    const url = getInviteUrl()
    const text = getInviteText(url)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Tappe', text, url })
        return
      }
      await handleCopyLink()
    } catch {
      // user cancelled share — no-op
    }
  }

  return (
    <div className="p-6 sm:p-10 max-w-2xl">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          aria-label="Back to settings"
        >
          {IconBack}
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invite friends</h1>
          <p className="text-sm text-slate-500">Share Tappe with others</p>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        {/* 1. Scan QR Code */}
        <button
          onClick={() => setQrOpen(true)}
          className="w-full flex items-center gap-4 px-6 py-5 border-b border-slate-200 text-left hover:bg-slate-50 transition"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Scan QR Code</p>
            <p className="text-sm text-slate-500">Show a scannable invite</p>
          </div>
          <span className="text-slate-500" aria-hidden>{IconQr}</span>
        </button>

        {/* 2. Copy Link */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-4 px-6 py-5 border-b border-slate-200 text-left hover:bg-slate-50 transition"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Copy Link</p>
            <p className="text-sm text-slate-500">
              {linkCopied ? 'Link copied!' : 'Copy invite link to clipboard'}
            </p>
          </div>
          <span className="text-slate-500" aria-hidden>
            {linkCopied ? IconCheck : IconLink}
          </span>
        </button>

        {/* 3–7. Branded share group (one framed section) */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col divide-y divide-slate-200">
            {[
              { id: 'messenger', label: 'Messenger', logo: '/logos/Messenger.png' },
              { id: 'whatsapp',  label: 'WhatsApp',  logo: '/logos/Whatsapp.png' },
              { id: 'linkedin',  label: 'LinkedIn',  logo: '/logos/Linkedin.png' },
              { id: 'facebook',  label: 'Facebook',  logo: '/logos/Facebook.png' },
              { id: 'instagram', label: 'Instagram', logo: '/logos/Instagram.png' },
              { id: 'sms',       label: 'Messages',  logo: '/logos/Phone.png' },
              { id: 'email',     label: 'Email',     logo: '/logos/Email.png' },
            ].map((s) => (
              <a
                key={s.id}
                href={buildShareLink(s.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 group"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 group-hover:shadow-md transition">
                  <img
                    src={s.logo}
                    alt={s.label}
                    className="h-6 w-6 object-contain"
                    loading="lazy"
                  />
                </span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  {s.label}
                </span>
                <span className="ml-auto text-slate-400" aria-hidden>→</span>
              </a>
            ))}
          </div>
        </div>

        {/* 8. More Options */}
        <button
          onClick={handleMoreOptions}
          className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-slate-50 transition"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">More Options</p>
            <p className="text-sm text-slate-500">Use system share sheet</p>
          </div>
          <span className="text-slate-500" aria-hidden>{IconDots}</span>
        </button>
      </div>

      {/* QR Code modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div
            className="card w-full max-w-sm p-6 flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="qr-modal-title" className="text-lg font-bold text-slate-900">
              Scan to join Tappe
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Point your phone camera at the code
            </p>
            <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200">
              <QRCodeSVG value={getInviteUrl()} size={200} level="M" />
            </div>
            <button
              onClick={() => setQrOpen(false)}
              className="mt-6 w-full rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
