//! Fighters as sent by the workers: `config` is `model.Config` and `data` is `model.Data`.

use serde::Deserialize;

/// One fighter, set up against a specific opponent.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FighterInput {
    pub class: u32,
    /// 0 for the side whose wins are counted, 1 for the other side.
    pub index: f64,
    /// Strikes first (enchanted hand item).
    pub attack_first: bool,
    pub total_health: f64,
    /// Druid only: swoop damage relative to a normal attack.
    pub swoop_multiplier: f64,
    /// Bard only: cumulative song chances, e.g. 25, 75, 100.
    pub brackets: [f64; 3],
    /// Battlemage only: fireball damage against this opponent.
    pub fireball: f64,
    pub config: ConfigInput,
    pub data: StateInput,
}

/// The `model.Config` values the fights need, missing ones are 0.
#[derive(Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
pub struct ConfigInput {
    /// 0 skips one attack (block, evade), 1 skips the opponent's whole turn (Berserker).
    pub skip_type: u32,
    /// Skips in a row allowed (999 means no limit).
    pub skip_limit: f64,
    /// Mage: blocks the opponent's specials.
    pub bypass_special: bool,

    // Demon Hunter revive
    pub revive_chance: f64,
    pub revive_chance_decay: f64,
    pub revive_health: f64,
    pub revive_health_min: f64,
    pub revive_health_decay: f64,
    pub revive_damage: f64,
    pub revive_damage_min: f64,
    pub revive_damage_decay: f64,
    pub revive_max: f64,

    // Druid swoop
    pub swoop_chance: f64,
    pub swoop_chance_min: f64,
    pub swoop_chance_max: f64,
    pub swoop_chance_decay: f64,
    pub critical_swoop_bug: bool,

    // Bard songs
    pub effect_rounds: f64,
    pub effect_base_duration: Vec<f64>,

    // Necromancer minions
    pub summon_chance: f64,
    pub summon_immediate_attack: bool,

    // Paladin stances
    pub stance_initial: usize,
    pub stances: Vec<StanceConfigInput>,

    // Plague Doctor
    pub tincture_chance: f64,
    pub tincture_revive_bug: bool,

    // Blood Weaver
    pub dagger_chance: f64,
    pub dagger_sacrifice: f64,
    pub pact_stacks_max: f64,
    pub seal_health: f64,
    pub seal_health_per_stack: f64,
    pub scythe_chance: f64,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
pub struct StanceConfigInput {
    /// Share of a blocked hit the defensive stance heals.
    pub heal_multiplier: f64,
}

/// A state from `model.Data`.
#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StateInput {
    pub weapon1: WeaponInput,
    /// Assassin's second weapon.
    #[serde(default)]
    pub weapon2: Option<WeaponInput>,
    #[serde(default)]
    pub skip_chance: f64,
    /// Defense type the log shows for a skip.
    #[serde(default)]
    pub skip_variant: u32,
    pub critical_chance: f64,
    pub critical_multiplier: f64,
    pub received_damage_multiplier: f64,
    /// Paladin stance only.
    #[serde(default)]
    pub stance_change_chance: f64,
    /// Necromancer minion only.
    #[serde(default)]
    pub config: Option<StateConfigInput>,

    #[serde(default)]
    pub rage_state: Option<Box<StateInput>>,
    #[serde(default)]
    pub songs: Vec<StateInput>,
    #[serde(default)]
    pub stances: Vec<StateInput>,
    #[serde(default)]
    pub minions: Vec<StateInput>,
    #[serde(default)]
    pub tincture_throw_state: Option<Box<StateInput>>,
    #[serde(default)]
    pub tincture_rounds: Vec<StateInput>,
    #[serde(default)]
    pub dagger_state: Option<Box<StateInput>>,
    #[serde(default)]
    pub scythe_state: Option<Box<StateInput>>,
    #[serde(default)]
    pub revived_state: Option<Box<StateInput>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct WeaponInput {
    pub min: f64,
    pub max: f64,
}

/// A Necromancer minion's duration and revive.
#[derive(Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
pub struct StateConfigInput {
    pub duration: f64,
    pub revive_count: f64,
    pub revive_chance: f64,
    pub revive_duration: f64,
}
