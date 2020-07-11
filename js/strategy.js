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

        var xpmin = 4 * this.getExperienceRequired(level) / (1.5 + 0.75 * (level - 1)) / 10 / Math.max(1, Math.exp(30090.33 / 5000000 * (level - 99)));
        var xpmax = xpmin * 5;

        var basegold = getGoldCurve(level) * 12 / 1000;
        var goldmin = 1.5 * Math.min(10000000, 4 * basegold / 11);
        var goldmax = 1.5 * Math.min(10000000, 20 * basegold / 11);

        return {
            duration: duration > segmentsleft ? segmentsleft : duration,
            experience: Math.trunc(randomxp * (xpmax - xpmin) + xpmin),
            gold: Math.trunc(100 * (randomgold) * (goldmax - goldmin) + goldmin) / 100
        };
    }

    runGold (level, thirst) {
        var experience = 0;
        var gold = 0;
        var levelxp = 0;

        while (thirst > 0) {
            var quests = [
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst)
            ];

            var best = quests[0].gold / quests[0].duration;
            var bestIndex = 0;

            for (var i = 1; i < 3; i++) {
                var coeff = quests[i].gold / quests[i].duration;
                if (coeff > best) {
                    best = coeff;
                    bestIndex = i;
                }
            }

            thirst -= quests[bestIndex].duration;

            gold += quests[bestIndex].gold;
            experience += quests[bestIndex].experience;
            levelxp += quests[bestIndex].experience;

            var xpneeded =this.getExperienceRequired(level);
            if (levelxp > xpneeded) {
                level++;
                levelxp -= xpneeded;
            }
        }

        return {
            experience: experience,
            gold: gold
        }
    }

    runXP (level, thirst) {
        var experience = 0;
        var gold = 0;
        var levelxp = 0;

        while (thirst > 0) {
            var quests = [
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst)
            ];

            var best = quests[0].experience / quests[0].duration;
            var bestIndex = 0;

            for (var i = 1; i < 3; i++) {
                var coeff = quests[i].experience / quests[i].duration;
                if (coeff > best) {
                    best = coeff;
                    bestIndex = i;
                }
            }

            thirst -= quests[bestIndex].duration;

            gold += quests[bestIndex].gold;
            experience += quests[bestIndex].experience;
            levelxp += quests[bestIndex].experience;

            var xpneeded =this.getExperienceRequired(level);
            if (levelxp > xpneeded) {
                level++;
                levelxp -= xpneeded;
            }
        }

        return {
            experience: experience,
            gold: gold
        }
    }

    runTime (level, thirst) {
        var experience = 0;
        var gold = 0;
        var levelxp = 0;

        while (thirst > 0) {
            var quests = [
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst),
                this.generateQuest(level, thirst)
            ];

            var best = quests[0].duration;
            var bestIndex = 0;

            for (var i = 1; i < 3; i++) {
                var coeff = quests[i].duration;
                if (coeff < best) {
                    best = coeff;
                    bestIndex = i;
                }
            }

            thirst -= quests[bestIndex].duration;

            gold += quests[bestIndex].gold;
            experience += quests[bestIndex].experience;
            levelxp += quests[bestIndex].experience;

            var xpneeded =this.getExperienceRequired(level);
            if (levelxp > xpneeded) {
                level++;
                levelxp -= xpneeded;
            }
        }

        return {
            experience: experience,
            gold: gold
        }
    }

})();
