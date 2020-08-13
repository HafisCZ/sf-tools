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

// Developer View
class DeveloperView extends View {
    constructor (parent) {
        super(parent);

        this.$players = this.$parent.find('[data-op="players"]');
        this.$groups = this.$parent.find('[data-op="groups"]');
    }

    show () {
        var players = '';
        var groups = '';

        for (var obj of Object.values(Database.Players)) {
            for (var [timestamp, sobj] of obj.List) {
                players += `<tr class="clickable" data-player-id="${ sobj.Identifier }" data-player-ts="${ timestamp }"><td>${ sobj.Name }</td><td>${ sobj.Identifier }</td><td>${ formatDate(timestamp) }</td><td class="text-left"><i class="small trash alternate glow outline icon" data-remove-id="${ sobj.Identifier }" data-remove-ts="${ timestamp }"></i></td></tr>`;
            }
        }

        for (var obj of Object.values(Database.Groups)) {
            for (var [timestamp, sobj] of obj.List) {
                groups += `<tr class="clickable" data-group-id="${ sobj.Identifier }" data-group-ts="${ timestamp }"><td>${ sobj.Name }</td><td>${ sobj.Identifier }</td><td>${ formatDate(timestamp) }</td><td class="text-left"><i class="small trash alternate glow outline icon" data-remove-id="${ sobj.Identifier }" data-remove-ts="${ timestamp }"></i></td></tr>`;
            }
        }

        this.$players.html(players);
        this.$groups.html(groups);

        $('[data-remove-id][data-remove-ts]').click((event) => {
            var obj = $(event.currentTarget);
            Storage.removeByIDSingle(obj.attr('data-remove-id'), obj.attr('data-remove-ts'));

            this.show();
        });

        $('[data-player-id][data-player-ts]').click((event) => {
            var obj = $(event.currentTarget);
            UI.DeveloperFloat.show(obj.attr('data-player-id'), obj.attr('data-player-ts'));
        });

        $('[data-group-id][data-group-ts]').click((event) => {
            var obj = $(event.currentTarget);
            UI.DeveloperFloat.show(obj.attr('data-group-id'), obj.attr('data-group-ts'), true);
        });
    }
}

// Developer Float View
class DeveloperFloatView extends View {
    constructor (parent) {
        super(parent);

        this.$content = this.$parent.find('[data-op="content"]');
    }

    list (obj, pref = []) {
        if (!obj) return [];
        else {
            var kv = [];
            for (var [k, v] of Object.entries(obj)) {
                if (typeof(v) == 'object') {
                    kv.push(... this.list(v, [ ...pref, k ]));
                } else {
                    kv.push([[ ...pref, k ], v]);
                }
            }

            return kv;
        }
    }

    show (id, ts, isgroup = false) {
        this.$parent.modal({
            centered: false,
            transition: 'fade'
        }).modal('show');

        var obj = isgroup ? Database.Groups[id][ts] : Database.Players[id][ts];
        var content = '';
        var list = this.list(obj);
        var len = Math.ceil(list.length / 3)

        for (var i = 0; i < len; i++) {
            var [key, val] = list[i];
            var [key2, val2] = list[i + len] || [ undefined, undefined ];
            var [key3, val3] = list[i + len * 2] || [ undefined, undefined ];
            content += `
            <tr>
                <td>${ key.join('.') }</td>
                <td>${ val }</td>
                <td>${ key2 ? key2.join('.') : '' }</td>
                <td>${ key2 ? val2 : '' }</td>
                <td>${ key3 ? key3.join('.') : '' }</td>
                <td>${ key3 ? val3 : '' }</td>
            </tr>`;
        }

        this.$content.html(content);
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

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            const element = document.createElement('textarea');

            element.value = JSON.stringify(this.table.array.map(p => p.player.Data));

            document.body.appendChild(element);

            element.select();

            document.execCommand('copy');
            document.body.removeChild(element);
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            html2canvas(this.$table.get(0), {
                logging: false,
                onclone: (doc) => {
                    var ta = Number(this.timestamp);
                    var tb = Number(this.reference);

                    if (ta != tb) {
                        $(doc).find('[data-op="table"]').find('thead').prepend($(`<tr><td colspan="4" class="text-left">${ formatDate(ta) } - ${ formatDate(tb) }</td></tr>`));
                    } else {
                        $(doc).find('[data-op="table"]').find('thead').prepend($(`<tr><td colspan="4" class="text-left">${ formatDate(ta) }</td></tr>`));
                    }
                }
            }).then((canvas) => {
                canvas.toBlob((blob) => {
                    window.download(`${ this.group.Latest.Name }.${ this.timestamp }${ this.timestamp != this.reference ? `.${ this.reference }` : '' }.png`, blob);
                });
            });
        });

        this.$parent.find('[data-op="export-dropdown"]').dropdown({
            on: 'hover',
            action: 'hide',
            delay : {
                hide   : 100,
                show   : 0
            }
        });

        this.$parent.find('[data-op="export"]').click(() => Storage.exportGroupData(this.identifier, this.group.List.map(entry => entry[0])));
        this.$parent.find('[data-op="export-l"]').click(() => Storage.exportGroupData(this.identifier, [ this.group.List[0][0] ]));
        this.$parent.find('[data-op="export-l5"]').click(() => Storage.exportGroupData(this.identifier, this.group.List.slice(0, 5).map(entry => entry[0])));
        this.$parent.find('[data-op="export-s"]').click(() => Storage.exportGroupData(this.identifier, [ this.timestamp ]));
        this.$parent.find('[data-op="export-sr"]').click(() => Storage.exportGroupData(this.identifier, [ this.timestamp, Number(this.reference) ]));

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
            UI.SettingsFloat.show(this.identifier, 'guilds', PredefinedTemplates['Guilds Default']);
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

        this.sorting = undefined;
        this.table = new TableInstance(Settings.load(this.identifier, 'guilds', PredefinedTemplates['Guilds Default'], TableType.Group), TableType.Group);

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
                    var ts = xx.find(p => p[0] >= this.reference && p[0] <= member.Timestamp && p[1].Group.Identifier == this.identifier);
                    if (ts) {
                        membersReferences.push(ts[1]);
                    }
                }
            } else {
                membersReferences.push(member);
            }
        }

        // Add entries
        var entries = new GroupTableArray(joined, kicked, this.timestamp, this.reference);
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

        this.$table.empty();
        this.$table.append(content);
        this.$table.css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
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

        var config = Settings.load(UI.current.identifier, player.Identifier);

        this.$parent.html(`
            <div class="content" style="padding: 0;">
                <div class="detail-top">
                    <img class="ui image" src="res/class${ player.Class }.png">
                    <h1 class="ui header">${ player.Level } - ${ player.Name }</h1>
                </div>
                <div class="detail-timestamp">
                    ${ formatDate(player.Timestamp) }
                </div>
                <div class="detail-identifier">
                    ${ player.Identifier }
                </div>
                <div class="detail-content">
                    <div class="detail-panel">
                        <!-- Player -->
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Attributes</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Strength</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Total) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Dexterity</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Total) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Intelligence</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Total) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Constitution</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Total) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Luck</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Total) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry">
                            <div class="detail-item">Armor</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Armor) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Damage</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Damage.Min) } - ${ formatAsSpacedNumber(player.Damage.Max) }</div>
                        </div>
                        ${ player.Class == 4 ? `
                            <div class="detail-entry">
                                <div class="detail-item"></div>
                                <div class="detail-item text-center">${ formatAsSpacedNumber(player.Damage2.Min) } - ${ formatAsSpacedNumber(player.Damage2.Max) }</div>
                            </div>
                        ` : '' }
                        <br/>
                        <div class="detail-entry">
                            <div class="detail-item">Health</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Health) }</div>
                        </div>
                        ${ player.Potions[0].Size ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">Potions</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">${ POTIONS[player.Potions[0].Type] }</div>
                                <div class="detail-item text-center">+ ${ player.Potions[0].Size }%</div>
                            </div>
                            ${ player.Potions[1].Size ? `
                                <div class="detail-entry">
                                    <div class="detail-item">${ POTIONS[player.Potions[1].Type] }</div>
                                    <div class="detail-item text-center">+ ${ player.Potions[1].Size }%</div>
                                </div>
                            ` : '' }
                            ${ player.Potions[2].Size ? `
                                <div class="detail-entry">
                                    <div class="detail-item">${ POTIONS[player.Potions[2].Type] }</div>
                                    <div class="detail-item text-center">+ ${ player.Potions[2].Size }%</div>
                                </div>
                            ` : '' }
                        ` : '' }
                        ${ player.hasGuild() ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">Guild</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">Name</div>
                                <div class="detail-item text-center">${ player.Group.Name }</div>
                            </div>
                            ${ player.Group.Role ? `
                                <div class="detail-entry">
                                    <div class="detail-item">Role</div>
                                    <div class="detail-item text-center">${ GROUP_ROLES[player.Group.Role] }</div>
                                </div>
                            ` : '' }
                            <div class="detail-entry">
                                <div class="detail-item">Joined on</div>
                                <div class="detail-item text-center">${ formatDate(player.Group.Joined) }</div>
                            </div>
                            <br/>
                        ` : '' }
                    </div>
                    <div class="detail-panel">
                        <!-- Group -->
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Bonuses</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Scrapbook</div>
                            <div class="detail-item text-center">${ player.Book } / ${ SCRAPBOOK_COUNT }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Achievements</div>
                            <div class="detail-item text-center">${ player.Achievements.Owned } / 80</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Mount</div>
                            <div class="detail-item text-center">${ PLAYER_MOUNT[player.Mount] }%</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Health Bonus</div>
                            <div class="detail-item text-center">${ player.Dungeons.Player }%</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Damage Bonus</div>
                            <div class="detail-item text-center">${ player.Dungeons.Group }%</div>
                        </div>
                        ${ player.Group && player.Group.Treasure ? `
                            <div class="detail-entry">
                                <div class="detail-item">Treasure</div>
                                <div class="detail-item text-center">${ player.Group.Treasure }</div>
                            </div>
                        ` : '' }
                        ${ player.Group && player.Group.Instructor ? `
                            <div class="detail-entry">
                                <div class="detail-item">Instructor</div>
                                <div class="detail-item text-center">${ player.Group.Instructor }</div>
                            </div>
                        ` : '' }
                        ${ player.Group && player.Group.Pet ? `
                            <div class="detail-entry">
                                <div class="detail-item">Pet</div>
                                <div class="detail-item text-center">${ player.Group.Pet }</div>
                            </div>
                        ` : '' }
                        ${ player.Fortress && player.Fortress.Knights ? `
                            <div class="detail-entry">
                                <div class="detail-item">Hall of Knights</div>
                                <div class="detail-item text-center">${ player.Fortress.Knights }</div>
                            </div>
                        ` : '' }
                        <br/>
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Runes</div>
                        </div>
                        ${ player.Runes.Gold ? `
                            <div class="detail-entry">
                                <div class="detail-item">Gold</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Gold }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.XP ? `
                            <div class="detail-entry">
                                <div class="detail-item">Experience</div>
                                <div class="detail-item text-center">+ ${ player.Runes.XP }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.Chance ? `
                            <div class="detail-entry">
                                <div class="detail-item">Epic Chance</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Chance }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.Quality ? `
                            <div class="detail-entry">
                                <div class="detail-item">Item Quality</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Quality }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.Health ? `
                            <div class="detail-entry">
                                <div class="detail-item">Health</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Health }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.DamageFire || player.Runes.Damage2Fire ? `
                            <div class="detail-entry">
                                <div class="detail-item">Fire Damage</div>
                                <div class="detail-item text-center">+ ${ player.Runes.DamageFire }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Fire }%` : '' }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.DamageCold || player.Runes.Damage2Cold ? `
                            <div class="detail-entry">
                                <div class="detail-item">Cold Damage</div>
                                <div class="detail-item text-center">+ ${ player.Runes.DamageCold }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Cold }%` : '' }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.DamageLightning || player.Runes.Damage2Lightning ? `
                            <div class="detail-entry">
                                <div class="detail-item">Lightning Damage</div>
                                <div class="detail-item text-center">+ ${ player.Runes.DamageLightning }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Lightning }%` : '' }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.ResistanceFire ? `
                            <div class="detail-entry">
                                <div class="detail-item">Fire Resistance</div>
                                <div class="detail-item text-center">+ ${ player.Runes.ResistanceFire }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.ResistanceCold ? `
                            <div class="detail-entry">
                                <div class="detail-item">Cold Resistance</div>
                                <div class="detail-item text-center">+ ${ player.Runes.ResistanceCold }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.ResistanceLightning ? `
                            <div class="detail-entry">
                                <div class="detail-item">Lightning Resistance</div>
                                <div class="detail-item text-center">+ ${ player.Runes.ResistanceLightning }%</div>
                            </div>
                        ` : '' }
                    </div>
                    <div class="detail-panel">
                        <!-- Fortress -->
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Fortress</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Upgrades</div>
                            <div class="detail-item text-center">${ player.Fortress.Upgrades }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Rank</div>
                            <div class="detail-item text-center">${ player.Fortress.Rank }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Honor</div>
                            <div class="detail-item text-center">${ player.Fortress.Honor }</div>
                        </div>
                        <br/>
                        <div class="detail-entry">
                            <div class="detail-item">Fortress</div>
                            <div class="detail-item text-center">${ player.Fortress.Fortress }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Quarters</div>
                            <div class="detail-item text-center">${ player.Fortress.LaborerQuarters }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Woodcutter</div>
                            <div class="detail-item text-center">${ player.Fortress.WoodcutterGuild }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Quarry</div>
                            <div class="detail-item text-center">${ player.Fortress.Quarry }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Gem Mine</div>
                            <div class="detail-item text-center">${ player.Fortress.GemMine }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Academy</div>
                            <div class="detail-item text-center">${ player.Fortress.Academy }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Archery Guild</div>
                            <div class="detail-item text-center">${ player.Fortress.ArcheryGuild } (${ player.Fortress.ArcheryGuild * 2 }x ${ player.Fortress.Archers })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Barracks</div>
                            <div class="detail-item text-center">${ player.Fortress.Barracks } (${ player.Fortress.Barracks * 3 }x ${ player.Fortress.Warriors })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Mage Tower</div>
                            <div class="detail-item text-center">${ player.Fortress.MageTower } (${ player.Fortress.MageTower }x ${ player.Fortress.Mages })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Treasury</div>
                            <div class="detail-item text-center">${ player.Fortress.Treasury }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Smithy</div>
                            <div class="detail-item text-center">${ player.Fortress.Smithy }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Fortifications</div>
                            <div class="detail-item text-center">${ player.Fortress.Fortifications } (${ player.Fortress.Wall })</div>
                        </div>
                        ${ player.Fortress.Upgrade.Building >= 0 ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">Building</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">${ FORTRESS_BUILDINGS[player.Fortress.Upgrade.Building] }</div>
                                <div class="detail-item text-center">${ formatDate(player.Fortress.Upgrade.Finish) }</div>
                            </div>
                        ` : '' }
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
            UI.SettingsFloat.show(this.identifier, 'me', PredefinedTemplates['Me Default']);
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
        this.table = new TableInstance(Settings.load(this.identifier, 'me', PredefinedTemplates['Me Default'], TableType.History), TableType.History);
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

        this.$table.empty();
        this.$table.append(content);
        this.$table.css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
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

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            const element = document.createElement('textarea');

            var array = this.table.array;
            var slice = this.table.array.perf || this.table.settings.globals.performance;
            if (slice) {
                array = array.slice(0, slice);
            }

            element.value = JSON.stringify(array.map(p => p.player.Data));

            document.body.appendChild(element);

            element.select();

            document.execCommand('copy');
            document.body.removeChild(element);
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').click(() => {
            UI.SettingsFloat.show('players', 'players', PredefinedTemplates['Players Default']);
        });

        // Hidden toggle
        this.$parent.find('[data-op="hidden"]').checkbox('uncheck').change((event) => {
            this.hidden = $(event.currentTarget).checkbox('is checked');
            this.recalculate = true;
            this.$filter.trigger('change');
        });

        // Filter
        this.$filter = $(this.$parent.find('[data-op="filter"]')).searchfield('create', 5, {
            'c': 'Player class, use full class name in lower case (eg.: berserker, battle mage)',
            'p': 'Player name',
            'g': 'Guild name',
            's': 'Server',
            'e': 'Custom expression',
            'l': 'Show only latest',
            'f': 'Show only first or first n entries',
            'r': 'Force recalculation of global variables',
            'x': 'Enable simulator (argument is number of iterations)',
            'h': 'Show hidden',
            'o': 'Show own',
            'sr': 'Sort by custom expression'
        }).change((event) => {
            var filter = $(event.target).val().split(/(?:\s|\b)(c|p|g|s|e|l|f|r|x|h|o|sr):/);

            var terms = [
                {
                   test: function (arg, player, timestamp) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            var sim = undefined;
            var perf = undefined;

            this.shidden = false;
            this.autosort = undefined;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (PLAYER_CLASS_SEARCH[player.Class] == term) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.hasGuild() && player.Group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Prefix.includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Timestamp == timestamp,
                        arg: arg.toLowerCase()
                    });
                    this.recalculate = true;
                } else if (key == 'e') {
                    var ast = AST.create(arg);
                    if (ast.isValid()) {
                        terms.push({
                            test: (arg, player, timestamp) => arg.eval(player, player, this.table.settings, player),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = AST.create(arg);
                    if (ast.isValid()) {
                        this.autosort = (player, compare) => ast.eval(player, compare, this.table.settings);
                    }
                } else if (key == 'f') {
                    perf = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                } else if (key == 'r') {
                    this.recalculate = true;
                } else if (key == 'x' && !isNaN(arg)) {
                    this.recalculate = true;
                    sim = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                } else if (key == 'h') {
                    this.shidden = true;
                } else if (key == 'o') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Own
                    });
                    this.recalculate = true;
                    this.shidden = true;
                }
            }

            var entries = new PlayersTableArray(perf, this.timestamp, this.reference);

            for (var player of Object.values(Database.Players)) {
                var hidden = Database.Hidden.includes(player.Latest.Identifier);
                if (this.hidden || !hidden || this.shidden) {
                    var currentPlayer = player.List.find(entry => entry[0] <= this.timestamp);
                    if (currentPlayer) {
                        var matches = true;
                        for (var term of terms) {
                            matches &= term.test(term.arg, currentPlayer[1], this.timestamp);
                        }

                        if (matches) {
                            var xx = player.List.concat();
                            xx.reverse();
                            var ts = xx.find(p => p[0] >= this.reference && p[0] <= currentPlayer[0]);

                            entries.add(currentPlayer[1], (ts || currentPlayer)[1], currentPlayer[1].Timestamp == this.timestamp, hidden);
                        }
                    }
                }
            }

            this.table.setEntries(entries, !this.recalculate, sim, this.autosort);

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
        var references = [];

        for (var file of Object.values(Storage.files())) {
            timestamps.push({
                name: formatDate(file.timestamp),
                value: file.timestamp,
                selected: file.timestamp == Database.Latest
            });

            references.push({
                name: formatDate(file.timestamp),
                value: file.timestamp,
                selected: file.timestamp == Database.Latest
            });
        }

        timestamps.sort((a, b) => b.value - a.value);
        references.sort((a, b) => b.value - a.value);

        this.$reference = this.$parent.find('[data-op="reference"]');

        this.$parent.find('[data-op="timestamp"]').dropdown({
            values: timestamps
        }).dropdown('setting', 'onChange', (value, text) => {
            this.timestamp = value;
            this.reference = value;
            this.recalculate = true;

            var subref = references.slice(references.findIndex(entry => entry.value == this.reference));
            for (var i = 0; i < subref.length; i++) {
                subref[i].selected = i == 0;
            }

            this.$reference.dropdown({
                values: subref
            }).dropdown('setting', 'onChange', (value, text) => {
                this.reference = value;
                this.recalculate = true;
                this.$filter.trigger('change');
            });

            this.$filter.trigger('change');
        });

        this.$reference.dropdown({
            values: references
        }).dropdown('setting', 'onChange', (value, text) => {
            this.reference = value;
            this.recalculate = true;
            this.$filter.trigger('change');
        });

        this.timestamp = Database.Latest;
        this.reference = Database.Latest;
        this.sorting = undefined;

        this.load();
    }

    load () {
        // Table instance
        this.sorting = undefined;
        this.table = new TableInstance(Settings.load('players', 'players', PredefinedTemplates['Players Default'], TableType.Players), TableType.Players);

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

        this.$table.empty();
        this.$table.append(content);
        this.$table.css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
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
                    label: 'Copy',
                    action: (source) => {
                        const element = document.createElement('textarea');

                        var group = Database.Groups[source.attr('data-id')].Latest;
                        element.value = JSON.stringify(group.Members.map(id => {
                            if (Database.Players[id] && Database.Players[id][group.Timestamp]) {
                                return Database.Players[id][group.Timestamp].Data;
                            } else {
                                return null;
                            }
                        }).filter(x => x));

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

        this.$configure = this.$parent.find('[data-op="configure"]').click(() => {
            UI.SettingsFloat.show('me', 'me', PredefinedTemplates['Me Default']);
        });

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

        this.$filter = $(this.$parent.find('[data-op="filter"]')).searchfield('create', 5, {
            'c': 'Player class, use full class name in lower case (eg.: berserker, battle mage)',
            'p': 'Player name',
            'g': 'Guild name',
            's': 'Server',
            'e': 'Custom expression',
            'l': 'Show only latest',
            'a': 'Show all',
            'h': 'Show hidden',
            'o': 'Show other'
        }).change((event) => {
            var filter = $(event.target).val().split(/(?:\s|\b)(c|p|g|s|e|l|a|h|o):/);

            var terms = [
                {
                   test: function (arg, player) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            this.shidden = false;
            this.sother = false;
            this.nosep = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (PLAYER_CLASS_SEARCH[player.Class] == term) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.hasGuild() && player.Group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Prefix.includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player) => player.Timestamp == Database.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'e') {
                    var ast = AST.create(arg);
                    if (ast.isValid()) {
                        terms.push({
                            test: (arg, player) => arg.eval(player, player, this.settings, player),
                            arg: ast
                        });
                    }
                } else if (key == 'a') {
                    this.nosep = true;
                } else if (key == 'h') {
                    this.shidden = true;
                } else if (key == 'o') {
                    this.sother = true;
                }
            }

            this.entries = [];

            for (var player of Object.values(Database.Players)) {
                var hidden = Database.Hidden.includes(player.Latest.Identifier);
                if (this.hidden || !hidden || this.shidden) {
                    var matches = true;
                    for (var term of terms) {
                        matches &= term.test(term.arg, player.Latest, player.LatestTimestamp);
                    }

                    if (matches) {
                        this.entries.push(player);
                    }
                }
            }

            this.entries.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

            this.refresh();
        });
    }

    show () {
        this.load();
    }

    refresh () {
        // Configuration indicator
        var players = this.entries;

        var content = '';
        var content2 = '';

        var index = 0;
        var index2 = 0;

        for (var i = 0, player; player = players[i]; i++) {
            var hidden = Database.Hidden.includes(player.Latest.Identifier);
            if (this.hidden || !hidden || this.shidden) {
                if (player.Latest.Own || this.nosep) {
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
                } else if (this.others || this.sother) {
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

        this.$list.html(index == 0 ? content2 : content);
        this.$list2.html(index == 0 ? '' : content2);

        this.$parent.find('[data-id]').click(function () {
            UI.show(UI.PlayerHistory, $(this).attr('data-id'));
        });

        this.$context.context('bind', this.$parent.find('[data-id]'));
    }

    load () {
        this.settings = Settings.load('me', 'me', PredefinedTemplates['Me Default']);
        this.$filter.trigger('change');

        if (Settings.exists('me')) {
            this.$configure.get(0).style.setProperty('background', '#21ba45', 'important');
            this.$configure.get(0).style.setProperty('color', 'white', 'important');
        } else {
            this.$configure.get(0).style.setProperty('background', '');
            this.$configure.get(0).style.setProperty('color', '');
        }
    }
}

// Files View
class FilesView extends View {
    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

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
                        UI.Exception.alert('A problem occured while trying to upload this file.<br><br>' + exception);
                    }
                }
            });
        });

        this.$endpoint = this.$parent.find('[data-op="endpoint"]').click(() => {
            UI.Endpoint.show();
        });

        // Statistics
        this.$gcount = this.$parent.find('[data-op="gcount"]');
        this.$pcount = this.$parent.find('[data-op="pcount"]');
        this.$rgcount = this.$parent.find('[data-op="rgcount"]');
        this.$rpcount = this.$parent.find('[data-op="rpcount"]');
        this.$fcount = this.$parent.find('[data-op="fcount"]');

        this.$lazy = this.$parent.find('[data-op="checkbox-lazy"]').checkbox({
            onChecked: function () {
                SiteOptions.lazy = true;
            },
            onUnchecked: function () {
                SiteOptions.lazy = false;
            }
        });

        if (SiteOptions.lazy) {
            this.$lazy.checkbox('set checked');
        } else {
            this.$lazy.checkbox('set unchecked');
        }

        this.$ast = this.$parent.find('[data-op="checkbox-ast"]').checkbox({
            onChecked: function () {
                SiteOptions.ast = true;
            },
            onUnchecked: function () {
                SiteOptions.ast = false;
            }
        });

        if (SiteOptions.ast) {
            this.$ast.checkbox('set checked');
        } else {
            this.$ast.checkbox('set unchecked');
        }

        this.$beta = this.$parent.find('[data-op="checkbox-beta"]').checkbox({
            onChecked: function () {
                SiteOptions.beta = true;
            },
            onUnchecked: function () {
                SiteOptions.beta = false;
            }
        });

        if (SiteOptions.beta) {
            this.$beta.checkbox('set checked');
        } else {
            this.$beta.checkbox('set unchecked');
        }

        this.$insecure = this.$parent.find('[data-op="checkbox-insecure"]').checkbox({
            onChecked: function () {
                SiteOptions.insecure = true;
            },
            onUnchecked: function () {
                SiteOptions.insecure = false;
            }
        });

        if (SiteOptions.insecure) {
            this.$insecure.checkbox('set checked');
        } else {
            this.$insecure.checkbox('set unchecked');
        }
    }

    show () {
        this.$gcount.text(Object.keys(Database.Groups).length);
        this.$pcount.text(Object.keys(Database.Players).length);

        this.$rgcount.text(Storage.files().map(f => f.groups ? f.groups.length : 0).reduce((a, b) => a + b, 0));
        this.$rpcount.text(Storage.files().map(f => f.players ? f.players.length : 0).reduce((a, b) => a + b, 0));

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
                            <div><i class="pencil alternate clickable lowglow-green icon" data-edit-id="${ index }"></i><span class="text-muted mleft-10 margin-medium-right">${ file.version || 'Unknown version' }</span> <i class="trash alternate clickable lowglow outline icon" data-remove-id="${ index }"></i></div>
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
            var $el = $(event.target);
            var id = $el.attr('data-remove-id');

            if (this.toRemove == id) {
                this.toRemove = undefined;
                this.$parent.find('[data-remove-id]').removeClass('red');

                Storage.remove(id);
                clearTimeout(this.toRemoveTimeout);

                this.show();
            } else {
                this.toRemove = id;
                this.$parent.find('[data-remove-id]').removeClass('red');
                this.$parent.find(`[data-remove-id="${ id }"]`).addClass('red');

                clearTimeout(this.toRemoveTimeout);
                this.toRemoveTimeout = setTimeout(() => {
                    this.toRemove = undefined;
                    this.$parent.find('[data-remove-id]').removeClass('red');
                }, 1000);
            }
        });

        // Edit file
        this.$parent.find('[data-edit-id]').click((event) => {
            var $el = $(event.target);
            var id = $el.attr('data-edit-id');

            // :(
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
            const element = document.createElement('textarea');
            element.value = this.$area.val();

            document.body.appendChild(element);

            element.select();

            document.execCommand('copy');

            document.body.removeChild(element);

            window.getSelection().removeAllRanges();
        });

        this.$parent.find('[data-op="manual"]').click(() => {
            // Open manual
            window.open('manual.html', '_blank');
        });

        this.$parent.find('[data-op="wiki"]').click(() => {
            // Open wiki
            window.open('https://github.com/HafisCZ/sf-tools/wiki/Predefined-headers', '_blank');
        });

        this.$items = this.$parent.find('[data-op="items"]');

        this.$templateName = this.$parent.find('[data-op="template-name"]');
        this.$templateList = this.$parent.find('[data-op="template-list"]');
        this.$historyList = this.$parent.find('[data-op="history-list"]');

        this.$parent.find('[data-op="template-save"]').click(() => {
            var name = this.$templateName.val();
            if (name.length > 0) {
                Templates.save(this.$area.val(), name);
            }

            this.refreshTemplates();
        });

        this.refreshTemplates();
        this.refreshHistory();

        var pretemps = '';
        for (var [ key, value ] of Object.entries(PredefinedTemplates)) {
            pretemps += `
                <div class="row css-template-item">
                    <div class="ten wide column">
                        <b>${ key }</b>
                    </div>
                    <div class="six wide column css-template-buttons">
                        <div class="ui icon right floated small buttons">
                            <button class="ui button" data-template-predef="${ key }"><i class="play icon"></i></button>
                        </div>
                    </div>
                </div>`;
        }

        this.$parent.find('[data-op="template-predef"]').html(pretemps);
        this.$parent.find('[data-template-predef]').click(event => {
            this.$area.val(PredefinedTemplates[$(event.currentTarget).attr('data-template-predef')]).trigger('input');
        });

        this.torem = '';
    }

    refreshHistory () {
        var content = '';

        var history = Settings.getHistory();

        for (var i = history.length - 1; i >= 0; i--) {
            var name = history[i].name;
            var cont = history[i].content;

            if (name == 'players') {
                name = 'Players';
            } else if (name == 'me') {
                name = 'Me';
            } else if (name == 'guilds') {
                name = 'Guilds';
            } else if (Database.Players[name]) {
                name = 'P: ' + Database.Players[name].Latest.Name;
            } else if (Database.Groups[name]) {
                name = 'G: ' + Database.Groups[name].Latest.Name;
            }

            content += `
                <div class="row css-template-item">
                    <div class="ten wide column">
                        ${ cont ? `<b>${ name } (${ cont.length })</b>` : `<b class="foreground-red">${ name }</b>` }
                    </div>
                    <div class="six wide column css-template-buttons">
                        <div class="ui icon right floated small buttons">
                            <button class="ui button ${ cont ? '' : 'disabled' }" data-history-load="${ i }"><i class="play icon"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }

        this.$historyList.html(content);
        this.$historyList.find('[data-history-load]').click((event) => {
            this.$area.val(Settings.getHistory()[$(event.currentTarget).attr('data-history-load')].content).trigger('input');
        });
    }

    refreshTemplates () {
        var content = '';

        var templates = Templates.get();
        templates.sort((a, b) => b.localeCompare(a));

        for (var key of templates) {
            content += `
                <div class="row css-template-item">
                    <div class="ten wide column">
                        <b>${ key }</b>
                    </div>
                    <div class="six wide column css-template-buttons">
                        <div class="ui icon right floated small buttons">
                            <button class="ui button" data-template-remove="${ key }"><i class="trash ${ this.torem == key ? 'red' : '' } alternate outline icon"></i></button>
                            <button class="ui button" data-template-load="${ key }"><i class="play icon"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }

        this.$templateList.html(content);
        this.$templateList.find('[data-template-remove]').click((event) => {
            var $el = $(event.currentTarget);
            if ($el.find('i').hasClass('red')) {
                Templates.remove(this.torem);

                this.torem = '';
            } else {
                this.torem = $el.attr('data-template-remove');

                if (this.tout) {
                    clearTimeout(this.tout);
                }

                this.tout = setTimeout(() => {
                    this.torem = '';
                    this.refreshTemplates();
                }, 1000);
            }

            this.refreshTemplates();
        });

        this.$templateList.find('[data-template-load]').click((event) => {
            this.$area.val(Templates.load($(event.currentTarget).attr('data-template-load')).getCode()).trigger('input');
        });
    }

    save () {
        var code = this.$area.val();
        if (code !== this.code) {
            Settings.addHistory(this.code, this.identifier);
            this.code = code;
            Settings.save(this.code, this.identifier);
        }

        this.hide();
    }

    refresh () {
        this.refreshHistory();
        this.refreshTemplates();
        this.$area.val(this.code).trigger('input');
    }

    remove () {
        Settings.remove(this.identifier);
        this.show();
    }

    hide () {
        this.refreshHistory();
        this.refreshTemplates();
    }

    show (identifier = 'players') {
        this.identifier = identifier;
        this.code = Settings.load(identifier, this.getDefault(identifier), this.getDefaultTemplate(identifier)).getCode();
        this.torem = '';

        if (this.$items.length) {
            var items = [{
                name: 'Players',
                value: 'players',
                selected: identifier == undefined || identifier == 'players'
            }, {
                name: 'Me',
                value: 'me',
                selected: identifier == 'me'
            }, {
                name: 'Guilds',
                value: 'guilds',
                selected: identifier == 'guilds'
            }];

            for (var key of Settings.get()) {
                var name = key;

                if (key == 'me' || key == 'players' || key == 'guilds') {
                    continue;
                }

                if (Database.Players[key]) {
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
            }).dropdown('setting', 'onChange', (value, text, c) => {
                this.show(value);
            });
        }

        this.refresh();
    }

    getDefault (v) {
        if (v == 'players') {
            return 'players';
        } else if (v == 'me' || v.includes('_p')) {
            return 'me';
        } else {
            return 'guilds';
        }
    }

    getDefaultTemplate (v) {
        if (v == 'players') {
            return PredefinedTemplates['Players Default'];
        } else if (v == 'me' || v.includes('_p')) {
            return PredefinedTemplates['Me Default'];
        } else {
            return PredefinedTemplates['Guilds Default'];
        }
    }
}

// Settings View within a modal
class SettingsFloatView extends SettingsView {
    constructor (parent) {
        super(parent);
    }

    show (identifier, def) {
        this.$parent.modal({
            centered: false,
            transition: 'fade'
        }).modal('show');

        super.show(identifier, def);
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

// Setup View
class LoaderView extends View {
    constructor (parent) {
        super(parent);
    }

    alert (text) {
        this.$parent.find('[data-op="text"]').html(`<h1 class="ui header white">${ text }</h1>`);
    }
}

// Setup View
class SetupView extends View {
    constructor (parent) {
        super(parent);

        this.$parent.find('[data-op="accept"]').click(function () {
            localStorage.termsOK = true;

            if (!localStorage.termsBetaOK && SiteOptions.params.beta) {
                UI.show(UI.SetupBeta);
            } else {
                UI.show(UI.Groups);
            }
        });
    }
}

class SetupBetaView extends View {
    constructor (parent) {
        super(parent);

        this.$parent.find('[data-op="accept"]').click(function () {
            localStorage.termsBetaOK = true;

            UI.beta(true);
            UI.show(UI.Groups);
        });

        this.$parent.find('[data-op="decline"]').click(function () {
            localStorage.termsBetaOK = false;
            SiteOptions.beta = false;

            location.href = location.href.split('?')[0];
        });
    }
}

// Changelog View
class ChangeLogView extends View {
    constructor (parent) {
        super(parent);

        this.$parent.find('[data-op="version"]').text(MODULE_VERSION);

        var changes = '';

        if (CHANGELOG[MODULE_VERSION]) {
            for (var entry of CHANGELOG[MODULE_VERSION]) {
                changes += `
                    <li style="margin-bottom: 1em;">
                        ${ entry }
                    </li>
                `;
            }
        }

        this.$parent.find('[data-op="changes"]').html(changes);

        this.$parent.find('[data-op="accept"]').click(function () {
            localStorage.changeLogOk = MODULE_VERSION;

            UI.show(UI.Groups);
        });
    }
}

class ChangeLogsView extends View {
    constructor (parent) {
        super(parent);

        var changes = '';

        for (var [ version, content ] of Object.entries(CHANGELOG)) {
            changes += `
                <div class="row css-row-ver">
                    <div class="two wide column"></div>
                    <div class="one wide column">
                        <h3 class="ui header css-h3-ver">${ version }</h3>
                    </div>
                    <div class="thirteen wide column">
                        <ul class="css-ul-ver">
                            ${
                                content.map(entry => `
                                    <li style="margin-bottom: 1em;">
                                        ${ entry }
                                    </li>
                                `).join('')
                            }
                        </ul>
                    </div>
                </div>
            `;
        }

        this.$parent.find('[data-op="list"]').html(changes);
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

class EndpointView extends View {
    constructor (parent) {
        super(parent);

        this.$step1 = this.$parent.find('[data-op="step1"]');
        this.$step2 = this.$parent.find('[data-op="step2"]');
        this.$step3 = this.$parent.find('[data-op="step3"]');
        this.$step4 = this.$parent.find('[data-op="step4"]');

        this.$error = this.$parent.find('[data-op="error"]');
        this.$errorText = this.$parent.find('[data-op="error-text"]');
        this.$errorButton = this.$parent.find('[data-op="error-button"]');

        this.$server = this.$parent.find('[data-op="textServer"]');
        this.$username = this.$parent.find('[data-op="textUsername"]');
        this.$password = this.$parent.find('[data-op="textPassword"]');
        this.$password2 = this.$parent.find('[data-op="textPassword2"]');

        this.$iframe = this.$parent.find('[data-op="iframe"]');
        this.$list = this.$parent.find('[data-op="list"]');
        this.$import = this.$parent.find('[data-op="import"]');

        this.endpoint = undefined;
        this.downloading = [];

        this.$server.dropdown({
            showOnFocus: false,
            values: SERVERS.map((s, i) => {
                return {
                    name: s,
                    value: s
                }
            })
        }).dropdown('set selected', 'w1.sfgame.net');

        this.$parent.find('[data-op="back"]').click(() => this.funcShutdown());

        this.$import.click(() => {
            this.$step4.show();
            this.$step3.hide();
            this.endpoint.querry_collect((text) => {
                Storage.add(text, Date.now());
                this.funcShutdown();
                UI.current.show();
            });
        });

        this.$login = this.$parent.find('[data-op="login"]').click(() => {
            var username = this.$username.val();
            var password = this.$password.val();
            var password2 = this.$password2.val();
            var server = this.$server.dropdown('get value');

            if (username.length < 4 || password.length < 4 || !/\.sfgame\./.test(server)) {
                return;
            } else {
                if (this.endpoint) {
                    this.$step1.hide();
                    this.$step4.show();
                    this.funcLogin(server, username, password, password2);
                } else {
                    this.$step1.hide();
                    this.$step2.show();
                    this.endpoint = new EndpointController(this.$iframe, () => {
                        this.$step2.hide();
                        this.$step4.show();
                        this.funcLogin(server, username, password, password2);
                    });
                }
            }
        });

        this.funcLogin = (server, username, password, password2) => {
            this.endpoint.login(server, username, password, password2, (text) => {
                this.$step4.hide();
                this.$step3.show();

                var content = '';
                for (var name of text.split(',')) {
                    content += `
                        <div class="item">
                            <div class="ui checkbox">
                                <input type="checkbox" name="${ name }">
                                <label for="${ name }" style="color: white; font-size: 110%;">${ name }</label>
                            </div>
                        </div>
                    `;
                }

                this.$list.html(content);
                $('.list .checkbox').checkbox({
                    uncheckable: false
                }).first().checkbox('set checked', 'true').checkbox('set disabled');

                $('.list .checkbox').slice(1).checkbox('setting', 'onChecked', () => {
                    var name = $(event.target).attr('for');

                    this.setDownloading(name);
                    this.endpoint.querry_single(name, (value) => {
                        this.removeDownloading(name);
                    }, () => {
                        this.$step3.hide();
                        this.showError('Download failed', true);
                    });
                });
            }, () => {
                this.$step4.hide();
                this.showError('Wrong username or password');
            }, () => {
                this.$step4.hide();
                this.showError('Invalid Endpoint key');
            });
        };

        this.funcShutdown = () => {
            if (this.endpoint) {
                this.endpoint.destroy();
                this.endpoint = undefined;
            }

            this.hide();
        }
    }

    showError (text, hard = false) {
        this.$error.show();
        this.$errorText.text(text);
        this.$errorButton.one('click', () => {
            this.$error.hide();
            if (hard) {
                this.funcShutdown();
            } else {
                this.$step1.show();
            }
        });
    }

    setDownloading (name) {
        this.downloading.push(name);
        if (this.downloading.length > 0) {
            this.$import.attr('disabled', 'true');
            this.$import.addClass('loading');
        }
    }

    removeDownloading (name) {
        this.downloading.splice(this.downloading.indexOf(name), 1);
        if (this.downloading.length == 0) {
            this.$import.removeAttr('disabled');
            this.$import.removeClass('loading');
        }
    }

    hide () {
        this.$parent.modal('hide');
    }

    show () {
        this.$step1.show();
        this.$step2.hide();
        this.$step3.hide();
        this.$step4.hide();

        this.$error.hide();

        this.$parent.modal({
            centered: true,
            closable: false,
            transition: 'fade'
        }).modal('show');
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
    beta: function (isbeta) {
        if (isbeta) {
            UI.Files.$endpoint.show();
            UI.Files.$insecure.show();
            UI.Files.$beta.show();
        } else {
            UI.Files.$endpoint.hide();
            UI.Files.$insecure.hide();
            UI.Files.$beta.hide();
        }
    },
    initialize: function () {
        UI.Settings = new SettingsView('view-settings');
        UI.SettingsFloat = new SettingsFloatView('modal-settings');
        UI.Files = new FilesView('view-files');
        UI.Players = new PlayersView('view-players');
        UI.Groups = new GroupsView('view-groups');
        UI.Browse = new BrowseView('view-browse');
        UI.PlayerHistory = new PlayerHistoryView('view-history');
        UI.PlayerDetail = new PlayerDetailFloatView('modal-playerdetail');
        UI.GroupDetail = new GroupDetailView('view-groupdetail');
        UI.Developer = new DeveloperView('view-developer');
        UI.DeveloperFloat = new DeveloperFloatView('modal-dev');
        UI.ChangeLogs = new ChangeLogsView('view-changelog');
        UI.Endpoint = new EndpointView('modal-endpoint');
    },
    preinitialize: function () {
        UI.Loader = new LoaderView('modal-loader');
        UI.Exception = new ExceptionView('modal-exception');
        UI.Setup = new SetupView('modal-setup');
        UI.SetupBeta = new SetupBetaView('modal-setup-beta');
        UI.ChangeLog = new ChangeLogView('modal-changelog');
    }
}
