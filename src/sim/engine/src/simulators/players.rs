//! Player fights: one fighter against another, both at full health each fight.

use serde::{Deserialize, Serialize};

use crate::fight::Battle;
use crate::fighter::Fighter;
use crate::input::FighterInput;
use crate::log::FightLog;
use crate::rng;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayersRequest {
    pub iterations: u32,
    pub log: bool,
    pub seed: [u32; 4],
    /// The fighter whose wins are counted.
    pub attacker: FighterInput,
    pub defender: FighterInput,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayersResult {
    /// Fights won by the attacker.
    pub score: f64,
    pub logs: Option<Vec<FightLog>>,
}

pub fn run(request: PlayersRequest) -> PlayersResult {
    rng::seed(request.seed);

    let mut battle = Battle::new(
        vec![
            Fighter::from_input(&request.attacker),
            Fighter::from_input(&request.defender),
        ],
        request.log,
    );
    let mut score = 0.0;

    for _ in 0..request.iterations {
        for fighter in battle.fighters.iter_mut() {
            fighter.health = fighter.total_health;
        }

        if battle.fight(0, 1) {
            score += 1.0;
        }
    }

    PlayersResult {
        score,
        logs: battle.logs,
    }
}
