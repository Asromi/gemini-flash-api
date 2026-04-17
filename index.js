import {GoogleGenAI} from '@google/genai';
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import cors from "cors";
import path from "path";

const app = express();
const port = 3003;
const model = 'gemini-3-flash-preview';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment');
  process.exit(1);
}
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      // Image formats
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      
      // Audio formats
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/aac',
      
      // Document formats - TAMBAHAN BARU
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      
      // Playlist formats
      'audio/x-mpegurl', // M3U
      'application/mpegurl', // M3U8
      'application/vnd.apple.mpegurl', // M3U8
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Format file tidak didukung. Gunakan format: gambar, audio, dokumen (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV), atau playlist M3U`), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // Maksimal 50MB untuk dokumen
  }
});

app.use(cors());
app.use(express.json());

function extractText(resp) {
  try {
    const text =
      resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
      resp?.response?.candidates?.[0]?.content?.text;

    return text ?? JSON.stringify(resp, null, 2);
  } catch (err) {
    console.error("Error extracting text:", err);
    return JSON.stringify(resp, null, 2);
  }
}

app.get('/', (req, res) => {
  res.send('Hello...');
});

app.post('/generate-text-json', upload.none(), async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    try {
        const resp = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }]
        });
        
        res.json({ response: extractText(resp) });
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/generate-text', upload.none(), async (req, res) => {
  const {contents} = req.body;
  if (!contents) {
    return res.status(400).json({error: 'contents is required'});
  }
  try {
    const response = await ai.models.generateContent({
      model,
      contents,
    });
    res.json({response: response.text});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'An error occurred while generating content.'});
  }
});     

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  const {contents} = req.body;
  const base64Image = req.file ? req.file.buffer.toString('base64') : null; 
  if (!contents) {
    return res.status(400).json({error: 'contents is required'});
  }
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {type: 'text', text: contents}, 
        {type: 'image', image: base64Image},
        {inlineData: {data: base64Image, mimeType: req.file.mimetype} }]
    });
    res.status(200).json({response: response.text});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'An error occurred while generating content.'});
  }
}); 

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const audioBase64 = req.file.buffer.toString('base64');
        const resp = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || "Transkrip audio berikut:" },
                { inlineData: { mimeType: req.file.mimetype, data: audioBase64 } }
            ]
        });
        res.json({ result: extractText(resp) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const docBase64 = req.file.buffer.toString('base64');
        const resp = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: req.file.mimetype, data: docBase64 } }
            ]
        });
        res.json({ result: extractText(resp) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Menggunakan model: ${model}`);
});     

