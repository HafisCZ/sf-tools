class HeaderGroup {
    constructor (name, empty) {
        this.name = name;
        this.empty = empty;
        this.sortkey = SHA1(name);

        this.width = 0;
        this.length = 0;

        this.headers = [];
    }

    add (name, settings, defaults, cellgen, statgen, sort, last, span = 1) {
        var header = {
            name: name,
            generators: {
                cell: cellgen,
                statistics: statgen
            },
            sort: sort,
            sortkey: `${ this.sortkey }.${ name }.${ this.length }`,
            span: span,
            bordered: last
        };

        merge(header, settings);
        merge(header, defaults);

        this.headers.push(header);
        this.width += header.width;
        this.length += span;
    }
}

// Helper function
function merge (a, b) {
    for (var [k, v] of Object.entries(b)) {
        if (!a.hasOwnProperty(k) && typeof(v) != 'object') a[k] = b[k];
    }
    return a;
}

function mergeAll (a, b) {
    for (var [k, v] of Object.entries(b)) {
        if (!a.hasOwnProperty(k)) a[k] = b[k];
    }
    return a;
}

// Special array for players only
class PlayersTableArray extends Array {
    constructor (perf, ts, rs) {
        super();

        this.perf = perf;

        this.timestamp = ts;
        this.reference = rs;
    }

    add (player, compare, latest, hidden) {
        super.push({ player: player, compare: compare || player, latest: latest, index: this.length, hidden: hidden });
    }
}

// Special array for group only
class GroupTableArray extends Array {
    constructor (joined, kicked, ts, rs, missing) {
        super();

        this.joined = joined;
        this.kicked = kicked;
        this.missing = missing;

        this.timestamp = ts;
        this.reference = rs;
    }

    add (player, compare) {
        super.push({ player: player, compare: compare || player, index: this.length });
    }
}

// Table Type
const TableType = {
    History: 0,
    Players: 1,
    Group: 2
}

// Easter eggs :)
function getEasterEgg (id) {
    if (id == 'w27_net_p268175' || id == 'w39_net_p321948') {
        // #1 THE QUEEN
        return '<i class="chess queen icon"></i>';
    } else if (id == 'w27_net_p287170' || id == 'w39_net_p329544' || id == 'w42_net_p2' || id == 'w40_net_p1230') {
        return '<img src="res/icon_sft.png" style="margin-bottom: 1px; width: 24px;"/> ';
    } else {
        return '';
    }
}

// Table instance
class TableInstance {
    constructor (settings, type) {
        // Parameters
        this.settings = settings;
        this.type = type;

        this.sorting = [];

        // Column configuration
        this.config = [];
        this.settings.c.forEach((category, ci, ca) => {
            var group = new HeaderGroup(category.alias || category.name, category.alias == undefined && category.empty);
            var glast = ci == ca.length - 1;

            category.h.forEach((header, hi, ha) => {
                var hlast = (!glast && hi == ha.length - 1) || header.border >= 2 || (hi != ha.length - 1 && (ha[hi + 1].border == 1 || ha[hi + 1].border == 3));

                if (header.itemized) {
                    group.add((header.alias != undefined ? header.alias : header.name), header, {
                        width: Math.max(100, (header.alias || header.name).length * 12)
                    }, (player, compare) => {
                        var cells = [];

                        var items = header.itemized.expr(player, compare, this.settings);
                        if (Array.isArray(items)) {
                            items = Object.entries([ ...items ]);
                        } else {
                            items = Object.entries(items);
                        }

                        var cmp = undefined;
                        if (compare && header.difference) {
                            cmp = header.itemized.expr(compare, compare, this.settings);
                        }

                        for (var [ key, item ] of items) {
                            var value = header.expr(player, compare, this.settings, item);
                            if (value == undefined) {
                                return CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                            }

                            var reference = cmp ? header.expr(compare, this.settings.getCompareEnvironment(), cmp[key]) : undefined;
                            if (reference != undefined) {
                                reference = header.flip ? (reference - value) : (value - reference);
                                reference = CellGenerator.Difference(reference, header.brackets, header.format_diff ? header.format(player, compare, this.settings, reference) : (Number.isInteger(reference) ? reference : reference.toFixed(2)));
                            } else {
                                reference = '';
                            }

                            var color = CompareEval.evaluate(value, header.color);
                            color = (color != undefined ? color : (header.expc ? header.expc(player, compare, this.settings, value) : '')) || '';

                            var displayValue = CompareEval.evaluate(value, header.value);
                            if (displayValue == undefined && header.format) {
                                value = header.format(player, compare, this.settings, value);
                            } else if (displayValue != undefined) {
                                value = displayValue;
                            }

                            if (value != undefined && header.extra) {
                                value = `${ value }${ header.extra(player) }`;
                            }

                            cells.push(CellGenerator.Cell(value + reference, color, header.visible ? '' : color, hlast, header.align, header.padding, header.style ? header.style.cssText : undefined));
                        }

                        return cells;
                    }, null, (player, compare) => {
                        var items = header.itemized.expr(player, this.settings);
                        if (Array.isArray(items)) {
                            items = items.reduce((col, item) => col + header.expr(player, compare, this.settings, item), 0);
                        } else {
                            items = Object.values(items).reduce((col, item) => col + header.expr(player, compare, this.settings, item), 0);
                        }

                        return items == undefined ? -1 : items;
                    }, hlast);
                } else if (header.grouped) {
                    if (header.width) {
                        header.width = header.grouped * (header.width + 3);
                    }

                    group.add((header.alias != undefined ? header.alias : header.name), header, {
                        width: Math.max(100, (header.alias || header.name).length * 12)
                    }, (player, compare) => {
                        var values = header.expr(player, compare, this.settings);
                        var references = header.expr(compare, compare, this.settings.getCompareEnvironment());

                        if (values == undefined || !Array.isArray(values)) {
                            return CellGenerator.PlainSpan(header.grouped, header.ndef == undefined ? '?' : header.ndef, hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                        } else {
                            var content = '';

                            for (var i = 0; i < header.grouped; i++) {
                                var value = values[i];
                                var reference = references[i] == undefined ? value : references[i];
                                let extra = {
                                    index: i
                                };

                                if (value == undefined) {
                                    content += CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, i == header.grouped - 1 && hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                                } else {
                                    reference = (header.difference && compare) ? reference : undefined;
                                    if (!isNaN(reference)) {
                                        reference = header.flip ? (reference - value) : (value - reference);

                                        var freference = reference;
                                        if (header.format_diff === undefined) {
                                            freference = Number.isInteger(reference) ? reference : reference.toFixed(2);
                                        } else if (header.format_diff === true) {
                                            if (header.format) {
                                                freference = header.format(player, compare, this.settings, reference, extra);
                                            }
                                        } else if (header.format_diff !== false) {
                                            freference = header.format_diff(this.settings, reference);
                                        }

                                        reference = CellGenerator.Difference(reference, header.brackets, freference);
                                    } else {
                                        reference = '';
                                    }

                                    var color = CompareEval.evaluate(value, header.color);
                                    color = (color != undefined ? color : (header.expc ? header.expc(player, compare, this.settings, value, extra) : '')) || '';

                                    var displayValue = CompareEval.evaluate(value, header.value);
                                    if (displayValue == undefined && header.format) {
                                        value = header.format(player, compare, this.settings, value, extra);
                                    } else if (displayValue != undefined) {
                                        value = displayValue;
                                    }

                                    if (value != undefined && header.extra) {
                                        value = `${ value }${ header.extra(player) }`;
                                    }

                                    content += CellGenerator.Cell(value + reference, color, header.visible ? '' : color, i == header.grouped - 1 && hlast, header.align, header.padding, header.style ? header.style.cssText : undefined);
                                }
                            }

                            return content;
                        }
                    }, null, (player, compare) => {
                        var value = header.expr(player, compare, this.settings);
                        if (value == undefined) {
                            return -1;
                        } else if (Array.isArray(value)) {
                            return value.reduce((a, b) => a + b, 0);
                        } else {
                            return value;
                        }
                    }, hlast, header.grouped);
                } else {
                    group.add((header.alias != undefined ? header.alias : header.name), header, {
                        width: Math.max(100, (header.alias || header.name).length * 12)
                    }, (player, compare) => {
                        var value = header.expr(player, compare, this.settings);
                        if (value == undefined) {
                            return CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                        }

                        var reference = (header.difference && compare) ? header.expr(compare, compare, this.settings.getCompareEnvironment()) : undefined;
                        if (!isNaN(reference)) {
                            reference = header.flip ? (reference - value) : (value - reference);

                            var freference = reference;
                            if (header.format_diff === undefined) {
                                freference = Number.isInteger(reference) ? reference : reference.toFixed(2);
                            } else if (header.format_diff === true) {
                                if (header.format) {
                                    freference = header.format(player, compare, this.settings, reference);
                                }
                            } else if (header.format_diff !== false) {
                                freference = header.format_diff(this.settings, reference);
                            }

                            reference = CellGenerator.Difference(reference, header.brackets, freference);
                        } else {
                            reference = '';
                        }

                        var color = CompareEval.evaluate(value, header.color);
                        color = (color != undefined ? color : (header.expc ? header.expc(player, compare, this.settings, value) : '')) || '';

                        var displayValue = CompareEval.evaluate(value, header.value);
                        if (displayValue == undefined && header.format) {
                            value = header.format(player, compare, this.settings, value);
                        } else if (displayValue != undefined) {
                            value = displayValue;
                        }

                        if (value != undefined && header.extra) {
                            value = `${ value }${ header.extra(player) }`;
                        }

                        return CellGenerator.Cell(value + reference, color, header.visible ? '' : color, hlast, header.align, header.padding, header.style ? header.style.cssText : undefined);
                    }, (players, operation) => {
                        var value = players.map(p => header.expr(p.player, p.compare, this.settings)).filter(x => x != undefined);
                        if (value.length == 0) {
                            return CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, undefined, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                        }

                        value = operation(value);
                        if (!header.decimal) {
                            value = Math.trunc(value);
                        }

                        var reference = header.difference ? players.map(p => header.expr(p.compare, p.compare, this.settings.getCompareEnvironment())).filter(x => x != undefined) : undefined;

                        if (reference && reference.length) {
                            reference = operation(reference);

                            if (!isNaN(reference)) {
                                if (!header.decimal) {
                                    reference = Math.trunc(reference);
                                }

                                reference = header.flip ? (reference - value) : (value - reference);

                                var freference = reference;
                                if (header.format_diff === undefined) {
                                    freference = Number.isInteger(reference) ? reference : reference.toFixed(2);
                                } else if (header.format_diff === true) {
                                    if (header.format) {
                                        freference = header.format(undefined, undefined, this.settings, reference);
                                    }
                                } else if (header.format_diff !== false) {
                                    freference = header.format_diff(this.settings, reference);
                                }

                                reference = CellGenerator.Difference(reference, header.brackets, freference);
                            } else {
                                reference = '';
                            }
                        } else {
                            reference = '';
                        }

                        var color = undefined;
                        if (header.statistics_color) {
                            color = CompareEval.evaluate(value, header.color, true);
                            color = (color != undefined ? color : (header.expc ? header.expc(null, null, this.settings, value) : '')) || '';
                        }

                        if (header.format_stat === undefined || header.format_stat === true) {
                            var displayValue = CompareEval.evaluate(value, header.value);
                            if (displayValue == undefined && header.format) {
                                value = header.format(undefined, undefined, this.settings, value);
                            } else if (displayValue != undefined) {
                                value = displayValue;
                            }

                            if (value != undefined && header.extra) {
                                value = `${ value }${ header.extra(undefined) }`;
                            }
                        } else if (header.format_stat !== false) {
                            value = header.format_stat(this.settings, value);
                        }

                        return CellGenerator.Cell(value + reference, '', color);
                    }, (player, compare) => {
                        var value = header.expr(player, compare, this.settings);
                        if (value == undefined) {
                            return -1;
                        } else {
                            return value;
                        }
                    }, hlast);
                }
            });

            this.addHeader(group);
        });

        if (this.settings.globals.scale) {
            var factor = this.settings.globals.scale / 100;
            for (var category of this.config) {
                category.width = Math.ceil(category.width * factor);
                for (var header of category.headers) {
                    header.width = Math.ceil(header.width * factor);
                }
            }
        }

        this.flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);
    }

    addHeader (... groups) {
        groups.forEach(g => {
            if (g.headers.length) {
                this.config.push(g);
            }
        });
    }

    // Get current table content
    getTableContent () {
        var content, size;

        if (this.type == TableType.History) {
            [content, size] = this.createHistoryTable();
        } else if (this.type == TableType.Players) {
            [content, size] =  this.createPlayersTable();
        } else if (this.type == TableType.Group) {
            [content, size] =  this.createGroupTable();
        }

        var node = $(content);
        if (!SiteOptions.insecure && node.find('script, iframe, img[onerror]').toArray().length) {
            return [ $('<div><b style="font-weight: 1000;">Error in the system:</b><br/><br/>This table was not displayed because it contains HTML tags that are prohibited.<br/>Please remove them from your settings and try again.</div>'), size];
        }

        return [node, size];
    }

    // Set players
    setEntries (array, skipeval, sim, sort = undefined) {
        // Entry array
        this.array = array;

        // Calculate constants
        if (this.type != TableType.History && !skipeval) {
            var players = [ ... array ];
            players.timestamp = array.timestamp;
            players.reference = array.reference;
            players.map_player = players.map(p => p.player);
            players.map_compare = players.map(p => p.compare);

            if (this.type == TableType.Players) {
                this.settings.evaluateConstants(players, sim, array.perf || this.settings.globals.performance, this.type);
            } else {
                players.joined = array.joined;
                players.kicked = array.kicked;
                this.settings.evaluateConstants(players, this.settings.globals.simulator, array.length, this.type);
            }
        } else if (this.type == TableType.History) {
            this.settings.evaluateConstantsHistory(array.map(p => p[1]));
        }

        if (sort && (this.type == TableType.Players || this.type == TableType.Group)) {
            this.array.sort((a, b) => sort(b.player, b.compare) - sort(a.player, a.compare));
            for (var i = 0; i < this.array.length; i++) {
                this.array[i].index = i;
            }
        }

        // Generate table entries
        this.generateEntries();
    }

    // Generate entries
    generateEntries () {
        this.entries = [];

        if (this.type == TableType.History) {
            for (var i = 0; i < this.array.length; i++) {
                var [ timestamp, player ] = this.array[i];

                var columns = [];
                for (var j = 0; j < this.flat.length; j++) {
                    columns[j] = this.flat[j].generators.cell(player, i != this.array.length - 1 ? this.array[i + 1][1] : player);
                }

                var height = columns.reduce((highest, column) => Math.max(highest, Array.isArray(column) ? column.length : 1), 0);

                var indexedCol = this.settings.globals.indexed ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' }><ispan data-indexed="${ this.settings.globals.indexed }">${ i + 1 }</ispan></td>` : undefined;
                var nameCol = `<td class="border-right-thin" ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' }>${ formatDate(timestamp) }</td>`;

                var content = '';

                for (var j = 0; j < height; j++) {
                    content += `<tr class="css-entry ${ j == height - 1 && height > 1 ? 'border-bottom-thin' : '' }">`;

                    if (indexedCol) {
                        if (j == 0) {
                            content += indexedCol;
                        }
                    }

                    if (j == 0) {
                        content += nameCol;
                    }

                    for (var k = 0; k < columns.length; k++) {
                        if (Array.isArray(columns[k])) {
                            content += columns[k][j] || CellGenerator.Empty(this.flat[k].bordered);
                        } else if (j == 0) {
                            content += columns[k];
                        } else {
                            content += CellGenerator.Empty(this.flat[k].bordered);
                        }
                    }

                    content += `</tr>`;
                }

                this.entries.push({
                    content: content
                });
            }
        } else if (this.type == TableType.Players) {
            var exact = this.array.reference == this.array.timestamp;

            for (var i = 0; i < this.array.length; i++) {
                var item = this.array[i];

                var columns = [];
                for (var j = 0; j < this.flat.length; j++) {
                    columns[j] = this.flat[j].generators.cell(item.player, item.compare);
                }

                var height = columns.reduce((highest, column) => Math.max(highest, Array.isArray(column) ? column.length : 1), 0);

                var indexedCol = this.settings.globals.indexed ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' }><ispan data-indexed="${ this.settings.globals.indexed }">${ item.index + 1 }</ispan></td>` : undefined;
                var serverCol = this.settings.globals.server == undefined || this.settings.globals.server > 0 ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' }>${ SiteOptions.obfuscated ? 'server' : item.player.Prefix }</td>` : undefined;
                var nameCol = `<td class="border-right-thin clickable ${ item.latest || !this.settings.globals.outdated ? '' : 'foreground-red' }" ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' } data-id="${ item.player.Identifier }"><span class="css-op-select-el"></span>${ SiteOptions.obfuscated ? '' : getEasterEgg(item.player.Identifier) }${ SiteOptions.obfuscated ? `player_${ item.index + 1 }` : item.player.Name }</td>`;

                var content = '';

                for (var j = 0; j < height; j++) {
                    content += `<tr class="css-entry ${ item.hidden ? 'css-entry-hidden' : '' } ${ j == height - 1 && height > 1 ? 'border-bottom-thin' : '' }">`;

                    if (indexedCol) {
                        if (j == 0) {
                            content += indexedCol;
                        }
                    }

                    if (serverCol) {
                        if (j == 0) {
                            content += serverCol;
                        }
                    }

                    if (j == 0) {
                        content += nameCol;
                    }

                    for (var k = 0; k < columns.length; k++) {
                        if (Array.isArray(columns[k])) {
                            content += columns[k][j] || CellGenerator.Empty(this.flat[k].bordered);
                        } else if (j == 0) {
                            content += columns[k];
                        } else {
                            content += CellGenerator.Empty(this.flat[k].bordered);
                        }
                    }

                    content += `</tr>`;
                }

                var entry = {
                    // Row
                    content: content,
                    sorting: {
                        '_name': item.player.Name,
                        '_index': item.index,
                        '_server': item.player.Prefix
                    }
                };

                for (var column of this.flat) {
                    if (column.order) {
                        var diff = undefined;
                        var v = column.expr(item.player, item.compare, this.settings);

                        if (!exact) {
                            var c = column.expr(item.compare, item.compare, this.settings);
                            diff = column.flip ? (c - v) : (v - c);
                        }

                        entry.sorting[column.sortkey] = column.order(item.player, item.compare, this.settings, v, { difference: diff });
                    } else {
                        entry.sorting[column.sortkey] = column.sort(item.player, item.compare);
                    }
                }

                this.entries.push(entry);
            }
        } else if (this.type == TableType.Group) {
            var exact = this.array.reference == this.array.timestamp;

            for (var i = 0; i < this.array.length; i++) {
                var item = this.array[i];

                var columns = [];
                for (var j = 0; j < this.flat.length; j++) {
                    columns[j] = this.flat[j].generators.cell(item.player, item.compare);
                }

                var height = columns.reduce((highest, column) => Math.max(highest, Array.isArray(column) ? column.length : 1), 0);

                var indexedCol = this.settings.globals.indexed ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' }><ispan data-indexed="${ this.settings.globals.indexed }">${ item.index + 1 }</ispan></td>` : undefined;
                var nameCol = `<td class="border-right-thin clickable" ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" ${ this.settings.shared.background ? `style="background: ${ getCSSColor(this.settings.shared.background) };"` : '' } data-id="${ item.player.Identifier }">${ SiteOptions.obfuscated ? '' : getEasterEgg(item.player.Identifier) }${ SiteOptions.obfuscated ? `player_${ item.index + 1 }` : item.player.Name }</td>`;

                var content = '';

                for (var j = 0; j < height; j++) {
                    content += `<tr class="css-entry ${ j == height - 1 && height > 1 ? 'border-bottom-thin' : '' }">`;

                    if (indexedCol) {
                        if (j == 0) {
                            content += indexedCol;
                        }
                    }

                    if (j == 0) {
                        content += nameCol;
                    }

                    for (var k = 0; k < columns.length; k++) {
                        if (Array.isArray(columns[k])) {
                            content += columns[k][j] || CellGenerator.Empty(this.flat[k].bordered);
                        } else if (j == 0) {
                            content += columns[k];
                        } else {
                            content += CellGenerator.Empty(this.flat[k].bordered);
                        }
                    }

                    content += `</tr>`;
                }

                var entry = {
                    // Row
                    content: content,
                    sorting: {
                        '_name': item.player.Name,
                        '_index': item.index
                    }
                };

                for (var column of this.flat) {
                    if (column.order) {
                        var diff = undefined;
                        var v = column.expr(item.player, item.compare, this.settings);

                        if (!exact) {
                            var c = column.expr(item.compare, item.compare, this.settings);
                            diff = column.flip ? (c - v) : (v - c);
                        }

                        entry.sorting[column.sortkey] = column.order(item.player, item.compare, this.settings, v, { difference: diff });
                    } else {
                        entry.sorting[column.sortkey] = column.sort(item.player, item.compare);
                    }
                }

                this.entries.push(entry);
            }

            this.entries.missing = this.array.missing;
        }
    }

    removeSorting (key) {
        var index = this.sorting.findIndex(sort => sort.key == key);
        if (index != -1) {
            this.sorting.splice(index, 1);
            this.sort();
        }
    }

    setSorting (key = undefined) {
        var index = this.sorting.findIndex(sort => sort.key == key);
        if (index == -1) {
            var obj = this.flat.find(header => header.sortkey == key);
            this.sorting.push({
                key: key,
                flip: obj == undefined ? (key == '_index') : obj.flip,
                order: 1
            });
        } else {
            this.sorting[index].order = this.sorting[index].order == 1 ? 2 : 1;
        }

        this.sort();
    }

    // Set sorting
    sort () {
        if (this.sorting.length) {
            this.entries.sort((a, b) => {
                var { key, flip, order } = this.sorting[0];
                var result = ((order == 1 && !flip) || (order == 2 && flip)) ? compareItems(a.sorting[key], b.sorting[key]) : compareItems(b.sorting[key], a.sorting[key]);

                for (var i = 1; i < this.sorting.length; i++) {
                    var { key, flip, order } = this.sorting[i];
                    result = result || (((order == 1 && !flip) || (order == 2 && flip)) ? compareItems(a.sorting[key], b.sorting[key]) : compareItems(b.sorting[key], a.sorting[key]));
                }

                return result || (a.sorting['_index'] - b.sorting['_index']);
            });
        } else {
            this.entries.sort((a, b) => a.sorting['_index'] - b.sorting['_index']);
        }
    }

    // Sorting attributes for HTML
    getSortingTag (key) {
        var index = this.sorting.findIndex(s => s.key == key);
        return `data-sortable-key="${ key }" data-sortable="${ this.sorting[index] ? this.sorting[index].order : 0 }" data-sortable-index=${ this.sorting.length == 1 ? '' : (index + 1) }`;
    }

    // Create history table
    createHistoryTable () {
        var sizeDynamic = this.config.reduce((a, b) => a + b.width, 0);
        var size = 200 + (this.settings.globals.indexed ? 50 : 0) + Math.max(400, sizeDynamic);

        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        var details = '';
        if (this.settings.extras.length) {
            var widskip = 1;
            for (var i = 0, wid = 100; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            for (var extra of this.settings.extras) {
                var lw = widskip;
                if (extra.width) {
                    var lw = 1;
                    for (var i = 0, wid = (extra.width == -1 ? sizeDynamic : extra.width); wid > 0 && i < this.flat.length; i++) {
                        wid -= this.flat[i].width;
                        if (wid > 0) {
                            lw += this.flat[i].span;;
                        } else {
                            break;
                        }
                    }
                }

                var player = this.array[0][1];
                var value = extra.ast.eval(player, player, this.settings, player);

                var color = CompareEval.evaluate(value, extra.color);
                color = (color != undefined ? color : (extra.expc ? extra.expc(player, player, this.settings, value) : '')) || '';

                var displayValue = CompareEval.evaluate(value, extra.value);
                if (displayValue == undefined && extra.format) {
                    value = extra.format(player, player, this.settings, value);
                } else if (displayValue != undefined) {
                    value = displayValue;
                }

                if (value != undefined && extra.extra) {
                    value = `${ value }${ extra.extra(player) }`;
                }

                var cell = CellGenerator.WideCell(value, color, lw, extra.align, extra.padding, extra.style ? extra.style.cssText : undefined);
                details += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>${ extra.name }</td>
                        ${ cell }
                    </tr>
                `;
            }

            details += `
                <tr>
                    <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                    <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                </tr>
                <tr>
                    <td colspan="${ dividerSpan + 1 + (this.settings.globals.indexed ? 1 : 0) }"></td>
                </tr>
            `;
        }

        return [
            `
                <thead>

                </thead>
                <tbody style="${ this.settings.globals.font ? `font: ${ this.settings.globals.font };` : '' }" class="${ this.settings.globals.lined ? (this.settings.globals.lined == 1 ? 'css-entry-lined' : 'css-entry-thicklined') : '' } ${ this.settings.globals.opaque ? 'css-entry-opaque' : '' } ${ this.settings.globals['large rows'] ? 'css-maxi-row' : '' }">
                    ${ details }
                    <tr>
                        ${ this.settings.globals.indexed ? `<td style="width: 50px;" colspan="1" rowspan="2">#</td>` : '' }
                        <td style="width: 200px;" colspan="1" rowspan="2" class="border-right-thin">Date</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" style="width: ${ h.width }px;" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    </tr>
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" style="width: ${ h.width }px;" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                    </tr>
                    <tr>
                        ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                        <td class="border-bottom-thick border-right-thin"></td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
                    </tr>
                    ${ join(this.entries, e => e.content) }
                </tbody>
            `,
            size
        ];
    }

    // Create players table
    createPlayersTable () {
        var sizeServer = this.settings.globals.server == undefined ? 100 : this.settings.globals.server;
        var sizeName = this.settings.globals.name == undefined ? 250 : this.settings.globals.name;
        var sizeDynamic = this.config.reduce((a, b) => a + b.width, 0);

        var size = sizeName + sizeServer + (this.settings.globals.indexed ? 50 : 0) + Math.max(400, sizeDynamic);

        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        var details = '';
        if (this.settings.extras.length) {
            var widskip = 1;
            for (var i = 0, wid = 100; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            for (var extra of this.settings.extras) {
                var lw = widskip;

                if (extra.width) {
                    var lw = 1;
                    for (var i = 0, wid = (extra.width == -1 ? sizeDynamic : extra.width); wid > 0 && i < this.flat.length; i++) {
                        wid -= this.flat[i].width;
                        if (wid > 0) {
                            lw += this.flat[i].span;;
                        } else {
                            break;
                        }
                    }
                }

                var value = extra.eval.value;
                var reference = extra.difference && !isNaN(extra.eval.compare) ? extra.eval.compare : '';

                if (reference && !isNaN(reference)) {
                    reference = extra.flip ? (reference - value) : (value - reference);
                    reference = CellGenerator.Difference(reference, extra.brackets, extra.format_diff ? extra.format(null, undefined, this.settings, reference) : (Number.isInteger(reference) ? reference : reference.toFixed(2)));
                } else {
                    reference = '';
                }

                var color = CompareEval.evaluate(value, extra.color);
                color = (color != undefined ? color : (extra.expc ? extra.expc(undefined, null, this.settings, value) : '')) || '';

                var displayValue = CompareEval.evaluate(value, extra.value);
                if (displayValue == undefined && extra.format) {
                    value = extra.format(undefined, undefined, this.settings, value);
                } else if (displayValue != undefined) {
                    value = displayValue;
                }

                if (value != undefined && extra.extra) {
                    value = `${ value }${ extra.extra(undefined) }`;
                }

                var cell = CellGenerator.WideCell(value + reference, color, lw, extra.align, extra.padding, extra.style ? extra.style.cssText : undefined);
                details += `
                    <tr>
                        <td class="border-right-thin" colspan="${ 1 + (this.settings.globals.indexed ? 1 : 0) + (sizeServer ? 1 : 0) }">${ extra.name }</td>
                        ${ cell }
                    </tr>
                `;
            }

            details += `
                <tr>
                    <td class="border-right-thin border-bottom-thick" colspan="${ 1 + (this.settings.globals.indexed ? 1 : 0) + (sizeServer ? 1 : 0) }"></td>
                    <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                </tr>
                <tr>
                    <td colspan="${ 1 + (this.settings.globals.indexed ? 1 : 0) + (sizeServer ? 1 : 0) }"></td>
                </tr>
            `;
        }

        return [
            `
                <thead>

                </thead>
                <tbody style="${ this.settings.globals.font ? `font: ${ this.settings.globals.font };` : '' }" class="${ this.settings.globals.lined ? (this.settings.globals.lined == 1 ? 'css-entry-lined' : 'css-entry-thicklined') : '' } ${ this.settings.globals.opaque ? 'css-entry-opaque' : '' } ${ this.settings.globals['large rows'] ? 'css-maxi-row' : '' }">
                    ${ details }
                    <tr>
                        ${ this.settings.globals.indexed ? `<td style="width: 50px;" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                        ${ sizeServer ? `<td style="width: ${ sizeServer }px;" rowspan="2" class="clickable" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                        <td style="width: ${ sizeName }px;" rowspan="2" class="border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`)) }
                    </tr>
                    <tr>
                        ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                        <td class="border-bottom-thick border-right-thin" colspan="${ sizeServer ? 2 : 1 }"></td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
                    </tr>
                    ${ join(this.entries, (e, ei) => e.content.replace(/\<ispan data\-indexed\=\"2\"\>\d*\<\/ispan\>/, `<ispan data-indexed="2">${ ei + 1 }</ispan>`), 0, this.array.perf || this.settings.globals.performance) }
                </tbody>
            `,
            size
        ];
    }

    // Create group table
    createGroupTable () {
        var name = this.settings.globals.name == undefined ? 250 : this.settings.globals.name;

        var sizeDynamic = this.config.reduce((a, b) => a + b.width, 0);
        var size = name + (this.settings.globals.indexed ? 50 : 0) + Math.max(400, sizeDynamic);

        var showMembers = this.settings.globals.members;
        var showSummary = this.flat.reduce((a, b) => a || b.statistics, false);
        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        // Table block
        var table = `
            <tr>
                ${ this.settings.globals.indexed ? `<td style="width: 50px;" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                <td style="width: ${ name }px;" rowspan="2" class="border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
            <tr>
                ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`)) }
            </tr>
            <tr>
                ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                <td class="border-bottom-thick border-right-thin"></td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
            </tr>
                ${ join(this.entries, (e, ei) => e.content.replace(/\<ispan data\-indexed\=\"2\"\>\d*\<\/ispan\>/, `<ispan data-indexed="2">${ ei + 1 }</ispan>`)) }
                ${ this.entries.missing.length ? `<tr class="css-b-bold">${ CellGenerator.WideCell(CellGenerator.Small(`Player data is missing for following members:<br/>${ this.entries.missing.map((n, i) => `${ i != 0 && i % 10 == 0 ? '<br/>' : '' }<b>${ n }</b>`).join(', ') }!`), undefined, this.flat.length + (this.settings.globals.indexed ? 1 : 0) + 1, 'center') }</tr>` : '' }
        `;

        // Statistics block
        var statistics = '';
        if (showSummary) {
            if (this.settings.stats.length > 0) {
                statistics += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        ${ join(this.flat, (h, i) => `<td colspan="${ h.span }">${ h.statistics && h.generators.statistics ? h.name : '' }</td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                    </tr>
                `;

                for (var stat of this.settings.stats) {
                    statistics += `
                        <tr>
                            <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>${ stat.name }</td>
                            ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => stat.ast.eval(null, null, this.settings, ar)) : `<td colspan=${ h.span }></td>`) }
                        </tr>
                    `;
                }
            } else {
                statistics += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        ${ join(this.flat, (h, i) => `<td colspan="${ h.span }">${ h.statistics && h.generators.statistics ? h.name : '' }</td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                    </tr>
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Minimum</td>
                        ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => Math.min(... ar)) : `<td colspan=${ h.span }></td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Average</td>
                        ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => ar.reduce((a, b) => a + b, 0) / ar.length) : `<td colspan=${ h.span }></td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Maximum</td>
                        ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => Math.max(... ar)) : `<td colspan=${ h.span }></td>`) }
                    </tr>
                `;
            }
        }

        // Content spacers
        var linedSpacer = `
            <tr>
                <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
            </tr>
        `;

        var linedSpacerTop = `
            <tr>
                <td class="border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
            </tr>
        `;

        var spacer = `
            <tr>
                <td colspan="${ dividerSpan + 1 + (this.settings.globals.indexed ? 1 : 0) }"></td>
            </tr>
        `;

        var details = '';
        if (this.settings.extras.length) {
            var widskip = 1;
            for (var i = 0, wid = 100; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            for (var extra of this.settings.extras) {
                var lw = widskip;
                if (extra.width) {
                    var lw = 1;
                    for (var i = 0, wid = (extra.width == -1 ? sizeDynamic : extra.width); wid > 0 && i < this.flat.length; i++) {
                        wid -= this.flat[i].width;
                        if (wid > 0) {
                            lw += this.flat[i].span;
                        } else {
                            break;
                        }
                    }
                }

                var value = extra.eval.value;
                var reference = extra.difference && !isNaN(extra.eval.compare) ? extra.eval.compare : '';

                if (reference && !isNaN(reference)) {
                    reference = extra.flip ? (reference - value) : (value - reference);
                    reference = CellGenerator.Difference(reference, extra.brackets, extra.format_diff ? extra.format(null, undefined, this.settings, reference) : (Number.isInteger(reference) ? reference : reference.toFixed(2)));
                } else {
                    reference = '';
                }

                var color = CompareEval.evaluate(value, extra.color);
                color = (color != undefined ? color : (extra.expc ? extra.expc(undefined, null, this.settings, value) : '')) || '';

                var displayValue = CompareEval.evaluate(value, extra.value);
                if (displayValue == undefined && extra.format) {
                    value = extra.format(undefined, undefined, this.settings, value);
                } else if (displayValue != undefined) {
                    value = displayValue;
                }

                if (value != undefined && extra.extra) {
                    value = `${ value }${ extra.extra(undefined) }`;
                }

                var cell = CellGenerator.WideCell(value + reference, color, lw, extra.align, extra.padding, extra.style ? extra.style.cssText : undefined);
                details += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>${ extra.name }</td>
                        ${ cell }
                    </tr>
                `;
            }
        }

        // Members block
        var members = '';
        if (showMembers) {
            var classes = this.array.reduce((c, p) => {
                c[p.player.Class - 1]++;
                return c;
            }, [0, 0, 0, 0, 0, 0, 0, 0]);

            var widskip = 1;
            for (var i = 0, wid = 60; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            var colcount = this.flat.reduce((c, x) => c + x.span, 0);

            members += `
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Warrior</td>
                    <td colspan="${ widskip }">${ classes[0] }</td>
                    ${ this.array.joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="4" colspan="1">Joined</td>
                        <td colspan="${ Math.max(1, colcount - 1 - widskip) }" rowspan="3">${ this.array.joined.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Mage</td>
                    <td colspan="${ widskip }">${ classes[1] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Scout</td>
                    <td colspan="${ widskip }">${ classes[2] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Assassin</td>
                    <td colspan="${ widskip }">${ classes[3] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Battle Mage</td>
                    <td colspan="${ widskip }">${ classes[4] }</td>
                    ${ this.array.kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="4" colspan="1">Left</td>
                        <td colspan="${ Math.max(1, colcount - 1 - widskip) }" rowspan="4">${ this.array.kicked.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Berserker</td>
                    <td colspan="${ widskip }">${ classes[5] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Demon Hunter</td>
                    <td colspan="${ widskip }">${ classes[6] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Druid</td>
                    <td colspan="${ widskip }">${ classes[7] }</td>
                </tr>
            `;
        }

        var layout = this.settings.globals.layout.filter(block => {
            if (block == 1) {
                return true;
            } else if (block == 2) {
                return showSummary;
            } else if (block == 3) {
                return this.settings.extras.length;
            } else if (block == 4) {
                return showMembers;
            }
        });

        var content = '';
        for (var i = 0; i < layout.length; i++) {
            var block = layout[i];
            var prev = i == 0 ? 0 : layout[i - 1];

            if (i == 1 && block == 1 && prev >= 3) {
                content += linedSpacer + spacer;
            } else if (i > 0 && block != 1 && prev >= 2) {
                content += linedSpacer;
            } else if (prev == 1 && i == layout.length - 1 && block != 2) {
                content += spacer + linedSpacerTop;
            } else if (i != 0 && block != 1) {
                content += spacer;
            }

            if (block == 1) {
                content += table;
            } else if (block == 2) {
                content += statistics;
            } else if (block == 3) {
                content += details;
            } else if (block == 4) {
                content += members;
            }
        }

        return [
            `
                <thead>

                </thead>
                <tbody style="${ this.settings.globals.font ? `font: ${ this.settings.globals.font };` : '' }" class="${ this.settings.globals.lined ? (this.settings.globals.lined == 1 ? 'css-entry-lined' : 'css-entry-thicklined') : '' } ${ this.settings.globals.opaque ? 'css-entry-opaque' : '' } ${ this.settings.globals['large rows'] ? 'css-maxi-row' : '' }">
                    ${ content }
                </tbody>
            `,
            size
        ];
    }
}

// Cell generators
const CellGenerator = {
    // Simple cell
    Cell: function (c, b, f, bo, al, pad, style) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="color: ${ getCSSColorFromBackground(f) }; background: ${ b }; ${ al ? `text-align: ${ al };` : '' } ${ pad ? `padding-left: ${ pad } !important;` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Wide cell
    WideCell: function (c, b, w, al, pad, style) {
        return `<td colspan="${ w }" style="background: ${ b }; ${ al ? `text-align: ${ al };` : '' } ${ pad ? `padding-left: ${ pad } !important;` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    Plain: function (c, bo, al, bg, style) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="${ al ? `text-align: ${ al };` : '' } ${ bg ? `background: ${ bg };` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    PlainSpan: function (s, c, bo, al, bg, style) {
        return `<td colspan="${ s }" class="${ bo ? 'border-right-thin' : '' }" style="${ al ? `text-align: ${ al };` : '' } ${ bg ? `background: ${ bg };` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Difference
    Difference: function (d, b, c) {
        return d != 0 ? ` <span>${ b ? '(' : '' }${ d > 0 ? '+' : '' }${ c == null ? d : c }${ b ? ')' : '' }</span>` : '';
    },
    // Empty cell
    Empty: function (b) {
        return `<td ${ b ? 'class="border-right-thin"' : '' }></td>`;
    },
    // Small text,
    Small: function (c) {
        return `<span>${ c }</span>`;
    }
}

const CompareEval = {
    // Available rules
    e: (val, ref) => val == ref,
    a: (val, ref) => val > ref,
    b: (val, ref) => val < ref,
    ae: (val, ref) => val >= ref,
    be: (val, ref) => val <= ref,

    // Evaluation
    evaluate (val, rules, ibg = false) {
        var def = undefined;
        for (var [ eq, ref, out ] of rules || []) {
            if (eq == 'db') {
                if (ibg) {
                    continue;
                } else {
                    return out;
                }
            } else if (eq == 'd') {
                return out;
            } else if (CompareEval[eq](val, ref)) {
                return out;
            }
        }
        return def;
    }
};

class SettingsCommand {
    constructor (regexp, parse, format, parseAlways = false) {
        this.regexp = regexp;
        this.match = string => string.match(this.regexp);
        this.parse = parse;
        this.format = format;
        this.parseAlways = parseAlways;
    }

    isValid (string) {
        return this.regexp.test(string);
    }
};

const ARG_MAP = {
    'off': 0,
    'on': 1,
    'thick': 2,
    'thin': 1,
    'static': 2,
    'above or equal': 'ae',
    'below or equal': 'be',
    'equal or above': 'ae',
    'equal or below': 'be',
    'above': 'a',
    'below': 'b',
    'equal': 'e',
    'default': 'd',
    'left': 1,
    'right': 2,
    'both': 3,
    'none': 0
};

const ARG_LAYOUT = {
    'table': 1,
    'statistics': 2,
    'details': 3,
    'members': 4
}

const ARG_MAP_SERVER = {
    'off': 0,
    'on': 100
}

const ARG_FORMATTERS = {
    'number': (p, c, e, x) => isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)),
    'fnumber': (p, c, e, x) => isNaN(x) ? undefined : formatAsSpacedNumber(x),
    'nnumber': (p, c, e, x) => isNaN(x) ? undefined : formatAsNamedNumber(x),
    'date': (p, c, e, x) => isNaN(x) ? undefined : formatDateOnly(x),
    'bool': (p, c, e, x) => x ? 'Yes' : 'No',
    'datetime': (p, c, e, x) => isNaN(x) ? undefined : formatDate(x),
    'duration': (p, c, e, x) => isNaN(x) ? undefined : formatDuration(x),
    'default': (p, c, e, x) => typeof(x) == 'string' ? x : (isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)))
}

function escapeHTML(string) {
    return String(string).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/ /g, "&nbsp;");
}

const SFormat = {
    Normal: string => escapeHTML(string),
    Keyword: string => `<span class="ta-keyword">${ escapeHTML(string) }</span>`,
    Color: (string, color = string) => `<span class="ta-color" style="color: ${ color };">${ escapeHTML(string) }</span>`,
    Comment: string => `<span class="ta-comment">${ escapeHTML(string) }</span>`,
    Extras: string => `<span class="ta-extras"><span>${ escapeHTML(string) }</span></span>`,
    Macro: string => `<span class="ta-macro">${ escapeHTML(string) }</span>`,
    Lambda: string => `<span class="ta-lambda">${ string }</span>`,
    Constant: string => `<span class="ta-constant">${ escapeHTML(string) }</span>`,
    Function: string => `<span class="ta-function">${ escapeHTML(string) }</span>`,
    Enum: string => `<span class="ta-enum">${ escapeHTML(string) }</span>`,
    Reserved: string => `<span class="ta-reserved">${ escapeHTML(string) }</span>`,
    ReservedProtected: string => `<span class="ta-reserved-protected">${ escapeHTML(string) }</span>`,
    ReservedPrivate: string => `<span class="ta-reserved-private">${ escapeHTML(string) }</span>`,
    ReservedSpecial: string => `<span class="ta-reserved-special">${ escapeHTML(string) }</span>`,
    ReservedItemized: string => `<span class="ta-reserved-itemized">${ escapeHTML(string) }</span>`,
    ReservedItemizable: string => `<span class="ta-reserved-itemizable">${ escapeHTML(string) }</span>`,
    Error: string => `<span class="ta-error">${ escapeHTML(string) }</span>`,
    Bool: (string, bool = string) => `<span class="ta-boolean-${ bool }">${ escapeHTML(string) }</span>`
};

const MacroArgToTableType = {
    'Group': TableType.Group,
    'Player': TableType.History,
    'Players': TableType.Players
}

const SettingsCommands = [
    // if / endif
    new SettingsCommand(/^(?:(if|if not) (Group|Player|Players)|(endif|else))$/, function (root, string) {
        var [ , key1, arg, key2 ] = this.match(string);
        if (key2) {
            if (key2 == 'endif') {
                root.setFilter(null);
            } else {
                root.flipFilter();
            }
        } else {
            root.setFilter(MacroArgToTableType[arg], key1 != 'if');
        }
    }, function (root, string) {
        var [ , key1, arg, key2 ] = this.match(string);
        if (key2) {
            return SFormat.Macro(key2);
        } else {
            return SFormat.Macro(`${ key1 } ${ arg }`);
        }
    }),
    // Include another template
    new SettingsCommand(/^import (.+)$/, function (root, string) {
        var [ , arg ] = this.match(string);
        /*
            Do nothing since this keyword is handled before the actual parsing process
        */
    }, function (root, string) {
        var [ , arg ] = this.match(string);
        if (Templates.exists(arg)) {
            return `${ SFormat.Keyword('import') } ${ SFormat.Enum(arg) } ${ SFormat.Extras(`(${ Templates.get()[arg].content.length }c)`) }`;
        } else {
            return `${ SFormat.Keyword('import') } ${ SFormat.Error(arg) }`;
        }
    }),
    // Global
    // set static
    new SettingsCommand(/^(layout) ((table|statistics|members|details)\s*(\,\s*(table|statistics|members|details))*)$/, function (root, string) {
        var [ , key, order ] = this.match(string);
        root.setGlobalVariable(key, order.split(',').map(o => ARG_LAYOUT[o.trim()]));
    }, function (root, string) {
        var [ , key, order ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ order.split(',').map(o => SFormat.Constant(o)).join(',') }`;
    }),
    // Global
    // set static
    new SettingsCommand(/^(set) (\w+[\w ]*) with all as (.+)$/, function (root, string) {
        var [ , key, name, asts ] = this.match(string);
        var ast = new Expression(asts);
        if (ast.isValid()) {
            root.setVariable(name, true, ast);
        }
    }, function (root, string) {
        var [ , key, name, asts ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('with all as') } ${ Expression.format(asts, root) }`;
    }, true),
    // Global
    // set with - Create a function
    new SettingsCommand(/^(set) (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        var ast = new Expression(a);
        if (ast.isValid()) {
            root.setFunction(name, args.split(',').map(arg => arg.trim()), ast);
        }
    }, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Function(name) } ${ SFormat.Keyword('with') } ${ args.split(',').map(arg => SFormat.Constant(arg)).join(',') } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }, true),
    // Global
    // set - Create a variable
    new SettingsCommand(/^(set) (\w+[\w ]*) as (.+)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new Expression(a);
        if (ast.isValid()) {
            root.setVariable(name, false, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }, true),
    // Global
    // server - show, hide or set width
    new SettingsCommand(/^(server) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);
        if (val != undefined) {
            if (isNaN(val)) {
                val = ARG_MAP_SERVER[value];
            }
            if (!isNaN(val)) {
                root.setGlobalVariable(key, Number(val));
            }
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);
        if (val != undefined && !isNaN(value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        } else if (ARG_MAP_SERVER[val] != undefined) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
        } else if (!isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        }
    }),
    // Global
    // name - set width of the name column
    new SettingsCommand(/^(name) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined && !isNaN(val)) {
            root.setGlobalVariable(key, Number(val));
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (root.constants.isValid(prefix, value) && !isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Create new category
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(category)(?: (.+))?$/, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        root.createCategory(a || '', a == undefined);
        if (extend) {
            root.setLocalSharedVariable('extend', extend.slice(0, -1).split(','));
        }
    }, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        if (a != undefined) {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) }`;
        }
    }),
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(header)(?: (.+))? (as group of) (\d+)$/, function (root, string) {
        var [ , extend, key, a, gr, w ] = this.match(string);

        if (!isNaN(w) && Number(w) > 0) {
            root.createHeader(a || '');
            root.setGrouped(Number(w));
            if (extend) {
                root.setLocalSharedVariable('extend', extend.slice(0, -1).split(','));
            }
        }
    }, function (root, string) {
        var [ , extend, key, a, gr, w ] = this.match(string);
        if (a != undefined) {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Normal(a) } ${ SFormat.Keyword(gr) } ${ SFormat.Constant(w) }`;
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Keyword(gr) } ${ SFormat.Constant(w) }`;
        }
    }),
    // Create new header
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(header)(?: (.+))?$/, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        root.createHeader(a || '');
        if (extend) {
            root.setLocalSharedVariable('extend', extend.slice(0, -1).split(','));
        }
    }, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        if (a != undefined) {
            if (SP_KEYWORD_MAPPING_0.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Reserved(a) }`;
            } else if (SP_KEYWORD_MAPPING_1.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedProtected(a) }`;
            } else if (SP_KEYWORD_MAPPING_2.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedPrivate(a) }`;
            } else if (SP_KEYWORD_MAPPING_3.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedSpecial(a) }`;
            } else if (SP_KEYWORD_MAPPING_5_HO.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedItemizable(a) }`;
            } else {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
            }
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) }`;
        }
    }),
    // Create new statistics row
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(show) (\S+[\S ]*) as (\S+[\S ]*)$/, function (root, string) {
        var [ , extend, key, name, a ] = this.match(string);
        var ast = new Expression(a);
        if (ast.isValid()) {
            root.addExtraRow(name, ast);
            if (extend) {
                root.setLocalSharedVariable('extend', extend.slice(0, -1).split(','));
            }
        }
    }, function (root, string) {
        var [ , extend, key, name, a ] = this.match(string);
        return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }),
    // Create new itemized header
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(itemized) (\S+[\S ]*) by (\S+[\S ]*)$/, function (root, string) {
        var [ , extend, key, a, s ] = this.match(string);
        if (SP_KEYWORD_MAPPING_5.hasOwnProperty(a)) {
            root.createItemizedHeader(SP_KEYWORD_MAPPING_5[a], s);
            if (extend) {
                root.setLocalSharedVariable('extend', extend.slice(0, -1).split(','));
            }
        }
    }, function (root, string) {
        var [ , extend, key, a, s ] = this.match(string);
        if (SP_KEYWORD_MAPPING_5.hasOwnProperty(a)) {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedItemizable(a) } ${ SFormat.Keyword('by') } ${ SP_KEYWORD_MAPPING_4[s] ? SFormat.ReservedItemized(s) : SFormat.Normal(s) }`;
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Error(a) } ${ SFormat.Keyword('by') } ${ SP_KEYWORD_MAPPING_4[s] ? SFormat.ReservedItemized(s) : SFormat.Normal(s) }`;
        }
    }),
    // Global
    // indexed - Show indexes in first column of the table
    new SettingsCommand(/^(indexed) (on|off|static)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a, a == 'static' ? 'on' : a) }`;
    }),
    // Global
    // lined - Show lines between players
    new SettingsCommand(/^(lined) (on|off|thin|thick)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a, a == 'thick' || a == 'thin' ? 'on' : a) }`;
    }),
    // Global
    // performance - Set the amount of entries displayed
    new SettingsCommand(/^(performance) (\d+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, Number(a));
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Global
    // scale - Set font scale value
    new SettingsCommand(/^(scale) (\d+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        if (!isNaN(a) && Number(a) > 0) {
            root.setGlobalVariable(key, Number(a));
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ !isNaN(a) && Number(a) > 0 ? SFormat.Normal(a) : SFormat.Error(a) }`;
    }),
    // Global
    // font - Set font size
    new SettingsCommand(/^(font) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var f = getCSSFont(a);
        if (f) {
            root.setGlobalVariable(key, f);
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ getCSSFont(a) ? SFormat.Normal(a) : SFormat.Error(a) }`;
    }),
    // Global
    // members - Show member classes and changes
    // outdated - Mark outdated entries with red text
    new SettingsCommand(/^(members|outdated|opaque|large rows) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    // Local Shared
    // difference - Show difference between two points in time
    // hydra - Show hydra achievement
    // flip - Treat lower value as better
    // brackets - Show difference within brackets
    // statistics - Show statistics of a column
    // maximum - Show maximum knights based on fortress level
    // grail - Show grail achievement
    new SettingsCommand(/^(difference|hydra|flip|brackets|statistics|maximum|grail|decimal) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    new SettingsCommand(/^(clean)$/, function (root, string) {
        var [ , key ] = this.match(string);
        root.setLocalVariable(key, true);
    }, function (root, string) {
        var [ , key ] = this.match(string);
        return `${ SFormat.Keyword(key) }`;
    }),
    new SettingsCommand(/^(clean) (hard)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalVariable(key, 2);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Create new statistics row
    new SettingsCommand(/^(statistics) (\S+[\S ]*) as (\S+[\S ]*)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new Expression(a);
        if (ast.isValid()) {
            root.addExtraStatistics(name, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }),
    // Local Shared
    // width - Width of a column
    new SettingsCommand(/^(width) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined && !isNaN(val)) {
            root.setLocalSharedVariable('width', Number(val));
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (root.constants.isValid(prefix, value) && !isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Global
    // simulator - Amount of simulator fights per duo
    new SettingsCommand(/^(simulator target|simulator source) (\S+)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);

        root.setGlobalVariable('simulator_target', arg);
        if (key == 'simulator source') {
            root.setGlobalVariable('simulator_target_source', true);
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);

        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
    }),
    // Global
    // simulator - Amount of simulator fights per duo
    new SettingsCommand(/^(simulator) (\d+)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);

        if (!isNaN(arg) && arg > 0) {
            root.setGlobalVariable(key, Number(arg));
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);

        if (!isNaN(arg) && arg > 0) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        }
    }),
    // Local
    // extra - Ending characters for each cell (example %)
    new SettingsCommand(/^(extra) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalVariable(key, p => a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    new SettingsCommand(/^(const) (\w+) (.+)$/, function (root, string) {
        var [ , key, name, value ] = this.match(string);
        root.setConstant(name, value);
    }, function (root, string) {
        var [ , key, name, value ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Normal(value) }`;
    }, true),
    // Local
    // visible - Show text on the background
    new SettingsCommand(/^(visible) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    new SettingsCommand(/^(style) ([a-zA-Z\-]+) (.*)$/, function (root, string) {
        var [ , key, a, b ] = this.match(string);
        root.setStyle(a, b);
    }, function (root, string) {
        var [ , key, a, b ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) } ${ SFormat.Normal(b) }`;
    }),
    new SettingsCommand(/^(not defined value) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.setLocalSharedVariable('ndef', val);
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    new SettingsCommand(/^(not defined color) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (val != undefined && val) {
            root.setLocalSharedVariable('ndefc', getCSSBackground(val));
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    // Local Shared
    // border - Show border around columns
    new SettingsCommand(/^(border) (none|left|right|both)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Local Shared
    // align - Align column content
    new SettingsCommand(/^(align) (left|right|center)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Local
    // format - Specifies formatter for the field
    new SettingsCommand(/^(format difference|fd) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on') {
            root.setLocalVariable('format_diff', true);
        } else if (arg == 'off') {
            root.setLocalVariable('format_diff', false);
        } else {
            var ast = new Expression(arg);
            if (ast.isValid()) {
                root.setLocalVariable('format_diff', (env, val) => {
                    return ast.eval(undefined, undefined, env, val);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on' || arg == 'off') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
        }
    }),
    new SettingsCommand(/^(format statistics|fs) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on') {
            root.setLocalVariable('format_stat', true);
        } else if (arg == 'off') {
            root.setLocalVariable('format_stat', false);
        } else {
            var ast = new Expression(arg);
            if (ast.isValid()) {
                root.setLocalVariable('format_stat', (env, val) => {
                    return ast.eval(undefined, undefined, env, val);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on' || arg == 'off') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
        }
    }),
    new SettingsCommand(/^(statistics color) (on|off)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        root.setLocalSharedVariable('statistics_color', ARG_MAP[arg]);
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
    }),
    // Local
    // format - Specifies formatter for the field
    new SettingsCommand(/^(format|f) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            root.setLocalVariable('format', ARG_FORMATTERS[arg]);
        } else {
            var ast = new Expression(arg);
            if (ast.isValid()) {
                root.setLocalVariable('format', (player, reference, env, val, extra) => {
                    return ast.eval(player, reference, env, val, extra);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
        }
    }),
    // Local
    // order by
    new SettingsCommand(/^(order by) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        var ast = new Expression(arg);
        if (ast.isValid()) {
            root.setLocalVariable('order', (player, reference, env, val, extra) => {
                return ast.eval(player, reference, env, val, extra);
            });
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
    }),
    // Local
    // alias - Override name of the column
    new SettingsCommand(/^(alias) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.setAlias(val);
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // expr - Set expression to the column
    new SettingsCommand(/^(expr|e) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new Expression(a);
        if (ast.isValid()) {
            root.setLocalVariable('expr', (player, reference, env, scope, extra) => {
                return ast.eval(player, reference, env, scope, extra);
            });
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ Expression.format(a, root) }`;
    }),
    // Local
    // expc - Set color expression to the column
    new SettingsCommand(/^(expc|c) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new Expression(a);
        if (ast.isValid()) {
            root.setLocalVariable('expc', (player, reference, env, val, extra) => {
                return getCSSBackground(ast.eval(player, reference, env, val, extra));
            });
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ Expression.format(a, root) }`;
    }),
    // Local
    // value - Add default value
    new SettingsCommand(/^(value) (default) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], 0, val);
        }
    }, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // color - Add default color
    new SettingsCommand(/^(color) (default) ((@?)(\w+))$/, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (val != undefined && val) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], 0, val);
        }
    }, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    new SettingsCommand(/^(background) ((@?)(\w+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (val != undefined && val) {
            root.setLocalSharedVariable(key, val);
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    // Local
    // value - Add value based on condition
    new SettingsCommand(/^(value) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(.+)) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = root.constants.getValue(rprefix, rvalue);
        var val = root.constants.getValue(prefix, value);

        if (reference != undefined && val != undefined) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], reference, val);
        }
    }, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (root.constants.isValid(prefix, value)) {
            arg = SFormat.Constant(arg);
        } else if (prefix == '@') {
            arg = SFormat.Error(arg);
        } else {
            arg = SFormat.Normal(arg);
        }

        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ rarg } ${ arg }`;
    }),
    // local
    // color - Add color based on condition
    new SettingsCommand(/^(color) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(.+)) ((@?)(\w+))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = root.constants.getValue(rprefix, rvalue);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (reference != undefined && val != undefined) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], reference, val);
        }
    }, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (root.constants.isValid(prefix, value) && val) {
            arg = SFormat.Constant(arg);
        } else if (prefix == '@' || !val) {
            arg = SFormat.Error(arg);
        } else {
            arg = SFormat.Color(arg, val);
        }

        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ rarg } ${ arg }`;
    }),
    // padding
    new SettingsCommand(/^(padding) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalVariable(key, a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Create new type
    new SettingsCommand(/^(define) (\w+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createDummy(a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Extend
    new SettingsCommand(/^(extend) (\w+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setExtend(a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    })
];

const SP_ENUMS = {
    'GoldCurve': GOLD_CURVE,
    'MountSizes': PLAYER_MOUNT,
    'AchievementNames': ACHIEVEMENTS,
    'ItemTypes': ITEM_TYPES,
    'GroupRoles': GROUP_ROLES,
    'Classes': PLAYER_CLASS,
    'FortressBuildings': FORTRESS_BUILDINGS,
    'PlayerActions': PLAYER_ACTIONS,
    'PotionTypes': POTIONS,
    'GemTypes': GEMTYPES,
    'AttributeTypes': GEMATTRIBUTES,
    'RuneTypes': RUNETYPES,
    'UnderworldBuildings': UNDERWORLD_BUILDINGS,
    'ExperienceCurve': ExperienceRequired,
    'ExperienceTotal': ExperienceTotal
};

class Constants {
    constructor () {
        this.Values = {
            'green': '#00c851',
            'orange': '#ffbb33',
            'red': '#ff3547',
            'blue': '#0064b4',
            '15min': '900000',
            '1hour': '3600000',
            '12hours': '43200000',
            '1day': '86400000',
            '3days': '259200000',
            '7days': '604800000',
            '21days': '1814400000',
            'mount10': '1',
            'mount20': '2',
            'mount30': '3',
            'mount50': '4',
            'none': '0',
            'warrior': '1',
            'mage': '2',
            'scout': '3',
            'assassin': '4',
            'battlemage': '5',
            'berserker': '6',
            'demonhunter': '7',
            'druid': '8',
            'empty': '',
            'tiny': '15',
            'small': '60',
            'normal': '100',
            'large': '160',
            'huge': '200',
            'scrapbook': '2180',
            'max': '-1'
        }
    }

    getValue (tag, key) {
        return tag == '@' ? this.Values[key] : key;
    }

    isValid (tag, key) {
        return tag == '@' && this.Values.hasOwnProperty(key);
    }

    addConstant (key, value) {
        this.Values[key] = value;
    }

    hasConstant (key) {
        return this.Values.hasOwnProperty(key);
    }
}

class Settings {
    // Save
    static save (settings, identifier) {
        Preferences.set(identifier ? `settings/${ identifier }` : 'settings', settings);
    }

    // Remove
    static remove (identifier) {
        Preferences.remove(identifier ? `settings/${ identifier }` : 'settings');
    }

    // Exists
    static exists (identifier) {
        return Preferences.exists(identifier ? `settings/${ identifier }` : 'settings');
    }

    // Keys
    static get () {
        return Preferences.keys().filter(key => key.includes('settings/')).map(key => key.substring(key.indexOf('/') + 1));
    }

    static getHistory () {
        return Preferences.get('settings_history', []);
    }

    static addHistory (settings, identifier = 'settings') {
        var history = Preferences.get('settings_history', []);
        history.unshift({
            name: identifier,
            content: settings
        });

        if (history.length > 10) {
            history.pop();
        }

        Preferences.set('settings_history', history);
    }

    // Create empty settings
    static empty () {
        return new Settings('');
    }

    // Load settings
    static load (identifier, def, template = '', type = undefined) {
        return new Settings(Preferences.get(`settings/${ identifier }`, Preferences.get(`settings/${ def }`, template)), type);
    }

    // Get code
    getCode () {
        return this.code;
    }

    static parseConstants(string) {
        var settings = new Settings('');

        for (var line of Settings.handleImports(string)) {
            var commentIndex = line.indexOf('#');
            if (commentIndex != -1) {
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();

            for (var command of SettingsCommands) {
                if (command.parseAlways && command.isValid(trimmed)) {
                    command.parse(settings, trimmed);
                    break;
                }
            }
        }

        return settings;
    }

    // Format code
    static format (string) {
        var settings = Settings.parseConstants(string);
        var content = '';

        for (var line of string.split('\n')) {
            var comment;
            var commentIndex = -1;
            var ignored = false;

            for (var i = 0; i < line.length; i++) {
                if (line[i] == '\'' || line[i] == '\"') {
                    if (line[i - 1] == '\\' || (ignored && line[i] != ignored)) continue;
                    else {
                        ignored = ignored ? false : line[i];
                    }
                } else if (line[i] == '#' && !ignored) {
                    commentIndex = i;
                    break;
                }
            }

            if (commentIndex != -1) {
                comment = line.slice(commentIndex);
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();
            var spacing = line.match(/\s+$/);
            var prespace = line.match(/^\s+/);

            if (prespace) {
                content += prespace[0].replace(/ /g, '&nbsp;');
            }

            var command = SettingsCommands.find(command => command.isValid(trimmed));
            content += command ? command.format(settings, trimmed) : SFormat.Error(trimmed);

            if (spacing) {
                content += spacing[0].replace(/ /g, '&nbsp;');
            }

            if (commentIndex != -1) {
                content += SFormat.Comment(comment);
            }

            content += '</br>';
        }

        return content;
    }

    getEnvironment () {
        return this;
    }

    getCompareEnvironment () {
        return {
            func: this.func,
            vars: this.cvars,
            lists: {},
            // Constants have to be propagated through the environment
            constants: this.constants
        }
    }

    static handleImports (originalString) {
        let processedLines = [];
        for (let line of originalString.split('\n')) {
            if (/^import (.+)$/.test(line)) {
                let [, key ] = line.match(/^import (.+)$/);
                if (Templates.exists(key)) {
                    processedLines.push(... Templates.get()[key].content.split('\n'));
                }
            } else {
                processedLines.push(line);
            }
        }

        return processedLines;
    }

    constructor (string, type) {
        this.code = string;

        // Root variables
        this.c = [];
        this.vars = {};
        this.cvars = {};
        this.lists = {};
        this.dummies = {};
        this.func = {};
        this.extras = [];
        this.stats = [];

        this.constants = new Constants();

        this.globals = {
            outdated: true,
            layout: [ 1, 2, 3, 4 ]
        };

        // Temporary
        this.currentCategory = null;
        this.currentHeader = null;
        this.dummy = null;
        this.currentExtra = null;

        this.shared = {
            statistics_color: true
        };

        this.categoryShared = {
            visible: true,
            statistics_color: true
        };

        this.setFilter(null);

        // Parsing
        var ignore = false;

        for (var line of Settings.handleImports(string)) {
            var commentIndex = -1;
            var ignored = false;

            for (var i = 0; i < line.length; i++) {
                if (line[i] == '\'' || line[i] == '\"') {
                    if (line[i - 1] == '\\' || (ignored && line[i] != ignored)) continue;
                    else {
                        ignored = ignored ? false : line[i];
                    }
                } else if (line[i] == '#' && !ignored) {
                    commentIndex = i;
                    break;
                }
            }

            if (commentIndex != -1) {
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();
            var command = SettingsCommands.find(command => command.isValid(trimmed));

            if (command) {
                if (command == SettingsCommands[0]) {
                    command.parse(this, trimmed);

                    if (this.filter.type != null) {
                        ignore = this.filter.invert ? (this.filter.type == type) : (this.filter.type != type);
                    } else {
                        ignore = false;
                    }
                } else if (!ignore) {
                    command.parse(this, trimmed);
                }
            }
        }

        this.pushCategory();
    }

    setFilter (type, invert = false) {
        this.filter = {
            type: type,
            invert: invert
        }
    }

    flipFilter () {
        this.filter.invert = !this.filter.invert;
    }

    // Evaluate constants
    evaluateConstants (players, sim, perf, tabletype) {
        if (tabletype == TableType.Group) {
            if (SiteOptions.obfuscated) {
                this.lists.joined = players.joined.map((player, i) => `joined_${ i + 1 }`);
                this.lists.kicked = players.kicked.map((player, i) => `kicked_${ i + 1 }`);
            } else {
                this.lists.joined = players.joined;
                this.lists.kicked = players.kicked;
            }
        }

        // Add simulator output
        if (sim) {
            var array = players.slice(0, perf);
            var array1 = [];
            var array2 = [];

            var updated = false;
            for (var entry of array) {
                updated |= Database.preload(entry.player.Identifier, entry.player.Timestamp);
                updated |= Database.preload(entry.compare.Identifier, entry.compare.Timestamp);
            }

            if (updated) {
                Database.update();
            }

            if (players.reference != players.timestamp) {
                for (var player of array) {
                    array1.push({
                        player: Database.Players[player.player.Identifier][player.player.Timestamp].toSimulatorModel()
                    });

                    array2.push({
                        player: Database.Players[player.compare.Identifier][player.compare.Timestamp].toSimulatorModel()
                    });
                }

                var target1 = this.globals.simulator_target ? array1.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                var target2 = this.globals.simulator_target ? array2.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                if (target1 == null || target2 == null) {
                    target1 = target2 = null;
                } else {
                    target1 = target1.player;
                    target2 = target2.player;
                }

                new FightSimulator().simulate(array1, sim, target1, this.globals.simulator_target_source);
                new FightSimulator().simulate(array2, sim, target2, this.globals.simulator_target_source);
            } else {
                for (var player of array) {
                    array1.push({
                        player: Database.Players[player.player.Identifier][player.player.Timestamp].toSimulatorModel()
                    });
                }

                var target1 = this.globals.simulator_target ? array1.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                if (target1) {
                    target1 = target1.player;
                } else {
                    target1 = null;
                }

                new FightSimulator().simulate(array1, sim, target1, this.globals.simulator_target_source);
            }

            var results = {};
            for (var result of array1) {
                results[result.player.Identifier] = result.score;
            }

            this.vars['Simulator'] = {
                value: results
            }

            if (players.reference != players.timestamp) {
                var cresults = { };

                for (var result of array2) {
                    cresults[result.player.Identifier] = result.score;
                }

                this.cvars['Simulator'] = {
                    value: cresults
                }
            } else {
                this.cvars['Simulator'] = {
                    value: results
                }
            }
        } else {
            delete this.vars['Simulator'];
            delete this.cvars['Simulator'];
        }

        var segmentedPlayers = players.map(p => {
            var ar = [ p.player, p.compare ];
            ar.segmented = true;

            return ar;
        });

        segmentedPlayers.segmented = true;

        var segmentedCompare = players.map(p => {
            var ar = [ p.compare, p.compare ];
            ar.segmented = true;

            return ar;
        });

        segmentedCompare.segmented = true;

        // Evaluate constants
        for (var [name, data] of Object.entries(this.vars)) {
            if (data.ast) {
                var scope = {};
                var scope2 = {};

                if (data.arg) {
                    scope = segmentedPlayers;
                    scope2 = segmentedCompare;
                }

                if (!data.arg) {
                    this.cvars[name] = {
                        ast: data.ast,
                        arg: false
                    };
                } else if (tabletype == TableType.Group) {
                    data.value = data.ast.eval(players[0].player, undefined, this, scope);
                    if (isNaN(data.value) && typeof(data.value) != 'object') {
                        data.value = undefined;
                    }

                    var val = data.ast.eval(players[0].compare, undefined, this, scope2);
                    if (isNaN(val) && typeof(val) != 'object') {
                        val = undefined;
                    }

                    this.cvars[name] = {
                        value: val,
                        ast: data.ast,
                        arg: data.arg
                    };
                } else {
                    data.value = data.ast.eval(undefined, undefined, this, scope);
                    if (isNaN(data.value) && typeof(data.value) != 'object') {
                        data.value = undefined;
                    }

                    var val = data.ast.eval(undefined, undefined, this, scope2);
                    if (isNaN(val) && typeof(val) != 'object') {
                        val = undefined;
                    }

                    this.cvars[name] = {
                        value: val,
                        ast: data.ast,
                        arg: data.arg
                    };
                }
            }
        }

        // Extra statistics rows
        if (tabletype == TableType.Group) {
            var param = players.find(p => p.player.Own) || players[0];
            for (var data of this.extras) {
                if (data.ast) {
                    data.eval = {
                        value: data.ast.eval(param.player, undefined, this, segmentedPlayers),
                        compare: data.ast.eval(param.compare, undefined, this.getCompareEnvironment(), segmentedCompare)
                    };
                }
            }
        } else if (tabletype == TableType.Players) {
            for (var data of this.extras) {
                if (data.ast) {
                    data.eval = {
                        value: data.ast.eval(null, null, this, segmentedPlayers),
                        compare: data.ast.eval(null, null, this.getCompareEnvironment(), segmentedCompare)
                    }
                }
            }
        }

        // Push constants into color / value options
        for (var category of this.c) {
            this.evaluateArrayConstants(category.value);
            this.evaluateArrayConstants(category.color);

            for (var header of category.h) {
                this.evaluateArrayConstants(header.value);
                this.evaluateArrayConstants(header.color);
            }
        }
    }

    evaluateConstantsHistory (players) {
        // Evaluate constants
        for (var [name, data] of Object.entries(this.vars)) {
            if (data.ast && data.arg) {
                var scope = players.map((p, i) => {
                    var ar = [ p, players[i + 1] || p ];
                    ar.segmented = true;

                    return ar;
                });

                scope.segmented = true;

                data.value = data.ast.eval(undefined, undefined, this, scope);
                if (isNaN(data.value) && typeof(data.value) != 'object') {
                    data.value = undefined;
                }
            }
        }

        // Push constants into color / value options
        for (var category of this.c) {
            this.evaluateArrayConstants(category.value);
            this.evaluateArrayConstants(category.color);

            for (var header of category.h) {
                this.evaluateArrayConstants(header.value);
                this.evaluateArrayConstants(header.color);
            }
        }
    }

    setConstant (name, value) {
        this.constants.addConstant(name, value);
    }

    evaluateArrayConstants (array) {
        for (var i = 0; array && i < array.length; i++) {
            var key = array[i][3];
            if (isNaN(key) && this.vars[key]) {
                if (this.vars[key].value != undefined) {
                    array[i][1] = Number(this.vars[key].value);
                } else {
                    array.splice(i--, 1);
                }
            }
        }
    }

    addExtraRow (name, ast) {
        this.pushExtraRow();
        this.currentExtra = {
            name: name,
            ast: ast
        };
    }

    addExtraStatistics (name, ast) {
        this.stats.push({
            name: name,
            ast: ast
        });
    }

    pushExtraRow () {
        this.pushDummy();
        if (this.currentExtra) {
            for (var ex of this.currentExtra.extend || []) {
                if (this.dummies[ex]) {
                    mergeAll(this.currentExtra, this.dummies[ex].content);
                }
            }

            merge(this.currentExtra, this.shared);

            this.extras.push(this.currentExtra);
        }

        this.currentExtra = null;
    }

    // Option handlers
    setVariable (name, arg, ast) {
        this.vars[name] = {
            ast: ast,
            arg: arg
        }
    }

    setFunction (name, arg, ast) {
        this.func[name] = {
            ast: ast,
            arg: arg
        }
    }

    setGrouped (w) {
        this.currentHeader.grouped = w;
    }

    createHeader (name) {
        this.pushHeader();
        this.currentHeader = {
            name: name
        }
    }

    createItemizedHeader (src, name) {
        this.pushHeader();
        this.currentHeader = {
            name: name,
            itemized: src
        }
    }

    pushHeader () {
        this.pushExtraRow();
        if (this.currentCategory && this.currentHeader) {
            var mapping = SP_KEYWORD_MAPPING_0[this.currentHeader.name] || SP_KEYWORD_MAPPING_1[this.currentHeader.name] || SP_KEYWORD_MAPPING_2[this.currentHeader.name] || SP_KEYWORD_MAPPING_3[this.currentHeader.name] || SP_KEYWORD_MAPPING_4[this.currentHeader.name] || SP_KEYWORD_MAPPING_5_HO[this.currentHeader.name];

            for (var ex of this.currentHeader.extend || []) {
                if (this.dummies[ex]) {
                    mergeAll(this.currentHeader, this.dummies[ex].content);
                }
            }

            var custom = SP_SPECIAL_CONDITIONS[this.currentHeader.name];
            if (custom && this.currentHeader.clean != 2) {
                for (var entry of custom) {
                    if (entry.condition(this.currentHeader)) {
                        merge(this.currentHeader, entry.content);
                    }
                }
            }

            if (mapping && !this.currentHeader.expr) {
                if (this.currentHeader.clean == 2) {
                    this.currentHeader.expr = mapping.expr;
                } else {
                    merge(this.currentHeader, mapping);
                }
            }

            if (this.currentHeader.expr) {
                if (!this.currentHeader.clean) {
                    merge(this.currentHeader, this.categoryShared);
                    merge(this.currentHeader, this.shared);
                } else {
                    merge(this.currentHeader, {
                        visible: true,
                        statistics_color: true
                    });
                }

                if (this.currentHeader.background && this.currentHeader.expc == undefined) {
                    this.setLocalArrayVariable('color', 'db', 0, this.currentHeader.background);
                }

                this.currentCategory.h.push(this.currentHeader);
            }
        }

        this.currentHeader = null;
    }

    createCategory (name, empty) {
        this.pushCategory();

        this.categoryShared = {
            visible: true
        };

        this.currentCategory = {
            name: name,
            empty: empty,
            h: []
        };
    }

    createDummy (name) {
        this.pushHeader();
        this.dummy = {
            name: name,
            content: {

            }
        }
    }

    pushDummy () {
        if (this.dummy) {
            this.dummies[this.dummy.name] = this.dummy;
        }

        this.dummy = null;
    }

    pushCategory () {
        this.pushHeader();
        if (this.currentCategory) {
            this.c.push(this.currentCategory);
        }

        this.currentCategory = null;
    }

    setGlobalVariable (key, value) {
        this.globals[key] = value;
    }

    setLocalSharedVariable (key, value) {
        if (this.currentExtra) {
            this.currentExtra[key] = value
        } else if (this.dummy) {
            this.dummy.content[key] = value;
        } else if (this.currentHeader) {
            this.setLocalVariable(key, value);
        } else if (this.currentCategory) {
            this.categoryShared[key] = value;
        } else {
            this.shared[key] = value;
        }
    }

    setStyle (key, val) {
        var obj = this.currentExtra || (this.dummy ? this.dummy.content : undefined) || this.currentHeader || this.shared;
        if (!obj.style) {
            obj.style = new Option().style;
        }

        obj.style[key] = val;
    }

    setLocalVariable (key, value) {
        if (this.currentExtra) {
            this.currentExtra[key] = value;
        } else if (this.dummy) {
            this.dummy.content[key] = value;
        } else if (this.currentHeader) {
            this.currentHeader[key] = value;
        }
    }

    setAlias (value) {
        if (this.currentExtra) {
            this.currentExtra.alias = value;
        } else if (this.dummy) {
            this.dummy.content.alias = value;
        } else if (this.currentHeader) {
            this.currentHeader.alias = value;
        } else if (this.currentCategory) {
            this.currentCategory.alias = value;
        }
    }

    setExtend (value) {
        if (this.currentExtra) {
            if (!this.currentExtra.extend) {
                this.currentExtra.extend = [];
            }

            this.currentExtra.extend.push(value);
        } else if (this.dummy) {
            if (!this.dummy.content.extend) {
                this.dummy.content.extend = [];
            }

            this.dummy.content.extend.push(value);
        } else if (this.currentHeader) {
            if (!this.currentHeader.extend) {
                this.currentHeader.extend = [];
            }

            this.currentHeader.extend.push(value);
        } else if (this.currentCategory) {
            if (!this.categoryShared.extend) {
                this.categoryShared.extend = [];
            }

            this.categoryShared.extend.push(value);
        } else {
            if (!this.shared.extend) {
                this.shared.extend = [];
            }

            this.shared.extend.push(value);
        }
    }

    setLocalArrayVariable (key, condition, reference, value) {
        if (this.currentExtra) {
            if (!this.currentExtra[key]) {
                this.currentExtra[key] = [];
            }

            this.currentExtra[key].push([ condition, reference, value, reference ]);
        } else if (this.dummy) {
            if (!this.dummy.content[key]) {
                this.dummy.content[key] = [];
            }

            this.dummy.content[key].push([ condition, reference, value, reference ]);
        } else if (this.currentHeader) {
            if (!this.currentHeader[key]) {
                this.currentHeader[key] = [];
            }

            this.currentHeader[key].push([ condition, reference, value, reference ]);
        }
    }
};

// Templates
const Templates = new (class {
    constructor () {
        this.templates = SharedPreferences.get('templates', { });

        this.keys = Object.keys(this.templates);
        this.keys.sort((a, b) => a.localeCompare(b));

        /*
            Convert existing templates in old form into new style
        */
        let keys = SharedPreferences.keys().filter(key => key.includes('templates/')).map(key => key.substring(key.indexOf('/') + 1));
        let backup = {};

        if (keys.length) {
            for (let key of keys) {
                let content = SharedPreferences.get(`templates/${ key }`, '');
                backup[key] = content;

                // Convert existing template to text
                if (typeof(content) == 'string') {
                    // Do nothing
                } else if (typeof(content) == 'object') {
                    content = content.content;
                } else {
                    content = '';
                }

                // Save if valid
                if (content.length) {
                    this.saveInternal(key, content);
                }

                SharedPreferences.remove(`templates/${ key }`);
            }

            this.commit();
            SharedPreferences.set('templatesBackup', backup);
        }
    }

    commit () {
        SharedPreferences.set('templates', this.templates);

        this.keys = Object.keys(this.templates);
        this.keys.sort((a, b) => a.localeCompare(b));
    }

    saveInternal (name, content, compat = { cm: false, cg: false, cp: false }) {
        // Check if a template already exists
        let exists = name in this.templates;
        let template = exists ? this.templates[name] : null;

        if (exists) {
            // Overwrite needed parts
            template.content = content;
            template.compat = compat;
            template.version = MODULE_VERSION;
            template.timestamp = Date.now();
        } else {
            // Create new object
            template = {
                name: name,
                content: content,
                compat: compat,
                version: MODULE_VERSION,
                timestamp: Date.now(),
                online: false
            };
        }

        // Save template
        this.templates[name] = template;
    }

    markAsOnline (name, key, secret) {
        // Mark template as online if exists
        if (name in this.templates) {
            // Set timestamp & keys
            this.templates[name].online = {
                timestamp: this.templates[name].timestamp,
                key: key,
                secret: secret
            };

            this.commit();
        }
    }

    markAsOffline (name) {
        // Mark template as offline if exists
        if (name in this.templates) {
            // Set online to false
            this.templates[name].online = false;

            this.commit();
        }
    }

    save (name, content, compat) {
        this.saveInternal(name, content, compat);
        this.commit();
    }

    remove (name) {
        if (name in this.templates) {
            delete this.templates[name];
            this.commit();
        }
    }

    exists (name) {
        return name in this.templates;
    }

    get () {
        return this.templates;
    }

    getKeys () {
        return this.keys;
    }

    load (name) {
        return new Settings(name in this.templates ? this.templates[name].content : '');
    }
})();
