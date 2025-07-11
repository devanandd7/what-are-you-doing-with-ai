import NodeCache from 'node-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes cache
  checkperiod: 120,
  maxKeys: 1000
});

// Rate limiter: 20 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 20,
  duration: 60,
});

// Global rate limiter for API calls to Gemini
const geminiRateLimiter = new RateLimiterMemory({
  points: 60, // 60 requests per minute total
  duration: 60,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

const analyzeWithGemini = async (imageDataUrl, text) => {
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAIjp9sfctu249bXfyB4UTDmScxdgi-f7c";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  let requestBody;
  if (imageDataUrl) {
    const base64Image = imageDataUrl.split(",")[1];
    requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Give response In Hinglish. Analyze this image in detail. Describe its content, including objects, people, and any discernible context or activity.

Based on the visual cues and considering the previous analyses provided (if any), infer what the user is doing or attempting to do.

**If the user appears to be studying, doing homework, or engaged in a learning activity:**
Provide helpful instructions, tips, or motivational suggestions related to their apparent task. Use a supportive and encouraging tone.

**If the current time is after 10:00 PM and before 6:00 AM (late night/early morning) AND the user looks relaxed, tired, or is not actively engaged in a task:**
Switch to a casual, friendly, and conversational tone. Compliment their effort or appearance, ask about what they're learning or doing, and gently suggest resting. Use warm encouragement in Hinglish.

**Otherwise:**
Provide a general, insightful analysis of their current activity and surroundings. Ask an open-ended question related to their activity or the image.

**Important:** Respond in a mix of Hindi and English (Hinglish) where appropriate. Ensure the response is concise and insightful.
IF you studying than show the answer, teach them, guide them and generate response and tell the solution if user studying...`,
          },
        ],
      }],
    };
  } else if (text) {
    requestBody = {
      contents: [{
        parts: [{ text }],
      }],
    };
  }

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

  const { imageDataUrl, text, imageHash } = req.body;
  
  if (!imageDataUrl && !text) {
    return res.status(400).json({ error: "Missing imageDataUrl or text" });
  }

  try {
    // Generate cache key
    const cacheKey = imageHash || (imageDataUrl ? 
      Buffer.from(imageDataUrl.substring(0, 100)).toString('base64') : 
      Buffer.from(text).toString('base64'));

    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({ 
        response: cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Analyze with Gemini
    const result = await analyzeWithGemini(imageDataUrl, text);
    
    // Cache the result
    cache.set(cacheKey, result);
    
    res.status(200).json({ 
      response: result,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      error: "Server error", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}