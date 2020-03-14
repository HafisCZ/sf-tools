class HeaderGroup {
    constructor (name, empty) {
        this.name = name;
        this.empty = empty;

        this.width = 0;
        this.length = 0;

        this.headers = [];
    }

    add (name, settings, defaults, cellgen, statgen, sort, span = 1) {
        var header = {
            name: name,
            generators: {
                cell: cellgen,
                statistics: statgen
            },
            sort: sort,
            sortkey: `${ this.name }.${ name }.${ this.length }`,
            span: span
        };

        merge(header, settings);
        merge(header, defaults);

        this.headers.push(header);
        this.width += header.width;
        this.length++;
    }
}

const ReservedCategories = {
    'Potions': function (group, category, last) {
        group.add('Potions', category, {
            width: 110
        }, (player) => {
            var potion0 = player.Potions[0].Size;
            var potion1 = player.Potions[1].Size;
            var potion2 = player.Potions[2].Size;

            var color0 = CompareEval.evaluate(potion0, category.color) || '';
            var color1 = CompareEval.evaluate(potion1, category.color) || '';
            var color2 = CompareEval.evaluate(potion2, category.color) || '';

            return CellGenerator.Cell(potion0, color0, category.visible ? '' : color0) + CellGenerator.Cell(potion1, color1, category.visible ? '' : color1) + CellGenerator.Cell(potion2, color2, category.visible ? '' : color2, last);
        }, null, player => player.Potions.reduce((c, p) => c + p.Size, 0), 3);
    }
};

const ReservedHeaders = {
    'Mount': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Mount', header, {
            width: 80
        }, (player, compare) => {
            var color = CompareEval.evaluate(player.Mount, header.color) || '';

            var displayValue = CompareEval.evaluate(player.Mount, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(player, player.Mount) : undefined);

            if (displayValue != undefined) {
                return CellGenerator.Cell(displayValue, color, header.visible ? '' : color, last);
            } else {
                return CellGenerator.Cell(PLAYER_MOUNT[player.Mount] + ((header.percentage || header.extra) && player.Mount ? (header.extra || '%') : ''), color, header.visible ? '' : color, last);
            }
        }, (players, operation) => {
            var a = operation(players.map(p => p.player.Mount));

            var color = CompareEval.evaluate(a, header.color) || '';

            var displayValue = CompareEval.evaluate(a, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(null, a) : undefined);

            if (displayValue != undefined) {
                return CellGenerator.Cell(displayValue, '', color);
            } else {
                return CellGenerator.Cell(PLAYER_MOUNT[a] + ((header.percentage || header.extra) && a ? (header.extra || '%') : ''), '', CompareEval.evaluate(a, header.color) || '');
            }
        }, player => player.Mount);
    },
    'Awards': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Awards', header, {
            width: 100
        }, (player, compare) => {
            var reference = (!this.nodiff && header.difference && compare) ? compare.Achievements.Owned : '';
            if (reference) {
                reference = CellGenerator.Difference(player.Achievements.Owned - reference, header.brackets);
            }

            var color = CompareEval.evaluate(player.Achievements.Owned, header.color) || '';

            var displayValue = CompareEval.evaluate(player.Achievements.Owned, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(player, player.Achievements.Owned) : (player.Achievements.Owned + (header.extra || '')));

            return CellGenerator.Cell(displayValue + (header.hydra && player.Achievements.Dehydration ? CellGenerator.Small(' H') : '') + reference, color, header.visible ? '' : color, last);
        }, (players, operation) => {
            var a = operation(players.map(p => p.player.Achievements.Owned));
            var b = operation(players.map(p => p.compare.Achievements.Owned));

            var reference = header.difference ? b : '';
            if (reference) {
                reference = CellGenerator.Difference(a - b, header.brackets);
            }

            var color = CompareEval.evaluate(a, header.color) || '';

            var displayValue = CompareEval.evaluate(a, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(null, a) : (a + (header.extra || '')));

            return CellGenerator.Cell(displayValue + reference, '', color);
        }, player => player.Achievements.Owned);
    },
    'Album': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Album', header, {
            width: 100 + (header.difference ? 30 : 0) + (header.grail ? 15 : 0)
        }, (player, compare) => {
            var value = header.percentage ? 100 * player.Book / SCRAPBOOK_COUNT : player.Book;
            var color = CompareEval.evaluate(value, header.color) || '';

            var reference = (!this.nodiff && header.difference && compare) ? (header.percentage ? (100 * compare.Book / SCRAPBOOK_COUNT) : compare.Book) : '';
            if (reference) {
                reference = CellGenerator.Difference(value - reference, header.brackets, header.percentage ? (value - reference).toFixed(2) : (value - reference));
            }

            var displayValue = CompareEval.evaluate(value, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(player, value) : (header.percentage ? value.toFixed(2) : value));

            return CellGenerator.Cell(displayValue + ((header.percentage || header.extra) ? (header.extra || '%') : '') + (header.grail && player.Achievements.Grail ? CellGenerator.Small(' G') : '') + reference, color, header.visible ? '' : color, last);
        }, (players, operation) => {
            var a = operation(players.map(p => header.percentage ? 100 * p.player.Book / SCRAPBOOK_COUNT : p.player.Book));
            var b = operation(players.map(p => header.percentage ? 100 * p.compare.Book / SCRAPBOOK_COUNT : p.compare.Book));

            var color = CompareEval.evaluate(a, header.color) || '';
            var reference = header.difference ? b : '';
            if (reference) {
                reference = CellGenerator.Difference(a - reference, header.brackets, header.percentage ? (a - reference).toFixed(2) : (a - reference));
            }

            var displayValue = CompareEval.evaluate(a, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(null, a) : (header.percentage ? a.toFixed(2) : a));

            return CellGenerator.Cell(displayValue + ((header.percentage || header.extra) ? (header.extra || '%') : '') + reference, '', color);
        }, player => player.Book);
    },
    'Knights': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Knights', header, {
            width: 100
        }, (player, compare) => {
            if (player.Fortress.Knights == undefined) {
                return CellGenerator.Plain('?', last);
            }

            var reference = (!this.nodiff && header.difference && compare) ? compare.Fortress.Knights : '';
            if (reference) {
                reference = CellGenerator.Difference(player.Fortress.Knights - reference, header.brackets);
            }

            var color = CompareEval.evaluate(player.Fortress.Knights, header.color) || '';

            var displayValue = CompareEval.evaluate(player.Fortress.Knights, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(player, player.Fortress.Knights) : undefined);

            if (displayValue != undefined) {
                return CellGenerator.Cell(displayValue + reference, color, header.visible ? '' : color, last);
            } else {
                return CellGenerator.Cell(player.Fortress.Knights + (header.maximum ? `/${ player.Fortress.Fortress }` : '') + reference, color, header.visible ? '' : color, last);
            }
        }, (players, operation) => {
            var aa = players.map(p => p.player.Fortress.Knights).filter(x => x != undefined);
            var bb = players.map(p => p.compare.Fortress.Knights).filter(x => x != undefined);
            if (!aa.length || !bb.length) return CellGenerator.Plain('?');
            var a = operation(aa);
            var b = operation(bb);

            var reference = header.difference ? b : '';
            if (reference) {
                reference = CellGenerator.Difference(a - b, header.brackets);
            }

            var color = CompareEval.evaluate(a, header.color) || '';

            var displayValue = CompareEval.evaluate(a, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(null, a) : (a + (header.extra || '')));

            return CellGenerator.Cell(displayValue + reference, '', color);
        }, player => player.Fortress.Knights == undefined ? -1 : player.Fortress.Knights);
    },
    'Last Active': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Last Active', header, {
            width: 160,
        }, (player, compare) => {
            var a = player.getInactiveDuration();

            var color = CompareEval.evaluate(a, header.color) || '';

            var displayValue = CompareEval.evaluate(a, header.value);
            displayValue = displayValue != undefined ? displayValue : (header.format ? header.format(player, player.LastOnline) : formatDate(player.LastOnline));

            return CellGenerator.Cell(displayValue, color, header.visible ? '' : color, last);
        }, null, player => player.LastOnline);
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
    constructor (perf) {
        super();

        this.perf = perf;
    }

    add (player, latest, hidden) {
        super.push({ player: player, latest: latest, index: this.length, hidden: hidden });
    }
}

// Special array for group only
class GroupTableArray extends Array {
    constructor (joined, kicked) {
        super();

        this.joined = joined;
        this.kicked = kicked;
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

// Table instance
class TableInstance {
    constructor (settings, type) {
        // Parameters
        this.settings = settings;
        this.type = type;
        this.sorting = {};

        if (type == TableType.Players) {
            this.nodiff = true;
        }

        // Column configuration
        this.config = [];
        this.settings.c.forEach((category, ci, ca) => {
            var group = new HeaderGroup(category.name, category.name == 'Potions' || category.empty);
            var glast = ci == ca.length - 1;

            if (ReservedCategories[category.name]) {
                ReservedCategories[category.name](group, category, !glast);
            } else {
                category.h.forEach((header, hi, ha) => {
                    var hlast = (!glast && hi == ha.length - 1) || header.border >= 2 || (hi != ha.length - 1 && (ha[hi + 1].border == 1 || ha[hi + 1].border == 3));

                    if (!header.expr && ReservedHeaders[header.name]) {
                        ReservedHeaders[header.name](group, header, hlast);
                    } else {
                        group.add((header.alias != undefined ? header.alias : header.name), header, {
                            width: Math.max(100, (header.alias || header.name).length * 12)
                        }, (player, compare) => {
                            var value = header.expr(player);
                            if (value == undefined) {
                                return CellGenerator.Plain('?', hlast);
                            }

                            var reference = ((!this.nodiff && header.difference && compare) ? header.expr(compare) : '') || '';
                            if (reference) {
                                reference = header.flip ? (reference - value) : (value - reference);
                                reference = CellGenerator.Difference(reference, header.brackets, Number.isInteger(reference) ? reference : reference.toFixed(2));
                            }

                            var color = CompareEval.evaluate(value, header.color) || '';

                            var displayValue = CompareEval.evaluate(value, header.value);
                            var value = displayValue != undefined ? displayValue : (header.format ? header.format(player, value) : (value + (header.extra || '')));

                            return CellGenerator.Cell(value + reference, color, header.visible ? '' : color, hlast);
                        }, (players, operation) => {
                            var value = players.map(p => header.expr(p.player)).filter(x => x != undefined);
                            if (value.length == 0) {
                                return CellGenerator.Plain('?');
                            }

                            value = operation(value);

                            var reference = header.difference ? players.map(p => header.expr(p.compare)).filter(x => x != undefined) : '';
                            if (reference && reference.length) {
                                reference = operation(reference);
                                reference = header.flip ? (reference - value) : (value - reference);
                                reference = CellGenerator.Difference(reference, header.brackets, Number.isInteger(reference) ? reference : reference.toFixed(2));
                            }

                            var color = CompareEval.evaluate(value, header.color) || '';

                            var displayValue = CompareEval.evaluate(value, header.value);
                            var value = displayValue != undefined ? displayValue : (value + (header.extra || ''));

                            return CellGenerator.Cell(value + reference, '', color);
                        }, player => {
                            var value = header.expr(player);
                            if (value == undefined) {
                                return -1;
                            } else {
                                return value;
                            }
                        });
                    }
                });
            }

            this.addHeader(group);
        });

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
    setEntries (array) {
        // Entry array
        this.array = array;

        // Calculate constants
        if (this.type != TableType.History) {
            this.settings.evaluateConstants(array.map(p => p.player));
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

                var entry = {
                    // Row
                    content: `
                        <tr>
                            ${ this.settings.globals.indexed ? `<td>${ i + 1 }</td>` : '' }
                            <td class="border-right-thin">${ formatDate(timestamp) }</td>
                            ${ join(this.flat, h => h.generators.cell(player, i != this.array.length - 1 ? this.array[i + 1][1] : player)) }
                        </tr>
                    `,
                };

                this.entries.push(entry);
            }
        } else if (this.type == TableType.Players) {
            for (var i = 0; i < this.array.length; i++) {
                var item = this.array[i];

                var entry = {
                    // Row
                    content: `
                        <tr class="${ item.hidden ? 'css-entry-hidden' : '' }">
                            ${ this.settings.globals.indexed ? `<td data-indexed="${ this.settings.globals.indexed }">${ item.index + 1 }</td>` : '' }
                            ${ this.settings.globals.server == undefined || this.settings.globals.server > 0 ? `<td>${ item.player.Prefix }</td>` : '' }
                            <td class="border-right-thin clickable ${ item.latest || !this.settings.globals.outdated ? '' : 'foreground-red' }" data-id="${ item.player.Identifier }">${ item.player.Identifier == 'w27_net_p268175' ? '<i class="chess queen icon"></i>' : '' }${ item.player.Name }</td>
                            ${ join(this.flat, h => h.generators.cell(item.player)) }
                        </tr>
                    `,
                    sorting: {
                        '_name': item.player.Name,
                        '_index': item.index,
                        '_server': item.player.Prefix
                    }
                };

                for (var column of this.flat) {
                    entry.sorting[column.sortkey] = column.sort(item.player);
                }

                this.entries.push(entry);
            }
        } else if (this.type == TableType.Group) {
            for (var i = 0; i < this.array.length; i++) {
                var item = this.array[i];

                var entry = {
                    // Row
                    content: `
                        <tr>
                            ${ this.settings.globals.indexed ? `<td data-indexed="${ this.settings.globals.indexed }">${ item.index + 1 }</td>` : '' }
                            <td class="border-right-thin clickable" data-id="${ item.player.Identifier }">${ item.player.Identifier == 'w27_net_p268175' ? '<i class="chess queen icon"></i>' : '' }${ item.player.Name }</td>
                            ${ join(this.flat, h => h.generators.cell(item.player, item.compare)) }
                        </tr>
                    `,
                    sorting: {
                        '_name': item.player.Name,
                        '_index': item.index
                    }
                };

                for (var column of this.flat) {
                    entry.sorting[column.sortkey] = column.sort(item.player);
                }

                this.entries.push(entry);
            }
        }
    }

    setSorting(key = undefined) {
        this.sorting = {
            key: key,
            order: key == undefined ? 0 : (this.sorting.key != key ? 1 : (this.sorting.order == 2 ? 0 : (this.sorting.order + 1)))
        }

        this.sort();
    }

    // Set sorting
    sort () {
        if (this.sorting.order) {
            if (this.sorting.key == '_name') {
                if (this.sorting.order == 1) {
                    this.entries.sort((a, b) => a.sorting['_name'].localeCompare(b.sorting['_name']));
                } else {
                    this.entries.sort((a, b) => b.sorting['_name'].localeCompare(a.sorting['_name']));
                }
            } else if (this.sorting.key == '_index') {
                if (this.sorting.order == 1) {
                    this.entries.sort((a, b) => a.sorting['_index'] - b.sorting['_index']);
                } else {
                    this.entries.sort((a, b) => b.sorting['_index'] - a.sorting['_index']);
                }
            } else if (this.sorting.key == '_server') {
                if (this.sorting.order == 1) {
                    this.entries.sort((a, b) => a.sorting['_server'].localeCompare(b.sorting['_server']));
                } else {
                    this.entries.sort((a, b) => b.sorting['_server'].localeCompare(a.sorting['_server']));
                }
            } else {
                var sort = this.flat.find(h => h.sortkey == this.sorting.key);
                if (sort) {
                    if ((this.sorting.order == 1 && !sort.flip) || (this.sorting.order == 2 && sort.flip)) {
                        this.entries.sort((a, b) => compareItems(a.sorting[sort.sortkey], b.sorting[sort.sortkey]));
                    } else if ((this.sorting.order == 2 && !sort.flip) || (this.sorting.order == 1 && sort.flip)) {
                        this.entries.sort((a, b) => compareItems(b.sorting[sort.sortkey], a.sorting[sort.sortkey]));
                    }
                }
            }
        } else {
            this.entries.sort((a, b) => a.sorting['_index'] - b.sorting['_index']);
        }
    }

    // Create history table
    createHistoryTable () {
        var size = 200 + (this.settings.globals.indexed ? 50 : 0) + this.flat.reduce((a, b) => a + b.width, 0);
        return [
            `
                <thead>
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
                </thead>
                <tbody>
                    ${ join(this.entries, e => e.content) }
                </tbody>
            `,
            size
        ];
    }

    // Create players table
    createPlayersTable () {
        var server = this.settings.globals.server == undefined ? 0 : this.settings.globals.server;
        var name = this.settings.globals.name == undefined ? 250 : this.settings.globals.name;

        var size = name + server + (this.settings.globals.indexed ? 50 : 0) + this.flat.reduce((a, b) => a + b.width, 0);

        return [
            `
                <thead>
                    <tr>
                        ${ this.settings.globals.indexed ? `<td width="50" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? `data-sortable="${ this.sorting.key == '_index' ? this.sorting.order : 0 }" data-sortable-key="_index"` : '' }>#</td>` : '' }
                        ${ server ? `<td width="${ server }" rowspan="2" class="clickable" data-sortable="${ this.sorting.key == '_server' ? this.sorting.order : 0 }" data-sortable-key="_server">Server</td>` : '' }
                        <td width="${ name }" rowspan="2" class="border-right-thin clickable" data-sortable="${ this.sorting.key == '_name' ? this.sorting.order : 0 }" data-sortable-key="_name">Name</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" data-sortable="${ h.sortkey == this.sorting.key ? this.sorting.order : 0 }">${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" data-sortable="${ h.sortkey == this.sorting.key ? this.sorting.order : 0 }">${ h.name }</td>`)) }
                    </tr>
                    <tr>
                        ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                        <td class="border-bottom-thick border-right-thin" colspan="${ server ? 2 : 1 }"></td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
                    </tr>
                </thead>
                <tbody>
                    ${ join(this.entries, (e, ei) => e.content.replace(/\<td data\-indexed\=\"2\"\>\d*\<\/td\>/, `<td data-indexed="2">${ ei + 1 }</td>`), 0, this.array.perf == undefined ? this.settings.globals.performance : this.array.perf) }
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

        var content = `
        <thead>
            <tr>
                ${ this.settings.globals.indexed ? `<td width="50" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? `data-sortable="${ this.sorting.key == '_index' ? this.sorting.order : 0 }" data-sortable-key="_index"` : '' }>#</td>` : '' }
                <td width="${ name }" rowspan="2" class="border-right-thin clickable" data-sortable="${ this.sorting.key == '_name' ? this.sorting.order : 0 }" data-sortable-key="_name">Name</td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" data-sortable="${ h.sortkey == this.sorting.key ? this.sorting.order : 0 }">${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
            <tr>
                ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" width="${ h.width }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" data-sortable="${ h.sortkey == this.sorting.key ? this.sorting.order : 0 }">${ h.name }</td>`)) }
            </tr>
            <tr>
                ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                <td class="border-bottom-thick border-right-thin"></td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
            </tr>
        </thead>
            <tbody>
                ${ join(this.entries, (e, ei) => e.content.replace(/\<td data\-indexed\=\"2\"\>\d*\<\/td\>/, `<td data-indexed="2">${ ei + 1 }</td>`)) }
        `;

        var showMembers = this.settings.globals.members;
        var showSummary = this.flat.reduce((a, b) => a || b.statistics, false);

        if (showMembers || showSummary) {
            content += `
                <tr><td colspan="${ this.flat.length + 1 + (this.settings.globals.indexed ? 1 : 0) }"></td></tr>
            `;
        }

        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        if (showSummary) {
            content += `
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
                    ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => Math.trunc(ar.reduce((a, b) => a + b, 0) / ar.length)) : `<td colspan=${ h.span }></td>`) }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Maximum</td>
                    ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => Math.max(... ar)) : `<td colspan=${ h.span }></td>`) }
                </tr>
            `;
        }

        if (showMembers) {
            var classes = this.array.reduce((c, p) => {
                c[p.player.Class - 1]++;
                return c;
            }, [0, 0, 0, 0, 0, 0]);

            if (showSummary) {
                content += `
                    <tr>
                        <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                    </tr>
                `;
            }

            var widskip = 1;
            for (var i = 0, wid = 60; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip++;
                } else {
                    break;
                }
            }

            content += `
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Warrior</td>
                    <td colspan="${ widskip }">${ classes[0] }</td>
                    ${ this.array.joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="1">Joined</td>
                        <td colspan="${ Math.max(1, this.flat.length - 1 - widskip) }" rowspan="3">${ this.array.joined.join(', ') }</td>
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
                        <td class="border-right-thin" rowspan="3" colspan="1">Left</td>
                        <td colspan="${ Math.max(1, this.flat.length - 1 - widskip) }" rowspan="3">${ this.array.kicked.join(', ') }</td>
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
            `;
        }

        return [
            content + '</tbody>',
            size
        ];
    }
}

// Cell generators
const CellGenerator = {
    // Simple cell
    Cell: function (c, b, f, bo) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="color: ${ f }; background-color: ${ b }">${ c }</td>`;
    },
    // Plain cell
    Plain: function (c, bo) {
        return `<td class="${ bo ? 'border-right-thin' : '' }">${ c }</td>`;
    },
    // Difference
    Difference: function (d, b, c) {
        return d != 0 ? ` <span>${ b ? '(' : '' }${ d > 0 ? '+' : '' }${ c == null ? d : c }${ b ? ')' : '' }</span>` : '';
    },
    // Empty cell
    Empty: function () {
        return '<td></td>';
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

const ARG_MAP_SERVER = {
    'off': 0,
    'on': 100
}

const ARG_FORMATTERS = {
    'number': (p, x) => Number.isInteger(x) ? x : x.toFixed(2),
    'fnumber': (p, x) => formatAsSpacedNumber(x),
    'date': (p, x) => formatDate(x),
    'duration': (p, x) => formatDuration(x),
    'default': (p, x) => typeof(x) == 'string' ? x : (isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)))
}

function escapeHTML(string) {
    return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/ /g, "&nbsp;");
}

const SFormat = {
    Normal: string => escapeHTML(string),
    Keyword: string => `<span class="ta-keyword">${ escapeHTML(string) }</span>`,
    Color: (string, color = string) => `<span class="ta-color" style="color: ${ color };">${ escapeHTML(string) }</span>`,
    Comment: string => `<span class="ta-comment">${ escapeHTML(string) }</span>`,
    Constant: string => `<span class="ta-constant">${ escapeHTML(string) }</span>`,
    Reserved: string => `<span class="ta-reserved">${ escapeHTML(string) }</span>`,
    ReservedProtected: string => `<span class="ta-reserved-protected">${ escapeHTML(string) }</span>`,
    ReservedPrivate: string => `<span class="ta-reserved-private">${ escapeHTML(string) }</span>`,
    Error: string => `<span class="ta-error">${ escapeHTML(string) }</span>`,
    Bool: (string, bool = string) => `<span class="ta-boolean-${ bool }">${ escapeHTML(string) }</span>`
};

const SettingsCommands = [
    // Global
    // set static
    new SettingsCommand(/^(set) (\w+[\w ]*) with all (\w+[\w ]*) as (.+)$/, function (root, string) {
        var [ , key, name, arg, asts ] = this.match(string);
        var ast = new AST(asts);
        if (ast.isValid()) {
            root.setVariable(name, arg, ast);
        }
    }, function (string) {
        var [ , key, name, arg, asts ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('with all') } ${ SFormat.Constant(arg) } ${ SFormat.Keyword('as') } ${ SFormat.Normal(asts) }`;
    }),
    // Global
    // set with - Create a function
    new SettingsCommand(/^(set) (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setFunction(name, args.split(',').map(arg => arg.trim()), ast);
        }
    }, function (string) {
        var [ , key, name, args, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('with') } ${ args.split(',').map(arg => SFormat.Constant(arg)).join(',') } ${ SFormat.Keyword('as') } ${ SFormat.Normal(a) }`;
    }),
    // Global
    // set - Create a variable
    new SettingsCommand(/^(set) (\w+[\w ]*) as (.+)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setVariable(name, undefined, ast);
        }
    }, function (string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ SFormat.Normal(a) }`;
    }),
    // Global
    // server - show, hide or set width
    new SettingsCommand(/^(server) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);
        if (val != undefined) {
            if (isNaN(val)) {
                val = ARG_MAP_SERVER[value];
            }
            if (!isNaN(val)) {
                root.setGlobalVariable(key, Number(val));
            }
        }
    }, function (string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);
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
        var val = Constants.GetValue(prefix, value);

        if (val != undefined && !isNaN(val)) {
            root.setGlobalVariable(key, Number(val));
        }
    }, function (string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);

        if (Constants.IsValid(prefix, value) && !isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Create new category
    new SettingsCommand(/^(category)(?: (\S+[\S ]*))?$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createCategory(a, a == undefined);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        if (a != undefined) {
            return `${ SFormat.Keyword(key) } ${ ReservedCategories[a] ? SFormat.Reserved(a) : SFormat.Normal(a) }`;
        } else {
            return `${ SFormat.Keyword(key) }`;
        }
    }),
    // Create new header
    new SettingsCommand(/^(header) (\S+[\S ]*)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createHeader(a);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        if (SP_KEYWORD_MAPPING_0[a]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Reserved(a) }`;
        } else if (SP_KEYWORD_MAPPING_1[a]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.ReservedProtected(a) }`;
        } else if (SP_KEYWORD_MAPPING_2[a]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.ReservedPrivate(a) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
        }
    }),
    // Global
    // indexed - Show indexes in first column of the table
    new SettingsCommand(/^(indexed) (on|off|static)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, ARG_MAP[a]);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a, a == 'static' ? 'on' : a) }`;
    }),
    // Global
    // indexed - Show indexes in first column of the table
    new SettingsCommand(/^(performance) (\d+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, Number(a));
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Global
    // members - Show member classes and changes
    // outdated - Mark outdated entries with red text
    new SettingsCommand(/^(members|outdated) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setGlobalVariable(key, ARG_MAP[a]);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    // Local Shared
    // difference - Show difference between two points in time
    // percentage - Show field as a percentage
    // hydra - Show hydra achievement
    // flip - Treat lower value as better
    // brackets - Show difference within brackets
    // statistics - Show statistics of a column
    // maximum - Show maximum knights based on fortress level
    // grail - Show grail achievement
    new SettingsCommand(/^(difference|percentage|hydra|flip|brackets|statistics|maximum|grail) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    // Local Shared
    // width - Width of a column
    new SettingsCommand(/^(width) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);

        if (val != undefined && !isNaN(val)) {
            root.setLocalSharedVariable(key, Number(val));
        }
    }, function (string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);

        if (Constants.IsValid(prefix, value) && !isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // extra - Ending characters for each cell (example %)
    new SettingsCommand(/^(extra) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalVariable(key, a);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Local
    // visible - Show text on the background
    new SettingsCommand(/^(visible) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    // Local Shared
    // border - Show border around columns
    new SettingsCommand(/^(border) (none|left|right|both)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.setLocalSharedVariable(key, ARG_MAP[a]);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Local
    // format - Specifies formatter for the field
    new SettingsCommand(/^(format) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            root.setLocalVariable(key, ARG_FORMATTERS[arg]);
        } else {
            var ast = new AST(arg);
            if (ast.isValid()) {
                root.setLocalVariable(key, (player, val) => {
                    return ast.eval(player, root, val);
                });
            }
        }
    }, function (string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // alias - Override name of the column
    new SettingsCommand(/^(alias) ((@?)(\w+[\w ]*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);

        if (val != undefined) {
            root.setLocalVariable(key, val);
        }
    }, function (string) {
        var [ , key, arg, prefix, value ] = this.match(string);

        if (Constants.IsValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // expr - Set expression to the column
    new SettingsCommand(/^(expr) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setLocalVariable(key, (player) => {
                var value = ast.eval(player, root);
                return typeof(value) == 'string' ? value : (isNaN(value) ? undefined : value);
            });
        }
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Local
    // value - Add default value
    new SettingsCommand(/^(value) (default) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = Constants.GetValue(prefix, value);

        if (val != undefined) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], 0, val);
        }
    }, function (string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);

        if (Constants.IsValid(prefix, value)) {
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
        var val = getCSSColor(Constants.GetValue(prefix, value));

        if (val != undefined && val) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], 0, val);
        }
    }, function (string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(Constants.GetValue(prefix, value));

        if (Constants.IsValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    // Local
    // value - Add value based on condition
    new SettingsCommand(/^(value) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(\w+[\w ]*)) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = Constants.GetValue(rprefix, rvalue);
        var val = Constants.GetValue(prefix, value);

        if (reference != undefined && val != undefined) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], reference, val);
        }
    }, function (string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);

        if (Constants.IsValid(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (Constants.IsValid(prefix, value)) {
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
    new SettingsCommand(/^(color) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(\w+[\w ]*)) ((@?)(\w+))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = Constants.GetValue(rprefix, rvalue);
        var val = getCSSColor(Constants.GetValue(prefix, value));

        if (reference != undefined && val != undefined) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], reference, val);
        }
    }, function (string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(Constants.GetValue(prefix, value));

        if (Constants.IsValid(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (Constants.IsValid(prefix, value) && val) {
            arg = SFormat.Constant(arg);
        } else if (prefix == '@' || !val) {
            arg = SFormat.Error(arg);
        } else {
            arg = SFormat.Color(arg, val);
        }

        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ rarg } ${ arg }`;
    })
];

const Constants = {
    // Get value of a constant or pass the key though
    GetValue: function (tag, key) {
        return tag == '@' ? this.Values[key] : key;
    },
    // Check if the constant is valid
    IsValid: function (tag, key) {
        return tag == '@' && this.Values[key] != undefined;
    },
    // Individual constants
    Values: {
        'green': '#00c851',
        'orange': '#ffbb33',
        'red': '#ff3547',
        '15min': '0',
        '1hour': '1',
        '12hours': '2',
        '1day': '3',
        '3days': '4',
        '7days': '5',
        '21days': '6',
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
        'empty': '',
        'tiny': '15',
        'small': '60',
        'normal': '100',
        'large': '160',
        'huge': '200'
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

    // Create empty settings
    static empty () {
        return new Settings('');
    }

    // Load settings
    static load (identifier) {
        return new Settings(Preferences.get(`settings/${ identifier }`, Preferences.get('settings', DEFAULT_SETTINGS)));
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

    // Format code
    static format (string) {
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
            content += command ? command.format(trimmed) : SFormat.Error(trimmed);

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

    constructor (string) {
        this.code = string;

        // Root variables
        this.c = [];
        this.vars = {};
        this.func = {};

        this.globals = {
            outdated: true
        };

        // Temporary
        this.currentCategory = null;
        this.currentHeader = null;

        this.shared = {};
        this.categoryShared = {
            visible: true
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
    evaluateConstants (players) {
        // Evaluate constants
        for (var [name, data] of Object.entries(this.vars)) {
            var scope = {};
            if (data.arg) {
                scope[data.arg] = players;
            }

            data.value = data.ast.eval(undefined, this, scope);
            if (isNaN(data.value)) {
                data.value = undefined;
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

    pushHeader () {
        if (this.currentCategory && this.currentHeader) {
            var reserved = ReservedHeaders[this.currentHeader.name];
            var mapping = SP_KEYWORD_MAPPING_0[this.currentHeader.name] || SP_KEYWORD_MAPPING_1[this.currentHeader.name] || SP_KEYWORD_MAPPING_2[this.currentHeader.name];

            if (!this.currentHeader.expr && mapping && !reserved) {
                merge(this.currentHeader, mapping);
            }

            if (this.currentHeader.expr || reserved) {
                merge(this.currentHeader, this.categoryShared);
                merge(this.currentHeader, this.shared);

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
        if (this.currentCategory) {
            this.pushHeader();

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
        if (this.currentHeader) {
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
        var object = this.currentCategory && ReservedCategories[this.currentCategory.name] ? this.currentCategory : this.currentHeader;
        if (object) {
            object[key] = value;
        }
    }

    setLocalArrayVariable (key, condition, reference, value) {
        var object = this.currentCategory && ReservedCategories[this.currentCategory.name] ? this.currentCategory : this.currentHeader;
        if (object) {
            if (!object[key]) {
                object[key] = [];
            }

            object[key].push([ condition, reference, value, reference ]);
        }
    }
};

const DEFAULT_SETTINGS = `# Show member list
members on

# Global settings
statistics on # Show statistics below the table
difference on # Show difference

# Create new category
category General

# Create new header
header Level
difference off # Don't show difference for Level

header Album
percentage on # Show album as percentage
color above or equal 90 @green # Color all values above 90 with green
color above or equal 75 @orange
color default @red # Color values in red by default

header Mount
percentage on
color equal 4 @green
color above 0 @orange
color default @red

header Awards
hydra on # Show hydra
statistics off # Do not show statistics

category Potions
color equal 25 @green
color above 0 @orange
color default @red
visible off # Don't show numbers

category Guild

header Treasure
statistics off

header Instructor
statistics off

header Pet
color above or equal 335 @green
color above or equal 235 @orange
color default @red

header Knights
maximum on # Show fortress next to knights
color above or equal 17 @green
color above or equal 15 @orange
color default @red

category Fortress

header Fortress Honor`;
