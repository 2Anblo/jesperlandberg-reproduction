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
  uniform float uTime;
  uniform float uStripAmp;
  uniform float uStripFreq;

  // liquid press
  uniform vec2 uMouse;     // cursor in card-local px (origin = card centre)
  uniform float uPress;    // spring-driven 0..1 (may overshoot)
  uniform float uDentR;    // dent radius in px
  uniform float uDentDepth;

  varying vec2 vUv;
  varying float vShade;
  varying float vDent;

  float strip(float x, float t) {
    return uStripAmp * (sin(x * uStripFreq + t * 0.35) * 0.7 + sin(x * uStripFreq * 2.3 - t * 0.22 + 1.7) * 0.3);
  }

  void main() {
    vUv = uv;
    vec2 local = position.xy * uSize;

    // gaussian dent around the cursor; pull the surface inwards towards it
    vec2 toM = local - uMouse;
    float s2 = uDentR * uDentR;
    float f = exp(-dot(toM, toM) / s2) * uPress;
    local -= toM * f * 0.28;
    // slope of the dent, lit from the top-left, gives the crease its shading
    vec2 grad = -2.0 * toM / s2 * f;
    vShade = dot(grad, normalize(vec2(-1.0, 1.0))) * uDentR * 0.5;
    vDent = f;

    vec2 p = uCenter + local;
    float a = p.x / uRadius;
    float k = 1.0 + min(abs(uVel), 1.5) * 0.5;
    vec3 w;
    w.x = sin(a) * uRadius;
    w.y = p.y;
    w.z = (1.0 - cos(a)) * uRadius * k
        + strip(p.x, uTime)
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

  varying vec2 vUv;
  varying float vShade;
  varying float vDent;

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
