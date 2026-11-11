// 背景。ステージごとのフラグメントシェーダーで、奥行きのある景色を1枚の四角形に描く。
// WebGL が使えない端末では ok が false になり、render.mjs が簡易な背景を描く。

const COMMON = `
precision highp float;
uniform vec2 uRes; uniform float uT, uScroll, uSpell, uBeat, uDim; uniform vec3 uCol; uniform int uBoss;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + vec2(17., 9.); a *= .5; } return s; }
float stars(vec2 uv, float dens){ vec2 g = floor(uv * dens), f = fract(uv * dens) - .5; float h = hash(g);
  vec2 o = (vec2(hash(g + 1.3), hash(g + 2.7)) - .5) * .6; float tw = .55 + .45 * sin(uT * 2. + h * 40.);
  return smoothstep(.09, .0, length(f + o)) * step(.8, h) * tw; }
`;

// uv は左上が (0,0)、右下が (1,1)
const SCENES = [
// ── 1面：極光の遊歩道 ── 凍った道の上にオーロラ。氷に光が映る
`
vec3 aurora(float x, float h){
  vec3 c = vec3(0.);
  for (int i = 0; i < 3; i++) { float fi = float(i);
    float wob = fbm(vec2(x * 1.6 + fi * 3.1, uT * .06 + fi));
    float base = .16 + fi * .2 + .08 * sin(x * 2. + uT * .1 + fi * 2.);
    float band = exp(-pow((h - base - wob * .2) * 4.2, 2.));
    float rays = .5 + .5 * noise(vec2(x * 24. + fi * 9. + wob * 5., uT * .22 + fi));
    float curtain = smoothstep(.28, .7, fbm(vec2(x * 2.2 + uT * .035 + fi * 5., fi * 2.)));
    vec3 col = mix(vec3(.15, 1., .55), vec3(.95, .3, .85), clamp(h * 1.3 + fi * .12 - .15, 0., 1.));
    col = mix(col, vec3(.2, .7, 1.), .3 * fi);
    c += col * band * rays * curtain * (.6 + uBeat * .25);
  }
  return c;
}
vec3 scene(vec2 uv){
  float hz = .34, x = uv.x - .5; vec3 col;
  if (uv.y < hz) {
    float h = (hz - uv.y) / hz;
    col = mix(vec3(.03, .12, .16), vec3(.01, .015, .07), h);
    col += vec3(.8, .9, 1.) * stars(uv, 70.) * (.25 + h);
    col += aurora(x * 2., h) * .95;
    float m = .05 + fbm(vec2(x * 7., 3.)) * .16;
    if (h < m) col = mix(vec3(.012, .04, .06), col, .12);
  } else {
    float d = uv.y - hz, z = .22 / d, wx = x * z * 4., wz = z * 1.5 + uScroll;
    vec3 ice = vec3(.02, .07, .11);
    vec3 refl = aurora(x * 2. + (noise(vec2(wx * 3., wz * 3.)) - .5) * .16, d / hz * .8) * .55;
    vec2 tg = abs(fract(vec2(wx * 1.1 + .5, wz * 1.1)) - .5);
    float line = smoothstep(.44, .5, max(tg.x, tg.y)), path = smoothstep(2.4, 1.6, abs(wx));
    col = ice + refl * (.5 + .5 * path) + vec3(.12, .3, .34) * line * path * .5;
    float lz = fract(wz * .25) - .5, lamp = exp(-(lz * lz * 46. + pow(abs(wx) - 2.1, 2.) * 2.4));
    col += vec3(1., .82, .5) * lamp * .4;
    col = mix(col, vec3(.03, .12, .16), exp(-d * 9.));
  }
  return col;
}
`,
// ── 2面：潮硝子の天文台 ── 欠けた月と、止まった夜の海。夜光虫が青く光る
`
vec3 scene(vec2 uv){
  float hz = .36, x = uv.x - .5, asp = uRes.y / uRes.x; vec3 col;
  float md = length(vec2(x, (uv.y - .15) * asp));
  if (uv.y < hz) {
    float h = (hz - uv.y) / hz;
    col = mix(vec3(.06, .08, .2), vec3(.01, .01, .07), h);
    col += vec3(.8, .85, 1.) * stars(uv, 70.) * (.2 + h * .8);
    col += vec3(.45, .55, 1.) * (.02 / (md * md + .02)) * .22 * (1. + uBeat * .3);
    float cl = fbm(vec2(x * 3. + uT * .012, uv.y * 14.));
    col += vec3(.09, .11, .22) * smoothstep(.45, .8, cl) * (1. - h);
    col = mix(col, vec3(.0, .0, .012), smoothstep(.072, .067, md));
    col += vec3(1., .78, .62) * exp(-pow((md - .073) * 80., 2.)) * .95;
  } else {
    float d = uv.y - hz, z = .25 / d, wx = x * z * 4., wz = z * 2. + uScroll;
    float wv = fbm(vec2(wx * 1.5, wz * 1.5 + uT * .25)), wv2 = noise(vec2(wx * 4. + uT * .2, wz * 5.));
    vec3 sea = mix(vec3(.01, .03, .1), vec3(.02, .09, .18), wv);
    float pw = .04 + d * .4, gl = exp(-pow(x / pw, 2.)) * smoothstep(.5, .95, wv2 + wv * .35) * (1. - d * .5);
    sea += vec3(1., .8, .68) * gl * .55;
    float sp = smoothstep(.76, .95, noise(vec2(wx * 7., wz * 7.) + wv * 2.));
    sea += vec3(.1, .75, 1.) * sp * (.3 + .2 * sin(uT * 1.5 + wx * 3.) + uBeat * .2) * min(1., d * 4.);
    col = mix(sea, vec3(.06, .08, .2), exp(-d * 12.));
  }
  return col;
}
`,
// ── 3面：彗星書庫 ── 宇宙に浮かぶ、果てのない本棚の回廊
`
vec3 books(vec2 w, float side){
  float row = floor(w.y), fy = fract(w.y);
  float bx = w.x + hash(vec2(row, side)) * 10., id = floor(bx), fx = fract(bx);
  float h = hash(vec2(id, row + side * 7.)), tall = .6 + .32 * hash(vec2(id + 3., row));
  vec3 pal = .5 + .5 * cos(6.283 * (h * .9 + vec3(.0, .25, .55)));
  pal = mix(vec3(.4, .23, .13), pal, .42);
  float isBook = step(fy, tall) * step(.1, fy), edge = smoothstep(.0, .1, fx) * smoothstep(1., .9, fx);
  vec3 c = pal * isBook * edge * (.55 + .45 * fy);
  c += vec3(.3, .18, .08) * step(fy, .1);
  c += vec3(.9, .7, .25) * isBook * step(abs(fy - tall * .72), .03) * .45;
  return c;
}
vec3 scene(vec2 uv){
  float x = (uv.x - .5) * 2., y = (uv.y - .2) * 2.2, ax = abs(x), gap = .46;
  vec3 sp = vec3(.01, .015, .05) + vec3(.1, .08, .26) * fbm(vec2(x * 2., uv.y * 3. - uT * .02)) * .7;
  sp += vec3(.9, .95, 1.) * stars(uv + vec2(0., uScroll * .015), 60.);
  vec2 dv = vec2(uv.x - .5 - .1 * sin(uT * .05), uv.y - .13);
  float al = dot(dv, vec2(-.33, -.944)), ac = dot(dv, vec2(.944, -.33));
  sp += vec3(.75, .92, 1.) * exp(-ac * ac * 1400. / (1. + max(al, 0.) * 30.)) * smoothstep(-.012, .0, al) * exp(-max(al, 0.) * 7.) * (.9 + uBeat * .3);
  sp += vec3(1.) * exp(-dot(dv, dv) * 9000.);
  if (ax <= gap) return sp;
  float z = .36 / (ax - gap + .0005), wz = z + uScroll * .7;
  vec3 b = books(vec2(wz * 7., y * z * 4.4), sign(x));
  float fog = exp(-z * .22), lamp = .4 + .6 * smoothstep(.45, .0, abs(fract(wz * .16) - .5));
  return mix(sp * .5, b * lamp, fog) * .6;
}
`,
// ── 4面：蝕の玉座 ── 黒い太陽とコロナ、黒い硝子の床、立ち並ぶ柱
`
vec3 scene(vec2 uv){
  float hz = .4, x = uv.x - .5, asp = uRes.y / uRes.x; vec3 col;
  vec2 dv = vec2(x, (uv.y - .17) * asp); float r = length(dv), a = atan(dv.y, dv.x);
  float cor = (.45 + .55 * fbm(vec2(a * 3. + uT * .05, r * 6. - uT * .15))) * (.55 + .45 * noise(vec2(a * 14., uT * .3)));
  vec3 sky = mix(vec3(.11, .02, .07), vec3(.02, .0, .03), smoothstep(0., .6, r));
  sky += vec3(1., .45, .35) * cor * (.012 / (r * r + .004)) * (.8 + uBeat * .4) * .5;
  sky = mix(vec3(0.), sky, smoothstep(.074, .081, r));
  sky += vec3(1., .9, .82) * exp(-pow((r - .083) * 100., 2.)) * .9;
  if (uv.y < hz) col = sky + vec3(.7, .6, .8) * stars(uv, 60.) * .3 * smoothstep(.12, .3, r);
  else {
    float d = uv.y - hz, z = .25 / d, wx = x * z * 4., wz = z * 2. + uScroll;
    vec2 tg = abs(fract(vec2(wx * .5 + .5, wz * .5)) - .5);
    float line = smoothstep(.45, .5, max(tg.x, tg.y)), chk = step(.5, fract((floor(wx * .5 + .5) + floor(wz * .5)) * .5));
    vec3 fl = mix(vec3(.03, .0, .03), vec3(.075, .012, .055), chk) + vec3(.55, .16, .27) * line * .32;
    float rf = exp(-pow(x / (.06 + d * .5), 2.)) * (1. - d * .8);
    fl += vec3(1., .42, .36) * rf * .32 * (.65 + .35 * noise(vec2(wx * 3., wz * 2.)));
    col = mix(fl, vec3(.11, .02, .07), exp(-d * 10.));
  }
  float ax = abs(x) * 2., gap = .46;
  if (ax > gap) {
    float z = .3 / (ax - gap + .001), wz = z + uScroll * .5, k = abs(fract(wz * .33) - .5);
    float pil = smoothstep(.2, .15, k), fog = exp(-z * .16);
    vec3 pc = vec3(.035, .012, .045) + vec3(.5, .16, .22) * smoothstep(.15, .05, k) * .0 + vec3(.6, .2, .26) * exp(-pow((k - .16) * 60., 2.)) * .5;
    pc += vec3(.3, .08, .12) * smoothstep(.06, .0, abs(fract(uv.y * 1.6 * z + .2) - .5) - .4) * .25;
    col = mix(col, mix(col, pc, fog), pil);
  }
  return col;
}
`,
];

// スペルアリア中の背景。ボスごとの模様を、景色の上に重ねる
const MAIN = `
vec3 spellBg(vec2 uv){
  vec2 p = vec2(uv.x - .5, (uv.y - .42) * uRes.y / uRes.x); float r = length(p), a = atan(p.y, p.x), t = uT; vec3 c;
  if (uBoss == 0) {
    float v = .5 + .5 * sin(p.x * 26. + sin(p.y * 9. + t) * 2.5 + t * .7);
    v *= .5 + .5 * sin(p.y * 7. - t * .9 + sin(p.x * 5.));
    c = mix(vec3(.02, .22, .17), vec3(.28, .07, .3), uv.y) * (.35 + v * .9);
  } else if (uBoss == 1) {
    float v = .5 + .5 * sin(r * 46. - t * 2.4 + sin(a * 5. + t * .4) * 1.2);
    c = vec3(.02, .1, .27) * (.45 + v * .85) + vec3(.05, .3, .42) * smoothstep(.5, .8, fbm(p * 7. + t * .15)) * .5;
  } else if (uBoss == 2) {
    float e = 0.;
    for (int i = 1; i < 5; i++) { float fi = float(i), an = fi + t * .05;
      vec2 q = vec2(p.x * cos(an) - p.y * sin(an), p.x * sin(an) + p.y * cos(an));
      e += smoothstep(.006, .0, abs(length(q * vec2(1., 2.2)) - fi * .13)); }
    float ln = smoothstep(.04, .0, abs(fract(uv.y * 18. + t * .1) - .5) - .44);
    c = vec3(.15, .115, .04) * (.55 + ln * .6) + vec3(.9, .8, .5) * e * .32;
  } else if (uBoss == 3) {
    float rays = .5 + .5 * sin(a * 16. + sin(r * 12. - t) * 1.5 + t * .3), disc = smoothstep(.16, .17, r);
    c = mix(vec3(0.), vec3(.32, .04, .13) * (.3 + rays * .85) / (1. + r * 3.), disc) + vec3(1., .6, .5) * exp(-pow((r - .172) * 70., 2.)) * .5;
    c += vec3(.5, .1, .2) * smoothstep(.02, .0, abs(fract((uv.y + sin(uv.x * 4. + t * .3) * .02) * 9.) - .5) - .47) * .22 * step(.5, uv.y);
  } else {
    float e = 0.;
    for (int i = 1; i < 5; i++) { float fi = float(i), sq = abs(cos(t * .3 + fi * .9));
      e += smoothstep(.005, .0, abs(length(p * vec2(1., 1. / (sq + .15))) - fi * .11)); }
    c = vec3(.03, .05, .2) + vec3(.6, .7, 1.) * e * .3 + vec3(.2, .15, .42) * fbm(p * 4. + t * .05) * .55;
  }
  return c * (1. + uBeat * .2);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1. - uv.y;
  vec3 col = scene(uv);
  if (uSpell > .003) col = mix(col, spellBg(uv), uSpell * .93);
  vec2 q = uv - .5; col *= 1. - dot(q, q) * .9;
  gl_FragColor = vec4(col * uDim, 1.);
}
`;
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';

export class Backdrop {
  constructor(canvas) {
    this.canvas = canvas; this.ok = false; this.programs = [];
    try {
      const gl = this.gl = canvas.getContext('webgl', {antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance'});
      if (!gl) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.ok = true;
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; });
      canvas.addEventListener('webglcontextrestored', () => { this.programs = []; this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer()); this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), this.gl.STATIC_DRAW); this.ok = true; });
    } catch { this.ok = false; }
  }
  program(i) {
    if (this.programs[i] !== undefined) return this.programs[i];
    const gl = this.gl, sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    try {
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, COMMON + SCENES[i] + MAIN));
      gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      const u = {}; for (const n of ['uRes', 'uT', 'uScroll', 'uSpell', 'uBeat', 'uDim', 'uCol', 'uBoss']) u[n] = gl.getUniformLocation(pr, n);
      return this.programs[i] = {pr, u};
    } catch (e) { console.warn('背景シェーダーを用意できませんでした', e.message); this.error = e.message; return this.programs[i] = null; }
  }
  resize(w, h) { this.canvas.width = w; this.canvas.height = h; }
  // scene: ステージ番号。戻り値が false のときは描けていない
  draw({scene = 0, time = 0, scroll = 0, spell = 0, beat = 0, dim = 1, boss = 0, color = [1, 1, 1]}) {
    if (!this.ok) return false;
    const gl = this.gl, p = this.program(scene); if (!p) return false;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(p.pr); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(p.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(p.u.uT, time); gl.uniform1f(p.u.uScroll, scroll); gl.uniform1f(p.u.uSpell, spell); gl.uniform1f(p.u.uBeat, beat); gl.uniform1f(p.u.uDim, dim);
    gl.uniform3f(p.u.uCol, color[0], color[1], color[2]); gl.uniform1i(p.u.uBoss, boss);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }
}
