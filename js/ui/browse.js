class ModalController
{
    constructor(id)
    {
        this.do = $(`#${id}`);
    }

    show()
    {
        this.do.modal('show');
    }

    hide()
    {
        this.do.modal('hide');
    }

    parent(c)
    {
        this.do.on('show.bs.modal', function() {
            c.do.modal('hide');
        })

        this.do.on('hidden.bs.modal', function() {
            c.do.modal('show');
        });
    }
}

class SetModalController extends ModalController
{
    constructor()
    {
        super('m-set');

        this.label = $('#m-set-label');
        this.players = $('#m-set-playerlist');
        this.groups = $('#m-set-grouplist');
        this.search = $('#m-set-search');

        this.search.on('keyup', function() {
            var value = $(this).val().toLowerCase();

            $('#m-set-playerlist a').filter(function() {
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
            })
            $('#m-set-grouplist a').filter(function() {
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
            })
        });
    }

    show(i, c)
    {
        var a = [];
        for (var [j, p] of sf.players(i))
        {
            a.push(`<a onclick="mc.player.show(${i},${j},${c});" class="list-group-item list-group-item-action">${p.Name}</div>`);
        }

        var b = [];
        for (var [j, g] of sf.groups(i))
        {
            b.push(`<a onclick="mc.group.show(${i},${j},${c});" class="list-group-item list-group-item-action">${g.Name}</div>`);
        }

        this.label.html(`${sf.set(i).Label}${c ? `<small class="ml-2 text-muted">(${sf.set(c - 1).Label})</small>` : ''}`);
        this.players.html(a.join(''));
        this.groups.html(b.join(''));
        this.search.val('');

        super.show();
    }
}

class SettingsModalController extends ModalController
{
    constructor()
    {
        super('m-settings');

        this.ranges = [];
        for (var i = 1; i <= 9; i++)
        {
            this.ranges.push($(`#m-settings-r${i}`));
        }

        this.labels = [];
        for (var i = 1; i <= 9; i++)
        {
            this.labels.push($(`#m-settings-l${i}`));
        }

        this.checks = [];
        for (var i = 1; i <= 4; i++)
        {
            this.checks.push($(`#m-settings-c${i}`));
        }

        $('#m-settings-r1').on('input', function(e) { $('#m-settings-l1').text(`${$(this).val()}%`); });
        $('#m-settings-r2').on('input', function(e) { $('#m-settings-l2').text(`${$(this).val()}%`); });
        $('#m-settings-r3').on('input', function(e) { $('#m-settings-l3').text(`${$(this).val() * 5}`); });
        $('#m-settings-r4').on('input', function(e) { $('#m-settings-l4').text(`${$(this).val() * 5}`); });
        $('#m-settings-r5').on('input', function(e) { $('#m-settings-l5').text(`${$(this).val()}`); });
        $('#m-settings-r6').on('input', function(e) { $('#m-settings-l6').text(`${$(this).val()}`); });
        $('#m-settings-r7').on('input', function(e) { $('#m-settings-l7').text(`${Enum.Mount[$(this).val()]}%`); });
        $('#m-settings-r8').on('input', function(e) { $('#m-settings-l8').text(`${Enum.Mount[$(this).val()]}%`); });
        $('#m-settings-r9').on('input', function(e) { $('#m-settings-l9').text(`${$(this).val()}`); });
    }

    show()
    {
        $('#m-settings-r1').val(st.scrapbook.min.value);
        $('#m-settings-r2').val(st.scrapbook.max.value);
        $('#m-settings-r3').val(st.pet.min.value / 5);
        $('#m-settings-r4').val(st.pet.max.value / 5);
        $('#m-settings-r5').val(st.knights.min.value);
        $('#m-settings-r6').val(st.knights.max.value);
        $('#m-settings-r7').val(st.mount.min.value);
        $('#m-settings-r8').val(st.mount.max.value);
        $('#m-settings-r9').val(st.gear.upgrades.value);

        $('#m-settings-c1').prop('checked', st.highlight.value);
        $('#m-settings-c2').prop('checked', st.gear.ignore_gems.value);
        $('#m-settings-c3').prop('checked', st.gear.ignore_weapons.value);
        $('#m-settings-c4').prop('checked', st.gear.ignore_excess.value);

        $('input[id^="m-settings-r"]').trigger('input');

        super.show();
    }

    save()
    {
        st.scrapbook.min.value = $('#m-settings-r1').val();
        st.scrapbook.max.value = $('#m-settings-r2').val();
        st.pet.min.value = $('#m-settings-r3').val() * 5;
        st.pet.max.value = $('#m-settings-r4').val() * 5;
        st.knights.min.value = $('#m-settings-r5').val();
        st.knights.max.value = $('#m-settings-r6').val();
        st.mount.min.value = $('#m-settings-r7').val();
        st.mount.max.value = $('#m-settings-r8').val();
        st.gear.upgrades.value = $('#m-settings-r9').val();

        st.highlight.value = $('#m-settings-c1').prop('checked');
        st.gear.ignore_gems.value = $('#m-settings-c2').prop('checked');
        st.gear.ignore_weapons.value = $('#m-settings-c3').prop('checked');
        st.gear.ignore_excess.value = $('#m-settings-c4').prop('checked');

        super.hide();
    }
}

class PlayerModalController extends ModalController
{
    constructor()
    {
        super('m-player');

        this.header = $('#m-player-header');
        this.body = $('#m-player-body');
    }

    show(s, p, c)
    {
        const player = sf.player(s, p);
        const cmp = c ? sf.set(c - 1).Players.find(p => p.Name === player.Name) : null;
        var m = [];

        // Travel duration
        m.push(MD.badge(
            player.Mount > 0 ? `-${Enum.Mount[player.Mount]} Travel duration` : 'No mount',
            MD.rif(player.Mount >= st.mount.max.value, 'badge-success') || MD.rif(player.Mount >= st.mount.min.value, 'badge-warning') || 'badge-danger',
            'mr-2 mb-2'
        ));

        // Potions
        for (var i = 0; i < 3; i++)
        {
            if (player.Potions[i].Size > 0)
            {
                m.push(MD.badge(
                    `+${player.Potions[i].Size}% ${Enum.Potion[player.Potions[i].Type]}`,
                    MD.rif(player.Potions[i].Size == 25, 'badge-success') || 'badge-warning',
                    'mr-2 mb-2'
                ));
            }
            else
            {
                m.push(MD.badge(
                    'Empty slot',
                    'badge-danger',
                    'mr-2 mb-2'
                ));
            }
        }

        // New line
        m.push(MD.nl());

        // Scrapbook
        var scrapbook = player.Book / 21.6;
        m.push(MD.badge(
            `+${Math.trunc(scrapbook * 10) / 10}% XP bonus`,
            MD.rif(scrapbook >= st.scrapbook.max.value, 'badge-success') || MD.rif(scrapbook >= st.scrapbook.min.value, 'badge-warning') || 'badge-danger',
            'mr-2 mb-2'
        ));

        // New line
        m.push(MD.nl());

        // Attribute bonus
        m.push(MD.badge(
            `+${player.Achievements * 5} Attribute bonus`,
            'badge-dark mb-2 mr-2'
        ));

        // Damage bonus
        m.push(MD.badge(
            `+${player.DamageBonus}% Damage bonus`,
            'badge-dark mb-2 mr-2'
        ));

        // Life bonus
        m.push(MD.badge(
            `+${player.LifeBonus}% Life bonus`,
            'badge-dark mb-2 mr-2'
        ));

        // Gold bonus
        m.push(MD.badge(
            `+${player.Tower}% Gold bonus`,
            'badge-dark mb-2 mr-2'
        ));

        this.header.html(`
          <div class="d-flex w-100 justify-content-between">
            <h4 class="modal-title text-white">${player.Name}<small class="ml-2 text-muted" style="font-size: 60%">${player.Group.Name || ''}</small></h4>
            <h4 class="modal-title text-white">${player.Level}${UIUtil.dif(player, cmp, 'Level')}</h4>
          </div>
        `);

        var b = [];

        b.push(`
            <div class="progress bg-dark mt-n4 mb-4 mx-n2" style="height: 1px;">
              <div class="progress-bar" style="width: ${Math.trunc(100 * player.XP / player.XPNext)}%" role="progressbar"></div>
            </div>
            <h5>Modifiers</h5>
            <h5>${m.join('')}</h5>
            <hr/>
            <h5>Attributes</h5>
            <div class="row">
              <div class="col">Strength</div>
              <div class="col text-center text-muted">${player.Strength}${UIUtil.dif(player, cmp, 'Strength')}</div>
              <div class="col">Constitution</div>
              <div class="col text-center text-muted">${player.Constitution}${UIUtil.dif(player, cmp, 'Constitution')}</div>
            </div>
            <div class="row">
              <div class="col">Dexterity</div>
              <div class="col text-center text-muted">${player.Dexterity}${UIUtil.dif(player, cmp, 'Dexterity')}</div>
              <div class="col">Luck</div>
              <div class="col text-center text-muted">${player.Luck}${UIUtil.dif(player, cmp, 'Luck')}</div>
            </div>
            <div class="row">
              <div class="col">Intelligence</div>
              <div class="col text-center text-muted">${player.Intelligence}${UIUtil.dif(player, cmp, 'Intelligence')}</div>
              <div class="col">Armor</div>
              <div class="col text-center text-muted">${player.Armor}${UIUtil.dif(player, cmp, 'Armor')}</div>
            </div>
            <hr/>
            <h5>Collection</h5>
            <div class="row">
              <div class="col">
                <label>Scrapbook</label>
              </div>
              <div class="col text-center text-muted">
                <label>${player.Book}${UIUtil.dif(player, cmp, 'Book')} out of 2160</label>
              </div>
              <div class="col text-center text-muted">
                <label>${Math.trunc(100 * player.Book / 2160)}%</label>
              </div>
            </div>
            <div class="progress mt-n2" style="height: 2px;">
              <div class="progress-bar ${scrapbook < st.scrapbook.min.value ? 'bg-danger' : (scrapbook >= st.scrapbook.max.value ? 'bg-success' : 'bg-warning')}" style="width: ${Math.trunc(scrapbook)}%" role="progressbar"></div>
            </div>
            <div class="row mt-2">
              <div class="col">
                <label>Achievements</label>
              </div>
              <div class="col text-center text-muted">
                <label>${player.Achievements}${UIUtil.dif(player, cmp, 'Achievements')} out of 70</label>
              </div>
              <div class="col text-center text-muted">
                <label>${Math.trunc(100 * player.Achievements / 70)}%</label>
              </div>
            </div>
            <div class="progress mt-n2" style="height: 2px;">
              <div class="progress-bar bg-dark" style="width: ${Math.trunc(100 * player.Achievements / 70)}%" role="progressbar"></div>
            </div>
            <hr/>
            <h5>Fortress</h5>
            <div class="row">
              <div class="col">Upgrades</div>
              <div class="col text-center text-muted">${player.Fortress.Upgrades}${UIUtil.dif2(player, cmp, 'Fortress', 'Upgrades')}</div>
              <div class="col">Wall</div>
              <div class="col text-center text-muted">${player.Fortress.Wall}${UIUtil.dif2(player, cmp, 'Fortress', 'Wall')}</div>
            </div>
            <div class="row">
              <div class="col">${player.Fortress.Knights > 0 ? 'Knights' : ''}</div>
              <div class="col text-center ${MD.rif(player.Fortress.Knights >= st.knights.max.value, 'text-success') || MD.rif(player.Fortress.Knights >= st.knights.min.value, 'text-warning') || 'text-danger'}">${player.Fortress.Knights > 0 ? player.Fortress.Knights + UIUtil.dif2(player, cmp, 'Fortress', 'Knights') : ''}</div>
              <div class="col">Warriors</div>
              <div class="col text-center text-muted">${player.Fortress.Warriors}${UIUtil.dif2(player, cmp, 'Fortress', 'Warriors')}</div>
            </div>
            <div class="row">
              <div class="col"></div>
              <div class="col"></div>
              <div class="col">Archers</div>
              <div class="col text-center text-muted">${player.Fortress.Archers}${UIUtil.dif2(player, cmp, 'Fortress', 'Archers')}</div>
            </div>
            <div class="row">
              <div class="col"></div>
              <div class="col"></div>
              <div class="col">Mages</div>
              <div class="col text-center text-muted">${player.Fortress.Mages}${UIUtil.dif2(player, cmp, 'Fortress', 'Mages')}</div>
            </div>
            <hr/>
            <div class="row">
                <div class="col">
                    <h5>Dungeons</h5>
                    <div class="row">
                        <div class="col">Tower</div>
                        <div class="col text-center text-muted">${player.Tower}${UIUtil.dif(player, cmp, 'Tower')}</div>
                    </div>
                    <br>
                    <div class="row">
                        <div class="col"></div>
                        <div class="col"></div>
                    </div>
                    <div class="row">
                        <div class="col">Group dungeon</div>
                        <div class="col text-center text-muted">${player.DamageBonus}${UIUtil.dif(player, cmp, 'DamageBonus')}</div>
                    </div>
                    <div class="row">
                        <div class="col">Player dungeon</div>
                        <div class="col text-center text-muted">${player.LifeBonus}${UIUtil.dif(player, cmp, 'LifeBonus')}</div>
                    </div>
                </div>
        `);

        // Group
        if (player.Group.Role) {
            b.push(`
                <div class="col">
                    <h5>Group</h5>
                    <div class="row">
                        <div class="col">Position</div>
                        <div class="col text-center text-muted">${Enum.Role[player.Group.Role]}</div>
                    </div>
                    <br>
                    <div class="row">
                        <div class="col">Treasure</div>
                        <div class="col text-center text-muted">${player.Group.Treasure}${UIUtil.dif2(player, cmp, 'Group', 'Treasure')}</div>
                    </div>
                    <div class="row">
                        <div class="col">Instructor</div>
                        <div class="col text-center text-muted">${player.Group.Instructor}${UIUtil.dif2(player, cmp, 'Group', 'Instructor')}</div>
                    </div>
                    <div class="row">
                        <div class="col">Pet</div>
                        <div class="col text-center ${MD.rif(player.Group.Pet >= st.pet.max.value, 'text-success') || MD.rif(player.Group.Pet >= st.pet.min.value, 'text-warning') || 'text-danger'}">${player.Group.Pet}${UIUtil.dif2(player, cmp, 'Group', 'Pet')}</div>
                    </div>
                </div>
            `);
        }
        else
        {
            b.push('<div class="col"><div class="row"><div class="col"></div><div class="col"></div></div></div>');
        }

        // Rankings
        b.push(`
            </div>
            <hr/>
            <h5>Rankings</h5>
            <div class="row">
              <div class="col"><b>Player</b></div>
              <div class="col"><b>Fortress</b></div>
            </div>
            <div class="row">
              <div class="col">Rank</div>
              <div class="col text-center text-muted">${player.RankPlayer}${UIUtil.dif(player, cmp, 'RankPlayer')}</div>
              <div class="col">Rank</div>
              <div class="col text-center text-muted">${player.RankFortress}${UIUtil.dif(player, cmp, 'RankFortress')}</div>
            </div>
            <div class="row">
              <div class="col">Honor</div>
              <div class="col text-center text-muted">${player.HonorPlayer}${UIUtil.dif(player, cmp, 'HonorPlayer')}</div>
              <div class="col">Honor</div>
              <div class="col text-center text-muted">${player.HonorFortress}${UIUtil.dif(player, cmp, 'HonorFortress')}</div>
            </div>
        `);

        this.body.html(b.join(''));

        super.show();
    }
}

class GroupModalController extends ModalController
{
    constructor()
    {
        super('m-group');

        this.header = $('#m-group-header');
        this.body = $('#m-group-body');
    }

    show(s, g, c)
    {
        var group = sf.group(s, g);
        var cmp = c ? sf.set(c - 1).Groups.find(g => g.Name == group.Name) : null;
        var b = [];

        this.header.html(`
            <div class="d-flex w-100 justify-content-between">
              <h4 class="modal-title text-white">${group.Name}</h4>
              <h4 class="modal-title text-white">${group.Rank}</h4>
            </div>
        `);

        // Details
        b.push(`
            <h5>About</h5>
            <div class="row">
                <div class="col-3">Rank</div>
                <div class="col text-center text-muted">${group.Rank}${UIUtil.dif(group, cmp, 'Rank')}</div>
                <div class="col"></div>
                <div class="col"></div>
                <div class="col"></div>
            </div>
            <div class="row">
                <div class="col-3">Members</div>
                <div class="col text-center text-muted">${group.MemberCount}${UIUtil.dif(group, cmp, 'MemberCount')} / 50</div>
                <div class="col"></div>
                <div class="col"></div>
                <div class="col"></div>
            </div>
            <hr/>
        `);

        // Upgrades
        b.push(`
            <div class="row">
                <div class="col-3">
                    <h5>Details</h5>
                </div>
                <div class="col text-center"><h6>&sum;</h6></div>
                <div class="col text-center"><h6>&empty;</h6></div>
                <div class="col text-center"><h6>Min</h6></div>
                <div class="col text-center"><h6>Max</h6></div>
            </div>
        `);

        b.push(`
            <div class="row">
                <div class="col-3">Level</div>
                <div class="col text-center text-muted">${group.Levels.Sum}${UIUtil.dif2(group, cmp, 'Levels', 'Sum')}</div>
                <div class="col text-center text-muted">${group.Levels.Avg}${UIUtil.dif2(group, cmp, 'Levels', 'Avg')}</div>
                <div class="col text-center text-muted">${group.Levels.Min}${UIUtil.dif2(group, cmp, 'Levels', 'Min')}</div>
                <div class="col text-center text-muted">${group.Levels.Max}${UIUtil.dif2(group, cmp, 'Levels', 'Max')}</div>
            </div>
            <div class="row">
                <div class="col-3">Pet</div>
                <div class="col text-center text-muted">${group.Pets.Sum}${UIUtil.dif2(group, cmp, 'Pets', 'Sum')}</div>
                <div class="col text-center ${MD.rif(group.Pets.Avg >= st.pet.max.value, 'text-success') || MD.rif(group.Pets.Avg >= st.pet.min.value, 'text-warning') || 'text-danger'}">${group.Pets.Avg}${UIUtil.dif2(group, cmp, 'Pets', 'Avg')}</div>
                <div class="col text-center ${MD.rif(group.Pets.Min >= st.pet.max.value, 'text-success') || MD.rif(group.Pets.Min >= st.pet.min.value, 'text-warning') || 'text-danger'}">${group.Pets.Min}${UIUtil.dif2(group, cmp, 'Pets', 'Min')}</div>
                <div class="col text-center ${MD.rif(group.Pets.Max >= st.pet.max.value, 'text-success') || MD.rif(group.Pets.Max >= st.pet.min.value, 'text-warning') || 'text-danger'}">${group.Pets.Max}${UIUtil.dif2(group, cmp, 'Pets', 'Max')}</div>
            </div>
        `);

        if (group.Knights)
        {
            b.push(`
                <div class="row">
                    <div class="col-3">Treasure</div>
                    <div class="col text-center text-muted">${group.Treasures.Sum}${UIUtil.dif2(group, cmp, 'Treasures', 'Sum')}</div>
                    <div class="col text-center text-muted">${group.Treasures.Avg}${UIUtil.dif2(group, cmp, 'Treasures', 'Avg')}</div>
                    <div class="col text-center text-muted">${group.Treasures.Min}${UIUtil.dif2(group, cmp, 'Treasures', 'Min')}</div>
                    <div class="col text-center text-muted">${group.Treasures.Max}${UIUtil.dif2(group, cmp, 'Treasures', 'Max')}</div>
                </div>
                <div class="row">
                    <div class="col-3">Instructor</div>
                    <div class="col text-center text-muted">${group.Instructors.Sum}${UIUtil.dif2(group, cmp, 'Instructors', 'Sum')}</div>
                    <div class="col text-center text-muted">${group.Instructors.Avg}${UIUtil.dif2(group, cmp, 'Instructors', 'Avg')}</div>
                    <div class="col text-center text-muted">${group.Instructors.Min}${UIUtil.dif2(group, cmp, 'Instructors', 'Min')}</div>
                    <div class="col text-center text-muted">${group.Instructors.Max}${UIUtil.dif2(group, cmp, 'Instructors', 'Max')}</div>
                </div>
                <div class="row">
                    <div class="col-3">Knights</div>
                    <div class="col text-center text-muted">${group.Knights.Sum}${UIUtil.dif2(group, cmp, 'Knights', 'Sum')}</div>
                    <div class="col text-center ${MD.rif(group.Knights.Avg >= st.knights.max.value, 'text-success') || MD.rif(group.Knights.Avg >= st.knights.min.value, 'text-warning') || 'text-danger'}">${group.Knights.Avg}${UIUtil.dif2(group, cmp, 'Knights', 'Avg')}</div>
                    <div class="col text-center ${MD.rif(group.Knights.Min >= st.knights.max.value, 'text-success') || MD.rif(group.Knights.Min >= st.knights.min.value, 'text-warning') || 'text-danger'}">${group.Knights.Min}${UIUtil.dif2(group, cmp, 'Knights', 'Min')}</div>
                    <div class="col text-center ${MD.rif(group.Knights.Max >= st.knights.max.value, 'text-success') || MD.rif(group.Knights.Max >= st.knights.min.value, 'text-warning') || 'text-danger'}">${group.Knights.Max}${UIUtil.dif2(group, cmp, 'Knights', 'Max')}</div>
                </div>
            `);
        }

        this.body.html(b.join(''));

        super.show();
    }
}

class MainController
{
    static show()
    {
        if (!st.visited.value)
        {
            st.visited.value = true;
            mc.help.show();
        }

        var entries = [];
        for (var[i, set] of sf.rsets())
        {
            entries.push(`
                <a class="list-group-item list-group-item-action mb-2 hoverable ${i + 1 == MainController.compareToId ? 'border-primary' : ''}" index="${i + 1}" onclick="MainController.showSet(${i});">
                    <div class="d-flex w-100 justify-content-between">
                        <div>
                            <h5 class="mb-1">${set.Label}</h5>
                            <span class="badge badge-dark mr-1">${set.Groups.length} groups</span>
                            <span class="badge badge-dark">${set.Players.length} players</span>
                        </div>
                        <div class="mr-2 p-1 mt-2">
                            <button type="button" class="btn btn-link p-0" onclick="event.stopPropagation(); MainController.remove(${i});">
                                <i class="fas fa-trash fa-lg text-dark remove-icon"></i>
                            </button>
                        </div>
                    </div>
                </a>
            `);
        }

        $('#m-list').html(entries.join(''));
        $('#m-list > a').on('contextmenu', function(e) {
            e.preventDefault();

            MainController.compareTo($(this).attr('index'));
        });
    }

    static showSet(i)
    {
        mc.set.show(i, MainController.compareToId);
    }

    static compareTo(i)
    {
        MainController.compareToId = MainController.compareToId == i ? 0 : i;
        MainController.show();
    }

    static remove(i)
    {
         sf.remove(i);

         MainController.show();
    }

    static import(f)
    {
        SFImporter.importFile(f, MainController.show);
    }
}
