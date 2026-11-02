// ============================================================================
// HỆ THỐNG ÂM THANH TU TIÊN (WEB AUDIO SYNTHESIZER & TTS PLAYER)
// ============================================================================

class TuTienAudioEngine {
  constructor() {
    this.ctx = null;
    this.ttsQueue = [];
    this.isTtsPlaying = false;
    this.recentTtsPlayed = new Map(); // chống đọc trùng lời
    this.enabled = true;
    this.volume = 0.9;
    this.audioElement = new Audio();
    this.audioElement.volume = 1.0;

    this.audioElement.addEventListener('ended', () => {
      this.isTtsPlaying = false;
      this.playNextTts();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[Audio] Lỗi phát tts:', e);
      this.isTtsPlaying = false;
      this.playNextTts();
    });

    // Kích hoạt AudioContext khi người dùng tương tác màn hình
    const unlock = () => {
      this.getAudioContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Tiếng Lôi Kiếp Sấm Sét gầm vang (Thunder Strike)
  playThunder() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      // White noise buffer
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 1.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.9 * this.volume, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(t);
      noise.stop(t + 1.5);
    } catch (_) {}
  }

  // 2. Tiếng Kiếm Khí chém ngang trời (Sword Slash Whoosh)
  playSwordSlash() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);

      gain.gain.setValueAtTime(0.35 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch (_) {}
  }

  // 3. Tiếng Chuông Thiền Thanh Tịnh (Meditation Gong)
  playZenGong() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      [220, 440, 660].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const initialGain = (0.28 / (idx + 1)) * this.volume;
        gain.gain.setValueAtTime(initialGain, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 2.6);
      });
    } catch (_) {}
  }

  // 4. Tiếng Tinh Thể Linh Khí (Qi chime)
  playQiChime() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100 + Math.random() * 400, t);
      osc.frequency.exponentialRampToValueAtTime(550, t + 0.18);

      gain.gain.setValueAtTime(0.12 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    } catch (_) {}
  }

  // 5. Tiếng Thăng Hoa Đột Phá (Breakthrough Celestial Chime)
  playBreakthroughSound() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [330, 440, 554, 659, 880];
      const t = ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.1);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.3 * this.volume, t + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 1.3);
      });
    } catch (_) {}
  }

  // 6. Quản lý hàng đợi TTS chống trùng lặp & trễ
  speak(text) {
    const raw = String(text || '').trim();
    if (!raw) return;

    // Chống đọc trùng lời trong vòng 4 giây
    const now = Date.now();
    const lastPlayed = this.recentTtsPlayed.get(raw);
    if (lastPlayed && (now - lastPlayed) < 4000) {
      console.log('[Audio] Bỏ qua đọc trùng lời:', raw);
      return;
    }
    this.recentTtsPlayed.set(raw, now);

    // Dọn dẹp cache
    if (this.recentTtsPlayed.size > 200) {
      const first = this.recentTtsPlayed.keys().next().value;
      this.recentTtsPlayed.delete(first);
    }

    // Đẩy vào hàng đợi
    this.ttsQueue.push(raw);
    if (!this.isTtsPlaying) {
      this.playNextTts();
    }
  }

  async playNextTts() {
    if (this.ttsQueue.length === 0) {
      this.isTtsPlaying = false;
      return;
    }

    this.isTtsPlaying = true;
    const text = this.ttsQueue.shift();

    try {
      // Gọi API TTS trên server
      const resp = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
      const data = await resp.json();

      if (data && data.ok && data.url) {
        this.audioElement.src = data.url;
        await this.audioElement.play().catch(e => {
          console.warn('[Audio Play Auto Block]', e.message);
          this.isTtsPlaying = false;
          this.playNextTts();
        });
      } else {
        this.isTtsPlaying = false;
        this.playNextTts();
      }
    } catch (err) {
      console.warn('[Audio TTS fetch error]', err);
      this.isTtsPlaying = false;
      this.playNextTts();
    }
  }
}

window.TuTienAudioEngine = TuTienAudioEngine;
