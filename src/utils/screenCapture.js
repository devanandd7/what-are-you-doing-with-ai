// Screen capture utilities with enhanced mobile compatibility
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

export const isScreenSharingSupported = () => {
  return navigator.mediaDevices && 
         navigator.mediaDevices.getDisplayMedia && 
         typeof navigator.mediaDevices.getDisplayMedia === 'function';
};

export const startScreenCapture = async () => {
  try {
    // Check if screen sharing is supported
    if (!isScreenSharingSupported()) {
      if (isMobileDevice()) {
        throw new Error('Screen sharing is not supported on mobile devices. Try using camera capture instead.');
      } else {
        throw new Error('Screen sharing is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
      }
    }

    // Mobile-specific constraints
    const constraints = {
      video: {
        width: { ideal: isMobileDevice() ? 1280 : 1920 },
        height: { ideal: isMobileDevice() ? 720 : 1080 },
        frameRate: { ideal: isMobileDevice() ? 15 : 30 }
      },
      audio: false
    };

    // Add mobile-specific options
    if (isMobileDevice()) {
      constraints.video.displaySurface = 'browser';
      constraints.video.logicalSurface = true;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
    return stream;
  } catch (error) {
    console.error('Screen capture error:', error);
    
    if (error.name === 'NotAllowedError') {
      if (isMobileDevice()) {
        throw new Error('Screen sharing permission denied on mobile. Please allow screen sharing in your browser settings and try again.');
      } else {
        throw new Error('Screen sharing permission denied. Please allow screen sharing and try again.');
      }
    } else if (error.name === 'NotSupportedError') {
      if (isMobileDevice()) {
        throw new Error('Screen sharing is not supported on this mobile device/browser. Try using Chrome or Firefox on Android, or Safari on iOS.');
      } else {
        throw new Error('Screen sharing is not supported in this browser.');
      }
    } else if (error.name === 'NotFoundError') {
      throw new Error('No screen sharing source found. Please select a window, tab, or application to share.');
    } else if (error.name === 'AbortError') {
      throw new Error('Screen sharing was cancelled by the user.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Screen sharing failed to start. Please try again or refresh the page.');
    } else {
      const errorMessage = isMobileDevice() 
        ? `Mobile screen sharing failed: ${error.message}. Try using a different browser or device.`
        : `Failed to start screen sharing: ${error.message}`;
      throw new Error(errorMessage);
    }
  }
};

export const captureScreenshot = async (videoElement) => {
  return new Promise((resolve, reject) => {
    if (!videoElement) {
      reject(new Error('No video element provided'));
      return;
    }

    // Wait for video to be ready with timeout
    const waitForVideo = (attempts = 0) => {
      const maxAttempts = isMobileDevice() ? 20 : 10; // Longer timeout for mobile
      
      if (attempts >= maxAttempts) {
        reject(new Error('Video element timeout - screen not ready for capture'));
        return;
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0 || 
          videoElement.readyState < 2) {
        // Wait longer on mobile devices
        const waitTime = isMobileDevice() ? 200 : 100;
        setTimeout(() => waitForVideo(attempts + 1), waitTime);
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Use lower quality on mobile for better performance
        const quality = isMobileDevice() ? 0.7 : 0.8;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(dataUrl);
      } catch (error) {
        reject(new Error(`Failed to capture screenshot: ${error.message}`));
      }
    };

    waitForVideo();
  });
};

export const optimizeScreenshot = async (dataUrl, quality = 0.7, maxWidth = 1280, maxHeight = 720) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions
      let { width, height } = img;
      
      // Use smaller dimensions on mobile for better performance
      const mobileMaxWidth = isMobileDevice() ? 800 : maxWidth;
      const mobileMaxHeight = isMobileDevice() ? 600 : maxHeight;
      
      if (width > mobileMaxWidth || height > mobileMaxHeight) {
        const ratio = Math.min(mobileMaxWidth / width, mobileMaxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use lower quality on mobile
      const finalQuality = isMobileDevice() ? Math.min(quality, 0.6) : quality;
      resolve(canvas.toDataURL('image/jpeg', finalQuality));
    };
    img.src = dataUrl;
  });
};

// Mobile-specific fallback: capture current tab using alternative methods
export const captureCurrentTab = async () => {
  if (!isMobileDevice()) {
    throw new Error('Tab capture is only available on mobile devices');
  }

  try {
    // Try to capture the current tab using a different approach
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: 'screen',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    
    return stream;
  } catch (error) {
    throw new Error(`Tab capture failed: ${error.message}. This feature may not be supported on your mobile browser.`);
  }
};

// Get device capabilities and provide helpful information
export const getDeviceCapabilities = () => {
  const capabilities = {
    isMobile: isMobileDevice(),
    screenSharingSupported: isScreenSharingSupported(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor
  };

  // Add browser-specific information
  if (navigator.userAgent.includes('Chrome')) {
    capabilities.browser = 'Chrome';
    capabilities.chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1];
  } else if (navigator.userAgent.includes('Firefox')) {
    capabilities.browser = 'Firefox';
    capabilities.firefoxVersion = navigator.userAgent.match(/Firefox\/(\d+)/)?.[1];
  } else if (navigator.userAgent.includes('Safari')) {
    capabilities.browser = 'Safari';
    capabilities.safariVersion = navigator.userAgent.match(/Version\/(\d+)/)?.[1];
  } else if (navigator.userAgent.includes('Edge')) {
    capabilities.browser = 'Edge';
  }

  return capabilities;
};