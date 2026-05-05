import test from 'node:test';
import assert from 'node:assert/strict';
import { createScreenWakeLockController } from '../screen-wake-lock.js';

class FakeDocument {
  constructor() {
    this.visibilityState = 'visible';
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ type });
    }
  }
}

function createWakeLockEnvironment() {
  const requests = [];
  const releases = [];
  const sentinels = [];
  const document = new FakeDocument();
  const navigator = {
    wakeLock: {
      async request(type) {
        requests.push(type);
        const sentinel = {
          released: false,
          listeners: new Map(),
          addEventListener(eventType, handler) {
            this.listeners.set(eventType, handler);
          },
          async release() {
            this.released = true;
            releases.push(type);
            this.listeners.get('release')?.();
          },
        };
        sentinels.push(sentinel);
        return sentinel;
      },
    },
  };

  return { document, navigator, requests, releases, sentinels };
}

test('createScreenWakeLockController 在支援 Wake Lock API 時，request 會要求 screen wake lock', async () => {
  const env = createWakeLockEnvironment();
  const controller = createScreenWakeLockController({
    navigator: env.navigator,
    document: env.document,
  });

  const result = await controller.request();

  assert.equal(result, true);
  assert.deepEqual(env.requests, ['screen']);
  assert.equal(controller.isActive(), true);
});

test('createScreenWakeLockController release 會釋放目前的 screen wake lock', async () => {
  const env = createWakeLockEnvironment();
  const controller = createScreenWakeLockController({
    navigator: env.navigator,
    document: env.document,
  });

  await controller.request();
  await controller.release();

  assert.deepEqual(env.releases, ['screen']);
  assert.equal(env.sentinels[0].released, true);
  assert.equal(controller.isActive(), false);
});

test('createScreenWakeLockController 在頁面回到可見且仍需要保持喚醒時，會重新取得 wake lock', async () => {
  const env = createWakeLockEnvironment();
  const controller = createScreenWakeLockController({
    navigator: env.navigator,
    document: env.document,
  });

  await controller.request();
  env.sentinels[0].listeners.get('release')?.();
  assert.equal(controller.isActive(), false);

  env.document.visibilityState = 'visible';
  env.document.dispatch('visibilitychange');
  await Promise.resolve();

  assert.deepEqual(env.requests, ['screen', 'screen']);
  assert.equal(controller.isActive(), true);
});

test('createScreenWakeLockController 在不支援 Wake Lock API 時不會丟錯，並回傳 false', async () => {
  const controller = createScreenWakeLockController({
    navigator: {},
    document: new FakeDocument(),
  });

  const result = await controller.request();

  assert.equal(result, false);
  assert.equal(controller.isActive(), false);
});
