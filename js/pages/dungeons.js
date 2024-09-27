Site.ready({ name: 'dungeons', type: 'simulator', requires: ['translations_monsters'] }, function (urlParams) {
    $('[data-op="report"]').click(() => Dialog.open(ReportDialog, 'dungeons'))

    const dungeonOptions = new OptionsHandler(
        'dungeons',
        {
            threshold_min: 5,
            threshold_max: 100
        }
    );

    // Options modal
    $('#button-options').click(function () {
        Dialog.open(SimulatorOptionsDialog, dungeonOptions);
    })

    for (let dungeon of Object.values(DUNGEON_DATA)) {
        dungeon.name = intl(`dungeon_enemies.${dungeon.intl}.name`);

        for (let enemy of Object.values(dungeon.floors)) {
            enemy.name = Localization.hasTranslation(`monsters.${enemy.id}`) ? intl(`monsters.${enemy.id}`) : intl(`dungeon_enemies.${dungeon.intl}.${enemy.pos}`);
        }
    }

    let ignoreChanges = false;
    function withoutUpdate (func) {
        ignoreChanges = true;
        func();
        ignoreChanges = false;
    }

    DOM.input({
        element: DOM.byID('sim-threads'),
        key: 'dungeon_sim/threads',
        def: 4,
        validator: (value)=> !isNaN(value) && value >= 1
    })

    DOM.input({
        element: DOM.byID('sim-iterations'),
        key: 'dungeon_sim/iterations',
        def: 5000,
        validator: (value)=> !isNaN(value) && value >= 1
    })

    const HELPER_NAMES = [
        intl('dungeons.player'),
        intl('general.companion1'),
        intl('general.companion2'),
        intl('general.companion3')
    ]

    Editor.createPlayerEditor('#sim-editor');
    Editor.createPasteTarget();

    function editorUpdate () {
        saveEditor();
        settingsChanged();
    }

    const editor = new (class extends Editor {
        _bind () {
            this.fields['name'].editable(false);

            super._bind();
        }

        fill (object, index = 0) {
            this.pauseListener();

            super.fill(object);

            let isDebugEnabled = urlParams && urlParams.has('debug');

            // fill companions data automatically and disable companions class morph if sim is not in debug mode
            if (!isDebugEnabled) {
                if (index > 0) {
                    this.fields['class'].set(index);
                }

                this.morph.show(index == 0);
            }

            this.fields['class'].toggle(index == 0 || isDebugEnabled);
            this.fields['gladiator'].toggle(index == 0);
            this.fields['portal_hp'].toggle(index == 0);
            this.fields['portal_damage'].toggle(index == 0);
            this.fields['potion_life'].toggle(index == 0);
            this.fields['level'].toggle(index == 0);
            this.fields['shield'].show(object.Class == 1 && (index == 0 || isDebugEnabled));
            this.fields['name'].set(HELPER_NAMES[index]);

            this.resumeListener();
        }

        _morph (newClass) {
            super._morph(newClass);

            saveEditor();
            settingsChanged();
        }
    })('#sim-editor', editorUpdate)

    // On paste event handler
    let players = [ editor.empty(1), editor.empty(1), editor.empty(2), editor.empty(3) ];

    let boss_current = null;
    let boss = null;
    let dungeon_current = null;
    let dungeon = null;
    let availableBosses = null;

    let selected = 0;

    SimulatorUtils.configure({
        params: urlParams,
        onCopy: () => {
            return players.map((p) => ModelUtils.toSimulatorData(p));
        },
        onLog: (callback) => {
            executeSimulation(1, 50, callback);
        }
    });

    function settingsChanged () {
        $('#winchart').addClass('faded-out');
    }

    function getBossRunes (runes) {
        let values = [0, 0, 0];

        if (runes && runes.res) {
            values = runes.res;
        }

        return {
            Health: 0,
            ResistanceFire: values[0],
            ResistanceCold: values[1],
            ResistanceLightning: values[2]
        }
    }

    function getMirrorPlayerData (data, dungeon) {
        const player = _clone(players[0]);
        const config = CONFIG.fromIndex(player.Class);

        if (dungeon.shadow) {
            player.Constitution.Total = 4 * player.Constitution.Total;
        }

        player.Health = Math.trunc(
            player.Constitution.Total * config.HealthMultiplier * (player.Level + 1)
        );

        player.Level = data.level;
        player.Name = data.name;
        player.Fortress = { Gladiator: 0 }
        player.Dungeons = { Player: 0, Group: 0 }
    
        delete player.Prefix;

        return player;
    }

    function getBossData (data, dungeon) {
        if (typeof data.class === 'undefined') {
            return getMirrorPlayerData(data, dungeon);
        }

        return {
            Armor: data.armor || ((dungeon.armor_multiplier || 1) * (data.level * CONFIG.fromIndex(data.class).MaximumDamageReduction)),
            Class: data.class,
            Name: data.name,
            Level: data.level,
            Health: data.health,
            NoBaseDamage: true,
            BlockChance: typeof data.block !== 'undefined' ? data.block : undefined,
            Identifier: 999,
            Strength: { Total: data.str },
            Dexterity: { Total: data.dex },
            Intelligence: { Total: data.int },
            Constitution: { Total: data.con },
            Luck: { Total: data.lck },
            Dungeons: { Player: 0, Group: 0 },
            Fortress: { Gladiator: data.gladiator || 0 },
            Potions: { Life: 0 },
            Runes: getBossRunes(data.runes),
            Items: {
                Hand: {},
                Wpn1: {
                    AttributeTypes: { 2: data.runes ? data.runes.type : 0 },
                    Attributes: { 2: data.runes ? data.runes.damage : 0 },
                    DamageMax: data.max,
                    DamageMin: data.min,
                    HasEnchantment: false
                },
                Wpn2: {
                    AttributeTypes: { 2: data.runes ? data.runes.type : 0 },
                    Attributes: { 2: data.runes ? data.runes.damage : 0 },
                    DamageMax: data.max,
                    DamageMin: data.min,
                    HasEnchantment: false
                }
            }
        };
    }

    function getDisplayRunes (runes) {
        if (runes) {
            let displayType = ['F', 'C', 'L'][ runes.type - 40 ];

            let displayDamage = `${runes.damage} ${displayType}`;

            let displayResistance = '';
            if (Array.isArray(runes.res)) {
                displayResistance = ` / ${['F', 'C', 'L'].map((type, index) => runes.res[index] ? `${runes.res[index]} ${type}` : '').filter((v) => v).join('&nbsp; ')}`;
            }

            return `<span class="boss-rune">${displayDamage}${displayResistance}</span>`;
        } else {
            return '';
        }
    }

    $('#dungeon-list').dropdown({
        values: _sortAsc(Object.values(DUNGEON_DATA), ({ pos }) => pos).map(({ name, shadow, floors, id: value }) => {
            return {
                name: shadow ? `<span class="dungeon-shadow">${name}<span>` : name,
                value,
                disabled: Object.keys(floors).length == 0
            };
        })
    }).dropdown('setting', 'onChange', (value) => {
        dungeon_current = value;
        dungeon = DUNGEON_DATA[value];

        $('#boss-list').dropdown({
            values: Object.entries(dungeon.floors).map(([ id, _boss ]) => {
                return {
                    name: `
                        <span class="${ dungeon.shadow ? 'dungeon-shadow' : '' }">
                            ${ _boss.class ? `<img class="ui centered image boss-image" style="position: absolute; right: 0; height: 2.5em; top: 0; width: 2.5em;" src="${_classImageUrl(_boss.class)}">` : '' }
                            ${ _boss.pos }. ${ _boss.name }
                            ${ getDisplayRunes(_boss.runes) }
                        <span>
                    `,
                    value: id
                };
            })
        }).dropdown('setting', 'onChange', (value) => {
            if (!ignoreChanges) {
                $('#available-list').dropdown('clear');
            }

            settingsChanged();

            dungeon = DUNGEON_DATA[dungeon_current];
            boss = dungeon.floors[value];
            boss_current = boss;
        }).dropdown('set selected', Object.keys(dungeon.floors)[0]);
        show();
    }).dropdown('set selected', '1');

    $(document.body).on('paste', function (event) {
        if (event.target.type != 'text') {
            try {
                showData(SimulatorUtils.handlePaste(JSON.parse(event.originalEvent.clipboardData.getData('text'))));
            } catch (e) {
                console.info(e)
            }
        }
    });

    $('#sim-editor input').on('paste', function (event) { event.stopPropagation(); });

    function loadEditor (data) {
        ItemModel.forceCorrectRune(data.Items.Wpn1);
        ItemModel.forceCorrectRune(data.Items.Wpn2);

        if (data.Class == WARRIOR && typeof data.BlockChance == 'undefined') {
            data.BlockChance = data.Items.Wpn2.DamageMin;
        }

        if (data.Class != ASSASSIN) data.Items.Wpn2 = ItemModel.empty();

        if (selected > 0) {
            for (const key of ['gladiator', 'level', 'portal_hp', 'portal_damage', 'potion_life']) {
                const path = editor.fields[key].path();
                setObjectAt(data, path, getObjectAt(players[0], path));
            }
        }

        editor.fill(data, selected);
    }

    function saveEditor () {
        if (editor.valid()) {
            const obj = editor.read();
            if (selected == 0) {
                for (const key of ['gladiator', 'level', 'portal_hp', 'portal_damage', 'potion_life']) {
                    const path = editor.fields[key].path();

                    setObjectAt(players[1], path, getObjectAt(obj, path));
                    setObjectAt(players[2], path, getObjectAt(obj, path));
                    setObjectAt(players[3], path, getObjectAt(obj, path));
                }
            }

            players[selected] = obj;
        }
    }

    // Show fighters
    function show () {
        let content1 = '';

        for (let i = 0; i < 4; i++) {
            content1 += `
                <div class="row selectable ${ selected == i ? 'selected' : 'nselected' }" data-index="${ i }">
                    <div class="four wide text-center column">
                        <img class="ui medium centered image" style="width: 50px; opacity: 75%;" src="res/portrait${ i ? i : '' }.png">
                    </div>
                    <div class="eight wide column text-center">
                        <b>${HELPER_NAMES[i]}</b>
                    </div>
                    <div class="four wide column"></div>
                </div>
            `;
        }

        $('#sim-players1').html(content1);

        $('[data-index]').click(function () {
            select(Number($(this).attr('data-index')));
        });
    }

    function select (index) {
        selected = index;

        editor.fill(players[selected], selected);
        show();
    }

    select(0);

    const chart = new Chart($('#winchart'), {
        type:'line',data:{datasets:[{fill:!1,borderWidth:1.5,data:[]}]},options:{title:{display:!0},legend:{display:!1},scales:{yAxes:[{gridLines:{color:'#2e2e2e',zeroLineColor:'#2e2e2e'},display:!0,ticks:{min:0,max:100,padding:10,stepSize:20,callback:function(value,index,values){return `${ value }%`}}}],xAxes:[{display:!1}]},tooltips:{enabled:!1},animation:{duration:0},events:[],hover:{animationDuration:0,},showTooltips:!1,responsiveAnimationDuration:0,elements:{line:{borderColor:'white',tension:0},point:{radius:0}}}
    });

    function showData (data) {
        let oldSelected = selected;
        if (Array.isArray(data)) {
            for (let i = 0; i < 4; i++) {
                selected = i;
                loadEditor(data[i]);
                saveEditor();
            }

            selected = oldSelected;
            loadEditor(data[selected]);

            show();
        } else if (data.Class) {
            loadEditor(data);
            saveEditor();
        }

        settingsChanged();
    }

    const DUNGEON_ARR_TO_DID = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 ];

    function getDungeonEnemyAt (dungeon, isShadow, enemyIndex) {
        if (enemyIndex < 0) {
            return null;
        } else {
            let id = dungeon + (isShadow ? 100 : 0);
            let dung = DUNGEON_DATA[id];
            let boss = Object.entries(dung.floors)[enemyIndex];
            if (boss) {
                return {
                    dungeon: dung,
                    boss: boss[1]
                };
            } else {
                return null;
            }
        }
    }

    function getSpecialDungeonEnemyAt (dungeon, enemyIndex, soft = false) {
        if (enemyIndex < 0) {
            return null;
        } else {
            let floors = DUNGEON_DATA[dungeon].floors;
            let boss = null;
            if (soft) {
                boss = Object.entries(floors).find(x => x[1].pos == enemyIndex);
            } else {
                boss = Object.entries(floors)[enemyIndex];
            }

            if (boss) {
                return {
                    dungeon: DUNGEON_DATA[dungeon],
                    boss: boss[1]
                }
            } else {
                return null;
            }
        }
    }

    StatisticsIntegration.configure({
        profile: SELF_PROFILE,
        type: 'players',
        cheats: true,
        scope: (dm) => dm.getLatestPlayers(true),
        callback: (player) => {
            dungeon = DUNGEON_DATA[dungeon_current];
            boss = boss_current;

            showData(ModelUtils.toSimulatorData(player, true));

            let normalDungeons = player.Dungeons.Normal;
            let shadowDungeons = player.Dungeons.Shadow;
            let tower = player.Dungeons.Tower;
            let youtube = player.Dungeons.Youtube;
            let twister = player.Dungeons.Twister + 1;

            availableBosses = [
                ... normalDungeons.map((dungeon, index) => getDungeonEnemyAt(DUNGEON_ARR_TO_DID[index], false, dungeon)),
                getSpecialDungeonEnemyAt(201, player.Dungeons.Normal.Total < 90 ? -1 : tower),
                getSpecialDungeonEnemyAt(203, twister, true),
                ... shadowDungeons.map((dungeon, index) => getDungeonEnemyAt(DUNGEON_ARR_TO_DID[index], true, dungeon)),
                getSpecialDungeonEnemyAt(202, youtube),
            ].filter(boss => boss);

            if (availableBosses.length) {
                $('#available-list').parent('.field').removeClass('disabled');
                $('#sim-run-all, #sim-run-next').removeClass('disabled');
                $('#available-list').dropdown({
                    values: _sortAsc(availableBosses, ({ dungeon: _dungeon }) => _dungeon.pos).map(({ dungeon: _dungeon, boss: _boss }, index) => {
                        return {
                            name: `
                                <span class="${_dungeon.shadow ? 'dungeon-shadow' : ''}">
                                    ${ _boss.class ? `<img class="ui centered image boss-image" style="position: absolute; right: 0; height: 2.5em; top: 0; width: 2.5em;" src="${_classImageUrl(_boss.class)}">&nbsp;` : '' }
                                    <span class="boss-dungeon-name">${ _dungeon.name }</span>
                                    <span class="boss-name">${ _boss.pos }. ${ _boss.name }</span>
                                    ${ getDisplayRunes(_boss.runes) }
                                <span>
                            `,
                            value: index
                        };
                    })
                }).dropdown('setting', 'onChange', (value, text) => {
                    if (!isNaN(value) && value && value.length > 0) {
                        settingsChanged();

                        let sel = availableBosses[value];

                        dungeon = sel.dungeon;
                        boss = sel.boss;

                        withoutUpdate(() => {
                            $('#dungeon-list').dropdown('set selected', sel.dungeon.id);
                            $('#boss-list').dropdown('set selected', sel.boss.pos);
                        });
                    }
                });
            } else {
                $('#available-list').parent('.field').addClass('disabled');
                $('#sim-run-all, #sim-run-next').addClass('disabled');
            }
        }
    })

    function getDungeonExperience ({ boss, dungeon }) {
        if (dungeon.id === 201) {
            return 0;
        } else {
            return Calculations.experienceNextLevel(boss.level) / (dungeon.id === 203 ? 50 : 5);
        }
    }

    function showMassDungeonResults (bosses, results, sort, calculateTotalExperience) {
        let entries = bosses.map((dungeon, index) => {
            let result = _dig(results, index);
            if (result) {
                return Object.assign(result, dungeon);
            } else {
                return false;
            }
        }).filter(v => v);

        if (sort === 'extended') {
            let sortedBosses = [];
            for (let entry of entries) {
                let { score, boss, dungeon } = entry;

                let lowerChanceIndex = sortedBosses.findIndex(({ score: _score }) => _score < score);
                let index = sortedBosses.length;

                if (lowerChanceIndex != -1) {
                    let sameDungeonIndex = sortedBosses.findLastIndex(({ dungeon: _dungeon, boss: _boss }) => (dungeon.id in NEXT_DUNGEONS_INVERTED) ? ((_dungeon.id === dungeon.id && _boss.pos < boss.pos) || (_dungeon.id === NEXT_DUNGEONS_INVERTED[dungeon.id])) : (_dungeon.id === dungeon.id && _boss.pos < boss.pos));
                    if (sameDungeonIndex != -1) {
                        index = Math.max(lowerChanceIndex, sameDungeonIndex + 1);
                    } else {
                        index = lowerChanceIndex;
                    }
                }

                sortedBosses.splice(index, 0, entry);
            }

            entries = sortedBosses;
        } else if (sort) {
            entries.sort((b, a) => a.score - b.score);
        }

        entries = _clone(entries)

        let experienceTotal = 0;
        if (calculateTotalExperience) {
            experienceTotal = _mappedSum(entries, getDungeonExperience, 0);
        }

        for (const { boss } of entries) {
            // Set class for mirror boss
            if (typeof boss.class === 'undefined') {
                boss.class = players[0].Class;
            }
        }

        Dialog.open(SimulatorResultsDialog, entries, experienceTotal, showGraph);
    }

    function preparePlayerInstances (dungeon) {
        let playerInstances = players.map(p => _clone(p));

        if (dungeon.shadow) {
            let bert = playerInstances[1];

            let hp_a = (100 + bert.Dungeons.Player) / 100;
            let hp_b = (100 + bert.Potions.Life) / 100;
            let hp_c = (100 + bert.Runes.Health) / 100;
            let hp_d = 1.22;

            playerInstances[1].BlockChance = 0;
            playerInstances[1].Health = Math.trunc(Math.floor(bert.Constitution.Total * 5 * (bert.Level + 1) * hp_a) * hp_b * hp_c * hp_d);
        }

        return dungeon.shadow ? [ ... playerInstances.slice(1, 4), playerInstances[0] ] : [ playerInstances[0] ];
    }

    $('#sim-run-all').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 5000);
        
        if (availableBosses && availableBosses.length > 0 && editor.valid()) {
            const results = [];

            const batch = new WorkerBatch('dungeons');

            for (let [index, { boss, dungeon }] of Object.entries(availableBosses)) {
                batch.add(
                    ({ results: _results }) => {
                        results[index] = _results;
                    },
                    {
                        players: preparePlayerInstances(dungeon),
                        boss: getBossData(boss, dungeon),
                        iterations,
                        hpcap: 500,
                        config: SimulatorUtils.config
                    }
                )
            }

            batch.run(instances).then(() => {
                showMassDungeonResults(availableBosses, results, true, true);
            })
        }
    });

    const NEXT_DUNGEONS = {
        13: 30,
        113: 130,
        14: 27,
        114: 127,
        16: 28,
        116: 128,
        17: 29,
        117: 129
    };

    const NEXT_DUNGEONS_INVERTED = _invert(NEXT_DUNGEONS, true);

    $('#sim-run-next').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 5000);
        
        const threshold_min = _clamp(dungeonOptions.threshold_min, 0, 100);
        const threshold_max = _clamp(dungeonOptions.threshold_max, threshold_min, 100);
        
        if (availableBosses && availableBosses.length > 0 && editor.valid()) {
            const results = [];
            
            let pending = [];
            for (const { boss: _boss, dungeon: _dungeon } of availableBosses) {
                if (_dungeon.id === 203) {
                    // Ignore twister
                    continue;
                }

                const dungeonStack = [];

                for (const bossData of Object.values(_dungeon.floors)) {
                    if (dungeonStack.length > 0 || bossData.pos == _boss.pos) {
                        dungeonStack.push({
                            dungeon: _dungeon,
                            boss: bossData
                        })
                    }
                }

                if (_dungeon.id in NEXT_DUNGEONS) {
                    const nextId = NEXT_DUNGEONS[_dungeon.id];
                    const nextDungeon = DUNGEON_DATA[nextId];

                    for (const bossData of Object.values(nextDungeon.floors)) {
                        dungeonStack.push({
                            dungeon: nextDungeon,
                            boss: bossData
                        })
                    }
                }

                pending = pending.concat(dungeonStack);
            }

            const batch = new WorkerBatch('dungeons');

            for (const [ index, { boss, dungeon } ] of Object.entries(pending)) {
                batch.add(
                    ({ results: _results }) => {
                        const score = _results.score;

                        if (score < threshold_min * iterations / 100 || score > threshold_max * iterations / 100) {
                            // If score is outside of the threshold, skip all remaining instances with same or next id
                            batch.skip(({ id: _id }) => _id === dungeon.id || _id === NEXT_DUNGEONS[dungeon.id]);
                        } else {
                            results[index] = _results;
                        }
                    },
                    {
                        players: preparePlayerInstances(dungeon),
                        boss: getBossData(boss, dungeon),
                        iterations,
                        hpcap: 500,
                        config: SimulatorUtils.config,
                        id: dungeon.id
                    }
                )
            }

            batch.run(
                instances,
                // Execute instance only if there is none running with the same dungeon id
                ({ id }, { id: _id }) => id !== _id && NEXT_DUNGEONS_INVERTED[id] !== _id
            ).then(() => {
                if (results.length > 0) {
                    showMassDungeonResults(pending, results, 'extended', true);
                } else {
                    Toast.info(intl('dungeons.simulate_next_info.title', { threshold_min, threshold_max }), intl('dungeons.simulate_next_info.message#'));
                }
            })
        }
    });

    $('#sim-run-dungeon').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 5000);

        if (editor.valid()) {
            const results = [];
            const bossQueue = [];

            for (let bossData of Object.values(dungeon.floors)) {
                if (bossQueue.length > 0 || bossData.pos == boss.pos) {
                    bossQueue.push({
                        dungeon,
                        boss: bossData
                    })
                }
            }

            if (dungeon.id in NEXT_DUNGEONS) {
                const nextId = NEXT_DUNGEONS[dungeon.id];
                const nextDungeon = DUNGEON_DATA[nextId];

                for (const bossData of Object.values(nextDungeon.floors)) {
                    bossQueue.push({
                        dungeon: nextDungeon,
                        boss: bossData
                    })
                }
            }

            const batch = new WorkerBatch('dungeons');

            for (let [index, { boss, dungeon }] of Object.entries(bossQueue)) {
                batch.add(
                    ({ results: _results }) => {
                        results[index] = _results
                    },
                    {
                        players: preparePlayerInstances(dungeon),
                        boss: getBossData(boss, dungeon),
                        iterations,
                        hpcap: 500,
                        config: SimulatorUtils.config
                    }
                )
            }

            batch.run(instances).then(() => {
                showMassDungeonResults(bossQueue, results, false, true);
            })
        }
    })

    function executeSimulation (instances, iterations, logCallback) {
        if (boss && editor.valid()) {
            const bossInstance = getBossData(boss, dungeon);
            const playerInstances = preparePlayerInstances(dungeon);

            const results = [];
            let logs = [];

            let totalScore = 0;

            const batch = new WorkerBatch('dungeons');

            for (let i = 0; i < instances; i++) {
                batch.add(
                    ({ results: { score, healths }, logs: _logs }) => {
                        results.push(healths);
                        logs = logs.concat(_logs);

                        totalScore += score;
                    },
                    {
                        players: playerInstances,
                        boss: bossInstance,
                        config: SimulatorUtils.config,
                        log: !!logCallback,
                        iterations
                    }
                )
            }

            batch.run(instances).then(() => {
                const finalResults = new Array(results[0].length);
                for (let i = 0; i < results[0].length; i++) {
                    let healthsSum = 0;
                    for (let j = 0; j < instances; j++) {
                        healthsSum += results[j][i];
                    }

                    finalResults[i] = healthsSum / instances;
                }

                showGraph(chart, dungeon, boss, totalScore, instances * iterations, _sortAsc(finalResults));
                $('#winchart').removeClass('faded-out');

                // Download logs
                if (logs.length > 0) {
                    logCallback({
                        fights: logs,
                        players: [...playerInstances, bossInstance],
                        config: SimulatorUtils.config
                    })
                }
            })
        }
    }

    $('#sim-run').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 5000);

        executeSimulation(instances, iterations, false);
    });

    function showGraph (graph, dungeon, boss, score, tries, healths) {
        graph.options.title.text = [
            `${ dungeon.id !== 201 && dungeon.shadow ? `${intl('dungeon_enemies.shadow')} ` : '' }${ dungeon.name }: ${ boss.name }`,
            intl('dungeons.graph.winrate', { rate: (100 * score / tries).toFixed(2), score: formatAsSpacedNumber(score, ' '), tries: formatAsSpacedNumber(tries, ' ') })
        ];

        const experience = getDungeonExperience({ dungeon, boss });
        if (experience > 0) {
            graph.options.title.text.splice(1, 0, `${formatAsSpacedNumber(experience, ' ')} XP`);
        }

        graph.data.datasets[0].data = healths.map((h, i) => { return { x: i, y: h * 100 }; });
        graph.data.labels = healths.map((a, b) => b);
        graph.update(0);
    }

    function convertBossToSimulatorFormat (rawData, rawDungeon) {
        const data = getBossData(rawData, rawDungeon);

        const definition = CONFIG.fromIndex(data.Class);

        const level = data.Level;
        const health = data.Health;

        data.Constitution.Total = Math.ceil(health / (definition.HealthMultiplier * (level + 1)));

        if (typeof data.Armor === 'undefined') {
            data.Armor = definition.MaximumDamageReduction * level * (rawDungeon.armor_multiplier || 1.0);
        }

        if (data.Class === WARRIOR && typeof data.BlockChance === 'undefined') {
            data.BlockChance = 25;
        }

        return data;
    }

    return {
        currentBoss: () => convertBossToSimulatorFormat(boss, dungeon),
        currentDungeon: () => Object.values(dungeon.floors).map(b => convertBossToSimulatorFormat(b, dungeon))
    };
});
