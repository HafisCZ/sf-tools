function rotateLeft(value: number, shift: number) {
  return (value << shift) | (value >>> (32 - shift))
}

function toHex(value: number) {
  let text = ''

  for (let i = 7; i >= 0; i--) {
    text += ((value >>> (i * 4)) & 0x0f).toString(16)
  }

  return text
}

function encodeUTF8(value: string) {
  const text = value.replace(/\r\n/g, '\n')

  let utf = ''

  for (let n = 0; n < text.length; n++) {
    const c = text.charCodeAt(n)

    if (c < 128) {
      utf += String.fromCharCode(c)
    } else if (c > 127 && c < 2048) {
      utf += String.fromCharCode((c >> 6) | 192)
      utf += String.fromCharCode((c & 63) | 128)
    } else {
      utf += String.fromCharCode((c >> 12) | 224)
      utf += String.fromCharCode(((c >> 6) & 63) | 128)
      utf += String.fromCharCode((c & 63) | 128)
    }
  }

  return utf
}

// Returns only the first 64 bits of the digest as hex
export function sha1(value: string) {
  const words: number[] = []
  const text = encodeUTF8(value)

  for (let i = 0; i < text.length - 3; i += 4) {
    words.push((text.charCodeAt(i) << 24) | (text.charCodeAt(i + 1) << 16) | (text.charCodeAt(i + 2) << 8) | text.charCodeAt(i + 3))
  }

  const padding = text.length % 4
  if (padding == 0) {
    words.push(0x080000000)
  } else if (padding == 1) {
    words.push((text.charCodeAt(text.length - 1) << 24) | 0x0800000)
  } else if (padding == 2) {
    words.push((text.charCodeAt(text.length - 2) << 24) | (text.charCodeAt(text.length - 1) << 16) | 0x08000)
  } else if (padding == 3) {
    words.push((text.charCodeAt(text.length - 3) << 24) | (text.charCodeAt(text.length - 2) << 16) | (text.charCodeAt(text.length - 1) << 8) | 0x080)
  }

  while (words.length % 16 != 14) {
    words.push(0)
  }

  words.push(text.length >>> 29)
  words.push((text.length << 3) & 0x0ffffffff)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0

  const w = new Array<number>(80)

  for (let block = 0; block < words.length; block += 16) {
    for (let i = 0; i < 16; i++) {
      w[i] = words[block + i]
    }

    for (let i = 16; i <= 79; i++) {
      w[i] = rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4

    for (let i = 0; i <= 19; i++) {
      const temp = (rotateLeft(a, 5) + ((b & c) | (~b & d)) + e + w[i] + 0x5a827999) & 0x0ffffffff
      e = d
      d = c
      c = rotateLeft(b, 30)
      b = a
      a = temp
    }

    for (let i = 20; i <= 39; i++) {
      const temp = (rotateLeft(a, 5) + (b ^ c ^ d) + e + w[i] + 0x6ed9eba1) & 0x0ffffffff
      e = d
      d = c
      c = rotateLeft(b, 30)
      b = a
      a = temp
    }

    for (let i = 40; i <= 59; i++) {
      const temp = (rotateLeft(a, 5) + ((b & c) | (b & d) | (c & d)) + e + w[i] + 0x8f1bbcdc) & 0x0ffffffff
      e = d
      d = c
      c = rotateLeft(b, 30)
      b = a
      a = temp
    }

    for (let i = 60; i <= 79; i++) {
      const temp = (rotateLeft(a, 5) + (b ^ c ^ d) + e + w[i] + 0xca62c1d6) & 0x0ffffffff
      e = d
      d = c
      c = rotateLeft(b, 30)
      b = a
      a = temp
    }

    h0 = (h0 + a) & 0x0ffffffff
    h1 = (h1 + b) & 0x0ffffffff
    h2 = (h2 + c) & 0x0ffffffff
    h3 = (h3 + d) & 0x0ffffffff
    h4 = (h4 + e) & 0x0ffffffff
  }

  return (toHex(h0) + toHex(h1)).toLowerCase()
}

export function randomHash() {
  return sha1(Math.random().toString()).slice(0, 8)
}
