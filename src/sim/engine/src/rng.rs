//! xorshift128+, the same generator and 52-bit resolution as V8's `Math.random()`.

// Generator state, never all zero
static mut STATE: [u64; 2] = [0x9E37_79B9_7F4A_7C15, 0xBF58_476D_1CE4_E5B9];

/// Seeds the generator with four random words from `crypto.getRandomValues()`.
pub fn seed(words: [u32; 4]) {
    let first = ((words[0] as u64) << 32) | words[1] as u64;
    let second = ((words[2] as u64) << 32) | words[3] as u64;

    unsafe {
        STATE = [first | 1, second];
    }

    // Warm-up
    for _ in 0..16 {
        next();
    }
}

/// A random number in `[0, 1)`, like `Math.random()`.
#[inline(always)]
pub fn next() -> f64 {
    unsafe {
        let mut s1 = STATE[0];
        let s0 = STATE[1];

        STATE[0] = s0;

        s1 ^= s1 << 23;
        s1 ^= s1 >> 17;
        s1 ^= s0;
        s1 ^= s0 >> 26;

        STATE[1] = s1;

        f64::from_bits((STATE[0] >> 12) | 0x3FF0_0000_0000_0000) - 1.0
    }
}

/// True with the given chance.
#[inline(always)]
pub fn roll(chance: f64) -> bool {
    chance != 0.0 && !chance.is_nan() && next() < chance
}
