import test from 'node:test';
import assert from 'node:assert/strict';
import { createLane, BRIDGE } from '../lane.js';
import { createBattleSimulation, COMBAT } from '../battle-simulation.js';

test('bridge formation, heading and feet share the deck centerline', () => {
  const route = createLane((x, z) => 2.2 + x * .025 - z * .02);
  for (let distance = -BRIDGE.halfLength; distance <= BRIDGE.halfLength; distance += .025) {
    for (const lateral of [-1.15, 0, 1.15]) {
      const p = route.sample(distance, lateral);
      const localX = p.x * Math.cos(BRIDGE.angle) - p.z * Math.sin(BRIDGE.angle);
      const localZ = p.x * Math.sin(BRIDGE.angle) + p.z * Math.cos(BRIDGE.angle);
      assert.ok(Math.abs(localX - distance) < 1e-8);
      assert.ok(Math.abs(localZ - lateral) < 1e-8);
      assert.ok(Math.abs(localZ) + .7 < BRIDGE.width / 2 - .1, 'head and feet fit inside the parapets');
      assert.ok(Math.abs(p.dx - Math.cos(BRIDGE.angle)) < 1e-8);
      assert.ok(Math.abs(p.dz + Math.sin(BRIDGE.angle)) < 1e-8);
      assert.equal(route.surface(distance, lateral), route.bridgeY(distance));
    }
  }
  for (const sign of [-1, 1]) {
    const join = sign * BRIDGE.halfLength;
    assert.ok(Math.abs(route.surface(join - .0001) - route.surface(join + .0001)) < .001, 'no jump at either bank');
  }
});

const route = createLane();
const makeBattle = options => createBattleSimulation({ spawnDistances: [-route.min, route.max], ...options });

// Use the actual exit distances, not an imaginary symmetric straight lane.
test('every strike draws from its attacker’s range and resolves real health loss', () => {
  const sim = makeBattle({ seed: 2 }), events = [], attackers = new Map(), health = new Map();
  const bases = [600, 600];
  for (let frame = 0; frame < 60 * 90; frame++) {
    for (const unit of sim.snapshot().units) {
      attackers.set(unit.id, unit);
      if (!health.has(unit.id)) health.set(unit.id, unit.health);
    }
    sim.advance(1 / 60);
    for (const event of sim.drainEvents()) {
      if (event.type === 'hit' || event.type === 'base-hit') {
        const attacker = attackers.get(event.attacker);
        assert.ok(attacker.health > 0, 'dead units never start an attack');
        assert.ok(Number.isInteger(event.damage));
        assert.ok(event.rolledDamage >= attacker.damageMin && event.rolledDamage <= attacker.damageMax);
        assert.equal(event.damage, event.rolledDamage * (event.critical ? 2 : 1));
        const previous = event.type === 'hit' ? health.get(event.target) : bases[event.target];
        assert.equal(event.health, Math.max(0, previous - event.damage));
        if (event.type === 'hit') health.set(event.target, event.health); else bases[event.target] = event.health;
      }
      events.push(event);
    }
    const state = sim.snapshot();
    for (const unit of state.units) {
      assert.ok(unit.distance >= route.min && unit.distance <= route.max);
      assert.ok(unit.health >= 0 && unit.health <= unit.maxHealth);
      if (unit.state === 'dying') assert.equal(unit.health, 0);
      if (unit.state === 'fighting') {
        const target = state.units.find(u => u.id === unit.target);
        assert.ok(target && target.side !== unit.side);
        assert.ok(Math.abs(target.distance - unit.distance) <= 1.602);
      }
    }
    if (state.phase === 'ended') break;
  }
  const strikes = events.filter(e => e.type === 'hit' || e.type === 'base-hit');
  assert.ok(strikes.some(e => e.critical) && strikes.some(e => !e.critical));
  assert.ok(new Set(strikes.map(e => e.damage)).size >= 8, 'damage varies between attacks');
  assert.ok(events.some(e => e.type === 'despawn'), 'fallen characters are removed');
  assert.ok(events.some(e => e.type === 'base-hit'), 'survivors attack the opposing base');
  const deathIds = events.filter(e => e.type === 'death').map(e => e.id);
  assert.equal(deathIds.length, new Set(deathIds).size, 'death only happens once per unit');
});

test('rapid reinforcements are retained and leave a clear, bounded exit queue', () => {
  const sim = makeBattle({ seed: 23, baseHealth: 100000 }), recruited = [35, 29], spawned = [0, 0];
  for (const side of [0, 1]) for (let n = 0; n < recruited[side]; n++) assert.equal(sim.reinforce(side), true);
  assert.equal(sim.reinforce(2), false);
  for (let frame = 0; frame < 60 * 85; frame++) {
    sim.advance(1 / 60);
    for (const event of sim.drainEvents()) if (event.type === 'spawn') spawned[event.side]++;
    const state = sim.snapshot();
    assert.deepEqual(state.reinforced, recruited);
    for (const side of [0, 1]) {
      assert.equal(spawned[side] - state.wave * 3 + state.pending[side], recruited[side], 'scheduled groups and clicks are either spawned or queued');
      const living = state.units.filter(u => u.side === side && u.health > 0);
      assert.ok(living.length <= 18);
      const home = side ? route.max : route.min;
      assert.ok(living.filter(u => Math.abs(u.distance - home) < 1.49).length <= 1, 'one recruit at a time clears the exit');
      for (const u of living) for (const v of living) if (u.id < v.id && u.lane === v.lane) {
        assert.ok(Math.abs(u.distance - v.distance) >= 1.499, 'allies do not overlap in the same lane');
      }
    }
    if (!state.pending.some(Boolean)) break;
  }
  assert.deepEqual(sim.snapshot().pending, [0, 0]);
});

test('simultaneous lethal hits resolve together and the next scheduled group returns', () => {
  const sim = makeBattle({ seed: 1 });
  for (const unit of sim.units) unit.health = 1;
  const events = [];
  for (let frame = 0; frame < 60 * 25; frame++) { sim.advance(1 / 60); events.push(...sim.drainEvents()); }
  const deaths = events.filter(e => e.type === 'death');
  assert.equal(deaths.length, 6);
  assert.ok(deaths.some(a => deaths.some(b => a.id !== b.id && a.time === b.time)), 'opponents can die in the same impact step');
  assert.equal(sim.snapshot().wave, 2);
  assert.equal(new Set(events.filter(e => e.type === 'spawn').map(e => e.id)).size, 12, 'respawns have fresh IDs');
});

test('base collapse is clamped, completes once, and ends combat across different seeds', () => {
  for (const seed of [1, 2, 3, 100, 999]) {
    const sim = makeBattle({ seed }), events = [];
    for (let frame = 0; frame < 60 * 600; frame++) { sim.advance(1 / 60); events.push(...sim.drainEvents()); if (sim.snapshot().phase === 'ended') break; }
    const state = sim.snapshot(), destruction = events.filter(e => e.type === 'base-destroyed'), endings = events.filter(e => e.type === 'game-over');
    assert.equal(state.phase, 'ended');
    assert.equal(destruction.length, 1); assert.equal(endings.length, 1);
    assert.ok(endings[0].time - destruction[0].time >= 3.6 - 1e-8, 'banner waits for collapse');
    assert.equal(state.bases[destruction[0].side].health, 0);
    assert.equal(sim.reinforce(0), false); assert.equal(sim.reinforce(1), false);
    for (let i = 0; i < 600; i++) sim.advance(1 / 60);
    assert.deepEqual(sim.snapshot().units, state.units); assert.deepEqual(sim.snapshot().bases, state.bases);
    assert.deepEqual(sim.drainEvents(), []);
  }
});

test('three units per base are scheduled every 20 seconds while survivors remain', () => {
  const sim = makeBattle({ seed: 11, baseHealth: 100000 }), events = [];
  sim.reinforce(0); sim.reinforce(1);
  for (let frame = 0; frame < 60 * 81; frame++) {
    sim.advance(1 / 60); events.push(...sim.drainEvents());
    const state = sim.snapshot();
    assert.equal(state.nextWave, state.wave * COMBAT.waveInterval);
    for (const side of [0, 1]) {
      const spawns = events.filter(e => e.type === 'spawn' && e.side === side).length;
      assert.equal(spawns + state.pending[side], state.wave * 3 + 1);
    }
  }
  const waves = events.filter(e => e.type === 'wave');
  assert.equal(waves.length, 5);
  waves.forEach((wave, i) => assert.ok(Math.abs(wave.time - i * 20) < 1e-8));
  assert.deepEqual(sim.snapshot().reinforced, [1, 1], 'automatic groups are separate from click counts');
});

test('critical strikes are uncommon independent rolls and work against both targets', () => {
  const hits = [];
  for (let seed = 1; seed <= 80; seed++) {
    const sim = makeBattle({ seed });
    for (let frame = 0; frame < 60 * 80; frame++) { sim.advance(1 / 60); hits.push(...sim.drainEvents().filter(e => e.type === 'hit' || e.type === 'base-hit')); }
  }
  const critical = hits.filter(e => e.critical), rate = critical.length / hits.length;
  assert.ok(rate > .08 && rate < .12, `expected about 10%, observed ${rate}`);
  assert.ok(critical.some(e => e.type === 'hit') && critical.some(e => e.type === 'base-hit'));
  for (const hit of hits) assert.equal(hit.damage, hit.rolledDamage * (hit.critical ? COMBAT.criticalMultiplier : 1));
});

test('simulation is independent of display refresh rate', () => {
  const a = makeBattle({ seed: 14 }), b = makeBattle({ seed: 14 }), c = makeBattle({ seed: 14 });
  for (const sim of [a, b, c]) { sim.reinforce(0); sim.reinforce(1); sim.reinforce(0); }
  for (let i = 0; i < 60 * 90; i++) a.advance(1 / 60);
  for (let i = 0; i < 30 * 90; i++) b.advance(1 / 30);
  for (let i = 0; i < 144 * 90; i++) c.advance(1 / 144);
  assert.deepEqual(a.snapshot(), b.snapshot()); assert.deepEqual(a.snapshot(), c.snapshot());
  const events = a.drainEvents(); assert.deepEqual(events, b.drainEvents()); assert.deepEqual(events, c.drainEvents());
});
