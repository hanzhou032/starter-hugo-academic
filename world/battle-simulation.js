// Fixed-step combat with a seeded damage stream, independent of render timing.
export const COMBAT = Object.freeze({ reach: 1.6, spacing: 1.5, speed: 1.42, baseHealth: 600, collapseDuration: 3.6 });
export function createBattleSimulation({ spawnDistances = [13, 13], seed = 0x5eeda11, baseHealth = COMBAT.baseHealth, collapseDuration = COMBAT.collapseDuration } = {}) {
  let time = 0, accumulator = 0, wave = 1, nextWave = 0, nextId = 0, phase = 'playing', endsAt = 0;
  let randomState = seed >>> 0;
  const random = () => { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 4294967296; };
  const units = [], events = [], pending = [0, 0], reinforced = [0, 0], laneCounters = [0, 0];
  const bases = [0, 1].map(side => ({ side, health: baseHealth, maxHealth: baseHealth, destroyedAt: null, hitAt: -100 }));
  const home = side => side ? spawnDistances[1] : -spawnDistances[0];
  const direction = side => side ? -1 : 1;
  const living = u => u.health > 0 && u.state !== 'dead';
  const nearExit = d => Math.min(d - home(0), home(1) - d) < 4.8;
  const step = 1 / 60;

  function spawn(side, offset = 0) {
    const lane = laneCounters[side]++ % 3, damage = [[18, 30], [16, 28], [20, 32]][lane];
    const u = { id: nextId++, side, lane, lateral: (lane - 1) * 1.15, distance: home(side) + direction(side) * offset,
      state: 'marching', health: 100, maxHealth: 100, damageMin: damage[0], damageMax: damage[1], lastDamage: null,
      age: 0, attackAge: 0, attackDuration: 1.35 + lane * .12, struck: false, target: null, targetBase: null, hitAge: 10 };
    units.push(u); events.push({ type: 'spawn', id: u.id, side, time }); return u;
  }
  function spawnWave() {
    for (const side of [0, 1]) for (const offset of [0, 1.6, 3.2]) spawn(side, offset);
    events.push({ type: 'wave', wave, time });
  }
  function reinforce(side) {
    if (phase !== 'playing' || (side !== 0 && side !== 1)) return false;
    pending[side]++; reinforced[side]++;
    releaseReinforcements();
    return true;
  }
  function releaseReinforcements() {
    for (const side of [0, 1]) {
      // Every click is kept. Crowded exits queue recruits instead of overlapping
      // models or creating an unbounded number of expensive rendered actors.
      if (!pending[side] || units.filter(u => living(u) && u.side === side).length >= 18) continue;
      if (units.some(u => living(u) && Math.abs(u.distance - home(side)) < COMBAT.spacing + .05)) continue;
      spawn(side); pending[side]--;
    }
  }
  function setAction(u, state, target = null, targetBase = null) {
    if (u.state !== state || u.target !== target || u.targetBase !== targetBase) {
      u.attackAge = 0; u.struck = false; u.age = 0;
    }
    u.state = state; u.target = target; u.targetBase = targetBase;
  }
  function tick() {
    time += step;
    if (phase === 'ended') return;
    if (phase === 'collapsing') {
      if (time + 1e-9 >= endsAt) { phase = 'ended'; events.push({ type: 'game-over', fallen: bases.filter(b => b.health === 0).map(b => b.side), time }); }
      return;
    }
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i]; u.age += step; u.hitAge += step;
      if (u.state === 'dying' && u.age >= 2.6) { units.splice(i, 1); events.push({ type: 'despawn', id: u.id, time }); }
    }
    releaseReinforcements();
    if (!units.length && !pending.some(Boolean)) {
      if (!nextWave) nextWave = time + 2.4;
      if (time >= nextWave) { wave++; nextWave = 0; spawnWave(); }
    } else nextWave = 0;

    // Resolve movements from the same old positions, so iteration order cannot
    // let opponents walk through each other or allies overtake a blocked queue.
    const alive = units.filter(living), movement = [];
    for (const u of alive) {
      const sign = direction(u.side), baseGoal = home(1 - u.side) - sign * COMBAT.reach;
      const enemies = alive.filter(v => v.side !== u.side && (v.lane === u.lane || nearExit(u.distance) || nearExit(v.distance)) && (v.distance - u.distance) * sign >= -.001)
        .sort((a, b) => Math.abs(a.distance - u.distance) - Math.abs(b.distance - u.distance));
      const enemy = enemies[0], gap = enemy ? (enemy.distance - u.distance) * sign : Infinity;
      if (gap <= COMBAT.reach + .001) {
        movement.push({ u, travel: 0, state: 'fighting', target: enemy.id }); continue;
      }
      let travel = Math.min(COMBAT.speed * step, Math.max(0, (baseGoal - u.distance) * sign), Math.max(0, (gap - COMBAT.reach) * .5));
      for (const friend of alive) {
        if (friend === u || friend.side !== u.side) continue;
        if (friend.lane !== u.lane && !nearExit(u.distance + sign * 1.55) && !nearExit(friend.distance)) continue;
        const ahead = (friend.distance - u.distance) * sign;
        if (ahead > .001 || (Math.abs(ahead) <= .001 && friend.id < u.id)) travel = Math.min(travel, Math.max(0, ahead - COMBAT.spacing));
      }
      const atBase = (baseGoal - u.distance) * sign <= .001;
      movement.push({ u, travel, state: atBase ? 'sieging' : travel > 0 ? 'marching' : 'waiting', targetBase: atBase ? 1 - u.side : null });
    }
    for (const { u, travel, state, target = null, targetBase = null } of movement) {
      u.distance += direction(u.side) * travel; setAction(u, state, target, targetBase);
    }

    // Draw once at the impact frame of every attack, including attacks on bases.
    // Collect simultaneous hits before resolving any deaths or a fallen base.
    const strikes = [];
    for (const u of alive) {
      if (u.state !== 'fighting' && u.state !== 'sieging') continue;
      const target = u.targetBase === null ? alive.find(v => v.id === u.target) : bases[u.targetBase];
      if (!target || target.health <= 0) continue;
      u.attackAge += step;
      if (!u.struck && u.attackAge >= .56) {
        u.struck = true;
        const damage = u.damageMin + Math.floor(random() * (u.damageMax - u.damageMin + 1));
        u.lastDamage = damage; strikes.push({ u, target, damage, base: u.targetBase !== null });
      }
      if (u.attackAge >= u.attackDuration) { u.attackAge -= u.attackDuration; u.struck = false; }
    }
    for (const { u, target, damage, base } of strikes) {
      target.health = Math.max(0, target.health - damage);
      if (base) target.hitAt = time; else target.hitAge = 0;
      events.push({ type: base ? 'base-hit' : 'hit', attacker: u.id, target: base ? target.side : target.id, damage, health: target.health, time });
    }
    for (const u of alive) if (u.health === 0) {
      setAction(u, 'dying'); events.push({ type: 'death', id: u.id, time });
    }
    for (const base of bases) if (base.health === 0 && base.destroyedAt === null) {
      base.destroyedAt = time; phase = 'collapsing'; endsAt = time + collapseDuration;
      events.push({ type: 'base-destroyed', side: base.side, time });
    }
  }
  spawnWave();
  return {
    units, reinforce,
    advance(delta) { accumulator += Math.min(Math.max(delta, 0), .25); while (accumulator + 1e-9 >= step) { tick(); accumulator -= step; } },
    drainEvents() { return events.splice(0); },
    snapshot() { return { time, wave, nextWave, phase, endsAt, pending: [...pending], reinforced: [...reinforced], bases: bases.map(b => ({ ...b })), units: units.map(u => ({ ...u })) }; },
  };
}
