import './style.css'
import { site, projects, indexNames } from './data.js'
import { loadFonts, drawProject, hash, styleNames } from './textures.js'
import { Stage } from './gl/stage.js'
import { tween, ease, wait, lerp } from './utils.js'

const $ = (s, el = document) => el.querySelector(s)
const body = document.body

/* ---------------------------------------------------------------- content */

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const multiLine = new Set(['stack', 'sketch', 'chapters', 'blocks'])

// Index-only entries get generated artwork in one of the existing styles.
const extras = indexNames.map((name) => {
  const slug = slugify(name)
  const h = hash(slug)
  const style = styleNames[h % styleNames.length]
  const ref = projects.find((p) => p.style === style) || projects[0]
  const upper = name.toUpperCase()
  return {
    slug,
    title: name,
    description: 'Placeholder entry — add a real description for this project in src/data.js.',
    client: name,
    year: String(2018 + (h % 6)),
    credit: 'Placeholder',
    style,
    mark: multiLine.has(style) ? (style === 'sketch' ? ['NO.', upper.split(' ')[0]] : upper.split(' ')) : name,
    colors: ref.colors,
    aspect: 1.75,
  }
})

const all = [...projects, ...extras]
const bySlug = Object.fromEntries(all.map((p) => [p.slug, p]))
const featuredIndex = (p) => projects.indexOf(p)

const urlCache = new Map()
function imageURL(p, opts = {}, key = 'card') {
  const k = `${p.slug}:${key}`
  if (!urlCache.has(k)) urlCache.set(k, drawProject(p, opts).toDataURL('image/jpeg', 0.86))
  return urlCache.get(k)
}

function fillStatic() {
  document.title = site.title
  document.querySelectorAll('[data-site-name]').forEach((el) => (el.textContent = site.name))
  $('.profile-bio').textContent = site.bio
  $('.profile-stats').textContent = site.stats
  $('.profile-links').innerHTML = site.links
    .map((l) => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`)
    .join('<span>×</span>')

  const ordered = [...all].sort((a, b) => hash(a.slug + 'i') - hash(b.slug + 'i'))
  $('.full-list').innerHTML = ordered
    .map(
      (p, i) =>
        `<a class="full-item" href="/projects/${p.slug}" data-slug="${p.slug}" style="--i:${i}">${p.title}</a>` +
        (i < ordered.length - 1 ? '<span class="full-dot">·</span>' : '')
    )
    .join('')

  // plain-HTML version of the site for screen readers and crawlers
  $('#sr').innerHTML = `
    <h1>${site.title}</h1><p>${site.bio}</p>
    <h2>Featured work</h2>
    <ul>${projects.map((p) => `<li><a href="/projects/${p.slug}">${p.title}</a> — ${p.description}</li>`).join('')}</ul>
    <ul><li><a href="/full">Full index</a></li><li><a href="/newsletter">Newsletter</a></li></ul>`
}

/* ------------------------------------------------------------------ state */

const state = {
  view: 'featured', // 'featured' | 'full'
  profile: false,
  project: null,
  newsletter: false,
}

let stage
let pendingRect = null

function syncStage() {
  const onCarousel = state.view === 'featured' && !state.project && !state.newsletter
  stage.cardsAlpha.target = state.view === 'featured' ? 1 : 0
  stage.interactive = onCarousel && !state.profile
  stage.scrollable = onCarousel
  stage.dim.target = state.project || state.newsletter ? 1 : 0
  stage.ring.target = state.profile && onCarousel ? 1 : 0

  body.classList.toggle('is-full', state.view === 'full' && !state.project)
  body.classList.toggle('is-profile', state.profile && onCarousel)
  body.classList.toggle('is-project', !!state.project)
  document.querySelectorAll('[data-view]').forEach((a) => a.classList.toggle('is-active', a.dataset.view === state.view))
  $('#profileBtn').textContent = state.profile ? 'Close' : 'Profile'
}

/* ---------------------------------------------------------------- routing */

function navigate(path) {
  if (path === location.pathname) return
  history.pushState(null, '', path)
  queueRoute()
}

let chain = Promise.resolve()
function queueRoute() {
  chain = chain.then(applyRoute).catch(console.error)
}

async function applyRoute() {
  const path = location.pathname.replace(/\/$/, '') || '/'
  const m = path.match(/^\/projects\/([\w-]+)$/)
  const next = m ? bySlug[m[1]] || null : null

  if (state.project && state.project !== next) await closeProject()

  state.newsletter = path === '/newsletter'
  $('#newsletter').classList.toggle('is-open', state.newsletter)
  if (state.newsletter) setTimeout(() => $('#newsletter input').focus(), 300)

  if (path === '/full') state.view = 'full'
  else if (!next) state.view = 'featured'
  if (path !== '/') state.profile = false
  syncStage()

  if (next && next !== state.project) await openProject(next)
}

/* ---------------------------------------------------------------- project */

const panelEl = $('.project-panel')
const projectEl = $('#project')

function setPanel(from, to, t) {
  const sx = lerp(from.width / to.width, 1, t)
  const sy = lerp(from.height / to.height, 1, t)
  const x = lerp(from.x - to.x, 0, t)
  const y = lerp(from.y - to.y, 0, t)
  panelEl.style.transform = `translate(${x}px, ${y}px) scale(${sx}, ${sy})`
  // counter-scale the corner radius so it stays round while stretched
  const r = lerp(18, 20, t)
  panelEl.style.borderRadius = `${r / sx}px / ${r / sy}px`
}

// Screen rect of a strip card laid flat on the z=0 plane (1 unit == 1px).
function flatRect(i) {
  const c = stage.cards[i]
  return { x: c.x + stage.vw / 2 - c.w / 2, y: stage.vh / 2 - c.h / 2, width: c.w, height: c.h }
}

function fallbackRect(to) {
  return { x: to.x + to.width * 0.3, y: to.y + to.height * 0.3, width: to.width * 0.4, height: to.height * 0.4 }
}

async function openProject(p) {
  state.project = p
  const idx = featuredIndex(p)
  $('#projectTitle').textContent = p.title
  $('.project-desc').textContent = p.description
  $('.project-meta').innerHTML =
    `<a class="go" href="#" aria-label="Visit site"><svg viewBox="0 0 10 10" width="9" height="9"><path d="M2 8L8 2M3.5 2H8v4.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a>` +
    [p.client, p.year, p.credit].map((t) => `<span class="tag">${t}</span>`).join('')

  const cover = $('.project-cover')
  cover.src = imageURL(p, {}, 'card')
  cover.style.opacity = 1

  // the card's own artwork leads the column, so the flown card "reappears" there
  const media = $('.project-media')
  media.innerHTML = ''
  ;[0, 1, 2, 3].forEach((v) => {
    const img = new Image()
    img.alt = `${p.title} — screen ${v + 1}`
    img.src = v
      ? imageURL(p, { variant: v, withCaption: false, aspect: v === 2 ? 1.5 : p.aspect }, `g${v}`)
      : imageURL(p, { withCaption: false }, 'clean')
    media.appendChild(img)
  })
  $('.project-scroll').scrollTop = 0

  // Featured cards fly out of the strip in WebGL; anything else (index-only
  // projects, or a card that is off screen) grows the DOM panel instead.
  const fly = idx >= 0 && state.view === 'featured' && stage.cardRect(idx)
  const from = fly ? null : pendingRect
  pendingRect = null

  panelEl.style.transform = 'none'
  panelEl.style.borderRadius = ''
  projectEl.classList.add('is-open')
  const to = panelEl.getBoundingClientRect()
  syncStage()

  if (fly) {
    // 1. the GL card flattens where it is
    cover.style.transition = 'none'
    cover.style.opacity = 0
    panelEl.style.opacity = 0
    const flat = flatRect(idx)
    stage.flight = { i: idx, p: 0, to: stage.planeRect(flat) }
    await tween(450, ease.outCubic, (t) => (stage.flight.p = t))
    // 2. the moment it is flat: cut to a white panel of the same rect...
    stage.hiddenCard = idx
    stage.cards[idx].alpha = 0
    stage.flight = null
    setPanel(flat, to, 0)
    panelEl.style.opacity = 1
    requestAnimationFrame(() => (cover.style.transition = ''))
    // 3. ...which snaps open to full size while the content comes up
    let shown = false
    await tween(650, ease.outExpo, (t) => {
      setPanel(flat, to, t)
      if (!shown && t > 0.7) {
        shown = true
        projectEl.classList.add('is-content')
      }
    })
    projectEl.classList.add('is-content')
    $('.project-close').focus({ preventScroll: true })
    return
  } else {
    const start = from || fallbackRect(to)
    setPanel(start, to, 0)
    panelEl.style.opacity = from ? 1 : 0
    await tween(1000, ease.outExpo, (t) => {
      setPanel(start, to, t)
      if (!from) panelEl.style.opacity = Math.min(1, t * 3)
    })
  }
  projectEl.classList.add('is-content')
  cover.style.opacity = 0
  $('.project-close').focus({ preventScroll: true })
}

async function closeProject() {
  const p = state.project
  const idx = featuredIndex(p)
  const cover = $('.project-cover')
  const fly = idx >= 0 && state.view === 'featured' && stage.cardRect(idx)
  projectEl.classList.remove('is-content')
  state.project = null
  const to = panelEl.getBoundingClientRect()
  if (!fly) cover.style.opacity = 1
  // let the content drop away, then cut from the white panel to the card
  await wait(fly ? 220 : 300)

  if (fly) {
    // white panel shrinks back to the card's flat rect, cuts to the GL card,
    // which then bends back onto the strip
    const flat = flatRect(idx)
    const base = { x: to.x, y: to.y, width: to.width, height: to.height }
    await tween(550, ease.inOutCubic, (t) => setPanel(flat, base, 1 - t))
    stage.flight = { i: idx, p: 1, to: stage.planeRect(flat) }
    stage.hiddenCard = -1
    stage.cards[idx].alpha = 1
    // draw the GL card now, before the panel goes, so no frame shows neither
    stage.update()
    projectEl.classList.remove('is-open')
    panelEl.style.transform = 'none'
    syncStage()
    await tween(500, ease.inOutCubic, (t) => (stage.flight.p = 1 - t))
    stage.flight = null
    return
  }

  const end = fallbackRect(to)
  const base = { x: to.x, y: to.y, width: to.width, height: to.height }
  await tween(800, ease.inOutExpo, (t) => {
    setPanel(end, base, 1 - t)
    panelEl.style.opacity = 1 - t
  })
  stage.hiddenCard = -1
  projectEl.classList.remove('is-open')
  panelEl.style.opacity = 1
}

/* ------------------------------------------------------------------ events */

function bindUI() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link], a.full-item')
    if (!a || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    if (a.classList.contains('full-item')) {
      const pv = $('#preview')
      if (pv.classList.contains('on')) {
        const r = pv.getBoundingClientRect()
        pendingRect = { x: r.x, y: r.y, width: r.width, height: r.height }
      }
      pv.classList.remove('on')
    }
    navigate(new URL(a.href).pathname)
  })

  $('#profileBtn').addEventListener('click', () => {
    if (location.pathname !== '/') {
      state.profile = true
      navigate('/')
      return
    }
    state.profile = !state.profile
    syncStage()
  })

  $('.project-close').addEventListener('click', () => navigate(state.view === 'full' ? '/full' : '/'))
  $('#newsletter').addEventListener('click', (e) => {
    if (e.target.id === 'newsletter') navigate('/')
  })
  $('.newsletter-form').addEventListener('submit', (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('is-done')
  })

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (state.project) navigate(state.view === 'full' ? '/full' : '/')
    else if (state.newsletter) navigate('/')
    else if (state.profile) {
      state.profile = false
      syncStage()
    }
  })

  window.addEventListener('popstate', queueRoute)

  // Full index: floating preview that follows the cursor
  const pv = $('#preview')
  const img = $('img', pv)
  const list = $('.full-list')
  list.addEventListener('mouseover', (e) => {
    const a = e.target.closest('.full-item')
    if (!a) return
    img.src = imageURL(bySlug[a.dataset.slug], { width: 600 }, 'thumb')
    pv.classList.add('on')
  })
  list.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest?.('.full-item')) pv.classList.remove('on')
  })
  window.addEventListener('mousemove', (e) => {
    pv.style.left = `${e.clientX}px`
    pv.style.top = `${e.clientY - 120}px`
  })

  stage.onHover = (i) => body.classList.toggle('is-hover', i >= 0)
  stage.onClick = (i) => {
    pendingRect = stage.cardRect(i)
    navigate(`/projects/${projects[i].slug}`)
  }
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  const dashes = document.querySelectorAll('.loader i')
  fillStatic()
  stage = new Stage($('#gl'))
  if (import.meta.env.DEV) window.__stage = stage
  const loop = () => {
    stage.update()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  await loadFonts()
  dashes[0].classList.add('on')
  await wait(150)

  const canvases = projects.map((p) => drawProject(p))
  dashes[1].classList.add('on')
  await wait(150)

  stage.setCards(canvases)
  bindUI()
  dashes[2].classList.add('on')
  await wait(500)

  $('#loader').classList.add('done')
  body.classList.add('is-ready')

  // intro: spin the carousel in from the right
  const m = location.pathname.match(/^\/projects\/([\w-]+)/)
  const startOn = m && bySlug[m[1]] ? featuredIndex(bySlug[m[1]]) : -1
  if (startOn > 0) stage.focus(startOn)
  const s = stage.scroll
  const end = s.target
  const start = end - stage.total * 0.6
  s.current = s.prev = start
  s.locked = true
  queueRoute()
  await tween(2800, ease.outCubic, (t) => (s.current = lerp(start, end, t)))
  s.locked = false
}

boot()
