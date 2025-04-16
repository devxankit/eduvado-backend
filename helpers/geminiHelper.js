import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const educationalPromptWrapper = (userPrompt) => {
  return `As an educational assistant, please provide a clear, structured, and educational response to the following: ${userPrompt}. 
  Make sure to:
  - Break down complex concepts
  - Use examples where appropriate
  - Maintain an educational tone
  - Include key learning points
  - Be accurate and factual
  Only respond with the educational content, no additional commentary or disclaimers.
   Length of answer should be medium in around 250 words `;
};

export const getGeminiTextResponse = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const wrappedPrompt = educationalPromptWrapper(prompt);
    const result = await model.generateContent(wrappedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    throw new Error(`Gemini API Error: ${error.message}`);
  }
};

export const getGeminiImageResponse = async (imageData, prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const wrappedPrompt = educationalPromptWrapper(prompt);
    const result = await model.generateContent([imageData, wrappedPrompt]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    throw new Error(`Gemini API Error: ${error.message}`);
  }
};

export const processAudioFile = async (audioFile) => {
  try {
    if (!audioFile) {
      throw new Error("No audio file received");
    }

    if (!audioFile.buffer && !audioFile.path) {
      throw new Error("Invalid audio file format - missing buffer or path");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let base64AudioFile;
    if (audioFile.buffer) {
      base64AudioFile = audioFile.buffer.toString("base64");
    } else {
      base64AudioFile = fs.readFileSync(audioFile.path, {
        encoding: "base64",
      });
    }

    const validMimeTypes = ["audio/mpeg", "audio/mp3", "audio/wav"];
    if (!validMimeTypes.includes(audioFile.mimetype)) {
      throw new Error(
        `Unsupported audio format: ${audioFile.mimetype}. Please use MP3 or WAV.`
      );
    }

    const contents = [
      { text: "Please transcribe and summarize this audio content." },
      {
        inlineData: {
          mimeType: audioFile.mimetype,
          data: base64AudioFile,
        },
      },
    ];

    const result = await model.generateContent(contents);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Audio processing error details:", {
      error: error.message,
      file: audioFile
        ? {
            mimetype: audioFile.mimetype,
            size: audioFile.size,
            hasBuffer: !!audioFile.buffer,
            hasPath: !!audioFile.path,
          }
        : "No file",
    });
    throw new Error(`Audio Processing Error: ${error.message}`);
  }
};

export const processAudioToText = async (audioText) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const wrappedPrompt = educationalPromptWrapper(audioText);
    const result = await model.generateContent(wrappedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    throw new Error(`Audio Processing Error: ${error.message}`);
  }
};
