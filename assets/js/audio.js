(function (window) {
  "use strict";

  // Sortie audio via AudioWorklet (thread audio dédié).
  // Pourquoi : le ScriptProcessor de gbajs tourne sur le thread principal,
  // déjà occupé par l'émulation → callbacks en retard → craquements et son
  // métallique. Ici l'émulateur pousse ses échantillons vers un worklet qui
  // les rejoue avec interpolation linéaire, tampon anti-latence et fondu
  // doux quand il manque d'échantillons.

  const state = window.Valdoria.state;

  const WORKLET_CODE = `
class ValdoriaAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.N = 1 << 16;
    this.bufL = new Float32Array(this.N);
    this.bufR = new Float32Array(this.N);
    this.w = 0;          // position d'écriture (entière)
    this.r = 0;          // position de lecture (fractionnaire)
    this.inRate = 32768; // taux d'échantillonnage GBA
    this.lastL = 0;
    this.lastR = 0;
    this.port.onmessage = e => {
      const d = e.data;
      if (d.rate) { this.inRate = d.rate; return; }
      const l = d.l, r = d.r;
      for (let i = 0; i < l.length; i++) {
        this.bufL[this.w % this.N] = l[i];
        this.bufR[this.w % this.N] = r[i];
        this.w++;
      }
      // anti-latence : si trop d'échantillons s'accumulent, on saute en avant
      const max = this.inRate * 0.25;
      if (this.w - this.r > max) this.r = this.w - max * 0.5;
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const step = this.inRate / sampleRate;
    for (let i = 0; i < L.length; i++) {
      if (this.r + 1 < this.w) {
        const i0 = Math.floor(this.r), t = this.r - i0;
        const a = i0 % this.N, b = (i0 + 1) % this.N;
        this.lastL = L[i] = this.bufL[a] * (1 - t) + this.bufL[b] * t;
        this.lastR = R[i] = this.bufR[a] * (1 - t) + this.bufR[b] * t;
        this.r += step;
      } else {
        // plus rien à jouer : fondu doux vers le silence, pas de clic
        this.lastL *= 0.97;
        this.lastR *= 0.97;
        L[i] = this.lastL;
        R[i] = this.lastR;
      }
    }
    return true;
  }
}
registerProcessor("valdoria-audio", ValdoriaAudioProcessor);
`;

  async function setup(gba) {
    const audio = gba.audio;
    if (!audio || !audio.context || !audio.context.audioWorklet) return false;
    const ctx = audio.context;
    try {
      if (!ctx.__valdoriaWorklet) {
        const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        ctx.__valdoriaWorklet = true;
      }
      if (state.audioNode) { try { state.audioNode.disconnect(); } catch (e) {} }
      const node = new AudioWorkletNode(ctx, "valdoria-audio", { outputChannelCount: [2] });
      node.connect(ctx.destination);
      node.port.postMessage({ rate: 32768 });
      state.audioNode = node;
      state.audioLastPtr = 0;
      // neutralise la sortie d'origine (ScriptProcessor) : le worklet la remplace
      try { audio.jsAudio.disconnect(); } catch (e) { /* pas encore connecté */ }
      audio.jsAudio = { connect() {}, disconnect() {} };
      return true;
    } catch (error) {
      console.warn("[audio] worklet indisponible, sortie d'origine conservée", error);
      return false;
    }
  }

  // À appeler après chaque frame émulée : pousse les nouveaux échantillons
  // du tampon circulaire de gbajs vers le worklet.
  function pump(gba) {
    const audio = gba.audio;
    const node = state.audioNode;
    if (!node || !audio || !audio.buffers) return;
    const sp = audio.samplePointer;
    if (!audio.masterEnable || !audio.enabled) { state.audioLastPtr = sp; return; }
    const n = (sp - state.audioLastPtr) & audio.sampleMask;
    if (n <= 0 || n > 8192) { state.audioLastPtr = sp; return; }
    const l = new Float32Array(n), r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = (state.audioLastPtr + i) & audio.sampleMask;
      l[i] = audio.buffers[0][idx];
      r[i] = audio.buffers[1][idx];
    }
    node.port.postMessage({ l, r }, [l.buffer, r.buffer]);
    state.audioLastPtr = sp;
  }

  window.Valdoria.audio = { setup, pump };
})(window);
