// View
class View {
    constructor (parent) {
        this.$parent = $(`#${ parent }`);
    }

    show () {

    }

    load () {

    }

    refresh () {

    }
}

// Group Detail View
class GroupDetailView extends View {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            var node = document.createElement('div');
            node.innerHTML = `${ formatDate(Number(this.timestamp)) } - ${ formatDate(Number(this.reference)) }`;

            document.body.prepend(node);
            var range = document.createRange();
            range.selectNode(node);

            var range2 = document.createRange();
            range2.selectNode(this.$table.get(0));

            window.getSelection().removeAllRanges();

            window.getSelection().addRange(range);
            window.getSelection().addRange(range2);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();

            document.body.removeChild(node);
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            html2canvas(this.$table.get(0), {
                logging: false,
                onclone: (doc) => {
                    $(doc).find('[data-op="table"]').find('thead').prepend($(`<tr><td colspan="4" class="text-left">${ formatDate(Number(this.timestamp)) } - ${ formatDate(Number(this.reference)) }</td></tr>`));
                }
            }).then((canvas) => {
                canvas.toBlob((blob) => {
                    window.download(`${ this.group.Latest.Name }.${ this.timestamp }${ this.timestamp != this.reference ? `.${ this.reference }` : '' }.png`, blob);
                });
            });
        });

        // Context menu
        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Copy',
                    action: (source) => {
                        const element = document.createElement('textarea');
                        element.value = JSON.stringify(Database.Players[source.attr('data-id')][this.timestamp].Data);

                        document.body.appendChild(element);

                        element.select();

                        document.execCommand('copy');
                        document.body.removeChild(element);
                    }
                }
            ]
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').click(() => {
            UI.SettingsFloat.show(this.identifier);
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');
        this.$reference = this.$parent.find('[data-op="reference"]');
    }

    show (identitifier) {
        this.identifier = identitifier;
        this.group = Database.Groups[identitifier];

        this.$name.text(this.group.Latest.Name);

        this.timestamp = this.group.LatestTimestamp;
        this.reference = this.group.LatestTimestamp;

        var listTimestamp = [];
        var listReference = [];

        for (var [ timestamp, g ] of this.group.List) {
            listTimestamp.push({
                name: formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            if (timestamp <= this.timestamp) {
                listReference.push({
                    name: formatDate(timestamp),
                    value: timestamp
                });
            }
        }

        listReference[0].selected = true;

        // Dropdowns
        this.$timestamp.dropdown({
            values: listTimestamp
        }).dropdown('setting', 'onChange', (value, text) => {
            this.timestamp = value;
            this.reference = value;

            var subref = listReference.slice(listReference.findIndex(entry => entry.value == this.reference));
            for (var i = 0; i < subref.length; i++) {
                subref[i].selected = i == 0;
            }

            this.$reference.dropdown({
                values: subref
            }).dropdown('setting', 'onChange', (value, text) => {
                this.reference = value;
                this.load();
            });

            this.load();
        });

        this.$reference.dropdown({
            values: listReference
        }).dropdown('setting', 'onChange', (value, text) => {
            this.reference = value;
            this.load();
        });

        this.sorting = undefined;

        this.load();
    }

    load () {
        if (Settings.exists(this.identifier)) {
            this.$configure.get(0).style.setProperty('background', '#21ba45', 'important');
            this.$configure.get(0).style.setProperty('color', 'white', 'important');
        } else {
            this.$configure.get(0).style.setProperty('background', '');
            this.$configure.get(0).style.setProperty('color', '');
        }

        if (this.table) {
            this.sorting = this.table.sorting;
        }

        this.table = new TableInstance(Settings.load(this.identifier), TableType.Group);

        var current = this.group[this.timestamp];
        var reference = this.group[this.reference];

        // Joined and kicked members
        var joined = current.Members.filter(id => !reference.Members.includes(id)).map(id => {
            return getAt(Database.Players, id, this.timestamp, 'Name') || getAt(Database.Players, id, 'List', 0, 1, 'Name') || id;
        });

        var kicked = reference.Members.filter(id => !current.Members.includes(id)).map(id => {
            return getAt(Database.Players, id, this.timestamp, 'Name') || getAt(Database.Players, id, 'List', 0, 1, 'Name') || id;
        });

        // Members
        var members = [];
        for (var id of current.Members) {
            if (Database.Players[id] && Database.Players[id][this.timestamp]) {
                members.push(Database.Players[id][this.timestamp]);
            }
        }

        // Reference members
        var membersReferences = [];
        for (var member of members) {
            var player = Database.Players[member.Identifier];
            if (player) {
                var playerReference = player[this.reference];
                if (playerReference && playerReference.Group.Identifier == this.identifier) {
                    membersReferences.push(playerReference);
                } else {
                    var xx = player.List.concat();
                    xx.reverse();
                    var ts = xx.find(p => p[0] >= this.reference && p[1].Group.identifier == this.identifier);
                    if (ts) {
                        membersReferences.push(ts[1]);
                    }
                }
            } else {
                membersReferences.push(member);
            }
        }

        // Add entries
        var entries = new GroupTableArray(joined, kicked);
        members.forEach(function (player) {
            entries.add(player, membersReferences.find(c => c.Identifier == player.Identifier));
        });

        this.table.setEntries(entries);

        if (this.sorting != undefined) {
            this.table.sorting = this.sorting;
        }

        this.table.sort();

        this.refresh();
    }

    refresh () {
        var [content, size ] = this.table.getTableContent();

        this.$table.html(content).css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
        if (this.$table.css('left').slice(0, -2) < 0) {
            this.$table.css('left', '0px');
        }

        this.$parent.find('[data-sortable]').click((event) => {
            this.table.setSorting($(event.target).attr('data-sortable-key'));
            if (this.table) {
                this.sorting = this.table.sorting;
            }

            this.refresh();
        }).contextmenu((event) => {
            event.preventDefault();
            this.table.removeSorting($(event.target).attr('data-sortable-key'));
            if (this.table) {
                this.sorting = this.table.sorting;
            }

            this.refresh();
        });

        this.$parent.find('[data-id]').click((event) => {
            UI.PlayerDetail.show($(event.target).attr('data-id'), this.timestamp);
        });

        this.$context.context('bind', this.$parent.find('[data-id]'));
    }
}

// Player Detail FLot View
class PlayerDetailFloatView extends View {
    constructor (player) {
        super(player);
    }

    show (identifier, timestamp) {
        var player = Database.Players[identifier];
        player = player[Math.min(timestamp, player.LatestTimestamp)];

        var config = Settings.load(UI.current.identifier || player.Identifier);

        this.$parent.html(`
            <div class="ui text-center extreme header margin-none-bottom padding-none-bottom">${ player.Name }</div>
            <div class="ui text-center huge header padding-none-top margin-remove-top">${ PLAYER_CLASS[player.Class] } <span style="color: ${ CompareEval.evaluate(player.Level, config.getEntrySafe('Level').color) }">${ player.Level }</span></div>
            <div class="ui text-center big header padding-none-top padding-none-bottom">${ formatDate(player.Timestamp) }</div>
            <div class="content text-center">
                <div class="ui two columns grid">
                    <div class="column">
                        <div class="ui three columns grid player-small">
                            <div class="left aligned column font-big">Strength</div>
                            <div class="column"></div>
                            <div class="column">${ player.Strength.Total }</div>
                            <div class="left aligned column font-big">Dexterity</div>
                            <div class="column"></div>
                            <div class="column">${ player.Dexterity.Total }</div>
                            <div class="left aligned column font-big">Intelligence</div>
                            <div class="column"></div>
                            <div class="column">${ player.Intelligence.Total }</div>
                            <div class="left aligned column font-big">Constitution</div>
                            <div class="column"></div>
                            <div class="column">${ player.Constitution.Total }</div>
                            <div class="left aligned column font-big">Luck</div>
                            <div class="column"></div>
                            <div class="column">${ player.Luck.Total }</div>
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Health</div>
                            <div class="column"></div>
                            <div class="column">${ player.Health }</div>
                            <div class="left aligned column font-big">Armor</div>
                            <div class="column"></div>
                            <div class="column">${ player.Armor }</div>
                            <div class="left aligned column font-big">Damage</div>
                            <div class="column"></div>
                            <div class="column">${ player.Damage.Min } - ${ player.Damage.Max }</div>
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            ${ player.hasGuild() ? `
                                ${ player.Group.Own ? `
                                    <div class="left aligned column font-big">Treasure</div>
                                    <div class="column"></div>
                                    <div class="column" style="color: ${ CompareEval.evaluate(player.Group.Treasure, config.getEntrySafe('Treasure').color) };">${ player.Group.Treasure }</div>
                                    <div class="left aligned column font-big">Instructor</div>
                                    <div class="column"></div>
                                    <div class="column" style="color: ${ CompareEval.evaluate(player.Group.Instructor, config.getEntrySafe('Instructor').color) }">${ player.Group.Instructor }</div>
                                    <div class="left aligned column font-big">Pet</div>
                                    <div class="column"></div>
                                    <div class="column" style="color: ${ CompareEval.evaluate(player.Group.Pet, config.getEntrySafe('Pet').color) }">${ player.Group.Pet }</div>
                                    <div class="left aligned column font-big">Knights</div>
                                    <div class="column"></div>
                                    <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Knights, config.getEntrySafe('Knights').color) }">${ player.Fortress.Knights }</div>
                                    <div class="column"><br></div>
                                    <div class="column"></div>
                                    <div class="column"></div>
                                ` : '' }
                                <div class="left aligned column font-big">Guild</div>
                                <div class="column"></div>
                                <div class="column">${ player.Group.Name }</div>
                                <div class="left aligned column font-big">Guild join date</div>
                                <div class="column"></div>
                                <div class="column">${ formatDate(player.Group.Joined) }</div>
                                ${ player.Group.Role != undefined ? `
                                    <div class="left aligned column font-big">Role</div>
                                    <div class="column"></div>
                                    <div class="column">${ GROUP_ROLES[player.Group.Role] }</div>
                                ` : '' }
                            ` : '' }
                            ${ player.Fortress.Upgrade.Building >= 0 ? `
                                <div class="column"><br></div>
                                <div class="column"></div>
                                <div class="column"></div>
                                <div class="seven wide left aligned column font-big">Currently building</div>
                                <div class="four wide column"></div>
                                <div class="five wide column">${ FORTRESS_BUILDINGS[player.Fortress.Upgrade.Building] }</div>
                                <div class="left aligned column font-big"></div>
                                <div class="column"></div>
                                <div class="column">${ formatDate(player.Fortress.Upgrade.Finish) }</div>
                            ` : '' }
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            ${ player.Fortress.Fortifications ? `
                                <div class="left aligned column font-big">Wall</div>
                                <div class="column">${ player.Fortress.Fortifications }</div>
                                <div class="column">${ player.Fortress.Wall }</div>
                            ` : '' }
                            ${ player.Fortress.Barracks ? `
                                <div class="left aligned column font-big">Warriors</div>
                                <div class="column">${ player.Fortress.Barracks * 3 }x</div>
                                <div class="column">${ player.Fortress.Warriors }</div>
                            ` : '' }
                            ${ player.Fortress.ArcheryGuild ? `
                                <div class="left aligned column font-big">Archers</div>
                                <div class="column">${ player.Fortress.ArcheryGuild * 2 }x</div>
                                <div class="column">${ player.Fortress.Archers }</div>
                            ` : '' }
                            ${ player.Fortress.MageTower ? `
                                <div class="left aligned column font-big">Mages</div>
                                <div class="column">${ player.Fortress.MageTower }x</div>
                                <div class="column">${ player.Fortress.Mages }</div>
                            ` : '' }
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            ${ player.Runes.Gold ? `
                                <div class="left aligned column font-big">Bonus Gold</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.Gold, config.getEntrySafe('Rune Gold').color) }">${ player.Runes.Gold }%</div>
                            ` : '' }
                            ${ player.Runes.XP ? `
                                <div class="left aligned column font-big">Bonus XP</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.XP, config.getEntrySafe('Rune XP').color) }">${ player.Runes.XP }%</div>
                            ` : '' }
                            ${ player.Runes.Chance ? `
                                <div class="left aligned column font-big">Epic Chance</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.Chance, config.getEntrySafe('Rune Chance').color) }">${ player.Runes.Chance }%</div>
                            ` : '' }
                            ${ player.Runes.Quality ? `
                                <div class="left aligned column font-big">Item Quality</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.Quality, config.getEntrySafe('Rune Quality').color) }">${ player.Runes.Quality }%</div>
                            ` : '' }
                            ${ player.Runes.Health ? `
                                <div class="left aligned column font-big">Bonus Health</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.Health, config.getEntrySafe('Rune Health').color) }">${ player.Runes.Health }%</div>
                            ` : '' }
                            ${ player.Runes.Damage ? `
                                <div class="left aligned column font-big">Elemental Dmg</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.Damage, config.getEntrySafe('Rune Damage').color) }">${ player.Runes.Damage }%</div>
                            ` : '' }
                            ${ player.Runes.ResistanceFire ? `
                                <div class="left aligned column font-big">Fire Resist</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.ResistanceFire, config.getEntrySafe('Fire Resist').color) }">${ player.Runes.ResistanceFire }%</div>
                            ` : '' }
                            ${ player.Runes.ResistanceCold ? `
                                <div class="left aligned column font-big">Cold Resist</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.ResistanceCold, config.getEntrySafe('Cold Resist').color) }">${ player.Runes.ResistanceCold }%</div>
                            ` : '' }
                            ${ player.Runes.ResistanceLightning ? `
                                <div class="left aligned column font-big">Lightning Resist</div>
                                <div class="column"></div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Runes.ResistanceLightning, config.getEntrySafe('Lightning Resist').color) }">${ player.Runes.ResistanceLightning }%</div>
                            ` : '' }
                        </div>
                    </div>
                    <div class="column">
                        <div class="ui three columns grid player-small">
                            <div class="left aligned column font-big">Scrapbook</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(100 * player.Book / SCRAPBOOK_COUNT, config.getEntrySafe('Album').color) }">${ Number(100 * player.Book / SCRAPBOOK_COUNT).toFixed(2) }%</div>
                            <div class="column">${ player.Book } out of ${ SCRAPBOOK_COUNT }</div>
                            <div class="left aligned column font-big">Mount</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Mount, config.getEntrySafe('Mount').color) }">${ player.Mount ? (PLAYER_MOUNT[player.Mount] + '%') : 'None' }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Achievements</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Achievements.Owned, config.getEntrySafe('Awards').color) }">${ Math.trunc(100 * player.Achievements.Owned / ACHIEVEMENT_COUNT) }%${ config.getEntrySafe('Awards').hydra && player.Achievements.Dehydration ? '<span> H</span>' : '' }</div>
                            <div class="column">${ player.Achievements.Owned } out of ${ ACHIEVEMENT_COUNT }</div>
                            <div class="left aligned column font-big">Health Bonus</div>
                            <div class="column">${ player.Dungeons.Player }%</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Damage Bonus</div>
                            <div class="column">${ player.Dungeons.Group }%</div>
                            <div class="column"></div>
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Potions</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Potions[0].Size, config.getEntrySafe('Potions').color) }">${ player.Potions[0].Size ? `${ player.Potions[0].Size }%` : '' }</div>
                            <div class="left aligned column">${ player.Potions[0].Size ? POTIONS[player.Potions[0].Type] : '' }</div>
                            <div class="left aligned column font-big"><br></div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Potions[1].Size, config.getEntrySafe('Potions').color) }">${ player.Potions[1].Size ? `${ player.Potions[1].Size }%` : '' }</div>
                            <div class="left aligned column">${ player.Potions[1].Size ? POTIONS[player.Potions[1].Type] : '' }</div>
                            <div class="left aligned column font-big"><br></div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Potions[2].Size, config.getEntrySafe('Potions').color) }">${ player.Potions[2].Size ? `${ player.Potions[2].Size }%` : '' }</div>
                            <div class="left aligned column">${ player.Potions[2].Size ? POTIONS[player.Potions[2].Type] : '' }</div>
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Upgrades</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Upgrades, config.getEntrySafe('Upgrades').color) }">${ player.Fortress.Upgrades }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Rank</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Rank, config.getEntrySafe('Fortress Rank').color) }">${ player.Fortress.Rank }</div>
                            <div class="left aligned column" style="color: ${ CompareEval.evaluate(player.Fortress.Honor, config.getEntrySafe('Fortress Honor').color) }">(${ player.Fortress.Honor })</div>
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Fortress</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Fortress, config.getEntrySafe('Fortress').color) }">${ player.Fortress.Fortress }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Quarters</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.LaborerQuarters, config.getEntrySafe('Quarters').color) }">${ player.Fortress.LaborerQuarters }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Woodcutter</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.WoodcutterGuild, config.getEntrySafe('Woodcutter').color) }">${ player.Fortress.WoodcutterGuild }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Quarry</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Quarry, config.getEntrySafe('Quarry').color) }">${ player.Fortress.Quarry }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Gem Mine</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.GemMine, config.getEntrySafe('Gem Mine').color) }">${ player.Fortress.GemMine }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Academy</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Academy, config.getEntrySafe('Academy').color) }">${ player.Fortress.Academy }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Archery Guild</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.ArcheryGuild, config.getEntrySafe('Archery Guild').color) }">${ player.Fortress.ArcheryGuild }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Barracks</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Barracks, config.getEntrySafe('Barracks').color) }">${ player.Fortress.Barracks }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Mage Tower</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.MageTower, config.getEntrySafe('Mage Tower').color) }">${ player.Fortress.MageTower }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Treasury</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Treasury, config.getEntrySafe('Treasury').color) }">${ player.Fortress.Treasury }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Smithy</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Smithy, config.getEntrySafe('Smithy').color) }">${ player.Fortress.Smithy }</div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Fortifications</div>
                            <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Fortifications, config.getEntrySafe('Wall').color) }">${ player.Fortress.Fortifications }</div>
                            <div class="column"></div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        this.$parent.modal({
            centered: false,
            transition: 'fade'
        }).modal('show');
    }
}

// History View
class PlayerHistoryView extends View {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            var range = document.createRange();
            range.selectNode(this.$table.get(0));

            window.getSelection().removeAllRanges();

            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            html2canvas(this.$table.get(0), {
                logging: false
            }).then((canvas) => {
                canvas.toBlob((blob) => {
                    window.download(`${ this.player.Name }.png`, blob);
                });
            });
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').click(() => {
            UI.SettingsFloat.show(this.identifier);
        });

        this.$name = this.$parent.find('[data-op="name"]');
    }

    show (identifier) {
        this.identifier = identifier;

        this.list = Database.Players[identifier].List;
        this.player = Database.Players[identifier].Latest;

        this.$name.text(this.player.Name);

        this.load();
    }

    load () {
        // Table instance
        this.table = new TableInstance(Settings.load(this.identifier), TableType.History);
        this.table.setEntries(this.list);

        // Configuration indicator
        if (Settings.exists(this.identifier)) {
            this.$configure.get(0).style.setProperty('background', '#21ba45', 'important');
            this.$configure.get(0).style.setProperty('color', 'white', 'important');
        } else {
            this.$configure.get(0).style.setProperty('background', '');
            this.$configure.get(0).style.setProperty('color', '');
        }

        var [ content, size ] = this.table.getTableContent();

        this.$table.html(content).css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
        if (this.$table.css('left').slice(0, -2) < 0) {
            this.$table.css('left', '0px');
        }
    }
}

// Browse View
class BrowseView extends View {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            var range = document.createRange();
            range.selectNode(this.$table.get(0));

            window.getSelection().removeAllRanges();

            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            html2canvas(this.$table.get(0), {
                logging: false
            }).then((canvas) => {
                canvas.toBlob((blob) => {
                    window.download(`players.${ this.timestamp }.png`, blob);
                });
            });
        });

        this.hidden = false;

        // Context menu
        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Show / Hide',
                    action: (source) => {
                        Database.hide(source.attr('data-id'));
                        this.$filter.trigger('change');
                    }
                },
                {
                    label: 'Copy',
                    action: (source) => {
                        const element = document.createElement('textarea');
                        element.value = JSON.stringify(Database.Players[source.attr('data-id')].Latest.Data);

                        document.body.appendChild(element);

                        element.select();

                        document.execCommand('copy');
                        document.body.removeChild(element);
                    }
                },
                {
                    label: 'Remove permanently',
                    action: (source) => {
                        Storage.removeByID(source.attr('data-id'));
                        this.$filter.trigger('change');
                    }
                }
            ]
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').click(() => {
            UI.SettingsFloat.show('players');
        });

        // Hidden toggle
        this.$parent.find('[data-op="hidden"]').checkbox('uncheck').change((event) => {
            this.hidden = $(event.currentTarget).checkbox('is checked');
            this.recalculate = true;
            this.$filter.trigger('change');
        });

        // Filter
        this.$filter = this.$parent.find('[data-op="filter"]');
        this.$filter.change((event) => {
            var filter = $(event.target).val().split(/(?:\s|\b)(c|p|g|s|e|l|f|k):/);

            var terms = [
                {
                   test: function (arg, player, timestamp) {
                       var matches = arg.reduce((total, term) => {
                           if (player.Name.toLowerCase().includes(term) || player.Prefix.includes(term) || PLAYER_CLASS_SEARCH[player.Class].includes(term) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(term))) {
                               return total + 1;
                           } else {
                               return total;
                           }
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split(' ')
                }
            ];

            var perf = undefined;
            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player, timestamp) => PLAYER_CLASS_SEARCH[player.Class] == arg,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Name.toLowerCase().includes(arg),
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player, timestamp) => player.hasGuild() && player.Group.Name.toLowerCase().includes(arg),
                        arg: arg.toLowerCase()
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Prefix.includes(arg),
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Timestamp == timestamp,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'e') {
                    var ast = new AST(arg);
                    if (ast.isValid()) {
                        terms.push({
                            test: (arg, player, timestamp) => arg.eval(player, this.table.settings),
                            arg: ast
                        });
                    }
                } else if (key == 'f') {
                    perf = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                }

                if (key == 'k') {
                    this.recalculate = true;
                }
            }

            var entries = new PlayersTableArray(perf);

            for (var player of Object.values(Database.Players)) {
                var hidden = Database.Hidden.includes(player.Latest.Identifier);
                if (this.hidden || !hidden) {
                    var currentPlayer = player.List.find(entry => entry[0] <= this.timestamp);
                    if (currentPlayer) {
                        var matches = true;
                        for (var term of terms) {
                            matches &= term.test(term.arg, currentPlayer[1], this.timestamp);
                        }

                        if (matches) {
                            entries.add(currentPlayer[1], currentPlayer[1].Timestamp == this.timestamp, hidden);
                        }
                    }
                }
            }

            this.table.setEntries(entries, !this.recalculate);

            if (this.sorting != undefined) {
                this.table.sorting = this.sorting;
            }

            this.table.sort();

            this.refresh();

            this.recalculate = false;
        });
    }

    show () {
        // Timestamp selector
        var timestamps = [];
        for (var file of Object.values(Storage.files())) {
            timestamps.push({
                name: formatDate(file.timestamp),
                value: file.timestamp,
                selected: file.timestamp == Database.Latest
            });
        }

        timestamps.sort((a, b) => b.value - a.value);

        this.$parent.find('[data-op="timestamp"]').dropdown({
            values: timestamps
        }).dropdown('setting', 'onChange', (value, text) => {
            this.timestamp = value;
            this.recalculate = true;
            this.$filter.trigger('change');
        });

        this.$filter.val('');

        this.timestamp = Database.Latest;
        this.sorting = undefined;

        this.load();
    }

    load () {
        // Table instance
        this.table = new TableInstance(Settings.load('players'), TableType.Players);

        // Configuration indicator
        if (Settings.exists('players')) {
            this.$configure.get(0).style.setProperty('background', '#21ba45', 'important');
            this.$configure.get(0).style.setProperty('color', 'white', 'important');
        } else {
            this.$configure.get(0).style.setProperty('background', '');
            this.$configure.get(0).style.setProperty('color', '');
        }

        this.recalculate = true;
        this.$filter.trigger('change');
    }

    refresh () {
        var [ content, size ] = this.table.getTableContent();

        this.$table.html(content).css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
        if (this.$table.css('left').slice(0, -2) < 0) {
            this.$table.css('left', '0px');
        }

        this.$parent.find('[data-sortable]').click((event) => {
            this.table.setSorting($(event.target).attr('data-sortable-key'));
            if (this.table) {
                this.sorting = this.table.sorting;
            }

            this.refresh();
        }).contextmenu((event) => {
            event.preventDefault();
            this.table.removeSorting($(event.target).attr('data-sortable-key'));
            if (this.table) {
                this.sorting = this.table.sorting;
            }

            this.refresh();
        });

        this.$parent.find('[data-id]').click((event) => {
            UI.PlayerDetail.show($(event.target).attr('data-id'), this.timestamp);
        });

        this.$context.context('bind', this.$parent.find('[data-id]'));
    }
}

// Groups View
class GroupsView extends View {
    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');
        this.$list2 = this.$parent.find('[data-op="list-secondary"]');

        this.$parent.find('[data-op="hidden"]').checkbox('uncheck').change((event) => {
            this.hidden = $(event.currentTarget).checkbox('is checked');
            this.show();
        });

        this.$parent.find('[data-op="others"]').checkbox('uncheck').change((event) => {
            this.others = $(event.currentTarget).checkbox('is checked');
            this.show();
        });

        this.hidden = false;
        this.others = false;

        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Show / Hide',
                    action: (source) => {
                        Database.hide(source.attr('data-id'));
                        this.show();
                    }
                },
                {
                    label: 'Remove permanently',
                    action: (source) => {
                        Storage.removeByID(source.attr('data-id'));
                        this.show();
                    }
                }
            ]
        });
    }

    show () {
        var content = '';
        var content2 = '';

        var index = 0;
        var index2 = 0;

        var groups = Object.values(Database.Groups);
        groups.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

        for (var i = 0, group; group = groups[i]; i++) {
            var hidden = Database.Hidden.includes(group.Latest.Identifier);
            if (this.hidden || !hidden) {
                if (group.Latest.Own) {
                    content += `
                        ${ index % 5 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                        <div class="column">
                            <div class="ui segment clickable ${ Database.Latest != group.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-id="${ group.Latest.Identifier }">
                                <span class="css-timestamp">${ formatDate(group.LatestTimestamp) }</span>
                                <img class="ui medium centered image" src="res/group.png">
                                <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ group.Latest.Prefix }</h3>
                                <h3 class="ui margin-none-top centered header">${ group.Latest.Name }</h3>
                            </div>
                        </div>
                    `;
                    index++;
                } else if (this.others) {
                    content2 += `
                        ${ index2 % 5 == 0 ? `${ index2 != 0 ? '</div>' : '' }<div class="row">` : '' }
                        <div class="column">
                            <div class="ui segment clickable ${ Database.Latest != group.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-id="${ group.Latest.Identifier }">
                                <span class="css-timestamp">${ formatDate(group.LatestTimestamp) }</span>
                                <img class="ui medium centered image" src="res/group.png">
                                <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ group.Latest.Prefix }</h3>
                                <h3 class="ui margin-none-top centered header">${ group.Latest.Name }</h3>
                            </div>
                        </div>
                    `;
                    index2++;
                }
            }
        }

        // Add endings
        content += '</div>';
        content2 += '</div>';

        this.$list.html(content);
        this.$list2.html(content2);

        this.$parent.find('[data-id]').click(function () {
            UI.show(UI.GroupDetail, $(this).attr('data-id'));
        });

        this.$context.context('bind', this.$parent.find('[data-id]'));
    }
}

// Players View
class PlayersView extends View {
    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');
        this.$list2 = this.$parent.find('[data-op="list-secondary"]');

        this.$parent.find('[data-op="hidden"]').checkbox('uncheck').change((event) => {
            this.hidden = $(event.currentTarget).checkbox('is checked');
            this.show();
        });

        this.$parent.find('[data-op="others"]').checkbox('uncheck').change((event) => {
            this.others = $(event.currentTarget).checkbox('is checked');
            this.show();
        });

        this.hidden = false;
        this.others = false;

        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Show / Hide',
                    action: (source) => {
                        Database.hide(source.attr('data-id'));
                        this.show();
                    }
                },
                {
                    label: 'Copy',
                    action: (source) => {
                        const element = document.createElement('textarea');
                        element.value = JSON.stringify(Database.Players[source.attr('data-id')].Latest.Data);

                        document.body.appendChild(element);

                        element.select();

                        document.execCommand('copy');
                        document.body.removeChild(element);
                    }
                },
                {
                    label: 'Remove permanently',
                    action: (source) => {
                        Storage.removeByID(source.attr('data-id'));
                        this.show();
                    }
                }
            ]
        });
    }

    show () {
        var content = '';
        var content2 = '';

        var index = 0;
        var index2 = 0;

        var players = Object.values(Database.Players);
        players.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

        for (var i = 0, player; player = players[i]; i++) {
            var hidden = Database.Hidden.includes(player.Latest.Identifier);
            if (this.hidden || !hidden) {
                if (player.Latest.Own) {
                    content += `
                        ${ index % 5 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                        <div class="column">
                            <div class="ui segment clickable ${ Database.Latest != player.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-id="${ player.Latest.Identifier }">
                                <span class="css-timestamp">${ formatDate(player.LatestTimestamp) }</span>
                                <img class="ui medium centered image" src="res/class${ player.Latest.Class }.png">
                                <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ player.Latest.Prefix }</h3>
                                <h3 class="ui margin-none-top centered header">${ player.Latest.Name }</h3>
                            </div>
                        </div>
                    `;
                    index++;
                } else if (this.others) {
                    content2 += `
                        ${ index2 % 5 == 0 ? `${ index2 != 0 ? '</div>' : '' }<div class="row">` : '' }
                        <div class="column">
                            <div class="ui segment clickable ${ Database.Latest != player.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-id="${ player.Latest.Identifier }">
                                <span class="css-timestamp">${ formatDate(player.LatestTimestamp) }</span>
                                <img class="ui medium centered image" src="res/class${ player.Latest.Class }.png">
                                <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ player.Latest.Prefix }</h3>
                                <h3 class="ui margin-none-top centered header">${ player.Latest.Name }</h3>
                            </div>
                        </div>
                    `;
                    index2++;
                }
            }
        }

        // Add endings
        content += '</div>';
        content2 += '</div>';

        this.$list.html(content);
        this.$list2.html(content2);

        this.$parent.find('[data-id]').click(function () {
            UI.show(UI.PlayerHistory, $(this).attr('data-id'));
        });

        this.$context.context('bind', this.$parent.find('[data-id]'));
    }
}

// Files View
class FilesView extends View {
    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        // Import archive file
        this.$parent.find('[data-op="import"]').change((event) => {
            Array.from(event.target.files).forEach(file => {
                var reader = new FileReader();
                reader.readAsText(file, 'UTF-8');
                reader.onload = e => {
                    try {
                        Storage.import(e.target.result);
                        this.show();
                    } catch (exception) {
                        UI.Exception.show('A problem occured while trying to import this file.<br><br>' + exception);
                    }
                }
            });
        });

        // Export archive file
        this.$parent.find('[data-op="export"]').click(() => {
            Storage.export();
        })

        // Export archive file from selected files
        this.$parent.find('[data-op="export-partial"]').click(() => {
            var array = this.$parent.find('.file-selected').toArray().map(object => Number($(object).attr('data-id')));
            if (array.length > 0) {
                Storage.export(array);
            }
        });

        // Merge selected files
        this.$parent.find('[data-op="merge"]').click(() => {
            var array = this.$parent.find('.file-selected').toArray().map(object => Number($(object).attr('data-id')));
            if (array.length > 1) {
                Storage.merge(array);
                this.show();
            }
        });

        // Upload
        this.$parent.find('[data-op="upload"]').change((event) => {
            Array.from(event.target.files).forEach(file => {
                var reader = new FileReader();
                reader.readAsText(file, 'UTF-8');
                reader.onload = e => {
                    try {
                        Storage.add(e.target.result, file.lastModified);
                        this.show();
                    } catch (exception) {
                        UI.Exception.show('A problem occured while trying to upload this file.<br><br>' + exception);
                    }
                }
            });
        });

        // Statistics
        this.$gcount = this.$parent.find('[data-op="gcount"]');
        this.$pcount = this.$parent.find('[data-op="pcount"]');
        this.$fcount = this.$parent.find('[data-op="fcount"]');
    }

    show () {
        this.$gcount.text(Object.keys(Database.Groups).length);
        this.$pcount.text(Object.keys(Database.Players).length);
        this.$fcount.text(Storage.files().length);

        // Page content
        var content = Storage.files().map(function (file, index) {
            return `
                <div class="ui segment">
                    <div class="ui middle aligned grid">
                        <div class="four wide text-center column">
                            <h3 class="ui margin-tiny-top header clickable" data-id="${ index }">${ formatDate(file.timestamp) }</h3>
                        </div>
                        <div class="three wide column">
                            <div class="ui label">
                                Groups
                                <div class="detail">${ file.groups.length }</div>
                            </div>
                        </div>
                        <div class="five wide column">
                            <div class="ui label">
                                Players
                                <div class="detail">${ file.players.length }</div>
                            </div>
                        </div>
                        <div class="four wide right aligned column">
                            <div><span class="text-muted margin-medium-right">${ file.version || 'Unknown version' }</span> <i class="trash alternate glow outline icon" data-remove-id="${ index }"></i></div>
                        </div>
                    </div>
                </div>
            `;
        });

        content.reverse();

        this.$list.html(content.join('')).find('[data-id]').click(function () {
            $(this).toggleClass('file-selected');
        });

        // Remove file
        this.$parent.find('[data-remove-id]').click((event) => {
            Storage.remove($(event.target).attr('data-remove-id'));
            this.show();
        });

        // Bind stuff
        $('.ui.sticky').sticky({
            context: this.$list.get(0),
            offset: 70
        });
    }
}

// Settings View
class SettingsView extends View {
    constructor (parent) {
        super(parent);

        this.$area = this.$parent.find('textarea');
        this.$wrapper = this.$parent.find('.ta-wrapper');
        var $b = this.$parent.find('.ta-content');

        // CSS
        $b.css('top', this.$area.css('padding-top'));
        $b.css('left', this.$area.css('padding-left'));
        $b.css('font', this.$area.css('font'));
        $b.css('font-family', this.$area.css('font-family'));
        $b.css('line-height', this.$area.css('line-height'));

        // Input
        this.$area.on('input', function () {
            var val = $(this).val();
            $b.html(Settings.format(val));
        }).trigger('input');

        // Scroll
        this.$area.on('scroll', function () {
            var sy = $(this).scrollTop();
            var sx = $(this).scrollLeft();
            $b.css('transform', `translate(${ -sx }px, ${ -sy }px)`);
            $b.css('clip-path', `inset(${ sy }px ${ sx }px 0px 0px)`);
        });

        // Button events
        this.$parent.find('[data-op="save"]').click(() => this.save());
        this.$parent.find('[data-op="load"]').click(() => this.refresh());
        this.$parent.find('[data-op="remove"]').click(() => this.remove());

        this.$parent.find('[data-op="copy"]').click(() => {
            // Copy text area content
            var range = document.createRange();
            range.selectNode(this.$wrapper.get(0));

            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);

            document.execCommand('copy');

            window.getSelection().removeAllRanges();
        });

        this.$parent.find('[data-op="manual"]').click(() => {
            // Open manual
            window.open('manual.html', '_blank');
        });

        this.$items = this.$parent.find('[data-op="items"]');
    }

    save () {
        this.code = this.$area.val();
        Settings.save(this.code, this.identifier);
        this.hide();
    }

    refresh () {
        this.$area.val(this.code).trigger('input');
    }

    remove () {
        Settings.remove(this.identifier);
        this.show();
    }

    hide () {

    }

    show (identifier) {
        this.identifier = identifier;
        this.code = Settings.load(identifier).getCode();

        if (this.$items.length) {
            var items = [{
                name: 'Default',
                value: '',
                selected: identifier != undefined
            }];

            for (var key of Settings.get()) {
                var name = key;

                if (key == 'players') {
                    name = 'Players';
                } else if (Database.Players[key]) {
                    name = 'P: ' + Database.Players[key].Latest.Name;
                } else if (Database.Groups[key]) {
                    name = 'G: ' + Database.Groups[key].Latest.Name;
                }

                items.push({
                    name: name,
                    value: key,
                    selected: identifier == key
                });
            }

            this.$items.dropdown({
                values: items
            }).dropdown('setting', 'onChange', (value, text) => {
                this.show(value);
            });
        }

        this.refresh();
    }
}

// Settings View within a modal
class SettingsFloatView extends SettingsView {
    constructor (parent) {
        super(parent);
    }

    show (identifier) {
        this.$parent.modal({
            centered: false,
            transition: 'fade'
        }).modal('show');

        super.show(identifier);
    }

    hide () {
        this.$parent.modal('hide');
        UI.current.load();
    }

    remove () {
        Settings.remove(this.identifier);
        this.hide();
    }
}

// Loader View
class LoaderView extends View {
    constructor (parent) {
        super(parent);
    }

    alert (text) {
        this.$parent.find('[data-op="text"]').html(`<h1 class="ui header white">${ text }</h1>`);
    }
}

// Exception View
class ExceptionView extends View {
    constructor (parent) {
        super(parent);
    }

    alert (text) {
        this.$parent.find('[data-op="content"]').html(text);
        this.$parent.modal('show');
    }
}

// UI object collection
const UI = {
    current: null,
    show: function (screen, ... arguments) {
        UI.current = screen;

        $('.ui.container').addClass('hidden');

        screen.$parent.removeClass('hidden');
        screen.show(... arguments);
    },
    initialize: function () {
        UI.Loader = new LoaderView('modal-loader');
        UI.Exception = new ExceptionView('modal-exception');
        UI.Settings = new SettingsView('view-settings');
        UI.SettingsFloat = new SettingsFloatView('modal-settings');
        UI.Files = new FilesView('view-files');
        UI.Players = new PlayersView('view-players');
        UI.Groups = new GroupsView('view-groups');
        UI.Browse = new BrowseView('view-browse');
        UI.PlayerHistory = new PlayerHistoryView('view-history');
        UI.PlayerDetail = new PlayerDetailFloatView('modal-playerdetail');
        UI.GroupDetail = new GroupDetailView('view-groupdetail');
    }
}
