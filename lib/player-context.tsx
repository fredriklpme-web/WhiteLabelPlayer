'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { Track, PlayerState } from '@/types'

interface PlayerContextType extends PlayerState {
  play: (track: Track, queue?: Track[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  prev: () => void
  seek: (pct: number) => void
  setVolume: (vol: number) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
  })

  useEffect(() => {
    const audio = new Audio()
    audio.volume = state.volume
    audioRef.current = audio

    audio.ontimeupdate = () => {
      setState(s => ({ ...s, progress: audio.currentTime, duration: audio.duration || 0 }))
    }
    audio.onended = () => {
      setState(s => {
        const next = s.queueIndex + 1
        if (next < s.queue.length) {
          const nextTrack = s.queue[next]
          audio.src = nextTrack.file_url
          audio.play()
          return { ...s, currentTrack: nextTrack, queueIndex: next, isPlaying: true }
        }
        return { ...s, isPlaying: false }
      })
    }
    return () => { audio.pause(); audio.src = '' }
  }, [])

  const play = useCallback((track: Track, queue: Track[] = [track]) => {
    const audio = audioRef.current!
    const idx = queue.findIndex(t => t.id === track.id)
    audio.src = track.file_url
    audio.play()
    setState(s => ({ ...s, currentTrack: track, queue, queueIndex: idx >= 0 ? idx : 0, isPlaying: true }))
  }, [])

  const pause = useCallback(() => { audioRef.current?.pause(); setState(s => ({ ...s, isPlaying: false })) }, [])
  const resume = useCallback(() => { audioRef.current?.play(); setState(s => ({ ...s, isPlaying: true })) }, [])

  const next = useCallback(() => {
    setState(s => {
      const idx = s.queueIndex + 1
      if (idx >= s.queue.length) return s
      const track = s.queue[idx]
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [])

  const prev = useCallback(() => {
    setState(s => {
      const idx = s.queueIndex - 1
      if (idx < 0) return s
      const track = s.queue[idx]
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [])

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current!
    audio.currentTime = pct * audio.duration
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol
    setState(s => ({ ...s, volume: vol }))
  }, [])

  return (
    <PlayerContext.Provider value={{ ...state, play, pause, resume, next, prev, seek, setVolume }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
