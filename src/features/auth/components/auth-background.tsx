import { useEffect, useRef } from "react";

/*
 * Animated backdrop for the auth hero panel: a drifting simplex-noise field rendered through an
 * 8x8 ordered (Bayer) dither in the volt accent, faded out towards the centre so copy stays legible.
 * The pointer pushes dots aside while hovering, and a click/tap sends a shockwave that scatters them.
 * Plain WebGL keeps it dependency-free; without WebGL the panel simply stays flat.
 */

const PIXEL_SIZE = 3;
const NOISE_SCALE = 2;
const SPEED = 0.15;
// Interaction tuning, in units of canvas height.
const HOVER_RADIUS = 0.14;
const HOVER_PUSH = 0.07;
const MAX_RIPPLES = 4;
const RIPPLE_SPEED = 0.7; // ring expansion per second
const RIPPLE_WIDTH = 0.07;
const RIPPLE_PUSH = 0.1;
const RIPPLE_LIFE = 1.6; // seconds
// Transparent in the middle, dithered towards the edges.
const MASK =
  "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 0%, transparent 28%, rgb(0 0 0 / 0.5) 58%, black 88%)";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;
uniform vec3 u_pointer; // xy position, z hover strength 0..1
uniform vec4 u_ripples[${MAX_RIPPLES}]; // xy origin, z age in seconds, w 1 when active

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Recursive Bayer matrix without bit ops (GLSL ES 1.0).
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 cell = floor(gl_FragCoord.xy / ${PIXEL_SIZE.toFixed(1)});
  vec2 uv = cell * ${PIXEL_SIZE.toFixed(1)} / u_resolution.y;

  // Sampling the field closer to the pointer makes the pattern move away from it.
  vec2 toPointer = uv - u_pointer.xy;
  float pointerDist = length(toPointer);
  vec2 away = toPointer / max(pointerDist, 1e-4);
  float hover = u_pointer.z * exp(-pointerDist * pointerDist / ${(HOVER_RADIUS * HOVER_RADIUS).toFixed(4)});
  vec2 offset = away * hover * ${HOVER_PUSH.toFixed(3)};
  float influence = hover;

  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = u_ripples[i];
    vec2 d = uv - r.xy;
    float dist = length(d);
    float ring = exp(-pow((dist - r.z * ${RIPPLE_SPEED.toFixed(3)}) / ${RIPPLE_WIDTH.toFixed(3)}, 2.0));
    float fade = r.w * (1.0 - r.z / ${RIPPLE_LIFE.toFixed(3)});
    offset += (d / max(dist, 1e-4)) * ring * fade * ${RIPPLE_PUSH.toFixed(3)};
    influence += ring * fade;
  }

  // Per-cell jitter breaks the pattern into loose, scattered dots where the pointer is active.
  vec2 jitter = vec2(hash(cell), hash(cell + 17.0)) - 0.5;
  vec2 sampleUv = uv - offset + jitter * min(influence, 1.0) * 0.05;

  float n = snoise(vec3(sampleUv * ${NOISE_SCALE.toFixed(1)}, u_time)) * 0.5 + 0.5;
  n *= 1.0 - 0.5 * min(hover, 1.0); // thin out right under the cursor
  float on = step(bayer8(cell), n);
  gl_FragColor = vec4(u_color * on, on);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** Resolves a CSS colour (oklch included) to 0..1 sRGB by painting a single pixel. */
function resolveColor(css: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0.6, 0.9, 0.2];
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: true });
    if (!canvas || !gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // One oversized triangle covers the viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    const uRipples = gl.getUniformLocation(program, "u_ripples");

    // Deeper green on the light card (volt washes out on white), full volt on graphite.
    const applyTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      const token = getComputedStyle(canvas).getPropertyValue(dark ? "--primary" : "--primary-strong").trim();
      gl.uniform3fv(uColor, resolveColor(token));
      canvas.style.opacity = dark ? "0.4" : "0.35";
      canvas.style.mixBlendMode = dark ? "screen" : "multiply";
    };

    const resize = () => {
      // Pixelated by design, so render at CSS resolution rather than device pixels.
      canvas.width = Math.max(1, canvas.clientWidth);
      canvas.height = Math.max(1, canvas.clientHeight);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pointer state in shader space (canvas-height units, origin bottom-left). The canvas itself is
    // pointer-events-none so the copy stays clickable; events are read on window instead.
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 };
    let ripples: { x: number; y: number; born: number }[] = [];
    const rippleData = new Float32Array(MAX_RIPPLES * 4);

    const toLocal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      const scale = rect.height || 1;
      return { inside, x: (event.clientX - rect.left) / scale, y: (rect.bottom - event.clientY) / scale };
    };
    const onPointerMove = (event: PointerEvent) => {
      const { inside, x, y } = toLocal(event);
      if (pointer.targetStrength === 0 && inside) {
        // Entering: jump there instead of sweeping in from the last exit point.
        pointer.x = x;
        pointer.y = y;
      }
      pointer.targetX = x;
      pointer.targetY = y;
      pointer.targetStrength = inside ? 1 : 0;
    };
    const onPointerDown = (event: PointerEvent) => {
      const { inside, x, y } = toLocal(event);
      if (!inside) return;
      ripples = [...ripples.slice(-(MAX_RIPPLES - 1)), { x, y, born: performance.now() }];
      onPointerMove(event);
    };
    const onPointerEnd = (event: PointerEvent) => {
      // Touch has no hover; release the push once the finger lifts.
      if (event.pointerType !== "mouse") pointer.targetStrength = 0;
    };
    const onPointerLeave = () => {
      pointer.targetStrength = 0;
    };

    const start = performance.now();
    let last = start;
    let frame = 0;
    const draw = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const follow = 1 - Math.exp(-dt * 12);
      pointer.x += (pointer.targetX - pointer.x) * follow;
      pointer.y += (pointer.targetY - pointer.y) * follow;
      pointer.strength += (pointer.targetStrength - pointer.strength) * (1 - Math.exp(-dt * 6));
      gl.uniform3f(uPointer, pointer.x, pointer.y, pointer.strength);

      ripples = ripples.filter((r) => (now - r.born) / 1000 < RIPPLE_LIFE);
      rippleData.fill(0);
      ripples.forEach((r, i) => rippleData.set([r.x, r.y, (now - r.born) / 1000, 1], i * 4));
      gl.uniform4fv(uRipples, rippleData);

      gl.uniform1f(uTime, reducedMotion ? 0 : ((now - start) / 1000) * SPEED);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointerup", onPointerEnd, { passive: true });
      window.addEventListener("pointercancel", onPointerEnd, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    applyTheme();
    resize();
    draw();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion) draw();
    });
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      applyTheme();
      if (reducedMotion) draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      // No loseContext(): the canvas hands back the same context on remount (StrictMode), so killing it
      // would leave the panel blank. The context is released with the canvas.
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      style={{ maskImage: MASK, WebkitMaskImage: MASK, imageRendering: "pixelated" }}
    />
  );
}
