// Fight types enum
const FIGHT_TYPES = {
    PlayerVsPlayer: 0,
    Quest: 1,
    Battle: 2,
    Raid: 3,
    Dungeon: 4,
    Tower: 5,
    PlayerPortal: 6,
    GuildPortal: 7,
    FortAttack: 8,
    FortDefend: 9,
    Shadow: 12,
    PetsDungeon: 13,
    PetsAttack: 14,
    PetsDefend: 15,
    Underworld: 16,
    GuildPet: 17,
    Hellevator: 18,
    GuildRaid: 20,
    TutorialDungeon: 21,
    DrivingDungeon: 22,
    FortRevenge: 109
};

// Editor
class PlayerEditor extends EditorBase {
    constructor (parent, callback) {
        super({
            name: new Field(`${parent} [data-path="Name"]`, ''),

            class: new Field(`${parent} [data-path="Class"]`, '1'),
            level: new Field(`${parent} [data-path="Level"]`, '0', Field.isPlayerLevel),
            armor: new Field(`${parent} [data-path="Armor"]`, '0', Field.isNumber),
            maximum_life: new Field(`${parent} [data-path="TotalHealth"]`, '0', null, { set: (value) => formatAsSpacedNumber(value, ' '), get: (value) => Number(String(value).replace(/ /g, '')) }),

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
        })

        this.callback = callback;

        this.fields['class'].initialize({
            values: CONFIG.indexes().map((value) => ({
                image: _classImageUrl(value),
                imageClass: '!-ml-3 !mr-2',
                name: intl(`general.class${value}`),
                value
            })),
            onChange: (value) => {
                $(`${parent} [data-optional="Weapon2"]`).toggle(value == ASSASSIN);
            },
            value: '1'
        });

        this.fields['weapon1_rune'].initialize({
            values: [
                {
                    name: intl('editor.none'),
                    value: 0
                },
                {
                    name: intl('editor.fire'),
                    value: RUNE_FIRE_DAMAGE
                },
                {
                    name: intl('editor.cold'),
                    value: RUNE_COLD_DAMAGE
                },
                {
                    name: intl('editor.lightning'),
                    value: RUNE_LIGHTNING_DAMAGE
                },
                {
                    name: intl('editor.auto'),
                    value: RUNE_AUTO_DAMAGE
                }
            ],
            value: '0'
        });

        this.fields['weapon2_rune'].initialize({
            values: [
                {
                    name: intl('editor.none'),
                    value: 0
                },
                {
                    name: intl('editor.fire'),
                    value: RUNE_FIRE_DAMAGE
                },
                {
                    name: intl('editor.cold'),
                    value: RUNE_COLD_DAMAGE
                },
                {
                    name: intl('editor.lightning'),
                    value: RUNE_LIGHTNING_DAMAGE
                },
                {
                    name: intl('editor.auto'),
                    value: RUNE_AUTO_DAMAGE
                }
            ],
            value: '0'
        });

        this.fields['weapon1_enchantment'].initialize({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ],
            value: 'false'
        });

        this.fields['weapon2_enchantment'].initialize({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ],
            value: 'false'
        });

        for (const field of Object.values(this.fields)) {
            field.setListener(() => {
                if (!this._frozen) {
                    this.callback();
                }
            });
        }

        this.autoFields = [
            'armor', 'gladiator', 'portal_damage', 'resistance_fire', 'resistance_cold', 'resistance_lightning',
            'weapon1_min', 'weapon1_max', 'weapon1_enchantment', 'weapon1_rune', 'weapon1_value',
            'weapon2_min', 'weapon2_max', 'weapon2_enchantment', 'weapon2_rune', 'weapon2_value'
        ];
    }

    autofill (object) {
        this._frozen = true;

        for (const [key, field] of this.fieldsEntries) {
            if (this.autoFields.includes(key)) {
                const value = getObjectAt(object, field.path());

                if (typeof value === 'undefined') {
                    field.clear();
                } else {
                    field.set(value);
                }
            }
        }

        this._frozen = false;

        this.callback();
    }

    fill (object, editable) {
        this._frozen = true;

        for (const [key, field] of this.fieldsEntries) {
            const source = key === 'maximum_life' ? object : (editable || object);
            const value = getObjectAt(source, field.path());

            if (typeof value === 'undefined') {
                field.clear();
            } else {
                field.set(value);
            }
        }

        this._frozen = false;
    }
}

Site.ready({ name: 'analyzer', requires: ['translations_monsters'] }, function (urlParams) {
    // Elements
    const $buttonUpload = $('#button-upload');
    const $buttonClear = $('#button-clear');
    const $buttonExport = $('#button-export');
    const $buttonOptions = $('#button-options');
    const $buttonDamages = $('#button-damages');
    const $buttonGladiator = $('#button-gladiator');
    const $buttonArmor = $('#button-armor');

    const $buttonExportGroup = $('#button-export-group');
    const $buttonExportFight = $('#button-export-fight');
    const $buttonResetGroup = $('#button-reset-group');
    const $buttonCopyGroup = $('#button-copy-group');
    const $buttonAnalyzeGroup = $('#button-analyze-group');
    const $buttonSimulateGroup = $('#button-simulate-group');

    const $groupList = $('#group-list');
    const $fightList = $('#fight-list');
    const $fightTable = $('#fight-table');
    const $fightView = $('#fight-view');
    const $fightCopy = $('#fight-copy');

    const $sidebarDamages = $('#sidebar-damages');
    const $sidebarDamagesContent = $('#sidebar-damages-content');

    const $autofill1 = $('#player1').operator('autofill');
    const $autofill2 = $('#player2').operator('autofill');

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

    const GROUP_SORTERS = {
        'default': (group) => group.index,
        'fight_count': (group) => group.fights.length,
        'fighter_b_level': (group) => group.fighterB.Level
    }

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
            type_display_mode: {
                type: 'dropdown',
                keys: Object.keys(ATTACK_TYPE_FORMATS),
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
            },
            group_sort: {
                type: 'dropdown',
                keys: Object.keys(GROUP_SORTERS),
                onChange: () => {
                    render(true);
                }
            }
        }

        Dialog.open(AnalyzerOptionsDialog, analyzerOptions, options);
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

    $fightCopy.click(() => {
        renderFight(currentGroup, currentFight, true);

        copyNode($fightTable.closest('table').get(0));

        renderFight(currentGroup, currentFight, false);
    });

    $buttonCopyGroup.click(() => {
        if (currentGroup) {
            const generator = ({ editor }) => Localization.generateTranslation({}, editor);

            const playerA = generator(currentGroup.fighterA);
            const playerB = generator(currentGroup.fighterB);

            const matrix = [];
            for (const key of Object.keys(playerA)) {
                matrix.push([key.replace(/^\./, ''), playerA[key], playerB[key]]);
            }

            const element = document.createElement('table');
            element.innerHTML = `<tbody>${matrix.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;

            document.body.appendChild(element);

            copyNode(element);

            document.body.removeChild(element);
        }
    });

    $buttonAnalyzeGroup.click(() => {
        if (currentGroup) {
            Dialog.open(FightStatisticalAnalysisDialog, currentGroup);
        }
    })

    $autofill1.click(() => {
        if (currentGroup) {
            Dialog.open(AnalyzerAutofillDialog).then(([value, data]) => {
                if (value) playerEditorA.autofill(data);
            });
        }
    })

    $autofill2.click(() => {
        if (currentGroup) {
            Dialog.open(AnalyzerAutofillDialog).then(([value, data]) => {
                if (value) playerEditorB.autofill(data);
            });
        }
    })

    function fighterToSimulatorModel (fighter) {
        return mergeDeep(
            mergeDeep(
                {
                    Health: fighter.Health
                },
                fighter.player ? ModelUtils.toSimulatorData(fighter.player) : {}
            ),
            fighter.editor
        );
    }

    $buttonSimulateGroup.click(() => {
        if (currentGroup) {
            const models = [
                fighterToSimulatorModel(currentGroup.fighterA),
                fighterToSimulatorModel(currentGroup.fighterB)
            ];

            const broadcast = new Broadcast();

            broadcast.on('token', () => {
                broadcast.send('data', { data: models, config: SimulatorUtils.config, type: 'custom' });
                broadcast.close();
            });

            window.open(`${window.location.origin}/simulator.html?debug&broadcast=${broadcast.token}`, '_blank');
        }
    });

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

    const playerEditorA = new PlayerEditor('#player1', () => updatePreview());
    const playerEditorB = new PlayerEditor('#player2', () => updatePreview());

    const analyzerOptions = new OptionsHandler(
        'analyzer',
        {
            rage_display_mode: 'decimal',
            type_display_mode: 'text',
            base_damage_error_margin: 1,
            damages_sidebar: false,
            group_sort: 'fight_count',
        }
    )

    $buttonDamages.click(() => {
        analyzerOptions.toggle('damages_sidebar');

        renderDamagesSidebar(currentGroup);
        renderToggles();
    })

    $buttonGladiator.click(() => {
        FLAGS.set({
            NoGladiatorReduction: !FLAGS.NoGladiatorReduction
        });

        updatePreview();
        renderToggles();
    })

    function renderToggles () {
        $buttonDamages[analyzerOptions.damages_sidebar ? 'addClass' : 'removeClass']('!text-orange');
        $buttonGladiator[FLAGS.NoGladiatorReduction ? 'addClass' : 'removeClass']('!text-orange');
    }

    renderToggles();

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
    function decomposeAttackType (attackType) {
        return {
            attackTypeSecondary: ATTACK_TYPES_SECONDARY.includes(attackType),
            attackTypeCritical: ATTACK_TYPES_CRITICAL.includes(attackType),
            attackTypeSpecial: ATTACK_TYPE_SPECIAL.includes(attackType)
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

    const GT_REWARDS = {
        1: 'hellevator_point',
        2: 'hellevator_ticket',
        3: 'mushroom',
        4: 'gold',
        5: 'lucky_coin',
        6: 'wood',
        7: 'stone',
        8: 'arcane',
        9: 'metal',
        10: 'souls',
        11: 'fruit1',
        12: 'fruit2',
        13: 'fruit3',
        14: 'fruit4',
        15: 'fruit5',
        16: 'gem_legendary',
        17: 'shadow_gold',
        18: 'shadow_silver',
        19: 'shadow_bronze',
        20: 'gem_small',
        21: 'gem_medium',
        22: 'gem_large',
        23: 'fruit_mixed',
        24: 'experience',
        25: 'pet_egg',
        26: 'hourglass',
        27: 'honor',
        28: 'beer'
    };

    function getRewards (response) {
        const rewards = {};

        if (response.gtreward) {
            // TODO: Replace with specific separator
            for (const [type, _, amount] of _eachBlock(response.gtreward.numbers(/\/|,/), 3)) {
                if (type) {
                    rewards[GT_REWARDS[type]] = amount;
                }
            }
        }

        return rewards;
    }

    const HAR_ROUND_VERSION_1 = 1;
    const HAR_ROUND_VERSION_2 = 2;

    const HAR_ROUND_PARSERS = {
        [HAR_ROUND_VERSION_1]: (fighterA, fighterB, rounds) => {
            // Disable v1 for now
            return null
        },
        [HAR_ROUND_VERSION_2]: (fighterA, fighterB, rounds) => {
            const processedRounds = [];

            const data = new ComplexDataType(rounds);
            while (data.atLeast(9)) {
                const attackerId = data.long();
                const targetId = attackerId == fighterA.ID ? fighterB.ID : fighterA.ID;

                const attackerState = data.long();
                const attackType = data.long();

                const defenseType = data.long();
                const targetState = data.long();

                const attackerHealth = data.long();
                const targetHealth = data.long();

                const attackerEffectCount = data.long();
                const attackerEffects = [];
                for (let i = 0; i < attackerEffectCount; i++) {
                    attackerEffects.push({
                        type: data.long(),
                        tier: data.long(),
                        duration: data.long()
                    })
                }

                const targetEffectCount = data.long();
                const targetEffects = [];
                for (let i = 0; i < targetEffectCount; i++) {
                    targetEffects.push({
                        type: data.long(),
                        tier: data.long(),
                        duration: data.long()
                    })
                }

                const [attacker, target] = attackerId == fighterA.ID ? [fighterA, fighterB] : [fighterB, fighterA];

                processedRounds.push({
                    attackerId,
                    targetId,
                    attackerState,
                    targetState,
                    attackType,
                    defenseType,
                    attackerHealth,
                    targetHealth,
                    attackerEffects,
                    targetEffects,
                    attacker,
                    target,
                    attackDamage: 0,
                    attackRage: 0,
                    ...decomposeAttackType(attackType)
                })
            }

            const findHealth = (i) => {
                const currentRound = processedRounds[i];
                for (let j = i - 1, round; round = processedRounds[j]; j--) {
                    if (round.attackType === ATTACK_TYPE_REVIVE) {
                        if (round.attacker === currentRound.attacker) {
                            return round.targetHealth;
                        } else {
                            return round.attackerHealth;
                        }
                    } else if (round.attacker == currentRound.attacker && !round.attackTypeSpecial) {
                        return round.targetHealth;
                    }
                }

                return currentRound.target.Health;
            }

            // Finalize each round
            let attackRageOffset = 0;
            for (let i = 0, round; round = processedRounds[i]; i++) {
                // Calculate attack damage
                if (round.attackType === ATTACK_TYPE_REVIVE) {
                    round.attackDamage = round.attackerHealth;
                } else if (round.attackType === ATTACK_TYPE_MINION_SUMMON) {
                    round.targetHealth = findHealth(i);
                } else if (round.attackType !== ATTACK_TYPE_REVIVE) {
                    round.attackDamage = findHealth(i) - round.targetHealth;
                } else {
                    round.attackDamage = round.targetHealth;
                }

                if (round.attackTypeSpecial && round.attackType !== ATTACK_TYPE_MINION_SUMMON) {
                    // Decrease rage if it's a special attack (revive, note)
                    attackRageOffset--;
                }

                round.attackRage = 1 + ((i + attackRageOffset) / 6);

                if (round.attackerState === FIGHTER_STATE_BERSERKER_RAGE) {
                    // Increase rage if it's a chained attack
                    attackRageOffset++;
                }
            }

            return processedRounds
        }
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
                    const count = _fastMax(
                        Object.keys(r)
                        .filter((key) => key.startsWith('fightheader'))
                        .map((key) => parseInt(key.match(/(\d*)$/)[0] || '1'))
                    );

                    for (let i = 1; i <= count; i++) {
                        digestedFights.push({
                            header: r[`fightheader${i}`].mixed(),
                            rounds: r[`fight${i}`].numbers(/[,/]/),
                            rewards: getRewards(r),
                            version: r.fightversion?.number
                        });
                    }
                } else {
                    digestedFights.push({
                        header: r.fightheader.mixed(),
                        rounds: r.fight.numbers(/[,/]/),
                        rewards: getRewards(r),
                        version: r.fightversion?.number
                    });
                }
            }

            if (text.includes('playerlookat') || text.includes('ownplayersave')) {
                const r = PlayaResponse.fromText(text);

                if (r.ownplayersave && r.ownplayername) {
                    // Read only necessary data from own player
                    digestedPlayers.push({
                        own: true,
                        save: r.ownplayersave.numbers(),
                        name: r.ownplayername.string,
                        tower: r.owntower?.numbers()
                    })
                } else if (r.ownplayersave) {
                    // Capture save
                    const lastPlayer = digestedPlayers.findLast((entry) => entry.own && entry.name);
                    if (lastPlayer) {
                        digestedPlayers.push({
                            own: true,
                            save: r.ownplayersave.numbers(),
                            name: lastPlayer.name,
                            tower: r.owntower?.numbers() || lastPlayer.tower
                        })
                    }
                } else if (r['#ownplayersave']) {
                    // Capture save delta
                    const lastPlayer = digestedPlayers.findLast((entry) => entry.own && entry.name);
                    if (lastPlayer) {
                        const save = Array.from(lastPlayer.save);

                        for (const [index, value] of _eachBlock(r['#ownplayersave'].numbers(), 2)) {
                            save[index] = value;
                        }

                        digestedPlayers.push({
                            own: true,
                            save,
                            name: lastPlayer.name,
                            tower: r.owntower?.numbers() || lastPlayer.tower
                        })
                    }
                } else if (r.otherplayer && r.otherplayername) {
                    digestedPlayers.push({
                        own: false,
                        save: r.otherplayer.numbers(),
                        name: r.otherplayername.string,
                        tower: null
                    })
                }
            }
        }

        for (const { header, rounds, rewards, version } of digestedFights) {
            const fightType = header[0];

            // Proceed only if type of fight is known to the system
            if (Object.values(FIGHT_TYPES).includes(fightType)) {
                // Parse fighters
                const fighterA = new FighterModel(header.slice(5, 52), fightType);
                const fighterB = new FighterModel(header.slice(52, 99), fightType);

                const processedRounds = HAR_ROUND_PARSERS[version ?? HAR_ROUND_VERSION_1](fighterA, fighterB, rounds)

                if (processedRounds) {
                    currentFights.push({
                        fighterA,
                        fighterB,
                        rounds: processedRounds,
                        rewards
                    })
                } else {
                    // Ignore fight
                }
            }
        }

        // Convert all player data into actual player models and optionally companions
        for (const data of digestedPlayers) {
            const player = new PlayerModel(data);
            currentPlayers.push(player);

            if (player.Companions) {
                currentPlayers.push(
                    player.Companions.Bert,
                    player.Companions.Mark,
                    player.Companions.Kunigunde
                )
            }
        }
    }

    function reset () {
        currentFights = [];
        currentPlayers = [];
        currentGroups = [];

        currentGroup = null;
        currentFight = null;

        // Remove all sidebar damage content
        $sidebarDamagesContent.empty();
    }

    function renderGeneralButtons () {
        const buttonsEnabled = currentFights.length > 0;
        const buttonsMethod = buttonsEnabled ? 'removeClass' : 'addClass';

        for (const $button of [$buttonExport, $buttonClear, $buttonAnalyzeGroup, $buttonExportGroup, $buttonResetGroup, $buttonCopyGroup, $buttonSimulateGroup]) {
            $button[buttonsMethod]('disabled');
        }
    }

    function injectComputedData (object) {
        if (object.Boss) {
            const config = CONFIG.fromIndex(object.Class);

            object.Armor = object.Level * config.MaximumDamageReduction;
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

            injectComputedData(fighterA);
            injectComputedData(fighterB);

            currentFights[index].hash = `${fighterA.hash}-${fighterB.hash}`;
            currentFights[index].index = String(index);
        }

        for (const player of currentPlayers) {
            player.model = SimulatorModel.create(null, player);
            player.hash = computePlayerHash(player);
        }

        // Unique players by hash
        currentPlayers = currentPlayers.filter((value, index, self) => self.findIndex((object) => object.hash === value.hash) === index);

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
        currentGroups = [];

        for (const fight of currentFights) {
            let group = currentGroups.find((group) => group.hash === fight.hash);

            if (!group) {
                group = {
                    index: currentGroups.length,
                    hash: fight.hash,
                    fighterA: fight.fighterA,
                    fighterB: fight.fighterB,
                    fights: []
                }

                currentGroups.push(group);
            }

            group.fights.push({ index: fight.index, rounds: fight.rounds, winner: fight.winner });
        }

        _sortDesc(currentGroups, GROUP_SORTERS[analyzerOptions.group_sort])

        // Display in dropdown
        $groupList.dropdown({
            values: currentGroups.map((group) => ({
                name: `<img class="!-ml-3 !mr-2" src="${_classImageUrl(group.fighterA.Class)}">${getFighterName(group.fighterA)} &nbsp;&nbsp;- <img class="!mr-2" src="${_classImageUrl(group.fighterB.Class)}">${getFighterName(group.fighterB)} (${group.fights.length})`,
                value: group.hash
            }))
        }).dropdown('setting', 'onChange', (value) => {
            const group = currentGroups.find((group) => group.hash === value);

            $fightView.show();

            renderPlayer(group.fighterA, playerEditorA, soft);
            renderPlayer(group.fighterB, playerEditorB, soft);

            renderFightGroup(group);
        });

        if (currentGroups.length > 0) {
            $groupList.dropdown('set selected', _dig(currentGroup, 'hash') || currentGroups[0].hash);
        } else {
            renderDamagesSidebar(null);
        }
    }

    function renderPlayer (player, editor, soft) {
        editor.fill(player, soft ? (player.editor || player.player) : (player.player || player.editor));
    }

    const ATTACK_RAGE_FORMATS = {
        'decimal': (rage) => rage.toFixed(2),
        'percentage': (rage) => `${Math.trunc(100 * rage)}%`,
        'fraction': (rage) => `${Math.round(rage * 6)}/6`,
    }

    const ATTACK_TYPE_FORMATS = {
        'text': (type) => intl(`general.attack${type}`),
        'text_with_id': (type) => `${intl(`general.attack${type}`)} #${type}`,
        'id': (type) => type
    }

    const DEFENSE_TYPE_FORMATS = {
        'text': (type) => intl(`general.defense${type}`),
        'text_with_id': (type) => `${intl(`general.defense${type}`)} #${type}`,
        'id': (type) => type
    }

    const BARD_NOTE_COLORS = ['c4c4c4', '5e7fc4', 'd1a130'];

    function renderState (state, copyMode) {
        if (state) {
            if (state.type === 'druid_rage') {
                return copyMode ? 'druid_rage' : `<i class="ui paw icon text-orangered" title="${intl('analyzer.special_state.druid_rage')}"></i>`;
            } else if (state.type === 'bard_song') {
                return copyMode ? `bard_song_${state.level}` : `<span title="${intl('analyzer.special_state.bard_song')}" style="color: #${BARD_NOTE_COLORS[state.level]};">${state.notes} <i class="ui itunes note icon"></i></span>`;
            } else if (state.type === 'berserker_rage') {
                return copyMode ? 'berserker_rage' : `<i class="ui bolt icon text-orangered" title="${intl('analyzer.special_state.berserker_rage')}"></i>`;
            } else if (state.type === 'necromancer_minion') {
                return copyMode ? `necromancer_minion_${state.minion}`: `<i class="ui skull crossbones icon text-orangered" title="${intl(`analyzer.special_state.necromancer_minion_${state.minion}`)}"></i>`;
            } else if (state.type === 'paladin_stance') {
                return copyMode ? `paladin_stance_${state.stance}` : `<div class="flex items-center justify-content-center"><i class="ui shield alternate icon text-orangered"></i> ${intl(`analyzer.special_state.paladin_stance_${state.stance}`)}</div>`
            }
        }

        return '';
    }

    function renderFight (group, fight, copyMode = false) {
        const formatAttackRage = ATTACK_RAGE_FORMATS[analyzerOptions.rage_display_mode];

        const formatAttackType = ATTACK_TYPE_FORMATS[analyzerOptions.type_display_mode];
        const formatDefenseType = DEFENSE_TYPE_FORMATS[analyzerOptions.type_display_mode];

        let content = '';

        for (let i = 0; i < fight.rounds.length; i++) {
            const {
                attacker, target, attackType, attackRage, attackDamage, attackBase, attackTypeCritical,
                targetHealth, attackerSpecialDisplay, targetSpecialDisplay, attackerHealth,
                hasDamage, hasBase, hasError, hasIgnore, defenseType
            } = fight.rounds[i];

            const nameStyle = ' style="text-overflow: ellipsis; white-space: nowrap;"';

            const attackerState = renderState(attackerSpecialDisplay, copyMode);
            const targetState = renderState(targetSpecialDisplay, copyMode);

            if (hasIgnore) {
                // Do nothing if attack is ignored in display
                continue;
            } else if (attackType === ATTACK_TYPE_REVIVE) {
                content += `
                    <tr${attacker.ID == group.fighterA.ID ? ' style="background-color: #202020; color: darkgray;"' : ''}>
                        <td class="!text-center">${i + 1}</th>
                        <td class="!text-center"></th>
                        <td class="!text-center"${nameStyle}>${getFighterName(attacker)}</th>
                        <td class="!text-center">${attackerState}</th>
                        <td class="!text-center"></th>
                        <td class="!text-center"></th>
                        <td class="!text-center text-violet">${formatAttackType(attackType)}</th>
                        <td class="!text-center"></th>
                        <td class="!text-center">${Math.max(0, 100 * attackerHealth / attacker.Health).toFixed(1)}%</th>
                        <td class="!text-center"></th>
                    </tr>
                `;
            } else {
                const attackClass = attackTypeCritical ? ' text-orangered font-bold' : (attackType === ATTACK_TYPE_FIREBALL ? ' text-violet' : '');

                const displayDamage = hasDamage ? formatAsSpacedNumber(attackDamage) : '';
                const displayBase = hasBase ? formatAsSpacedNumber(attackBase) : '';

                content += `
                    <tr${attacker.ID == group.fighterA.ID ? ' style="background-color: #202020; color: darkgray;"' : ''}>
                        <td class="!text-center">${i + 1}</th>
                        <td class="!text-center">${formatAttackRage(attackRage)}</th>
                        <td class="!text-center"${nameStyle}>${getFighterName(attacker)}</th>
                        <td class="!text-center">${attackerState}</th>
                        <td class="!text-center"${nameStyle}>${getFighterName(target)}</th>
                        <td class="!text-center">${targetState}</th>
                        <td class="!text-center${attackClass}">${formatAttackType(attackType)}${defenseType ? ` - ${formatDefenseType(defenseType)}` : ''}</th>
                        <td class="!text-center${attackClass}">${displayDamage}</th>
                        <td class="!text-center">${Math.max(0, 100 * targetHealth / target.Health).toFixed(1)}%</th>
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

    function getFighterStatus (fighter) {
        let text = getFighterName(fighter);
        if (fighter.Health !== fighter.TotalHealth) {
            text += ` (${formatAsSpacedNumber(fighter.Health)})`
        }

        return text;
    }

    function renderFightGroup (group) {
        const nameA = getFighterStatus(group.fighterA);
        const nameB = getFighterStatus(group.fighterB);

        $fightList.dropdown({
            values: group.fights.map((fight, index) => ({
                name: intl('analyzer.table.select', { index: index + 1, rounds: fight.rounds.length, winner: getFighterName(fight.winner), nameA, nameB }),
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
    let currentGroups = [];

    let currentGroup = null;
    let currentFight = null;

    function compareWithin (val, min, max) {
        return val >= min ? (val <= max ? 0 : 2) : 1;
    }

    function findAttackerState (round, model) {
        if (round.attackerState || round.attackerEffects.length > 0) {
            switch (round.attacker.Class) {
                case DRUID: return model.Data.RageState;
                case BARD: return model.Data.Songs[round.attackerEffects[0].tier - 1];
                case NECROMANCER: return model.Data.Minions[round.attackerEffects[0].tier - 1];
                case PALADIN: return model.Data.Stances[round.attackerState - 1];
                default: {
                    return model.Data;
                }
            }
        } else {
            return model.Data;
        }
    }

    function findTargetState (round, model) {
        if (round.targetState || round.targetEffects.length > 0) {
            switch (round.target.Class) {
                case DRUID: return model.Data.RageState;
                case BARD: return model.Data.Songs[round.targetEffects[0].tier - 1];
                case NECROMANCER: return model.Data.Minions[round.targetEffects[0].tier - 1];
                case PALADIN: return model.Data.Stances[round.targetState - 1];
                default: {
                    return model.Data;
                }
            }
        } else {
            return model.Data;
        }
    }

    function processGroup (group) {
        const variance = parseInt(analyzerOptions.base_damage_error_margin);

        group.fighterA.editor = playerEditorA.read();
        group.fighterB.editor = playerEditorB.read();

        // Fetch data and initialize models
        const model1 = SimulatorModel.create(0, group.fighterA.editor);
        const model2 = SimulatorModel.create(1, group.fighterB.editor);

        // Initialize models
        SimulatorModel.initializeFighters(model1, model2);

        // Recalculate death counts
        for (const { rounds } of group.fights) {
            let deathsA = 0;
            let deathsB = 0;

            for (let i = 0; i < rounds.length; i++) {
                const round = rounds[i];

                const isFighterA = round.attackerId === group.fighterA.ID;

                if (round.attackType === ATTACK_TYPE_REVIVE) {
                    if (isFighterA) {
                        deathsA++;
                    } else {
                        deathsB++;
                    }
                }

                if (isFighterA) {
                    round.attackerDeaths = deathsA;
                    round.targetDeaths = deathsB;
                } else {
                    round.attackerDeaths = deathsB;
                    round.targetDeaths = deathsA;
                }
            }
        }

        const flatRounds = group.fights.map((fight) => fight.rounds).flat();

        // Decorate each round
        for (let i = 0; i < flatRounds.length; i++) {
            const round = flatRounds[i];

            // Set display special state
            if (round.attackerState === FIGHTER_STATE_DRUID_RAGE) {
                round.attackerSpecialDisplay = { type: 'druid_rage' };
            }

            if (round.attacker.Class === PALADIN) {
                round.attackerSpecialDisplay = { type: 'paladin_stance', stance: round.attackerState };
            }

            if (round.target.Class === PALADIN) {
                round.targetSpecialDisplay = { type: 'paladin_stance', stance: round.targetState };
            }

            if (round.targetState === FIGHTER_STATE_DRUID_RAGE) {
                round.targetSpecialDisplay = { type: 'druid_rage' };
            }

            if (round.attackerState === FIGHTER_STATE_BERSERKER_RAGE) {
                round.attackerSpecialDisplay = { type: 'berserker_rage' }
            }

            if (round.attackerEffects.length > 0 && round.attacker.Class === NECROMANCER) {
                round.attackerSpecialDisplay = { type: 'necromancer_minion', minion: round.attackerEffects[0].tier }
            }

            if (round.targetEffects.length > 0 && round.target.Class === NECROMANCER) {
                round.targetSpecialDisplay = { type: 'necromancer_minion', minion: round.targetEffects[0].tier }
            }

            if (round.attackerEffects.length > 0 && round.attacker.Class === BARD) {
                const effect = round.attackerEffects[0]

                round.attackerSpecialDisplay = { type: 'bard_song', level: effect.tier, notes: effect.duration }
            }

            // Skip if missed or special
            if (round.attackTypeSpecial || round.defenseType) {
                continue;
            }

            round.hasDamage = true;
            round.hasBase = round.attackType !== ATTACK_TYPE_FIREBALL && round.attackType !== ATTACK_TYPE_CATAPULT;
        }

        // Calculate base damage of each round
        for (const round of flatRounds) {
            // We are assuming that lute round always follows after bard attack
            if (round.hasIgnore) {
                continue;
            } else if (round.hasBase) {
                const attackerModel = round.attacker.ID === currentGroup.fighterA.ID ? model1 : model2;
                const attackerState = findAttackerState(round, attackerModel);

                const targetModel = round.target.ID === currentGroup.fighterA.ID ? model1 : model2;
                const targetState = findTargetState(round, targetModel);

                // Scaled down weapon damage
                let damage = round.attackDamage / round.attackRage / (round.attackTypeSecondary ? attackerState.Weapon2.Base : attackerState.Weapon1.Base);

                // Special cases
                if (round.attackTypeCritical) {
                    damage /= attackerState.CriticalMultiplier;
                }

                if (round.attacker.Class === DRUID && (round.attackType === ATTACK_TYPE_SWOOP || round.attackType === ATTACK_TYPE_SWOOP_CRITICAL)) {
                    damage /= attackerModel.SwoopMultiplier;
                }

                if (round.attacker.Class === DEMONHUNTER) {
                    damage /= Math.max(attackerModel.Config.ReviveDamageMin, attackerModel.Config.ReviveDamage - round.attackerDeaths * attackerModel.Config.ReviveDamageDecay);
                }

                // Apply back reduced damage
                damage /= targetState.ReceivedDamageMultiplier;

                round.attackBase = Math.trunc(damage);
            }
        }

        // Verify whether damage is in range
        for (const round of flatRounds) {
            if (round.hasBase) {
                const model = round.attacker.ID === currentGroup.fighterA.ID ? model1 : model2;
                const weapon = model.Player.Items[round.attackTypeSecondary ? 'Wpn2' : 'Wpn1'];

                round.hasError = compareWithin(round.attackBase, weapon.DamageMin - variance, weapon.DamageMax + variance);
            }
        }

        // Prepare summary
        for (const fighter of [group.fighterA, group.fighterB]) {
            fighter.damages = {
                _samples: 0
            };

            const items = fighter.editor.Items;

            fighter.damages.weapon1_range_base = {
                min: items.Wpn1.DamageMin,
                max: items.Wpn1.DamageMax
            };

            const fist1 = (fighter.ID === currentGroup.fighterA.ID ? model1 : model2).getBaseDamage(false);
            fighter.damages.weapon1_fist_damage = {
                min: fist1.Min,
                max: fist1.Max
            }

            if (fighter.Class === ASSASSIN) {
                fighter.damages.weapon2_range_base = {
                    min: items.Wpn2.DamageMin,
                    max: items.Wpn2.DamageMax
                };

                const fist2 = (fighter.ID === currentGroup.fighterA.ID ? model1 : model2).getBaseDamage(true);
                fighter.damages.weapon2_fist_damage = {
                    min: fist2.Min,
                    max: fist2.Max
                }
            }
        }

        // Calculate summary
        for (const fight of group.fights) {
            for (const { attacker, attackType, attackTypeSecondary, hasError, attackBase, hasBase, attackTypeCritical } of fight.rounds) {
                const container = group[group.fighterA.ID === attacker.ID ? 'fighterA' : 'fighterB'];

                // Calculate damage range
                if (hasBase) {
                    const key = `${attackTypeSecondary ? 'weapon2' : 'weapon1'}_range${attackType === ATTACK_TYPE_SWOOP || attackType === ATTACK_TYPE_SWOOP_CRITICAL ? '_swoop' : ''}${attackTypeCritical ? '_critical' : ''}`;

                    if (typeof container.damages[key] === 'undefined') {
                        container.damages[key] = {
                            min: +Infinity,
                            max: -Infinity,
                            err: 0,
                            cnt: 0
                        };
                    }

                    const range = container.damages[key];

                    range.min = Math.min(range.min, attackBase);
                    range.max = Math.max(range.max, attackBase);
                    range.err = range.err | hasError;
                    range.cnt++;

                    container.damages._samples++;
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
        'weapon1_range_swoop_critical',
        'weapon2_range_base',
        'weapon2_range',
        'weapon2_range_critical',
        'weapon1_fist_damage',
        'weapon2_fist_damage'
    ];

    function renderDamagesSidebar (group) {
        if (analyzerOptions.damages_sidebar && group) {
            $sidebarDamages.show();
        } else {
            $sidebarDamages.hide();
            return;
        }

        $sidebarDamagesContent.empty();

        for (const fighter of [group.fighterA, group.fighterB]) {
            const { Class: klass, damages } = fighter;
            
            let content = '';
            for (const type of RANGE_TYPES) {
                if (type in damages) {
                    const { min, max, err, cnt } = damages[type];

                    content += `
                        <div class="field">
                            <label class="${err ? '!text-orangered' : ''}" style="display: flex;">
                                <div>${intl(`analyzer.sidebar.damages.${type}`)}${err ? ' !' : ''}${err & 1 ? ' < min' : ''}${err & 2 ? ' > max' : ''}</div>
                                ${typeof cnt === 'number' ? `<div style="margin-left: auto;">(${cnt} / ${damages._samples})</div>` : ''}
                            </label>
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
                            <img style="width: 30px; height: 30px;" src="${_classImageUrl(klass)}">
                            <div class="mt-1">${getFighterName(fighter)}</div>
                        </h3>
                    </div>
                    ${content}
                </div>
            `);
        }
    }

    function replaceLifeWithHealth (fighter) {
        if (typeof fighter.Life !== 'undefined') {
            fighter.Health = fighter.Life;

            delete fighter.Life;
        }

        if (typeof fighter.MaximumLife !== 'undefined') {
            fighter.TotalHealth = fighter.MaximumLife;

            delete fighter.MaximumLife;
        }
    }

    function importFights ({ players, fights, config }) {
        // Set and render simulator configuration
        CONFIG.set(config);

        SimulatorUtils.config = config;

        // Insert players & fights
        currentPlayers.push(...players);
        
        for (const fight of fights) {
            replaceLifeWithHealth(fight.fighterA);
            replaceLifeWithHealth(fight.fighterB);

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
        'ID', 'Name', 'Level', 'TotalHealth', 'Health',
        'Strength', 'Dexterity', 'Intelligence', 'Constitution',
        'Luck', 'Class', 'Items'
    ];

    const ROUND_WHITELIST = [
        'attackerId',
        'targetId',
        'attackerState',
        'targetState',
        'attackType',
        'defenseType',
        'attackerHealth',
        'targetHealth',
        'attackerEffects',
        'targetEffects',
        'attackDamage',
        'attackRage',
        'attackTypeSecondary',
        'attackTypeCritical',
        'attackTypeSpecial'
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

        for (const { fighterA, fighterB, rounds } of assembledFights) {
            // Collect players
            if (fighterA.player) {
                exportPlayers[fighterA.hash] = ModelUtils.toSimulatorData(fighterA.player);
            }

            if (fighterB.player) {
                exportPlayers[fighterB.hash] = ModelUtils.toSimulatorData(fighterB.player);
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
        Exporter.json(
            {
                players: Object.values(exportPlayers),
                fights: exportFights
            },
            `analyzer_${Exporter.time}`
        );
    }

    render();

    return {
        getPlayers: () => currentPlayers,
        getFights: () => currentFights,
        getGroups: () => currentGroups
    }
})