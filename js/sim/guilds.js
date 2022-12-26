self.addEventListener('message', function ({ data: { flags, guildA, guildB, iterations }}) {
    FLAGS.set(flags);
    FLAGS.set({
        NoGladiatorReduction: true
    });

    self.postMessage({
        results: new GuildSimulator().simulate(guildA, guildB, iterations)
    });

    self.close();
});

class GuildSimulator extends SimulatorBase {
    simulate (guildA, guildB, iterations) {
        let score = 0;
        let total_left1 = 0;
        let total_left2 = 0;

        this.ga = this.cache(guildA, 0);
        this.gb = this.cache(guildB, 1);

        for (let i = 0; i < iterations; i++) {
            let { win, left1, left2 } = this.battle();

            score += win;
            total_left1 += left1;
            total_left2 += left2;
        }

        return {
            score,
            left1: Math.floor(total_left1 / iterations),
            left2: Math.floor(total_left2 / iterations)
        };
    }

    cache (guild, index) {
        return guild.map(({ player, inactive }) => {
            let model = FighterModel.create(index, player);
            if (inactive == 1) {
                // Inactive players have their HP reduced by 50%
                model.Player.ForceHealthMultiplier = 0.5;
            } else if (inactive == 2) {
                // Inactive players beyond 21 days have their HP reduced by 90%
                model.Player.ForceHealthMultiplier = 0.1;
            } else {
                // Rest modifier
                model.Player.ForceHealthMultiplier = 1.0;
            }

            return model;
        }).sort((a, b) => a.Player.Level - b.Player.Level);
    }

    battle () {
        this.la = [ ... this.ga ];
        this.lb = [ ... this.gb ];

        for (let player of this.la) player.reset();
        for (let player of this.lb) player.reset();

        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            FighterModel.initializeFighters(this.a, this.b);

            if (this.fight() == 0) {
                this.la.shift();
            } else {
                this.lb.shift();
            }
        }

        return {
            win: (this.la.length > 0 ? this.la[0].Index : this.lb[0].Index) == 0,
            left1: this.la.length,
            left2: this.lb.length
        };
    }

    fight () {
        // Reset counters
        this.a.reset(false);
        this.b.reset(false);

        return super.fight();
    }
}
