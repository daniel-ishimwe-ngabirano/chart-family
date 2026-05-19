const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function playTone(freq, duration, type = "sine", volume = 0.3) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export function playMessageSent() {
  playTone(800, 0.08, "sine", 0.15);
}

export function playMessageReceived() {
  playTone(600, 0.06, "sine", 0.12);
  setTimeout(() => playTone(900, 0.08, "sine", 0.12), 80);
}

export function playCallRingtone(loop = true) {
  let playing = true;
  function ring() {
    if (!playing) return;
    playTone(440, 0.3, "sine", 0.2);
    setTimeout(() => {
      if (playing) playTone(440, 0.3, "sine", 0.2);
      setTimeout(() => {
        if (playing) playTone(540, 0.3, "sine", 0.2);
        setTimeout(() => {
          if (playing) playTone(540, 0.3, "sine", 0.2);
          setTimeout(() => {
            if (playing) playTone(440, 0.5, "sine", 0.2);
            setTimeout(ring, 1000);
          }, 350);
        }, 100);
      }, 100);
    }, 100);
  }
  ring();
  return () => { playing = false; };
}

export function playCallConnected() {
  playTone(660, 0.1, "sine", 0.15);
  setTimeout(() => playTone(880, 0.15, "sine", 0.15), 120);
}

export function playCallEnded() {
  playTone(440, 0.15, "sine", 0.15);
  setTimeout(() => playTone(330, 0.2, "sine", 0.15), 150);
}

export function playTyping() {
  playTone(1200, 0.03, "sine", 0.05);
}

export function playError() {
  playTone(200, 0.2, "square", 0.15);
  setTimeout(() => playTone(150, 0.3, "square", 0.15), 200);
}
