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

const EVT_FILES_LOAD = 3000;
const EVT_FILES_REMOVE = 3001;
const EVT_FILES_UPLOAD = 3002;
const EVT_FILES_IMPORT = 3003;
const EVT_FILES_EXPORT = 3004;

const EVT_BROWSE_LOAD = 4000;

const EVT_PLAYER_LOAD = 5000;

// Bindings
Handle.bind(EVT_NONE, function (... args) {
    console.log(... args);
});

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
                        <h3 class="ui margin-tiny-top header">${formatDate(new Date(file.timestamp))}</h3>
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

    $('[data-file-id]').on('click', function () {
        Handle.call(EVT_FILES_REMOVE, $(this).attr('data-file-id'));
    });
});

Handle.bind(EVT_BROWSE_LOAD, function () {
    // Prepare list
    var groups = Object.values(Database.Groups).filter(group => group.Latest.Own);
    groups.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

    var content = [];
    groups.forEach(function (group, index, array) {
        if (index % 5 == 0) {
            content.push(`<div class="row">`);
        }

        var splitPrefix = group.Latest.Prefix.split('_');

        content.push(`
            <div class="column">
                <div class="ui segment clickable ${Database.Latest != group.LatestTimestamp ? 'border-red' : ''}" data-group-id="${group.Latest.Identifier}">
                    <img class="ui medium centered image" src="res/group.png">
                    <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${splitPrefix[0]} ${splitPrefix[1]}</h3>
                    <h3 class="ui margin-none-top centered header">${group.Latest.Name}</h3>
                </div>
            </div>
        `);

        if ((index % 5 == 4) || index >= array.length - 1) {
            content.push(`</div>`);
        }
    });

    // Show list
    $('#container-browse-grid').html(content.join(''));

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
        logging: false
    }).then(function (canvas) {
        canvas.toBlob(function (blob) {
            window.download(`${ State.getGroupCurrent().Name }.${ State.getGroupTimestamp() }${ State.getGroupReferenceTimestamp() != State.getGroupTimestamp() ? `.${ State.getGroupReferenceTimestamp() }` : '' }.png`, blob);
        });
    });
});

Handle.bind(EVT_GROUP_COPY, function () {
    var range = document.createRange();
    range.selectNode(document.getElementById('container-detail-screenshot'));

    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
});

Handle.bind(EVT_GROUP_LOAD_HEADER, function () {
    var group = State.getGroup();

    var listSelect = [];
    var listReference = [];
    for (var [index, obj] of getReverseIterator(group.List)) {
        listSelect.push({
            name: formatDate(new Date(obj.timestamp)),
            value: obj.timestamp,
            selected: obj.timestamp == State.getGroupTimestamp()
        });

        if (obj.timestamp <= State.getGroupTimestamp()) {
            listReference.push({
                name: formatDate(new Date(obj.timestamp)),
                value: obj.timestamp
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
    for (var memberID of groupCurrent.MemberIDs) {
        if (Database.Players[memberID] && Database.Players[memberID][groupCurrentTimestamp]) {
            members.push(Database.Players[memberID][groupCurrentTimestamp]);
        } else {
            members.push(groupCurrent.getFakePlayer(memberID));
        }
    }

    // Reference members
    var membersReferences = [];
    for (var member of members) {
        if (member.IsFake && groupCurrentTimestamp == groupReferenceTimestamp) {
            membersReferences.push(member);
        } else {
            var player = Database.Players[member.Identifier];
            if (player) {
                var playerReference = player[groupReferenceTimestamp];

                if (playerReference && playerReference.Group && playerReference.Group.Name == groupCurrent.Name) {
                    membersReferences.push(playerReference);
                } else {
                    membersReferences.push(player.List.find(p => p.player.Group && p.player.Group.Name == groupCurrent.Name).player);
                }
            } else {
                membersReferences.push(member);
            }
        }
    }

    // Sort members if requested
    if (State.isSorted()) {
        members.sort((a, b) => b.Level - a.Level);
    }

    // Table columns
    if (Config.exists(groupCurrent.Identifier)) {
        $('#container-detail-settings')[0].style.setProperty('background', '#21ba45', 'important');
        $('#container-detail-settings')[0].style.setProperty('color', 'white', 'important');
    } else {
        $('#container-detail-settings')[0].style.setProperty('background', '');
        $('#container-detail-settings')[0].style.setProperty('color', '');
    }

    // Load settings
    var config = new Config(groupCurrent.Identifier);

    // Create table
    var table = new Table(config.getData());
    var width = table.width();

    if (width < 1127) {
        $('#container-detail').css('width', '');
        $('#container-detail-screenshot').css('width', `${ width }px`);
        $('#container-detail-screenshot').css('margin', 'auto');
    } else {
        $('#container-detail').css('width', `${ width }px`);
        $('#container-detail-screenshot').css('width', '');
        $('#container-detail-screenshot').css('margin', '');
    }

    // Add players
    members.forEach(function (player) {
        var compare = membersReferences.find(c => c.Identifier == player.Identifier);
        if (!player.IsFake) {
            table.addPlayer(player, compare);
        }
    });

    $('#container-detail-content').html(table.toString());

    // Kicked & Joined
    var kicked = groupReference.MemberIDs.filter(g => !groupCurrent.MemberIDs.includes(g)).map(g => Database.Players[g] ? Database.Players[g].Latest.Name : groupReference.Members[groupReference.MemberIDs.indexOf(g)]);
    var joined = groupCurrent.MemberIDs.filter(g => !groupReference.MemberIDs.includes(g)).map(g => Database.Players[g] ? Database.Players[g].Latest.Name : groupCurrent.Members[groupCurrent.MemberIDs.indexOf(g)]);

    var classes = [ 0, 0, 0, 0, 0, 0 ];
    members.forEach(player => classes[player.Class - 1]++);

    var clevel = config.findEntry('Level');
    var ctreasure = config.findEntry('Treasure');
    var cinstructor = config.findEntry('Instructor');
    var cpet = config.findEntry('Pet');
    var cknights = config.findEntry('Knights');
    var clength = (clevel ? 1 : 0) + (ctreasure ? 1 : 0) + (cinstructor ? 1 : 0) + (cpet ? 1 : 0) + (cknights ? 1 : 0);

    if (config.getData().group) {
        $('#container-detail-stats').html(`
            <tbody>
                ${ clength ? `
                    <tr>
                        <td width="${ 249 + (width % 2 ? 0 : 1) }" class="border-right-thin"></td>
                        ${ clevel ? `<td>Level</td>` : '' }
                        ${ ctreasure ? `<td>Treasure</td>` : '' }
                        ${ cinstructor ? `<td>Instructor</td>` : '' }
                        ${ cpet ? `<td>Pet</td>` : '' }
                        ${ cknights ? `<td>Knights</td>` : '' }
                    </tr>
                    <tr>
                        <td class="border-bottom-thick border-right-thin"></td>
                        ${ clevel ? `<td class="border-bottom-thick" colspan="${ Math.max(3, clength) }"></td>` : '' }
                    </tr>
                    <tr>
                    <td class="border-right-thin">Minimum</td>
                        ${ clevel ? Cell.Cell(groupCurrent.Levels.Min + (clevel.diff ? Cell.Difference(groupCurrent.Levels.Min - groupReference.Levels.Min, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Levels.Min, clevel.colors)) : '' }
                        ${ ctreasure ? Cell.Cell(groupCurrent.Treasures.Min + (ctreasure.diff ? Cell.Difference(groupCurrent.Treasures.Min - groupReference.Treasures.Min, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Treasures.Min, ctreasure.colors)) : '' }
                        ${ cinstructor ? Cell.Cell(groupCurrent.Instructors.Min + (cinstructor.diff ? Cell.Difference(groupCurrent.Instructors.Min - groupReference.Instructors.Min, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Instructors.Min, cinstructor.colors)) : '' }
                        ${ cpet ? Cell.Cell(groupCurrent.Pets.Min + (cpet.diff ? Cell.Difference(groupCurrent.Pets.Min - groupReference.Pets.Min, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Pets.Min, cpet.colors)) : '' }
                        ${ cknights ? Cell.Cell(groupCurrent.Knights.Min + (cknights.diff ? Cell.Difference(groupCurrent.Knights.Min - groupReference.Knights.Min, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Knights.Min, cknights.colors)) : '' }
                    </tr>
                    <td class="border-right-thin">Average</td>
                        ${ clevel ? Cell.Cell(groupCurrent.Levels.Avg.toFixed(0) + (clevel.diff ? Cell.Difference((groupCurrent.Levels.Avg - groupReference.Levels.Avg).toFixed(0), config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Levels.Avg, clevel.colors)) : '' }
                        ${ ctreasure ? Cell.Cell(groupCurrent.Treasures.Avg.toFixed(0) + (ctreasure.diff ? Cell.Difference((groupCurrent.Treasures.Avg - groupReference.Treasures.Avg).toFixed(0), config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Treasures.Avg, ctreasure.colors)) : '' }
                        ${ cinstructor ? Cell.Cell(groupCurrent.Instructors.Avg.toFixed(0) + (cinstructor.diff ? Cell.Difference((groupCurrent.Instructors.Avg - groupReference.Instructors.Avg).toFixed(0), config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Instructors.Avg, cinstructor.colors)) : '' }
                        ${ cpet ? Cell.Cell(groupCurrent.Pets.Avg.toFixed(0) + (cpet.diff ? Cell.Difference((groupCurrent.Pets.Avg - groupReference.Pets.Avg).toFixed(0), config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Pets.Avg, cpet.colors)) : '' }
                        ${ cknights ? Cell.Cell(groupCurrent.Knights.Avg.toFixed(0) + (cknights.diff ? Cell.Difference((groupCurrent.Knights.Avg - groupReference.Knights.Avg).toFixed(0), config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Knights.Avg, cknights.colors)) : '' }
                    </tr>
                    <td class="border-right-thin">Maximum</td>
                        ${ clevel ? Cell.Cell(groupCurrent.Levels.Max + (clevel.diff ? Cell.Difference(groupCurrent.Levels.Max - groupReference.Levels.Max, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Levels.Max, clevel.colors)) : '' }
                        ${ ctreasure ? Cell.Cell(groupCurrent.Treasures.Max + (ctreasure.diff ? Cell.Difference(groupCurrent.Treasures.Max - groupReference.Treasures.Max, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Treasures.Max, ctreasure.colors)) : '' }
                        ${ cinstructor ? Cell.Cell(groupCurrent.Instructors.Max + (cinstructor.diff ? Cell.Difference(groupCurrent.Instructors.Max - groupReference.Instructors.Max, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Instructors.Max, cinstructor.colors)) : '' }
                        ${ cpet ? Cell.Cell(groupCurrent.Pets.Max + (cpet.diff ? Cell.Difference(groupCurrent.Pets.Max - groupReference.Pets.Max, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Pets.Max, cpet.colors)) : '' }
                        ${ cknights ? Cell.Cell(groupCurrent.Knights.Max + (cknights.diff ? Cell.Difference(groupCurrent.Knights.Max - groupReference.Knights.Max, config.brackets) : ''), Color.NONE, Color.Get(groupCurrent.Knights.Max, cknights.colors)) : '' }
                    </tr>
                ` : '' }
                <tr>
                    <td colspan="${ 1 + Math.max(clength, 3) }" class="border-bottom-thick"></td>
                </tr>
                <tr>
                    <td class="border-right-thin">Warrior</td>
                    <td>${ classes[0] }</td>
                    <td class="border-right-thin">Assassin</td>
                    <td>${ classes[3] }</td>
                    ${ clength > 3 ? '<td></td>' : '' }
                    ${ clength > 4 ? '<td></td>' : '' }
                </tr>
                <tr>
                    <td class="border-right-thin">Mage</td>
                    <td>${ classes[1] }</td>
                    <td class="border-right-thin">Battle Mage</td>
                    <td>${ classes[4] }</td>
                    ${ clength > 3 ? '<td></td>' : '' }
                    ${ clength > 4 ? '<td></td>' : '' }
                </tr>
                <tr>
                    <td class="border-right-thin">Scout</td>
                    <td>${ classes[2] }</td>
                    <td class="border-right-thin">Berserker</td>
                    <td>${ classes[5] }</td>
                    ${ clength > 3 ? '<td></td>' : '' }
                    ${ clength > 4 ? '<td></td>' : '' }
                </tr>
                <tr>
                    <td colspan="${ 1 + Math.max(clength, 3) }" ${ config.getData().group == 2 && (joined.length > 0 || kicked.length > 0) ? 'class="border-bottom-thick"' : ''}></td>
                </tr>
                ${
                    config.getData().group == 2 && (joined.length > 0 || kicked.length > 0) ? `
                        <tr>
                            <td class="border-right-thin">Joined</td>
                            <td colspan="5">${ joined.join(', ') }</td>
                        </tr>
                        <tr>
                            <td class="border-right-thin">Kicked</td>
                            <td colspan="5">${ kicked.join(', ') }</td>
                        </tr>
                    ` : ''
                }
            </tbody>
        `);
    } else {
        $('#container-detail-stats').html('');
    }

    $('[data-player]').on('click', function () {
        Handle.call(EVT_PLAYER_LOAD, $(this).attr('data-player'), State.getGroupTimestamp());
    });
});

Handle.bind(EVT_PLAYER_LOAD, function (identifier, timestamp) {
    var config = new Config(State.getGroupID());
    var player = Database.Players[identifier][timestamp];

    $('#modal-player').html(`
        <div class="ui text-center extreme header margin-none-bottom padding-none-bottom">${ player.Name }</div>
        <div class="ui text-center huge header padding-none-top margin-remove-top">${ PLAYER_CLASS[player.Class] } ${ player.Level }</div>
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
                        <div class="left aligned column font-big">Treasure</div>
                        <div class="column" style="color: ${ Color.Get(player.Group.Treasure, config.findEntrySafe('Treasure').colors) };">${ player.Group.Treasure }</div>
                        <div class="left aligned column font-big">Instructor</div>
                        <div class="column" style="color: ${ Color.Get(player.Group.Instructor, config.findEntrySafe('Instructor').colors) }">${ player.Group.Instructor }</div>
                        <div class="left aligned column font-big">Pet</div>
                        <div class="column" style="color: ${ Color.Get(player.Group.Pet, config.findEntrySafe('Pet').colors) }">${ player.Group.Pet }</div>
                        <div class="left aligned column font-big">Knights</div>
                        <div class="column" style="color: ${ Color.Get(player.Fortress.Knights, config.findEntrySafe('Knights').colors) }">${ player.Fortress.Knights }</div>
                        <div class="column"><br></div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Guild join date</div>
                        <div class="column">${ formatDate(player.Group.Joined) }</div>
                        <div class="left aligned column font-big">Role</div>
                        <div class="column">${ GROUP_ROLES[player.Group.Role] }</div>
                    </div>
                </div>
                <div class="column">
                    <div class="ui three columns grid player-small">
                        <div class="left aligned column font-big">Scrapbook</div>
                        <div class="column" style="color: ${ Color.Get(100 * player.Book / SCRAPBOOK_COUNT, config.findEntrySafe('Album').colors) }">${ Number(100 * player.Book / SCRAPBOOK_COUNT).toFixed(2) }%</div>
                        <div class="column">${ player.Book } out of ${ SCRAPBOOK_COUNT }</div>
                        <div class="left aligned column font-big">Mount</div>
                        <div class="column" style="color: ${ Color.Get(player.Mount, config.findEntrySafe('Mount').colors) }">${ player.Mount ? (PLAYER_MOUNT[player.Mount] + '%') : 'None' }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Achievements</div>
                        <div class="column" style="color: ${ Color.Get(player.Achievements.Owned, config.findEntrySafe('Awards').colors) }">${ Math.trunc(100 * player.Achievements.Owned / ACHIEVEMENT_COUNT) }%${ config.findEntrySafe('Awards').hydra && player.Achievements.Dehydration ? '<span> H</span>' : '' }</div>
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
                        <div class="column" style="color: ${ Color.Get(player.Potions[0].Size, config.findEntrySafe('Potions').colors) }">${ player.Potions[0].Size ? `${ player.Potions[0].Size }%` : '' }</div>
                        <div class="left aligned column">${ player.Potions[0].Size ? POTIONS[player.Potions[0].Type] : '' }</div>
                        <div class="left aligned column font-big"><br></div>
                        <div class="column" style="color: ${ Color.Get(player.Potions[1].Size, config.findEntrySafe('Potions').colors) }">${ player.Potions[1].Size ? `${ player.Potions[1].Size }%` : '' }</div>
                        <div class="left aligned column">${ player.Potions[1].Size ? POTIONS[player.Potions[1].Type] : '' }</div>
                        <div class="left aligned column font-big"><br></div>
                        <div class="column" style="color: ${ Color.Get(player.Potions[2].Size, config.findEntrySafe('Potions').colors) }">${ player.Potions[2].Size ? `${ player.Potions[2].Size }%` : '' }</div>
                        <div class="left aligned column">${ player.Potions[2].Size ? POTIONS[player.Potions[2].Type] : '' }</div>
                        <div class="column"><br></div>
                        <div class="column"></div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Fortress</div>
                        <div class="column" style="color: ${ Color.Get(player.Fortress.Fortress, config.findEntrySafe('Fortress').colors) }">${ player.Fortress.Fortress }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Upgrades</div>
                        <div class="column" style="color: ${ Color.Get(player.Fortress.Upgrades, config.findEntrySafe('Upgrades').colors) }">${ player.Fortress.Upgrades }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Honor</div>
                        <div class="column" style="color: ${ Color.Get(player.Fortress.Honor, config.findEntrySafe('Honor').colors) }">${ player.Fortress.Honor }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Gem Mine</div>
                        <div class="column" style="color: ${ Color.Get(player.Fortress.GemMine, config.findEntrySafe('GemMine').colors) }">${ player.Fortress.GemMine }</div>
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

Handle.bind(EVT_GROUP_SETTINGS_SHOW, function () {
    $('#modal-custom-settings').modal({
        centered: false
    }).modal('show');
    Handle.call(EVT_GROUP_SETTINGS_LOAD);
});

Handle.bind(EVT_GROUP_SETTINGS_LOAD, function () {
    var data = new Config(State.getGroupID()).getData();
    $('#modal-custom-settings-manual').val(JSON.stringify(data, null, 1));
    fillStandartConfiguration(data, true);

    $('.ui.dropdown').dropdown();
});

Handle.bind(EVT_GROUP_SETTINGS_SAVE, function () {
    try {
        var config = JSON.parse($('#modal-custom-settings-manual').val());
        if (!config.categories) {
            throw 'iconf';
        }
        Config.save(config, State.getGroupID());
        $('#modal-custom-settings').modal('hide');
        Handle.call(EVT_GROUP_LOAD_TABLE);
    } catch (exception) {
        $('#modal-custom-settings-manual').transition('shake');
    }
});

Handle.bind(EVT_GROUP_SETTINGS_CLEAR, function () {
    Config.remove(State.getGroupID());
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVT_GROUP_LOAD_TABLE);
});

Handle.bind(EVT_INIT, function () {
    let highlighting = `
        ${ UI.getHLEntryBlock('Level', 'level') }
        ${ UI.getHLEntryBlock('Scrapbook', 'scrapbook') }
        ${ UI.getHLDropdownBlock('Mount', 'mount', { 0: 'None', 1: '10%', 2: '20%', 3: '30%', 4: '50%' }) }
        ${ UI.getHLEntryBlock('Achievements', 'achievements') }
        ${ UI.getHLDropdownBlock('Potions', 'potions', { 0: 'None', 10: '10%', 15: '15%', 25: '25%' }) }
        ${ UI.getHLEntryBlock('Guild Treasure', 'treasure') }
        ${ UI.getHLEntryBlock('Guild Instructor', 'instructor') }
        ${ UI.getHLEntryBlock('Pet', 'pet') }
        ${ UI.getHLEntryBlock('Knights', 'knights') }
        ${ UI.getHLEntryBlock('Fortress', 'fortress') }
        ${ UI.getHLEntryBlock('Gem Mine', 'gemmine') }
        ${ UI.getHLEntryBlock('Fortress Upgrades', 'fortressupgrades') }
        ${ UI.getHLDiffBlock('Fortress Honor', 'fortresshonor') }
    `;

    let layout = `
        <div class="two fields">
            ${ UI.getDLBlock('Player Class', 'show-class', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Player ID', 'show-id', [ 'Hide', 'Show' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Player Rank', 'show-rank', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Group Role', 'show-role', [ 'Hide', 'Show' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Achievements', 'show-achievements', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Hydra', 'show-hydra', [ 'Hide', 'Icon' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Scrapbook', 'show-book-style', [ 'Show percentage', 'Show item count' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Guild Treasure', 'show-treasure', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Fortress Honor', 'show-fortress-honor', [ 'Hide', 'Show' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Guild Instructor', 'show-instructor', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Fortress Upgrades', 'show-fortress-upgrades', [ 'Hide', 'Show' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Guild Pet', 'show-pet', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Gem Mine', 'show-gemmine', [ 'Hide', 'Show' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Knights', 'show-knights', [ 'Hide', 'Show', 'Show maximum' ]) }
            ${ UI.getDLBlock('Fortress', 'show-fortress', [ 'Hide', 'Show' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Group Statistics', 'show-group', [ 'Hide', 'Show', 'Show including Member History' ]) }
            ${ UI.getDLBlock('Difference Style', 'show-difference-style', [ 'Default', 'Brackets' ]) }
        </div>
        <div class="two fields">
            ${ UI.getDLBlock('Tower', 'show-tower', [ 'Hide', 'Show' ]) }
            ${ UI.getDLBlock('Portal', 'show-portal', [ 'Hide', 'Show' ]) }
        </div>
    `;

    $('#container-settings-highlighting').html(highlighting);
    $('#container-settings-layout').html(layout);

    $('#modal-custom-settings-highlighting').html(highlighting.replace(/data-settings/g, 'data-custom-settings'));
    $('#modal-custom-settings-layout').html(layout.replace(/data-settings/g, 'data-custom-settings'));

    $('#container-detail-sort').state();
    $('.ui.dropdown').dropdown();
    $('.ui.toggle.button:not(#container-detail-sort)').state({
        text: {
            inactive: 'Disabled',
            active: 'Enabled'
        }
    });
    $('.menu .item').tab();

    $('[data-settings]').on('change click', () => {
        $('#container-settings-manual').val(JSON.stringify(createConfigurationObject(false), null, 1));
    });

    $('[data-custom-settings]').on('change click', () => {
        $('#modal-custom-settings-manual').val(JSON.stringify(createConfigurationObject(true), null, 1));
    });
});

Handle.bind(EVT_SETTINGS_SAVE, function () {
    try {
        var config = JSON.parse($('#container-settings-manual').val());
        if (!config.categories) {
            throw 'iconf';
        }
        Config.save(config);
        Handle.call(EVT_SETTINGS_LOAD);
    } catch (exception) {
        $('#container-settings-manual').transition('shake');
    }
});

Handle.bind(EVT_SETTINGS_LOAD, function () {
    var data = new Config().getData();
    $('#container-settings-manual').val(JSON.stringify(data, null, 1));
    fillStandartConfiguration(data, false);

    $('.ui.dropdown').dropdown();
});
