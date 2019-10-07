window.db = new DatabaseIO();
window.he = new HighlightEngine();

/*
    ENTRY POINT FOR NEW FILES FOR IMPORT INTO THE DATABASE
*/
window.import = function (f) {
    let r = new FileReader();
    r.readAsText(f, 'UTF-8');
    r.onload = event => {
        try {
            window.db.import(JSON.parse(event.target.result), f.lastModified);
        } catch (e) {
            console.error(e);
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

window.he.highlight = function (v, e) {
    if (v >= window.he.rules()[e].max) return `<span class="fsuccess">${v}</span>`;
    if (v >= window.he.rules()[e].min) return `<span class="fwarning">${v}</span>`;
    else return `<span class="fdanger">${v}</span>`;
}

/*
    SETTINGS PAGE
*/
window.settings = {
    init: function () {
        this.reset();
    },
    reset: function () {
        _('stbookmin').val(window.he.rules().book.min);
        _('stbookmax').val(window.he.rules().book.max);
        _('stpetmin').val(window.he.rules().pet.min);
        _('stpetmax').val(window.he.rules().pet.max);
        _('stknightmin').val(window.he.rules().knights.min);
        _('stknightmax').val(window.he.rules().knights.max);
        _('stmountmin').val(window.he.rules().mount.min);
        _('stmountmax').val(window.he.rules().mount.max);
        _('sttreasuremin').val(window.he.rules().treasure.min);
        _('sttreasuremax').val(window.he.rules().treasure.max);
        _('stinstructormin').val(window.he.rules().instructor.min);
        _('stinstructormax').val(window.he.rules().instructor.max);
        _('stienchantment').prop('checked', window.he.rules().ienchant);
        _('stiweapon').prop('checked', window.he.rules().iweapons);
        _('stiexcess').prop('checked', window.he.rules().iexcess);
        _('stmarknew').val(window.he.rules().badgenew);
        _('stold').val(window.he.rules().badgeold);
    },
    save: function () {
        if (this.validate()) {
            window.he.save({
                book: {
                    min: _('stbookmin').val(),
                    max: _('stbookmax').val()
                },
                pet: {
                    min: _('stpetmin').val(),
                    max: _('stpetmax').val()
                },
                knights: {
                    min: _('stknightmin').val(),
                    max: _('stknightmax').val()
                },
                mount: {
                    min: _('stmountmin').val(),
                    max: _('stmountmax').val()
                },
                treasure: {
                    min: _('sttreasuremin').val(),
                    max: _('sttreasuremax').val()
                },
                instructor: {
                    min: _('stinstructormin').val(),
                    max: _('stinstructormax').val()
                },
                badgenew: _('stmarknew').val(),
                ienchant: _('stienchantment').prop('checked') ? 1 : 0,
                iweapons: _('stiweapon').prop('checked') ? 1 : 0,
                iexcess: _('stiweapon').prop('checked') ? 1 : 0,
                badgeold: _('stold').val()
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

        _('glatest').addClass('uk-invisible');
        if (Date.now() - window.db.db().Groups[gid].LatestTimestamp > TIME_WEEK) {
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
        _('gpetavg').html(window.he.highlight(g.Pets.Avg, 'pet'));
        _('gpetmin').html(g.Pets.Min);
        _('gpetmax').html(g.Pets.Max);

        _('gknightssum').html(g.Knights.Sum);
        _('gknightsavg').html(window.he.highlight(g.Knights.Avg, 'knights'));
        _('gknightsmin').html(g.Knights.Min);
        _('gknightsmax').html(g.Knights.Max);

        _('gtreasuresum').html(g.Treasures.Sum);
        _('gtreasureavg').html(window.he.highlight(g.Treasures.Avg, 'treasure'));
        _('gtreasuremin').html(g.Treasures.Min);
        _('gtreasuremax').html(g.Treasures.Max);

        _('ginstructorsum').html(g.Instructors.Sum);
        _('ginstructoravg').html(window.he.highlight(g.Instructors.Avg, 'instructor'));
        _('ginstructormin').html(g.Instructors.Min);
        _('ginstructormax').html(g.Instructors.Max);

        if (g.Own) {
            window.group.current = gid;
            _('gcompare').html('<option value="0"></option>' + window.db.db().Groups[gid].List.map(entry => `<option value="${entry.timestamp}">${new ReadableDate(entry.timestamp)}</option>`));
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
        html2canvas(_('gtable')[0], {
            logging: false
        }).then(function (canvas) {
            canvas.toBlob(function (blob) {
                window.download('group', blob);
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

        _('platest').addClass('uk-invisible');
        if (Date.now() - window.db.db().Players[pid].LatestTimestamp > 1000 * 60 * 60 * 24 * 7) {
            _('platest').removeClass('uk-invisible');
        }

        _('pname').html(p.Name);
        _('pimage').attr('data-src', `images/class_${[ '', 'warrior', 'mage', 'hunter', 'assassin', 'warlock', 'berserker'][p.Class]}.png`);
        _('plevel').html(p.Level);
        _('pgroup').html(p.Group ? p.Group.Name : '');
        _('pxp').css('width', `${ 100 * p.XP / p.XPNext }%`).css('border-bottom', '2px solid #212121');

        _('pmountbonus').html(p.Mount ? `-${ p.Mount === 4 ? 5 : p.Mount }0% Travel duration` : 'No mount').removeClass('uk-label-success uk-label-warning uk-label-danger').addClass(
            p.Mount >= window.he.rules().mount.max ? 'uk-label-success' : (p.Mount >= window.he.rules().mount.min ? 'uk-label-warning' : 'uk-label-danger')
        );
        for (var i = 0; i < 3; i++)
        {
            _(`ppot${ i + 1 }`).html(p.Potions[i].Type ? `+${p.Potions[i].Size}% ${Strings.Potions[p.Potions[i].Type]}` : 'Empty slot').removeClass('uk-label-success uk-label-warning uk-label-danger').addClass(
                p.Potions[i].Size >= 25 ? 'uk-label-success' : (p.Potions[i].Size >= 10 ? 'uk-label-warning' : 'uk-label-danger')
            );
        }
        _('pbookbonus').html(`+${ Math.trunc(p.Book / 21.6) }% XP bonus`).removeClass('uk-label-success uk-label-warning uk-label-danger').addClass(
            p.Book / 21.6 >= window.he.rules().book.max ? 'uk-label-success' : (p.Book / 21.6 >= window.he.rules().book.min ? 'uk-label-warning' : 'uk-label-danger')
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
            p.Book / 21.6 >= window.he.rules().book.max ? '#32d296' : (p.Book / 21.6 >= window.he.rules().book.min ? '#faa05a' : '#f0506e')
        }`);

        _('pachnum').html(`${ p.Achievements.Owned } out of 70`);
        _('pachpercent').html(`${ Math.trunc(p.Achievements.Owned / 0.7) }%`);
        _('pachbar').css('width', `${ p.Achievements.Owned / 0.7 }%`).css('border-bottom', `2px solid #212121`);

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
            _('pgpet').html(window.he.highlight(p.Group.Pet, 'pet'));

            if (p.Group.Own) {
                _('pgtreasure').html(window.he.highlight(p.Group.Treasure, 'treasure'));
                _('pginstructor').html(window.he.highlight(p.Group.Instructor, 'instructor'));
                _('pgknights').html(window.he.highlight(p.Fortress.Knights, 'knights'));

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

        content.push({
            data: p,
            latest: n,
            content: `
                <div data-pid="${p.ID}" data-class="${p.Class}">
                    <div class="uk-inline">
                        <a class="uk-display-block uk-card uk-link-toggle uk-card-body uk-card-default uk-padding-remove" onclick="window.nav('player', ${p.ID})">
                            <img class="uk-padding-small" data-src="images/${Strings.Images.Class[p.Class]}" width="128" height="128" uk-img>
                            <div class="uk-padding-small uk-padding-remove-top">
                                ${p.Name}
                            </div>
                        </a>
                        ${n ? '' : '<span uk-icon="icon: history; ration: 1.5" class="danger uk-position-top-left uk-padding-small"></span>'}
                    </div>
                </div>
            `
        });
    }

    content.sort(function (a, b) {
        if (a.latest && b.latest) {
            if ((a.data.Group && a.data.Group.Role) || (b.data.Group && b.data.Group.Role)) {
                if ((a.data.Group && a.data.Group.Role) && (b.data.Group && b.data.Group.Role)) {
                    if (a.data.Group.Role === b.data.Group.Role) {
                        return b.data.Level - a.data.Level;
                    } else return a.data.Group.Role - b.data.Group.Role;
                } else return (a.data.Group && a.data.Group.Role) ? -1 : 1;
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

        content.push({
            data: g,
            latest: n,
            content: `
                <div data-gid="${g.ID}">
                    <div class="uk-inline">
                        <a class="uk-display-block uk-card uk-link-toggle uk-card-body uk-card-default uk-padding-remove" onclick="window.nav('group', ${g.ID})">
                            <img class="uk-padding-small" data-src="images/${Strings.Images.Group}" width="128" height="128" uk-img>
                            <div class="uk-padding-small uk-padding-remove-top">
                                ${g.Name}
                            </div>
                        </a>
                        ${n ? '' : '<span uk-icon="icon: history; ration: 1.5" class="danger uk-position-top-left uk-padding-small"></span>'}
                    </div>
                </div>
            `
        });
    }

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

    let g = window.db.db().Groups[gid].Latest;
    let t = window.db.db().Groups[gid].LatestTimestamp;

    let cc = window.db.db().Groups[gid][reftime];

    let plist = g.MemberIDs.filter(id => window.db.db().Players[id][t] &&window.db.db().Players[id][t].Group.Role < 4).map(id => window.db.db().Players[id][t]);
    let clist = cc ? cc.MemberIDs.filter(id => window.db.db().Players[id][reftime] && window.db.db().Players[id][reftime].Group.Role < 4).map(id => window.db.db().Players[id][reftime]): null;

    let content = [`
        <table class="table-group" cellspacing="0" cellpadding="0">
            <tbody>
                <tr>
                    <td rowspan="2" class="border-right-thin">Name</td>
                    <td colspan="4" class="border-right-thin">General</td>
                    <td colspan="3" rowspan="2" class="border-right-thin">Potions</td>
                    <td colspan="4">Group</td>
                </tr>
                <tr>
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
                    <td colspan="4" class="border-bottom-thick border-right-thin"></td>
                    <td colspan="3" class="border-bottom-thick border-right-thin"></td>
                    <td colspan="4" class="border-bottom-thick"></td>
                </tr>
    `];

    plist.forEach(function (p) {
        let c = clist ? clist.find(player => player.ID === p.ID) : null;

        if (c) {
            content.push(`
                <tr>
                    <td width="250" class="border-right-thin">${window.he.rules().badgenew > 0 && Date.now() - p.Group.Joined < [0, 604800000, 2 * 604800000, 4 * 604800000][window.he.rules().badgenew] ? '<span uk-icon="icon: tag; ratio: 1.1"></span> ' : ''}${p.Name}</td>
                    <td width="100">${p.Level}${Util.FormatDiff(p.Level, c.Level)}</td>
                    <td width="120" class="${p.Book / 21.6 < window.he.rules().book.min ? 'bdanger' : (p.Book / 21.6 >= window.he.rules().book.max ? 'bsuccess' : 'bwarning')}">${Number(p.Book / 21.6).toFixed(1)}%${
                        p.Book > c.Book ? ` <span>+${Number((p.Book - c.Book) / 21.6).toFixed(2)}%</span>` : (p.Book < c.Book ? ` <span>${Number((p.Book - c.Book) / 21.6).toFixed(2)}%</span>` : '')
                    }</td>
                    <td width="80" class="border-right-thin ${p.Mount < window.he.rules().mount.min ? 'bdanger' : (p.Mount >= window.he.rules().mount.max ? 'bsuccess' : 'bwarning')}">${p.Mount ? ['', '10%', '20%', '30%', '50%'][p.Mount] : ''}</td>
                    <td width="100" class="border-right-thin">${p.Achievements.Owned}</td>
                    <td width="30" class="${p.Potions[0].Size < 5 ? 'bdanger' : (p.Potions[0].Size >= 25 ? 'bsuccess' : 'bwarning')}"></td>
                    <td width="30" class="${p.Potions[1].Size < 5 ? 'bdanger' : (p.Potions[1].Size >= 25 ? 'bsuccess' : 'bwarning')}"></td>
                    <td width="30" class="border-right-thin ${p.Potions[2].Size < 5 ? 'bdanger' : (p.Potions[2].Size >= 25 ? 'bsuccess' : 'bwarning')}"></td>
                    <td width="100">${p.Group.Treasure}${Util.FormatDiff(p.Group.Treasure, c.Group.Treasure)}</td>
                    <td width="100">${p.Group.Instructor}${Util.FormatDiff(p.Group.Instructor, c.Group.Instructor)}</td>
                    <td width="100" class="${p.Group.Pet < window.he.rules().pet.min ? 'bdanger' : (p.Group.Pet >= window.he.rules().pet.max ? 'bsuccess' : 'bwarning')}">${p.Group.Pet}${Util.FormatDiff(p.Group.Pet, c.Group.Pet)}</td>
                    <td width="100" class="${p.Fortress.Knights < window.he.rules().knights.min ? 'bdanger' : (p.Fortress.Knights >= window.he.rules().knights.max ? 'bsuccess' : 'bwarning')}">${p.Fortress.Knights}/${p.Fortress.Fortress}${Util.FormatDiff(p.Fortress.Knights, c.Fortress.Knights)}</td>
                </tr>
            `);
        } else {
            content.push(`
                <tr>
                    <td width="250" class="border-right-thin">${window.he.rules().badgenew > 0 && Date.now() - p.Group.Joined < [0, 604800000, 2 * 604800000, 4 * 604800000][window.he.rules().badgenew] ? '<span uk-icon="tag"></span> ' : ''}${p.Name}</td>
                    <td width="100">${p.Level}</td>
                    <td width="120" class="${p.Book / 21.6 < window.he.rules().book.min ? 'bdanger' : (p.Book / 21.6 >= window.he.rules().book.max ? 'bsuccess' : 'bwarning')}">${Number(p.Book / 21.6).toFixed(1)}%</td>
                    <td width="80" class="border-right-thin ${p.Mount < window.he.rules().mount.min ? 'bdanger' : (p.Mount >= window.he.rules().mount.max ? 'bsuccess' : 'bwarning')}">${p.Mount ? ['', '10%', '20%', '30%', '50%'][p.Mount] : ''}</td>
                    <td width="100" class="border-right-thin">${p.Achievements.Owned}</td>
                    <td width="30" class="${p.Potions[0].Size < 5 ? 'bdanger' : (p.Potions[0].Size >= 25 ? 'bsuccess' : 'bwarning')}"></td>
                    <td width="30" class="${p.Potions[1].Size < 5 ? 'bdanger' : (p.Potions[1].Size >= 25 ? 'bsuccess' : 'bwarning')}"></td>
                    <td width="30" class="border-right-thin ${p.Potions[2].Size < 5 ? 'bdanger' : (p.Potions[2].Size >= 25 ? 'bsuccess' : 'bwarning')}"></td>
                    <td width="100">${p.Group.Treasure}</td>
                    <td width="100">${p.Group.Instructor}</td>
                    <td width="100" class="${p.Group.Pet < window.he.rules().pet.min ? 'bdanger' : (p.Group.Pet >= window.he.rules().pet.max ? 'bsuccess' : 'bwarning')}">${p.Group.Pet}</td>
                    <td width="100" class="${p.Fortress.Knights < window.he.rules().knights.min ? 'bdanger' : (p.Fortress.Knights >= window.he.rules().knights.max ? 'bsuccess' : 'bwarning')}">${p.Fortress.Knights}/${p.Fortress.Fortress}</td>
                </tr>
            `);
        }
    });

    content.push('</tbody></table>');

    _('gtable').html(content.join(''));
});
