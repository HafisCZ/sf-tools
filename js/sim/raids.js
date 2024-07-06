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

class RaidSimulator extends SimulatorBase {
  simulate (players, enemies, iterations) {
    let score = 0;

    this.cachedPlayers = this.cache(players, 0);
    this.cachedEnemies = this.cache(enemies, 1);

    for (let i = 0; i < iterations; i++) {
      let { win } = this.battle();

      score += win;
    }

    return {
      score
    }
  }

  cache (entities, index) {
    return entities.map((entity) => {
      if (Array.isArray(entity)) {
        return entity.map((variant) => SimulatorModel.create(index, variant.player))
      } else {
        return SimulatorModel.create(index, entity.player)
      }
    }).sort((a, b) => (Array.isArray(a) ? a[0].Player.Level : a.Player.Level) - (Array.isArray(b) ? b[0].Player.Level : b.Player.Level))
  }

  battle () {
    // Clone everyone
    this.currentPlayers = this.cachedPlayers.slice();
    this.currentEnemies = this.cachedEnemies.map((variants) => variants.slice());

    // Reset players only, enemies are reset individually
    for (const player of this.currentPlayers) player.reset();

    // Go through each enemy group and pick the worst result
    for (const enemyVariants of this.currentEnemies) {
      // Save healths, so they can be recovered later
      const currentHealths = this.currentPlayers.map((p) => p.Health)

      // Do all 9 fights, return list of healths left
      const futureHealths = enemyVariants.map((enemy) => {
        const players = this.currentPlayers.slice()

        for (let i = 0; i < players.length; i++) {
          // Recover healths
          players[i].Health = currentHealths[i]
        }

        while (players.length > 0) {
          this.a = players[0]
          this.b = enemy

          // Hard reset enemy
          this.b.reset()

          SimulatorModel.initializeFighters(this.a, this.b);

          if (this.fight() == 0) {
            players.shift();
          } else {
            break;
          }
        }

        const newHealths = players.map((player) => player.Health)

        // Accumulate all healths to decide what path to take later
        newHealths.total = 0
        for (const health of newHealths) newHealths.total += health

        return newHealths
      })

      const leastHealth = Math.min(...futureHealths.map((set) => set.total))

      if (leastHealth === 0) {
        // If 0, everyone died Dave
        return {
          win: false
        }
      }

      const leastHealths = futureHealths.find((healths) => healths.total === leastHealth)

      // Set healths to the healths from the worst attempt
      this.currentPlayers = this.currentPlayers.slice(this.currentPlayers.length - leastHealths.length)
      for (let i = 0; i < this.currentPlayers.length; i++) {
        this.currentPlayers[i].Health = leastHealths[i]
      }
    }

    return {
      win: this.currentPlayers.length > 0
    }
  }

  fight () {
      // Reset counters
      this.a.reset(false);
      this.b.reset(false);

      return super.fight();
  }
}
