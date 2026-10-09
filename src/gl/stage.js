import * as THREE from 'three'
import {
  cardVertex,
  cardFragment,
  floorVertex,
  floorFragment,
  lensVertex,
  lensFragment,
} from './shaders.js'
import { clamp, damp, ease, lerp } from '../utils.js'

const GAP = 12

export class Stage {
  constructor(container) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 1)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 30000)

    this.cards = []
    this.scroll = { target: 0, current: 0, prev: 0, vel: 0 }
    this.pointer = { x: -1, y: -1, down: false, startX: 0, lastX: 0, moved: 0, inside: false }
    this.hovered = -1
    this.interactive = false
    this.scrollable = false
    this.cardsAlpha = { v: 0, target: 0 }
    this.dim = { v: 0, target: 0 }
    this.hiddenCard = -1
    // card flying between the strip and the detail panel: { i, p, to }
    this.flight = null
    this.ring = { v: 0, target: 0 }
    this.mouse = { x: 0, y: 0, sx: 0, sy: 0 }

    this.onHover = () => {}
    this.onClick = () => {}

    this.clock = new THREE.Clock()
    this._tmp = new THREE.Vector3()

    this.createFloor()
    this.createLens()
    this.bindEvents()
    this.resize()
  }

  /* --------------------------------------------------------------- setup */

  setCards(canvases) {
    this.textures = canvases.map((cv) => {
      const t = new THREE.CanvasTexture(cv)
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      t.minFilter = THREE.LinearMipmapLinearFilter
      return t
    })
    const geo = new THREE.PlaneGeometry(1, 1, 120, 60)
    this.cards = canvases.map((cv, i) => {
      const uniforms = {
        uMap: { value: this.textures[i] },
        uCenter: { value: new THREE.Vector2() },
        uSize: { value: new THREE.Vector2() },
        uRadius: { value: 1000 },
        uVel: { value: 0 },
        uWave: { value: 0 },
        uStripAmp: { value: 0 },
        uStripFreq: { value: 0.003 },
        uStripX: { value: 0 },
        uStripW: { value: 1 },
        uMouse: { value: new THREE.Vector2() },
        uPress: { value: 0 },
        uDentR: { value: 120 },
        uDentDepth: { value: 120 },
        uFlat: { value: 0 },
        uTexAspect: { value: cv.width / cv.height },
        uPillC: { value: new THREE.Vector2() },
        uPillR: { value: 12 },
        uPillHover: { value: 0 },
        uMarkOut: { value: 0 },
        uMarkIn: { value: 0 },
        uCorner: { value: 18 },
        uAlpha: { value: 0 },
        uDim: { value: 0 },
      }
      const mesh = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader: cardVertex,
          fragmentShader: cardFragment,
          transparent: true,
          extensions: { derivatives: true },
        })
      )
      mesh.frustumCulled = false
      this.scene.add(mesh)
      return {
        mesh,
        uniforms,
        aspect: cv.width / cv.height,
        base: 0,
        w: 0,
        h: 0,
        x: 0,
        alpha: 0,
        // liquid press springs
        press: 0,
        pressV: 0,
        mx: 0,
        my: 0,
        mvx: 0,
        mvy: 0,
        pill: 0, // arrow swap timeline, 0..1
        delay: i * 0.06,
      }
    })
    this.layout()
  }

  createFloor() {
    this.floorUniforms = {
      uCell: { value: 140 },
      uOffset: { value: 0 },
      uFar: { value: -9000 },
      uAlpha: { value: 0 },
    }
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60000, 30000),
      new THREE.ShaderMaterial({
        uniforms: this.floorUniforms,
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        transparent: true,
        depthWrite: false,
      })
    )
    this.floor.rotation.x = -Math.PI / 2
    this.floor.renderOrder = -1
    this.scene.add(this.floor)
  }

  // Profile view: the strip is rendered off-screen, then warped through a
  // gravitational lens (see lensFragment) so it wraps around a black disc.
  createLens() {
    this.rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 })
    this.lensUniforms = {
      tScene: { value: this.rt.texture },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2() },
      uHorizon: { value: 0 },
      uBand: { value: 0 },
      uDisp: { value: 0.06 },
    }
    this.lensScene = new THREE.Scene()
    this.lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.lensUniforms,
        vertexShader: lensVertex,
        fragmentShader: lensFragment,
        depthTest: false,
        depthWrite: false,
      })
    )
    quad.frustumCulled = false
    this.lensScene.add(quad)
  }

  /* -------------------------------------------------------------- layout */

  resize() {
    // hidden/minimised windows can report 0×0; fall back to the last good size
    const w = window.innerWidth || this.vw || 1280
    const h = window.innerHeight || this.vh || 720
    this.vw = w
    this.vh = h
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    // place the camera so that 1 world unit == 1 CSS pixel on the z=0 plane
    this.dist = h / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
    this.camera.position.set(0, 0, this.dist)
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
    this.radius = Math.max(w * 1.05, 900)
    this.layout()
    this.layoutLens()
  }

  layout() {
    if (!this.cards.length) return
    const mobile = this.vw < 700
    const cardH = mobile ? Math.min(this.vh * 0.32, this.vw * 0.5) : Math.min(this.vh * 0.435, 550)
    let x = 0
    this.cards.forEach((c) => {
      c.h = cardH
      c.w = cardH * c.aspect
      c.base = x + c.w / 2
      x += c.w + GAP
    })
    this.total = x
    // centre the first card
    const shift = this.cards[0].w / 2
    this.cards.forEach((c) => (c.base -= shift))
    this.cardH = cardH
    // static depth wave shared by the shader and strip() below
    this.wave = {
      amp: cardH * 0.65,
      freq: (Math.PI * 2) / (this.vw * 0.7),
      x: -this.vw * 0.125, // crest position (screen-space px from centre)
      w: this.vw * 0.32,
    }
    this.floor.position.set(0, -cardH * 0.5 - this.vh * 0.1, -12000)
    this.floorUniforms.uCell.value = Math.max(90, cardH * 0.28)
    this.cards.forEach((c) => {
      c.uniforms.uSize.value.set(c.w, c.h)
      c.uniforms.uRadius.value = this.radius
      c.uniforms.uWave.value = cardH * 0.35
      c.uniforms.uStripAmp.value = this.wave.amp
      c.uniforms.uStripFreq.value = this.wave.freq
      c.uniforms.uStripX.value = this.wave.x
      c.uniforms.uStripW.value = this.wave.w
      c.uniforms.uDentR.value = cardH * 0.3
      c.uniforms.uDentDepth.value = cardH * 1.1
      c.uniforms.uPillR.value = Math.max(10, cardH * 0.04)
      c.uniforms.uCorner.value = mobile ? 12 : 18
    })
  }

  layoutLens() {
    const dpr = this.renderer.getPixelRatio()
    this.rt.setSize(Math.round(this.vw * dpr), Math.round(this.vh * dpr))
    this.lensUniforms.uRes.value.set(this.vw, this.vh)
    const m = Math.min(this.vh, this.vw)
    this.lensH = m * 0.37 // black disc the profile text sits in
    this.lensB = m * 0.08 // ring the strip wraps around
  }

  /* -------------------------------------------------------------- events */

  bindEvents() {
    window.addEventListener('resize', () => this.resize())

    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.scrollable) return
        const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? this.vh : 1
        const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit
        this.scroll.target += clamp(d, -400, 400) * 1.2
      },
      { passive: true }
    )

    const el = this.renderer.domElement
    el.addEventListener('pointerdown', (e) => {
      this.pointer.down = true
      this.pointer.startX = this.pointer.lastX = e.clientX
      this.pointer.moved = 0
    })
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = e.clientX
      this.pointer.y = e.clientY
      this.pointer.inside = true
      this.mouse.x = (e.clientX / this.vw) * 2 - 1
      this.mouse.y = (e.clientY / this.vh) * 2 - 1
      if (this.pointer.down && this.scrollable) {
        const dx = e.clientX - this.pointer.lastX
        this.pointer.lastX = e.clientX
        this.pointer.moved += Math.abs(dx)
        this.scroll.target -= dx * (e.pointerType === 'touch' ? 2.2 : 1.6)
      }
    })
    window.addEventListener('pointerup', (e) => {
      if (!this.pointer.down) return
      this.pointer.down = false
      if (this.pointer.moved < 6 && this.interactive) {
        const i = this.hitTest(e.clientX, e.clientY)
        if (i >= 0) this.onClick(i)
      }
    })
    document.addEventListener('pointerleave', () => (this.pointer.inside = false))

    window.addEventListener('keydown', (e) => {
      if (!this.scrollable) return
      if (e.key === 'ArrowRight') this.scroll.target += this.cardH * 1.7
      if (e.key === 'ArrowLeft') this.scroll.target -= this.cardH * 1.7
    })
  }

  /* --------------------------------------------------------- projection */

  // CPU mirror of the vertex shader.
  bend(x, y, u, vel) {
    const R = this.radius
    const a = x / R
    const k = 1 + Math.min(Math.abs(vel), 1.5) * 0.5
    return {
      x: Math.sin(a) * R,
      y,
      z: (1 - Math.cos(a)) * R * k + this.strip(x) + Math.sin(u * Math.PI) * Math.abs(vel) * this.cardH * 0.35,
    }
  }

  // static film-strip wave in depth (mirrors strip() in the vertex shader)
  strip(x) {
    const { amp, freq, x: x0, w } = this.wave
    const e = (x - x0) / w
    return amp * Math.exp(-e * e) * Math.cos((x - x0) * freq)
  }

  // Inverse of bend() for one card: closest card-local point under the cursor.
  localPoint(c, px, py) {
    const nu = 32, nv = 16
    let best = Infinity, bx = 0, by = 0
    for (let i = 0; i <= nu; i++) {
      const u = i / nu
      const x = c.x - c.w / 2 + u * c.w
      for (let j = 0; j <= nv; j++) {
        const y = -c.h / 2 + (j / nv) * c.h
        const p = this.toScreen(this.bend(x, y, u, this.scroll.vel))
        const d = (p.x - px) ** 2 + (p.y - py) ** 2
        if (d < best) {
          best = d
          bx = x - c.x
          by = y
        }
      }
    }
    return { x: bx, y: by }
  }

  toScreen(p) {
    const v = this._tmp.set(p.x, p.y, p.z).project(this.camera)
    return { x: ((v.x + 1) / 2) * this.vw, y: ((1 - v.y) / 2) * this.vh, behind: v.z > 1 }
  }

  // Screen-space outline of a card (top edge left→right, bottom edge right→left).
  outline(c, steps = 10) {
    const hw = c.w / 2
    const hh = c.h / 2
    const vel = this.scroll.vel
    const top = []
    const bottom = []
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const x = c.x - hw + u * hw * 2
      top.push(this.toScreen(this.bend(x, hh, u, vel)))
      bottom.unshift(this.toScreen(this.bend(x, -hh, u, vel)))
    }
    return top.concat(bottom)
  }

  isVisible(c) {
    return Math.abs(c.x) / this.radius < Math.PI * 0.42
  }

  hitTest(px, py) {
    let found = -1
    this.cards.forEach((c, i) => {
      if (found >= 0 || !this.isVisible(c) || c.alpha < 0.5) return
      if (pointInPolygon(px, py, this.outline(c))) found = i
    })
    return found
  }

  cardRect(i) {
    const c = this.cards[i]
    if (!c || !this.isVisible(c)) return null
    const pts = this.outline(c, 6)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const r = {
      left: Math.min(...xs),
      top: Math.min(...ys),
      right: Math.max(...xs),
      bottom: Math.max(...ys),
    }
    if (r.right < 0 || r.left > this.vw) return null
    return { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top }
  }

  // Screen rect (CSS px) → centre/size on the z=0 plane, where 1 unit == 1px.
  planeRect(r) {
    return { x: r.x + r.width / 2 - this.vw / 2, y: this.vh / 2 - (r.y + r.height / 2), w: r.width, h: r.height }
  }

  // Scroll so card `i` sits in the middle of the screen.
  focus(i) {
    const c = this.cards[i]
    const offset = wrap(c.base - this.scroll.target, this.total)
    this.scroll.target += offset
  }

  /* ----------------------------------------------------------------- loop */

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime
    const s = this.scroll

    if (!s.locked) s.current = damp(s.current, s.target, 5, dt)
    const delta = s.current - s.prev
    s.prev = s.current
    const rawVel = clamp(delta / Math.max(this.vw * 0.02, 1), -1.5, 1.5)
    s.vel = damp(s.vel, rawVel, 8, dt)

    this.cardsAlpha.v = damp(this.cardsAlpha.v, this.cardsAlpha.target, 4, dt)
    this.dim.v = damp(this.dim.v, this.dim.target, 6, dt)
    this.floorUniforms.uAlpha.value = Math.min(1, this.cardsAlpha.v * 1.5 + 0.0001)
    this.floorUniforms.uOffset.value = s.current % (this.floorUniforms.uCell.value * 1000)

    // hover
    let hovered = -1
    if (this.interactive && this.pointer.inside && !this.pointer.down) {
      hovered = this.hitTest(this.pointer.x, this.pointer.y)
    }
    if (hovered !== this.hovered) {
      this.hovered = hovered
      this.onHover(hovered)
    }

    this.cards.forEach((c, i) => {
      c.x = wrap(c.base - s.current, this.total)
      const reveal = clamp((this.cardsAlpha.v - c.delay * 0.5) / 0.6, 0, 1)
      const targetA = i === this.hiddenCard ? 0 : reveal
      c.alpha = damp(c.alpha, targetA, 12, dt)
      // liquid press: under-damped springs for depth and cursor position
      if (i === hovered) {
        const m = this.localPoint(c, this.pointer.x, this.pointer.y)
        if (c.press < 0.02) {
          c.mx = m.x
          c.my = m.y
        }
        c.mvx += ((m.x - c.mx) * 90 - c.mvx * 11) * dt
        c.mvy += ((m.y - c.my) * 90 - c.mvy * 11) * dt
      }
      c.mx += c.mvx * dt
      c.my += c.mvy * dt
      c.pressV += (((i === hovered ? 1 : 0) - c.press) * 70 - c.pressV * 7) * dt
      c.press += c.pressV * dt
      // arrow swap: the resting → leaves, then a ↗ draws itself in; reversed on leave
      const dir = i === hovered ? 1 : -1
      c.pill = clamp(c.pill + (dir * dt) / 0.75, 0, 1)
      const u = c.uniforms
      const fl = this.flight && this.flight.i === i ? this.flight : null
      const p = fl ? fl.p : 0
      const cx = fl ? lerp(c.x, fl.to.x, p) : c.x
      const cy = fl ? lerp(0, fl.to.y, p) : 0
      const cw = fl ? lerp(c.w, fl.to.w, p) : c.w
      const ch = fl ? lerp(c.h, fl.to.h, p) : c.h
      u.uSize.value.set(cw, ch)
      u.uFlat.value = p
      u.uCorner.value = lerp(this.vw < 700 ? 12 : 18, this.vw < 700 ? 15 : 20, p)
      const pr = u.uPillR.value
      const pad = this.cardH * 0.045
      u.uPillC.value.set(cw / 2 - pad - pr, -ch / 2 + pad + pr)
      u.uPillHover.value = ease.outCubic(clamp(c.pill / 0.5, 0, 1))
      u.uMarkOut.value = ease.inOutCubic(clamp(c.pill / 0.4, 0, 1))
      u.uMarkIn.value = ease.outCubic(clamp((c.pill - 0.3) / 0.7, 0, 1))
      u.uCenter.value.set(cx, cy)
      u.uPress.value = c.press
      u.uMouse.value.set(c.mx, c.my)
      u.uVel.value = s.vel
      u.uAlpha.value = c.alpha
      u.uDim.value = fl ? 0 : this.dim.v
      if (fl) u.uAlpha.value = 1
      c.mesh.visible = fl ? true : c.alpha > 0.001 && this.isVisible(c)
      // the flying card draws over everything; otherwise nearer cards last
      c.mesh.renderOrder = fl ? 1e6 : Math.round(-Math.abs(c.x))
      c.mesh.material.depthTest = !fl
    })

    // profile lens: grows in/out on a damped clock
    this.ring.v = damp(this.ring.v, this.ring.target, this.ring.target ? 3.2 : 6, dt)
    const p = this.ring.v
    if (p < 0.002) {
      this.renderer.render(this.scene, this.camera)
      return
    }
    this.mouse.sx = damp(this.mouse.sx, this.mouse.x, 3, dt)
    this.mouse.sy = damp(this.mouse.sy, this.mouse.y, 3, dt)
    const u = this.lensUniforms
    u.uCenter.value.set(this.vw / 2 + this.mouse.sx * 14, this.vh / 2 - this.mouse.sy * 14)
    u.uHorizon.value = this.lensH * p
    u.uBand.value = this.lensB * p
    this.renderer.setRenderTarget(this.rt)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.lensScene, this.lensCamera)
  }
}

function wrap(v, total) {
  return ((((v + total / 2) % total) + total) % total) - total / 2
}

function pointInPolygon(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j]
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
