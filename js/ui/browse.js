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
            var raw = $(this).val().toLowerCase();
            var pfilter = p => true;
            var gfilter = g => true;

            var fil = Str.split(raw, '=<>', ' ');
            if (fil.length === 1)
            {
                pfilter = p => p.Name.toLowerCase().includes(fil[0]);
                gfilter = g => g.Name.toLowerCase().includes(fil[0]);
            }
            else if (fil.length === 3)
            {
                if (fil[0] === 'level')
                {
                    if (fil[1] === '=') pfilter = p => p.Level == fil[2];
                    else if (fil[1] === '<') pfilter = p => p.Level < fil[2];
                    else if (fil[1] === '>') pfilter = p => p.Level > fil[2];
                }
            }

            $('#m-set-playerlist a').filter(function() {
                $(this).toggle(pfilter(sf.data[mc.set.current].Players[$(this).attr('pid')]));
            })
            $('#m-set-grouplist a').filter(function() {
                $(this).toggle(gfilter(sf.data[mc.set.current].Groups[$(this).attr('gid')]));
            })
        });
    }

    exportjson()
    {
        var data = sf.data[this.current];
        var compare = this.currentcompare ? sf.data[this.currentcompare - 1] : null;

        Exporter.download(`${data.Label}${compare ? `_${compare.Label}` : ''}.json`, Exporter.jsonBlob(data, compare));
    }

    exportpng()
    {
        var data = sf.data[this.current];
        var compare = this.currentcompare ? sf.data[this.currentcompare - 1] : null;

        Exporter.pngBlob(data, compare, function (blob) {
            Exporter.download(`${data.Label}${compare ? `_${compare.Label}` : ''}.png`, blob);
        });
    }

    show(i, c)
    {
        this.current = i;
        this.currentcompare = c;

        var a = [];
        for (var [j, p] of sf.players(i))
        {
            a.push(`<a onclick="mc.player.show(${i},${j},${c});" pid="${j}" class="list-group-item list-group-item-action">${p.Name}</div>`);
        }

        var b = [];
        for (var [j, g] of sf.groups(i))
        {
            b.push(`<a onclick="mc.group.show(${i},${j},${c});" gid="${j}" class="list-group-item list-group-item-action">${g.Name}</div>`);
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

        $('#m-settings-r1').on('input', function(e) { $('#m-settings-l1').text(`${$(this).val()}%`); });
        $('#m-settings-r2').on('input', function(e) { $('#m-settings-l2').text(`${$(this).val()}%`); });
        $('#m-settings-r3').on('input', function(e) { $('#m-settings-l3').text(`${$(this).val() * 5}`); });
        $('#m-settings-r4').on('input', function(e) { $('#m-settings-l4').text(`${$(this).val() * 5}`); });
        $('#m-settings-r5').on('input', function(e) { $('#m-settings-l5').text(`${$(this).val()}`); });
        $('#m-settings-r6').on('input', function(e) { $('#m-settings-l6').text(`${$(this).val()}`); });
        $('#m-settings-r7').on('input', function(e) { $('#m-settings-l7').text(`${$(this).val() > 0 ? Enum.Mount[$(this).val()] : 'None'}`); });
        $('#m-settings-r8').on('input', function(e) { $('#m-settings-l8').text(`${$(this).val() > 0 ? Enum.Mount[$(this).val()] : 'None'}`); });
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
            <div class="row mt-2 ${player.Aura ? '' : 'd-none'}">
                <div class="col">Toilet</div>
                <div class="col text-center text-muted">${player.Aura}</div>
                <div class="col">Fill</div>
                <div class="col text-center text-muted">${player.AuraFill}</div>
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
            <h5>Fortress</h5>
            <div class="row">
              <div class="col">Fortress</div>
              <div class="col text-center text-muted">${player.Fortress.Fortress}${UIUtil.dif2(player, cmp, 'Fortress', 'Fortress')}</div>
              <div class="col">Laborers' Quarters</div>
              <div class="col text-center text-muted">${player.Fortress.LaborerQuarters}${UIUtil.dif2(player, cmp, 'Fortress', 'LaborerQuarters')}</div>
            </div>
            <div class="row">
              <div class="col">Woordcutter's Hut</div>
              <div class="col text-center text-muted">${player.Fortress.WoodcutterGuild}${UIUtil.dif2(player, cmp, 'Fortress', 'WoodcutterGuild')}</div>
              <div class="col">Quarry</div>
              <div class="col text-center text-muted">${player.Fortress.Quarry}${UIUtil.dif2(player, cmp, 'Fortress', 'Quarry')}</div>
            </div>
            <div class="row">
              <div class="col">Get Mine</div>
              <div class="col text-center text-muted">${player.Fortress.GemMine}${UIUtil.dif2(player, cmp, 'Fortress', 'GemMine')}</div>
              <div class="col">Academy</div>
              <div class="col text-center text-muted">${player.Fortress.Academy}${UIUtil.dif2(player, cmp, 'Fortress', 'Academy')}</div>
            </div>
            <div class="row">
              <div class="col">Archery Guild</div>
              <div class="col text-center text-muted">${player.Fortress.ArcheryGuild}${UIUtil.dif2(player, cmp, 'Fortress', 'ArcheryGuild')}</div>
              <div class="col">Barracks</div>
              <div class="col text-center text-muted">${player.Fortress.Barracks}${UIUtil.dif2(player, cmp, 'Fortress', 'Barracks')}</div>
            </div>
            <div class="row">
              <div class="col">Mages' Tower</div>
              <div class="col text-center text-muted">${player.Fortress.MageTower}${UIUtil.dif2(player, cmp, 'Fortress', 'MageTower')}</div>
              <div class="col">Treasury</div>
              <div class="col text-center text-muted">${player.Fortress.Treasury}${UIUtil.dif2(player, cmp, 'Fortress', 'Treasury')}</div>
            </div>
            <div class="row">
              <div class="col">Smithy</div>
              <div class="col text-center text-muted">${player.Fortress.Smithy}${UIUtil.dif2(player, cmp, 'Fortress', 'Smithy')}</div>
              <div class="col">Fortifications</div>
              <div class="col text-center text-muted">${player.Fortress.Fortifications}${UIUtil.dif2(player, cmp, 'Fortress', 'Fortifications')}</div>
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
        for (var[i, set] of sf.rsets())//<div class="d-flex w-100 justify-content-between"></div>
        {
            entries.push(`
                <a class="list-group-item list-group-item-action mb-2 ${i + 1 == MainController.compareToId ? 'border-primary' : ''}" index="${i + 1}" onclick="MainController.showSet(${i});">
                    <div class="d-flex justify-content-between w-100">
                        <div class="d-flex justify-content-start">
                            <div class="btn-group-vertical m-0 ml-n5 pr-2" role="group" onclick="event.stopPropagation();" oncontextmenu="event.stopPropagation();">
                                <button type="button" class="btn btn-link p-0 m-0 pb-1 ${i == sf.data.length - 1 ? 'invisible' : ''}" onclick="event.stopPropagation(); MainController.move(${i},1)">
                                    <i class="fas fa-chevron-up remove-icon"></i>
                                </button>
                                <button type="button" class="btn btn-link p-0 m-0 mb-n1 ${i ? '' : 'invisible'}" onclick="event.stopPropagation(); MainController.move(${i},-1)">
                                    <i class="fas fa-chevron-down remove-icon"></i>
                                </button>
                            </div>
                            <div class="ml-4">
                                <h5 class="mb-1">${set.Label}</h5>
                                <span class="badge badge-dark mr-1">${set.Groups.length} groups</span>
                                <span class="badge badge-dark">${set.Players.length} players</span>
                            </div>
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

    static move(set, direction)
    {
        if ((set == 0 && direction == -1) || (set == sf.data.length - 1 && direction == 1))
        {
            return;
        }
        else
        {
            sf.swap(set, set + direction);

            if (set + 1 == MainController.compareToId)
            {
                MainController.compareTo(set + 1 + direction);
            }
            else if (set + 1 + direction == MainController.compareToId)
            {
                MainController.compareTo(set + 1);
            }

            MainController.show();
        }
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

class Exporter
{
    static download(filename, blob)
    {
        // Create element
        let a = document.createElement('a');
        a.download = filename;
        a.href = URL.createObjectURL(blob);

        // Add element to document
        document.body.appendChild(a);

        // Click element
        a.click();

        // Cleanup
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
    }

    static jsonBlob(data, compare)
    {
        var out = data;

        if (compare)
        {
            data.Players.forEach(function (p) {
                var cp = compare.Players.find(a => a.Name === p.Name);
                if (cp) {
                    var dp = {
                        Level: p.Level - cp.Level,
                        RankPlayer: p.RankPlayer - cp.RankPlayer,
                        RankFortress: p.RankFortress - cp.RankFortress,
                        HonorPlayer: p.HonorPlayer - cp.HonorPlayer,
                        HonorFortress: p.HonorFortress - cp.HonorFortress,
                        LifeBonus: p.LifeBonus - cp.LifeBonus,
                        DamageBonus: p.DamageBonus - cp.DamageBonus,
                        Tower: p.Tower - cp.Tower,
                        Achievements: p.Achievements - cp.Achievements,
                        Book: p.Book - cp.Book,
                        Fortress : {
                            Upgrades: p.Fortress.Upgrades - cp.Fortress.Upgrades,
                            Wall: p.Fortress.Wall - cp.Fortress.Wall,
                            Warriors: p.Fortress.Warriors - cp.Fortress.Warriors,
                            Archers: p.Fortress.Archers - cp.Fortress.Archers,
                            Mages: p.Fortress.Mages - cp.Fortress.Mages,
                        },
                        Strength: p.Strength - cp.Strength,
                        Constitution: p.Constitution - cp.Constitution,
                        Dexterity: p.Dexterity - cp.Dexterity,
                        Luck: p.Luck - cp.Luck,
                        Intelligence: p.Intelligence - cp.Intelligence,
                        Armor: p.Armor - cp.Armor,
                        XP: p.XP - cp.XP,
                        XPNext: p.XPNext - cp.XPNext
                    }

                    if (p.Group)
                    {
                        dp.Group = {
                            Treasure: p.Group.Treasure - cp.Group.Treasure,
                            Instructor: p.Group.Instructor - cp.Group.Instructor,
                            Pet: p.Group.Pet - cp.Group.Pet
                        };

                        dp.Fortress.Knights = p.Fortress.Knights - cp.Fortress.Knights;
                    }

                    p.Compare = dp;
                }
            });

            data.Groups.forEach(function (g) {
                var cg = compare.Groups.find(a => a.Name === g.Name);
                if (cg) {
                    var dg = {
                        MemberCount: g.MemberCount - cg.MemberCount,
                        Rank: g.Rank - cg.Rank,
                        Levels: {
                            Sum: g.Levels.Sum - cg.Levels.Sum,
                            Avg: g.Levels.Avg - cg.Levels.Avg,
                            Min: g.Levels.Min - cg.Levels.Min,
                            Max: g.Levels.Max - cg.Levels.Max
                        },
                        Pets: {
                            Sum: g.Pets.Sum - cg.Pets.Sum,
                            Avg: g.Pets.Avg - cg.Pets.Avg,
                            Min: g.Pets.Min - cg.Pets.Min,
                            Max: g.Pets.Max - cg.Pets.Max
                        },
                        Treasures: {
                            Sum: g.Treasures.Sum - cg.Treasures.Sum,
                            Avg: g.Treasures.Avg - cg.Treasures.Avg,
                            Min: g.Treasures.Min - cg.Treasures.Min,
                            Max: g.Treasures.Max - cg.Treasures.Max
                        },
                        Instructors: {
                            Sum: g.Instructors.Sum - cg.Instructors.Sum,
                            Avg: g.Instructors.Avg - cg.Instructors.Avg,
                            Min: g.Instructors.Min - cg.Instructors.Min,
                            Max: g.Instructors.Max - cg.Instructors.Max
                        },
                        Knights: {
                            Sum: g.Knights.Sum - cg.Knights.Sum,
                            Avg: g.Knights.Avg - cg.Knights.Avg,
                            Min: g.Knights.Min - cg.Knights.Min,
                            Max: g.Knights.Max - cg.Knights.Max
                        }
                    }

                    g.Compare = dg;
                }
            });
        }

        return new Blob([JSON.stringify(out)], {
            type: 'application/json;charset=utf-8'
        });
    }

    static pngBlob(data, compare, callback)
    {
        // Uinmplemented
        var content = [];

        content.push(`
            <style>
                .rb {
                    border-right: 1px solid black;
                }

                table {
                    width: 100%;
                    text-align: center;
                }

                table td {
                    font-size: 1.2em;
                }
            </style>
            <table cellspacing="0">
                <tr>
                    <td rowspan="2" class="rb">Name</td>
                    <td colspan="4" class="rb">General</td>
                    <td colspan="3" rowspan="2" class="rb">Potions</td>
                    <td colspan="4">Group</td>
                </tr>
                <tr>
                    <td>Level</td>
                    <td>Album</td>
                    <td>Mount</td>
                    <td class="rb">Awards</td>
                    <td>Treasure</td>
                    <td>Instructor</td>
                    <td>Pet</td>
                    <td>Knights</td>
                </tr>
                <tr>
                    <td colspan="12" style="border-bottom: 3px solid black"></td>
                </tr>
        `);

        data.Players.forEach(function (p) {
            var c = compare ? compare.Players.find(a => a.Name == p.Name) : null;

            if (!p.Fortress.Knights)
            {
                return;
            }

            var scrapbook = p.Book / 21.6;
            content.push(`
                <tr>
                    <td width="250" class="rb">${!c ? '<span style="font-weight: bold; background-color: #00c851; margin-top: -0.1em; font-size: 0.8em; padding: 0.1em 0.3em 0.2em 0.3em; border-radius: 0.2em ">NEW</span> ' : ''}${p.Name}</td>
                    <td width="100">${p.Level}${UIUtil.dif(p, c, 'Level')}</td>
                    <td width="120" class="${scrapbook < st.scrapbook.min.value ? 'bg-danger' : (scrapbook >= st.scrapbook.max.value ? 'bg-success' : 'bg-warning')}">${scrapbook.toFixed(1)}%${UIUtil.difbook(p, c)}</td>
                    <td width="80" class="rb ${p.Mount < st.mount.min.value ? 'bg-danger' : (p.Mount >= st.mount.max.value ? 'bg-success' : 'bg-warning')}">${p.Mount ? Enum.Mount[p.Mount] : ''}</td>
                    <td width="100" class="rb">${p.Achievements}</td>
                    <td width="30" class="${p.Potions[0].Size < 5 ? 'bg-danger' : (p.Potions[0].Size >= 25 ? 'bg-success' : 'bg-warning')}"></td>
                    <td width="30" class="${p.Potions[1].Size < 5 ? 'bg-danger' : (p.Potions[1].Size >= 25 ? 'bg-success' : 'bg-warning')}"></td>
                    <td width="30" class="rb ${p.Potions[2].Size < 5 ? 'bg-danger' : (p.Potions[2].Size >= 25 ? 'bg-success' : 'bg-warning')}"></td>
                    <td width="100">${p.Group.Treasure}${UIUtil.dif2(p, c, 'Group', 'Treasure')}</td>
                    <td width="100">${p.Group.Instructor}${UIUtil.dif2(p, c, 'Group', 'Instructor')}</td>
                    <td width="100" class="${p.Group.Pet < st.pet.min.value ? 'bg-danger' : (p.Group.Pet >= st.pet.max.value ? 'bg-success' : 'bg-warning')}">${p.Group.Pet}${UIUtil.dif2(p, c, 'Group', 'Pet')}</td>
                    <td width="100" class="${p.Fortress.Knights < st.knights.min.value ? 'bg-danger' : (p.Fortress.Knights >= st.knights.max.value ? 'bg-success' : 'bg-warning')}">${p.Fortress.Knights}/${p.Fortress.Fortress}${UIUtil.dif2(p, c, 'Fortress', 'Knights')}</td>
                </tr>
            `);
        })

        content.push('</table>');

        $('#imageblock').html(content.join(''));

        return html2canvas(document.getElementById('imageblock'), {
            logging: false
        }).then(function(canvas) {
            canvas.toBlob(callback);

            $('#imageblock').empty();
        });
    }
}
