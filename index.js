import {GoogleGenAI} from '@google/genai';
import 'dotenv/config';
import express from 'express';
import multer from 'multer';

const app = express();
const port = 3000;
const upload = multer();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment');
  process.exit(1);
}

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
const model = 'gemini-3-flash-preview';

app.use(express.json());


app.get('/', (req, res) => {
  res.send('Hello Asromi');
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

app.post('/generate-image', upload.single('image'), async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});     

