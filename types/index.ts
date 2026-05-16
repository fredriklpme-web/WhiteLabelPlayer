export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  background_url: string | null
  background_is_dark: boolean
  created_at: string
}

export interface Album {
  id: string
  user_id: string
  title: string
  year: number | null
  cover_url: string | null
  created_at: string
  tracks?: Track[]
}

export interface Track {
  id: string
  user_id: string
  album_id: string | null
  title: string
  duration: number | null
  file_url: string
  file_format: string | null
  file_size: number | null
  bitrate: number | null
  track_number: number | null
  created_at: string
  album?: Album
}

export interface Playlist {
  id: string
  user_id: string
  title: string
  created_at: string
  items?: PlaylistItem[]
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  track_id: string
  position: number
  track?: Track
}

export interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
}
