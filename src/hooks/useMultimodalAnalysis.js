import { useState, useCallback } from 'react';
import { generateImageHash } from '../utils/imageOptimizer';

export const useMultimodalAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const analyzeMultimodal = useCallback(async (options = {}) => {
    const { cameraImage, screenImage, voiceText, context } = options;
    
    if (!cameraImage && !screenImage && !voiceText) {
      return 'No input provided for analysis';
    }
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/gemini-multimodel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraImage,
          screenImage,
          voiceText,
          context,
          sessionId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add to analysis history
      const analysisEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        inputs: {
          hasCamera: !!cameraImage,
          hasScreen: !!screenImage,
          hasVoice: !!voiceText,
          voiceText: voiceText || null
        },
        response: data.response,
        cached: data.cached,
        sessionId: data.sessionId
      };
      
      setAnalysisHistory(prev => [analysisEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
      
      return data.response;
    } catch (error) {
      console.error('Multimodal analysis failed:', error);
      return 'Analysis failed - please try again';
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId]);

  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
  }, []);

  const getLastAnalysis = useCallback(() => {
    return analysisHistory[0] || null;
  }, [analysisHistory]);

  return {
    analyzeMultimodal,
    isAnalyzing,
    analysisHistory,
    clearHistory,
    getLastAnalysis,
    sessionId
  };
};