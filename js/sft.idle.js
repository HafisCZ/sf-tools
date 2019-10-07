function getNearestBreakpoint (level) {
    if (level > 100) {
        return 3 + getNearestBreakpoint(level / 10);
    } else if (level < 25) {
        return 0;
    } else if (level < 50) {
        return 1;
    } else if (level < 100) {
        return 2;
    } else {
        return 3;
    }
}

function getBreakpointLevel (breakpoint) {
    if (breakpoint > 3) {
        return 10 * getBreakpointLevel(breakpoint - 3);
    } else if (breakpoint == 3) {
        return 100;
    } else if (breakpoint == 2) {
        return 50;
    } else if (breakpoint == 1) {
        return 25;
    } else {
        return 0;
    }
}

const __cache = {};
function getUpgradePrice (requestedLevel, initialCost) {
    if (requestedLevel > 0) {
        if (!__cache[initialCost] || !__cache[initialCost][requestedLevel]) {
            if (!__cache[initialCost]) {
                __cache[initialCost] = {};
            }
            __cache[initialCost][requestedLevel] = Math.ceil(1.03 * getUpgradePrice(requestedLevel - 1, initialCost));
        }
        return __cache[initialCost][requestedLevel];
    } else {
        return initialCost;
    }
}

function getUpgradeBulkPrice (level, initialCost, bulkAmount) {
    let sum = 0;
    for (let i = 0; i < bulkAmount; i++) {
        sum += getUpgradePrice(level + i, initialCost);
    }
    return sum;
}

function getUpgradeCountFromMoney (level, initialCost, money) {
    let levels = 0;
    while (getUpgradePrice(level + levels, initialCost) <= money) {
        money -= getUpgradePrice(level + levels++, initialCost);
    }
    return levels;
}

function getCycleDuration (level, initialDuration) {
    return initialDuration * Math.pow(0.8, getNearestBreakpoint(level));
}

function getCycleProduction (level, initialIncrement) {
    return Math.round(initialIncrement * level * Math.pow(2, getNearestBreakpoint(level)));
}

function getCycleIncrement (level, initialIncrement) {
    return initialIncrement * Math.pow(2, getNearestBreakpoint(level));
}

function getRunesFromMoney (money) {
    return 0;
}

class BuildingBase {
    constructor (label, initialDuration, initialIncrement, initialCost, initialLevel) {
        this.label = label;
        this.initialDuration = initialDuration;
        this.initialIncrement = initialIncrement;
        this.initialCost = initialCost;
        this.initialLevel = initialLevel;
    }

    getInitialLevel () {
        return this.initialLevel;
    }

    getCycleDuration (level) {
        return getCycleDuration(level, this.initialDuration);
    }

    getCycleProduction (level) {
        return getCycleProduction(level, this.initialIncrement);
    }

    getUpgradePrice (level) {
        return getUpgradePrice(level, this.initialCost);
    }

    getAmortisation (level) {
        return getUpgradePrice(level - 1, this.initialCost) / (getCycleIncrement(level, this.initialIncrement) / getCycleDuration(level, this.initialDuration))
    }
}

const Buildings = [
    new BuildingBase('seat', 72, 1, 5, 1),
    new BuildingBase('popcorn_stand', 360, 10, 100, 0),
    new BuildingBase('parking_lot', 720, 40, 2500, 0),
    new BuildingBase('trap', 1080, 120, 50000, 0),
    new BuildingBase('drinks', 1440, 320, 1000000, 0),
    new BuildingBase('deadly_trap', 2160, 960, 25000000, 0),
    new BuildingBase('vip_seat', 2880, 2560, 500000000, 0),
    new BuildingBase('snacks', 4320, 7680, 10000000000, 0),
    new BuildingBase('straying_monsters', 8640, 30720, 250000000000, 0),
    new BuildingBase('toilet', 21600, 153600, 5000000000000, 0)
];

class IdleBuilding {
    constructor (buildingBase, cycleDurationMultiplier, cycleProductionMultiplier) {
        this.buildingBase = buildingBase;
        this.cycleDurationMultiplier = cycleDurationMultiplier;
        this.cycleProductionMultiplier = cycleProductionMultiplier;
        this.cycleDurationRemaining = 0;

        this.setLevel(buildingBase.getInitialLevel());
    }

    setLevel (level) {
        this.level = level;
        this.cycleDuration = this.buildingBase.getCycleDuration(level) / this.cycleDurationMultiplier;
        this.cycleProduction = this.buildingBase.getCycleProduction(level) * this.cycleProductionMultiplier;
        this.upgradePrice = this.buildingBase.getUpgradePrice(level);
    }

    tryUpgrade (money) {
        if (money >= this.upgradePrice) {
            money -= this.upgradePrice;

            this.setLevel(this.level + 1);
            return money;
        }
    }

    tryUpdateCycle () {
        if (this.cycleDurationRemaining > 0) {
            this.cycleDurationRemaining--;
            return 0;
        } else {
            this.cycleDurationRemaining = this.cycleDuration;
            return this.cycleProduction;
        }
    }

    getProductionPerSecond () {
        return this.cycleProduction / this.cycleDuration;
    }

    getFutureProductionPerSecond (levels = 1) {
        return (this.buildingBase.getCycleProduction(this.level + levels) * this.cycleProductionMultiplier) / (this.buildingBase.getCycleDuration(this.level + levels) / this.cycleDurationMultiplier);
    }

    getLevel () {
        return this.level;
    }

    getCycleProduction () {
        return this.cycleProduction;
    }

    getCycleDuration () {
        return this.cycleDuration;
    }

    getCycleDurationRemaining () {
        return this.getCycleDurationRemaining;
    }

    getUpgradePrice () {
        return this.upgradePrice;
    }
}

class IdleGame {
    constructor (options) {
        this.gameRules = options.rules;
        this.buildingUpgrades = options.upgrades;
        this.totalRunes = options.runes;
        this.totalSeconds = 0;

        this.init();
        if (options.buildings) {
            this.buildings.forEach((building, index) => {
                building.setLevel(options.buildings[index]);
            });
        }
    }

    init () {
        this.currentSeconds = 0;
        this.totalProduction = 0;
        this.spendableProduction = 0;
        this.buildings = Buildings.map((building, index) => {
            return new IdleBuilding(building, 1 + ((this.buildingUpgrades >> (index + 10)) % 2), (1 + ((this.buildingUpgrades >> index) % 2)) * (1 + this.totalRunes * 0.05));
        });
    }

    sacrifice () {
        this.totalRunes += getRunesFromMoney(this.totalProduction);
        this.init();
    }

    getProductionPerSecond () {
        return this.buildings.reduce((sum, b) => sum + b.getProductionPerSecond(), 0);
    }

    tick () {
        this.totalSeconds++;
        this.currentSeconds++;

        for (const building of this.buildings) {
            if (building.getLevel()) {
                let income = building.tryUpdateCycle();

                this.spendableProduction += income;
                this.totalProduction += income;
            }
        }

        for (const rule of this.gameRules) {
            while (rule.apply(this) && rule.bulk());
        }
    }

    tryUpgradeBuilding (b) {
        let status = b.tryUpgrade(this.spendableProduction);
        if (status) {
            this.spendableProduction = status;
            return true;
        } else {
            return false;
        }
    }

    getRunesFromMoney () {
        return getRunesFromMoney(this.totalProduction);
    }

    setMoney (money) {
        this.spendableProduction = money;
    }

    getMoney () {
        return this.spendableProduction;
    }

    getTotalMoney () {
        return this.totalProduction;
    }

    getDuration () {
        return this.currentSeconds;
    }

    getTotalDuration () {
        return this.totalSeconds;
    }

    getBuildings () {
        return this.buildings;
    }
}

class IdleGameRule {
    constructor (applyFunction, isBulk) {
        this.apply = applyFunction;
        this.bulk = () => isBulk;
    }
}

const RuleBehaviour = {
    BuyNone: function (g) {
        return false
    },
    BuyFirstPossible: function (g) {
        for (const b of g.getBuildings()) {
            let m = b.tryUpgrade(g.getMoney());
            if (m) {
                g.setMoney(m);
                return true;
            }
        }
        return false;
    },
    BuyLowestPrice: function (g) {
        let item = null;
        let cost = Number.POSITIVE_INFINITY;

        for (const building of g.getBuildings()) {
            if (building.getUpgradePrice() < cost) {
                item = building;
                cost = building.getUpgradePrice();
            }
        }

        return g.tryUpgradeBuilding(item);
    },
    BuySimpleBestRate: function (g) {
        let s = null;
        let k = 0;
        for (const b of g.getBuildings()) {
            let c = b.getFutureProductionPerSecond() / b.getUpgradePrice();
            if (c > k && b.getUpgradePrice() <= g.getMoney()) {
                k = c;
                s = b;
            }
        }
        if (s) {
            g.setMoney(s.tryUpgrade(g.getMoney()));
            return true;
        } else {
            return false;
        }
    },
    BuyAmortisation: function (g) {
        let s = null;
        let k = 1E99;
        for (const b of g.getBuildings()) {
            let c = b.buildingBase.getAmortisation(b.getLevel() + 1);
            if (c < k) {
                k = c;
                s = b;
            }
        }
        if (s && s.getUpgradePrice() <= g.getMoney()) {
            g.setMoney(s.tryUpgrade(g.getMoney()));
            return true;
        } else {
            return false;
        }
    },
    /*
        Not working correcly
    */
    BuyForceBestRate: function (g) {
        let s = null;
        let k = 0;
        for (const b of g.getBuildings()) {
            let c = b.getFutureProductionPerSecond() / b.getUpgradePrice();
            if (c > k) {
                k = c;
                s = b;
            }
        }
        let m = s.tryUpgrade(g.getMoney());
        if (m) {
            g.setMoney(m);
            return true;
        } else {
            return false;
        }
    },
    /*
        WIP
    */
    BuyTargetBreakpoints: function (g) {

    }
};

function RunIdle () {
    let options = {
        upgrades: (Number($('#asb').val()) << 10) + Number($('#asp').val()),
        runes: Number($('#asr').val()),
        rules: [
            new IdleGameRule(
                Object.values(RuleBehaviour)[Number($('#asu').val())]
            , true)
        ]
    }

    let def = [];
    for (let i = 0; i < 10; i++) {
        def.push(Number($(`#as${i}i`).val()));
    }

    if (def.reduce((sum, a) => sum + a, 0)) {
        options.buildings = def;
    }

    window.exitcondition = [
        (g, v) => g.getTotalDuration() >= v * 60,
        (g, v) => g.getTotalMoney() >= v,
        (g, v) => g.getRunesFromMoney() >= v,
        (g, v) => g.getBuildings().reduce((sum, building) => sum + (building.getLevel() >= v ? 1 : 0), 0) > 0
    ][$('#asg').val()];

    window.exitTargetPercent = [
        (g, v) => 100 * g.getTotalDuration() / (v * 60),
        (g, v) => 100 * g.getTotalMoney() / v,
        (g, v) => 100 * g.getRunesFromMoney() / v,
        (g, v) => 100 * Math.max(... g.getBuildings().map((building) => building.getLevel())) / v
    ][$('#asg').val()];

    window.exitTarget = Number($('#asd').val());
    window.game = new IdleGame(options);

    window.startAt = Date.now();

    window.loop = setInterval(function () {
        for (let i = 0; i < 360; i++) {
            window.game.tick();
            if (window.exitcondition(window.game, window.exitTarget)) {
                window.stopanim = true;
                clearInterval(window.loop);

                UIkit.notification({
                    message: `Simulation finished. Took ${Math.trunc((Date.now() - window.startAt) / 1000)} seconds.`,
                    status: 'secondary',
                    pos: 'top-right',
                    timeout: 1000
                });

                break;
            }
        }
    }, 1);

    window.loop2 = setInterval(function() {
        ShowIdle();

        if (window.stopanim) {
            window.stopanim = false;

            clearInterval(window.loop2);

            $('#ass').html('START');
        }
    }, 100);
}

class IdleGameSimulator {
    constructor () {

    }

    showPreview () {

    }

    showUpgradePreview (upgradeCount) {

    }

    runSimulation (args) {

    }
}

$(function () {
    $('[data-idle-preview]').on('mouseenter', function () {
        let count = Number($(this).attr('data-idle-preview'));
        let level = $('input[id^="as"][id$="i"]').toArray().map(e => parseInt($(e).val() || 0));
        let runes = Number($('#asr').val() || 0);
        let mults = Number($('#asb').val() || 0);
        let multp = Number($('#asp').val() || 0);

        level[0] = level[0] || 1;

        showUpgradePreview(count, level, runes, mults, multp);
    });

    $('[data-idle-preview]').on('mouseleave', function () {
        for (let i = 0; i < 10; i++) {
            $(`#as${i}, #as${i}t, #as${i}m, #as${i}c, #as${i}p`).removeAttr('style');
            showPreview();
        }
    });

    $(`#as0i, #as1i, #as2i, #as3i, #as4i, #as5i, #as6i, #as7i, #as8i, #as9i`).on('change input', function () {
        showPreview();
    });
});

function showUpgradePreview (count, levels, runes, mults, multp) {
    let aa = Array(10);
    let bb = Array(10);
    for (let i = 0; i < 10; i++) {
        aa[i] = new IdleBuilding(Buildings[i], 1 + (mults >> i) % 2, (1 + (multp >> i) % 2) * (1 + runes * 0.05));
        bb[i] = new IdleBuilding(Buildings[i], 1 + (mults >> i) % 2, (1 + (multp >> i) % 2) * (1 + runes * 0.05));
        aa[i].setLevel(levels[i]);
        bb[i].setLevel(levels[i] + count);
    }

    let pp = aa.reduce((sum, b) => sum + b.getProductionPerSecond(), 0);

    for (let i = 0; i < 10; i++) {
        let a = aa[i];
        let b = bb[i];

        let ps = aa.reduce((sum, x, index) => sum + (index != i ? x.getProductionPerSecond() : 0), 0) + b.getProductionPerSecond();

        $(`#as${i}, #as${i}t, #as${i}m, #as${i}c, #as${i}p`).css('color', '#00c851');
        $(`#as${i}`).val(b.getLevel());
        $(`#as${i}t`).val(Date.toNiceString(Math.trunc(b.getCycleDuration())));
        $(`#as${i}m`).val(Math.format(b.getCycleProduction()));
        $(`#as${i}c`).val(Math.format(getUpgradeBulkPrice(a.getLevel(), a.buildingBase.initialCost, count)));
        $(`#as${i}p`).val(`+${Math.trunc(10000 * b.getProductionPerSecond() * (1 / pp - 1 / ps)) / 100}%`);
    }

    $('#ash').val('');
}

function showPreview () {
    if (!window.game) {
        window.game = new IdleGame({
                upgrades: (Number($('#asb').val()) << 10) + Number($('#asp').val()),
                runes: Number($('#asr').val()),
                rules: [new IdleGameRule(RuleBehaviour.BuyNone, true)]
        });
    }

    for (let i = 0; i < 10; i++) {
        window.game.buildings[i].setLevel(Number($(`#as${i}i`).val()) || (i == 0 ? 1 : 0));

        $(`#as${i}`).val(window.game.buildings[i].getLevel());
        $(`#as${i}t`).val(Date.toNiceString(Math.trunc(window.game.buildings[i].getCycleDuration())));
        $(`#as${i}m`).val(Math.format(Math.trunc(window.game.buildings[i].getCycleProduction())));
        $(`#as${i}c`).val(Math.format(Math.trunc(window.game.buildings[i].getUpgradePrice())));
        $(`#as${i}p`).val(`${Math.trunc(100 * window.game.buildings[i].getProductionPerSecond() / window.game.getProductionPerSecond())}%`);
    }

    $('#ash').val(Math.format(Math.trunc(window.game.getBuildings().reduce((sum, b) => sum + b.getCycleProduction() / b.getCycleDuration(), 0) * 3600)));
}

function ShowIdle() {
    for (let i = 0; i < 10; i++) {
        $(`#as${i}`).val(window.game.buildings[i].getLevel());
        $(`#as${i}t`).val(Date.toNiceString(Math.trunc(window.game.buildings[i].getCycleDuration())));
        $(`#as${i}m`).val(Math.format(Math.trunc(window.game.buildings[i].getCycleProduction())));
        $(`#as${i}c`).val(Math.format(Math.trunc(window.game.buildings[i].getUpgradePrice())));
        $(`#as${i}p`).val(`${Math.trunc(100 * window.game.buildings[i].getProductionPerSecond() / window.game.getProductionPerSecond())}%`);
    }

    $('#ass').html(`${Math.trunc(window.exitTargetPercent(window.game, window.exitTarget))}%`);
    $('#ast').val(Math.format(Math.trunc(window.game.getTotalMoney())));
    $('#asc').val(Math.format(Math.trunc(window.game.getMoney())));
    $('#asa').val(Math.format(window.game.getRunesFromMoney()));
    $('#ash').val(Math.format(Math.trunc(window.game.getBuildings().reduce((sum, b) => sum + b.getCycleProduction() / b.getCycleDuration(), 0) * 3600)));
    $('#asl').val(Date.toNiceString(window.game.getTotalDuration()));
}

function ResetIdle() {
    $('[data-group="idlegame"] input:not([data-noreset])').val('');

    clearInterval(window.loop);
    clearInterval(window.loop2);
}

function ClearIdle() {
    $('[data-group="idlegame"] input').val('');
    $('[data-group="idlegame"] select').val(0);

    clearInterval(window.loop);
    clearInterval(window.loop2);
}
