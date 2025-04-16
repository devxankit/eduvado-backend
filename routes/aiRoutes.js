import express from "express";
import multer from "multer";
import {
  getGeminiTextResponse,
  getGeminiImageResponse,
  processAudioFile,
  processAudioToText,
} from "../helpers/geminiHelper.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Text route
router.post("/text", async (req, res) => {
  console.log(`[${new Date().toISOString()}] New text request received`);
  try {
    const { prompt } = req.body;
    if (!prompt) {
      console.log(
        `[${new Date().toISOString()}] Text request failed: Missing prompt`
      );
      return res.status(400).json({ error: "Prompt is required" });
    }
    console.log(
      `[${new Date().toISOString()}] Processing text prompt: "${prompt.substring(
        0,
        50
      )}..."`
    );
    const response = await getGeminiTextResponse(prompt);
    console.log(
      `[${new Date().toISOString()}] Text request completed successfully`
    );
    res.json({ response });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Text request error:`,
      error.message
    );
    res.status(500).json({ error: error.message });
  }
});

// Image route
router.post("/image", upload.single("image"), async (req, res) => {
  console.log(`[${new Date().toISOString()}] New image request received`);
  try {
    const { prompt } = req.body;
    if (!prompt || !req.file) {
      console.log(
        `[${new Date().toISOString()}] Image request failed: Missing ${
          !prompt ? "prompt" : "image"
        }`
      );
      return res
        .status(400)
        .json({ error: "Both image and prompt are required" });
    }

    console.log(
      `[${new Date().toISOString()}] Processing image (${
        req.file.mimetype
      }) with prompt: "${prompt.substring(0, 50)}..."`
    );
    const imageData = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const response = await getGeminiImageResponse(imageData, prompt);
    console.log(
      `[${new Date().toISOString()}] Image request completed successfully`
    );
    res.json({ response });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Image request error:`,
      error.message
    );
    res.status(500).json({ error: error.message });
  }
});

// Audio route
router.post("/audio", upload.single("audio"), async (req, res) => {
  console.log(`[${new Date().toISOString()}] New audio request received`);
  try {
    if (!req.file) {
      console.log(
        `[${new Date().toISOString()}] Audio request failed: Missing audio file`
      );
      return res.status(400).json({ error: "Audio file is required" });
    }

    console.log(
      `[${new Date().toISOString()}] Processing audio file: ${
        req.file.mimetype
      }`
    );

    // Get transcript with better error handling
    let transcript;
    try {
      transcript = await processAudioFile(req.file);
      console.log(
        `[${new Date().toISOString()}] Audio transcribed successfully`
      );
    } catch (transcriptError) {
      console.error(
        `[${new Date().toISOString()}] Transcription error:`,
        transcriptError
      );
      return res.status(500).json({ error: "Failed to transcribe audio" });
    }

    // Process the transcript
    const response = await processAudioToText(transcript);

    console.log(`[${new Date().toISOString()}] Audio response generated`);
    res.json({ transcript, response });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Audio request error:`,
      error.message
    );
    res.status(500).json({ error: error.message });
  }
});

export const aiRouter = router;
