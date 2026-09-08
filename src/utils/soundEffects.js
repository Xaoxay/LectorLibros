/**
 * Sintetizador de sonido sutil de paso de página de papel usando Web Audio API.
 * No requiere descargar archivos externos de audio, funciona offline al 100%.
 */
let audioCtx = null;

export function playPageTurnSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const duration = 0.09; // 90ms de susurro de papel
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    // Ruido suave con decaimiento exponencial imitando fricción de papel
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (bufferSize * 0.35));
      output[i] = (Math.random() * 2 - 1) * decay;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    // Filtro pasa-bajos para suavizar el sonido a papel mate
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + duration);

    // Control de volumen sutil (muy suave y relajante)
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    whiteNoise.start();
  } catch (e) {
    // Si el navegador no permite reproducir audio hasta interacción, ignorar silenciosamente
  }
}
