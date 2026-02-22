import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock SpeechRecognition ---

let mockRecognitionInstance;
let SpeechRecognitionConstructorCalls;

class MockSpeechRecognition {
  constructor() {
    SpeechRecognitionConstructorCalls++;
    this.continuous = false;
    this.interimResults = false;
    this.lang = '';
    this.onresult = null;
    this.onend = null;
    this.onerror = null;
    this.start = vi.fn();
    this.stop = vi.fn(() => {
      // Simulate the browser firing onend when stop() is called
      if (this.onend) this.onend();
    });
    this.abort = vi.fn();
    mockRecognitionInstance = this;
  }
}

// Module-scoped state in voice.js uses `self`, so we set it globally
beforeEach(() => {
  SpeechRecognitionConstructorCalls = 0;
  mockRecognitionInstance = null;
  globalThis.self = globalThis;
  globalThis.SpeechRecognition = MockSpeechRecognition;
  delete globalThis.webkitSpeechRecognition;
});

afterEach(() => {
  delete globalThis.SpeechRecognition;
  delete globalThis.webkitSpeechRecognition;
  vi.resetModules();
});

describe('voice', () => {
  describe('isVoiceAvailable', () => {
    it('should return true when SpeechRecognition is in self', async () => {
      const { isVoiceAvailable } = await import('../lib/voice.js');
      expect(isVoiceAvailable()).toBe(true);
    });

    it('should return true when webkitSpeechRecognition is available', async () => {
      delete globalThis.SpeechRecognition;
      globalThis.webkitSpeechRecognition = MockSpeechRecognition;
      const { isVoiceAvailable } = await import('../lib/voice.js');
      expect(isVoiceAvailable()).toBe(true);
    });

    it('should return false when neither API is available', async () => {
      delete globalThis.SpeechRecognition;
      delete globalThis.webkitSpeechRecognition;
      const { isVoiceAvailable } = await import('../lib/voice.js');
      expect(isVoiceAvailable()).toBe(false);
    });
  });

  describe('startVoiceInput', () => {
    it('should create a SpeechRecognition instance and call start', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onResult = vi.fn();
      const onEnd = vi.fn();
      const onError = vi.fn();

      startVoiceInput({ onResult, onEnd, onError });

      expect(mockRecognitionInstance).not.toBeNull();
      expect(mockRecognitionInstance.start).toHaveBeenCalled();
      expect(mockRecognitionInstance.continuous).toBe(true);
      expect(mockRecognitionInstance.interimResults).toBe(true);
    });

    it('should set the language from options', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      startVoiceInput({ onResult: vi.fn(), lang: 'es-ES' });

      expect(mockRecognitionInstance.lang).toBe('es-ES');
    });

    it('should default language to en-US', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      startVoiceInput({ onResult: vi.fn() });

      expect(mockRecognitionInstance.lang).toBe('en-US');
    });

    it('should call onError when SpeechRecognition is not available', async () => {
      delete globalThis.SpeechRecognition;
      delete globalThis.webkitSpeechRecognition;
      const { startVoiceInput } = await import('../lib/voice.js');
      const onError = vi.fn();

      const stop = startVoiceInput({ onResult: vi.fn(), onError });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toContain('not available');
      // Should return a no-op stop function
      expect(typeof stop).toBe('function');
    });

    it('should return a stop function that stops recognition', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onEnd = vi.fn();

      const stop = startVoiceInput({ onResult: vi.fn(), onEnd });

      expect(typeof stop).toBe('function');
      stop();
      expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    });

    it('should handle final transcript results', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onResult = vi.fn();

      startVoiceInput({ onResult });

      // Simulate a final result from the browser
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: 'Hello world' },
            length: 1,
          },
        ],
      };

      mockRecognitionInstance.onresult(mockEvent);

      expect(onResult).toHaveBeenCalledWith({
        final: 'Hello world',
        interim: '',
        full: 'Hello world',
      });
    });

    it('should handle interim transcript results', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onResult = vi.fn();

      startVoiceInput({ onResult });

      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            0: { transcript: 'Hel' },
            length: 1,
          },
        ],
      };

      mockRecognitionInstance.onresult(mockEvent);

      expect(onResult).toHaveBeenCalledWith({
        final: '',
        interim: 'Hel',
        full: 'Hel',
      });
    });

    it('should accumulate multiple final results', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onResult = vi.fn();

      startVoiceInput({ onResult });

      // First final result
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Hello' }, length: 1 }],
      });

      // Second final result
      mockRecognitionInstance.onresult({
        resultIndex: 1,
        results: [
          { isFinal: true, 0: { transcript: 'Hello' }, length: 1 },
          { isFinal: true, 0: { transcript: 'world' }, length: 1 },
        ],
      });

      const lastCall = onResult.mock.calls[onResult.mock.calls.length - 1][0];
      expect(lastCall.final).toContain('Hello');
      expect(lastCall.final).toContain('world');
    });
  });

  describe('stopVoiceInput', () => {
    it('should stop recognition when currently listening', async () => {
      const { startVoiceInput, stopVoiceInput } = await import('../lib/voice.js');
      startVoiceInput({ onResult: vi.fn() });

      stopVoiceInput();
      expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    });

    it('should be safe to call when not listening', async () => {
      const { stopVoiceInput } = await import('../lib/voice.js');
      // Should not throw
      expect(() => stopVoiceInput()).not.toThrow();
    });
  });

  describe('isCurrentlyListening', () => {
    it('should return true while listening', async () => {
      const { startVoiceInput, isCurrentlyListening } = await import('../lib/voice.js');
      startVoiceInput({ onResult: vi.fn() });

      expect(isCurrentlyListening()).toBe(true);
    });

    it('should return false initially', async () => {
      const { isCurrentlyListening } = await import('../lib/voice.js');
      expect(isCurrentlyListening()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should treat no-speech as non-critical and call onEnd', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onEnd = vi.fn();
      const onError = vi.fn();

      startVoiceInput({ onResult: vi.fn(), onEnd, onError });

      mockRecognitionInstance.onerror({ error: 'no-speech' });

      expect(onError).not.toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
    });

    it('should treat aborted as non-critical and call onEnd', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onEnd = vi.fn();
      const onError = vi.fn();

      startVoiceInput({ onResult: vi.fn(), onEnd, onError });

      mockRecognitionInstance.onerror({ error: 'aborted' });

      expect(onError).not.toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
    });

    it('should call onError for critical errors like not-allowed', async () => {
      const { startVoiceInput } = await import('../lib/voice.js');
      const onError = vi.fn();
      const onEnd = vi.fn();

      startVoiceInput({ onResult: vi.fn(), onError, onEnd });

      mockRecognitionInstance.onerror({ error: 'not-allowed' });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toContain('not-allowed');
    });

    it('should set isListening to false after an error', async () => {
      const { startVoiceInput, isCurrentlyListening } = await import('../lib/voice.js');

      startVoiceInput({ onResult: vi.fn() });
      expect(isCurrentlyListening()).toBe(true);

      mockRecognitionInstance.onerror({ error: 'network' });
      expect(isCurrentlyListening()).toBe(false);
    });
  });
});
