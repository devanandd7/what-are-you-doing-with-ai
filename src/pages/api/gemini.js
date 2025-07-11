import fetch from "node-fetch";
require('dotenv').config();




export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // or whatever limit you need
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageDataUrl, text } = req.body;
  if (!imageDataUrl && !text) {
    return res.status(400).json({ error: "Missing imageDataUrl or text" });
  }

  const apiKey = process.env.GEMINI_API_KEY ||"AIzaSyAIjp9sfctu249bXfyB4UTDmScxdgi-f7c" ; // Securely loaded from .env.local
  console.log("Using API", apiKey ? "provided" : "not provided");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const base64Image = imageDataUrl ? imageDataUrl.split(",")[1] : null;

  let requestBody;
  if (imageDataUrl) {
    requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image,
              },
            },
           
            {
              text: `Give response In Hinglish ,Analyze this image in detail. Describe its content, including objects, people, and any discernible context or activity.
    Current time.

    Based on the visual cues and considering the previous analyses provided (if any), infer what the user is doing or attempting to do.

    **If the user appears to be studying, doing homework, or engaged in a learning activity:**
    Provide helpful instructions, tips, or motivational suggestions related to their apparent task. Use a supportive and encouraging tone. For example, "Looks like you're focused on your studies! Remember to take short breaks every hour to keep your mind fresh."

    **If the current time is after 10:00 PM and before 6:00 AM (late night/early morning) AND the user looks relaxed, tired, or is not actively engaged in a task (e.g., just sitting, resting, or looking at something casually):**
    Switch to a casual, friendly, and conversational tone. Compliment their effort or appearance (e.g., "You're looking great!"), ask about what they're learning or doing, and gently suggest resting. Use warm encouragement in Hinglish. For example, "It's quite late, thoda rest kar lo. Mind ko relax karna zaroori hai kaam ke liye!" (It's quite late, take some rest. Mind needs to relax to work!) or "Aaj kaafi der ho gayi hai, ab thoda aaram kar lo. Subah fresh mind se kaam karna!" (It's quite late today, now take some rest. Work with a fresh mind in the morning!).

    **Otherwise (e.g., normal activity during the day, or active engagement not related to studying late at night):**
    Provide a general, insightful analysis of their current activity and surroundings. Ask an open-ended question related to their activity or the image.

    **Important:** Respond in a mix of Hindi and English (Hinglish) where appropriate, especially for conversational parts. Ensure the response is concise and insightful.
IF you studing than show the answer, teach them , guide them and generate response and tell the solution if user studying...`,
            },
          ],
        },
      ],
    };
  } else if (text) {
    requestBody = {
      contents: [
        {
          parts: [{ text }],
        },
      ],
    };
  }

  try {
    console.log(
      "Sending request to Gemini:",
      JSON.stringify(requestBody).slice(0, 500)
    ); // log first 500 chars
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error); // This will help you debug
      return res.status(500).json({ error: "Gemini API error", details: error });
    }

    const data = await response.json();
    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis result";
    res.status(200).json({ response: result });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
