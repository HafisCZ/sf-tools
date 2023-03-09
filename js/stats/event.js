// Helper class
class DynamicLoader {
    constructor (container) {
        this.callback = null;
        this.observer = new IntersectionObserver(
            () => this._callback(),
            { threshold: 1.0 }
        );

        this.observed = container.insertAdjacentElement('afterend', document.createElement('div'));
        this.observer.observe(this.observed);
    }

    _callback () {
        if (this.callback) {
            this.callback();
        }
    }

    start (callback) {
        this.callback = callback;
        this.callback();
    }

    stop () {
        this.callback = null;
    }
}

// Group Detail View
class GroupDetailView extends View {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');
        this.table = new TableController(this.$table, ScriptType.Group);

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

                $(doc).find('tbody').prepend($(`<tr style="height: 2em;"><td colspan="8" class="text-left" style="padding-left: 8px;">${ formatDate(ta) }${ ta != tb ? ` - ${ formatDate(tb) }` : '' }</td></tr>`));
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

        const exportFromDropdown = (timestampRange, dialog = false) => {
            const exportPromise = DatabaseManager.export(null, timestampRange, (player) => player.group == this.identifier);
            if (dialog) {
                exportPromise.then((data) => DialogController.open(ExportSharedFileDialog, data))
            } else {
                exportPromise.then((data) => Exporter.json(data, `${this.identifier}_${Date.now()}`));
            }
        }

        this.$parent.find('[data-op="export"]').click(() => exportFromDropdown(this.list.map(entry => entry[0])));
        this.$parent.find('[data-op="export-l"]').click(() => exportFromDropdown([ _dig(this.list, 0, 0) ]));
        this.$parent.find('[data-op="export-l5"]').click(() => exportFromDropdown(this.list.slice(0, 5).map(entry => entry[0])));
        this.$parent.find('[data-op="export-s"]').click(() => exportFromDropdown([ this.timestamp ]));
        this.$parent.find('[data-op="export-sr"]').click(() => exportFromDropdown([ this.timestamp, this.reference ]));

        this.$parent.find('[data-op="share"]').click(() => exportFromDropdown([ this.timestamp, this.reference ], true));

        // Context menu
        this.$context = $('<div class="ui custom inverted popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        copyText(JSON.stringify(DatabaseManager.getPlayer(source.attr('data-id'), this.timestamp).toSimulatorModel()));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (source) => {
                        copyText(JSON.stringify(DatabaseManager.getPlayer(source.attr('data-id'), this.timestamp).toSimulatorShadowModel()));
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
                UI.show(UI.Settings, this.identifier, () => UI.returnTo(UI.GroupDetail))
            }
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$identifier = this.$parent.find('[data-op="identifier"]');

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
                    name: `<b>${intl('stats.templates.quick_swap')}</b>`,
                    type: 'header'
                },
                ... TemplateManager.sortedList().map(({ name }) => {
                    return {
                        value: name,
                        name
                    };
                })
            ]
        });
    }

    show (identitifier) {
        this.refreshTemplateDropdown();

        this.identifier = identitifier;
        this.group = DatabaseManager.getGroup(identitifier);

        this.$name.html(this.group.Latest.Name);
        this.$identifier.html(this.identifier);

        var listTimestamp = [];
        var listReference = [];

        this.list = SiteOptions.groups_empty ? this.group.List : this.group.List.filter(([, g]) => g.MembersPresent);

        this.timestamp = _dig(this.list, 0, 0);
        this.reference = (SiteOptions.always_prev ? _dig(this.list, 1, 0) : undefined) || this.timestamp;

        const formatEntry = (group) => {
            if (group.MembersPresent >= group.MembersTotal) {
                return formatDate(group.Timestamp);
            } else {
                return `<div class="flex justify-content-between"><span>${formatDate(group.Timestamp)}</span><span class="text-gray">${group.MembersPresent} / ${group.MembersTotal}</span></div>`
            }
        }

        for (var [ timestamp, group ] of this.list) {
            listTimestamp.push({
                name: formatEntry(group),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            if (timestamp <= this.timestamp) {
                listReference.push({
                    name: formatEntry(group),
                    value: timestamp,
                    selected: timestamp == this.reference
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
        this.load();
    }

    load () {
        this.$configure.settingsButton(ScriptManager.exists(this.identifier));

        if (this.templateOverride) {
            this.table.clearSorting();
        }

        this.table.setSettings(this.templateOverride ? TemplateManager.getContent(this.templateOverride) : ScriptManager.getContent(this.identifier, 'guilds', DefaultScripts.getContent('groups')));

        var current = this.group[this.timestamp];
        var reference = this.group[this.reference];

        // Joined and kicked members
        var joined = current.Members.filter(id => !reference.Members.includes(id)).map(id => {
            let p = DatabaseManager.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                return _dig(DatabaseManager.getPlayer(id), 'Latest', 'Name') || id;
            }
        });

        var kicked = reference.Members.filter(id => !current.Members.includes(id)).map(id => {
            let p = DatabaseManager.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                return _dig(DatabaseManager.getPlayer(id), 'Latest', 'Name') || id;
            }
        });

        // Members
        var members = [];
        var missingMembers = [];
        for (var id of current.Members) {
            let player = DatabaseManager.getPlayer(id, this.timestamp);
            if (player) {
                members.push(player);
            } else {
                missingMembers.push(current.Names[current.Members.findIndex(x => x == id)]);
            }
        }

        // Reference members
        var membersReferences = [];
        for (var member of members) {
            var player = DatabaseManager.getPlayer(member.Identifier);
            if (player) {
                var playerReference = DatabaseManager.getPlayer(member.Identifier, this.reference);
                if (playerReference && playerReference.Group.Identifier == this.identifier) {
                    membersReferences.push(playerReference);
                } else {
                    var ts = player.List.concat().reverse().find(p => p[0] >= this.reference && p[0] <= member.Timestamp && p[1].Group.Identifier == this.identifier);
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
            this.$table.find('tbody').append($('<tr style="height: 2em;"></tr>'));
        }, (block) => {
            let blockClickable = block.find('[data-id]').click((event) => {
                UI.PlayerDetail.show(event.currentTarget.dataset.id, this.timestamp, this.reference);
            });

            this.$context.context('bind', blockClickable);
        });
    }

    reload () {
        this.templateOverride = '';
        this.refreshTemplateDropdown();
        this.load();
    }
}

// Player Detail FLot View
class PlayerDetailFloatView extends View {
    constructor (player) {
        super(player);
    }

    intl (key) {
        return intl(`stats.player.${key}`);
    }

    show (identifier, timestamp, reference = timestamp) {
        let playerObject = DatabaseManager.getPlayer(identifier);
        let timestampsReverse = playerObject.List.map(([ts, ]) => ts).reverse(); // Newest to oldest
        let timestamps = playerObject.List.map(([ts, ]) => ts); // Oldest to newest
        let timestampCurrent = timestamps.find(t => t <= timestamp) || playerObject.LatestTimestamp;
        let timestampReference = timestampsReverse.find(t => t >= reference && t <= timestampCurrent);
        if (!timestampReference) {
            timestampReference = timestampCurrent;
        }

        let player = DatabaseManager.getPlayer(identifier, timestampCurrent);
        let compare = DatabaseManager.getPlayer(identifier, timestampReference);

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
                            <div class="detail-item">${this.intl('attributes')}</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute1')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Total) }${ asDiff(player.Strength.Total, compare.Strength.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute2')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Total) }${ asDiff(player.Dexterity.Total, compare.Dexterity.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute3')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Total) }${ asDiff(player.Intelligence.Total, compare.Intelligence.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute4')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Total) }${ asDiff(player.Constitution.Total, compare.Constitution.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute5')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Total) }${ asDiff(player.Luck.Total, compare.Luck.Total, formatAsSpacedNumber) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">${this.intl('basis')}</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute1')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Strength.Base) }${ asDiff(player.Strength.Base, compare.Strength.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute2')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Dexterity.Base) }${ asDiff(player.Dexterity.Base, compare.Dexterity.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute3')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Intelligence.Base) }${ asDiff(player.Intelligence.Base, compare.Intelligence.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute4')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Constitution.Base) }${ asDiff(player.Constitution.Base, compare.Constitution.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${intl('general.attribute5')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Luck.Base) }${ asDiff(player.Luck.Base, compare.Luck.Base, formatAsSpacedNumber) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">${this.intl('miscellaneous')}</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('armor')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Armor) }${ asDiff(player.Armor, compare.Armor, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('damage')}</div>
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
                            <div class="detail-item">${this.intl('health')}</div>
                            <div class="detail-item text-center">${ formatAsSpacedNumber(player.Health) }</div>
                        </div>
                        ${ player.Potions[0].Size ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">${this.intl('potions')}</div>
                            </div>
                            ${player.Potions.map(potion => {
                                if (potion.Size) {
                                    return `
                                        <div class="detail-entry">
                                            <div class="detail-item">${intl(`general.potion${potion.Type}`)}</div>
                                            <div class="detail-item text-center">+ ${potion.Size}%</div>
                                        </div>
                                    `;
                                } else {
                                    return '';
                                }
                            }).join('')}
                        ` : '' }
                    </div>
                    <div class="detail-panel">
                        ${ player.hasGuild() ? `
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">${this.intl('guild')}</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('name')}</div>
                                <div class="detail-item text-center">${ player.Group.Name }</div>
                            </div>
                            ${ player.Group.Role ? `
                                <div class="detail-entry">
                                    <div class="detail-item">${this.intl('role')}</div>
                                    <div class="detail-item text-center">${intl(`general.rank${player.Group.Role}`)}</div>
                                </div>
                            ` : '' }
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('joined_on')}</div>
                                <div class="detail-item text-center">${ formatDate(player.Group.Joined) }</div>
                            </div>
                            <br/>
                        ` : '' }
                        <!-- Group -->
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">${this.intl('bonuses')}</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('scrapbook')}</div>
                            <div class="detail-item text-center">${ player.Book } / ${ SCRAPBOOK_COUNT }${ asDiff(player.Book, compare.Book, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('achievements')}</div>
                            <div class="detail-item text-center">${ player.Achievements.Owned } / ${ ACHIEVEMENTS_COUNT }${ asDiff(player.Achievements.Owned, compare.Achievements.Owned, formatAsSpacedNumber) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('mount')}</div>
                            <div class="detail-item text-center">${ PLAYER_MOUNT[player.Mount] }%</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('heath_bonus')}</div>
                            <div class="detail-item text-center">${ player.Dungeons.Player }%${ asDiff(player.Dungeons.Player, compare.Dungeons.Player) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('damage_bonus')}</div>
                            <div class="detail-item text-center">${ player.Dungeons.Group }%${ asDiff(player.Dungeons.Group, compare.Dungeons.Group) }</div>
                        </div>
                        ${ player.Group && player.Group.Treasure ? `
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('treasure')}</div>
                                <div class="detail-item text-center">${ player.Group.Treasure }${ asDiff(player.Group.Treasure, compare.Group.Treasure) }</div>
                            </div>
                        ` : '' }
                        ${ player.Group && player.Group.Instructor ? `
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('instructor')}</div>
                                <div class="detail-item text-center">${ player.Group.Instructor }${ asDiff(player.Group.Instructor, compare.Group.Instructor) }</div>
                            </div>
                        ` : '' }
                        ${ player.Group && player.Group.Pet ? `
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('pet')}</div>
                                <div class="detail-item text-center">${ player.Group.Pet }${ asDiff(player.Group.Pet, compare.Group.Pet) }</div>
                            </div>
                        ` : '' }
                        ${ player.Fortress && player.Fortress.Knights ? `
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('knights')}</div>
                                <div class="detail-item text-center">${ player.Fortress.Knights }${ asDiff(player.Fortress.Knights, compare.Fortress.Knights) }</div>
                            </div>
                        ` : '' }
                        <br/>
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">${this.intl('runes.title')}</div>
                        </div>
                        ${ player.Runes.Gold ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune1')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Gold }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.XP ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune4')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.XP }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.Chance ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune2')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Chance }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.Quality ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune3')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Quality }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.Health ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune5')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.Health }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.DamageFire || player.Runes.Damage2Fire ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune10')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.DamageFire }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Fire }%` : '' }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.DamageCold || player.Runes.Damage2Cold ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune11')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.DamageCold }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Cold }%` : '' }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.DamageLightning || player.Runes.Damage2Lightning ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune12')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.DamageLightning }%${ player.Class == 4 ? ` / ${ player.Runes.Damage2Lightning }%` : '' }</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.ResistanceFire ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune6')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.ResistanceFire }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.ResistanceCold ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune7')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.ResistanceCold }%</div>
                            </div>
                        ` : '' }
                        ${ player.Runes.ResistanceLightning ? `
                            <div class="detail-entry">
                                <div class="detail-item">${intl('general.rune8')}</div>
                                <div class="detail-item text-center">+ ${ player.Runes.ResistanceLightning }%</div>
                            </div>
                        ` : '' }
                    </div>
                    <div class="detail-panel">
                        <!-- Fortress -->
                        <div class="detail-entry" style="border-bottom: white solid 1px;">
                            <div class="detail-item">${this.intl('fortress.title')}</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.upgrades')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Upgrades }${ asDiff(player.Fortress.Upgrades, compare.Fortress.Upgrades) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.rank')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Rank }${ asDiff(player.Fortress.Rank, compare.Fortress.Rank) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.honor')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Honor }${ asDiff(player.Fortress.Honor, compare.Fortress.Honor) }</div>
                        </div>
                        <br/>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building1')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Fortress }${ asDiff(player.Fortress.Fortress, compare.Fortress.Fortress) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building2')}</div>
                            <div class="detail-item text-center">${ player.Fortress.LaborerQuarters }${ asDiff(player.Fortress.LaborerQuarters, compare.Fortress.LaborerQuarters) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building3')}</div>
                            <div class="detail-item text-center">${ player.Fortress.WoodcutterGuild }${ asDiff(player.Fortress.WoodcutterGuild, compare.Fortress.WoodcutterGuild) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building4')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Quarry }${ asDiff(player.Fortress.Quarry, compare.Fortress.Quarry) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building5')}</div>
                            <div class="detail-item text-center">${ player.Fortress.GemMine }${ asDiff(player.Fortress.GemMine, compare.Fortress.GemMine) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building6')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Academy }${ asDiff(player.Fortress.Academy, compare.Fortress.Academy) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building7')}</div>
                            <div class="detail-item text-center">${ player.Fortress.ArcheryGuild }${ asDiff(player.Fortress.ArcheryGuild, compare.Fortress.ArcheryGuild) } (${ player.Fortress.ArcheryGuild * 2 }x ${ player.Fortress.Archers }${ asDiff(player.Fortress.Archers, compare.Fortress.Archers) })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building8')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Barracks }${ asDiff(player.Fortress.Barracks, compare.Fortress.Barracks) } (${ player.Fortress.Barracks * 3 }x ${ player.Fortress.Warriors }${ asDiff(player.Fortress.Warriors, compare.Fortress.Warriors) })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building9')}</div>
                            <div class="detail-item text-center">${ player.Fortress.MageTower }${ asDiff(player.Fortress.MageTower, compare.Fortress.MageTower) } (${ player.Fortress.MageTower }x ${ player.Fortress.Mages }${ asDiff(player.Fortress.Mages, compare.Fortress.Mages) })</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building10')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Treasury }${ asDiff(player.Fortress.Treasury, compare.Fortress.Treasury) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building11')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Smithy }${ asDiff(player.Fortress.Smithy, compare.Fortress.Smithy) }</div>
                        </div>
                        <div class="detail-entry">
                            <div class="detail-item">${this.intl('fortress.building12')}</div>
                            <div class="detail-item text-center">${ player.Fortress.Fortifications }${ asDiff(player.Fortress.Fortifications, compare.Fortress.Fortifications) } (${ player.Fortress.Wall }${ asDiff(player.Fortress.Wall, compare.Fortress.Wall) })</div>
                        </div>
                        ${ player.Fortress.Upgrade.Building >= 0 ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">${this.intl('fortress.working')}</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl(`fortress.building${player.Fortress.Upgrade.Building + 1}`)}</div>
                                <div class="detail-item text-center">${ formatDate(player.Fortress.Upgrade.Finish) }</div>
                            </div>
                        ` : '' }
                        ${ player.Own ? `
                            <br/>
                            <div class="detail-entry" style="border-bottom: white solid 1px;">
                                <div class="detail-item">${this.intl('extras.title')}</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('extras.registered')}</div>
                                <div class="detail-item text-center">${ formatDate(player.Registered) }</div>
                            </div>
                            <div class="detail-entry">
                                <div class="detail-item">${this.intl('extras.webshopid')}</div>
                                <div class="detail-item text-center">${ player.WebshopID || '' }</div>
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
        this.table = new TableController(this.$table, ScriptType.History);

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

            var range = document.createRange();
            range.selectNode(this.$table.get(0));

            window.getSelection().removeAllRanges();

            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.forceInject();

            downloadScreenshot(this.$table, `${ this.player.Name }_${ Date.now() }.png`);
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.Settings, this.identifier, () => UI.returnTo(UI.PlayerHistory))
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

        const exportFromDropdown = (timestampRange = undefined, dialog = false) => {
            const exportPromise = DatabaseManager.export([ this.identifier ], timestampRange);
            if (dialog) {
                exportPromise.then((data) => DialogController.open(ExportSharedFileDialog, data))
            } else {
                exportPromise.then((data) => Exporter.json(data, `${this.identifier}_${Date.now()}`));
            }
        }

        this.$parent.find('[data-op="export"]').click(() => exportFromDropdown());
        this.$parent.find('[data-op="export-l"]').click(() => exportFromDropdown([ this.list[0][0] ]));
        this.$parent.find('[data-op="export-l5"]').click(() => exportFromDropdown(this.list.slice(0, 5).map(entry => entry[0])));

        this.$parent.find('[data-op="share"]').click(() => exportFromDropdown(undefined, true));

        this.$name = this.$parent.find('[data-op="name"]');
        this.$identifier = this.$parent.find('[data-op="identifier"]');
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

                    settings = ScriptManager.getContent(this.identifier, 'me', DefaultScripts.getContent('players'));
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = TemplateManager.getContent(value);
                }

                this.table.setSettings(settings);
                this.table.refresh();

                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: `<b>${intl('stats.templates.quick_swap')}</b>`,
                    type: 'header'
                },
                ... TemplateManager.sortedList().map(({ name }) => {
                    return {
                        value: name,
                        name
                    };
                })
            ]
        });
    }

    show (identifier) {
        this.refreshTemplateDropdown();
        this.identifier = identifier;

        const { List: list, Latest: player } = DatabaseManager.getPlayer(identifier);
        this.list = list;
        this.player = player;

        this.$name.html(this.player.Name);
        this.$identifier.html(this.identifier);

        this.load();
    }

    load () {
        this.templateOverride = '';
        this.$configure.find('.item').removeClass('active');

        // Table instance
        this.table.setSettings(ScriptManager.getContent(this.identifier, 'me', DefaultScripts.getContent('players')));

        this.list.forEach(([ a, b ]) => DatabaseManager._loadPlayer(b));

        this.refresh();
    }

    refresh () {
        // Configuration indicator
        this.$configure.settingsButton(ScriptManager.exists(this.identifier));

        // Table stuff
        this.table.setEntries(this.list);
        this.table.refresh();
    }

    reload () {
        this.refreshTemplateDropdown();
        this.load();
    }
}

// Browse View
class BrowseView extends View {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        // Tables
        this.tableBase = new TableController(this.$table, ScriptType.Players);
        this.tableQ = new TableController(this.$table, ScriptType.Players);

        // Keep track of what table is displayed and swap if necessary later
        this.table = this.tableBase;
        this.tableQEnabled = false;

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

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
            this.table.forceInject();

            downloadScreenshot(this.$table, `players.${ this.timestamp }.png`);
        });

        // Context menu
        this.$context = $('<div class="ui custom inverted popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        var sel = this.$parent.find('[data-id].css-op-select');
                        if (sel.length) {
                            for (var el of sel) {
                                DatabaseManager.hideIdentifier($(el).attr('data-id'));
                            }
                        } else {
                            DatabaseManager.hideIdentifier(source.attr('data-id'));
                        }

                        this.$filter.trigger('change');
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        let sel = this.$parent.find('[data-id].css-op-select');
                        let cnt = null;

                        if (sel.length) {
                            cnt = sel.toArray().map(x => DatabaseManager.getPlayer($(x).attr('data-id'), $(x).attr('data-ts')).toSimulatorModel());
                        } else {
                            cnt = DatabaseManager.getPlayer(source.attr('data-id'), source.attr('data-ts')).toSimulatorModel();
                        }

                        copyText(JSON.stringify(cnt));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (source) => {
                        copyText(JSON.stringify(DatabaseManager.getPlayer(source.attr('data-id'), source.attr('data-ts')).toSimulatorShadowModel()));
                    }
                },
                {
                    label: intl('stats.fast_export.label'),
                    action: (source) => {
                        let ids = this.$parent.find('[data-id].css-op-select').toArray().map(el => $(el).attr('data-id'));
                        ids.push(source.attr('data-id'));

                        DatabaseManager.export(_uniq(ids)).then(data => DialogController.open(ExportSharedFileDialog, data));
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        let elements = this.$parent.find('[data-id].css-op-select').toArray();
                        let identifiers = elements.length ? elements.map(el => el.dataset.id) : [source.data('id')];

                        DatabaseManager.safeRemove({ identifiers }, () => this.$filter.trigger('change'));
                    }
                }
            ]
        });

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            var array = this.table.getInternalEntries();
            var slice = this.table.getArray().perf || this.table.getEntryLimit();
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
                UI.show(UI.Settings, 'players', () => UI.returnTo(UI.Browse))
            }
        });

        // Hidden toggle
        this.hidden = SiteOptions.browse_hidden;

        this.$parent.find('[data-op="show-hidden"]').toggleButton(state => {
            SiteOptions.browse_hidden = (this.hidden = state);

            this.recalculate = true;
            this.$filter.trigger('change');
        }, SiteOptions.browse_hidden);

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _array_to_hash(
                ['c', 'p', 'g', 's', 'e', '#', 'l', 'f', 'r', 'h', 'o', 'sr', 'q', 'qc', 't'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change(async (event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b|^)(c|p|g|s|e|l|f|r|h|o|sr|q|qc|t|#):/);

            var terms = [
                {
                   test: function (arg, player, timestamp) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.toLowerCase().includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
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
                                if (player.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == '#') {
                    terms.push({
                        test: (arg, player) => {
                            return player.Data.tag && arg.some(rarg => player.Data.tag == rarg);
                        },
                        arg: arg.split('|').map(rarg => rarg.trim())
                    })
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
                            test: (arg, player, timestamp, compare) => new ExpressionScope().with(player, compare).eval(arg),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = new Expression(arg);
                    if (ast.isValid()) {
                        this.autosort = (player, compare) => new ExpressionScope().with(player, compare).eval(ast);
                    }
                } else if (key == 'f') {
                    perf = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                } else if (key == 'r') {
                    this.recalculate = true;
                } else if (key == 'h') {
                    this.shidden = true;
                } else if (key == 'o') {
                    terms.push({
                        test: (arg, player, timestamp) => DatabaseManager.getPlayer(player.Identifier).Own
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
                } else if (key == 't' && typeof(arg) == 'string' && arg.length) {
                    let script = await this.tryGetSettings(arg.trim());
                    if (script) {
                        this.tableQEnabled = true;
                        this.recalculate = true;

                        // Clear original sort
                        this.table.clearSorting();

                        this.table = this.tableQ;
                        this.table.setSettings(script);
                    }
                }
            }

            if (!this.tableQEnabled) {
                this.table = this.tableBase;
            }

            var entries = new PlayersTableArray(perf, this.timestamp, this.reference);

            for (var player of Object.values(DatabaseManager.Players)) {
                var hidden = DatabaseManager.Hidden.has(player.Latest.Identifier);
                if (this.hidden || !hidden || this.shidden) {
                    var currentPlayer = player.List.find(entry => entry[0] <= this.timestamp);
                    if (currentPlayer) {
                        var xx = player.List.concat();
                        xx.reverse();
                        var ts = xx.find(p => p[0] >= this.reference && p[0] <= currentPlayer[0]);

                        var matches = true;
                        for (var term of terms) {
                            matches &= term.test(term.arg, DatabaseManager._loadPlayer(currentPlayer[1]), this.timestamp, (ts || currentPlayer)[1]);
                        }

                        if (matches) {
                            let pp = currentPlayer[1];
                            let cp = (ts || currentPlayer)[1];

                            entries.add(DatabaseManager._loadPlayer(pp), DatabaseManager._loadPlayer(cp), currentPlayer[1].Timestamp == this.timestamp, hidden);
                        }
                    }
                }
            }

            this.table.setEntries(entries, !this.recalculate, this.autosort);

            this.refresh();

            this.recalculate = false;
        });
    }

    async tryGetSettings (code) {
        if (typeof this.settingsRepo == 'undefined') {
            this.settingsRepo = {};
        }

        if (!(code in this.settingsRepo)) {
            this.settingsRepo[code] = (await SiteAPI.get('script_get', { key: code.trim() })).script.content;
        }

        return this.settingsRepo[code];
    }

    show () {
        this.tableBase.resetInjector();
        this.tableQ.resetInjector();

        this.refreshTemplateDropdown();

        // Timestamp selector
        var timestamps = [];
        var references = [];

        for (const timestamp of DatabaseManager.PlayerTimestamps) {
            timestamps.push({
                name: formatDate(timestamp),
                value: timestamp,
                selected: timestamp == DatabaseManager.LatestPlayer
            });

            references.push({
                name: formatDate(timestamp),
                value: timestamp,
                selected: timestamp == DatabaseManager.LatestPlayer
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

        this.timestamp = DatabaseManager.LatestPlayer;
        this.reference = DatabaseManager.LatestPlayer;

        this.load();
    }

    load () {
        // Configuration indicator
        this.$configure.find('.item').removeClass('active');
        this.$configure.settingsButton(ScriptManager.exists('players'));

        this.table.setSettings(ScriptManager.getContent('players', 'players', DefaultScripts.getContent('browse')));

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

                    settings = ScriptManager.getContent('players', 'players', DefaultScripts.getContent('browse'));
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = TemplateManager.getContent(value);
                }

                this.table.setSettings(settings);

                this.recalculate = true;
                this.$filter.trigger('change');
                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: `<b>${intl(`stats.templates.quick_swap`)}</b>`,
                    type: 'header'
                },
                ... TemplateManager.sortedList().map(({ name }) => {
                    return {
                        value: name,
                        name
                    };
                })
            ]
        });
    }

    refresh () {
        this.table.refresh(undefined, (block) => {
            let blockClickable = block.find('[data-id]').click((event) => {
                if (event.ctrlKey) {
                    $(event.currentTarget).toggleClass('css-op-select');
                } else {
                    UI.PlayerDetail.show(event.currentTarget.dataset.id, this.timestamp, this.reference);
                }
            }).mousedown((event) => {
                event.preventDefault();
            });

            this.$context.context('bind', blockClickable);
        });
    }

    reload () {
        this.refreshTemplateDropdown();
        this.load();
    }
}

// Groups View
class GroupsView extends View {
    _prepareOption (operator, key, storeKey) {
        this.$parent.operator(operator).toggleButton((state) => {
            SiteOptions[storeKey] = (this[key] = state);
            this.show();
        }, SiteOptions[storeKey]);

        return SiteOptions[storeKey];
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        // Toggles
        this.hidden = this._prepareOption('show-hidden', 'hidden', 'groups_hidden');
        this.others = this._prepareOption('show-other', 'others', 'groups_other');
        this.empty = this._prepareOption('show-empty', 'empty', 'groups_empty');

        // Observer
        this.loader = new DynamicLoader(this.$list.get(0));

        this.$context = $('<div class="ui custom inverted popup right center"></div>');
        this.$parent.prepend(this.$context);

        this.$context.context('create', {
            items: [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        DatabaseManager.hideIdentifier(source.attr('data-id'));
                        this.show();
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        let group = DatabaseManager.getGroup(source.attr('data-id')).Latest;
                        copyText(JSON.stringify(group.Members.map(id => {
                            if (DatabaseManager.hasPlayer(id, group.Timestamp)) {
                                return DatabaseManager.getPlayer(id, group.Timestamp).toSimulatorModel();
                            } else {
                                return null;
                            }
                        }).filter(x => x)));
                    }
                },
                {
                    label: intl('stats.fast_export.label'),
                    action: (source) => {
                        const group = source.attr('data-id');
                        const members = DatabaseManager.Groups[group].List.reduce((memo, [, g]) => memo.concat(g.Members), []);
                        DatabaseManager.export([ group, ... Array.from(new Set(members)) ]).then(data => DialogController.open(ExportSharedFileDialog, data));
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        DatabaseManager.safeRemove({ identifiers: [ source.data('id') ] }, () => this.show());
                    }
                }
            ]
        });

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _array_to_hash(
                ['g', 's', 'l', 'h', 'a', 'd'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change((event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b)(g|s|l|a|h|d):/);

            var terms = [
                {
                   test: function (arg, group) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (group.Name.toLowerCase().includes(subterm) || group.Prefix.toLowerCase().includes(subterm)) {
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

            this.hidden_override = false;
            this.others_override = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'g') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, group) => group.Timestamp == DatabaseManager.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'a') {
                    this.hidden_override = true;
                    this.others_override = true;
                } else if (key == 'h') {
                    this.hidden_override = true;
                } else if (key == 'd') {
                    this.others_override = true;
                }
            }

            this.entries = [];

            for (const group of Object.values(DatabaseManager.Groups)) {
                let matches = true;
                for (const term of terms) {
                    matches &= term.test(term.arg, group.Latest);
                }

                if (matches) {
                    this.entries.push(group);
                }
            }

            if (this.empty) {
                this.entries.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);
            } else {
                this.entries.sort((a, b) => b.LatestDisplayTimestamp - a.LatestDisplayTimestamp);
            }

            this.refresh();
        });
    }

    show () {
        const viewableGroups = Object.entries(DatabaseManager.Groups);
        if (viewableGroups.length == 1 && (SiteOptions.groups_empty || viewableGroups[0][1].List.filter(([, g]) => g.MembersPresent).length > 0)) {
            UI.show(UI.GroupDetail, viewableGroups[0][0]);
        } else {
            this.load();
        }
    }

    refresh () {
        this.$list.empty();

        const latestPlayerTimestamp = this.empty ? DatabaseManager.Latest : DatabaseManager.LatestPlayer;
        const filteredEntries = this.entries.filter(group => {
            const visible = !DatabaseManager.Hidden.has(group.Latest.Identifier);
            const own = group.Own;

            return (visible || this.hidden || this.hidden_override) && (own || this.others || this.others_override) && (this.empty || group.LatestDisplayTimestamp);
        });

        const rows = [];
        for (let i = 0; i < filteredEntries.length; i += 5) {
            rows.push(`
                <div class="row">
                    ${
                        filteredEntries.slice(i, i + 5).map((group) => `
                            <div class="column">
                                <div class="ui basic ${latestPlayerTimestamp != (this.empty ? group.LatestTimestamp : group.LatestDisplayTimestamp) ? 'red' : 'grey'} inverted segment cursor-pointer !p-0 !border-radius-1 flex flex-col items-center ${ DatabaseManager.Hidden.has(group.Latest.Identifier) ? 'opacity-50' : '' }" data-id="${ group.Latest.Identifier }">
                                    <span class="text-85% my-2">${ formatDate(this.empty ? group.LatestTimestamp : group.LatestDisplayTimestamp) }</span>
                                    <img class="ui image" src="res/group.png" width="173" height="173">
                                    <h3 class="ui grey header !m-0 !mt-2">${ group.Latest.Prefix }</h3>
                                    <h3 class="ui inverted header !mt-0 !mb-1">${ group.Latest.Name }</h3>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            `);
        }

        this.loader.start(() => {
            const $fields = $(rows.splice(0, 4).join('')).appendTo(this.$list).find('[data-id]');
            $fields.click(function () {
                UI.show(UI.GroupDetail, $(this).data('id'));
            })

            this.$context.context('bind', $fields);

            if (rows.length == 0) {
                this.loader.stop();
            }
        });
    }

    load () {
        this.$filter.trigger('change');
    }
}

// Players View
class PlayersView extends View {
    _prepareOption (operator, key, storeKey) {
        this.$parent.operator(operator).toggleButton((state) => {
            SiteOptions[storeKey] = (this[key] = state);
            this.show();
        }, SiteOptions[storeKey]);

        return SiteOptions[storeKey];
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        // Toggles
        this.hidden = this._prepareOption('show-hidden', 'hidden', 'players_hidden');
        this.others = this._prepareOption('show-other', 'others', 'players_other');
        
        // Observer
        this.loader = new DynamicLoader(this.$list.get(0));

        // Context menu
        this.$context = $('<div class="ui custom inverted popup right center"></div>').prependTo(this.$parent);
        this.$context.context('create', {
            items: [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        DatabaseManager.hideIdentifier(source.attr('data-id'));
                        this.show();
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        copyText(JSON.stringify(DatabaseManager.getPlayer(source.attr('data-id')).Latest.toSimulatorModel()));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (source) => {
                        copyText(JSON.stringify(DatabaseManager.getPlayer(source.attr('data-id')).Latest.toSimulatorShadowModel()));
                    }
                },
                {
                    label: intl('stats.fast_export.label'),
                    action: (source) => {
                        DatabaseManager.export([ source.attr('data-id') ]).then(data => DialogController.open(ExportSharedFileDialog, data));
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        DatabaseManager.safeRemove({ identifiers: [ source.data('id') ] }, () => this.show());
                    }
                }
            ]
        });

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _array_to_hash(
                ['c', 'p', 'g', 's', 'e', 'l', 'a', 'h', 'd'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change((event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b)(c|p|g|s|e|l|a|h|d):/);

            var terms = [
                {
                   test: function (arg, player) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.toLowerCase().includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
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

            this.hidden_override = false;
            this.others_override = false;

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
                                if (player.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player) => player.Timestamp == DatabaseManager.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'e') {
                    var ast = new Expression(arg);
                    if (ast.isValid()) {
                        terms.push({
                            test: (arg, player) => new ExpressionScope().with(player, player).addSelf(player).eval(arg),
                            arg: ast
                        });
                    }
                } else if (key == 'a') {
                    this.hidden_override = true;
                    this.others_override = true;
                } else if (key == 'h') {
                    this.hidden_override = true;
                } else if (key == 'd') {
                    this.others_override = true;
                }
            }

            this.entries = [];

            for (var player of Object.values(DatabaseManager.Players)) {
                var hidden = DatabaseManager.Hidden.has(player.Latest.Identifier);
                if (this.hidden || !hidden || this.hidden_override) {
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
        let identitifiers = Object.keys(DatabaseManager.Players);
        if (identitifiers.length == 1) {
            UI.show(UI.PlayerHistory, identitifiers[0]);
        } else {
            this.load();
        }
    }

    refresh () {
        this.$list.empty();

        const filteredEntries = this.entries.filter(player => {
            const visible = !DatabaseManager.Hidden.has(player.Latest.Identifier);
            const own = player.Own;
            
            return (visible || this.hidden || this.hidden_override) && (own || this.others || this.others_override);
        })
        
        const rows = [];
        for (let i = 0; i < filteredEntries.length; i += 5) {
            rows.push(`
                <div class="row">
                    ${
                        filteredEntries.slice(i, i + 5).map((player) => `
                            <div class="column">
                                <div class="ui basic inverted ${DatabaseManager.Latest != player.LatestTimestamp ? 'red' : 'grey'} segment cursor-pointer !p-0 !border-radius-1 flex flex-col items-center ${ DatabaseManager.Hidden.has(player.Latest.Identifier) ? 'opacity-50' : '' }" data-id="${ player.Latest.Identifier }">
                                    <span class="text-85% my-2">${ formatDate(player.LatestTimestamp) }</span>
                                    <img class="ui image" src="res/class${ player.Latest.Class }.png" width="173" height="173">
                                    <h3 class="ui grey header !m-0 !mt-2">${ player.Latest.Prefix }</h3>
                                    <h3 class="ui inverted header !mt-0 !mb-1">${ player.Latest.Name }</h3>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            `);
        }

        this.loader.start(() => {
            let $fields = $(rows.splice(0, 4).join('')).appendTo(this.$list).find('[data-id]');
            $fields.click(function () {
                UI.show(UI.PlayerHistory, $(this).data('id'));
            })

            this.$context.context('bind', $fields);

            if (rows.length == 0) {
                this.loader.stop();
            }
        });
    }

    load () {
        this.$filter.trigger('change');
    }
}

// Files View
class FilesView extends View {
    // Export all to json file
    exportAllJson () {
        DatabaseManager.export().then(Exporter.json);
    }

    // Export all to cloud
    exportAllCloud () {
        DatabaseManager.export().then(data => DialogController.open(ExportSharedFileDialog, data));
    }

    // Export selected to json file
    exportSelectedJson () {
        if (this.simple) {
            DatabaseManager.export(undefined, this.selectedFiles).then(Exporter.json);
        } else {
            const players = [];
            const groups = [];
            for (const entry of Object.values(this.selectedEntries)) {
                if (DatabaseManager._isPlayer(entry.identifier)) {
                    players.push(entry);
                } else {
                    groups.push(entry);
                }
            }

            Exporter.json({
                players,
                groups: DatabaseManager.getGroupsFor(players, groups, SiteOptions.export_bundle_groups)
            });
        }
    }

    // Export selected to cloud
    exportSelectedCloud () {
        if (this.simple) {
            DatabaseManager.export(undefined, this.selectedFiles).then((file) => {
                DialogController.open(ExportSharedFileDialog, file);
            });
        } else {
            const players = [];
            const groups = [];
            for (const entry of Object.values(this.selectedEntries)) {
                if (DatabaseManager._isPlayer(entry.identifier)) {
                    players.push(entry);
                } else {
                    groups.push(entry);
                }
            }

            DialogController.open(
                ExportSharedFileDialog,
                {
                    players,
                    groups: DatabaseManager.getGroupsFor(players, groups, SiteOptions.export_bundle_groups)
                }
            );
        }
    }

    tagSelected () {
        if (this.simple && _not_empty(this.selectedFiles)) {
            DialogController.open(EditFileTagDialog, this.selectedFiles, () => this.show());
        }
    }

    // Delete all
    deleteAll () {
        DialogController.open(ConfirmDialog, intl('dialog.delete_all.title'), intl('dialog.delete_all.notice'), () => {
            Loader.toggle(true);
            DatabaseManager.purge().then(() => this.show());
        }, () => {}, true, 2)
    }

    // Delete selected
    deleteSelected () {
        if (this.simple) {
            if (this.selectedFiles.length > 0) {
                DatabaseManager.safeRemove({ timestamps: this.selectedFiles }, () => this.show());
            }
        } else if (Object.keys(this.selectedEntries).length > 0) {
            DatabaseManager.safeRemove({ instances: Object.values(this.selectedEntries) }, () => this.show());
        }
    }

    // Merge selected
    mergeSelected () {
        if (this.simple) {
            if (this.selectedFiles.length > 1) {
                Loader.toggle(true);
                DatabaseManager.merge(this.selectedFiles).then(() => this.show());
            }
        } else {
            const timestamps = _uniq(Object.values(this.selectedEntries).map(entry => entry.timestamp));
            if (timestamps.length > 1) {
                Loader.toggle(true);
                DatabaseManager.merge(timestamps).then(() => this.show());
            }
        }
    }

    // Hide selected
    hideSelected () {
        Loader.toggle(true);
        if (this.simple) {
            DatabaseManager.hideTimestamps(... this.selectedFiles).then(() => this.show());
        } else {
            DatabaseManager.hide(Object.values(this.selectedEntries)).then(() => this.show());
        }
    }

    hideMigrate () {
        Loader.toggle(true);
        DatabaseManager.migrateHiddenFiles().then(() => this.show());
    }

    // Import file via har
    importJson (fileEvent) {
        Loader.toggle(true);

        let pendingPromises = [];
        Array.from(fileEvent.currentTarget.files).forEach(file => {
            pendingPromises.push(file.text().then(fileContent => {
                return DatabaseManager.import(fileContent, file.lastModified).catch((e) => {
                    Toast.error(intl('database.import_error'), e.message);
                    Logger.error(e, 'Error occured while trying to import a file!');
                })
            }))
        });

        Promise.all(pendingPromises).then(() => this.show());
    }

    // Import file via endpoint
    importEndpoint () {
        DialogController.open(EndpointDialog, false).then((actionSuccess) => {
            if (actionSuccess) {
                this.show();
            }
        });
    }

    // Import file via cloud
    importCloud () {
        DialogController.open(ImportSharedFileDialog, () => this.show());
    }

    // Prepare checkbox
    prepareCheckbox (property, name) {
        this.$parent.find(`[data-op="checkbox-${ name }"]`).checkbox({
            onChecked: () => { SiteOptions[property] = true },
            onUnchecked: () => { SiteOptions[property] = false }
        }).checkbox(SiteOptions[property] ? 'set checked' : 'set unchecked');
    }

    constructor (parent) {
        super(parent);

        this.$fileCounter = this.$parent.find('[data-op="selected-counter"]');

        this.$parent.find('[data-op="export"]').click(() => this.exportAllJson());
        this.$parent.find('[data-op="export-partial"]').click(() => this.exportSelectedJson());
        this.$parent.find('[data-op="cloud-export"]').click(() => this.exportAllCloud());
        this.$parent.find('[data-op="cloud-export-partial"]').click(() => this.exportSelectedCloud());
        this.$parent.find('[data-op="delete-all"]').click(() => this.deleteAll());
        this.$parent.find('[data-op="delete"]').click(() => this.deleteSelected());
        this.$parent.find('[data-op="merge"]').click(() => this.mergeSelected());
        this.$parent.find('[data-op="hide"]').click(() => this.hideSelected());
        this.$parent.find('[data-op="upload"]').change(event => this.importJson(event));
        this.$parent.find('[data-op="endpoint"]').click(() => this.importEndpoint());
        this.$parent.find('[data-op="shared"]').click(() => this.importCloud());

        this.$migrateHidden = this.$parent.find('[data-op="hide-migrate"]').click(() => this.hideMigrate());
        this.$tags = this.$parent.find('[data-op="tags"]').click(() => this.tagSelected());
        this.$filters = this.$parent.find('[data-op="filters"]');

        this.$resultsAdvanced = this.$parent.find('[data-op="files-search-results"]');
        this.$resultsSimple = this.$parent.find('[data-op="files-search-results-simple"]');

        this.$parent.find('[data-op="mark-all"]').click(() => this.markAll());

        this.$advancedCenter = this.$parent.find('[data-op="advanced-center"]');
        this.$simpleCenter = this.$parent.find('[data-op="simple-center"]');

        this.simpleLoader = new DynamicLoader(this.$simpleCenter.find('table').get(0));
        this.advancedLoader = new DynamicLoader(this.$advancedCenter.find('table').get(0));

        this.prepareCheckbox('advanced', 'advanced');
        SiteOptions.onChange('advanced', enabled => this.setLayout(enabled));

        this.prepareCheckbox('hidden', 'hidden');
        SiteOptions.onChange('hidden', async () => {
            await DatabaseManager.reloadHidden();
            this.show(true);
        });

        this.prepareCheckbox('export_public_only', 'export-public-only');
        this.prepareCheckbox('export_bundle_groups', 'export-bundle-groups');

        this.$tagFilter = this.$parent.find('[data-op="simple-tags"]');
        this.tagFilter = undefined;
        this.setLayout(SiteOptions.advanced, true);
    }

    setLayout (advanced, supressUpdate = false) {
        window.scrollTo({ top: 0 });

        this.$advancedCenter.toggle(advanced);
        this.$simpleCenter.toggle(!advanced);
        this.simple = !advanced;
        if (!supressUpdate) this.show(true);
    }

    markAll () {
        if (this.simple) {
            let filesToMark = [];
            let filesToIgnore = [];

            for (const timestamp of _int_keys(this.currentFiles)) {
                if (this.selectedFiles.includes(timestamp)) {
                    filesToIgnore.push(timestamp);
                } else {
                    filesToMark.push(timestamp);
                }
            }

            let visibleEntries = _array_to_hash(this.$resultsSimple.find('td[data-timestamp]').toArray(), (el) => [el.dataset.timestamp, el.children[0]]);

            let noneToMark = _empty(filesToMark);
            if (noneToMark && !_empty(filesToIgnore)) {
                for (let timestamp of filesToIgnore) {
                    _remove(this.selectedFiles, timestamp);
                    if (visibleEntries[timestamp]) {
                        visibleEntries[timestamp].classList.add('outline');
                    }
                }
            } else if (!noneToMark) {
                for (let timestamp of filesToMark) {
                    this.selectedFiles.push(timestamp);
                    if (visibleEntries[timestamp]) {
                        visibleEntries[timestamp].classList.remove('outline');
                    }
                }
            }
        } else {
            let entriesToMark = [];
            let entriesToIgnore = [];

            for (let uuid of Object.keys(this.currentEntries)) {
                if (uuid in this.selectedEntries) {
                    entriesToIgnore.push(uuid);
                } else {
                    entriesToMark.push(uuid);
                }
            }

            let visibleEntries = _array_to_hash(this.$resultsAdvanced.find('td[data-mark]').toArray(), (el) => [el.dataset.mark, el.children[0]]);

            let noneToMark = _empty(entriesToMark);
            if (noneToMark && !_empty(entriesToIgnore)) {
                for (let uuid of entriesToIgnore) {
                    delete this.selectedEntries[uuid];
                    if (visibleEntries[uuid]) {
                        visibleEntries[uuid].classList.add('outline');
                    }
                }
            } else if (!noneToMark) {
                for (let uuid of entriesToMark) {
                    this.selectedEntries[uuid] = this.currentEntries[uuid];
                    if (visibleEntries[uuid]) {
                        visibleEntries[uuid].classList.remove('outline');
                    }
                }
            }
        }

        this.updateSelectedCounter();
    }

    updateSelectedCounter () {
        if (this.simple) {
            this.$fileCounter.html(_empty(this.selectedFiles) ? intl('stats.files.selected.no') : Object.keys(this.selectedFiles).length);
        } else {
            this.$fileCounter.html(_empty(this.selectedEntries) ? intl('stats.files.selected.no') : Object.keys(this.selectedEntries).length);
        }
    }

    updateEntrySearchResults () {
        this.updateSelectedCounter();

        const prefixes = this.$filter_prefix.dropdown('get value');
        const group_identifiers = this.$filter_group.dropdown('get value').map(value => value !== '0' ? value : undefined);
        const player_identifiers = this.$filter_player.dropdown('get value');
        const timestamps = this.$filter_timestamp.dropdown('get value').map(value => parseInt(value));
        const ownership = parseInt(this.$filter_ownership.dropdown('get value'));
        const hidden = this.$filter_hidden.dropdown('get value');
        const hidden_allowed = SiteOptions.hidden;
        const tags = this.$filter_tags.dropdown('get value');
        const type = parseInt(this.$filter_type.dropdown('get value'));

        const { players, groups } = DatabaseManager._getFile(null, null, (data) => {
            const isPlayer = DatabaseManager._isPlayer(data.identifier);

            const conditions = [
                // Prefix
                prefixes.length === 0 || prefixes.includes(data.prefix),
                // Player identifier
                player_identifiers.length === 0 || (isPlayer && player_identifiers.includes(data.identifier)),
                // Group identifiers
                group_identifiers.length === 0 || group_identifiers.includes(isPlayer ? data.group : data.identifier),
                // Timestamps
                timestamps.length === 0 || timestamps.includes(data.timestamp),
                // Tags
                tags.length === 0 || tags.includes(`${data.tag}`),
                // Ownership
                !ownership || data.own != ownership - 1,
                // Type
                !type || isPlayer != type - 1,
                // Hidden
                !hidden_allowed || hidden.length === 0 || (data.hidden && hidden.includes('yes')) || (!data.hidden && hidden.includes('no'))
            ];

            return conditions.reduce((acc, condition) => acc && condition, true);
        })

        const entries = players.concat(groups);

        // Save into current list
        this.currentEntries = entries.reduce((memo, entry) => {
            memo[_uuid(entry)] = entry;
            return memo;
        }, {});

        const displayEntries = entries.sort((a, b) => b.timestamp - a.timestamp).map((entry) => {
            const isPlayer = DatabaseManager._isPlayer(entry.identifier);

            return `
                <tr data-tr-mark="${_uuid(entry)}" ${entry.hidden ? 'style="color: gray;"' : ''}>
                    <td class="cursor-pointer !text-center" data-mark="${_uuid(entry)}"><i class="circle outline icon"></i></td>
                    <td class="!text-center">${ this.timeMap[entry.timestamp] }</td>
                    <td class="!text-center">${ this.prefixMap[entry.prefix] }</td>
                    <td class="!text-center"><i class="ui ${isPlayer ? 'blue user' : 'orange users'} icon"></i></td>
                    <td>${ entry.name }</td>
                    <td>${ isPlayer ? (this.groupMap[entry.group] || '') : '' }</td>
                    <td>${ entry.tag ? `<div class="ui horizontal label" style="background-color: ${_strToHSL(entry.tag)}; color: white;">${entry.tag}</div>` : '' }</td>
                </tr>
            `
        });

        this.$resultsAdvanced.empty();

        this.advancedLoader.start(() => {
            $(displayEntries.splice(0, 25).join('')).appendTo(this.$resultsAdvanced).find('[data-mark]').click((event) => {
                let uuid = event.currentTarget.dataset.mark;

                if (event.shiftKey && this.lastSelectedEntry && this.lastSelectedEntry != uuid) {
                    // Elements
                    const $startSelector = $(`tr[data-tr-mark="${this.lastSelectedEntry}"]`);
                    const $endSelector = $(`tr[data-tr-mark="${uuid}"]`);
                    // Element indexes
                    const startSelectorIndex = $startSelector.index();
                    const endSelectorIndex = $endSelector.index();
                    const selectDown = startSelectorIndex < endSelectorIndex;
                    const elementArray = selectDown ? $startSelector.nextUntil($endSelector) : $endSelector.nextUntil($startSelector);
                    // Get list of timestamps to be changed
                    const toChange = [ uuid, this.lastSelectedEntry ];
                    for (const obj of elementArray.toArray()) {
                        toChange.push(obj.dataset.trMark);
                    }

                    // Change all timestamps
                    if (uuid in this.selectedEntries) {
                        for (const mark of toChange) {
                            $(`[data-mark="${mark}"] > i`).addClass('outline');
                            delete this.selectedEntries[mark];
                        }
                    } else {
                        for (const mark of toChange) {
                            $(`[data-mark="${mark}"] > i`).removeClass('outline');
                            this.selectedEntries[mark] = this.currentEntries[mark];
                        }
                    }
                } else {
                    if ($(`[data-mark="${uuid}"] > i`).toggleClass('outline').hasClass('outline')) {
                        delete this.selectedEntries[uuid];
                    } else {
                        this.selectedEntries[uuid] = this.currentEntries[uuid];
                    }
                }

                this.lastSelectedEntry = uuid;
                this.updateSelectedCounter();
            }).each((index, element) => {
                if (this.selectedEntries[element.dataset.mark]) {
                    element.children[0].classList.remove('outline');
                }
            });

            if (displayEntries.length == 0) {
                this.advancedLoader.stop();
            }
        });
    }

    updateFileSearchResults () {
        let currentFilesAll = (SiteOptions.groups_empty ? _int_keys(DatabaseManager.Timestamps) : DatabaseManager.PlayerTimestamps).map((ts) => {
            return {
                timestamp: ts,
                prettyDate: formatDate(ts),
                playerCount: _len_where(DatabaseManager.Timestamps[ts], id => DatabaseManager._isPlayer(id)),
                groupCount: _len_where(DatabaseManager.Timestamps[ts], id => !DatabaseManager._isPlayer(id)),
                version: DatabaseManager.findDataFieldFor(ts, 'version'),
                tags: (() => {
                    const tagMap = DatabaseManager.findUsedTags([ts]);
                    const tagEntries = _sort_des(Object.entries(tagMap), ([, a]) => a);

                    let tagContent = '';
                    for (const [name, count] of tagEntries) {
                        const countText = tagEntries.length > 1 ? ` (${count})` : '';

                        if (name === 'undefined') {
                            if (tagEntries.length > 1) {
                                tagContent += `
                                    <div class="ui grey horizontal label">${intl('stats.files.tags.none')}${countText}</div>
                                `;
                            }
                        } else {
                            tagContent += `
                                <div class="ui horizontal label" style="background-color: ${_strToHSL(name)}; color: white;">${name}${countText}</div>
                            `;
                        }
                    }

                    return {
                        tagList: Object.keys(tagMap),
                        tagContent
                    };
                })()
            }
        }).filter(({ tags: { tagList } }) => {
            return typeof this.tagFilter === 'undefined' || tagList.includes(this.tagFilter) || (tagList.includes('undefined') && this.tagFilter === '');
        });

        if (_present(this.expressionFilter) && this.expressionFilter.isValid()) {
            currentFilesAll = currentFilesAll.filter(({ tags: { tagList }, timestamp, version }) => {
                return this.expressionFilter.eval(new ExpressionScope().addSelf(
                    Object.assign(
                        DatabaseManager._getFile(null, [ timestamp ]),
                        {
                            timestamp,
                            version,
                            tags: tagList
                        }
                    )
                ));
            });
        }

        this.currentFiles = _array_to_hash(currentFilesAll, file => [file.timestamp, file]);
        this.$resultsSimple.empty();

        const entries = _sort_des(Object.entries(this.currentFiles), v => v[0]).map(([timestamp, { prettyDate, playerCount, groupCount, version, tags: { tagContent } }]) => {
            const hidden = _dig(DatabaseManager.Metadata, timestamp, 'hidden');

            return `
                <tr data-tr-timestamp="${timestamp}" ${hidden ? 'style="color: gray;"' : ''}>
                    <td class="cursor-pointer !text-center" data-timestamp="${timestamp}"><i class="circle outline icon"></i></td>
                    <td class="!text-center">${ prettyDate }</td>
                    <td class="!text-center">${ playerCount }</td>
                    <td class="!text-center">${ groupCount }</td>
                    <td>${ tagContent }</td>
                    <td class="!text-center">${ version || 'Not known' }</td>
                    <td class="!text-center"></td>
                    <td class="cursor-pointer !text-center" data-edit="${timestamp}"><i class="wrench icon"></i></td>
                </tr>
            `;
        });

        this.simpleLoader.start(() => {
            let $entries = $(entries.splice(0, 25).join('')).appendTo(this.$resultsSimple);

            $entries.find('[data-timestamp]').click((event) => {
                const timestamp = parseInt(event.currentTarget.dataset.timestamp);

                if (event.shiftKey && this.lastSelectedTimestamp && this.lastSelectedTimestamp != timestamp) {
                    // Elements
                    const $startSelector = $(`tr[data-tr-timestamp="${this.lastSelectedTimestamp}"]`);
                    const $endSelector = $(`tr[data-tr-timestamp="${timestamp}"]`);
                    // Element indexes
                    const startSelectorIndex = $startSelector.index();
                    const endSelectorIndex = $endSelector.index();
                    const selectDown = startSelectorIndex < endSelectorIndex;
                    const elementArray = selectDown ? $startSelector.nextUntil($endSelector) : $endSelector.nextUntil($startSelector);
                    // Get list of timestamps to be changed
                    const toChange = [ timestamp, this.lastSelectedTimestamp ];
                    for (const obj of elementArray.toArray()) {
                        toChange.push(parseInt(obj.dataset.trTimestamp));
                    }

                    // Change all timestamps
                    if (_has(this.selectedFiles, timestamp)) {
                        for (const ts of toChange) {
                            $(`[data-timestamp="${ts}"] > i`).addClass('outline');
                            _remove(this.selectedFiles, ts);
                        }
                    } else {
                        for (const ts of toChange) {
                            $(`[data-timestamp="${ts}"] > i`).removeClass('outline');
                            _push_unless_includes(this.selectedFiles, ts);
                        }
                    }
                } else {
                    if ($(`[data-timestamp="${timestamp}"] > i`).toggleClass('outline').hasClass('outline')) {
                        _remove(this.selectedFiles, timestamp);
                    } else {
                        this.selectedFiles.push(timestamp);
                    }
                }

                this.lastSelectedTimestamp = timestamp;
                this.updateSelectedCounter();
            }).each((index, element) => {
                if (this.selectedFiles.includes(parseInt(element.dataset.timestamp))) {
                    element.children[0].classList.remove('outline');
                }
            });

            $entries.find('[data-edit]').click((event) => {
                const timestamp = parseInt(event.currentTarget.dataset.edit);
                DialogController.open(FileEditDialog, timestamp, () => this.show());
            });

            if (entries.length == 0) {
                this.simpleLoader.stop();
            }
        });
    }

    updateTagFilterButtons () {
        const selector = `[data-tag="${ typeof this.tagFilter === 'undefined' ? '*' : this.tagFilter }"]`;

        this.$tagFilter.find('[data-tag]').addClass('basic inverted').css('color', '').css('background-color', '');

        const $tag = this.$tagFilter.find(selector);
        if ($tag.length > 0) {
            $tag.removeClass('basic inverted');

            if ($tag.data('color')) {
                $tag.css('background-color', $tag.data('color')).css('color', 'white');
            }
        }
    }

    updateFileList () {
        // Tag filters
        let currentTags = Object.keys(DatabaseManager.findUsedTags(undefined));
        if (currentTags.length > 1 || (currentTags.length == 1 && currentTags[0] !== 'undefined')) {
            let content = `
                <div data-tag="*" class="ui basic inverted tiny button" style="margin-bottom: 0.5rem;">${intl('stats.files.tags.all')}</div>
                <div data-tag="" class="ui basic inverted tiny button" style="margin-bottom: 0.5rem;">${intl('stats.files.tags.none')}</div>
            `;

            for (const name of currentTags) {
                if (name !== 'undefined') {
                    content += `
                        <div data-tag="${name}" class="ui basic inverted tiny button" data-color="${_strToHSL(name)}" style="margin-bottom: 0.5rem">${name}</div>
                    `;
                }
            }

            this.$tagFilter.html(content);
            this.$tagFilter.show();

            if (this.tagFilter !== '' && this.tagFilter !== undefined && !currentTags.includes(this.tagFilter)) {
                this.tagFilter = undefined;
            }

            this.updateTagFilterButtons();

            this.$parent.find('[data-tag]').click((event) => {
                const tag = event.currentTarget.dataset.tag;
                const tagToFilter = tag === '*' ? undefined : tag;

                if (tagToFilter !== this.tagFilter) {
                    this.tagFilter = tagToFilter;

                    this.updateTagFilterButtons();
                    this.updateFileSearchResults();
                } else if (typeof tagToFilter !== 'undefined') {
                    this.$parent.find('[data-tag="*"]').click();
                }
            });
        } else {
            this.$tagFilter.hide();
            this.tagFilter = undefined;
        }

        // Expression filter
        this.$filters.html(`
            <div class="field">
                <label>${intl('stats.files.filters.expression')}</label>
                <div class="ta-wrapper">
                    <div class="ui inverted input">
                        <input class="ta-area" type="text" placeholder="${intl('stats.files.filters.expression_placeholder')}">
                    </div>
                    <div class="ta-content" style="width: 100%; margin-top: calc(-1em - 16px); margin-left: 1em;"></div>
                </div>
            </div>
        `);

        let $field = this.$filters.find('.ta-area');
        let $parent = $field.closest('.field');

        $field.on('input change', (event) => {
            let content = event.currentTarget.value;

            this.expressionFilter = new Expression(content);
            this.$filters.find('.ta-content').html(
                Highlighter.expression(content, undefined, ['timestamp', 'players', 'groups', 'version', 'tags']).text
            );

            if (this.expressionFilter.empty || this.expressionFilter.isValid()) {
                $parent.removeClass('error');
            } else {
                $parent.addClass('error');
            }

            if (event.type === 'change') {
                this.updateFileSearchResults();
            }
        }).val(this.expressionFilter ? this.expressionFilter.string : '').trigger('change');
    }

    updateEntryLists () {
        this.prefixMap = _array_to_hash(DatabaseManager.Prefixes, (prefix) => [prefix, _pretty_prefix(prefix)]);
        this.timeMap = _array_to_hash(DatabaseManager.Timestamps.keys(), (ts) => [ts, formatDate(ts)]);
        this.playerMap = DatabaseManager.PlayerNames;
        this.groupMap = Object.assign({ 0: intl('stats.files.filters.none') }, DatabaseManager.GroupNames);

        this.timeArray = Object.entries(this.timeMap).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
        this.tagsArray = Object.keys(DatabaseManager.findUsedTags()).filter(tag => tag !== 'undefined');

        const playerNameFrequency = {};
        for (const name of Object.values(this.playerMap)) {
            if (name in playerNameFrequency) {
                playerNameFrequency[name]++;
            } else {
                playerNameFrequency[name] = 1;
            }
        }

        const groupNameFrequency = {};
        for (const name of Object.values(this.groupMap)) {
            if (name in groupNameFrequency) {
                groupNameFrequency[name]++;
            } else {
                groupNameFrequency[name] = 1;
            }
        }

        this.$filters.html(`
            <div class="field">
                <label>${intl('stats.files.filters.type')}</label>
                <select class="ui fluid search selection inverted dropdown" data-op="files-search-type">
                    <option value="0">${intl('stats.files.filters.any')}</option>
                    <option value="1">${intl('stats.files.filters.player')}</option>
                    <option value="2">${intl('stats.files.filters.group')}</option>
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.timestamp')} (<span data-op="unique-timestamp"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-timestamp">
                    ${ this.timeArray.map(([timestamp, value]) => `<option value="${ timestamp }">${ value }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.player')} (<span data-op="unique-player"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-player">
                    ${ Object.entries(this.playerMap).map(([player, value]) => `<option value="${ player }">${ value }${ playerNameFrequency[value] > 1 ? ` - ${_pretty_prefix(player)}` : '' }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.group')} (<span data-op="unique-group"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-group">
                    ${ Object.entries(this.groupMap).map(([group, value]) => `<option value="${ group }">${ value }${ groupNameFrequency[value] > 1 ? ` - ${_pretty_prefix(group)}` : '' }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.prefix')} (<span data-op="unique-prefix"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-prefix">
                    ${ Object.entries(this.prefixMap).map(([prefix, value]) => `<option value="${ prefix }">${ value }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.tags')} (<span data-op="unique-tags"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-tags">
                    <option value="undefined">${intl('stats.files.tags.none')}</option>
                    ${ this.tagsArray.map((tag) => `<option value="${ tag }">${ tag }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.ownership')}</label>
                <select class="ui fluid search selection inverted dropdown" data-op="files-search-ownership">
                    <option value="0">${intl('stats.files.filters.ownership_all')}</option>
                    <option value="1">${intl('stats.files.filters.ownership_own')}</option>
                    <option value="2">${intl('stats.files.filters.ownership_other')}</option>
                </select>
            </div>
            <div class="field" ${ SiteOptions.hidden ? '' : 'style="display: none;"' }>
                <label>${intl('stats.files.filters.hidden')}</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-hidden">
                    <option value="yes">${intl('general.yes')}</option>
                    <option value="no">${intl('general.no')}</option>
                </select>
            </div>
        `);

        this.$filter_timestamp = this.$parent.find('[data-op="files-search-timestamp"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_player = this.$parent.find('[data-op="files-search-player"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_group = this.$parent.find('[data-op="files-search-group"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_prefix = this.$parent.find('[data-op="files-search-prefix"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_hidden = this.$parent.find('[data-op="files-search-hidden"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_tags = this.$parent.find('[data-op="files-search-tags"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_ownership = this.$parent.find('[data-op="files-search-ownership"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this)
        });

        this.$filter_type = this.$parent.find('[data-op="files-search-type"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this)
        });

        this.$parent.find('[data-op="unique-timestamp"]').html(Object.keys(this.timeMap).length);
        this.$parent.find('[data-op="unique-player"]').html(Object.keys(this.playerMap).length);
        this.$parent.find('[data-op="unique-group"]').html(Object.keys(this.groupMap).length - 1);
        this.$parent.find('[data-op="unique-prefix"]').html(Object.keys(this.prefixMap).length);
        this.$parent.find('[data-op="unique-tags"]').html(this.tagsArray.length);

        this.updateEntrySearchResults();
    }

    show (forceUpdate = false) {
        this.selectedEntries = {};
        this.selectedFiles = [];

        this.lastSelectedTimestamp = null;
        this.lastSelectedEntry = null;

        Loader.toggle(false);

        this.$tags.toggle(this.simple);
        this.$migrateHidden.toggle(!this.simple && SiteOptions.hidden);

        // Set counters
        if (this.lastChange != DatabaseManager.LastChange || forceUpdate) {
            this.lastChange = DatabaseManager.LastChange;
            if (this.simple) {
                this.updateFileList();
            } else {
                this.updateEntryLists();
            }
            this.updateSelectedCounter();
        } else {
            this.$resultsAdvanced.find('[data-mark] > i').addClass('outline');
            this.$resultsSimple.find('[data-timestamp] > i').addClass('outline');
        }
    }
}

// Settings View
class SettingsView extends View {
    constructor (parent) {
        super(parent);

        // Reserved script names
        this.reservedScripts = ['players', 'me', 'guilds'];

        // Left sidebar
        this.$list = this.$parent.operator('list');

        this.$selectorDropdown = this.$parent.operator('selector-dropdown');
        this.$selectorInput = this.$parent.operator('selector-input');

        // Right sidebar
        this.$libraryWiki = this.$parent.operator('library-wiki');
        this.$libraryWiki.click(() => {
            window.open('https://github.com/HafisCZ/sf-tools/wiki', '_blank');
        });

        this.$libraryScripts = this.$parent.operator('library-scripts');
        this.$libraryScripts.click(() => {
            DialogController.open(ScriptRepositoryDialog, (content) => this.editor.content = content);
        });

        this.$libraryTemplates = this.$parent.operator('library-templates');
        this.$libraryTemplates.click(() => {
            DialogController.open(TemplateManageDialog, this.script.parent, () => this._updateSidebars());
        });
 
        // Actions
        this.$copy = this.$parent.operator('copy');
        this.$copy.click(() => {
            copyText(this.editor.content);
        });

        // Archive
        this.$archive = this.$parent.operator('archive');
        this.$archive.click(() => {
            DialogController.open(ScriptArchiveDialog, (content) => {
                if (content === true) {
                    this._updateSidebars();
                } else {
                    this.editor.content = content;
                }
            });
        });

        // Button handling
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.returnTo();
        });

        this.$reset = this.$parent.operator('reset');
        this.$reset.click(() => {
            this.show(this.script.key, this.returnTo);
        });

        this.$save = this.$parent.operator('save');
        this.$save.click((event) => {
            this.save();
            if (event.ctrlKey && this.returnTo) {
                this.returnTo();
            }
        });

        this.$remove = this.$parent.operator('remove');
        this.$remove.click(() => {
            DialogController.open(
                ConfirmDialog,
                intl('dialog.delete_script.title'),
                intl('dialog.delete_script.notice'),
                () => this.remove(),
                null
            );
        });

        this.$saveTemplate = this.$parent.operator('save-template');
        this.$saveTemplate.click((event) => {
            if (event.ctrlKey && this.returnTo && this.script.parent) {
                this.save();

                TemplateManager.save(this.script.parent, this.editor.content);

                this.returnTo();
            } else {
                DialogController.open(
                    TemplateSaveDialog,
                    this.script.parent,
                    (name) => {
                        TemplateManager.save(name, this.editor.content);
    
                        this.script.parent = name;
    
                        this._contentChanged(true, 'parent');
                        this._updateSidebars();
                    }
                )
            }
        })

        this.editor = new ScriptEditor(
            this.$parent,
            EditorType.DEFAULT,
            (value) => this._contentChanged(this.script && value !== this.script.content, 'content')
        )

        // React to CTRL presses
        this.ctrlDown = false;
        this._updateButtons();

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Control' && !this.ctrlDown) {
                this.ctrlDown = true;
                this._updateButtons();
            }
        });

        window.addEventListener('keyup', (event) => {
            if (event.key === 'Control' && this.ctrlDown) {
                this.ctrlDown = false;
                this._updateButtons();
            }
        });
    }

    _updateButtons () {
        if (UI.current !== this) {
            return;
        }

        if (this.ctrlDown && this.returnTo) {
            this.$save.find('i').removeClass('save').addClass('reply')
            
            if (this.script.parent) {
                this.$saveTemplate.find('i').removeClass('save').addClass('reply')
            }
        } else {
            this.$save.find('i').removeClass('reply').addClass('save')
            this.$saveTemplate.find('i').removeClass('reply').addClass('save')
        }
    }

    // Returns default key for specified key
    _defaultKey (value) {
        if (value === 'players' || value === 'me') {
            return value;
        } else if (value.includes('_p')) {
            return 'me';
        } else {
            return 'guilds';
        }
    }

    // Returns default template for specified key
    _defaultContent (value) {
        return DefaultScripts.getContent({ players: 'browse', me: 'players', guilds: 'groups' }[this._defaultKey(value)]);
    }

    remove () {
        ScriptManager.remove(this.script.name);
        if (this.returnTo) {
            this.returnTo();
        } else {
            this.show();
        }
    }

    show (key = 'players', returnTo = null) {
        this._setScript(key);

        this.returnTo = returnTo;
        this._updateSidebars();
    }

    _setScript (key) {
        this.script = Object.assign({
            name: key,
            content: this._defaultContent(key),
            parent: null
        }, ScriptManager.get(key, this._defaultKey(key)) || {});

        this.editor.content = this.script.content;
        this.editor.scrollTop();

        this._contentChanged(false);
    }

    save () {
        this.script.content = this.editor.content;
        ScriptManager.save(this.script.name, this.script.content, this.script.parent);

        this._updateSidebars();
        this._contentChanged(false);
    }

    _contentChanged (valueChanged, ...changes) {
        if (typeof this.changes === 'undefined') {
            this.changes = {};
        }

        if (!valueChanged && changes.length === 0) {
            this.changes = {};
        } else {
            for (const change of changes) {
                if (valueChanged) {
                    this.changes[change] = true;
                } else {
                    delete this.changes[change];
                }
            }
        }

        const wasChanged = Object.keys(this.changes).length > 0;
        const wasSaved = this.script ? (this.reservedScripts.includes(this.script.name) || ScriptManager.exists(this.script.name)) : false;

        if (wasChanged) {
            this.$reset.removeClass('disabled');
        } else {
            this.$reset.addClass('disabled');
        }
        
        if (wasSaved && !wasChanged) {
            this.$save.removeClass('yellow').addClass('disabled inverted');
        } else {
            this.$save.addClass('yellow').removeClass('disabled inverted');
        }

        if (this.script) {
            this.$parent.find('[data-template-name]').removeClass('background-light');
            this.$parent.find(`[data-template-name="${this.script.parent}"]`).addClass('background-light');
        }
    }

    _updateSidebars () {
        // Template list
        let content = '';
        for (const { name, version, timestamp } of TemplateManager.sortedList()) {
            content += `
                <div data-template-name="${name}" class="!border-radius-1 border-gray p-4 background-dark background-light:hover cursor-pointer flex gap-2 items-center ${this.script && this.script.parent === name ? 'background-light' : ''}">
                    <div>
                        <div>${name}</div>
                        <div class="text-gray">v${isNaN(version) ? 1 : version} - ${formatDate(timestamp)}</div>
                    </div>
                </div>
            `;
        }

        this.$list.html(content);
        this.$list.find('[data-template-name]').click((event) => {
            const name = event.currentTarget.dataset.templateName;

            this.editor.content = TemplateManager.getContent(name);

            if (this.script.parent !== name) {
                this.script.parent = name;
                this._contentChanged(true, 'parent');
            }
        });

        // Script list
        if (this.returnTo) {
            this.$close.show();
            this.$selectorInput.show();
            this.$selectorDropdown.hide();

            this.$selectorInput.find('input').val(this._getScriptName(this.script.name));
            this.$selectorInput.find('i').removeClass('database user archive').addClass(this._getScriptIcon(this.script.name));
        } else {
            this.$close.hide();
            this.$selectorInput.hide();
            this.$selectorDropdown.show();

            this.$selectorDropdown.dropdown({
                values: [
                    ...this.reservedScripts.map((value) => ({
                        name: intl(`stats.scripts.types.${value}`),
                        icon: this._getScriptIcon(value),
                        value
                    })),
                    ...ScriptManager.keys().filter((value) => !this.reservedScripts.includes(value)).map((value) => ({
                        name: this._getScriptName(value),
                        icon: this._getScriptIcon(value),
                        value
                    }))
                ]
            });
    
            this.$selectorDropdown.dropdown('set selected', this.script.name);
            this.$selectorDropdown.dropdown('setting', 'onChange', (value) => {
                this._setScript(value);
            })
        }

        if (ScriptManager.exists(this.script.name)) {
            this.$remove.removeClass('disabled');
        } else {
            this.$remove.addClass('disabled');
        }

        if (ScriptArchive.empty()) {
            this.$archive.addClass('disabled');
        } else {
            this.$archive.removeClass('disabled');
        }

        this._updateButtons();
    }

    _getScriptName (value) {
        if (this.reservedScripts.includes(value)) {
            return intl(`stats.scripts.types.${value}`);
        } else {
            return DatabaseManager.PlayerNames[value] || DatabaseManager.GroupNames[value] || value;
        }
    }

    _getScriptIcon (value) {
        if (this.reservedScripts.includes(value)) {
            return { players: 'database', me: 'user', guilds: 'archive' }[value];
        } else if (DatabaseManager._isPlayer(value)) {
            return 'user';
        } else {
            return 'archive';
        }
    }
}

class OptionsView extends View {
    constructor (parent) {
        super(parent)

        this.$dropdownTab = this.$parent.find('[data-op="dropdown-tab"]');
        this.$dropdownTab.dropdown();
        this.$dropdownTab.dropdown('set selected', SiteOptions.tab);
        this.$dropdownTab.dropdown('setting', 'onChange', (value, text) => {
            SiteOptions.tab = value;
        });

        this.$dropdownPreloadRows = this.$parent.find('[data-op="dropdown-load-rows"]');
        this.$dropdownPreloadRows.dropdown();
        this.$dropdownPreloadRows.dropdown('set selected', SiteOptions.load_rows);
        this.$dropdownPreloadRows.dropdown('setting', 'onChange', (value, text) => {
            SiteOptions.load_rows = parseInt(value) || 50;
        });

        this.prepareCheckbox('always_prev', 'alwaysprev');
        this.prepareCheckbox('obfuscated', 'obfuscated');
        this.prepareCheckbox('insecure', 'insecure');
        this.prepareCheckbox('unsafe_delete', 'unsafe-delete');
        this.prepareCheckbox('terms_accepted', 'terms');

        SiteOptions.onChange('terms_accepted', enabled => {
            if (enabled) {
                this.$parent.find(`[data-op="checkbox-terms"]`).checkbox('set checked');
            } else {
                DialogController.open(TermsAndConditionsDialog);
            }
        });

        this.$save = this.$parent.find('[data-op="save"]').click(() => {
            Actions.setScript(this.editor.content);

            DatabaseManager.refreshTrackers();

            this.$save.addClass('disabled');
            this.$reset.addClass('disabled');
        });

        this.$reset = this.$parent.find('[data-op="discard"]').click(() => {
            this.editor.content = Actions.getScript();
        });

        this.editor = new ScriptEditor(this.$parent, EditorType.ACTIONS, val => {
            if (val === Actions.getScript()) {
                this.$save.addClass('disabled');
                this.$reset.addClass('disabled');
            } else {
                this.$save.removeClass('disabled');
                this.$reset.removeClass('disabled');
            }
        });

        // recovery
        this.$recoveryExport = this.$parent.find('[data-op="export"]');
        this.$recoveryImport = this.$parent.find('[data-op="import"]');

        this.$recoveryExport.click(() => this.exportDumpFile());
        this.$recoveryImport.change((event) => this.importDumpFile(event));
    }

    async exportDumpFile () {
        Loader.toggle(true);

        Exporter.json(
            await Site.dump(),
            `recovery_dump_${formatDate(Date.now()).replace(/\W/g, '_')}`
        );

        Loader.toggle(false);
    }

    importDumpFile (fileEvent) {
        DialogController.open(ConfirmDialog, intl('stats.settings.recovery.title'), intl('stats.settings.recovery.notice'), async function () {
            Loader.toggle(true);

            Toast.info(intl('stats.settings.recovery.title'), intl('stats.settings.recovery.toast'));

            let data = await _dig(fileEvent, 'currentTarget', 'files', 0).text().then(fileContent => JSON.parse(fileContent));
            await Site.recover(data);

            window.location.href = window.location.href;
        }, () => {}, true, 2)
    }

    // Prepare checkbox
    prepareCheckbox (property, name) {
        this.$parent.find(`[data-op="checkbox-${ name }"]`).checkbox({
            onChecked: () => { SiteOptions[property] = true },
            onUnchecked: () => { SiteOptions[property] = false }
        }).checkbox(SiteOptions[property] ? 'set checked' : 'set unchecked');
    }

    show () {
        this.editor.content = Actions.getScript();
    }
}

const PROFILES_PROPS = ['timestamp', 'identifier', 'prefix', 'tag', 'version', 'own', 'name', 'identifier', 'group', 'groupname', 'save'];
const PROFILES_INDEXES = ['own', 'identifier', 'timestamp', 'group', 'prefix', 'tag'];
const PROFILES_GROUP_PROPS = ['timestamp', 'identifier', 'prefix', 'own', 'name', 'identifier', 'save'];
const PROFILES_GROUP_INDEXES = ['own', 'identifier', 'timestamp', 'prefix'];

class ProfilesView extends View {
    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]')
    }

    show () {
        let content = '';
        for (const [key, profile] of ProfileManager.getProfiles()) {
            const { name, primary, secondary, primary_g, secondary_g } = profile;

            content += `
                <div class="row" style="margin-top: 1em; border: 1px solid grey; border-radius: .25em;">
                    <div class="four wide column">
                        <h3 class="ui inverted ${ key == ProfileManager.getActiveProfileName() ? 'orange' : '' } header">
                            <span data-key="${key}" class="cursor-pointer">${name}</span><br/>
                            ${ profile.slot ? `<span style="font-size: 90%;">Slot ${profile.slot}</span><br>` : '' }
                            <span style="font-size: 90%;">(${key})</span>
                        </h3>
                        ${
                            ProfileManager.isEditable(key) ? `
                                <div style="position: absolute; left: 1em; bottom: 0;">
                                    <i class="cursor-pointer trash alternate outline icon !text-red:hover" data-delete="${key}"></i>
                                    <i class="cursor-pointer wrench icon" style="margin-left: 1em;" data-edit="${key}"></i>
                                </div>
                            ` : ''
                        }
                    </div>
                    <div class="twelve wide column">
                        <table class="ui basic black inverted table" style="table-layout: fixed;">
                            <tr>
                                <td style="width: 20%;"></td>
                                <td style="width: 40%;">${intl('stats.profiles.players')}</td>
                                <td style="width: 40%;">${intl('stats.profiles.groups')}</td>
                            </tr>
                            <tr>
                                <td>${intl('stats.profiles.primary')}</td>
                                <td>${ this.showRules(primary) }</td>
                                <td>${ this.showRules(primary_g) }</td>
                            </tr>
                            <tr>
                                <td>${intl('stats.profiles.secondary')}</td>
                                <td>${ secondary ? Highlighter.expression(secondary, undefined, PROFILES_PROPS).text : `<b>${intl('stats.profiles.none')}</b>` }</td>
                                <td>${ secondary_g ? Highlighter.expression(secondary_g, undefined, PROFILES_GROUP_PROPS).text : `<b>${intl('stats.profiles.none')}</b>` }</td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }

        content += `
            <div class="row" style="margin-top: 1em;">
                <div class="sixteen wide column" style="padding: 0;">
                    <div class="ui fluid basic inverted button" data-op="create" style="margin: -1em; padding: 1em; margin-left: 0; line-height: 2em;">${intl('stats.profiles.create')}</div>
                </div>
            </div>
        `

        this.$list.html(content);
        this.$parent.find('[data-key]').click(event => {
            const key = event.currentTarget.dataset.key;
            ProfileManager.setActiveProfile(key);
            window.location.href = window.location.href;
        });

        this.$parent.find('[data-delete]').click((event) => {
            const key = event.currentTarget.dataset.delete;
            ProfileManager.removeProfile(key);
            this.show();
        });

        this.$parent.find('[data-edit]').click((event) => {
            const key = event.currentTarget.dataset.edit;
            DialogController.open(ProfileCreateDialog, () => this.show(), key);
        });

        this.$parent.find('[data-op="create"]').click(() => {
            this.addProfile();
            this.show();
        });
    }

    addProfile () {
        DialogController.open(ProfileCreateDialog, () => this.show());
    }

    showRules (rule) {
        if (rule) {
            const { name, mode, value } = rule;
            if (mode == 'between') {
                return `<b>${name}</b> ${intl('stats.profiles.between')} ${Highlighter.expression(value[0]).text} ${intl('stats.profiles.and')} ${Highlighter.expression(value[1]).text}`;
            } else {
                return `<b>${name}</b> ${this.stringifyMode(mode)} ${value ? value.map(v => Highlighter.expression(v).text).join('<br/>') : ''}`;
            }
        } else {
            return `<b>${intl('stats.profiles.none')}</b>`;
        }
    }

    stringifyMode (v) {
        return {
            'above': '>',
            'below': '<',
            'equals': '='
        }[v] || '??';
    }
}
