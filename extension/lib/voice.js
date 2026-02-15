/**
 * Voice input module using Web Speech API
 * Individual tier+ only
 */

let recognition = null;
let isListening = false;

/**
 * Check if voice input is available
 */
export function isVoiceAvailable() {
  return 'SpeechRecognition' in self || 'webkitSpeechRecognition' in self;
}

/**
 * Start voice recognition and stream results to a callback
 * @param {Object} options
 * @param {Function} options.onResult - Called with transcript text (interim + final)
 * @param {Function} options.onEnd - Called when recognition stops
 * @param {Function} options.onError - Called on error
 * @param {string} options.lang - Language code (default: 'en-US')
 * @returns {Function} stop - Call to stop listening
 */
export function startVoiceInput({ onResult, onEnd, onError, lang = 'en-US' }) {
  if (!isVoiceAvailable()) {
    onError?.(new Error('Speech recognition not available in this browser'));
    return () => {};
  }

  if (isListening) {
    stop();
  }

  const SpeechRecognition = self.SpeechRecognition || self.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript + ' ';
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    onResult?.({
      final: finalTranscript.trim(),
      interim: interimTranscript,
      full: (finalTranscript + interimTranscript).trim(),
    });
  };

  recognition.onend = () => {
    isListening = false;
    onEnd?.(finalTranscript.trim());
  };

  recognition.onerror = (event) => {
    isListening = false;

    // 'no-speech' and 'aborted' are non-critical
    if (event.error === 'no-speech' || event.error === 'aborted') {
      onEnd?.(finalTranscript.trim());
      return;
    }

    onError?.(new Error(`Speech recognition error: ${event.error}`));
  };

  recognition.start();
  isListening = true;

  // Return stop function
  return function stop() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  };
}

/**
 * Stop current voice recognition
 */
export function stopVoiceInput() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
  }
}

/**
 * Check if currently listening
 */
export function isCurrentlyListening() {
  return isListening;
}
