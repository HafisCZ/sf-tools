Site.ready({ name: 'hellevator', type: 'simulator' }, function (urlParams) {
    $('[data-op="report"]').click(() => Dialog.open(ReportDialog, 'hellevator'))

    SimulatorUtils.configure({
        params: urlParams,
        onLog: (callback) => {
            executeSimulation(1, 50, callback);
        }
    });
    
    DOM.input({
        element: DOM.byID('sim-threads'),
        key: 'hellevator_sim/threads',
        def: 4,
        validator: (value)=> !isNaN(value) && value >= 1
    })

    DOM.input({
        element: DOM.byID('sim-iterations'),
        key: 'hellevator_sim/iterations',
        def: 5000,
        validator: (value)=> !isNaN(value) && value >= 1
    })

    // Validation
    const $simulateButton = $('#simulate');
    function updateButtons (valid) {
        if (valid) {
            $simulateButton.removeClass('disabled');
        } else {
            $simulateButton.addClass('disabled');
        }
    }

    // Editor
    Editor.createPlayerEditor('#sim-editor');
    Editor.createPasteTarget();

    const editor = new (class extends Editor {
        _bind () {
            this.fields['name'].editable(false);

            for (const field of this.fieldsArray) {
                field.triggerAlways = true;
            }

            super._bind();

            this.fields['snack'].show(true);
            this.fields['snack_potency'].show(true);
        }

        fill (object) {
            this.pauseListener();

            super.fill(object);
            
            this.resumeListener();
            this._changeListener();
        }

        _changeListener () {
            if (!this._ignoreChanges) {
                updateButtons(this.valid());
            }
        }
    })(
        '#sim-editor',
        null,
        Editor.getExtendedEditorFields(
            '#sim-editor',
            {
                range_start: new Field('#range-start', '1', Field.createRange(1, 500)),
                range_end: new Field('#range-end', '500', Field.createRange(1, 500))
            }
        )
    )

    // Paste
    $('input').on('paste', function (event) {
        event.stopPropagation();
    });

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

    $(document.body).on('paste', function (event) {
        try {
            const pasteData = event.originalEvent.clipboardData.getData('text');
            const pasteJson = JSON.parse(pasteData);

            if (Array.isArray(pasteJson)) {
                editor.fill(preparePlayerData(pasteJson[0]));
            } else if (typeof pasteJson === 'object') {
                editor.fill(preparePlayerData(pasteJson));
            }
        } catch (e) {
            console.info(e);
        }
    });

    // Integration
    StatisticsIntegration.configure({
        profile: SELF_PROFILE,
        type: 'players',
        cheats: true,
        scope: (dm) => dm.getLatestPlayers(true),
        callback: (player) => {
            editor.fill(player);
        }
    });

    // Display
    const $enemyList = $('#enemy-list');
    function renderEnemies (enemies, scores) {
        for (const scoreSet of scores) {
            scoreSet.avg = _sum(scoreSet) / scoreSet.length;
            scoreSet.max = _fastMax(scoreSet)
            scoreSet.min = _fastMin(scoreSet)
        }

        let content = '';

        let firstPossibleLoss = enemies.length;
        for (let i = 0; i < enemies.length; i++) {
            if ((scores[i]?.min || 0) != 1) {
                firstPossibleLoss = i;
                break;
            }
        }

        let lastPossibleWin = -1;
        for (let i = enemies.length - 1; i >= firstPossibleLoss; i--) {
            if ((scores[i]?.max || 0) != 0) {
                lastPossibleWin = i;
                break;
            }
        }

        if (lastPossibleWin === -1 && firstPossibleLoss === enemies.length) {
            lastPossibleWin = firstPossibleLoss;
        }

        if (firstPossibleLoss === lastPossibleWin && lastPossibleWin === enemies.length && enemies.length > 10) {
            // If player can win everything, display message
            content = `
                <div class="row">
                    <div class="sixteen wide text-center column" style="color: lightgreen;">
                        ${intl(`hellevator.win.all`, { count: enemies.length })}    
                    </div>
                </div>
            `
        } else if (lastPossibleWin === -1 && enemies.length > 10) {
            content = `
                <div class="row">
                    <div class="sixteen wide text-center column" style="color: orange;">
                        ${intl(`hellevator.win.none`, { count: enemies.length })}    
                    </div>
                </div>
            `
        } else {
            if (firstPossibleLoss > 0) {
                content += `
                    <div class="row">
                        <div class="sixteen wide text-center column" style="color: lightgreen;">
                            ${intl('hellevator.win.first', { count: firstPossibleLoss })}    
                        </div>
                    </div>
                `
            }

            for (const [index, enemy] of Object.entries(enemies)) {
                if (index < firstPossibleLoss || index > lastPossibleWin) {
                    continue;
                }

                const bestScore = scores[index].max
                const averageScore = scores[index].avg
                const worstScore = scores[index].min

                content += `
                    <div class="row" data-has-popup>
                        <div class="two wide text-center column">${enemy.Floor}</div>
                        <div class="three wide text-center column">${enemy.Level}</div>
                        ${
                            bestScore === 0 ? `
                                <div class="eleven wide text-center column">
                                    ${intl('pets.bulk.not_possible')}
                                </div>
                            ` : `
                                <div class="four wide text-center column" style="color: ${worstScore === 0 ? 'orange' : worstScore === 1 ? 'lightgreen' : 'white'};">
                                    ${(100 * worstScore).toFixed(2)}%
                                </div>
                                <div class="three wide text-center column" style="color: ${averageScore === 0 ? 'orange' : averageScore === 1 ? 'lightgreen' : 'white'};">
                                    ${(100 * averageScore).toFixed(2)}%
                                </div>
                                <div class="four wide text-center column" style="color: ${bestScore === 0 ? 'orange' : bestScore === 1 ? 'lightgreen' : 'white'};">
                                    ${(100 * bestScore).toFixed(2)}%
                                </div>
                            `
                        }
                    </div>
                    <div class="ui inverted popup" style="border: 1px solid #0b0c0c; width: 250px;">
                        <div class="text-center header" style="height: 3em;">${intl('hellevator.win.title')}</div>
                        <div class="ui grid css-nomargin-grid">
                            ${
                                scores[index].map((score, scoreIndex) => `
                                    <div class="row">
                                        <div class="four wide text-center column">
                                            <img class="ui medium centered image" style="width: 40px;" src="${_classImageUrl(1 + Math.trunc(scoreIndex / 3))}">
                                        </div>
                                        <div class="four wide text-center column">
                                            <img class="ui medium centered image" style="width: 40px;" src="res/element${scoreIndex % 3}.webp">
                                        </div>
                                        <div class="eight wide text-center column items-center justify-content-center" style="display: flex;">
                                            ${(100 * score).toFixed(2)}%
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                `
            }

            if (lastPossibleWin < enemies.length - 1) {
                content += `
                    <div class="row">
                        <div class="sixteen wide text-center column" style="color: orange;">
                            ${intl('hellevator.win.last', { count: enemies.length - 1 - lastPossibleWin })}    
                        </div>
                    </div>
                `
            }
        }

        $enemyList.html(content);
        $enemyList.find('[data-has-popup]').popup({
            inline: true,
            position: 'left center'
        })
    }

    async function executeSimulation (instances, iterations, logCallback) {
        if (editor.valid()) {
            $enemyList.empty();

            const player = editor.read();

            const start = player.GroupTournament.Floor || 1;
            const end = player.RangeEnd;

            const enemies = HellevatorEnemies.floorRange(start, Math.max(start, end));
            const scores = [];
            let logs = [];

            const batch = new WorkerBatch('hellevator');

            for (const [index, enemy] of Object.entries(enemies)) {
                batch.add(
                    ({ score, logs: _logs }) => {
                        scores[index] = score;

                        if (logCallback) {
                            logs = logs.concat(_logs);
                        }
                    },
                    {
                        player,
                        iterations,
                        enemy: MonsterGenerator.createVariantsOf(
                            enemy,
                            [WARRIOR, MAGE, SCOUT],
                            [RUNE_FIRE_DAMAGE, RUNE_COLD_DAMAGE, RUNE_LIGHTNING_DAMAGE],
                            {
                                updateRuneResistance: true,
                                updateDamage: false,
                                updateHealth: false
                            }
                        ),
                        log: !!logCallback,
                        config: SimulatorUtils.config
                    }
                );
            }

            batch.run(instances).then((duration) => {
                Toast.info(intl('simulator.toast.title'), intl('simulator.toast.message', { duration: _formatDuration(duration) }));

                renderEnemies(enemies, scores);

                if (logs.length > 0) {
                    logCallback({
                        fights: logs,
                        players: [player].concat(enemies),
                        config: SimulatorUtils.config
                    });
                }
            });
        }
    }
    
    // Buttons
    $('#simulate').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 5000);

        executeSimulation(instances, iterations);
    });
});