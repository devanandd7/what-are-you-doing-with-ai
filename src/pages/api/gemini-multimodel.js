import NodeCache from 'node-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import crypto from 'crypto';

const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes cache
  checkperiod: 120,
  maxKeys: 1000
});

// Rate limiter: 30 requests per minute per IP for multimodal
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 30,
  duration: 60,
});

// Global rate limiter for API calls to Gemini
const geminiRateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests per minute total for multimodal
  duration: 60,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Increased for screen + camera images
    },
  },
};

const analyzeWithGeminiMultimodal = async (cameraImage, screenImage, voiceText, context) => {
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAIjp9sfctu249bXfyB4UTDmScxdgi-f7c";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const parts = [];
  
  // Add camera image if provided
  if (cameraImage) {
    const base64Camera = cameraImage.split(",")[1];
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Camera,
      },
    });
  }
  
  // Add screen image if provided
  if (screenImage) {
    const base64Screen = screenImage.split(",")[1];
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Screen,
      },
    });
  }
  
  // Create comprehensive prompt
  let promptText = `You are an intelligent AI assistant with multimodal capabilities. Analyze the provided content and respond in Hinglish (mix of Hindi and English).

CONTEXT:
- Current time: ${new Date().toLocaleString()}
- User interaction mode: ${voiceText ? 'Voice + Visual' : 'Visual only'}
${context ? `- Additional context: ${context}` : ''}

ANALYSIS INSTRUCTIONS:
1. **Camera Image Analysis** (if provided): Describe what you see in the camera feed - people, objects, activities, environment.

2. **Screen Content Analysis** (if provided): Analyze the screen content - applications, websites, documents, code, or any visible text/interface.

3. **Voice Input Processing** (if provided): "${voiceText || 'No voice input'}"

4. **Intelligent Response Generation**:
   - If studying/learning content is visible: Provide educational assistance, explanations, or solutions
   - If coding/development work is shown: Offer programming help, debugging tips, or code suggestions
   - If the user seems tired or it's late (after 1 AM): Suggest taking breaks in a caring tone
   - If user is asking questions: Provide comprehensive, helpful answers
   - If screen shows errors or problems: Help troubleshoot and provide solutions

5. **Response Style**:
   - Use Hinglish naturally ( Hinglish)
   - Be conversational and friendly
   - Provide actionable advice when possible
   - Keep responses concise but informative
   - Show empathy and understanding

6. **Special Instructions**:
   - If both camera and screen are provided, correlate the information
   - If user is multitasking, acknowledge and provide relevant guidance
   - If technical content is visible, offer to explain or help
   - Always be encouraging and supportive

Please provide a comprehensive response based on all available inputs.`;

  parts.push({ text: promptText });

  const requestBody = {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis result";
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Rate limiting
    await rateLimiter.consume(req.ip);
    await geminiRateLimiter.consume('global');
  } catch (rateLimiterRes) {
    return res.status(429).json({ 
      error: "Rate limit exceeded", 
      retryAfter: rateLimiterRes.msBeforeNext 
    });
  }

  const { cameraImage, screenImage, voiceText, context, sessionId } = req.body;
  
  if (!cameraImage && !screenImage && !voiceText) {
    return res.status(400).json({ error: "At least one input (camera, screen, or voice) is required" });
  }

  try {
    // Generate cache key based on all inputs
    // Use SHA-256 hash of all relevant data for uniqueness
    const hash = crypto.createHash('sha256');
    hash.update(cameraImage || '');
    hash.update(screenImage || '');
    hash.update(voiceText || '');
    hash.update(context || '');
    const cacheKey = hash.digest('hex');

    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({ 
        response: cachedResult,
        cached: true,
        timestamp: new Date().toISOString(),
        sessionId
      });
    }

    // Analyze with Gemini
    const result = await analyzeWithGeminiMultimodal(cameraImage, screenImage, voiceText, context);
    
    // Cache the result
    cache.set(cacheKey, result);
    
    res.status(200).json({ 
      response: result,
      cached: false,
      timestamp: new Date().toISOString(),
      sessionId
    });
  } catch (error) {
    console.error("Multimodal analysis error:", error);
    res.status(500).json({ 
      error: "Analysis failed", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}