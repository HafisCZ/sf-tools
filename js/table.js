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
        }, cell => {
            var potion = cell.player.Potions[0].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, cell => {
            var potion = cell.Potions[0].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, player => player.Potions[0].Size);

        // Potion 2
        group.add('', category, {
            width: 33
        }, cell => {
            var potion = cell.player.Potions[1].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, null, cell => {
            var potion = cell.Potions[1].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color);
        }, player => player.Potions[1].Size);

        // Potion 3
        group.add('', category, {
            width: 33
        }, cell => {
            var potion = cell.player.Potions[2].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color, !last);
        }, null, cell => {
            var potion = cell.Potions[2].Size;
            var color = CompareEval.evaluate(potion, category.color) || '';
            return CellGenerator.Cell(potion, color, category.visible ? '' : color, !last);
        }, player => player.Potions[2].Size);
    }
};

function createGenericHeader (name, defaults, ptr) {
    return function (group, header, last) {
        group.add((header.alias != undefined ? header.alias : header.name), header, defaults, cell => {
            var value = ptr(cell.player);
            if (value == undefined) {
                return CellGenerator.Plain('?', last);
            }

            var reference = header.difference ? ptr(cell.compare) : '';
            if (reference) {
                reference = header.flip ? (reference - value) : (value - reference);
                reference = CellGenerator.Difference(reference, header.brackets, Number.isInteger(reference) ? reference : reference.toFixed(2));
            }

            var color = CompareEval.evaluate(value, header.color) || '';

            var displayValue = CompareEval.evaluate(value, header.value);
            var value = displayValue != undefined ? displayValue : value;

            return CellGenerator.Cell(value + (header.extra || '') + reference, color, header.visible ? '' : color, last);
        }, cell => {
            var value = cell.players.map(p => ptr(p.player)).filter(x => x != undefined);
            if (value.length == 0) {
                return CellGenerator.Plain('?');
            }

            value = cell.operation(value);

            var reference = header.difference ? cell.players.map(p => ptr(p.compare)).filter(x => x != undefined) : '';
            if (reference && reference.length) {
                reference = cell.operation(reference);
                reference = header.flip ? (reference - value) : (value - reference);
                reference = CellGenerator.Difference(reference, header.brackets, Number.isInteger(reference) ? reference : reference.toFixed(2));
            }

            var color = CompareEval.evaluate(value, header.color) || '';

            var displayValue = CompareEval.evaluate(value, header.value);
            var value = displayValue != undefined ? displayValue : value;

            return CellGenerator.Cell(value + (header.extra || '') + reference, '', color);
        }, cell => {
            var value = ptr(cell);
            if (value == undefined) {
                return CellGenerator.Plain('?', last);
            }

            var color = CompareEval.evaluate(value, header.color) || '';

            var displayValue = CompareEval.evaluate(value, header.value);
            var value = displayValue != undefined ? displayValue : value;

            return CellGenerator.Cell(value + (header.extra || ''), color, header.visible ? '' : color, last);
        }, player => {
            var value = ptr(player);
            return value == undefined ? -1 : value;
        });
    };
}

function createPercentageHeader (name, ptr, ref) {
    return function (group, header, last) {
        group.add((header.alias != undefined ? header.alias : name) + (header.percentage ? ' %' : ''), header, {
            width: 100 + (header.percentage ? 20 : 0)
        }, cell => {
            var a = header.percentage ? Math.trunc(100 * ptr(cell.player) / ref(cell.player)) : ptr(cell.player);
            var b = header.percentage ? Math.trunc(100 * ptr(cell.compare) / ref(cell.compare)) : ptr(cell.compare);
            return CellGenerator.Cell((CompareEval.evaluate(a, header.value) || a) + (header.percentage ? '%' : '') + (header.difference ? CellGenerator.Difference(header.flip ? (b - a) : (a - b), header.brackets) : ''), CompareEval.evaluate(a, header.color) || '', '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => (header.percentage ? Math.trunc(100 * ptr(p.player) / ref(p.player)) : ptr(p.player))));
            var b = cell.operation(cell.players.map(p => (header.percentage ? Math.trunc(100 * ptr(p.compare) / ref(p.compare)) : ptr(p.compare))));
            return CellGenerator.Cell((CompareEval.evaluate(a, header.value) || a) + (header.percentage ? '%' : '') + (header.difference ? CellGenerator.Difference(header.flip ? (b - a) : (a - b), header.brackets) : ''), '', CompareEval.evaluate(a, header.color) || '');
        }, cell => {
            var a = header.percentage ? Math.trunc(100 * ptr(cell) / ref(cell)) : ptr(cell);
            return CellGenerator.Cell((CompareEval.evaluate(a, header.value) || a) + (header.percentage ? '%' : ''), CompareEval.evaluate(a, header.color) || '', '', last);
        }, player => header.percentage ? (ptr(player) / ref(player)) : ptr(player));
    };
}

const ReservedHeaders = {
    // Attributes
    'Strength': createGenericHeader('Str', { width: 100 }, p => p.Strength.Total),
    'Dexterity': createGenericHeader('Dex', { width: 100 }, p => p.Dexterity.Total),
    'Intelligence': createGenericHeader('Int', { width: 100 }, p => p.Intelligence.Total),
    'Constitution': createGenericHeader('Con', { width: 100 }, p => p.Constitution.Total),
    'Luck': createGenericHeader('Lck', { width: 100 }, p => p.Luck.Total),
    'Attribute': createGenericHeader('Attribute', { width: 100 }, p => p.Primary.Total),

    // Bonus Attributes
    'Strength Bonus': createPercentageHeader('Str Bonus', p => p.Strength.Bonus, p => p.Strength.Total),
    'Dexterity Bonus': createPercentageHeader('Dex Bonus', p => p.Dexterity.Bonus, p => p.Dexterity.Total),
    'Intelligence Bonus': createPercentageHeader('Int Bonus', p => p.Intelligence.Bonus, p => p.Intelligence.Total),
    'Constitution Bonus': createPercentageHeader('Con Bonus', p => p.Constitution.Bonus, p => p.Constitution.Total),
    'Luck Bonus': createPercentageHeader('Lck Bonus', p => p.Luck.Bonus, p => p.Luck.Total),
    'Bonus': createPercentageHeader('Bonus', p => p.Primary.Bonus, p => p.Primary.Total),

    'Base Sum': createPercentageHeader('Base Sum', p => p.Primary.Base + p.Constitution.Base, p => p.Primary.Total + p.Constitution.Total),

    // Base Attributes
    'Base Strength': createPercentageHeader('Base Str', p => p.Strength.Base, p => p.Strength.Total),
    'Base Dexterity': createPercentageHeader('Base Dex', p => p.Dexterity.Base, p => p.Dexterity.Total),
    'Base Intelligence': createPercentageHeader('Base Int', p => p.Intelligence.Base, p => p.Intelligence.Total),
    'Base Constitution': createPercentageHeader('Base Con', p => p.Constitution.Base, p => p.Constitution.Total),
    'Base Luck': createPercentageHeader('Base Lck', p => p.Luck.Base, p => p.Luck.Total),
    'Base': createPercentageHeader('Base', p => p.Primary.Base, p => p.Primary.Total),

    // Character
    'Level': createGenericHeader('Level', { width: 100 }, p => p.Level),
    'Honor': createGenericHeader('Honor', { width: 100 }, p => p.Honor),
    'Health': createGenericHeader('Health', { width: 100 }, p => p.Health),
    'Armor': createGenericHeader('Armor', { width: 100 }, p => p.Armor),
    'Space': createGenericHeader('Space', { width: 100 }, p => p.Fortress.Treasury + 5),
    'Mirror': createGenericHeader('Mirror', { width: 100 }, p => p.Mirror ? 13 : p.MirrorPieces),
    'Equipment': createGenericHeader('Equipment', { width: 130 }, p => Object.values(p.Items).reduce((total, i) => total + i.getItemLevel(), 0)),

    // Group
    'Treasure': createGenericHeader('Treasure', { width: 100 }, p => p.Group.Treasure),
    'Instructor': createGenericHeader('Instructor', { width: 100 }, p => p.Group.Instructor),
    'Pet': createGenericHeader('Pet', { width: 100 }, p => p.Group.Pet),

    // Dungeons
    'Tower': createGenericHeader('Tower', { width: 100 }, p => p.Dungeons.Tower),
    'Portal': createGenericHeader('Portal', { width: 100 }, p => p.Dungeons.Player),
    'Guild Portal': createGenericHeader('Guild Portal', { width: 130 }, p => p.Dungeons.Group),
    'Twister': createGenericHeader('Twister', { width: 100 }, p => p.Dungeons.Twister),
    'Dungeon': createGenericHeader('Dungeon', { width: 100 }, p => p.Dungeons.Normal.Total),
    'Shadow Dungeon': createGenericHeader('Shadow', { width: 100 }, p => p.Dungeons.Shadow.Total),

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
    'Wood': createGenericHeader('Wood', { width: 100 }, p => p.Fortress.Wood),
    'Stone': createGenericHeader('Stone', { width: 100 }, p => p.Fortress.Stone),
    'Raid Wood': createGenericHeader('Raid Wood', { width: 100 }, p => p.Fortress.RaidWood),
    'Raid Stone': createGenericHeader('Raid Stone', { width: 100 }, p => p.Fortress.RaidStone),

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
    'Rune Health': createGenericHeader('Rune Health', { width: 120 }, p => p.Runes.Health),
    'Rune Damage': createGenericHeader('Rune Damage', { width: 100 }, p => p.Runes.Damage),
    'Rune Resist': createGenericHeader('Rune Resistance', { width: 110 }, p => p.Runes.Resistance),
    'Fire Resist': createGenericHeader('Fire Resistance', { width: 110 }, p => p.Runes.ResistanceFire),
    'Cold Resist': createGenericHeader('Cold Resistance', { width: 110 }, p => p.Runes.ResistanceCold),
    'Lightning Resist': createGenericHeader('Lightning Resistance', { width: 110 }, p => p.Runes.ResistanceLightning),
    'Fire Damage': createGenericHeader('Fire Damage', { width: 110 }, p => p.Runes.DamageFire),
    'Cold Damage': createGenericHeader('Cold Damage', { width: 110 }, p => p.Runes.DamageCold),
    'Lightning Damage': createGenericHeader('Lightning Damage', { width: 110 }, p => p.Runes.DamageLightning),

    // Special headers
    'Class': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Class', header, {
            width: 120,
            flip: true
        }, cell => {
            return CellGenerator.Cell(PLAYER_CLASS[cell.player.Class], CompareEval.evaluate(cell.player.Class, header.color) || '', '', last);
        }, null, cell => {
            return CellGenerator.Cell(PLAYER_CLASS[cell.Class], CompareEval.evaluate(cell.Class, header.color) || '', '', last);
        }, player => player.Class);
    },
    'ID': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'ID', header, {
            width: 100,
        }, cell => {
            return CellGenerator.Plain(cell.player.ID, last);
        }, null, cell => {
            return CellGenerator.Plain(cell.ID, last);
        }, player => player.ID);
    },
    'Rank': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Rank', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(cell.player.Rank + (header.difference ? CellGenerator.Difference(cell.compare.Rank - cell.player.Rank, header.brackets) : ''), CompareEval.evaluate(cell.player.Rank, header.color) || '', '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Rank));
            var b = cell.operation(cell.players.map(p => p.compare.Rank));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(b - a, header.brackets) : ''), '', CompareEval.evaluate(a, header.color) || '');
        }, cell => {
            return CellGenerator.Cell(cell.Rank, CompareEval.evaluate(cell.Rank, header.color) || '', '', last);
        }, player => player.Rank);
    },
    'Role': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Role', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Plain(cell.player.Group.Role == undefined ? '?' : GROUP_ROLES[cell.player.Group.Role], last);
        }, null, cell => {
            return CellGenerator.Plain(cell.Group.Role == undefined ? '?' : GROUP_ROLES[cell.Group.Role], last);
        }, player => player.Group.Role);
    },
    'Guild': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Guild', header, {
            width: 200
        }, cell => {
            return CellGenerator.Plain(cell.player.Group.Name || '', last);
        }, null, cell => {
            return CellGenerator.Plain(cell.Group.Name || '', last);
        }, player => player.Group.Name || '');
    },
    'Mount': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Mount', header, {
            width: 80
        }, cell => {
            return CellGenerator.Cell(PLAYER_MOUNT[cell.player.Mount] + (header.percentage && cell.player.Mount ? '%' : ''), CompareEval.evaluate(cell.player.Mount, header.color) || '', '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Mount));
            var b = cell.operation(cell.players.map(p => p.compare.Mount));
            return CellGenerator.Cell(PLAYER_MOUNT[a] + (header.percentage && a ? '%' : ''), '', CompareEval.evaluate(a, header.color) || '');
        }, cell => {
            return CellGenerator.Cell(PLAYER_MOUNT[cell.Mount] + (header.percentage && cell.Mount ? '%' : ''), CompareEval.evaluate(cell.Mount, header.color) || '', '', last);
        }, player => player.Mount);
    },
    'Awards': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Awards', header, {
            width: 100
        }, cell => {
            return CellGenerator.Cell(cell.player.Achievements.Owned + (header.hydra && cell.player.Achievements.Dehydration ? CellGenerator.Small(' H') : '') + (header.difference ? CellGenerator.Difference(cell.player.Achievements.Owned - cell.compare.Achievements.Owned, header.brackets) : ''), CompareEval.evaluate(cell.player.Achievements.Owned, header.color) || '', '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Achievements.Owned));
            var b = cell.operation(cell.players.map(p => p.compare.Achievements.Owned));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color) || '');
        }, cell => {
            return CellGenerator.Cell(cell.Achievements.Owned + (header.hydra && cell.Achievements.Dehydration ? CellGenerator.Small(' H') : ''), CompareEval.evaluate(cell.Achievements.Owned, header.color) || '', '', last);
        }, player => player.Achievements.Owned);
    },
    'Album': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Album', header, {
            width: 100 + (header.difference ? 30 : 0) + (header.grail ? 15 : 0)
        }, cell => {
            var color = CompareEval.evaluate(100 * cell.player.Book / SCRAPBOOK_COUNT, header.color) || '';
            if (header.percentage) {
                return CellGenerator.Cell((100 * cell.player.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.grail && cell.player.Achievements.Grail ? CellGenerator.Small(' G') : '') + (header.difference ? CellGenerator.Difference((100 * (cell.player.Book - cell.compare.Book) / SCRAPBOOK_COUNT).toFixed(2), header.brackets) : ''), color, '', last);
            } else {
                return CellGenerator.Cell(cell.player.Book + (header.grail && cell.player.Achievements.Grail ? CellGenerator.Small(' G') : '') + (header.difference ? CellGenerator.Difference(cell.player.Book - cell.compare.Book, header.brackets) : ''), color, '', last);
            }
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Book));
            var b = cell.operation(cell.players.map(p => p.compare.Book));
            var color = CompareEval.evaluate(100 * a / SCRAPBOOK_COUNT, header.color) || '';
            if (header.percentage) {
                return CellGenerator.Cell((100 * a / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.difference ? CellGenerator.Difference((100 * (a - b) / SCRAPBOOK_COUNT).toFixed(2), header.brackets) : ''), '', color, false);
            } else {
                return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', color, false);
            }
        }, cell => {
            var color = CompareEval.evaluate(100 * cell.Book / SCRAPBOOK_COUNT, header.color) || '';
            if (header.percentage) {
                return CellGenerator.Cell((100 * cell.Book / SCRAPBOOK_COUNT).toFixed(2) + '%' + (header.grail && cell.Achievements.Grail ? CellGenerator.Small(' G') : ''), color, '', last);
            } else {
                return CellGenerator.Cell(cell.Book + (header.grail && cell.Achievements.Grail ? CellGenerator.Small(' G') : ''), color, '', last);
            }
        }, player => player.Book);
    },
    'Knights': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Knights', header, {
            width: 100
        }, cell => {
            if (cell.player.Fortress.Knights == undefined) return CellGenerator.Plain('?' + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : ''), last);
            return CellGenerator.Cell(cell.player.Fortress.Knights + (header.maximum ? `/${ cell.player.Fortress.Fortress }` : '') + (header.difference ? CellGenerator.Difference(cell.player.Fortress.Knights - cell.compare.Fortress.Knights, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Knights, header.color) || '', '', last);
        }, cell => {
            var aa = cell.players.map(p => p.player.Fortress.Knights).filter(x => x != undefined);
            var bb = cell.players.map(p => p.compare.Fortress.Knights).filter(x => x != undefined);
            if (!aa.length || !bb.length) return CellGenerator.Plain('?');
            var a = cell.operation(aa);
            var b = cell.operation(bb);
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(a - b, header.brackets) : ''), '', CompareEval.evaluate(a, header.color) || '');
        }, cell => {
            if (cell.Fortress.Knights == undefined) return CellGenerator.Plain('?' + (header.maximum ? `/${ cell.Fortress.Fortress }` : ''), last);
            return CellGenerator.Cell(cell.Fortress.Knights + (header.maximum ? `/${ cell.Fortress.Fortress }` : ''), CompareEval.evaluate(cell.Fortress.Knights, header.color) || '', '', last);
        }, player => player.Fortress.Knights == undefined ? -1 : player.Fortress.Knights);
    },
    'Fortress Rank': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Fortress Rank', header, {
            width: 100,
            flip: true
        }, cell => {
            return CellGenerator.Cell(cell.player.Fortress.Rank + (header.difference ? CellGenerator.Difference(cell.compare.Fortress.Rank - cell.player.Fortress.Rank, header.brackets) : ''), CompareEval.evaluate(cell.player.Fortress.Rank, header.color) || '', '', last);
        }, cell => {
            var a = cell.operation(cell.players.map(p => p.player.Fortress.Rank));
            var b = cell.operation(cell.players.map(p => p.compare.Fortress.Rank));
            return CellGenerator.Cell(a + (header.difference ? CellGenerator.Difference(b - a, header.brackets) : ''), '', CompareEval.evaluate(a, header.color) || '');
        }, cell => {
            return CellGenerator.Cell(cell.Fortress.Rank, CompareEval.evaluate(cell.Fortress.Rank, header.color) || '', '', last);
        }, player => player.Fortress.Rank);
    },
    'Building': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Building', header, {
            width: 180,
        }, cell => {
            return CellGenerator.Cell(FORTRESS_BUILDINGS[cell.player.Fortress.Upgrade.Building], CompareEval.evaluate(cell.player.Fortress.Upgrade.Building, header.color) || '', '', last);
        }, null, cell => {
            return CellGenerator.Cell(FORTRESS_BUILDINGS[cell.Fortress.Upgrade.Building], CompareEval.evaluate(cell.Fortress.Upgrade.Building, header.color) || '', '', last);
        }, player => player.Fortress.Upgrade.Building == 0 ? -1 : (12 - player.Fortress.Upgrade.Building));
    },
    'Last Active': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Last Active', header, {
            width: 160,
        }, cell => {
            var a = cell.player.getInactiveDuration();
            var da = CompareEval.evaluate(a, header.value);
            return CellGenerator.Cell(da != undefined ? da : formatDate(cell.player.LastOnline), CompareEval.evaluate(a, header.color) || '', '', last);
        }, null, cell => {
            var a = cell.getInactiveDuration();
            var da = CompareEval.evaluate(a, header.value);
            return CellGenerator.Cell(da != undefined ? da : formatDate(cell.LastOnline), CompareEval.evaluate(a, header.color) || '', '', last);
        }, player => player.LastOnline);
    },
    'Timestamp': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Timestamp', header, {
            width: 160,
        }, cell => {
            return CellGenerator.Plain(formatDate(cell.player.Timestamp), last);
        }, null, cell => {
            return CellGenerator.Plain(formatDate(cell.Timestamp), last);
        }, player => player.Timestamp);
    },
    'Guild Joined': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Guild Joined', header, {
            width: 160,
        }, cell => {
            return CellGenerator.Cell(cell.player.hasGuild() ? formatDate(cell.player.Group.Joined) : '', '', '', last);
        }, null, cell => {
            return CellGenerator.Plain(cell.hasGuild() ? formatDate(cell.Group.Joined) : '', last);
        }, player => player.Group.Joined);
    },
    'Aura': function (group, header, last) {
        group.add(header.alias != undefined ? header.alias : 'Aura', header, {
            width: 100
        }, cell => {
            if (!cell.player.Toilet.Aura) return CellGenerator.Plain('?', last);
            return CellGenerator.Cell(cell.player.Toilet.Aura + (header.difference ? CellGenerator.Difference(cell.player.Toilet.Aura - cell.compare.Toilet.Aura, header.brackets) : ''), CompareEval.evaluate(cell.player.Toilet.Aura, header.color) || '', '', last);
        }, null, cell => {
            if (!cell.Toilet.Aura) return CellGenerator.Plain('?', last);
            return CellGenerator.Cell(cell.Toilet.Aura, CompareEval.evaluate(cell.Toilet.Aura, header.color) || '', '', last);
        }, player => player.Toilet.Aura || 0);
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
                    var hlast = (!glast && hi == ha.length - 1) || (hi != ha.length - 1 && ha[hi + 1].name == 'Awards') || (hi != ha.length - 1 && header.name == 'Awards');

                    if (!header.expr && ReservedHeaders[header.name]) {
                        ReservedHeaders[header.name](group, header, hlast);
                    } else {
                        group.add((header.alias != undefined ? header.alias : header.name), header, {
                            width: 100
                        }, cell => {
                            var value = header.expr(cell.player);
                            if (value == undefined) {
                                return CellGenerator.Plain('?', hlast);
                            }

                            var reference = header.difference ? header.expr(cell.compare) : '';
                            if (reference) {
                                reference = header.flip ? (reference - value) : (value - reference);
                                reference = CellGenerator.Difference(reference, header.brackets, Number.isInteger(reference) ? reference : reference.toFixed(2));
                            }

                            var color = CompareEval.evaluate(value, header.color) || '';

                            var displayValue = CompareEval.evaluate(value, header.value);
                            var value = displayValue != undefined ? displayValue : value;

                            return CellGenerator.Cell(value + (header.extra || '') + reference, color, header.visible ? '' : color, hlast);
                        }, cell => {
                            var value = cell.players.map(p => header.expr(p.player)).filter(x => x != undefined);
                            if (value.length == 0) {
                                return CellGenerator.Plain('?');
                            }

                            value = cell.operation(value);

                            var reference = header.difference ? cell.players.map(p => header.expr(p.compare)).filter(x => x != undefined) : '';
                            if (reference && reference.length) {
                                reference = cell.operation(reference);
                                reference = header.flip ? (reference - value) : (value - reference);
                                reference = CellGenerator.Difference(reference, header.brackets, Number.isInteger(reference) ? reference : reference.toFixed(2));
                            }

                            var color = CompareEval.evaluate(value, header.color) || '';

                            var displayValue = CompareEval.evaluate(value, header.value);
                            var value = displayValue != undefined ? displayValue : value;

                            return CellGenerator.Cell(value + (header.extra || '') + reference, '', color);
                        }, cell => {
                            var value = header.expr(cell);
                            if (value == undefined) {
                                return CellGenerator.Plain('?', hlast);
                            }

                            var color = CompareEval.evaluate(value, header.color) || '';

                            var displayValue = CompareEval.evaluate(value, header.value);
                            var value = displayValue != undefined ? displayValue : value;

                            return CellGenerator.Cell(value + (header.extra || ''), color, header.visible ? '' : color, hlast);
                        }, header.expr);
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
                    ${ join(this.config, (g, index, array) => join(g.headers, (h, hindex, harray) => g.empty ? '' : `<td width="${ h.width }" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                </tr>
                <tr>
                    ${ this.root.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                    <td class="border-bottom-thick border-right-thin"></td>
                    ${ join(this.config, (g, index, array) => `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`) }
                </tr>
            </thead>
            <tbody>
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ i + 1 }</td>` : '' }<td class="border-right-thin">${ formatDate(r[0]) }</td>${ join(flat, h => h.generators.cell({ player: r[1], compare: i != players.length - 1 ? players[i + 1][1] : r[1] })) }</tr>`) }
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
                ${ join(players, (r, i) => `<tr class="${ r.hidden ? 'css-entry-hidden' : '' }">${ this.root.indexed ? `<td>${ (this.root.indexed == 1 ? r.index : i) + 1 }</td>` : '' }<td>${ r.player.Prefix }</td><td class="border-right-thin clickable ${ r.latest || !this.root.outdated ? '' : 'foreground-red' }" data-player="${ r.player.Identifier }" data-timestamp="${ r.player.Timestamp }">${ r.player.Identifier == 'w27_net_p268175' ? '<i class="chess queen icon"></i>' : '' }${ r.player.Name }</td>${ join(flat, h => h.generators.list(r.player)) }</tr>`, 0, this.root.performance) }
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
                ${ join(players, (r, i) => `<tr>${ this.root.indexed ? `<td>${ (this.root.indexed == 1 ? r.index : i) + 1 }</td>` : '' }<td class="border-right-thin clickable" data-player="${ r.player.Identifier }">${ r.player.Identifier == 'w27_net_p268175' ? '<i class="chess queen icon"></i>' : '' }${ r.player.Name }</td>${ join(flat, h => h.generators.cell(r)) }</tr>`) }
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
    'Level': p => p.Level,
    'Strength': p => p.Strength.Total,
    'Dexterity': p => p.Dexterity.Total,
    'Intelligence': p => p.Intelligence.Total,
    'Constitution': p => p.Constitution.Total,
    'Luck': p => p.Luck.Total,
    'Attribute': p => p.Primary.Total,
    'Strength Bonus': p => p.Strength.Bonus,
    'Dexterity Bonus': p => p.Dexterity.Bonus,
    'Intelligence Bonus': p => p.Intelligence.Bonus,
    'Constitution Bonus': p => p.Constitution.Bonus,
    'Luck Bonus': p => p.Luck.Bonus,
    'Bonus': p => p.Primary.Bonus,
    'Base Strength': p => p.Strength.Base,
    'Base Dexterity': p => p.Dexterity.Base,
    'Base Intelligence': p => p.Intelligence.Base,
    'Base Constitution': p => p.Constitution.Base,
    'Base Luck': p => p.Luck.Base,
    'Base': p => p.Primary.Base,
    'Honor': p => p.Honor,
    'Health': p => p.Health,
    'Armor': p => p.Armor,
    'Space': p => 5 + p.Fortress.Treasury,
    'Mirror': p => p.Mirror ? 13 : p.MirrorPieces,
    'Equipment': p => Object.values(p.Items).reduce((c, i) => c + (i.Attributes[0] > 0 ? i.getItemLevel() : 0), 0),
    'Treasure': p => p.Group.Treasure,
    'Intructor': p => p.Group.Intructor,
    'Pet': p => p.Group.Pet,
    'Tower': p => p.Dungeons.Tower,
    'Portal': p => p.Dungeons.Player,
    'Guild Portal': p => p.Dungeons.Group,
    'Twister': p => p.Dungeons.Twister,
    'Dungeon': p => p.Dungeons.Normal.Total,
    'Shadow Dungeon': p => p.Dungeons.Shadow.Total,
    'Fortress': p => p.Fortress.Fortress,
    'Upgrades': p => p.Fortress.Upgrades,
    'Gem Mine': p => p.Fortress.GemMine,
    'Fortress Honor': p => p.Fortress.Honor,
    'Wall': p => p.Fortress.Fortifications,
    'Quarters': p => p.Fortress.LaborerQuarters,
    'Woodcutter': p => p.Fortress.WoodcutterGuild,
    'Quarry': p => p.Fortress.Quarry,
    'Academy': p => p.Fortress.Academy,
    'Archery Guild': p => p.Fortress.ArcheryGuild,
    'Barracks': p => p.Fortress.Barracks,
    'Mage Tower': p => p.Fortress.MageTower,
    'Treasury': p => p.Fortress.Treasury,
    'Smithy': p => p.Fortress.Smithy,
    'Wood': p => p.Fortress.Wood,
    'Stone': p => p.Fortress.Stone,
    'Raid Wood': p => p.Fortress.RaidWood,
    'Raid Stone': p => p.Fortress.RaidStone,
    'Shadow': p => p.Pets.Shadow,
    'Light': p => p.Pets.Light,
    'Earth': p => p.Pets.Earth,
    'Fire': p => p.Pets.Fire,
    'Water': p => p.Pets.Water,
    'Rune Gold': p => p.Runes.Gold,
    'Rune XP': p => p.Runes.XP,
    'Rune Chance': p => p.Runes.Chance,
    'Rune Quality': p => p.Runes.Quality,
    'Rune Health': p => p.Runes.Health,
    'Rune Damage': p => p.Runes.Damage,
    'Rune Resist': p => p.Runes.Resistance,
    'Fire Resist': p => p.Runes.ResistanceFire,
    'Cold Resist': p => p.Runes.ResistanceCold,
    'Lightning Resist': p => p.Runes.ResistanceLightning,
    'Fire Damage': p => p.Runes.DamageFire,
    'Cold Damage': p => p.Runes.DamageCold,
    'Lightning Damage': p => p.Runes.DamageLightning,
    'Class': p => p.Class,
    'Rank': p => p.Rank,
    'Mount': p => p.Mount,
    'Awards': p => p.Achievements.Owned,
    'Album': p => p.Book,
    'Knights': p => p.Fortress.Knights,
    'Fortress Rank': p => p.Fortress.Rank,
    'Building': p => p.Fortress.Upgrade.Building,
    'Last Active': p => p.LastOnline,
    'Timestamp': p => p.Timestamp,
    'Guild Joined': p => p.Group.Joined,
    'Aura': p => p.Toilet.Aura
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
    'u-': (a) => -a
};

const AST_FUNCTIONS = {
    'trunc': (a) => Math.trunc(a),
    'ceil': (a) => Math.ceil(a),
    'floor': (a) => Math.floor(a),
};

const AST_FUNCTIONS_VAR = {
    'min': (a) => Math.min(... a),
    'max': (a) => Math.max(... a)
};

class AST {
    constructor (string) {
        this.tokens = string.split(/(\|\||\&\&|\>\=|\<\=|\=\=|\(|\)|\+|\-|\/|\*|\>|\<|\?|\:|\,)/).map(token => token.trim()).filter(token => token.length);
        this.root = this.evalExpression();
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
        if (val == '-') {
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
            if (node.c != undefined) {
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
                return SP_KEYWORD_MAPPING[node](p);
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
    'default': 'd'
};

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
        return `${ SFormat.Keyword(key) } ${ ReservedHeaders[a] ? SFormat.Reserved(a) : SFormat.Normal(a) }`;
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
    // visible - Show text on the background
    // brackets - Show difference within brackets
    // statistics - Show statistics of a column
    // maximum - Show maximum knights based on fortress level
    // grail - Show grail achievement
    new SettingsCommand(/^(difference|percentage|hydra|flip|visible|brackets|statistics|maximum|grail) (on|off)$/, function (root, string) {
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
                return isNaN(value) ? undefined : (Number.isInteger(value) ? value : value.toFixed(2));
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

        for (var line of string.split('\n')) {
            if (line.indexOf('#') != -1) {
                [ line ] = line.split('#');
            }

            var trimmed = line.trim();

            var command = SettingsCommands.find(command => command.isValid(trimmed));
            if (command) {
                command.parse(this, trimmed);
            }
        }

        this.pushCategory();

        return this.root;
    }

    clear () {
        this.root = {
            c: [],
            outdated: true
        };

        this.currentCategory = null;
        this.currentHeader = null;

        this.globals = {};
        this.shared = {
            visible: true
        };
        this.categoryShared = {};
    }

    createHeader (name) {
        this.pushHeader();
        this.currentHeader = {
            name: name
        };
    }

    pushHeader () {
        if (this.currentCategory && this.currentHeader && (ReservedHeaders[this.currentHeader.name] || this.currentHeader.expr)) {
            merge(this.currentHeader, this.categoryShared);
            merge(this.currentHeader, this.shared);

            this.currentCategory.h.push(this.currentHeader);
        }

        this.currentHeader = null;
    }

    createCategory (name) {
        this.pushCategory();

        this.categoryShared = {};
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
