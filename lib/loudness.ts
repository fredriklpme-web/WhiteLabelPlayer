// LUFS-baserad loudness normalization
// Analyserar en låts RMS-nivå och returnerar gain-justering i dB
// Target: -14 LUFS (Spotify-standard)

export const TARGET_LUFS = -14

// Analyserar audio-buffert och returnerar uppskattad integrated loudness (LUFS)
// Vi använder RMS som approximation av LUFS – tillräckligt bra för playback-normalisering
export async function analyzeLoudness(audioElement: HTMLAudioElement, audioContext: AudioContext): Promise<number> {
  return new Promise((resolve) => {
    // Hämta URL från audio-elementet
    const url = audioElement.src
    if (!url) { resolve(TARGET_LUFS); return }

    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(audioBuffer => {
        // Beräkna RMS för alla kanaler
        let sumSquares = 0
        let totalSamples = 0

        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
          const data = audioBuffer.getChannelData(c)
          for (let i = 0; i < data.length; i++) {
            sumSquares += data[i] * data[i]
          }
          totalSamples += data.length
        }

        const rms = Math.sqrt(sumSquares / totalSamples)
        // Konvertera till dBFS
        const dbfs = rms > 0 ? 20 * Math.log10(rms) : -100

        // Approximera LUFS från RMS (offset ~3 dB är typisk)
        const estimatedLufs = dbfs - 3

        resolve(estimatedLufs)
      })
      .catch(() => resolve(TARGET_LUFS))
  })
}

// Beräknar gain-justering i linjär skala för att nå target LUFS
export function calculateNormalizationGain(measuredLufs: number, targetLufs: number = TARGET_LUFS): number {
  const gainDb = targetLufs - measuredLufs
  // Begränsa till max +12 dB boost (undviker distortion på tyst material)
  const clampedGainDb = Math.max(-20, Math.min(12, gainDb))
  return Math.pow(10, clampedGainDb / 20)
}

// Cache för analyserade låtar – sparar tid vid upprepad uppspelning
const loudnessCache = new Map<string, number>()

export async function getNormalizedGain(
  audioElement: HTMLAudioElement,
  audioContext: AudioContext,
  trackId: string
): Promise<number> {
  if (loudnessCache.has(trackId)) {
    return calculateNormalizationGain(loudnessCache.get(trackId)!)
  }

  const lufs = await analyzeLoudness(audioElement, audioContext)
  loudnessCache.set(trackId, lufs)
  return calculateNormalizationGain(lufs)
}
