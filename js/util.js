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

// Complex datatype
class ComplexDataType {
    constructor (bytes) {
        this.bytes = bytes;
        this.ptr = 0;
    }

    byte () {
        return this.bytes[this.ptr++];
    }

    short () {
        return this.bytes[this.ptr++] + (this.bytes[this.ptr++] << 8);
    }

    long () {
        return this.bytes[this.ptr++] + (this.bytes[this.ptr++] << 8) + (this.bytes[this.ptr++] << 16) + (this.bytes[this.ptr++] << 24);
    }

    assert (size) {
        if (this.bytes.length != size) {
            throw 'COMPLEXDATATYPE SIZE NOT EQUAL';
        }
    }

    static fromArray (arr) {
        return new ComplexDataType(arr.reduce((bytes, word) => bytes.concat([word % 0x100, (word >> 8) % 0x100, (word >> 16) % 0x100, (word >> 24) % 0x100]), []));
    }

    static fromString (str) {
        return ComplexDataType.fromArray(padStr.split('/'));
    }
}

// Split
function split (v, b) {
    return v % Math.pow(2, b);
}

function split2 (v, b) {
    return [v % Math.pow(2, b), (v >> b) % Math.pow(2, b)];
}

function split3 (v, b) {
    return [v % Math.pow(2, b), (v >> b) % Math.pow(2, b), (v >> (2 * b)) % Math.pow(2, b)];
}

function split4 (v, b) {
    return [v % Math.pow(2, b), (v >> b) % Math.pow(2, b), (v >> (2 * b)) % Math.pow(2, b), (v >> (3 * b)) % Math.pow(2, b)];
}

// Download
function download(e,d){let o=document.createElement("a");o.download=e,o.href=URL.createObjectURL(d),document.body.appendChild(o),o.click(),URL.revokeObjectURL(o.href),document.body.removeChild(o)}

const UI = {
    getHLEntryBlock: function (label, key) {
        return `
            <div class="equal width fields">
                <div class="field">
                    <label>${ label }</label>
                    <button class="ui toggle fluid button" data-settings="${ key }-enabled">Disabled</button>
                </div>
                <div class="field">
                    <label>Difference</label>
                    <button class="ui toggle fluid button" data-settings="${ key }-difference">Disabled</button>
                </div>
                <div class="field">
                    <label>Minimum</label>
                    <input type="text" class="text-center" data-settings="${ key }-min">
                </div>
                <div class="field">
                    <label>Recommended</label>
                    <input type="text" class="text-center" data-settings="${ key }-req">
                </div>
            </div>
        `;
    },
    getHLDiffBlock: function (label, key) {
        return `
            <div class="equal width fields">
                <div class="field">
                    <label>${ label }</label>
                </div>
                <div class="field">
                    <label>Difference</label>
                    <button class="ui toggle fluid button" data-settings="${ key }-difference">Disabled</button>
                </div>
                <div class="field">
                </div>
                <div class="field">
                </div>
            </div>
        `;
    },
    getHLDropdownBlock: function (label, key, options) {
        return `
            <div class="equal width fields">
                <div class="field">
                    <label>${ label }</label>
                    <button class="ui toggle fluid button" data-settings="${ key }-enabled">Disabled</button>
                </div>
                <div class="field">
                </div>
                <div class="field">
                    <label>Minimum</label>
                    <div class="ui selection compact dropdown">
                        <input type="hidden" value="0" data-settings="${ key }-min">
                        <i class="dropdown icon"></i>
                        <div class="default text"></div>
                        <div class="menu">
                            ${ options.map((entry, value) => `<div class="item" data-value="${ value }">${ entry }</div>`).join('') }
                        </div>
                    </div>
                </div>
                <div class="field">
                    <label>Recommended</label>
                    <div class="ui selection compact dropdown">
                        <input type="hidden" value="0" data-settings="${ key }-req">
                        <i class="dropdown icon"></i>
                        <div class="default text"></div>
                        <div class="menu">
                            ${ options.map((entry, value) => `<div class="item" data-value="${ value }">${ entry }</div>`).join('') }
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    getDLBlock: function (label, key, options) {
        return `
            <div class="field">
                <label>${ label }</label>
                <div class="ui selection dropdown">
                    <input type="hidden" value="0" data-settings="${ key }">
                    <i class="dropdown icon"></i>
                    <div class="default text"></div>
                    <div class="menu">
                        ${ options.map((entry, value) => `<div class="item" data-value="${ value }">${ entry }</div>`).join('') }
                    </div>
                </div>
            </div>
        `;
    }
};
