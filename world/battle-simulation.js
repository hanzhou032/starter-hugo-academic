// Deterministic, fixed-step melee simulation. Rendering never decides damage.
export function createBattleSimulation({ spawnDistances = [13, 13] } = {}) {
  let time = 0, accumulator = 0, wave = 0, nextWave = 0;
  const units = [], events = [];
  const step = 1 / 60;
  function spawn() {
    wave++;
    units.length = 0;
    for (let side = 0; side < 2; side++) for (let lane = 0; lane < 3; lane++) {
      const sign = side === 0 ? -1 : 1;
      units.push({ id: side * 3 + lane, side, lane, lateral: (lane - 1) * 1.15,
        distance: sign * (spawnDistances[side] - [1.25, 2.5, 0][lane]), destination: sign * .76,
        state: 'marching', health: 100, maxHealth: 100, age: 0,
        attackAge: 0, attackDuration: 1.35 + lane * .12, struck: false, hitAge: 10, deaths: 0 });
    }
    events.push({ type: 'wave', wave, time });
  }
  function tick() {
    time += step;
    if (!units.length || (nextWave && time >= nextWave)) { nextWave = 0; spawn(); }
    for (const u of units) {
      u.age += step; u.hitAge += step;
      if (u.state === 'marching') {
        const travel = 1.42 * step;
        const remaining = Math.abs(u.destination - u.distance);
        u.distance += Math.sign(u.destination - u.distance) * Math.min(travel, remaining);
        if (remaining <= travel) { u.state = 'waiting'; u.age = 0; }
      } else if (u.state === 'dying' && u.age >= 2.6) { u.state = 'dead'; u.age = 0; }
    }
    for (let lane = 0; lane < 3; lane++) {
      const a = units[lane], b = units[lane + 3];
      if (a.state === 'waiting' && b.state === 'waiting') {
        for (const u of [a, b]) { u.state = 'fighting'; u.age = 0; }
        events.push({ type: 'engage', lane, time });
      }
    }
    // Collect every strike first: a simultaneous lethal exchange can defeat both Meepos.
    const strikes = [];
    for (const u of units) {
      if (u.state !== 'fighting') continue;
      const target = units[(1 - u.side) * 3 + u.lane];
      if (target.state !== 'fighting') continue;
      u.attackAge += step;
      if (!u.struck && u.attackAge >= .56) {
        u.struck = true;
        strikes.push({ attacker: u, target, damage: u.lane === 2 ? 20 : 25 });
      }
      if (u.attackAge >= u.attackDuration) { u.attackAge -= u.attackDuration; u.struck = false; }
    }
    for (const { attacker, target, damage } of strikes) {
      target.health = Math.max(0, target.health - damage); target.hitAge = 0;
      events.push({ type: 'hit', attacker: attacker.id, target: target.id, time, health: target.health });
    }
    for (const u of units) if (u.health === 0 && u.state === 'fighting') {
      u.state = 'dying'; u.age = 0; u.deaths++;
      events.push({ type: 'death', id: u.id, time });
    }
    if (!nextWave && units.every(u => u.state === 'dead')) nextWave = time + 2.4;
  }
  spawn();
  return {
    units,
    advance(delta) { accumulator += Math.min(Math.max(delta, 0), .25); while (accumulator + 1e-9 >= step) { tick(); accumulator -= step; } },
    drainEvents() { return events.splice(0); },
    snapshot() { return { time, wave, nextWave, units: units.map(u => ({ ...u })) }; },
  };
}
