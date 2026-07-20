'use client'

import { useState, useEffect, useRef } from 'react'

export interface ScopeOption {
  value: string
  label: string
}

interface Props {
  options: ScopeOption[]
  selected: string
  onChange: (value: string) => void
}

export default function ScopeDropdown({ options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = options.find(o => o.value === selected) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="px-3 py-1.5 text-sm font-medium border transition-colors bg-[#ACE2E1] text-[#3C3C3B] border-[#ACE2E1] flex items-center gap-1.5 whitespace-nowrap"
      >
        {current.label}
        <span className="text-[#3C3C3B]/60 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 shadow-lg min-w-[180px]">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                opt.value === selected ? 'text-[#008DDA] font-medium' : 'text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
