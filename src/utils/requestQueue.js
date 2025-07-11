import PQueue from 'p-queue';

// Create a queue for API requests to prevent overwhelming the server
const apiQueue = new PQueue({ 
  concurrency: 10, // Max 10 concurrent requests
  interval: 1000,  // Per second
  intervalCap: 15  // Max 15 requests per second
});

// Cache for storing recent analysis results
const analysisCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const queueAnalysisRequest = async (imageDataUrl, imageHash) => {
  // Check cache first
  const cacheKey = imageHash;
  const cachedResult = analysisCache.get(cacheKey);
  
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
    return cachedResult.result;
  }
  
  // Add to queue
  return apiQueue.add(async () => {
    try {
      const response = await fetch('/api/gemini-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl, imageHash }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      analysisCache.set(cacheKey, {
        result: data.response,
        timestamp: Date.now()
      });
      
      return data.response;
    } catch (error) {
      console.error('Queue analysis request failed:', error);
      throw error;
    }
  });
};

export const getQueueStatus = () => ({
  pending: apiQueue.pending,
  running: apiQueue.size,
  cacheSize: analysisCache.size
});

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes