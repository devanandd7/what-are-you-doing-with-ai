import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Download, X, Play, Square, AlertCircle, CheckCircle, Settings, Clock, Timer, Save, FolderOpen, Trash2, Activity, Loader } from 'lucide-react';
import { useOptimizedAnalysis } from '../hooks/useOptimizedAnalysis';
import { compressImage, generateImageHash } from '../utils/imageOptimizer';

const OptimizedCameraCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { analyzeImage, analyzeText, isAnalyzing, queueStatus } = useOptimizedAnalysis();

  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [error, setError] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live Action states
  const [isLiveActionActive, setIsLiveActionActive] = useState(false);
  const [liveActionIntervalId, setLiveActionIntervalId] = useState(null);
  const [liveActionTimer, setLiveActionTimer] = useState(0);
  const [capturedLiveImages, setCapturedLiveImages] = useState([]);
  const [captureCount, setCaptureCount] = useState(0);
  const [currentCollectionName, setCurrentCollectionName] = useState('');

  // Custom timer settings
  const [captureInterval, setCaptureInterval] = useState(15);
  const [captureDuration, setCaptureDuration] = useState(180);
  const [showSettings, setShowSettings] = useState(false);

  // Success message state
  const [successMessage, setSuccessMessage] = useState('');

  // Local Storage states
  const [collectionName, setCollectionName] = useState('');
  const [savedCollections, setSavedCollections] = useState([]);
  const [showStoragePanel, setShowStoragePanel] = useState(false);

  // AI Response states
  const [aiResponses, setAiResponses] = useState({});
  const [finalAiSummary, setFinalAiSummary] = useState('');
  const [analysisQueue, setAnalysisQueue] = useState([]);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Load saved collections from localStorage on component mount
  useEffect(() => {
    const collections = Object.keys(localStorage).filter(key => key.startsWith('camera_collection_'));
    setSavedCollections(collections.map(key => key.replace('camera_collection_', '')));
  }, []);

  const takePhoto = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0 ||
        video.readyState < 2 ||
        video.paused ||
        video.ended
      ) {
        setError("Cannot take photo: Camera stream is not fully ready");
        return null;
      }

      if (!context) {
        setError("Cannot access canvas context for photo capture.");
        return null;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Compress the image for better performance
      const rawDataUrl = canvas.toDataURL('image/png');
      const compressedDataUrl = await compressImage(rawDataUrl, 0.8, 1024, 768);

      if (!isLiveActionActive) {
        setPhotoDataUrl(compressedDataUrl);
        showSuccessMessage('Photo captured successfully!');
      }

      setError('');
      return compressedDataUrl;
    }

    setError("Cannot take photo: Video or Canvas elements are not ready.");
    return null;
  }, [isLiveActionActive]);

  // Optimized function to add image to collection
  const addImageToCollection = useCallback(async (dataUrl) => {
    const imageHash = generateImageHash(dataUrl);
    
    // Add to analysis queue
    setAnalysisQueue(prev => [...prev, { dataUrl, imageHash }]);
    
    // Immediately add to collection with "Analyzing..." status
    setCapturedLiveImages(prev => {
      const updatedImages = [...prev, dataUrl];
      setCaptureCount(updatedImages.length);
      return updatedImages;
    });
    
    // Set initial analyzing state
    setAiResponses(prev => ({ ...prev, [dataUrl]: 'Analyzing...' }));
    
    // Analyze image asynchronously
    try {
      const aiResponse = await analyzeImage(dataUrl);
      setAiResponses(prev => ({ ...prev, [dataUrl]: aiResponse }));
      
      // Auto-save to localStorage after analysis
      if (currentCollectionName) {
        const collectionData = {
          name: currentCollectionName,
          images: capturedLiveImages,
          aiResponses: { ...aiResponses, [dataUrl]: aiResponse },
          captureInterval,
          captureDuration,
          timestamp: new Date().toISOString(),
          count: capturedLiveImages.length,
          isLiveAction: true
        };
        
        localStorage.setItem(`camera_collection_${currentCollectionName}`, JSON.stringify(collectionData));
      }
    } catch (error) {
      console.error('Image analysis failed:', error);
      setAiResponses(prev => ({ ...prev, [dataUrl]: 'Analysis failed - retrying...' }));
      
      // Retry after 2 seconds
      setTimeout(async () => {
        try {
          const retryResponse = await analyzeImage(dataUrl);
          setAiResponses(prev => ({ ...prev, [dataUrl]: retryResponse }));
        } catch (retryError) {
          setAiResponses(prev => ({ ...prev, [dataUrl]: 'Analysis failed' }));
        }
      }, 2000);
    }
  }, [currentCollectionName, captureInterval, captureDuration, aiResponses, capturedLiveImages, analyzeImage]);

  // Camera initialization
  useEffect(() => {
    const startCamera = async () => {
      if (stream) return;

      try {
        setError('');
        setIsLoading(true);
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  setIsCameraReady(true);
                  setIsLoading(false);
                  showSuccessMessage('Camera ready!');
                })
                .catch(playErr => {
                  console.error("Error playing video:", playErr);
                  setError("Failed to start video playback. Please refresh and try again.");
                  setIsLoading(false);
                });
            }
          };

          setStream(mediaStream);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setStream(null);
        setIsCameraReady(false);
        setIsLoading(false);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Camera access denied. Please allow camera permission and refresh the page.");
        } else if (err.name === 'NotFoundError') {
          setError("No camera found. Please connect a camera device.");
        } else if (err.name === 'NotReadableError') {
          setError("Camera is in use by another application. Please close other camera apps and try again.");
        } else {
          setError(`Camera access failed: ${err.message || 'Unknown error'}. Please ensure you're using HTTPS or localhost.`);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (liveActionIntervalId) {
        clearInterval(liveActionIntervalId);
      }
    };
  }, []);

  const startLiveAction = () => {
    if (!stream || !isCameraReady) {
      setError("Camera not ready. Cannot start live action.");
      return;
    }
    
    const autoCollectionName = `LiveAction_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    setCurrentCollectionName(autoCollectionName);
    
    setIsLiveActionActive(true);
    setCapturedLiveImages([]);
    setCaptureCount(0);
    setLiveActionTimer(captureDuration);
    setPhotoDataUrl(null);
    setError('');
    setAnalysisQueue([]);
    
    // Initial photo capture
    setTimeout(async () => {
      const initialPhoto = await takePhoto();
      if (initialPhoto) {
        addImageToCollection(initialPhoto);
      }
    }, 500);
    
    // Set up interval for photos
    const interval = setInterval(async () => {
      const capturedPhoto = await takePhoto();
      if (capturedPhoto) {
        addImageToCollection(capturedPhoto);
      }
    }, captureInterval * 1000);
    
    setLiveActionIntervalId(interval);
    
    // Countdown timer
    const timer = setInterval(() => {
      setLiveActionTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          stopLiveAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Auto-stop after duration
    setTimeout(() => {
      clearInterval(interval);
      clearInterval(timer);
      stopLiveAction();
    }, captureDuration * 1000);
    
    showSuccessMessage(`Live action started! Capturing every ${captureInterval} seconds for ${Math.floor(captureDuration / 60)} minutes.`);
  };

  const stopLiveAction = async () => {
    setIsLiveActionActive(false);
    if (liveActionIntervalId) {
      clearInterval(liveActionIntervalId);
      setLiveActionIntervalId(null);
    }
    setLiveActionTimer(0);
    showSuccessMessage(`Live action stopped! Captured ${captureCount} photos.`);
    
    if (currentCollectionName && capturedLiveImages.length > 0) {
      showSuccessMessage(`Collection "${currentCollectionName}" saved with ${captureCount} photos.`);
    }
    
    // Generate final summary
    const responses = capturedLiveImages.map(img => aiResponses[img]).filter(r => r && r !== 'Analyzing...');
    if (responses.length > 0) {
      const summaryPrompt = `Summarize these image analyses:\n${responses.map((r, i) => `Image ${i+1}: ${r}`).join('\n')}`;
      try {
        const summary = await analyzeText(summaryPrompt);
        setFinalAiSummary(summary);
      } catch (error) {
        console.error('Failed to generate summary:', error);
      }
    }
    
    setCurrentCollectionName('');
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    showSuccessMessage('Photo cleared.');
  };

  const clearLiveImages = () => {
    setCapturedLiveImages([]);
    setCaptureCount(0);
    setCurrentCollectionName('');
    setAiResponses({});
    setFinalAiSummary('');
    showSuccessMessage('Live action photos cleared.');
  };

  const deleteImageFromCollection = (indexToDelete) => {
    const updatedImages = capturedLiveImages.filter((_, index) => index !== indexToDelete);
    setCapturedLiveImages(updatedImages);
    setCaptureCount(updatedImages.length);
    
    if (currentCollectionName) {
      const collectionData = {
        name: currentCollectionName,
        images: updatedImages,
        aiResponses: Object.fromEntries(
          updatedImages.map(img => [img, aiResponses[img] || 'No analysis yet'])
        ),
        captureInterval,
        captureDuration,
        timestamp: new Date().toISOString(),
        count: updatedImages.length,
        isLiveAction: true
      };
      
      try {
        if (updatedImages.length > 0) {
          localStorage.setItem(`camera_collection_${currentCollectionName}`, JSON.stringify(collectionData));
        } else {
          localStorage.removeItem(`camera_collection_${currentCollectionName}`);
          setSavedCollections(prev => prev.filter(c => c !== currentCollectionName));
          setCurrentCollectionName('');
        }
      } catch (err) {
        console.error("Failed to update collection:", err);
      }
    }
    
    showSuccessMessage(`Image ${(indexToDelete + 1).toString().padStart(3, '0')} deleted.`);
  };

  const saveCollection = () => {
    if (capturedLiveImages.length === 0) {
      setError("No images to save. Please capture some photos first.");
      return;
    }

    const name = collectionName.trim() || `Collection_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    const collectionData = {
      name,
      images: capturedLiveImages,
      aiResponses: Object.fromEntries(
        capturedLiveImages.map(img => [img, aiResponses[img] || 'No analysis yet'])
      ),
      captureInterval,
      captureDuration,
      timestamp: new Date().toISOString(),
      count: capturedLiveImages.length
    };

    try {
      localStorage.setItem(`camera_collection_${name}`, JSON.stringify(collectionData));
      setSavedCollections(prev => [...prev.filter(c => c !== name), name]);
      setCollectionName('');
      showSuccessMessage(`Collection "${name}" saved successfully!`);
    } catch (err) {
      setError("Failed to save collection. Storage might be full.");
    }
  };

  const loadCollection = (name) => {
    try {
      const data = localStorage.getItem(`camera_collection_${name}`);
      if (data) {
        const collectionData = JSON.parse(data);
        setCapturedLiveImages(collectionData.images);
        setCaptureCount(collectionData.count);
        setCaptureInterval(collectionData.captureInterval || 15);
        setCaptureDuration(collectionData.captureDuration || 180);
        setCurrentCollectionName(name);
        setAiResponses(collectionData.aiResponses || {});
        showSuccessMessage(`Collection "${name}" loaded!`);
      }
    } catch (err) {
      setError("Failed to load collection.");
    }
  };

  const deleteCollection = (name) => {
    try {
      localStorage.removeItem(`camera_collection_${name}`);
      setSavedCollections(prev => prev.filter(c => c !== name));
      
      if (currentCollectionName === name) {
        setCapturedLiveImages([]);
        setCaptureCount(0);
        setCurrentCollectionName('');
      }
      
      showSuccessMessage(`Collection "${name}" deleted successfully!`);
    } catch (err) {
      setError("Failed to delete collection.");
    }
  };

  const downloadImage = (imageData, index) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `image_${(index + 1).toString().padStart(3, '0')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = () => {
    capturedLiveImages.forEach((imageData, index) => {
      setTimeout(() => {
        downloadImage(imageData, index);
      }, index * 100);
    });
    showSuccessMessage(`Downloading ${capturedLiveImages.length} images...`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (mins > 0) {
      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
    }
    return `${remainingSecs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Enhanced Camera Capture Studio
          </h1>
          <p className="text-gray-600">
            High-performance camera capture with AI analysis optimization
          </p>
          
          {/* Performance Status */}
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">Queue: {queueStatus.pending + queueStatus.running}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800">Cache: {queueStatus.cacheSize}</span>
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                <Loader className="w-4 h-4 text-yellow-600 animate-spin" />
                <span className="text-yellow-800">Analyzing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Camera Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="relative mb-6">
                <div className="bg-gray-100 rounded-lg overflow-hidden relative">
                  {isLoading && (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  
                  <video
                    ref={videoRef}
                    className="w-full h-auto block rounded-lg"
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  {isLiveActionActive && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE • {formatTime(liveActionTimer)} • Optimized
                    </div>
                  )}
                  
                  {isLiveActionActive && captureCount > 0 && (
                    <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {captureCount} captured
                    </div>
                  )}

                  {isLiveActionActive && (
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                      Every {captureInterval}s • {formatDuration(captureDuration)} total
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={takePhoto}
                  disabled={!isCameraReady || isLiveActionActive}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    !isCameraReady || isLiveActionActive
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  Capture Photo
                </button>

                <button
                  onClick={isLiveActionActive ? stopLiveAction : startLiveAction}
                  disabled={!isCameraReady}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    !isCameraReady
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isLiveActionActive
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  {isLiveActionActive ? (
                    <>
                      <Square className="w-5 h-5" />
                      Stop Live Action
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Live Action
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Last Captured Photo */}
            {photoDataUrl && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Last Captured Photo</h2>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <img
                    src={photoDataUrl}
                    alt="Captured"
                    className="w-full h-auto rounded-lg shadow-md"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={clearPhoto}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <X className="w-5 h-5" />
                    Clear Photo
                  </button>
                  <a
                    href={photoDataUrl}
                    download={`photo_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <Download className="w-5 h-5" />
                    Download Photo
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Clock className="w-4 h-4" />
                  Capture Interval
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={captureInterval}
                    onChange={(e) => setCaptureInterval(Number(e.target.value))}
                    disabled={isLiveActionActive}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5s</span>
                    <span className="font-medium text-purple-600">{captureInterval}s</span>
                    <span>60s</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Timer className="w-4 h-4" />
                  Total Duration
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="60"
                    max="600"
                    step="30"
                    value={captureDuration}
                    onChange={(e) => setCaptureDuration(Number(e.target.value))}
                    disabled={isLiveActionActive}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1m</span>
                    <span className="font-medium text-purple-600">{formatDuration(captureDuration)}</span>
                    <span>10m</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Quick Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setCaptureInterval(15);
                      setCaptureDuration(180);
                    }}
                    disabled={isLiveActionActive}
                    className={`p-2 text-xs rounded-lg border transition-all duration-200 ${
                      captureInterval === 15 && captureDuration === 180
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    } ${isLiveActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    15s / 3m
                  </button>
                  <button
                    onClick={() => {
                      setCaptureInterval(30);
                      setCaptureDuration(300);
                    }}
                    disabled={isLiveActionActive}
                    className={`p-2 text-xs rounded-lg border transition-all duration-200 ${
                      captureInterval === 30 && captureDuration === 300
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    } ${isLiveActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    30s / 5m
                  </button>
                  <button
                    onClick={() => {
                      setCaptureInterval(10);
                      setCaptureDuration(120);
                    }}
                    disabled={isLiveActionActive}
                    className={`p-2 text-xs rounded-lg border transition-all duration-200 ${
                      captureInterval === 10 && captureDuration === 120
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    } ${isLiveActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    10s / 2m
                  </button>
                  <button
                    onClick={() => {
                      setCaptureInterval(45);
                      setCaptureDuration(450);
                    }}
                    disabled={isLiveActionActive}
                    className={`p-2 text-xs rounded-lg border transition-all duration-200 ${
                      captureInterval === 45 && captureDuration === 450
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    } ${isLiveActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    45s / 7.5m
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Performance Stats</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Interval: <span className="font-medium text-purple-600">{captureInterval}s</span></div>
                  <div>Duration: <span className="font-medium text-purple-600">{formatDuration(captureDuration)}</span></div>
                  <div>Expected: <span className="font-medium text-purple-600">~{Math.floor(captureDuration / captureInterval) + 1}</span></div>
                  <div>Queue: <span className="font-medium text-blue-600">{queueStatus.pending + queueStatus.running}</span></div>
                </div>
              </div>
            </div>

            {/* Storage Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Save className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-800">Storage</h2>
              </div>

              {capturedLiveImages.length > 0 && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Save Current Collection</label>
                  <input
                    type="text"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="Collection name (optional)"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={saveCollection}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all duration-200"
                  >
                    <Save className="w-4 h-4" />
                    Save ({capturedLiveImages.length})
                  </button>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Saved Collections</label>
                {savedCollections.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No saved collections</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {savedCollections.map((name) => (
                      <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{name}</span>
                        <button
                          onClick={() => loadCollection(name)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Load collection"
                        >
                          <FolderOpen className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCollection(name)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Delete collection"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Action Gallery */}
        {capturedLiveImages.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Image Collection ({capturedLiveImages.length} photos)
                {currentCollectionName && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    • {currentCollectionName}
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadAllImages}
                  className="flex items-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
                <button
                  onClick={clearLiveImages}
                  className="flex items-center gap-2 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {capturedLiveImages.map((imgSrc, index) => (
                <div key={index} className="relative group flex flex-col items-center">
                  <img
                    src={imgSrc}
                    alt={`Image ${index + 1}`}
                    className="w-full h-40 object-contain bg-white rounded-lg shadow-md transition-all duration-200 group-hover:shadow-lg border border-gray-200"
                  />
                  <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    {(index + 1).toString().padStart(3, '0')}
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    image_{(index + 1).toString().padStart(3, '0')}.png
                  </div>
                  <div className="w-full mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 min-h-[48px] flex items-center justify-center">
                    <div className="max-h-[120px] overflow-y-auto w-full text-left whitespace-pre-line break-words px-2">
                      {aiResponses[imgSrc] ? (
                        <span className={aiResponses[imgSrc] === 'Analyzing...' ? 'text-blue-600 animate-pulse' : ''}>
                          {aiResponses[imgSrc]}
                        </span>
                      ) : (
                        <span className="text-gray-500">Processing...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Final Summary */}
        {finalAiSummary && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6 mt-8 shadow-lg">
            <h3 className="font-bold text-lg text-yellow-900 mb-3 text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              AI Final Summary
            </h3>
            <div className="text-base text-gray-900 whitespace-pre-line">{finalAiSummary}</div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default OptimizedCameraCapture;