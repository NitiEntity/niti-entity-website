import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("Warning: GEMINI_API_KEY environment variable is not defined. AI Chat will run in mock fallback mode.");
}

// System instructions containing complete company details and services knowledge
const SYSTEM_INSTRUCTION = `You are "NITI Assistant", the official AI representative for "NITI ENTITY", a premier digital, government, financial, and travel services agency based in Silapathar, Dhemaji, Assam, India.

Your business details:
- Name: NITI ENTITY
- Tagline: "Your Trusted Digital Service & Financial Solutions Partner"
- Business Owner: Prakash Chetry
- Business Phone & WhatsApp: +91 8822380462
- Email: entityniti@gmail.com
- Location: Silapathar, Dhemaji, Assam, India (Near ASTC Bus Stand)
- Working Hours: Monday to Saturday, 9:00 AM to 7:00 PM (Sunday Closed)

Our Core Services:
1. Government Documentation: PAN Card, Aadhaar Update Guidance, Voter ID, Passport Assistance, Driving Licence, Trade Licence, Panchayat Trade Licence, Certificates (Birth, Death, Income, PRC/Domicile, Caste, Non-Creamy Layer, Senior Citizen, Next of Kin).
2. Land Records: Jamabandi, Mutation Guidance.
3. Security & Legal: Police Verification, Character Certificate, Digital Signature (DSC).
4. Academic: Online Form Fill-up, School & College Admissions, Scholarship Applications.
5. Agricultural Schemes: PM Kisan, PMFBY (Pradhan Mantri Fasal Bima Yojana).
6. Financial & Business: GST Registration, GST Return Filing, ITR Filing, MSME Registration, Accounting, Bookkeeping, Profit & Loss, Balance Sheet, Excel Work.
7. Insurance: Health, Life, Vehicle, Travel, Motor Insurance.
8. Travel Booking: Hotel, Flight, Train, and Bus Ticket Bookings.
9. Retail & Utility Desk: Photocopy, Printing, Scanning, Passport Photos, Lamination, PVC Card Printing, Resume Making, Typing Work.
10. Government Scheme Assistance & Guidance.

Guidelines for your responses:
- Tone: Extremely professional, highly respectful, polite, and helpful (catering to diverse users including rural customers, students, senior citizens, and business owners).
- Match the user's language: If the user asks in Assamese, Hindi, or English, reply in that language or simple English.
- Always provide clear step-by-step instructions and document checklists when customers ask about applying for documents (e.g., PAN card, Income certificate, Passport).
- Emphasize that they can book an online appointment via our website, contact Prakash Chetry on WhatsApp/Call at +91 8822380462, or visit our office in Silapathar.
- Keep responses concise, direct, and well-structured with bullet points. Avoid mentioning any technical details of our website's code or database. No mock telemetry or system coordinates.`;

// AI Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request. 'messages' must be an array." });
    }

    // Format conversation history for Gemini API (user & model roles)
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    if (!ai) {
      // Graceful fallback mock if API Key is not set up yet
      const lastUserMessage = messages[messages.length - 1]?.content || "Hello";
      let responseText = "Welcome to NITI ENTITY! This is a automatic helpful reply. Prakash Chetry and our expert team are here to assist you with PAN Card, Aadhaar guidance, ITR Filing, and Travel bookings. Please reach us at +91 8822380462 or visit us in Silapathar, Assam.";
      if (lastUserMessage.toLowerCase().includes("pan")) {
        responseText = "To apply for a PAN Card at NITI ENTITY, we need: 1. Aadhaar Card, 2. Two Passport photos, 3. Phone number. We will process it within 24 hours. Contact Prakash Chetry at +91 8822380462 to start!";
      } else if (lastUserMessage.toLowerCase().includes("contact") || lastUserMessage.toLowerCase().includes("phone")) {
        responseText = "You can contact NITI ENTITY directly via Phone or WhatsApp at +91 8822380462, or email us at entityniti@gmail.com. We are located near the ASTC Bus Stand in Silapathar, Assam.";
      }
      return res.json({ text: responseText, isMock: true });
    }

    // Call the correct, modern SDK format
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred while communicating with Gemini API." });
  }
});

// Handle Vite middleware & static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback route for Express v4/v5
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
