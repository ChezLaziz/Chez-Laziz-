import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { trpc } from '@/providers/trpc'

/** Enregistre chaque page vue (hors /admin), une fois par chemin et par session. */
export function useTrackVisit() {
  const location = useLocation()
  const track = trpc.stats.track.useMutation()
  const trackRef = useRef(track.mutate)
  trackRef.current = track.mutate

  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/admin')) return
    const key = `laziz_view:${path}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    trackRef.current({ path })
  }, [location.pathname])
}
