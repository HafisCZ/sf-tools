class HeaderGroup {
    constructor (name, empty) {
        this.name = name;
        this.empty = empty;

        this.width = 0;
        this.length = 0;

        this.headers = [];
    }

    add (name, settings, defaults, cellgen, statgen, listgen, sort) {
        var header = {
            name: name,
            generators: {
                cell: cellgen,
                statistics: statgen,
                list: listgen
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
        }, null, cell => {
            return CellGenerator.Plain(cell.Potions[0].Size);
        }, player => player.Potions[0].Size);

        // Potion 2
        group.add('', category, {
            width: 33
        }, cell => {
            var potion = cell.player.Potions[1].Size;
            var color = CompareEval.evaluate(potion, category.color);
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, cell => {
            return CellGenerator.Plain(cell.Potions[1].Size);
        }, player => player.Potions[1].Size);

        // Potion 3
        group.add('', category, {
            width: 33
        }, cell => {
            var potion = cell.player.Potions[2].Size;
            var color = CompareEval.evaluate(potion, category.color);
            return CellGenerator.Cell(potion, color, category.visible ? '' : color, !last);
        }, null, cell => {
            return CellGenerator.Plain(cell.Potions[2].Size, !last);
        }, player => player.Potions[2].Size);
    }
};

function createGenericHeader (name, defaults, ptr) {
    return function (group, header, last) {
        group.add(header.alias || name, header, defaults, cell => {
            var a = ptr(cell.player);
            var b = ptr(cell.compare);
            return CellGenerator.Cell((CompareEval.evaluate(a, header.value) || a) + (header.difference ? CellGenerator.Difference(header.flip ? (b - a) : (a - b), header.brackets) : ''), CompareEval.evaluate(a, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => ptr(p.player)));
            var b = cell.operation(cell.players.map(p => ptr(p.compare)));
            return CellGenerator.Cell((CompareEval.evaluate(a, header.value) || a) + (header.difference ? CellGenerator.Difference(header.flip ? (b - a) : (a - b), header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            var a = ptr(cell);
            return CellGenerator.Plain((CompareEval.evaluate(a, header.value) || a), last);
        }, ptr);
    };
}

const ReservedHeaders = {
    // Attributes
    'Strength': createGenericHeader('Str', { width: 100 }, p => p.Strength.Total),
    'Dexterity': createGenericHeader('Dex', { width: 100 }, p => p.Dexterity.Total),
    'Intelligence': createGenericHeader('Int', { width: 100 }, p => p.Intelligence.Total),
    'Constitution': createGenericHeader('Con', { width: 100 }, p => p.Constitution.Total),
    'Luck': createGenericHeader('Lck', { width: 100 }, p => p.Luck.Total),
    'Attribute': createGenericHeader('Attribute', { width: 100 }, p => p.PrimaryAttribute.Total),

    // Base Attributes
    'Base Strength': createGenericHeader('Base Str', { width: 100 }, p => p.Strength.Base),
    'Base Dexterity': createGenericHeader('Base Dex', { width: 100 }, p => p.Dexterity.Base),
    'Base Intelligence': createGenericHeader('Base Int', { width: 100 }, p => p.Intelligence.Base),
    'Base Constitution': createGenericHeader('Base Con', { width: 100 }, p => p.Constitution.Base),
    'Base Luck': createGenericHeader('Base Lck', { width: 100 }, p => p.Luck.Base),
    'Base': createGenericHeader('Base', { width: 100 }, p => p.PrimaryAttribute.Base),

    // Character
    'Level': createGenericHeader('Level', { width: 100 }, p => p.Level),
    'Honor': createGenericHeader('Honor', { width: 100 }, p => p.Honor),
    'Armor': createGenericHeader('Armor', { width: 100 }, p => p.Armor),
    'Mirror': createGenericHeader('Mirror', { width: 100 }, p => p.Mirror ? 13 : p.MirrorPieces),
    'Equipment': createGenericHeader('Equipment', { width: 130 }, p => Object.values(p.Items).reduce((total, i) => total + i.getItemLevel(), 0)),

    // Dungeons
    'Tower': createGenericHeader('Tower', { width: 100 }, p => p.Dungeons.Tower),
    'Portal': createGenericHeader('Portal', { width: 100 }, p => p.Dungeons.Player),
    'Guild Portal': createGenericHeader('Guild Portal', { width: 130 }, p => p.Dungeons.Group),

    // Fortress
    'Fortress': createGenericHeader('Fortress', { width: 100 }, p => p.Fortress.Fortress),
    'Upgrades': createGenericHeader('Upgrades', { width: 100 }, p => p.Fortress.Upgrades),
    'Gem Mine': createGenericHeader('Gem Mine', { width: 100 }, p => p.Fortress.GemMine),
    'Fortress Honor': createGenericHeader('Fortress Honor', { width: 150 }, p => p.Fortress.Honor),
    'Wall': createGenericHeader('Wall', { width: 100 }, p => p.Fortress.Fortifications),
    'Quarters': createGenericHeader('Quarters', { width: 100 }, p => p.Fortress.LaborerQuarters),
    'Woodcutter': createGenericHeader('Woodcutter', { width: 100 }, p => p.Fortress.WoodcutterGuild),
    'Quarry': createGenericHeader('Quarry', { width: 100 }, p => p.Fortress.Quarry),
    'Academy': createGenericHeader('Academy', { width: 100 }, p => p.Fortress.Academy),
    'Archery Guild': createGenericHeader('Archery', { width: 100 }, p => p.Fortress.ArcheryGuild),
    'Barracks': createGenericHeader('Barracks', { width: 100 }, p => p.Fortress.Barracks),
    'Mage Tower': createGenericHeader('Mages', { width: 100 }, p => p.Fortress.MageTower),
    'Treasury': createGenericHeader('Treasury', { width: 100 }, p => p.Fortress.Treasury),
    'Smithy': createGenericHeader('Smithy', { width: 100 }, p => p.Fortress.Smithy),

    // Pets
    'Shadow': createGenericHeader('Shadow', { width: 100 }, p => p.Pets.Shadow),
    'Light': createGenericHeader('Light', { width: 100 }, p => p.Pets.Light),
    'Earth': createGenericHeader('Earth', { width: 100 }, p => p.Pets.Earth),
    'Fire': createGenericHeader('Fire', { width: 100 }, p => p.Pets.Fire),
    'Water': createGenericHeader('Water', { width: 100 }, p => p.Pets.Water),

    // Runes
    'Rune Gold': createGenericHeader('Rune Gold', { width: 100 }, p => p.Runes.Gold),
    'Rune XP': createGenericHeader('Rune XP', { width: 100 }, p => p.Runes.XP),
    'Rune Chance': createGenericHeader('Rune Chance', { width: 100 }, p => p.Runes.Chance),
    'Rune Quality': createGenericHeader('Rune Quality', { width: 100 }, p => p.Runes.Quality),
    'Rune Health': createGenericHeader('Rune Health', { width: 100 }, p => p.Runes.Health),
    'Rune Damage': createGenericHeader('Rune Damage', { width: 100 }, p => p.Runes.Damage),
    'Rune Resist': createGenericHeader('Rune Resistance', { width: 110 }, p => p.Runes.Resistance),
    'Fire Resist': createGenericHeader('Fire Resistance', { width: 110 }, p => p.Runes.ResistanceFire),
    'Cold Resist': createGenericHeader('Cold Resistance', { width: 110 }, p => p.Runes.ResistanceCold),
    'Lightning Resist': createGenericHeader('Lightning Resistance', { width: 110 }, p => p.Runes.ResistanceLightning),

    // Special headers
    'Class': function (group, header, last) {
        group.add(header.alias || 'Class', header, {
            width: 120,
            flip: true
        }, cell => {
            return CellGenerator.Cell(PLAYER_CLASS[cell.player.Class], CompareEval.evaluate(cell.player.Class, header.color), '', last);
        }, null, cell => {
            return CellGenerator.Plain(PLAYER_CLASS[cell.Class], last);
        }, player => player.Class);
    },
    'ID': function (group, header, last) {
        group.add(header.alias || 'ID', header, {
            width: 100,
        }, cell => {
            return CellGenerator.Cell(cell.player.ID, '', '', last);
        }, null, cell => {
            return CellGenerator.Plain(cell.ID, last);
        }, player => player.ID);
    },
    'Rank': function (group, header, last) {
        group.add(header.alias || 'Rank', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(cell.player.Rank + (header.difference ? CellGenerator.Difference(cell.compare.Rank - cell.player.Rank, header.brackets) : ''), CompareEval.evaluate(cell.player.Rank, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Rank));
            var b = cell.operation(cell.players.map(p => p.compare.Rank));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(b - a, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(cell.Rank, last);
        }, player => player.Rank);
    },
    'Role': function (group, header, last) {
        group.add(header.alias || 'Role', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(GROUP_ROLES[cell.player.Group.Role], '', '', last);
        }, null, cell => {
            return CellGenerator.Plain(cell.Group.Role == -1 ? '?' : GROUP_ROLES[cell.Group.Role], last);
        }, player => player.Group.Role);
    },
    'Guild': function (group, header, last) {
        group.add(header.alias || 'Guild', header, {
            width: 200
        }, cell => {
            return CellGenerator.Cell(cell.player.Group.Name || '', '', '', last);
        }, null, cell => {
            return CellGenerator.Plain(cell.Group.Name || '', last);
        }, player => player.Group.Name || '');
    },
    'Mount': function (group, header, last) {
        group.add(header.alias || 'Mount', header, {
            width: 80
        }, cell => {
            return CellGenerator.Cell(PLAYER_MOUNT[cell.player.Mount] + (header.percentage && cell.player.Mount ? '%' : ''), CompareEval.evaluate(cell.player.Mount, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Mount));
            var b = cell.operation(cell.players.map(p => p.compare.Mount));
            return CellGenerator.Cell(PLAYER_MOUNT[a] + (header.percentage && a ? '%' : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(PLAYER_MOUNT[cell.Mount] + (header.percentage && cell.Mount ? '%' : ''), last);
        }, player => player.Mount);
    },
    'Awards': function (group, header, last) {
        group.add(header.alias || 'Awards', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Achievements.Owned + (header.hydra && cell.player.Achievements.Dehydration ? CellGenerator.Small(' H') : '') + (header.difference ? CellGenerator.Difference(cell.player.Achievements.Owned - cell.compare.Achievements.Owned, header.brackets) : ''), CompareEval.evaluate(cell.player.Achievements.Owned, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Achievements.Owned));
            var b = cell.operation(cell.players.map(p => p.compare.Achievements.Owned));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(cell.Achievements.Owned + (header.hydra && cell.Achievements.Dehydration ? CellGenerator.Small(' H') : ''), last);
        }, player => player.Achievements.Owned);
    },
    'Album': function (group, header, last) {
        group.add(header.alias || 'Album', header, {
            width: 100 + (header.difference ? 30 : 0) + (header.grail ? 15 : 0)
        }, cell => {
            var color = CompareEval.evaluate(100 * cell.player.Book / SCRAPBOOK_COUNT, header.color);
            if (header.percentage) {
                return CellGenerator.Cell((100 * cell.player.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.grail && cell.player.Achievements.Grail ? CellGenerator.Small(' G') : '') + (header.difference ? CellGenerator.Difference((100 * (cell.player.Book - cell.compare.Book) / SCRAPBOOK_COUNT).toFixed(2), header.brackets) : ''), color, '', last);
            } else {
                return CellGenerator.Cell(cell.player.Book + (header.grail && cell.player.Achievements.Grail ? CellGenerator.Small(' G') : '') + (header.difference ? CellGenerator.Difference(cell.player.Book - cell.compare.Book, header.brackets) : ''), color, '', last);
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
        }, cell => {
            if (header.percentage) {
                return CellGenerator.Plain((100 * cell.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.grail && cell.Achievements.Grail ? CellGenerator.Small(' G') : ''), last);
            } else {
                return CellGenerator.Plain(cell.Book + (header.grail && cell.Achievements.Grail ? CellGenerator.Small(' G') : ''), last);
            }
        }, player => player.Book);
    },
    'Treasure': function (group, header, last) {
        group.add(header.alias || 'Treasure', header, {
            width: 100
        }, cell => {
            if (cell.player.Group.Treasure == -1) return CellGenerator.Plain('?', last);
            return CellGenerator.Cell(cell.player.Group.Treasure + (header.difference ? CellGenerator.Difference(cell.player.Group.Treasure - cell.compare.Group.Treasure, header.brackets) : ''), CompareEval.evaluate(cell.player.Group.Treasure, header.color), '', last);
        }, cell => {
            var aa = cell.players.map(p => p.player.Group.Treasure).filter(x => x != -1);
            var bb = cell.players.map(p => p.compare.Group.Treasure).filter(x => x != -1);
            if (!aa.length || !bb.length) return CellGenerator.Plain('?');
            var a = cell.operation(aa);
            var b = cell.operation(bb);
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(cell.Group.Treasure == -1 ? '?' : cell.Group.Treasure, last);
        }, player => player.Group.Treasure);
    },
    'Instructor': function (group, header, last) {
        group.add(header.alias || 'Instructor', header, {
            width: 100
        }, cell => {
            if (cell.player.Group.Instructor == -1) return CellGenerator.Plain('?', last);
            return CellGenerator.Cell(cell.player.Group.Instructor + (header.difference ? CellGenerator.Difference(cell.player.Group.Instructor - cell.compare.Group.Instructor, header.brackets) : ''), CompareEval.evaluate(cell.player.Group.Instructor, header.color), '', last);
        }, cell => {
            var aa = cell.players.map(p => p.player.Group.Instructor).filter(x => x != -1);
            var bb = cell.players.map(p => p.compare.Group.Instructor).filter(x => x != -1);
            if (!aa.length || !bb.length) return CellGenerator.Plain('?');
            var a = cell.operation(aa);
            var b = cell.operation(bb);
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(cell.Group.Instructor == -1 ? '?' : cell.Group.Instructor, last);
        }, player => player.Group.Instructor);
    },
    'Pet': function (group, header, last) {
        group.add(header.alias || 'Pet', header, {
            width: 100
        }, cell => {
            if (cell.player.Group.Pet == -1) return CellGenerator.Plain('?', last);
            return CellGenerator.Cell(cell.player.Group.Pet + (header.difference ? CellGenerator.Difference(cell.player.Group.Pet - cell.compare.Group.Pet, header.brackets) : ''), CompareEval.evaluate(cell.player.Group.Pet, header.color), '', last);
        }, cell => {
            var aa = cell.players.map(p => p.player.Group.Pet).filter(x => x != -1);
            var bb = cell.players.map(p => p.compare.Group.Pet).filter(x => x != -1);
            if (!aa.length || !bb.length) return CellGenerator.Plain('?');
            var a = cell.operation(aa);
            var b = cell.operation(bb);
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(cell.Group.Pet == -1 ? '?' : cell.Group.Pet, last);
        }, player => player.Group.Pet);
    },
    'Knights': function (group, header, last) {
        group.add(header.alias || 'Knights', header, {
            width: 100
        }, cell => {
            if (cell.player.Fortress.Knights == -1) return CellGenerator.Plain((cell.player.Fortress.Knights == -1 ? '?' : cell.player.Fortress.Knights) + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : ''), last);
            return CellGenerator.Cell(cell.player.Fortress.Knights + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : '') + (header.difference ? CellGenerator.Difference(cell.player.Fortress.Knights - cell.compare.Fortress.Knights, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Knights, header.color), '', last);
        }, cell => {
            var aa = cell.players.map(p => p.player.Fortress.Knights).filter(x => x != -1);
            var bb = cell.players.map(p => p.compare.Fortress.Knights).filter(x => x != -1);
            if (!aa.length || !bb.length) return CellGenerator.Plain('?');
            var a = cell.operation(aa);
            var b = cell.operation(bb);
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain((cell.Fortress.Knights == -1 ? '?' : cell.Fortress.Knights) + (header.maximum ? `/${ cell.Fortress.Fortress }` : ''), last);
        }, player => player.Fortress.Knights);
    },
    'Fortress Rank': function (group, header, last) {
        group.add(header.alias || 'Fortress Rank', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Rank + (header.difference ? CellGenerator.Difference(cell.compare.Fortress.Rank - cell.player.Fortress.Rank, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Rank, header.color), '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Rank));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Rank));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(b - a, header.brackets) : ''), '', CompareEval.evaluate(a, header.color));
        }, cell => {
            return CellGenerator.Plain(cell.Fortress.Rank, last);
        }, player => player.Fortress.Rank);
    },
    'Building': function (group, header, last) {
        group.add(header.alias || 'Building', header, {
            width: 180,
        }, cell => {
            return CellGenerator.Cell(FORTRESS_BUILDINGS[cell.player.Fortress.Upgrade.Building], CompareEval.evaluate(cell.player.Fortress.Upgrade.Building, header.color), '', last);
        }, null, cell => {
            return CellGenerator.Plain(FORTRESS_BUILDINGS[cell.Fortress.Upgrade.Building], last);
        }, player => player.Fortress.Upgrade.Building == 0 ? -1 : (12 - player.Fortress.Upgrade.Building));
    },
    'Last Active': function (group, header, last) {
        group.add(header.alias || 'Last Active', header, {
            width: 160,
        }, cell => {
            var a = cell.player.getInactiveDuration();
            return CellGenerator.Cell(CompareEval.evaluate(a, header.value) || formatDate(cell.player.LastOnline), CompareEval.evaluate(a, header.color), '', last);
        }, null, cell => {
            return CellGenerator.Plain(CompareEval.evaluate(cell.getInactiveDuration(), header.value) || formatDate(cell.LastOnline), last);
        }, player => player.LastOnline);
    },
    'Guild Joined': function (group, header, last) {
        group.add(header.alias || 'Guild Joined', header, {
            width: 160,
        }, cell => {
            return CellGenerator.Cell(cell.player.hasGuild() ? formatDate(cell.player.Group.Joined) : '', '', '', last);
        }, null, cell => {
            return CellGenerator.Plain(cell.hasGuild() ? formatDate(cell.Group.Joined) : '', last);
        }, player => player.Group.Joined);
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

    add (player, latest) {
        super.push({ player: player, latest: latest, index: this.length });
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
                    var hlast = (!glast && hi == ha.length - 1) || (hi != ha.length - 1 && ha[hi + 1].name == 'Awards') || (hi != ha.length - 1 && header.name == 'Awards');

                    if (ReservedHeaders[header.name]) {
                        ReservedHeaders[header.name](group, header, hlast);
                    } else {
                        group.add(header.alias || header.name, header, {
                            width: 100
                        }, cell => {
                            var a = getObjectAt(cell.player, header.path);
                            var b = getObjectAt(cell.compare, header.path);
                            var c = header.flip ? (b - a) : (a - b);
                            return CellGenerator.Cell(CompareEval.evaluate(a, header.value) || a + (header.difference ? CellGenerator.Difference(Number.isInteger(c) ? c : c.toFixed(2), header.brackets) : ''), CompareEval.evaluate(a, header.color), '', hlast);
                        }, cell => {
                            var a = cell.operation(cell.players.map(p => getObjectAt(p.player, header.path)));
                            var b = cell.operation(cell.players.map(p => getObjectAt(p.compare, header.path)));
                            var c = header.flip ? (b - a) : (a - b);
                            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(c, header.brackets) : ''), '', CompareEval.evaluate(a, header.color), false);
                        }, cell => {
                            var a = getObjectAt(cell, header.path);
                            return CellGenerator.Plain(CompareEval.evaluate(a, header.value) || a, hlast);
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

    flatten () {
        return this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);
    }

    createHistoryTable (players) {
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
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => h.name == '' ? '' : `<td width="${ h.width }" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                    <td class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ i + 1 }</td>` : '' }<td class="border-right-thin">${ formatDate(new Date(r[0])) }</td>${ join(flat, h => h.generators.cell({ player: r[1], compare: i != players.length - 1 ? players[i + 1][1] : r[1] })) }</tr>`) }
            </tbody>
        `, 200 + this.config.reduce((a, b) => a + b.width, 0) + (this.root.indexed ? 50 : 0)];
    }

    createPlayersTable (players, sortby, sortstyle) {
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
                var sort = flat.find(h => h.name == sortby);
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
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => h.name == '' ? '' : `<td width="${ h.width }" data-sortable="${ sortby == h.name ? sortstyle : 0 }" data-sortable-key="${ h.name }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td colspan="1" class="border-bottom-thick"></td>' : '' }
                    <td colspan="2" class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ (this.root.indexed == 1 ? r.index : i) + 1 }</td>` : '' }<td>${ r.player.Prefix }</td><td class="border-right-thin clickable ${ r.latest ? '' : 'foreground-red' }" data-player="${ r.player.Identifier }">${ r.player.Name }</td>${ join(flat, h => h.generators.list(r.player)) }</tr>`) }
            </tbody>
        `, 100 + 250 + this.config.reduce((a, b) => a + b.width, 0) + (this.root.indexed ? 50 : 0)];
    }

    createStatisticsTable (players, joined, kicked, sortby, sortstyle) {
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
                var sort = flat.find(h => h.name == sortby);
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
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => h.name == '' ? '' : `<td width="${ h.width }" data-sortable="${ sortby == h.name ? sortstyle : 0 }" data-sortable-key="${ h.name }" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td colspan="1" class="border-bottom-thick"></td>' : '' }
                    <td colspan="1" class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ (this.root.indexed == 1 ? r.index : i) + 1 }</td>` : '' }<td class="border-right-thin clickable" data-player="${ r.player.Identifier }">${ r.player.Name }</td>${ join(flat, h => h.generators.cell(r)) }</tr>`) }
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
                    ${ join(flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics({ players: players, operation: ar => Math.min(... ar) }) : '<td></td>') }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Average</td>
                    ${ join(flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics({ players: players, operation: ar => Math.trunc(ar.reduce((a, b) => a + b, 0) / ar.length) }) : '<td></td>') }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Maximum</td>
                    ${ join(flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics({ players: players, operation: ar => Math.max(... ar) }) : '<td></td>') }
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

            content += `
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Warrior</td>
                    <td>${ classes[0] }</td>
                    ${ joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="1">Joined</td>
                        <td colspan="${ Math.max(1, flat.length - 2) }" rowspan="3">${ joined.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Mage</td>
                    <td>${ classes[1] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Scout</td>
                    <td>${ classes[2] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Assassin</td>
                    <td>${ classes[3] }</td>
                    ${ kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="3" colspan="1">Left</td>
                        <td colspan="${ Math.max(1, flat.length - 2) }" rowspan="3">${ kicked.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Battle Mage</td>
                    <td>${ classes[4] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.root.indexed ? 'colspan="2"' : '' }>Berserker</td>
                    <td>${ classes[5] }</td>
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
        return def || '';
    }
}

// Control markers
const SP_KEYWORD_CATEGORY = 'category';
const SP_KEYWORD_HEADER = 'header';

// Parameters
const SP_KEYWORD_GLOBAL_BOOL = [ 'members', 'indexed' ];
const SP_KEYWORD_PARAMETER_BOOL = [ 'difference', 'percentage', 'hydra', 'flip', 'visible', 'brackets', 'statistics', 'maximum', 'members', 'indexed', 'grail' ];
const SP_KEYWORD_PARAMETER_NUMBER = [ 'width' ];
const SP_KEYWORD_PARAMETER_STRING = [ 'path', 'type', 'alias' ];
const SP_KEYWORD_PARAMETER_ARRAY = [ 'color', 'value' ];

// Reserved values
const SP_KEYWORD_CATEGORY_RESERVED = Object.keys(ReservedCategories);
const SP_KEYWORD_HEADER_RESERVED = Object.keys(ReservedHeaders);
const SP_KEYWORD_BOOL = [ 'on', 'off' ];
const SP_KEYWORD_SPECIAL = [ 'static' ];
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
    'none': '0',
    'warrior': '1',
    'mage': '2',
    'scout': '3',
    'assassin': '4',
    'battlemage': '5',
    'berserker': '6'
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

            if (arr.length == 2 && eq == 'd') {
                if (!color || isCSSColor(a)) return [ eq, 0, a ];
                else if (isCSSColor(`#${ a }`)) return [ eq, 0, `#${ a }` ];
            } else if (arr.length == 3 && Object.values(SP_KEYWORD_EQ_MAP).includes(eq) && !isNaN(a)) {
                if (!color || isCSSColor(b)) return [ eq, Number(a), b ];
                else if (isCSSColor(`#${ b }`)) return [ eq, Number(a), `#${ b }` ];
            } else return null;
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

                for (var i = 0, l = words.length; i < l; i++) {
                    var word = words[i];

                    if (SP_KEYWORD_PARAMETER_ARRAY.includes(words[0]) && ((words[1] == 'default' && i == 2) || (i == 3) || (i == 5)) && (isCSSColor(word) || isCSSColor(`#${ word }`))) {
                        if (isCSSColor(word)) rcontent.push(`<span class="ta-color" style="color: ${ word }">${ word }</span>`);
                        else rcontent.push(`<span class="ta-color" style="color: #${ word }">${ word }</span>`);
                    } else if (word[0] == '@' && Object.keys(SP_KEYWORD_CONSTANTS).includes(word.slice(1))) rcontent.push(`<span class="ta-constant">${ word }</span>`);
                    else if (SP_KEYWORD_CATEGORY == words[0] && SP_KEYWORD_CATEGORY_RESERVED.includes(word)) rcontent.push(`<span class="ta-reserved">${ word }</span>`);
                    else if (SP_KEYWORD_HEADER == words[0] && SP_KEYWORD_HEADER_RESERVED.includes(word)) rcontent.push(`<span class="ta-reserved">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_BOOL.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_GLOBAL_BOOL.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_NUMBER.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_STRING.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_ARRAY.includes(word)) rcontent.push(`<span class="ta-keyword">${ word }</span>`);
                    else if (SP_KEYWORD_PARAMETER_BOOL.includes(words[0]) && SP_KEYWORD_BOOL.includes(word)) rcontent.push(`<span class="ta-boolean-${ word }">${ word }</span>`);
                    else if (words[0] == 'indexed' && SP_KEYWORD_SPECIAL == word) rcontent.push(`<span class="ta-boolean-on">static</span>`);
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

                if ((SP_KEYWORD_HEADER_RESERVED.includes(this.h.name) || this.h.path) && this.c) {
                    this.c.h.push(this.h);
                }

                this.h = null;
            }
        }

        pushCategory () {
            if (this.c) {
                this.pushHeader();
                if (this.c.h.length || SP_KEYWORD_CATEGORY_RESERVED.includes(this.c.name)) {
                    if (SP_KEYWORD_CATEGORY_RESERVED.includes(this.c.name)) {
                        merge(this.c, this.g);
                    }

                    this.root.c.push(this.c);
                }

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
                if (SP_KEYWORD_GLOBAL_BOOL.includes(param)) {
                    this.root[param] = arg;
                } else if (this.h) {
                    this.h[param] = arg;
                } else if (this.c) {
                    this.c[param] = arg;
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
            } else if (param == 'indexed' && arg == 'static') {
                this.addRawParam(param, 2);
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
