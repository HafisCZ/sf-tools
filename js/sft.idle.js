const __cache = {};

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
    return Math.trunc(Math.pow(money, 0.2548));
}

function getAmortisation (level, initialIncrement, initialDuration, initialCost) {
    return getUpgradePrice(level - 1, initialCost) / (getCycleIncrement(level, initialIncrement) / getCycleDuration(level, initialDuration));
}

function getBreakpointAmortisation (level, initialIncrement, initialDuration, initialCost) {
    let nb = getBreakpointLevel(getNearestBreakpoint(level) + 1);
    return getUpgradeBulkPrice(level, initialCost, nb - level) / ((getCycleProduction(nb, initialIncrement) - getCycleProduction(level, initialIncrement)) / getCycleDuration(nb, initialDuration));
}

class Building {
    constructor (initialDuration, initialIncrement, initialCost, initialLevel) {
        this.initialDuration = initialDuration;
        this.initialIncrement = initialIncrement;
        this.initialCost = initialCost;
        this.initialLevel = initialLevel;
    }

    getBaseLevel () {
        return this.initialLevel;
    }

    getUpgradePrice (level) {
        return getUpgradePrice(level, this.initialCost);
    }

    getUpgradeBulkPrice (level, bulk) {
        return getUpgradeBulkPrice(level, this.initialCost, bulk);
    }

    getUpgradeCountFromMoney (level, money) {
        return getUpgradeCountFromMoney(level, this.initialCost, money);
    }

    getCycleDuration (level) {
        return getCycleDuration(level, this.initialDuration);
    }

    getCycleProduction (level) {
        return getCycleProduction(level, this.initialIncrement);
    }

    getCycleIncrement (level) {
        return getCycleIncrement(level, this.initialIncrement);
    }

    getAmortisation (level) {
        return getAmortisation(level, this.initialIncrement, this.initialDuration, this.initialCost);
    }

    getBreakpointAmortisation (level) {
        return getBreakpointAmortisation(level, this.initialIncrement, this.initialDuration, this.initialCost);
    }
}

Building.Seat = new Building(72, 1, 5, 1);
Building.PopcornStand = new Building(360, 10, 100, 0);
Building.ParkingLot = new Building(720, 40, 2500, 0);
Building.Trap = new Building(1080, 120, 50000, 0);
Building.Drinks = new Building(1440, 320, 1000000, 0);
Building.DeadlyTrap = new Building(2160, 960, 25000000, 0);
Building.VIPSeat = new Building(2880, 2560, 500000000, 0);
Building.Snacks = new Building(4320, 7680, 10000000000, 0);
Building.StrayingMonsters = new Building(8640, 30720, 250000000000, 0);
Building.Toilet = new Building(21600, 153600, 5000000000000, 0);

class SimulatedBuilding {
    constructor (building, speedMultiplier, moneyMultiplier) {
        this.building = building;
        this.speedMultiplier = speedMultiplier;
        this.moneyMultiplier = moneyMultiplier;
        this.cycle = 0;

        this.setLevel(building.getBaseLevel());
    }

    setLevel (level) {
        this.level = level;
        this.duration = this.building.getCycleDuration(level) * this.speedMultiplier;
        this.production = this.building.getCycleProduction(level) *  this.moneyMultiplier;
        this.cost = this.building.getUpgradePrice(level);
    }

    tick () {
        if (this.cycle-- > 0) {
            return 0;
        } else {
            this.cycle = this.duration;
            return this.production;
        }
    }

    getProductionRate (level) {
        if (level) {
            return (this.building.getCycleProduction(this.level + level) * this.moneyMultiplier) / (this.building.getCycleDuration(this.level + level) * this.speedMultiplier);
        } else {
            return this.production / this.duration;
        }
    }
}

class Simulation {
    constructor (runes, boosts, levels) {
        this.runes = runes;
        this.boosts = boosts;
        this.seconds = 0;
        this.totalpi = 0;
        this.sacrifices = 0;

        this.start();
        if (levels) {
            this.buildings.forEach(function (b, i) {
                b.setLevel(Math.max(b.building.getBaseLevel(), levels[i]));
            });
        }
    }

    start () {
        this.ticks = 0;
        this.total = 0;
        this.money = 0;
        this.buildings = Object.values(Building).map((b, i) => new SimulatedBuilding(b, this.boosts[i] ? 0.5 : 1, (1 + this.runes * 0.05) * (this.boosts[i + 10] ? 2 : 1)));
    }

    sacrifice () {
        this.runes += getRunesFromMoney(this.total);
        this.sacrifices++;
        this.start();
    }

    getProductionRate () {
        return this.buildings.reduce(function (s, b) {
            return s + b.getProductionRate();
        }, 0);
    }

    tick () {
        this.ticks++;
        this.seconds++;

        this.buildings.forEach((b) => {
            if (b.level) {
                let i = b.tick();

                this.total += i;
                this.money += i;
                this.totalpi += i;
            }
        });
    }

    tryUpgrade (b, count) {
        if (count) {
            let cost = b.building.getUpgradeBulkPrice(b.level, count);
            if (this.money >= cost) {
                this.money -= cost;

                b.setLevel(b.level + count);

                return true;
            } else {
                return false;
            }
        } else {
            if (this.money >= b.cost) {
                this.money -= b.cost;

                b.setLevel(b.level + 1);

                return true;
            } else {
                return false;
            }
        }
    }
}

class SimulationRule {
    constructor (apply, bulk) {
        this.apply = apply;
        this.bulk = () => bulk;
    }
}

SimulationRule.None = function () {
    return false;
}

SimulationRule.Buy = new Object();
SimulationRule.Sacrifice = new Object();
SimulationRule.Exit = new Object();

SimulationRule.Buy.BuyNone = function (s) {
    return false;
}

SimulationRule.Buy.First = function (s) {
    for (const b of s.buildings) {
        if (s.tryUpgrade(b)) {
            return true;
        }
    }

    return false;
}

SimulationRule.Buy.Cheapest = function (s) {
    let i = null;
    let c = Number.POSITIVE_INFINITY;

    for (const b of s.buildings) {
        if (b.cost < c) {
            i = b;
            c = b.cost;
        }
    }

    return s.tryUpgrade(i);
}

SimulationRule.Buy.BestRate = function (s) {
    let i = null;
    let k = 0;

    for (const b of s.buildings) {
        if (b.cost <= s.money) {
            let c = b.getProductionRate(1) / b.cost;
            if (c > k) {
                k = c;
                i = b;
            }
        }
    }

    return i ? s.tryUpgrade(i) : false;
}

SimulationRule.Buy.Amortisation = function (s) {
    let i = null;
    let k = Number.POSITIVE_INFINITY;

    for (const b of s.buildings) {
        let c = b.building.getAmortisation(b.level + 1);
        if (c < k) {
            k = c;
            i = b;
        }
    }

    return i ? s.tryUpgrade(i) : false;
}

SimulationRule.Buy.BreakpointAmortisation = function (s) {
    let i = null;
    let k = Number.POSITIVE_INFINITY;

    for (const b of s.buildings) {
        let c = b.building.getBreakpointAmortisation(b.level);
        if (c < k) {
            k = c;
            i = b;
        } else {
            c = b.building.getAmortisation(b.level + 1);
            if (c < k) {
                k = c;
                i = b;
            }
        }
    }

    return i ? s.tryUpgrade(i) : false;
}

SimulationRule.Sacrifice.None = function () { }

SimulationRule.Sacrifice.Match = function (s) {
    if (getRunesFromMoney(s.total) > Math.max(100, s.runes)) {
        s.sacrifice();
    }

    return false;
}

SimulationRule.Sacrifice.MatchDouble = function (s) {
    if (getRunesFromMoney(s.total) > Math.max(100, s.runes * 2)) {
        s.sacrifice();
    }

    return false;
}

SimulationRule.Exit.Infinity = function (s) { return false; }

SimulationRule.Exit.DurationExceeded = function (s, duration) {
    return s.seconds >= duration * 60;
}

SimulationRule.Exit.TotalMoneyExceeded = function (s, money) {
    return s.totalpi >= money;
}

SimulationRule.Exit.TotalRunesExceeded = function (s, runes) {
    return (s.runes + getRunesFromMoney(s.totalpi)) >= runes;
}

SimulationRule.Exit.ProductionExceeded = function (s, money) {
    return s.getProductionRate() * 3600 >= money;
}

SimulationRule.Exit.AvailableMoneyExceeded = function (s, money) {
    return s.money >= money;
}

SimulationRule.Exit.AvailableRunesExceeded = function (s, runes) {
    return getRunesFromMoney(s.totalpi) >= runes;
}

SimulationRule.Exit.BuildingLevelExceeded = function (s, level) {
    return s.buildings.filter(b => b.level >= level).length;
}

function runSimulation () {
    let runes = Number($('#asr').val());
    let boost = $('[data-group="idlegame"] .uk-checkbox').toArray().map(c => c.checked);
    let level = Array(10).fill().map((y, i) => Number($(`#as${i}i`).val()));
    let exit = Number($('#asd').val());

    window.simulation = {
        instance: new Simulation(runes, boost, level.reduce((s, l) => s + l, 0) ? level : null),
        buy: Object.values(SimulationRule.Buy)[Number($('#asu').val())],
        sacrifice: Object.values(SimulationRule.Sacrifice)[Number($('#asv').val())],
        exit: Object.values(SimulationRule.Exit)[Number($('#asg').val())],
        exitParam: exit,
        start: Date.now()
    };

    window.simspeed = (window.simulation.buy == SimulationRule.Buy.Amortisation || window.simulation.buy == SimulationRule.Buy.BreakpointAmortisation) ? 360 : 86400;

    window.simulationRunning = true;
    window.simulationLoop = setInterval(function () {
        for (let i = 0; i < window.simspeed; i++) {
            if (window.simulation.exit(window.simulation.instance, window.simulation.exitParam)) {
                window.simulationFinished = true;
                clearInterval(window.simulationLoop);

                UIkit.notification({
                    message: `Simulation finished. Took ${Math.trunc((Date.now() - window.simulation.start) / 1000)} seconds.`,
                    status: 'secondary',
                    pos: 'top-right',
                    timeout: 1000
                });

                break;
            } else {
                window.simulation.instance.tick();
                while (window.simulation.buy(window.simulation.instance));
                window.simulation.sacrifice(window.simulation.instance);
            }
        }
    }, 1);

    window.simulationDraw = setInterval(function () {
        $('#ast').val(Math.format(Math.trunc(window.simulation.instance.total)));
        $('#asc').val(Math.format(Math.trunc(window.simulation.instance.money)));
        $('#asa').val(Math.format(getRunesFromMoney(window.simulation.instance.total)));
        $('#ash').val(Math.format(Math.trunc(window.simulation.instance.getProductionRate() * 3600)));
        $('#asl').val(Date.toNiceString(window.simulation.instance.seconds));
        $('#asf').val(Math.format(window.simulation.instance.runes));
        $('#aso').val(Math.format(window.simulation.instance.totalpi));
        $('#ase').val(Date.toNiceString(window.simulation.instance.ticks));
        $('#asz').val(window.simulation.instance.sacrifices);

        for (let i = 0, b; b = window.simulation.instance.buildings[i]; i++) {
            $(`#as${i}`).val(b.level);
            $(`#as${i}t`).val(Date.toNiceString(Math.trunc(b.duration)));
            $(`#as${i}m`).val(Math.format(Math.trunc(b.production)));
            $(`#as${i}c`).val(Math.format(Math.trunc(b.cost)));
            $(`#as${i}p`).val(`${Math.trunc(100 * b.getProductionRate() / window.simulation.instance.getProductionRate())}%`);
        }

        let hourly = Math.trunc(window.simulation.instance.getProductionRate() * 3600);
        $('#ash').val(Math.format(hourly));

        if (window.simulationFinished) {
            UIkit.tooltip($('#ash')[0], {
                title: `1D: ${Math.format(hourly * 24)}<br>3D: ${Math.format(hourly * 24 * 3)}<br>7D: ${Math.format(hourly * 24 * 7)}`
            });

            window.simulationRunning = false;
            window.simulationFinished = false;
            clearInterval(window.simulationDraw);
        }
    }, 50);
}

function resetSimulation () {
    $('[data-group="idlegame"] input:not([data-noreset])').val('');

    clearInterval(window.simulationLoop);
    clearInterval(window.simulationDraw);

    window.simulationRunning = false;
    window.simulation = null;
    window.simulationFinished = false;

    showPreview();
}

function clearSimulation () {
    $('[data-group="idlegame"] input').val('');
    $('[data-group="idlegame"] .uk-checkbox').prop('checked', false);
    $('[data-group="idlegame"] select').val(0);

    clearInterval(window.simulationLoop);
    clearInterval(window.simulationDraw);

    window.simulationRunning = false;
    window.simulation = null;
    window.simulationFinished = false;

    showPreview();
}

function showPreview () {
    clearInterval(window.simulationLoop);
    clearInterval(window.simulationDraw);

    $('[data-group="idlegame"] input:not([data-noreset])').val('');

    window.simulationRunning = false;
    window.simulation = null;
    window.simulationFinished = false;

    let runes = Number($('#asr').val());
    let boost = $('[data-group="idlegame"] .uk-checkbox').toArray().map(c => c.checked);
    let level = Array(10).fill().map((y, i) => Number($(`#as${i}i`).val()));
    let exit = Number($('#asd').val());

    window.simulation = {
        instance: new Simulation(runes, boost, level.reduce((s, l) => s + l, 0) ? level : null),
        buy: Object.values(SimulationRule.Buy)[Number($('#asu').val())],
        sacrifice: Object.values(SimulationRule.Sacrifice)[Number($('#asv').val())],
        exit: Object.values(SimulationRule.Exit)[Number($('#asg').val())],
        exitParam: exit,
        start: Date.now()
    };

    for (let i = 0, b; b = window.simulation.instance.buildings[i]; i++) {
        $(`#as${i}`).val(b.level);
        $(`#as${i}t`).val(Date.toNiceString(Math.trunc(b.duration)));
        $(`#as${i}m`).val(Math.format(Math.trunc(b.production)));
        $(`#as${i}c`).val(Math.format(Math.trunc(b.cost)));
        $(`#as${i}p`).val(`${Math.trunc(100 * b.getProductionRate() / window.simulation.instance.getProductionRate())}%`);
    }

    let hourly = Math.trunc(window.simulation.instance.getProductionRate() * 3600);

    $('#ash').val(Math.format(hourly));
    UIkit.tooltip($('#ash')[0], {
        title: `1D: ${Math.format(hourly * 24)}<br>3D: ${Math.format(hourly * 24 * 3)}<br>7D: ${Math.format(hourly * 24 * 7)}`
    });
}

function showUpgradePreview (count) {
    let runes = Number($('#asr').val());
    let boosts = $('[data-group="idlegame"] .uk-checkbox').toArray().map(c => c.checked);
    let la = Array(10).fill().map((y, i) => Number($(`#as${i}i`).val() || (i ? 0 : 1)));
    let lb = Array(10).fill().map((y, i) => la[i] + count);

    let aa = Object.values(Building).map((b, i) => new SimulatedBuilding(b, boosts[i] ? 0.5 : 1, (1 + runes * 0.05) * (boosts[i + 10] ? 2 : 1)));
    let bb = Object.values(Building).map((b, i) => new SimulatedBuilding(b, boosts[i] ? 0.5 : 1, (1 + runes * 0.05) * (boosts[i + 10] ? 2 : 1)));
    aa.forEach((b, i) => b.setLevel(la[i]));
    bb.forEach((b, i) => b.setLevel(lb[i]));

    let pp = aa.reduce((s, b) => s + b.getProductionRate(), 0);

    for (let i = 0, a, b; a = aa[i], b = bb[i]; i++) {
        let ps = aa.reduce((s, x, index) => s + (index != i ? x.getProductionRate() : 0), 0) + b.getProductionRate();

        $(`#as${i}, #as${i}t, #as${i}m, #as${i}c, #as${i}p`).css('color', '#00c851');
        $(`#as${i}`).val(b.level);
        $(`#as${i}t`).val(Date.toNiceString(Math.trunc(b.duration)));
        $(`#as${i}m`).val(`+${Math.format(b.production - a.production)}`);
        $(`#as${i}c`).val(Math.format(getUpgradeBulkPrice(a.level, a.building.initialCost, count)));
        $(`#as${i}p`).val(`+${Math.trunc(10000 * b.getProductionRate() * (1 / pp - 1 / ps)) / 100}%`);
    }

    $('#ash, #ast, #asc, #asa, #asl, #asf, #aso, #ase, #asz').val('');
}

$(function () {
    $('[data-idle-preview]').on('mouseenter', function () {
        if (!window.simulationRunning) {
            showUpgradePreview(Number($(this).attr('data-idle-preview')));
        }
    }).on('mouseleave', function () {
        if (!window.simulationRunning) {
            for (let i = 0; i < 10; i++) {
                $(`#as${i}, #as${i}t, #as${i}m, #as${i}c, #as${i}p`).removeAttr('style');
            }
            showPreview();
        }
    });

    $(`#as0i, #as1i, #as2i, #as3i, #as4i, #as5i, #as6i, #as7i, #as8i, #as9i, #asr, [data-group="idlegame"] .uk-checkbox`).on('change input', function () {
        if (!window.simulationRunning) {
            showPreview();
        }
    });
});
