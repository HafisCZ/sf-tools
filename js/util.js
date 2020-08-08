// Convert number to fixed amount of zeroes
function trail (c, n) {
    return '0'.repeat(n - c.toString().length) + c;
}

// Format date
function formatDateOnly (date) {
    if (date == '' || date == undefined) return '';
    date = new Date(Math.max(0, date));
    return trail(date.getDate(), 2) + '.' + trail(date.getMonth() + 1, 2) + '.' + date.getFullYear();
}

// Format datetime
function formatDate (date) {
    if (date == '' || date == undefined) return '';
    date = new Date(Math.max(0, date));
    return trail(date.getDate(), 2) + '.' + trail(date.getMonth() + 1, 2) + '.' + date.getFullYear() + ' ' + trail(date.getHours(), 2) + ':' + trail(date.getMinutes(), 2);
}

function formatDuration (duration) {
    if (duration == '' || duration == undefined) return '';
    duration = Math.max(0, duration);
    var days = Math.trunc(duration / (1000 * 60 * 60 * 24));
    var hours = Math.trunc((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.trunc((duration % (1000 * 60 * 60)) / (1000 * 60));
    return trail(days, Math.max(2, days.toString().length)) + ':' + trail(hours, 2) + ':' + trail(minutes, 2);
}

const NumberLabels = [
    [1E123, 'Quadrag'],
    [1E120, 'Noventrig'],
    [1E117, 'Octotrig'],
    [1E114, 'Septentrig'],
    [1E111, 'Sestrig'],
    [1E108, 'Quinquatrig'],
    [1E105, 'Quattuortrig'],
    [1E102, 'Trestrig'],
    [1E99, 'Duotrig'],
    [1E96, 'Untrig'],
    [1E93, 'Trig'],
    [1E90, 'Novemvig'],
    [1E87, 'Octovig'],
    [1E84, 'Septemvig'],
    [1E81, 'Sesvig'],
    [1E78, 'Quinquavig'],
    [1E75, 'Quattuorvig'],
    [1E72, 'Tresvig'],
    [1E69, 'Duovig'],
    [1E66, 'Unvig'],
    [1E63, 'Vig'],
    [1E60, 'Novendec'],
    [1E57, 'Octodec'],
    [1E54, 'Septendec'],
    [1E51, 'Sedec'],
    [1E48, 'Quinquadec'],
    [1E45, 'Quattuordec'],
    [1E42, 'Tredec'],
    [1E39, 'Duodec'],
    [1E36, 'Undec'],
    [1E33, 'Dec'],
    [1E30, 'Non'],
    [1E27, 'Oct'],
    [1E24, 'Sept'],
    [1E21, 'Sex'],
    [1E18, 'Quint'],
    [1E15, 'Quad'],
    [1E12, 'T'],
    [1E9, 'B'],
    [1E6, 'M']
];

function formatAsNamedNumber(n) {
    if (n < NumberLabels[NumberLabels.length - 1][0]) {
        return n.toString().split('').map((char, i, array) => ((array.length - 1 - i) % 3 == 2) && i != 0 ? (' ' + char) : char).join('');
    } else if (n > NumberLabels[0][0]) {
        return n.toExponential(3).replace('+', '');
    } else {
        for (let i = 0, unit; unit = NumberLabels[i]; i++) {
            if (n >= unit[0]) {
                var num = n / unit[0];
                return (num.toString().includes('.') && num.toString().split('.')[1].length > 3 ? num.toFixed(3) : num).toString().split('e')[0] + ' ' + unit[1];
            }
        }
    }
}

function getColorFromGradientObj (obj, sample) {
    var stops = Object.entries(obj).map(e => [ Number(e[0]), e[1] ]);
    stops.sort((a, b) => a[0] - b[0]);
    if (sample < stops[0][0]) sample = stops[0][0];
    else if (sample > stops[stops.length - 1][0]) sample = stops[stops.length - 1][0];
    for (var i = 0; i < stops.length - 1; i++) {
        if (sample <= stops[i + 1][0]) {
            return getColorFromGradient(stops[i][1], stops[i + 1][1], (sample - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
        }
    }

    return '';
}

function getColorFromGradient(a, b, sample) {
    var color = '#';
    var ao = a.startsWith('#') ? 1 : 0;
    var bo = b.startsWith('#') ? 1 : 0;
    if (isNaN(sample) || sample > 1) sample = 1.0;
    else if (sample < 0) sample = 0.0;
    if (a.length < 8) a += 'ff';
    if (b.length < 8) b += 'ff';
    for (var i = 0; i < 7; i += 2) {
        var sa = parseInt(a.substring(i + ao, i + ao + 2), 16);
        var sb = parseInt(b.substring(i + bo, i + bo + 2), 16);
        var s = Math.floor(sa * (1 - sample) + sb * (sample)).toString(16);
        color += '0'.repeat(2 - s.length) + s;
    }

    return color;
}

function getColorFromRGBA (r, g, b, a) {
    var hr = Number(r).toString(16);
    var hg = Number(g).toString(16);
    var hb = Number(b).toString(16);
    var ha = isNaN(a) ? 'ff' : Number(Math.trunc(a * 255)).toString(16);

    return '#' + '0'.repeat(2 - hr.length) + hr + '0'.repeat(2 - hg.length) + hg + '0'.repeat(2 - hb.length) + hb + '0'.repeat(2 - ha.length) + ha;
}

function mergeSoft (a, b) {
    for (var [k, v] of Object.entries(b)) {
        if (!a.hasOwnProperty(k)) a[k] = b[k];
    }

    return a;
}

const GOLD_CURVE = [ 0, 25, 50, 75 ];
function getGoldCurve (value) {
    for (var i = GOLD_CURVE.length; i < 800; i++) {
        GOLD_CURVE[i] = Math.min(Math.floor((GOLD_CURVE[i - 1] + Math.floor(GOLD_CURVE[Math.floor(i / 2)] / 3) + Math.floor(GOLD_CURVE[Math.floor(i / 3)] / 4)) / 5) * 5, 1E9);
    }

    return GOLD_CURVE[value];
}

function calculateAttributePrice (attribute) {
    var price = 0;
    for (var i = 0; i < 5; i++) {
        var num = Math.floor(1 + (attribute + i) / 5);
        price = num >= 800 ? 5E9 : (price + getGoldCurve(num));
    }

    price = 5 * Math.floor(Math.floor(price / 5) / 5) / 100;
    return price < 10 ? price : Math.min(1E7, Math.floor(price));
}

function calculateTotalAttributePrice (attribute) {
    var price = 0;
    if (attribute > 3200) {
        price += 1E7 * (attribute - 3200);
        attribute = 3200;
    }

    for (var i = 0; i < attribute; i++) {
        price += calculateAttributePrice(i);
    }

    return price;
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

function getCSSFont(string) {
    var style = new Option().style;
    style.font = string;
    if (style.font == '') {
        style.font = `${ string } Roboto`;
    }

    return style.font;
}

function formatAsSpacedNumber(n, delim = '&nbsp') {
    n = Math.trunc(n);
    return n.toString().split('').map((char, i, array) => ((array.length - 1 - i) % 3 == 2) && i != 0 ? (delim + char) : char).join('');
}

function * parsePlayaResponse (response) {
    var o = response.split('&');
    for (var i = 0, a; a = o[i]; i++) {
        yield a.split(':', 2);
    }
}

function * filterPlayaJSON (o, tt = [], a = []) {
    for (var i in o) {
        if (i == 'url') {
            a[0] = o[i];
        } else if (i == 'startedDateTime' && !a[1]) {
            a[1] = new Date(o[i]);
        } else {
            const t = tt.concat(i);
            yield [i, o[i], a[0], a[1]];
            if (o[i] != null && typeof(o[i]) == 'object') {
                yield * filterPlayaJSON(o[i], t, a);
            }
        }
    }
}

class ComplexDataType {
    constructor (values) {
        this.values = values || [];
        this.ptr = 0;
        this.bytes = [];
    }

    empty () {
        return this.values.length <= this.ptr;
    }

    long () {
        return this.values[this.ptr++] || 0;
    }

    string () {
        return this.values[this.ptr++] || '';
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

    assert (size, soft) {
        if (this.values.length < size) {
            if (soft) {
                ComplexDataType.Errors++;
            } else {
                throw `ComplexDataType Exception: Expected ${ size } values but ${ this.values.length } were supplied!`;
            }
        }
    }

    sub (size) {
        var b = this.values.slice(this.ptr, this.ptr + size);
        this.ptr += size;
        return b;
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

ComplexDataType.Errors = 0;

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

function getObjectAt (obj, path) {
    if (!obj) return undefined;
    var sub = path.split('.');
    for (var i = 0; i < sub.length; i++) {
        obj = obj[sub[i]];
        if (obj == undefined) {
            return undefined;
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

function SHA1 (text) {
    function rotate_left (n, s) {
        return (n << s) | (n >>> (32 - s));
    }

    function lsb_hex (val) {
        var str = '';
        for (var i = 0; i <= 6; i += 2) {
            str += ((val >>> (i * 4 + 4)) & 0x0f).toString(16) + ((val >>> (i * 4)) & 0x0f).toString(16);
        }

        return str;
    }

    function cvt_hex (val) {
        var str = '';
        for (var i = 7; i >= 0; i--) {
            str += ((val >>> (i * 4)) & 0x0f).toString(16);
        }

        return str;
    }

    function encodeUTF8 (text) {
        text = text.replace(/\r\n/g, '\n');
        var utf = '';

        for (var n = 0; n < text.length; n++) {
            var c = text.charCodeAt(n);
            if (c < 128) {
                utf += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utf += String.fromCharCode((c >> 6) | 192);
                utf += String.fromCharCode((c & 63) | 128);
            } else {
                utf += String.fromCharCode((c >> 12) | 224);
                utf += String.fromCharCode(((c >> 6) & 63) | 128);
                utf += String.fromCharCode((c & 63) | 128);
            }
        }

        return utf;
    }

    var words = new Array();
    text = encodeUTF8(text);

    for (var i = 0; i < text.length - 3; i += 4) {
        words.push(text.charCodeAt(i) << 24 | text.charCodeAt(i + 1) << 16 | text.charCodeAt(i + 2) << 8 | text.charCodeAt(i + 3));
    }

    var padding = text.length % 4;
    if (padding == 0) {
        words.push(0x080000000);
    } else if (padding == 1) {
        words.push(text.charCodeAt(text.length - 1) << 24 | 0x0800000);
    } else if (padding == 2) {
        words.push(text.charCodeAt(text.length - 2) << 24 | text.charCodeAt(text.length - 1) << 16 | 0x08000);
    } else if (padding == 3) {
        words.push(text.charCodeAt(text.length - 3) << 24 | text.charCodeAt(text.length - 2) << 16 | text.charCodeAt(text.length - 1) << 8 | 0x080);
    }

    while ((words.length % 16) != 14) {
        words.push(0);
    }

    words.push(text.length >>> 29);
    words.push((text.length << 3) & 0x0ffffffff);

    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;

    var W = new Array(80);

    for (var block = 0; block < words.length; block += 16) {
        for (var i = 0; i < 16; i++) {
            W[i] = words[block + i];
        }

        for (var i = 16; i <= 79; i++) {
            W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
        }

        var A = H0;
        var B = H1;
        var C = H2;
        var D = H3;
        var E = H4;

        for (var i = 0; i <= 19; i++) {
            var temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (var i = 20; i <= 39; i++) {
            var temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (var i = 40; i <= 59; i++) {
            var temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (var i = 60; i <= 79; i++) {
            var temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        H0 = (H0 + A) & 0x0ffffffff;
        H1 = (H1 + B) & 0x0ffffffff;
        H2 = (H2 + C) & 0x0ffffffff;
        H3 = (H3 + D) & 0x0ffffffff;
        H4 = (H4 + E) & 0x0ffffffff;
    }

    return (cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4)).toLowerCase();
}
