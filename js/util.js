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

    multiple (func) {
        return func(this);
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

    static fromValue (val) {
        return ComplexDataType.fromArray([ val ]);
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
                            ${ Object.entries(options).map(kv => `<div class="item" data-value="${ kv[0] }">${ kv[1] }</div>`).join('') }
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
                            ${ Object.entries(options).map(kv => `<div class="item" data-value="${ kv[0] }">${ kv[1] }</div>`).join('') }
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

function createConfigurationObject (custom) {
    var settings = {};

    if ($(`[data-${ custom ? 'custom-' : '' }settings]:not(.button)`).toArray().reduce((sum, element) => {
        var val = $(element).val();
        if (isNaN(val) || val < 0) {
            return sum + 1;
        } else {
            return sum;
        }
    }, 0) > 0) {
        return;
    }

    $(`[data-${ custom ? 'custom-' : '' }settings]`).toArray().forEach(function (element) {
        if ($(element).hasClass('button')) {
            settings[$(element).attr(`data-${ custom ? 'custom-' : '' }settings`)] = $(element).hasClass('active') ? 1 : 0;
        } else {
            settings[$(element).attr(`data-${ custom ? 'custom-' : '' }settings`)] = Number($(element).val());
        }
    });

    var data = {
        group: settings['show-group'],
        brackets: settings['show-difference-style'],
        categories: [
            {
                name: 'General',
                headers: [

                ]
            },
            {
                name: 'Potions'
            },
            {
                name: 'Group',
                headers: [

                ]
            },
            {
                name: 'Fortress',
                headers: [

                ]
            },
            {
                name: 'Dungeons',
                headers: [

                ]
            }
        ]
    };

    if (settings['show-class']) {
        data.categories[0].headers.push({
            name: 'Class'
        });
    }

    if (settings['show-id']) {
        data.categories[0].headers.push({
            name: 'ID'
        });
    }

    if (settings['show-rank']) {
        data.categories[0].headers.push({
            name: 'Rank'
        });
    }

    if (settings['show-role']) {
        data.categories[0].headers.push({
            name: 'Role'
        });
    }

    data.categories[0].headers.push({
        name: 'Level',
        diff: settings['level-difference'],
        colors: settings['level-enabled'] ? [ Color.RED, [ settings['level-req'], Color.GREEN ], [ settings['level-min'], Color.ORANGE ] ] : null,
        stat: true
    });

    data.categories[0].headers.push({
        name: 'Album',
        diff: settings['scrapbook-difference'],
        colors: settings['scrapbook-enabled'] ? [ Color.RED, [ settings['scrapbook-req'], Color.GREEN ], [ settings['scrapbook-min'], Color.ORANGE ] ] : null,
        percentage: !settings['show-book-style']
    });

    data.categories[0].headers.push({
        name: 'Mount',
        colors: settings['mount-enabled'] ? [ Color.RED, [ settings['mount-req'], Color.GREEN ], [ settings['mount-min'], Color.ORANGE ] ] : null,
        percentage: true
    });

    if (settings['show-achievements']) {
        data.categories[0].headers.push({
            name: 'Awards',
            colors: settings['achievements-enabled'] ? [ Color.RED, [ settings['achievements-req'], Color.GREEN ], [ settings['achievements-min'], Color.ORANGE ] ] : null,
            hydra: settings['show-hydra'],
            diff: settings['achievements-difference']
        });
    }

    data.categories[1].colors = settings['potions-enabled'] ? [ Color.RED, [ settings['potions-req'], Color.GREEN ], [ settings['potions-min'], Color.ORANGE ] ] : null;

    if (settings['show-treasure']) {
        data.categories[2].headers.push({
            name: 'Treasure',
            diff: settings['treasure-difference'],
            colors: settings['treasure-enabled'] ? [ Color.RED, [ settings['treasure-req'], Color.GREEN ], [ settings['treasure-min'], Color.ORANGE ] ] : null,
            stat: true
        });
    }

    if (settings['show-instructor']) {
        data.categories[2].headers.push({
            name: 'Instructor',
            diff: settings['instructor-difference'],
            colors: settings['instructor-enabled'] ? [ Color.RED, [ settings['instructor-req'], Color.GREEN ], [ settings['instructor-min'], Color.ORANGE ] ] : null,
            stat: true
        });
    }

    if (settings['show-pet']) {
        data.categories[2].headers.push({
            name: 'Pet',
            diff: settings['pet-difference'],
            colors: settings['pet-enabled'] ? [ Color.RED, [ settings['pet-req'], Color.GREEN ], [ settings['pet-min'], Color.ORANGE ] ] : null,
            stat: true
        });
    }

    if (settings['show-knights']) {
        data.categories[2].headers.push({
            name: 'Knights',
            diff: settings['knights-difference'],
            colors: settings['knights-enabled'] ? [ Color.RED, [ settings['knights-req'], Color.GREEN ], [ settings['knights-min'], Color.ORANGE ] ] : null,
            maximum: settings['show-knights'] == 2,
            stat: true
        });
    }

    if (settings['show-fortress']) {
        data.categories[3].headers.push({
            name: 'Fortress',
            diff: settings['fortress-difference'],
            colors: settings['fortress-enabled'] ? [ Color.RED, [ settings['fortress-req'], Color.GREEN ], [ settings['fortress-min'], Color.ORANGE ] ] : null,
        });
    }

    if (settings['show-gemmine']) {
        data.categories[3].headers.push({
            name: 'GemMine',
            diff: settings['gemmine-difference'],
            colors: settings['gemmine-enabled'] ? [ Color.RED, [ settings['gemmine-req'], Color.GREEN ], [ settings['gemmine-min'], Color.ORANGE ] ] : null,
        });
    }

    if (settings['show-fortress-honor']) {
        data.categories[3].headers.push({
            name: 'Honor',
            diff: settings['fortresshonor-difference']
        });
    }

    if (settings['show-fortress-upgrades']) {
        data.categories[3].headers.push({
            name: 'Upgrades',
            diff: settings['fortressupgrades-difference'],
            colors: settings['fortressupgrades-enabled'] ? [ Color.RED, [ settings['fortressupgrades-req'], Color.GREEN ], [ settings['fortressupgrades-min'], Color.ORANGE ] ] : null,
        });
    }

    if (settings['show-tower']) {
        data.categories[4].headers.push({
            name: 'Tower',
        });
    }

    if (settings['show-portal']) {
        data.categories[4].headers.push({
            name: 'Portal',
        });
    }

    return data;
}

function findObjectIn (object, name) {
    for (var i = 0, category; category = object.categories[i]; i++) {
        if (category.name == 'Potions' && category.name == name) {
            return category;
        } else if (!category.headers) {
            continue;
        } else {
            for (var j = 0, header; header = category.headers[j]; j++) {
                if (header.name == name) {
                    return header;
                }
            }
        }
    }
    return null;
}

function fillStandartConfiguration (data, custom) {
    var settings = {};

    var level = findObjectIn(data, 'Level');
    var album = findObjectIn(data, 'Album');
    var mount = findObjectIn(data, 'Mount');
    var awards = findObjectIn(data, 'Awards');
    var potions = findObjectIn(data, 'Potions');
    var treasure = findObjectIn(data, 'Treasure');
    var instructor = findObjectIn(data, 'Instructor');
    var pet = findObjectIn(data, 'Pet');
    var cclass = findObjectIn(data, 'Class');
    var id = findObjectIn(data, 'ID');
    var rank = findObjectIn(data, 'Rank');
    var tower = findObjectIn(data, 'Tower');
    var portal = findObjectIn(data, 'Portal');
    var role = findObjectIn(data, 'Role');
    var level = findObjectIn(data, 'Level');
    var honor = findObjectIn(data, 'Honor');
    var knights = findObjectIn(data, 'Knights');
    var fortress = findObjectIn(data, 'Fortress');
    var gemmine = findObjectIn(data, 'GemMine');
    var upgrades = findObjectIn(data, 'Upgrades');

    settings['show-group'] = data.group || 0;
    settings['show-difference-style'] = data.brackets ? 1 : 0;
    settings['show-class'] = cclass ? 1 : 0;
    settings['show-id'] = id ? 1 : 0;
    settings['show-rank'] = rank ? 1 : 0;
    settings['show-role'] = role ? 1 : 0;
    settings['show-tower'] = tower ? 1 : 0;
    settings['show-portal'] = portal ? 1 : 0;
    settings['show-achievements'] = awards ? 1 : 0;
    settings['show-hydra'] = (awards && awards.hydra) ? 1 : 0;
    settings['show-book-style'] = (album && !album.percentage) ? 1 : 0;
    settings['show-treasure'] = treasure ? 1 : 0;
    settings['show-fortress-honor'] = honor ? 1 : 0;
    settings['show-instructor'] = instructor ? 1 : 0;
    settings['show-fortress-upgrades'] = upgrades ? 1 : 0;
    settings['show-pet'] = pet ? 1 : 0;
    settings['show-gemmine'] = gemmine ? 1 : 0;
    settings['show-knights'] = knights ? (knights.maximum ? 2 : 1) : 0;
    settings['show-fortress'] = fortress ? 1 : 0;
    settings['level-enabled'] = (level && level.colors && level.colors.length) ? 1 : 0;
    settings['level-difference'] = (level && level.diff) ? 1 : 0;
    settings['level-min'] = (level && level.colors && level.colors[2]) ? level.colors[2][0] : 0;
    settings['level-req'] = (level && level.colors && level.colors[1]) ? level.colors[1][0] : 0;
    settings['scrapbook-enabled'] = (album && album.colors && album.colors.length) ? 1 : 0;
    settings['scrapbook-difference'] = (album && album.diff) ? 1 : 0;
    settings['scrapbook-min'] = (album && album.colors && album.colors[2]) ? album.colors[2][0] : 0;
    settings['scrapbook-req'] = (album && album.colors && album.colors[1]) ? album.colors[1][0] : 0;
    settings['mount-enabled'] = (mount && mount.colors && mount.colors.length) ? 1 : 0;
    settings['mount-min'] = (mount && mount.colors && mount.colors[2]) ? mount.colors[2][0] : 0;
    settings['mount-req'] = (mount && mount.colors && mount.colors[1]) ? mount.colors[1][0] : 0;
    settings['achievements-enabled'] = (awards && awards.colors && awards.colors.length) ? 1 : 0;
    settings['achievements-difference'] = (awards && awards.diff) ? 1 : 0;
    settings['achievements-min'] = (awards && awards.colors && awards.colors[2]) ? awards.colors[2][0] : 0;
    settings['achievements-req'] = (awards && awards.colors && awards.colors[1]) ? awards.colors[1][0] : 0;
    settings['potions-enabled'] = (potions && potions.colors && potions.colors.length) ? 1 : 0;
    settings['potions-min'] = (potions && potions.colors && potions.colors[2]) ? potions.colors[2][0] : 0;
    settings['potions-req'] = (potions && potions.colors && potions.colors[1]) ? potions.colors[1][0] : 0;
    settings['treasure-enabled'] = (treasure && treasure.colors && treasure.colors.length) ? 1 : 0;
    settings['treasure-difference'] = (treasure && treasure.diff) ? 1 : 0;
    settings['treasure-min'] = (treasure && treasure.colors && treasure.colors[2]) ? treasure.colors[2][0] : 0;
    settings['treasure-req'] = (treasure && treasure.colors && treasure.colors[1]) ? treasure.colors[1][0] : 0;
    settings['instructor-enabled'] = (instructor && instructor.colors && instructor.colors.length) ? 1 : 0;
    settings['instructor-difference'] = (instructor && instructor.diff) ? 1 : 0;
    settings['instructor-min'] = (instructor && instructor.colors && instructor.colors[2]) ? instructor.colors[2][0] : 0;
    settings['instructor-req'] = (instructor && instructor.colors && instructor.colors[1]) ? instructor.colors[1][0] : 0;
    settings['pet-enabled'] = (pet && pet.colors && pet.colors.length) ? 1 : 0;
    settings['pet-difference'] = (pet && pet.diff) ? 1 : 0;
    settings['pet-min'] = (pet && pet.colors && pet.colors[2]) ? pet.colors[2][0] : 0;
    settings['pet-req'] = (pet && pet.colors && pet.colors[1]) ? pet.colors[1][0] : 0;
    settings['knights-enabled'] = (knights && knights.colors && knights.colors.length) ? 1 : 0;
    settings['knights-difference'] = (knights && knights.diff) ? 1 : 0;
    settings['knights-min'] = (knights && knights.colors && knights.colors[2]) ? knights.colors[2][0] : 0;
    settings['knights-req'] = (knights && knights.colors && knights.colors[1]) ? knights.colors[1][0] : 0;
    settings['fortress-enabled'] = (fortress && fortress.colors && fortress.colors.length) ? 1 : 0;
    settings['fortress-difference'] = (fortress && fortress.diff) ? 1 : 0;
    settings['fortress-min'] = (fortress && fortress.colors && fortress.colors[2]) ? fortress.colors[2][0] : 0;
    settings['fortress-req'] = (fortress && fortress.colors && fortress.colors[1]) ? fortress.colors[1][0] : 0;
    settings['gemmine-enabled'] = (gemmine && gemmine.colors && gemmine.colors.length) ? 1 : 0;
    settings['gemmine-difference'] = (gemmine && gemmine.diff) ? 1 : 0;
    settings['gemmine-min'] = (gemmine && gemmine.colors && gemmine.colors[2]) ? gemmine.colors[2][0] : 0;
    settings['gemmine-req'] = (gemmine && gemmine.colors && gemmine.colors[1]) ? gemmine.colors[1][0] : 0;
    settings['fortressupgrades-enabled'] = (upgrades && upgrades.colors && upgrades.colors.length) ? 1 : 0;
    settings['fortressupgrades-difference'] = (upgrades && upgrades.diff) ? 1 : 0;
    settings['fortressupgrades-min'] = (upgrades && upgrades.colors && upgrades.colors[2]) ? upgrades.colors[2][0] : 0;
    settings['fortressupgrades-req'] = (upgrades && upgrades.colors && upgrades.colors[1]) ? upgrades.colors[1][0] : 0;
    settings['fortresshonor-difference'] = (honor && honor.diff) ? 1 : 0;

    Object.entries(settings).forEach(function (keyval) {
        var key = keyval[0];
        var val = keyval[1];

        var element = $(`[data-${ custom ? 'custom-' : '' }settings="${key}"]`);
        if (element.hasClass('button')) {
            if (val) {
                setEnabled(element);
            } else {
                setDisabled(element);
            }
        } else {
            element.val(val);
        }
    });
}
