// Procedural "website screenshot" artwork for each project, drawn on a 2D canvas.
// Every card is generated at runtime, so the repo ships no image assets.

const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif'
const SERIF = '"Instrument Serif", Georgia, serif'

export async function loadFonts() {
  if (!document.fonts) return
  await Promise.all(
    [
      `400 40px ${SANS}`,
      `500 40px ${SANS}`,
      `700 40px ${SANS}`,
      `800 40px ${SANS}`,
      `900 40px ${SANS}`,
      `italic 400 40px ${SERIF}`,
      `400 40px ${SERIF}`,
    ].map((f) => document.fonts.load(f).catch(() => {}))
  )
}

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

const lines = (m) => (Array.isArray(m) ? m : [m])

/* ------------------------------------------------------------------ styles */

const styles = {
  // type specimen: giant italic glyph pair + waterfall of sizes
  serif(c, w, h, p, r) {
    const [sand, brown, glow, dark] = p.colors
    c.fillStyle = '#f4efe6'
    c.fillRect(0, 0, w, h)
    c.fillStyle = sand
    c.fillRect(0, 0, w * 0.42, h)
    c.fillStyle = glow
    c.beginPath()
    c.arc(w * 0.36, h * 0.24, h * 0.09, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = dark
    c.font = `italic 400 ${h * 0.62}px ${SERIF}`
    c.fillText('Ag', w * 0.04, h * 0.74)
    const sizes = [0.13, 0.095, 0.07, 0.05, 0.036, 0.026]
    let y = h * 0.2
    sizes.forEach((s, i) => {
      c.font = `${i % 2 ? 'italic ' : ''}400 ${h * s}px ${SERIF}`
      c.fillStyle = i === 0 ? dark : brown
      c.fillText(i === 0 ? p.mark : 'Quiet mornings, warm paper', w * 0.47, y)
      y += h * s * 1.35
    })
    // weight scale
    for (let i = 0; i < 9; i++) {
      c.fillStyle = dark
      c.globalAlpha = 0.2 + i * 0.09
      c.fillRect(w * 0.47 + i * w * 0.05, h * 0.82, w * 0.04, h * 0.012 + i * h * 0.004)
    }
    c.globalAlpha = 1
    return { dark: false }
  },

  // archive: masonry of labelled tiles under a small headline
  stack(c, w, h, p, r) {
    c.fillStyle = '#efeeea'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#111'
    c.font = `800 ${h * 0.085}px ${SANS}`
    lines(p.mark).forEach((t, i) => c.fillText(t, w * 0.04, h * (0.16 + i * 0.085)))
    const cols = 5
    const gx = w * 0.012
    const colW = (w * 0.56 - gx * (cols - 1)) / cols
    for (let k = 0; k < cols; k++) {
      let y = h * 0.06 + r() * h * 0.1
      const x = w * 0.41 + k * (colW + gx)
      while (y < h) {
        const th = colW * (0.7 + r() * 0.9)
        c.fillStyle = p.colors[Math.floor(r() * p.colors.length)]
        c.fillRect(x, y, colW, th)
        c.fillStyle = 'rgba(255,255,255,0.8)'
        c.font = `600 ${h * 0.016}px ${SANS}`
        c.fillText(String(Math.floor(r() * 900) + 100), x + colW * 0.08, y + th - colW * 0.08)
        y += th + gx
      }
    }
    c.fillStyle = 'rgba(0,0,0,0.55)'
    c.font = `500 ${h * 0.022}px ${SANS}`
    ;['Moodboards', 'Prototypes', 'Released', 'Unreleased'].forEach((t, i) =>
      c.fillText(t, w * 0.04, h * (0.5 + i * 0.045))
    )
    return { dark: false }
  },

  // hand-drawn street map with pins
  sketch(c, w, h, p, r) {
    const [paper, ink, accent] = p.colors
    c.fillStyle = paper
    c.fillRect(0, 0, w, h)
    c.strokeStyle = ink
    c.lineCap = 'round'
    // roads
    for (let i = 0; i < 9; i++) {
      c.lineWidth = Math.max(1.5, w * (0.002 + r() * 0.004))
      c.beginPath()
      const vertical = i % 2
      const o = r()
      for (let s = 0; s <= 20; s++) {
        const t = s / 20
        const a = (vertical ? o * w : o * h) + Math.sin(t * 4 + i) * (vertical ? w : h) * 0.04
        if (vertical) c[s ? 'lineTo' : 'moveTo'](a, t * h)
        else c[s ? 'lineTo' : 'moveTo'](t * w, a)
      }
      c.stroke()
    }
    // river
    c.strokeStyle = 'rgba(29,29,29,0.35)'
    c.lineWidth = h * 0.03
    c.beginPath()
    c.moveTo(0, h * 0.8)
    c.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 1.0, w, h * 0.7)
    c.stroke()
    // pins
    for (let i = 0; i < 6; i++) {
      const x = w * (0.08 + r() * 0.5), y = h * (0.15 + r() * 0.6)
      c.fillStyle = accent
      c.strokeStyle = ink
      c.lineWidth = 2
      c.beginPath()
      c.arc(x, y, h * 0.022, 0, Math.PI * 2)
      c.fill()
      c.stroke()
    }
    // label box
    c.fillStyle = paper
    c.strokeStyle = ink
    c.lineWidth = 2
    c.fillRect(w * 0.64, h * 0.18, w * 0.31, h * 0.44)
    c.strokeRect(w * 0.64, h * 0.18, w * 0.31, h * 0.44)
    c.fillStyle = ink
    c.font = `500 ${h * 0.04}px ${SANS}`
    c.fillText(lines(p.mark)[0], w * 0.67, h * 0.28)
    c.font = `900 ${h * 0.15}px ${SANS}`
    c.fillText(lines(p.mark)[1] || '', w * 0.67, h * 0.45)
    c.font = `500 ${h * 0.025}px ${SANS}`
    c.fillText('A walking guide in 6 stops', w * 0.67, h * 0.55)
    return { dark: false }
  },

  // single oversized numeral with a progress ring
  chapters(c, w, h, p, r) {
    const [bg, fg, accent] = p.colors
    c.fillStyle = bg
    c.fillRect(0, 0, w, h)
    const n = 1 + Math.floor(r() * 9)
    const cx = w * 0.3, cy = h * 0.52, rad = h * 0.36
    c.strokeStyle = 'rgba(255,255,255,0.12)'
    c.lineWidth = h * 0.02
    c.beginPath()
    c.arc(cx, cy, rad, 0, Math.PI * 2)
    c.stroke()
    c.strokeStyle = accent
    c.beginPath()
    c.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + (n / 10) * Math.PI * 2)
    c.stroke()
    c.fillStyle = fg
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = `300 ${h * 0.42}px ${SERIF}`
    c.fillText(String(n), cx, cy + h * 0.02)
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
    c.font = `700 ${h * 0.055}px ${SANS}`
    lines(p.mark).forEach((t, i) => c.fillText(t, w * 0.6, h * (0.32 + i * 0.065)))
    c.fillStyle = 'rgba(255,255,255,0.4)'
    for (let i = 0; i < 6; i++) c.fillRect(w * 0.6, h * (0.62 + i * 0.03), w * (0.22 + r() * 0.12), h * 0.008)
    return { dark: true }
  },

  space(c, w, h, p, r) {
    const [bg, hot, warm, cool] = p.colors
    c.fillStyle = bg
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 400; i++) {
      c.fillStyle = `rgba(255,255,255,${r() * 0.8})`
      const s = r() * 2.2
      c.fillRect(r() * w, r() * h, s, s)
    }
    const px = w * 0.68, py = h * 0.62, pr = h * 0.45
    const pg = c.createRadialGradient(px - pr * 0.4, py - pr * 0.5, pr * 0.05, px, py, pr)
    pg.addColorStop(0, warm)
    pg.addColorStop(0.45, hot)
    pg.addColorStop(1, '#2a0b05')
    c.fillStyle = pg
    c.beginPath()
    c.arc(px, py, pr, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(255,210,157,0.5)'
    c.lineWidth = h * 0.006
    c.beginPath()
    c.ellipse(px, py, pr * 1.5, pr * 0.25, -0.25, 0, Math.PI * 2)
    c.stroke()
    const mg = c.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, h * 0.08)
    mg.addColorStop(0, '#dfe6ff')
    mg.addColorStop(1, cool)
    c.fillStyle = mg
    c.beginPath()
    c.arc(w * 0.2, h * 0.3, h * 0.07, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#fff'
    c.font = `800 ${h * 0.07}px ${SANS}`
    c.save()
    c.translate(w * 0.06, h * 0.55)
    spaced(c, p.mark, 0, 0, h * 0.02)
    c.restore()
    return { dark: true }
  },

  blocks(c, w, h, p, r) {
    const [paper, ...inks] = p.colors
    c.fillStyle = paper
    c.fillRect(0, 0, w, h)
    const cols = 6, rows = 4
    const cw = w / cols, rh = h / rows
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        if (r() > 0.45) continue
        c.fillStyle = inks[Math.floor(r() * inks.length)]
        const shape = r()
        if (shape < 0.5) c.fillRect(i * cw, j * rh, cw, rh)
        else {
          c.beginPath()
          c.arc(i * cw + cw / 2, j * rh + rh / 2, Math.min(cw, rh) / 2, 0, Math.PI * 2)
          c.fill()
        }
      }
    c.fillStyle = '#111'
    c.font = `900 ${h * 0.24}px ${SANS}`
    lines(p.mark).forEach((t, i) => c.fillText(t, w * 0.03, h * (0.27 + i * 0.24)))
    return { dark: false }
  },

  landscape(c, w, h, p, r) {
    const [sky1, sky2, hill1, hill2, sun] = p.colors
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, sky1)
    g.addColorStop(0.6, sky2)
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    c.fillStyle = sun
    c.beginPath()
    c.arc(w * 0.7, h * 0.45, h * 0.12, 0, Math.PI * 2)
    c.fill()
    ;[hill1, hill2, '#1a1830'].forEach((col, k) => {
      c.fillStyle = col
      c.beginPath()
      c.moveTo(0, h)
      const base = h * (0.55 + k * 0.13)
      const f1 = 2 + r() * 3, f2 = 5 + r() * 6, ph = r() * 6
      for (let x = 0; x <= w; x += 8) {
        const t = x / w
        c.lineTo(x, base + Math.sin(t * f1 + ph) * h * 0.05 + Math.sin(t * f2) * h * 0.015)
      }
      c.lineTo(w, h)
      c.fill()
    })
    c.fillStyle = '#fff1d6'
    c.font = `italic 400 ${h * 0.2}px ${SERIF}`
    c.fillText(p.mark, w * 0.05, h * 0.33)
    return { dark: true }
  },

  neon(c, w, h, p, r) {
    const [bg, ...glows] = p.colors
    c.fillStyle = bg
    c.fillRect(0, 0, w, h)
    c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const x = r() * w, y = r() * h, rad = h * (0.3 + r() * 0.5)
      const g = c.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, glows[i % glows.length] + 'aa')
      g.addColorStop(1, glows[i % glows.length] + '00')
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
    }
    c.globalCompositeOperation = 'source-over'
    c.strokeStyle = '#fff'
    c.lineWidth = Math.max(2, h * 0.004)
    c.font = `900 ${h * 0.2}px ${SANS}`
    c.textAlign = 'center'
    c.strokeText(p.mark, w / 2, h * 0.58)
    c.textAlign = 'left'
    return { dark: true }
  },
}

function pill(c, x, y, w, h) {
  c.beginPath()
  c.roundRect(x, y, w, h, h / 2)
  c.fill()
}

function spaced(c, text, x, y, gap) {
  for (const ch of text) {
    c.fillText(ch, x, y)
    x += c.measureText(ch).width + gap
  }
}

/* -------------------------------------------------------------- chrome */

// Fake browser-chrome bits so each card reads as a "website screenshot".
function chrome(c, w, h, dark) {
  const fg = dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)'
  c.fillStyle = fg
  c.font = `500 ${h * 0.022}px ${SANS}`
  c.textAlign = 'right'
  c.fillText('Work   Index   About', w * 0.96, h * 0.06)
  c.textAlign = 'left'
}

function caption(c, w, h, title, dark) {
  const g = c.createLinearGradient(0, h * 0.7, 0, h)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.12)')
  c.fillStyle = g
  c.fillRect(0, h * 0.7, w, h * 0.3)

  const s = h * 0.065
  c.fillStyle = dark ? '#fff' : '#111'
  c.font = `500 ${s}px ${SANS}`
  c.textBaseline = 'alphabetic'
  c.fillText(title, w * 0.035, h - h * 0.05)

  // little arrow button, bottom right
  const r = h * 0.035
  const cx = w - w * 0.035 - r, cy = h - h * 0.05 - r * 0.6
  c.fillStyle = '#000'
  c.beginPath()
  c.arc(cx, cy, r, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = '#fff'
  c.lineWidth = r * 0.14
  c.beginPath()
  c.moveTo(cx - r * 0.35, cy)
  c.lineTo(cx + r * 0.35, cy)
  c.moveTo(cx + r * 0.05, cy - r * 0.3)
  c.lineTo(cx + r * 0.35, cy)
  c.lineTo(cx + r * 0.05, cy + r * 0.3)
  c.stroke()
}

/* --------------------------------------------------------------- public */

export function drawProject(project, { width = 1200, variant = 0, withCaption = true, aspect } = {}) {
  const a = aspect || project.aspect || 1.75
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round(width / a)
  const c = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height
  const r = rng(hash(project.slug) + variant * 9973)
  const draw = styles[project.style] || styles.blocks

  if (variant === 0) {
    const { dark } = draw(c, w, h, project, r)
    chrome(c, w, h, dark)
    if (withCaption) caption(c, w, h, project.title, dark)
    return canvas
  }

  // Gallery screens: re-use the artwork as a detail crop or as mobile mockups.
  const art = document.createElement('canvas')
  art.width = w
  art.height = Math.round(w / (project.aspect || 1.75))
  const { dark } = draw(art.getContext('2d'), art.width, art.height, project, r)

  if (variant % 2 === 1) {
    const z = 1.6 + r() * 0.6
    const sw = art.width / z, sh = sw * (h / w)
    c.drawImage(art, r() * (art.width - sw), r() * Math.max(0, art.height - sh), sw, sh, 0, 0, w, h)
    chrome(c, w, h, dark)
  } else {
    c.fillStyle = dark ? '#1a1a1a' : '#ecebe7'
    c.fillRect(0, 0, w, h)
    const ph = h * 0.8, pw = ph * 0.48
    for (let i = 0; i < 3; i++) {
      const x = w / 2 + (i - 1) * pw * 1.18 - pw / 2
      const y = (h - ph) / 2 + (i === 1 ? -h * 0.02 : h * 0.02)
      c.save()
      c.beginPath()
      c.roundRect(x, y, pw, ph, pw * 0.1)
      c.clip()
      const sx = (art.width - art.height * 0.48) * (i / 2)
      c.drawImage(art, sx, 0, art.height * 0.48, art.height, x, y, pw, ph)
      c.restore()
    }
  }
  return canvas
}

export const styleNames = Object.keys(styles)
