// Convert number to fixed amount of zeroes
function trail (c, n) {
    return '0'.repeat(n - c.toString().length) + c;
}

// Format date
function formatDate (date) {
    return trail(date.getDate(), 2) + '.' + trail(date.getMonth() + 1, 2) + '.' + date.getFullYear() + ' ' + trail(date.getHours(), 2) + ':' + trail(date.getMinutes(), 2);
}

// Set toggle button to enabled state
function setEnabled (element) {
    element.text('Enabled').addClass('active');
}

// Set toggle button to disabled state
function setDisabled (element) {
    element.text('Disabled').removeClass('active');
}

// Math clamp number between
function clamp (a, b, c) {
    return Math.min(c, Math.max(b, a));
}

function formatAsSpacedNumber(n) {
    return n.toString().split('').map((char, i, array) => ((array.length - 1 - i) % 3 == 2) && i != 0 ? (' ' + char) : char).join('');
}

// Iterator
function * getIterator (array) {
    for (var i = 0, a; a = array[i]; i++) {
        yield [i, a];
    }
}

// Reverse iterator
function * getReverseIterator (array) {
    for (var i = array.length - 1, a; a = array[i]; i--) {
        yield [i, a];
    }
}

// Parse playa response text
function * parsePlayaResponse (response) {
    var o = response.split('&');
    for (var i = 0, a; a = o[i]; i++) {
        yield a.split(':', 2);
    }
}

// Filter HAR file content for strings
function * filterPlayaJSON (o, tt = [], a = []) {
    for (var i in o) {
        if (i == 'url') {
            a[0] = o[i];
        } else {
            const t = tt.concat(i);
            yield [i, o[i], a[0]];

            if (o[i] != null && typeof(o[i]) == 'object') {
                yield * filterPlayaJSON(o[i], t, a);
            }
        }
    }
}

function compareItems (a, b) {
    if (typeof(a) == 'string') {
        return a.localeCompare(b);
    } else {
        return b - a;
    }
}

function getPotionType (type) {
    return type == 16 ? 6 : (type == 0 ? 0 : 1 + (type - 1) % 5);
}

// Potion size
function getPotionSize (potion) {
    if (potion >= POTION_STRENGTH_SMALL && potion <= POTION_LUCK_SMALL) {
        return POTION_SMALL;
    } else if (potion >= POTION_STRENGTH_MEDIUM && potion <= POTION_LUCK_MEDIUM) {
        return POTION_MEDIUM;
    } else if (potion >= POTION_STRENGTH_LARGE && potion <= POTION_LIFE) {
        return POTION_LARGE;
    } else {
        return POTION_NONE;
    }
}

function getAtSafe(obj, ... path) {
    var x = obj;
    for (var i = 0, l = path.length; i < l; i++) {
        x = x[path[i]];
        if (!x) return { };
    }
    return x;
}

function getAt(obj, ... path) {
    var x = obj;
    for (var i = 0, l = path.length; i < l; i++) {
        x = x[path[i]];
        if (!x) return null;
    }
    return x;
}

// Complex datatype
class ComplexDataType {
    constructor (values) {
        this.values = values;
        this.ptr = 0;
        this.bytes = [];
    }

    static create (data) {
        if (data instanceof ComplexDataType) {
            return data;
        } else {
            return new ComplexDataType(data);
        }
    }

    long () {
        return this.values[this.ptr++];
    }

    string () {
        return this.values[this.ptr++];
    }

    split () {
        var word = this.long();
        this.bytes = [word % 0x100, (word >> 8) % 0x100, (word >> 16) % 0x100, (word >> 24) % 0x100];
    }

    short () {
        if (!this.bytes.length) {
            this.split();
        }

        return this.bytes.shift() + (this.bytes.shift() << 8);
    }

    byte () {
        if (!this.bytes.length) {
            this.split();
        }

        return this.bytes.shift();
    }

    assert (size) {
        if (this.values.length < size) {
            throw `ComplexDataType Exception: Expected ${ size } values but ${ this.values.length } were supplied!`;
        }
    }

    sub (size) {
        var b = this.values.slice(this.ptr, this.ptr + size);
        this.ptr += size;
        return new ComplexDataType(b);
    }

    clear () {
        this.bytes = [];
    }

    skip (size) {
        this.ptr += size;
        return this;
    }

    back (size) {
        this.ptr -= size;
        return this;
    }
}

function getObjectAt (obj, path) {
    var sub = path.split('.');
    for (var i = 0; i < sub.length; i++) {
        obj = obj[sub[i]];
        if (obj == undefined) {
            return null;
        }
    }
    return obj;
}

// Download
function download(e,d){let o=document.createElement("a");o.download=e,o.href=URL.createObjectURL(d),document.body.appendChild(o),o.click(),URL.revokeObjectURL(o.href),document.body.removeChild(o)}

// Fast join array to string
function join (a, c) {
    var r = '';
    for (var i = 0, l = a.length; i < l; ++i) r += c(a[i], i, a);
    return r;
}

function joinN (n, c) {
    var r = '';
    for (var i = 0; i < n; i++) r += c();
    return r;
}

const Weekends = {
    Type: [
        'EPIC',
         'GOLD',
         'RESOURCE',
         'EXPERIENCE'
    ],
    GetWeekendType: function (date = Date.now()) {
        date = new Date(date);
        date.setDate(date.getDate() - date.getDay() + (date.getDay() ? 1 : -6));
        date.setHours(0, 0, 0);
        let week = Math.trunc(date.getTime() / (7 * 24 * 3600 * 1000)) % 4;
        let beg = new Date(date.getTime() + 5 * 24 * 60 * 60 * 1000 + 1);
        let end = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);
        return [this.Type[week], formatDate(beg), formatDate(end)];
    }
}
