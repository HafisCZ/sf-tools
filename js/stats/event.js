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
            copyText(JSON.stringify(this.table.array.map(p => p.player.toSimulatorModel())));
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            html2canvas(this.$table.get(0), {
                logging: false,
                onclone: doc => {
                    var ta = Number(this.timestamp);
                    var tb = Number(this.reference);

                    $(doc).find('thead').prepend($(`<tr style="height: 2em;"><td colspan="4" class="text-left">${ formatDate(ta) }${ ta != tb ? ` - ${ formatDate(tb) }` : '' }</td></tr>`));
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
                hide: 100,
                show: 0
            }
        });

        this.$parent.find('[data-op="export"]').click(() => Storage.exportGroupData(this.identifier, this.group.List.map(entry => entry[0])));
        this.$parent.find('[data-op="export-l"]').click(() => Storage.exportGroupData(this.identifier, [ this.group.List[0][0] ]));
        this.$parent.find('[data-op="export-l5"]').click(() => Storage.exportGroupData(this.identifier, this.group.List.slice(0, 5).map(entry => entry[0])));
        this.$parent.find('[data-op="export-s"]').click(() => Storage.exportGroupData(this.identifier, [ this.timestamp ]));
        this.$parent.find('[data-op="export-sr"]').click(() => Storage.exportGroupData(this.identifier, [ this.timestamp, Number(this.reference) ]));
        this.$parent.find('[data-op="share"]').click(() => {
            UI.OnlineShareFile.show(Storage.getExportGroupData(this.identifier, [ Number(this.timestamp), Number(this.reference) ]), this.table.settings.code, false);
        });

        // Context menu
        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Copy',
                    action: (source) => {
                        copyText(JSON.stringify(Database.Players[source.attr('data-id')][this.timestamp].toSimulatorModel()));
                    }
                }
            ]
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.SettingsFloat.show(this.identifier, 'guilds', PredefinedTemplates['Guilds Default']);
            }
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');
        this.$reference = this.$parent.find('[data-op="reference"]');
    }

    refreshTemplateDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            preserveHTML: true,
            action: (value, text, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.templateOverride == value) {
                    this.templateOverride = '';
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                }

                this.load();

                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: '<b>Quick swap custom templates</b>',
                    disabled: true
                },
                ... Templates.getKeys().map(t => {
                    return {
                        name: t,
                        value: t
                    };
                })
            ]
        });
    }

    show (identitifier) {
        this.refreshTemplateDropdown();

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
            if (this.reference > this.timestamp) {
                this.reference = value;
            }

            var subref = listReference.slice(listReference.findIndex(entry => entry.value == this.timestamp));
            for (var i = 0; i < subref.length; i++) {
                subref[i].selected = subref[i].value == this.reference;
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
        if (this.table) {
            this.table.sorting = undefined;
        }

        this.clearOverride();
        this.load();
    }

    clearOverride () {
        this.templateOverride = '';
        this.$configure.find('.item').removeClass('active');
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

        let settings = undefined;
        if (this.templateOverride) {
            this.sorting = undefined;

            settings = Settings.load('', '', Templates.load(this.templateOverride).code, TableType.Group);
        } else {
            settings = Settings.load(this.identifier, 'guilds', PredefinedTemplates['Guilds Default'], TableType.Group);
        }

        this.table = new TableInstance(settings, TableType.Group);

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
        var missingMembers = [];
        for (var id of current.Members) {
            if (Database.Players[id] && Database.Players[id][this.timestamp]) {
                members.push(Database.Players[id][this.timestamp]);
            } else {
                missingMembers.push(current.Names[current.Members.findIndex(x => x == id)]);
            }
        }

        var updated = false;
        for (var entry of members) {
            updated |= Database.preload(entry.Identifier, entry.Timestamp);
        }

        if (updated) {
            Database.update();
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
        var entries = new GroupTableArray(joined, kicked, this.timestamp, this.reference, missingMembers);
        members.forEach(function (player) {
            entries.add(player, membersReferences.find(c => c.Identifier == player.Identifier));
        });

        this.entries = entries;
        this.table.setEntries(entries);

        if (this.sorting != undefined) {
            this.table.sorting = this.sorting;
        }

        this.sorting = undefined;

        this.table.sort();

        this.refresh();
    }

    refresh () {
        var [content, size ] = this.table.getTableContent();

        this.$table.empty();
        this.$table.append(content);
        this.$table.find('tbody').append($('<tr data-cloneext style="height: 2em;"></tr>'));
        this.$table.css('position', 'absolute').css('width', `${ size }px`).css('left', `calc(50vw - 9px - ${ size / 2 }px)`);
        if (this.$table.css('left').slice(0, -2) < 0) {
            this.$table.css('left', '0px');
        }

        this.$parent.find('[data-sortable]').click((event) => {
            var skey = $(event.target).attr('data-sortable-key');

            if (event.originalEvent.ctrlKey) {
                this.table.sorting = this.table.sorting.filter(s => s.key == skey);
            }

            this.table.setSorting(skey);
            this.sorting = this.table.sorting;

            this.refresh();
        }).contextmenu((event) => {
            event.preventDefault();

            if (event.originalEvent.ctrlKey) {
                this.table.sorting = [];
                this.table.sort();
            } else {
                this.table.removeSorting($(event.target).attr('data-sortable-key'));
            }

            this.sorting = this.table.sorting;
            this.refresh();
        }).mousedown((event) => {
            event.preventDefault();
        });

        this.$parent.find('[data-id]').click((event) => {
            UI.PlayerDetail.show($(event.target).attr('data-id'), this.timestamp, this.reference);
        });

        this.$context.context('bind', this.$parent.find('[data-id]'));
    }
}

// Player Detail FLot View
class PlayerDetailFloatView extends View {
    constructor (player) {
        super(player);
    }

    show (identifier, timestamp, reference = timestamp) {
        var player = Database.Players[identifier];

        var xx = player.List.concat();
        xx.reverse();
        var compare = xx.find(p => p[0] >= reference && p[0] <= timestamp);

        player = player[Math.min(timestamp, player.LatestTimestamp)];

        if (compare) {
            compare = compare[1];
        } else {
            compare = player;
        }

        var diff = player.Timestamp != compare.Timestamp;
        var asDiff = (a, b, formatter) => {
            if (a != b && b != undefined && a != undefined) {
                var fnum = formatter ? formatter(a - b) : (a - b);
                return ` <span>${ a - b > 0 ? `+${ fnum }` : fnum }</span>`;
            } else {
                return '';
            }
        }

        this.$parent.html(`
            <div class="content" style="padding: 0;">
                <div class="detail-top">
                    <img class="ui image" src="res/class${ player.Class }.png">
                    ${ player.Class == 8 && player.Mask > 0 ? `<img class="ui image" src="res/mask${ player.Mask }.png" style="position: absolute; left: 1.5em; top: 1em; transform: scale(0.49, 0.49);">` : '' }
                    <h1 class="ui header">${ player.Level } - ${ player.Name }</h1>
                </div>
                <div class="detail-timestamp">
                    ${ formatDate(player.Timestamp) }${ diff ? ` - ${ formatDate(compare.Timestamp) }` : '' }
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
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Total) }${ asDiff(player.Strength.Total, compare.Strength.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Dexterity</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Total) }${ asDiff(player.Dexterity.Total, compare.Dexterity.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Intelligence</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Total) }${ asDiff(player.Intelligence.Total, compare.Intelligence.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Constitution</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Total) }${ asDiff(player.Constitution.Total, compare.Constitution.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Luck</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Total) }${ asDiff(player.Luck.Total, compare.Luck.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Basis</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Strength</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Base) }${ asDiff(player.Strength.Base, compare.Strength.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Dexterity</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Base) }${ asDiff(player.Dexterity.Base, compare.Dexterity.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Intelligence</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Base) }${ asDiff(player.Intelligence.Base, compare.Intelligence.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Constitution</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Base) }${ asDiff(player.Constitution.Base, compare.Constitution.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Luck</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Base) }${ asDiff(player.Luck.Base, compare.Luck.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Misc</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Armor</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Armor) }${ asDiff(player.Armor, compare.Armor, formatAsSpacedNumber) }</div>
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
                    </div>
                    <div class="detail-panel">
                        ${ player.hasGuild() ? `
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
                        <!-- Group -->
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">Bonuses</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Scrapbook</div>
                            <div class="detail-item text-center">${ player.Book } / ${ SCRAPBOOK_COUNT }${ asDiff(player.Book, compare.Book, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Achievements</div>
                            <div class="detail-item text-center">${ player.Achievements.Owned } / 80${ asDiff(player.Achievements.Owned, compare.Achievements.Owned, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Mount</div>
                            <div class="detail-item text-center">${ PLAYER_MOUNT[player.Mount] }%</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Health Bonus</div>
                            <div class="detail-item text-center">${ player.Dungeons.Player }%${ asDiff(player.Dungeons.Player, compare.Dungeons.Player) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Damage Bonus</div>
                            <div class="detail-item text-center">${ player.Dungeons.Group }%${ asDiff(player.Dungeons.Group, compare.Dungeons.Group) }</div>
                        </div>
                        ${ player.Group && player.Group.Treasure ? `
                            <div class="detail-entry">
                                <div class="detail-item">Treasure</div>
                                <div class="detail-item text-center">${ player.Group.Treasure }${ asDiff(player.Group.Treasure, compare.Group.Treasure) }</div>
                            </div>
                        ` : '' }
                        ${ player.Group && player.Group.Instructor ? `
                            <div class="detail-entry">
                                <div class="detail-item">Instructor</div>
                                <div class="detail-item text-center">${ player.Group.Instructor }${ asDiff(player.Group.Instructor, compare.Group.Instructor) }</div>
                            </div>
                        ` : '' }
                        ${ player.Group && player.Group.Pet ? `
                            <div class="detail-entry">
                                <div class="detail-item">Pet</div>
                                <div class="detail-item text-center">${ player.Group.Pet }${ asDiff(player.Group.Pet, compare.Group.Pet) }</div>
                            </div>
                        ` : '' }
                        ${ player.Fortress && player.Fortress.Knights ? `
                            <div class="detail-entry">
                                <div class="detail-item">Hall of Knights</div>
                                <div class="detail-item text-center">${ player.Fortress.Knights }${ asDiff(player.Fortress.Knights, compare.Fortress.Knights) }</div>
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
                            <div class="detail-item text-center">${ player.Fortress.Upgrades }${ asDiff(player.Fortress.Upgrades, compare.Fortress.Upgrades) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Rank</div>
                            <div class="detail-item text-center">${ player.Fortress.Rank }${ asDiff(player.Fortress.Rank, compare.Fortress.Rank) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Honor</div>
                            <div class="detail-item text-center">${ player.Fortress.Honor }${ asDiff(player.Fortress.Honor, compare.Fortress.Honor) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry">
                            <div class="detail-item">Fortress</div>
                            <div class="detail-item text-center">${ player.Fortress.Fortress }${ asDiff(player.Fortress.Fortress, compare.Fortress.Fortress) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Quarters</div>
                            <div class="detail-item text-center">${ player.Fortress.LaborerQuarters }${ asDiff(player.Fortress.LaborerQuarters, compare.Fortress.LaborerQuarters) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Woodcutter</div>
                            <div class="detail-item text-center">${ player.Fortress.WoodcutterGuild }${ asDiff(player.Fortress.WoodcutterGuild, compare.Fortress.WoodcutterGuild) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Quarry</div>
                            <div class="detail-item text-center">${ player.Fortress.Quarry }${ asDiff(player.Fortress.Quarry, compare.Fortress.Quarry) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Gem Mine</div>
                            <div class="detail-item text-center">${ player.Fortress.GemMine }${ asDiff(player.Fortress.GemMine, compare.Fortress.GemMine) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Academy</div>
                            <div class="detail-item text-center">${ player.Fortress.Academy }${ asDiff(player.Fortress.Academy, compare.Fortress.Academy) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Archery Guild</div>
                            <div class="detail-item text-center">${ player.Fortress.ArcheryGuild }${ asDiff(player.Fortress.ArcheryGuild, compare.Fortress.ArcheryGuild) } (${ player.Fortress.ArcheryGuild * 2 }x ${ player.Fortress.Archers }${ asDiff(player.Fortress.Archers, compare.Fortress.Archers) })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Barracks</div>
                            <div class="detail-item text-center">${ player.Fortress.Barracks }${ asDiff(player.Fortress.Barracks, compare.Fortress.Barracks) } (${ player.Fortress.Barracks * 3 }x ${ player.Fortress.Warriors }${ asDiff(player.Fortress.Warriors, compare.Fortress.Warriors) })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Mage Tower</div>
                            <div class="detail-item text-center">${ player.Fortress.MageTower }${ asDiff(player.Fortress.MageTower, compare.Fortress.MageTower) } (${ player.Fortress.MageTower }x ${ player.Fortress.Mages }${ asDiff(player.Fortress.Mages, compare.Fortress.Mages) })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Treasury</div>
                            <div class="detail-item text-center">${ player.Fortress.Treasury }${ asDiff(player.Fortress.Treasury, compare.Fortress.Treasury) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Smithy</div>
                            <div class="detail-item text-center">${ player.Fortress.Smithy }${ asDiff(player.Fortress.Smithy, compare.Fortress.Smithy) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">Fortifications</div>
                            <div class="detail-item text-center">${ player.Fortress.Fortifications }${ asDiff(player.Fortress.Fortifications, compare.Fortress.Fortifications) } (${ player.Fortress.Wall }${ asDiff(player.Fortress.Wall, compare.Fortress.Wall) })</div>
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
                        ${ player.Own ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">Extras</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">Registered</div>
                                <div class="detail-item text-center">${ formatDate(player.Registered) }</div>
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
                    window.download(`${ this.player.Name }_${ Date.now() }.png`, blob);
                });
            });
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.SettingsFloat.show(this.identifier, 'me', PredefinedTemplates['Me Default']);
            }
        });

        this.$parent.find('[data-op="export-dropdown"]').dropdown({
            on: 'hover',
            action: 'hide',
            delay : {
                hide   : 100,
                show   : 0
            }
        });

        this.$parent.find('[data-op="export"]').click(() => Storage.exportPlayerData(this.identifier, this.list.map(entry => entry[0])));
        this.$parent.find('[data-op="export-l"]').click(() => Storage.exportPlayerData(this.identifier, [ this.list[0][0] ]));
        this.$parent.find('[data-op="export-l5"]').click(() => Storage.exportPlayerData(this.identifier, this.list.slice(0, 5).map(entry => entry[0])));
        this.$parent.find('[data-op="share"]').click(() => {
            UI.OnlineShareFile.show(Storage.getExportPlayerData(this.identifier, Database.Players[this.identifier].List.map(x => x[0])), this.table.settings.code, false);
        });

        this.$name = this.$parent.find('[data-op="name"]');
    }

    refreshTemplateDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            preserveHTML: true,
            action: (value, text, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.templateOverride == value) {
                    this.templateOverride = '';

                    settings = Settings.load(this.identifier, 'me', PredefinedTemplates['Me Default'], TableType.History);
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = Settings.load('', '', Templates.load(value).code, TableType.History);
                }

                this.table = new TableInstance(settings, TableType.History);
                this.refresh();
                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: '<b>Quick swap custom templates</b>',
                    disabled: true
                },
                ... Templates.getKeys().map(t => {
                    return {
                        name: t,
                        value: t
                    };
                })
            ]
        });
    }

    show (identifier) {
        this.refreshTemplateDropdown();
        this.identifier = identifier;

        this.list = Database.Players[identifier].List;
        this.player = Database.Players[identifier].Latest;

        this.$name.text(this.player.Name);

        this.load();
    }

    load () {
        this.templateOverride = '';
        this.$configure.find('.item').removeClass('active');

        // Table instance
        this.table = new TableInstance(Settings.load(this.identifier, 'me', PredefinedTemplates['Me Default'], TableType.History), TableType.History);

        var updated = false;
        for (var [ timestamp, proxy ] of this.list) {
            updated |= Database.preload(this.identifier, timestamp);
        }

        if (updated) {
            Database.update();
        }

        this.refresh();
    }

    refresh () {
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

        document.addEventListener('keyup', (event) => {
            if (event.keyCode == 17) {
                if (UI.current == UI.Browse) {
                    this.$parent.find('.css-op-select').removeClass('css-op-select');
                }
            }
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

        this.hidden = SiteOptions.browse_hidden;

        // Context menu
        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Show / Hide',
                    action: (source) => {
                        var sel = this.$parent.find('[data-id].css-op-select');
                        if (sel.length) {
                            for (var el of sel) {
                                Database.hide($(el).attr('data-id'));
                            }
                        } else {
                            Database.hide(source.attr('data-id'));
                        }

                        this.$filter.trigger('change');
                    }
                },
                {
                    label: 'Copy',
                    action: (source) => {
                        let sel = this.$parent.find('[data-id].css-op-select');
                        let cnt = null;

                        if (sel.length) {
                            cnt = sel.toArray().map(x => Database.Players[$(x).attr('data-id')].Latest.toSimulatorModel());
                        } else {
                            cnt = Database.Players[source.attr('data-id')].Latest.toSimulatorModel();
                        }

                        copyText(JSON.stringify(cnt));
                    }
                },
                {
                    label: 'Share',
                    action: (source) => {
                        let ids = this.$parent.find('[data-id].css-op-select').toArray().map(el => $(el).attr('data-id'));
                        if (ids.length > 0) {
                            ids.push(source.attr('data-id'));
                        }

                        UI.OnlineShareFile.show(Storage.getExportManyPlayerData(ids), '', false);
                    }
                },
                {
                    label: 'Remove permanently',
                    action: (source) => {
                        var sel = this.$parent.find('[data-id].css-op-select');
                        if (sel.length) {
                            for (var el of sel) {
                                Storage.removeByID($(el).attr('data-id'));
                            }
                        } else {
                            Storage.removeByID(source.attr('data-id'));
                        }

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

            element.value = JSON.stringify(array.map(p => p.player.toSimulatorModel()));

            document.body.appendChild(element);

            element.select();

            document.execCommand('copy');
            document.body.removeChild(element);
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.SettingsFloat.show('players', 'players', PredefinedTemplates['Players Default']);
            }
        });

        // Hidden toggle
        this.$parent.find('[data-op="hidden"]').checkbox(SiteOptions.browse_hidden ? 'check' : 'uncheck').change((event) => {
            SiteOptions.browse_hidden = !SiteOptions.browse_hidden;

            this.hidden = SiteOptions.browse_hidden;
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
            'sr': 'Sort by custom expression',
            'q': 'Custom settings (separate header names with comma)'
        }).change((event) => {
            var filter = $(event.target).val().split(/(?:\s|\b)(c|p|g|s|e|l|f|r|x|h|o|sr|q):/);

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

            this.wbenabled = this.benabled;
            this.benabled = false;

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
                    var ast = new Expression(arg);
                    if (ast.isValid()) {
                        terms.push({
                            test: (arg, player, timestamp, compare) => arg.eval(player, compare, this.table.settings, player),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = new Expression(arg);
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
                        test: (arg, player, timestamp) => Database.Players[player.Identifier].Own
                    });
                    this.recalculate = true;
                    this.shidden = true;
                } else if (key == 'q' && typeof(arg) == 'string' && arg.length) {
                    if (!this.wbenabled) {
                        this.btable = this.table;
                    }

                    this.benabled = true;

                    this.table = new TableInstance(new Settings(`category${ arg.split(',').reduce((c, a) => c + `\nheader ${ a.trim() }`, '') }`, TableType.Players), TableType.Players);
                    this.sorting = undefined;
                    this.recalculate = true;
                }
            }

            if (this.btable && !this.benabled) {
                // Recover previous table
                this.table = this.btable;
                this.recalculate = true;
                this.sorting = undefined;

                this.btable = null;
            }

            var entries = new PlayersTableArray(perf, this.timestamp, this.reference);

            for (var player of Object.values(Database.Players)) {
                var hidden = Database.Hidden.includes(player.Latest.Identifier);
                if (this.hidden || !hidden || this.shidden) {
                    var currentPlayer = player.List.find(entry => entry[0] <= this.timestamp);
                    if (currentPlayer) {
                        var xx = player.List.concat();
                        xx.reverse();
                        var ts = xx.find(p => p[0] >= this.reference && p[0] <= currentPlayer[0]);

                        var matches = true;
                        for (var term of terms) {
                            matches &= term.test(term.arg, currentPlayer[1], this.timestamp, (ts || currentPlayer)[1]);
                        }

                        if (matches) {
                            entries.add(currentPlayer[1], (ts || currentPlayer)[1], currentPlayer[1].Timestamp == this.timestamp, hidden);
                        }
                    }
                }
            }

            var updated = false;
            for (var entry of entries) {
                updated |= Database.preload(entry.player.Identifier, entry.player.Timestamp);
                updated |= Database.preload(entry.compare.Identifier, entry.compare.Timestamp);
            }

            if (updated) {
                Database.update();
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
        this.refreshTemplateDropdown();

        // Timestamp selector
        var timestamps = [];
        var references = [];

        for (var file of Object.values(Storage.files().filter(file => !file.hidden))) {
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
            this.recalculate = true;

            if (this.reference > this.timestamp) {
                this.reference = value;
            }

            var subref = references.slice(references.findIndex(entry => entry.value == this.timestamp));
            for (var i = 0; i < subref.length; i++) {
                subref[i].selected = subref[i].value == this.reference;
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
        this.$configure.find('.item').removeClass('active');

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

        this.templateOverride = '';
        this.recalculate = true;
        this.$filter.trigger('change');
    }

    refreshTemplateDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            preserveHTML: true,
            action: (value, text, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.templateOverride == value) {
                    this.templateOverride = '';

                    settings = Settings.load('players', 'players', PredefinedTemplates['Players Default'], TableType.Players);
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = Settings.load('', '', Templates.load(value).code, TableType.Players);
                }

                this.sorting = undefined;
                this.table = new TableInstance(settings, TableType.Players);
                this.recalculate = true;
                this.$filter.trigger('change');
                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: '<b>Quick swap custom templates</b>',
                    disabled: true
                },
                ... Templates.getKeys().map(t => {
                    return {
                        name: t,
                        value: t
                    };
                })
            ]
        });
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
            var skey = $(event.target).attr('data-sortable-key');

            if (event.originalEvent.ctrlKey) {
                this.table.sorting = this.table.sorting.filter(s => s.key == skey);
            }

            this.table.setSorting(skey);
            this.sorting = this.table.sorting;

            this.refresh();
        }).contextmenu((event) => {
            event.preventDefault();

            if (event.originalEvent.ctrlKey) {
                this.table.sorting = [];
                this.table.sort();
            } else {
                this.table.removeSorting($(event.target).attr('data-sortable-key'));
            }

            this.sorting = this.table.sorting;
            this.refresh();
        }).mousedown((event) => {
            event.preventDefault();
        });

        this.$parent.find('[data-id]').click((event) => {
            if (event.ctrlKey) {
                $(event.target).toggleClass('css-op-select');
            } else {
                UI.PlayerDetail.show($(event.target).attr('data-id'), this.timestamp, this.reference);
            }
        }).mousedown((event) => {
            event.preventDefault();
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

        this.$parent.find('[data-op="hidden"]').checkbox(SiteOptions.groups_hidden ? 'check' : 'uncheck').change((event) => {
            SiteOptions.groups_hidden = !SiteOptions.groups_hidden;

            this.hidden = SiteOptions.groups_hidden;
            this.show();
        });

        this.$parent.find('[data-op="others"]').checkbox(SiteOptions.groups_other ? 'check' : 'uncheck').change((event) => {
            SiteOptions.groups_other = !SiteOptions.groups_other;

            this.others = SiteOptions.groups_other;
            this.show();
        });

        this.hidden = SiteOptions.groups_hidden;
        this.others = SiteOptions.groups_other;

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
                        let group = Database.Groups[source.attr('data-id')].Latest;
                        copyText(JSON.stringify(group.Members.map(id => {
                            if (Database.Players[id] && Database.Players[id][group.Timestamp]) {
                                return Database.Players[id][group.Timestamp].toSimulatorModel();
                            } else {
                                return null;
                            }
                        }).filter(x => x)));
                    }
                },
                {
                    label: 'Share',
                    action: (source) => {
                        let group = source.attr('data-id');
                        UI.OnlineShareFile.show(Storage.getExportGroupData(group, Database.Groups[group].List.map(x => x[0])), '', false);
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
                if (group.Own) {
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

        this.$parent.find('[data-op="hidden"]').checkbox(SiteOptions.players_hidden ? 'check' : 'uncheck').change((event) => {
            SiteOptions.players_hidden = !SiteOptions.players_hidden;

            this.hidden = SiteOptions.players_hidden;
            this.show();
        });

        this.$parent.find('[data-op="others"]').checkbox(SiteOptions.players_other ? 'check' : 'uncheck').change((event) => {
            SiteOptions.players_other = !SiteOptions.players_other;

            this.others = SiteOptions.players_other;
            this.show();
        });

        this.hidden = SiteOptions.players_hidden;
        this.others = SiteOptions.players_other;

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
                        copyText(JSON.stringify(Database.Players[source.attr('data-id')].Latest.toSimulatorModel()));
                    }
                },
                {
                    label: 'Share',
                    action: (source) => {
                        UI.OnlineShareFile.show(Storage.getExportManyPlayerData([ source.attr('data-id') ]), '', false);
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
                    var ast = new Expression(arg);
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
                if (player.Own || this.nosep) {
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

// Files Modal
class FileUpdate extends View {
    constructor (parent) {
        super(parent);

        this.$textLabel = this.$parent.find('[data-op="textLabel"]');
        this.$textVersion = this.$parent.find('[data-op="textVersion"]');
        this.$textTimestamp = this.$parent.find('[data-op="textTimestamp"]');
        this.$textColor = this.$parent.find('[data-op="textColor"]');

        this.$parent.find('[data-op="back"]').click(() => {
            this.hide();
        });

        this.$parent.find('[data-op="save"]').click(() => {
            this.currentFile.label = this.$textLabel.val().trim();

            let version = this.$textVersion.val();
            if (Number.isInteger(Number(version))) {
                this.currentFile.version = parseInt(version);
            }

            let color = this.$textColor.val();
            if (getCSSColor(color) && color in COLOR_MAP) {
                this.currentFile.color = color;
            } else if (color == '') {
                delete this.currentFile.color;
            }

            Storage.update(this.currentIndex, this.currentFile);

            UI.show(UI.Files);

            this.hide();
        });
    }

    show (id) {
        this.currentIndex = id;
        this.currentFile = Storage.files()[id];

        this.$textLabel.val(this.currentFile.label);
        this.$textVersion.val(this.currentFile.version);
        this.$textColor.val(this.currentFile.color || '');
        this.$textTimestamp.val(new Date(this.currentFile.timestamp).toString());

        this.$parent.modal({
            centered: true,
            transition: 'fade'
        }).modal('show');
    }

    hide () {
        this.$parent.modal('hide');
    }
}

// Files View
class FilesView extends View {
    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        // Export archive file
        this.$parent.find('[data-op="export"]').click(() => {
            if (Storage.files().length) {
                Storage.export();
            }
        });

        this.$cloudexport = this.$parent.find('[data-op="cloud-export"]').click(() => {
            if (Storage.files().length) {
                UI.OnlineShareFile.show(Storage.getExportData(), '', true);
            }
        });

        this.$wipeall = this.$parent.find('[data-op="wipeall"]').click(() => {
            UI.ConfirmDialog.show('Database wipe', 'Are you sure you want to delete all stored player data?', () => {
                while (Storage.files().length) {
                    Storage.remove(0);
                }

                this.show();
            }, true);
        });

        // Export archive file from selected files
        this.$parent.find('[data-op="export-partial"]').click(() => {
            var array = this.$parent.find('.selected').toArray().map(object => Number($(object).attr('data-id')));
            if (array.length > 0) {
                Storage.export(array);
            }
        });

        this.$cloudexport2 = this.$parent.find('[data-op="cloud-export-partial"]').click(() => {
            var array = this.$parent.find('.selected').toArray().map(object => Number($(object).attr('data-id')));
            if (array.length > 0) {
                UI.OnlineShareFile.show(Storage.getExportData(array), '', true);
            }
        });

        // Merge selected files
        this.$parent.find('[data-op="merge"]').click(() => {
            var array = this.$parent.find('.selected').toArray().map(object => Number($(object).attr('data-id')));
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
                        Logger.log('WARNING', 'Error occured while trying to import a file!');
                    }
                }
            });
        });

        this.$endpoint = this.$parent.find('[data-op="endpoint"]').click(() => {
            UI.Endpoint.show();
        });

        this.$shared = this.$parent.find('[data-op="shared"]').click(() => {
            UI.OnlineFiles.show(() => UI.show(UI.Files));
        });

        // Statistics
        this.$gcount = this.$parent.find('[data-op="gcount"]');
        this.$pcount = this.$parent.find('[data-op="pcount"]');
        this.$rpcount = this.$parent.find('[data-op="rpcount"]');
        this.$fcount = this.$parent.find('[data-op="fcount"]');

        // Setup checkboxes
        // Lazy loading
        this.$lazy = this.$parent.find('[data-op="checkbox-lazy"]').checkbox({
            onChecked: () => {
                SiteOptions.lazy = true
            },
            onUnchecked: () => {
                SiteOptions.lazy = false
            }
        }).checkbox(SiteOptions.lazy ? 'set checked' : 'set unchecked');

        // Hide hidden files
        this.$hidden = this.$parent.find('[data-op="checkbox-hidden"]').checkbox({
            onChecked: () => {
                SiteOptions.files_hide = true;
                this.show();
            },
            onUnchecked: () => {
                SiteOptions.files_hide = false;
                this.show();
            }
        }).checkbox(SiteOptions.files_hide ? 'set checked' : 'set unchecked');

        // Obfuscate player names
        this.$obfuscated = this.$parent.find('[data-op="checkbox-obfuscated"]').checkbox({
            onChecked: () => {
                SiteOptions.obfuscated = true;
                this.show();
            },
            onUnchecked: () => {
                SiteOptions.obfuscated = false;
                this.show();
            }
        }).checkbox(SiteOptions.obfuscated ? 'set checked' : 'set unchecked');

        // Enable beta features
        this.$beta = this.$parent.find('[data-op="checkbox-beta"]').checkbox({
            onChecked: () => {
                SiteOptions.beta = true;
                this.show();
            },
            onUnchecked: () => {
                SiteOptions.beta = false;
                this.show();
            }
        }).checkbox(SiteOptions.beta ? 'set checked' : 'set unchecked');

        // Enable insecure tables
        this.$insecure = this.$parent.find('[data-op="checkbox-insecure"]').checkbox({
            onChecked: () => {
                SiteOptions.insecure = true;
                this.show();
            },
            onUnchecked: () => {
                SiteOptions.insecure = false;
                this.show();
            }
        }).checkbox(SiteOptions.insecure ? 'set checked' : 'set unchecked');

        // Enable inventory
        this.$inventory = this.$parent.find('[data-op="checkbox-inventory"]').checkbox({
            onChecked: () => {
                SiteOptions.inventory = true;
                this.show();
            },
            onUnchecked: () => {
                SiteOptions.inventory = false;
                this.show();
            }
        }).checkbox(SiteOptions.inventory ? 'set checked' : 'set unchecked');
    }

    show () {
        // Set counters
        this.$gcount.text(Object.keys(Database.Groups).length);
        this.$pcount.text(Object.keys(Database.Players).length);
        this.$rpcount.text(Storage.files().map(f => f.players ? f.players.length : 0).reduce((a, b) => a + b, 0));
        this.$fcount.text(Storage.files().length);

        // Page content
        let showHidden = !SiteOptions.files_hide;
        var content = Storage.files().map(function (file, index) {
            if (file.hidden && showHidden) {
                // Return null if not displayed
                return null;
            } else return `
                <div class="ui segment ${ file.hidden ? 'css-file-hidden' : '' }" data-id="${ index }" ${ file.color ? `style="background-color: ${ getColorFromName(file.color) }10;"` : '' }>
                    <div class="ui middle aligned grid">
                        <div class="eight wide column">
                            <div class="file-detail-labels clickable">
                                <div class="ui checkbox not-clickable file-detail-checkbox" data-op="select">
                                    <input type="checkbox">
                                </div>
                                <h3 class="ui margin-tiny-top not-clickable header mleft-20">${ formatDate(file.timestamp) }<span class="mleft-10 text-muted" style="font-weight: normal; font-size: 1rem;">${ file.label ? SFormat.Normal(file.label) : '' }</span></h3>
                            </div>
                        </div>
                        <div class="two wide column">
                            <div class="file-detail-counts">
                                <span class="text-muted mleft-15 file-detail-count-1">G: ${ file.groups.length }</span>
                                <span class="text-muted mleft-15 file-detail-count-2">P: ${ file.players.length }</span>
                            </div>
                        </div>
                        <div class="six wide right aligned column">
                            <span class="text-muted margin-medium-right">${ file.version || '?' }</span>
                            <i class="info circle icon clickable lowglow-green left-10" data-op="infobutton"></i>
                            <i class="pencil alternate clickable lowglow-green icon mleft-10" data-op="edit"></i>
                            <i class="eye ${ file.hidden ? '' : 'slash outline' } clickable mleft-10 lowglow icon" data-op="hide"></i>
                            <i class="trash alternate clickable mleft-10 lowglow outline icon" data-op="remove"></i>
                        </div>
                    </div>
                </div>
                <div class="ui tiny modal" data-for="${ index }">
                    <div class="header">File Information</div>
                    <div class="content">
                        <div class="ui grid">
                            <div class="eight wide column">
                                <h5 class="ui centered header">Guilds (${ file.groups.length })</h5>
                                <div style="overflow-y: scroll; height: 60vh;">
                                    ${ file.groups.reduce((c, g) => c + `<p>${ g.prefix.replace('_', ' ') } / ${ g.name }</p>`, '') }
                                </div>
                            </div>
                            <div class="eight wide column">
                                <h5 class="ui centered header">Players (${ file.players.length })</h5>
                                <div style="overflow-y: scroll; height: 60vh;"">
                                    ${ file.players.reduce((c, p) => c + `<p>${ p.prefix.replace('_', ' ') } / ${ p.name }</p>`, '') }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).filter(c => c);

        // Flip content
        content.reverse();

        // Fill content & add select handler
        this.$list.html(content.join('')).find('.file-detail-labels').click(function () {
            $(this).find('[data-op="select"]').checkbox('toggle');
            $(this).closest('[data-id]').toggleClass('selected');
        });

        this.$parent.find('[data-op="infobutton"]').each(function (index, element) {
            // Elements
            let $el = $(element);
            let $parent = $el.closest('[data-id]');

            // File id
            let id = Number($parent.attr('data-id'));

            // Popup element
            let $modal = $(`[data-for="${ id }"]`);

            // Popup configuration
            $el.click(() => {
                $modal.modal('show');
            });
        });

        // Initialize checkboxes for individual files
        this.$parent.find('[data-op="select"]').checkbox();

        // Remove file
        this.$parent.find('[data-op="remove"]').click((event) => {
            var $el = $(event.target);
            var id = $el.closest('[data-id]').attr('data-id');

            if (this.toRemove == id) {
                this.toRemove = undefined;
                this.$parent.find('[data-op="remove"]').removeClass('red');

                Storage.remove(id);
                clearTimeout(this.toRemoveTimeout);

                this.show();
            } else {
                this.toRemove = id;
                this.$parent.find('[data-op="remove"]').removeClass('red');
                this.$parent.find(`[data-id="${ id }"]`).find('[data-op="remove"]').addClass('red');

                clearTimeout(this.toRemoveTimeout);
                this.toRemoveTimeout = setTimeout(() => {
                    this.toRemove = undefined;
                    this.$parent.find('[data-op="remove"]').removeClass('red');
                }, 1000);
            }
        });

        // Hide file
        this.$parent.find('[data-op="hide"]').click((event) => {
            var $el = $(event.target);
            var id = $el.closest('[data-id]').attr('data-id');

            Storage.hide(id);

            this.show();
        });

        // Edit file
        this.$parent.find('[data-op="edit"]').click((event) => {
            var $el = $(event.target);
            var id = $el.closest('[data-id]').attr('data-id');

            UI.FileUpdate.show(id);
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

        // Lists
        this.$settingsList = this.$parent.find('[data-op="settings-list"]');
        this.$templateList = this.$parent.find('[data-op="template-list"]');
        this.$templateName = this.$parent.find('[data-op="template-name"]');
        this.$templateSave = this.$parent.find('[data-op="template-save"]');

        // Button handling
        this.$parent.find('[data-op="wiki-home"]').click(() => window.open('https://github.com/HafisCZ/sf-tools/wiki', '_blank'));
        this.$parent.find('[data-op="browse"]').click(() => UI.OnlineTemplates.show());
        this.$parent.find('[data-op="templates"]').click(() => UI.Templates.show());
        this.$parent.find('[data-op="addtemplate"]').click(() => UI.CreateTemplate.show());

        this.$parent.find('[data-op="copy"]').click(() => copyText(this.$area.val()));
        this.$parent.find('[data-op="prev"]').click(() => this.history(1));
        this.$parent.find('[data-op="next"]').click(() => this.history(-1));

        this.$parent.find('[data-op="close"]').click(() => this.hide());
        this.$save = this.$parent.find('[data-op="save"]').click(() => this.save());

        // Area
        this.$area = this.$parent.find('textarea');
        this.$wrapper = this.$parent.find('.ta-wrapper');
        var $b = this.$parent.find('.ta-content');

        // CSS
        $b.css('top', this.$area.css('padding-top'));
        $b.css('left', this.$area.css('padding-left'));
        $b.css('font', this.$area.css('font'));
        $b.css('font-family', this.$area.css('font-family'));
        $b.css('line-height', this.$area.css('line-height'));

        // Input handling
        this.$area.on('input', (event) => {
            var val = $(event.target).val();
            if (this.pasted) {
                val = val.replace(/\t/g, ' ');

                var ob = this.$area.get(0);

                var ob1 = ob.selectionStart;
                var ob2 = ob.selectionEnd;
                var ob3 = ob.selectionDirection;

                ob.value = val;

                ob.selectionStart = ob1;
                ob.selectionEnd = ob2;
                ob.selectionDirection = ob3;

                this.pasted = false;
            }

            // Set content
            $b.html(Settings.format(val));

            // Update
            this.$settingsList.settings_selectionlist('set unsaved', val !== this.code);
            if (val == this.code) {
                this.$save.addClass('disabled');
            } else {
                this.$save.removeClass('disabled');
            }
        }).trigger('input');

        // Scroll handling
        this.$area.on('scroll', function () {
            var sy = $(this).scrollTop();
            var sx = $(this).scrollLeft();
            $b.css('transform', `translate(${ -sx }px, ${ -sy }px)`);
            $b.css('clip-path', `inset(${ sy }px ${ sx }px 0px 0px)`);
        });

        // Paste handling
        this.$area.on('paste', () => {
            this.pasted = true;
        });

        // History position
        this.index = 0;
    }

    getDefault (v) {
        // Get default key
        if (v == 'players') {
            return 'players';
        } else if (v == 'me' || v.includes('_p')) {
            return 'me';
        } else {
            return 'guilds';
        }
    }

    getDefaultTemplate (v) {
        // Get default template
        if (v == 'players') {
            return PredefinedTemplates['Players Default'];
        } else if (v == 'me' || v.includes('_p')) {
            return PredefinedTemplates['Me Default'];
        } else {
            return PredefinedTemplates['Guilds Default'];
        }
    }

    hide () {
        // Do nothing
    }

    show (identifier = 'players') {
        // Set code
        this.identifier = identifier;
        this.code = Settings.load(identifier, this.getDefault(identifier), this.getDefaultTemplate(identifier)).getCode();

        // Update settings
        if (this.$settingsList.length) {
            this.updateSettings();
        }

        // Update templates
        this.updateTemplates();

        // Reset history
        this.history();

        // Reset scrolling
        this.$area.scrollTop(0).trigger('scroll');
    }

    updateSettings () {
        // Settings
        let settings = [
            {
                name: 'Players',
                value: 'players',
                selected: this.identifier == 'players'
            },
            {
                name: 'Me',
                value: 'me',
                selected: this.identifier == 'me'
            },
            {
                name: 'Guilds',
                value: 'guilds',
                selected: this.identifier == 'guilds'
            },
            ... Settings.get().map(key => {
                if ([ 'me', 'players', 'guilds' ].includes(key)) {
                    return null;
                } else {
                    return {
                        name: Database.Players[key] ? `P: ${ Database.Players[key].Latest.Name }` : (Database.Groups[key] ? `G: ${ Database.Groups[key].Latest.Name }` : key),
                        value: key,
                        selected: this.identifier == key
                    };
                }
            }).filter(obj => obj != null)
        ];

        // Setup list
        this.$settingsList.settings_selectionlist({
            items: settings,
            onClick: value => this.show(value),
            onSave: value => this.save(),
            onRemove: value => {
                Settings.remove(value);
                this.show();
            }
        });
    }

    save () {
        let code = this.$area.val();
        if (code !== this.code) {
            // Add into history
            Settings.addHistory(this.code, this.identifier);

            // Save current code
            this.code = code;
            Settings.save(this.code, this.identifier);
        }
    }

    updateTemplates () {
        // Templates
        let templates = [
            {
                name: 'Players (Default)',
                value: 'Players Default'
            },
            {
                name: 'Me (Default)',
                value: 'Me Default'
            },
            {
                name: 'Guilds (Default)',
                value: 'Guilds Default'
            },
            ... Templates.getKeys().map(key => {
                return {
                    name: key,
                    value: key
                }
            })
        ];

        // Setup list
        this.$templateList.templates_selectionlist({
            items: templates,
            onClick: value => {
                if (PredefinedTemplates[value]) {
                    this.$area.val(PredefinedTemplates[value]);
                } else {
                    this.$area.val(Templates.load(value).getCode());
                }

                this.$area.trigger('input');
            }
        });
    }

    history (i = 0) {
        let history = Settings.getHistory();
        let historyCount = history.length;

        if (i == 0) {
            this.index = 0;
        } else {
            this.index += i;
            this.index = this.index > historyCount ? historyCount : (this.index < 0 ? 0 : this.index);
        }

        if (this.index > 0) {
            this.$area.val(history[this.index - 1].content);
        } else {
            this.$area.val(this.code);
        }

        this.$area.trigger('input');
    }
}

// Settings View within a modal
class SettingsFloatView extends SettingsView {
    constructor (parent) {
        super(parent);
    }

    show (identifier) {
        this.$parent.modal({
            centered: true,
            transition: 'fade',
            autofocus: false
        }).modal('show');

        super.show(identifier);
    }

    save () {
        if (UI.current.clearOverride) {
            UI.current.clearOverride();
        }

        if (UI.current.refreshTemplateDropdown) {
            UI.current.refreshTemplateDropdown();
        }

        super.save();
        this.hide();
        UI.current.load();
    }

    hide () {
        this.$parent.modal('hide');
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

            UI.show(UI.Groups);
        });
    }
}

class ConfirmDialogView extends View {
    constructor (parent) {
        super(parent);

        this.$no = this.$parent.find('[data-op="no"]').click(() => {
            this.hide();
        });

        this.$yes = this.$parent.find('[data-op="yes"]');
        this.$title = this.$parent.find('[data-op="title"]');
        this.$content = this.$parent.find('[data-op="content"]');
    }

    show (title, content, action, delayedYes = false) {
        this.$title.text(title);
        this.$content.text(content);

        this.$yes.one('click', () => {
            if (action) {
                action();
            }

            this.hide();
        });

        if (delayedYes) {
            this.$yes.addClass('disabled').text('Wait 2 seconds ...');

            if (this.timeoutOn) {
                clearTimeout(this.timeout);
                clearTimeout(this.timeout2);
                this.timeoutOn = false;
            }

            this.timeout = setTimeout(() => {
                this.$yes.removeClass('disabled').text('OK');
                this.timeoutOn = false;
            }, 2000);

            this.timeout2 = setTimeout(() => {
                this.$yes.text('Wait 1 second ...');
            }, 1000);

            this.timeoutOn = true;
        } else {
            if (this.timeoutOn) {
                clearTimeout(this.timeout);
                clearTimeout(this.timeout2);
                this.timeoutOn = false;
            }

            this.$yes.removeClass('disabled').text('OK');
        }

        this.$parent.modal({
            centered: true,
            transition: 'fade'
        }).modal('show');
    }

    hide () {
        this.$parent.modal('hide');
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

        this.$parent.find('[data-op="deny-terms"]').click(() => {
            localStorage.termsOK = false;
            UI.show(UI.Setup);
        });
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

class InfoView extends View {
    constructor (parent) {
        super(parent);

        this.$name = this.$parent.find('[data-op="name"]');
        this.$content = this.$parent.find('[data-op="content"]');
    }

    show (name, text) {
        this.$name.html(name);
        this.$content.html(text);

        this.$parent.modal('show');
    }
}

class OnlineShareFileView extends View {
    constructor (parent) {
        super(parent);

        // Setup checkboxes
        this.$once = this.$parent.find('[data-op="once"]');
        this.$bundle = this.$parent.find('[data-op="bundle"]');

        // Other elements
        this.$code = this.$parent.find('[data-op="code"]');
        this.$button = this.$parent.find('[data-op="send"]');

        // Containers
        this.$codeContainer = this.$parent.find('[data-op="content-code"]');
        this.$buttonContainer = this.$parent.find('[data-op="content-button"]');

        // Handlers
        this.$button.click(() => {
            let once = this.$once.checkbox('is checked');
            let bundle = this.$bundle.checkbox('is checked');

            // Set button to loading state
            this.$button.addClass('loading disabled');

            // Send request
            this.send(!once, bundle);
        });
    }

    show (data, bundledSettings = '', forceOnce = false) {
        // Shared object
        this.sharedObj = {
            data: data,
            settings: bundledSettings,
            once: forceOnce
        };

        // Setup checkboxes
        this.$once.checkbox('set checked');
        this.$bundle.checkbox('set unchecked');

        if (!bundledSettings) {
            this.$bundle.checkbox('set disabled');
        } else {
            this.$bundle.checkbox('set enabled');
        }

        if (forceOnce) {
            this.$once.checkbox('set disabled');
        } else {
            this.$once.checkbox('set enabled');
        }

        // Toggle buttons
        this.$buttonContainer.show();
        this.$codeContainer.hide();

        this.$button.removeClass('loading disabled');

        // Open modal
        this.$parent.modal({
            closable: false
        }).modal('show');
    }

    showKey (success, key) {
        if (success) {
            this.$buttonContainer.hide();
            this.$codeContainer.show();

            // Show key
            this.$code.text(key);
        } else {
            this.$button.removeClass('loading disabled').transition('shake');
        }
    }

    send (multipleUses = false, bundleSettings = false) {
        // Setup form data
        let data = new FormData();
        data.append('multiple', !this.sharedObj.once && multipleUses);
        data.append('file', JSON.stringify({
            data: this.sharedObj.data,
            settings: bundleSettings ? this.sharedObj.settings : ''
        }));

        // Create request
        $.ajax({
            url: 'https://sftools-api.herokuapp.com/share',
            type: 'POST',
            processData: false,
            contentType: false,
            data: data
        }).done(obj => {
            this.showKey(obj.success, obj.key);
        }).fail(() => {
            this.showKey(false, null);
        });
    }
}

class CreateTemplateView extends View {
    constructor (parent) {
        super(parent);

        this.$name = this.$parent.find('[data-op="name"]')
        this.$cme = this.$parent.find('[data-op="compatibility-me"]')
        this.$cguilds = this.$parent.find('[data-op="compatibility-guilds"]')
        this.$cplayers = this.$parent.find('[data-op="compatibility-players"]')
    }

    show () {
        // Init
        this.$name.val('');
        this.$cme.checkbox('set unchecked');
        this.$cguilds.checkbox('set unchecked');
        this.$cplayers.checkbox('set unchecked');

        // Show modal
        this.$parent.modal({
            allowMultiple: true,
            onApprove: () => {
                // Name
                let name = this.$name.val();

                // Compatibility
                let cm = this.$cme.checkbox('is checked');
                let cg = this.$cguilds.checkbox('is checked');
                let cp = this.$cplayers.checkbox('is checked');

                // Settings view
                let view = UI.current == UI.Settings ? UI.Settings : UI.SettingsFloat;

                // Code
                let code = view.$area.val();

                // Add template
                if (name) {
                    Templates.save(name, code, {
                        cm: cm,
                        cg: cg,
                        cp: cp
                    });

                    if (UI.current.refreshTemplateDropdown) {
                        UI.current.refreshTemplateDropdown();
                    }

                    view.updateTemplates();
                    this.hide();
                } else {
                    this.$name.transition('shake');
                }

                return false;
            }
        }).modal('show');
    }

    hide () {
        this.$parent.modal('hide');
    }
}

class TemplatesView extends View {
    constructor (parent) {
        super(parent);

        // Template list
        this.$templates = this.$parent.find('[data-op="templates"]');

        // Template details
        this.$name = this.$parent.find('[data-op="name"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');
        this.$timestamp2 = this.$parent.find('[data-op="timestamp2"]');
        this.$key = this.$parent.find('[data-op="key"]');
        this.$compat = this.$parent.find('[data-op="compat"]');
        this.$version = this.$parent.find('[data-op="version"]');

        // Buttons
        this.$publish = this.$parent.find('[data-op="publish"]').addClass('disabled');
        this.$update = this.$parent.find('[data-op="update"]').click(() => this.updateTemplate());
        this.$delete = this.$parent.find('[data-op="delete"]').click(() => this.deleteTemplate());
        this.$open = this.$parent.find('[data-op="open"]').click(() => this.openTemplate());

        // TODO
        this.$name.val('').attr('disabled', 'disabled');
    }

    deleteTemplate () {
        if (this.template) {
            Templates.remove(this.template.name);

            let view = UI.current == UI.Settings ? UI.Settings : UI.SettingsFloat;
            if (view.updateTemplates) {
                view.updateTemplates();
            }

            this.clearOverride();
            this.refreshList();
        }
    }

    clearOverride () {
        if (UI.current.clearOverride) {
            UI.current.clearOverride();
        }

        if (UI.current.refreshTemplateDropdown) {
            UI.current.refreshTemplateDropdown();
        }
    }

    openTemplate () {
        if (this.template) {
            let view = UI.current == UI.Settings ? UI.Settings : UI.SettingsFloat;
            view.$area.val(this.template.content).trigger('input');

            this.hide();
        }
    }

    updateTemplate () {
        if (this.template) {
            Templates.save(this.template.name, (UI.current == UI.Settings ? UI.Settings : UI.SettingsFloat).$area.val(), this.template.compat);
            this.showTemplate(this.template.name);
            this.clearOverride();
        }
    }

    show () {
        // Refresh stuff
        this.refreshList();

        // Open modal
        this.$parent.modal({
            centered: true,
            allowMultiple: true
        }).modal('show');
    }

    refreshList () {
        this.$templates.templateList({
            items: Templates.getKeys(),
            onClick: name => this.showTemplate(name)
        });

        if (!this.template) {
            this.showTemplate();
        }
    }

    showTemplate (name) {
        if (name) {
            let obj = Templates.get()[name];

            this.template = obj;

            this.$name.val(name);
            this.$version.val(obj.version || 'Unknown');
            this.$timestamp.val(formatDate(obj.timestamp));
            this.$compat.val((obj.compat ? [ obj.compat.cm ? 'Me' : '', obj.compat.cg ? 'Guilds' : '', obj.compat.cp ? 'Players' : '' ].filter(x => x).join(', ') : '') || 'Not set');

            // Online
            if (obj.online) {
                this.$timestamp2.val(formatDate(obj.online.timestamp));
                this.$key.val(obj.online.key);

                if (this.timestamp != this.timestamp2) {
                    //this.$publish.removeClass('disabled');
                } else {
                    this.$publish.addClass('disabled');
                }
            } else {
                this.$timestamp2.val('');
                this.$key.val('');
                //this.$publish.removeClass('disabled');
            }

            this.$delete.removeClass('disabled');
            this.$update.removeClass('disabled');
        } else {
            this.template = null;

            this.$name.val('');
            this.$timestamp.val('');
            this.$timestamp2.val('');
            this.$key.val('');
            this.$compat.val('');
            this.$version.val('');
            this.$publish.addClass('disabled');
            this.$delete.addClass('disabled');
            this.$update.addClass('disabled');
        }
    }

    hide () {
        this.$parent.modal('hide');
    }
}

class OnlineTemplatesView extends View {
    constructor (parent) {
        super(parent);

        this.$dimmer = this.$parent.find('[data-op="dimmer"]');
        this.$content = this.$parent.find('[data-op="content"]');
        this.$input = this.$parent.find('[data-op="private-value"]');

        this.$parent.find('[data-op="private"]').click(() => {
            var cur = this.$input.val();
            if (cur) {
                $.ajax({
                    url: `https://sftools-api.herokuapp.com/scripts?key=${ cur }`,
                    type: 'GET'
                }).done((message) => {
                    if (message.success) {
                        if (UI.current == UI.Settings) {
                            UI.Settings.$area.val(message.content).trigger('input');
                        } else {
                            UI.SettingsFloat.$area.val(message.content).trigger('input');
                        }

                        this.hide();
                    } else {
                        this.$input.parent('.input').addClass('error').transition('shake');
                    }
                }).fail(() => {
                    this.$input.parent('.input').addClass('error').transition('shake');
                });
            } else {
                this.$input.parent('.input').addClass('error').transition('shake');
            }
        });
    }

    show () {
        this.$content.html('');
        this.$dimmer.addClass('active');
        this.$input.val('').parent('.input').removeClass('error');

        this.$parent.modal({
            allowMultiple: true
        }).modal('show');

        let cached = SharedPreferences.get('templateCache', { content: [], expire: 0 });
        if (cached.expire < Date.now()) {
            $.ajax({
                url: `https://sftools-api.herokuapp.com/scripts`,
                type: 'GET'
            }).done((message) => {
                message = message ? message : [];
                SharedPreferences.set('templateCache', {
                    content: message,
                    expire: Date.now() + 3600000
                });

                this.showScripts(message);
            }).fail(function () {
                this.showScripts([]);
            });
        } else {
            this.showScripts(cached.content);
        }
    }

    showScripts (scripts) {
        if (scripts.length) {
            for (let s of scripts) {
                s.timestamp = Date.parse(s.date);
            }

            scripts.sort((a, b) => b.timestamp - a.timestamp);

            this.$content.html(scripts.reduce((s, script) => {
                return s + `
                    <div class="row" style="font-size: 105%;">
                        <div class="seven wide column text-left">${ script.description }</div>
                        <div class="four wide column text-left">${ script.author }</div>
                        <div class="three wide column text-left">${ formatDateOnly(script.timestamp) }</div>
                        <div class="two wide column css-template-buttons">
                            <div class="ui icon right floated small buttons">
                                <button class="ui button" data-script="${ script.key }"><i class="play icon"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }, ''));

            this.$content.find('[data-script]').click((event) => {
                let $btn = $(event.currentTarget);

                $.ajax({
                    url: `https://sftools-api.herokuapp.com/scripts?key=${ $btn.attr('data-script') }`,
                    type: 'GET'
                }).done((message) => {
                    if (message.success) {
                        if (UI.current == UI.Settings) {
                            UI.Settings.$area.val(message.content).trigger('input');
                        } else {
                            UI.SettingsFloat.$area.val(message.content).trigger('input');
                        }

                        this.hide();
                    } else {
                        $btn.addClass('red');
                    }
                }).fail(() => {
                    $btn.addClass('red');
                });
            });
        } else {
            this.$content.html('<b>No scripts available</b>');
        }

        this.$dimmer.removeClass('active');
    }

    hide () {
        this.$parent.modal('hide');
    }
}

class OnlineFilesView extends View {
    constructor (parent) {
        super(parent);

        this.$inputField = this.$parent.find('[data-op="input"]');
        this.$input = this.$inputField.parent('.input');

        this.$error = this.$parent.find('[data-op="extra"]');
        this.$ok = this.$parent.find('.ui.approve.button');
    }

    show (callback) {
        this.$input.removeClass('error');
        this.$ok.removeClass('loading');
        this.$inputField.val('');
        this.$error.hide();

        this.onReceive = obj => {
            this.$ok.removeClass('loading');
            if (obj) {
                let data = JSON.parse(obj);
                if (data.settings) {
                    Templates.save(`Shared ${ code }`, data.settings);
                }

                Storage.import(data.data);
                this.$parent.modal('hide');

                callback();
            } else {
                this.$input.addClass('error').transition('shake');
                this.$error.show();
            }
        };

        this.$parent.modal({
            onApprove: () => {
                let code = this.$inputField.val();
                if (code) {
                    this.$ok.addClass('loading');
                    $.ajax({
                        url: `https://sftools-api.herokuapp.com/?key=${ code }`,
                        type: 'GET'
                    }).done(obj => this.onReceive(obj)).fail(() => this.onReceive());
                } else {
                    this.$input.transition('shake');
                }

                return false;
            }
        }).modal('show');
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

        this.$iframe = this.$parent.find('[data-op="iframe"]');
        this.$list = this.$parent.find('[data-op="list"]');
        this.$import = this.$parent.find('[data-op="import"]');

        this.$next = this.$parent.find('[data-op="getnext"]').click(() => {
            var $el = $('.list .checkbox:not(.checked)').first()
            if ($el.length) {
                this.customTarget = $el.find('label').attr('for');
                $el.checkbox('check');

                if (!$('.list .checkbox:not(.checked)').first().length) {
                    this.$next.addClass('disabled');
                }
            } else {
                this.$next.addClass('disabled');
            }
        }).addClass('disabled');

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
            var server = this.$server.dropdown('get value');

            if (/^(.{4,})@(.+\.sfgame\..+)$/.test(username)) {
                [, username, server, ] = username.split(/^(.{4,})@(.+\.sfgame\..+)$/);
            }

            if (username.length < 4 || password.length < 4 || !/\.sfgame\./.test(server)) {
                return;
            } else {
                if (this.endpoint) {
                    this.$step1.hide();
                    this.$step4.show();
                    this.funcLogin(server, username, password);
                } else {
                    this.$step1.hide();
                    this.$step2.show();
                    this.endpoint = new EndpointController(this.$iframe, () => {
                        this.$step2.hide();
                        this.$step4.show();
                        this.funcLogin(server, username, password);
                    });
                }
            }
        });

        this.funcLogin = (server, username, password) => {
            this.endpoint.login(server, username, password, (text) => {
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
                    var name = $(event.target).attr('for') || this.customTarget;
                    this.customTarget = null;

                    this.setDownloading(name);
                    this.endpoint.querry_single(name, (value) => {
                        this.removeDownloading(name);
                    }, () => {
                        this.$step3.hide();
                        this.showError('Download failed', true);
                    });
                });

                if ($('.list .checkbox:not(.checked)').first().length) {
                    this.$next.removeClass('disabled');
                } else {
                    this.$next.addClass('disabled');
                }
            }, () => {
                this.$step4.hide();
                this.showError('Wrong username or password');
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
            this.$next.attr('disabled', 'true');
        }
    }

    removeDownloading (name) {
        this.downloading.splice(this.downloading.indexOf(name), 1);
        if (this.downloading.length == 0) {
            this.$import.removeAttr('disabled');
            this.$import.removeClass('loading');
            this.$next.removeAttr('disabled');
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
            UI.Files.$cloudexport.show();
            UI.Files.$cloudexport2.show();
        } else {
            UI.Files.$endpoint.hide();
            UI.Files.$insecure.hide();
            UI.Files.$beta.hide();
            UI.Files.$cloudexport.hide();
            UI.Files.$cloudexport2.hide();
        }
    },
    initialize: function () {
        UI.Settings = new SettingsView('view-settings');
        UI.SettingsFloat = new SettingsFloatView('modal-settings');
        UI.Files = new FilesView('view-files');
        UI.FileUpdate = new FileUpdate('modal-fileupdate');
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
        UI.ConfirmDialog = new ConfirmDialogView('modal-confirm');
        UI.CreateTemplate = new CreateTemplateView('modal-addtemplate');

        UI.Templates = new TemplatesView('modal-templates');

        // Online
        UI.OnlineTemplates = new OnlineTemplatesView('modal-onlinetemplates');
        UI.OnlineFiles = new OnlineFilesView('modal-onlinefile');
        UI.OnlineShareFile = new OnlineShareFileView('modal-share');
    },
    preinitialize: function () {
        UI.Loader = new LoaderView('modal-loader');
        UI.Exception = new ExceptionView('modal-exception');
        UI.Setup = new SetupView('modal-setup');
        UI.ChangeLog = new ChangeLogView('modal-changelog');
    }
}
