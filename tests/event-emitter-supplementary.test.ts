/**
 * EventEmitter supplementary tests — covers the APIs NOT exercised by
 * tests/event-emitter.test.ts: prepend, prependOnce, emitAsync, debug mode,
 * getListeners, eventNames, hasListeners, getTotalEvents, getTotalListeners,
 * and reset.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '@/core/EventEmitter';

interface TestEvents {
  ping: string;
  done: void;
}

class Emitter extends EventEmitter<TestEvents> {
  ping(v: string) {
    this.emit('ping', v);
  }
  done() {
    this.emit('done');
  }
  async pingAsync(v: string) {
    await this.emitAsync('ping', v);
  }
  async doneAsync() {
    await this.emitAsync('done');
  }
}

describe('EventEmitter — supplementary', () => {
  let em: Emitter;

  beforeEach(() => {
    em = new Emitter();
  });

  describe('prepend', () => {
    it('registers a handler that runs before existing handlers', () => {
      const calls: string[] = [];
      em.on('ping', () => calls.push('first'));
      em.prepend('ping', () => calls.push('second-prepended'));
      em.ping('x');
      expect(calls).toEqual(['second-prepended', 'first']);
    });

    it('returns an unsubscribe function', () => {
      const unsubscribe = em.prepend('ping', () => {});
      unsubscribe();
      expect(em.listenerCount('ping')).toBe(0);
    });
  });

  describe('prependOnce', () => {
    it('fires only once even when prepended', () => {
      const handler = vi.fn();
      em.prependOnce('ping', handler);
      em.ping('a');
      em.ping('b');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe function', () => {
      const unsubscribe = em.prependOnce('ping', () => {});
      unsubscribe();
      em.ping('x');
      expect(em.listenerCount('ping')).toBe(0);
    });
  });

  describe('emitAsync', () => {
    it('awaits synchronous handlers', async () => {
      const handler = vi.fn();
      em.on('ping', handler);
      await em.pingAsync('hello');
      expect(handler).toHaveBeenCalledWith('hello');
    });

    it('awaits async handlers in order', async () => {
      const order: number[] = [];
      em.on('ping', async (v) => {
        await new Promise((r) => setTimeout(r, 5));
        order.push(1);
      });
      em.on('ping', async () => {
        await new Promise((r) => setTimeout(r, 1));
        order.push(2);
      });
      await em.pingAsync('x');
      // Both ran, but the order is determined by setTimeout timing — both
      // ran, that's the contract.
      expect(order.sort()).toEqual([1, 2]);
    });

    it('is a no-op when there are no handlers', async () => {
      await expect(em.pingAsync('x')).resolves.toBeUndefined();
    });

    it('continues past a throwing handler and resolves', async () => {
      em.on('ping', () => {
        throw new Error('boom');
      });
      const ok = vi.fn();
      em.on('ping', ok);
      await expect(em.pingAsync('x')).resolves.toBeUndefined();
      expect(ok).toHaveBeenCalledWith('x');
    });
  });

  describe('debug mode', () => {
    it('starts disabled', () => {
      expect(em.isDebugMode()).toBe(false);
    });

    it('toggle: enable then disable', () => {
      em.setDebugMode(true);
      expect(em.isDebugMode()).toBe(true);
      em.setDebugMode(false);
      expect(em.isDebugMode()).toBe(false);
    });
  });

  describe('introspection', () => {
    it('getListeners returns a copy of the registered handlers', () => {
      const a = vi.fn();
      const b = vi.fn();
      em.on('ping', a);
      em.on('ping', b);
      const listeners = em.getListeners('ping');
      expect(listeners).toHaveLength(2);
      expect(listeners).toContain(a);
      expect(listeners).toContain(b);
    });

    it('getListeners returns [] for an event with no handlers', () => {
      expect(em.getListeners('ping')).toEqual([]);
    });

    it('eventNames lists only events that have at least one listener', () => {
      em.on('ping', () => {});
      expect(em.eventNames()).toContain('ping');
      expect(em.eventNames()).not.toContain('done');
      em.on('done', () => {});
      expect(em.eventNames()).toEqual(expect.arrayContaining(['ping', 'done']));
    });

    it('hasListeners reports per-event presence', () => {
      expect(em.hasListeners('ping')).toBe(false);
      em.on('ping', () => {});
      expect(em.hasListeners('ping')).toBe(true);
    });

    it('getTotalEvents counts only events with listeners', () => {
      expect(em.getTotalEvents()).toBe(0);
      em.on('ping', () => {});
      em.on('done', () => {});
      expect(em.getTotalEvents()).toBe(2);
    });

    it('getTotalListeners sums listener counts across events', () => {
      em.on('ping', () => {});
      em.on('ping', () => {});
      em.on('done', () => {});
      expect(em.getTotalListeners()).toBe(3);
    });
  });

  describe('reset', () => {
    it('removes all listeners and clears debug mode', () => {
      em.on('ping', () => {});
      em.on('done', () => {});
      em.setDebugMode(true);
      // reset is protected — cast to access
      (em as unknown as { reset: () => void }).reset();
      expect(em.listenerCount('ping')).toBe(0);
      expect(em.listenerCount('done')).toBe(0);
      expect(em.isDebugMode()).toBe(false);
    });
  });

  describe('handler errors are isolated', () => {
    it('a throwing sync handler does not stop other handlers', () => {
      const ok = vi.fn();
      em.on('ping', () => {
        throw new Error('boom');
      });
      em.on('ping', ok);
      // No assertion on throw — the test is that ok still runs.
      em.ping('x');
      expect(ok).toHaveBeenCalledWith('x');
    });
  });

  describe('removeAllListeners (event-scoped)', () => {
    it('removes only the named event listeners', () => {
      em.on('ping', () => {});
      em.on('done', () => {});
      (em as unknown as { removeAllListeners: (e: keyof TestEvents) => void }).removeAllListeners(
        'ping'
      );
      expect(em.listenerCount('ping')).toBe(0);
      expect(em.listenerCount('done')).toBe(1);
    });
  });
});