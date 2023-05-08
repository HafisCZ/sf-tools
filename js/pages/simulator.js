Site.ready({ type: 'simulator' }, function (urlParams) {
    let simulatorMode = 'players_all';

    Editor.createPlayerEditor('#sim-editor');
    const editor = new Editor('#sim-editor');

    var selected = -1;
    var yourself = -1;

    var players = [];
    var iterator = 0;

    let ihofMode = false;
    $('#ihof-mode').captiveToggleButton('player_sim/ihof', active => {
        ihofMode = active;
        showPlayers();
    })

    let gladiatorMode = false;
    $('#gladiator-mode').captiveToggleButton('player_sim/gladiator', active => {
        gladiatorMode = active;
    })

    let noAttributeReductionMode = false;
    $('#no-attribute-reduction-mode').toggleButton(active => {
        noAttributeReductionMode = active;
    })

    function getSimulatorFlags () {
        return {
            Gladiator15: gladiatorMode,
            NoGladiatorReduction: ihofMode,
            NoAttributeReduction: noAttributeReductionMode
        };
    }

    SimulatorUtils.configure({
        params: urlParams,
        onCopy: () => {
            return players.map(p => ModelUtils.toSimulatorData(p.player));
        },
        insertType: 'players',
        onInsert: (data) => {
            handlePaste(data);
        },
        onLog: (callback) => {
            executeSimulation(1, 50, callback);
        }
    });

    let pasteMode = false;
    $('#paste-mode').toggleButton(active => pasteMode = active);

    $('#save-screenshot').click(function () {
        let $target = $('.screenshot-target');
        let $hiddenRows = $('.screenshot-target .row').slice(0, 2);

        $hiddenRows.hide();
        $target.css('margin-right', '-2rem').css('padding-right', '1rem');
        $target.css('color', 'black');

        html2canvas($target.get(0), {
            logging: false,
            ignoreElements: element => element.tagName == 'I' || element.id == 'save-screenshot',
            onclone: doc => {
                $hiddenRows.show();
                $target.css('margin-right', '').css('padding-right', '');
                $target.css('color', '');

                $(doc).find('.selected').removeClass('selected');
            }
        }).then(canvas => {
            canvas.toBlob(blob => {
                Exporter.download(`simulator_${Date.now()}.png`, blob);
            });
        });
    });

    $('#sim-mode').dropdown({
        values: ['all', 'attack', 'defend', 'tournament'].map(value => ({
            name: intl(`players.mode.${value}`),
            value
        }))
    }).dropdown('setting', 'onChange', (value, text) => {
        simulatorMode = value;

        if (simulatorMode === 'attack' || simulatorMode === 'defend') {
            if (selected !== -1 && yourself === -1) {
                yourself = selected;
            }
        } else {
            yourself = -1;
        }

        for (var p of players) {
            p.score = null;
        }

        Store.shared.set('player_sim/mode', value, true);

        clearSort();
    }).dropdown('set selected', Store.shared.get('player_sim/mode', 'all', true))

    $('#sim-editor input').on('paste', function (event) {
        event.stopPropagation();
    });

    // Paste handler
    $(document.body).on('paste', function (event) {
        try {
            let pasteData = event.originalEvent.clipboardData.getData('text');
            let pasteJson = JSON.parse(pasteData);

            handlePaste(pasteJson);
        } catch (e) {
            console.info(e);
        }
    }).on('dragover dragenter', function (event) {
        event.preventDefault();
        event.stopPropagation();
    }).on('drop', async function (event) {
        // Handle drag & drop in case we want to paste data via preset file
        let contentType = _dig(event, 'originalEvent', 'dataTransfer', 'files', 0, 'type');
        if (contentType == 'text/plain' || contentType == '') {
            event.preventDefault();
            event.stopPropagation();

            try {
                let pasteData = await event.originalEvent.dataTransfer.files[0].text();
                let pasteJson = JSON.parse(pasteData);
                let pasteImpl = contentType == 'text/plain' ? pasteJson : PlayaResponse.importData(pasteJson).players;

                handlePaste(pasteImpl);
            } catch (e) {
                console.info(e);
            }
        }
    });

    // Paste handler
    function preparePlayerData (data) {
        let object = data.Class ? data : new PlayerModel(data);

        ItemModel.forceCorrectRune(object.Items.Wpn1);
        ItemModel.forceCorrectRune(object.Items.Wpn2);

        if (object.Class == WARRIOR && typeof object.BlockChance == 'undefined') {
            object.BlockChance = object.Items.Wpn2.DamageMin;
        }

        if (object.Class != ASSASSIN) {
            object.Items.Wpn2 = ItemModel.empty();
        }

        return object;
    }

    function handlePaste (data) {
        data = SimulatorUtils.handlePaste(data);

        if (Array.isArray(data)) {
            if (pasteMode == false) {
                players = [];

                iterator = 0;
                selected = -1;
                yourself = -1;

                editor.clear();
            }

            for (let entry of data) {
                players.push({
                    player: _merge(new PlayerModel(), preparePlayerData(entry)),
                    score: null,
                    index: iterator++
                })
            }

            showPlayers();
        } else if (data.Class || data.save) {
            editor.fill(preparePlayerData(data));
        }
    }

    $('#sim-threads').captiveInputField('player_sim/threads', 4, v => !isNaN(v) && v >= 1);
    $('#sim-iterations').captiveInputField('player_sim/iterations', 2500, v => !isNaN(v) && v >= 1);

    function executeSimulation (instances, iterations, logCallback) {
        const canSimulate = players.length > 0 && ((simulatorMode != 'attack' && simulatorMode != 'defend') || players.find(p => p.index == yourself));

        if (canSimulate) {
            const results = [];
            let logs = [];
            
            showPlayers(true);

            const batch = new WorkerBatch('players');

            for (let i = 0; i < players.length; i++) {
                batch.add(
                    ({ results: _results, logs: _logs }) => {
                        results.push(_results);

                        if (logCallback) {
                            logs = logs.concat(_logs);
                        }
                    },
                    {
                        player: simulatorMode === 'all' || simulatorMode === 'tournament' ? players[i] : players.find(p => p.index == yourself),
                        target: simulatorMode === 'all' || simulatorMode === 'tournament' ? players : players[i],
                        flags: getSimulatorFlags(),
                        config: SimulatorUtils.config,
                        mode: simulatorMode,
                        log: !!logCallback,
                        iterations
                    }
                )
            }

            batch.run(instances).then((duration) => {
                Toast.info(intl('simulator.toast.title'), intl('simulator.toast.message', { duration: _formatDuration(duration) }));

                players = results;
                setSort('avg', 0);

                if (logs.length > 0) {
                    logCallback({
                        fights: logs,
                        players: players.map(({ player }) => player),
                        config: SimulatorUtils.config
                    });
                }
            })
        }
    }

    // Run simulation
    $('#simulate').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 2500);

        executeSimulation(instances, iterations, false);
    });

    function addPlayer () {
        let player = editor.read();
        if (player.Name == '') {
          player.Name = `Player ${ players.length + 1 }`;
        }

        selected = iterator++;
        players.unshift({
          player: player,
          score: null,
          index: selected
        });

        editor.clear();

        showPlayers();
    }

    function insertPlayer (player) {
        players.unshift({
            player: player,
            score: null,
            index: selected = iterator++
        })

        editor.clear();

        showPlayers();
    }

    $('#save-player').click(function () {
        if (editor.valid()) {
            if (selected != -1) {
                var index = players.findIndex(p => p.index == selected);
                if (index != -1) {
                    players[index].player = editor.read();
                    players[index].score = null;
                }

                showPlayers();
            } else {
                addPlayer();
            }
        }
    });

    $('#copy-all').click(function () {
        copyJSON(players.map(p => ModelUtils.toSimulatorData(p.player)));
    });

    $('#add-player').click(function () {
        if (editor.valid()) {
            addPlayer();
        }
    });

    var sort = '';
    var order = 0;

    $('[data-sort]').click(function () {
        setSort($(this).attr('data-sort'));
    });

    function setSort (key, ord) {
        if (ord == undefined) {
            if (sort == key) {
                order = (order + 1) % 2;
            } else {
                sort = key;
                order = 0;
            }
        } else {
            sort = key;
            order = ord;
        }

        showPlayers();
    }

    function clearSort () {
        sort = '';
        order = 0;

        showPlayers();
    }

    function showPlayers (resetPlayerScore = false) {
        if (resetPlayerScore) {
            for (let i = 0; i < players.length; i++) {
                players[i].score = null;
            }
        }

        const COMPARE_METHODS = {
            'class': (a, b) => a.player.Class - b.player.Class,
            'level': (a, b) => b.player.Level - a.player.Level,
            'name': (a, b) => a.player.Name.localeCompare(b.player.Name),
            'avg': (a, b) => b.score && a.score && (b.score.avg - a.score.avg),
            'min': (a, b) => b.score && a.score && (b.score.min - a.score.min),
            'max': (a, b) => b.score && a.score && (b.score.max - a.score.max)
        }

        if (COMPARE_METHODS[sort]) {
            players.sort((a, b) => {
                if (order == 0) {
                    return COMPARE_METHODS[sort](a, b);
                } else {
                    return COMPARE_METHODS[sort](b, a);
                }
            })
        }

        $('[data-sort]').each(function () {
            $(this).attr('data-sort-style', $(this).attr('data-sort') == sort ? (order + 1) : 0);
        });

        var content = '';

        if ((simulatorMode == 'attack' || simulatorMode == 'defend') && yourself == -1) {
            if (players.length) {
                yourself = players[0].index;
            }
        }

        if (simulatorMode != 'all') {
            $('[data-sort="min"]').hide();
            $('[data-sort="max"]').hide();
        } else {
            $('[data-sort="min"]').show();
            $('[data-sort="max"]').show();
        }

        for (var i = 0; i < players.length; i++) {
            var player = players[i].player;
            var score = players[i].score;
            var index = players[i].index;

            content += `
                <div class="row selectable ${ index == selected ? 'selected' : 'nselected' } ${ (simulatorMode == 'attack' || simulatorMode == 'defend') && index == yourself ? 'purple-border' : 'transparent-border' }" data-index="${ index }">
                    <div class="player-index">${ i + 1 }</div>
                    <div class="two wide text-center column">
                        <img class="ui medium centered image" style="width: 50px;" src="${_classImageUrl(player.Class)}">
                    </div>
                    <div class="one wide text-center column">
                        <b>${ player.Level }</b>
                    </div>
                    <div class="one wide column"></div>
                    <div class="four wide column sim-player-name${ ihofMode && player.Prefix ? '-ihof' : '' }">
                        <b>${ player.Name }</b>
                        <span>${ player.Prefix }</span>
                    </div>
                    <div class="two wide text-center column">
                        ${ score ? ((simulatorMode == 'attack' || simulatorMode == 'defend') && index == yourself && simulatorMode !== 'tournament' ? '' : `${ score.avg.toFixed(2) }%`) : '' }
                    </div>
                    <div class="two wide text-center column">
                        ${ score && score.min != undefined ? `${ score.min.toFixed(2) }%` : '' }
                    </div>
                    <div class="two wide text-center column">
                        ${ score && score.max != undefined ? `${ score.max.toFixed(2) }%` : '' }
                    </div>
                    <div class="one wide text-center column">
                        ${ (simulatorMode == 'attack' || simulatorMode == 'defend') && index != yourself ? `<i class="user circle icon cursor-pointer !text-darkgreen:hover" data-index-crown="${ i }"></i>` : ''}
                    </div>
                    <div class="one wide text-center column">
                        <i class="trash right aligned alternate cursor-pointer !text-red:hover outline icon" data-index-trash="${ i }"></i>
                    </div>
                </div>
            `;
        }

        $('#sim-players').html(content);

        $('[data-index]').click(function () {
            selected = Number($(this).attr('data-index'));
            editor.fill(players.find(p => p.index == selected).player);

            showPlayers();
        });

        $('[data-index-crown]').click(function () {
            yourself = players[Number($(this).attr('data-index-crown'))].index;

            showPlayers();
        });

        $('[data-index-trash]').click(function () {
            var sel = Number($(this).attr('data-index-trash'));
            players.splice(sel, 1);

            var ss = players.findIndex(p => p.index == selected);
            if (ss == -1) {
                editor.clear();
            }

            selected = ss;

            var sx = players.findIndex(p => p.index == yourself);
            if (sx == -1) {
                yourself = -1;
            }

            showPlayers();
        });
    }

    StatisticsIntegration.configure({
        profile: FIGHT_SIMULATOR_PROFILE,
        type: 'players',
        generator: function (dm, $list) {
            for (let [prefix, players] of Object.entries(_groupBy(dm.getLatestPlayers(), p => p.Prefix))) {
                $list.append($(`
                    <div class="ui fluid basic left pointing scrolling dropdown small button inverted !text-center !mt-2">
                        <span class="">${prefix}</span>
                        <div class="menu" style="overflow-y: scroll; width: 20rem !important;">
                            <div class="ui left search icon inverted input">
                                <i class="search icon"></i>
                                <input type="text" name="search" placeholder="Search player...">
                            </div>
                            ${
                                players.sort((a, b) => b.Own - a.Own || b.Timestamp - a.Timestamp).map(player => {
                                    return `
                                        <div class="item" data-value="${player.Identifier}">
                                            <img class="ui centered image !-ml-3 !mr-2" src="${_classImageUrl(player.Class)}"><span>${ player.Level } - ${ player.Name }</span>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>
                    </div>
                `).dropdown({
                    match: 'text',
                    fullTextSearch: true,
                    action: function (_, identifier) {
                        insertPlayer(dm.getPlayer(identifier).Latest);
                    }
                }));
            }
        }
    });
});