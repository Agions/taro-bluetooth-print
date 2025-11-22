/**
 * Unit tests for EventEmitter
 */

import { EventEmitter } from '../src/core/EventEmitter';

interface TestEvents {
  message: string;
  data: { value: number };
  complete: void;
  error: Error;
}

class TestEmitter extends EventEmitter<TestEvents> {
  triggerMessage(msg: string) {
    this.emit('message', msg);
  }

  triggerData(value: number) {
    this.emit('data', { value });
  }

  triggerComplete() {
    this.emit('complete');
  }

  triggerError(error: Error) {
    this.emit('error', error);
  }

  clear() {
    this.removeAllListeners();
  }
}

describe('EventEmitter', () => {
  let emitter: TestEmitter;

  beforeEach(() => {
    emitter = new TestEmitter();
  });

  describe('on', () => {
    it('should register event handler', () => {
      const handler = jest.fn();
      emitter.on('message', handler);

      emitter.triggerMessage('test');

      expect(handler).toHaveBeenCalledWith('test');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple handlers for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('message', handler1);
      emitter.on('message', handler2);

      emitter.triggerMessage('test');

      expect(handler1).toHaveBeenCalledWith('test');
      expect(handler2).toHaveBeenCalledWith('test');
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('message', handler);

      emitter.triggerMessage('test1');
      unsubscribe();
      emitter.triggerMessage('test2');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('test1');
    });

    it('should handle void events', () => {
      const handler = jest.fn();
      emitter.on('complete', handler);

      emitter.triggerComplete();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('once', () => {
    it('should trigger handler only once', () => {
      const handler = jest.fn();
      emitter.once('message', handler);

      emitter.triggerMessage('test1');
      emitter.triggerMessage('test2');
      emitter.triggerMessage('test3');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('test1');
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.once('message', handler);

      unsubscribe();
      emitter.triggerMessage('test');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove specific handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('message', handler1);
      emitter.on('message', handler2);

      emitter.off('message', handler1);
      emitter.triggerMessage('test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('test');
    });

    it('should do nothing if handler not found', () => {
      const handler = jest.fn();

      emitter.off('message', handler);
      emitter.triggerMessage('test');

      // Should not throw
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should call all handlers with event data', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('data', handler1);
      emitter.on('data', handler2);

      emitter.triggerData(42);

      expect(handler1).toHaveBeenCalledWith({ value: 42 });
      expect(handler2).toHaveBeenCalledWith({ value: 42 });
    });

    it('should catch errors in handlers', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      emitter.on('message', errorHandler);
      emitter.on('message', normalHandler);

      emitter.triggerMessage('test');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalledWith('test');

      consoleErrorSpy.mockRestore();
    });

    it('should do nothing if no handlers registered', () => {
      // Should not throw
      expect(() => emitter.triggerMessage('test')).not.toThrow();
    });
  });

  describe('listenerCount', () => {
    it('should return number of listeners for event', () => {
      expect(emitter.listenerCount('message')).toBe(0);

      emitter.on('message', jest.fn());
      expect(emitter.listenerCount('message')).toBe(1);

      emitter.on('message', jest.fn());
      expect(emitter.listenerCount('message')).toBe(2);
    });

    it('should return 0 for events with no listeners', () => {
      expect(emitter.listenerCount('data')).toBe(0);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('message', handler1);
      emitter.on('data', handler2);

      emitter.clear();

      emitter.triggerMessage('test');
      emitter.triggerData(42);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
