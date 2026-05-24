// Loudness normalization via offline AudioContext
// Analyserar filen separat från spelaren – påverkar inte uppspelningen
// Justerar sedan audio.volume för att nå target LUFS (~-14 dBFS RMS)

const TARGET_DB = -14 // Spotify-standard
const cache = new Map<string, number>() // trackId -> normaliserat volume (0-1)

export async function getNormalizedVolume(
  fileUrl: string,
  trackId: string,
  baseVolume: number = 0.8
): Promise<number> {
  // Returnera cachat värde om tillgängligt
  if (cache.has(trackId)) return cache.get(trackId)!

  try {
    // Hämta filen som ArrayBuffer
    const res = await fetch(fileUrl)
    if (!res.ok) return baseVolume
    const buffer = await res.arrayBuffer()

    // Analysera med offline context – påverkar inte spelar-audio alls
    const offlineCtx = new OfflineAudioContext(1, 1, 44100)
    const audioBuffer = await offlineCtx.decodeAudioData(buffer)

    // Beräkna RMS över alla kanaler
    let sumSq = 0
    let total = 0
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const data = audioBuffer.getChannelData(c)
      for (let i = 0; i < data.length; i++) {
        sumSq += data[i] * data[i]
      }
      total += data.length
    }

    const rms = Math.sqrt(sumSq / total)
    if (rms < 0.0001) return baseVolume // Tyst fil

    const dbfs = 20 * Math.log10(rms)
    const gainDb = TARGET_DB - dbfs
    const gainLinear = Math.pow(10, gainDb / 20)

    // Applicera på baseVolume och begränsa till 0.0 - 1.0
    const normalizedVolume = Math.max(0.05, Math.min(1.0, baseVolume * gainLinear))

    cache.set(trackId, normalizedVolume)
    return normalizedVolume
  } catch {
    return baseVolume
  }
}

export function clearLoudnessCache() {
  cache.clear()
}
