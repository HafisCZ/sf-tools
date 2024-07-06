// Shamelessly stolen with permission from https://hellevatorrewards.12hp.de/

class HellevatorEnemies {
  static #enemies = []

  static async #generateEnemies () {
    for (let i = 0; i < 500; i++) {
      const monster = MonsterGenerator.get(
        MonsterGenerator.MONSTER_NORMAL,
        10 + i * 2,
        1,
        40,
        25
      )

      monster.Floor = i + 1;

      this.#enemies[i] = monster;
    }
  }

  static async floorRange (start, end = start) {
    if (this.#enemies.length === 0) {
      await this.#generateEnemies();
    }

    return this.#enemies.slice(start - 1, end);
  }
}