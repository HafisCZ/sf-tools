// Shamelessly stolen with permission from https://hellevatorrewards.12hp.de/

class HellevatorEnemies {
  static #enemies = {}

  static HELLEVATOR_THEMES = [
    8, 7, 6, 5, 4, 3, 2, 1, 0
  ]

  static async #generateEnemies (theme) {
    this.#enemies[theme] = [];

    const themeData = await fetch(`/js/playa/hellevator/theme${theme}.json`).then((data) => data.json());

    for (let i = 0; i < 500; i++) {
      const monster = MonsterGenerator.get(
        MonsterGenerator.MONSTER_DEFAULT,
        10 + i * 2,
        _dig(themeData, i, 1) || 1,
        _dig(themeData, i, 0) || 40,
        25
      )

      monster.Floor = i + 1;

      this.#enemies[theme][i] = monster;
    }
  }

  static async floorRange (start, end = start, theme = this.HELLEVATOR_THEMES[0]) {
    if (typeof this.#enemies[theme] === 'undefined') {
      await this.#generateEnemies(theme);
    }

    return this.#enemies[theme].slice(start - 1, end);
  }
}
