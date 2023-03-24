const AnalyzerOptionsDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'analyzer_options',
            dismissable: true,
            opacity: 0
        });
    }

    _createModal () {
        return `
            <div class="small bordered inverted dialog">
                <div class="header">${this.intl('title')}</div>
                <div>
                    <div class="ui small inverted form" data-op="content"></div>
                </div>
                <button class="ui button fluid !text-black !background-orange" data-op="ok">${intl('dialog.shared.ok')}</button>
            </div>
        `;
    }

    _createBindings () {
        this.$ok = this.$parent.operator('ok');
        this.$ok.click(() => this.close());

        this.$content = this.$parent.operator('content');
    }

    _applyArguments (options, data) {
        if (!this.$content.empty()) return;

        for (const [ key, option ] of Object.entries(data)) {
            if (option.type === 'dropdown') {
                const $element = $(`
                    <div class="field">
                        <label>${this.intl(`option.${key}.title`)}</label>
                        <div class="ui selection inverted fluid dropdown">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                `);

                const selectedValue = options[key];

                $element.find('.ui.dropdown').dropdown({
                    values: option.keys.map((value) => ({ value, name: this.intl(`option.${key}.value.${value}`), selected: value === selectedValue })),
                    onChange: (value) => {
                        options[key] = value;
                        option.onChange();
                    }
                })

                $element.appendTo(this.$content);
            } else if (option.type === 'number') {
                const $element = $(`
                    <div class="field">
                        <label>${this.intl(`option.${key}.title`)}</label>
                        <div class="ui inverted input">
                            <input type="number" value="${options[key]}">
                        </div>
                    </div>
                `);

                $element.find('.ui.input').change((event) => {
                    options[key] = parseInt(event.target.value);
                    option.onChange();
                })

                $element.appendTo(this.$content);
            }
        }
    }
})();

const FightStatisticalAnalysisDialog = new (class extends Dialog {
    constructor () {
        super({
            key: 'fight_statistical_analysis',
            dismissable: true,
            opacity: 0
        })
    }

    _createModal () {
        return `
            <div class="bordered inverted dialog">
                <div class="header">${this.intl('title')}</div>
                <div class="ui inverted form flex flex-col gap-4 pr-4 overflow-y-scroll" data-op="content" style="height: 50vh;"></div>
                <div class="ui two fluid buttons">
                    <button class="ui button !text-black !background-orange" data-op="add">${this.intl('add')}</button>
                    <button class="ui black button" data-op="cancel">${intl('dialog.shared.close')}</button>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$closeButton = this.$parent.operator('cancel');
        this.$closeButton.click(() => {
            this.close();
        })

        this.$content = this.$parent.operator('content');

        this.$add = this.$parent.operator('add');
        this.$add.click(() => {
            this._inject();
        })
    }

    _inject () {
        const index = this.groups.length;

        const $group = $(`
            <div class="fields !mb-0">
                <div class="twelve wide field">
                    <label>${this.intl('selector')}</label>
                    <div class="ta-wrapper" style="height: initial;">
                        <input data-op="selector" class="ta-area" data-op="primary" type="text" placeholder="${this.intl('selector')}">
                        <div data-op="overlay" class="ta-content" style="width: 100%; margin-top: -2em; margin-left: 1em;"></div>
                    </div>
                </div>
                <div class="four wide field">
                    <label>${this.intl('count')}</label>
                    <div class="ui inverted centered input">
                        <input data-op="count" type="text" disabled>
                    </div>
                </div>
            </div>
        `).appendTo(this.$content);

        const $selector = $group.operator('selector');
        const $overlay = $group.operator('overlay');
        const $count = $group.operator('count');

        $selector.on('change input', (event) => {
            const html = Highlighter.expression(event.currentTarget.value || '', undefined, ['player1', 'player2']).text
            $overlay.html(html);

            this._changed();
        })

        this.groups.push({
            index,
            selector: $selector,
            count: $count
        })

        this._changed();
    }

    _changed () {
        const globalScope = new ExpressionScope().add({ player1: this.fighterA, player2: this.fighterB });
        
        for (const { selector, count } of this.groups) {
            const expression = new Expression(selector.val() || 'true');

            count.val(this.rounds.filter((round) => expression.eval(globalScope.copy().addSelf(round))).length);
        }
    }

    _applyArguments ({ fights, fighterA, fighterB }) {
        this.fighterA = fighterA;
        this.fighterB = fighterB;
        this.rounds = fights.map((fight) => fight.rounds).flat().filter((round) => !round.attackSpecial);

        this.groups = [];

        this._inject();
    }
})();

Site.ready(null, function (urlParams) {//DialogController.open(FightStatisticalAnalysisDialog, {fights:[]})
    // Elements
    const $buttonUpload = $('#button-upload');
    const $buttonClear = $('#button-clear');
    const $buttonExport = $('#button-export');
    const $buttonOptions = $('#button-options');
    const $buttonDamagesOpen = $('#button-damages-open');
    const $buttonDamagesClose = $('#button-damages-close');

    const $buttonExportGroup = $('#button-export-group');
    const $buttonExportFight = $('#button-export-fight');
    const $buttonResetGroup = $('#button-reset-group');
    const $buttonCopyGroup = $('#button-copy-group');
    const $buttonAnalyzeGroup = $('#button-analyze-group');

    const $groupList = $('#group-list');
    const $fightList = $('#fight-list');
    const $fightTable = $('#fight-table');
    const $fightView = $('#fight-view');
    const $fightCopy = $('#fight-copy');

    const $sidebarDamages = $('#sidebar-damages');
    const $sidebarDamagesContent = $('#sidebar-damages-content');

    // Button callbacks
    $buttonUpload.on('change', (fileEvent) => {
        Loader.toggle(true);

        const promises = Array.from(fileEvent.currentTarget.files).map((file) => file.text().then((text) => {
            const json = JSON.parse(text);

            if (json.log) {
                importHAR(json);
            } else if (json.fights) {
                importFights(json);
            } else {
                Toast.warn(intl('analyzer.toast_import_error.title'), intl('analyzer.toast_import_error.message'));
            }
        }));

        Promise.all(promises).then(() => {
            render();

            Loader.toggle(false);
        });
    })

    $buttonOptions.click(() => {
        const options = {
            rage_display_mode: {
                type: 'dropdown',
                keys: Object.keys(ATTACK_RAGE_FORMATS),
                onChange: () => {
                    if (currentFight) {
                        renderFight(currentGroup, currentFight);
                    }
                }
            },
            base_damage_error_margin: {
                type: 'number',
                onChange: () => {
                    updatePreview();
                }
            }
        }

        DialogController.open(AnalyzerOptionsDialog, analyzerOptions, options);
    });

    $buttonClear.click(() => {
        reset();
        render();
    })

    $buttonExport.click(() => {
        if (currentFights.length > 0) {
            exportFights(currentFights);
        }
    })

    $buttonExportGroup.click(() => {
        if (currentGroup) {
            exportFights(currentGroup); 
        }
    })

    $buttonExportFight.click(() => {
        if (currentFight) {
            exportFights(currentFight, currentGroup);
        }
    })

    $buttonResetGroup.click(() => {
        if (currentGroup) {
            delete currentGroup.fighterA.editor;
            delete currentGroup.fighterB.editor;

            render();
        }
    })

    $buttonDamagesOpen.click(() => {
        $buttonDamagesOpen.hide();
        $sidebarDamages.show();
    });

    $buttonDamagesClose.click(() => {
        $buttonDamagesOpen.show();
        $sidebarDamages.hide();
    })

    $fightCopy.click(() => {
        renderFight(currentGroup, currentFight, true);

        copyNode($fightTable.closest('table').get(0));

        renderFight(currentGroup, currentFight, false);
    });

    $buttonCopyGroup.click(() => {
        if (currentGroup) {
            const generator = ({ MaximumLife, editor }) => {
                const object = Localization._generateTranslation({ }, editor);

                object.TotalHealth = MaximumLife;

                return object;
            }

            const playerA = generator(currentGroup.fighterA);
            const playerB = generator(currentGroup.fighterB);

            const matrix = [];
            for (const key of Object.keys(playerA)) {
                matrix.push([key.replace(/^\./, ''), playerA[key], playerB[key]]);
            }

            copyMatrix(matrix);
        }
    });

    $buttonAnalyzeGroup.click(() => {
        if (currentGroup) {
            DialogController.open(FightStatisticalAnalysisDialog, currentGroup);
        }
    })

    // Listener
    if (urlParams.has('broadcast')) {
        const token = urlParams.get('broadcast');
        const broadcast = new Broadcast(token);

        broadcast.on('data', (data) => {
            Loader.toggle(true);

            reset();

            importFights(data);

            render();

            Loader.toggle(false);

            // Cleanup
            broadcast.close();
        })

        // When ready send message to channel
        broadcast.send('token', token);

        // Remove broadcast param
        urlParams.delete('broadcast');

        window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}?${urlParams.toString().replace(/=&/g, '&').replace(/=$/, '')}`)
    }

    // Custom fighter
    class SFFighter {
        constructor (data, fightType) {
            let dataType = new ComplexDataType(data);
            dataType.assert(47);

            this.ID = dataType.long();
            this.Name = dataType.string();
            this.Level = dataType.long();
            this.MaximumLife = dataType.long();
            this.Life = dataType.long();

            this.Strength = {
                Total: dataType.long()
            };

            this.Dexterity = {
                Total: dataType.long()
            };

            this.Intelligence = {
                Total: dataType.long()
            };

            this.Constitution = {
                Total: dataType.long()
            };

            this.Luck = {
                Total: dataType.long()
            };

            this.Face = {
                Mouth: dataType.long(),
                Hair: {
                    Type: dataType.long() % 100,
                    Color: Math.trunc(dataType.back(1).long() / 100)
                },
                Brows: {
                    Type: dataType.long() % 100,
                    Color: Math.trunc(dataType.back(1).long() / 100)
                },
                Eyes: dataType.long(),
                Beard: {
                    Type: dataType.long() % 100,
                    Color: Math.trunc(dataType.back(1).long() / 100)
                },
                Nose: dataType.long(),
                Ears: dataType.long(),
                Special: dataType.long(),
                Special2: dataType.long(),
                Portrait: dataType.long()
            };

            this.Race = dataType.long();
            this.Gender = dataType.long();
            this.Class = dataType.long();

            this.Items = {
                Wpn1: new SFItem(dataType.sub(12), 1, [1, 1]),
                Wpn2: new SFItem(dataType.sub(12), 2, [1, 2])
            }

            if (this.Face.Mouth < 0) {
                this.Name = this._findName(fightType, -this.Face.Mouth);
            }
        }

        _findName (type, face) {
            if (NAME_UNIT_COMPANION[face]) {
                return NAME_UNIT_COMPANION[face];
            } else if (type == FIGHT_TYPES.Shadow) {
                return `Shadow ${ NAME_MONSTER[face] }`;
            } else if (NAME_MONSTER[face]) {
                return NAME_MONSTER[face];
            } else if (type == FIGHT_TYPES.Underworld) {
                return NAME_UNIT_UNDERWORLD[Math.trunc((face - 899) / 20)];
            } else {
                return 'Unknown';
            }
        }
    }

    // Editor
    class PlayerEditor {
        constructor (parent) {
            this.fields = {
                name: new Field(`${parent} [data-path="Name"]`, ''),

                class: new Field(`${parent} [data-path="Class"]`, '1'),
                level: new Field(`${parent} [data-path="Level"]`, '0', Field.isPlayerLevel),
                armor: new Field(`${parent} [data-path="Armor"]`, '0', Field.isNumber),

                resistance_fire: new Field(`${parent} [data-path="Runes.ResistanceFire"]`, '0', Field.isResistanceRune),
                resistance_cold: new Field(`${parent} [data-path="Runes.ResistanceCold"]`, '0', Field.isResistanceRune),
                resistance_lightning: new Field(`${parent} [data-path="Runes.ResistanceLightning"]`, '0', Field.isResistanceRune),

                portal_damage: new Field(`${parent} [data-path="Dungeons.Group"]`, '0', Field.isDungeon),

                gladiator: new Field(`${parent} [data-path="Fortress.Gladiator"]`, '0', Field.isUnderworldBuilding),

                str: new Field(`${parent} [data-path="Strength.Total"]`, '0', Field.isNonZero),
                dex: new Field(`${parent} [data-path="Dexterity.Total"]`, '0', Field.isNonZero),
                int: new Field(`${parent} [data-path="Intelligence.Total"]`, '0', Field.isNonZero),
                con: new Field(`${parent} [data-path="Constitution.Total"]`, '0', Field.isNonZero),
                lck: new Field(`${parent} [data-path="Luck.Total"]`, '0', Field.isNumber),

                weapon1_min: new Field(`${parent} [data-path="Items.Wpn1.DamageMin"]`, '0', Field.isNumber),
                weapon1_max: new Field(`${parent} [data-path="Items.Wpn1.DamageMax"]`, '0', Field.isNumber),
                weapon1_enchantment: new Field(`${parent} [data-path="Items.Wpn1.HasEnchantment"]`, 'false'),
                weapon1_rune: new Field(`${parent} [data-path="Items.Wpn1.AttributeTypes.2"]`, '0'),
                weapon1_value: new Field(`${parent} [data-path="Items.Wpn1.Attributes.2"]`, '0', Field.isDamageRune),

                weapon2_min: new Field(`${parent} [data-path="Items.Wpn2.DamageMin"]`, '0', Field.isNumber),
                weapon2_max: new Field(`${parent} [data-path="Items.Wpn2.DamageMax"]`, '0', Field.isNumber),
                weapon2_enchantment: new Field(`${parent} [data-path="Items.Wpn2.HasEnchantment"]`, 'false'),
                weapon2_rune: new Field(`${parent} [data-path="Items.Wpn2.AttributeTypes.2"]`, '0'),
                weapon2_value: new Field(`${parent} [data-path="Items.Wpn2.Attributes.2"]`, '0', Field.isDamageRune)
            };

            this.fields['class'].$object.dropdown({
                values: CONFIG.indexes().map((value) => ({
                    image: `res/class${value}.png`,
                    imageClass: '!-ml-3 !mr-2',
                    name: intl(`general.class${value}`),
                    value
                }))
            }).dropdown('setting', 'onChange', (value) => {
                $(`${parent} [data-optional="Weapon2"]`).toggle(value == ASSASSIN);
            }).dropdown('set selected', '1');

            this.fields['weapon1_rune'].$object.dropdown({
                values: [
                    {
                        name: intl('editor.none'),
                        value: 0
                    },
                    {
                        name: intl('editor.fire'),
                        value: 40
                    },
                    {
                        name: intl('editor.cold'),
                        value: 41
                    },
                    {
                        name: intl('editor.lightning'),
                        value: 42
                    }
                ]
            }).dropdown('set selected', '0');

            this.fields['weapon2_rune'].$object.dropdown({
                values: [
                    {
                        name: intl('editor.none'),
                        value: 0
                    },
                    {
                        name: intl('editor.fire'),
                        value: 40
                    },
                    {
                        name: intl('editor.cold'),
                        value: 41
                    },
                    {
                        name: intl('editor.lightning'),
                        value: 42
                    }
                ]
            }).dropdown('set selected', '0');

            this.fields['weapon1_enchantment'].$object.dropdown({
                values: [
                    {
                        name: intl('general.no'),
                        value: false
                    },
                    {
                        name: intl('general.yes'),
                        value: true
                    }
                ]
            }).dropdown('set selected', 'false');

            this.fields['weapon2_enchantment'].$object.dropdown({
                values: [
                    {
                        name: intl('general.no'),
                        value: false
                    },
                    {
                        name: intl('general.yes'),
                        value: true
                    }
                ]
            }).dropdown('set selected', 'false');

            for (const field of Object.values(this.fields)) {
                field.setListener(() => {
                    if (!this._frozen) {
                        updatePreview();
                    }
                });
            }
        }

        fill (object) {
            this._frozen = true;

            for (const [key, field] of Object.entries(this.fields)) {
                const value = getObjectAt(object, field.path());
                if (typeof value === 'undefined') {
                    field.clear();
                } else {
                    field.set(value);
                }
            }

            this._frozen = false;
        }

        read () {
            const object = {};
            for (const [key, field] of Object.entries(this.fields)) {
                setObjectAt(object, field.path(), field.get());
            }

            return object;
        }

        valid () {
            for (const [key, field] of Object.entries(this.fields)) {
                if (!field.valid()) {
                    return false;
                }
            }

            return true;
        }
    }

    const playerEditorA = new PlayerEditor('#player1');
    const playerEditorB = new PlayerEditor('#player2');

    const analyzerOptions = new OptionsHandler(
        'analyzer',
        {
            rage_display_mode: 'decimal',
            base_damage_error_margin: 1
        }
    )

    // Utils
    SimulatorUtils.configure({
        params: urlParams,
        onChange: (config) => {
            // Set config and render
            CONFIG.set(config);

            render(true);
        }
    });

    // Decode attack type
    function decodeAttackType (attackType) {
        if (attackType >= ATTACK_REVIVE) {
            return {
                attackSecondary: false,
                attackCrit: false,
                attackMissed: false,
                attackSpecial: true
            }
        } else {
            const attackSecondary = ATTACKS_SECONDARY.includes(attackType);
            const attackChained = ATTACKS_CHAIN.includes(attackType);
            
            const attackCrit = [
                ATTACK_CRITICAL,
                ATTACK_CRITICAL_BLOCKED,
                ATTACK_CRITICAL_EVADED
            ].includes(attackType % 10);

            const attackMissedDefault = [
                ATTACK_BLOCKED,
                ATTACK_EVADED,
                ATTACK_CRITICAL_BLOCKED,
                ATTACK_CRITICAL_EVADED
            ].includes(attackType % 10);

            const attackMissedSpecial = [
                ATTACK_SWOOP_BLOCKED,
                ATTACK_SWOOP_EVADED,
                ATTACK_FIREBALL_BLOCKED
            ].includes(attackType);

            const attackMissed = attackMissedDefault || attackMissedSpecial;

            return {
                attackSecondary,
                attackCrit,
                attackMissed,
                attackChained,
                attackSpecial: false
            }
        }
    }

    // Compute item hash
    function computeItemHash (item, player, secondary = false) {
        if (secondary && player.Class !== ASSASSIN) {
            return '';
        } else if (item.Index == 0) {
            return '';
        } else {
            const json = [
                item.DamageMin,
                item.DamageMax,
                item.RuneType || item.AttributeTypes[2],
                item.RuneValue || item.Attributes[2]
            ]

            if (player.model) {
                // Fix weapon damage (is not clamped by fist damage only if min is below min)
                const baseDamage = player.model.getBaseDamage(secondary);

                if (json[0] < baseDamage.Min) {
                    json[0] = Math.max(baseDamage.Min, json[0]);
                    json[1] = Math.max(baseDamage.Max, json[1]);
                }
            }

            return JSON.stringify(json);
        }
    }

    // Compute player hash
    function computePlayerHash (player) {
        const json = [
            // Temporary disabled because of HASH errors // player.ID,
            player.Class,
            player.Level,
            player.Strength.Total,
            player.Dexterity.Total,
            player.Intelligence.Total,
            player.Constitution.Total,
            player.Luck.Total,
            computeItemHash(player.Items.Wpn1, player, false),
            computeItemHash(player.Items.Wpn2, player, true)
        ];

        return SHA1(JSON.stringify(json));
    }

    // Extract individual fights from raw data array
    function importHAR (json) {
        const digestedFights = [];
        const digestedPlayers = [];

        // Capture all relevant data
        for (const { text } of PlayaResponse.search(json)) {
            if (text.includes('fightheader')) {
                const r = PlayaResponse.fromText(text);

                if (r.fightheader1) {
                    // Shadow or guild fights use indexed fight data
                    const count = _fast_max(
                        Object.keys(r)
                        .filter((key) => key.startsWith('fightheader'))
                        .map((key) => parseInt(key.match(/(\d*)$/)[0] || '1'))
                    );

                    for (let i = 1; i <= count; i++) {
                        digestedFights.push({
                            header: r[`fightheader${i}`].mixed,
                            rounds: r[`fight${i}`].numbers
                        });
                    }
                } else {
                    digestedFights.push({
                        header: r.fightheader.mixed,
                        rounds: r.fight.numbers
                    });
                }
            }
            
            if (text.includes('playerlookat') || text.includes('ownplayersave')) {
                const r = PlayaResponse.fromText(text);

                if (r.ownplayersave && r.ownplayername) {
                    // Read only necessary data from own player
                    digestedPlayers.push({
                        own: true,
                        save: r.ownplayersave.numbers,
                        name: r.ownplayername.string,
                        tower: _try(r.owntower, 'numbers')
                    })
                } else if (r.ownplayersave) {
                    // Capture save
                    const lastPlayer = digestedPlayers.findLast((entry) => entry.own && entry.name);
                    if (lastPlayer) {
                        digestedPlayers.push({
                            own: true,
                            save: r.ownplayersave.numbers,
                            name: lastPlayer.name,
                            tower: _try(r.owntower, 'numbers') || lastPlayer.tower
                        })
                    }
                } else if (r['#ownplayersave']) {
                    // Capture save delta
                    const lastPlayer = digestedPlayers.findLast((entry) => entry.own && entry.name);
                    if (lastPlayer) {
                        const save = Array.from(lastPlayer.save);

                        for (const [index, value] of _each_block(r['#ownplayersave'].numbers, 2)) {
                            save[index] = value;
                        }

                        digestedPlayers.push({
                            own: true,
                            save,
                            name: lastPlayer.name,
                            tower: _try(r.owntower, 'numbers') || lastPlayer.tower
                        })
                    }
                } else if (r.otherplayer && r.otherplayername) {
                    digestedPlayers.push({
                        own: false,
                        save: r.otherplayer.numbers,
                        name: r.otherplayername.string,
                        tower: null
                    })
                }
            }
        }

        for (const { header, rounds } of digestedFights) {
            const fightType = header[0];

            // Proceed only if type of fight is known to the system
            if (Object.values(FIGHT_TYPES).includes(fightType)) {
                // Parse fighters
                const fighterA = new SFFighter(header.slice(05, 52), fightType);
                const fighterB = new SFFighter(header.slice(52, 99), fightType);

                // Parse individual rounds (group of 3 numbers)
                const rawRounds = [];
                for (let i = 0; i < rounds.length / 3; i++) {
                    rawRounds.push(_slice_len(rounds, i * 3, 3));
                }

                // Process each round
                const processedRounds = [];
                for (const [attackerId, attackType, targetHealthLeft] of rawRounds) {
                    const [attacker, target] = attackerId == fighterA.ID ? [fighterA, fighterB] : [fighterB, fighterA];

                    processedRounds.push(Object.assign({
                        attacker,
                        target,
                        attackType,
                        attackDamage: 0,
                        targetHealthLeft,
                    }, decodeAttackType(attackType)));
                }

                const findHealth = (i) => {
                    const currentRound = processedRounds[i];
                    for (let j = i - 1, round; round = processedRounds[j]; j--) {
                        if (round.attacker == currentRound.attacker && (round.attackType === ATTACK_REVIVE || !round.attackSpecial)) {
                            return round.targetHealthLeft;
                        }
                    }

                    return currentRound.target.Life;
                }

                // Finalize each round
                let attackRageOffset = 0;
                for (let i = 0, round; round = processedRounds[i]; i++) {
                    // Calculate attack damage
                    if (round.attackSpecial) {
                        round.attackDamage = round.targetHealthLeft;
                    } else {
                        round.attackDamage = findHealth(i) - round.targetHealthLeft;
                    }

                    // Calculate attack rage
                    if (round.attackSpecial) {
                        attackRageOffset--;
                    } else if (round.attackChained) {
                        attackRageOffset++;
                    }

                    round.attackRage = 1 + ((i + attackRageOffset) / 6);
                }

                // Add special state
                if (fighterA.Class === DRUID || fighterB.Class === DRUID) {
                    // Run only when one of the fighters is a druid as only they have special states
                    for (const fighter of [fighterA, fighterB].filter((fighter) => fighter.Class === DRUID)) {
                        let requestState = false;
                        let keepState = false;

                        for (const round of processedRounds) {
                            if (round.attackSpecial) {
                                continue;
                            } else if (round.attacker === fighter) {
                                round.attackerSpecialState = requestState;

                                keepState = requestState && !keepState;
                                requestState = false;
                            } else if (round.attackMissed && !keepState) {
                                requestState = true;
                            } else if (keepState) {
                                round.targetSpecialState = true;
                            }
                        }
                    }
                }

                // Push fight
                currentFights.push({
                    fighterA,
                    fighterB,
                    rounds: processedRounds
                })
            }
        }

        // Convert all player data into actual player models and optionally companions
        for (const data of digestedPlayers) {
            if (data.own) {
                // Add own player
                const player = new SFOwnPlayer(data);
                currentPlayers.push(player);

                // Add companions if present
                if (player.Companions) {
                    currentPlayers.push(
                        player.Companions.Bert,
                        player.Companions.Mark,
                        player.Companions.Kunigunde
                    )
                }
            } else {
                // Add other player
                const player = new SFOtherPlayer(data);
                currentPlayers.push(player);
            }
        }
    }

    function reset () {
        currentFights = [];
        currentPlayers = [];

        currentGroup = null;
        currentFight = null;

        // Remove all sidebar damage content
        $sidebarDamagesContent.empty();
    }

    function renderGeneralButtons () {
        const buttonsEnabled = currentFights.length > 0;
        const buttonsMethod = buttonsEnabled ? 'removeClass' : 'addClass';

        for (const $button of [$buttonExport, $buttonClear, $buttonAnalyzeGroup, $buttonExportGroup, $buttonResetGroup, $buttonCopyGroup, $buttonDamagesOpen]) {
            $button[buttonsMethod]('disabled');
        }

        if (!buttonsEnabled) {
            $sidebarDamages.hide();
            $buttonDamagesOpen.show();
        } 
    }

    function render (soft = false) {
        $fightView.hide();

        renderGeneralButtons();

        // Set winners
        for (const fight of currentFights) {
            fight.winner = fight.rounds[fight.rounds.length - 1].attacker;
        }

        // Compute hashes for all players and fighters
        for (const [index, { fighterA, fighterB }] of Object.entries(currentFights)) {
            fighterA.hash = computePlayerHash(fighterA);
            fighterB.hash = computePlayerHash(fighterB);

            currentFights[index].hash = `${fighterA.hash}-${fighterB.hash}`;
            currentFights[index].index = String(index);
        }

        for (const player of currentPlayers) {
            player.model = FighterModel.create(null, player);
            player.hash = computePlayerHash(player);
        }

        // Merge fighters and hashes
        for (const { fighterA, fighterB } of currentFights) {
            const playerA = currentPlayers.find((player) => player.hash === fighterA.hash);
            if (playerA) {
                fighterA.player = playerA;
            }

            const playerB = currentPlayers.find((player) => player.hash === fighterB.hash);
            if (playerB) {
                fighterB.player = playerB;
            }
        }

        // Group fights
        const groupedFights = [];
        for (const fight of currentFights) {
            let group = groupedFights.find((group) => group.hash === fight.hash);

            if (_nil(group)) {
                group = {
                    hash: fight.hash,
                    fighterA: fight.fighterA,
                    fighterB: fight.fighterB,
                    fights: []
                }

                groupedFights.push(group);
            }

            group.fights.push({ index: fight.index, rounds: fight.rounds, winner: fight.winner });
        }

        // Display in dropdown
        $groupList.dropdown({
            values: groupedFights.map((group) => ({
                name: `<img class="!-ml-3 !mr-2" src="res/class${group.fighterA.Class}.png">${getFighterName(group.fighterA)} &nbsp;&nbsp;- <img class="!mr-2" src="res/class${group.fighterB.Class}.png">${getFighterName(group.fighterB)} (${group.fights.length})`,
                value: group.hash
            }))
        }).dropdown('setting', 'onChange', (value) => {
            const group = groupedFights.find((group) => group.hash === value);

            $fightView.show();

            renderPlayer(group.fighterA, playerEditorA, soft);
            renderPlayer(group.fighterB, playerEditorB, soft);

            renderFightGroup(group);
        });

        if (groupedFights.length > 0) {
            $groupList.dropdown('set selected', _dig(currentGroup, 'hash') || groupedFights[0].hash);
        }
    }

    function renderPlayer (player, editor, soft) {
        editor.fill(soft ? (player.editor || player.player) : (player.player || player.editor) || player);
    }

    const ATTACK_RAGE_FORMATS = {
        'decimal': (rage) => rage.toFixed(2),
        'percentage': (rage) => `${Math.trunc(100 * rage)}%`,
        'fraction': (rage) => `${Math.round(rage * 6)}/6`,
    }

    const BARD_NOTE_COLORS = ['c4c4c4', '5e7fc4', 'd1a130'];

    function renderState (state, copyMode) {
        if (state) {
            if (state.type === 'druid_rage') {
                return copyMode ? 'druid_rage' : `<i class="ui paw icon text-orangered" title="${intl('analyzer.special_state.druid_rage')}"></i>`;
            } else if (state.type === 'bard_song') {
                return copyMode ? `bard_song_${state.level}` : `<span title="${intl('analyzer.special_state.bard_song')}" style="color: #${BARD_NOTE_COLORS[state.level]};">${state.notes} <i class="ui itunes note icon"></i></span>`;
            }
        }

        return '';
    }

    function renderFight (group, fight, copyMode = false) {
        const formatAttackRage = ATTACK_RAGE_FORMATS[analyzerOptions.rage_display_mode];

        let content = '';

        for (let i = 0; i < fight.rounds.length; i++) {
            const {
                attacker, target, attackType, attackRage, attackDamage, attackBase, attackMissed, attackCrit,
                attackSpecial, attackSecondary, targetHealthLeft, attackerSpecialDisplay, targetSpecialDisplay,
                hasDamage, hasBase, hasError, hasIgnore
            } = fight.rounds[i];

            const nameStyle = ' style="text-overflow: ellipsis; white-space: nowrap;"';

            const attackerState = renderState(attackerSpecialDisplay, copyMode);
            const targetState = renderState(targetSpecialDisplay, copyMode);

            if (hasIgnore) {
                // Do nothing if attack is ignored in display
                continue;
            } else if (attackType === ATTACK_REVIVE) {
                content += `
                    <tr${attacker.hash == group.fighterA.hash ? ' style="background-color: #202020; color: darkgray;"' : ''}>
                        <td class="!text-center">${i + 1}</th>
                        <td class="!text-center"></th>
                        <td class="!text-center"${nameStyle}>${getFighterName(target)}</th>
                        <td class="!text-center">${attackerState}</th>
                        <td class="!text-center"></th>
                        <td class="!text-center"></th>
                        <td class="!text-center text-violet">${intl(`general.attack${attackType}`)}</th>
                        <td class="!text-center"></th>
                        <td class="!text-center">${Math.max(0, 100 * targetHealthLeft / target.Life).toFixed(1)}%</th>
                        <td class="!text-center"></th>
                    </tr>
                `;
            } else {
                const attackClass = attackCrit ? ' text-orangered font-bold' : (attackType === ATTACK_FIREBALL || attackType === ATTACK_FIREBALL_BLOCKED ? ' text-violet' : '');

                const displayDamage = hasDamage ? formatAsSpacedNumber(attackDamage) : '';
                const displayBase = hasBase ? formatAsSpacedNumber(attackBase) : '';

                content += `
                    <tr${attacker.hash == group.fighterA.hash ? ' style="background-color: #202020; color: darkgray;"' : ''}>
                        <td class="!text-center">${i + 1}</th>
                        <td class="!text-center">${formatAttackRage(attackRage)}</th>
                        <td class="!text-center"${nameStyle}>${getFighterName(attacker)}</th>
                        <td class="!text-center">${attackerState}</th>
                        <td class="!text-center"${nameStyle}>${getFighterName(target)}</th>
                        <td class="!text-center">${targetState}</th>
                        <td class="!text-center${attackClass}">${intl(`general.attack${attackType}`)}</th>
                        <td class="!text-center${attackClass}">${displayDamage}</th>
                        <td class="!text-center">${Math.max(0, 100 * targetHealthLeft / target.Life).toFixed(1)}%</th>
                        <td class="!text-center">${displayBase}${hasError ? ' <span class="text-orangered">!</span>' : ''}</th>
                    </tr>
                `;
            }
        }

        $fightTable.html(content);
    }

    function getFighterName (fighter) {
        return _dig(fighter.player, 'Name') || fighter.Name;
    }

    function renderFightGroup (group) {
        const selectBase = {
            nameA: getFighterName(group.fighterA),
            healthA: formatAsSpacedNumber(group.fighterA.Life),
            totalHealthA: formatAsSpacedNumber(group.fighterA.MaximumLife),
            nameB: getFighterName(group.fighterB),
            healthB: formatAsSpacedNumber(group.fighterB.Life),
            totalHealthB: formatAsSpacedNumber(group.fighterB.MaximumLife),
        };

        $fightList.dropdown({
            values: group.fights.map((fight, index) => ({
                name: intl('analyzer.table.select', Object.assign({ index: index + 1, rounds: fight.rounds.length, winner: getFighterName(fight.winner) }, selectBase)),
                value: fight.index
            }))
        }).dropdown('setting', 'onChange', (value) => {
            const fight = group.fights.find((fight) => fight.index === value);

            currentGroup = group;
            currentFight = fight;

            updatePreview();
        });

        const defaultFightIndex = group.fights[0].index;
        const currentFightIndex = _dig(currentFight, 'index');

        $fightList.dropdown('set selected', group.fights.some((fight) => fight.index === currentFightIndex) ? currentFightIndex : defaultFightIndex);
    }

    // Current data
    let currentFights = [];
    let currentPlayers = [];

    let currentGroup = null;
    let currentFight = null;

    function processGroup (group) {
        const variance = parseInt(analyzerOptions.base_damage_error_margin);

        group.fighterA.editor = playerEditorA.read();
        group.fighterB.editor = playerEditorB.read();

        // Fetch data and initialize models
        const model1 = FighterModel.create(0, group.fighterA.editor);
        const model2 = FighterModel.create(1, group.fighterB.editor);

        // Initialize models
        FighterModel.initializeFighters(model1, model2);

        const flatRounds = group.fights.map((fight) => fight.rounds).flat();

        // Decorate each round
        for (const round of flatRounds) {
            // Swap type to fireball if BM swoops
            if (round.attacker.Class == BATTLEMAGE && [ATTACK_SWOOP, ATTACK_SWOOP_EVADED, ATTACK_SWOOP_BLOCKED].includes(round.attackType)) {
                round.attackType = round.attackType === ATTACK_SWOOP ? ATTACK_FIREBALL : ATTACK_FIREBALL_BLOCKED;
            }

            // Set display special state
            if (round.attackerSpecialState && round.attacker.Class === DRUID) {
                round.attackerSpecialDisplay = { type: 'druid_rage' };
            }

            if (round.targetSpecialState && round.target.Class === DRUID) {
                round.targetSpecialDisplay = { type: 'druid_rage' };
            }

            // Skip if missed or special
            if (round.attackSpecial || round.attackMissed) {
                continue;
            }

            round.hasDamage = true;
            round.hasBase = round.attackType !== ATTACK_FIREBALL && round.attackType !== ATTACK_CATAPULT;
        }

        // Calculate base damage of each round
        for (const [index, round] of Object.entries(flatRounds)) {
            // We are assuming that lute round always follows after bard attack
            if (round.attackType >= ATTACK_BARD_SONG && index > 0) {
                const spellLevel = round.attackType % 10 - 1;
                const spellNotes = Math.trunc((round.attackType % 100) / 10);
                const spellBonus = 1 + CONFIG.Bard.EffectValues[spellLevel] / 100;
                const superRound = flatRounds[index - 1];

                superRound.attackBase = Math.round(superRound.attackBase / spellBonus);
                superRound.attackerSpecialDisplay = { type: 'bard_song', level: spellLevel, notes: spellNotes };

                round.hasIgnore = true;

                continue;
            } else if (round.hasBase) {
                const model = round.attacker.hash === currentGroup.fighterA.hash ? model1 : model2;
                const state = round.attackerSpecialState && round.attacker.Class === DRUID ? model.RageState : model;

                // Scaled down weapon damage
                let damage = round.attackDamage / round.attackRage / (round.attackSecondary ? model.Weapon2.Base : model.Weapon1.Base);

                // Special cases
                if (round.attackCrit) {
                    damage /= state.CriticalMultiplier;
                }

                if (round.attacker.Class === DRUID && round.attackType === ATTACK_SWOOP) {
                    damage /= model.SwoopMultiplier;
                }

                round.attackBase = Math.trunc(damage);
            }
        }

        // Verify whether damage is in range
        for (const round of flatRounds) {
            if (round.hasBase) {
                const model = round.attacker.hash === currentGroup.fighterA.hash ? model1 : model2;
                const weapon = model.Player.Items[round.attackSecondary ? 'Wpn2' : 'Wpn1'];

                round.hasError = !_within(round.attackBase, weapon.DamageMin - variance, weapon.DamageMax + variance);
            }
        }

        // Prepare summary
        for (const fighter of [group.fighterA, group.fighterB]) {
            fighter.damages = {};

            const items = fighter.editor.Items;

            fighter.damages.weapon1_range_base = {
                min: items.Wpn1.DamageMin,
                max: items.Wpn1.DamageMax
            };

            if (fighter.Class === ASSASSIN) {
                fighter.damages.weapon2_range_base = {
                    min: items.Wpn2.DamageMin,
                    max: items.Wpn2.DamageMax
                };
            }
        }

        // Calculate summary
        for (const fight of group.fights) {
            for (const { attacker, attackType, hasError, attackBase, hasBase, attackSecondary, attackCrit } of fight.rounds) {
                const container = group[group.fighterA.hash === attacker.hash ? 'fighterA' : 'fighterB'];

                // Calculate damage range
                if (hasBase) {
                    const key = `${attackSecondary ? 'weapon2' : 'weapon1'}_range${attackType === ATTACK_SWOOP ? '_swoop' : ''}${attackCrit ? '_critical' : ''}`;

                    if (typeof container.damages[key] === 'undefined') {
                        container.damages[key] = {
                            min: +Infinity,
                            max: -Infinity,
                            err: false
                        };
                    }

                    const range = container.damages[key];

                    range.min = Math.min(range.min, attackBase);
                    range.max = Math.max(range.max, attackBase);
                    range.err = range.err || hasError
                }
            }
        }
    }

    function updatePreview () {
        if (currentGroup && currentFight) {
            // Process base damages within the group
            processGroup(currentGroup);

            // Render table with fight rounds
            renderFight(currentGroup, currentFight);

            // Render sidebar
            renderDamagesSidebar(currentGroup);
        }
    }

    const RANGE_TYPES = [
        'weapon1_range_base',
        'weapon1_range',
        'weapon1_range_critical',
        'weapon1_range_swoop',
        'weapon2_range_base',
        'weapon2_range',
        'weapon2_range_critical'
    ];

    function renderDamagesSidebar (group) {
        $sidebarDamagesContent.empty();

        for (const fighter of [group.fighterA, group.fighterB]) {
            const { Class: klass, damages } = fighter;
            
            let content = '';
            for (const type of RANGE_TYPES) {
                if (type in damages) {
                    const { min, max, err } = damages[type];

                    content += `
                        <div class="field">
                            <label class="${err ? '!text-orangered' : ''}">${intl(`analyzer.sidebar.damages.${type}`)}${err ? ' !' : ''}</label>
                            <div class="ui inverted centered input">
                                <input type="text" class="${err ? '!text-orangered' : ''}" disabled value="${min} - ${max}">
                            </div>
                        </div>
                    `;
                }
            }

            $sidebarDamagesContent.append(`
                <div class="ui small inverted form">
                    <div class="field">
                        <h3 class="ui centered inverted header flex items-center justify-content-center gap-2">
                            <img style="width: 30px; height: 30px;" src="res/class${klass}.png">
                            <div class="mt-1">${getFighterName(fighter)}</div>
                        </h3>
                    </div>
                    ${content}
                </div>
            `);
        }
    }

    function importFights ({ players, fights, config }) {
        // Set and render simulator configuration
        CONFIG.set(config);

        SimulatorUtils.config = config;

        // Insert players & fights
        currentPlayers.push(...players);
        
        for (const fight of fights) {
            const mapping = {
                [fight.fighterA.ID]: fight.fighterA,
                [fight.fighterB.ID]: fight.fighterB
            };

            // Fill in all attacker & target data for each round
            for (const round of fight.rounds) {
                round.attacker = mapping[round.attackerId];
                round.target = mapping[round.targetId];
            }

            currentFights.push(fight);
        }
    }

    const FIGHTER_WHITELIST = [
        'ID', 'Name', 'Level', 'MaximumLife', 'Life',
        'Strength', 'Dexterity', 'Intelligence', 'Constitution',
        'Luck', 'Class', 'Items'
    ];

    const ROUND_WHITELIST = [
        'attackChained', 'attackCrit', 'attackDamage', 'attackMissed',
        'attackRage', 'attackSecondary', 'attackSpecial', 'attackType',
        'targetHealthLeft', 'attackerSpecialState', 'targetSpecialState'
    ];

    function cleanCopy (rawObject, whitelist) {
        const object = {};
        for (const field of whitelist) {
            object[field] = rawObject[field];
        }

        return object;
    }

    function exportFights (source, parent) {
        // Assemble fights
        const assembledFights = Array.isArray(source) ? source : (
            typeof parent !== 'undefined' ? [Object.assign({}, source, parent)] : source.fights.map((fight) => Object.assign({}, fight, source))
        );

        // Collect all players and fights
        const exportFights = [];
        const exportPlayers = {};

        for (const { fighterA, fighterB, rounds, winner } of assembledFights) {
            // Collect players
            if (fighterA.player) {
                exportPlayers[fighterA.hash] = toSimulatorModel(fighterA.player);
            }

            if (fighterB.player) {
                exportPlayers[fighterB.hash] = toSimulatorModel(fighterB.player);
            }

            // Collect fight
            exportFights.push({
                fighterA: cleanCopy(fighterA, FIGHTER_WHITELIST),
                fighterB: cleanCopy(fighterB, FIGHTER_WHITELIST),
                rounds: rounds.map((round) => Object.assign(cleanCopy(round, ROUND_WHITELIST), {
                    attackerId: round.attacker.ID,
                    targetId: round.target.ID
                }))
            })
        }
        
        // Export
        Exporter.json({
            players: Object.values(exportPlayers),
            fights: exportFights
        });
    }

    render();

    return {
        getPlayers: () => currentPlayers,
        getFights: () => currentFights
    }
})