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
