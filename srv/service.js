const cds = require('@sap/cds');
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth"); //docs
const xlsx = require("xlsx");
const pdf = require('pdf-parse');
const { OpenAI } = require('openai');  //OpenAI Node.js SDK/package.
const unzipper = require("unzipper");  //for ppt
const axios = require("axios");
const cheerio = require("cheerio");
const multer = require('multer');
const upload = multer();
const FormData = require('form-data');
const { Readable } = require('stream');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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' 
});
const ASSEMBLY_API_KEY = '2408e2c29ec644a2881ab30d9045d465';
//2408e2c29ec644a2881ab30d9045d465
// cds.on('bootstrap', app => {
//   // Increase limit to 5MB (or more if needed)
//   app.use(bodyParser.json({ limit: '5mb' }));
//   app.use(bodyParser.raw({ limit: '5mb', type: '*/*' })); // Important for binary PDF uploads
// });

// module.exports = cds.server;

module.exports = async function (srv) {
  const db = await cds.connect.to('db');
   
   // Upload document
   srv.on("UploadDocument", async (req) => {
    const { filename, content } = req.data;
    const buffer = Buffer.from(content, "base64");
    const ext = path.extname(filename).toLowerCase();

    let text = "";
    try {
      if (ext === ".pdf") {
        const parsed = await pdf(buffer);
        text = parsed.text;
      } else if (ext === ".txt") {
        text = buffer.toString("utf-8");
      } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (ext === ".xlsx") {
        const workbook = xlsx.read(buffer, { type: "buffer" });
        text = workbook.SheetNames.map(sheet =>
          xlsx.utils.sheet_to_csv(workbook.Sheets[sheet])
        ).join("\n");
      } else if (ext === ".pptx") {
        text = await extractPPTXText(buffer);
      } else {
        return req.error(400, "Unsupported file type");
      }

      const id = cds.utils.uuid();
      await INSERT.into("docqa.Documents").entries({
        ID: id,
        filename,
        content: text
      });

      return id;
    } catch (err) {
      console.error("File parse error:", err.message);
      req.error(500, "Failed to parse file content");
    }
  });

  // Generate embeddings
  srv.on('GenerateEmbeddings', async (req) => {
    try {
      const docID = req.data.docID;
      const doc = await SELECT.one.from('docqa.Documents').where({ ID: docID });

      if (!doc || !doc.content) return req.error(404, 'Document not found.');

      const ext = doc.filename?.split('.').pop().toLowerCase();
      let chunks;

      if (ext === 'pptx' || ext === 'xlsx') {
        chunks = splitByLine(doc.content);
      } else {
        chunks = splitBySentence(doc.content);
      }

      const BATCH_SIZE = 50;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: batch
        });

        for (let j = 0; j < batch.length; j++) {
          await INSERT.into('docqa.Embeddings').entries({
            ID: cds.utils.uuid(),
            doc_ID: { ID: docID },
            chunk: batch[j],
            vector: JSON.stringify(embeddingRes.data[j].embedding)
          });
        }
      }

      return 'Embeddings stored successfully';
    } catch (err) {
      console.error('Error generating embeddings:', err.message);
      req.error(500, 'Embedding generation failed.');
    }
  });

  // Ask question
  srv.on('AskQuestion', async (req) => {
    const { question, docID } = req.data;

    if (!question || !docID) return req.error(400, 'Missing question or docID.');

    const qEmbedRes = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: [question]
    });

    const qVector = qEmbedRes.data[0].embedding;

    const chunks = await SELECT.from('docqa.Embeddings').where({ doc_ID: docID });
    if (!chunks.length) return req.error(404, 'No embeddings for this document.');

    const scored = chunks.map(c => {
      const vec = JSON.parse(c.vector);
      const sim = cosineSimilarity(vec, qVector);
      return { ...c, similarity: sim };
    });

    const topChunks = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    const context = topChunks.map(c => c.chunk).join('\n\n');

    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Answer only using the provided context. If unsure, say "The document does not contain this information."`
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ]
    });

    const answer = chatRes.choices[0].message.content;
   
    //  newly added here
    // Save question and answer to history table
    await INSERT.into('docqa.AskedQuestions').entries({
      Question: question,
      Answer: answer,
      CreatedAt: new Date()
    });

    return {
      answer,
      highlights: topChunks.map(c => ({
        similarity: c.similarity.toFixed(3),
        excerpt: c.chunk
      }))
    };
  });

  // Scrape Web Page
srv.on("ScrapeWebPage", async (req) => {
  const { url } = req.data;
  if (!url) return req.error(400, "URL is required");

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract readable text content (can be improved later)
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const id = cds.utils.uuid();
    await INSERT.into("docqa.Documents").entries({
      ID: id,
      filename: url,
      content: text
    });

    return id;
  } catch (err) {
    console.error("Scraping failed:", err.message);
    return req.error(500, "Failed to scrape webpage");
  }
});

// newly added voice 
srv.on('TranscribeVoice', async (req) => {
  try {
    const { filename, filetype, filedata } = req.data;

    // Step 1: Decode base64 and save temporarily
    const audioBuffer = Buffer.from(filedata, 'base64');
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, audioBuffer);

    // Step 2: Upload file to AssemblyAI
    const uploadRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        'authorization': ASSEMBLY_API_KEY,
        'transfer-encoding': 'chunked'
      },
      data: fs.createReadStream(filePath)
    });

    const audioUrl = uploadRes.data.upload_url;

    // Step 3: Send transcription request
    const transcriptRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: {
        'authorization': ASSEMBLY_API_KEY,
        'content-type': 'application/json'
      },
      data: {
        audio_url: audioUrl
      }
    });

    const transcriptId = transcriptRes.data.id;

    // Step 4: Poll for result
    let status = 'processing', text = '';
    while (status === 'queued' || status === 'processing') {
      await new Promise(r => setTimeout(r, 3000)); // wait 3s
      const pollRes = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        headers: { 'authorization': ASSEMBLY_API_KEY }
      });
           
      status = pollRes.data.status;
      if (status === 'completed') text = pollRes.data.text;
      else if (status === 'error') throw new Error(pollRes.data.error);
    }

    fs.unlinkSync(filePath); // Clean up

    return { value: text };

  } catch (err) {
    console.error(err);
    req.error(500, 'Transcription failed: ' + err.message);
  }
});

};

// --- Cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Utility: Chunking based on file type
function splitBySentence(text, maxLength = 500) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (let sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + ' ';
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length >= 30);
}

function splitByLine(text, maxLength = 500) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let currentChunk = '';

  for (let line of lines) {
    if ((currentChunk + line).length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length >= 30);
}

// --- Extract text from PPTX
async function extractPPTXText(buffer) {
  const zip = await unzipper.Open.buffer(buffer);
  const slideFiles = zip.files.filter(f => f.path.match(/^ppt\/slides\/slide\d+\.xml$/));

  let text = "";
  for (const file of slideFiles) {
    const content = await file.buffer();      // Get slide content as buffer
    const xml = content.toString("utf-8");     // Convert buffer to XML string
    const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)];  // Find text inside <a:t> tags
    text += matches.map(m => m[1]).join(" ") + "\n";            // Combine all matches into text
  }
  return text;

}
