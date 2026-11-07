//! Dungeon battles: one player, or the companions plus the player, against a boss.

use serde::{Deserialize, Serialize};

use crate::fight::{Battle, MAX_FIGHTERS};
use crate::fighter::Fighter;
use crate::input::FighterInput;
use crate::log::FightLog;
use crate::rng;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DungeonsRequest {
    pub iterations: u32,
    /// Most values per health curve, see `trim_healths`.
    pub health_cap: u32,
    pub log: bool,
    pub seed: [u32; 4],
    /// Players in the order they fight, each set up against the boss.
    pub players: Vec<FighterInput>,
    /// The boss set up against each player, same order.
    pub bosses: Vec<FighterInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DungeonsResult {
    pub score: f64,
    /// Boss health left per battle (share of total), sorted and shrunk.
    pub enemy_healths: Vec<f64>,
    /// Players' health left per battle (share of their combined total), sorted and shrunk.
    pub players_healths: Vec<f64>,
    pub logs: Option<Vec<FightLog>>,
}

/// Plays `iterations` battles.
pub fn run(request: DungeonsRequest) -> Result<DungeonsResult, String> {
    let count = request.players.len();

    if count == 0 || count >= MAX_FIGHTERS || request.bosses.len() != count {
        return Err(format!("A dungeon fight needs 1 to {} players and one boss setup per player, got {} players and {} bosses", MAX_FIGHTERS - 1, count, request.bosses.len()));
    }

    rng::seed(request.seed);

    let iterations = request.iterations as usize;

    let mut fighters: Vec<Fighter> = request.players.iter().map(Fighter::from_input).collect();
    let bosses: Vec<Fighter> = request.bosses.iter().map(Fighter::from_input).collect();

    fighters.push(bosses[0]);

    let boss = count;
    let total_health = fighters[..count]
        .iter()
        .fold(0.0, |total, player| total + player.total_health);

    let mut battle = Battle::new(fighters, request.log);

    let mut score = 0.0;
    let mut enemy_healths = Vec::with_capacity(iterations);
    let mut players_healths = Vec::with_capacity(iterations);

    if count == 1 {
        for _ in 0..iterations {
            battle.fighters[0].health = battle.fighters[0].total_health;
            battle.fighters[boss].health = battle.fighters[boss].total_health;

            let win = battle.fight(0, boss);

            let player = &battle.fighters[0];
            let enemy = &battle.fighters[boss];

            enemy_healths.push(if win {
                0.0
            } else {
                enemy.health / enemy.total_health
            });
            players_healths.push(if win {
                player.health / total_health
            } else {
                0.0
            });

            if win {
                score += 1.0;
            }
        }
    } else {
        for _ in 0..iterations {
            for fighter in battle.fighters.iter_mut() {
                fighter.health = fighter.total_health;
            }

            // Next player to fight
            let mut next = 0;
            let mut boss_alive = true;

            while next < count && boss_alive {
                // The boss's numbers against this player
                battle.fighters[boss].states = bosses[next].states;
                battle.fighters[boss].fireball = bosses[next].fireball;

                if battle.fight(next, boss) {
                    boss_alive = false;
                } else {
                    next += 1;
                }
            }

            let win = next < count;

            let mut remaining = 0.0;
            for player in &battle.fighters[next..count] {
                remaining += player.health.max(0.0);
            }

            let enemy = &battle.fighters[boss];

            enemy_healths.push(if boss_alive {
                (enemy.health / enemy.total_health).max(0.0)
            } else {
                0.0
            });
            players_healths.push(remaining / total_health);

            if win {
                score += 1.0;
            }
        }
    }

    Ok(DungeonsResult {
        score,
        enemy_healths: trim_healths(enemy_healths, request.health_cap),
        players_healths: trim_healths(players_healths, request.health_cap),
        logs: battle.logs,
    })
}

/// The values sorted and averaged down to about `cap` values.
fn trim_healths(healths: Vec<f64>, cap: u32) -> Vec<f64> {
    let length = healths.len();
    let steps = ((length as f64 / cap as f64).floor() as usize).max(1);

    // Sorted by bit pattern, which matches the numbers since health shares are never negative
    let mut bits: Vec<u64> = healths.iter().map(|value| value.to_bits()).collect();
    bits.sort_unstable();
    let healths: Vec<f64> = bits.into_iter().map(f64::from_bits).collect();

    if steps == 1 {
        return healths;
    }

    let groups = (length as f64 / steps as f64).ceil() as usize;
    let mut trimmed = Vec::with_capacity(groups);

    for group in 0..groups {
        let mut sum = 0.0;
        let mut count = 0.0;

        for value in healths.iter().skip(group * steps).take(steps) {
            count += 1.0;
            sum += value;
        }

        trimmed.push((sum / count).max(0.0));
    }

    trimmed
}
