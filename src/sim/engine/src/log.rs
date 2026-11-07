//! Fight logs, with fighters as their position in the request.

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FightLog {
    /// Positions of `fighterA` and `fighterB`.
    pub a: usize,
    pub b: usize,
    /// Health when the fight starts.
    pub health_a: f64,
    pub health_b: f64,
    pub rounds: Vec<Round>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Round {
    /// Revives are logged with the same position as attacker and target.
    pub attacker: usize,
    pub target: usize,
    pub attacker_state: u32,
    pub target_state: u32,
    pub attack_type: u32,
    pub defense_type: u32,
    pub attacker_health: f64,
    /// Never below 0.
    pub target_health: f64,
    pub attacker_effects: Vec<Effect>,
    pub target_effects: Vec<Effect>,
    /// 0 when skipped, negative when a Paladin's block healed him.
    pub attack_damage: f64,
    pub attack_rage: f64,
}

#[derive(Serialize)]
pub struct Effect {
    #[serde(rename = "type")]
    pub kind: u32,
    pub duration: f64,
    pub tier: f64,
}

impl Effect {
    /// The effect as the log's list.
    pub fn list(effect: Option<(u32, f64, f64)>) -> Vec<Effect> {
        effect
            .map(|(kind, duration, tier)| Effect {
                kind,
                duration,
                tier,
            })
            .into_iter()
            .collect()
    }
}
