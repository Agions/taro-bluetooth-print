import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../../src/core/event/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('on()', () => {
    it('should subscribe to an event', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      
      expect(eventBus.listenerCount('test-event')).toBe(1);
    });

    it('should call handler when event is emitted', async () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      
      await eventBus.emit('test-event', { data: 'test' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support multiple handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      
      await eventBus.emit('test-event', 'payload');
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should support symbol events', async () => {
      const TOKEN = Symbol('test-token');
      const handler = vi.fn();
      eventBus.on(TOKEN, handler);
      
      await eventBus.emit(TOKEN, 'payload');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support priority ordering', async () => {
      const results: number[] = [];
      eventBus.on('test-event', () => results.push(1), { priority: 30 });
      eventBus.on('test-event', () => results.push(2), { priority: 10 });
      eventBus.on('test-event', () => results.push(3), { priority: 20 });
      
      await eventBus.emit('test-event', null);
      
      expect(results).toEqual([2, 3, 1]);
    });

    it('should support filter', async () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler, {
        filter: (payload: number) => payload > 5
      });
      
      await eventBus.emit('test-event', 3);
      expect(handler).not.toHaveBeenCalled();
      
      await eventBus.emit('test-event', 10);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return subscription with unsubscribe method', async () => {
      const handler = vi.fn();
      const subscription = eventBus.on('test-event', handler);
      
      subscription.unsubscribe();
      
      await eventBus.emit('test-event', 'payload');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('should call handler only once', async () => {
      const handler = vi.fn();
      eventBus.once('test-event', handler);
      
      await eventBus.emit('test-event', 'payload1');
      await eventBus.emit('test-event', 'payload2');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('payload1');
    });

    it('should support options other than once', async () => {
      const handler = vi.fn();
      eventBus.once('test-event', handler, { priority: 10 });
      
      await eventBus.emit('test-event', 'payload');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('off()', () => {
    it('should remove a specific handler', async () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      eventBus.off('test-event', handler);
      
      await eventBus.emit('test-event', 'payload');
      
      expect(handler).not.toHaveBeenCalled();
      expect(eventBus.listenerCount('test-event')).toBe(0);
    });

    it('should not remove other handlers with same event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.off('test-event', handler1);
      
      await eventBus.emit('test-event', 'payload');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if handler not found', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      eventBus.off('test-event', vi.fn()); // different handler
      
      expect(eventBus.listenerCount('test-event')).toBe(1);
    });

    it('should do nothing if event has no listeners', () => {
      expect(() => eventBus.off('non-existent', vi.fn())).not.toThrow();
    });
  });

  describe('emit()', () => {
    it('should emit event with payload', async () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      
      await eventBus.emit('test-event', { value: 42 });
      
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should handle async handlers', async () => {
      const results: string[] = [];
      eventBus.on('test-event', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push('done');
      });
      
      await eventBus.emit('test-event', null);
      
      expect(results).toContain('done');
    });

    it('should handle handler errors gracefully', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      eventBus.on('test-event', handler);
      
      // Should not throw
      await expect(eventBus.emit('test-event', 'payload')).resolves.not.toThrow();
    });

    it('should not emit if no listeners', async () => {
      await expect(eventBus.emit('non-existent', 'payload')).resolves.not.toThrow();
    });

    it('should support timeout option', async () => {
      const handler = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      eventBus.on('test-event', handler, { timeout: 10 });
      
      await eventBus.emit('test-event', null);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitSync()', () => {
    it('should emit event synchronously', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      
      eventBus.emitSync('test-event', 'payload');
      
      expect(handler).toHaveBeenCalledWith('payload');
    });

    it('should handle async handlers without blocking', () => {
      const handler = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });
      eventBus.on('test-event', handler);
      
      eventBus.emitSync('test-event', 'payload');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitFor()', () => {
    it('should resolve when event is emitted', async () => {
      const promise = eventBus.waitFor('test-event');
      
      setTimeout(() => eventBus.emit('test-event', 'result'), 10);
      
      const result = await promise;
      expect(result).toBe('result');
    });

    it('should support filter', async () => {
      const promise = eventBus.waitFor('test-event', undefined, (val: number) => val > 5);
      
      eventBus.emit('test-event', 3);
      eventBus.emit('test-event', 10);
      
      const result = await promise;
      expect(result).toBe(10);
    });

    it('should reject on timeout', async () => {
      const promise = eventBus.waitFor('test-event', 50);
      
      await expect(promise).rejects.toThrow('Timeout waiting for event');
    });
  });

  describe('hasListeners()', () => {
    it('should return true when listeners exist', () => {
      eventBus.on('test-event', vi.fn());
      expect(eventBus.hasListeners('test-event')).toBe(true);
    });

    it('should return false when no listeners', () => {
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });
  });

  describe('listenerCount()', () => {
    it('should return correct count', () => {
      eventBus.on('test-event', vi.fn());
      eventBus.on('test-event', vi.fn());
      expect(eventBus.listenerCount('test-event')).toBe(2);
    });

    it('should return 0 when no listeners', () => {
      expect(eventBus.listenerCount('test-event')).toBe(0);
    });
  });

  describe('removeAllListeners()', () => {
    it('should remove all listeners for specific event', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      
      eventBus.removeAllListeners('event1');
      
      expect(eventBus.listenerCount('event1')).toBe(0);
      expect(eventBus.listenerCount('event2')).toBe(1);
    });

    it('should remove all listeners when no event specified', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      
      eventBus.removeAllListeners();
      
      expect(eventBus.listenerCount('event1')).toBe(0);
      expect(eventBus.listenerCount('event2')).toBe(0);
    });
  });

  describe('eventNames()', () => {
    it('should return all event names', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      
      const names = eventBus.eventNames();
      
      expect(names).toContain('event1');
      expect(names).toContain('event2');
    });

    it('should return empty array when no events', () => {
      expect(eventBus.eventNames()).toEqual([]);
    });
  });
});