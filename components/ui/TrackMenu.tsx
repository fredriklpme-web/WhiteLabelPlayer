'use client'
import { useEffect, useRef, useState } from 'react'
import { Play, Download, ListPlus, Pencil, Trash2, X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Track } from '@/types'
import { usePlayer } from '@/lib/player-context'
import { MasterPreset } from '@/lib/audio-master'
import MasterPresetPicker from '@/components/ui/MasterPresetPicker'

interface TrackMenuProps {
  track: Track
  playlists: any[]
  position: { x: number; y: number }
  onClose: () => void
  onRefresh: () => void
}

const PRESET_LABELS: Record<string, string> = {
  off: 'Off', clean: 'Clean', warm: 'Warm', loud: 'Loud', bright: 'Bright'
}

export default function TrackMenu({ track, playlists, position, onClose, onRefresh }: TrackMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [renaming, setRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(track.title)
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [showMaster, setShowMaster] = useState(false)
  const [trackPreset, setTrackPreset] = useState<MasterPreset>(((track as any).master_preset ?? 'off') as MasterPreset)
  const { play, currentTrack, setMasterPreset } = usePlayer()
  const supabase = createClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const menuWidth = 210
  const menuHeight = 240
  const x = Math.min(position.x, window.innerWidth - menuWidth - 8)
  const y = Math.min(position.y, window.innerHeight - menuHeight - 8)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = track.file_url
    a.download = `${track.title}.${track.file_format ?? 'mp3'}`
    a.click()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${track.title}"?`)) return
    await supabase.from('tracks').delete().eq('id', track.id)
    onRefresh()
    onClose()
  }

  const handleRename = async () => {
    if (!newTitle.trim()) return
    await supabase.from('tracks').update({ title: newTitle.trim() }).eq('id', track.id)
    onRefresh()
    setRenaming(false)
    onClose()
  }

  const addToPlaylist = async (playlistId: string) => {
    const { data: items } = await supabase.from('playlist_items').select('position').eq('playlist_id', playlistId).order('position', { ascending: false }).limit(1)
    const nextPos = items?.[0]?.position != null ? items[0].position + 1 : 0
    await supabase.from('playlist_items').insert({ playlist_id: playlistId, track_id: track.id, position: nextPos })
    onClose()
  }

  const handleMasterChange = (preset: MasterPreset) => {
    setTrackPreset(preset)
    // Om denna låt spelas just nu – uppdatera chain direkt
    if (currentTrack?.id === track.id) setMasterPreset(preset)
  }

  return (
    <>
      <div ref={ref} style={{
        position: 'fixed', left: x, top: y, zIndex: 100,
        background: '#fff', border: '0.5px solid #e0e0e0',
        borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        width: menuWidth, overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 14px 8px', borderBottom: '0.5px solid #f0f0f0' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          {track.file_format && <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{track.file_format.toUpperCase()}</div>}
        </div>

        {renaming ? (
          <div style={{ padding: '10px 12px' }}>
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
              style={{ width: '100%', border: '0.5px solid #ddd', borderRadius: 4, padding: '6px 8px', fontSize: 12, color: '#111', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleRename} style={{ flex: 1, background: '#111', border: 'none', color: '#fff', fontSize: 11, padding: '5px 0', borderRadius: 4, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setRenaming(false)} style={{ flex: 1, background: 'none', border: '0.5px solid #ddd', color: '#888', fontSize: 11, padding: '5px 0', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : showPlaylists ? (
          <div>
            <button onClick={() => setShowPlaylists(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '0.5px solid #f0f0f0', width: '100%' }}>
              <X size={12} /> Back
            </button>
            {playlists.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 12, color: '#aaa' }}>No playlists found</div>
            ) : playlists.map(pl => (
              <button key={pl.id} onClick={() => addToPlaylist(pl.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, color: '#333', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '0.5px solid #f8f8f8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                {pl.title}
              </button>
            ))}
          </div>
        ) : (
          <>
            {[
              { icon: <Play size={13} />, label: 'Play', action: () => { play(track); onClose() } },
              { icon: <Download size={13} />, label: 'Download', action: handleDownload },
              { icon: <ListPlus size={13} />, label: 'Add to playlist', action: () => setShowPlaylists(true) },
              { icon: <Pencil size={13} />, label: 'Rename', action: () => setRenaming(true) },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', fontSize: 12, color: '#333', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid #f8f8f8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ color: '#aaa' }}>{item.icon}</span> {item.label}
              </button>
            ))}

            {/* Auto Master */}
            <button onClick={() => { setShowMaster(true); onClose() }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', fontSize: 12, color: '#333', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid #f8f8f8' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={13} style={{ color: trackPreset !== 'off' ? 'var(--accent)' : '#aaa' }} />
                Auto Master
              </span>
              <span style={{ fontSize: 11, color: trackPreset !== 'off' ? 'var(--accent)' : '#ccc' }}>
                {PRESET_LABELS[trackPreset]}
              </span>
            </button>

            <button onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', fontSize: 12, color: '#cc3333', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <Trash2 size={13} /> Delete
            </button>
          </>
        )}
      </div>

      {showMaster && (
        <MasterPresetPicker
          trackId={track.id}
          current={trackPreset}
          onChange={handleMasterChange}
          onClose={() => setShowMaster(false)}
        />
      )}
    </>
  )
}
