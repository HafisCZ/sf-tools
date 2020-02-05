class HeaderGroup {
    constructor (name, empty = false) {
        this.name = name;
        this.headers = [];
        this.width = 0;
        this.length = 0;
        this.empty = empty;
    }

    add (name, cell, width, stat, scell, sort, flip) {
        this.headers.push({ name: name, width: width, cell: cell, position: this.headers.length, stat: stat, scell: scell, sort: sort, flip: flip });
        this.width += width;
        this.length++;
        return this;
    }
}

const ReservedCategories = {
    'Potions': (group, category, config, last) => {
        group.add('', cell => {
            return Cell.Cell(cell.player.Potions[0].Size, Color.Get(cell.player.Potions[0].Size, category.colors), category.visible ? Color.None : Color.Get(cell.player.Potions[0].Size, category.colors));
        }, category.width || 33, false, null, player => player.Potions[0].Size, false);
        group.add('', cell => {
            return Cell.Cell(cell.player.Potions[1].Size, Color.Get(cell.player.Potions[1].Size, category.colors), category.visible ? Color.None : Color.Get(cell.player.Potions[1].Size, category.colors));
        }, category.width || 33, false, null, player => player.Potions[1].Size, false);
        group.add('', cell => {
            return Cell.Cell(cell.player.Potions[2].Size, Color.Get(cell.player.Potions[2].Size, category.colors), category.visible ? Color.None : Color.Get(cell.player.Potions[2].Size, category.colors), !last);
        }, category.width || 33, false, null, player => player.Potions[2].Size, false);
    }
};

const ReservedHeaders = {
    'Class': (group, header, config, last) => {
        group.add('Class', cell => {
            return Cell.Cell(PLAYER_CLASS[cell.player.Class], Color.NONE, Color.NONE, last);
        }, header.width || 120, false, null, player => player.Class, true);
    },
    'ID': (group, header, config, last) => {
        group.add('ID', cell => {
            return Cell.Cell(cell.player.ID, Color.NONE, Color.NONE, last);
        }, header.width || 100, false, null, player => player.ID, false);
    },
    "Rank": (group, header, config, last) => {
        group.add('Rank', cell => {
            return Cell.Cell(cell.player.Rank + (header.diff ? Cell.Difference(cell.compare.Rank - cell.player.Rank, config.brackets) : ''), Color.Get(cell.player.Rank, header.colors, true), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Rank));
            var rval = cell.operation(cell.players.map(p => p.compare.Rank));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(rval - cval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors, true), false);
        }, player => player.Rank, true);
    },
    "Role": (group, header, config, last) => {
        group.add('Role', cell => {
            return Cell.Cell(GROUP_ROLES[cell.player.Group.Role], Color.NONE, Color.NONE, last);
        }, header.width || 100, false, null, player => player.Group.Role, true);
    },
    "Level": (group, header, config, last) => {
        group.add('Level', cell => {
            return Cell.Cell(cell.player.Level + (header.diff ? Cell.Difference(cell.player.Level - cell.compare.Level, config.brackets) : ''), Color.Get(cell.player.Level, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Level));
            var rval = cell.operation(cell.players.map(p => p.compare.Level));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Level, false);
    },
    "Album": (group, header, config, last) => {
        group.add('Album', cell => {
            var color = Color.Get(100 * cell.player.Book / SCRAPBOOK_COUNT, header.colors);
            if (header.percentage) {
                return Cell.Cell((100 * cell.player.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.diff ? Cell.FormattedDifference((100 * (cell.player.Book - cell.compare.Book) / SCRAPBOOK_COUNT).toFixed(2), cell.player.Book - cell.compare.Book, config.brackets) : ''), color, Color.NONE, last);
            } else {
                return Cell.Cell(cell.player.Book + (header.diff ? Cell.Difference(cell.player.Book - cell.compare.Book, config.brackets) : ''), color, Color.NONE, last);
            }
        }, header.width || 130, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Book));
            var rval = cell.operation(cell.players.map(p => p.compare.Book));
            var color = Color.Get(100 * cval / SCRAPBOOK_COUNT, header.colors);
            if (header.percentage) {
                return Cell.Cell((100 * cval / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.diff ? Cell.FormattedDifference((100 * (cval - rval) / SCRAPBOOK_COUNT).toFixed(2), cval - rval, config.brackets) : ''), Color.NONE, color, false);
            } else {
                return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), color, Color.NONE, false);
            }
        }, player => player.Book, false);
    },
    "Mount": (group, header, config, last) => {
        group.add('Mount', cell => {
            return Cell.Cell(header.percentage ? (PLAYER_MOUNT[cell.player.Mount] + (cell.player.Mount ? '%' : '')) : cell.player.Mount, Color.Get(cell.player.Mount, header.colors), Color.NONE, last);
        }, header.width || 80, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Mount));
            return Cell.Cell(header.percentage ? (PLAYER_MOUNT[cval] + (cval ? '%' : '')) : cval, Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Mount, false);
    },
    "Awards": (group, header, config, last) => {
        group.add('Awards', cell => {
            return Cell.Cell(cell.player.Achievements.Owned + (header.hydra && cell.player.Achievements.Dehydration ? Cell.Small('H') : '') + (header.diff ? Cell.Difference(cell.player.Achievements.Owned - cell.compare.Achievements.Owned, config.brackets) : ''), Color.Get(cell.player.Achievements.Owned, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Achievements.Owned));
            var rval = cell.operation(cell.players.map(p => p.compare.Achievements.Owned));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Achievements.Owned, false);
    },
    "Treasure": (group, header, config, last) => {
        group.add('Treasure', cell => {
            return Cell.Cell(cell.player.Group.Treasure + (header.diff ? Cell.Difference(cell.player.Group.Treasure - cell.compare.Group.Treasure, config.brackets) : ''), Color.Get(cell.player.Group.Treasure, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Group.Treasure));
            var rval = cell.operation(cell.players.map(p => p.compare.Group.Treasure));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Group.Treasure, false);
    },
    "Instructor": (group, header, config, last) => {
        group.add('Instructor', cell => {
            return Cell.Cell(cell.player.Group.Instructor + (header.diff ? Cell.Difference(cell.player.Group.Instructor - cell.compare.Group.Instructor, config.brackets) : ''), Color.Get(cell.player.Group.Instructor, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Group.Instructor));
            var rval = cell.operation(cell.players.map(p => p.compare.Group.Instructor));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Group.Instructor, false);
    },
    "Pet": (group, header, config, last) => {
        group.add('Pet', cell => {
            return Cell.Cell(cell.player.Group.Pet + (header.diff ? Cell.Difference(cell.player.Group.Pet - cell.compare.Group.Pet, config.brackets) : ''), Color.Get(cell.player.Group.Pet, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Group.Pet));
            var rval = cell.operation(cell.players.map(p => p.compare.Group.Pet));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Group.Pet, false);
    },
    "Knights": (group, header, config, last) => {
        group.add('Knights', cell => {
            return Cell.Cell(cell.player.Fortress.Knights + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : '') + (header.diff ? Cell.Difference(cell.player.Fortress.Knights - cell.compare.Fortress.Knights, config.brackets) : ''), Color.Get(cell.player.Fortress.Knights, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Fortress.Knights));
            var rval = cell.operation(cell.players.map(p => p.compare.Fortress.Knights));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Fortress.Knights, false);
    },
    "Fortress": (group, header, config, last) => {
        group.add('Fortress', cell => {
            return Cell.Cell(cell.player.Fortress.Fortress + (header.diff ? Cell.Difference(cell.player.Fortress.Fortress - cell.compare.Fortress.Fortress, config.brackets) : ''), Color.Get(cell.player.Fortress.Fortress, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Fortress.Fortress));
            var rval = cell.operation(cell.players.map(p => p.compare.Fortress.Fortress));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Fortress, false);
    },
    "GemMine": (group, header, config, last) => {
        group.add('Gem Mine', cell => {
            return Cell.Cell(cell.player.Fortress.GemMine + (header.diff ? Cell.Difference(cell.player.Fortress.GemMine - cell.compare.Fortress.GemMine, config.brackets) : ''), Color.Get(cell.player.Fortress.GemMine, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Fortress.GemMine));
            var rval = cell.operation(cell.players.map(p => p.compare.Fortress.GemMine));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Fortress.GemMine, false);
    },
    "Honor": (group, header, config, last) => {
        group.add('Honor', cell => {
            return Cell.Cell(cell.player.Fortress.Honor + (header.diff ? Cell.Difference(cell.player.Fortress.Honor - cell.compare.Fortress.Honor, config.brackets) : ''), Color.Get(cell.player.Fortress.Honor, header.colors), Color.NONE, last);
        }, header.width || 130, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Fortress.Honor));
            var rval = cell.operation(cell.players.map(p => p.compare.Fortress.Honor));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Fortress.Honor, false);
    },
    "Upgrades": (group, header, config, last) => {
        group.add('Upgrades', cell => {
            return Cell.Cell(cell.player.Fortress.Upgrades + (header.diff ? Cell.Difference(cell.player.Fortress.Upgrades - cell.compare.Fortress.Upgrades, config.brackets) : ''), Color.Get(cell.player.Fortress.Upgrades, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Fortress.Upgrades));
            var rval = cell.operation(cell.players.map(p => p.compare.Fortress.Upgrades));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Fortress.Upgrades, false);
    },
    "Tower": (group, header, config, last) => {
        group.add('Tower', cell => {
            return Cell.Cell(cell.player.Dungeons.Tower + (header.diff ? Cell.Difference(cell.player.Dungeons.Tower - cell.compare.Dungeons.Tower, config.brackets) : ''), Color.Get(cell.player.Dungeons.Tower, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Dungeons.Tower));
            var rval = cell.operation(cell.players.map(p => p.compare.Dungeons.Tower));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Dungeons.Tower, false);
    },
    "Portal": (group, header, config, last) => {
        group.add('Portal', cell => {
            return Cell.Cell(cell.player.Dungeons.Player + (header.diff ? Cell.Difference(cell.player.Dungeons.Player - cell.compare.Dungeons.Player, config.brackets) : ''), Color.Get(cell.player.Dungeons.Player, header.colors), Color.NONE, last);
        }, header.width || 100, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => p.player.Dungeons.Portal));
            var rval = cell.operation(cell.players.map(p => p.compare.Dungeons.Portal));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => player.Dungeons.Player, false);
    },
    "Equipment": (group, header, config, last) => {
        group.add('Equipment', cell => {
            var pil = Object.values(cell.player.Items).reduce((total, i) => total + i.getItemLevel(), 0);
            var cil = Object.values(cell.compare.Items).reduce((total, i) => total + i.getItemLevel(), 0);
            return Cell.Cell(pil + (header.diff ? Cell.Difference(pil - cil, config.brackets) : ''), Color.Get(pil, header.colors), Color.NONE, last);
        }, header.width || 130, header.stat, cell => {
            var cval = cell.operation(cell.players.map(p => Object.values(p.player.Items).reduce((total, i) => total + i.getItemLevel(), 0)));
            var rval = cell.operation(cell.players.map(p => Object.values(p.compare.Items).reduce((total, i) => total + i.getItemLevel(), 0)));
            return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors), false);
        }, player => Object.values(player.Items).reduce((total, i) => total + i.getItemLevel(), 0), false);
    }
};

class Table {
    constructor (config) {
        this.raw = config;
        this.config = [];
        this.players = [];

        if (config && config.categories) {
            config.categories.forEach((category, cindex, carray) => {
                var group = new HeaderGroup(category.name, category.name == 'Potions');
                var clast = cindex == carray.length - 1;

                if (ReservedCategories[category.name] != null) {
                    ReservedCategories[category.name](group, category, config, clast);
                } else {
                    category.headers.forEach((header, hindex, harray) => {
                        var last = (!clast && hindex == harray.length - 1 && (!carray[cindex + 1].headers || carray[cindex + 1].headers.length)) || (hindex != harray.length - 1 && harray[hindex + 1].name == 'Awards');

                        if (ReservedHeaders[header.name]) {
                            ReservedHeaders[header.name](group, header, config, last);
                        } else {
                            group.add(header.name, cell => {
                                var a = getObjectAt(cell.player, header.path);
                                var b = getObjectAt(cell.compare, header.path);
                                return Cell.Cell((Color.Get(a, header.values, header.flip) || a) + (header.diff ? Cell.Difference(Number.isInteger(a - b) ? (a - b) : (a - b).toFixed(2), config.brackets) : ''), Color.Get(a, header.colors, header.flip), Color.NONE, last);
                            }, header.width || 100, header.stat, cell => {
                                var cval = cell.operation(cell.players.map(p => getObjectAt(p.player, header.path)));
                                var rval = cell.operation(cell.players.map(p => getObjectAt(p.player, header.path)));
                                return Cell.Cell(cval + (header.diff ? Cell.Difference(cval - rval, config.brackets) : ''), Color.NONE, Color.Get(cval, header.colors, header.flip), false);
                            }, player => getObjectAt(player, header.path), header.flip);
                        }
                    });
                }

                this.addHeader(group);
            });
        }
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
        var flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

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

        return `
            <thead>
                <tr>
                    <td style="width: 250px" colspan="1" rowspan="2" class="border-right-thin clickable" data-sortable="${ sortby == 'Name' ? sortstyle : 0 }">Name</td>
                    ${ this.config.map((g, index, array) => `<td style="width:${ g.width }px" colspan="${ g.length }" class="${ g.name == 'Potions' ? 'clickable' : '' } ${ index != array.length -1 ? 'border-right-thin' : '' }" ${ g.empty ? 'rowspan="2"' : '' } ${ g.name == 'Potions' ? `data-sortable="${ sortby == 'Potions' ? sortstyle : 0 }"` : '' }>${ g.name }</td>`).join('') }
                    ${ flat.length < 5 ? Array(5 - flat.length).fill(null).map(x => '<td width="100"></td>').join('') : '' }
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
                ${ this.players.map(r => `<tr><td class="border-right-thin clickable" data-player="${ r.player.Identifier }">${ r.player.Name }</td>${ flat.map(h => h.cell({ player: r.player, compare: r.compare })).join('') }</tr>`).join('') }
                ${ Cell.Extras(flat, this.players, this.raw.group, joined, kicked) }
            </tbody>
        `;
    }
}

const Cell = {
    Cell: (text, bg, fg, border) => `<td class="${ border ? 'border-right-thin' : '' }" style="color: ${ fg }; background-color: ${ bg }">${ text }</td>`,
    Difference: (dif, brackets) => (dif != 0 ? ` <span>${ brackets ? '(' : '' }${ dif > 0 ? '+' : '' }${ dif }${ brackets ? ')' : '' }</span>` : ''),
    FormattedDifference: (text, dif, brackets) => (dif != 0 ? ` <span>${ brackets ? '(' : '' }${ dif > 0 ? '+' : '' }${ text }${ brackets ? ')' : '' }</span>` : ''),
    Small: (text) => ` <span>${ text }</span>`,
    Empty: () => '<td></td>',
    Extras: (headers, players, extra, joined, kicked) => {

        var showMembers = extra > 1;
        var showStats = extra > 0 && headers.reduce((collector, header) => collector + (header.stat ? 1 : 0), 0) > 0;

        var content = [];

        if (showMembers || showStats) {
            content.push(`
                <tr>
                    <td colspan="${ 1 + headers.length }"></td>
                </tr>
            `);
        }

        if (showStats) {
            content.push(`
                <tr>
                    <td class="border-right-thin"></td>
                    ${ headers.map((h, index, array) => (h.stat && h.scell) ? `<td>${ h.name }</td>` : '<td></td>').join('') }
                </tr>
                <tr>
                    <td class="border-right-thin border-bottom-thick"></td>
                    <td class="border-bottom-thick" colspan="${ headers.length }"></td>
                </tr>
                <tr>
                    <td class="border-right-thin">Minimum</td>
                    ${ headers.map((h, index, array) => (h.stat && h.scell) ? h.scell({ players: players, operation: ar => Math.min(... ar) }) : '<td></td>').join('') }
                </tr>
                <tr>
                    <td class="border-right-thin">Average</td>
                    ${ headers.map((h, index, array) => (h.stat && h.scell) ? h.scell({ players: players, operation: ar => Math.trunc(ar.reduce((a, b) => a + b, 0) / ar.length) }) : '<td></td>').join('') }
                </tr>
                <tr>
                    <td class="border-right-thin">Maximum</td>
                    ${ headers.map((h, index, array) => (h.stat && h.scell) ? h.scell({ players: players, operation: ar => Math.max(... ar) }) : '<td></td>').join('') }
                </tr>
            `);
        }

        if (showMembers) {
            var classes = players.reduce((cls, p) => { cls[p.player.Class - 1]++; return cls; }, [0, 0, 0, 0, 0, 0]);

            if (showStats) {
                content.push(`
                    <tr>
                        <td class="border-right-thin border-bottom-thick"></td>
                        <td class="border-bottom-thick" colspan="${ headers.length }"></td>
                    </tr>
                `);
            }

            content.push(`
                <tr>
                    <td class="border-right-thin">Warrior</td>
                    <td>${ classes[0] }</td>
                    ${ extra > 1 && joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="2">Joined</td>
                        <td colspan="${ Math.max(2, headers.length - 2) }" rowspan="3">${ joined.join(', ') }</td>
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
                    ${ extra > 1 && kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="2">Kicked</td>
                        <td colspan="${ Math.max(2, headers.length - 2) }" rowspan="3">${ kicked.join(', ') }</td>
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

        return content.join('');
    }
}

const Color = {
    GREEN: '#00c851',
    ORANGE: '#ffbb33',
    RED: '#ff3547',
    NONE: '',
    Get: (value, colors, flip) => {
        if (colors && colors.length) {
            for (var i = 1; i < colors.length; i++) {
                if (flip ? (value <= colors[i][0]) : (value >= colors[i][0])) {
                    return colors[i][1];
                }
            }
            return colors[0];
        } else {
            return Color.NONE;
        }
    }
}

class Config {
    static save (config, didentifier) {
        if (didentifier) {
            Preferences.set('config/' + didentifier, config);
        } else {
            Preferences.set('config', config);
        }
    }

    static remove (didentifier) {
        Preferences.remove('config/' + didentifier);
    }

    static exists (didentifier) {
        return Preferences.exists('config/' + didentifier);
    }

    static empty () {
        var config = new Config();
        config.config = { categories: [] };
        return config;
    }

    static load (didentifier) {
        var config = new Config();
        config.config = Preferences.get('config/' + didentifier, Preferences.get('config', DEFAULT_CONFIG));
        return config;
    }

    findEntry (name) {
        for (var i = 0, category; category = this.config.categories[i]; i++) {
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

    findEntrySafe (name) {
        return this.findEntry(name) || { };
    }

    getData () {
        return this.config;
    }
}

const DEFAULT_CONFIG = {
    brackets: false,
    group: 2,
    categories: [
        {
            name: 'General',
            headers: [
                {
                    name: 'Level',
                    diff: true,
                    stat: true
                },
                {
                    name: 'Album',
                    diff: true,
                    colors: [
                        Color.RED,
                        [ 90, Color.GREEN ],
                        [ 75, Color.ORANGE ]
                    ],
                    percentage: true
                },
                {
                    name: 'Mount',
                    colors: [
                        Color.RED,
                        [ 4, Color.GREEN ],
                        [ 1, Color.ORANGE ]
                    ],
                    percentage: true
                },
                {
                    name: 'Awards',
                    hydra: true
                }
            ]
        },
        {
            name: 'Potions',
            colors: [
                Color.RED,
                [ 25, Color.GREEN ],
                [ 10, Color.ORANGE ]
            ]
        },
        {
            name: 'Guild',
            headers: [
                {
                    name: 'Treasure',
                    diff: true,
                    stat: true
                },
                {
                    name: 'Instructor',
                    diff: true,
                    stat: true
                },
                {
                    name: 'Pet',
                    colors: [
                        Color.RED,
                        [ 335, Color.GREEN ],
                        [ 235, Color.ORANGE ]
                    ],
                    diff: true,
                    stat: true
                },
                {
                    name: 'Knights',
                    colors: [
                        Color.RED,
                        [ 17, Color.GREEN ],
                        [ 15, Color.ORANGE ]
                    ],
                    maximum: true,
                    diff: true,
                    stat: true
                }
            ]
        },
        {
            name: 'Fortress',
            headers: [
                {
                    name: 'Honor',
                    diff: true
                }
            ]
        }
    ]
};
