precision mediump float;
uniform sampler2D texture;
uniform vec3 minThreashold;
uniform vec3 maxThreashold;

varying vec2 vUv;

// 画像拡大率
const vec2 mag = vec2(512.0, 512.0);
// 分割数
const vec2 div = vec2(32.0, 32.0);
const vec2 divRange = vec2(mag.x/div.x, mag.y/div.y);
const float nFrag = 1.0 / (divRange.x*divRange.y);

vec3 rgb2hsv(vec3 c)
{
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

bool hsvFilter(vec3 rgb) {
  vec3 hsv = rgb2hsv(rgb);
  // H (0.0 - 1.0) -> (0.0 -> 360.0)
  hsv.r *= 360.0;
  // S (0.0 - 1.0) -> (0.0 -> 180.0)
  hsv.g *= 180.0;
  // V (0.0 - 1.0) -> (0.0 -> 180.0)
  hsv.b *= 180.0;
  if (minThreashold.r <= maxThreashold.r) {
    return minThreashold.r <= hsv.r && hsv.r <= maxThreashold.r
        && minThreashold.g <= hsv.g && hsv.g <= maxThreashold.g
        && minThreashold.b <= hsv.b && hsv.b <= maxThreashold.b;
  } else {
    return (minThreashold.r <= hsv.r || hsv.r <= maxThreashold.r)
        && minThreashold.g <= hsv.g && hsv.g <= maxThreashold.g
        && minThreashold.b <= hsv.b && hsv.b <= maxThreashold.b;
  }
}

vec4 applyEffect(vec2 uvCoord) {
  vec4  aveColor = vec4(0.0);

  // mod関数で分割するため、最初に拡大しておく
  vec2 magUv = uvCoord * mag;
  vec2 offset = vec2(mod(magUv.x, divRange.x), mod(magUv.y, divRange.y));

  // 分割範囲内の画像の平均値を算
  for(float x = 0.0; x <= divRange.x; x += 1.0){
      for(float y = 0.0; y <= divRange.y; y += 1.0){
          aveColor += texture2D(texture, (magUv + vec2(x - offset.x, y - offset.y)) / mag);
      }
  }
  aveColor /= divRange.x*divRange.y;

  if (hsvFilter(aveColor.rgb)) {
    return aveColor;
  } else {
    return vec4(0.0);
  }
}

void main()
{
  gl_FragColor = applyEffect(vUv);
}