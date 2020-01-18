class HeaderGroup {
    constructor (name, empty = false) {
        this.name = name;
        this.headers = [];
        this.width = 0;
        this.length = 0;
        this.empty = empty;
    }

    add (name, cell, width = 100) {
        this.headers.push({ name: name, width: width, cell: cell, position: this.headers.length, parent: this });
        this.width += width;
        this.length++;
        return this;
    }
}

class Table {
    constructor (config) {
        this.config = [];
        this.players = [];

        if (config && config.categories) {
            config.categories.forEach((category, cindex, carray) => {
                var group = new HeaderGroup(category.name, category.name == 'Potions');
                var clast = cindex == carray.length - 1;

                if (category.name == 'Potions') {
                    group.add('', cell => {
                        return Cell.Cell(cell.player.Potions[0].Size, Color.Get(cell.player.Potions[0].Size, category.colors), category.visible ? Color.None : Color.Get(cell.player.Potions[0].Size, category.colors));
                    }, category.width || 33);
                    group.add('', cell => {
                        return Cell.Cell(cell.player.Potions[1].Size, Color.Get(cell.player.Potions[1].Size, category.colors), category.visible ? Color.None : Color.Get(cell.player.Potions[1].Size, category.colors));
                    }, category.width || 33);
                    group.add('', cell => {
                        return Cell.Cell(cell.player.Potions[2].Size, Color.Get(cell.player.Potions[2].Size, category.colors), category.visible ? Color.None : Color.Get(cell.player.Potions[2].Size, category.colors), !clast);
                    }, category.width || 33);
                } else {
                    category.headers.forEach((header, hindex, harray) => {
                        var last = (!clast && hindex == harray.length - 1 && (!carray[cindex + 1].headers || carray[cindex + 1].headers.length)) || (hindex != harray.length - 1 && harray[hindex + 1].name == 'Awards');

                        if (header.name == 'Class') {
                            group.add('Class', cell => {
                                return Cell.Cell(PLAYER_CLASS[cell.player.Class], Color.NONE, Color.NONE, last);
                            }, header.width || 120);
                        } else if (header.name == 'ID') {
                            group.add('ID', cell => {
                                return Cell.Cell(cell.player.ID, Color.NONE, Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Rank') {
                            group.add('Rank', cell => {
                                return Cell.Cell(cell.player.Rank + (header.diff ? Cell.Difference(cell.compare.Rank - cell.player.Rank, config.brackets) : ''), Color.Get(cell.player.Rank, header.colors, true), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Role') {
                            group.add('Role', cell => {
                                return Cell.Cell(GROUP_ROLES[cell.player.Group.Role], Color.NONE, Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Level') {
                            group.add('Level', cell => {
                                return Cell.Cell(cell.player.Level + (header.diff ? Cell.Difference(cell.player.Level - cell.compare.Level, config.brackets) : ''), Color.Get(cell.player.Level, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Album') {
                            group.add('Album', cell => {
                                var color = Color.Get(100 * cell.player.Book / SCRAPBOOK_COUNT, header.colors);
                                if (header.percentage) {
                                    return Cell.Cell((100 * cell.player.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.diff ? Cell.FormattedDifference((100 * (cell.player.Book - cell.compare.Book) / SCRAPBOOK_COUNT).toFixed(2), cell.player.Book - cell.compare.Book, config.brackets) : ''), color, Color.NONE, last);
                                } else {
                                    return Cell.Cell(cell.player.Book + (header.diff ? Cell.Difference(cell.player.Book - cell.compare.Book, config.brackets) : ''), color, Color.NONE, last);
                                }
                            }, header.width || 130);
                        } else if (header.name == 'Mount') {
                            group.add('Mount', cell => {
                                return Cell.Cell(header.percentage ? (PLAYER_MOUNT[cell.player.Mount] + (cell.player.Mount ? '%' : '')) : cell.player.Mount, Color.Get(cell.player.Mount, header.colors), Color.NONE, last);
                            }, header.width || 80);
                        } else if (header.name == 'Awards') {
                            group.add('Awards', cell => {
                                return Cell.Cell(cell.player.Achievements.Owned + (header.hydra && cell.player.Achievements.Dehydration ? Cell.Small('H') : '') + (header.diff ? Cell.Difference(cell.player.Achievements.Owned - cell.compare.Achievements.Owned, config.brackets) : ''), Color.Get(cell.player.Achievements.Owned, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Treasure') {
                            group.add('Treasure', cell => {
                                return Cell.Cell(cell.player.Group.Treasure + (header.diff ? Cell.Difference(cell.player.Group.Treasure - cell.compare.Group.Treasure, config.brackets) : ''), Color.Get(cell.player.Group.Treasure, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Instructor') {
                            group.add('Instructor', cell => {
                                return Cell.Cell(cell.player.Group.Instructor + (header.diff ? Cell.Difference(cell.player.Group.Instructor - cell.compare.Group.Instructor, config.brackets) : ''), Color.Get(cell.player.Group.Instructor, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Pet') {
                            group.add('Pet', cell => {
                                return Cell.Cell(cell.player.Group.Pet + (header.diff ? Cell.Difference(cell.player.Group.Pet - cell.compare.Group.Pet, config.brackets) : ''), Color.Get(cell.player.Group.Pet, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Knights') {
                            group.add('Knights', cell => {
                                return Cell.Cell(cell.player.Fortress.Knights + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : '') + (header.diff ? Cell.Difference(cell.player.Fortress.Knights - cell.compare.Fortress.Knights, config.brackets) : ''), Color.Get(cell.player.Fortress.Knights, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Fortress') {
                            group.add('Fortress', cell => {
                                return Cell.Cell(cell.player.Fortress.Fortress + (header.diff ? Cell.Difference(cell.player.Fortress.Fortress - cell.compare.Fortress.Fortress, config.brackets) : ''), Color.Get(cell.player.Fortress.Fortress, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'GemMine') {
                            group.add('Gem Mine', cell => {
                                return Cell.Cell(cell.player.Fortress.GemMine + (header.diff ? Cell.Difference(cell.player.Fortress.GemMine - cell.compare.Fortress.GemMine, config.brackets) : ''), Color.Get(cell.player.Fortress.GemMine, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Honor') {
                            group.add('Honor', cell => {
                                return Cell.Cell(cell.player.Fortress.Honor + (header.diff ? Cell.Difference(cell.player.Fortress.Honor - cell.compare.Fortress.Honor, config.brackets) : ''), Color.Get(cell.player.Fortress.Honor, header.colors), Color.NONE, last);
                            }, header.width || 130);
                        } else if (header.name == 'Upgrades') {
                            group.add('Upgrades', cell => {
                                return Cell.Cell(cell.player.Fortress.Upgrades + (header.diff ? Cell.Difference(cell.player.Fortress.Upgrades - cell.compare.Fortress.Upgrades, config.brackets) : ''), Color.Get(cell.player.Fortress.Upgrades, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Tower') {
                            group.add('Tower', cell => {
                                return Cell.Cell(cell.player.Dungeons.Tower + (header.diff ? Cell.Difference(cell.player.Dungeons.Tower - cell.compare.Dungeons.Tower, config.brackets) : ''), Color.Get(cell.player.Dungeons.Tower, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Portal') {
                            group.add('Portal', cell => {
                                return Cell.Cell(cell.player.Dungeons.Player + (header.diff ? Cell.Difference(cell.player.Dungeons.Player - cell.compare.Dungeons.Player, config.brackets) : ''), Color.Get(cell.player.Dungeons.Player, header.colors), Color.NONE, last);
                            }, header.width);
                        } else if (header.name == 'Equipment') {
                            group.add('Equipment', cell => {
                                var pil = Object.values(cell.player.Items).reduce((total, i) => total + i.getItemLevel(), 0);
                                var cil = Object.values(cell.compare.Items).reduce((total, i) => total + i.getItemLevel(), 0);
                                return Cell.Cell(pil + (header.diff ? Cell.Difference(pil - cil, config.brackets) : ''), Color.Get(pil, header.colors), Color.NONE, last);
                            }, header.width || 130);
                        } else if (header.name == 'Custom') {
                            group.add(header.label, cell => {
                                var a = getObjectAt(cell.player, header.path);
                                var b = getObjectAt(cell.compare, header.path);
                                return Cell.Cell((Color.Get(a, header.values) || a) + (header.diff ? Cell.Difference((a - b).toFixed(2), config.brackets) : ''), Color.Get(a, header.colors), Color.NONE, last);
                            }, header.width);
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

    toString () {
        var flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

        return `
            <thead>
                <tr>
                    <td width="250" colspan="1" rowspan="2" class="border-right-thin">Name</td>
                    ${ this.config.map((g, index, array) => `<td width="${ g.width }" colspan="${ g.length }" class="${ index != array.length -1 ? 'border-right-thin' : '' }" ${ g.empty ? 'rowspan="2"' : '' }>${ g.name }</td>`).join('') }
                </tr>
                <tr>
                    ${ this.config.map((g, index, array) => g.headers.map((h, hindex, harray) => h.name == '' ? '' : `<td width="${ h.width }" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`).join('')).join('') }
                </tr>
                <tr>
                    <td colspan="1" class="border-bottom-thick border-right-thin"></td>
                    ${ this.config.map((g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`).join('') }
                </tr>
            </thead>
            <tbody>
                ${ this.players.map(r => `<tr><td class="border-right-thin clickable" data-player="${ r.player.Identifier }">${ r.player.Name }</td>${ flat.map(h => h.cell({ player: r.player, compare: r.compare, self: h })).join('') }</tr>`).join('') }
            </body>
        `;
    }
}

const Cell = {
    Cell: (text, bg, fg, border) => `<td class="${ border ? 'border-right-thin' : '' }" style="color: ${ fg }; background-color: ${ bg }">${ text }</td>`,
    Difference: (dif, brackets) => (dif != 0 ? ` <span>${ brackets ? '(' : '' }${ dif > 0 ? '+' : '' }${ dif }${ brackets ? ')' : '' }</span>` : ''),
    FormattedDifference: (text, dif, brackets) => (dif != 0 ? ` <span>${ brackets ? '(' : '' }${ dif > 0 ? '+' : '' }${ text }${ brackets ? ')' : '' }</span>` : ''),
    Small: (text) => ` <span>${ text }</span>`,
    Empty: () => '<td></td>'
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
    constructor (didentifier) {
        this.config = Preferences.get('config/' + didentifier, Preferences.get('config', DEFAULT_CONFIG));
    }

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
                    diff: true
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
                    diff: true
                },
                {
                    name: 'Instructor',
                    diff: true
                },
                {
                    name: 'Pet',
                    colors: [
                        Color.RED,
                        [ 335, Color.GREEN ],
                        [ 235, Color.ORANGE ]
                    ],
                    diff: true
                },
                {
                    name: 'Knights',
                    colors: [
                        Color.RED,
                        [ 17, Color.GREEN ],
                        [ 15, Color.ORANGE ]
                    ],
                    maximum: true,
                    diff: true
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
