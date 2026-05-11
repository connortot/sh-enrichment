'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  label: string
  options: string[]
  selected: string[]
  onChange: (value: string[]) => void
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const buttonLabel =
    selected.length === 0 ? `All ${label}`
    : selected.length === 1 ? selected[0]
    : `${selected.length} ${label} selected`

  if (options.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white flex items-center gap-1.5 whitespace-nowrap ${
          selected.length > 0 ? 'border-[#008DDA] text-[#008DDA]' : 'border-slate-300 text-slate-700'
        }`}
      >
        {buttonLabel}
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg min-w-[180px] max-h-60 overflow-y-auto">
          {selected.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-100">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear all
              </button>
            </div>
          )}
          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-[#008DDA]"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
