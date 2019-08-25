class MainController
{
    static show()
    {
        if (!st.visited.value)
        {
            st.visited.value = true;
            $('#modalHelp').modal('show');
        }

        var h = [];

        for (var [i, set] of sf.rsets())
        {
            h.push(`
                <a class="list-group-item list-group-item-action mb-2 hoverable ${i == MainController.compareToId ? 'border-primary' : ''}" index="${i}" onclick="MainController.showSet(${i});">
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

        $('#list').html(h.join(''));
        $('#list > a').on('contextmenu', function(e) {
            e.preventDefault();

            MainController.compareTo($(this).attr('index'));
        });
    }

    static showSet(i)
    {
        SetController.show(i, MainController.compareToId);
    }

    static compareTo(i)
    {
        MainController.compareToId = MainController.compareToId == i ? null : i;
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

class SetController
{
    static show(i, c)
    {
        $('#modalSetHeader').html(`
            <h4 class="modal-title text-white">${sf.set(i).Label}${c ? `<small class="ml-2 text-muted">(${sf.set(c).Label})</small>` : ''}</h4>
            <a class="btn btn-outline-light dropdown-toggle m-0 py-1 mt-1 mr-2 px-3" data-toggle="dropdown">Export</a>
            <div class="dropdown-menu">
                <a class="dropdown-item">To PNG</a>
                <a class="dropdown-item">To CSV</a>
                <a class="dropdown-item">To JSON</a>
            </div>
        `);

        var a = [];
        for (var [j, p] of sf.players(i))
        {
            a.push(`<a onclick="DetailController.showPlayer(${i},${j},${c});" class="list-group-item list-group-item-action">${p.Name}</div>`);
        }
        $('#setlist').html(a.join(''));

        var b = [];
        for (var [j, g] of sf.groups(i))
        {
            b.push(`<a onclick="DetailController.showGroup(${i},${j},${c});" class="list-group-item list-group-item-action">${g.Name}</div>`);
        }
        $('#setlist2').html(b.join(''));

        $('#setsearch').val('');
        $('#setsearch2').val('');

        $('#modalSet').modal('show');
    }
}

class MD
{
    static badge(l, ...c)
    {
        return `<span class="badge ${c.join(' ')}">${l}</span>`;
    }

    static nl()
    {
        return '<br>';
    }

    static rif(r, s)
    {
        return r ? s : null;
    }
}

class UIUtil
{
    static dif2(p, cp, f, f1)
    {
        if (cp)
        {
            return UIUtil.dif(p[f], cp[f], f1);
        }

        return ``;
    }

    static dif(p, cp, f)
    {
        if (cp)
        {
            if (p[f] > cp[f])
            {
                return ` <xsm>+${p[f] - cp[f]}</xsm>`;
            }
            else if (p[f] < cp[f])
            {
                return ` <xsm>${p[f] - cp[f]}</xsm>`;
            }
        }

        return ``;
    }
}

class DetailController
{
    static showPlayer(s, p, c)
    {
        const player = sf.player(s, p);
        const cmp = c ? sf.set(c).Players.find(p => p.Name === player.Name) : null;
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
            if (player.Potions[i])
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

        $('#modalDetailHeader').html(`
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

        $('#modalDetailBody').html(b.join(''));
        $('#modalDetail').modal('show');
    }

    static showGroup(s, g, c)
    {
        var group = sf.group(s, g);
        var b = [];

        $('#modalDetailHeader').html(`
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
                <div class="col text-center text-muted">${group.Rank}</div>
                <div class="col"></div>
                <div class="col"></div>
                <div class="col"></div>
            </div>
            <div class="row">
                <div class="col-3">Members</div>
                <div class="col text-center text-muted">${group.MemberCount} / 50</div>
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

        var pa = Math.trunc(group.Pets.reduce((a, b) => a + b, 0) / group.MemberCount);
        var ps = Math.min(...group.Pets);
        var pl = Math.max(...group.Pets);

        b.push(`
            <div class="row">
                <div class="col-3">Level</div>
                <div class="col text-center text-muted">${group.Levels.reduce((a, b) => a + b, 0)}</div>
                <div class="col text-center text-muted">${Math.trunc(group.Levels.reduce((a, b) => a + b, 0) / group.MemberCount)}</div>
                <div class="col text-center text-muted">${Math.min(...group.Levels)}</div>
                <div class="col text-center text-muted">${Math.max(...group.Levels)}</div>
            </div>
            <div class="row">
                <div class="col-3">Pet</div>
                <div class="col text-center text-muted">${group.Pets.reduce((a, b) => a + b, 0)}</div>
                <div class="col text-center ${MD.rif(pa >= st.pet.max.value, 'text-success') || MD.rif(pa >= st.pet.min.value, 'text-warning') || 'text-danger'}">${pa}</div>
                <div class="col text-center ${MD.rif(ps >= st.pet.max.value, 'text-success') || MD.rif(ps >= st.pet.min.value, 'text-warning') || 'text-danger'}">${ps}</div>
                <div class="col text-center ${MD.rif(pl >= st.pet.max.value, 'text-success') || MD.rif(pl >= st.pet.min.value, 'text-warning') || 'text-danger'}">${pl}</div>
            </div>
        `);

        if (group.Knights)
        {
            var ka = Math.trunc(group.Knights.reduce((a, b) => a + b, 0) / group.MemberCount);
            var ks = Math.min(...group.Knights);
            var kl = Math.max(...group.Knights);

            b.push(`
                <div class="row">
                    <div class="col-3">Treasure</div>
                    <div class="col text-center text-muted">${group.Treasures.reduce((a, b) => a + b, 0)}</div>
                    <div class="col text-center text-muted">${Math.trunc(group.Treasures.reduce((a, b) => a + b, 0) / group.MemberCount)}</div>
                    <div class="col text-center text-muted">${Math.min(...group.Treasures)}</div>
                    <div class="col text-center text-muted">${Math.max(...group.Treasures)}</div>
                </div>
                <div class="row">
                    <div class="col-3">Instructor</div>
                    <div class="col text-center text-muted">${group.Instructors.reduce((a, b) => a + b, 0)}</div>
                    <div class="col text-center text-muted">${Math.trunc(group.Instructors.reduce((a, b) => a + b, 0) / group.MemberCount)}</div>
                    <div class="col text-center text-muted">${Math.min(...group.Instructors)}</div>
                    <div class="col text-center text-muted">${Math.max(...group.Instructors)}</div>
                </div>
                <div class="row">
                    <div class="col-3">Knights</div>
                    <div class="col text-center text-muted">${group.Knights.reduce((a, b) => a + b, 0)}</div>
                    <div class="col text-center ${MD.rif(ka >= st.knights.max.value, 'text-success') || MD.rif(ka >= st.knights.min.value, 'text-warning') || 'text-danger'}">${ka}</div>
                    <div class="col text-center ${MD.rif(ks >= st.knights.max.value, 'text-success') || MD.rif(ks >= st.knights.min.value, 'text-warning') || 'text-danger'}">${ks}</div>
                    <div class="col text-center ${MD.rif(kl >= st.knights.max.value, 'text-success') || MD.rif(kl >= st.knights.min.value, 'text-warning') || 'text-danger'}">${kl}</div>
                </div>
            `);
        }

        $('#modalDetailBody').html(b.join(''));
        $('#modalDetail').modal('show');
    }
}

class SettingsController
{
    static saveSettings()
    {
        st.scrapbook.min.value = $('#range1').val();
        st.scrapbook.max.value = $('#range2').val();
        st.pet.min.value = $('#range3').val() * 5;
        st.pet.max.value = $('#range4').val() * 5;
        st.knights.min.value = $('#range5').val();
        st.knights.max.value = $('#range6').val();
        st.mount.min.value = $('#range7').val();
        st.mount.max.value = $('#range8').val();
        st.gear.upgrades.value = $('#range9').val();

        st.highlight.value = $('#check1').prop('checked');
        st.gear.ignore_gems.value = $('#check2').prop('checked');
        st.gear.ignore_weapons.value = $('#check3').prop('checked');
        st.gear.ignore_excess.value = $('#check4').prop('checked');
    }

    static loadSettings()
    {
        $('#range1').val(st.scrapbook.min.value);
        $('#range2').val(st.scrapbook.max.value);
        $('#range3').val(st.pet.min.value / 5);
        $('#range4').val(st.pet.max.value / 5);
        $('#range5').val(st.knights.min.value);
        $('#range6').val(st.knights.max.value);
        $('#range7').val(st.mount.min.value);
        $('#range8').val(st.mount.max.value);
        $('#range9').val(st.gear.upgrades.value);

        $('#check1').prop('checked', st.highlight.value);
        $('#check2').prop('checked', st.gear.ignore_gems.value);
        $('#check3').prop('checked', st.gear.ignore_weapons.value);
        $('#check4').prop('checked', st.gear.ignore_excess.value);

        $('input[id^="range"]').trigger('input');
    }

    static bind(source, target, evt, callback)
    {
        const sourceElem = $(source);
        const targetElem = $(target);

        sourceElem.on(evt, () => callback(sourceElem, targetElem));
    }
}
