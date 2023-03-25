Site.ready(null, function () {
    const BUILDINGS = Object.keys(Building).map(name => {
        return name.replace(/([A-Z])/g, '_$1').slice(1).toLowerCase();
    });
    
    // Generate all buildings via JS
    const $table = $('#table');
    $table.html(BUILDINGS.map((name, index) => {
        return `
            <tr data-name="${name}">
                <td style="font-size: 105%;"><b>${intl(`idle.building.${name}`)}</b></td>
                <td class="dropdown-container">
                    <div class="field">
                        <div class="ui selection compact fluid inverted dropdown" data-field="upgrades">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="ui inverted input">
                            <input type="text" data-field="level">
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field cursor-pointer" data-upgrade>
                        <div class="ui inverted input">
                            <input type="text" disabled data-field="level_next">
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="ui inverted input">
                            <input type="text" disabled data-field="cycle_duration">
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="ui inverted input">
                            <input type="text" disabled data-field="cycle_money">
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="ui inverted centered input">
                            <input type="text" disabled data-field="money_share">
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="ui inverted input">
                            <input type="text" disabled data-field="upgrade_money">
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="ui inverted input">
                            <input type="text" disabled data-field="upgrade_estimation">
                        </div>
                    </div>  
                </td>
            </tr>
        `;
    }).join(''));
    
    // Number formatting
    let modeNumber = 0;
    $('#number-mode').dropdown({
        values: [0, 1].map(value => ({ value, name: intl(`idle.topbar.number.${value}`) }))
    }).dropdown('set selected', '0').dropdown('setting', 'onChange', value => {
        modeNumber = parseInt(value);

        EditorController.generate();
    });

    // Upgrade suggestions
    let modeSuggest = 0;
    $('#suggest-mode').dropdown({
        values: [0, 1, 2].map(value => ({ value, name: intl(`idle.topbar.suggest.${value}`) }))
    }).dropdown('set selected', '0').dropdown('setting', 'onChange', value => {
        modeSuggest = parseInt(value);

        EditorController.generate();
    });

    // Update mode
    let modeUpgrade = 0;
    $('[data-upgrade-mode]').click(function () {
        const $this = $(this);

        if ($this.hasClass('!background-green')) {
            $this.removeClass('!background-green');
            modeUpgrade = 0;
        } else {
            $('[data-upgrade-mode]').removeClass('!background-green');
            $this.addClass('!background-green');
            modeUpgrade = parseInt($this.data('upgrade-mode'));
        }
    
        EditorController.generate();
    });

    // Click-to-upgrade via Next level field
    $('[data-upgrade]').click(function () {
        const $this = $(this);
        $this.closest('tr').find('[data-field="level"]').val($this.find('[data-field="level_next"]').val());

        EditorController.generate();
    });

    // Editor
    const EditorController = new (class {
        constructor () {
            this.buildings = BUILDINGS.map((name, index) => {
                const fieldPath = (fieldName) => `tr[data-name="${name}"] [data-field="${fieldName}"]`

                const row = {
                    upgrades: new Field(fieldPath('upgrades'), 0),
                    level: new Field(fieldPath('level'), index == 0 ? 1 : 0, Field.createRange(index == 0 ? 1 : 0, 25000)),
                    level_next: new Field(fieldPath('level_next'), ''),
                    cycle_duration: new Field(fieldPath('cycle_duration'), ''),
                    cycle_money: new Field(fieldPath('cycle_money'), ''),
                    money_share: new Field(fieldPath('money_share'), ''),
                    upgrade_money: new Field(fieldPath('upgrade_money'), ''),
                    upgrade_estimation: new Field(fieldPath('upgrade_estimation'), '')
                }

                row.upgrades.$object.dropdown({
                    values: [0, 1, 2, 3, 4].map(value => ({ value, name: intl(`idle.upgrades.${value}`) }))
                }).dropdown('set selected', '0');

                return row;
            });

            this.data = {
                runes: new Field('#runes', 0, Field.isNumber),
                runes_formatted: new Field('#runes_formatted', ''),
                money_spent: new Field('#money_spent', ''),
                money_1h: new Field('#money_1h', ''),
                money_8h: new Field('#money_8h', ''),
                money_1d: new Field('#money_1d', ''),
                money_7d: new Field('#money_7d', '') 
            };

            this.data.runes.setListener(() => this.generate());
            
            for (const { level, upgrades } of this.buildings) {
                level.setListener(() => this.generate());
                upgrades.setListener(() => this.generate());
            }
        }

        valid () {
            if (!this.data.runes.valid()) {
                return false;
            }

            for (const { level } of this.buildings) {
                if (!level.valid()) {
                    return false;
                }
            }

            return true;
        }

        clear () {
            this.ignoreGenerate = true;

            this.data.runes.clear();

            for (let i = 0; i < BUILDINGS.length; i++) {
                this.buildings[i].level.clear();
            }

            this.ignoreGenerate = false;
            this.generate();
        }

        load ({ Idle: { Runes: runes, Buildings: buildings, Upgrades: { Money: money, Speed: speed } } }) {
            this.ignoreGenerate = true;

            this.data.runes.value = runes;

            for (let i = 0; i < BUILDINGS.length; i++) {
                const upgrade = money[i] == 3 ? 4 : (money[i] == 1 && speed[i] == 1 ? 3 : (money[i] == 1 ? 2 : (speed[i] == 1 ? 1 : 0)));

                this.buildings[i].upgrades.value = upgrade;
                this.buildings[i].level.value = buildings ? buildings[i] : this.buildings[i].level.defaultValue;
            }

            this.ignoreGenerate = false;
            this.generate();
        }

        generate () {
            if (this.ignoreGenerate) {
                // Skip some calculations when loading values
                return;
            }

            if (this.valid()) {
                const runeMultiplier = Math.trunc(1 + this.data.runes.value * 0.05);
                this.data.runes_formatted.value = formatNumber(this.data.runes.value);

                let moneySpent = 0;
                let productionApproximate = 0;
                let productionHourlyApproximate = 0;
                let productionCurve = new Array(86401).fill(0);
                
                let amortizationIndex = 0;
                let amortizationValue = 0;
                
                Object.values(Building).forEach((building, index) => {
                    const entry = this.buildings[index];
                    const level = entry.level.value;
                    const boost = upgradeToModifiers(entry.upgrades.value);

                    moneySpent += building.getUpgradePrice(index == 0 ? 1 : 0, level);

                    // Calculate production
                    productionApproximate += runeMultiplier * boost.rate * building.getProductionRate(level);
                    productionHourlyApproximate += runeMultiplier * boost.rate * building.getProductionRate(level) * 3600;
                    
                    for (let i = 0; i < 86401; i++) {
                        productionCurve[i] += runeMultiplier * boost.money * building.getProductionReduced(level, i, boost.duration);
                    }

                    // Calculate amortization
                    let amortization = building.getAmortisation(level, (modeUpgrade > 0 && modeUpgrade < 5) ? Multipliers[modeUpgrade - 1] : 1) / boost.rate;
                    let amortizationBreakpoint = building.getBreakpointAmortisation(level) / boost.rate;

                    if (modeSuggest == 1) {
                        if (index == 0 || (modeUpgrade < 5 && amortization < amortizationValue)) {
                            amortizationIndex = index;
                            amortizationValue = amortization;
                        }
                    } else if (modeSuggest == 2) {
                        if (index == 0 || amortizationBreakpoint < amortizationValue) {
                            amortizationIndex = index;
                            amortizationValue = amortizationBreakpoint;
                        }
                    } else {
                        if (index == 0 || (modeUpgrade < 5 && amortization < amortizationValue) || amortizationBreakpoint < amortizationValue) {
                            amortizationIndex = index;
                            amortizationValue = modeUpgrade < 5 ? Math.min(amortization, amortizationBreakpoint) : amortizationBreakpoint;
                        }
                    }
                });

                // Total spent
                this.data.money_spent.value = formatNumber(moneySpent);

                // Production per time period
                this.data.money_1h.value = formatNumber(productionCurve[3600]);
                this.data.money_8h.value = formatNumber(productionCurve[28800]);
                this.data.money_1d.value = formatNumber(productionCurve[86400]);
                this.data.money_7d.value = formatNumber(168 * productionHourlyApproximate);

                Object.values(Building).forEach((building, index) => {
                    const entry = this.buildings[index];
                    const level = entry.level.value;
                    const boost = upgradeToModifiers(entry.upgrades.value);

                    // Target level
                    let target = 0;
                    if (modeUpgrade == 5) {
                        target = Math.min(25000, Building.getBreakpointLevel(Building.getNearestBreakpoint(level) + 1));
                    } else if (modeUpgrade > 0) {
                        target = Math.min(25000, level + Multipliers[modeUpgrade - 1]);
                    }

                    // Set fields
                    entry.level_next.value = target || level;
                    entry.cycle_duration.value = getFormattedDuration(boost.duration * building.getCycleDuration(target || level));

                    if (target) {
                        entry.money_share.value = `+${(100 * (building.getProductionRate(target) - building.getProductionRate(level)) * boost.rate * runeMultiplier / productionApproximate).toFixed(1)}%`;
                        entry.cycle_money.value = `+${formatNumber(Math.trunc((building.getCycleProduction(target) - building.getCycleProduction(level)) * boost.money * runeMultiplier ))}`;
                    } else {
                        entry.money_share.value = `${(100 * building.getProductionRate(level) * boost.rate * runeMultiplier / productionApproximate).toFixed(1)}%`;
                        entry.cycle_money.value = formatNumber(building.getCycleProduction(level) * boost.money * runeMultiplier);
                    }

                    // Set cost fields
                    if (level < 25000) {
                        const upgradeCost = building.getUpgradePrice(level, target ? (target - level) : 1);
                        entry.upgrade_money.value = formatNumber(upgradeCost);
    
                        const estimationPrecise = productionCurve.findIndex((v) => v >= upgradeCost);
                        const estimationApproximate = upgradeCost / productionApproximate;

                        if (estimationPrecise != -1) {
                            entry.upgrade_estimation.value = getFormattedDuration(estimationPrecise);
                        } else if (estimationApproximate < 604800) {
                            entry.upgrade_estimation.value = getFormattedDuration(estimationApproximate);
                        } else {
                            entry.upgrade_estimation.value = '> 7D';
                        }
                    } else {
                        entry.upgrade_money.value = '';
                        entry.upgrade_estimation.value = '';
                    }

                    // Set name color based on amortization index
                    const $title = entry.level.$object.closest('tr').find('td').first();
                    if (amortizationIndex === index) {
                        $title.addClass('text-green');
                    } else {
                        $title.removeClass('text-green');
                    }
                });

                // Add colors based on upgrade mode
                if (modeUpgrade == 0) {
                    $('[data-field]:not([data-field="level"], [data-field="upgrades"])').removeClass('!text-green');
                } else {
                    $('[data-field]:not([data-field="level"], [data-field="upgrades"])').addClass('!text-green');
                }
            }
        }
    })();

    function getFormattedDuration (seconds) {
        seconds = Math.trunc(seconds);

        const s = (seconds % 60);
        const m = ((seconds - seconds % 60) / 60) % 60;
        const h = ((seconds - seconds % 3600) / 3600) % 24;
        const d = (seconds - seconds % 86400) / 86400;

        if (d) {
            return `${d}D ${h}H ${m}M ${s}S`;
        } else if (h) {
            return `${h}H ${m}M ${s}S`;
        } else if (m) {
            return `${m}M ${s}S`;
        } else {
            return `${s}S`;
        }
    }

    function formatNumber (value) {
        if (modeNumber == 0 || value < 1E6) {
            return formatAsNamedNumber(Math.trunc(value));
        } else {
            return value.toExponential(3).toString().replace('+', '');
        }
    }

    function upgradeToModifiers (upgradeIndex) {
        return {
            rate: Math.pow(2, upgradeIndex - (upgradeIndex > 1 ? 1 : 0)),
            duration: (upgradeIndex == 1 || upgradeIndex > 2) ? 0.5 : 1,
            money: upgradeIndex === 4 ? 4 : (upgradeIndex > 1 ? 2 : 1)
        }
    }

    EditorController.clear();

    StatisticsIntegration.configure({
        profile: SELF_PROFILE,
        type: 'players',
        scope: (dm) => dm.getLatestPlayers(true).filter((player) => player.Level >= 105 && player.Idle),
        callback: (player) => {
            EditorController.load(player);
        }
    });
});