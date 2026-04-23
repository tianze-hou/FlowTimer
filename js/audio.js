// ==================== Audio ====================
const Audio = {
  _ctx: null,
  ensure() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!this._ctx) this._ctx = new AudioContext();
      if (this._ctx.state === "suspended") this._ctx.resume();
      return this._ctx;
    } catch (e) {
      console.error("Audio init failed:", e);
      return null;
    }
  },

  play() {
    const ctx = this.ensure();
    if (!ctx) return;

    try {
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.value = freq;

        filter.type = "lowpass";
        filter.frequency.value = 2000;

        osc.connect(gain);
        gain.connect(filter);
        filter.connect(ctx.destination);

        const now = startTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
      };

      playTone(587.33, ctx.currentTime, 0.8);
      playTone(493.88, ctx.currentTime + 0.6, 0.8);
    } catch (e) {
      console.error("Audio Playback Failed:", e);
    }
  },

  playChime() {
    const ctx = this.ensure();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 10.0;
      const baseFreq = 432;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.5, now + 0.04);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(baseFreq * 1.5, now);
      bandpass.Q.setValueAtTime(0.5, now);

      master.connect(bandpass);
      bandpass.connect(ctx.destination);

      const components = [
        { f: baseFreq, g: 0.7, lfoF: 0.2, w: 0.1 },
        { f: baseFreq * 1.003, g: 0.4, lfoF: 0.5, w: 0.2 },
        { f: baseFreq * 0.5, g: 0.3, lfoF: 0.1, w: 0.05 },
        { f: baseFreq * 2.41, g: 0.1, lfoF: 1.5, w: 0.02 }
      ];

      components.forEach((p) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(p.lfoF, now);
        lfoGain.gain.setValueAtTime(p.w, now);
        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);

        osc.type = "sine";
        osc.frequency.setValueAtTime(p.f, now);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(p.g, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(g);
        g.connect(master);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + duration);
        lfo.stop(now + duration);
      });

      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(150, now);
      thud.frequency.exponentialRampToValueAtTime(50, now + 0.1);

      thudGain.gain.setValueAtTime(0.3, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.2);

    } catch (e) {
      console.error("Singing Bowl Playback Failed:", e);
    }
  }
};

export { Audio };