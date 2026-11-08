//! Fighters and their states.

use crate::input::{FighterInput, StateInput};

// Class ids
#[allow(dead_code)]
pub const WARRIOR: u32 = 1;
#[allow(dead_code)]
pub const MAGE: u32 = 2;
#[allow(dead_code)]
pub const SCOUT: u32 = 3;
pub const ASSASSIN: u32 = 4;
pub const BATTLEMAGE: u32 = 5;
pub const BERSERKER: u32 = 6;
pub const DEMONHUNTER: u32 = 7;
pub const DRUID: u32 = 8;
pub const BARD: u32 = 9;
pub const NECROMANCER: u32 = 10;
pub const PALADIN: u32 = 11;
pub const PLAGUEDOCTOR: u32 = 12;
pub const BLOODWEAVER: u32 = 13;

// Fighter states and effects shown in the fight log.
pub const FIGHTER_STATE_NORMAL: u32 = 0;
pub const FIGHTER_STATE_BLOODWEAVER_REVIVED: u32 = 1;
pub const FIGHTER_STATE_DRUID_HIDDEN: u32 = 10;
pub const FIGHTER_STATE_DRUID_RAGE: u32 = 11;
pub const FIGHTER_STATE_PALADIN_DEFENSIVE: u32 = 20;
pub const FIGHTER_STATE_PALADIN_OFFENSIVE: u32 = 21;
pub const FIGHTER_STATE_BERSERKER_RAGE: u32 = 30;

pub const EFFECT_TYPE_SONG: u32 = 1;
pub const EFFECT_TYPE_MINION: u32 = 2;
pub const EFFECT_TYPE_TINCTURE: u32 = 3;
pub const EFFECT_TYPE_BLOOD_PACT: u32 = 4;

/// Attack and defense numbers of a state.
#[derive(Clone, Copy, Default)]
pub struct State {
    pub weapon1_min: f64,
    pub weapon1_max: f64,
    /// Assassin's second weapon.
    pub weapon2_min: f64,
    pub weapon2_max: f64,
    pub skip_chance: f64,
    /// Defense type the log shows for a skip.
    pub skip_variant: u32,
    pub critical_chance: f64,
    pub critical_multiplier: f64,
    pub received_damage_multiplier: f64,
    /// Paladin stance: chance to move to the next stance.
    pub stance_change_chance: f64,
    // Necromancer minion
    pub duration: f64,
    pub revive_count: f64,
    pub revive_chance: f64,
    pub revive_duration: f64,
}

impl State {
    fn from_input(input: &StateInput) -> State {
        let config = input.config.as_ref();

        State {
            weapon1_min: input.weapon1.min,
            weapon1_max: input.weapon1.max,
            weapon2_min: input.weapon2.as_ref().map_or(0.0, |weapon| weapon.min),
            weapon2_max: input.weapon2.as_ref().map_or(0.0, |weapon| weapon.max),
            skip_chance: input.skip_chance,
            skip_variant: input.skip_variant,
            critical_chance: input.critical_chance,
            critical_multiplier: input.critical_multiplier,
            received_damage_multiplier: input.received_damage_multiplier,
            stance_change_chance: input.stance_change_chance,
            duration: config.map_or(0.0, |config| config.duration),
            revive_count: config.map_or(0.0, |config| config.revive_count),
            revive_chance: config.map_or(0.0, |config| config.revive_chance),
            revive_duration: config.map_or(0.0, |config| config.revive_duration),
        }
    }
}

/// `model.Data` and its special states. Only the fighter's own class has special states.
#[derive(Clone, Copy, Default)]
pub struct States {
    pub data: State,
    pub rage_state: State,
    /// Song levels 1-3.
    pub songs: [State; 3],
    /// Neutral, defensive and offensive.
    pub stances: [State; 3],
    /// Skeleton, hound and golem.
    pub minions: [State; 3],
    pub tincture_throw_state: State,
    pub tincture_rounds: [State; 3],
    pub dagger_state: State,
    pub scythe_state: State,
    pub revived_state: State,
}

impl States {
    fn from_input(data: &StateInput) -> States {
        let one = |state: &Option<Box<StateInput>>| {
            state.as_deref().map(State::from_input).unwrap_or_default()
        };
        let three = |states: &[StateInput]| {
            let mut result = [State::default(); 3];

            for (index, state) in states.iter().take(3).enumerate() {
                result[index] = State::from_input(state);
            }

            result
        };

        States {
            data: State::from_input(data),
            rage_state: one(&data.rage_state),
            songs: three(&data.songs),
            stances: three(&data.stances),
            minions: three(&data.minions),
            tincture_throw_state: one(&data.tincture_throw_state),
            tincture_rounds: three(&data.tincture_rounds),
            dagger_state: one(&data.dagger_state),
            scythe_state: one(&data.scythe_state),
            revived_state: one(&data.revived_state),
        }
    }

    fn get(&self, active: ActiveState) -> State {
        match active {
            ActiveState::Data => self.data,
            ActiveState::RageState => self.rage_state,
            ActiveState::Song(level) => self.songs[level],
            ActiveState::Stance(stance) => self.stances[stance],
            ActiveState::Minion(minion) => self.minions[minion],
            ActiveState::TinctureThrowState => self.tincture_throw_state,
            ActiveState::TinctureRound(round) => self.tincture_rounds[round],
            ActiveState::DaggerState => self.dagger_state,
            ActiveState::ScytheState => self.scythe_state,
            ActiveState::RevivedState => self.revived_state,
        }
    }
}

/// Which of the `States` is active.
#[derive(Clone, Copy, Default, PartialEq)]
pub enum ActiveState {
    #[default]
    Data,
    RageState,
    Song(usize),
    Stance(usize),
    Minion(usize),
    TinctureThrowState,
    TinctureRound(usize),
    DaggerState,
    ScytheState,
    RevivedState,
}

#[derive(Clone, Copy, Default)]
pub struct Fighter {
    pub class: u32,
    pub index: f64,
    pub attack_first: bool,
    pub total_health: f64,
    pub skip_type: u32,
    pub skip_limit: f64,
    pub bypass_special: bool,

    pub revive_chance: f64,
    pub revive_chance_decay: f64,
    pub revive_health: f64,
    pub revive_health_min: f64,
    pub revive_health_decay: f64,
    pub revive_damage: f64,
    pub revive_damage_min: f64,
    pub revive_damage_decay: f64,
    pub revive_max: f64,

    pub swoop_chance_start: f64,
    pub swoop_chance_min: f64,
    pub swoop_chance_max: f64,
    pub swoop_chance_decay: f64,
    pub swoop_multiplier: f64,
    pub critical_swoop_bug: bool,

    pub effect_rounds: f64,
    /// Song duration per level.
    pub effect_base_duration: [f64; 3],
    pub brackets: [f64; 3],

    pub summon_chance: f64,
    pub summon_immediate_attack: bool,

    pub stance_initial: usize,
    pub stance_count: usize,
    /// Defensive stance healing.
    pub heal_multiplier: f64,

    pub tincture_chance: f64,
    pub tincture_revive_bug: bool,

    pub dagger_chance: f64,
    pub dagger_sacrifice: f64,
    pub pact_stacks_max: f64,
    pub seal_health: f64,
    pub seal_health_per_stack: f64,
    pub scythe_chance: f64,

    // Depend on the opponent
    pub fireball: f64,
    pub states: States,

    // Change during a fight
    pub health: f64,
    pub active_state: ActiveState,
    /// Copy of the active state.
    pub state: State,
    /// Skips in a row.
    pub skip_count: f64,
    /// Demon Hunter revives used.
    pub death_triggers: f64,
    pub swoop_chance: f64,
    /// Druid enters rage at his next turn.
    pub request_state: bool,
    /// Bard: attacks the song lasts, attacks made with it, turns since the last song, song level.
    pub effect_reset: f64,
    pub effect_counter: f64,
    pub effect_round: f64,
    pub effect_level: f64,
    pub stance_index: usize,
    pub minion: bool,
    pub minion_type: usize,
    pub minion_duration: f64,
    pub minion_revives: f64,
    pub tincture: bool,
    /// Active poison round in `states.tincture_rounds`.
    pub tincture_round: usize,
    pub tincture_duration: f64,
    pub pact_stacks: f64,
    pub seal_used: bool,
}

impl Fighter {
    pub fn from_input(input: &FighterInput) -> Fighter {
        let config = &input.config;
        let duration = |level: usize| {
            config
                .effect_base_duration
                .get(level)
                .copied()
                .unwrap_or(0.0)
        };

        Fighter {
            class: input.class,
            index: input.index,
            attack_first: input.attack_first,
            total_health: input.total_health,
            skip_type: config.skip_type,
            skip_limit: config.skip_limit,
            bypass_special: config.bypass_special,

            revive_chance: config.revive_chance,
            revive_chance_decay: config.revive_chance_decay,
            revive_health: config.revive_health,
            revive_health_min: config.revive_health_min,
            revive_health_decay: config.revive_health_decay,
            revive_damage: config.revive_damage,
            revive_damage_min: config.revive_damage_min,
            revive_damage_decay: config.revive_damage_decay,
            revive_max: config.revive_max,

            swoop_chance_start: config.swoop_chance,
            swoop_chance_min: config.swoop_chance_min,
            swoop_chance_max: config.swoop_chance_max,
            swoop_chance_decay: config.swoop_chance_decay,
            swoop_multiplier: input.swoop_multiplier,
            critical_swoop_bug: config.critical_swoop_bug,

            effect_rounds: config.effect_rounds,
            effect_base_duration: [duration(0), duration(1), duration(2)],
            brackets: input.brackets,

            summon_chance: config.summon_chance,
            summon_immediate_attack: config.summon_immediate_attack,

            stance_initial: config.stance_initial,
            stance_count: config.stances.len(),
            heal_multiplier: config
                .stances
                .get(1)
                .map_or(0.0, |stance| stance.heal_multiplier),

            tincture_chance: config.tincture_chance,
            tincture_revive_bug: config.tincture_revive_bug,

            dagger_chance: config.dagger_chance,
            dagger_sacrifice: config.dagger_sacrifice,
            pact_stacks_max: config.pact_stacks_max,
            seal_health: config.seal_health,
            seal_health_per_stack: config.seal_health_per_stack,
            scythe_chance: config.scythe_chance,

            fireball: input.fireball,
            states: States::from_input(&input.data),

            health: input.total_health,
            ..Fighter::default()
        }
    }

    #[inline(always)]
    pub fn enter_state(&mut self, active: ActiveState) {
        self.active_state = active;
        self.state = self.states.get(active);
    }

    #[inline(always)]
    pub fn special_state(&self) -> bool {
        self.active_state != ActiveState::Data
    }

    /// Resets the fight state, except health.
    pub fn reset(&mut self) {
        self.enter_state(ActiveState::Data);
        self.skip_count = 0.0;

        match self.class {
            DEMONHUNTER => self.death_triggers = 0.0,
            DRUID => {
                self.swoop_chance = self.swoop_chance_start;
                self.request_state = false;
            }
            BARD => {
                self.effect_reset = 0.0;
                self.effect_counter = self.effect_rounds;
                self.effect_round = self.effect_rounds;
            }
            PALADIN => {
                self.stance_index = self.stance_initial;
                self.enter_state(ActiveState::Stance(self.stance_index));
            }
            NECROMANCER => self.minion = false,
            PLAGUEDOCTOR => {
                self.tincture = false;
                self.tincture_duration = 0.0;
            }
            BLOODWEAVER => {
                self.pact_stacks = 0.0;
                self.seal_used = false;
            }
            _ => {}
        }
    }

    /// The state shown next to each logged round.
    pub fn log_state(&self) -> u32 {
        match self.class {
            BERSERKER if self.skip_count > 0.0 => FIGHTER_STATE_BERSERKER_RAGE,
            DRUID if self.special_state() => FIGHTER_STATE_DRUID_RAGE,
            DRUID => FIGHTER_STATE_DRUID_HIDDEN,
            PALADIN if self.stance_index == 1 => FIGHTER_STATE_PALADIN_DEFENSIVE,
            PALADIN if self.stance_index == 2 => FIGHTER_STATE_PALADIN_OFFENSIVE,
            BLOODWEAVER if self.seal_used => FIGHTER_STATE_BLOODWEAVER_REVIVED,
            _ => FIGHTER_STATE_NORMAL,
        }
    }

    /// The active effect shown next to each logged round, as type, duration and tier.
    pub fn log_effect(&self) -> Option<(u32, f64, f64)> {
        match self.class {
            BARD if self.special_state() => Some((
                EFFECT_TYPE_SONG,
                self.effect_reset - self.effect_counter,
                self.effect_level,
            )),
            NECROMANCER if self.minion => Some((
                EFFECT_TYPE_MINION,
                self.minion_duration,
                self.minion_type as f64 + 1.0,
            )),
            PLAGUEDOCTOR if self.tincture => {
                Some((EFFECT_TYPE_TINCTURE, self.tincture_duration, 1.0))
            }
            // A Blood Pact has no duration
            BLOODWEAVER if self.pact_stacks > 0.0 => {
                Some((EFFECT_TYPE_BLOOD_PACT, -1.0, self.pact_stacks))
            }
            _ => None,
        }
    }
}
