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

function _present (obj) {
    return obj !== null && typeof obj !== 'undefined';
}

function _nil (obj) {
    return !_present(obj);
}

function _compact (obj) {
    return obj.filter(val => _present(val));
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

function _uuid (player) {
    return `${ player.identifier }-${ player.timestamp }`;
}

function _str_if_present (strings, ... args) {
    if (args.some(_nil)) {
        return undefined;
    } else {
        const len = strings.length;
        let arr = strings[0];
        for (let i = 1; i < len; i++) {
            arr += args[i - 1];
            arr += strings[i];
        }
        return arr;
    }
}

function _uniq (array) {
    return Array.from(new Set(array));
}

function _sum (array, base = 0) {
    return array.reduce((m, v) => m + v, base);
}

function _slice_len (array, begin, len) {
    return array.slice(begin, begin + len);
}

function _jsonify (text) {
    if (typeof text === 'string') {
        return JSON.parse(text);
    } else {
        return text;
    }
}

function _pretty_prefix (prefix) {
    let [serverName, ...serverDomain] = prefix.split('_');
    let properName = serverName.charAt(0).toUpperCase() + serverName.slice(1);
    let properDomain = serverDomain.join('.').toUpperCase();

    return `${properName} .${properDomain}`;
}

function _array_to_hash (array, processor, base = {}) {
    return array.reduce((memo, object) => {
        const [key, value] = processor(object);
        memo[key] = value;
        return memo;
    }, base);
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
