if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { config, player, enemy, iterations, log } }) {
    CONFIG.set(config);

    FLAGS.log(!!log);

    self.postMessage({
      score: enemy.map((enemyVariant) => new HellevatorSimulator().simulate(player, enemyVariant, iterations)),
      logs: FIGHT_LOG.dump()
    });

    self.close();
  });
}

class HellevatorSimulator extends SimulatorBase {
  simulate (player, enemy, iterations) {
    this.cache(player, enemy);

    let score = 0;
    for (let i = 0; i < iterations; i++) {
      score += this.fight();
    }

    return score / iterations;
  }

  cache (source, target) {
      this.ca = SimulatorModel.create(0, source);
      this.cb = SimulatorModel.create(1, target);

      SimulatorModel.initializeFighters(this.ca, this.cb);
  }

  fight () {
      this.a = this.ca;
      this.b = this.cb;

      this.a.reset();
      this.b.reset();

      return super.fight();
  }
}
