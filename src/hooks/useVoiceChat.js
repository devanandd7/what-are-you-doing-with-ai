import { useState, useRef, useCallback, useEffect } from 'react';

export const useVoiceChat = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  
  const voiceManagerRef = useRef(null);

  useEffect(() => {
    // const voiceManager = createVoiceManager();
    // voiceManagerRef.current = voiceManager;
    // setIsSupported(voiceManager.isSupported());
    // 
    // // Set up event handlers
    // voiceManager.onStart = () => {
    //   setIsListening(true);
    //   setError('');
    // };
    // 
    // voiceManager.onEnd = () => {
    //   setIsListening(false);
    // };
    // 
    // voiceManager.onResult = ({ final, interim }) => {
    //   if (final) {
    //     setTranscript(prev => prev + final);
    //     setInterimTranscript('');
    //   } else {
    //     setInterimTranscript(interim);
    //   }
    // };
    // 
    // voiceManager.onError = (errorMessage) => {
    //   setError(`Voice recognition error: ${errorMessage}`);
    //   setIsListening(false);
    // };

    // return () => {
    //   if (voiceManager) {
    //     voiceManager.stopListening();
    //     voiceManager.stopSpeaking();
    //   }
    // };
  }, []);

  const startListening = useCallback(() => {
    if (voiceManagerRef.current) {
      const success = voiceManagerRef.current.startListening?.();
      if (!success) {
        setError('Failed to start voice recognition');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopListening?.();
    }
  }, []);

  const speak = useCallback(async (text, options = {}) => {
    if (!ttsEnabled || !voiceManagerRef.current) {
      return;
    }
    
    try {
      setIsSpeaking(true);
      await voiceManagerRef.current.speak?.(text, options);
    } catch (err) {
      console.error('TTS Error:', err);
      setError(`Text-to-speech error: ${err.message}`);
    } finally {
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopSpeaking?.();
      setIsSpeaking(false);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const toggleTTS = useCallback(() => {
    setTtsEnabled(prev => !prev);
    if (isSpeaking) {
      stopSpeaking();
    }
  }, [isSpeaking, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    isSupported,
    ttsEnabled,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    toggleTTS
  };
};