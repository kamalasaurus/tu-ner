class TuNer extends HTMLElement {
  notes = ['A♭', 'A', 'B♭', 'B', 'C', 'D♭', 'D', 'E♭',
    'E', 'F', 'G♭', 'G' ]
  f = document.createElement('div');
  n = document.createElement('div');

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.append(this.f, this.n);
  }

  connectedCallback() {
    this.attachAudio()
  }

  attachAudio() {
    const ctx = new AudioContext({sampleRate: 48000});
    const analyser = ctx.createAnalyser();
      analyser.fftSize = 32768;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new maxFreqArray(bufferLength);

    navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
        const microphone = ctx.createMediaStreamSource(stream);
        microphone.connect(analyser);
        return analyser;
      }).catch(console.error)
      .then(this.draw.bind(this, dataArray))
  }

  draw(dataArray, analyser) {
    requestAnimationFrame(this.draw.bind(this, dataArray, analyser))
    analyser.getByteFrequencyData(dataArray);
    const freq = dataArray.max();
    this.f.innerHTML = `${freq}`;
    this.n.innerHTML = `${this.note(freq)}`;
  }

  note(freq) {
    const A0 = 27.5;
    const base_interval = Math.log2(freq / A0) * 12;
    const interval = [Math.ceil(base_interval), Math.floor(base_interval)]
      .map((i) => [Math.abs(freq - this.to_f(i)), i])
      .reduce(([d1, i1], [d2, i2]) => {
        return d1 < d2 ? i1 : i2;
      }).pop();

    return `${this.notes[interval % 12]}${interval / 12 | 0}`
  }

  to_f(interval) {
    return 27.5 * Math.pow(2, interval/12)
  }
}

class maxFreqArray extends Uint8Array {
  max() {
    return this.reduce((max, value, index) => {
      return value > max[0] ? [value, index] : max;
    }, [0, 0])[1] * 24000 / 16384;
  }
}

window.customElements.define('tu-ner', TuNer)

export { TuNer };