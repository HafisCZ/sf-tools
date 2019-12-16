window.dialog = function (head, content, callback) {
    $('#sfdialog-head').html(head);
    $('#sfdialog-body').html(content);
    $('#sfdialog-ok').off('click');
    $('#sfdialog-ok').on('click', function () {
        if (callback) {
            callback();
        }
        UIkit.modal($('#sfdialog')[0]).hide();
    });

    UIkit.modal($('#sfdialog')[0]).show();
};

try {
    window.db = new DatabaseIO();
} catch (e) {
    window.dialog('Database Error', 'Please contact the developer!', () => {
        //window.localStorage.removeItem([btoa('STORAGE')]);
    });
}

window.he = new HighlightEngine();

/*
    ENTRY POINT FOR NEW FILES FOR IMPORT INTO THE DATABASE
*/
window.import = function (f) {
    let r = new FileReader();
    r.readAsText(f, 'UTF-8');
    r.onload = event => {
        try {
            if (!window.db.import(JSON.parse(event.target.result), f.lastModified)) {
                throw 'Invalid file!';
            }
        } catch (e) {
            window.dialog('Import Error', `
                <p>The file could not be imported. Try a diffent file.</p>
                <p>If you think that your file is correct, you can send the file to me to analyze.</p>
            `);
        }
    }
}

window.download = function (n, b) {
    let a = document.createElement('a');
    a.download = n;
    a.href = URL.createObjectURL(b);
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}

/*
    HELPER SHORTCUT FOR DATA-ID FIELDS IN HTML ELEMENTS
*/
window._ = function (i) {
    let c = i.split(' ', 2);
    return $(`[data-id="${c[0]}"]:first ${c.length > 1 ? c[1] : ''}`);
}

window.charts = [];

window.hf = function (v, mn, mx, en) {
    if (!en) return `<span>${v}</span>`;
    if (v >= mx) return `<span class="fsuccess">${v}</span>`;
    if (v >= mn) return `<span class="fwarning">${v}</span>`;
    return `<span class="fdanger">${v}</span>`;
}

window.hb = function (v, mn, mx, en) {
    if (!en) return `<span>${v}</span>`;
    if (v >= mx) return `<span class="bsuccess">${v}</span>`;
    if (v >= mn) return `<span class="bwarning">${v}</span>`;
    return `<span class="bdanger">${v}</span>`;
}

window.hcf = function (v, mn, mx, en) {
    if (!en) return ``;
    if (v >= mx) return `fsuccess`;
    if (v >= mn) return `fwarning`;
    return `fdanger`;
}

window.hcb = function (v, mn, mx, en) {
    if (!en) return ``;
    if (v >= mx) return `bsuccess`;
    if (v >= mn) return `bwarning`;
    return `bdanger`;
}

/*
    SETTINGS PAGE
*/
window.settings = {
    init: function () {
        this.reset();
    },
    reset: function () {
        let rules = window.he.rules();

        // Book
        $('#stbe').prop('checked', rules.book_enabled);
        $('#stbmin').val(rules.book_min);
        $('#stbmax').val(rules.book_max);

        // Pet
        $('#stpe').prop('checked', rules.pet_enabled);
        $('#stpmin').val(rules.pet_min);
        $('#stpmax').val(rules.pet_max);

        // Knight hall
        $('#stke').prop('checked', rules.knights_enabled);
        $('#stkmin').val(rules.knights_min);
        $('#stkmax').val(rules.knights_max);

        // Treasure
        $('#stte').prop('checked', rules.treasure_enabled);
        $('#sttmin').val(rules.treasure_min);
        $('#sttmax').val(rules.treasure_max);

        // Instructor
        $('#stie').prop('checked', rules.instructor_enabled);
        $('#stimin').val(rules.instructor_min);
        $('#stimax').val(rules.instructor_max);

        // Mount
        $('#stme').prop('checked', rules.mount_enabled);
        $('#stmmin').val(rules.mount_min);
        $('#stmmax').val(rules.mount_max);

        // Joined ago
        $('#stje').prop('checked', rules.join_enabled);
        $('#stjval').val(rules.join);

        // Outdated entries
        $('#stoval').val(rules.outdated);
    },
    save: function () {
        if (this.validate()) {
            window.he.save({
                book_enabled: $('#stbe').prop('checked') == true,
                book_min: Number($('#stbmin').val()),
                book_max: Number($('#stbmax').val()),

                pet_enabled: $('#stpe').prop('checked') == true,
                pet_min: Number($('#stpmin').val()),
                pet_max: Number($('#stpmax').val()),

                knights_enabled: $('#stke').prop('checked') == true,
                knights_min: Number($('#stkmin').val()),
                knights_max: Number($('#stkmax').val()),

                treasure_enabled: $('#stte').prop('checked') == true,
                treasure_min: Number($('#sttmin').val()),
                treasure_max: Number($('#sttmax').val()),

                instructor_enabled: $('#stie').prop('checked') == true,
                instructor_min: Number($('#stimin').val()),
                instructor_max: Number($('#stimax').val()),

                mount_enabled: $('#stme').prop('checked') == true,
                mount_min: Number($('#stmmin').val()),
                mount_max: Number($('#stmmax').val()),

                join_enabled: $('#stje').prop('checked') == true,
                join: Number($('#stjval').val()),

                outdated: Number($('#stoval').val())
            });

            _('stapply').addClass('blink-success');
            setTimeout(() => {
                _('stapply').removeClass('blink-success');
            }, 500);
        } else {
            _('stapply').addClass('blink-danger');
            setTimeout(() => {
                _('stapply').removeClass('blink-danger');
            }, 500);
        }
    },
    validate: function () {
        return true;
    }
};

/*
    PLAYER LIST PAGE
*/
window.players = {
    init: function () {

    },
    reset_name: function () {
        _('pssearch').val('').trigger('input');
    },
    filter: function () {
        $('li[uk-filter-control]').each(function (element) {
            if ($(this).attr('uk-filter-control')) $(this).removeClass('uk-active');
            else $(this).addClass('uk-active');
        });

        let name = _('pssearch').val().toLowerCase();
        _('psgrid > div').filter(function () {
            $(this).toggle(window.db.db().Players[$(this).attr('data-pid')].Latest.Name.toLowerCase().includes(name));
        });

        UIkit.update(element = _('psgrid')[0], type = 'update');
    }
};

/*
    GROUP LIST PAGE
*/
window.groups = {
    init: function () {

    },
    reset_name: function () {
        _('gssearch').val('').trigger('input');
    },
    filter: function () {
        let name = _('gssearch').val().toLowerCase();
        _('gsgrid > div').filter(function () {
            $(this).toggle(window.db.db().Groups[$(this).attr('data-gid')].Latest.Name.toLowerCase().includes(name));
        });

        UIkit.update(element = _('gsgrid')[0], type = 'update');
    }
};

/*
    GROUP PAGE
*/
window.group = {
    init: function (gid) {
        const g = window.db.db().Groups[gid].Latest;
        const rules = window.he.rules();

        _('glatest').addClass('uk-invisible');
        if (Date.now() - window.db.db().Groups[gid].LatestTimestamp > [TIME_WEEK, 2 * TIME_WEEK, 4 * TIME_WEEK][rules.outdated]) {
            _('glatest').removeClass('uk-invisible');
        }

        _('gname').html(g.Name);
        _('grank').html(g.Rank);
        _('gcount').html(`${g.MemberCount} / 50`);

        _('glevelsum').html(g.Levels.Sum);
        _('glevelavg').html(g.Levels.Avg);
        _('glevelmin').html(g.Levels.Min);
        _('glevelmax').html(g.Levels.Max);

        _('gpetsum').html(g.Pets.Sum);
        _('gpetavg').html(window.hf(g.Pets.Avg, rules.pet_min, rules.pet_max, rules.pet_enabled));
        _('gpetmin').html(g.Pets.Min);
        _('gpetmax').html(g.Pets.Max);

        if (g.Own) {
            _('gknightssum').html(g.Knights.Sum);
            _('gknightsavg').html(window.hf(g.Knights.Avg, rules.knights_min, rules.knights_max, rules.knights_enabled));
            _('gknightsmin').html(g.Knights.Min);
            _('gknightsmax').html(g.Knights.Max);

            _('gtreasuresum').html(g.Treasures.Sum);
            _('gtreasureavg').html(window.hf(g.Treasures.Avg, rules.treasure_min, rules.treasure_max, rules.treasure_enabled));
            _('gtreasuremin').html(g.Treasures.Min);
            _('gtreasuremax').html(g.Treasures.Max);

            _('ginstructorsum').html(g.Instructors.Sum);
            _('ginstructoravg').html(window.hf(g.Instructors.Avg, rules.instructor_min, rules.instructor_max, rules.instructor_enabled));
            _('ginstructormin').html(g.Instructors.Min);
            _('ginstructormax').html(g.Instructors.Max);

            window.group.current = gid;
            _('gcompare').html('<option value="0"></option>' + window.db.db().Groups[gid].List.concat().sort((a, b) => b.timestamp - a.timestamp).map(entry => `<option value="${entry.timestamp}">${new ReadableDate(entry.timestamp)}</option>`));
            _('gcompare').trigger('change');

            $('[data-id="gown"]').show();
            $('[data-id="gtable-container"]').show();
        } else {
            $('[data-id="gown"]').hide();
            $('[data-id="gtable-container"]').hide();
        }

        const labels = Object.keys(window.db.db().Groups[gid]).filter(v => !isNaN(v)).map(v => String(new ReadableDate(Number(v))).split(' ')[0].slice(0, 6));
        const values = Object.entries(window.db.db().Groups[gid]).filter(k => !isNaN(k[0])).map(k => k[1]);
        if (labels.length > 1) {
            window.charts.forEach(c => c.destroy());
            window.charts = [
                new Chart(_('gcgrowth'), {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: g.Own ? [
                            {
                                label: 'Levels',
                                data: values.map(v => v.Levels.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#212121ff',
                                lineTension: 0,
                                yAxisID: 'A'
                            }, {
                                label: 'Pets',
                                data: values.map(v => v.Pets.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#eb4334ff',
                                lineTension: 0,
                                yAxisID: 'A'
                            }, {
                                label: 'Knights',
                                data: values.map(v => v.Knights.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#2e4f37ff',
                                lineTension: 0,
                                yAxisID: 'B'
                            }, {
                                label: 'Treasures',
                                data: values.map(v => v.Treasures.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#dbae27ff',
                                lineTension: 0,
                                yAxisID: 'A'
                            }, {
                                label: 'Instructors',
                                data: values.map(v => v.Instructors.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#75bf26ff',
                                lineTension: 0,
                                yAxisID: 'A'
                            }
                        ] : [
                            {
                                label: 'Levels',
                                data: values.map(v => v.Levels.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#212121ff',
                                lineTension: 0
                            }, {
                                label: 'Pets',
                                data: values.map(v => v.Pets.Avg),
                                backgroundColor: '#00000000',
                                borderColor: '#eb4334ff',
                                lineTension: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        tooltips: {
                            enabled: false
                        },
                        elements: {
                            point: {
                                radius: 0,
                                hitRadius: 0,
                                hoverRadius: 0
                            }
                        },
                        legend: {
                            display: true,
                            labels: {
                                usePointStyle: true
                            }
                        },
                        scales: {
                            yAxes: g.Own ? [
                                {
                                    id: 'A',
                                    type: 'linear',
                                    position: 'left',
                                    ticks: {
                                        precision: 0
                                    }
                                }, {
                                    id: 'B',
                                    type: 'linear',
                                    position: 'right',
                                    ticks: {
                                        precision: 0,
                                        stepSize: 1
                                    }
                                }
                            ] : [
                                {
                                    type: 'linear',
                                    position: 'left',
                                    ticks: {
                                        precision: 0
                                    }
                                }
                            ]
                        }
                    }
                })
            ];

            _('gcchart').show();
        } else {
            _('gcchart').hide();
        }
    },
    export: function () {
        html2canvas($('#screenshot')[0], {
            logging: false
        }).then(function (canvas) {
            canvas.toBlob(function (blob) {
                window.download(window.group.compare ? `${window.db.db().Groups[window.group.current].Latest.Name}.${window.db.db().Groups[window.group.current].LatestTimestamp}.${window.group.compare}.png` : `${window.db.db().Groups[window.group.current].Latest.Name}.${window.db.db().Groups[window.group.current].LatestTimestamp}.png`, blob);
            });
        });
    }
}

/*
    PLAYER PAGE
*/
window.player = {
    init: function (pid) {
        const p = window.db.db().Players[pid].Latest;

        let rules = window.he.rules();

        _('platest').addClass('uk-invisible');
        if (Date.now() - window.db.db().Players[pid].LatestTimestamp > [TIME_WEEK, 2 * TIME_WEEK, 4 * TIME_WEEK][rules.outdated]) {
            _('platest').removeClass('uk-invisible');
        }

        _('pname').html(p.Name);
        _('pimage').attr('data-src', `images/class_${[ '', 'warrior', 'mage', 'hunter', 'assassin', 'warlock', 'berserker'][p.Class]}.png`);
        _('plevel').html(p.Level);
        _('pgroup').html(p.Group ? p.Group.Name : '');
        _('pxp').css('width', `${ 100 * p.XP / p.XPNext }%`).css('border-bottom', '2px solid #212121');

        _('pmountbonus').html(p.Mount ? `-${ p.Mount === 4 ? 5 : p.Mount }0% Travel duration` : 'No mount').removeClass('uk-label-success uk-label-warning uk-label-danger').addClass(
            rules.mount_enabled ? (p.Mount >= rules.mount_max ? 'uk-label-success' : (p.Mount >= rules.mount_min ? 'uk-label-warning' : 'uk-label-danger')) : ''
        );
        for (var i = 0; i < 3; i++)
        {
            _(`ppot${ i + 1 }`).html(p.Potions[i].Type ? `+${p.Potions[i].Size}% ${Strings.Potions[p.Potions[i].Type]}` : 'Empty slot').removeClass('uk-label-success uk-label-warning uk-label-danger').addClass(
                p.Potions[i].Size >= 25 ? 'uk-label-success' : (p.Potions[i].Size >= 10 ? 'uk-label-warning' : 'uk-label-danger')
            );
        }
        _('pbookbonus').html(`+${ Math.trunc(p.Book / 21.6) }% XP bonus`).removeClass('uk-label-success uk-label-warning uk-label-danger').addClass(
            rules.book_enabled ? (p.Book / 21.6 >= rules.book_max ? 'uk-label-success' : (p.Book / 21.6 >= rules.book_min ? 'uk-label-warning' : 'uk-label-danger')) : ''
        );
        _('pachievementbonus').html(`+${ 5 * p.Achievements.Owned } Attribute bonus`);
        _('pdamagebonus').html(`+${ p.Dungeons.Group } Damage bonus`);
        _('plifebonus').html(`+${ p.Dungeons.Player } Life bonus`);
        _('pgoldbonus').html(`+${ p.Dungeons.Tower } Gold bonus`);

        _('pstrength').html(p.Strength.Total);
        _('pdexterity').html(p.Dexterity.Total);
        _('pintelligence').html(p.Intelligence.Total);
        _('pconstitution').html(p.Constitution.Total);
        _('pluck').html(p.Luck.Total);
        _('parmor').html(p.Armor);

        _('pbooknum').html(`${ p.Book } out of 2160`);
        _('pbookpercent').html(`${ Math.trunc(p.Book / 21.6) }%`);
        _('pbookbar').css('width', `${ p.Book / 21.6 }%`).css('border-bottom', `2px solid ${
            p.Book / 21.6 >= rules.book_max ? '#32d296' : (p.Book / 21.6 >= rules.book_min ? '#faa05a' : '#f0506e')
        }`);

        _('pachnum').html(`${ p.Achievements.Owned } out of 80`);
        _('pachpercent').html(`${ Math.trunc(p.Achievements.Owned / 0.8) }%`);
        _('pachbar').css('width', `${ p.Achievements.Owned / 0.8 }%`).css('border-bottom', `2px solid #212121`);

        const dungeons = p.Dungeons.reduce((sum, value) => sum + Math.max(0, value - 2), 0) + p.Dungeons.Tower + p.Dungeons.Player;
        const dungeons_total = 260 + 100 + 50;
        _('pdunnum').html(`${ dungeons } out of ${ dungeons_total }`);
        _('pdunpercent').html(`${ Math.trunc(100 * dungeons / dungeons_total) }%`);
        _('pdunbar').css('width', `${ 100 * dungeons / dungeons_total }%`).css('border-bottom', `2px solid #212121`);

        _('pfupgrades').html(p.Fortress.Upgrades);
        _('pfwall').html(p.Fortress.Wall);
        _('pfwarriors').html(p.Fortress.Warriors);
        _('pfarchers').html(p.Fortress.Archers);
        _('pfmages').html(p.Fortress.Mages);
        _('pffortress').html(p.Fortress.Fortress);
        _('pfwoodcuttershut').html(p.Fortress.WoodcutterGuild);
        _('pfgemmine').html(p.Fortress.GemMine);
        _('pfarcheryguild').html(p.Fortress.ArcheryGuild);
        _('pfmagestower').html(p.Fortress.MageTower);
        _('pfsmithy').html(p.Fortress.Smithy);
        _('pflabourersquarters').html(p.Fortress.LaborerQuarters);
        _('pfquarry').html(p.Fortress.Quarry);
        _('pfacademy').html(p.Fortress.Academy);
        _('pfbarracks').html(p.Fortress.Barracks);
        _('pftreasury').html(p.Fortress.Treasury);
        _('pffortifications').html(p.Fortress.Fortifications);

        if (p.Group) {
            _('pgname').html(p.Group.Name);
            _('pgpet').html(window.hf(p.Group.Pet, rules.pet_min, rules.pet_max, rules.pet_enabled));

            if (p.Group.Own) {
                _('pgtreasure').html(window.hf(p.Group.Treasure, rules.treasure_min, rules.treasure_max, rules.treasure_enabled));
                _('pginstructor').html(window.hf(p.Group.Instructor, rules.instructor_min, rules.instructor_max, rules.instructor_enabled));
                _('pgknights').html(window.hf(p.Fortress.Knights, rules.knights_min, rules.knights_max, rules.knights_enabled));

                $('[data-id="pgextra"]').show();
            } else {
                $('[data-id="pgextra"]').hide();
            }

            $('[data-id="pgroups"]').show();
        } else {
            $('[data-id="pgroups"]').hide();
        }

        const dates = Object.keys(window.db.db().Players[pid]).filter(v => !isNaN(v)).map(v => String(new ReadableDate(Number(v))).split(' ')[0].slice(0, 6));
        const instances = Object.entries(window.db.db().Players[pid]).filter(k => !isNaN(k[0])).map(k => k[1]);
        const colors = Array.from({ length: dates.length }, (v, i) => i).map((x, index, array) => {
            let col = Number(Math.trunc((array.length - x) * 0xD0 / array.length)).toString(16);
            return `#${col}${col}${col}`;
        });

        if (dates.length > 1)
        {
            for (const chart of window.charts) {
                chart.destroy();
            }

            window.charts = [];

            if (p.Group) {
                window.charts.push(new Chart(_('pcgroup'), {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: p.Group.Own ? [
                            {
                                label: 'Knights',
                                data: instances.map(i => i.Fortress.Knights),
                                backgroundColor: 'rgba(0, 0, 0, 0)',
                                borderColor: '#212121',
                                lineTension: 0,
                                yAxisID: 'A'
                            }, {
                                label: 'Treasure',
                                data: instances.map(i => i.Group.Treasure),
                                backgroundColor: 'rgba(0, 0, 0, 0)',
                                borderColor: '#dbae27',
                                lineTension: 0,
                                yAxisID: 'B'
                            }, {
                                label: 'Instructor',
                                data: instances.map(i => i.Group.Instructor),
                                backgroundColor: 'rgba(0, 0, 0, 0)',
                                borderColor: '#75bf26',
                                lineTension: 0,
                                yAxisID: 'B'
                            }, {
                                label: 'Pet',
                                data: instances.map(i => i.Group.Pet),
                                backgroundColor: 'rgba(0, 0, 0, 0)',
                                borderColor: '#eb4334',
                                lineTension: 0,
                                yAxisID: 'B'
                            }
                        ] : [
                            {
                                label: 'Pet',
                                data: instances.map(i => i.Group.Pet),
                                backgroundColor: 'rgba(0, 0, 0, 0)',
                                borderColor: '#eb4334',
                                lineTension: 0
                            }
                        ]
                    },
                    options: {
                        reponsive: true,
                        maintainAspectRatio: false,
                        tooltips: {
                            enabled: false
                        },
                        legend: {
                            display: true
                        },
                        elements: {
                            point: {
                                radius: 0,
                                hitRadius: 0,
                                hoverRadius: 0
                            }
                        },
                        scales: {
                            yAxes: p.Group.Own ? [
                                {
                                    id: 'A',
                                    type: 'linear',
                                    position: 'left',
                                    ticks: {
                                        precision: 0,
                                        stepSize: 1
                                    }
                                }, {
                                    id: 'B',
                                    type: 'linear',
                                    position: 'right',
                                    ticks: {
                                        precision: 0
                                    }
                                }
                            ] : [
                                {
                                    type: 'linear',
                                    position: 'left',
                                    ticks: {
                                        precision: 0
                                    }
                                }
                            ]
                        }
                    }
                }));
            }

            window.charts.push(new Chart(_('pclevel'), {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            data: instances.map(i => i.Level),
                            backgroundColor: 'rgba(0, 0, 0, 0)',
                            borderColor: '#212121',
                            lineTension: 0,
                            yAxisID: 'A'
                        }, {
                            data: instances.map(i => i.Strength.Total),
                            backgroundColor: '#00000000',
                            borderColor: '#1b66b57f',
                            lineTension: 0,
                            yAxisID: 'B'
                        }, {
                            data: instances.map(i => i.Dexterity.Total),
                            backgroundColor: '#00000000',
                            borderColor: '#16c91c7f',
                            lineTension: 0,
                            yAxisID: 'B'
                        }, {
                            data: instances.map(i => i.Intelligence.Total),
                            backgroundColor: '#00000000',
                            borderColor: '#cfc3237f',
                            lineTension: 0,
                            yAxisID: 'B'
                        }, {
                            data: instances.map(i => i.Constitution.Total),
                            backgroundColor: '#00000000',
                            borderColor: '#a40ec97f',
                            lineTension: 0,
                            yAxisID: 'B'
                        }, {
                            data: instances.map(i => i.Luck.Total),
                            backgroundColor: '#00000000',
                            borderColor: '#b30b0b7f',
                            lineTension: 0,
                            yAxisID: 'B'
                        }
                    ]
                },
                options: {
                    reponsive: true,
                    maintainAspectRatio: false,
                    tooltips: {
                        enabled: false
                    },
                    legend: {
                        display: false
                    },
                    elements: {
                        point: {
                            radius: 0,
                            hitRadius: 0,
                            hoverRadius: 0
                        }
                    },
                    scales: {
                        yAxes: [
                            {
                                id: 'A',
                                type: 'linear',
                                position: 'left',
                                ticks: {
                                    precision: 0
                                }
                            }, {
                                id: 'B',
                                type: 'linear',
                                position: 'right',
                                ticks: {
                                    precision: 0
                                }
                            }
                        ]
                    }
                }
            }));

            window.charts.push(new Chart(_('pccollect'), {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Scrapbook',
                            data: instances.map(i => i.Book / 21.6),
                            backgroundColor: '#00000000',
                            borderColor: '#068ca1',
                            lineTension: 0,
                        }, {
                            label: 'Achievements',
                            data: instances.map(i => i.Achievements.Owned / 0.7),
                            backgroundColor: '#00000000',
                            borderColor: '#a87714',
                            lineTension: 0,
                        }, {
                            label: 'Dungeons',
                            data: instances.map(i => 100 * (i.Dungeons.reduce((sum, value) => sum + Math.max(0, value - 2), 0) + i.Dungeons.Player + i.Dungeons.Tower) / (260 + 100 + 50)),
                            backgroundColor: '#00000000',
                            borderColor: '#1448a8',
                            lineTension: 0,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    tooltips: {
                        enabled: false
                    },
                    elements: {
                        point: {
                            radius: 0,
                            hitRadius: 0,
                            hoverRadius: 0
                        }
                    },
                    legend: {
                        display: true,
                        labels: {
                            usePointStyle: true
                        }
                    },
                    scales: {
                        yAxes: [
                            {
                                type: 'linear',
                                position: 'left',
                                ticks: {
                                    precision: 0,
                                    min: 0,
                                    max: 100,
                                    stepSize: 10,
                                    callback: function (value, index, values) {
                                        return value + '%';
                                    }
                                }
                            }
                        ]
                    }
                }
            }));

            window.charts.push(new Chart(_('pcfort'), {
                type: 'bar',
                data: {
                    labels: ['Fortress', 'Gem Mine', 'Smithy', 'Quarters', 'Treasury', 'Academy'],
                    datasets: instances.map(function (i, index, array) {
                        const cur = i;
                        const prv = index === 0 ? null : array[index - 1];

                        return {
                            label: dates[index],
                            data: prv ? [
                                i.Fortress.Fortress - prv.Fortress.Fortress,
                                i.Fortress.GemMine - prv.Fortress.GemMine,
                                i.Fortress.Smithy - prv.Fortress.Smithy,
                                i.Fortress.LaborerQuarters - prv.Fortress.LaborerQuarters,
                                i.Fortress.Treasury - prv.Fortress.Treasury,
                                i.Fortress.Academy - prv.Fortress.Academy
                            ] : [
                                i.Fortress.Fortress,
                                i.Fortress.GemMine,
                                i.Fortress.Smithy,
                                i.Fortress.LaborerQuarters,
                                i.Fortress.Treasury,
                                i.Fortress.Academy
                            ],
                            backgroundColor: colors[index]
                        };
                    })
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    tooltips: {
                        enabled: false
                    },
                    scales: {
                        xAxes: [{ stacked: true }],
                        yAxes: [{ stacked: true, ticks: { min: 0, stepSize: 1 } }]
                    }
                }
            }));

            $('[data-id*="pchartb"]').show();
        } else {
            $('[data-id*="pchartb"]').hide();
        }
    }
}

window.database = {
    init: function () {

    }
};

window.calendar = {
    init: function () {

    }
};

window.arena = {
    init: function () {

    }
};

/*
    HOOKS
*/
window.db.attach('change', function () {
    let content = [];

    for (const i of Object.values(window.db.db().Players)) {
        const p = i.Latest;
        const n = Date.now() - i.LatestTimestamp <= TIME_WEEK;

        const s = p.Prefix.split('_').map(x => x.toUpperCase()).join(' ');

        content.push({
            data: p,
            latest: n,
            content: `
                <div data-pid="${p.Identifier}" data-class="${p.Class}">
                    <div class="uk-inline">
                        <a class="uk-display-block uk-card uk-link-toggle uk-card-body uk-card-default uk-padding-remove" onclick="window.nav('player', '${p.Identifier}')">
                            <img class="uk-padding-small uk-margin-top" data-src="images/${Strings.Images.Class[p.Class]}" width="128" height="128" uk-img>
                            <div class="uk-padding-small uk-padding-remove-top">
                                ${p.Name}
                            </div>
                        </a>
                        <span class="uk-position-top-left uk-padding-small uk-text-top pad-half-top uk-text-small">${s}</span>
                        ${n ? '' : '<span uk-icon="icon: history" class="danger uk-position-top-right uk-padding-small"></span>'}
                    </div>
                </div>
            `
        });
    }

    content.sort(function (a, b) {
        if (a.latest && b.latest) {
            if ((a.data.Group && a.data.Group.Own && a.data.Group.Role) || (b.data.Group && b.data.Group.Own && b.data.Group.Role)) {
                if ((a.data.Group && a.data.Group.Own && a.data.Group.Role) && (b.data.Group && b.data.Group.Own && b.data.Group.Role)) {
                    if (a.data.Group.Role === b.data.Group.Role) {
                        return b.data.Level - a.data.Level;
                    } else return a.data.Group.Role - b.data.Group.Role;
                } else return (a.data.Group && a.data.Group.Own && a.data.Group.Role) ? -1 : 1;
            } else return b.data.Level - a.data.Level;
        } else return !a.latest & b.latest
    });

    _('psgrid').html(content.map(c => c.content).join(''));
}, true);

window.db.attach('change', function () {
    let content = [];

    for (const i of Object.values(window.db.db().Groups)) {
        const g = i.Latest;
        const n = Date.now() - i.LatestTimestamp <= TIME_WEEK;

        const s = g.Prefix.split('_').map(x => x.toUpperCase()).join(' ');

        content.push({
            data: g,
            latest: n,
            content: `
                <div data-gid="${g.Identifier}">
                    <div class="uk-inline">
                        <a class="uk-display-block uk-card uk-link-toggle uk-card-body uk-card-default uk-padding-remove" onclick="window.nav('group', '${g.Identifier}')">
                            <img class="uk-padding-small" data-src="images/${Strings.Images.Group}" width="128" height="128" uk-img>
                            <div class="uk-padding-small uk-padding-remove-top">
                                ${g.Name}
                            </div>
                        </a>
                        <span class="uk-position-top-left uk-padding-small uk-text-top pad-half-top uk-text-small">${s}</span>
                        ${n ? '' : '<span uk-icon="icon: history" class="danger uk-position-top-right uk-padding-small"></span>'}
                    </div>
                </div>
            `
        });
    }

    content.sort(function (a, b) {
        return (b.data.Own && !a.data.Own) || (b.latest - a.latest);
    });

    _('gsgrid').html(content.map(c => c.content).join(''));
}, true);

window.db.attach('change', function () {
    let used = Object.keys(window.localStorage).reduce((array, key) => array + window.localStorage[key].length * 2, 0);
    _('dbalert').html(`
        <div uk-alert class="uk-flex uk-flex-center ${used > 7.5 * 1024 * 1024 ? 'uk-alert-danger' : (used > 5 * 1024 * 1024 ? 'uk-alert-warning' : 'uk-alert-success')}">
            <div>You are currently storing ${window.db.entries().length} entries that occupy ${Math.trunc(used / 1024)} KB</div>
        </div>
    `);
}, true);

window.db.attach('change', function () {
    let content = [];
    for (const [index, entry] of Iterator.reversed(window.db.entries()))
    {
        content.push(`
            <li>
                <a class="uk-accordion-title uk-background-muted uk-padding-small">${new ReadableDate(entry.timestamp)}</a>
                <div class="uk-accordion-content uk-padding-small uk-padding-remove-vertical">
                    <table class="uk-table uk-table-justify table-padding-small">
                        <tbody>
                            <tr>
                                <td class="uk-width-small">Timestamp</td>
                                <td>${entry.timestamp}</td>
                                <td rowspan="4" class="uk-table-shrink"><button class="uk-button uk-button-danger uk-button-small" onclick="window.db.remove(${index});">remove</button></td>
                            </tr>
                            <tr>
                                <td>Player count</td>
                                <td>${entry.players.length}</td>
                            </tr>
                            <tr>
                                <td>Group count</td>
                                <td>${entry.groups.length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </li>
        `);
    }

    _('dblist').html(content.join(''));
}, true);

/*
    Import files when selected via file browser
*/
_('dbbrowser').on('change', function (event) {
    event.preventDefault();
    Array.from(this.files).forEach(window.import);
});

_('dbdrop').on('dragover', function (event) {
    event.preventDefault();
});

_('dbdrop').on('drop', function (event) {
    event.preventDefault();
    Array.from(event.originalEvent.dataTransfer.items).forEach(function (file) {
        if (file.kind === 'file') window.import(file.getAsFile());
    });
});

_('pssearch').on('input change', window.players.filter);
_('pssearch').val('');

_('gssearch').on('input change', window.groups.filter);
_('gssearch').val('');

_('gcompare').on('change', function () {
    let gid = window.group.current;
    let reftime = $(this).val();

    window.group.compare = reftime == 0 ? null : reftime;

    let g = window.db.db().Groups[gid].Latest;
    let t = window.db.db().Groups[gid].LatestTimestamp;

    let cc = window.db.db().Groups[gid][reftime];

    let plist = g.MemberIDs.filter(id => window.db.db().Players[id] && window.db.db().Players[id][t] && window.db.db().Players[id][t].Group && window.db.db().Players[id][t].Group.Role < 4).map(id => window.db.db().Players[id][t]);
    let clist = cc ? cc.MemberIDs.filter(id => window.db.db().Players[id] && window.db.db().Players[id][reftime] && window.db.db().Players[id][reftime].Group && window.db.db().Players[id][reftime].Group.Role < 4).map(id => window.db.db().Players[id][reftime]): null;

    let viewTableTag = '<table class="table-group">';
    let shotTableTag = '<table class="table-group" style="width: 1260px !important">';

    let content = [`
            <tbody>
                <tr>
                    <td rowspan="2" class="border-right-thin">Name</td>
                    <td colspan="5" class="border-right-thin">General</td>
                    <td colspan="3" rowspan="2" class="border-right-thin">Potions</td>
                    <td colspan="4">Group</td>
                </tr>
                <tr>
                    <td>Class</td>
                    <td>Level</td>
                    <td>Album</td>
                    <td>Mount</td>
                    <td class="border-right-thin">Awards</td>
                    <td>Treasure</td>
                    <td>Instructor</td>
                    <td>Pet</td>
                    <td>Knights</td>
                </tr>
                <tr>
                    <td colspan="1" class="border-bottom-thick border-right-thin"></td>
                    <td colspan="5" class="border-bottom-thick border-right-thin"></td>
                    <td colspan="3" class="border-bottom-thick border-right-thin"></td>
                    <td colspan="4" class="border-bottom-thick"></td>
                </tr>
    `];

    let toCompString = function (a, b) {
        if (a < b) {
            return ` <span>${a - b}</span>`;
        } else if (a > b) {
            return ` <span>+${a - b}</span>`;
        } else {
            return '';
        }
    }

    let rules = window.he.rules();

    plist.forEach(function (p) {
        let c = clist ? clist.find(player => player.Identifier === p.Identifier) : null;

        if (c) {
            content.push(`
                <tr>
                    <td width="250" class="border-right-thin">${rules.join_enabled && Date.now() - p.Group.Joined < [604800000, 2 * 604800000, 4 * 604800000][rules.join] ? '<span uk-icon="icon: tag; ratio: 1.1"></span> ' : ''}${p.Name}</td>
                    <td width="120">${Strings.Classes[p.Class]}</td>
                    <td width="100">${p.Level}${Util.FormatDiff(p.Level, c.Level)}</td>
                    <td width="120" class="${window.hcb(p.Book / 21.6, rules.book_min, rules.book_max, rules.book_enabled)}">${Number(p.Book / 21.6).toFixed(1)}%${
                        p.Book > c.Book ? ` <span>+${Number((p.Book - c.Book) / 21.6).toFixed(2)}%</span>` : (p.Book < c.Book ? ` <span>${Number((p.Book - c.Book) / 21.6).toFixed(2)}%</span>` : '')
                    }</td>
                    <td width="80" class="border-right-thin ${window.hcb(p.Mount, rules.mount_min, rules.mount_max, rules.mount_enabled)}">${p.Mount ? ['', '10%', '20%', '30%', '50%'][p.Mount] : ''}</td>
                    <td width="100" class="border-right-thin">${p.Achievements.Owned}${
                        p.Achievements.Dehydration ? ' <span>H</span>' : ''
                    }</td>
                    <td width="30" class="${p.Potions[0].Size < 5 ? 'bdanger fdanger' : (p.Potions[0].Size >= 25 ? 'bsuccess fsuccess' : 'bwarning fwarning')}">${p.Potions[0].Size}</td>
                    <td width="30" class="${p.Potions[1].Size < 5 ? 'bdanger fdanger' : (p.Potions[1].Size >= 25 ? 'bsuccess fsuccess' : 'bwarning fwarning')}">${p.Potions[1].Size}</td>
                    <td width="30" class="border-right-thin ${p.Potions[2].Size < 5 ? 'bdanger fdanger' : (p.Potions[2].Size >= 25 ? 'bsuccess fsuccess' : 'bwarning fwarning')}">${p.Potions[2].Size}</td>
                    <td width="100" class="${window.hcb(p.Group.Treasure, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${p.Group.Treasure}${Util.FormatDiff(p.Group.Treasure, c.Group.Treasure)}</td>
                    <td width="100" class="${window.hcb(p.Group.Instructor, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${p.Group.Instructor}${Util.FormatDiff(p.Group.Instructor, c.Group.Instructor)}</td>
                    <td width="100" class="${window.hcb(p.Group.Pet, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${p.Group.Pet}${Util.FormatDiff(p.Group.Pet, c.Group.Pet)}</td>
                    <td width="100" class="${window.hcb(p.Fortress.Knights, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${p.Fortress.Knights}/${p.Fortress.Fortress}${Util.FormatDiff(p.Fortress.Knights, c.Fortress.Knights)}</td>
                </tr>
            `);
        } else {
            content.push(`
                <tr>
                    <td width="250" class="border-right-thin">${rules.join_enabled && Date.now() - p.Group.Joined < [604800000, 2 * 604800000, 4 * 604800000][rules.join] ? '<span uk-icon="tag"></span> ' : ''}${p.Name}</td>
                    <td width="120">${Strings.Classes[p.Class]}</td>
                    <td width="100">${p.Level}</td>
                    <td width="120" class="${window.hcb(p.Book / 21.6, rules.book_min, rules.book_max, rules.book_enabled)}">${Number(p.Book / 21.6).toFixed(1)}%</td>
                    <td width="80" class="border-right-thin ${window.hcb(p.Mount, rules.mount_min, rules.mount_max, rules.mount_enabled)}">${p.Mount ? ['', '10%', '20%', '30%', '50%'][p.Mount] : ''}</td>
                    <td width="100" class="border-right-thin">${p.Achievements.Owned}${
                        p.Achievements.Dehydration ? ' <span>H</span>' : ''
                    }</td>
                    <td width="30" class="${p.Potions[0].Size < 5 ? 'bdanger fdanger' : (p.Potions[0].Size >= 25 ? 'bsuccess fsuccess' : 'bwarning fwarning')}">${p.Potions[0].Size}</td>
                    <td width="30" class="${p.Potions[1].Size < 5 ? 'bdanger fdanger' : (p.Potions[1].Size >= 25 ? 'bsuccess fsuccess' : 'bwarning fwarning')}">${p.Potions[1].Size}</td>
                    <td width="30" class="border-right-thin ${p.Potions[2].Size < 5 ? 'bdanger fdanger' : (p.Potions[2].Size >= 25 ? 'bsuccess fsuccess' : 'bwarning fwarning')}">${p.Potions[2].Size}</td>
                    <td width="100" class="${window.hcb(p.Group.Treasure, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${p.Group.Treasure}</td>
                    <td width="100" class="${window.hcb(p.Group.Instructor, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${p.Group.Instructor}</td>
                    <td width="100" class="${window.hcb(p.Group.Pet, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${p.Group.Pet}</td>
                    <td width="100" class="${window.hcb(p.Fortress.Knights, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${p.Fortress.Knights}/${p.Fortress.Fortress}</td>
                </tr>
            `);
        }
    });

    content.push(`
        <tr>
            <td>
                <br/>
            </td>
        </tr>
        <tr>
            <td></td>
            <td class="border-bottom-thick" colspan="2">Level</td>
            <td class="border-bottom-thick" colspan="2">Group pet</td>
            <td class="border-bottom-thick" colspan="4">Knights</td>
            <td class="border-bottom-thick" colspan="2">Treasure</td>
            <td class="border-bottom-thick" colspan="2">Instructor</td>
        </tr>
    `);

    content.push(cc ? `
        <tr>
            <td class="border-right-thin">Min</td>
            <td colspan="2" >${g.Levels.Min}${toCompString(g.Levels.Min, cc.Levels.Min)}</td>
            <td colspan="2" class="${window.hcf(g.Pets.Min, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${g.Pets.Min}${toCompString(g.Pets.Min, cc.Pets.Min)}</td>
            <td colspan="4" class="${window.hcf(g.Knights.Min, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${g.Knights.Min}${toCompString(g.Knights.Min, cc.Knights.Min)}</td>
            <td colspan="2" class="${window.hcf(g.Treasures.Min, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${g.Treasures.Min}${toCompString(g.Treasures.Min, cc.Treasures.Min)}</td>
            <td colspan="2" class="${window.hcf(g.Instructors.Min, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${g.Instructors.Min}${toCompString(g.Instructors.Min, cc.Instructors.Min)}</td>
        </tr>
        <tr>
            <td class="border-right-thin">Average</td>
            <td colspan="2" >${g.Levels.Avg}${toCompString(g.Levels.Avg, cc.Levels.Avg)}</td>
            <td colspan="2" class="${window.hcf(g.Pets.Avg, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${g.Pets.Avg}${toCompString(g.Pets.Avg, cc.Pets.Avg)}</td>
            <td colspan="4" class="${window.hcf(g.Knights.Avg, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${g.Knights.Avg}${toCompString(g.Knights.Avg, cc.Knights.Avg)}</td>
            <td colspan="2" class="${window.hcf(g.Treasures.Avg, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${g.Treasures.Avg}${toCompString(g.Treasures.Avg, cc.Treasures.Avg)}</td>
            <td colspan="2" class="${window.hcf(g.Instructors.Avg, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${g.Instructors.Avg}${toCompString(g.Instructors.Avg, cc.Instructors.Avg)}</td>
        </tr>
        <tr>
            <td class="border-right-thin">Max</td>
            <td colspan="2" >${g.Levels.Max}${toCompString(g.Levels.Max, cc.Levels.Max)}</td>
            <td colspan="2" class="${window.hcf(g.Pets.Max, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${g.Pets.Max}${toCompString(g.Pets.Max, cc.Pets.Max)}</td>
            <td colspan="4" class="${window.hcf(g.Knights.Max, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${g.Knights.Max}${toCompString(g.Knights.Max, cc.Knights.Max)}</td>
            <td colspan="2" class="${window.hcf(g.Treasures.Max, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${g.Treasures.Max}${toCompString(g.Treasures.Max, cc.Treasures.Max)}</td>
            <td colspan="2" class="${window.hcf(g.Instructors.Max, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${g.Instructors.Max}${toCompString(g.Instructors.Max, cc.Instructors.Max)}</td>
        </tr>
    ` : `
        <tr>
            <td class="border-right-thin">Min</td>
            <td colspan="2" >${g.Levels.Min}</td>
            <td colspan="2" class="${window.hcf(g.Pets.Min, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${g.Pets.Min}</td>
            <td colspan="4" class="${window.hcf(g.Knights.Min, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${g.Knights.Min}</td>
            <td colspan="2" class="${window.hcf(g.Treasures.Min, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${g.Treasures.Min}</td>
            <td colspan="2" class="${window.hcf(g.Instructors.Min, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${g.Instructors.Min}</td>
        </tr>
        <tr>
            <td class="border-right-thin">Average</td>
            <td colspan="2" >${g.Levels.Avg}</td>
            <td colspan="2" class="${window.hcf(g.Pets.Avg, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${g.Pets.Avg}</td>
            <td colspan="4" class="${window.hcf(g.Knights.Avg, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${g.Knights.Avg}</td>
            <td colspan="2" class="${window.hcf(g.Treasures.Avg, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${g.Treasures.Avg}</td>
            <td colspan="2" class="${window.hcf(g.Instructors.Avg, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${g.Instructors.Avg}</td>
        </tr>
        <tr>
            <td class="border-right-thin">Max</td>
            <td colspan="2" >${g.Levels.Max}</td>
            <td colspan="2" class="${window.hcf(g.Pets.Max, rules.pet_min, rules.pet_max, rules.pet_enabled)}">${g.Pets.Max}</td>
            <td colspan="4" class="${window.hcf(g.Knights.Max, rules.knights_min, rules.knights_max, rules.knights_enabled)}">${g.Knights.Max}</td>
            <td colspan="2" class="${window.hcf(g.Treasures.Max, rules.treasure_min, rules.treasure_max, rules.treasure_enabled)}">${g.Treasures.Max}</td>
            <td colspan="2" class="${window.hcf(g.Instructors.Max, rules.instructor_min, rules.instructor_max, rules.instructor_enabled)}">${g.Instructors.Max}</td>
        </tr>
    `);

    if (clist) {
        let membersKicked = clist.reduce(function (sum, player) {
            if (!plist.find(p => p.Identifier == player.Identifier)) {
                sum.push(player.Name);
            }

            return sum;
        }, []);
        let membersJoined = plist.reduce(function (sum, player) {
            if (!clist.find(p => p.Identifier == player.Identifier)) {
                sum.push(player.Name);
            }

            return sum;
        }, []);

        content.push(`
            <tr>
                <td>
                    <br/>
                </td>
            </tr>
            <tr>
                <td class="border-right-thin">Joined</td>
                <td>${membersJoined.length}</td>
                <td colspan="11" class="align-left-force">${membersJoined.join(', ')}</td>
            </tr>
            <tr>
                <td class="border-right-thin">Kicked</td>
                <td>${membersKicked.length}</td>
                <td colspan="11" class="align-left-force">${membersKicked.join(', ')}</td>
            </tr>
        `);
    }

    content.push(`
        </tbody></table>
    `);

    _('gtable').html(viewTableTag + (content).join(''));
    $('#screenshot').html(shotTableTag + (content).join(''));
});
