import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Camera,
  Download,
  X,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Settings,
  Clock,
  Timer,
  Save,
  FolderOpen,
  Trash2,
  Activity,
  Loader,
  Monitor,
  MonitorSpeaker,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageCircle,
  ScreenShare,
  ScreenShareOff,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useOptimizedAnalysis } from "../hooks/useOptimizedAnalysis";
import { useScreenCapture } from "../hooks/useScreenCapture";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { useMultimodalAnalysis } from "../hooks/useMultimodalAnalysis";
import { compressImage, generateImageHash } from "../utils/imageOptimizer";
import UserGuide from "./UserGuide";

const EnhancedCameraCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Original camera functionality
  const {
    analyzeImage,
    isAnalyzing: isCameraAnalyzing,
    queueStatus,
  } = useOptimizedAnalysis();

  // Screen capture functionality
  const {
    isScreenSharing,
    screenVideoRef,
    startScreenShare,
    stopScreenShare,
    captureScreen,
    error: screenError,
    screenStream,
    isMobile,
    deviceCapabilities,
    showMobileWarning,
    getMobileGuidance,
    isScreenSharingSupported,
  } = useScreenCapture();

  // Voice chat functionality
  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    ttsEnabled,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    toggleTTS,
    isSupported: isVoiceSupported,
    error: voiceError,
  } = useVoiceChat();

  // Multimodal analysis
  const {
    analyzeMultimodal,
    isAnalyzing: isMultimodalAnalyzing,
    analysisHistory,
    clearHistory,
  } = useMultimodalAnalysis();

  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [error, setError] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live Action states
  const [isLiveActionActive, setIsLiveActionActive] = useState(false);
  const [liveActionIntervalId, setLiveActionIntervalId] = useState(null);
  const [liveActionTimer, setLiveActionTimer] = useState(0);
  const [capturedLiveImages, setCapturedLiveImages] = useState([]);
  const [captureCount, setCaptureCount] = useState(0);
  const [currentCollectionName, setCurrentCollectionName] = useState("");

  // Enhanced capture states
  const [capturedScreenshots, setCapturedScreenshots] = useState([]);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  // Custom timer settings
  const [captureInterval, setCaptureInterval] = useState(15);
  const [captureDuration, setCaptureDuration] = useState(180);
  const [includeScreenCapture, setIncludeScreenCapture] = useState(false);

  // Success message state
  const [successMessage, setSuccessMessage] = useState("");

  // Local Storage states
  const [collectionName, setCollectionName] = useState("");
  const [savedCollections, setSavedCollections] = useState([]);

  // AI Response states
  const [aiResponses, setAiResponses] = useState({});
  const [finalAiSummary, setFinalAiSummary] = useState("");

  // Add a step counter for sequential context
  const [stepCounter, setStepCounter] = useState(1);

  // Add new state for per-step camera and screen responses
  const [stepAnalyses, setStepAnalyses] = useState([]);

  // Add state for modal
  // Change modal state to use the image key (cameraDataUrl) instead of index
  const [modalImageKey, setModalImageKey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Debug state
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Load saved collections from localStorage on component mount
  useEffect(() => {
    const collections = Object.keys(localStorage).filter((key) =>
      key.startsWith("camera_collection_")
    );
    setSavedCollections(
      collections.map((key) => key.replace("camera_collection_", ""))
    );
  }, []);





  // Monitor video stream health - less aggressive monitoring
  useEffect(() => {
    if (videoRef.current && stream && isCameraReady) {
      const video = videoRef.current;
      
      const checkStreamHealth = () => {
        // Only check if we have a stream and it's supposed to be active
        if (video.srcObject && !video.srcObject.active) {
          console.warn("Video stream became inactive");
          setError("Camera stream was interrupted. Please restart camera.");
          setIsCameraReady(false);
        }
        
        // Also check if video is actually playing
        if (video.paused && !video.ended) {
          console.warn("Video is paused unexpectedly");
          // Try to resume playback
          video.play().catch(err => {
            console.error("Failed to resume video:", err);
            setError("Video playback stopped. Please restart camera.");
            setIsCameraReady(false);
          });
        }
      };

      // Check stream health less frequently to avoid false positives
      const healthInterval = setInterval(checkStreamHealth, 10000); // Check every 10 seconds
      
      return () => clearInterval(healthInterval);
    }
  }, [stream, isCameraReady]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.onloadedmetadata = () => {
        screenVideoRef.current
          .play()
          .then(() => {
            console.log("Screen share video is playing");
          })
          .catch((err) => {
            console.error("Screen share video play error:", err);
          });
      };
      console.log("Screen share stream set on video element");
    }
  }, [screenStream, screenVideoRef]);

  const takePhoto = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Enhanced video readiness check
      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0 ||
        video.readyState < 2 ||
        video.paused ||
        video.ended ||
        !video.srcObject ||
        !video.srcObject.active
      ) {
        console.warn("Video not ready for capture:", {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
          paused: video.paused,
          ended: video.ended,
          hasSrcObject: !!video.srcObject,
          streamActive: video.srcObject?.active
        });
        setError("Cannot take photo: Camera stream is not fully ready");
        return null;
      }

      if (!context) {
        setError("Cannot access canvas context for photo capture.");
        return null;
      }

      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Clear canvas first
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the current video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Check if the canvas has content (not black)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some(pixel => pixel !== 0);
        
        if (!hasContent) {
          console.warn("Canvas appears to be black/empty");
          setError("Captured image appears to be black. Please check camera connection.");
          return null;
        }

        const rawDataUrl = canvas.toDataURL("image/png");
        const compressedDataUrl = await compressImage(rawDataUrl, 0.8, 1024, 768);

        if (!isLiveActionActive) {
          setPhotoDataUrl(compressedDataUrl);
          showSuccessMessage("Photo captured successfully!");
        }

        setError("");
        return compressedDataUrl;
      } catch (error) {
        console.error("Error during photo capture:", error);
        setError("Error capturing photo: " + error.message);
        return null;
      }
    }

    setError("Cannot take photo: Video or Canvas elements are not ready.");
    return null;
  }, [isLiveActionActive]);

  const handleVoiceAnalysis = useCallback(
    async (voiceInput) => {
      try {
        let cameraImage = null;
        let screenImage = null;

        // Capture current camera frame
        if (isCameraReady) {
          cameraImage = await takePhoto();
        }

        // Capture current screen if sharing
        if (isScreenSharing) {
          screenImage = await captureScreen();
        }

        // Perform multimodal analysis
        const response = await analyzeMultimodal({
          cameraImage,
          screenImage,
          voiceText: voiceInput,
          context: `Voice chat session - User said: "${voiceInput}"`,
        });

        setCurrentResponse(response);

        // Add to conversation history
        const conversationEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userInput: voiceInput,
          aiResponse: response,
          hasCamera: !!cameraImage,
          hasScreen: !!screenImage,
        };

        setConversationHistory((prev) => [
          conversationEntry,
          ...prev.slice(0, 19),
        ]); // Keep last 20

        // Speak the response if TTS is enabled
        if (ttsEnabled && response) {
          await speak(response);
        }
      } catch (error) {
        console.error("Voice analysis failed:", error);
        setError("Voice analysis failed - please try again");
      }
    },
    [
      isCameraReady,
      isScreenSharing,
      takePhoto,
      captureScreen,
      analyzeMultimodal,
      ttsEnabled,
      speak,
    ]
  );

  // Handle voice input for real-time analysis
  useEffect(() => {
    if (transcript && isVoiceChatActive) {
      handleVoiceAnalysis(transcript);
      clearTranscript();
    }
  }, [transcript, isVoiceChatActive, handleVoiceAnalysis, clearTranscript]);

  async function waitForScreenVideoReady(videoElement, maxWaitMs = 2000) {
    const start = Date.now();
    while (
      videoElement &&
      (videoElement.videoWidth === 0 ||
        videoElement.videoHeight === 0 ||
        videoElement.readyState < 2)
    ) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error(
          "Screen video element not ready for capture after waiting"
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const addImageToCollection = useCallback(
    async (cameraDataUrl, screenDataUrl = null) => {
      const imageHash = generateImageHash(cameraDataUrl);
      const stepNum = stepCounter;
      setStepCounter((prev) => prev + 1);
      setCapturedLiveImages((prev) => {
        const updatedImages = [...prev, cameraDataUrl];
        setCaptureCount(updatedImages.length);
        return updatedImages;
      });
      if (screenDataUrl) {
        setCapturedScreenshots((prev) => [...prev, screenDataUrl]);
      }
      setAiResponses((prev) => ({
        ...prev,
        [cameraDataUrl]: `Step ${stepNum} Analysis: Analyzing...`,
      }));
      try {
        // 1. Analyze camera image
        const cameraPrompt = `You are an activity analysis AI. This is Step ${stepNum}. Analyze ONLY the camera image. What is happening? What is the user doing?`;
        const cameraResponse = await analyzeMultimodal({
          cameraImage: cameraDataUrl,
          context: cameraPrompt,
        });
        // 2. Analyze screen image (if available) with Copilot-style prompt
        let screenResponse = null;
        if (screenDataUrl) {
          const screenPrompt = `You are a brilliant, friendly, and witty AI assistant. A user has uploaded an image that could be anything—a diagram, screenshot, meme, photograph, chart, digital design, or user interface. Your task is to interpret and describe the image like Microsoft Copilot would: clearly, helpfully, and with a spark of personality.\n\nYour response should follow this structure:\n\n1. **Creative Section Header**  \n   Start with a smart title like:\n   - 🧠 What This Image Tells Us\n   - 🎨 Visual Breakdown\n   - 🔍 Insight Snapshot\n\n2. **Organized Observations**  \n   Use GitHub-flavored **Markdown**:\n   - Bullet points to describe specific elements (objects, text, layout, context)\n   - Emojis to add warmth and structure\n   - Section titles like:\n     - **📋 Key Elements**\n     - **🧠 Inferred Context**\n     - **💡 Purpose & Audience**\n     - **⛅ Miscellaneous Details** (if needed)\n\n3. **Engaging Tone**  \n   Write like a clever, kind expert. Use phrases such as:\n   - “Here’s what jumps out”\n   - “This scene suggests…”\n   - “Let’s zoom in on…”\n\n4. **Enriched Interpretation**  \n   If applicable, provide:\n   - Contextual background (e.g. what a tree traversal or heatmap means)\n   - Relevant examples or comparisons\n   - Optional follow-up: Suggest the next step or ask a curious question\n\nAvoid generic or vague summaries. Always aim for specificity, imagination, and clarity.`;
          screenResponse = await analyzeMultimodal({
            screenImage: screenDataUrl,
            context: screenPrompt,
          });
        }
        // 3. Combine both responses for a step insight
        let combinedInsight = cameraResponse;
        if (screenDataUrl && screenResponse) {
          const combinePrompt = `You are an activity analysis AI. This is Step ${stepNum}. Here is the camera analysis: "${cameraResponse}" and the screen analysis: "${screenResponse}". Combine both to infer what the user is doing at this step. Be specific and insightful.`;
          combinedInsight = await analyzeMultimodal({ context: combinePrompt });
        }
        // Save all three for the UI
        setStepAnalyses((prev) => [
          ...prev,
          {
            step: stepNum,
            camera: cameraResponse,
            screen: screenResponse,
            combined: combinedInsight,
          },
        ]);
        setAiResponses((prev) => ({
          ...prev,
          [cameraDataUrl]: `Step ${stepNum} Analysis:\nCamera: ${cameraResponse}\nScreen: ${
            screenResponse || "N/A"
          }\nCombined Insight: ${combinedInsight}`,
        }));
        // Auto-save to localStorage after analysis
        if (currentCollectionName) {
          setCapturedLiveImages((images) => {
            setCapturedScreenshots((screenshots) => {
              const collectionData = {
                name: currentCollectionName,
                images,
                screenshots,
                aiResponses: {
                  ...aiResponses,
                  [cameraDataUrl]: `Step ${stepNum} Analysis:\nCamera: ${cameraResponse}\nScreen: ${
                    screenResponse || "N/A"
                  }\nCombined Insight: ${combinedInsight}`,
                },
                captureInterval,
                captureDuration,
                timestamp: new Date().toISOString(),
                count: images.length,
                isLiveAction: true,
                hasScreenCapture: isScreenSharing,
                stepAnalyses: [
                  ...stepAnalyses,
                  {
                    step: stepNum,
                    camera: cameraResponse,
                    screen: screenResponse,
                    combined: combinedInsight,
                  },
                ],
              };
              localStorage.setItem(
                `camera_collection_${currentCollectionName}`,
                JSON.stringify(collectionData)
              );
              return screenshots;
            });
            return images;
          });
        }
      } catch (error) {
        setAiResponses((prev) => ({
          ...prev,
          [cameraDataUrl]: `Step ${stepNum} Analysis: Analysis failed - retrying...`,
        }));
        setTimeout(async () => {
          try {
            // Retry only the combined step for simplicity
            const retryPrompt = `You are an activity analysis AI. This is Step ${stepNum} (Retry). Analyze both the camera and screen images (if available) and combine your insight. What is the user doing?`;
            const retryResponse = await analyzeMultimodal({
              cameraImage: cameraDataUrl,
              screenImage: screenDataUrl,
              context: retryPrompt,
            });
            setAiResponses((prev) => ({
              ...prev,
              [cameraDataUrl]: `Step ${stepNum} Analysis: ${retryResponse}`,
            }));
          } catch (retryError) {
            setAiResponses((prev) => ({
              ...prev,
              [cameraDataUrl]: `Step ${stepNum} Analysis: Analysis failed`,
            }));
          }
        }, 2000);
      }
    },
    [
      currentCollectionName,
      isScreenSharing,
      analyzeMultimodal,
      captureInterval,
      captureDuration,
      aiResponses,
      stepCounter,
      stepAnalyses,
    ]
  );

  // Camera initialization - run only once on mount
  useEffect(() => {
    const startCamera = async () => {
      if (stream) return;

      try {
        setError("");
        setIsLoading(true);

        // Enhanced camera constraints for better compatibility and stability
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: "user",
            frameRate: { ideal: 30, min: 15 },
            aspectRatio: { ideal: 16/9 },
            // Add stability constraints
            deviceId: undefined, // Let browser choose best camera
            groupId: undefined
          },
          audio: false
        });

        if (videoRef.current) {
          // Set the stream on the video element
          videoRef.current.srcObject = mediaStream;
          
          // Wait for the video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log("Video metadata loaded");
            if (videoRef.current) {
              // Don't set width/height on the video element itself
              // Let CSS handle the sizing
              console.log("Video dimensions:", {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState
              });
              
              // Wait a bit for the video to be fully ready
              setTimeout(() => {
                if (videoRef.current) {
                  // Start playing the video
                  videoRef.current.play()
                    .then(() => {
                      console.log("Video started playing successfully");
                      // Wait a bit more to ensure video is actually playing
                      setTimeout(() => {
                        if (videoRef.current && !videoRef.current.paused) {
                          setIsCameraReady(true);
                          setIsLoading(false);
                          showSuccessMessage("Camera ready!");
                        } else {
                          setError("Video failed to start playing properly");
                          setIsLoading(false);
                        }
                      }, 500);
                    })
                    .catch((playErr) => {
                      console.error("Error playing video:", playErr);
                      setError(
                        "Failed to start video playback. Please refresh and try again."
                      );
                      setIsLoading(false);
                    });
                }
              }, 100);
            }
          };

          // Handle video play events
          videoRef.current.onplay = () => {
            console.log("Video play event fired");
          };

          videoRef.current.oncanplay = () => {
            console.log("Video can play event fired");
          };

          // Handle errors
          videoRef.current.onerror = (e) => {
            console.error("Video error:", e);
            setError("Video playback error occurred");
            setIsLoading(false);
          };

          setStream(mediaStream);
        } else {
          console.error("Video ref not available");
          setError("Video element not found");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setStream(null);
        setIsCameraReady(false);
        setIsLoading(false);

        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera access denied. Please allow camera permission and refresh the page."
          );
        } else if (err.name === "NotFoundError") {
          setError("No camera found. Please connect a camera device.");
        } else if (err.name === "NotReadableError") {
          setError(
            "Camera is in use by another application. Please close other camera apps and try again."
          );
        } else if (err.name === "OverconstrainedError") {
          setError(
            "Camera constraints not supported. Please try refreshing the page."
          );
        } else {
          setError(
            `Camera access failed: ${
              err.message || "Unknown error"
            }. Please ensure you're using HTTPS or localhost.`
          );
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty dependency array - run only once on mount

  const startLiveAction = () => {
    if (!stream || !isCameraReady) {
      setError("Camera not ready. Cannot start live action.");
      return;
    }

    // Verify video stream is still active
    if (videoRef.current && (!videoRef.current.srcObject || !videoRef.current.srcObject.active)) {
      setError("Camera stream has been interrupted. Please restart camera.");
      return;
    }

    const autoCollectionName = `LiveAction_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}`;
    setCurrentCollectionName(autoCollectionName);

    setIsLiveActionActive(true);
    setCapturedLiveImages([]);
    setCapturedScreenshots([]);
    setCaptureCount(0);
    setLiveActionTimer(captureDuration);
    setPhotoDataUrl(null);
    setError("");

    // Ensure video is playing before starting capture
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(err => {
        console.error("Failed to resume video playback:", err);
        setError("Failed to resume camera. Please restart.");
        setIsLiveActionActive(false);
        return;
      });
    }

    setTimeout(async () => {
      const initialPhoto = await takePhoto();
      let initialScreen = null;

      if (initialPhoto) {
        if (isScreenSharing && screenVideoRef.current) {
          try {
            await waitForScreenVideoReady(screenVideoRef.current);
            initialScreen = await captureScreen();
            console.log("Initial screen captured:", !!initialScreen);
          } catch (err) {
            setError(`Screen capture failed: ${err.message}`);
            console.error("Screen capture failed:", err);
          }
        }
        addImageToCollection(initialPhoto, initialScreen);
      } else {
        console.warn("Initial photo capture failed");
        setError("Failed to capture initial photo. Please check camera connection.");
      }
    }, 1000); // Increased delay to ensure video is ready

    const interval = setInterval(async () => {
      // Check if video stream is still healthy
      if (videoRef.current && (!videoRef.current.srcObject || !videoRef.current.srcObject.active)) {
        console.error("Video stream lost during live action");
        setError("Camera stream was interrupted during live action. Stopping capture.");
        stopLiveAction();
        return;
      }

      const capturedPhoto = await takePhoto();
      let capturedScreen = null;

      if (capturedPhoto) {
        if (isScreenSharing && screenVideoRef.current) {
          try {
            await waitForScreenVideoReady(screenVideoRef.current);
            capturedScreen = await captureScreen();
            console.log("Interval screen captured:", !!capturedScreen);
          } catch (err) {
            setError(`Screen capture failed: ${err.message}`);
            console.error("Screen capture failed during interval:", err);
          }
        }
        addImageToCollection(capturedPhoto, capturedScreen);
      } else {
        console.warn("Interval photo capture failed");
        // Don't stop live action for a single failed capture, but log it
      }
    }, captureInterval * 1000);

    setLiveActionIntervalId(interval);

    const timer = setInterval(() => {
      setLiveActionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopLiveAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      clearInterval(timer);
      stopLiveAction();
    }, captureDuration * 1000);

    const captureMode = includeScreenCapture
      ? "camera + screen"
      : "camera only";
    showSuccessMessage(
      `Live action started! Capturing ${captureMode} every ${captureInterval} seconds for ${Math.floor(
        captureDuration / 60
      )} minutes.`
    );
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
      showSuccessMessage(
        `Collection "${currentCollectionName}" saved with ${captureCount} photos.`
      );
    }

    // Gather all stepwise responses
    const allStepDetails = stepAnalyses
      .map(
        (step, idx) =>
          `---\n**Step ${step.step}**\n- **Camera:**\n${
            step.camera
          }\n- **Screen:**\n${step.screen || "N/A"}\n- **Combined Insight:**\n${
            step.combined
          }\n`
      )
      .join("\n");
    if (stepAnalyses.length > 0) {
      const summaryPrompt = `You are a brilliant, friendly, and witty AI assistant. Here is a sequence of stepwise analyses from a live camera and screen capture session. Each step includes a camera analysis, a screen analysis, and a combined insight.\n\nReview all steps and synthesize a smart, insightful, and engaging overall conclusion for the user.\n\n**Instructions:**\n- Use GitHub-flavored Markdown\n- Start with a creative section header (e.g., 🏁 Final Activity Conclusion, 🧩 Big Picture, 🎯 What It All Means)\n- Summarize the flow and intent of the user's activity\n- Highlight key patterns, changes, or surprises\n- Offer actionable advice, encouragement, or a curious follow-up question\n- Use emojis and a clever, helpful tone\n\n**Stepwise Details:**\n${allStepDetails}`;
      try {
        const summary = await analyzeMultimodal({
          context: "Final Activity Conclusion",
          voiceText: summaryPrompt,
        });
        setFinalAiSummary(summary);
      } catch (error) {
        setFinalAiSummary("Failed to generate final activity conclusion.");
      }
    }
    setCurrentCollectionName("");
    setStepCounter(1);
    // Do NOT clear stepAnalyses, aiResponses, or capturedLiveImages here
  };

  const toggleVoiceChat = () => {
    if (isVoiceChatActive) {
      setIsVoiceChatActive(false);
      stopListening();
      stopSpeaking();
      showSuccessMessage("Voice chat disabled");
    } else {
      setIsVoiceChatActive(true);
      showSuccessMessage("Voice chat enabled - start speaking!");
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      showSuccessMessage("Screen sharing stopped");
    } else {
      try {
        await startScreenShare();
        showSuccessMessage("Screen sharing started");
      } catch (error) {
        setError(`Failed to start screen sharing: ${error.message}`);
      }
    }
  };

  const handleManualAnalysis = async () => {
    try {
      let cameraImage = null;
      let screenImage = null;

      if (isCameraReady) {
        cameraImage = await takePhoto();
      }

      if (isScreenSharing) {
        screenImage = await captureScreen();
      }

      const response = await analyzeMultimodal({
        cameraImage,
        screenImage,
        context: "Manual analysis request",
      });

      setCurrentResponse(response);

      if (ttsEnabled && response) {
        await speak(response);
      }

      showSuccessMessage("Analysis completed!");
    } catch (error) {
      setError("Manual analysis failed - please try again");
    }
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    showSuccessMessage("Photo cleared.");
  };

  const restartCamera = async () => {
    try {
      // Stop current stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      
      // Stop live action if active
      if (isLiveActionActive) {
        setIsLiveActionActive(false);
        if (liveActionIntervalId) {
          clearInterval(liveActionIntervalId);
          setLiveActionIntervalId(null);
        }
      }
      
      setIsCameraReady(false);
      setIsLoading(true);
      setError("");
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Restart camera with enhanced constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 },
          aspectRatio: { ideal: 16/9 },
          deviceId: undefined,
          groupId: undefined
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
                  // Enhanced video setup
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              // Don't set width/height on the video element itself
              // Let CSS handle the sizing
              console.log("Video metadata loaded:", {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState
              });
              
              videoRef.current.play()
                .then(() => {
                  console.log("Camera restarted successfully");
                  setIsCameraReady(true);
                  setIsLoading(false);
                  showSuccessMessage("Camera restarted successfully!");
                })
                .catch((playErr) => {
                  console.error("Error playing video after restart:", playErr);
                  setError("Failed to restart camera playback");
                  setIsLoading(false);
                });
            }
          };

        // Add error handling
        videoRef.current.onerror = (e) => {
          console.error("Video error after restart:", e);
          setError("Video playback error after restart");
          setIsLoading(false);
        };

        setStream(mediaStream);
      } else {
        throw new Error("Video element not available");
      }
    } catch (err) {
      console.error("Error restarting camera:", err);
      setError(`Failed to restart camera: ${err.message}. Please refresh the page.`);
      setIsLoading(false);
    }
  };

  const clearLiveImages = () => {
    setCapturedLiveImages([]);
    setCapturedScreenshots([]);
    setCaptureCount(0);
    setCurrentCollectionName("");
    setAiResponses({});
    setFinalAiSummary("");
    showSuccessMessage("Live action photos cleared.");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (mins > 0) {
      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
    }
    return `${remainingSecs}s`;
  };

  const saveCollection = () => {
    if (capturedLiveImages.length === 0) {
      setError("No images to save. Please capture some photos first.");
      return;
    }

    const name =
      collectionName.trim() ||
      `Collection_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
    const collectionData = {
      name,
      images: capturedLiveImages,
      screenshots: capturedScreenshots, // Save screenshots
      aiResponses: Object.fromEntries(
        capturedLiveImages.map((img) => [
          img,
          aiResponses[img] || "No analysis yet",
        ])
      ),
      captureInterval,
      captureDuration,
      timestamp: new Date().toISOString(),
      count: capturedLiveImages.length,
    };

    try {
      localStorage.setItem(
        `camera_collection_${name}`,
        JSON.stringify(collectionData)
      );
      setSavedCollections((prev) => [...prev.filter((c) => c !== name), name]);
      setCollectionName("");
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
        setCapturedScreenshots(collectionData.screenshots || []); // Load screenshots
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

  // Find the step analysis by image key
  const getStepAnalysisByImage = (imgKey) =>
    stepAnalyses.find((step, idx) => capturedLiveImages[idx] === imgKey);

  const getCameraDebugInfo = () => {
    if (!videoRef.current) return "No video element";
    
    const video = videoRef.current;
    return {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      ended: video.ended,
      hasSrcObject: !!video.srcObject,
      streamActive: video.srcObject?.active,
      streamTracks: video.srcObject?.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      })) || [],
      // Add more debug info
      currentTime: video.currentTime,
      duration: video.duration,
      networkState: video.networkState,
      readyState: video.readyState
    };
  };

  const testCameraCapture = async () => {
    try {
      const testPhoto = await takePhoto();
      if (testPhoto) {
        showSuccessMessage("Test capture successful!");
        console.log("Test capture worked:", testPhoto.substring(0, 50) + "...");
      } else {
        setError("Test capture failed - no image data");
      }
    } catch (error) {
      setError("Test capture error: " + error.message);
    }
  };

  const checkCameraStatus = () => {
    if (!videoRef.current) {
      setError("No video element found");
      return false;
    }
    
    const video = videoRef.current;
    const status = {
      hasVideo: !!video,
      hasSrcObject: !!video.srcObject,
      streamActive: video.srcObject?.active,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      ended: video.ended,
      currentTime: video.currentTime
    };
    
    console.log("Camera Status:", status);
    
    if (!video.srcObject) {
      setError("No camera stream attached");
      return false;
    }
    
    if (!video.srcObject.active) {
      setError("Camera stream is not active");
      return false;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera video has no dimensions");
      return false;
    }
    
    if (video.paused) {
      setError("Camera video is paused");
      return false;
    }
    
    showSuccessMessage("Camera status check passed!");
    return true;
  };

  // Enhanced Modal component
  function ResponseModal({ open, onClose, stepData }) {
    const modalRef = useRef(null);
    useEffect(() => {
      if (open && modalRef.current) {
        modalRef.current.focus();
      }
      function handleKeyDown(e) {
        if (e.key === "Escape") onClose();
      }
      if (open) {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
      }
    }, [open, onClose]);
    if (!open || !stepData) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        tabIndex={-1}
        ref={modalRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        aria-modal="true"
        role="dialog"
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative animate-fade-in max-h-[80vh] overflow-y-auto focus:outline-none"
          tabIndex={0}
        >
          <button
            onClick={onClose}
            className="sticky top-0 right-0 float-right z-10 text-gray-500 hover:text-red-600 text-2xl font-bold bg-white bg-opacity-80 rounded-full px-2 py-1 focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">
            Step {stepData.step} Full Analysis
          </h2>
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800 mb-1">
              Camera Analysis
            </h3>
            <div className="bg-gray-50 rounded p-3 text-gray-700 whitespace-pre-line">
              {stepData.camera}
            </div>
          </div>
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800 mb-1">
              Screen Analysis
            </h3>
            <div className="bg-gray-50 rounded p-3 text-gray-700 whitespace-pre-line">
              {stepData.screen || "N/A"}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-purple-800 mb-1">
              Combined Insight
            </h3>
            <div className="bg-purple-50 rounded p-3 text-purple-900 whitespace-pre-line">
              {stepData.combined}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Enhanced AI Camera Studio
            </h1>
            <p className="text-gray-600">
              Advanced camera capture with screen sharing, voice interaction,
              and multimodal AI analysis
            </p>

            {/* Status Indicators */}
            <div className="mt-4 flex justify-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">
                  Queue: {queueStatus.pending + queueStatus.running}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-800">
                  Cache: {queueStatus.cacheSize}
                </span>
              </div>
              {isMobile && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-800">Mobile Device</span>
                </div>
              )}
              {isScreenSharing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-800">Screen Active</span>
                </div>
              )}
              {isVoiceChatActive && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <MessageCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-800">Voice Chat</span>
                </div>
              )}
              {(isCameraAnalyzing || isMultimodalAnalyzing) && (
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

          {/* Error Messages */}
          {(error || screenError || voiceError) && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0" />
              <span className="text-red-800">
                {error || screenError || voiceError}
              </span>
            </div>
          )}

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Camera and Screen Interface */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Camera Feed */}
                  <div className="relative">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      Camera Feed
                    </h3>
                    <div className="bg-gray-100 rounded-lg overflow-hidden relative">
                      {isLoading && (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                      )}

                      {!isCameraReady && !isLoading && (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
                          <div className="text-center">
                            <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 mb-2">Camera not ready</p>
                            {error && (
                              <p className="text-xs text-red-600 mb-3 max-w-xs">
                                {error.includes("black") ? "Camera showing black screen" : error}
                              </p>
                            )}
                            <button 
                              onClick={restartCamera}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
                            >
                              <Camera className="w-4 h-4" />
                              Restart Camera
                            </button>
                          </div>
                        </div>
                      )}

                      <video
                        ref={videoRef}
                        className={`w-full h-auto block rounded-lg transition-opacity duration-300 ${
                          isCameraReady ? 'opacity-100' : 'opacity-0'
                        }`}
                        autoPlay
                        playsInline
                        muted
                        style={{ 
                          minHeight: '240px',
                          backgroundColor: '#000',
                          objectFit: 'cover'
                        }}
                      />
                      
                      {/* Camera Status Indicator */}
                      {isCameraReady && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          Camera Ready
                        </div>
                      )}

                      {isLiveActionActive && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                          LIVE • {formatTime(liveActionTimer)}
                        </div>
                      )}

                      {isVoiceChatActive && isListening && (
                        <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          Listening...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Screen Share Feed */}
                  <div className="relative">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Screen Share
                    </h3>
                    <div className="bg-gray-100 rounded-lg overflow-hidden relative min-h-[200px] flex items-center justify-center">
                      <video
                        ref={screenVideoRef}
                        className="w-full h-auto block rounded-lg"
                        autoPlay
                        playsInline
                        muted
                        style={{ display: isScreenSharing ? "block" : "none" }}
                      />
                      {!isScreenSharing && (
                        <div className="text-gray-500 text-center">
                          <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Screen sharing not active</p>
                          {isMobile && (
                            <p className="text-xs text-gray-400 mt-1">
                              Limited support on mobile
                            </p>
                          )}
                        </div>
                      )}
                      {/* Error message if video not ready after 2s */}
                      {isScreenSharing &&
                        screenVideoRef.current &&
                        screenVideoRef.current.videoWidth === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-yellow-50 bg-opacity-80">
                            <span className="text-yellow-700 font-medium">
                              Waiting for screen preview... If nothing appears,
                              try stopping and restarting screen share.
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Control Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={takePhoto}
                    disabled={!isCameraReady || isLiveActionActive}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      !isCameraReady || isLiveActionActive
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    Capture
                  </button>

                  <button
                    onClick={toggleScreenShare}
                    disabled={isMobile && !isScreenSharingSupported}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      isMobile && !isScreenSharingSupported
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : isScreenSharing
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
                        : "bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    {isScreenSharing ? (
                      <ScreenShareOff className="w-4 h-4" />
                    ) : (
                      <ScreenShare className="w-4 h-4" />
                    )}
                    {isScreenSharing ? "Stop Share" : "Share Screen"}
                    {isMobile && !isScreenSharingSupported && (
                      <span className="text-xs ml-1">(Mobile)</span>
                    )}
                  </button>

                  <button
                    onClick={toggleVoiceChat}
                    disabled={!isVoiceSupported}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      !isVoiceSupported
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : isVoiceChatActive
                        ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                        : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    {isVoiceChatActive ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                    {isVoiceChatActive ? "End Chat" : "Voice Chat"}
                  </button>

                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Settings className="w-4 h-4" />
                    Debug
                  </button>
                </div>

                {/* Debug Information */}
                {showDebugInfo && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Camera Debug Information
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <pre className="bg-white p-3 rounded border text-xs overflow-auto">
                        {JSON.stringify(getCameraDebugInfo(), null, 2)}
                      </pre>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            console.log("Camera Debug Info:", getCameraDebugInfo());
                            showSuccessMessage("Debug info logged to console");
                          }}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Log to Console
                        </button>
                        <button
                          onClick={testCameraCapture}
                          className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Test Capture
                        </button>
                        <button
                          onClick={checkCameraStatus}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                        >
                          Check Status
                        </button>
                        <button
                          onClick={restartCamera}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Force Restart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Screen Sharing Warning */}
                {showMobileWarning && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-2">
                          Mobile Screen Sharing
                        </h4>
                        <p className="text-sm text-yellow-700 mb-3">
                          Screen sharing may not work on all mobile devices.
                          Here are some tips:
                        </p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• Use Chrome or Firefox on Android</li>
                          <li>• Use Safari on iOS (iOS 11+)</li>
                          <li>• Make sure you're using HTTPS</li>
                          <li>• Allow screen sharing when prompted</li>
                          <li>
                            • Try sharing a specific tab instead of the entire
                            screen
                          </li>
                        </ul>
                        {deviceCapabilities && (
                          <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                            <strong>Device Info:</strong>{" "}
                            {deviceCapabilities.browser || "Unknown browser"} on{" "}
                            {deviceCapabilities.platform}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Screen Sharing Error */}
                {screenError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-800 mb-1">
                          Screen Sharing Error
                        </h4>
                        <p className="text-sm text-red-700">{screenError}</p>
                        {isMobile && (
                          <p className="text-xs text-red-600 mt-2">
                            💡 Try using camera capture instead for mobile
                            devices
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleManualAnalysis}
                  disabled={!isCameraReady && !isScreenSharing}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    !isCameraReady && !isScreenSharing
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Analyze Now
                </button>
              </div>

              {/* Voice Controls */}
              {isVoiceChatActive && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Voice Chat Active
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isListening
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {isListening ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={toggleTTS}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          ttsEnabled
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-gray-400 hover:bg-gray-500 text-white"
                        }`}
                      >
                        {ttsEnabled ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {(transcript || interimTranscript) && (
                    <div className="mb-3 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-600 mb-1">You said:</p>
                      <p className="text-gray-800">
                        {transcript}
                        <span className="text-gray-400 italic">
                          {interimTranscript}
                        </span>
                      </p>
                    </div>
                  )}

                  {isSpeaking && (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      AI is speaking...
                    </div>
                  )}
                </div>
              )}

              {/* Live Action Controls */}
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={
                    isLiveActionActive ? stopLiveAction : startLiveAction
                  }
                  disabled={!isCameraReady}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    !isCameraReady
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isLiveActionActive
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
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

            {/* Current AI Response */}
            {currentResponse && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-600" />
                  AI Analysis Response
                </h2>
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <div className="whitespace-pre-line text-gray-800">
                    {currentResponse}
                  </div>
                  {ttsEnabled && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
                      <Volume2 className="w-4 h-4" />
                      TTS enabled - Response will be spoken
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Captured Photo */}
            {photoDataUrl && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Last Captured Photo
                </h2>
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
                    download={`photo_${new Date()
                      .toISOString()
                      .slice(0, 19)
                      .replace(/:/g, "-")}.png`}
                    className="flex-1 flex items-center justify-center gap-3 py-3 px-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <Download className="w-5 h-5" />
                    Download Photo
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Enhanced Settings
                </h2>
              </div>

              {/* Screen Capture Toggle */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeScreenCapture}
                    onChange={(e) => setIncludeScreenCapture(e.target.checked)}
                    disabled={isLiveActionActive}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Include Screen Capture
                    </span>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Capture both camera and screen during live action
                </p>
              </div>

              {/* Voice Settings */}
              {isVoiceSupported && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Voice Settings
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ttsEnabled}
                        onChange={toggleTTS}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">
                          Text-to-Speech
                        </span>
                      </div>
                    </label>
                    <p className="text-xs text-gray-500 ml-7">
                      AI responses will be spoken aloud
                    </p>
                  </div>
                </div>
              )}

              {/* Capture Interval Setting */}
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
                    <span className="font-medium text-purple-600">
                      {captureInterval}s
                    </span>
                    <span>60s</span>
                  </div>
                </div>
              </div>

              {/* Capture Duration Setting */}
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
                    <span className="font-medium text-purple-600">
                      {formatDuration(captureDuration)}
                    </span>
                    <span>10m</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Settings Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Current Configuration
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    Interval:{" "}
                    <span className="font-medium text-purple-600">
                      {captureInterval}s
                    </span>
                  </div>
                  <div>
                    Duration:{" "}
                    <span className="font-medium text-purple-600">
                      {formatDuration(captureDuration)}
                    </span>
                  </div>
                  <div>
                    Expected:{" "}
                    <span className="font-medium text-purple-600">
                      ~{Math.floor(captureDuration / captureInterval) + 1}
                    </span>
                  </div>
                  <div>
                    Screen:{" "}
                    <span className="font-medium text-purple-600">
                      {includeScreenCapture ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div>
                    Voice:{" "}
                    <span className="font-medium text-purple-600">
                      {isVoiceChatActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    TTS:{" "}
                    <span className="font-medium text-purple-600">
                      {ttsEnabled ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-orange-600" />
                Conversation History ({conversationHistory.length})
              </h2>
              <button
                onClick={() => setConversationHistory([])}
                className="flex items-center gap-2 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-200"
              >
                <X className="w-4 h-4" />
                Clear History
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                    <span>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    {entry.hasCamera && (
                      <Camera className="w-3 h-3 text-blue-500" />
                    )}
                    {entry.hasScreen && (
                      <Monitor className="w-3 h-3 text-purple-500" />
                    )}
                  </div>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      You said:
                    </p>
                    <p className="text-gray-800 bg-gray-50 rounded p-2 text-sm">
                      {entry.userInput}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      AI responded:
                    </p>
                    <p className="text-gray-800 bg-blue-50 rounded p-2 text-sm whitespace-pre-line">
                      {entry.aiResponse}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Action Gallery */}
        {capturedLiveImages.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Enhanced Collection ({capturedLiveImages.length} photos)
                {currentCollectionName && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    • {currentCollectionName}
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={clearLiveImages}
                  className="flex items-center gap-2 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {capturedLiveImages.map((imgSrc, index) => (
                <div
                  key={index}
                  className="relative group flex flex-col items-center"
                >
                  {/* Camera Image */}
                  <img
                    src={imgSrc}
                    alt={`Camera Image ${index + 1}`}
                    className="w-full h-32 object-contain bg-white rounded-lg shadow-md border border-gray-200 mb-2"
                  />
                  {/* Screen Image (if available) */}
                  {capturedScreenshots[index] ? (
                    <img
                      src={capturedScreenshots[index]}
                      alt={`Screen Capture ${index + 1}`}
                      className="w-full h-32 object-contain bg-gray-50 rounded-lg shadow-md border border-blue-200 mb-2"
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-2 text-xs text-gray-400">
                      No screen capture
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    {(index + 1).toString().padStart(3, "0")}
                  </div>
                  {/* Enhanced AI response section */}
                  <div
                    className="group max-h-[120px] overflow-y-auto w-full text-left whitespace-pre-line break-words px-2 py-2 rounded-lg border border-gray-200 bg-white shadow-sm cursor-pointer hover:bg-purple-50 transition relative"
                    onClick={() => {
                      if (stepAnalyses[index]) {
                        setModalImageKey(imgSrc);
                        setModalOpen(true);
                      }
                    }}
                    title={
                      stepAnalyses[index]
                        ? "Click to read full analysis"
                        : "Analysis not ready yet"
                    }
                    style={{
                      pointerEvents: stepAnalyses[index] ? "auto" : "none",
                      opacity: stepAnalyses[index] ? 1 : 0.5,
                    }}
                  >
                    {stepAnalyses[index] ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mr-1">
                            C
                          </span>
                          <span className="font-semibold text-blue-800">
                            Camera
                          </span>
                        </div>
                        <div className="text-blue-900 text-sm mb-2 pl-6">
                          {stepAnalyses[index].camera}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-700 rounded-full text-xs font-bold mr-1">
                            S
                          </span>
                          <span className="font-semibold text-green-800">
                            Screen
                          </span>
                        </div>
                        <div className="text-green-900 text-sm mb-2 pl-6">
                          {stepAnalyses[index].screen || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mr-1">
                            ∑
                          </span>
                          <span className="font-semibold text-purple-800">
                            Combined Insight
                          </span>
                        </div>
                        <div className="text-purple-900 text-sm pl-6">
                          {stepAnalyses[index].combined}
                        </div>
                        <span className="absolute top-1 right-2 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition">
                          Click to read full analysis
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Processing...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Final Conclusion */}
        {finalAiSummary && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-purple-600" />
              AI Final Conclusion
            </h2>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="whitespace-pre-line text-gray-800">
                {finalAiSummary}
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
        <UserGuide />
        <ResponseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          stepData={getStepAnalysisByImage(modalImageKey)}
        />
      </div>
    </>
  );
};

export default EnhancedCameraCapture;
