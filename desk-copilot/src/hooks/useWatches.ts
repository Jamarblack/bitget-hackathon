import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Watch } from '../types'

const LOCAL_KEY = 'plain-money:watches'

function loadLocal(): Watch[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLocal(watches: Watch[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(watches))
}

export function useWatches() {
  const [watches, setWatches] = useState<Watch[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('watches')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) {
          setWatches(
            data.map((d) => ({
              id: d.id,
              ticker: d.ticker,
              timeframe: d.timeframe,
              worryLevel: d.worry_level,
              note: d.note,
              createdAt: d.created_at,
            }))
          )
        }
      } else {
        setWatches(loadLocal())
      }
      setLoading(false)
    }
    load()
  }, [])

  const addWatch = useCallback(async (input: Omit<Watch, 'id' | 'createdAt'>) => {
    const newWatch: Watch = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('watches').insert({
        id: newWatch.id,
        ticker: newWatch.ticker,
        timeframe: newWatch.timeframe,
        worry_level: newWatch.worryLevel,
        note: newWatch.note,
        created_at: newWatch.createdAt,
      })
    }

    setWatches((prev) => {
      const next = [newWatch, ...prev]
      if (!isSupabaseConfigured) saveLocal(next)
      return next
    })
    setActiveId(newWatch.id)
    return newWatch
  }, [])

  const activeWatch = watches.find((w) => w.id === activeId) ?? null

  return { watches, activeWatch, activeId, setActiveId, addWatch, loading }
}