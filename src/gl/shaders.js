// Cards are laid out in pixel space on the z=0 plane, then wrapped onto the
// inside of a cylinder in the vertex shader. `bend()` in stage.js mirrors this
// math on the CPU for hit-testing and screen rects — keep them in sync.

export const cardVertex = /* glsl */ `
  uniform vec2 uCenter;
  uniform vec2 uSize;
  uniform float uScale;
  uniform float uRadius;
  uniform float uVel;
  uniform float uWave;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec2 p = uCenter + position.xy * uSize * uScale;
    float a = p.x / uRadius;
    float k = 1.0 + min(abs(uVel), 1.5) * 0.5;
    vec3 w;
    w.x = sin(a) * uRadius;
    w.y = p.y;
    w.z = (1.0 - cos(a)) * uRadius * k + sin(uv.x * 3.14159265) * abs(uVel) * uWave;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`

export const cardFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uSize;
  uniform float uScale;
  uniform float uCorner;
  uniform float uAlpha;
  uniform float uDim;
  uniform float uHover;

  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 size = uSize * uScale;
    float d = roundedBox((vUv - 0.5) * size, size * 0.5, uCorner);
    float mask = 1.0 - smoothstep(-1.0, 0.5, d);

    // subtle zoom-in of the artwork on hover
    vec2 uv = (vUv - 0.5) * (1.0 - uHover * 0.04) + 0.5;
    vec3 col = texture2D(uMap, uv).rgb;
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
