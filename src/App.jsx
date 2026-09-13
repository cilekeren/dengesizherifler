import { useEffect, useRef } from 'react'
import './index.css'
import logoUrl from './assets/logo.png'
import arsivUrl from './assets/arsiv.png'

const FONT = '"Archivo", Helvetica, Arial, sans-serif'
const PAL = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0', '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff']
const BASE = '#0000aa'
const GL = '▓▒░█#%&@$§Ξ/\\|<>*'
const S = .75

const TRACKS = [
  { n: 'This is Angara', d: '02:48', title: ['THIS IS', 'ANGARA!'] },
  { n: 'Herkes Dinlesin', d: '03:12', title: ['HERKES', 'DİNLESİN'] },
  { n: 'Ben Yaptım Oldu', d: '02:05', title: ['BEN YAPTIM', 'OLDU'] },
  { n: 'Prova Kasedi A', d: '04:31', title: ['PROVA', 'KASEDİ A'] },
  { n: 'Prova Kasedi B', d: '03:57', title: ['PROVA', 'KASEDİ B'] },
  { n: 'Son Oturum', d: '01:22', title: ['SON', 'OTURUM'] },
]

const rnd = (a, b) => a + Math.random() * (b - a)
const ri = (a, b) => Math.floor(rnd(a, b + 1))
const pick = (a) => a[ri(0, a.length - 1)]

export default function App() {
  const rootRef = useRef(null)
  const heroRef = useRef(null)
  const fxRef = useRef(null)
  const tcRef = useRef(null)
  const viewsRef = useRef(null)
  const rowRefs = useRef([])

  useEffect(() => {
    let alive = true
    const root = rootRef.current
    const hero = heroRef.current
    const fx = fxRef.current
    const hx = hero.getContext('2d')
    const fc = fx.getContext('2d')

    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
    const COARSE = matchMedia('(pointer: coarse)').matches
    const MOB = () => innerWidth <= 760

    /* pointer */
    const P = { x: innerWidth * .5, y: innerHeight * .45, vx: 0, vy: 0, sp: 0 }
    const onPointerMove = (e) => { P.vx = e.clientX - P.x; P.vy = e.clientY - P.y; P.x = e.clientX; P.y = e.clientY; P.sp = Math.min(90, P.sp + Math.hypot(P.vx, P.vy) * .35) }
    addEventListener('pointermove', onPointerMove, { passive: true })

    /* canvases */
    let W = 2, H = 2, cache = {}, mainTex, slices = []
    const logo = new Image(); logo.src = logoUrl
    const buf = document.createElement('canvas'), bx = buf.getContext('2d')

    function size() {
      W = Math.max(2, Math.round(innerWidth * S)); H = Math.max(2, Math.round(innerHeight * S))
      hero.width = fx.width = buf.width = W; hero.height = fx.height = buf.height = H
      hx.imageSmoothingEnabled = fc.imageSmoothingEnabled = false
      hx.fillStyle = BASE; hx.fillRect(0, 0, W, H)
      cache = {}; mainTex = logoTex(); mkSlices()
    }
    function setFont(x, fs) { x.font = `900 ${fs}px ${FONT}`; if ('fontStretch' in x) x.fontStretch = 'condensed' }
    function tex(lines) {
      const k = lines.join('|'); if (cache[k]) return cache[k]
      const m = document.createElement('canvas').getContext('2d'); setFont(m, 100)
      const mx = W * (MOB() ? .035 : .025), wmax = Math.max(...lines.map(l => m.measureText(l).width)), lh = .86
      const hMax = MOB() ? H * .46 : H * .72
      const fs = Math.min((W - mx * 2) / wmax * 100, hMax / (lines.length * lh))
      const top = MOB() ? H * .09 : (H - lines.length * fs * lh) / 2 - H * .04
      const o = {}
      for (const [c, col] of [['R', '#ff0000'], ['G', '#00ff00'], ['B', '#0000ff']]) {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d')
        setFont(x, fs); x.fillStyle = col; x.textBaseline = 'top'
        lines.forEach((l, i) => { const w = x.measureText(l).width; x.fillText(l, (W - w) / 2, top + i * fs * lh) })
        o[c] = cv
      }
      return cache[k] = o
    }
    function logoTex() {
      const mob = MOB(), ar = logo.naturalWidth / logo.naturalHeight
      let lw = W * (mob ? .4 : .36), lh = lw / ar; const hMax = H * (mob ? .17 : .22); if (lh > hMax) { lh = hMax; lw = lh * ar }
      const lx = (W - lw) / 2, ly = mob ? 78 * S : (H - lh) / 2 - H * .07
      const o = {}
      for (const [c, col] of [['R', '#ff0000'], ['G', '#00ff00'], ['B', '#0000ff']]) {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d')
        x.imageSmoothingQuality = 'high'; x.drawImage(logo, lx, ly, lw, lh)
        x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H)
        x.globalCompositeOperation = 'destination-in'; x.drawImage(logo, lx, ly, lw, lh)
        o[c] = cv
      }
      return o
    }
    function mkSlices() { slices = []; let y = 0; while (y < H) { const h = ri(2, Math.max(5, H / 16 | 0)); slices.push({ y, h, o: 0, stuck: 0, so: 0 }); y += h } }

    let split = 2, burst = 0, freeze = 0
    function drawTex(T, mode, g) {
      g = g || hx
      const my = P.y * S, mvx = P.vx * S
      split += ((1.5 + Math.min(P.sp * .1, 9) + burst * 10) - split) * .18
      g.globalCompositeOperation = mode
      for (const s of slices) {
        const d = (s.y + s.h / 2 - my) / (H * .12), inf = RM ? 0 : Math.exp(-d * d)
        let tg = inf * mvx * 6; if (burst > .05) tg += rnd(-1, 1) * burst * W * .08
        if (s.stuck > 0) { s.stuck--; tg = s.so } else if (!RM && Math.random() < .003) { s.stuck = ri(8, 70); s.so = rnd(-W * .07, W * .07) }
        if (!RM && Math.random() < .012) tg += rnd(-W * .03, W * .03)
        s.o += (tg - s.o) * .22
        const o = s.o | 0, sp = Math.max(1, (split * (.7 + inf * .9)) | 0)
        g.drawImage(T.R, 0, s.y, W, s.h, o - sp, s.y, W, s.h)
        g.drawImage(T.G, 0, s.y, W, s.h, o, s.y, W, s.h)
        g.drawImage(T.B, 0, s.y, W, s.h, o + sp, s.y, W, s.h)
      }
      g.globalCompositeOperation = 'source-over'
    }
    function blocks(n) { for (let i = 0; i < n; i++) { const w = ri(8, W / 4 | 0), h = ri(2, H / 9 | 0), sx = ri(0, W - w), sy = ri(0, H - h); hx.drawImage(hero, sx, sy, w, h, sx + ri(-60, 60), sy + ri(-4, 4), w, h) } }
    let drips = []
    function dripStep() {
      if (!RM && !COARSE && P.sp > 3 && Math.random() < .7) drips.push({ x: P.x * S | 0, y: P.y * S | 0, w: ri(1, 5), len: 2, life: ri(25, 70) })
      for (const d of drips) { d.len = Math.min(d.len + rnd(1, 4), H * .4); d.life--; hx.drawImage(hero, d.x, d.y, d.w, 1, d.x, d.y, d.w, d.len | 0) }
      drips = drips.filter(d => d.life > 0); if (drips.length > 80) drips.splice(0, drips.length - 80)
    }

    /* hover scenes */
    const arsiv = new Image(); arsiv.src = arsivUrl
    const nz = document.createElement('canvas'); nz.width = 160; nz.height = 90; const nzx = nz.getContext('2d'), nzd = nzx.createImageData(160, 90)
    let hexRows = []
    function scene(m, t) {
      const tt = RM ? 0 : t
      if (m === 0) {
        hx.fillStyle = '#fff'; hx.fillRect(0, 0, W, H); const cs = Math.max(8, W / 22 | 0); hx.fillStyle = '#000'
        for (let r = 0; r * cs < H; r++) { const off = Math.sin(tt * .002 + r * .5) * cs * 1.5 + (P.x * S - W / 2) * .25 * (r * cs / H); for (let c = -3; c * cs < W + cs * 3; c++) if ((c + r) & 1) hx.fillRect(c * cs + off | 0, r * cs, cs, cs) }
      } else if (m === 1) {
        const d = nzd.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() < .5 ? 0 : ri(80, 255); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 } nzx.putImageData(nzd, 0, 0); hx.drawImage(nz, 0, 0, W, H)
        hx.fillStyle = '#ff00ff'; const y = (tt * .08) % H; hx.fillRect(0, y | 0, W, ri(2, 8)); hx.fillStyle = '#00ffff'; hx.fillRect(0, (y * 1.7) % H | 0, W, 2)
      } else if (m === 2) {
        const bars = ['#c0c0c0', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff']; const bw = W / bars.length
        bars.forEach((c, i) => { hx.fillStyle = c; hx.fillRect(i * bw | 0, 0, Math.ceil(bw), H * .72 | 0) }); hx.fillStyle = '#000'; hx.fillRect(0, H * .72 | 0, W, H)
        for (let i = 0; i < 8; i++) { const y = ri(0, H), h = ri(2, H / 8 | 0); hx.drawImage(hero, 0, y, W, h, ri(-W / 5 | 0, W / 5 | 0), y, W, h) }
      } else if (m === 3 || m === 4) {
        hx.fillStyle = m === 3 ? '#000' : '#008080'; hx.fillRect(0, 0, W, H)
        if (arsiv.complete) {
          const sc = Math.max(W / 280 * (m === 3 ? .9 : 1.6), 1), iw = 280 * sc, ih = 518 * sc; const oy = RM ? 0 : -((tt * (m === 3 ? .02 : .05)) % ih)
          for (let k = 0; k < 3; k++) hx.drawImage(arsiv, (W - iw) / 2 | 0, (oy + k * ih) | 0, iw | 0, ih | 0)
        }
      } else {
        hx.fillStyle = BASE; hx.fillRect(0, 0, W, H); const fs = Math.max(7, H / 40 | 0); hx.font = `${fs}px "Courier New",monospace`; hx.textBaseline = 'top'
        if (!hexRows.length) for (let i = 0; i < 120; i++) { let s = ''; for (let j = 0; j < 24; j++) s += ri(0, 255).toString(16).padStart(2, '0') + ' '; hexRows.push(s) }
        const off = RM ? 0 : (tt * .03) % fs, first = RM ? 0 : (tt * .03 / fs | 0)
        for (let r = 0; r * fs < H + fs; r++) { hx.fillStyle = r % 7 ? '#c0c0c0' : '#fff'; hx.fillText(hexRows[(first + r) % hexRows.length], 4, r * fs - off) }
      }
    }

    /* gpu artifacts */
    let fxI = []
    function vramTile() { const c = document.createElement('canvas'); const tw = ri(3, 12) * 2, th = ri(2, 6) * 2; c.width = tw; c.height = th; const x = c.getContext('2d'); const cols = [pick(PAL), pick(PAL), pick(PAL)]; for (let i = 0; i < tw; i += 2) for (let j = 0; j < th; j += 2) if (Math.random() < .6) { x.fillStyle = pick(cols); x.fillRect(i, j, 2, 2) } return c }
    function checkTile() { const c = document.createElement('canvas'); const s = ri(2, 6); c.width = c.height = s * 2; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, s * 2, s * 2); x.fillStyle = '#000'; x.fillRect(0, 0, s, s); x.fillRect(s, s, s, s); return c }
    function artifact(k) {
      if (RM) return; k = k || pick(['vram', 'vram', 'bars', 'lines', 'tear', 'check', 'roll', 'freeze'])
      if (k === 'vram' || k === 'check') { const h = ri(3, H / 5 | 0); fxI.push({ x: Math.random() < .5 ? 0 : ri(0, W / 2 | 0), y: ri(0, H - h), w: Math.random() < .5 ? W : ri(W / 6 | 0, W / 2 | 0), h, p: fc.createPattern(k === 'check' ? checkTile() : vramTile(), 'repeat'), l: ri(6, 40) }) }
      else if (k === 'bars') { for (let i = ri(3, 12); i--;) fxI.push({ x: ri(0, W), y: 0, w: ri(1, 6), h: H, c: pick(['#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#000']), l: ri(3, 9) }) }
      else if (k === 'lines') { for (let i = ri(2, 8); i--;) fxI.push({ x: 0, y: ri(0, H), w: W, h: 1, c: pick(['#ff00ff', '#00ff00', '#fff']), l: ri(4, 14) }) }
      else if (k === 'tear') { const c = Math.random() < .7 ? 'tear' : 'tear2'; document.body.classList.add(c); setTimeout(() => document.body.classList.remove(c), ri(60, 160)) }
      else if (k === 'roll') { document.body.classList.add('roll'); setTimeout(() => document.body.classList.remove('roll'), 520) }
      else if (k === 'freeze') { freeze = ri(25, 80) }
    }
    function fxStep() {
      fc.clearRect(0, 0, W, H)
      for (const i of fxI) { i.l--; fc.fillStyle = i.p || i.c; fc.fillRect(i.x, i.y, i.w, i.h) }
      fxI = fxI.filter(i => i.l > 0)
      if (!RM && P.sp > 45 && Math.random() < .12) { fxI.push({ x: P.x * S + ri(-30, 30) | 0, y: P.y * S + ri(-20, 20) | 0, w: ri(6, 30), h: ri(3, 14), p: fc.createPattern(vramTile(), 'repeat'), l: ri(4, 12) }) }
    }

    const timers = new Set()
    const setT = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }

    ;(function sched() {
      if (RM || !alive) return
      setT(() => { if (!alive) return; artifact(); if (Math.random() < .35) setT(() => { if (alive) artifact() }, ri(40, 200)); sched() }, rnd(1200, 4800))
    })()

    /* text scramble + jitter on dom text */
    function scramble(el) {
      if (RM || el._s) return; const orig = el.dataset.o || (el.dataset.o = el.textContent); el._s = 1; let f = 0; const n = orig.length
      const iv = setInterval(() => {
        f++; const done = f * n / 14
        el.textContent = [...orig].map((c, i) => i < done || c === ' ' ? c : GL[ri(0, GL.length - 1)]).join('')
        if (done >= n) { clearInterval(iv); el.textContent = orig; el._s = 0 }
      }, 28)
    }
    const scrEls = [...root.querySelectorAll('[data-scr]')]
    const scrHandlers = scrEls.map(el => { const h = () => scramble(el); el.addEventListener('pointerenter', h); return [el, h] })

    ;(function jitLoop() {
      if (RM || !alive) return
      setT(() => {
        if (!alive) return
        const all = [...root.querySelectorAll('[data-scr], .row, h2')]; const el = pick(all)
        if (el) {
          el.style.setProperty('--jx', ri(-14, 14) + 'px'); el.style.setProperty('--jc', ri(10, 70) + '%'); el.classList.add('jit')
          setT(() => el.classList.remove('jit'), ri(60, 180))
          if (Math.random() < .4 && el.dataset.scr !== undefined) scramble(el)
        }
        jitLoop()
      }, rnd(500, 2200))
    })()

    /* recordings: hover = full-screen scene */
    let pv = null; const t0 = performance.now()
    function setPv(i, el) {
      root.querySelectorAll('.row.on').forEach(r => r.classList.remove('on'))
      if (i == null) { pv = null; document.body.classList.remove('pv'); return }
      el.classList.add('on'); pv = { i, s: performance.now(), t: TRACKS[i] }; document.body.classList.add('pv')
      burst = Math.max(burst, .7); artifact('tear')
    }
    const rowCleanups = []
    rowRefs.current.forEach((b, i) => {
      if (!b) return
      if (!COARSE) {
        const enter = () => setPv(i, b), leave = () => setPv(null)
        b.addEventListener('pointerenter', enter); b.addEventListener('pointerleave', leave)
        b.addEventListener('focus', enter); b.addEventListener('blur', leave)
        rowCleanups.push(() => { b.removeEventListener('pointerenter', enter); b.removeEventListener('pointerleave', leave); b.removeEventListener('focus', enter); b.removeEventListener('blur', leave) })
      } else {
        const click = () => { if (pv && pv.i === i) setPv(null); else setPv(i, b) }
        b.addEventListener('click', click)
        rowCleanups.push(() => b.removeEventListener('click', click))
      }
    })
    const tcode = ms => { const f = (ms / 1000 * 25 | 0) % 25, s = ms / 1000 | 0; return [s / 3600 | 0, (s / 60 | 0) % 60, s % 60, f].map(n => String(n).padStart(2, '0')).join(':') }

    /* real visitor counter, backed by a Cloudflare Pages Function + KV */
    const VIEWS_BASE = 58268
    fetch('/api/views').then(r => r.json()).then(({ views }) => {
      if (alive && viewsRef.current) viewsRef.current.textContent = String(views)
    }).catch(() => {
      if (viewsRef.current) viewsRef.current.textContent = String(VIEWS_BASE)
    })

    /* click anywhere empty = burst + smear */
    const onPointerDown = (e) => { if (e.target.closest('a,button') || RM) return; burst = 1; freeze = ri(18, 40); artifact(pick(['bars', 'vram', 'check'])) }
    addEventListener('pointerdown', onPointerDown)

    /* loop */
    let rafId
    function frame(t) {
      if (!alive) return
      const fadeAmt = freeze > 0 ? 0 : (P.sp > 25 ? .14 : .4)
      if (pv) {
        if (freeze <= 0) { scene(pv.i, t); drawTex(tex(pv.t.title), 'difference') }
        if (freeze <= 0 && tcRef.current) tcRef.current.textContent = tcode(t - pv.s) + ' / 00:' + pv.t.d
      } else {
        if (fadeAmt > 0) { hx.globalAlpha = fadeAmt; hx.fillStyle = BASE; hx.fillRect(0, 0, W, H); hx.globalAlpha = 1 }
        bx.clearRect(0, 0, W, H); drawTex(mainTex, 'lighter', bx); hx.drawImage(buf, 0, 0)
        if (freeze <= 0 && tcRef.current) tcRef.current.textContent = tcode(t - t0)
      }
      if (!RM) { if (Math.random() < .05 + burst * .5) blocks(ri(1, 4 + burst * 10 | 0)); dripStep() }
      fxStep()
      if (freeze > 0) freeze--
      P.vx *= .8; P.vy *= .8; P.sp *= .9; burst *= .9
      rafId = requestAnimationFrame(frame)
    }

    let rT
    const onResize = () => { clearTimeout(rT); rT = setTimeout(size, 120) }
    addEventListener('resize', onResize)

    const ready = document.fonts && document.fonts.load
      ? Promise.race([document.fonts.load(`900 100px ${FONT}`), new Promise(r => setTimeout(r, 1500))])
      : Promise.resolve()
    Promise.all([ready, logo.decode ? logo.decode().catch(() => {}) : Promise.resolve()]).then(() => {
      if (!alive) return
      size(); burst = 1; rafId = requestAnimationFrame(frame)
    })

    return () => {
      alive = false
      removeEventListener('pointermove', onPointerMove)
      removeEventListener('pointerdown', onPointerDown)
      removeEventListener('resize', onResize)
      clearTimeout(rT)
      if (rafId) cancelAnimationFrame(rafId)
      timers.forEach(id => clearTimeout(id))
      scrHandlers.forEach(([el, h]) => el.removeEventListener('pointerenter', h))
      rowCleanups.forEach(fn => fn())
      document.body.classList.remove('pv', 'tear', 'tear2', 'roll')
    }
  }, [])

  return (
    <>
      <canvas id="hero" ref={heroRef} role="img" aria-label="Dengesiz Herifler logosu" />
      <canvas id="fx" ref={fxRef} aria-hidden="true" />

      <main className="ui" ref={rootRef}>
        <h1 className="sr">Dengesiz Herifler</h1>
        <header className="top">
          <div>
            <p data-scr>Ska / Punk / Reggae</p>
            <p data-scr>This is Angara!</p>
          </div>
          <div className="r">
            <p id="tc" ref={tcRef} aria-hidden="true">00:00:00:00</p>
            <p data-scr>Angara, 2005</p>
          </div>
        </header>
        <div className="spacer" aria-hidden="true" />


        <section className="info" aria-labelledby="h-g">
          <h2 id="h-g">Grup</h2>
          <dl>
            <dt>Kadro</dt><dd data-scr>eren, doa, mustafa</dd>
            <dt>Görüntülenme</dt><dd id="views" ref={viewsRef}></dd>
          </dl>
          <p className="links">
            <a href="https://open.spotify.com/artist/5wR7ZD67JNA7TYsiycE32o" target="_blank" rel="noopener"><svg className="ic" aria-hidden="true"><use href="/icons.svg#spotify-icon" /></svg><span>Spotify</span></a>
            <a href="https://music.youtube.com/channel/UCTvWgmmdWiqjkx2P8aq2P0Q" target="_blank" rel="noopener"><svg className="ic" aria-hidden="true"><use href="/icons.svg#youtube-music-icon" /></svg><span>YouTube Music</span></a>
            <a href="https://music.apple.com/tr/artist/dengesiz-herifler/968509395" target="_blank" rel="noopener"><svg className="ic" aria-hidden="true"><use href="/icons.svg#apple-music-icon" /></svg><span>Apple Music</span></a>
            <a href="https://www.instagram.com/dengesiz.herifler/" target="_blank" rel="noopener"><svg className="ic" aria-hidden="true"><use href="/icons.svg#instagram-icon" /></svg><span>Instagram</span></a>
            <a href="https://web.archive.org/web/2008/http://www.myspace.com/dengesizherifler" target="_blank" rel="noopener">myspace.com/dengesizherifler</a>
            <a href="https://web.archive.org/web/2008/http://herkesdinlesin.com/dengesizherifler" target="_blank" rel="noopener">herkesdinlesin.com</a>
          </p>
        </section>
      </main>
    </>
  )
}
