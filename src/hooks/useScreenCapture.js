import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  startScreenCapture, 
  captureScreenshot, 
  optimizeScreenshot, 
  isMobileDevice, 
  isScreenSharingSupported,
  getDeviceCapabilities,
  captureCurrentTab
} from '../utils/screenCapture';

export const useScreenCapture = () => {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [error, setError] = useState('');
  const [deviceCapabilities, setDeviceCapabilities] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const screenVideoRef = useRef(null);

  // Initialize device capabilities on mount
  useEffect(() => {
    const capabilities = getDeviceCapabilities();
    setDeviceCapabilities(capabilities);
    setIsMobile(capabilities.isMobile);
    
    // Show warning for mobile devices that don't support screen sharing
    if (capabilities.isMobile && !capabilities.screenSharingSupported) {
      setShowMobileWarning(true);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      setError('');
      setShowMobileWarning(false);

      // Check device capabilities first
      const capabilities = getDeviceCapabilities();
      
      if (capabilities.isMobile && !capabilities.screenSharingSupported) {
        throw new Error('Screen sharing is not supported on this mobile device. Try using camera capture instead.');
      }

      let stream;
      
      // Try different approaches based on device type
      if (capabilities.isMobile) {
        try {
          // First try standard screen capture
          stream = await startScreenCapture();
        } catch (mobileError) {
          console.log('Standard screen capture failed on mobile, trying tab capture...');
          try {
            // Fallback to tab capture
            stream = await captureCurrentTab();
          } catch (tabError) {
            throw new Error(`Mobile screen sharing failed: ${mobileError.message}. Try using Chrome or Firefox on Android, or Safari on iOS.`);
          }
        }
      } else {
        // Desktop screen capture
        stream = await startScreenCapture();
      }
      
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        
        // Add mobile-specific video attributes
        if (capabilities.isMobile) {
          screenVideoRef.current.setAttribute('playsinline', 'true');
          screenVideoRef.current.setAttribute('webkit-playsinline', 'true');
        }
        
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
      
      // Show mobile-specific guidance
      if (isMobile) {
        setShowMobileWarning(true);
      }
      
      throw err;
    }
  }, [isMobile]);

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
    setShowMobileWarning(false);
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

  const getMobileGuidance = () => {
    if (!isMobile) return null;
    
    const capabilities = deviceCapabilities;
    if (!capabilities) return null;

    const guidance = {
      title: 'Mobile Screen Sharing',
      tips: []
    };

    if (capabilities.browser === 'Chrome') {
      guidance.tips.push('Chrome on Android supports screen sharing. Make sure you\'re using Chrome 72+');
      guidance.tips.push('Tap "Share screen" and select "Chrome tab" or "Screen"');
    } else if (capabilities.browser === 'Firefox') {
      guidance.tips.push('Firefox on Android supports screen sharing. Make sure you\'re using Firefox 66+');
      guidance.tips.push('Tap "Share screen" and select "Window" or "Screen"');
    } else if (capabilities.browser === 'Safari') {
      guidance.tips.push('Safari on iOS supports screen sharing in iOS 11+');
      guidance.tips.push('Tap "Share screen" and select "Safari tab"');
    } else {
      guidance.tips.push('Try using Chrome or Firefox for better screen sharing support');
    }

    guidance.tips.push('Make sure you\'re using HTTPS or localhost');
    guidance.tips.push('Allow screen sharing when prompted by your browser');

    return guidance;
  };

  return {
    isScreenSharing,
    screenStream,
    error,
    screenVideoRef,
    startScreenShare,
    stopScreenShare,
    captureScreen,
    isMobile,
    deviceCapabilities,
    showMobileWarning,
    getMobileGuidance,
    isScreenSharingSupported: deviceCapabilities?.screenSharingSupported || false
  };
};