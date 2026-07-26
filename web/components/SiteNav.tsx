'use client'

import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'market-prices',   label: 'Market Prices' },
  { id: 'generation-mix',  label: 'Generation Mix' },
  { id: 'renewables',      label: 'Renewables & Prices' },
  { id: 'capture-prices',  label: 'Capture Prices' },
  { id: 'data-export',     label: 'Data Export' },
] as const

export default function SiteNav() {
  const [active, setActive] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show nav once user scrolls past 120px
    function onScroll() { setVisible(window.scrollY > 120) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`sticky top-0 z-50 transition-all duration-200 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
    }`}>
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-11">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest shrink-0 hidden sm:block">
            DE-LU Power
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  active === id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
