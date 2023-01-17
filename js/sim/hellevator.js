// WebWorker hooks
self.addEventListener('message', function ({ data: { player, enemy, iterations } }) {
  FLAGS.set({
    /* Simulator Flags */
  });

  self.postMessage({
    score: new HellevatorSimulator().simulate(player, enemy, iterations)
  });

  self.close();
});

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
      this.ca = FighterModel.create(0, source);
      this.cb = FighterModel.create(1, target);

      FighterModel.initializeFighters(this.ca, this.cb);
  }

  fight () {
      this.a = this.ca;
      this.b = this.cb;

      if (FIGHT_LOG_ENABLED) {
          FIGHT_LOG.logInit(this.a, this.b);
      }

      this.a.reset();
      this.b.reset();

      return super.fight();
  }
}
