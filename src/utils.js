export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
// frame-rate independent damping
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt))

export const ease = {
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
}

// Minimal tween: tween(800, ease.outExpo, (t) => ...) → Promise
export function tween(duration, easing, onUpdate) {
  return new Promise((resolve) => {
    const start = performance.now()
    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1)
      onUpdate(easing(t))
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))
