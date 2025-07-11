// Screen capture utilities with enhanced error handling
export const startScreenCapture = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    
    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Screen sharing permission denied. Please allow screen sharing and try again.');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Screen sharing is not supported in this browser.');
    } else {
      throw new Error(`Failed to start screen sharing: ${error.message}`);
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
      const maxAttempts = 10; // 1 second total wait time
      
      if (attempts >= maxAttempts) {
        reject(new Error('Video element timeout - screen not ready for capture'));
        return;
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0 || 
          videoElement.readyState < 2) {
        // Wait 100ms and try again
        setTimeout(() => waitForVideo(attempts + 1), 100);
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
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
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
};