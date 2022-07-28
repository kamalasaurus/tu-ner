class TuNer extends HTMLElement {
  notes = ['A', 'B♭', 'B', 'C', 'D♭', 'D', 'E♭',
    'E', 'F', 'G♭', 'G', 'A♭'];
  container1 = document.createElement('div');
  f = document.createElement('div');
  n = document.createElement('div');
  a = document.createElement('div');
  c = document.createElement('div');
  container2 = document.createElement('div');
  canvas = document.createElement('canvas');
  context = this.canvas.getContext('2d');

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    [this.f, this.n, this.a, this.c].forEach(e => this.container1.appendChild(e));
    this.container1.style = 'height: 130px';
    this.container2.appendChild(this.canvas);
    this.container2.style = 'width: 100%;';
    this.canvas.width = window.innerWidth;
    this.canvas.style = 'width: 100%;';
    this.context.fillStyle = 'red';
    this.shadowRoot.append(this.container1, this.container2);
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
    const vals = this.note(freq);
    this.f.innerHTML = `${freq}`;
    this.n.innerHTML = `${vals.n}`;
    this.a.innerHTML = `${vals.a}`;
    this.c.innerHTML = `${vals.c}`;
    this.renderChart(dataArray)
  }

  note(freq) {
    const A0 = 27.5;
    const base_interval = Math.log2(freq / A0) * 12;
    const interval = Math.round(base_interval);
    const tone = interval % 12;
    const tone_index = tone < 0 ? 12 + tone : tone;
    const octave = interval / 12 | 0;

    const diff = base_interval > interval ? '♯' : '♭';
    const cents = 100 * Math.abs(base_interval - interval);
    const onpitch = cents < 10;

    return {
      n: isNaN(tone) ? '-' : `${this.notes[tone_index]}${octave}`,
      a: `you are ${diff} ${cents} cents`,
      c: onpitch ? `you are on pitch!` : `-`
    }
  }

  to_f(interval) {
    return 27.5 * Math.pow(2, interval/12)
  }

  to_n(freq) {
    return Math.log2(freq / 27.5) * 12
  }

  renderChart(dataArray) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const staticWidth = this.canvas.width / 328;
    dataArray
      .reduce((arr, val, i) => {
        // instead of % 50, have to create a logarithmic scale here
        if (i % 50 === 0) arr.unshift(dataArray.norm(val))
        else arr[0] += dataArray.norm(val)
        return arr;
      }, []) // will produce array of 328 elements, MAKE THEM LOGARITHMIC!!
      .forEach((h, i, args) => {
        this.context.fillRect(
          this.canvas.width - (staticWidth * i),
          this.canvas.height,
          staticWidth,
          -(h / 50)
        )
      });
  }
}

// log scale that aligns to musical notes
// A0 * 2 ^ interval / 12
// 50 cents around note collects to note?
// 1 Hz is a bit lower than C, -5 octaves
// focus on human audible spectrum, don't need ton of resolution that low
// A-1 is 13.75 Hz, around where human hearing begins, so start from there
// E9 is 22350 Hz, around where human hearing ends
// Each bin is 24000/ 16384 Hz -- about 1.46484375 Hz -- can use this to group
// by cents around frequency poles?  How many intervals between notes?  semitones
// is 120 bins, quarter tones 480 bins

/*
  binWidth = 24000 / 16384
  freq = i * binWidth
  base_interval = i === 0 ? -51 : this.to_n(freq)
  interval = Math.round(interval)
  if (arr[interval + 51]) arr[interval] += val
  else arr[interval + 51] = val
*/

/*
const binWidth = 24000 / 16384
dataArray
  .reduce((arr, val, i) => {
    const interval = Math.round(i === 0 ? -51 : this.to_n(i * binWidth))
    if (arr[interval + 51]) arr[interval] += val
    else arr[interval + 51] = val
    return arr;
  }, [])
*/

/*
const binWidth = 24000 / 16384
let averager = 1
dataArray
  .reduce((arr, val, i) => {
    if (i < 19) return arr;
    const interval = Math.round(this.to_n(i * binWidth))
    if (arr[interval]) {
      arr[interval] += dataArray.norm(val)
      ++averager
    } else {
      arr[interval - 1] = arr[interval - 1] / averager
      arr[interval] = dataArray.norm(val)
      averager = 1
    }
    return arr;
  }, [])
*/

class maxFreqArray extends Uint8Array {
  _binWidth = 24000 / 16384
  _maxDB = 0
  _maxFreq = 0

  max() {
    const max = this.reduce((max, value, index) => {
      return value > max[0] ? [value, index] : max;
    }, [0, 0]);
    this._maxDB = max[0];
    this._maxFreq = max[1] * this._binWidth;
    return this._maxFreq;
  }

  norm(v) {
    return 100 * v / (this._maxDB || 1);
  }
}

window.customElements.define('tu-ner', TuNer)

export { TuNer };