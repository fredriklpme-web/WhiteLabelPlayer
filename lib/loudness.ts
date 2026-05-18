// Realtids RMS-mätning via AnalyserNode
// Mäter de första 10 sekunderna och beräknar normaliserings-gain

const TARGET_LUFS = -14
const loudnessCache = new Map<string, number>()

export async function measureAndNormalize(
  audioElement: HTMLAudioElement,
  context: AudioContext,
  trackId: string,
  onGain: (gain: number) => void
): Promise<void> {
  // Använd cache om tillgänglig
  if (loudnessCache.has(trackId)) {
    const cachedLufs = loudnessCache.get(trackId)!
    onGain(lufsToGain(cachedLufs))
    return
  }

  // Mät RMS via AnalyserNode under uppspelning
  const analyser = context.createAnalyser()
  analyser.fftSize = 2048

  // Koppla analyser parallellt (utan att störa signal-kedjan)
  // Vi kopplar från source via normGain-noden
  const dataArray = new Float32Array(analyser.fftSize)
  const samples: number[] = []
  let measuring = true
  let startTime = context.currentTime

  const measure = () => {
    if (!measuring) return
    if (context.currentTime - startTime > 15) {
      // Klar – beräkna RMS
      measuring = false
      if (samples.length > 0) {
        const sumSq = samples.reduce((s, v) => s + v * v, 0)
        const rms = Math.sqrt(sumSq / samples.length)
        const dbfs = rms > 0 ? 20 * Math.log10(rms) : -60
        const estimatedLufs = dbfs - 3
        loudnessCache.set(trackId, estimatedLufs)
        onGain(lufsToGain(estimatedLufs))
      }
      return
    }
    analyser.getFloatTimeDomainData(dataArray)
    const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length)
    if (rms > 0.001) samples.push(rms) // Ignorera tystnad
    requestAnimationFrame(measure)
  }

  // Koppla analyser till destination parallellt
  try {
    // Hämta sista nod i chain (outputGain) och koppla analyser
    const tempGain = context.createGain()
    tempGain.gain.value = 0 // Tyst – bara för mätning
    analyser.connect(tempGain)
    tempGain.connect(context.destination)

    measure()

    // Stoppa efter 15s oavsett
    setTimeout(() => { measuring = false }, 15000)
  } catch (e) {
    // Om analysen misslyckas, kör utan normalisering
  }
}

function lufsToGain(lufs: number): number {
  const gainDb = TARGET_LUFS - lufs
  const clamped = Math.max(-20, Math.min(12, gainDb))
  return Math.pow(10, clamped / 20)
}

export { loudnessCache }
