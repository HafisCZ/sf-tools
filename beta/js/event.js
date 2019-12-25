// Event types
const EVENT_NONE = 'none';
const EVENT_ERROR = 'error';

const EVENT_SHOW_SCREEN = 'show_screen';

const EVENT_LOAD_BROWSE = 'load_browse';
const EVENT_LOAD_FILES = 'load_files';
const EVENT_LOAD_SETTINGS = 'load_settings';
const EVENT_LOAD_HELP = 'load_help';
const EVENT_LOAD_DETAIL = 'load_detail';
const EVENT_SHOW_PLAYER = 'show_player';

const EVENT_BROWSE_DETAIL = 'browse_detail';

const EVENT_FILES_ADD = 'files_add';
const EVENT_FILES_EXPORT = 'files_export';
const EVENT_FILES_IMPORT = 'files_import';
const EVENT_FILES_REMOVE = 'files_remove';

const EVENT_SETTINGS_CLEAR = 'settings_clear';
const EVENT_SETTINGS_SAVE = 'settings_save';

const EVENT_DETAIL_COPY = 'detail_copy';
const EVENT_DETAIL_SAVE = 'detail_save';

const EVENT_DETAIL_SETTINGS = 'detail_settings';
const EVENT_DETAIL_SETTINGS_CLEAR = 'detail_settings_clear';
const EVENT_DETAIL_SETTINGS_SAVE = 'detail_settings_save';
const EVENT_DETAIL_SETTINGS_RESET = 'detail_settings_reset';

// Bindings
Handle.bind(EVENT_NONE, function (... args) {
    console.log(... args);
});

Handle.bind(EVENT_ERROR, function (error) {
    $('#modal-error-content').html(error);
    $('#modal-error').modal('show');
})

Handle.bind(EVENT_SHOW_SCREEN, function (screen, ... args) {
    $('.ui.container').addClass('hidden');
    $(`#${screen}`).removeClass('hidden');
    Screens[screen].show(... args);
});

Handle.bind(EVENT_SETTINGS_CLEAR, function () {
    Screens['container-settings'].show();
});

Handle.bind(EVENT_SETTINGS_SAVE, function () {
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

Handle.bind(EVENT_LOAD_FILES, function () {
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

    // Show list
    $('#container-files-list').html(content.join(''));
    $('.ui.sticky').sticky({
        context: '#container-files-list',
        offset: 70
    });

    // Remove file
    $('[data-file-id]').off('click');
    $('[data-file-id]').on('click', function () {
        Handle.call(EVENT_FILES_REMOVE, $(this).attr('data-file-id'));
    });
});

Handle.bind(EVENT_LOAD_SETTINGS, function () {
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

Handle.bind(EVENT_LOAD_BROWSE, function () {
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
    $('[data-group-id]').off('click');
    $('[data-group-id]').on('click', function () {
        Handle.call(EVENT_BROWSE_DETAIL, $(this).attr('data-group-id'));
    });
});

Handle.bind(EVENT_FILES_ADD, function (files) {
    Array.from(files).forEach(function (file) {
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = event => {
            try {
                Storage.add(event.target.result, file.lastModified);
                Handle.call(EVENT_LOAD_FILES);
            } catch (e) {
                Handle.call(EVENT_ERROR, 'A problem occured while trying to import this file.<br>' + e);
            }
        };
    });
});

Handle.bind(EVENT_FILES_REMOVE, function (index) {
    Storage.remove(index);

    Handle.call(EVENT_LOAD_FILES);
});

Handle.bind(EVENT_FILES_EXPORT, function () {
    Storage.export();
});

Handle.bind(EVENT_FILES_IMPORT, function (files) {
    Array.from(files).forEach(function (file) {
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = event => {
            try {
                Storage.import(event.target.result);
                Handle.call(EVENT_LOAD_FILES);
            } catch (e) {
                Handle.call(EVENT_ERROR, 'A problem occured while trying to import this file.<br>' + e);
            }
        };
    });
});

Handle.bind(EVENT_BROWSE_DETAIL, function (identifier) {
    Handle.call(EVENT_SHOW_SCREEN, 'container-detail', identifier);
});

Handle.bind(EVENT_DETAIL_SAVE, function () {
    var group = $('#container-detail').attr('data-current-group');
    var compare = $('#container-detail-compare').val();

    html2canvas($('#container-detail-screenshot')[0], {
        logging: false
    }).then(function (canvas) {
        canvas.toBlob(function (blob) {
            window.download(`${ Database.Groups[group].Latest.Name }.${ Database.Groups[group].LatestTimestamp }${ compare ? `.${ compare }` : '' }.png`, blob);
        });
    });
});

Handle.bind(EVENT_DETAIL_COPY, function () {
    var range = document.createRange();
    range.selectNode(document.getElementById('container-detail-screenshot'));

    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
});

Handle.bind(EVENT_LOAD_DETAIL, function (identifier, compare) {
    var timestamps = Database.Groups[identifier].List.map(entry => `<div class="item" data-value="${ entry.timestamp }">${ formatDate(new Date(entry.timestamp)) }</div>`);
    timestamps.reverse();
    $('#container-detail-compare-content').html(timestamps.join(''));

    if (compare) {
        $('#container-detail-compare').val(compare);
    } else {
        $('#container-detail-compare').val(Database.Groups[identifier].LatestTimestamp);
        $('#container-detail-compare-text').html(formatDate(new Date(Database.Groups[identifier].LatestTimestamp)));
        compare = Database.Groups[identifier].LatestTimestamp;
    }

    $('#container-detail').attr('data-current-group', identifier);

    var group = Database.Groups[identifier].Latest;
    var timestamp = Database.Groups[identifier].LatestTimestamp;

    var oldgroup = Database.Groups[identifier][compare];

    $('#container-detail-name').text(group.Name);
    $('#container-detail-rank').text('Rank ' + group.Rank);
    $('#container-detail-membercount').text(group.MemberCount + (group.MemberCount > 1 ? ' Members' : ' Member'));

    var players = group.MemberIDs.map(id => (Database.Players[id] ? Database.Players[id][timestamp] : null)).filter(player => player && player.Group && player.Group.Role < GUILD_ROLE_INVITED);
    var compares = players.map(function (player) {
        var ps = Database.Players[player.Identifier];
        if (compare && ps[compare] && ps[compare].Group && ps[compare].Group.Name == group.Name) {
            return ps[compare];
        } else {
            return ps.List.find(player => player.player.Group && player.player.Group.Name == group.Name).player;
        }
    });

    var prefs = Preferences.get(identifier, Preferences.get('settings', DEFAULT_SETTINGS));
    var header_name = 1;
    var header_general = prefs['show-class'] + prefs['show-id'] + prefs['show-rank'] + prefs['show-achievements'] + 3;
    var header_potions = 3;
    var header_group = prefs['show-treasure'] + prefs['show-instructor'] + prefs['show-pet'] + prefs['show-knights'] + (prefs['show-knights-style'] == 1 ? 1 : 0);
    var header_group_iter = header_group;

    var width = 250 + 99 + 310;
    if (prefs['show-class']) {
        width += 120;
    }
    if (prefs['show-id']) {
        width += 100;
    }
    if (prefs['show-rank']) {
        width += 100;
    }
    if (prefs['show-achievements']) {
        width += 100;
    }
    if (prefs['show-treasure']) {
        width += 100;
    }
    if (prefs['show-instructor']) {
        width += 100;
    }
    if (prefs['show-knights']) {
        width += 100;
    }
    if (prefs['show-knights-style'] == 1) {
        width += 100;
    }

    $('#container-detail').css('width', `${width + 130}px`);

    var content = [`
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
    `];

    players.forEach(function (player) {
        var compare = compares.find(compare => compare.Identifier == player.Identifier);

        content.push(`
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
    });

    content.push('</tbody>');
    $('#container-detail-content').html(content.join());

    var kicked = oldgroup.MemberIDs.filter(g => !group.MemberIDs.includes(g)).map(g => Database.Players[g].Latest.Name);
    var joined = group.MemberIDs.filter(g => !oldgroup.MemberIDs.includes(g)).map(g => Database.Players[g].Latest.Name);

    if (prefs['show-group']) {
        $('#container-detail-stats').html(`
            <tbody>
                <tr>
                    <td width="${ 249 + (width % 2 == 0 ? 1 : 0) }" class="border-right-thin"></td>
                    <td>Level</td>
                    <td>Treasure</td>
                    <td>Instructor</td>
                    <td>Pet</td>
                    <td>Knights</td>
                </tr>
                <tr>
                    <td class="border-bottom-thick border-right-thin"></td>
                    <td class="border-bottom-thick"></td>
                    <td class="border-bottom-thick"></td>
                    <td class="border-bottom-thick"></td>
                    <td class="border-bottom-thick"></td>
                    <td class="border-bottom-thick"></td>
                </tr>
                <tr>
                    <td class="border-right-thin">Minimum</td>
                    <td ${ prefs['level-enabled'] ? (group.Levels.Min >= prefs['level-req'] ? 'class="foreground-green"' : (group.Levels.Min >= prefs['level-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Levels.Min }${ (prefs['level-difference'] && group.Levels.Min != oldgroup.Levels.Min) ? `<span> ${ group.Levels.Min > oldgroup.Levels.Min ? '+' : '' }${ group.Levels.Min - oldgroup.Levels.Min }</span>` : '' }</td>
                    <td ${ prefs['treasure-enabled'] ? (group.Treasures.Min >= prefs['treasure-req'] ? 'class="foreground-green"' : (group.Treasures.Min >= prefs['treasure-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Treasures.Min }${ (prefs['treasure-difference'] && group.Treasures.Min != oldgroup.Treasures.Min) ? `<span> ${ group.Treasures.Min > oldgroup.Treasures.Min ? '+' : '' }${ group.Treasures.Min - oldgroup.Treasures.Min }</span>` : '' }</td>
                    <td ${ prefs['instructor-enabled'] ? (group.Instructors.Min >= prefs['instructor-req'] ? 'class="foreground-green"' : (group.Instructors.Min >= prefs['instructor-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Instructors.Min }${ (prefs['instructor-difference'] && group.Instructors.Min != oldgroup.Instructors.Min) ? `<span> ${ group.Instructors.Min > oldgroup.Instructors.Min ? '+' : '' }${ group.Instructors.Min - oldgroup.Instructors.Min }</span>` : '' }</td>
                    <td ${ prefs['pet-enabled'] ? (group.Pets.Min >= prefs['pet-req'] ? 'class="foreground-green"' : (group.Pets.Min >= prefs['pet-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Pets.Min }${ (prefs['pet-difference'] && group.Pets.Min != oldgroup.Pets.Min) ? `<span> ${ group.Pets.Min > oldgroup.Pets.Min ? '+' : '' }${ group.Pets.Min - oldgroup.Pets.Min }</span>` : '' }</td>
                    <td ${ prefs['knights-enabled'] ? (group.Knights.Min >= prefs['knights-req'] ? 'class="foreground-green"' : (group.Knights.Min >= prefs['knights-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Knights.Min }${ (prefs['knights-difference'] && group.Knights.Min != oldgroup.Knights.Min) ? `<span> ${ group.Knights.Min > oldgroup.Knights.Min ? '+' : '' }${ group.Knights.Min - oldgroup.Knights.Min }</span>` : '' }</td>
                </tr>
                <tr>
                    <td class="border-right-thin">Average</td>
                    <td ${ prefs['level-enabled'] ? (group.Levels.Avg >= prefs['level-req'] ? 'class="foreground-green"' : (group.Levels.Avg >= prefs['level-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(group.Levels.Avg) }${ (prefs['level-difference'] && Math.trunc(group.Levels.Avg) != Math.trunc(oldgroup.Levels.Avg)) ? `<span> ${ group.Levels.Avg > oldgroup.Levels.Avg ? '+' : '' }${ Math.trunc(group.Levels.Avg) - Math.trunc(oldgroup.Levels.Avg) }</span>` : '' }</td>
                    <td ${ prefs['treasure-enabled'] ? (group.Treasures.Avg >= prefs['treasure-req'] ? 'class="foreground-green"' : (group.Treasures.Avg >= prefs['treasure-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(group.Treasures.Avg) }${ (prefs['treasure-difference'] && Math.trunc(group.Treasures.Avg) != Math.trunc(oldgroup.Treasures.Avg)) ? `<span> ${ group.Treasures.Avg > oldgroup.Treasures.Avg ? '+' : '' }${ Math.trunc(group.Treasures.Avg) - Math.trunc(oldgroup.Treasures.Avg) }</span>` : '' }</td>
                    <td ${ prefs['instructor-enabled'] ? (group.Instructors.Avg >= prefs['instructor-req'] ? 'class="foreground-green"' : (group.Instructors.Avg >= prefs['instructor-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(group.Instructors.Avg) }${ (prefs['instructor-difference'] && Math.trunc(group.Instructors.Avg) != Math.trunc(oldgroup.Instructors.Avg)) ? `<span> ${ group.Instructors.Avg > oldgroup.Instructors.Avg ? '+' : '' }${ Math.trunc(group.Instructors.Avg) - Math.trunc(oldgroup.Instructors.Avg) }</span>` : '' }</td>
                    <td ${ prefs['pet-enabled'] ? (group.Pets.Avg >= prefs['pet-req'] ? 'class="foreground-green"' : (group.Pets.Avg >= prefs['pet-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(group.Pets.Avg) }${ (prefs['pet-difference'] && Math.trunc(group.Pets.Avg) != Math.trunc(oldgroup.Pets.Avg)) ? `<span> ${ group.Pets.Avg > oldgroup.Pets.Avg ? '+' : '' }${ Math.trunc(group.Pets.Avg) - Math.trunc(oldgroup.Pets.Avg) }</span>` : '' }</td>
                    <td ${ prefs['knights-enabled'] ? (group.Knights.Avg >= prefs['knights-req'] ? 'class="foreground-green"' : (group.Knights.Avg >= prefs['knights-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ Math.trunc(group.Knights.Avg) }${ (prefs['knights-difference'] && Math.trunc(group.Knights.Avg) != Math.trunc(oldgroup.Knights.Avg)) ? `<span> ${ group.Knights.Avg > oldgroup.Knights.Avg ? '+' : '' }${ Math.trunc(group.Knights.Avg) - Math.trunc(oldgroup.Knights.Avg) }</span>` : '' }</td>
                </tr>
                <tr>
                    <td class="border-right-thin">Maximum</td>
                    <td ${ prefs['level-enabled'] ? (group.Levels.Max >= prefs['level-req'] ? 'class="foreground-green"' : (group.Levels.Max >= prefs['level-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Levels.Max }${ (prefs['level-difference'] && group.Levels.Max != oldgroup.Levels.Max) ? `<span> ${ group.Levels.Max > oldgroup.Levels.Max ? '+' : '' }${ group.Levels.Max - oldgroup.Levels.Max }</span>` : '' }</td>
                    <td ${ prefs['treasure-enabled'] ? (group.Treasures.Max >= prefs['treasure-req'] ? 'class="foreground-green"' : (group.Treasures.Max >= prefs['treasure-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Treasures.Max }${ (prefs['treasure-difference'] && group.Treasures.Max != oldgroup.Treasures.Max) ? `<span> ${ group.Treasures.Max > oldgroup.Treasures.Max ? '+' : '' }${ group.Treasures.Max - oldgroup.Treasures.Max }</span>` : '' }</td>
                    <td ${ prefs['instructor-enabled'] ? (group.Instructors.Max >= prefs['instructor-req'] ? 'class="foreground-green"' : (group.Instructors.Max >= prefs['instructor-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Instructors.Max }${ (prefs['instructor-difference'] && group.Instructors.Max != oldgroup.Instructors.Max) ? `<span> ${ group.Instructors.Max > oldgroup.Instructors.Max ? '+' : '' }${ group.Instructors.Max - oldgroup.Instructors.Max }</span>` : '' }</td>
                    <td ${ prefs['pet-enabled'] ? (group.Pets.Max >= prefs['pet-req'] ? 'class="foreground-green"' : (group.Pets.Max >= prefs['pet-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Pets.Max }${ (prefs['pet-difference'] && group.Pets.Max != oldgroup.Pets.Max) ? `<span> ${ group.Pets.Max > oldgroup.Pets.Max ? '+' : '' }${ group.Pets.Max - oldgroup.Pets.Max }</span>` : '' }</td>
                    <td ${ prefs['knights-enabled'] ? (group.Knights.Max >= prefs['knights-req'] ? 'class="foreground-green"' : (group.Knights.Max >= prefs['knights-min'] ? 'class="foreground-orange"' : 'class="foreground-red"')) : '' }>${ group.Knights.Max }${ (prefs['knights-difference'] && group.Knights.Max != oldgroup.Knights.Max) ? `<span> ${ group.Knights.Max > oldgroup.Knights.Max ? '+' : '' }${ group.Knights.Max - oldgroup.Knights.Max }</span>` : '' }</td>
                </tr>
                <tr>
                    <td colspan="6"></td>
                </tr>
                ${
                    prefs['show-group'] == 2 && (timestamp != compare) && (joined.length > 0 || kicked.length > 0) ? `
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
        Handle.call(EVENT_SHOW_PLAYER, $(this).attr('data-player'));
    });
});

Handle.bind(EVENT_SHOW_PLAYER, function (identifier) {
    var prefs = Preferences.get($('#container-detail').attr('data-current-group'), Preferences.get('settings', DEFAULT_SETTINGS));

    var player = Database.Players[identifier].Latest;

    var potions = player.Potions;
    potions.sort((a, b) => b.Size - a.Size);

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
                        <div class="column ${ prefs['potions-enabled'] ? (potions[0].Size >= prefs['potions-req'] ? 'foreground-green' : (potions[0].Size >= prefs['potions-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ potions[0].Size ? `${ potions[0].Size }%` : '' }</div>
                        <div class="left aligned column">${ potions[0].Size ? POTIONS[potions[0].Type] : '' }</div>
                        <div class="left aligned column font-big"><br></div>
                        <div class="column ${ prefs['potions-enabled'] ? (potions[1].Size >= prefs['potions-req'] ? 'foreground-green' : (potions[1].Size >= prefs['potions-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ potions[1].Size ? `${ potions[1].Size }%` : '' }</div>
                        <div class="left aligned column">${ potions[1].Size ? POTIONS[potions[1].Type] : '' }</div>
                        <div class="left aligned column font-big"><br></div>
                        <div class="column ${ prefs['potions-enabled'] ? (potions[2].Size >= prefs['potions-req'] ? 'foreground-green' : (potions[2].Size >= prefs['potions-min'] ? 'foreground-orange' : 'foreground-red')) : '' }">${ potions[2].Size ? `${ potions[2].Size }%` : '' }</div>
                        <div class="left aligned column">${ potions[2].Size ? POTIONS[potions[2].Type] : '' }</div>
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

Handle.bind(EVENT_DETAIL_SETTINGS, function () {
    Object.entries(Preferences.get($('#container-detail').attr('data-current-group'), Preferences.get('settings', DEFAULT_SETTINGS))).forEach(function (keyval) {
        var key = keyval[0];
        var val = keyval[1];

        var element = $(`[data-custom-settings="${key}"]`);
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
    $('#modal-custom-settings').modal('show');
});

Handle.bind(EVENT_DETAIL_SETTINGS_CLEAR, function () {
    Preferences.remove($('#container-detail').attr('data-current-group'));
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVENT_LOAD_DETAIL, $('#container-detail').attr('data-current-group'), $('#container-detail-compare').val());
});

Handle.bind(EVENT_DETAIL_SETTINGS_RESET, function () {
    Object.entries(Preferences.get($('#container-detail').attr('data-current-group'), Preferences.get('settings', DEFAULT_SETTINGS))).forEach(function (keyval) {
        var key = keyval[0];
        var val = keyval[1];

        var element = $(`[data-custom-settings="${key}"]`);
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

Handle.bind(EVENT_DETAIL_SETTINGS_SAVE, function () {
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

    Preferences.set($('#container-detail').attr('data-current-group'), settings);
    $('#modal-custom-settings').modal('hide');
    Handle.call(EVENT_LOAD_DETAIL, $('#container-detail').attr('data-current-group'), $('#container-detail-compare').val());
});
