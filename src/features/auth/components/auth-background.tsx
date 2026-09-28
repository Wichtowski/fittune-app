import { useEffect, useRef } from "react";

/*
 * Animated backdrop for the auth hero panel: a drifting simplex-noise field rendered through an
 * 8x8 ordered (Bayer) dither in the volt accent, faded out towards the centre so copy stays legible.
 * Plain WebGL keeps it dependency-free; without WebGL the panel simply stays flat.
 */

const PIXEL_SIZE = 3;
const NOISE_SCALE = 2;
const SPEED = 0.05;
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

void main() {
  vec2 cell = floor(gl_FragCoord.xy / ${PIXEL_SIZE.toFixed(1)});
  vec2 uv = cell * ${PIXEL_SIZE.toFixed(1)} / u_resolution.y;
  float n = snoise(vec3(uv * ${NOISE_SCALE.toFixed(1)}, u_time)) * 0.5 + 0.5;
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
    const start = performance.now();
    let frame = 0;
    const draw = () => {
      gl.uniform1f(uTime, reducedMotion ? 0 : ((performance.now() - start) / 1000) * SPEED);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

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
