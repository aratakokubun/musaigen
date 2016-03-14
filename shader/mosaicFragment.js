precision mediump float;
uniform sampler2D texture;

varying vec2 vUv;

// 画像拡大率
const vec2 mag = vec2(512.0, 512.0);
// 分割数
const vec2 div = vec2(32.0, 32.0);
const vec2 divRange = vec2(mag.x/div.x, mag.y/div.y);
const float nFrag = 1.0 / (divRange.x*divRange.y);

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
  return aveColor;
}

void main()
{
  gl_FragColor = applyEffect(vUv);
}