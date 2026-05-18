'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { Track, PlayerState } from '@/types'
import { getMasterChain, MasterPreset } from '@/lib/audio-master'
import { getNormalizedGain } from '@/lib/loudness'

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
  analyzing: boolean
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chainRef = useRef<ReturnType<typeof getMasterChain> | null>(null)
  const [repeat, setRepeat] = useState(false)
  const [normalize, setNormalize] = useState(true) // På som standard
  const [analyzing, setAnalyzing] = useState(false)
  const [masterPreset, setMasterPresetState] = useState<MasterPreset>('off')
  const [state, setState] = useState<PlayerState>({
    currentTrack: null, queue: [], queueIndex: 0,
    isPlaying: false, progress: 0, duration: 0, volume: 0.8,
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

  const initChain = useCallback(() => {
    if (!audioRef.current || chainRef.current) return
    try { chainRef.current = getMasterChain(audioRef.current) } catch (e) { console.warn('Audio chain:', e) }
  }, [])

  // Analysera och normalisera en låt
  const applyNormalization = useCallback(async (track: Track) => {
    if (!normalizeRef.current || !chainRef.current || !audioRef.current) return
    setAnalyzing(true)
    try {
      const gain = await getNormalizedGain(audioRef.current, chainRef.current.context, track.id)
      chainRef.current.setNormGain(gain)
    } catch (e) {
      chainRef.current?.setNormGain(1.0)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.volume = state.volume
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
        audio.src = nextTrack.file_url
        audio.play()
        setState(prev => ({ ...prev, currentTrack: nextTrack, queueIndex: loopTo, isPlaying: true }))
        updateMediaSession(nextTrack, true)
        if (chainRef.current && (nextTrack as any).master_preset) {
          chainRef.current.setPreset((nextTrack as any).master_preset as MasterPreset)
          setMasterPresetState((nextTrack as any).master_preset as MasterPreset)
        }
      } else {
        setState(prev => ({ ...prev, isPlaying: false }))
      }
    }

    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Media Session handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play(); setState(s => ({ ...s, isPlaying: true })) })
    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); setState(s => ({ ...s, isPlaying: false })) })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const s = stateRef.current
      const idx = (s.queueIndex + 1) % s.queue.length
      const track = s.queue[idx]
      if (!track) return
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      setState(prev => ({ ...prev, currentTrack: track, queueIndex: idx, isPlaying: true }))
      updateMediaSession(track, true)
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return }
      const s = stateRef.current
      const idx = s.queueIndex > 0 ? s.queueIndex - 1 : 0
      const track = s.queue[idx]
      if (!track) return
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      setState(prev => ({ ...prev, currentTrack: track, queueIndex: idx, isPlaying: true }))
      updateMediaSession(track, true)
    })
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (audioRef.current && d.seekTime !== undefined) audioRef.current.currentTime = d.seekTime
    })
  }, [])

  const setMasterPreset = useCallback((preset: MasterPreset) => {
    initChain()
    if (chainRef.current) chainRef.current.setPreset(preset)
    setMasterPresetState(preset)
  }, [initChain])

  const play = useCallback((track: Track, queue: Track[] = [track]) => {
    const audio = audioRef.current!
    const idx = queue.findIndex(t => t.id === track.id)
    audio.src = track.file_url
    audio.play()
    setState(s => ({ ...s, currentTrack: track, queue, queueIndex: idx >= 0 ? idx : 0, isPlaying: true }))
    updateMediaSession(track, true)
    setTimeout(() => {
      initChain()
      const preset = ((track as any).master_preset ?? 'off') as MasterPreset
      if (chainRef.current) chainRef.current.setPreset(preset)
      setMasterPresetState(preset)
      applyNormalization(track)
    }, 100)
  }, [updateMediaSession, initChain, applyNormalization])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setState(s => ({ ...s, isPlaying: false }))
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
  }, [])

  const resume = useCallback(() => {
    initChain()
    audioRef.current?.play()
    setState(s => ({ ...s, isPlaying: true }))
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
  }, [initChain])

  const next = useCallback(() => {
    setState(s => {
      const idx = (s.queueIndex + 1) % s.queue.length
      const track = s.queue[idx]
      if (!track) return s
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      updateMediaSession(track, true)
      const preset = ((track as any).master_preset ?? 'off') as MasterPreset
      if (chainRef.current) chainRef.current.setPreset(preset)
      setMasterPresetState(preset)
      setTimeout(() => applyNormalization(track), 100)
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [updateMediaSession, applyNormalization])

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return }
    setState(s => {
      const idx = s.queueIndex > 0 ? s.queueIndex - 1 : 0
      const track = s.queue[idx]
      if (!track) return s
      audioRef.current!.src = track.file_url
      audioRef.current!.play()
      updateMediaSession(track, true)
      const preset = ((track as any).master_preset ?? 'off') as MasterPreset
      if (chainRef.current) chainRef.current.setPreset(preset)
      setMasterPresetState(preset)
      setTimeout(() => applyNormalization(track), 100)
      return { ...s, currentTrack: track, queueIndex: idx, isPlaying: true }
    })
  }, [updateMediaSession, applyNormalization])

  const seek = useCallback((pct: number) => {
    audioRef.current!.currentTime = pct * (audioRef.current!.duration || 0)
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol
    setState(s => ({ ...s, volume: vol }))
  }, [])

  const toggleRepeat = useCallback(() => setRepeat(r => !r), [])

  const toggleNormalize = useCallback(() => {
    setNormalize(n => {
      const next = !n
      if (chainRef.current) {
        if (!next) {
          chainRef.current.setNormGain(1.0)
        } else if (stateRef.current.currentTrack) {
          applyNormalization(stateRef.current.currentTrack)
        }
      }
      return next
    })
  }, [applyNormalization])

  return (
    <PlayerContext.Provider value={{
      ...state, play, pause, resume, next, prev, seek, setVolume,
      repeat, toggleRepeat,
      masterPreset, setMasterPreset,
      normalize, toggleNormalize, analyzing,
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
