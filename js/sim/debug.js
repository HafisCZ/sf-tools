// Logger is always enabled
FIGHT_LOG_ENABLED = true;

self.addEventListener('message', function ({ data: { players } }) {
    self.postMessage({
        json: new DebugSimulator().generate(players)
    });

    self.close();
});

class DebugSimulator extends SimulatorBase {
    constructor () {
        super();

        this.matches = [];
    }

    generate (players) {
        for (let i = 0; i < players.length; i++) {
            let player1 = players[i];

            for (let j = 0; j < players.length; j++) {
                let player2 = players[j];

                this.fight(this.prepare(player1, player2));

                this.matches.push({
                    fighters: this.prepare(player1, player2),
                    sample: FIGHT_LOG.lastLog.rounds
                });

                FIGHT_LOG.clear();
            }
        }

        return this.matches;
    }

    prepare (player1, player2) {
        let fighter1 = FighterModel.create(0, player1);
        let fighter2 = FighterModel.create(1, player2);

        fighter1.initialize(fighter2);
        fighter2.initialize(fighter1);

        fighter1.reset();
        fighter2.reset();

        return { fighter1, fighter2 };
    }

    fight ({ fighter1, fighter2 }) {
        this.a = fighter1;
        this.b = fighter2;

        FIGHT_LOG.logInit(this.a, this.b);

        return super.fight();
    }
}
