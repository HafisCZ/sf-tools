// Event types
const EVT_NONE = 0;
const EVT_SHOWSCREEN = 1;
const EVT_SHOWERROR = 2;

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

Handle.bind(EVT_SETTINGS_SAVE, function () {
    var settings = {};
    if ($('[data-settings]:not(.button)').toArray().reduce((sum, element) => {
        var val = $(element).val();
        if (isNaN(val) || val < 0) {
            $(element).transition('shake');
            return sum + 1;
        } else {
            return sum;
        }
    }, 0) > 0) {
        return;
    }

    $('[data-settings]').toArray().forEach(function (element) {
        if ($(element).hasClass('button')) {
            settings[$(element).attr('data-settings')] = $(element).hasClass('active') ? 1 : 0;
        } else {
            settings[$(element).attr('data-settings')] = Number($(element).val());
        }
    });

    Preferences.set('settings', settings);
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
                        <div><i class="trash alternate glow outline icon" data-file-id="${index}"></i></div>
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

Handle.bind(EVT_SETTINGS_LOAD, function () {
    Object.entries(Preferences.get('settings', DEFAULT_SETTINGS)).forEach(function (keyval) {
        var key = keyval[0];
        var val = keyval[1];

        var element = $(`[data-settings="${key}"]`);
        if (element.hasClass('button')) {
            if (val) {
                setEnabled(element);
            } else {
                setDisabled(element);
            }
        } else {
            element.val(val);
        }
    });

    $('.ui.dropdown').dropdown();
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

    //console.log(group.LatestTimestamp, groupCurrentTimestamp, groupReferenceTimestamp);

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
    var prefs = Preferences.get(groupCurrent.Identifier, Preferences.get('settings', DEFAULT_SETTINGS));
    var header_name = 1;
    var header_general = prefs['show-class'] + prefs['show-id'] + prefs['show-rank'] + prefs['show-achievements'] + 3;
    var header_potions = 3;
    var header_group = prefs['show-treasure'] + prefs['show-instructor'] + prefs['show-pet'] + prefs['show-knights'] + (prefs['show-knights-style'] == 1 ? 1 : 0);
    var header_group_iter = header_group;

    // Table width
    var width = 659 + (prefs['show-class'] ? 120 : 0) + (prefs['show-id'] ? 100 : 0) + (prefs['show-rank'] ? 100 : 0) + (prefs['show-achievements'] ? 100 : 0) + (prefs['show-treasure'] ? 100 : 0) + (prefs['show-instructor'] ? 100 : 0) + (prefs['show-knights'] ? 100 : 0) + (prefs['show-knights-style'] == 1 ? 100 : 0);
    $('#container-detail').css('width', `${width + 130}px`);

    // Table header
    var table_header = `
        <thead>
            <tr>
                <td width="250" rowspan="2" colspan="1" class="border-right-thin">Name</td>
                <td rowspan="1" colspan="${ header_general }" class="border-right-thin">General</td>
                <td width="99" rowspan="2" colspan="3" ${ header_group ? 'class="border-right-thin"' : ''}>Potions</td>
                ${ header_group ? `<td rowspan="1" colspan="${ header_group }">Group</td>` : ''}
            </tr>
            <tr>
                ${ prefs['show-class'] ? '<td width="120">Class</td>' : '' }
                ${ prefs['show-id'] ? '<td width="100">ID</td>' : '' }
                ${ prefs['show-rank'] ? '<td width="100">Rank</td>' : '' }
                <td width="100">Level</td>
                <td width="130">Album</td>
                <td ${ prefs['show-achievements'] ? '' : 'class="border-right-thin"' } width="80">Mount</td>
                ${ prefs['show-achievements'] ? '<td class="border-right-thin" width="100">Awards</td>' : '' }
                ${ prefs['show-treasure'] ? `<td ${ header_group_iter-- <= 0 ? 'class="border-right-thin"' : '' } width="100">Treasure</td>` : '' }
                ${ prefs['show-instructor'] ? `<td ${ header_group_iter-- <= 0 ? 'class="border-right-thin"' : '' } width="100">Instructor</td>` : '' }
                ${ prefs['show-pet'] ? `<td ${ header_group_iter-- <= 0 ? 'class="border-right-thin"' : '' } width="100">Pet</td>` : '' }
                ${ prefs['show-knights'] ? `
                    <td width="100">Knights</td>
                    ${ prefs['show-knights-style'] == 1 ? '<td width="100">Fortress</td>' : '' }
                ` : '' }
            </tr>
            <tr>
                <td colspan="1" class="border-bottom-thick border-right-thin"></td>
                <td colspan="${ header_general }" class="border-bottom-thick border-right-thin"></td>
                <td colspan="3" class="border-bottom-thick border-right-thin"></td>
                ${ header_group ? `<td colspan="${ header_group }" class="border-bottom-thick"></td>` : '' }
            </tr>
        </thead>
        <tbody>
    `;

    // Table body
    var table_body = [];
    members.forEach(function (player) {
        var compare = membersReferences.find(c => c.Identifier == player.Identifier);

        if (player.IsFake) {
            table_body.push(`
                <tr>
                    <td class="border-right-thin muted">${ player.Name }</td>
                    ${ prefs['show-class'] ? `<td></td>` : '' }
                    ${ prefs['show-id'] ? `<td></td>` : '' }
                    ${ prefs['show-rank'] ? `<td></td>` : '' }
                    <td ${ prefs['level-enabled'] ? (player.Level >= prefs['level-req'] ? 'class="background-green"' : (player.Level >= prefs['level-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Level }${ (prefs['level-difference'] && player.Level != compare.Level) ? `<span> +${ player.Level - compare.Level }</span>` : '' }</td>
                    <td></td>
                    <td class="border-right-thin"></td>
                    ${ prefs['show-achievements'] ? `<td class="border-right-thin"></td>` : '' }
                    <td></td>
                    <td></td>
                    <td class="border-right-thin"></td>
                    ${ prefs['show-treasure'] ? `<td ${ prefs['treasure-enabled'] ? (player.Group.Treasure >= prefs['treasure-req'] ? 'class="background-green"' : (player.Group.Treasure >= prefs['treasure-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Group.Treasure }${ (prefs['treasure-difference'] && player.Group.Treasure != compare.Group.Treasure) ? `<span> +${ player.Group.Treasure - compare.Group.Treasure }</span>` : '' }</td>` : '' }
                    ${ prefs['show-instructor'] ? `<td ${ prefs['instructor-enabled'] ? (player.Group.Instructor >= prefs['instructor-req'] ? 'class="background-green"' : (player.Group.Instructor >= prefs['instructor-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Group.Instructor }${ (prefs['instructor-difference'] && player.Group.Instructor != compare.Group.Instructor) ? `<span> +${ player.Group.Instructor - compare.Group.Instructor }</span>` : '' }</td>` : '' }
                    ${ prefs['show-pet'] ? `<td ${ prefs['pet-enabled'] ? (player.Group.Pet >= prefs['pet-req'] ? 'class="background-green"' : (player.Group.Pet >= prefs['pet-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Group.Pet }${ (prefs['pet-difference'] && player.Group.Pet != compare.Group.Pet) ? `<span> +${ player.Group.Pet - compare.Group.Pet }</span>` : '' }</td>` : '' }
                    ${ prefs['show-knights'] ? `
                        <td ${ prefs['knights-enabled'] ? (player.Fortress.Knights >= prefs['knights-req'] ? 'class="background-green"' : (player.Fortress.Knights >= prefs['knights-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Fortress.Knights }${ (prefs['knights-difference'] && player.Fortress.Knights != compare.Fortress.Knights) ? `<span> +${ player.Fortress.Knights - compare.Fortress.Knights }</span>` : '' }</td>
                        ${ prefs['show-knights-style'] == 1 ? `<td></td>` : '' }
                    ` : '' }
                </tr>
            `);
        } else {
            table_body.push(`
                <tr>
                    <td class="border-right-thin clickable" data-player="${ player.Identifier }">${ player.Name }</td>
                    ${ prefs['show-class'] ? `<td>${ PLAYER_CLASS[player.Class] }</td>` : '' }
                    ${ prefs['show-id'] ? `<td>${ player.ID }</td>` : '' }
                    ${ prefs['show-rank'] ? `<td>${ player.Rank }</td>` : '' }
                    <td ${ prefs['level-enabled'] ? (player.Level >= prefs['level-req'] ? 'class="background-green"' : (player.Level >= prefs['level-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Level }${ (prefs['level-difference'] && player.Level != compare.Level) ? `<span> +${ player.Level - compare.Level }</span>` : '' }</td>
                    <td ${ prefs['scrapbook-enabled'] ? (player.Book >= (SCRAPBOOK_COUNT * prefs['scrapbook-req'] / 100) ? 'class="background-green"' : (player.Book >= (SCRAPBOOK_COUNT * prefs['scrapbook-min'] / 100) ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ prefs['show-book-style'] ? player.Book : `${ Number(100 * player.Book / SCRAPBOOK_COUNT).toFixed(2) }%` }${ (prefs['scrapbook-difference'] && player.Book != compare.Book) ? `<span> +${ prefs['show-book-style'] ? (player.Book - compare.Book) : Number(100 * (player.Book - compare.Book) / SCRAPBOOK_COUNT).toFixed(2) }</span>` : '' }</td>
                    <td class="border-right-thin ${ prefs['mount-enabled'] ? (player.Mount >= prefs['mount-req'] ? 'background-green' : (player.Mount >= prefs['mount-min'] ? 'background-orange' : 'background-red')) : '' }">${ PLAYER_MOUNT[player.Mount] }</td>
                    ${ prefs['show-achievements'] ? `<td class="border-right-thin ${ prefs['achievements-enabled'] ? (player.Achievements.Owned >= prefs['achievements-req'] ? 'background-green' : (player.Achievements.Owned >= prefs['achievements-min'] ? 'background-orange' : 'background-red')) : '' }">${ player.Achievements.Owned }${ prefs['show-hydra'] && player.Achievements.Dehydration ? '<span> H</span>' : '' }${ (prefs['achievements-difference'] && player.Achievements.Owned != compare.Achievements.Owned) ? `<span> +${ player.Achievements.Owned - compare.Achievements.Owned }</span>` : '' }</td>` : '' }
                    <td ${ prefs['potions-enabled'] ? (player.Potions[0].Size >= prefs['potions-req'] ? 'class="background-green foreground-green"' : (player.Potions[0].Size >= prefs['potions-min'] ? 'class="background-orange foreground-orange"' : 'class="background-red foreground-red"')) : '' } >${ player.Potions[0].Size }</td>
                    <td ${ prefs['potions-enabled'] ? (player.Potions[1].Size >= prefs['potions-req'] ? 'class="background-green foreground-green"' : (player.Potions[1].Size >= prefs['potions-min'] ? 'class="background-orange foreground-orange"' : 'class="background-red foreground-red"')) : '' } >${ player.Potions[1].Size }</td>
                    <td class="border-right-thin ${ prefs['potions-enabled'] ? (player.Potions[2].Size >= prefs['potions-req'] ? 'background-green foreground-green' : (player.Potions[2].Size >= prefs['potions-min'] ? 'background-orange foreground-orange' : 'background-red foreground-red')) : '' }">${ player.Potions[2].Size }</td>
                    ${ prefs['show-treasure'] ? `<td ${ prefs['treasure-enabled'] ? (player.Group.Treasure >= prefs['treasure-req'] ? 'class="background-green"' : (player.Group.Treasure >= prefs['treasure-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Group.Treasure }${ (prefs['treasure-difference'] && player.Group.Treasure != compare.Group.Treasure) ? `<span> +${ player.Group.Treasure - compare.Group.Treasure }</span>` : '' }</td>` : '' }
                    ${ prefs['show-instructor'] ? `<td ${ prefs['instructor-enabled'] ? (player.Group.Instructor >= prefs['instructor-req'] ? 'class="background-green"' : (player.Group.Instructor >= prefs['instructor-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Group.Instructor }${ (prefs['instructor-difference'] && player.Group.Instructor != compare.Group.Instructor) ? `<span> +${ player.Group.Instructor - compare.Group.Instructor }</span>` : '' }</td>` : '' }
                    ${ prefs['show-pet'] ? `<td ${ prefs['pet-enabled'] ? (player.Group.Pet >= prefs['pet-req'] ? 'class="background-green"' : (player.Group.Pet >= prefs['pet-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ player.Group.Pet }${ (prefs['pet-difference'] && player.Group.Pet != compare.Group.Pet) ? `<span> +${ player.Group.Pet - compare.Group.Pet }</span>` : '' }</td>` : '' }
                    ${ prefs['show-knights'] ? `
                        <td ${ prefs['knights-enabled'] ? (player.Fortress.Knights >= prefs['knights-req'] ? 'class="background-green"' : (player.Fortress.Knights >= prefs['knights-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' } >${ prefs['show-knights-style'] == 0 ? `${ player.Fortress.Knights }/${ player.Fortress.Fortress }` : player.Fortress.Knights }${ (prefs['knights-difference'] && player.Fortress.Knights != compare.Fortress.Knights) ? `<span> +${ player.Fortress.Knights - compare.Fortress.Knights }</span>` : '' }</td>
                        ${ prefs['show-knights-style'] == 1 ? `<td ${ prefs['fortress-enabled'] ? (player.Fortress.Fortress >= prefs['fortress-req'] ? 'class="background-green"' : (player.Fortress.Fortress >= prefs['fortress-min'] ? 'class="background-orange"' : 'class="background-red"')) : '' }>${ player.Fortress.Fortress }${ (prefs['fortress-difference'] && player.Fortress.Fortress != compare.Fortress.Fortress) ? `<span> +${ player.Fortress.Fortress - compare.Fortress.Fortress }</span>` : '' }</td>` : '' }
                    ` : '' }
                </tr>
            `);
        }
    });

    $('#container-detail-content').html(table_header + table_body.join('') + '</tbody>');

    // Kicked & Joined
    var kicked = groupReference.MemberIDs.filter(g => !groupCurrent.MemberIDs.includes(g)).map(g => Database.Players[g] ? Database.Players[g].Latest.Name : groupReference.Members[groupReference.MemberIDs.indexOf(g)]);
    var joined = groupCurrent.MemberIDs.filter(g => !groupReference.MemberIDs.includes(g)).map(g => Database.Players[g] ? Database.Players[g].Latest.Name : groupCurrent.Members[groupCurrent.MemberIDs.indexOf(g)]);

    if (prefs['show-group']) {
        $('#container-detail-stats').html(`
            <tbody>
                <tr>
                    <td width="${ 249 + (width % 2 == 0 ? 1 : 0) }" class="border-right-thin"></td>
                    <td>Level</td>
                    ${ prefs['show-treasure'] ? `<td>Treasure</td>` : '' }
                    ${ prefs['show-instructor'] ? `<td>Instructor</td>` : '' }
                    ${ prefs['show-pet'] ? `<td>Pet</td>` : '' }
                    ${ prefs['show-knights'] ? `<td>Knights</td>` : '' }
                </tr>
                <tr>
                    <td class="border-bottom-thick border-right-thin"></td>
                    <td class="border-bottom-thick"></td>
                    ${ prefs['show-treasure'] ? `<td class="border-bottom-thick"></td>` : '' }
                    ${ prefs['show-instructor'] ? `<td class="border-bottom-thick"></td>` : '' }
                    ${ prefs['show-pet'] ? `<td class="border-bottom-thick"></td>` : '' }
                    ${ prefs['show-knights'] ? `<td class="border-bottom-thick"></td>` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin">Minimum</td>
                    <td ${ prefs['level-enabled'] ? (groupCurrent.Levels.Min >= prefs['level-req'] ? 'class="foreground-green"' : (groupCurrent.Levels.Min >= prefs['level-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Levels.Min }${ (prefs['level-difference'] && groupCurrent.Levels.Min != groupReference.Levels.Min) ? `<span> ${ groupCurrent.Levels.Min > groupReference.Levels.Min ? '+' : '' }${ groupCurrent.Levels.Min - groupReference.Levels.Min }</span>` : '' }</td>
                    ${ prefs['show-treasure'] ? `<td ${ prefs['treasure-enabled'] ? (groupCurrent.Treasures.Min >= prefs['treasure-req'] ? 'class="foreground-green"' : (groupCurrent.Treasures.Min >= prefs['treasure-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Treasures.Min }${ (prefs['treasure-difference'] && groupCurrent.Treasures.Min != groupReference.Treasures.Min) ? `<span> ${ groupCurrent.Treasures.Min > groupReference.Treasures.Min ? '+' : '' }${ groupCurrent.Treasures.Min - groupReference.Treasures.Min }</span>` : '' }</td>` : ''}
                    ${ prefs['show-instructor'] ? `<td ${ prefs['instructor-enabled'] ? (groupCurrent.Instructors.Min >= prefs['instructor-req'] ? 'class="foreground-green"' : (groupCurrent.Instructors.Min >= prefs['instructor-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Instructors.Min }${ (prefs['instructor-difference'] && groupCurrent.Instructors.Min != groupReference.Instructors.Min) ? `<span> ${ groupCurrent.Instructors.Min > groupReference.Instructors.Min ? '+' : '' }${ groupCurrent.Instructors.Min - groupReference.Instructors.Min }</span>` : '' }</td>` : ''}
                    ${ prefs['show-pet'] ? `<td ${ prefs['pet-enabled'] ? (groupCurrent.Pets.Min >= prefs['pet-req'] ? 'class="foreground-green"' : (groupCurrent.Pets.Min >= prefs['pet-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Pets.Min }${ (prefs['pet-difference'] && groupCurrent.Pets.Min != groupReference.Pets.Min) ? `<span> ${ groupCurrent.Pets.Min > groupReference.Pets.Min ? '+' : '' }${ groupCurrent.Pets.Min - groupReference.Pets.Min }</span>` : '' }</td>` : ''}
                    ${ prefs['show-knights'] ? `<td ${ prefs['knights-enabled'] ? (groupCurrent.Knights.Min >= prefs['knights-req'] ? 'class="foreground-green"' : (groupCurrent.Knights.Min >= prefs['knights-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Knights.Min }${ (prefs['knights-difference'] && groupCurrent.Knights.Min != groupReference.Knights.Min) ? `<span> ${ groupCurrent.Knights.Min > groupReference.Knights.Min ? '+' : '' }${ groupCurrent.Knights.Min - groupReference.Knights.Min }</span>` : '' }</td>` : ''}
                </tr>
                <tr>
                    <td class="border-right-thin">Average</td>
                    <td ${ prefs['level-enabled'] ? (groupCurrent.Levels.Avg >= prefs['level-req'] ? 'class="foreground-green"' : (groupCurrent.Levels.Avg >= prefs['level-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(groupCurrent.Levels.Avg) }${ (prefs['level-difference'] && Math.trunc(groupCurrent.Levels.Avg) != Math.trunc(groupReference.Levels.Avg)) ? `<span> ${ groupCurrent.Levels.Avg > groupReference.Levels.Avg ? '+' : '' }${ Math.trunc(groupCurrent.Levels.Avg) - Math.trunc(groupReference.Levels.Avg) }</span>` : '' }</td>
                    ${ prefs['show-treasure'] ? `<td ${ prefs['treasure-enabled'] ? (groupCurrent.Treasures.Avg >= prefs['treasure-req'] ? 'class="foreground-green"' : (groupCurrent.Treasures.Avg >= prefs['treasure-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(groupCurrent.Treasures.Avg) }${ (prefs['treasure-difference'] && Math.trunc(groupCurrent.Treasures.Avg) != Math.trunc(groupReference.Treasures.Avg)) ? `<span> ${ groupCurrent.Treasures.Avg > groupReference.Treasures.Avg ? '+' : '' }${ Math.trunc(groupCurrent.Treasures.Avg) - Math.trunc(groupReference.Treasures.Avg) }</span>` : '' }</td>` : ''}
                    ${ prefs['show-instructor'] ? `<td ${ prefs['instructor-enabled'] ? (groupCurrent.Instructors.Avg >= prefs['instructor-req'] ? 'class="foreground-green"' : (groupCurrent.Instructors.Avg >= prefs['instructor-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(groupCurrent.Instructors.Avg) }${ (prefs['instructor-difference'] && Math.trunc(groupCurrent.Instructors.Avg) != Math.trunc(groupReference.Instructors.Avg)) ? `<span> ${ groupCurrent.Instructors.Avg > groupReference.Instructors.Avg ? '+' : '' }${ Math.trunc(groupCurrent.Instructors.Avg) - Math.trunc(groupReference.Instructors.Avg) }</span>` : '' }</td>` : ''}
                    ${ prefs['show-pet'] ? `<td ${ prefs['pet-enabled'] ? (groupCurrent.Pets.Avg >= prefs['pet-req'] ? 'class="foreground-green"' : (groupCurrent.Pets.Avg >= prefs['pet-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(groupCurrent.Pets.Avg) }${ (prefs['pet-difference'] && Math.trunc(groupCurrent.Pets.Avg) != Math.trunc(groupReference.Pets.Avg)) ? `<span> ${ groupCurrent.Pets.Avg > groupReference.Pets.Avg ? '+' : '' }${ Math.trunc(groupCurrent.Pets.Avg) - Math.trunc(groupReference.Pets.Avg) }</span>` : '' }</td>` : ''}
                    ${ prefs['show-knights'] ? `<td ${ prefs['knights-enabled'] ? (groupCurrent.Knights.Avg >= prefs['knights-req'] ? 'class="foreground-green"' : (groupCurrent.Knights.Avg >= prefs['knights-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(groupCurrent.Knights.Avg) }${ (prefs['knights-difference'] && Math.trunc(groupCurrent.Knights.Avg) != Math.trunc(groupReference.Knights.Avg)) ? `<span> ${ groupCurrent.Knights.Avg > groupReference.Knights.Avg ? '+' : '' }${ Math.trunc(groupCurrent.Knights.Avg) - Math.trunc(groupReference.Knights.Avg) }</span>` : '' }</td>` : ''}
                </tr>
                <tr>
                    <td class="border-right-thin">Maximum</td>
                    <td ${ prefs['level-enabled'] ? (groupCurrent.Levels.Max >= prefs['level-req'] ? 'class="foreground-green"' : (groupCurrent.Levels.Max >= prefs['level-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Levels.Max }${ (prefs['level-difference'] && groupCurrent.Levels.Max != groupReference.Levels.Max) ? `<span> ${ groupCurrent.Levels.Max > groupReference.Levels.Max ? '+' : '' }${ groupCurrent.Levels.Max - groupReference.Levels.Max }</span>` : '' }</td>
                    ${ prefs['show-treasure'] ? `<td ${ prefs['treasure-enabled'] ? (groupCurrent.Treasures.Max >= prefs['treasure-req'] ? 'class="foreground-green"' : (groupCurrent.Treasures.Max >= prefs['treasure-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Treasures.Max }${ (prefs['treasure-difference'] && groupCurrent.Treasures.Max != groupReference.Treasures.Max) ? `<span> ${ groupCurrent.Treasures.Max > groupReference.Treasures.Max ? '+' : '' }${ groupCurrent.Treasures.Max - groupReference.Treasures.Max }</span>` : '' }</td>` : ''}
                    ${ prefs['show-instructor'] ? `<td ${ prefs['instructor-enabled'] ? (groupCurrent.Instructors.Max >= prefs['instructor-req'] ? 'class="foreground-green"' : (groupCurrent.Instructors.Max >= prefs['instructor-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Instructors.Max }${ (prefs['instructor-difference'] && groupCurrent.Instructors.Max != groupReference.Instructors.Max) ? `<span> ${ groupCurrent.Instructors.Max > groupReference.Instructors.Max ? '+' : '' }${ groupCurrent.Instructors.Max - groupReference.Instructors.Max }</span>` : '' }</td>` : ''}
                    ${ prefs['show-pet'] ? `<td ${ prefs['pet-enabled'] ? (groupCurrent.Pets.Max >= prefs['pet-req'] ? 'class="foreground-green"' : (groupCurrent.Pets.Max >= prefs['pet-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Pets.Max }${ (prefs['pet-difference'] && groupCurrent.Pets.Max != groupReference.Pets.Max) ? `<span> ${ groupCurrent.Pets.Max > groupReference.Pets.Max ? '+' : '' }${ groupCurrent.Pets.Max - groupReference.Pets.Max }</span>` : '' }</td>` : ''}
                    ${ prefs['show-knights'] ? `<td ${ prefs['knights-enabled'] ? (groupCurrent.Knights.Max >= prefs['knights-req'] ? 'class="foreground-green"' : (groupCurrent.Knights.Max >= prefs['knights-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ groupCurrent.Knights.Max }${ (prefs['knights-difference'] && groupCurrent.Knights.Max != groupReference.Knights.Max) ? `<span> ${ groupCurrent.Knights.Max > groupReference.Knights.Max ? '+' : '' }${ groupCurrent.Knights.Max - groupReference.Knights.Max }</span>` : '' }</td>` : ''}
                </tr>
                <tr>
                    <td colspan="6"></td>
                </tr>
                ${
                    prefs['show-group'] == 2 && (joined.length > 0 || kicked.length > 0) ? `
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
    var prefs = Preferences.get(State.getGroupID(), Preferences.get('settings', DEFAULT_SETTINGS));

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
                        <div class="column ${ prefs['treasure-enabled'] ? (player.Group.Treasure >= prefs['treasure-req'] ? 'foreground-green' : (player.Group.Treasure >= prefs['treasure-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Group.Treasure }</div>
                        <div class="left aligned column font-big">Instructor</div>
                        <div class="column ${ prefs['instructor-enabled'] ? (player.Group.Instructor >= prefs['instructor-req'] ? 'foreground-green' : (player.Group.Instructor >= prefs['instructor-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Group.Instructor }</div>
                        <div class="left aligned column font-big">Pet</div>
                        <div class="column ${ prefs['pet-enabled'] ? (player.Group.Pet >= prefs['pet-req'] ? 'foreground-green' : (player.Group.Pet >= prefs['pet-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Group.Pet }</div>
                        <div class="left aligned column font-big">Knights</div>
                        <div class="column ${ prefs['knights-enabled'] ? (player.Fortress.Knights >= prefs['knights-req'] ? 'foreground-green' : (player.Fortress.Knights >= prefs['knights-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Fortress.Knights }</div>
                    </div>
                </div>
                <div class="column">
                    <div class="ui three columns grid player-small">
                        <div class="left aligned column font-big">Scrapbook</div>
                        <div class="column ${ prefs['scrapbook-enabled'] ? (player.Book >= (SCRAPBOOK_COUNT * prefs['scrapbook-req'] / 100) ? 'foreground-green' : (player.Book >= (SCRAPBOOK_COUNT * prefs['scrapbook-min'] / 100) ? 'foreground-orange' : 'foreground-red')) : '' }">${ Number(100 * player.Book / SCRAPBOOK_COUNT).toFixed(2) }%</div>
                        <div class="column">${ player.Book } out of ${ SCRAPBOOK_COUNT }</div>
                        <div class="left aligned column font-big">Mount</div>
                        <div class="column ${ prefs['mount-enabled'] ? (player.Mount >= prefs['mount-req'] ? 'foreground-green' : (player.Mount >= prefs['mount-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ PLAYER_MOUNT[player.Mount] || 'None' }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Achievements</div>
                        <div class="column ${ prefs['achievements-enabled'] ? (player.Achievements.Owned >= prefs['achievements-req'] ? 'foreground-green' : (player.Achievements.Owned >= prefs['achievements-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ Math.trunc(100 * player.Achievements.Owned / ACHIEVEMENT_COUNT) }%${ prefs['show-hydra'] && player.Achievements.Dehydration ? '<span> H</span>' : '' }</div>
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
                        <div class="column ${ prefs['potions-enabled'] ? (player.Potions[0].Size >= prefs['potions-req'] ? 'foreground-green' : (player.Potions[0].Size >= prefs['potions-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Potions[0].Size ? `${ player.Potions[0].Size }%` : '' }</div>
                        <div class="left aligned column">${ player.Potions[0].Size ? POTIONS[player.Potions[0].Type] : '' }</div>
                        <div class="left aligned column font-big"><br></div>
                        <div class="column ${ prefs['potions-enabled'] ? (player.Potions[1].Size >= prefs['potions-req'] ? 'foreground-green' : (player.Potions[1].Size >= prefs['potions-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Potions[1].Size ? `${ player.Potions[1].Size }%` : '' }</div>
                        <div class="left aligned column">${ player.Potions[1].Size ? POTIONS[player.Potions[1].Type] : '' }</div>
                        <div class="left aligned column font-big"><br></div>
                        <div class="column ${ prefs['potions-enabled'] ? (player.Potions[2].Size >= prefs['potions-req'] ? 'foreground-green' : (player.Potions[2].Size >= prefs['potions-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Potions[2].Size ? `${ player.Potions[2].Size }%` : '' }</div>
                        <div class="left aligned column">${ player.Potions[2].Size ? POTIONS[player.Potions[2].Type] : '' }</div>
                        <div class="column"><br></div>
                        <div class="column"></div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Fortress</div>
                        <div class="column ${ prefs['fortress-enabled'] ? (player.Fortress.Fortress >= prefs['fortress-req'] ? 'foreground-green' : (player.Fortress.Fortress >= prefs['fortress-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ player.Fortress.Fortress }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Gem Mine</div>
                        <div class="column">${ player.Fortress.GemMine }</div>
                        <div class="column"></div>
                        <div class="left aligned column font-big">Treasury</div>
                        <div class="column">${ player.Fortress.Treasury }</div>
                        <div class="column"></div>
                    </div>
                </div>
            </div>
        </div>
    `);
    $('#modal-player').modal('show');
});

Handle.bind(EVT_GROUP_SETTINGS_SHOW, function () {
    $('#modal-custom-settings').modal('show');
    Handle.call(EVT_GROUP_SETTINGS_LOAD);
});

Handle.bind(EVT_GROUP_SETTINGS_LOAD, function () {
    Object.entries(Preferences.get(State.getGroupID(), Preferences.get('settings', DEFAULT_SETTINGS))).forEach(function (keyval) {
        var element = $(`[data-custom-settings="${ keyval[0] }"]`);
        if (element.hasClass('button')) {
            if (keyval[1]) {
                setEnabled(element);
            } else {
                setDisabled(element);
            }
        } else {
            element.val(keyval[1]);
        }
    });

    $('.ui.dropdown:not(#container-detail-select-dropdown, #container-detail-compare-dropdown)').dropdown();
});

Handle.bind(EVT_GROUP_SETTINGS_SAVE, function () {
    var settings = {};

    if ($('[data-custom-settings]:not(.button)').toArray().reduce((sum, element) => {
        var val = $(element).val();
        if (isNaN(val) || val < 0) {
            $(element).transition('shake');
            return sum + 1;
        } else {
            return sum;
        }
    }, 0) > 0) {
        return;
    }

    $('[data-custom-settings]').toArray().forEach(function (element) {
        if ($(element).hasClass('button')) {
            settings[$(element).attr('data-custom-settings')] = $(element).hasClass('active') ? 1 : 0;
        } else {
            settings[$(element).attr('data-custom-settings')] = Number($(element).val());
        }
    });

    Preferences.set(State.getGroupID(), settings);
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVT_GROUP_LOAD_TABLE);
});


Handle.bind(EVT_GROUP_SETTINGS_CLEAR, function () {
    Preferences.remove(State.getGroupID());
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVT_GROUP_LOAD_TABLE);
});
