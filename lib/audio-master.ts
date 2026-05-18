// Web Audio API mastering chain
// Kopplas mellan audio-element och speakers vid uppspelning

export type MasterPreset = 'off' | 'clean' | 'warm' | 'loud' | 'bright'

interface PresetConfig {
  highpassFreq: number
  lowShelfGain: number
  presenceGain: number
  highShelfGain: number
  compThreshold: number
  compRatio: number
  compAttack: number
  compRelease: number
  outputGain: number
}

const PRESETS: Record<MasterPreset, PresetConfig | null> = {
  off: null,
  clean: {
    highpassFreq: 40,
    lowShelfGain: 0.5,
    presenceGain: 0.8,
    highShelfGain: 0.8,
    compThreshold: -20,
    compRatio: 2.5,
    compAttack: 0.02,
    compRelease: 0.3,
    outputGain: 0.92,
  },
  warm: {
    highpassFreq: 35,
    lowShelfGain: 2.5,
    presenceGain: 0.5,
    highShelfGain: -0.5,
    compThreshold: -18,
    compRatio: 3,
    compAttack: 0.015,
    compRelease: 0.35,
    outputGain: 0.90,
  },
  loud: {
    highpassFreq: 40,
    lowShelfGain: 1.5,
    presenceGain: 1.5,
    highShelfGain: 1.0,
    compThreshold: -16,
    compRatio: 4,
    compAttack: 0.008,
    compRelease: 0.2,
    outputGain: 0.88,
  },
  bright: {
    highpassFreq: 45,
    lowShelfGain: 0,
    presenceGain: 2.0,
    highShelfGain: 2.5,
    compThreshold: -20,
    compRatio: 2.5,
    compAttack: 0.02,
    compRelease: 0.3,
    outputGain: 0.90,
  },
}

export interface MasterChain {
  context: AudioContext
  source: MediaElementAudioSourceNode
  outputGain: GainNode
  disconnect: () => void
  setPreset: (preset: MasterPreset) => void
}

let globalChain: MasterChain | null = null

export function getMasterChain(audioElement: HTMLAudioElement): MasterChain {
  // Återanvänd befintlig chain om möjligt
  if (globalChain) return globalChain

  const context = new AudioContext()
  const source = context.createMediaElementSource(audioElement)

  // Skapa noder
  const highpass = context.createBiquadFilter()
  highpass.type = 'highpass'

  const lowShelf = context.createBiquadFilter()
  lowShelf.type = 'lowshelf'
  lowShelf.frequency.value = 120

  const presence = context.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 3000
  presence.Q.value = 1

  const highShelf = context.createBiquadFilter()
  highShelf.type = 'highshelf'
  highShelf.frequency.value = 9000

  const compressor = context.createDynamicsCompressor()
  compressor.knee.value = 18

  const outputGain = context.createGain()

  // Koppla ihop kedjan
  source
    .connect(highpass)
    .connect(lowShelf)
    .connect(presence)
    .connect(highShelf)
    .connect(compressor)
    .connect(outputGain)
    .connect(context.destination)

  const setPreset = (preset: MasterPreset) => {
    const config = PRESETS[preset]
    if (!config) {
      // Off – bypass genom att sätta neutrala värden
      highpass.frequency.value = 20
      lowShelf.gain.value = 0
      presence.gain.value = 0
      highShelf.gain.value = 0
      compressor.threshold.value = -100
      compressor.ratio.value = 1
      outputGain.gain.value = 1.0
      return
    }
    highpass.frequency.value = config.highpassFreq
    lowShelf.gain.value = config.lowShelfGain
    presence.gain.value = config.presenceGain
    highShelf.gain.value = config.highShelfGain
    compressor.threshold.value = config.compThreshold
    compressor.ratio.value = config.compRatio
    compressor.attack.value = config.compAttack
    compressor.release.value = config.compRelease
    outputGain.gain.value = config.outputGain
  }

  // Starta med off
  setPreset('off')

  const chain: MasterChain = {
    context,
    source,
    outputGain,
    disconnect: () => {
      source.disconnect()
      globalChain = null
    },
    setPreset,
  }

  globalChain = chain
  return chain
}
