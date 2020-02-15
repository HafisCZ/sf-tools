// Event types
const EVT_NONE = 0;
const EVT_SHOWSCREEN = 1;
const EVT_SHOWERROR = 2;
const EVT_INIT = 5;

const EVT_GROUP_SHOW = 1000; // Show
const EVT_GROUP_SORT = 1001; // Toggle sort mode
const EVT_GROUP_LOAD_TABLE = 1002; // Load table
const EVT_GROUP_LOAD_HEADER = 1003; // Load header
const EVT_GROUP_SAVE = 1004; // Save as image
const EVT_GROUP_COPY = 1005; // Copy table
const EVT_GROUP_SETTINGS_SHOW = 1010; // Show group settings
const EVT_GROUP_SETTINGS_LOAD = 1011; // Load group settings
const EVT_GROUP_SETTINGS_SAVE = 1012; // Save group settings
const EVT_GROUP_SETTINGS_CLEAR = 1013; // Clear group settings

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

const EVT_SHOWCRITICAL = 6;

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
    // Prepare list
    var groups = Object.values(Database.Groups).filter(group => group.Latest.Own);
    groups.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

    var content = '';
    groups.forEach(function (group, index, array) {
        content += `
            ${ index % 5 == 0 ? '<div class="row">' : '' }
            <div class="column">
                <div class="ui segment clickable ${Database.Latest != group.LatestTimestamp ? 'border-red' : ''}" data-group-id="${group.Latest.Identifier}">
                    <img class="ui medium centered image" src="res/group.png">
                    <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ group.Latest.Prefix }</h3>
                    <h3 class="ui margin-none-top centered header">${group.Latest.Name}</h3>
                </div>
            </div>
            ${ ((index % 5 == 4) || index >= array.length - 1) ? '</div>' : '' }
        `;
    });

    // Show list
    $('#container-browse-grid').html(content);

    // Show group detail
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
                    <div class="ui two columns grid player-small">
                        <div class="left aligned column font-big">Strength</div>
                        <div class="column">${ player.Strength.Total }</div>
                        <div class="left aligned column font-big">Dexterity</div>
                        <div class="column">${ player.Dexterity.Total }</div>
                        <div class="left aligned column font-big">Intelligence</div>
                        <div class="column">${ player.Intelligence.Total }</div>
                        <div class="left aligned column font-big">Constitution</div>
                        <div class="column">${ player.Constitution.Total }</div>
                        <div class="left aligned column font-big">Luck</div>
                        <div class="column">${ player.Luck.Total }</div>
                        <div class="column"><br></div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Armor</div>
                        <div class="column">${ player.Armor }</div>
                        <div class="left aligned column font-big">Damage</div>
                        <div class="column">${ player.Damage.Min } - ${ player.Damage.Max }</div>
                        <div class="column"><br></div>
                        <div class="column"></div>
                        ${ player.hasGuild() ? `
                            ${ player.Group.Own ? `
                                <div class="left aligned column font-big">Treasure</div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Group.Treasure, config.getEntrySafe('Treasure').color) };">${ player.Group.Treasure }</div>
                                <div class="left aligned column font-big">Instructor</div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Group.Instructor, config.getEntrySafe('Instructor').color) }">${ player.Group.Instructor }</div>
                                <div class="left aligned column font-big">Pet</div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Group.Pet, config.getEntrySafe('Pet').color) }">${ player.Group.Pet }</div>
                                <div class="left aligned column font-big">Knights</div>
                                <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Knights, config.getEntrySafe('Knights').color) }">${ player.Fortress.Knights }</div>
                                <div class="column"><br></div>
                                <div class="column"></div>
                            ` : '' }
                            <div class="left aligned column font-big">Guild</div>
                            <div class="column">${ player.Group.Name }</div>
                            <div class="left aligned column font-big">Guild join date</div>
                            <div class="column">${ formatDate(player.Group.Joined) }</div>
                            ${ player.Group.Role != -1 ? `
                                <div class="left aligned column font-big">Role</div>
                                <div class="column">${ GROUP_ROLES[player.Group.Role] }</div>
                            ` : '' }
                        ` : '' }
                        ${ player.Fortress.Upgrade.Building ? `
                            <div class="column"><br></div>
                            <div class="column"></div>
                            <div class="left aligned column font-big">Currently building</div>
                            <div class="column">${ FORTRESS_BUILDINGS[player.Fortress.Upgrade.Building] }</div>
                            <div class="left aligned column font-big"></div>
                            <div class="column">${ formatDate(player.Fortress.Upgrade.Finish) }</div>
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
                        <div class="left aligned column font-big">Fortress</div>
                        <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Fortress, config.getEntrySafe('Fortress').color) }">${ player.Fortress.Fortress }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Upgrades</div>
                        <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Upgrades, config.getEntrySafe('Upgrades').color) }">${ player.Fortress.Upgrades }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Honor</div>
                        <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.Honor, config.getEntrySafe('Honor').color) }">${ player.Fortress.Honor }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Gem Mine</div>
                        <div class="column" style="color: ${ CompareEval.evaluate(player.Fortress.GemMine, config.getEntrySafe('GemMine').color) }">${ player.Fortress.GemMine }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Treasury</div>
                        <div class="column">${ player.Fortress.Treasury }</div>
                        <div class="column"></div>
                        <div class="column"><br></div>
                        <div class="column"></div>
                        <div class="column"></div>
                        ${ player.Fortress.Fortifications ? `
                            <div class="left aligned column font-big">Wall</div>
                            <div class="column">${ player.Fortress.Fortifications }</div>
                            <div class="left aligned column">${ player.Fortress.Wall }</div>
                        ` : '' }
                        ${ player.Fortress.Barracks ? `
                            <div class="left aligned column font-big">Warriors</div>
                            <div class="column">${ player.Fortress.Barracks * 3 }x</div>
                            <div class="left aligned column">${ player.Fortress.Warriors }</div>
                        ` : '' }
                        ${ player.Fortress.ArcheryGuild ? `
                            <div class="left aligned column font-big">Archers</div>
                            <div class="column">${ player.Fortress.ArcheryGuild * 2 }x</div>
                            <div class="left aligned column">${ player.Fortress.Archers }</div>
                        ` : '' }
                        ${ player.Fortress.MageTower ? `
                            <div class="left aligned column font-big">Mages</div>
                            <div class="column">${ player.Fortress.MageTower }x</div>
                            <div class="left aligned column">${ player.Fortress.Mages }</div>
                        ` : '' }
                    </div>
                </div>
            </div>
        </div>
    `);
    $('#modal-player').modal({
        centered: false
    }).modal('show');
});

// Show group settings
Handle.bind(EVT_GROUP_SETTINGS_SHOW, function () {
    $('#modal-custom-settings').modal({
        centered: false
    }).modal('show');
    Handle.call(EVT_GROUP_SETTINGS_LOAD);
});

// Load group settings
Handle.bind(EVT_GROUP_SETTINGS_LOAD, function () {
    $('#sc-code textarea').val(Settings.load(State.getGroupID()).getCode());
    $('#sc-code textarea').trigger('input');
});

// Save group settings
Handle.bind(EVT_GROUP_SETTINGS_SAVE, function () {
    Settings.save($('#sc-code textarea').val(), State.getGroupID());
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVT_GROUP_LOAD_TABLE);
});

// Clear settings group
Handle.bind(EVT_GROUP_SETTINGS_CLEAR, function () {
    Settings.remove(State.getGroupID());
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVT_GROUP_LOAD_TABLE);
});

// Initialization
Handle.bind(EVT_INIT, function () {
    // Semantic elements
    $('.ui.dropdown').dropdown();
    $('.menu .item').tab();

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

    enableHighlighting($('#sc-code'));
    enableHighlighting($('#sg-code'));

    $('#sg-tutorial, #sc-tutorial').css('line-height', '20px');
    $('#sg-tutorial, #sc-tutorial').html(`
        <b>Global</b></br>
        <div>
            Any options used before creating a category will be applied to all headers.
        </div>
        </br>
        <b>Syntax</b></br>
        <div class="ui grid">
            <div class="one wide column"></div>
            <div class="five wide column">
                Create category</br>
                Create header</br>
                Show member list</br>
                Show indexes</br>
                Show difference</br>
                Show in statistics</br>
                Show hydra</br>
                Show potion sizes</br>
                Show as percentage</br>
                Show maximum knights</br>
                Set width</br>
                Set color rule</br>
                Set value rule</br>
                Specify path
            </div>
            <div class="ten wide column">
                <code>category NAME</code></br>
                <code>header NAME</code></br>
                <code>members BOOL</code></br>
                <code>indexed BOOL</code></br>
                <code>difference BOOL</code></br>
                <code>statistics BOOL</code></br>
                <code>hydra BOOL</code></br>
                <code>visible BOOL</code></br>
                <code>percentage BOOL</code></br>
                <code>maximum BOOL</code></br>
                <code>width NUMBER</code></br>
                <code>color RULE</code></br>
                <code>value RULE</code></br>
                <code>path PATH</code>
            </div>
        </div>
        </br>
        <div>
            <b>Bool values</b>: Use <code>on</code> to enable or <code>off</code> to disable an option
        </div>
        </br>
        <b>Predefined names</b></br>
        <div>
            <b>Headers</b>: ${ SP_KEYWORD_HEADER_RESERVED.map(c => `<code>${ c }</code>`).join(', ') }</br>
            <b>Categories</b>: ${ SP_KEYWORD_CATEGORY_RESERVED.map(c => `<code>${ c }</code>`).join(', ') }
        </div>
        </br>
        <b>Rules</b></br>
        <div>
            You can specify rule <code>default OUT</code> that will be used if none match.</br>
            Normal rules can be specified by using <code>FUNCTION VALUE OUT</code>.</br>
            <code>OUT</code> is a value or color that is shown when the rule is applied.</br>
            <code>VALUE</code> is a value used to determine if the rule should be applied.</br>
            <code>FUNCTION</code> can be any of: <code>equal</code>, <code>above</code>, <code>below</code>, <code>above or equal</code>, <code>below or equal</code>, <code>equal or above</code>, <code>below or above</code></br>
        </div>
        </br>
        <b>Other</b></br>
        <div>
            Write a line comment by adding <code>#</code> in front of it.</br>
            Use any of predefined constants:</br>
            ${ Object.keys(SP_KEYWORD_CONSTANTS).map(c => `<code>@${ c }</code>`).join(', ') }
        </div>
    `);
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

// Loading player list
Handle.bind(EVT_PLAYERS_LOAD, function () {
    State.unsetGroup();
    State.clearSort();
    State.cacheTable(new Table(Settings.load()));
    $('#psearch').val('').trigger('change');
});
