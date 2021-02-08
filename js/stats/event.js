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
        this.table = new TableController(this.$table, TableType.Group);

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
            copyText(JSON.stringify(this.table.getArray().map(p => p.player.toSimulatorModel())));
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            downloadScreenshot(this.$table, `${ this.group.Latest.Name }.${ this.timestamp }${ this.timestamp != this.reference ? `.${ this.reference }` : '' }.png`, doc => {
                var ta = Number(this.timestamp);
                var tb = Number(this.reference);

                $(doc).find('thead').prepend($(`<tr style="height: 2em;"><td colspan="4" class="text-left">${ formatDate(ta) }${ ta != tb ? ` - ${ formatDate(tb) }` : '' }</td></tr>`));
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
            UI.OnlineShareFile.show(Storage.getExportGroupData(this.identifier, [ Number(this.timestamp), Number(this.reference) ]), this.table.getSettings());
        });

        // Context menu
        this.$context = $('<div class="ui custom popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: 'Copy',
                    action: (source) => {
                        copyText(JSON.stringify(Database.getPlayer(source.attr('data-id'), this.timestamp).toSimulatorModel()));
                    }
                },
                {
                    label: 'Copy with companions',
                    action: (source) => {
                        copyText(JSON.stringify(Database.getPlayer(source.attr('data-id'), this.timestamp).toSimulatorShadowModel()));
                    },
                    enabled: SiteOptions.inventory
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

        this.table.clearSorting();

        this.clearOverride();
        this.load();
    }

    clearOverride () {
        this.templateOverride = '';
        this.$configure.find('.item').removeClass('active');
    }

    load () {
        this.$configure.settingsButton(SettingsManager.exists(this.identifier));

        if (this.templateOverride) {
            this.table.clearSorting();
        }

        this.table.setSettings(this.templateOverride ? Templates.get(this.templateOverride) : SettingsManager.get(this.identifier, 'guilds', PredefinedTemplates['Guilds Default']));

        var current = this.group[this.timestamp];
        var reference = this.group[this.reference];

        // Joined and kicked members
        var joined = current.Members.filter(id => !reference.Members.includes(id)).map(id => {
            let p = Database.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                p = Database.getPlayer(id);
                if (p) {
                    return p.Latest.Name;
                } else {
                    return id;
                }
            }
        });

        var kicked = reference.Members.filter(id => !current.Members.includes(id)).map(id => {
            let p = Database.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                p = Database.getPlayer(id);
                if (p) {
                    return p.Latest.Name;
                } else {
                    return id;
                }
            }
        });

        // Members
        var members = [];
        var missingMembers = [];
        for (var id of current.Members) {
            let player = Database.getPlayer(id, this.timestamp);
            if (player) {
                members.push(player);
            } else {
                missingMembers.push(current.Names[current.Members.findIndex(x => x == id)]);
            }
        }

        // Reference members
        var membersReferences = [];
        for (var member of members) {
            var player = Database.Players[member.Identifier];
            if (player) {
                var playerReference = Database.getPlayer(member.Identifier, this.reference);
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

        this.table.setEntries(entries);
        this.refresh();
    }

    refresh () {
        this.table.refresh(() => {
            this.$table.find('tbody').append($('<tr data-cloneext style="height: 2em;"></tr>'));

            this.$parent.find('[data-id]').click((event) => {
                UI.PlayerDetail.show($(event.target).attr('data-id'), this.timestamp, this.reference);
            });

            this.$context.context('bind', this.$parent.find('[data-id]'));
        });
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
        this.table = new TableController(this.$table, TableType.History);

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
            downloadScreenshot(this.$table, `${ this.player.Name }_${ Date.now() }.png`);
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
            UI.OnlineShareFile.show(Storage.getExportPlayerData(this.identifier, Database.Players[this.identifier].List.map(x => x[0])), this.table.getSettings());
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

                    settings = SettingsManager.get(this.identifier, 'me', PredefinedTemplates['Me Default']);
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = Templates.get(value);
                }

                this.table.setSettings(settings);
                this.table.refresh();

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
        this.table.setSettings(SettingsManager.get(this.identifier, 'me', PredefinedTemplates['Me Default']));

        this.list.forEach(([ a, b ]) => Database.loadPlayer(b));

        this.refresh();
    }

    refresh () {
        // Configuration indicator
        this.$configure.settingsButton(SettingsManager.exists(this.identifier));

        // Table stuff
        this.table.setEntries(this.list);
        this.table.refresh();
    }
}

// Browse View
class BrowseView extends View {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        // Tables
        this.tableBase = new TableController(this.$table, TableType.Players);
        this.tableQ = new TableController(this.$table, TableType.Players);

        // Keep track of what table is displayed and swap if necessary later
        this.table = this.tableBase;
        this.tableQEnabled = false;

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
            downloadScreenshot(this.$table, `players.${ this.timestamp }.png`);
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
                    label: 'Copy with companions',
                    action: (source) => {
                        copyText(JSON.stringify(Database.getPlayer(source.attr('data-id')).Latest.toSimulatorShadowModel()));
                    },
                    enabled: SiteOptions.inventory
                },
                {
                    label: 'Share',
                    action: (source) => {
                        let ids = this.$parent.find('[data-id].css-op-select').toArray().map(el => $(el).attr('data-id'));
                        if (ids.length > 0) {
                            ids.push(source.attr('data-id'));
                        }

                        UI.OnlineShareFile.show(Storage.getExportManyPlayerData(ids), '');
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
            var array = this.table.getArray();
            var slice = array.perf || this.table.getEntryLimit();
            if (slice) {
                array = array.slice(0, slice);
            }

            copyText(JSON.stringify(array.map(p => p.player.toSimulatorModel())));
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
            'q': 'Custom settings (separate header names with comma)',
            'qc': 'Show only selected categories'
        }).change((event) => {
            var filter = $(event.target).val().split(/(?:\s|\b)(c|p|g|s|e|l|f|r|x|h|o|sr|q|qc):/);

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
            this.tableQEnabled = false;

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
                            test: (arg, player, timestamp, compare) => arg.eval(player, compare),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = new Expression(arg);
                    if (ast.isValid()) {
                        this.autosort = (player, compare) => ast.eval(player, compare);
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
                    this.tableQEnabled = true;
                    this.recalculate = true;

                    // Clear original sort
                    this.table.clearSorting();

                    this.table = this.tableQ;
                    this.table.setSettings(`category${ arg.split(',').reduce((c, a) => c + `\nheader ${ a.trim() }`, '') }`);
                } else if (key == 'qc' && typeof(arg) == 'string' && arg.length) {
                    this.table.selectCategories(arg.split(',').map(x => x.trim()));
                }
            }

            if (!this.tableQEnabled) {
                this.table = this.tableBase;
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
                            let pp = currentPlayer[1];
                            let cp = (ts || currentPlayer)[1];

                            entries.add(Database.loadPlayer(pp), Database.loadPlayer(cp), currentPlayer[1].Timestamp == this.timestamp, hidden);
                        }
                    }
                }
            }

            this.table.setEntries(entries, !this.recalculate, sim, this.autosort);

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

        this.load();
    }

    load () {
        // Configuration indicator
        this.$configure.find('.item').removeClass('active');
        this.$configure.settingsButton(SettingsManager.exists('players'));

        this.table.setSettings(SettingsManager.get('players', 'players', PredefinedTemplates['Players Default']));

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

                    settings = SettingsManager.get('players', 'players', PredefinedTemplates['Players Default']);
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = Templates.get(value);
                }

                this.table.setSettings(settings);

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
        this.table.refresh(() => {
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
        });
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
                        UI.OnlineShareFile.show(Storage.getExportGroupData(group, Database.Groups[group].List.map(x => x[0])), '');
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
                    label: 'Copy with companions',
                    action: (source) => {
                        copyText(JSON.stringify(Database.getPlayer(source.attr('data-id')).Latest.toSimulatorShadowModel()));
                    },
                    enabled: SiteOptions.inventory
                },
                {
                    label: 'Share',
                    action: (source) => {
                        UI.OnlineShareFile.show(Storage.getExportManyPlayerData([ source.attr('data-id') ]), '');
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
        this.$configure.settingsButton(SettingsManager.exists('me'));

        this.settings = SettingsManager.get('me', 'me', PredefinedTemplates['Me Default']);
        this.$filter.trigger('change');

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
            let shouldSave = false;

            // Raw values
            let label = this.$textLabel.val().trim();
            let version = this.$textVersion.val().trim();
            let color = this.$textColor.val().trim();
            let timestamp = this.$textTimestamp.val().trim();

            // Change stuff
            if (label != this.currentLabel) {
                shouldSave |= true;

                this.currentFile.label = label;
            }

            let numberVersion = Number(version);
            if (version != this.currentVersion && Number.isInteger(numberVersion)) {
                shouldSave |= true;

                this.currentFile.version = numberVersion;
            }

            if (color != this.currentColor) {
                if (color in COLOR_MAP) {
                    shouldSave |= true;

                    this.currentFile.color = color;
                } else if (color == '') {
                    shouldSave |= true;

                    delete this.currentFile.color;
                }
            }

            // Update file if needed
            if (shouldSave) {
                Storage.update(this.currentIndex, this.currentFile);
            }

            // Change timestamp
            let numberTimestamp = parseOwnDate(timestamp);
            if (numberTimestamp != this.currentTimestamp) {
                Storage.updateTimestamp(this.currentIndex, numberTimestamp);
            }

            // Refresh view and hide modal
            UI.show(UI.Files);
            this.hide();
        });
    }

    show (id) {
        this.currentIndex = id;
        this.currentFile = Storage.files()[id];

        // Current values
        this.currentLabel = this.currentFile.label || '';
        this.currentVersion = this.currentFile.version || 0;
        this.currentColor = this.currentFile.color || '';
        this.currentTimestamp = parseOwnDate(formatDate(this.currentFile.timestamp));

        // Set inputs
        this.$textLabel.val(this.currentLabel);
        this.$textVersion.val(this.currentVersion);
        this.$textColor.val(this.currentColor);
        this.$textTimestamp.val(formatDate(this.currentTimestamp));

        // Show modal
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
                UI.OnlineShareFile.show(Storage.getExportData(), '');
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
                UI.OnlineShareFile.show(Storage.getExportData(array), '');
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

        // Trackers
        this.$lazy = this.$parent.find('[data-op="checkbox-tracker"]').checkbox({
            onChecked: () => {
                SiteOptions.tracker = true
            },
            onUnchecked: () => {
                SiteOptions.tracker = false
            }
        }).checkbox(SiteOptions.tracker ? 'set checked' : 'set unchecked');

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

        // Collapsed things
        this.shown = {};
    }

    show () {
        // Set counters
        this.$gcount.text(Object.keys(Database.Groups).length);
        this.$pcount.text(Object.keys(Database.Players).length);
        this.$rpcount.text(Storage.files().map(f => f.players ? f.players.length : 0).reduce((a, b) => a + b, 0));
        this.$fcount.text(Storage.files().length);

        // Files
        let showHidden = SiteOptions.files_hide;
        let files = [ ... Storage.files() ];
        files.reverse();

        // Categories
        let categories = { };
        let nocategory = [ ];

        for (let file of files) {
            if (file.label) {
                if (!(file.label in categories)) {
                    categories[file.label] = [ ];
                }

                categories[file.label].push(file);
            } else {
                nocategory.push(file);
            }
        }

        for (let [key, list] of Object.entries(categories)) {
            if (list.length < 2) {
                nocategory.push(... list);
                delete categories[key];
            } else {
                list.sort((a, b) => b.timestamp - a.timestamp);
            }
        }

        nocategory.sort((a, b) => b.timestamp - a.timestamp);

        // Create segment
        let createSegment = (file, isInCategory = false) => {
            let sha = file.label ? SHA1(file.label) : null;
            return `
                <div class="ui segment ${ file.hidden ? 'css-file-hidden' : '' }" data-id="${ file.index }" ${ sha ? `data-name="${ sha }"` : '' } style="${ file.color ? `background-color: ${ getColorFromName(file.color) }10;` : '' } ${ (!file.hidden || showHidden) && (!isInCategory || !sha || this.shown[sha]) ? '' : 'display: none;' }">
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
                <div class="ui tiny modal" data-for="${ file.index }">
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
        }

        let createCategory = (name, list) => {
            let hidden = list.every(x => x.hidden);
            let hiddenCSS = hidden ? 'opacity: 50%;' : '';
            let sha = SHA1(name);

            return `
                <div class="ui segment file-category" style="position: relative; padding-left: 0; padding-right: 0;">
                    <i class="eye ${ hidden ? '' : 'slash outline' } clickable lowglow icon" data-op="hide-category" style="position: absolute; top: 1.25em; right: 4.2em; ${ hiddenCSS }"></i>
                    <i class="angle double down clickable lowglow-green icon" data-op="collapse-category" style="position: absolute; top: 1.25em; right: 9.625em; ${ hiddenCSS }"></i>
                    <div class="file-category-labels clickable" style="width: 75%; ${ hiddenCSS }; margin-left: 1.15em;">
                        <div class="ui checkbox not-clickable file-detail-checkbox" data-op="select-category" data-category="${ sha }">
                            <input type="checkbox">
                        </div>
                        <h3 class="ui margin-tiny-top not-clickable header mleft-20">${ name }<span style="color: gray; font-size: 90%;"> - ${ list.length } files</span></h3>
                    </div>
                    ${ list.reduce((c, f) => c + createSegment(f, true), '') }
                </div>
            `;
        }

        // Create content
        let content = '';
        content += Object.entries(categories).reduce((c, [ name, list ]) => c + createCategory(name, list), '');
        content += nocategory.reduce((c, f) => c + createSegment(f), '');

        // Fill content & add select handler
        this.$list.html(content);

        this.$parent.find('[data-op="hide-category"]').click((event) => {
            let $el = $(event.target);
            let $parent = $el.closest('div');
            let $files = $parent.find('[data-id]');

            let forceHide = $el.hasClass('slash');

            Storage.setHidden(forceHide, ... $files.toArray().map(f => Number($(f).attr('data-id'))));

            this.show();
        });

        this.$parent.find('[data-op="collapse-category"]').click((event) => {
            let $el = $(event.target);
            let $parent = $el.closest('div');
            let $files = $parent.find('[data-id]');

            let cat = $parent.find('[data-category]').attr('data-category');
            if (cat in this.shown) {
                delete this.shown[cat];
            } else if ($parent.find('[data-id]:not(.css-file-hidden)').length || showHidden) {
                this.shown[cat] = true;
            }

            this.show();
        });

        this.$list.find('.file-detail-labels').click(function () {
            $(this).find('[data-op="select"]').checkbox('toggle');
            $(this).closest('[data-id]').toggleClass('selected');
            $(this).closest('.file-category').find('[data-op="select-category"]').checkbox('uncheck');
        });

        this.$list.find('.file-category-labels').click(function () {
            let $checkbox = $(this).find('[data-op="select-category"]').checkbox('toggle');
            let category = $checkbox.attr('data-category');
            let checked = $checkbox.checkbox('is checked');

            let $list = $(this).closest('[data-op="list"]').find(`[data-name="${ category }"]`);

            if (checked) {
                $list.find('[data-op="select"]').checkbox('check');
                $list.closest('[data-id]').addClass('selected');
            } else {
                $list.find('[data-op="select"]').checkbox('uncheck');
                $list.closest('[data-id]').removeClass('selected');
            }
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
        this.$parent.find('[data-op="select-category"]').checkbox();

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

            Storage.setHidden(null, Number(id));

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

        // Button handling
        this.$parent.find('[data-op="wiki-home"]').click(() => window.open('https://github.com/HafisCZ/sf-tools/wiki', '_blank'));
        this.$parent.find('[data-op="browse"]').click(() => UI.OnlineTemplates.show());
        this.$parent.find('[data-op="templates"]').click(() => UI.Templates.show());

        this.$parent.find('[data-op="copy"]').click(() => copyText(this.$area.val()));
        this.$parent.find('[data-op="prev"]').click(() => this.history(1));
        this.$parent.find('[data-op="next"]').click(() => this.history(-1));

        this.$parent.find('[data-op="close"]').click(() => this.hide());
        this.$save = this.$parent.find('[data-op="save"]').click(() => this.save());
        this.$delete = this.$parent.find('[data-op="delete"]').click(() => this.remove());

        this.$parent.find('[data-op="save-apply-template"]').click(() => this.saveApplyTemplate());

        /*
            Save as template dialog
        */
        this.$templatePopup = this.$parent.find('[data-op="save-popup"]').templatePopup('create', {
            trigger: this.$parent.find('[data-op="save-template"]'),
            getValues: () => Templates.getKeys().map(key => {
                return {
                    name: key,
                    value: key,
                    selected: this.settings && key == this.settings.parent
                }
            }),
            onSave: value => {
                if (value) {
                    Templates.save(value, this.$area.val());

                    this.settings.parent = value;
                    this.$settingsList.settings_selectionlist('set unsaved', true);

                    if (UI.current.refreshTemplateDropdown) {
                        UI.current.refreshTemplateDropdown();
                    }

                    this.updateTemplates();
                }
            }
        });

        this.$templatePopup.templatePopup('pos', {
            x: 0,
            y: -0.25
        });

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
            this.$settingsList.settings_selectionlist('set unsaved', this.settings && val !== this.settings.content);
            if (!this.settings || val == this.settings.code) {
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
        } else if (v == 'tracker') {
            return '';
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
        } else if (v == 'tracker') {
            return PredefinedTemplates['Tracker'];
        } else {
            return PredefinedTemplates['Guilds Default'];
        }
    }

    hide () {
        // Do nothing
    }

    remove () {
        // Do nothing
    }

    show (key = 'players') {
        this.settings = {
            name: key,
            content: this.getDefaultTemplate(key),
            ... SettingsManager.getObj(key, this.getDefault(key)) || {}
        };

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
                selected: this.settings.name == 'players'
            },
            {
                name: 'Me',
                value: 'me',
                selected: this.settings.name == 'me'
            },
            {
                name: 'Guilds',
                value: 'guilds',
                selected: this.settings.name == 'guilds'
            },
            ... SettingsManager.getKeys().map(key => {
                if ([ 'me', 'players', 'guilds', 'tracker' ].includes(key)) {
                    return null;
                } else {
                    return {
                        name: Database.Players[key] ? `P: ${ Database.Players[key].Latest.Name }` : (Database.Groups[key] ? `G: ${ Database.Groups[key].Latest.Name }` : key),
                        value: key,
                        selected: this.settings.name == key
                    };
                }
            }).filter(obj => obj != null)
        ];

        if (SiteOptions.tracker) {
            settings.unshift({
                name: '<i>Tracker Configuration</i>',
                value: 'tracker',
                selected: this.settings.name == 'tracker'
            });
        }

        // Setup list
        this.$settingsList.settings_selectionlist({
            items: settings,
            onClick: value => this.show(value),
            onSave: value => this.save(),
            onRemove: value => {
                SettingsManager.remove(value);

                if (SiteOptions.tracker && value == 'tracker') {
                    Database.refreshTrackers();
                }

                this.show();
            }
        });
    }

    saveApplyTemplate () {
        if (this.settings.parent) {
            Templates.save(this.settings.parent, this.$area.val());
        }

        this.save();
        this.hide();
    }

    save () {
        let code = this.$area.val();
        if (code !== this.settings.content) {
            // Add into history
            SettingsManager.addHistory(this.settings.content, this.settings.name);
        }

        // Save current code
        this.settings.content = code;
        SettingsManager.save(this.settings.name, this.settings.content, this.settings.parent);

        if (SiteOptions.tracker && this.settings.name == 'tracker') {
            Database.refreshTrackers();
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
                    this.settings.parent = '';
                } else {
                    this.$area.val(Templates.get(value));
                    this.settings.parent = value;
                }

                this.$area.trigger('input');
            }
        });
    }

    history (i = 0) {
        let history = SettingsManager.getHistory();
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
            this.$area.val(this.settings.content);
        }

        this.$area.trigger('input');
    }
}

// Settings View within a modal
class SettingsFloatView extends SettingsView {
    constructor (parent) {
        super(parent);

        this.$templatePopup.templatePopup('pos', {
            x: -2.75,
            y: -5.25
        });
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
        if (UI.current.clearOverride) {
            UI.current.clearOverride();
        }

        if (UI.current.refreshTemplateDropdown) {
            UI.current.refreshTemplateDropdown();
        }

        SettingsManager.remove(this.identifier);
        this.hide();
        UI.current.load();
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

        var changes = '';
        var label = '';

        if (CHANGELOG[MODULE_VERSION] && CHANGELOG[MODULE_VERSION].label) {
            label = CHANGELOG[MODULE_VERSION].label;
            changes += `<div class="text-center" style="margin-left: 5em; margin-right: 7em; font-size: 110%;">${ CHANGELOG[MODULE_VERSION].content }<div>`;
        } else {
            label = MODULE_VERSION;
            if (CHANGELOG[MODULE_VERSION]) {
                for (var entry of CHANGELOG[MODULE_VERSION]) {
                    changes += `
                        <li style="margin-bottom: 1em;">
                            ${ entry }
                        </li>
                    `;
                }
            }
        }

        this.$parent.find('[data-op="version"]').text(label);
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
            if (content.label) {
                changes += `
                    <div class="row css-row-ver">
                        <div class="two wide column"></div>
                        <div class="one wide column">
                            <h3 class="ui header css-h3-ver">${ version }</h3>
                        </div>
                        <div class="thirteen wide column">
                            <div style="margin-left: 2.75em; margin-top: 0.25em;">
                                <h3 class="ui header" style="margin-bottom: 0.5em;">${ content.label }</h3>${ content.content }
                            </div>
                        </div>
                    </div>
                `;
            } else {
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

    show (data, bundledSettings = '') {
        // Shared object
        this.sharedObj = {
            data: data,
            settings: bundledSettings
        };

        // Setup checkboxes
        this.$once.checkbox('set checked');
        this.$bundle.checkbox('set unchecked');

        if (!bundledSettings) {
            this.$bundle.checkbox('set disabled');
        } else {
            this.$bundle.checkbox('set enabled');
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

class TemplatesView extends View {
    constructor (parent) {
        super(parent);

        // Template list
        this.$templates = this.$parent.find('[data-op="templates"]');
        this.$dimmer = this.$parent.find('[data-op="dimmer"]');

        // Template details
        this.$name = this.$parent.find('[data-op="name"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');
        this.$timestamp2 = this.$parent.find('[data-op="timestamp2"]');
        this.$key = this.$parent.find('[data-op="key"]');
        this.$compat = this.$parent.find('[data-op="compat"]');
        this.$version = this.$parent.find('[data-op="version"]');

        // Online buttons
        this.$publish = this.$parent.find('[data-op="publish"]').click(() => this.publishTemplate());
        this.$update = this.$parent.find('[data-op="update"]').click(() => this.updateTemplate());
        this.$delete = this.$parent.find('[data-op="delete"]').click(() => this.deleteTemplate());
        this.$open = this.$parent.find('[data-op="open"]').click(() => this.openTemplate());
    }

    getCurrentView () {
        // Return current settings window
        return UI.current == UI.Settings ? UI.Settings : UI.SettingsFloat;
    }

    clearOverride () {
        // Try clear overrides
        if (UI.current.clearOverride) {
            UI.current.clearOverride();
        }

        if (UI.current.refreshTemplateDropdown) {
            UI.current.refreshTemplateDropdown();
        }
    }

    openTemplate () {
        // Fill $area and hide
        this.getCurrentView().$area.val(this.tmp.content).trigger('input');
        this.hide();
    }

    setLoading (loading) {
        // Prevent modal from closing when in loading state
        this.loading = loading;
        if (loading) {
            this.$dimmer.addClass('active');
        } else {
            this.$dimmer.removeClass('active');
        }
    }

    updateTemplate () {
        if (this.$update.hasClass('basic')) {
            // Remove basic class from the button
            this.$update.removeClass('basic');

            // Readd the class after 2 seconds without action
            this.updateTimeout = setTimeout(() => {
                this.$update.addClass('basic');
            }, 2000);
        } else {
            // Clear timeout
            clearTimeout(this.updateTimeout);

            // Get values
            let name = this.tmp.name;
            let content = this.currentContent;
            let compat = this.tmp.compat;

            // Save template
            Templates.save(name, content, compat);

            // Refresh everything
            this.clearOverride();
            this.showTemplate(name);
        }
    }

    publishTemplate () {
        // Get values
        let name = this.tmp.name;
        let content = this.tmp.content;

        // Set loading
        this.setLoading(true);

        if (this.tmp.online) {
            // Update if already online
            var formData = new FormData();
            formData.append('description', name);
            formData.append('content', content);
            formData.append('key', this.tmp.online.key);
            formData.append('secret', this.tmp.online.secret);

            // Create request
            $.ajax({
                url: 'https://sftools-api.herokuapp.com/scripts/update',
                type: 'POST',
                processData: false,
                contentType: false,
                data: formData
            }).done(obj => {
                if (obj.success) {
                    // Mark as online
                    Templates.markAsOnline(name, obj.key, obj.secret);

                    // Refresh
                    this.showTemplate(name);
                }

                // Clear loading
                this.setLoading(false);
            }).fail(() => {
                this.setLoading(false);
            });
        } else {
            // Publish
            var formData = new FormData();
            formData.append('description', name);
            formData.append('content', content);
            formData.append('author', 'unknown');
            formData.append('token', '0');

            // Create request
            $.ajax({
                url: 'https://sftools-api.herokuapp.com/scripts/share',
                type: 'POST',
                processData: false,
                contentType: false,
                data: formData
            }).done(obj => {
                if (obj.success) {
                    // Mark as online
                    Templates.markAsOnline(name, obj.key, obj.secret);

                    // Refresh
                    this.showTemplate(name);
                }

                // Clear loading
                this.setLoading(false);
            }).fail(() => {
                this.setLoading(false);
            });
        }
    }

    deleteTemplate () {
        if (this.$delete.hasClass('basic')) {
            // Remove basic class from the button
            this.$delete.removeClass('basic');

            // Readd the class after 2 seconds without action
            this.deleteTimeout = setTimeout(() => {
                this.$delete.addClass('basic');
            }, 2000);
        } else {
            // Clear timeout
            clearTimeout(this.deleteTimeout);

            // Get values
            let name = this.tmp.name;

            if (this.tmp.online) {
                // Unpublish first if online
                let key = this.tmp.online.key;
                let secret = this.tmp.online.secret;

                // Remove online template
                $.ajax({
                    url: `https://sftools-api.herokuapp.com/scripts/delete?key=${ key }&secret=${ secret }`,
                    type: 'GET'
                }).done(obj => {
                    if (obj.success) {
                        // Set as offline
                        Templates.markAsOffline(name);
                    }

                    // Refresh
                    this.showTemplate(name);
                    this.setLoading(false);
                }).fail(() => {
                    this.setLoading(false);
                });
            } else {
                // Delete template
                Templates.remove(name);

                // Refresh everything
                this.getCurrentView().updateTemplates();
                this.clearOverride();
                this.refreshList();
            }
        }
    }

    show () {
        // Refresh stuff
        this.currentContent = this.getCurrentView().$area.val();
        this.refreshList();

        // Open modal
        this.$parent.modal({
            centered: true,
            allowMultiple: true,
            onHide: () => {
                return !this.loading;
            }
        }).modal('show');
    }

    refreshList () {
        // Reset cached template
        this.tmp = null;

        // Reset panel
        this.$name.val('');
        this.$timestamp.val('');
        this.$version.val('');
        this.$compat.val('');
        this.$timestamp2.val('');
        this.$key.val('');

        // Reset online buttons
        this.$publish.addClass('disabled');

        // Reset buttons
        this.$delete.addClass('disabled basic').find('span').text('Remove');
        clearTimeout(this.deleteTimeout);

        this.$update.addClass('disabled basic');
        clearTimeout(this.updateTimeout);

        this.$open.removeClass('link');

        // Refresh list
        this.$templates.templateList({
            items: Templates.getKeys(),
            onClick: name => this.showTemplate(name)
        });
    }

    showTemplate (name) {
        // Clear some things again
        clearTimeout(this.deleteTimeout);
        clearTimeout(this.updateTimeout);

        this.$delete.addClass('basic');
        this.$update.addClass('basic');

        let tmp = this.tmp = Templates.all()[name];

        // Set fields
        this.$name.val(tmp.name);
        this.$timestamp.val(formatDate(tmp.timestamp));
        this.$version.val(tmp.version || `< ${ MODULE_VERSION }`);

        // Compat
        let compatString = (tmp.compat ? [ tmp.compat.cm ? 'Me' : '', tmp.compat.cg ? 'Guilds' : '', tmp.compat.cp ? 'Players' : '' ].filter(x => x).join(', ') : '') || 'Not set';
        this.$compat.val(compatString);

        // Online
        if (tmp.online) {
            this.$timestamp2.val(formatDate(tmp.online.timestamp));
            this.$key.val(tmp.online.key);

            // Don't allow delete when published
            this.$delete.removeClass('disabled').find('span').text('Unpublish');

            // Allow publish when not equal
            if (tmp.timestamp != tmp.online.timestamp) {
                this.$publish.removeClass('disabled');
            } else {
                this.$publish.addClass('disabled');
            }
        } else {
            this.$timestamp2.val('');
            this.$key.val('');

            // Allow delete only when unpublished
            this.$delete.removeClass('disabled').find('span').text('Remove');
            this.$publish.removeClass('disabled');
        }

        // Update button
        if (tmp.content != this.currentContent) {
            this.$update.removeClass('disabled');
        } else {
            this.$update.addClass('disabled');
        }

        this.$open.addClass('link');
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

        this.onReceive = (code, obj) => {
            this.$ok.removeClass('loading');
            if (code && obj) {
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
                    }).done(obj => this.onReceive(code, obj)).fail(() => this.onReceive());
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

        this.$username = this.$parent.find('[data-op="textUsername"]');
        this.$password = this.$parent.find('[data-op="textPassword"]');

        this.$modeDefault = this.$parent.find('[data-op="modeDefault"]').checkbox();
        this.$modeOwn = this.$parent.find('[data-op="modeOwn"]').checkbox();
        this.$modeAll = this.$parent.find('[data-op="modeAll"]').checkbox();

        this.$iframe = this.$parent.find('[data-op="iframe"]');
        this.$list = this.$parent.find('[data-op="list"]');
        this.$import = this.$parent.find('[data-op="import"]');

        this.endpoint = undefined;
        this.downloading = [];

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
            var server = '';

            var own = this.$modeOwn.checkbox('is checked');
            var all = this.$modeAll.checkbox('is checked');

            if (/^(.{4,})@(.+\.sfgame\..+)$/.test(username)) {
                [, username, server, ] = username.split(/^(.{4,})@(.+\.sfgame\..+)$/);
            } else {
                return;
            }

            if (username.length < 4 || password.length < 4 || !/\.sfgame\./.test(server)) {
                return;
            } else {
                if (this.endpoint) {
                    this.$step1.hide();
                    this.$step4.show();

                    if (own) {
                        this.funcLoginSingle(server, username, password);
                    } else if (all) {
                        this.funcLoginAll(server, username, password);
                    } else {
                        this.funcLogin(server, username, password);
                    }
                } else {
                    this.$step1.hide();
                    this.$step2.show();
                    this.endpoint = new EndpointController(this.$iframe, () => {
                        this.$step2.hide();
                        this.$step4.show();

                        if (own) {
                            this.funcLoginSingle(server, username, password);
                        } else if (all) {
                            this.funcLoginAll(server, username, password);
                        } else {
                            this.funcLogin(server, username, password);
                        }
                    });
                }
            }
        });

        this.funcLoginSingle = (server, username, password) => {
            this.endpoint.login_querry_only(server, username, password, (text) => {
                Storage.add(text, Date.now());
                this.funcShutdown();
                UI.current.show();
            }, () => {
                this.$step4.hide();
                this.showError('Wrong username or password');
            });
        };

        this.funcLoginAll = (server, username, password) => {
            this.endpoint.login_querry_all(server, username, password, (text) => {
                Storage.add(text, Date.now());
                this.funcShutdown();
                UI.current.show();
            }, () => {
                this.$step4.hide();
                this.showError('Wrong username or password');
            });
        };

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
        this.$modeDefault.checkbox('check');

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

        $('.ui.container').addClass('css-hidden');

        screen.$parent.removeClass('css-hidden');
        screen.show(... arguments);
    },
    beta: function (isbeta) {
        if (isbeta) {
            UI.Files.$endpoint.show();
            UI.Files.$insecure.show();
            UI.Files.$cloudexport.show();
            UI.FileUpdate.$textTimestamp.parent('div').removeClass('disabled');
        } else {
            UI.Files.$endpoint.hide();
            UI.Files.$insecure.hide();
            UI.Files.$cloudexport.hide();
            UI.FileUpdate.$textTimestamp.parent('div').addClass('disabled');
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
        UI.ChangeLogs = new ChangeLogsView('view-changelog');
        UI.Endpoint = new EndpointView('modal-endpoint');
        UI.ConfirmDialog = new ConfirmDialogView('modal-confirm');

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
