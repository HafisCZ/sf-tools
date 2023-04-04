Site.ready({ type: 'simulator' }, function (urlParams) {
    $('#sim-threads').captiveInputField('pet_sim/threads', 4, v => !isNaN(v) && v >= 1);
    $('#sim-iterations').captiveInputField('pet_sim/iterations', 2.5E6, v => !isNaN(v) && v >= 1);
    $('#sim-map-iterations').captiveInputField('pet_sim/map_iterations', 1E5, v => !isNaN(v) && v >= 1);

    const IGNORED_FIELDS = ['class', 'health', 'attribute', 'defense', 'luck', 'skip', 'damage', 'chance', 'critical'];
    const NON_BOSS_FIELDS = ['level', 'at100', 'at150', 'at200', 'pack', 'gladiator'];

    class PetController {
        constructor (root, index) {
            this.Index = index;

            this.fields = {
                type: new Field(`${root} [data-path="Type"]`, '0'),
                pet: new Field(`${root} [data-path="Pet"]`, '0'),
                boss: new Field(`${root} [data-path="Boss"]`, '0'),
                level: new Field(`${root} [data-path="Level"]`, '', Field.isPetLevel),
                at100: new Field(`${root} [data-path="At100"]`, '', Field.isPetCount),
                at150: new Field(`${root} [data-path="At150"]`, '', Field.isPetCount),
                at200: new Field(`${root} [data-path="At200"]`, '', Field.isPetCount),
                pack: new Field(`${root} [data-path="Pack"]`, '', Field.isPetCount),
                gladiator: new Field(`${root} [data-path="Gladiator"]`, '0'),

                class: new Field(`${root} [data-path="Class"]`, '?'),
                health: new Field(`${root} [data-path="Health"]`, '?'),
                attribute: new Field(`${root} [data-path="Attribute"]`, '?'),
                defense: new Field(`${root} [data-path="Defense"]`, '?'),
                luck: new Field(`${root} [data-path="Luck"]`, '?'),
                skip: new Field(`${root} [data-path="Skip"]`, '?'),
                damage: new Field(`${root} [data-path="Damage"]`, '?'),
                chance: new Field(`${root} [data-path="Chance"]`, '?'),
                critical: new Field(`${root} [data-path="Critical"]`, '?')
            };

            this.fields['gladiator'].$object.dropdown({
                values: [
                    { name: intl('pets.editor.none'), value: 0 },
                    ... [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ].map((gladiator) => {
                        return {
                            name: `${ gladiator } (${ gladiator * 5 }%)`,
                            value: gladiator
                        }
                    })
                ]
            }).dropdown('set selected', '0');

            this.fields['boss'].$object.dropdown({
                values: [
                    { name: intl('general.no'), value: 0 },
                    { name: intl('general.yes'), value: 1 }
                ]
            }).dropdown('setting', 'onChange', (value, text) => {
                for (let name of NON_BOSS_FIELDS) {
                    this.fields[name].toggle(value == 0);
                }
            }).dropdown('set selected', '0');

            this.fields['pet'].$object.dropdown({
                fullTextSearch: true,
                preserveHTML: true,
                values: new Array(100).fill(0).map((_ , i) => {
                    return {
                        name: `<img class="ui centered image pet-picture" src="res/pets/monster${ 800 + i }.png"><span class="pet-name">${intl(`pets.names.${i}`)}</span>`,
                        value: i
                    };
                })
            }).dropdown('set selected', '0');

            this.fields['type'].$object.dropdown({
                values: [0, 1, 2, 3, 4].map((index) => {
                    return {
                        name: intl(`pets.types.${index}`),
                        value: index
                    }
                })
            }).dropdown('set selected', '0');

            this.$debugDisplay = $(`${root} [data-debug]`);
            this.$debugDisplay.hide();

            for (let [name, field] of Object.entries(this.fields)) {
                if (!IGNORED_FIELDS.includes(name)) {
                    field.setListener(() => this.changeListener(name));
                    field.triggerAlways = true;
                }
            }
        }

        fill (object) {
            if (object) {
                for (var [key, field] of Object.entries(this.fields)) {
                    if (IGNORED_FIELDS.includes(key)) {
                        field.clear();
                    } else if (key == 'pet') {
                        field.set(object.Type * 20 + object.Pet);
                    } else {
                        field.set(getObjectAt(object, field.path()));
                    }
                }
            } else {
                for (const field of Object.values(this.fields)) {
                    field.clear();
                }
            }
        }

        read () {
            const object = {};

            for (const [key, field] of Object.entries(this.fields)) {
                if (IGNORED_FIELDS.includes(key)) {
                    continue;
                } else if (key == 'pet') {
                    setObjectAt(object, field.path(), field.get() % 20);
                } else {
                    setObjectAt(object, field.path(), field.get());
                }
            }

            object.Name = intl(`pets.names.${this.fields.pet.get()}`);

            return object;
        }

        valid () {
            const isBoss = this.fields['boss'].get() == 1;

            for (const [key, field] of Object.entries(this.fields)) {
                const isIgnoredField = IGNORED_FIELDS.includes(key);
                const isBossIgnoredField = isBoss && NON_BOSS_FIELDS.includes(key);

                if (!isIgnoredField && !isBossIgnoredField && !field.valid()) {
                    return false;
                }
            }

            return true;
        }

        changeListener (name) {
            if (IGNORED_FIELDS.includes(name) || this._ignoreChanges) return;

            if (name == 'type') {
                const type = this.fields['type'].get();

                this.fields['pet'].set(type * 20);
                this.fields['pet'].$object.find('.item').each((i, e) => {
                    const $e = $(e);
                    const id = parseInt($e.attr('data-value'));

                    if (Math.trunc(id / 20) == type) {
                        $e.show();
                    } else {
                        $e.hide();
                    }
                });
            }

            if (this.valid()) {
                this.model = PetModel.getModel(this.read());
                this.$debugDisplay.show();
            } else {
                this.model = false;
                this.$debugDisplay.hide();
            }

            refreshModels();
        }

        fillDebugInformation (model, initialized) {
            this.fields['class'].set(intl(`general.class${model.Player.Class}`));
            this.fields['health'].set(formatAsSpacedNumber(model.TotalHealth, ' '));
            this.fields['attribute'].set(formatAsSpacedNumber(model.Player[model.Config.Attribute].Total, ' '));
            this.fields['defense'].set(formatAsSpacedNumber(model.Player[model.Config.Attribute === 'Strength' ? 'Intelligence' : 'Strength'].Total, ' '));
            this.fields['luck'].set(formatAsSpacedNumber(model.Player.Luck.Total, ' '));

            if (initialized) {
                this.fields['skip'].set(model.SkipChance > 0 ? `${ model.SkipChance.toFixed(2) }%` : intl('pets.editor.none'));
                this.fields['damage'].set(formatAsSpacedNumber(model.Weapon1.Min, ' '));
                this.fields['chance'].set(model.CriticalChance > 0 ? `${ model.CriticalChance.toFixed(2) }%` : intl('pets.editor.none'));
                this.fields['critical'].set(`${ Math.round(100 * model.CriticalMultiplier) }%`);
            } else {
                for (let name of ['skip', 'damage', 'chance', 'critical']) {
                    this.fields[name].clear();
                }
            }
        }
    };

    function refreshModels () {
        const a = petA.model;
        const b = petB.model;

        if (a && b) {
            a.initialize(b);
            b.initialize(a);

            petA.fillDebugInformation(a, true);
            petB.fillDebugInformation(b, true);
        } else if (a) {
            a.initialize(a);

            petA.fillDebugInformation(a, false);
        } else if (b) {
            b.initialize(b);

            petB.fillDebugInformation(b, false);
        }

        if (petA.valid() && petB.valid() && petA.fields['boss'].get() == 0 && petB.fields['boss'].get() == 1) {
            $('#sim-generate').removeClass('disabled');
        } else {
            $('#sim-generate').addClass('disabled');
        }
    }

    const petA = new PetController('#sim-a', 0);
    const petB = new PetController('#sim-b', 1);
    
    petA.fill();
    petA.valid();

    petB.fill();
    petB.valid();

    SimulatorUtils.configure({
        params: urlParams,
        onLog: (callback) => {
            executeSimulation(1, 50, callback);
        },
        onChange: (config) => {
            CONFIG.set(config);

            refreshModels();
        }
    });
    
    let player = null;
    function updateDungeonButton (withPlayer = null) {
        player = withPlayer;

        if (player && player.Pets.Dungeons.some(pet => pet < 20)) {
            $('#simulate-dungeons').removeClass('disabled');
        } else {
            $('#simulate-dungeons').addClass('disabled');
        }
    }

    updateDungeonButton(null);

    $('#simulate-dungeons').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 2.5E6);

        if (player && player.Pets.Dungeons.some(pet => pet < 20)) {
            let results = [];

            const batch = new WorkerBatch('pets');

            for (let type = 0; type < 5; type++) {
                for (let klass = 1; klass <= 3; klass++) {
                    const [pet1, pet2] = getPetsFor(player, type, klass);
                    if (pet1 && pet2) {
                        batch.add(
                            ({ results: _results }) => {
                                results.push({
                                    chance: _results,
                                    player: pet1,
                                    boss: pet2
                                })
                            },
                            {
                                mode: 'pet',
                                players: [pet1, pet2],
                                iterations,
                                config: SimulatorUtils.config
                            }
                        )
                    }
                }
            }

            Toast.info(intl('pets.bulk.toast.title'), `<b>${intl('pets.bulk.toast.matches')}</b> ${batch.size()}`);

            batch.run(instances).then(() => {
                _sort_des(results, i => i.chance);

                const resultClasses = [0, 0, 0, 0, 0];

                DialogController.open(
                    SimulatorResultsDialog,
                    results.filter(({ player }) => ++resultClasses[player.Type] == 1)
                )
            })
        }
    })

    function executeSimulation (instances, iterations, logCallback) {
        if (petA.valid() && petB.valid()) {
            const results = [];
            let logs = [];

            const batch = new WorkerBatch('pets');

            for (let i = 0; i < instances; i++) {
                batch.add(
                    ({ results: _results, logs: _logs }) => {
                        results.push(_results);

                        if (logCallback) {
                            logs = logs.concat(_logs);
                        }
                    },
                    {
                        mode: 'pet',
                        players: [petA.read(), petB.read()],
                        iterations,
                        config: SimulatorUtils.config,
                        log: !!logCallback
                    }
                )
            }

            batch.run(instances).then(() => {
                const chance = _sum(results) / instances;

                $('#sim-result').html(chance.toFixed(chance < 0.01 ? 5 : 2) + '%');

                if (logs.length > 0) {
                    logCallback({
                        fights: logs,
                        players: [petA.read(), petB.read()].map((pet) => FighterModel.normalize(PetModel.getPlayer(pet))),
                        config: SimulatorUtils.config
                    });
                }
            })
        }
    }

    $('#simulate').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 2.5E6);

        executeSimulation(instances, iterations);
    });

    function generatePetMap (mapCount) {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-map-iterations').val()) || 1E5);

        if (petA.valid() && petB.valid()) {
            const a = petA.read();
            const b = petB.read();

            if (a && b && !a.Boss && b.Boss) {
                const maps = [];

                const batch = new WorkerBatch('pets');
                
                for (let i = b.Pet; i < Math.min(20, b.Pet + mapCount); i++) {
                    batch.add(
                        ({ results }) => {
                            maps[i - b.Pet] = results;
                        },
                        {
                            mode: 'map',
                            players: [a, Object.assign({}, b, { Pet: i })],
                            iterations,
                            config: SimulatorUtils.config
                        }
                    )
                }

                batch.run(instances).then(() => {
                    DialogController.open(
                        SimulatorMapDialog,
                        maps.map((data, i) => ({
                            data,
                            name: `${intl(`pets.types.${a.Type}`)} ${ a.Pet + 1 } - ${intl(`pets.names.${a.Type * 20 + a.Pet}`)} (${ a.Pack }, ${ a.At100 }, ${ a.At150 }, ${ a.At200 }) vs ${intl(`pets.types.${b.Type}`)} ${ b.Pet + i + 1 } - ${intl(`pets.names.${b.Type * 20 + b.Pet + i}`)}`
                        }))
                    )
                })
            }
        }
    }

    $('#sim-generate1').click(() => generatePetMap(1));
    $('#sim-generate5').click(() => generatePetMap(5));
    $('#sim-generate10').click(() => generatePetMap(10));

    StatisticsIntegration.configure({
        profile: SELF_PROFILE,
        type: 'players',
        scope: (dm) => dm.getLatestPlayers(true).filter((player) => typeof player.Pets !== 'undefined' && player.Pets.TotalLevel),
        callback: (player) => {
            updateDungeonButton(player);

            const [playerPet, bossPet] = getPetsFor(player, petA.fields['type'].get(), null);
            petA.fill(playerPet);
            petB.fill(bossPet);

            refreshModels();
        }
    });

    function getPetsFor (player, type, petClass) {
        let currentType = type;
        let currentName = [
            'Shadow', 'Light', 'Earth', 'Fire', 'Water'
        ][currentType];

        let gladiator = _try(player.Fortress, 'Gladiator') || 0;
        let pack = player.Pets[`${currentName}Count`];
        let petLevels = player.Pets[`${currentName}Levels`];
        let at100 = _len_where(petLevels, l => _between(l, 100 - 1, 150));
        let at150 = _len_where(petLevels, l => _between(l, 150 - 1, 200));
        let at200 = _len_where(petLevels, l => l == 200);

        let pets = petLevels.map((level, i) => {
            return {
                Gladiator: gladiator,
                Pet: i,
                Type: currentType,
                Boss: 0,
                Level: level,
                Pack: pack,
                At100: at100,
                At150: at150,
                At200: at200
            }
        });

        let pet1 = null;
        let pet2 = null;

        // Boss
        let dungeonPet = player.Pets.Dungeons[currentType];
        if (dungeonPet < 20) {
            pet2 = {
                Gladiator: 0,
                Pet: dungeonPet,
                Type: currentType,
                Boss: 1,
                Level: 0,
                Pack: 0,
                At100: 0,
                At150: 0,
                At200: 0
            };
        }

        let petModels = _sort_des(pets.filter((data) => data.Level).map((data) => {
            const model = PetModel.getModel(data);
            
            model.initialize(model);

            return model;
        }), model => model.TotalHealth);
        let bestPet = petModels.find(model => model.Player.Class == petClass);
        if (petClass == null && !bestPet) {
            bestPet = petModels[0];
        }

        if (bestPet) {
            pet1 = pets[bestPet.Player.Pet];
            pet1.Class = bestPet.Player.Class;
        }

        return [pet1, pet2];
    }
});