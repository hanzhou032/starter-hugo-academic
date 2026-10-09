import test from 'node:test';
import assert from 'node:assert/strict';
import { createLane, BRIDGE } from '../lane.js';
import { createBattleSimulation } from '../battle-simulation.js';

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

test('waves meet at mid, exchange real damage, die, and return without passing opponents', () => {
  const sim = createBattleSimulation();
  const events = [];
  let previous = sim.snapshot();
  for (let i = 0; i < 60 * 120; i++) {
    sim.advance(1 / 60);
    const now = sim.snapshot();
    for (const u of now.units) {
      assert.ok(u.health >= 0 && u.health <= u.maxHealth);
      assert.ok(u.side === 0 ? u.distance <= -.76 : u.distance >= .76, 'sides never walk through one another');
      if (u.state === 'fighting') {
        const enemy = now.units[(1 - u.side) * 3 + u.lane];
        assert.equal(enemy.state, 'fighting');
        assert.ok(Math.abs(u.distance - enemy.distance) <= 1.521, 'enemy is in shovel range');
      }
      if (u.state === 'dying' || u.state === 'dead') assert.equal(u.health, 0);
    }
    for (const event of sim.drainEvents()) {
      if (event.type === 'hit') {
        assert.equal(previous.units[event.attacker].state, 'fighting', 'only living fighters attack');
        assert.ok(event.health < previous.units[event.target].health, 'a strike removes health');
      }
      events.push(event);
    }
    previous = now;
  }
  assert.ok(events.filter(e => e.type === 'wave').length >= 5);
  for (let id = 0; id < 6; id++) assert.ok(events.filter(e => e.type === 'death' && e.id === id).length >= 4, 'every Meepo has a complete lifecycle');
  const firstWaveEnd = events.findIndex(e => e.type === 'wave' && e.wave === 2);
  assert.equal(events.slice(0, firstWaveEnd).filter(e => e.type === 'death').length, 6);
});

test('simulation is independent of display refresh rate', () => {
  const a = createBattleSimulation(), b = createBattleSimulation(), c = createBattleSimulation();
  for (let i = 0; i < 60 * 40; i++) a.advance(1 / 60);
  for (let i = 0; i < 30 * 40; i++) b.advance(1 / 30);
  for (let i = 0; i < 144 * 40; i++) c.advance(1 / 144);
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.deepEqual(a.snapshot(), c.snapshot());
});
