import { useState, useRef, useCallback } from 'react';
import { startScreenCapture, captureScreenshot, optimizeScreenshot } from '../utils/screenCapture';

export const useScreenCapture = () => {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [error, setError] = useState('');
  const screenVideoRef = useRef(null);

  const startScreenShare = useCallback(async () => {
    try {
      setError('');
      const stream = await startScreenCapture();
      
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play();
      }
      
      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
      
      return stream;
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError(err.message || 'Failed to start screen sharing');
      throw err;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
    setError('');
  }, [screenStream]);

  const captureScreen = useCallback(async () => {
    if (!isScreenSharing) {
      throw new Error('Screen sharing not active');
    }
    
    if (!screenVideoRef.current) {
      throw new Error('Screen video element not available');
    }
    
    try {
      const screenshot = await captureScreenshot(screenVideoRef.current);
      const optimizedScreenshot = await optimizeScreenshot(screenshot);
      return optimizedScreenshot;
    } catch (err) {
      console.error('Error capturing screen:', err);
      throw new Error(`Screen capture failed: ${err.message}`);
    }
  }, [isScreenSharing]);

  return {
    isScreenSharing,
    screenStream,
    error,
    screenVideoRef,
    startScreenShare,
    stopScreenShare,
    captureScreen
  };
};