function _dig (obj, ... path) {
    for (let i = 0; obj && i < path.length; i++) obj = obj[path[i]];
    return obj;
}

function _try (obj, method, ... args) {
    if (typeof obj !== 'undefined') {
        if (typeof obj[method] === 'function') {
            return obj[method](... args);
        } else {
            return obj[method];
        }
    } else {
        return undefined;
    }
}

function _has (arr, obj) {
    return arr.indexOf(obj) > -1;
}

function _all_true (arr, m) {
    for (const a of arr) {
        if (!m(a)) {
            return false;
        }
    }

    return true;
}

function _push_unless_includes(arr, obj) {
    if (!_has(arr, obj)) {
        arr.push(obj);
    }
}

function _excludes (arr, obj) {
    return !arr.includes(obj);
}

function _clamp (value, min, max) {
    return value <= min ? min : (value >= max ? max : value);
}

function _remove (arr, obj) {
    if (arr) {
        const index = arr.indexOf(obj);
        if (index > -1) {
            arr.splice(index, 1);
        }
    }
}

function _filter_in_place (array, predicate) {
    let index1 = 0;
    let index2 = 0;

    while (index1 < array.length) {
      if (predicate(array[index1])) {
        array[index2] = array[index1];
        index2++;
      }

      index1++;
    }

    array.length = index2;
}

function _compact (obj) {
    return obj.filter(val => val);
}

function _len_of_when (array, key) {
    let count = 0;
    for (const obj of array) {
        if (obj && obj[key]) count++;
    }
    return count;
}

function _sort_des (array, map) {
    if (map) {
        return array.sort((a, b) => map(b) - map(a));
    } else {
        return array.sort((a, b) => b - a);
    }
}

function _int_keys(hash) {
    return Object.keys(hash).map(v => parseInt(v));
}

function _safe_int(val) {
    if (isNaN(val)) {
        return undefined;
    } else {
        return parseInt(val);
    }
}

function _sort_asc (array, map) {
    if (map) {
        return array.sort((a, b) => map(a) - map(b));
    } else {
        return array.sort((a, b) => a - b);
    }
}

function _len_where (array, filter) {
    let count = 0;
    for (const obj of array) {
        if (filter(obj)) count++;
    }
    return count;
}

function _between (val, min, max) {
    return val > min && val < max;
}

function _within (val, min, max) {
    return val >= min && val <= max;
}

function _uuid (data) {
    return `${ data.identifier }-${ data.timestamp }`;
}

function _uniq (array) {
    return Array.from(new Set(array));
}

function _sum (array, base = 0) {
    return array.reduce((m, v) => m + v, base);
}

function _mapped_sum (array, map, base = 0) {
    return array.reduce((m, v) => m + map(v), base);
}

function _slice_len (array, begin, len) {
    return array.slice(begin, begin + len);
}

function _pretty_prefix (prefix) {
    if (_empty(prefix)) {
        return '';
    }

    const splitPrefix = prefix.split('_');
    const properName = splitPrefix[0].charAt(0).toUpperCase() + splitPrefix[0].slice(1);
    const properDomain = splitPrefix[1].toUpperCase();

    return `${properName} .${properDomain}`;
}

function _sequence (length, base = 0) {
    return Array.from({ length }, (_, i) => i + base);
}

function _array_from_indexes (indexes, processor, base = []) {
    return indexes.reduce((memo, index) => {
        memo[index] = processor(index);
        return memo;
    }, base);
}

function _merge (target, source) {
    for (const [key, value] of Object.entries(source)) {
        if (!target.hasOwnProperty(key)) {
            target[key] = value;
        }
    }

    return target;
}

function _array_to_hash (array, processor, base = {}) {
    return array.reduce((memo, object, i) => {
        const [key, value] = processor(object, i);
        memo[key] = value;
        return memo;
    }, base);
}

function _array_to_default_hash (array, value, base = {}) {
    return array.reduce((memo, object) => {
        memo[object] = value;
        return memo;
    }, base);
}

function _invert (hash, integerKeys = false) {
    return Object.entries(hash).reduce((memo, [key, value]) => {
        memo[value] = integerKeys ? parseInt(key) : key;
        return memo;
    }, {});
}

function _group_by (array, processor) {
    let groups = {};
    for (const object of array) {
        let key = processor(object);
        if (groups[key]) {
            groups[key].push(object);
        } else {
            groups[key] = [object];
        }
    }

    return groups;
}

function _empty (obj) {
    if (obj instanceof Set) {
        return obj.size == 0;
    } else if (obj instanceof Array) {
        return obj.length == 0;
    } else if (typeof obj === 'string') {
        return obj.length == 0;
    } else if (typeof obj === 'undefined') {
        return true;
    } else {
        return Object.keys(obj).length == 0;
    }
}

function _not_empty (obj) {
    return !_empty(obj);
}

function _hashCode (str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    return hash;
}

function _strToHSL (str) {
    return `hsl(${ (_hashCode(str) * 113) % 360 }, 100%, 30%)`;
}

function _string_to_binary(str) {
    const arr = new Uint16Array(str.length);
    for (let i = 0; i < arr.length; i++) {
        arr[i] = str.charCodeAt(i);
    }

    return btoa(String.fromCharCode(...new Uint8Array(arr.buffer)));
}

function _binary_to_string(bin) {
  const binary = atob(bin);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return String.fromCharCode(...new Uint16Array(bytes.buffer));
}

function * _each_block(arr, size) {
    for (let i = 0; i < arr.length / size; i++) {
        yield arr.slice(i * size, i * size + size);
    }
}

function _fast_max(arr) {
    let m = arr[0];
    for (let i of arr) {
        if (i > m) m = i;
    }
    return m;
}

function _fast_min(arr) {
    let m = arr[0];
    for (let i of arr) {
        if (i < m) m = i;
    }
    return m;
}

function _join_sentence (array) {
    let last = array.length > 1 ? ` and ${array.pop()}` : ''
    return array.join(', ') + last;
}

function _format_duration(ms, limit = 4) {
    let mil = ms % 1000;
    let sec = ((ms -= mil) / 1000) % 60;
    let min = ((ms -= sec * 1000) / 60000) % 60;
    let hrs = ((ms -= min * 60000) / 3600000) % 24;
    let day = ((ms -= hrs * 3600000) / 86400000) % 7;
    let wks = ((ms -= day * 86400000) / (7 * 86400000));

    return _join_sentence([
        wks > 0 ? `${wks} w` : '',
        day > 0 ? `${day} d` : '',
        hrs > 0 ? `${hrs} h` : '',
        min > 0 ? `${min} m` : '',
        sec > 0 ? `${sec} s` : '',
        mil > 0 ? `${mil} ms` : ''
    ].filter(value => value).slice(0, limit));
}

function _rbgaToHex (rgba) {
    return `#${rgba.map((channel) => _padLeft(Number(channel).toString(16), 2, '0')).join('')}`
}

function _parseColor (text) {
    const style = new Option().style;
    style.color = text;

    const color = style.color;
    if (color.startsWith('rgba')) {
        return _rbgaToHex(color.slice(5, -1).split(','));
    } else if (color.startsWith('rgb')) {
        return _rbgaToHex(color.slice(4, -1).split(','));
    } else if (COLOR_MAP.hasOwnProperty(color)) {
        return COLOR_MAP[color];
    } else {
        return '';
    }
}

function _padLeft (text, length, char) {
    return char.repeat(Math.max(0, length - text.length)) + text;
}

function _invertColor (color, mono = false) {
    if (color.indexOf('#') === 0) {
        color = color.slice(1);
    }

    if (color.length === 3 || color.length === 4) {
        color = `${color[0]}${color[0]}${color[1]}${color[1]}${color[2]}${color[2]}${color[3] || ''}${color[3] || ''}`;
    }

    let alpha = '';
    if (color.length === 8) {
        alpha = color.slice(6, 8);
        color = color.slice(0, 6);
    }

    if (color.length === 6) {
        let r = parseInt(color.slice(0, 2), 16);
        let g = parseInt(color.slice(2, 4), 16);
        let b = parseInt(color.slice(4, 6), 16);

        if (mono) {
            return `${(r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF'}${alpha}`;
        } else {
            r = (255 - r).toString(16);
            g = (255 - g).toString(16);
            b = (255 - b).toString(16);

            return "#" + _padLeft(r, 2, '0') + _padLeft(g, 2, '0') + _padLeft(b, 2, '0') + alpha;
        }
    } else {
        return '';
    }
}