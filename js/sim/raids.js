if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { config, flags, players, enemies, iterations, log }}) {
    CONFIG.set(config);

    FLAGS.log(!!log);
    FLAGS.set(flags);
    FLAGS.set({
      // Assuming true like with guild fights
      NoGladiatorReduction: true
    });

    self.postMessage({
      results: new RaidSimulator().simulate(players, enemies, iterations),
      logs: FIGHT_LOG.dump()
    });

    self.close();
  });
}

class GuildSimulator extends SimulatorBase {
  simulate (players, enemies, iterations) {
    let score = 0;
    let playersLeftTotal = 0;
    let enemiesLeftTotal = 0;

    this.ca = this.cache(players, 0);
    this.cb = this.cache(enemies, 1);

    for (let i = 0; i < iterations; i++) {
      let { win, playersLeft, enemiesLeft } = this.battle();

      score += win;
      playersLeftTotal += playersLeft;
      enemiesLeftTotal += enemiesLeft;
    }

    return {
      score,
      // Average count left
      players: Math.floor(playersLeftTotal / iterations),
      enemies: Math.floor(enemiesLeftTotal / iterations)
    };
  }

  cache (entities, index) {
    return entities.map((entity) => SimulatorModel.create(index, entity)).sort((a, b) => a.Player.Level - b.Player.Level)
  }

  battle () {
      this.la = [ ... this.ca ];
      this.lb = [ ... this.cb ];

      for (let entity of this.la) entity.reset();
      for (let entity of this.lb) entity.reset();

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
          playersLeft: this.la.length,
          enemiesLeft: this.lb.length
      };
  }

  fight () {
      // Reset counters
      this.a.reset(false);
      this.b.reset(false);

      return super.fight();
  }
}
