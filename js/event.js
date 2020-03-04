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

// Better event names
const EVENT_COPY = 10001;
const EVENT_SAVE = 10002;
const EVENT_COPY_PLAYER = 10003;

const EVENT_GUILDS_TOGGLE = 20000;
const EVENT_GUILDS_TOGGLE_HIDDEN = 20001;

const EVENT_GUILD_SETTINGS_SHOW = 21000;

const EVENT_PLAYERS_SHOW = 22000;
const EVENT_PLAYERS_SETTINGS_SHOW = 22001;
const EVENT_PLAYERS_REFRESH = 22002;
const EVENT_PLAYERS_TOGGLE_HIDDEN = 22003;

const EVENT_OWNPLAYERS_LOAD = 23000;
const EVENT_OWNPLAYERS_TOGGLE = 23001;
const EVENT_OWNPLAYERS_TOGGLE_HIDDEN = 23002;

const EVENT_OWNPLAYER_SHOW = 24000;
const EVENT_OWNPLAYER_SETTINGS_SHOW = 24001;

Handle.bind(EVENT_PLAYERS_SETTINGS_SHOW, function () {
    UI.FloatingSettings.show('players', EVT_PLAYERS_LOAD);
});

Handle.bind(EVENT_GUILD_SETTINGS_SHOW, function () {
    UI.FloatingSettings.show(State.getGroupID(), EVT_GROUP_LOAD_TABLE);
});

Handle.bind(EVENT_OWNPLAYER_SETTINGS_SHOW, function () {
    UI.FloatingSettings.show(State.player.Latest.Identifier, EVENT_OWNPLAYER_SHOW);
});

Handle.bind(EVENT_GUILDS_TOGGLE_HIDDEN, function (visible) {
    State.showHiddenGuilds = visible;
    Handle.call(EVT_BROWSE_LOAD);
});

Handle.bind(EVENT_OWNPLAYERS_TOGGLE_HIDDEN, function (visible) {
    State.showHiddenOwnPlayers = visible;
    Handle.call(EVENT_OWNPLAYERS_LOAD);
});

Handle.bind(EVENT_PLAYERS_TOGGLE_HIDDEN, function (visible) {
    State.showHiddenPlayers = visible;
    Handle.call(EVENT_PLAYERS_REFRESH);
});

Handle.bind(EVENT_GUILDS_TOGGLE, function (visible) {
    State.otherEnabled = visible;
    Handle.call(EVT_BROWSE_LOAD);
});

Handle.bind(EVENT_OWNPLAYERS_TOGGLE, function (visible) {
    State.otherPlayersEnabled = visible;
    Handle.call(EVENT_OWNPLAYERS_LOAD);
});

// Show group
Handle.bind(EVENT_OWNPLAYER_SHOW, function (identifier) {
    Handle.call(EVT_SHOWSCREEN, 'container-player');

    identifier = identifier || State.player.Latest.Identifier;

    if (Settings.exists(identifier)) {
        $('#od-settings')[0].style.setProperty('background', '#21ba45', 'important');
        $('#od-settings')[0].style.setProperty('color', 'white', 'important');
    } else {
        $('#od-settings')[0].style.setProperty('background', '');
        $('#od-settings')[0].style.setProperty('color', '');
    }

    var player = Database.Players[identifier];
    State.player = player;

    var table = new Table(Settings.load(identifier));
    var [content, w] = table.createHistoryTable(player.List);

    $('#od-table').html(content);
    $('#od-table').css('position', 'absolute');
    $('#od-table').css('width', `${ w }px`);
    $('#od-table').css('left', `calc(50vw - 9px - ${ w / 2 }px)`);
    if ($('#od-table').css('left').slice(0, -2) < 0) {
        $('#od-table').css('left', '0px');
    }
    $('#od-name').text(player.Latest.Name);
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

Handle.bind(EVENT_COPY_PLAYER, function (player) {
    const element = document.createElement('textarea');
    element.value = JSON.stringify(player.Data);
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);
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
                        <h3 class="ui margin-tiny-top header clickable" data-file="${ index }">${formatDate(file.timestamp)}</h3>
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

Handle.bind(EVENT_OWNPLAYERS_LOAD, function () {
    // Variables
    var content = '';
    var contentOther = '';

    var index = 0;
    var indexOther = 0;

    // Own players
    var players = Object.values(Database.Players);
    players.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

    // Create grid
    for (var i = 0, player; player = players[i]; i++) {
        var hidden = State.getHidden().includes(player.Latest.Identifier);
        if (!State.showHiddenOwnPlayers && hidden) {
            continue;
        }

        if (player.Latest.Own) {
            content += `
                ${ index % 5 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    <div class="ui segment clickable ${ Database.Latest != player.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-player-id="${ player.Latest.Identifier }">
                        <span class="css-timestamp">${ formatDate(player.LatestTimestamp) }</span>
                        <img class="ui medium centered image" src="res/class${ player.Latest.Class }.png">
                        <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ player.Latest.Prefix }</h3>
                        <h3 class="ui margin-none-top centered header">${ player.Latest.Name }</h3>
                    </div>
                </div>
            `;
            index++;
        } else if (State.otherPlayersEnabled) {
            contentOther += `
                ${ indexOther % 5 == 0 ? `${ indexOther != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    <div class="ui segment clickable ${ Database.Latest != player.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-player-id="${ player.Latest.Identifier }">
                        <span class="css-timestamp">${ formatDate(player.LatestTimestamp) }</span>
                        <img class="ui medium centered image" src="res/class${ player.Latest.Class }.png">
                        <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ player.Latest.Prefix }</h3>
                        <h3 class="ui margin-none-top centered header">${ player.Latest.Name }</h3>
                    </div>
                </div>
            `;
            indexOther++;
        }
    }

    // Add endings
    content += '</div>';
    contentOther += '</div>';

    // jQuery
    $('#ol-list').html(content);
    $('#ol-list-other').html(contentOther);

    $('[data-player-id]').on('click', function () {
        Handle.call(EVENT_OWNPLAYER_SHOW, $(this).attr('data-player-id'));
    });

    $('#context-ownplayers').context('bind', $('[data-player-id]'));
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
        var hidden = State.getHidden().includes(group.Latest.Identifier);
        if (!State.showHiddenGuilds && hidden) {
            continue;
        }

        if (group.Latest.Own) {
            contentOwn += `
                ${ indexOwn % 5 == 0 ? `${ indexOwn != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    <div class="ui segment clickable ${Database.Latest != group.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-group-id="${group.Latest.Identifier}">
                        <span class="css-timestamp">${ formatDate(group.LatestTimestamp) }</span>
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
                    <div class="ui segment clickable ${Database.Latest != group.LatestTimestamp ? 'border-red' : ''} ${ hidden ? 'css-entry-hidden' : '' }" data-group-id="${group.Latest.Identifier}">
                        <span class="css-timestamp">${ formatDate(group.LatestTimestamp) }</span>
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

    $('#context-groups').context('bind', $('[data-group-id]'));
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

Handle.bind(EVENT_SAVE, function (selector, filename, onclone) {
    html2canvas(document.getElementById(selector), {
        logging: false,
        onclone: onclone
    }).then(function (canvas) {
        canvas.toBlob(function (blob) {
            window.download(`${ filename }.png`, blob);
        });
    });
});

Handle.bind(EVENT_COPY, function (selector, extra) {
    var range = document.createRange();
    range.selectNode(document.getElementById(selector));

    window.getSelection().removeAllRanges();

    if (extra) {
        window.getSelection().addRange(extra);
    }

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
            name: formatDate(timestamp),
            value: timestamp,
            selected: timestamp == State.getGroupTimestamp()
        });

        if (timestamp <= State.getGroupTimestamp()) {
            listReference.push({
                name: formatDate(timestamp),
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
                var xx = player.List.concat();
                xx.reverse();
                var ts = xx.find(p => p[0] >= groupReferenceTimestamp && p[1].Group.Identifier == groupCurrent.Identifier);
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

    var [content, w] = table.createStatisticsTable(tablePlayers, joined, kicked, sortBy, sortStyle);

    $('#gd-table').html(content);
    $('#gd-table').css('position', 'absolute');
    $('#gd-table').css('width', `${ w }px`);
    $('#gd-table').css('left', `calc(50vw - 9px - ${ w / 2 }px)`);
    if ($('#gd-table').css('left').slice(0, -2) < 0) {
        $('#gd-table').css('left', '0px');
    }

    $('[data-player]').on('click', function () {
        Handle.call(EVT_PLAYER_LOAD, $(this).attr('data-player'), State.getGroupTimestamp());
    });

    $('[data-sortable]').on('click', function () {
        var header = $(this).attr('data-sortable-key');
        State.setSort(header, State.getSort() == header ? (State.getSortStyle() + 1) % 3 : 1);
        Handle.call(EVT_GROUP_LOAD_TABLE);
    });

    $('#context-members').context('bind', $('[data-player]'));
});

Handle.bind(EVT_PLAYER_LOAD, function (identifier, timestamp) {
    var config = State.getGroupID() ? Settings.load(State.getGroupID()) : Settings.load();
    var player = Database.Players[identifier][timestamp];

    $('#modal-player').html(`
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
                        ${ player.Fortress.Upgrade.Building ? `
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
    $('#modal-player').modal({
        centered: false,
        transition: 'fade'
    }).modal('show');
});

// Initialization
Handle.bind(EVT_INIT, function () {
    // Initialize all UI elements
    Object.values(UI).forEach(e => e.init());

    $('#context-players').context('create', {
        items: [
            {
                label: 'Show / Hide',
                action: (source) => {
                    State.hideByID(source.attr('data-player'));
                    Handle.call(EVENT_PLAYERS_REFRESH);
                }
            },
            {
                label: 'Copy',
                action: (source) => {
                    Handle.call(EVENT_COPY_PLAYER, Database.Players[source.attr('data-player')][source.attr('data-timestamp')]);
                }
            },
            {
                label: 'Remove permanently',
                action: (source) => {
                    Storage.removeByID(source.attr('data-player'));
                    Handle.call(EVENT_PLAYERS_REFRESH);
                }
            }
        ]
    });

    $('#context-groups').context('create', {
        items: [
            {
                label: 'Show / Hide',
                action: (source) => {
                    State.hideByID(source.attr('data-group-id'));
                    Handle.call(EVT_BROWSE_LOAD);
                }
            },
            {
                label: 'Remove permanently',
                action: (source) => {
                    Storage.removeByID(source.attr('data-group-id'));
                    Handle.call(EVT_BROWSE_LOAD);
                }
            }
        ]
    });

    $('#context-ownplayers').context('create', {
        items: [
            {
                label: 'Show / Hide',
                action: (source) => {
                    State.hideByID(source.attr('data-player-id'));
                    Handle.call(EVENT_OWNPLAYERS_LOAD);
                }
            },
            {
                label: 'Copy',
                action: (source) => {
                    Handle.call(EVENT_COPY_PLAYER, Database.Players[source.attr('data-player-id')].Latest);
                }
            },
            {
                label: 'Remove permanently',
                action: (source) => {
                    Storage.removeByID(source.attr('data-player-id'));
                    Handle.call(EVENT_OWNPLAYERS_LOAD);
                }
            }
        ]
    });

    $('#context-members').context('create', {
        items: [
            {
                label: 'Copy',
                action: (source) => {
                    Handle.call(EVENT_COPY_PLAYER, Database.Players[source.attr('data-player')].Latest);
                }
            }
        ]
    });

    // Player search
    $('#psearch').on('change', function () {
        var terms = $('#psearch').val().toLowerCase().split(' ').filter(term => term.trim().length);
        var items = [];

        var tp = Number(State.playersTimestamp);

        var table = State.getCachedTable();
        var tablePlayers = new PlayersTableArray();

        for (var player of Object.values(Database.Players)) {
            var hidden = State.getHidden().includes(player.Latest.Identifier);
            if (!State.showHiddenPlayers && hidden) {
                continue;
            }

            var x = player.List.find(x => x[0] <= tp);
            if (x) {
                var p = x[1];
                var matches = terms.reduce((total, term) => total + ((p.Name.toLowerCase().includes(term) || p.Prefix.includes(term) || PLAYER_CLASS_SEARCH[p.Class].includes(term) || (p.hasGuild() && p.Group.Name.toLowerCase().includes(term))) ? 1 : 0), 0);
                if (matches == terms.length) {
                    tablePlayers.add(p, p.Timestamp == tp, hidden);
                }
            }
        }

        var sortStyle = State.getSortStyle();
        var sortBy = State.getSort();

        var [content, w] = table.createPlayersTable(tablePlayers, sortBy, sortStyle);

        $('#pl-table').html(content);
        $('#pl-table').css('position', 'absolute');
        $('#pl-table').css('width', `${ w }px`);
        $('#pl-table').css('left', `calc(50vw - 9px - ${ w / 2 }px)`);
        if ($('#pl-table').css('left').slice(0, -2) < 0) {
            $('#pl-table').css('left', '0px');
        }

        $('#pl-table [data-sortable]').on('click', function () {
            var header = $(this).attr('data-sortable-key');
            State.setSort(header, State.getSort() == header ? (State.getSortStyle() + 1) % 3 : 1);
            $('#psearch').trigger('change');
        });

        $('#pl-table [data-player]').on('click', function () {
            Handle.call(EVT_PLAYER_LOAD, $(this).attr('data-player'), $(this).attr('data-timestamp'));
        });

        $('#context-players').context('bind', $('#pl-table [data-player]'));
    });

    // Settings syntax highlighting
    function enableHighlighting (el) {
        var $a = el;
        var $b = $a.children('.ta-content');
        var $c = $a.children('textarea');
        $b.css('top', $c.css('padding-top'));
        $b.css('left', $c.css('padding-left'));
        $b.css('font', $c.css('font'));
        $b.css('font-family', $c.css('font-family'));
        $b.css('line-height', $c.css('line-height'));
        $c.on('input', function () {
            var val = $(this).val();
            $b.html(SettingsParser.format(val));
        });
        $c.trigger('input');
        $c.on('scroll', function () {
            var sy = $(this).scrollTop();
            var sx = $(this).scrollLeft();
            $b.css('transform', `translate(${ -sx }px, ${ -sy }px)`);
            $b.css('clip-path', `inset(${ sy }px ${ sx }px 0px 0px)`);
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
            <a class="item" data-tab="tab5">Custom</a>
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
                    <div class="five wide column">
                        <code>outdated</code>
                    </div>
                    <div class="eleven wide column">
                        Displays outdated rows in red color. This option is enabled by default.
                    </div>
                    <div class="five wide column">
                        <code>performance</code>
                    </div>
                    <div class="eleven wide column">
                        Limits the number of displayed entries to specified number.
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
            You can use any of the predefined constants below (applies to <code>expr</code>, <code>value</code> and <code>color</code>). All constants are prefixed by the character <code>@</code>.</br>
            </br>
            <b>Predefined constants</b>:</br>
            </br>
            <div class="ui five column css-compact-grid grid">
                ${ Object.keys(SettingsConstants).map(c => `<div class="left aligned column"><code>${ c }</code></div>`).join('') }
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab1">
            <b>Options</b>:</br>
            You can use options to customize headers and categories. Place them before first category to apply them to everything, or after creating a category to apply them only to the category. Place them after a header to affect single header.</br>
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
                    <code>extra WORD</code>
                </div>
                <div class="eleven wide column">
                    Appends word to all cells in the column.
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
                    <code>grail BOOL</code>
                </div>
                <div class="eleven wide column">
                    Show whether player has found the Holy Grail. Has effect only on <code>Album</code> header.
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
                    <code>expr EXPRESSION</code>
                </div>
                <div class="eleven wide column">
                    This option is required for custom headers and contains the expression of the value you want to show.
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
                ${ Object.keys(ReservedCategories).map(c => `<div class="left aligned column"><code>${ c }</code></div>`).join('') }
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab4">
            <b>Predefined headers</b>:</br>
            These headers are reserved and already contain a path. If you want to have a custom header with the same name as a reserved header, you will have to use different name and then rename them using the <code>alias</code> option.</br>
            </br>
            <div class="ui three column css-compact-grid grid">
                ${ Object.keys(ReservedHeaders).map(c => `<div class="left aligned column"><code>${ c }</code></div>`).join('') }
            </div>
        </div>
        <div class="ui tab basic segment padding-none" data-tab="tab5">
            <b>Custom headers</b>:</br>
            You can create your own header by specifying expression using the <code>expr</code> option.</br>
            </br>
            <div>
            You can use most common mathematical operators and functions to build a expression that suits your needs. Furthermore, the expressions accept any constants, including any of reserved header names or custom paths.</br>
            </div>
            </br>
            <b>Available operators and functions:</b></br>
            </br>
            <div class="ui text-center css-compact-grid grid">
                <div class="four wide column">
                    <code>( a )</code>
                </div>
                <div class="four wide column">
                    <code>a + b</code>
                </div>
                <div class="four wide column">
                    <code>a - b</code>
                </div>
                <div class="four wide column">
                    <code>a * b</code>
                </div>
                <div class="four wide column">
                    <code>a / b</code>
                </div>
                <div class="four wide column">
                    <code>a && b</code>
                </div>
                <div class="four wide column">
                    <code>a || b</code>
                </div>
                <div class="four wide column">
                    <code>a ? b : c</code>
                </div>
                <div class="four wide column">
                    <code>a > b</code>
                </div>
                <div class="four wide column">
                    <code>a >= b</code>
                </div>
                <div class="four wide column">
                    <code>a < b</code>
                </div>
                <div class="four wide column">
                    <code>a <= b</code>
                </div>
                <div class="four wide column">
                    <code>a == b</code>
                </div>
                <div class="four wide column">
                    <code>min(a, b)</code>
                </div>
                <div class="four wide column">
                    <code>max(a, b)</code>
                </div>
                <div class="four wide column">
                    <code>ceil(a)</code>
                </div>
                <div class="four wide column">
                    <code>floor(a)</code>
                </div>
                <div class="four wide column">
                    <code>trunc(a)</code>
                </div>
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

    // Extra settings
    if (Settings.exists('players')) {
        $('#pl-settings')[0].style.setProperty('background', '#21ba45', 'important');
        $('#pl-settings')[0].style.setProperty('color', 'white', 'important');
    } else {
        $('#pl-settings')[0].style.setProperty('background', '');
        $('#pl-settings')[0].style.setProperty('color', '');
    }

    var values = [];
    for (var file of Object.values(Storage.files())) {
        values.push({
            name: formatDate(file.timestamp),
            value: file.timestamp,
            selected: file.timestamp == Database.Latest
        });
    }
    values.sort((a, b) => b.value - a.value);

    $('#pl-dropdown').dropdown({
        values: values
    }).dropdown('setting', 'onChange', function (value, text) {
        State.playersTimestamp = value;
        Handle.call(EVENT_PLAYERS_REFRESH);
    });

    State.playersTimestamp = Database.Latest;
    $('#psearch').val('').trigger('change');
});

Handle.bind(EVENT_PLAYERS_REFRESH, function () {
    $('#psearch').trigger('change');
});
