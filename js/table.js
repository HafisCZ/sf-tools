class HeaderGroup {
    constructor (name, empty) {
        this.name = name;
        this.empty = empty;

        this.width = 0;
        this.length = 0;

        this.headers = [];
    }

    add (name, settings, defaults, cellgen, statgen, sort) {
        var header = {
            name: name,
            generators: {
                cell: cellgen,
                statistics: statgen
            },
            sort: sort,
            sortkey: `${ this.name }.${ this.length }.${ name }`
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
        // Potion 1
        group.add('', category, {
            width: 33
        }, (player) => {
            var potion = player.Potions[0].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, player => player.Potions[0].Size);

        // Potion 2
        group.add('', category, {
            width: 33
        }, player => {
            var potion = player.Potions[1].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, player => player.Potions[1].Size);

        // Potion 3
        group.add('', category, {
            width: 33
        }, player => {
            var potion = player.Potions[2].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color, !last);
        }, null, player => player.Potions[2].Size);
    }
};

const ReservedHeaders = {
    'Mount': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Mount', header, {
            width: 80
        }, (player, compare) => {
            var color = CompareEval.evaluate(player.Mount, header.color) || '';

            var displayValue = CompareEval.evaluate(player.Mount, header.value);
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(player, player.Mount) : undefined);

            if (displayValue != undefined) {
                return CellGenerator.Cell(displayValue, color, header.visible ? '' : color, last);
            } else {
                return CellGenerator.Cell(PLAYER_MOUNT[player.Mount] + ((header.percentage || header.extra) && player.Mount ? (header.extra || '%') : ''), color, header.visible ? '' : color, last);
            }
        }, (players, operation) => {
            var a = operation(players.map(p => p.player.Mount));

            var color = CompareEval.evaluate(a, header.color) || '';

            var displayValue = CompareEval.evaluate(a, header.value);
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(null, a) : undefined);

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
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(player, player.Achievements.Owned) : player.Achievements.Owned);

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
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(null, a) : a);

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
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(player, player.Fortress.Knights) : undefined);

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
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(null, a) : a);

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
            displayValue = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(player, player.LastOnline) : formatDate(player.LastOnline));

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
    constructor (... args) {
        super(... args);
    }

    add (player, latest, hidden) {
        super.push({ player: player, latest: latest, index: this.length, hidden: hidden });
    }
}

// Special array for statistics only
class StatisticsTableArray extends Array {
    constructor (... args) {
        super(... args);
    }

    add (player, compare) {
        super.push({ player: player, compare: compare || player, index: this.length });
    }
}

// Table generator
class Table {
    // Init
    constructor (settings) {
        this.root = settings.getRoot();

        this.config = [];

        this.root.c.forEach((category, ci, ca) => {
            var group = new HeaderGroup(category.name, category.name == 'Potions');
            var glast = ci == ca.length - 1;

            if (ReservedCategories[category.name]) {
                ReservedCategories[category.name](group, category, glast);
            } else {
                category.h.forEach((header, hi, ha) => {
                    var hlast = (!glast && hi == ha.length - 1) || header.border >= 2 || (hi != ha.length - 1 && (ha[hi + 1].border == 1 || ha[hi + 1].border == 3));

                    if (!header.expr && ReservedHeaders[header.name]) {
                        ReservedHeaders[header.name](group, header, hlast);
                    } else {
                        group.add((header.alias != undefined ? header.alias : header.name), header, {
                            width: 100
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
                            var value = displayValue != undefined ? (displayValue + (header.extra || '')) : (header.format ? header.format(player, value) : value);

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
                            var value = displayValue != undefined ? (displayValue + (header.extra || '')) : value;

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
    }

    addHeader (... groups) {
        groups.forEach(g => {
            if (g.headers.length) {
                this.config.push(g);
            }
        });
    }

    flatten () {
        return this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);
    }

    createHistoryTable (players) {
        this.nodiff = false;

        var flat = this.flatten();

        // Main body
        return [`
            <thead>
                <tr>
                    ${ this.root.indexed ? `<td style="width: 50px" colspan="1" rowspan="2">#</td>` : '' }
                    <td style="width: 200px" colspan="1" rowspan="2" class="border-right-thin">Date</td>
                    ${ join(this.config, (g, index, array) => `<td ${ g.name == 'Potions' ? `style="width:${ g.width }px"` : '' } colspan="${ g.length }" class="${ index != array.length -1 ? 'border-right-thin' : '' }" ${ g.empty ? 'rowspan="2"' : '' }>${ g.name }</td>`) }
                </tr>
                <tr>
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => g.empty ? '' : `<td width="${ h.width }" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                    <td class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ i + 1 }</td>` : '' }<td class="border-right-thin">${ formatDate(r[0]) }</td>${ join(flat, h => h.generators.cell(r[1], i != players.length - 1 ? players[i + 1][1] : r[1])) }</tr>`) }
            </tbody>
        `, 200 + this.config.reduce((a, b) => a + b.width, 0) + (this.root.indexed ? 50 : 0)];
    }

    createPlayersTable (players, sortby, sortstyle) {
        this.nodiff = true;

        // Flatten the headers
        var flat = this.flatten();

        // Sort players usign desired method
        if (sortstyle) {
            if (sortby == '_name') {
                if (sortstyle == 1) {
                    players.sort((a, b) => a.player.Name.localeCompare(b.player.Name));
                } else {
                    players.sort((a, b) => b.player.Name.localeCompare(a.player.Name));
                }
            } else if (sortby == '_index') {
                if (sortstyle == 1) {
                    players.sort((a, b) => a.index - b.index);
                } else {
                    players.sort((a, b) => b.index - a.index);
                }
            } else if (sortby == '_server') {
                if (sortstyle == 1) {
                    players.sort((a, b) => a.player.Prefix.localeCompare(b.player.Prefix));
                } else {
                    players.sort((a, b) => b.player.Prefix.localeCompare(a.player.Prefix));
                }
            } else if (sortby == '_potions') {
                if (sortstyle == 1) {
                    players.sort((a, b) => b.player.Potions.reduce((c, p) => c + p.Size, 0) - a.player.Potions.reduce((c, p) => c + p.Size, 0));
                } else {
                    players.sort((a, b) => a.player.Potions.reduce((c, p) => c + p.Size, 0) - b.player.Potions.reduce((c, p) => c + p.Size, 0));
                }
            } else {
                var sort = flat.find(h => h.sortkey == sortby);
                if (sort) {
                    if ((sortstyle == 1 && !sort.flip) || (sortstyle == 2 && sort.flip)) {
                        players.sort((a, b) => compareItems(sort.sort(a.player), sort.sort(b.player)));
                    } else if ((sortstyle == 2 && !sort.flip) || (sortstyle == 1 && sort.flip)) {
                        players.sort((a, b) => compareItems(sort.sort(b.player), sort.sort(a.player)));
                    }
                }
            }
        }

        // Add main body
        return [`
            <thead>
                <tr>
                    ${ this.root.indexed ? `<td style="width: 50px" colspan="1" rowspan="2" class="clickable" ${ this.root.indexed != 2 ? ` data-sortable="${ sortby == '_index' ? sortstyle : 0 }" data-sortable-key="_index"` : '' }>#</td>` : '' }
                    <td style="width: 100px" colspan="1" rowspan="2" class="clickable" data-sortable="${ sortby == '_server' ? sortstyle : 0 }" data-sortable-key="_server">Server</td>
                    <td style="width: 250px" colspan="1" rowspan="2" class="border-right-thin clickable" data-sortable="${ sortby == '_name' ? sortstyle : 0 }" data-sortable-key="_name">Name</td>
                    ${ join(this.config, (g, index, array) => `<td ${ g.name == 'Potions' ? `style="width:${ g.width }px"` : '' } colspan="${ g.length }" class="${ g.name == 'Potions' ? 'clickable' : '' } ${ index != array.length -1 ? 'border-right-thin' : '' }" ${ g.empty ? 'rowspan="2"' : '' } ${ g.name == 'Potions' ? `data-sortable-key="_potions" data-sortable="${ sortby == '_potions' ? sortstyle : 0 }"` : '' }>${ g.name }</td>`) }
                </tr>
                <tr>
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => g.empty ? '' : `<td width="${ h.width }" data-sortable="${ sortby == h.sortkey ? sortstyle : 0 }" data-sortable-key="${ h.sortkey }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td colspan="1" class="border-bottom-thick"></td>' : '' }
                    <td colspan="2" class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr class="${ r.hidden ? 'css-entry-hidden' : '' }">${ this.root.indexed ? `<td>${ (this.root.indexed == 1 ? r.index : i) + 1 }</td>` : '' }<td>${ r.player.Prefix }</td><td class="border-right-thin clickable ${ r.latest || !this.root.outdated ? '' : 'foreground-red' }" data-player="${ r.player.Identifier }" data-timestamp="${ r.player.Timestamp }">${ r.player.Identifier == 'w27_net_p268175' ? '<i class="chess queen icon"></i>' : '' }${ r.player.Name }</td>${ join(flat, h => h.generators.cell(r.player)) }</tr>`, 0, this.root.performance) }
            </tbody>
        `, 100 + 250 + this.config.reduce((a, b) => a + b.width, 0) + (this.root.indexed ? 50 : 0)];
    }

    createStatisticsTable (players, joined, kicked, sortby, sortstyle) {
        this.nodiff = false;

        // Flatten the headers
        var flat = this.flatten();

        // Sort players usign desired method
        if (sortstyle) {
            if (sortby == '_name') {
                if (sortstyle == 1) {
                    players.sort((a, b) => a.player.Name.localeCompare(b.player.Name));
                } else {
                    players.sort((a, b) => b.player.Name.localeCompare(a.player.Name));
                }
            } else if (sortby == '_index'){
                if (sortstyle == 1) {
                    players.sort((a, b) => a.index - b.index);
                } else {
                    players.sort((a, b) => b.index - a.index);
                }
            } else if (sortby == '_potions') {
                if (sortstyle == 1) {
                    players.sort((a, b) => b.player.Potions.reduce((c, p) => c + p.Size, 0) - a.player.Potions.reduce((c, p) => c + p.Size, 0));
                } else {
                    players.sort((a, b) => a.player.Potions.reduce((c, p) => c + p.Size, 0) - b.player.Potions.reduce((c, p) => c + p.Size, 0));
                }
            } else {
                var sort = flat.find(h => h.sortkey == sortby);
                if (sort) {
                    if ((sortstyle == 1 && !sort.flip) || (sortstyle == 2 && sort.flip)) {
                        players.sort((a, b) => compareItems(sort.sort(a.player), sort.sort(b.player)));
                    } else if ((sortstyle == 2 && !sort.flip) || (sortstyle == 1 && sort.flip)) {
                        players.sort((a, b) => compareItems(sort.sort(b.player), sort.sort(a.player)));
                    }
                }
            }
        }

        // Current width
        var cw = this.config.reduce((a, b) => a + b.width, 0);
        var w = (this.root.indexed ? 50 : 0) + 250 + Math.max(400, cw);

        // Add main body
        var content = `
            <thead>
                <tr>
                    ${ this.root.indexed ? `<td style="width: 50px" colspan="1" rowspan="2" class="clickable" ${ this.root.indexed != 2 ? ` data-sortable="${ sortby == '_index' ? sortstyle : 0 }" data-sortable-key="_index"` : '' }>#</td>` : '' }
                    <td style="width: 250px" colspan="1" rowspan="2" class="border-right-thin clickable" data-sortable="${ sortby == '_name' ? sortstyle : 0 }" data-sortable-key="_name">Name</td>
                    ${ join(this.config, (g, index, array) => `<td style="width:${ g.width }px" colspan="${ g.length }" class="${ g.name == 'Potions' ? 'clickable' : '' } ${ index != array.length -1 ? 'border-right-thin' : '' }" ${ g.empty ? 'rowspan="2"' : '' } ${ g.name == 'Potions' ? `data-sortable="${ sortby == '_potions' ? sortstyle : 0 }" data-sortable-key="_potions"` : '' }>${ g.name }</td>`) }
                    ${ cw < 400 || flat.length < 3 ? joinN(Math.max(1, 3 - flat.length), x => `<td style="width: ${ (400 - cw) / Math.max(1, 3 - flat.length) }px"></td>`) : '' }
                </tr>
                <tr>
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => g.empty ? '' : `<td width="${ h.width }" data-sortable="${ sortby == h.sortkey ? sortstyle : 0 }" data-sortable-key="${ h.sortkey }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td colspan="1" class="border-bottom-thick"></td>' : '' }
                    <td colspan="1" class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ (this.root.indexed == 1 ? r.index : i) + 1 }</td>` : '' }<td class="border-right-thin clickable" data-player="${ r.player.Identifier }">${ r.player.Identifier == 'w27_net_p268175' ? '<i class="chess queen icon"></i>' : '' }${ r.player.Name }</td>${ join(flat, h => h.generators.cell(r.player, r.compare)) }</tr>`) }
        `;

        // Add statistics
        var showMembers = this.root.members;
        var showStatistics = flat.reduce((c, h) => c + (h.statistics ? 1 : 0), 0) > 0;

        if (showMembers || showStatistics) {
            content += `
                <tr><td colspan="${ flat.length + 1 + (this.root.indexed ? 1 : 0) }"></td></tr>
            `;
        }

        if (showStatistics) {
            content += `
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }></td>
                    ${ join(flat, (h, i) => (h.statistics && h.generators.statistics) ? `<td>${ h.name }</td>` : '<td></td>') }
                </tr>
                <tr>
                    <td class="border-right-thin border-bottom-thick" ${ this.root.indexed ? 'colspan="2"' : '' }></td>
                    <td class="border-bottom-thick" colspan="${ flat.length }"></td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Minimum</td>
                    ${ join(flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(players, ar => Math.min(... ar)) : '<td></td>') }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Average</td>
                    ${ join(flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(players, ar => Math.trunc(ar.reduce((a, b) => a + b, 0) / ar.length)) : '<td></td>') }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Maximum</td>
                    ${ join(flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(players, ar => Math.max(... ar)) : '<td></td>') }
                </tr>
            `;
        }

        if (showMembers) {
            var classes = players.reduce((c, p) => { c[p.player.Class - 1]++; return c; }, [0, 0, 0, 0, 0, 0]);

            if (showStatistics) {
                content += `
                    <tr>
                        <td class="border-right-thin border-bottom-thick" ${ this.root.indexed ? 'colspan="2"' : '' }></td>
                        <td class="border-bottom-thick" colspan="${ flat.length }"></td>
                    </tr>
                `;
            }

            var widskip = 1;
            for (var i = 0, wid = 60; wid > 0 && i < flat.length; i++) {
                wid -= flat[i].width;
                if (wid > 0) {
                    widskip++;
                } else {
                    break;
                }
            }

            content += `
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Warrior</td>
                    <td colspan="${ widskip }">${ classes[0] }</td>
                    ${ joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="1">Joined</td>
                        <td colspan="${ Math.max(1, flat.length - 1 - widskip) }" rowspan="3">${ joined.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Mage</td>
                    <td colspan="${ widskip }">${ classes[1] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Scout</td>
                    <td colspan="${ widskip }">${ classes[2] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Assassin</td>
                    <td colspan="${ widskip }">${ classes[3] }</td>
                    ${ kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="1">Left</td>
                        <td colspan="${ Math.max(1, flat.length - 1 - widskip) }" rowspan="3">${ kicked.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Battle Mage</td>
                    <td colspan="${ widskip }">${ classes[4] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Berserker</td>
                    <td colspan="${ widskip }">${ classes[5] }</td>
                </tr>
            `;
        }

        return [content + '</tbody>', w];
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

// Settings
class Settings {
    static save (settings, identifier) {
        Preferences.set(identifier ? `settings/${ identifier }` : 'settings', settings);
    }

    static remove (identifier) {
        Preferences.remove(identifier ? `settings/${ identifier }` : 'settings');
    }

    static exists (identifier) {
        return Preferences.exists(identifier ? `settings/${ identifier }` : 'settings');
    }

    static empty () {
        var settings = new Settings();

        settings.code = '';
        settings.root = SettingsParser.parse('');

        return settings;
    }

    static load (identifier) {
        var settings = new Settings();

        settings.code = Preferences.get(`settings/${ identifier }`, Preferences.get('settings', DEFAULT_SETTINGS));
        settings.root = SettingsParser.parse(settings.code);

        return settings;
    }

    getRoot () {
        return this.root;
    }

    getCode () {
        return this.code;
    }

    getEntry (name) {
        for (var i = 0, c; c = this.root.c[i]; i++) {
            if (c.name == name && ReservedCategories[c.name]) return c;
            else if (!c.h) continue;
            else for (var j = 0, h; h = c.h[j]; j++) if (h.name == name) return h;
        }
        return null;
    }

    getEntrySafe (name) {
        return this.getEntry(name) || {};
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
}

const SP_KEYWORD_INTERNAL = {
    'undefined': undefined,
    'null': null
};

const SP_KEYWORD_MAPPING = {
    'ID': {
        expr: p => p.ID
    },
    'Role': {
        expr: p => p.Group.Role,
        flip: true,
        format: (p, x) => p.hasGuild() ? '?' : GROUP_ROLES[cell.Group.Role]
    },
    'Level': {
        expr: p => p.Level
    },
    'Guild': {
        expr: p => p.Group.Name || ''
    },
    'Strength': {
        expr: p => p.Strength.Total
    },
    'Dexterity': {
        expr: p => p.Dexterity.Total
    },
    'Intelligence': {
        expr: p => p.Intelligence.Total
    },
    'Constitution': {
        expr: p => p.Constitution.Total
    },
    'Luck': {
        expr: p => p.Luck.Total
    },
    'Attribute': {
        expr: p => p.Primary.Total
    },
    'Strength Bonus': {
        expr: p => p.Strength.Bonus,
        alias: 'Str Bonus'
    },
    'Dexterity Bonus': {
        expr: p => p.Dexterity.Bonus,
        alias: 'Dex Bonus'
    },
    'Intelligence Bonus': {
        expr: p => p.Intelligence.Bonus,
        alias: 'Int Bonus'
    },
    'Constitution Bonus': {
        expr: p => p.Constitution.Bonus,
        alias: 'Con Bonus'
    },
    'Luck Bonus': {
        expr: p => p.Luck.Bonus,
        alias: 'Lck Bonus'
    },
    'Bonus': {
        expr: p => p.Primary.Bonus
    },
    'Base Strength': {
        expr: p => p.Strength.Base
    },
    'Base Dexterity': {
        expr: p => p.Dexterity.Base
    },
    'Base Intelligence': {
        expr: p => p.Intelligence.Base
    },
    'Base Constitution': {
        expr: p => p.Constitution.Base
    },
    'Base Luck': {
        expr: p => p.Luck.Base
    },
    'Base': {
        expr: p => p.Primary.Base
    },
    'Honor': {
        expr: p => p.Honor
    },
    'Runes': {
        expr: p => p.Runes.Runes,
        format: (p, x) => `e${ x }`,
        width: 100
    },
    'Action Index': {
        expr: p => p.Action.Index
    },
    'Status': {
        expr: p => p.Action.Status,
        format: (p, x) => PLAYER_ACTIONS[Math.max(0, x)]
    },
    'Action Finish': {
        expr: p => p.Action.Finish,
        format: (p, x) => x < 0 ? formatDate(x) : ''
    },
    'Health': {
        expr: p => p.Health
    },
    'Armor': {
        expr: p => p.Armor
    },
    'Space': {
        expr: p => 5 + p.Fortress.Treasury
    },
    'Mirror': {
        expr: p => p.Mirror ? 13 : p.MirrorPieces
    },
    'Equipment': {
        expr: p => Object.values(p.Items).reduce((c, i) => c + (i.Attributes[0] > 0 ? i.getItemLevel() : 0), 0),
        width: 130
    },
    'Treasure': {
        expr: p => p.Group.Treasure
    },
    'Intructor': {
        expr: p => p.Group.Intructor
    },
    'Pet': {
        expr: p => p.Group.Pet
    },
    'Tower': {
        expr: p => p.Dungeons.Tower
    },
    'Portal': {
        expr: p => p.Dungeons.Player
    },
    'Guild Portal': {
        expr: p => p.Dungeons.Group,
        width: 130
    },
    'Twister': {
        expr: p => p.Dungeons.Twister
    },
    'Dungeon': {
        expr: p => p.Dungeons.Normal.Total
    },
    'Shadow Dungeon': {
        expr: p => p.Dungeons.Shadow.Total
    },
    'Fortress': {
        expr: p => p.Fortress.Fortress
    },
    'Upgrades': {
        expr: p => p.Fortress.Upgrades
    },
    'Gem Mine': {
        expr: p => p.Fortress.GemMine
    },
    'Fortress Honor': {
        expr: p => p.Fortress.Honor,
        width: 130
    },
    'Wall': {
        expr: p => p.Fortress.Fortifications
    },
    'Quarters': {
        expr: p => p.Fortress.LaborerQuarters
    },
    'Woodcutter': {
        expr: p => p.Fortress.WoodcutterGuild
    },
    'Quarry': {
        expr: p => p.Fortress.Quarry
    },
    'Academy': {
        expr: p => p.Fortress.Academy
    },
    'Archery Guild': {
        expr: p => p.Fortress.ArcheryGuild
    },
    'Barracks': {
        expr: p => p.Fortress.Barracks
    },
    'Mage Tower': {
        expr: p => p.Fortress.MageTower
    },
    'Treasury': {
        expr: p => p.Fortress.Treasury
    },
    'Smithy': {
        expr: p => p.Fortress.Smithy
    },
    'Wood': {
        expr: p => p.Fortress.Wood
    },
    'Stone': {
        expr: p => p.Fortress.Stone
    },
    'Raid Wood': {
        expr: p => p.Fortress.RaidWood
    },
    'Raid Stone': {
        expr: p => p.Fortress.RaidStone
    },
    'Shadow': {
        expr: p => p.Pets.Shadow
    },
    'Light': {
        expr: p => p.Pets.Light
    },
    'Earth': {
        expr: p => p.Pets.Earth
    },
    'Fire': {
        expr: p => p.Pets.Fire
    },
    'Water': {
        expr: p => p.Pets.Water
    },
    'Rune Gold': {
        expr: p => p.Runes.Gold
    },
    'Rune XP': {
        expr: p => p.Runes.XP
    },
    'Rune Chance': {
        expr: p => p.Runes.Chance
    },
    'Rune Quality': {
        expr: p => p.Runes.Quality
    },
    'Rune Health': {
        expr: p => p.Runes.Health,
        width: 120
    },
    'Rune Damage': {
        expr: p => p.Runes.Damage,
        width: 110
    },
    'Rune Resist': {
        expr: p => p.Runes.Resistance,
        width: 110
    },
    'Fire Resist': {
        expr: p => p.Runes.ResistanceFire,
        width: 110
    },
    'Cold Resist': {
        expr: p => p.Runes.ResistanceCold,
        width: 110
    },
    'Lightning Resist': {
        expr: p => p.Runes.ResistanceLightning,
        width: 110
    },
    'Fire Damage': {
        expr: p => p.Runes.DamageFire,
        width: 110
    },
    'Cold Damage': {
        expr: p => p.Runes.DamageCold,
        width: 110
    },
    'Lightning Damage': {
        expr: p => p.Runes.DamageLightning,
        width: 110
    },
    'Class': {
        expr: p => p.Class,
        format: (p, x) => PLAYER_CLASS[x]
    },
    'Rank': {
        expr: p => p.Rank,
        flip: true
    },
    'Mount': {
        expr: p => p.Mount
    },
    'Awards': {
        expr: p => p.Achievements.Owned
    },
    'Album': {
        expr: p => p.Book
    },
    'Knights': {
        expr: p => p.Fortress.Knights
    },
    'Fortress Rank': {
        expr: p => p.Fortress.Rank
    },
    'Building': {
        expr: p => p.Fortress.Upgrade.Building,
        width: 180,
        format: (p, x) => FORTRESS_BUILDINGS[x]
    },
    'Last Active': {
        expr: p => p.LastOnline,
    },
    'Timestamp': {
        expr: p => p.Timestamp,
        format: (p, x) => formatDate(x)
    },
    'Guild Joined': {
        expr: p => p.Group.Joined,
        format: (p, x) => p.hasGuild() ? formatDate(x) : ''
    },
    'Aura': {
        expr: p => p.Toilet.Aura
    },
    'Gladiator': {
        expr: p => p.Fortress.Gladiator,
        format: (p, x) => (x == 0 ? '' : (x == 1 ? '1+' : (x == 5 ? '5+' : (x == 10 ? '10+' : 15))))
    }
};

const AST_OPERATORS = {
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '==': (a, b) => a == b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '||': (a, b) => a || b,
    '&&': (a, b) => a && b,
    '?': (a, b, c) => a ? b : c,
    'u-': (a) => -a,
    's': (a) => a
};

const AST_FUNCTIONS = {
    'trunc': (a) => Math.trunc(a),
    'ceil': (a) => Math.ceil(a),
    'floor': (a) => Math.floor(a),
    'datetime': (a) => formatDate(a),
    'number': (a) => Number.isInteger(a) ? a : a.toFixed(2),
    'duration': (a) => formatDuration(a),
    'date': (a) => formatDateOnly(a),
    'fnumber': (a) => formatAsSpacedNumber(a),
    'small': (a) => CellGenerator.Small(a)
};

const AST_FUNCTIONS_VAR = {
    'min': (a) => Math.min(... a),
    'max': (a) => Math.max(... a)
};

class AST {
    constructor (string) {
        this.tokens = string.split(/(\"[^\"]*\"|\|\||\&\&|\>\=|\<\=|\=\=|\(|\)|\+|\-|\/|\*|\>|\<|\?|\:|\,)/).map(token => token.trim()).filter(token => token.length);
        this.root = this.evalExpression();
        if (SettingsParser.debug) {
            console.info(`[ EXPRESSION ]\nInput: ${ string }\nOutput: ${ this.toString() }\nErrors: ${ this.tokens.length }`);
        }
    }

    peek (i) {
        return this.tokens[i || 0];
    }

    get () {
        var v = this.tokens.shift();
        return isNaN(v) ? v : Number(v);
    }

    getRoot () {
        return this.root;
    }

    getVal () {
        var val = this.get();
        if (val[0] == '"') {
            return {
                a: val.slice(1, val.length - 1),
                op: AST_OPERATORS['s'],
                noeval: true
            }
        } else if (val == '-') {
            var v;
            if (this.peek() == '(') {
                v = this.evalBracketExpression();
            } else if (AST_FUNCTIONS[this.peek()] || AST_FUNCTIONS_VAR[this.peek()]) {
                v = this.getVal();
            } else {
                v = this.get();
            }

            return {
                a: v,
                op: AST_OPERATORS['u-']
            };
        } else if (AST_FUNCTIONS[val]) {
            return {
                a: this.evalBracketExpression(),
                op: AST_FUNCTIONS[val]
            };
        } else if (AST_FUNCTIONS_VAR[val]) {
            var a = [];
            this.get();

            a.push(this.evalExpression());
            while ([','].includes(this.peek())) {
                this.get();

                if (this.peek() == '(') {
                    a.push(this.evalBracketExpression());
                } else {
                    a.push(this.evalExpression());
                }
            }

            this.get();
            return {
                a: a,
                op: AST_FUNCTIONS_VAR[val]
            };
        } else {
            return val;
        }
    }

    evalBracketExpression () {
        this.get();
        var v = this.evalExpression();
        this.get();
        return v;
    }

    evalRankedExpression () {
        var left, right, op;
        if (this.peek() == '(') {
            left = this.evalBracketExpression();
        } else {
            left = this.getVal();
        }

        while (['*', '/'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.getVal();
            }

            left = {
                a: left,
                b: right,
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalSimpleExpression () {
        var left, right, op;

        left = this.evalRankedExpression();

        while (['+', '-'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalRankedExpression();
            }

            left = {
                a: left,
                b: right,
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalBoolExpression () {
        var left, right, op;

        left = this.evalSimpleExpression();

        while (['>', '<', '<=', '>=', '=='].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalSimpleExpression();
            }

            left = {
                a: left,
                b: right,
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalBoolMergeExpression () {
        var left, right, op;

        left = this.evalBoolExpression();

        while (['||', '&&'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalBoolExpression();
            }

            left = {
                a: left,
                b: right,
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalExpression () {
        var left, tr, fl;

        left = this.evalBoolMergeExpression();

        if (this.peek() == '?') {
            this.get();

            if (this.peek() == '(') {
                tr = this.evalBracketExpression();
            } else {
                tr = this.evalBoolMergeExpression();
            }

            if (this.peek() == ':') {
                this.get();

                if (this.peek() == '(') {
                    fl = this.evalBracketExpression();
                } else {
                    fl = this.evalBoolMergeExpression();
                }

                left = {
                    a: left,
                    b: tr,
                    c: fl,
                    op: AST_OPERATORS['?']
                }
            }
        }

        return left;
    }

    isValid () {
        return this.tokens.length == 0;
    }

    toString (node = this.root) {
        if (typeof(node) == 'object') {
            if (node.c != undefined) {
                return `?(${ this.toString(node.a) }, ${ this.toString(node.b) }, ${ this.toString(node.c) })`;
            } else if (node.b != undefined) {
                return `${ node.op.name }(${ this.toString(node.a) }, ${ this.toString(node.b) })`;
            } else if (node.a != undefined && Array.isArray(node.a)) {
                return `${ node.op.name }(${ node.a.map(x => this.toString(x)).join(', ') })`
            } else if (node.a != undefined) {
                return `${ node.op.name }(${ this.toString(node.a) })`;
            } else {
                return `${ node.op.name }()`
            }
        } else {
            return `${ node }`;
        }
    }

    eval (p, node = this.root) {
        if (typeof(node) == 'object') {
            if (node.noeval) return node.a;
            else if (node.c != undefined) {
                return node.op(this.eval(p, node.a), this.eval(p, node.b), this.eval(p, node.c));
            } else if (node.b != undefined) {
                return node.op(this.eval(p, node.a), this.eval(p, node.b));
            } else if (node.a != undefined && Array.isArray(node.a)) {
                return node.op(node.a.map(x => this.eval(p, x)));
            } else if (node.a != undefined) {
                return node.op(this.eval(p, node.a));
            } else {
                return node.op();
            }
        } else if (typeof(node) == 'string') {
            if (node[0] == '@') {
                return SettingsConstants[node.slice(1)]
            } else if (SP_KEYWORD_INTERNAL[node]) {
                return SP_KEYWORD_INTERNAL[node];
            } else if (SP_KEYWORD_MAPPING[node]) {
                return SP_KEYWORD_MAPPING[node].expr(p);
            } else if (SettingsParser.root.vars[node]) {
                return SettingsParser.root.vars[node](p);
            } else {
                return getObjectAt(p, node);
            }
        } else {
            return node;
        }
    }

    eval2 (p, arg, node = this.root) {
        if (typeof(node) == 'object') {
            if (node.noeval) return node.a;
            else if (node.c != undefined) {
                return node.op(this.eval2(p, arg, node.a), this.eval2(p, arg, node.b), this.eval2(p, arg, node.c));
            } else if (node.b != undefined) {
                return node.op(this.eval2(p, arg, node.a), this.eval2(p, arg, node.b));
            } else if (node.a != undefined && Array.isArray(node.a)) {
                return node.op(node.a.map(x => this.eval2(p, arg, arg, x)));
            } else if (node.a != undefined) {
                return node.op(this.eval2(p, arg, node.a));
            } else {
                return node.op();
            }
        } else if (typeof(node) == 'string') {
            if (node == 'this') {
                return arg;
            } else if (node[0] == '@') {
                return SettingsConstants[node.slice(1)]
            } else if (SP_KEYWORD_INTERNAL[node]) {
                return SP_KEYWORD_INTERNAL[node];
            } else if (SP_KEYWORD_MAPPING[node] && p) {
                return SP_KEYWORD_MAPPING[node].expr(p);
            } else if (SettingsParser.root.vars[node]) {
                return SettingsParser.root.vars[node](p);
            } else {
                return getObjectAt(p, node);
            }
        } else {
            return node;
        }
    }
}

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

const ARG_FORMATTERS = {
    'number': (p, x) => Number.isInteger(x) ? x : x.toFixed(2),
    'fnumber': (p, x) => formatAsSpacedNumber(x),
    'date': (p, x) => formatDate(x),
    'duration': (p, x) => formatDuration(x),
    'default': (p, x) => typeof(x) == 'string' ? x : (isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)))
}

const SFormat = {
    Normal: string => string.replace(/ /g, '&nbsp;'),
    Keyword: string => `<span class="ta-keyword">${ string.replace(/ /g, '&nbsp;') }</span>`,
    Color: (string, color = string) => `<span class="ta-color" style="color: ${ color };">${ string.replace(/ /g, '&nbsp;') }</span>`,
    Comment: string => `<span class="ta-comment">${ string.replace(/ /g, '&nbsp;') }</span>`,
    Constant: string => `<span class="ta-constant">${ string.replace(/ /g, '&nbsp;') }</span>`,
    Reserved: string => `<span class="ta-reserved">${ string.replace(/ /g, '&nbsp;') }</span>`,
    Error: string => `<span class="ta-error">${ string.replace(/ /g, '&nbsp;') }</span>`,
    Bool: (string, bool = string) => `<span class="ta-boolean-${ bool }">${ string.replace(/ /g, '&nbsp;') }</span>`
};

const SettingsCommands = [
    // Global
    // var - Create a variable
    new SettingsCommand(/^(set) (\w+[\w ]*) as (.+)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new AST(a);
        if (ast.isValid()) {
            root.setVariable(name, player => ast.eval(player));
        }
    }, function (string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ SFormat.Normal(a) }`;
    }),
    // Global
    // debug - Show debug information about settings in the console
    new SettingsCommand(/^(debug) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.enableDebug(ARG_MAP[a]);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    // Create new category
    new SettingsCommand(/^(category) (\w+[\w ]*)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createCategory(a);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ ReservedCategories[a] ? SFormat.Reserved(a) : SFormat.Normal(a) }`;
    }),
    // Create new header
    new SettingsCommand(/^(header) (\w+[\w ]*)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.createHeader(a);
    }, function (string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ (SP_KEYWORD_MAPPING[a] || ReservedHeaders[a]) ? SFormat.Reserved(a) : SFormat.Normal(a) }`;
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

        if (Constants.IsConstant(prefix, value) && !isNaN(val)) {
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
                    return ast.eval2(player, val);
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

        if (Constants.IsConstant(prefix, value)) {
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
            root.setLocalVariable(key, player => {
                var value = ast.eval(player);
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

        if (Constants.IsConstant(prefix, value)) {
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

        if (Constants.IsConstant(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    // Local
    // value - Add value based on condition
    new SettingsCommand(/^(value) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(\w+)) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = Constants.GetValue(rprefix, rvalue);
        var val = Constants.GetValue(prefix, value);

        if (reference != undefined && val != undefined && !isNaN(reference)) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], reference, val);
        }
    }, function (string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);

        if (Constants.IsConstant(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (Constants.IsConstant(prefix, value)) {
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
    new SettingsCommand(/^(color) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(\w+)) ((@?)(\w+))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = Constants.GetValue(rprefix, rvalue);
        var val = getCSSColor(Constants.GetValue(prefix, value));

        if (reference != undefined && val != undefined && !isNaN(reference) && val) {
            root.setLocalArrayVariable(key, ARG_MAP[condition], reference, val);
        }
    }, function (string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(Constants.GetValue(prefix, value));

        if (Constants.IsConstant(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (Constants.IsConstant(prefix, value) && val) {
            arg = SFormat.Constant(arg);
        } else if (prefix == '@' || !val) {
            arg = SFormat.Error(arg);
        } else {
            arg = SFormat.Color(arg, val);
        }

        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ rarg } ${ arg }`;
    })
];

const SettingsConstants = {
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
};

const Constants = {
    GetValue: function (tag, key) {
        return tag == '@' ? SettingsConstants[key] : key;
    },
    IsConstant: function (tag, key) {
        return tag == '@' && SettingsConstants[key] != undefined;
    }
}

const SettingsParser = new (class {
    enableDebug (enable) {
        this.debug = enable;
    }

    format (string) {
        var content = '';
        for (var line of string.split('\n')) {
            var comment = undefined;
            if (line.indexOf('#') != -1) {
                [line, comment] = line.split('#');
            }

            var trimmed = line.trim();
            var spaces = line.match(/\s+$/);

            var command = SettingsCommands.find(command => command.isValid(trimmed));
            if (command) {
                content += command.format(trimmed);
            } else {
                content += SFormat.Error(trimmed);
            }

            if (spaces) {
                content += spaces[0].replace(/ /g, '&nbsp;');
            }

            if (comment != undefined) {
                content += SFormat.Comment(`#${ comment }`);
            }

            content += '</br>';
        }

        return content;
    }

    parse (string) {
        this.clear();
        if (SettingsParser.debug) {
            console.clear();
        }

        for (var line of string.split('\n')) {
            if (line.indexOf('#') != -1) {
                [ line ] = line.split('#');
            }

            var trimmed = line.trim();

            var command = SettingsCommands.find(command => command.isValid(trimmed));
            if (command) {
                command.parse(this, trimmed);
            } else {
                if (line != '' && SettingsParser.debug) {
                    console.warn(`[ INVALID OPTION ]\nLine: ${ line }\n`);
                }
            }
        }

        this.pushCategory();

        return this.root;
    }

    clear () {
        this.debug = false;
        this.root = {
            c: [],
            vars: {},
            outdated: true
        };

        this.currentCategory = null;
        this.currentHeader = null;

        this.globals = {};
        this.shared = {};
        this.categoryShared = {
            visible: true
        };
    }

    setVariable (name, ast) {
        this.root.vars[name] = ast;
    }

    createHeader (name) {
        this.pushHeader();
        this.currentHeader = {
            name: name
        };
    }

    pushHeader () {
        if (this.currentCategory && this.currentHeader) {
            var reserved = ReservedHeaders[this.currentHeader.name];
            var mapping = SP_KEYWORD_MAPPING[this.currentHeader.name];

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

    createCategory (name) {
        this.pushCategory();

        this.categoryShared = {
            visible: true
        };

        this.currentCategory = {
            name: name,
            h: []
        };
    }

    pushCategory () {
        if (this.currentCategory) {
            this.pushHeader();

            if (ReservedCategories[this.currentCategory.name]) {
                merge(this.currentCategory, this.shared);
            }

            this.root.c.push(this.currentCategory);
        }

        this.currentCategory = null;
    }

    setGlobalVariable (key, value) {
        this.root[key] = value;
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

            object[key].push([ condition, reference, value ]);
        }
    }
})();

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
