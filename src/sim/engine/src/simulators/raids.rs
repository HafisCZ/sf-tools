//! Raid battles: a group of players against a row of enemies, health carries over between fights.

use serde::{Deserialize, Serialize};

use crate::fight::Battle;
use crate::fighter::{Fighter, States};
use crate::input::{FighterInput, StateInput};
use crate::log::FightLog;
use crate::rng;

/// A fighter's numbers against one opponent.
#[derive(Deserialize)]
pub struct SetupInput {
    pub fireball: f64,
    pub data: StateInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RaidsRequest {
    pub iterations: u32,
    pub log: bool,
    pub seed: [u32; 4],
    /// Both sides in the order they fight.
    pub players: Vec<FighterInput>,
    pub enemies: Vec<FighterInput>,
    /// `player_setups[p][e]` is player `p` set up against enemy `e`.
    pub player_setups: Vec<Vec<SetupInput>>,
    /// `enemy_setups[p][e]` is enemy `e` set up against player `p`.
    pub enemy_setups: Vec<Vec<SetupInput>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RaidsResult {
    /// Battles won by the players.
    pub score: f64,
    pub logs: Option<Vec<FightLog>>,
}

type Setup = (States, f64);

fn setups(table: &[Vec<SetupInput>]) -> Vec<Vec<Setup>> {
    table
        .iter()
        .map(|row| {
            row.iter()
                .map(|setup| (States::from_input(&setup.data), setup.fireball))
                .collect()
        })
        .collect()
}

/// Plays `iterations` battles.
pub fn run(request: RaidsRequest) -> Result<RaidsResult, String> {
    let player_count = request.players.len();
    let enemy_count = request.enemies.len();

    let complete = |table: &[Vec<SetupInput>]| {
        table.len() == player_count && table.iter().all(|row| row.len() == enemy_count)
    };

    if player_count == 0
        || enemy_count == 0
        || !complete(&request.player_setups)
        || !complete(&request.enemy_setups)
    {
        return Err(format!(
            "A raid needs players, enemies and one setup per pair, got {player_count} players and {enemy_count} enemies"
        ));
    }

    rng::seed(request.seed);

    let mut players: Vec<Fighter> = request.players.iter().map(Fighter::from_input).collect();
    let mut enemies: Vec<Fighter> = request.enemies.iter().map(Fighter::from_input).collect();

    let player_setups = setups(&request.player_setups);
    let enemy_setups = setups(&request.enemy_setups);

    // The two fighting right now sit at positions 0 and 1
    let mut battle = Battle::new(vec![players[0], enemies[0]], request.log);
    let mut score = 0.0;

    for _ in 0..request.iterations {
        for fighter in players.iter_mut().chain(enemies.iter_mut()) {
            fighter.health = fighter.total_health;
        }

        let mut player = 0;
        let mut enemy = 0;

        while player < player_count && enemy < enemy_count {
            battle.fighters[0] = players[player];
            (battle.fighters[0].states, battle.fighters[0].fireball) = player_setups[player][enemy];

            battle.fighters[1] = enemies[enemy];
            (battle.fighters[1].states, battle.fighters[1].fireball) = enemy_setups[player][enemy];

            let win = battle.fight(0, 1);

            players[player] = battle.fighters[0];
            enemies[enemy] = battle.fighters[1];

            // Logged positions become positions in the request, players first
            if let Some(log) = battle.logs.as_mut().and_then(|logs| logs.last_mut()) {
                let position = |slot: usize| {
                    if slot == 0 {
                        player
                    } else {
                        player_count + enemy
                    }
                };

                log.a = position(log.a);
                log.b = position(log.b);

                for round in log.rounds.iter_mut() {
                    round.attacker = position(round.attacker);
                    round.target = position(round.target);
                }
            }

            if win {
                enemy += 1;
            } else {
                player += 1;
            }
        }

        if player < player_count {
            score += 1.0;
        }
    }

    Ok(RaidsResult {
        score,
        logs: battle.logs,
    })
}
