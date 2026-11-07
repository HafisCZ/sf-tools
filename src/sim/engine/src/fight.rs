//! Fights: turns, attacks and class rules.

use crate::fighter::*;
use crate::log::{Effect, FightLog, Round};
use crate::rng;

// Attack types shown in the log
pub const ATTACK_TYPE_NORMAL: u32 = 0;
pub const ATTACK_TYPE_CRITICAL: u32 = 1;
pub const ATTACK_TYPE_FIREBALL: u32 = 10;
pub const ATTACK_TYPE_MINION_SUMMON: u32 = 11;
pub const ATTACK_TYPE_MINION: u32 = 12;
pub const ATTACK_TYPE_SWOOP: u32 = 13;
pub const ATTACK_TYPE_REVIVE: u32 = 14;
pub const ATTACK_TYPE_MINION_CRITICAL: u32 = 15;
pub const ATTACK_TYPE_SWOOP_CRITICAL: u32 = 16;
pub const ATTACK_TYPE_TINCTURE_THROW: u32 = 17;
pub const ATTACK_TYPE_TINCTURE_THROW_CRITICAL: u32 = 18;
pub const ATTACK_TYPE_TINCTURE: u32 = 19;
pub const ATTACK_TYPE_TINCTURE_CRITICAL: u32 = 20;
pub const ATTACK_TYPE_DAGGER: u32 = 21;
pub const ATTACK_TYPE_DAGGER_CRITICAL: u32 = 22;
pub const ATTACK_TYPE_SEAL_OF_DEATH: u32 = 23;
pub const ATTACK_TYPE_SCYTHE: u32 = 24;
pub const ATTACK_TYPE_SCYTHE_CRITICAL: u32 = 25;
pub const ATTACK_TYPE_NORMAL_SECONDARY: u32 = 100;
pub const ATTACK_TYPE_CRITICAL_SECONDARY: u32 = 101;

// Defense types shown in the log
pub const DEFENSE_TYPE_NONE: u32 = 0;
pub const DEFENSE_TYPE_MAGIC: u32 = 5;

/// Skips a single attack (block, evade).
pub const SKIP_TYPE_DEFAULT: u32 = 0;
/// Skips the opponent's whole turn (Berserker rage).
pub const SKIP_TYPE_CONTROL: u32 = 1;

/// Most fighters in one run.
pub const MAX_FIGHTERS: usize = 8;

/// Log types of an attack: (normal, critical).
type AttackTypes = (u32, u32);

const NORMAL: AttackTypes = (ATTACK_TYPE_NORMAL, ATTACK_TYPE_CRITICAL);
const SECONDARY: AttackTypes = (ATTACK_TYPE_NORMAL_SECONDARY, ATTACK_TYPE_CRITICAL_SECONDARY);
const SWOOP: AttackTypes = (ATTACK_TYPE_SWOOP, ATTACK_TYPE_SWOOP_CRITICAL);
const MINION: AttackTypes = (ATTACK_TYPE_MINION, ATTACK_TYPE_MINION_CRITICAL);
const TINCTURE_THROW: AttackTypes = (
    ATTACK_TYPE_TINCTURE_THROW,
    ATTACK_TYPE_TINCTURE_THROW_CRITICAL,
);
const TINCTURE: AttackTypes = (ATTACK_TYPE_TINCTURE, ATTACK_TYPE_TINCTURE_CRITICAL);
const DAGGER: AttackTypes = (ATTACK_TYPE_DAGGER, ATTACK_TYPE_DAGGER_CRITICAL);
const SCYTHE: AttackTypes = (ATTACK_TYPE_SCYTHE, ATTACK_TYPE_SCYTHE_CRITICAL);

#[inline(always)]
fn at_least_zero(value: f64) -> f64 {
    if value > 0.0 {
        value
    } else {
        0.0
    }
}

/// Like `f64::clamp`, without the panic when min > max.
#[inline(always)]
fn clamp(value: f64, min: f64, max: f64) -> f64 {
    if value <= min {
        min
    } else if value >= max {
        max
    } else {
        value
    }
}

/// The fighters of a run and the current fight's turn counter.
pub struct Battle {
    /// Fighters, unused entries stay empty.
    pub fighters: [Fighter; MAX_FIGHTERS],
    turn: f64,
    /// Last rage multiplier, logged with each round.
    current_rage: f64,
    pub logs: Option<Vec<FightLog>>,
}

impl Battle {
    pub fn new(list: Vec<Fighter>, log: bool) -> Battle {
        let mut fighters = [Fighter::default(); MAX_FIGHTERS];

        for (index, fighter) in list.into_iter().take(MAX_FIGHTERS).enumerate() {
            fighters[index] = fighter;
        }

        Battle {
            fighters,
            turn: 0.0,
            current_rage: 0.0,
            logs: if log { Some(Vec::new()) } else { None },
        }
    }

    /// Damage multiplier of the current turn, then advances the turn.
    #[inline(always)]
    fn rage(&mut self) -> f64 {
        let rage = 1.0 + self.turn / 6.0;

        self.turn += 1.0;
        self.current_rage = rage;

        rage
    }

    /// Damage between `min` and `max` times the turn's rage.
    #[inline(always)]
    fn roll_damage(&mut self, min: f64, max: f64) -> f64 {
        let rage = self.rage();

        rage * (rng::next() * (1.0 + max - min) + min)
    }

    /// Records a round when logging is on.
    #[inline(always)]
    fn log_round(
        &mut self,
        attacker: usize,
        target: usize,
        damage: f64,
        attack_type: u32,
        defense_type: u32,
    ) {
        if self.logs.is_some() {
            self.record_round(attacker, target, damage, attack_type, defense_type);
        }
    }

    #[cold]
    #[inline(never)]
    fn record_round(
        &mut self,
        attacker: usize,
        target: usize,
        damage: f64,
        attack_type: u32,
        defense_type: u32,
    ) {
        let round = Round {
            attacker,
            target,
            attacker_state: self.fighters[attacker].log_state(),
            target_state: self.fighters[target].log_state(),
            attack_type,
            defense_type,
            attacker_health: self.fighters[attacker].health,
            target_health: at_least_zero(self.fighters[target].health),
            attacker_effects: Effect::list(self.fighters[attacker].log_effect()),
            target_effects: Effect::list(self.fighters[target].log_effect()),
            attack_damage: damage,
            attack_rage: if self.current_rage == 0.0 {
                1.0
            } else {
                self.current_rage
            },
        };

        if let Some(fight) = self.logs.as_mut().and_then(|logs| logs.last_mut()) {
            fight.rounds.push(round);
        }
    }

    /// Whether `t` skips, for the given skip type.
    #[inline(always)]
    fn skip(&mut self, t: usize, kind: u32) -> bool {
        let chance = self.fighters[t].state.skip_chance;
        let fighter = &mut self.fighters[t];

        if fighter.skip_type == kind && rng::roll(chance) && fighter.skip_count < fighter.skip_limit
        {
            fighter.skip_count += 1.0;

            true
        } else {
            false
        }
    }

    /// Whether `t` skips an Assassin's or Berserker's attack.
    #[inline(always)]
    fn skip_uncounted(&mut self, t: usize) -> bool {
        rng::roll(self.fighters[t].state.skip_chance)
            && self.fighters[t].skip_type == SKIP_TYPE_DEFAULT
    }

    /// `t` takes `damage` from `s` unless it skipped. Returns whether `t` is alive.
    #[inline(always)]
    fn apply_attack_default(
        &mut self,
        t: usize,
        s: usize,
        damage: f64,
        skipped: bool,
        attack_type: u32,
        defense_type: u32,
    ) -> bool {
        if !skipped {
            self.fighters[t].health -= damage;
        }

        self.log_round(
            s,
            t,
            if skipped { 0.0 } else { damage },
            attack_type,
            defense_type,
        );

        self.fighters[t].health > 0.0
    }

    /// `t` receives an attack from `s`, with the receiver's class rules.
    fn apply_attack(
        &mut self,
        t: usize,
        s: usize,
        mut damage: f64,
        mut skipped: bool,
        attack_type: u32,
        defense_type: u32,
    ) -> bool {
        match self.fighters[t].class {
            DEMONHUNTER => {
                let alive =
                    self.apply_attack_default(t, s, damage, skipped, attack_type, defense_type);

                if !alive {
                    // Revive
                    let target = &self.fighters[t];
                    let chance =
                        target.revive_chance - target.revive_chance_decay * target.death_triggers;

                    if !self.fighters[s].bypass_special
                        && target.death_triggers < target.revive_max
                        && rng::roll(chance)
                    {
                        let target = &mut self.fighters[t];

                        target.health = target.total_health
                            * target.revive_health_min.max(
                                target.revive_health
                                    - target.death_triggers * target.revive_health_decay,
                            );
                        target.death_triggers += 1.0;

                        self.rage();
                        self.log_round(t, t, 0.0, ATTACK_TYPE_REVIVE, DEFENSE_TYPE_NONE);

                        return true;
                    }
                }

                alive
            }
            DRUID => {
                if skipped && !self.fighters[t].special_state() {
                    self.fighters[t].request_state = true;
                }

                self.apply_attack_default(t, s, damage, skipped, attack_type, defense_type)
            }
            PALADIN => {
                // Defensive stance: a block heals
                if skipped && self.fighters[t].stance_index == 1 {
                    let paladin = &self.fighters[t];
                    let maximum_heal = (paladin.total_health - paladin.health).max(0.0);

                    damage = -maximum_heal.min(damage.max(0.0) * paladin.heal_multiplier);
                    skipped = false;
                }

                self.apply_attack_default(t, s, damage, skipped, attack_type, defense_type)
            }
            BLOODWEAVER => {
                let alive =
                    self.apply_attack_default(t, s, damage, skipped, attack_type, defense_type);

                // Seal of Death
                if !alive && !self.fighters[t].seal_used && !self.fighters[s].bypass_special {
                    let weaver = &mut self.fighters[t];

                    weaver.health = (weaver.total_health
                        * (weaver.seal_health + weaver.seal_health_per_stack * weaver.pact_stacks))
                        .ceil();
                    weaver.pact_stacks = 0.0;
                    weaver.seal_used = true;
                    weaver.enter_state(ActiveState::RevivedState);

                    self.rage();
                    self.log_round(t, t, 0.0, ATTACK_TYPE_SEAL_OF_DEATH, DEFENSE_TYPE_NONE);

                    return true;
                }

                alive
            }
            _ => self.apply_attack_default(t, s, damage, skipped, attack_type, defense_type),
        }
    }

    /// `a` hits `b` with rolled damage.
    #[inline(always)]
    fn attack_default(
        &mut self,
        a: usize,
        b: usize,
        mut damage: f64,
        skipped: bool,
        critical: bool,
        types: AttackTypes,
    ) -> bool {
        if critical {
            damage *= self.fighters[a].state.critical_multiplier;
        }

        damage = (damage * self.fighters[b].state.received_damage_multiplier).trunc();

        if skipped {
            self.fighters[b].skip_count += 1.0;
        } else {
            self.fighters[b].skip_count = 0.0;
        }

        let attack_type = if critical { types.1 } else { types.0 };
        let defense_type = if skipped {
            self.fighters[b].state.skip_variant
        } else {
            DEFENSE_TYPE_NONE
        };

        self.apply_attack(b, a, damage, skipped, attack_type, defense_type)
    }

    /// `a` hits `b`, with the attacker's class rules.
    fn attack(
        &mut self,
        a: usize,
        b: usize,
        damage: f64,
        skipped: bool,
        critical: bool,
        types: AttackTypes,
    ) -> bool {
        match self.fighters[a].class {
            DEMONHUNTER => {
                let hunter = &self.fighters[a];
                let multiplier = hunter
                    .revive_damage_min
                    .max(hunter.revive_damage - hunter.death_triggers * hunter.revive_damage_decay);

                self.attack_default(a, b, damage * multiplier, skipped, critical, types)
            }
            BARD => {
                let alive = self.attack_default(a, b, damage, skipped, critical, types);

                if self.fighters[a].special_state() {
                    let bard = &mut self.fighters[a];

                    bard.effect_counter += 1.0;

                    if bard.effect_counter >= bard.effect_reset {
                        bard.enter_state(ActiveState::Data);
                    }
                }

                alive
            }
            _ => self.attack_default(a, b, damage, skipped, critical, types),
        }
    }

    /// A normal attack.
    #[inline(always)]
    fn control_default(&mut self, a: usize, b: usize) -> bool {
        let state = self.fighters[a].state;
        let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
        let skipped = self.skip(b, SKIP_TYPE_DEFAULT);
        let critical = rng::roll(self.fighters[a].state.critical_chance);

        self.attack(a, b, damage, skipped, critical, NORMAL)
    }

    /// Assassin's turn.
    fn control_assassin(&mut self, a: usize, b: usize) -> bool {
        let state = self.fighters[a].state;
        let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
        let skipped = self.skip_uncounted(b);
        let critical = rng::roll(self.fighters[a].state.critical_chance);

        if self.attack(a, b, damage, skipped, critical, NORMAL) {
            let state = self.fighters[a].state;
            let damage = self.roll_damage(state.weapon2_min, state.weapon2_max);
            let skipped = self.skip_uncounted(b);
            let critical = rng::roll(self.fighters[a].state.critical_chance);

            self.attack(a, b, damage, skipped, critical, SECONDARY)
        } else {
            false
        }
    }

    /// Berserker's turn.
    fn control_berserker(&mut self, a: usize, b: usize) -> bool {
        let state = self.fighters[a].state;
        let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
        let skipped = self.skip_uncounted(b);
        let critical = rng::roll(self.fighters[a].state.critical_chance);

        self.attack(a, b, damage, skipped, critical, NORMAL)
    }

    /// Druid's swoop. Returns false if he or the target is dead.
    fn attack_swoop(&mut self, a: usize, b: usize) -> bool {
        let druid = &self.fighters[a];

        if druid.health <= 0.0 {
            false
        } else if !druid.special_state()
            && druid.swoop_chance > 0.0
            && rng::roll(druid.swoop_chance)
        {
            let druid = &mut self.fighters[a];
            druid.swoop_chance = clamp(
                druid.swoop_chance - druid.swoop_chance_decay,
                druid.swoop_chance_min,
                druid.swoop_chance_max,
            );

            let state = self.fighters[a].state;
            let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
            let skipped = self.skip(b, SKIP_TYPE_DEFAULT);
            let critical = rng::roll(self.fighters[a].state.critical_chance);

            let druid = &self.fighters[a];
            let state = druid.state;

            // Game bug: a critical swoop adds the swoop bonus to the crit multiplier instead of multiplying
            let multiplier = if critical && druid.critical_swoop_bug {
                (state.critical_multiplier + druid.swoop_multiplier - 1.0)
                    / state.critical_multiplier
            } else {
                druid.swoop_multiplier
            };

            self.attack(a, b, damage * multiplier, skipped, critical, SWOOP)
        } else {
            true
        }
    }

    /// Druid's turn.
    fn control_druid(&mut self, a: usize, b: usize) -> bool {
        let druid = &mut self.fighters[a];

        if druid.request_state {
            druid.request_state = false;
            druid.enter_state(ActiveState::RageState);
        } else if druid.special_state() {
            druid.enter_state(ActiveState::Data);
        }

        if !self.fighters[b].bypass_special && !self.attack_swoop(a, b) {
            return false;
        }

        self.control_default(a, b)
    }

    /// Bard's turn.
    fn control_bard(&mut self, a: usize, b: usize) -> bool {
        if !self.fighters[b].bypass_special {
            let bard = &mut self.fighters[a];

            bard.effect_round += 1.0;

            if bard.effect_round >= bard.effect_rounds {
                let roll = rng::next() * bard.brackets[2];
                let level = if roll <= bard.brackets[0] {
                    0
                } else if roll <= bard.brackets[1] {
                    1
                } else {
                    2
                };

                bard.effect_level = level as f64 + 1.0;
                bard.effect_reset = bard.effect_base_duration[level];
                bard.effect_counter = 0.0;
                bard.effect_round = 0.0;
                bard.enter_state(ActiveState::Song(level));
            }
        }

        self.control_default(a, b)
    }

    /// Paladin's turn.
    fn control_paladin(&mut self, a: usize, b: usize) -> bool {
        if !self.fighters[b].bypass_special
            && rng::roll(self.fighters[a].state.stance_change_chance)
        {
            let paladin = &mut self.fighters[a];

            paladin.stance_index += 1;

            if paladin.stance_index >= paladin.stance_count {
                paladin.stance_index = 0;
            }

            paladin.enter_state(ActiveState::Stance(paladin.stance_index));
        }

        self.control_default(a, b)
    }

    /// Necromancer minion's attack.
    fn attack_minion(&mut self, a: usize, b: usize) -> bool {
        let state = self.fighters[a].state;
        let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
        let skipped = self.skip(b, SKIP_TYPE_DEFAULT);
        let critical = rng::roll(self.fighters[a].state.critical_chance);

        self.attack(a, b, damage, skipped, critical, MINION)
    }

    /// Ends a minion turn.
    fn expire_minion(&mut self, a: usize) {
        let necromancer = &mut self.fighters[a];

        necromancer.minion_duration -= 1.0;

        if necromancer.minion_duration <= 0.0 {
            let minion = necromancer.states.minions[necromancer.minion_type];

            if rng::roll(minion.revive_chance) && necromancer.minion_revives > 0.0 {
                necromancer.minion_duration = minion.revive_duration;
                necromancer.minion_revives -= 1.0;
            } else {
                necromancer.minion = false;
                necromancer.enter_state(ActiveState::Data);
            }
        }
    }

    /// Necromancer's turn.
    fn control_necromancer(&mut self, a: usize, b: usize) -> bool {
        if self.fighters[b].bypass_special {
            self.control_default(a, b)
        } else if self.fighters[a].minion {
            self.fighters[a].enter_state(ActiveState::Data);

            if self.control_default(a, b) {
                let necromancer = &mut self.fighters[a];
                necromancer.enter_state(ActiveState::Minion(necromancer.minion_type));

                let alive = self.attack_minion(a, b);
                self.expire_minion(a);

                alive
            } else {
                false
            }
        } else if rng::roll(self.fighters[a].summon_chance) {
            self.rage();

            let kind = (rng::next() * 3.0).trunc() as usize;
            let necromancer = &mut self.fighters[a];
            let minion = necromancer.states.minions[kind];

            necromancer.minion = true;
            necromancer.minion_type = kind;
            necromancer.minion_duration = minion.duration;
            necromancer.minion_revives = minion.revive_count;

            self.log_round(a, b, 0.0, ATTACK_TYPE_MINION_SUMMON, DEFENSE_TYPE_NONE);

            self.fighters[a].enter_state(ActiveState::Minion(kind));

            if self.fighters[a].summon_immediate_attack {
                let alive = self.attack_minion(a, b);
                self.expire_minion(a);

                alive
            } else {
                true
            }
        } else {
            self.control_default(a, b)
        }
    }

    /// Ends a poison round.
    fn expire_tincture(&mut self, a: usize) {
        let doctor = &mut self.fighters[a];

        doctor.tincture_duration -= 1.0;

        if doctor.tincture_duration <= 0.0 {
            doctor.tincture = false;
            doctor.enter_state(ActiveState::Data);
        } else {
            doctor.tincture = true;
            doctor.tincture_round = doctor.tincture_duration as usize - 1;
            doctor.enter_state(ActiveState::TinctureRound(doctor.tincture_round));
        }
    }

    /// Plague Doctor's turn.
    fn control_plague_doctor(&mut self, a: usize, b: usize) -> bool {
        if self.fighters[b].bypass_special {
            self.control_default(a, b)
        } else if self.fighters[a].tincture {
            // Poison
            let doctor = &mut self.fighters[a];
            doctor.enter_state(ActiveState::TinctureRound(doctor.tincture_round));

            let state = self.fighters[a].state;
            let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
            let critical = rng::roll(self.fighters[a].state.critical_chance);

            if !self.attack(a, b, damage, false, critical, TINCTURE) {
                return false;
            }

            self.fighters[a].enter_state(ActiveState::Data);

            let alive = self.control_default(a, b);
            self.expire_tincture(a);

            alive
        } else if rng::roll(self.fighters[a].tincture_chance) {
            // Throw
            self.fighters[a].enter_state(ActiveState::TinctureThrowState);

            let state = self.fighters[a].state;
            let skipped = self.skip(b, SKIP_TYPE_DEFAULT);

            if !skipped {
                let doctor = &mut self.fighters[a];

                doctor.tincture_duration = 3.0;
                doctor.tincture = true;
                doctor.tincture_round = 2;
            }

            let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
            let critical = rng::roll(self.fighters[a].state.critical_chance);
            let alive = self.attack(a, b, damage, skipped, critical, TINCTURE_THROW);

            let doctor = &mut self.fighters[a];

            if doctor.tincture {
                doctor.enter_state(ActiveState::TinctureRound(doctor.tincture_round));
            }

            alive
        } else {
            self.control_default(a, b)
        }
    }

    /// Blood Weaver's turn.
    fn control_blood_weaver(&mut self, a: usize, b: usize) -> bool {
        if self.fighters[b].bypass_special {
            self.control_default(a, b)
        } else if self.fighters[a].seal_used {
            if rng::roll(self.fighters[a].scythe_chance) {
                // Scythe
                self.fighters[a].enter_state(ActiveState::ScytheState);

                let state = self.fighters[a].state;
                let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
                let skipped = self.skip(b, SKIP_TYPE_DEFAULT);
                let critical = rng::roll(self.fighters[a].state.critical_chance);
                let alive = self.attack(a, b, damage, skipped, critical, SCYTHE);

                self.fighters[a].enter_state(ActiveState::RevivedState);

                alive
            } else {
                self.control_default(a, b)
            }
        } else if !self.control_default(a, b) {
            false
        } else if rng::roll(self.fighters[a].dagger_chance) {
            // Dagger
            let weaver = &mut self.fighters[a];

            weaver.health = (weaver.health * (1.0 - weaver.dagger_sacrifice)).trunc();
            weaver.pact_stacks = weaver.pact_stacks_max.min(weaver.pact_stacks + 1.0);
            weaver.enter_state(ActiveState::DaggerState);

            let state = self.fighters[a].state;
            let damage = self.roll_damage(state.weapon1_min, state.weapon1_max);
            let skipped = self.skip(b, SKIP_TYPE_DEFAULT);
            let critical = rng::roll(self.fighters[a].state.critical_chance);
            let alive = self.attack(a, b, damage, skipped, critical, DAGGER);

            self.fighters[a].enter_state(ActiveState::Data);

            alive
        } else {
            true
        }
    }

    /// `a` takes its turn against `b`. Returns whether `b` is still alive.
    fn control(&mut self, a: usize, b: usize) -> bool {
        match self.fighters[a].class {
            ASSASSIN => self.control_assassin(a, b),
            BERSERKER => self.control_berserker(a, b),
            DRUID => self.control_druid(a, b),
            BARD => self.control_bard(a, b),
            PALADIN => self.control_paladin(a, b),
            NECROMANCER => self.control_necromancer(a, b),
            PLAGUEDOCTOR => self.control_plague_doctor(a, b),
            BLOODWEAVER => self.control_blood_weaver(a, b),
            _ => self.control_default(a, b),
        }
    }

    /// Battlemage's fireball before the first turn.
    fn before(&mut self, a: usize, b: usize) {
        if self.fighters[a].class == BATTLEMAGE {
            self.rage();

            let damage = self.fighters[a].fireball;
            let defense_type = if damage == 0.0 {
                DEFENSE_TYPE_MAGIC
            } else {
                DEFENSE_TYPE_NONE
            };

            self.apply_attack(b, a, damage, false, ATTACK_TYPE_FIREBALL, defense_type);
        }
    }

    /// One fight between fighters `a` and `b`. Returns true if the survivor has index 0.
    pub fn fight(&mut self, mut a: usize, mut b: usize) -> bool {
        self.fighters[a].reset();
        self.fighters[b].reset();

        self.turn = 0.0;

        if let Some(logs) = self.logs.as_mut() {
            logs.push(FightLog {
                a,
                b,
                health_a: self.fighters[a].health,
                health_b: self.fighters[b].health,
                rounds: Vec::new(),
            });
        }

        let swap = if self.fighters[a].attack_first == self.fighters[b].attack_first {
            rng::roll(0.5)
        } else {
            self.fighters[b].attack_first
        };

        if swap {
            core::mem::swap(&mut a, &mut b);
        }

        self.before(a, b);
        self.before(b, a);

        while self.fighters[a].health > 0.0 && self.fighters[b].health > 0.0 {
            if self.skip(b, SKIP_TYPE_CONTROL) {
                self.rage();
            } else {
                self.control(a, b);
            }

            core::mem::swap(&mut a, &mut b);
        }

        let survivor = if self.fighters[a].health > 0.0 { a } else { b };

        self.fighters[survivor].index == 0.0
    }
}
