class SetController
{
    static show(l)
    {
        const s = sf.data[l];

        if (s)
        {
            var h = `<h4 class="modal-title text-white">${s.Label}</h4><a class="btn btn-outline-light btn-sm m-0 py-1 mt-1 mr-2 px-3">Export</a>;`;
            var a = '';
            var b = '';

            for (var i in s.Players) {
              a += `<a onclick="DetailController.showPlayer(${l},${i});" class="list-group-item list-group-item-action">${s.Players[i].Name}</a>`;
            }

            for (var i in s.Groups) {
              b += `<a onclick="DetailController.showGroup(${l},${i});" class="list-group-item list-group-item-action">${s.Groups[i].Name}</a>`;
            }

            $('#modalSetHeader').html(h);
            $('#setlist').html(a);
            $('#setlist2').html(b);
            $('#setsearch').val('');
            $('#setsearch2').val('');
            $('#modalSet').modal('show');
        }
    }
}

class DetailController
{
    static showPlayer(set, id)
    {
        var player = sf.player(set, id);

        var mod0 = '';
        var mod1 = '';
        var mod2 = '';

        mod0 += `<span class="mr-2 badge ${player.Mount < st.mount.min.value ? 'badge-danger' : (player.Mount >= st.mount.max.value ? 'badge-success' : 'badge-warning')}">${player.Mount > 0 ? '-' + Enum.Mount[player.Mount] + ' Travel duration' : 'No mount'}</span>`;

        if (player.PotionLen1 > 0) {
          mod0 += `<span class="mr-2 badge ${player.PotionLen1 === 25 ? 'badge-success' : 'badge-warning'}">+${player.PotionLen1}% ${Enum.Potion[player.Potion1]}</span>`;
        }

        if (player.PotionLen2 > 0) {
          mod0 += `<span class="mr-2 badge ${player.PotionLen2 === 25 ? 'badge-success' : 'badge-warning'}">+${player.PotionLen2}% ${Enum.Potion[player.Potion2]}</span>`;
        }

        if (player.PotionLen3 > 0) {
          mod0 += `<span class="mr-2 badge ${player.PotionLen3 === 25 ? 'badge-success' : 'badge-warning'}">+${player.PotionLen3}% ${Enum.Potion[player.Potion3]}</span>`;
        }

        mod1 += `<span class="mr-2 badge ${player.Book * 100 / 2160 < st.scrapbook.min.value ? 'badge-danger' : (player.Book * 100 / 2160 >= st.scrapbook.max.value ? 'badge-success' : 'badge-warning')}">+${Math.trunc(player.Book * 1000 / 2160) / 10}% XP bonus</span>`;
        mod1 += `<span class="mr-2 badge badge-dark">+${player.Achievements * 5} Attribute bonus</span>`;

        mod2 += `<span class="mr-2 badge badge-dark">+?% Critical hit damage bonus</span>`;
        mod2 += `<span class="mr-2 badge badge-dark">+?% Damage bonus</span>`;
        mod2 += `<span class="mr-2 badge badge-dark mb-2">+?% Life bonus</span>`;

        $('#modalDetailHeader').html(`
          <div class="d-flex w-100 justify-content-between">
            <h4 class="modal-title text-white">${player.Name}</h4>
            <h4 class="modal-title text-white">${player.Level}</h4>
          </div>
        `);

        $('#modalDetailBody').html(`
          <div class="progress bg-dark mt-n4 mb-4 mx-n2" style="height: 1px;">
            <div class="progress-bar" style="width: ${Math.trunc(100 * player.XP / player.XPNext)}%" role="progressbar"></div>
          </div>
          <h5>Modifiers</h5>
          <h5>${mod0}<h5>
          <h5>${mod1}<h5>
          <h5>${mod2}<h5>
          <hr/>
          <h5>Attributes</h5>
          <div class="row">
            <div class="col">Strength</div>
            <div class="col text-center text-muted">${player.Strength}</div>
            <div class="col">Constitution</div>
            <div class="col text-center text-muted">${player.Constitution}</div>
          </div>
          <div class="row">
            <div class="col">Dexterity</div>
            <div class="col text-center text-muted">${player.Dexterity}</div>
            <div class="col">Luck</div>
            <div class="col text-center text-muted">${player.Luck}</div>
          </div>
          <div class="row">
            <div class="col">Intelligence</div>
            <div class="col text-center text-muted">${player.Intelligence}</div>
            <div class="col">Armor</div>
            <div class="col text-center text-muted">${player.Armor}</div>
          </div>
          <hr/>
          <h5>Collection</h5>
          <div class="row">
            <div class="col">
              <label>Scrapbook</label>
            </div>
            <div class="col text-center text-muted">
              <label>${player.Book} out of 2160</label>
            </div>
            <div class="col text-center text-muted">
              <label>${Math.trunc(100 * player.Book / 2160)}%</label>
            </div>
          </div>
          <div class="progress mt-n2" style="height: 2px;">
            <div class="progress-bar ${100 * player.Book / 2160 < st.scrapbook.min.value ? 'bg-danger' : (100 * player.Book / 2160 >= st.scrapbook.max.value ? 'bg-success' : 'bg-warning')}" style="width: ${Math.trunc(100 * player.Book / 2260)}%" role="progressbar"></div>
          </div>
          <div class="row mt-2">
            <div class="col">
              <label>Achievements</label>
            </div>
            <div class="col text-center text-muted">
              <label>${player.Achievements} out of 70</label>
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
            <div class="col text-center text-muted">${player.FortressUpgrades}</div>
            <div class="col">Wall</div>
            <div class="col text-center text-muted">${player.FortressWall}</div>
          </div>
          <div class="row">
            <div class="col">${player.FortressKnights > 0 ? 'Knights' : ''}</div>
            <div class="col text-center ${player.FortressKnights < st.knights.min.value ? 'text-danger' : (player.FortressKnights >= st.knights.max.value ? 'text-success' : 'text-warning')}">${player.FortressKnights > 0 ? player.FortressKnights : ''}</div>
            <div class="col">Warriors</div>
            <div class="col text-center text-muted">${player.FortressWarriors}</div>
          </div>
          <div class="row">
            <div class="col"></div>
            <div class="col"></div>
            <div class="col">Archers</div>
            <div class="col text-center text-muted">${player.FortressArchers}</div>
          </div>
          <div class="row">
            <div class="col"></div>
            <div class="col"></div>
            <div class="col">Mages</div>
            <div class="col text-center text-muted">${player.FortressMages}</div>
          </div>
          <hr/>
          <h5>Rankings</h5>
          <div class="row">
            <div class="col"><b>Player</b></div>
            <div class="col"><b>Fortress</b></div>
          </div>
          <div class="row">
            <div class="col">Rank</div>
            <div class="col text-center text-muted">${player.RankPlayer}</div>
            <div class="col">Rank</div>
            <div class="col text-center text-muted">${player.RankFortress}</div>
          </div>
          <div class="row">
            <div class="col">Honor</div>
            <div class="col text-center text-muted">${player.HonorPlayer}</div>
            <div class="col">Honor</div>
            <div class="col text-center text-muted">${player.HonorFortress}</div>
          </div>
        `);

        $('#modalDetail').modal('show');
    }

    static showGroup(set, id)
    {
        var group = sf.data[set].Groups[id];

        $('#modalDetailHeader').html('<h4 class="modal-title text-white">' + group.Name + '</h4>');
        $('#modalDetailBody').empty();

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

SettingsController.bind('#range1', '#label1', 'input', (input, label) => label.text(`${input.val()}%`));
SettingsController.bind('#range2', '#label2', 'input', (input, label) => label.text(`${input.val()}%`));
SettingsController.bind('#range3', '#label3', 'input', (input, label) => label.text(`${input.val() * 5}`));
SettingsController.bind('#range4', '#label4', 'input', (input, label) => label.text(`${input.val() * 5}`));
SettingsController.bind('#range5', '#label5', 'input', (input, label) => label.text(input.val()));
SettingsController.bind('#range6', '#label6', 'input', (input, label) => label.text(input.val()));
SettingsController.bind('#range7', '#label7', 'input', (input, label) => label.text(Enum.Mount[input.val()]));
SettingsController.bind('#range8', '#label8', 'input', (input, label) => label.text(Enum.Mount[input.val()]));
SettingsController.bind('#range9', '#label9', 'input', (input, label) => label.text(input.val()));

SettingsController.bind('#modalSettings', null, 'show.bs.modal', (modal, nl) => SettingsController.loadSettings());
SettingsController.bind('#modalSettingsSave', null, 'click', (button, nl) => SettingsController.saveSettings());

$("#setsearch").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#setlist a").filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

$("#setsearch2").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#setlist2 a").filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

$('#modalDetail').on('show.bs.modal', function() {
    $('#modalSet').modal('hide');
});

$('#modalDetail').on('hidden.bs.modal', function() {
    $('#modalSet').modal('show');
});

$(document).ready(function() {
    window.dispatchEvent(new Event('sftools.updatelist'));
});
