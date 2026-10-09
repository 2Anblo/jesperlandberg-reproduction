// Cards are laid out in pixel space on the z=0 plane, then wrapped onto the
// inside of a cylinder whose depth ripples like a film strip. `bend()` in
// stage.js mirrors the strip math on the CPU for hit-testing and screen rects —
// keep them in sync.

export const cardVertex = /* glsl */ `
  uniform vec2 uCenter;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uVel;
  uniform float uWave;
  uniform float uStripAmp;
  uniform float uStripFreq;
  uniform float uStripX;    // screen-space x of the wave crest
  uniform float uStripW;    // width of the wave envelope

  // liquid press
  uniform vec2 uMouse;     // cursor in card-local px (origin = card centre)
  uniform float uPress;    // spring-driven 0..1 (may overshoot)
  uniform float uDentR;    // dent radius in px
  uniform float uDentDepth;

  varying vec2 vUv;
  varying float vShade;
  varying float vDent;
  varying float vWave; // -1 trough .. 1 crest

  // Static wave fixed to the screen: biggest at the crest, flat on the right.
  float strip(float x) {
    float e = (x - uStripX) / uStripW;
    return uStripAmp * exp(-e * e) * cos((x - uStripX) * uStripFreq);
  }

  void main() {
    vUv = uv;
    vec2 local = position.xy * uSize;

    // gaussian dent around the cursor; pull the surface inwards towards it
    vec2 toM = local - uMouse;
    float s2 = uDentR * uDentR;
    float f = exp(-dot(toM, toM) / s2) * uPress;
    // fade the dent out towards the card border so edges and corners stay put
    vec2 edge = uSize * 0.5 - abs(local);
    f *= smoothstep(0.0, uDentR * 0.9, min(edge.x, edge.y));
    // slope of the dent, lit from the top-left, gives the crease its shading
    vec2 grad = -2.0 * toM / s2 * f;
    vShade = dot(grad, normalize(vec2(-1.0, 1.0))) * uDentR * 0.5;
    vDent = f;

    vec2 p = uCenter + local;
    float wave = strip(p.x);
    vWave = wave / max(uStripAmp, 1.0);
    float a = p.x / uRadius;
    float k = 1.0 + min(abs(uVel), 1.5) * 0.5;
    vec3 w;
    w.x = sin(a) * uRadius;
    w.y = p.y;
    w.z = (1.0 - cos(a)) * uRadius * k
        + wave
        + sin(uv.x * 3.14159265) * abs(uVel) * uWave
        - f * uDentDepth;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`

export const cardFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uSize;
  uniform float uCorner;
  uniform float uAlpha;
  uniform float uDim;
  uniform vec2 uMouse;

  // round arrow button, bottom-right
  uniform vec2 uPillC;      // centre, card-local px
  uniform float uPillR;     // radius px
  uniform float uPillHover; // 0..1 grow
  uniform float uMarkOut;   // 0..1 resting → slides out to the right
  uniform float uMarkIn;    // 0..1 diagonal ↗ draws itself in

  varying vec2 vUv;
  varying float vShade;
  varying float vDent;
  varying float vWave; // -1 trough .. 1 crest

  // anti-aliased capsule stroke from a to b, half-width w (button units)
  float stroke(vec2 p, vec2 a, vec2 b, float w, float aa) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return 1.0 - smoothstep(w - aa, w + aa, length(pa - ba * h));
  }

  // arrow pointing +x; draw = 0..1 grows the shaft first, then the head
  float arrow(vec2 p, float draw, float w, float aa) {
    float shaft = clamp(draw / 0.6, 0.0, 1.0);
    float head = clamp((draw - 0.45) / 0.55, 0.0, 1.0);
    vec2 tail = vec2(-0.42, 0.0), tip = vec2(0.42, 0.0);
    vec2 end = mix(tail, tip, shaft);
    float m = shaft > 0.0 ? stroke(p, tail, end, w, aa) : 0.0;
    if (head > 0.0) {
      float len = 0.3 * head;
      m = max(m, stroke(p, tip, tip + len * vec2(-0.7071, 0.7071), w, aa));
      m = max(m, stroke(p, tip, tip + len * vec2(-0.7071, -0.7071), w, aa));
    }
    return m;
  }

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    float d = roundedBox((vUv - 0.5) * uSize, uSize * 0.5, uCorner);
    float mask = 1.0 - smoothstep(-1.0, 0.5, d);

    // lens-like refraction: the dent magnifies what is under the cursor
    vec2 mUv = uMouse / uSize + 0.5;
    vec2 uv = vUv + (mUv - vUv) * vDent * 0.25;
    vec3 col = texture2D(uMap, uv).rgb;

    col *= 1.0 - clamp(-vShade, 0.0, 1.0) * 0.8;    // crease shadow
    col += clamp(vShade, 0.0, 1.0) * 0.45;           // rim highlight
    col *= 1.0 - vDent * 0.15;

    // light the strip by its depth: crests catch light, troughs fall into shade
    col *= 1.0 + (vWave > 0.0 ? vWave * 0.12 : vWave * 0.5);

    // arrow button
    vec2 q = ((vUv - 0.5) * uSize - uPillC) / uPillR;
    float aa = 1.2 / uPillR;
    float scale = 1.0 + uPillHover * 0.18;
    float disc = 1.0 - smoothstep(scale - aa, scale + aa, length(q));
    q /= scale;
    float w = 0.075;
    // leaving copy slides out along +x and is clipped by the disc
    float mark = uMarkOut < 1.0 ? arrow(q - vec2(uMarkOut * 1.5, 0.0), 1.0, w, aa) : 0.0;
    // arriving diagonal: rotate -45° so the arrow points up-right, slide in from bottom-left
    vec2 r = vec2(q.x + q.y, q.y - q.x) * 0.7071 + vec2((1.0 - uMarkIn) * 0.5, 0.0);
    mark = max(mark, arrow(r, uMarkIn, w, aa));
    col = mix(col, vec3(0.0), disc);
    col = mix(col, vec3(1.0), mark * disc);

    col *= 1.0 - uDim * 0.75;

    float a = mask * uAlpha;
    if (a < 0.001) discard;
    gl_FragColor = vec4(col, a);
  }
`

export const floorVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

export const floorFragment = /* glsl */ `
  uniform float uCell;
  uniform float uOffset;
  uniform float uFar;
  uniform float uAlpha;
  varying vec3 vWorld;

  void main() {
    vec2 g = vec2(vWorld.x + uOffset, vWorld.z) / uCell;
    vec2 fw = fwidth(g);
    vec2 l = abs(fract(g - 0.5) - 0.5) / fw;
    float line = 1.0 - min(min(l.x, l.y), 1.0);
    float fade = smoothstep(uFar, uFar * 0.15, vWorld.z);
    // thin out lines that collapse into sub-pixel noise near the horizon
    fade *= 1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y));
    gl_FragColor = vec4(vec3(1.0), line * fade * 0.32 * uAlpha);
  }
`
