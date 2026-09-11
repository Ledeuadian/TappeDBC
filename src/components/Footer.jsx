export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Tappe. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-800">Privacy</a>
          <a href="#" className="hover:text-slate-800">Terms</a>
          <a href="#" className="hover:text-slate-800">Contact</a>
        </div>
      </div>
    </footer>
  )
}
