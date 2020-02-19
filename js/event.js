// Event types
const EVT_NONE = 0;
const EVT_SHOWSCREEN = 1;
const EVT_SHOWERROR = 2;
const EVT_INIT = 5;
const EVT_SHOWCRITICAL = 6;

const EVT_GROUP_SHOW = 1000; // Show
const EVT_GROUP_SORT = 1001; // Toggle sort mode
const EVT_GROUP_LOAD_TABLE = 1002; // Load table
const EVT_GROUP_LOAD_HEADER = 1003; // Load header
const EVT_GROUP_SAVE = 1004; // Save as image
const EVT_GROUP_COPY = 1005; // Copy table
const EVT_SETTINGS_SAVE = 2000;
const EVT_SETTINGS_LOAD = 2001;
const EVT_PLAYERS_LOAD = 6000;
const EVT_FILES_LOAD = 3000;
const EVT_FILES_REMOVE = 3001;
const EVT_FILES_UPLOAD = 3002;
const EVT_FILES_IMPORT = 3003;
const EVT_FILES_EXPORT = 3004;
const EVT_FILE_MERGE = 100001;
const EVT_BROWSE_LOAD = 4000;
const EVT_PLAYER_LOAD = 5000;
const EVT_PLAYERS_SAVE = 6002;
const EVT_PLAYERS_COPY = 6003;

// Better event names
const EVENT_GUILDS_TOGGLE = 20000;

const EVENT_GUILD_SETTINGS_SHOW = 21000;

const EVENT_PLAYERS_SHOW = 22000;
const EVENT_PLAYERS_SETTINGS_SHOW = 22001;

Handle.bind(EVENT_PLAYERS_SETTINGS_SHOW, function () {
    UI.FloatingSettings.show('players', EVT_PLAYERS_LOAD);
});

Handle.bind(EVENT_GUILD_SETTINGS_SHOW, function () {
    UI.FloatingSettings.show(State.getGroupID(), EVT_GROUP_LOAD_TABLE);
});

Handle.bind(EVENT_GUILDS_TOGGLE, function (visible) {
    State.otherEnabled = visible;
    Handle.call(EVT_BROWSE_LOAD);
});

// Bindings
Handle.bind(EVT_NONE, function (... args) {
    console.log(... args);
});

Handle.bind(EVT_SHOWCRITICAL, function (s) {
    $('#sf-loader-content').html(`<h1 class="ui header white">${ s }</h1>`);
})

Handle.bind(EVT_SHOWSCREEN, function (s) {
    $('.ui.container').addClass('hidden');
    $(`#${s}`).removeClass('hidden');
});

Handle.bind(EVT_SHOWERROR, function (e) {
    $('#modal-error-content').html(e);
    $('#modal-error').modal('show');
});

Handle.bind(EVT_FILES_LOAD, function () {
    // Show counts
    $('#container-files-statistics-groups').text(Object.keys(Database.Groups).length);
    $('#container-files-statistics-players').text(Object.keys(Database.Players).length);
    $('#container-files-statistics-files').text(Storage.files().length);

    // Prepare list
    var content = Storage.files().map(function (file, index) {
        return `
            <div class="ui segment">
                <div class="ui middle aligned grid">
                    <div class="four wide text-center column">
                        <h3 class="ui margin-tiny-top header clickable" data-file="${ index }">${formatDate(new Date(file.timestamp))}</h3>
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
                        <div><span class="text-muted margin-medium-right">${ file.version || 'Unknown version' }</span> <i class="trash alternate glow outline icon" data-file-id="${index}"></i></div>
                    </div>
                </div>
            </div>
        `;
    });

    content.reverse();

    $('#container-files-list').html(content.join(''));
    $('.ui.sticky').sticky({
        context: '#container-files-list',
        offset: 70
    });

    $('#container-files-list [data-file]').on('click', function () {
        $(this).toggleClass('file-selected');
    });

    $('[data-file-id]').on('click', function () {
        Handle.call(EVT_FILES_REMOVE, $(this).attr('data-file-id'));
    });
});

Handle.bind(EVT_BROWSE_LOAD, function () {
    // Content strings
    var contentOwn = '';
    var contentOther = '';

    // Loop variables
    var indexOwn = 0;
    var indexOther = 0;

    var groups = Object.values(Database.Groups);
    groups.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

    // Loop all groups
    for (var i = 0, group; group = groups[i]; i++) {
        if (group.Latest.Own) {
            contentOwn += `
                ${ indexOwn % 5 == 0 ? `${ indexOwn != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    <div class="ui segment clickable ${Database.Latest != group.LatestTimestamp ? 'border-red' : ''}" data-group-id="${group.Latest.Identifier}">
                        <img class="ui medium centered image" src="res/group.png">
                        <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ group.Latest.Prefix }</h3>
                        <h3 class="ui margin-none-top centered header">${group.Latest.Name}</h3>
                    </div>
                </div>
            `;
            indexOwn++;
        } else if (State.otherEnabled) {
            contentOther += `
                ${ indexOther % 5 == 0 ? `${ indexOther != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    <div class="ui segment clickable ${Database.Latest != group.LatestTimestamp ? 'border-red' : ''}" data-group-id="${group.Latest.Identifier}">
                        <img class="ui medium centered image" src="res/group.png">
                        <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ group.Latest.Prefix }</h3>
                        <h3 class="ui margin-none-top centered header">${group.Latest.Name}</h3>
                    </div>
                </div>
            `;
            indexOther++;
        }
    }

    // Add endings
    contentOwn += '</div>';
    contentOther += '</div>';

    // jQuery
    $('#gl-guilds-own').html(contentOwn);
    $('#gl-guilds-other').html(contentOther);
    $('[data-group-id]').on('click', function () {
        State.setGroup($(this).attr('data-group-id'));
        Handle.call(EVT_GROUP_SHOW);
    });
});

Handle.bind(EVT_FILES_UPLOAD, function (files) {
    Array.from(files).forEach(function (file, index, array) {
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = event => {
            try {
                Storage.add(event.target.result, file.lastModified);
                Handle.call(EVT_FILES_LOAD);
            } catch (e) {
                Handle.call(EVT_SHOWERROR, 'A problem occured while trying to import this file.<br><br>' + e);
            }
        };
    });
});

Handle.bind(EVT_FILES_REMOVE, function (index) {
    Storage.remove(index);
    Handle.call(EVT_FILES_LOAD);
});

Handle.bind(EVT_FILES_EXPORT, function () {
    Storage.export();
});

Handle.bind(EVT_FILE_MERGE, function () {
    var files = $('.file-selected.clickable').toArray().map(e => $(e).attr('data-file'));
    if (files.length > 1) {
        Storage.merge(files);
    }
});

Handle.bind(EVT_FILES_IMPORT, function (files) {
    Array.from(files).forEach(function (file, index, array) {
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = event => {
            try {
                Storage.import(event.target.result);
                Handle.call(EVT_FILES_LOAD);
            } catch (e) {
                Handle.call(EVT_SHOWERROR, 'A problem occured while trying to import this file.<br><br>' + e);
            }
        };
    });
});

// Show group
Handle.bind(EVT_GROUP_SHOW, function () {
    Handle.call(EVT_SHOWSCREEN, 'container-detail');
    Handle.call(EVT_GROUP_LOAD_HEADER);
    Handle.call(EVT_GROUP_LOAD_TABLE);
});

// Save group as image
Handle.bind(EVT_GROUP_SAVE, function () {
    html2canvas($('#container-detail-screenshot')[0], {
        logging: false,
        onclone: function(doc){
            var hidden = doc.getElementById('screenshot-only');
            hidden.style.display = 'block';
        }
    }).then(function (canvas) {
        canvas.toBlob(function (blob) {
            window.download(`${ State.getGroupCurrent().Name }.${ State.getGroupTimestamp() }${ State.getGroupReferenceTimestamp() != State.getGroupTimestamp() ? `.${ State.getGroupReferenceTimestamp() }` : '' }.png`, blob);
        });
    });
});

// Save group as image
Handle.bind(EVT_PLAYERS_SAVE, function () {
    html2canvas($('#pl-table')[0], {
        logging: false
    }).then(function (canvas) {
        canvas.toBlob(function (blob) {
            window.download(`players.png`, blob);
        });
    });
});

Handle.bind(EVT_GROUP_COPY, function () {
    $('#screenshot-only').show();

    var range = document.createRange();
    range.selectNode(document.getElementById('container-detail-screenshot'));

    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();

    $('#screenshot-only').hide();
});

Handle.bind(EVT_PLAYERS_COPY, function () {
    var range = document.createRange();
    range.selectNode(document.getElementById('pl-table'));

    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
});

Handle.bind(EVT_GROUP_LOAD_HEADER, function () {
    State.clearSort();

    var group = State.getGroup();

    var listSelect = [];
    var listReference = [];

    for (var [ timestamp, g ] of group.List) {
        listSelect.push({
            name: formatDate(new Date(timestamp)),
            value: timestamp,
            selected: timestamp == State.getGroupTimestamp()
        });

        if (timestamp <= State.getGroupTimestamp()) {
            listReference.push({
                name: formatDate(new Date(timestamp)),
                value: timestamp
            });
        }
    }

    listReference[0].selected = true;

    $('#container-detail-name').text(group.Latest.Name);
    $('#container-detail-select-dropdown').dropdown({
        values: listSelect
    });

    $('#container-detail-compare-dropdown').dropdown({
        values: listReference
    });

    $('#container-detail-select-dropdown').dropdown('setting', 'onChange', function (value, text) {
        State.setTimestamp(value);
        State.setReference(value);
        Handle.call(EVT_GROUP_LOAD_HEADER);
        Handle.call(EVT_GROUP_LOAD_TABLE);
    });

    $('#container-detail-compare-dropdown').dropdown('setting', 'onChange', function (value, text) {
        State.setReference(value);
        State.clearSort();
        Handle.call(EVT_GROUP_LOAD_TABLE);
    });
});

Handle.bind(EVT_GROUP_LOAD_TABLE, function () {
    // Current state
    var group = State.getGroup();
    var groupCurrent = State.getGroupCurrent();
    var groupCurrentTimestamp = State.getGroupTimestamp();
    var groupReference = State.getGroupReference();
    var groupReferenceTimestamp = State.getGroupReferenceTimestamp();

    $('#sf-d1').html(formatDate(new Date(Number(State.getGroupTimestamp()))));
    $('#sf-d2').html(formatDate(new Date(Number(State.getGroupReferenceTimestamp()))));
    $('#screenshot-only').hide();

    // Current members
    var members = [];
    for (var memberID of groupCurrent.Members) {
        if (Database.Players[memberID] && Database.Players[memberID][groupCurrentTimestamp]) {
            members.push(Database.Players[memberID][groupCurrentTimestamp]);
        }
    }

    // Reference members
    var membersReferences = [];
    for (var member of members) {
        var player = Database.Players[member.Identifier];
        if (player) {
            var playerReference = player[groupReferenceTimestamp];
            if (playerReference && playerReference.Group.Identifier == groupCurrent.Identifier) {
                membersReferences.push(playerReference);
            } else {
                var ts = player.List.find(p => p[0] <= groupReferenceTimestamp && p[1].Group.Identifier == groupCurrent.Identifier);
                if (ts) {
                    membersReferences.push(ts[1]);
                }
            }
        } else {
            membersReferences.push(member);
        }
    }

    // Table columns
    if (Settings.exists(groupCurrent.Identifier)) {
        $('#container-detail-settings')[0].style.setProperty('background', '#21ba45', 'important');
        $('#container-detail-settings')[0].style.setProperty('color', 'white', 'important');
    } else {
        $('#container-detail-settings')[0].style.setProperty('background', '');
        $('#container-detail-settings')[0].style.setProperty('color', '');
    }

    // Load settings
    var config = Settings.load(groupCurrent.Identifier);

    // Create table
    var table = new Table(config);
    var tablePlayers = new StatisticsTableArray();

    var width = table.width();

    if (width < 1127) {
        $('#container-detail').css('width', '');
        $('#container-detail-screenshot').css('width', `${ Math.max(750, width) }px`);
        $('#container-detail-screenshot').css('margin', 'auto');
    } else {
        $('#container-detail').css('width', `${ width }px`);
        $('#container-detail-screenshot').css('width', '');
        $('#container-detail-screenshot').css('margin', '');
    }

    // Add players
    members.forEach(function (player) {
        tablePlayers.add(player, membersReferences.find(c => c.Identifier == player.Identifier));
    });

    // Member exchanges
    var joined = groupCurrent.Members.filter(id => !groupReference.Members.includes(id)).map(id => {
        return getAt(Database.Players, id, groupCurrentTimestamp, 'Name') || getAt(Database.Players, id, 'List', 0, 1, 'Name') || id;
    });
    var kicked = groupReference.Members.filter(id => !groupCurrent.Members.includes(id)).map(id => {
        return getAt(Database.Players, id, groupCurrentTimestamp, 'Name') || getAt(Database.Players, id, 'List', 0, 1, 'Name') || id;
    });

    // Sort members if requested
    var sortStyle = State.getSortStyle();
    var sortBy = State.getSort();

    $('#container-detail-content').html(table.createStatisticsTable(tablePlayers, joined, kicked, sortBy, sortStyle));

    $('[data-player]').on('click', function () {
        Handle.call(EVT_PLAYER_LOAD, $(this).attr('data-player'), State.getGroupTimestamp());
    });

    $('[data-sortable]').on('click', function () {
        var header = $(this).attr('data-sortable-key');
        State.setSort(header, State.getSort() == header ? (State.getSortStyle() + 1) % 3 : 1);
        Handle.call(EVT_GROUP_LOAD_TABLE);
    });
});

Handle.bind(EVT_PLAYER_LOAD, function (identifier, timestamp) {
    var config = State.getGroupID() ? Settings.load(State.getGroupID()) : Settings.load();
    var player = Database.Players[identifier][timestamp];

    $('#modal-player').html(`
        <div class="ui text-center extreme header margin-none-bottom padding-none-bottom">${ player.Name }</div>
        <div class="ui text-center huge header padding-none-top margin-remove-top">${ PLAYER_CLASS[player.Class] } <span style="color: ${ CompareEval.evaluate(player.Level, config.getEntrySafe('Level').color) }">${ player.Level }</span></div>
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
                            ${ player.Group.Role != -1 ? `
                                <div class="left aligned column font-big">Role</div>
                                <div class="column"></div>
                                <div class="column">${ GROUP_ROLES[player.Group.Role] }</div>
                            ` : '' }
                        ` : '' }
                        ${ player.Fortress.Upgrade.Building ? `
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Currently building</div>
                            <div class="column"></div>
                            <div class="column">${ FORTRESS_BUILDINGS[player.Fortress.Upgrade.Building] }</div>
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
    $('#modal-player').modal({
        centered: false
    }).modal('show');
});

// Initialization
Handle.bind(EVT_INIT, function () {
    UI.FloatingSettings.init();

    // Player search
    $('#psearch').on('change', function () {
        var terms = $('#psearch').val().toLowerCase().split(' ').filter(term => term.trim().length);
        var items = [];

        var table = State.getCachedTable();
        var width = table.width();
        var tablePlayers = new PlayersTableArray();

        for (var player of Object.values(Database.Players)) {
            var matches = terms.reduce((total, term) => total + ((player.Latest.Name.toLowerCase().includes(term) || player.Latest.Prefix.includes(term) || (player.Latest.hasGuild() && player.Latest.Group.Name.toLowerCase().includes(term))) ? 1 : 0), 0);
            if (matches == terms.length) {
                tablePlayers.add(player.Latest, player.LatestTimestamp == Database.Latest);
            }
        }

        var sortStyle = State.getSortStyle();
        var sortBy = State.getSort();

        $('#pl-table').html(table.createPlayersTable(tablePlayers, sortBy, sortStyle));
        $('#container-players').css('width', `${ Math.max(750, table.width() + 110) }px`);

        $('#pl-table [data-sortable]').on('click', function () {
            var header = $(this).attr('data-sortable-key');
            State.setSort(header, State.getSort() == header ? (State.getSortStyle() + 1) % 3 : 1);
            $('#psearch').trigger('change');
        });

        $('#pl-table [data-player]').on('click', function () {
            var player = Database.Players[$(this).attr('data-player')];
            Handle.call(EVT_PLAYER_LOAD, player.Latest.Identifier, player.LatestTimestamp);
        });
    });

    // Settings syntax highlighting
    function enableHighlighting (el) {
        var $a = el;
        var $b = $a.children('.ta-content');
        var $c = $a.children('textarea');
        $b.css('top', $c.css('padding-top'));
        $b.css('left', $c.css('padding-left'));
        $b.css('margin-right', '30px');
        $b.css('font', $c.css('font'));
        $b.css('font-family', $c.css('font-family'));
        $b.css('line-height', $c.css('line-height'));
        $c.css('overflow-x', 'hidden');
        $c.on('input', function () {
            var val = $(this).val();
            $b.html(SettingsParser.highlight(val));
        });
        $c.trigger('input');
        $c.on('scroll', function () {
            var scroll = $(this).scrollTop();
            $b.css('transform', scroll > 0 ? `translateY(${ -scroll }px)` : '');
            $b.css('clip-path', `inset(${ scroll }px 0px 0px 0px)`);
        });
    }

    enableHighlighting($('#fl-code'));
    enableHighlighting($('#sg-code'));

    $('#sg-tutorial, #sc-tutorial').css('line-height', '20px');
    $('#sg-tutorial, #sc-tutorial').html(`
        <div class="ui pointing secondary settings-menu menu">
            <a class="active item" data-tab="tab0">Basics</a>
            <a class="item" data-tab="tab1">Options</a>
            <a class="item" data-tab="tab2">Rules</a>
            <a class="item" data-tab="tab3">Categories</a>
            <a class="item" data-tab="tab4">Headers</a>
        </div>
        <div class="ui active tab basic segment padding-none" data-tab="tab0">
            <div>
                <b>Global settings</b>:</br>
                Use value <code>on</code> to enable or <code>off</code> to disable a feature. All features are disabled by default.</br>
                </br>
                <div class="ui css-compact-grid grid">
                    <div class="five wide column">
                        <code>members</code>
                    </div>
                    <div class="eleven wide column">
                        Count number of members for each class in your guild and track those who left or joined.
                    </div>
                    <div class="five wide column">
                        <code>indexed</code>
                    </div>
                    <div class="eleven wide column">
                        Show index at the start of each row. If you want the index to stay static while sorting, use value <code>static</code>.
                    </div>
                </div>
            </div>
            </br>
            <div>
                <b>Table structure</b>:</br>
                All headers must be placed within a category. Headers will be added to the last created category. Empty categories except reserved ones will be ignored.</br>
                </br>
                <div class="ui css-compact-grid grid">
                    <div class="five wide column">
                        <code>category NAME</code>
                    </div>
                    <div class="eleven wide column">
                        Create a category with a given name.
                    </div>
                    <div class="five wide column">
                        <code>header NAME</code>
                    </div>
                    <div class="eleven wide column">
                        Create a header with a given name.
                    </div>
                </div>
            </div>
            </br>
            <div>
                <b>Comments</b>:</br>
                You can write comments by prefixing them with the character <code>#</code>.</br>
            </div>
            </br>
            <b>Constants</b>:</br>
            You can use any of the predefined constants below. All constants are prefixed by the character <code>@</code>.</br>
            </br>
            <b>Predefined constants</b>:</br>
            </br>
            <div class="ui five column css-compact-grid grid">
                ${ Object.keys(SP_KEYWORD_CONSTANTS).map(c => `<div class="left aligned column"><code>${ c }</code></div>`).join('') }
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab1">
            <b>Options</b>:</br>
            You can use options to customize headers and reserved categories. Options must be placed after creating header or reserved category and will be effective only until another is created.</br>
            </br>
            <div class="ui css-compact-grid grid">
                <div class="five wide column">
                    <code>alias NAME</code>
                </div>
                <div class="eleven wide column">
                    Rename reserved header or category.
                </div>
                <div class="five wide column">
                    <code>width NUMBER</code>
                </div>
                <div class="eleven wide column">
                    Change the width of the header. In case of a reserved category, it will be applied to all it's child headers.
                </div>
                <div class="five wide column">
                    <code>difference BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show the difference between current and reference values while comparing.
                </div>
                <div class="five wide column">
                    <code>brackets BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show difference within brackets.
                </div>
                <div class="five wide column">
                    <code>statistics BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show minimum, average and max values below the table.
                </div>
                <div class="five wide column">
                    <code>percentage BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show value as percentage instead of value only. Has effect only on <code>Mount</code> and <code>Album</code> headers.
                </div>
                <div class="five wide column">
                    <code>hydra BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show whether player has Dehydration achievement. Has effect only on <code>Awards</code> header.
                </div>
                <div class="five wide column">
                    <code>visible BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show value even with color enabled. Has effect only on <code>Potions</code> header.
                </div>
                <div class="five wide column">
                    <code>maximum BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show the level of Fortress next to knights. Has effect only on <code>Knights</code> header.
                </div>
                <div class="five wide column">
                    <code>color RULE COLOR</code>
                </div>
                <div class="eleven wide column">
                    Apply a color to the cell if it follows the rule. You can use any valid css colors.
                </div>
                <div class="five wide column">
                    <code>value RULE VALUE</code>
                </div>
                <div class="eleven wide column">
                    Show a custom value instead of real value if it follows the rule.
                </div>
            </div>
            </br>
            <b>Options for custom headers</b>:</br>
            </br>
            <div class="ui css-compact-grid grid">
                <div class="five wide column">
                    <code>path PATH</code>
                </div>
                <div class="eleven wide column">
                    This option is required for custom headers and contains the path to the value you want to show.
                </div>
                <div class="five wide column">
                    <code>flip BOOL</code>
                </div>
                <div class="eleven wide column">
                    Enabling this option will treat lesser values as better.
                </div>
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab2">
            <b>Rule</b>:</br>
            Rules consist of a function and a value. When the function is evaluated as true, the value will be used. If there are more rules, then the first evaluated as true will be used.</br>
            </br>
            <div class="ui css-compact-grid grid">
                <div class="five wide column">
                    <code>default</code>
                </div>
                <div class="eleven wide column">
                    This rule specifies the default value and will be used only if no other rules are used.
                </div>
                <div class="five wide column">
                    <code>equal X</code>
                </div>
                <div class="eleven wide column">
                    Any value equal to X.
                </div>
                <div class="five wide column">
                    <code>above X</code>
                </div>
                <div class="eleven wide column">
                    Any value above X.
                </div>
                <div class="five wide column">
                    <code>below X</code>
                </div>
                <div class="eleven wide column">
                    Any value below X.
                </div>
                <div class="five wide column">
                    <code>equal or above X</code></br>
                    <code>above or equal X</code>
                </div>
                <div class="eleven wide column">
                    Any value equal or above X.
                </div>
                <div class="five wide column">
                    <code>equal or below X</code></br>
                    <code>below or equal X</code>
                </div>
                <div class="eleven wide column">
                    Any value equal or below X.
                </div>
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab3">
            <b>Predefined categories</b>:</br>
            These categories are reserved and contain a set of predefined headers. You can set options to them as you would with headers as they will be set to all child headers. They cannot contain any other headers.</br>
            </br>
            <div class="ui three column css-compact-grid grid">
                ${ SP_KEYWORD_CATEGORY_RESERVED.map(c => `<div class="left aligned column"><code>${ c }</code></div>`).join('') }
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab4">
            <b>Predefined headers</b>:</br>
            These headers are reserved and already contain a path. If you want to have a custom header with the same name as a reserved header, you will have to use different name and then rename them using the <code>alias</code> option.</br>
            </br>
            <div class="ui three column css-compact-grid grid">
                ${ SP_KEYWORD_HEADER_RESERVED.map(c => `<div class="left aligned column"><code>${ c }</code></div>`).join('') }
            </div>
        </div>
    `);

    $('.menu .item').tab();
});

// Saving global settings
Handle.bind(EVT_SETTINGS_SAVE, function () {
    Settings.save($('#sg-code textarea').val());
});

// Loading global settings
Handle.bind(EVT_SETTINGS_LOAD, function () {
    $('#sg-code textarea').val(Settings.load().getCode());
    $('#sg-code textarea').trigger('input');
});

Handle.bind(EVENT_PLAYERS_SHOW, function () {
    State.unsetGroup();
    State.clearSort();
    Handle.call(EVT_PLAYERS_LOAD);
});

// Loading player list
Handle.bind(EVT_PLAYERS_LOAD, function () {
    State.cacheTable(new Table(Settings.load('players')));
    $('#psearch').val('').trigger('change');

    // Extra settings
    if (Settings.exists('players')) {
        $('#pl-settings')[0].style.setProperty('background', '#21ba45', 'important');
        $('#pl-settings')[0].style.setProperty('color', 'white', 'important');
    } else {
        $('#pl-settings')[0].style.setProperty('background', '');
        $('#pl-settings')[0].style.setProperty('color', '');
    }
});
