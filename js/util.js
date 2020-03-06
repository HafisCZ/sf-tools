// Convert number to fixed amount of zeroes
function trail (c, n) {
    return '0'.repeat(n - c.toString().length) + c;
}

// Format date
function formatDateOnly (date) {
    if (date == '' || date == undefined || date <= 0) return '';
    date = new Date(date);
    return trail(date.getDate(), 2) + '.' + trail(date.getMonth() + 1, 2) + '.' + date.getFullYear();
}

// Format datetime
function formatDate (date) {
    if (date == '' || date == undefined || date <= 0) return '';
    date = new Date(date);
    return trail(date.getDate(), 2) + '.' + trail(date.getMonth() + 1, 2) + '.' + date.getFullYear() + ' ' + trail(date.getHours(), 2) + ':' + trail(date.getMinutes(), 2);
}

function formatDuration (duration) {
    if (duration == '' || duration == undefined || duration <= 0) return '';
    var days = Math.trunc(duration / (1000 * 60 * 60 * 24));
    var hours = Math.trunc((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.trunc((duration % (1000 * 60 * 60)) / (1000 * 60));
    return trail(days, 2) + ':' + trail(hours, 2) + ':' + trail(minutes, 2);
}

function correctDate (prefix) {
    return -60 * 60 * 1000;
}

// Set toggle button to enabled state
function setEnabled (element) {
    element.text('Enabled').addClass('active');
}

function getCSSColor(string) {
    var style = new Option().style;
    style.color = string;
    if (style.color == '') {
        style.color = `#${ string }`;
    }

    return style.color;
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
    n = Math.trunc(n);
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
        } else if (i == 'startedDateTime' && !a[1]) {
            a[1] = Date.parse(o[i]);
        } else {
            const t = tt.concat(i);
            yield [i, o[i], a[0], a[1]];
            if (o[i] != null && typeof(o[i]) == 'object') {
                yield * filterPlayaJSON(o[i], t, a);
            }
        }
    }
}

function compareItems (a, b) {
    if (typeof(a) == 'string' && typeof(b) == 'string') {
        if (a == '') return 1;
        else if (b == '') return -1;
        else return a.localeCompare(b);
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

function setObjectAt (obj, path, val) {
    var sub = path.split('.');
    for (var i = 0; i < sub.length; i++) {
        if (i == sub.length - 1) {
            obj[sub[i]] = val;
        } else {
            if (obj[sub[i]] == undefined) {
                obj[sub[i]] = { };
            }

            obj = obj[sub[i]];
        }
    }
}

// Download
function download(e,d){let o=document.createElement("a");o.download=e,o.href=URL.createObjectURL(d),document.body.appendChild(o),o.click(),URL.revokeObjectURL(o.href),document.body.removeChild(o)}

// Fast join array to string
function join (a, c, b, m) {
    var r = '';
    for (var i = (b != undefined ? b : 0), l = m == undefined ? a.length : Math.min(a.length, m); i < l; ++i) r += c(a[i], i, a);
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
        let beg = date.getTime() + 5 * 24 * 60 * 60 * 1000 + 1;
        let end = date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000;
        return [this.Type[week], formatDate(beg), formatDate(end)];
    }
}
