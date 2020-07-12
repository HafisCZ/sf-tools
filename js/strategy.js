const StrategySimulator = new (class {

    getExperienceRequired (level) {
        return level >= 393 ? 1500000000 : ExperienceRequired[level];
    }

    generateQuest (level, segmentsleft = 4) {
        var duration = 1 + Math.trunc(Math.random() * 4);

        var randomxp = Math.random();
        var randomgold = 1 - randomxp;

        if (Math.random() < 0.05) {
            randomxp *= 2;
            randomgold *= 2;
        }

        var xpmin = duration * 4 * this.getExperienceRequired(level) / (1.5 + 0.75 * (level - 1)) / 10 / Math.max(1, Math.exp(30090.33 / 5000000 * (level - 99)));
        var xpmax = xpmin * 5;

        var basegold = duration * 4 * getGoldCurve(level) * 12 / 11 / 1000;
        var goldmin = 1.5 * Math.min(10000000, 1 * basegold);
        var goldmax = 1.5 * Math.min(10000000, 5 * basegold);

        return {
            duration: duration > segmentsleft ? segmentsleft : duration,
            experience: Math.trunc(randomxp * (xpmax - xpmin) + xpmin),
            gold: Math.min(15000000, Math.trunc(100 * (randomgold) * (goldmax - goldmin) + goldmin) / 100)
        };
    }

    getGoldCoeff (level, quest) {
        return quest.gold / quest.duration;
    }

    getExperienceCoeff (level, quest) {
        return quest.experience / quest.duration;
    }

    getTimeCoeff (level, quest) {
        return 4 - quest.duration;
    }

    createTransitionCoeff (switchLevel) {
        return (level, quest) => level >= switchLevel ? this.getGoldCoeff : this.getExperienceCoeff;
    }

    runUntil (level, target, strategy) {
        var currentXP = 0;
        var totalXP = 0;
        var gold = 0;
        var thirstLeft = 0;
        var questCount = 0;
        var thirstTotal = 0;

        level = Math.min(599, Math.max(1, level));
        target = Math.min(600, Math.max(level + 1, target));

        var runThirst = () => {
            while (thirstLeft) {
                var quests = [
                    this.generateQuest(level, thirstLeft),
                    this.generateQuest(level, thirstLeft),
                    this.generateQuest(level, thirstLeft)
                ];

                var best = strategy(level, quests[0]);
                var bestIndex = 0;
                for (var i = 1; i < 3; i++) {
                    var coeff = strategy(level, quests[i]);
                    if (coeff > best) {
                        best = coeff;
                        bestIndex = i;
                    }
                }

                questCount++;
                thirstTotal += quests[bestIndex].duration;

                thirstLeft -= quests[bestIndex].duration;
                gold += quests[bestIndex].gold;

                totalXP += quests[bestIndex].experience;
                currentXP += quests[bestIndex].experience;

                var neededXP = this.getExperienceRequired(level);
                if (currentXP >= neededXP) {
                    level++;
                    currentXP -= neededXP;
                }
            }
        };

        while (level < target) {
            thirstLeft = 120;
            runThirst();
            thirstLeft = 8;
            runThirst();
        }

        return {
            experience: totalXP,
            gold: Math.trunc(gold),
            level: level,
            quests: questCount,
            thirst: thirstTotal
        }
    }

    run (level, thirst, strategy) {
        var experience = 0;
        var gold = 0;
        var levelxp = 0;

        while (thirst > 0) {
            var quests = [
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst)
            ];

            var best = strategy(level, quests[0]);
            var bestIndex = 0;

            for (var i = 1; i < 3; i++) {
                var coeff = strategy(level, quests[i]);
                if (coeff > best) {
                    best = coeff;
                    bestIndex = i;
                }
            }

            thirst -= quests[bestIndex].duration;

            gold += quests[bestIndex].gold;
            experience += quests[bestIndex].experience;
            levelxp += quests[bestIndex].experience;

            var xpneeded = this.getExperienceRequired(level);
            if (levelxp > xpneeded) {
                level = Math.min(600, level + 1);
                levelxp -= xpneeded;
            }
        }

        return {
            experience: experience,
            gold: Math.trunc(gold),
            level: level
        }
    }

})();
