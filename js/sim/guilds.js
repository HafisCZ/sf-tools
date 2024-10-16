if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.addEventListener('message', function ({ data: { config, flags, guildA, guildB, iterations, log }}) {
        CONFIG.set(config);

        FLAGS.log(!!log);
        FLAGS.set(flags);
        FLAGS.set({
            NoGladiatorReduction: true
        });

        self.postMessage({
            results: new GuildSimulator().simulate(guildA, guildB, iterations),
            logs: FIGHT_LOG.dump()
        });

        self.close();
    });
}

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
            if (inactive == 1) {
                // Inactive players have their HP reduced by 50%
                player.HealthMultiplier = 0.5;
            } else if (inactive == 2) {
                // Inactive players beyond 21 days have their HP reduced by 90%
                player.HealthMultiplier = 0.1;
            } else {
                // Rest modifier
                player.HealthMultiplier = 1.0;
            }
            
            return SimulatorModel.create(index, player);
        }).sort((a, b) => a.Player.Level - b.Player.Level);
    }

    battle () {
        this.la = [ ... this.ga ];
        this.lb = [ ... this.gb ];

        for (const player of this.la) player.resetHealth();
        for (const player of this.lb) player.resetHealth();

        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            SimulatorModel.initializeFighters(this.a, this.b);

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
}
