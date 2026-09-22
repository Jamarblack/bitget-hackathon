import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Thesis } from '../types'

const LOCAL_KEY = 'desk-copilot:theses'

function loadLocal(): Thesis[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLocal(theses: Thesis[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(theses))
}

export function useTheses() {
  const [theses, setTheses] = useState<Thesis[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('theses')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) {
          setTheses(
            data.map((d) => ({
              id: d.id,
              ticker: d.ticker,
              timeframe: d.timeframe,
              riskAppetite: d.risk_appetite,
              note: d.note,
              createdAt: d.created_at,
            }))
          )
        }
      } else {
        setTheses(loadLocal())
      }
      setLoading(false)
    }
    load()
  }, [])

  const addThesis = useCallback(
    async (input: Omit<Thesis, 'id' | 'createdAt'>) => {
      const newThesis: Thesis = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }

      if (isSupabaseConfigured && supabase) {
        await supabase.from('theses').insert({
          id: newThesis.id,
          ticker: newThesis.ticker,
          timeframe: newThesis.timeframe,
          risk_appetite: newThesis.riskAppetite,
          note: newThesis.note,
          created_at: newThesis.createdAt,
        })
      }

      setTheses((prev) => {
        const next = [newThesis, ...prev]
        if (!isSupabaseConfigured) saveLocal(next)
        return next
      })
      setActiveId(newThesis.id)
      return newThesis
    },
    []
  )

  const activeThesis = theses.find((t) => t.id === activeId) ?? null

  return { theses, activeThesis, activeId, setActiveId, addThesis, loading }
}