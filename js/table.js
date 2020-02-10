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
            sort: sort
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
        }, cell => {
            var potion = cell.player.Potions[0].Size;
            var color = CompareEval.evaluate(potion, category.color);
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, player => player.Potions[0].Size);

        // Potion 2
        group.add('', category, {
            width: 33
        }, cell => {
            var potion = cell.player.Potions[1].Size;
            var color = CompareEval.evaluate(potion, category.color);
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, player => player.Potions[1].Size);

        // Potion 3
        group.add('', category, {
            width: 33
        }, cell => {
            var potion = cell.player.Potions[2].Size;
            var color = CompareEval.evaluate(potion, category.color);
            return CellGenerator.Cell(potion, color, category.visible ? '' : color, !last);
        }, null, player => player.Potions[2].Size);
    }
};

const ReservedHeaders = {
    'Class': function (group, header, last) {
        group.add('Class', header, {
            width: 120,
            flip: true
        }, cell => {
            return CellGenerator.Cell(PLAYER_CLASS[cell.player.Class], '', '', last);
        }, null, player => player.Class);
    },
    'ID': function (group, header, last) {
        group.add('ID', header, {
            width: 100,
        }, cell => {
            return CellGenerator.Cell(cell.player.ID, '', '', last);
        }, null, player => player.ID);
    },
    'Rank': function (group, header, last) {
        group.add('Rank', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(cell.player.Rank + (header.difference ? CellGenerator.Difference(cell.compare.Rank - cell.player.Rank, header.brackets) : ''), CompareEval.evaluate(cell.player.Rank, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Rank));
            var b = cell.operation(cell.players.map(p => p.compare.Rank));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(b - a, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Rank);
    },
    'Role': function (group, header, last) {
        group.add('Role', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(GROUP_ROLES[cell.player.Group.Role], '', '', last);
        }, null, player => player.Group.Role);
    },
    'Level': function (group, header, last) {
        group.add('Level', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Level + (header.difference ? CellGenerator.Difference(cell.player.Level - cell.compare.Level, header.brackets) : ''), CompareEval.evaluate(cell.player.Level, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Level));
            var b = cell.operation(cell.players.map(p => p.compare.Level));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Level);
    },
    'Mount': function (group, header, last) {
        group.add('Mount', header, {
            width: 80
        }, cell => {
            return CellGenerator.Cell(PLAYER_MOUNT[cell.player.Mount] + (header.percentage && cell.player.Mount ? '%' : ''), CompareEval.evaluate(cell.player.Mount, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Mount));
            var b = cell.operation(cell.players.map(p => p.compare.Mount));
            return CellGenerator.Cell(PLAYER_MOUNT[a] + (header.percentage && a ? '%' : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Mount);
    },
    'Awards': function (group, header, last) {
        group.add('Awards', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Achievements.Owned + (header.hydra && cell.player.Achievements.Dehydration ? CellGenerator.Small(' H') : '') + (header.difference ? CellGenerator.Difference(cell.player.Achievements.Owned - cell.compare.Achievements.Owned, header.brackets) : ''), CompareEval.evaluate(cell.player.Achievements.Owned, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Achievements.Owned));
            var b = cell.operation(cell.players.map(p => p.compare.Achievements.Owned));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Achievements.Owned);
    },
    'Album': function (group, header, last) {
        group.add('Album', header, {
            width: 130
        }, cell => {
            var color = CompareEval.evaluate(100 * cell.player.Book / SCRAPBOOK_COUNT, header.color);
            if (header.percentage) {
                return CellGenerator.Cell((100 * cell.player.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.difference ? CellGenerator.Difference((100 * (cell.player.Book - cell.compare.Book) / SCRAPBOOK_COUNT).toFixed(2), header.brackets) : ''), color, '', last);
            } else {
                return CellGenerator.Cell(cell.player.Book + (header.difference ? CellGenerator.Difference(cell.player.Book - cell.compare.Book, header.brackets) : ''), color, '', last);
            }
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Book));
            var b = cell.operation(cell.players.map(p => p.compare.Book));
            var color = CompareEval.evaluate(100 * a / SCRAPBOOK_COUNT, header.color);
            if (header.percentage) {
                return CellGenerator.Cell((100 * a / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.difference ? CellGenerator.Difference((100 * (a - b) / SCRAPBOOK_COUNT).toFixed(2), header.brackets) : ''), '', color, false);
            } else {
                return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', color, false);
            }
        }, player => player.Book);
    },
    'Treasure': function (group, header, last) {
        group.add('Treasure', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Group.Treasure + (header.difference ? CellGenerator.Difference(cell.player.Group.Treasure - cell.compare.Group.Treasure, header.brackets) : ''), CompareEval.evaluate(cell.player.Group.Treasure, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Group.Treasure));
            var b = cell.operation(cell.players.map(p => p.compare.Group.Treasure));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Group.Treasure);
    },
    'Instructor': function (group, header, last) {
        group.add('Instructor', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Group.Instructor + (header.difference ? CellGenerator.Difference(cell.player.Group.Instructor - cell.compare.Group.Instructor, header.brackets) : ''), CompareEval.evaluate(cell.player.Group.Instructor, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Group.Instructor));
            var b = cell.operation(cell.players.map(p => p.compare.Group.Instructor));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Group.Instructor);
    },
    'Pet': function (group, header, last) {
        group.add('Pet', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Group.Pet + (header.difference ? CellGenerator.Difference(cell.player.Group.Pet - cell.compare.Group.Pet, header.brackets) : ''), CompareEval.evaluate(cell.player.Group.Pet, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Group.Pet));
            var b = cell.operation(cell.players.map(p => p.compare.Group.Pet));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Group.Pet);
    },
    'Knights': function (group, header, last) {
        group.add('Knights', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Knights + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : '') + (header.difference ? CellGenerator.Difference(cell.player.Fortress.Knights - cell.compare.Fortress.Knights, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Knights, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Knights));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Knights));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Fortress.Knights);
    },
    'Gem Mine': function (group, header, last) {
        group.add('Gem Mine', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.GemMine + (header.difference ? CellGenerator.Difference(cell.player.Fortress.GemMine - cell.compare.Fortress.GemMine, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.GemMine, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.GemMine));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.GemMine));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Fortress.GemMine);
    },
    'Fortress': function (group, header, last) {
        group.add('Fortress', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Fortress + (header.difference ? CellGenerator.Difference(cell.player.Fortress.Fortress - cell.compare.Fortress.Fortress, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Fortress, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Fortress));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Fortress));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Fortress.Fortress);
    },
    'Honor': function (group, header, last) {
        group.add('Honor', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Honor + (header.difference ? CellGenerator.Difference(cell.player.Honor - cell.compare.Honor, header.brackets) : ''), CompareEval.evaluate(cell.player.Honor, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Honor));
            var b = cell.operation(cell.players.map(p => p.compare.Honor));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Honor);
    },
    'Fortress Honor': function (group, header, last) {
        group.add('Fortress Honor', header, {
            width: 150
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Honor + (header.difference ? CellGenerator.Difference(cell.player.Fortress.Honor - cell.compare.Fortress.Honor, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Honor, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Honor));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Honor));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Fortress.Honor);
    },
    'Fortress Rank': function (group, header, last) {
        group.add('Fortress Rank', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Rank + (header.difference ? CellGenerator.Difference(cell.compare.Fortress.Rank - cell.player.Fortress.Rank, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Rank, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Rank));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Rank));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(b - a, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Fortress.Rank);
    },
    'Upgrades': function (group, header, last) {
        group.add('Upgrades', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Upgrades + (header.difference ? CellGenerator.Difference(cell.player.Fortress.Upgrades - cell.compare.Fortress.Upgrades, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Upgrades, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Upgrades));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Upgrades));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Fortress.Upgrades);
    },
    'Tower': function (group, header, last) {
        group.add('Tower', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Dungeons.Tower + (header.difference ? CellGenerator.Difference(cell.player.Dungeons.Tower - cell.compare.Dungeons.Tower, header.brackets) : ''), CompareEval.evaluate(cell.player.Dungeons.Tower, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Dungeons.Tower));
            var b = cell.operation(cell.players.map(p => p.compare.Dungeons.Tower));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Dungeons.Tower);
    },
    'Portal': function (group, header, last) {
        group.add('Portal', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Dungeons.Player + (header.difference ? CellGenerator.Difference(cell.player.Dungeons.Player - cell.compare.Dungeons.Player, header.brackets) : ''), CompareEval.evaluate(cell.player.Dungeons.Player, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Dungeons.Player));
            var b = cell.operation(cell.players.map(p => p.compare.Dungeons.Player));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, player => player.Dungeons.Player);
    },
    'Building': function (group, header, last) {
        group.add('Building', header, {
            width: 180,
        }, cell => {
            return CellGenerator.Cell(FORTRESS_BUILDINGS[cell.player.Fortress.Upgrade.Building], CompareEval.evaluate(cell.player.Fortress.Upgrade.Building, header.color), '', last);
        }, null, player => player.Fortress.Upgrade.Building == 0 ? -1 : (12 - player.Fortress.Upgrade.Building));
    },
    'Last Active': function (group, header, last) {
        group.add('Last Active', header, {
            width: 160,
        }, cell => {
            var a = cell.player.getInactiveDuration();
            return CellGenerator.Cell(CompareEval.evaluate(a, header.value) || formatDate(cell.player.LastOnline), CompareEval.evaluate(a, header.color), '', last);
        }, null, player => player.LastOnline);
    },
    'Equipment': function (group, header, last) {
        group.add('Equipment', header, {
            width: 130
        }, cell => {
            var a = Object.values(cell.player.Items).reduce((total, i) => total + i.getItemLevel(), 0);
            var b = Object.values(cell.compare.Items).reduce((total, i) => total + i.getItemLevel(), 0);

            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), CompareEval.evaluate(a, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => Object.values(p.player.Items).reduce((total, i) => total + i.getItemLevel(), 0)));
            var b = cell.operation(cell.players.map(p => Object.values(p.compare.Items).reduce((total, i) => total + i.getItemLevel(), 0)));

            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color), last);
        }, player => Object.values(player.Items).reduce((total, i) => total + i.getItemLevel(), 0));
    }
};

// Helper function
function merge (a, b) {
    for (var [k, v] of Object.entries(b)) {
        if (!a.hasOwnProperty(k) && typeof(v) != 'object') a[k] = b[k];
    }
    return a;
}

// Table generator
class Table {
    // Init
    constructor (settings) {
        this.root = settings.getRoot();

        this.config = [];
        this.players = [];

        this.root.c.forEach((category, ci, ca) => {
            var group = new HeaderGroup(category.name, category.name == 'Potions');
            var glast = ci == ca.length - 1;

            if (ReservedCategories[category.name]) {
                ReservedCategories[category.name](group, category, glast);
            } else {
                category.h.forEach((header, hi, ha) => {
                    var hlast = (!glast && hi == ha.length - 1) || (hi != ha.length - 1 && ha[hi + 1].name == 'Awards') || header.name == 'Awards';

                    if (ReservedHeaders[header.name]) {
                        ReservedHeaders[header.name](group, header, hlast);
                    } else {
                        group.add(header.name, header, {
                            width: 100
                        }, cell => {
                            var a = getObjectAt(cell.player, header.path);
                            var b = getObjectAt(cell.compare, header.path);
                            var c = header.flip ? (b - a) : (a - b);
                            return CellGenerator.Cell(CompareEval.evaluate(a, header.value) || a + (header.difference ? CellGenerator.Difference(Number.isInteger(c) ? c : c.toFixed(2), this.header.brackets) : ''), CompareEval.evaluate(a, header.color), '', hlast);
                        }, cell => {
                            var a = cell.operation(cell.players.map(p => getObjectAt(p.player, header.path)));
                            var b = cell.operation(cell.players.map(p => getObjectAt(p.compare, header.path)));
                            var c = header.flip ? (b - a) : (a - b);
                            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(c, this.header.brackets) : ''), '', CompareEval.evaluate(a, header.color), false);
                        }, player => getObjectAt(player, header.path));
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

    addPlayer (player, compare) {
        this.players.push({ player: player, compare: compare || player });
    }

    width () {
        return 250 + this.config.reduce((a, b) => a + b.width, 0);
    }

    toString (joined, kicked, sortby, sortstyle) {
        var content = [];

        // Flatten the headers
        var flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

        // Sort players usign desired method
        if (sortstyle) {
            if (sortby == 'Name') {
                if (sortstyle == 1) {
                    this.players.sort((a, b) => a.player.Name.localeCompare(b.player.Name));
                } else {
                    this.players.sort((a, b) => b.player.Name.localeCompare(a.player.Name));
                }
            } else if (sortby == 'Potions') {
                if (sortstyle == 1) {
                    this.players.sort((a, b) => b.player.Potions.reduce((c, p) => c + p.Size, 0) - a.player.Potions.reduce((c, p) => c + p.Size, 0));
                } else {
                    this.players.sort((a, b) => a.player.Potions.reduce((c, p) => c + p.Size, 0) - b.player.Potions.reduce((c, p) => c + p.Size, 0));
                }
            } else {
                var sort = flat.find(h => h.name == sortby);
                if (sort) {
                    if ((sortstyle == 1 && !sort.flip) || (sortstyle == 2 && sort.flip)) {
                        this.players.sort((a, b) => compareItems(sort.sort(a.player), sort.sort(b.player)));
                    } else if ((sortstyle == 2 && !sort.flip) || (sortstyle == 1 && sort.flip)) {
                        this.players.sort((a, b) => compareItems(sort.sort(b.player), sort.sort(a.player)));
                    }
                }
            }
        }

        // Current width
        var w = this.width();

        // Add main body
        content.push(`
            <thead>
                <tr>
                    <td style="width: 250px" colspan="1" rowspan="2" class="border-right-thin clickable" data-sortable="${ sortby == 'Name' ? sortstyle : 0 }">Name</td>
                    ${ this.config.map((g, index, array) => `<td style="width:${ g.width }px" colspan="${ g.length }" class="${ g.name == 'Potions' ? 'clickable' : '' } ${ index != array.length -1 ? 'border-right-thin' : '' }" ${ g.empty ? 'rowspan="2"' : '' } ${ g.name == 'Potions' ? `data-sortable="${ sortby == 'Potions' ? sortstyle : 0 }"` : '' }>${ g.name }</td>`).join('') }
                    ${ flat.length < 5 ? Array(5 - flat.length).fill(null).map(x => '<td width="100"></td>').join('') : '' }
                    ${ w < 750 ? `<td width="${ 750 - w }"></td>` : '' }
                </tr>
                <tr>
                    ${ this.config.map((g, index, array) => g.headers.map((h, hindex, harray) => h.name == '' ? '' : `<td width="${ h.width }" data-sortable="${ sortby == h.name ? sortstyle : 0 }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`).join('')).join('') }
                </tr>
                <tr>
                    <td colspan="1" class="border-bottom-thick border-right-thin"></td>
                    ${ this.config.map((g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`).join('') }
                </tr>
            </thead>
            <tbody>
                ${ this.players.map(r => `<tr><td class="border-right-thin clickable" data-player="${ r.player.Identifier }">${ r.player.Name }</td>${ flat.map(h => h.generators.cell(r)).join('') }</tr>`).join('') }
        `);

        // Add statistics
        var showMembers = this.root.members;
        var showStatistics = flat.reduce((c, h) => c + (h.statistics ? 1 : 0), 0) > 0;

        if (showMembers || showStatistics) {
            content.push(`
                <tr><td colspan="${ flat.length + 1 }"></td></tr>
            `);
        }

        if (showStatistics) {
            content.push(`
                <tr>
                    <td class="border-right-thin"></td>
                    ${ flat.map((h, i) => (h.statistics && h.generators.statistics) ? `<td>${ h.name }</td>` : '<td></td>').join('') }
                </tr>
                <tr>
                    <td class="border-right-thin border-bottom-thick"></td>
                    <td class="border-bottom-thick" colspan="${ flat.length }"></td>
                </tr>
                <tr>
                    <td class="border-right-thin">Minimum</td>
                    ${ flat.map((h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics({ players: this.players, operation: ar => Math.min(... ar) }) : '<td></td>').join('') }
                </tr>
                <tr>
                    <td class="border-right-thin">Average</td>
                    ${ flat.map((h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics({ players: this.players, operation: ar => Math.trunc(ar.reduce((a, b) => a + b, 0) / ar.length) }) : '<td></td>').join('') }
                </tr>
                <tr>
                    <td class="border-right-thin">Maximum</td>
                    ${ flat.map((h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics({ players: this.players, operation: ar => Math.max(... ar) }) : '<td></td>').join('') }
                </tr>
            `);
        }

        if (showMembers) {
            var classes = this.players.reduce((c, p) => { c[p.player.Class - 1]++; return c; }, [0, 0, 0, 0, 0, 0]);

            if (showStatistics) {
                content.push(`
                    <tr>
                        <td class="border-right-thin border-bottom-thick"></td>
                        <td class="border-bottom-thick" colspan="${ flat.length }"></td>
                    </tr>
                `);
            }

            content.push(`
                <tr>
                    <td class="border-right-thin">Warrior</td>
                    <td>${ classes[0] }</td>
                    ${ joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="2">Joined</td>
                        <td colspan="${ Math.max(2, flat.length - 2) }" rowspan="3">${ joined.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin">Mage</td>
                    <td>${ classes[1] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin">Scout</td>
                    <td>${ classes[2] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin">Assassin</td>
                    <td>${ classes[3] }</td>
                    ${ kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="2">Kicked</td>
                        <td colspan="${ Math.max(2, flat.length - 2) }" rowspan="3">${ kicked.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin">Battle Mage</td>
                    <td>${ classes[4] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin">Berserker</td>
                    <td>${ classes[5] }</td>
                </tr>
            `);
        }

        // Add table end
        content.push('</tbody>');

        return content.join('');
    }
}

// Cell generators
const CellGenerator = {
    // Simple cell
    Cell: function (c, b, f, bo) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="color: ${ f }; background-color: ${ b }">${ c }</td>`;
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
            if (c.name == name && SP_KEYWORD_CATEGORY_RESERVED.includes(c.name)) return c;
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
        var def = null;
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

// Control markers
const SP_KEYWORD_CATEGORY = 'category';
const SP_KEYWORD_HEADER = 'header';

// Parameters
const SP_KEYWORD_GLOBAL_BOOL = [ 'members' ];
const SP_KEYWORD_PARAMETER_BOOL = [ 'difference', 'percentage', 'hydra', 'flip', 'visible', 'brackets', 'statistics', 'maximum', 'members' ];
const SP_KEYWORD_PARAMETER_NUMBER = [ 'width' ];
const SP_KEYWORD_PARAMETER_STRING = [ 'path', 'type' ];
const SP_KEYWORD_PARAMETER_ARRAY = [ 'color', 'value' ];

// Reserved values
const SP_KEYWORD_CATEGORY_RESERVED = Object.keys(ReservedCategories);
const SP_KEYWORD_HEADER_RESERVED = Object.keys(ReservedHeaders);
const SP_KEYWORD_BOOL = [ 'on', 'off' ];
const SP_KEYWORD_EQ = [ 'above', 'below', 'or', 'equal', 'default' ];

const SP_KEYWORD_EQ_MAP = {
    'above or equal': 'ae',
    'below or equal': 'be',
    'equal or above': 'ae',
    'equal or below': 'be',
    'above': 'a',
    'below': 'b',
    'equal': 'e',
    'default': 'd'
};
const SP_KEYWORD_EQ_REGEX = new RegExp(Object.keys(SP_KEYWORD_EQ_MAP).join('|'), 'gi');

const SP_KEYWORD_CONSTANTS = {
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
    'none': '0'
};

// Setting parser
const SettingsParser = (function () {
    // Helper functions
    function split3 (text, delim) {
        var i = text.indexOf(delim);
        if (i == -1) {
            return [ text ];
        } else {
            var b = text.substring(i + delim.length);
            var j = b.indexOf(delim);
            if (j == -1) {
                return [ text.substring(0, i), b ];
            } else {
                return [ text.substring(0, i), b.substring(0, j), b.substring(j + delim.length).trim() ];
            }
        }
    }

    function parseArrayParameterArgument(text, color) {
        if (text) {
            var val = text.replace(SP_KEYWORD_EQ_REGEX, matched => SP_KEYWORD_EQ_MAP[matched]);
            var arr, [ eq, a, b ] = arr = split3(val, ' ');

            if (arr.length == 2 && eq == 'd' && (!color || isCSSColor(a))) return [ eq, 0, a ];
            else if (arr.length == 3 && Object.values(SP_KEYWORD_EQ_MAP).includes(eq) && !isNaN(a) && (!color || isCSSColor(b))) return [ eq, Number(a), b ];
            else return null;
        } else {
            return null;
        }
    }

    // Is valid css color?
    function isCSSColor(string) {
        var style = new Option().style;
        style.color = string;
        return style.color != '';
    }

    // Parser itself
    return new (class {
        highlight (text) {
            var content = [];
            for (var row of text.split('\n')) {
                var comment = row.indexOf('#') != -1;
                var [ wordPart, ... commentPart ] = row.split('#');
                var words, [a, ... b] = words = wordPart.split(' ');

                b = b.join(' ');

                var rcontent = [];

                if (SP_KEYWORD_HEADER == a && SP_KEYWORD_HEADER_RESERVED.includes(b)) {
                    content.push(`<span class="ta-keyword">${ a }</span>&nbsp;<span class="ta-reserved">${ b.replace(/ /, '&nbsp;') }</span>`);
                    continue;
                }

                for (var word of words) {
                    if (words[0] == 'color' && isCSSColor(word)) rcontent.push(`<span class="ta-color" style="color: ${ word }">${ word }</span>`);
                    else if (word[0] == '@' && Object.keys(SP_KEYWORD_CONSTANTS).includes(word.slice(1))) rcontent.push(`<span class="ta-constant">${ word }</span>`);
                    else if (SP_KEYWORD_CATEGORY == words[0] && SP_KEYWORD_CATEGORY_RESERVED.includes(word)) rcontent.push(`<span class="ta-reserved">${ word }</span>`);
                    else if (SP_KEYWORD_HEADER == words[0] && SP_KEYWORD_HEADER_RESERVED.includes(word)) rcontent.push(`<span class="ta-reserved">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_BOOL.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_GLOBAL_BOOL.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_NUMBER.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_STRING.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_ARRAY.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_BOOL.includes(words[0]) && SP_KEYWORD_BOOL.includes(word)) rcontent.push(`<span class="ta-boolean-${ word }">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_ARRAY.includes(words[0]) && SP_KEYWORD_EQ.includes(word)) rcontent.push(`<span class="ta-constant">${ word }</span>`);
                    else if (SP_KEYWORD_CATEGORY == word) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_HEADER == word) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else rcontent.push(word);
                }

                if (comment) {
                    content.push(`${ rcontent.join('&nbsp;') }<span class="ta-comment">#${ commentPart }</span>`);
                    continue;
                }

                content.push(rcontent.join('&nbsp;'));
            }

            return content.join('</br>');
        }

        pushHeader () {
            if (this.h) {
                merge(this.h, this.g);

                if (SP_KEYWORD_HEADER_RESERVED.includes(this.h.name) || this.h.path) {
                    this.c.h.push(this.h);
                }

                this.h = null;
            }
        }

        pushCategory () {
            if (this.c) {
                this.pushHeader();

                if (SP_KEYWORD_CATEGORY_RESERVED.includes(this.c.name)) {
                    merge(this.c, this.g);
                }

                this.root.c.push(this.c);
                this.c = null;
            }
        }

        addCategory (arg) {
            if (arg) {
                this.pushCategory();
                this.c = {
                    name: arg,
                    h: []
                };
            }
        }

        addHeader (arg) {
            if (arg) {
                this.pushHeader();
                this.h = {
                    name: arg
                };
            }
        }

        addRawParam (param, arg) {
            if (param) {
                if (this.h) {
                    this.h[param] = arg;
                } else if (this.c) {
                    this.c[param] = arg;
                } else if (SP_KEYWORD_GLOBAL_BOOL.includes(param)) {
                    this.root[param] = arg;
                } else {
                    this.g[param] = arg;
                }
            }
        }

        addArrayParam (param, arg) {
            if (param) {
                if (this.h) {
                    if (!this.h[param]) {
                        this.h[param] = [ arg ];
                    } else {
                        this.h[param].push(arg);
                    }
                } else if (this.c) {
                    if (!this.c[param]) {
                        this.c[param] = [ arg ];
                    } else {
                        this.c[param].push(arg);
                    }
                }
            }
        }

        addBoolParam (param, arg) {
            if (param && SP_KEYWORD_BOOL.includes(arg)) {
                this.addRawParam(param, arg == 'on');
            }
        }

        addStringParam (param, arg) {
            if (param && arg) {
                this.addRawParam(param, arg);
            }
        }

        addNumberParam (param, arg) {
            if (param && arg && !isNaN(arg)) {
                this.addRawParam(param, Number(arg));
            }
        }

        parse (text) {
            this.root = { c: [] };
            this.c = null;
            this.h = null;
            this.g = {};

            for (var row of text.split('\n')) {
                var [key, arg] = row.split('#')[0].split(/ (.+)/).filter(x => x);
                if (!key || !arg) continue;
                arg = arg.trim();
                for (var m of arg.match(/( @\w+\b)/g) || []) {
                    var x = m.split('@');
                    arg = arg.replace(`@${ x[1] }`, SP_KEYWORD_CONSTANTS[x[1]]);
                }

                if (SP_KEYWORD_PARAMETER_BOOL.includes(key)) this.addBoolParam(key, arg);
                else if (SP_KEYWORD_PARAMETER_NUMBER.includes(key)) this.addNumberParam(key, arg);
                else if (SP_KEYWORD_PARAMETER_STRING.includes(key)) this.addStringParam(key, arg);
                else if (SP_KEYWORD_PARAMETER_ARRAY.includes(key)) {
                    var value = parseArrayParameterArgument(arg, key == 'color');
                    if (value) {
                        this.addArrayParam(key, value);
                    }
                } else if (SP_KEYWORD_HEADER == key) this.addHeader(arg);
                else if (SP_KEYWORD_CATEGORY == key) this.addCategory(arg);
            }

            this.pushCategory();
            return this.root;
        }
    })();
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
