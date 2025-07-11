import { useState, useCallback } from 'react';
import { queueAnalysisRequest, getQueueStatus } from '../utils/requestQueue';
import { generateImageHash, resizeImageForAnalysis } from '../utils/imageOptimizer';

export const useOptimizedAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, running: 0, cacheSize: 0 });

  const analyzeImage = useCallback(async (imageDataUrl) => {
    if (!imageDataUrl) return 'No image provided';
    
    setIsAnalyzing(true);
    
    try {
      // Optimize image for analysis
      const optimizedImage = await resizeImageForAnalysis(imageDataUrl);
      const imageHash = generateImageHash(optimizedImage);
      
      // Update queue status
      setQueueStatus(getQueueStatus());
      
      // Queue the analysis request
      const result = await queueAnalysisRequest(optimizedImage, imageHash);
      
      return result;
    } catch (error) {
      console.error('Analysis failed:', error);
      return 'Analysis failed - please try again';
    } finally {
      setIsAnalyzing(false);
      setQueueStatus(getQueueStatus());
    }
  }, []);

  const analyzeText = useCallback(async (text) => {
    if (!text) return 'No text provided';
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/gemini-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Text analysis failed:', error);
      return 'Text analysis failed - please try again';
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeImage,
    analyzeText,
    isAnalyzing,
    queueStatus
  };
};