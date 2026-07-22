'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

export default function SearchableSelect({ label, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(opt: string) {
    onChange(opt)
    setOpen(false)
    setQuery('')
  }

  const filteredOptions = query.trim()
    ? options.filter(opt => opt.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const buttonLabel = value === 'all' ? `All ${label}` : value

  if (options.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white flex items-center gap-1.5 whitespace-nowrap ${
          value !== 'all' ? 'border-[#008DDA] text-[#008DDA]' : 'border-slate-300 text-slate-700'
        }`}
      >
        {buttonLabel}
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg min-w-[180px] max-h-72 overflow-y-auto">
          {options.length > 6 && (
            <div className="sticky top-0 bg-white px-2 py-1.5 border-b border-slate-100">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full text-sm px-2 py-1 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA]"
              />
            </div>
          )}
          <div
            onClick={() => select('all')}
            className={`px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm ${value === 'all' ? 'font-medium text-[#008DDA]' : 'text-slate-700'}`}
          >
            All {label}
          </div>
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
          )}
          {filteredOptions.map(opt => (
            <div
              key={opt}
              onClick={() => select(opt)}
              className={`px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm ${value === opt ? 'font-medium text-[#008DDA]' : 'text-slate-700'}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
