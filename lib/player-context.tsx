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
  repeat: boolean
  toggleRepeat: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [repeat, setRepeat] = useState(false)
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
  })

  // Refs för att hålla färska värden inuti callbacks
  const stateRef = useRef(state)
  stateRef.current = state
  const repeatRef = useRef(repeat)
  repeatRef.current = repeat

  const updateMediaSession = useCallback((track: Track, playing: boolean) => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: (track as any).album?.title ?? 'White Label Player',
      album: 'White Label Player',
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.volume = state.volume
    audioRef.current = audio

    audio.ontimeupdate = () => {
      setState(s => ({ ...s, progress: audio.currentTime, duration: audio.duration || 0 }))
      if ('mediaSession' in navigator && audio.duration) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          })
        } catch {}
      }
    }

    audio.onended = () => {
      const s = stateRef.current
      const r = repeatRef.current
      if (r) {
        // Upprepa samma låt
        audio.currentTime = 0
        audio.play()
        return
      }
      const next = s.queueIndex + 1
      if (next < s.queue.length) {
        const nextTrack = s.queue[next]
        audio.src = nextTrack.file_url
        audio.play()
        setState(prev => ({ ...prev, currentTrack: nextTrack, queueIndex: next, isPlaying: true }))
        updateMediaSession(nextTrack, true)
      } else {
        // Börja om från början om continuous play
        if (s.queue.length > 1) {
          const firstTrack = s.queue[0]
          audio.src = firstTrack.file_url
          audio.play()
          setState(prev => ({ ...prev, currentTrack: firstTrack, queueIndex: 0, isPlaying: true }))
          updateMediaSession(firstTrack, true)
        } else {
          setState(prev => ({ ...prev, isPlaying: false }))
        }
      }
    }

    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Sätt upp Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const handlePlay = () => { audioRef.current?.play(); setState(s => ({ ...s, isPlaying: true })) }
    const handlePause = () => { audioRef.current?.pause(); setState(s => ({ ...s, isPlaying: false })) }
    const handleNext = () => {
      const s = stateRef.current
      const idx = s.queueIndex + 1
      if (idx >= s.queue.length) return
      const track = s.queue[idx]
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      setState(prev => ({ ...prev, currentTrack: track, queueIndex: idx, isPlaying: true }))
      updateMediaSession(track, true)
    }
    const handlePrev = () => {
      const s = stateRef.current
      // Om > 3 sekunder in – starta om låten
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0
        return
      }
      const idx = s.queueIndex - 1
      if (idx < 0) return
      const track = s.queue[idx]
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      setState(prev => ({ ...prev, currentTrack: track, queueIndex: idx, isPlaying: true }))
      updateMediaSession(track, true)
    }
    const handleSeek = (details: MediaSessionActionDetails) => {
      if (audioRef.current && details.seekTime !== undefined) {
        audioRef.current.currentTime = details.seekTime
      }
    }

    navigator.mediaSession.setActionHandler('play', handlePlay)
    navigator.mediaSession.setActionHandler('pause', handlePause)
    navigator.mediaSession.setActionHandler('nexttrack', handleNext)
    navigator.mediaSession.setActionHandler('previoustrack', handlePrev)
    navigator.mediaSession.setActionHandler('seekto', handleSeek)

    return () => {
      ['play', 'pause', 'nexttrack', 'previoustrack', 'seekto'].forEach(action => {
        try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, null) } catch {}
      })
    }
  }, [])

  const play = useCallback((track: Track, queue: Track[] = [track]) => {
    const audio = audioRef.current!
    const idx = queue.findIndex(t => t.id === track.id)
    audio.src = track.file_url
    audio.play()
    setState(s => ({ ...s, currentTrack: track, queue, queueIndex: idx >= 0 ? idx : 0, isPlaying: true }))
    updateMediaSession(track, true)
  }, [updateMediaSession])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setState(s => ({ ...s, isPlaying: false }))
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play()
    setState(s => ({ ...s, isPlaying: true }))
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
  }, [])

  const next = useCallback(() => {
    setState(s => {
      const idx = s.queueIndex + 1
      if (idx >= s.queue.length) return s
      const track = s.queue[idx]
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      updateMediaSession(track, true)
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [updateMediaSession])

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    setState(s => {
      const idx = s.queueIndex - 1
      if (idx < 0) return s
      const track = s.queue[idx]
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      updateMediaSession(track, true)
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [updateMediaSession])

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current!
    audio.currentTime = pct * audio.duration
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol
    setState(s => ({ ...s, volume: vol }))
  }, [])

  const toggleRepeat = useCallback(() => setRepeat(r => !r), [])

  return (
    <PlayerContext.Provider value={{ ...state, play, pause, resume, next, prev, seek, setVolume, repeat, toggleRepeat }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
