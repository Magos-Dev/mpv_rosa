"use client";

let context: AudioContext | null = null;

/**
 * Toca um alerta curto (dois bipes) sem arquivo de áudio.
 * Navegadores só liberam áudio depois de uma interação do usuário:
 * chame unlockSound() em um clique (ex.: ao ligar o som).
 */
export function unlockSound() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {
    context = null;
  }
}

export function playNewOrderSound() {
  if (!context || context.state !== "running") return;
  const now = context.currentTime;
  for (const [offset, freq] of [
    [0, 880],
    [0.22, 1175],
  ] as const) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    osc.connect(gain).connect(context.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.22);
  }
}
