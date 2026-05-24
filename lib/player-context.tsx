'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { Track, PlayerState } from '@/types'
import { getNormalizedVolume } from '@/lib/loudness'

export type MasterPreset = 'off' | 'clean' | 'warm' | 'loud' | 'bright'

interface PlayerContextType extends PlayerState {
  play: (track: Track, queue?: Track[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  prev: () => void
  seek: (pct: number) => void
  setVolume: (vol: number) => void
  repeat: boolean
  toggleRepeat: () => void
  masterPreset: MasterPreset
  setMasterPreset: (preset: MasterPreset) => void
  normalize: boolean
  toggleNormalize: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

const BASE_VOLUME = 0.8

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [repeat, setRepeat] = useState(false)
  const [normalize, setNormalize] = useState(true)
  const [masterPreset, setMasterPresetState] = useState<MasterPreset>('off')
  const [state, setState] = useState<PlayerState>({
    currentTrack: null, queue: [], queueIndex: 0,
    isPlaying: false, progress: 0, duration: 0, volume: BASE_VOLUME,
  })

  const stateRef = useRef(state)
  stateRef.current = state
  const repeatRef = useRef(repeat)
  repeatRef.current = repeat
  const normalizeRef = useRef(normalize)
  normalizeRef.current = normalize

  const updateMediaSession = useCallback((track: Track, playing: boolean) => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: (track as any).album?.title ?? 'White Label Player',
      album: 'White Label Player',
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [])

  // Normalisera volume för en låt asynkront
  const applyNormalization = useCallback(async (track: Track) => {
    const audio = audioRef.current
    if (!audio || !normalizeRef.current) return
    try {
      const vol = await getNormalizedVolume(track.file_url, track.id, BASE_VOLUME)
      // Kontrollera att samma låt fortfarande spelas
      if (audioRef.current?.src.includes(encodeURIComponent(track.title)) ||
          stateRef.current.currentTrack?.id === track.id) {
        audioRef.current!.volume = vol
      }
    } catch {
      // Ignorera fel – behåll nuvarande volym
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.volume = BASE_VOLUME
    audioRef.current = audio

    audio.ontimeupdate = () => {
      setState(s => ({ ...s, progress: audio.currentTime, duration: audio.duration || 0 }))
      if ('mediaSession' in navigator && audio.duration) {
        try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: 1, position: audio.currentTime }) } catch {}
      }
    }

    audio.onended = () => {
      const s = stateRef.current
      if (repeatRef.current) { audio.currentTime = 0; audio.play(); return }
      const nextIdx = s.queueIndex + 1
      const loopTo = nextIdx < s.queue.length ? nextIdx : 0
      const nextTrack = s.queue[loopTo]
      if (nextTrack) {
        audio.volume = BASE_VOLUME // Återställ volym före normalisering
        audio.src = nextTrack.file_url
        audio.play()
        setState(prev => ({ ...prev, currentTrack: nextTrack, queueIndex: loopTo, isPlaying: true }))
        updateMediaSession(nextTrack, true)
        setMasterPresetState(((nextTrack as any).master_preset ?? 'off') as MasterPreset)
        applyNormalization(nextTrack)
      } else {
        setState(prev => ({ ...prev, isPlaying: false }))
      }
    }

    return () => { audio.pause(); audio.src = '' }
  }, [applyNormalization])

  // Media Session handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play()
      setState(s => ({ ...s, isPlaying: true }))
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause()
      setState(s => ({ ...s, isPlaying: false }))
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const s = stateRef.current
      const idx = (s.queueIndex + 1) % Math.max(s.queue.length, 1)
      const track = s.queue[idx]
      if (!track) return
      audioRef.current!.volume = BASE_VOLUME
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      setState(prev => ({ ...prev, currentTrack: track, queueIndex: idx, isPlaying: true }))
      updateMediaSession(track, true)
      applyNormalization(track)
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0; return
      }
      const s = stateRef.current
      const idx = Math.max(0, s.queueIndex - 1)
      const track = s.queue[idx]
      if (!track) return
      audioRef.current!.volume = BASE_VOLUME
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      setState(prev => ({ ...prev, currentTrack: track, queueIndex: idx, isPlaying: true }))
      updateMediaSession(track, true)
      applyNormalization(track)
    })
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (audioRef.current && d.seekTime !== undefined) audioRef.current.currentTime = d.seekTime
    })
  }, [applyNormalization])

  const play = useCallback((track: Track, queue: Track[] = [track]) => {
    const audio = audioRef.current!
    const idx = queue.findIndex(t => t.id === track.id)
    audio.volume = BASE_VOLUME // Återställ alltid före normalisering
    audio.src = track.file_url
    audio.play().catch(e => console.warn('Play error:', e))
    setState(s => ({ ...s, currentTrack: track, queue, queueIndex: idx >= 0 ? idx : 0, isPlaying: true }))
    updateMediaSession(track, true)
    setMasterPresetState(((track as any).master_preset ?? 'off') as MasterPreset)
    applyNormalization(track)
  }, [updateMediaSession, applyNormalization])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setState(s => ({ ...s, isPlaying: false }))
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {})
    setState(s => ({ ...s, isPlaying: true }))
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
  }, [])

  const next = useCallback(() => {
    setState(s => {
      const idx = (s.queueIndex + 1) % Math.max(s.queue.length, 1)
      const track = s.queue[idx]
      if (!track) return s
      audioRef.current!.volume = BASE_VOLUME
      audioRef.current!.src = track.file_url
      audioRef.current!.play().catch(() => {})
      updateMediaSession(track, true)
      setMasterPresetState(((track as any).master_preset ?? 'off') as MasterPreset)
      applyNormalization(track)
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [updateMediaSession, applyNormalization])

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0; return
    }
    setState(s => {
      const idx = Math.max(0, s.queueIndex - 1)
      const track = s.queue[idx]
      if (!track) return s
      audioRef.current!.volume = BASE_VOLUME
      audioRef.current!.src = track.file_url
      audioRef.current!.play().catch(() => {})
      updateMediaSession(track, true)
      setMasterPresetState(((track as any).master_preset ?? 'off') as MasterPreset)
      applyNormalization(track)
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [updateMediaSession, applyNormalization])

  const seek = useCallback((pct: number) => {
    if (audioRef.current) audioRef.current.currentTime = pct * (audioRef.current.duration || 0)
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol
    setState(s => ({ ...s, volume: vol }))
  }, [])

  const toggleRepeat = useCallback(() => setRepeat(r => !r), [])

  const toggleNormalize = useCallback(() => {
    setNormalize(n => {
      const next = !n
      normalizeRef.current = next
      if (!next && audioRef.current) {
        // Stäng av – återställ till basvolym
        audioRef.current.volume = BASE_VOLUME
      } else if (next && stateRef.current.currentTrack) {
        // Sätt på – normalisera nuvarande låt
        applyNormalization(stateRef.current.currentTrack)
      }
      return next
    })
  }, [applyNormalization])

  const setMasterPreset = useCallback((preset: MasterPreset) => {
    setMasterPresetState(preset)
  }, [])

  return (
    <PlayerContext.Provider value={{
      ...state, play, pause, resume, next, prev, seek, setVolume,
      repeat, toggleRepeat,
      masterPreset, setMasterPreset,
      normalize, toggleNormalize,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
