class HeaderGroup {
    constructor (name, empty) {
        this.name = name;
        this.empty = empty;

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
            sortkey: `${ this.name }.${ name }.${ this.length }`,
            span: span,
            bordered: last
        };

        merge(header, settings);
        merge(header, defaults);

        this.headers.push(header);
        this.width += header.width;
        this.length++;
    }
}

const ReservedCategories = {
    'Potions': function (root, group, category, last) {
        group.add(category.alias != undefined ? category.alias : 'Potions', category, {
            width: 109
        }, (player, compare) => {
            var potion0 = player.Potions[0].Size;
            var potion1 = player.Potions[1].Size;
            var potion2 = player.Potions[2].Size;

            var color0 = CompareEval.evaluate(potion0, category.color);
            color0 = (color0 != undefined ? color0 : (category.expc ? category.expc(player, compare, root, player.Potions[0]) : '')) || '';

            var color1 = CompareEval.evaluate(potion1, category.color);
            color1 = (color1 != undefined ? color1 : (category.expc ? category.expc(player, compare, root, player.Potions[1]) : '')) || '';

            var color2 = CompareEval.evaluate(potion2, category.color);
            color2 = (color2 != undefined ? color2 : (category.expc ? category.expc(player, compare, root, player.Potions[2]) : '')) || '';

            var displayValue0 = CompareEval.evaluate(potion0, category.value);
            displayValue0 = displayValue0 != undefined ? displayValue0 : (category.format ? category.format(player, compare, root, player.Potions[0]) : undefined);

            var displayValue1 = CompareEval.evaluate(potion1, category.value);
            displayValue1 = displayValue1 != undefined ? displayValue1 : (category.format ? category.format(player, compare, root, player.Potions[1]) : undefined);

            var displayValue2 = CompareEval.evaluate(potion2, category.value);
            displayValue2 = displayValue2 != undefined ? displayValue2 : (category.format ? category.format(player, compare, root, player.Potions[2]) : undefined);

            return CellGenerator.Cell(displayValue0 == undefined ? potion0 : displayValue0, color0, category.visible ? '' : color0, false, category.align) + CellGenerator.Cell(displayValue1 == undefined ? potion1 : displayValue1, color1, category.visible ? '' : color1, false, category.align) + CellGenerator.Cell(displayValue2 == undefined ? potion2 : displayValue2, color2, category.visible ? '' : color2, last, category.align);
        }, null, (player, compare) => player.Potions.reduce((c, p) => c + p.Size, 0), last, 3);
    }
};

// Helper function
function merge (a, b) {
    for (var [k, v] of Object.entries(b)) {
        if (!a.hasOwnProperty(k) && typeof(v) != 'object') a[k] = b[k];
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
    constructor (joined, kicked, ts, rs) {
        super();

        this.joined = joined;
        this.kicked = kicked;

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
            var group = new HeaderGroup(category.name, ReservedCategories[category.name] != undefined || category.empty);
            var glast = ci == ca.length - 1;

            if (ReservedCategories[category.name]) {
                ReservedCategories[category.name](this.settings, group, category, !glast);
            } else {
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
                                    return CellGenerator.Plain('?', hlast);
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

                                cells.push(CellGenerator.Cell(value + reference, color, header.visible ? '' : color, hlast, header.align));
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
                    } else {
                        group.add((header.alias != undefined ? header.alias : header.name), header, {
                            width: Math.max(100, (header.alias || header.name).length * 12)
                        }, (player, compare) => {
                            var value = header.expr(player, compare, this.settings);
                            if (value == undefined) {
                                return CellGenerator.Plain('?', hlast);
                            }

                            var reference = (header.difference && compare) ? header.expr(compare, compare, this.settings.getCompareEnvironment()) : undefined;
                            if (!isNaN(reference)) {
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

                            return CellGenerator.Cell(value + reference, color, header.visible ? '' : color, hlast, header.align);
                        }, (players, operation) => {
                            var value = players.map(p => header.expr(p.player, p.compare, this.settings)).filter(x => x != undefined);
                            if (value.length == 0) {
                                return CellGenerator.Plain('?');
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
                                    reference = CellGenerator.Difference(reference, header.brackets, header.format_diff ? header.format(null, undefined, this.settings, reference) : (Number.isInteger(reference) ? reference : reference.toFixed(2)));
                                } else {
                                    reference = '';
                                }
                            } else {
                                reference = '';
                            }

                            var color = undefined;
                            if (header.statistics_color) {
                                color = CompareEval.evaluate(value, header.color);
                                color = (color != undefined ? color : (header.expc ? header.expc(null, null, this.settings, value) : '')) || '';
                            }

                            var displayValue = CompareEval.evaluate(value, header.value);
                            if (displayValue == undefined && header.format) {
                                value = header.format(undefined, undefined, this.settings, value);
                            } else if (displayValue != undefined) {
                                value = displayValue;
                            }

                            if (value != undefined && header.extra) {
                                value = `${ value }${ header.extra(undefined) }`;
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
            }

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
        if (this.type == TableType.History) {
            return this.createHistoryTable();
        } else if (this.type == TableType.Players) {
            return this.createPlayersTable();
        } else if (this.type == TableType.Group) {
            return this.createGroupTable();
        }
    }

    // Set players
    setEntries (array, skipeval, sim) {
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
                this.settings.evaluateConstants(players, this.settings.globals.simulator, array.length, this.type);
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

                var indexedCol = this.settings.globals.indexed ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }"><ispan data-indexed="${ this.settings.globals.indexed }">${ i + 1 }</ispan></td>` : undefined;
                var nameCol = `<td class="border-right-thin" ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }">${ formatDate(timestamp) }</td>`;

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

                var indexedCol = this.settings.globals.indexed ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }"><ispan data-indexed="${ this.settings.globals.indexed }">${ item.index + 1 }</ispan></td>` : undefined;
                var serverCol = this.settings.globals.server == undefined || this.settings.globals.server > 0 ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }">${ item.player.Prefix }</td>` : undefined;
                var nameCol = `<td class="border-right-thin clickable ${ item.latest || !this.settings.globals.outdated ? '' : 'foreground-red' }" ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" data-id="${ item.player.Identifier }">${ getEasterEgg(item.player.Identifier) }${ item.player.Name }</td>`;

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

                var indexedCol = this.settings.globals.indexed ? `<td ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }"><ispan data-indexed="${ this.settings.globals.indexed }">${ item.index + 1 }</ispan></td>` : undefined;
                var nameCol = `<td class="border-right-thin clickable" ${ height > 1 ? 'valign="top"' : '' } rowspan="${ height }" data-id="${ item.player.Identifier }">${ getEasterEgg(item.player.Identifier) }${ item.player.Name }</td>`;

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
                    for (var i = 0, wid = extra.width; wid > 0 && i < this.flat.length; i++) {
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

                var cell = CellGenerator.WideCell(SFormat.Normal(value), color, lw, extra.align);
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
                        ${ this.settings.globals.indexed ? `<td width="50" colspan="1" rowspan="2">#</td>` : '' }
                        <td width="200" colspan="1" rowspan="2" class="border-right-thin">Date</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" width="${ h.width }" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    </tr>
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" width="${ h.width }" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
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

                var cell = CellGenerator.WideCell(SFormat.Normal(value) + reference, color, lw, extra.align);
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
                        ${ this.settings.globals.indexed ? `<td width="50" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                        ${ sizeServer ? `<td width="${ sizeServer }" rowspan="2" class="clickable" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                        <td width="${ sizeName }" rowspan="2" class="border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`)) }
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
                ${ this.settings.globals.indexed ? `<td width="50" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                <td width="${ name }" rowspan="2" class="border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
            <tr>
                ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`)) }
            </tr>
            <tr>
                ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                <td class="border-bottom-thick border-right-thin"></td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
            </tr>
                ${ join(this.entries, (e, ei) => e.content.replace(/\<ispan data\-indexed\=\"2\"\>\d*\<\/ispan\>/, `<ispan data-indexed="2">${ ei + 1 }</ispan>`)) }
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
                    for (var i = 0, wid = extra.width; wid > 0 && i < this.flat.length; i++) {
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

                var cell = CellGenerator.WideCell(SFormat.Normal(value) + reference, color, lw, extra.align);
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
            }, [0, 0, 0, 0, 0, 0, 0]);

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
                        <td class="border-right-thin" rowspan="3" colspan="1">Joined</td>
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
                    ${ this.array.kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="4" colspan="1">Left</td>
                        <td colspan="${ Math.max(1, colcount - 1 - widskip) }" rowspan="4">${ this.array.kicked.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Battle Mage</td>
                    <td colspan="${ widskip }">${ classes[4] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Berserker</td>
                    <td colspan="${ widskip }">${ classes[5] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Demon Hunter</td>
                    <td colspan="${ widskip }">${ classes[6] }</td>
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
    Cell: function (c, b, f, bo, al) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="color: ${ f }; background-color: ${ b }; ${ al ? `text-align: ${ al };` : '' }">${ c }</td>`;
    },
    // Wide cell
    WideCell: function (c, b, w, al) {
        return `<td colspan="${ w }" style="background-color: ${ b }; ${ al ? `text-align: ${ al };` : '' }">${ c }</td>`;
    },
    // Plain cell
    Plain: function (c, bo, al) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" ${ al ? `style="text-align: ${ al };"` : '' }>${ c }</td>`;
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
    evaluate (val, rules) {
        var def = undefined;
        for (var [ eq, ref, out ] of rules || []) {
            if (eq == 'd') {
                def = out;
            } else if (CompareEval[eq](val, ref)) {
                return out;
            }
        }
        return def;
    }
};

class SettingsCommand {
    constructor (regexp, parse, format) {
        this.regexp = regexp;
        this.match = string => string.match(this.regexp);
        this.parse = parse;
        this.format = format;
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
    'number': (p, c, e, x) => Number.isInteger(x) ? x : x.toFixed(2),
    'fnumber': (p, c, e, x) => formatAsSpacedNumber(x),
    'date': (p, c, e, x) => formatDate(x),
    'duration': (p, c, e, x) => formatDuration(x),
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
    Constant: string => `<span class="ta-constant">${ escapeHTML(string) }</span>`,
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

const SettingsCommands = [
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
        var ast = new AST(asts);
        if (ast.isValid()) {
            root.setVariable(name, true, ast);
        }
    }, function (root, string) {
        var [ , key, name, asts ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('with all as') } ${ AST.format(asts, root.constants, root.vars) }`;
    }),
    // Global
    // set with - Create a function
    new SettingsCommand(/^(set) (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setFunction(name, args.split(',').map(arg => arg.trim()), ast);
        }
    }, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('with') } ${ args.split(',').map(arg => SFormat.Constant(arg)).join(',') } ${ SFormat.Keyword('as') } ${ AST.format(a, root.constants, root.vars) }`;
    }),
    // Global
    // set - Create a variable
    new SettingsCommand(/^(set) (\w+[\w ]*) as (.+)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setVariable(name, false, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ AST.format(a, root.constants, root.vars) }`;
    }),
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
    new SettingsCommand(/^(category)(?: (.+))?$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createCategory(a || '', a == undefined);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        if (a != undefined) {
            return `${ SFormat.Keyword(key) } ${ ReservedCategories[a] ? SFormat.Reserved(a) : SFormat.Normal(a) }`;
        } else {
            return `${ SFormat.Keyword(key) }`;
        }
    }),
    // Create new header
    new SettingsCommand(/^(header)(?: (.+))?$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createHeader(a || '');
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        if (a != undefined) {
            if (SP_KEYWORD_MAPPING_0.hasOwnProperty(a)) {
                return `${ SFormat.Keyword(key) } ${ SFormat.Reserved(a) }`;
            } else if (SP_KEYWORD_MAPPING_1.hasOwnProperty(a)) {
                return `${ SFormat.Keyword(key) } ${ SFormat.ReservedProtected(a) }`;
            } else if (SP_KEYWORD_MAPPING_2.hasOwnProperty(a)) {
                return `${ SFormat.Keyword(key) } ${ SFormat.ReservedPrivate(a) }`;
            } else if (SP_KEYWORD_MAPPING_3.hasOwnProperty(a)) {
                return `${ SFormat.Keyword(key) } ${ SFormat.ReservedSpecial(a) }`;
            } else {
                return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
            }
        } else {
            return `${ SFormat.Keyword(key) }`;
        }
    }),
    // Create new statistics row
    new SettingsCommand(/^(show) (\S+[\S ]*) as (\S+[\S ]*)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.addExtraRow(name, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ AST.format(a, root.constants, root.vars) }`;
    }),
    // Create new itemized header
    new SettingsCommand(/^(itemized) (\S+[\S ]*) by (\S+[\S ]*)$/, function (root, string) {
        var [ , key, a, s ] = this.match(string);
        if (SP_KEYWORD_MAPPING_5.hasOwnProperty(a)) {
            root.createItemizedHeader(SP_KEYWORD_MAPPING_5[a], s);
        }
    }, function (root, string) {
        var [ , key, a, s ] = this.match(string);
        if (SP_KEYWORD_MAPPING_5.hasOwnProperty(a)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.ReservedItemizable(a) } ${ SFormat.Keyword('by') } ${ SP_KEYWORD_MAPPING_4[s] ? SFormat.ReservedItemized(s) : SFormat.Normal(s) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(a) } ${ SFormat.Keyword('by') } ${ SP_KEYWORD_MAPPING_4[s] ? SFormat.ReservedItemized(s) : SFormat.Normal(s) }`;
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
        var ast = new AST(a);
        if (ast.isValid()) {
            root.addExtraStatistics(name, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ AST.format(a, root.constants, root.vars) }`;
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
    }),
    // Local
    // visible - Show text on the background
    new SettingsCommand(/^(visible) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
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
    new SettingsCommand(/^(format difference) (on|off)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        root.setLocalSharedVariable('format_diff', ARG_MAP[arg]);
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
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
    new SettingsCommand(/^(format|f\:) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            root.setLocalVariable('format', ARG_FORMATTERS[arg]);
        } else {
            var ast = new AST(arg);
            if (ast.isValid()) {
                root.setLocalVariable('format', (player, reference, env, val) => {
                    return ast.eval(player, reference, env, val);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ AST.format(arg, root.constants, root.vars) }`;
        }
    }),
    // Local
    // order by
    new SettingsCommand(/^(order by) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        var ast = new AST(arg);
        if (ast.isValid()) {
            root.setLocalVariable('order', (player, reference, env, val, extra) => {
                return ast.eval(player, reference, env, val, extra);
            });
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ AST.format(arg, root.constants, root.vars) }`;
    }),
    // Local
    // alias - Override name of the column
    new SettingsCommand(/^(alias|a\:) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.setLocalVariable('alias', val);
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
    new SettingsCommand(/^(expr|e\:) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setLocalVariable('expr', (player, reference, env, scope) => {
                return ast.eval(player, reference, env, scope);
            });
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ AST.format(a, root.constants, root.vars) }`;
    }),
    // Local
    // expc - Set color expression to the column
    new SettingsCommand(/^(expc|c\:) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setLocalVariable('expc', (player, reference, env, val) => {
                return getCSSColor(ast.eval(player, reference, env, val));
            });
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ AST.format(a, root.constants, root.vars) }`;
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
    })
];

const SP_ENUMS = {
    'GoldCurve': GOLD_CURVE,
    'MountSizes': PLAYER_MOUNT,
    'AchievementNames': ACHIEVEMENTS,
    'ItemTypes': ITEM_TYPES
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

class Templates {
    static save (settings, label) {
        SharedPreferences.set(`templates/${ label }`, settings);
    }

    static remove (label) {
        SharedPreferences.remove(`templates/${ label }`);
    }

    static get () {
        return SharedPreferences.keys().filter(key => key.includes('templates/')).map(key => key.substring(key.indexOf('/') + 1));
    }

    static load (label) {
        return new Settings(SharedPreferences.get(`templates/${ label }`, ''));
    }
}

const FORMAT_ONLY_SETTINGS = [ 1, 2, 3, 24 ];

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
        history.push({
            name: identifier,
            content: settings
        });

        if (history.length > 10) {
            history.shift();
        }

        Preferences.set('settings_history', history);
    }

    // Create empty settings
    static empty () {
        return new Settings('');
    }

    // Load settings
    static load (identifier, def, template = '') {
        return new Settings(Preferences.get(`settings/${ identifier }`, Preferences.get(`settings/${ def }`, template)));
    }

    // Get code
    getCode () {
        return this.code;
    }

    // Get entry
    getEntry (name) {
        for (var i = 0, c; c = this.c[i]; i++) {
            if (c.name == name && ReservedCategories[c.name]) return c;
            else for (var j = 0, h; h = c.h[j]; j++) if (h.name == name) return h;
        }
        return null;
    }

    getEntrySafe (name) {
        return this.getEntry(name) || {};
    }

    static parseConstants(string) {
        var settings = new Settings('');

        for (var line of string.split('\n')) {
            var commentIndex = line.indexOf('#');
            if (commentIndex != -1) {
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();

            for (var index of FORMAT_ONLY_SETTINGS) {
                if (SettingsCommands[index].isValid(trimmed)) {
                    SettingsCommands[index].parse(settings, trimmed);
                }
            }
        }

        settings.vars = [ ...Object.keys(settings.vars), ...Object.keys(settings.func) ];

        return settings;
    }

    // Format code
    static format (string) {
        var settings = Settings.parseConstants(string);
        var content = '';

        for (var line of string.split('\n')) {
            var comment;
            var commentIndex = line.indexOf('#');

            if (commentIndex != -1) {
                comment = line.slice(commentIndex);
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();
            var spacing = line.match(/\s+$/);

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
            // Constants have to be propagated through the environment
            constants: this.constants
        }
    }

    constructor (string) {
        this.code = string;

        // Root variables
        this.c = [];
        this.vars = {};
        this.cvars = {};
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
        this.currentExtra = null;

        this.shared = {
            statistics_color: true
        };

        this.categoryShared = {
            visible: true,
            statistics_color: true
        };

        // Parsing
        for (var line of string.split('\n')) {
            var commentIndex = line.indexOf('#');
            if (commentIndex != -1) {
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();
            var command = SettingsCommands.find(command => command.isValid(trimmed));
            if (command) {
                command.parse(this, trimmed);
            }
        }

        this.pushCategory();
    }

    // Evaluate constants
    evaluateConstants (players, sim, perf, tabletype) {
        // Evaluate constants
        for (var [name, data] of Object.entries(this.vars)) {
            if (data.ast) {
                var scope = {};
                var scope2 = {};

                if (data.arg) {
                    scope = players.map(p => {
                        var ar = [ p.player, p.compare ];
                        ar.segmented = true;

                        return ar;
                    });

                    scope2 = players.map(p => {
                        var ar = [ p.compare, p.compare ];
                        ar.segmented = true;

                        return ar;
                    });
                }

                if (tabletype == TableType.Group) {
                    data.value = data.ast.eval(players[0].player, undefined, this, scope);
                    if (isNaN(data.value)) {
                        data.value = undefined;
                    }

                    var val = data.ast.eval(players[0].compare, undefined, this, scope2);
                    if (isNaN(val)) {
                        val = undefined;
                    }

                    this.cvars[name] = {
                        value: val,
                        ast: data.ast,
                        arg: data.arg
                    };
                } else {
                    data.value = data.ast.eval(null, undefined, this, scope);
                    if (isNaN(data.value)) {
                        data.value = undefined;
                    }

                    var val = data.ast.eval(null, undefined, this, scope2);
                    if (isNaN(val)) {
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
                        value: data.ast.eval(param.player, undefined, this, players.map_player),
                        compare: data.ast.eval(param.compare, undefined, this.getCompareEnvironment(), players.map_compare)
                    };
                }
            }
        } else if (tabletype == TableType.Players) {
            for (var data of this.extras) {
                if (data.ast) {
                    data.eval = {
                        value: data.ast.eval(null, null, this, players.map_player),
                        compare: data.ast.eval(null, null, this.getCompareEnvironment(), players.map_compare)
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

        // Add simulator output
        if (sim) {
            var array = players.slice(0, perf);
            var array1 = [];
            var array2 = [];

            if (players.reference != players.timestamp) {
                for (var player of array) {
                    array1.push({
                        player: player.player
                    });

                    array2.push({
                        player: player.compare
                    });
                }

                var target1 = this.globals.simulator_target ? array1.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                var target2 = this.globals.simulator_target ? array2.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                if (target1 == null || target2 == null || array.length == 2) {
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
                        player: player.player
                    });
                }

                var target1 = this.globals.simulator_target ? array1.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                if (target1 && array.length != 2) {
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
        if (this.currentExtra) {
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
            var mapping = SP_KEYWORD_MAPPING_0[this.currentHeader.name] || SP_KEYWORD_MAPPING_1[this.currentHeader.name] || SP_KEYWORD_MAPPING_2[this.currentHeader.name] || SP_KEYWORD_MAPPING_3[this.currentHeader.name] || SP_KEYWORD_MAPPING_4[this.currentHeader.name];

            var custom = SP_SPECIAL_CONDITIONS[this.currentHeader.name];
            if (custom && this.currentHeader.clean != 2) {
                for (var entry of custom) {
                    if (entry.condition(this.currentHeader)) {
                        merge(this.currentHeader, entry.content);
                    }
                }
            }

            if (mapping) {
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

    pushCategory () {
        this.pushHeader();
        if (this.currentCategory) {
            if (ReservedCategories[this.currentCategory.name]) {
                merge(this.currentCategory, this.shared);
            }

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
        } else if (this.currentHeader) {
            this.setLocalVariable(key, value);
        } else if (this.currentCategory && ReservedCategories[this.currentCategory.name]) {
            this.currentCategory[key] = value;
        } else if (this.currentCategory) {
            this.categoryShared[key] = value;
        } else {
            this.shared[key] = value;
        }
    }

    setLocalVariable (key, value) {
        if (this.currentExtra) {
            this.currentExtra[key] = value;
        } else {
            var object = this.currentCategory && ReservedCategories[this.currentCategory.name] ? this.currentCategory : this.currentHeader;
            if (object) {
                object[key] = value;
            }
        }
    }

    setLocalArrayVariable (key, condition, reference, value) {
        if (this.currentExtra) {
            if (!this.currentExtra[key]) {
                this.currentExtra[key] = [];
            }

            this.currentExtra[key].push([ condition, reference, value, reference ]);
        } else {
            var object = this.currentCategory && ReservedCategories[this.currentCategory.name] ? this.currentCategory : this.currentHeader;
            if (object) {
                if (!object[key]) {
                    object[key] = [];
                }

                object[key].push([ condition, reference, value, reference ]);
            }
        }
    }
};
