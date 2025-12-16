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
const sharp = require("sharp");
const upload = multer();
const FormData = require('form-data');
const { Readable } = require('stream');
const { fromBuffer } = require("pdf2pic");
const Tesseract = require("tesseract.js");
const vision = require("@google-cloud/vision");
const client = new vision.ImageAnnotatorClient();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '' 
});

const ASSEMBLY_API_KEY = '';
//...

// cds.on('bootstrap', app => {
//   // Increase limit to 5MB (or more if needed)
//   app.use(bodyParser.json({ limit: '5mb' }));
//   app.use(bodyParser.raw({ limit: '5mb', type: '*/*' })); // Important for binary PDF uploads
// });
//
// module.exports = cds.server;

module.exports = async function (srv) {
  const db = await cds.connect.to('db');
   
   // Upload document
  //  srv.on("UploadDocument", async (req) => {
  //   const { filename, content } = req.data;
  //   const buffer = Buffer.from(content, "base64");
  //   const ext = path.extname(filename).toLowerCase();

  //   let text = "";
  //   try {
  //     if (ext === ".pdf") {
  //       const parsed = await pdf(buffer);
  //       text = parsed.text;
  //     } else if (ext === ".txt") {
  //       text = buffer.toString("utf-8");
  //     } else if (ext === ".docx") {
  //       const result = await mammoth.extractRawText({ buffer });
  //       text = result.value;
  //     } else if (ext === ".xlsx") {
  //       const workbook = xlsx.read(buffer, { type: "buffer" });
  //       text = workbook.SheetNames.map(sheet =>
  //         xlsx.utils.sheet_to_csv(workbook.Sheets[sheet])
  //       ).join("\n");
  //     } else if (ext === ".pptx") {
  //       text = await extractPPTXText(buffer);
  //     } else {
  //       return req.error(400, "Unsupported file type");
  //     }

  //     const id = cds.utils.uuid();
  //     await INSERT.into("docqa.Documents").entries({
  //       ID: id,
  //       filename,
  //       content: text
  //     });

  //     return id;
  //   } catch (err) {
  //     console.error("File parse error:", err.message);
  //     req.error(500, "Failed to parse file content");
  //   }
  // });

   //upload document real one
//    srv.on("UploadDocument", async (req) => {
//   const { filename, content } = req.data;
//   const buffer = Buffer.from(content, "base64");
//   const ext = path.extname(filename).toLowerCase();

//   let text = "";
//   try {
//     // Step 1: Extract text from file based on extension
//     if (ext === ".pdf") {
//       const parsed = await pdf(buffer);
//       text = parsed.text;
//     } else if (ext === ".txt") {
//       text = buffer.toString("utf-8");
//     } else if (ext === ".docx") {
//       const result = await mammoth.extractRawText({ buffer });
//       text = result.value;
//     } else if (ext === ".xlsx") {
//       const workbook = xlsx.read(buffer, { type: "buffer" });
//       text = workbook.SheetNames.map(sheet =>
//         xlsx.utils.sheet_to_csv(workbook.Sheets[sheet])
//       ).join("\n");
//     } else if (ext === ".pptx") {
//       text = await extractPPTXText(buffer);
//     } else {
//       return req.error(400, "Unsupported file type");
//     }

//     // Step 2: Optional - Detect language (simple check)
//     // For simplicity, we will translate all documents to English
//     const translateRes = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: "You are a translator. Convert the following text to clear English."
//         },
//         {
//           role: "user",
//           content: text
//         }
//       ]
//     });

//     text = translateRes.choices[0].message.content.trim();

//     // Step 3: Store the English text in DB
//     const id = cds.utils.uuid();
//     await INSERT.into("docqa.Documents").entries({
//       ID: id,
//       filename,
//       content: text
//     });

//     return id;

//   } catch (err) {
//     console.error("File parse or translation error:", err.message);
//     req.error(500, "Failed to parse or translate file content");
//   }
// });

 //upload document updated working
//  srv.on("UploadDocument", async (req) => {
//   const { filename, content } = req.data;
//   const buffer = Buffer.from(content, "base64");
//   const ext = path.extname(filename).toLowerCase();

//   let text = "";
//   try {
//     // Step 1: Extract text
//     if (ext === ".pdf") {
//       const parsed = await pdf(buffer);
//       text = parsed.text;
//     } else if (ext === ".txt") {
//       text = buffer.toString("utf-8");
//     } else if (ext === ".docx") {
//       const result = await mammoth.extractRawText({ buffer });
//       text = result.value;
//     } else if (ext === ".xlsx") {
//       const workbook = xlsx.read(buffer, { type: "buffer" });
//       text = workbook.SheetNames.map(sheet =>
//         xlsx.utils.sheet_to_csv(workbook.Sheets[sheet])
//       ).join("\n");
//     } else if (ext === ".pptx") {
//       text = await extractPPTXText(buffer);
//     } else {
//       return req.error(400, "Unsupported file type");
//     }

//     // Step 2: Detect language
//     const langRes = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "Detect the language of the following text. Reply only with ISO code (e.g., en, hi, or)." },
//         { role: "user", content: text.slice(0, 500) }
//       ]
//     });
//     let detectedLang = langRes.choices[0].message.content.trim().toLowerCase();
//     if (detectedLang === "ori") detectedLang = "or";

//     // Step 3: Translate into English for embeddings
//     let englishText = text;
//     if (detectedLang !== "en") {
//       const translateRes = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: "Translate the following text into clear English legal terminology." },
//           { role: "user", content: text }
//         ]
//       });
//       englishText = translateRes.choices[0].message.content.trim();
//     }

//     const docID = cds.utils.uuid();

//     // Step 4: Save Document
//     await INSERT.into("docqa.Documents").entries({
//       ID: docID,
//       filename,
//       content: englishText
//     });

//     // Step 5: Split and store embeddings
//     function splitIntoChunks(str, size = 500) {
//       const words = str.split(/\s+/);
//       let chunks = [], current = [];
//       for (const word of words) {
//         if (current.join(" ").length + word.length > size) {
//           chunks.push(current.join(" "));
//           current = [];
//         }
//         current.push(word);
//       }
//       if (current.length) chunks.push(current.join(" "));
//       return chunks;
//     }

//     // English chunks + embeddings
//     const enChunks = splitIntoChunks(englishText);
//     for (const ch of enChunks) {
//       const emb = await openai.embeddings.create({
//         model: "text-embedding-3-large",
//         input: ch
//       });
//       await INSERT.into("docqa.Embeddings").entries({
//         ID: cds.utils.uuid(),
//         doc_ID: docID,
          
//         chunk: ch,
//         vector: JSON.stringify(emb.data[0].embedding),
//         lang: "en"
//       });
//     }

//     // Native embeddings (if not English)
//     if (detectedLang !== "en") {
//       const origChunks = splitIntoChunks(text);
//       for (const ch of origChunks) {
//         const emb = await openai.embeddings.create({
//           model: "text-embedding-3-large",
//           input: ch
//         });
//         await INSERT.into("docqa.Embeddings").entries({
//           ID: cds.utils.uuid(),
//           doc_ID: docID,
        
//           chunk: ch,
//           vector: JSON.stringify(emb.data[0].embedding),
//           lang: detectedLang
//         });
//       }
//     }

//      return docID;
//     //return { ID: docID };

//   } catch (err) {
//     console.error("Upload error:", err);
//     req.error(500, "Failed to process document");
//   }
// });

 //new 
  srv.on("UploadDocument", async req => {
    const { filename, content } = req.data;
    const buffer = Buffer.from(content, "base64");
    const ext = path.extname(filename).toLowerCase();
    let text = "";

    try {
      //   Extract text based on file type
      if (ext === ".pdf") {
        const parsed = await pdf(buffer);
        text = parsed.text;

        if (!text.trim()) {
          console.log(" Image-based PDF detected. Performing OCR locally...");
          const convert = fromBuffer(buffer, {
            density: 250,
            format: "png",
            saveFilename: "ocr_page",
            savePath: "./tmp",
          });
          const pages = await convert.bulk(-1, true);

          for (const p of pages) {
            const processed = await preprocessImage(p.path);
            const ocr = await runOCR(processed);
            text += "\n" + ocr;
          }
        }

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

      } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
        console.log("🖋 Performing OCR using local Tesseract...");
        const processed = await preprocessImage(buffer);
        text = await runOCR(processed);
      } else {
        return req.error(400, "Unsupported file type");
      }

      if (!text.trim()) return req.error(400, "No text extracted from the document");

      //   Detect language
      const langRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Detect the language of the following text. Reply only with ISO code (e.g., en, hi, or).",
          },
          { role: "user", content: text.slice(0, 500) },
        ],
      });

      let detectedLang = langRes.choices[0].message.content.trim().toLowerCase();
      if (detectedLang === "ori") detectedLang = "or";

      //  Step 3: Translate to English if needed
      let englishText = text;
      if (detectedLang !== "en") {
        const translateRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Translate the following text into clear English legal terminology.",
            },
            { role: "user", content: text },
          ],
        });
        englishText = translateRes.choices[0].message.content.trim();
      }

      //   Save document metadata
      const docID = cds.utils.uuid();
      await INSERT.into("docqa.Documents").entries({
        ID: docID,
        filename,
        content: englishText,
      });

      //  Split and store embeddings
      function splitIntoChunks(str, size = 500) {
        const words = str.split(/\s+/);
        let chunks = [],
          current = [];
        for (const word of words) {
          if (current.join(" ").length + word.length > size) {
            chunks.push(current.join(" "));
            current = [];
          }
          current.push(word);
        }
        if (current.length) chunks.push(current.join(" "));
        return chunks;
      }

      const enChunks = splitIntoChunks(englishText);
      for (const ch of enChunks) {
        const emb = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: ch,
        });

        await INSERT.into("docqa.Embeddings").entries({
          ID: cds.utils.uuid(),
          doc_ID: { ID: docID },
          chunk: ch,
          vector: JSON.stringify(emb.data[0].embedding),
          lang: "en",
        });
      }

      if (detectedLang !== "en") {
        const origChunks = splitIntoChunks(text);
        for (const ch of origChunks) {
          const emb = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: ch,
          });
          await INSERT.into("docqa.Embeddings").entries({
            ID: cds.utils.uuid(),
            doc_ID: { ID: docID },
            chunk: ch,
            vector: JSON.stringify(emb.data[0].embedding),
            lang: detectedLang,
          });
        }
      }

      console.log(`Document ${filename} uploaded and processed successfully.`);
      return docID;

    } catch (err) {
      console.error("Upload error:", err);
      req.error(500, "Failed to process document: " + err.message);
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

  // Ask question original one
  // srv.on('AskQuestion', async (req) => {
  //   const { question, docID } = req.data;

  //   if (!question || !docID) return req.error(400, 'Missing question or docID.');

  //   const qEmbedRes = await openai.embeddings.create({
  //     model: 'text-embedding-3-large',
  //     input: [question]
  //   });

  //   const qVector = qEmbedRes.data[0].embedding;

  //   const chunks = await SELECT.from('docqa.Embeddings').where({ doc_ID: docID });
  //   if (!chunks.length) return req.error(404, 'No embeddings for this document.');

  //   const scored = chunks.map(c => {
  //     const vec = JSON.parse(c.vector);
  //     const sim = cosineSimilarity(vec, qVector);
  //     return { ...c, similarity: sim };
  //   });

  //   const topChunks = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  //   const context = topChunks.map(c => c.chunk).join('\n\n');

  //   const chatRes = await openai.chat.completions.create({
  //     model: 'gpt-4o-mini',
  //     messages: [
  //       {
  //         role: 'system',
  //         content: `You are a helpful assistant. Answer only using the provided context. If unsure, say "The document does not contain this information."`
  //       },
  //       {
  //         role: 'user',
  //         content: `Context:\n${context}\n\nQuestion: ${question}`
  //       }
  //     ]
  //   });

  //   const answer = chatRes.choices[0].message.content;
   
  //   //  newly added here
  //   // Save question and answer to history table
  //   await INSERT.into('docqa.AskedQuestions').entries({
  //     Question: question,
  //     Answer: answer,
  //     CreatedAt: new Date()
  //   });

  //   return {
  //     answer,
  //     highlights: topChunks.map(c => ({
  //       similarity: c.similarity.toFixed(3),
  //       excerpt: c.chunk
  //     }))
  //   };
  // });

  //multi language support
  // --- Ask question with multilingual support ---
// srv.on('AskQuestion', async (req) => {
//   const { question, docID } = req.data;

//   if (!question || !docID) return req.error(400, 'Missing question or docID.');

//   try {
//     // Step 1: Detect language
//     const langRes = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "Detect the language of the following text. Reply only with the ISO code (e.g., en, hi, or, or for Odia)." },
//         { role: "user", content: question }
//       ]
//     });
//     const detectedLang = langRes.choices[0].message.content.trim().toLowerCase();

//     // Step 2: Translate question to English (if not English)
//     let translatedQuestion = question;
//     if (detectedLang !== "en") {
//       const transQ = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: "Translate the following text to clear English." },
//           { role: "user", content: question }
//         ]
//       });
//       translatedQuestion = transQ.choices[0].message.content.trim();
//     }

//     // Step 3: Generate embedding for translated question
//     const qEmbedRes = await openai.embeddings.create({
//       model: 'text-embedding-3-large',
//       input: [translatedQuestion]
//     });
//     const qVector = qEmbedRes.data[0].embedding;

//     // Step 4: Fetch document embeddings
//     const chunks = await SELECT.from('docqa.Embeddings').where({ doc_ID: docID });
//     if (!chunks.length) return req.error(404, 'No embeddings for this document.');

//     const scored = chunks.map(c => {
//       const vec = JSON.parse(c.vector);
//       const sim = cosineSimilarity(vec, qVector);
//       return { ...c, similarity: sim };
//     });

//     const topChunks = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
//     const context = topChunks.map(c => c.chunk).join('\n\n');

//     // Step 5: Get answer in English
//     const chatRes = await openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       messages: [
//         {
//           role: 'system',
//           content: `You are a helpful assistant. Answer only using the provided context. 
//           If unsure, say "The document does not contain this information."`
//         },
//         {
//           role: 'user',
//           content: `Context:\n${context}\n\nQuestion: ${translatedQuestion}`
//         }
//       ]
//     });

//     let answer = chatRes.choices[0].message.content.trim();

//     // Step 6: Translate answer back to original language (if not English)
//     if (detectedLang !== "en") {
//       const backTrans = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: `Translate this English text into ${detectedLang}.` },
//           { role: "user", content: answer }
//         ]
//       });
//       answer = backTrans.choices[0].message.content.trim();
//     }

//     // Step 7: Save Q&A history
//     await INSERT.into('docqa.AskedQuestions').entries({
//       Question: question,
//       Answer: answer,
//       CreatedAt: new Date()
//     });

//     return {
//       answer,
//       highlights: topChunks.map(c => ({
//         similarity: c.similarity.toFixed(3),
//         excerpt: c.chunk
//       }))
//     };
//   } catch (err) {
//     console.error('Error in AskQuestion:', err.message);
//     req.error(500, 'Question answering failed.');
//   }
// });

//multi language support with perfection
srv.on("AskQuestion", async (req) => {
  const { question, docID } = req.data;
  if (!question || !docID) return req.error(400, "Missing question or docID.");

  try {
    // Step 1: Detect query language
    const langRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Detect the language of the following text. Reply only with ISO code (e.g., en, hi, or)." },
        { role: "user", content: question }
      ]
    });
    let qLang = langRes.choices[0].message.content.trim().toLowerCase();
    if (qLang === "ori" || qLang === "rom-ori") qLang = "or";

    // Step 2: Translate question → English
    let translatedQuestion = question;
    if (qLang !== "en") {
      const transQ = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Translate into precise English legal terminology." },
          { role: "user", content: question }
        ]
      });
      translatedQuestion = transQ.choices[0].message.content.trim();
    }

    // Step 3: Embed question (English + native if not English)
    const enQEmb = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: translatedQuestion
    });
    const enVec = enQEmb.data[0].embedding;

    let nativeVec = null;
    if (qLang !== "en") {
      const nativeEmb = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: question
      });
      nativeVec = nativeEmb.data[0].embedding;
    }

    // Step 4: Fetch embeddings from DB
    const chunks = await SELECT.from("docqa.Embeddings").where({ doc_ID: docID });
    if (!chunks.length) return req.error(404, "No embeddings found.");

    function cosineSimilarity(a, b) {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

      

    const scored = chunks.map(c => {
      const vec = JSON.parse(c.vector);
      let sim = 0;
      if (c.lang === "en") sim = cosineSimilarity(vec, enVec);
      else if (c.lang === qLang && nativeVec) sim = cosineSimilarity(vec, nativeVec);
      return { ...c, similarity: sim };
    });

    const topChunks = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    const context = topChunks.map(c => c.chunk).join("\n\n");

    // Step 5: Get English answer from context
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a strict retrieval QA assistant. Answer only by copying exact sentences from the context.`
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${translatedQuestion}`
        }
      ]
    });

    let answer = chatRes.choices[0].message.content.trim();
    if (!answer) answer = topChunks[0].chunk;

    // Step 6: Translate answer back
    if (qLang !== "en") {
      const backTrans = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Translate this English text into ${qLang}. 
                      If Odia, use Odia script. If Hindi, use Devanagari script.`
          },
          { role: "user", content: answer }
        ]
      });
      answer = backTrans.choices[0].message.content.trim();
    }

    // Step 7: Save Q&A
    await INSERT.into("docqa.AskedQuestions").entries({
      ID: cds.utils.uuid(),
      Question: question,
      Answer: answer,
      CreatedAt: new Date()
    });

    return {
      answer,
      highlights: topChunks.map(c => ({
        similarity: c.similarity.toFixed(3),
        excerpt: c.chunk,
        lang: c.lang
      }))
    };

  } catch (err) {
    console.error("AskQuestion error:", err);
    req.error(500, "Question answering failed.");
  }
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

  // summary of uploaded documents
  // --- Summarize Document ---
srv.on("SummarizeDocument", async (req) => {
  try {
    const { docID } = req.data;
    if (!docID) return req.error(400, "Missing docID.");

    // Step 1: Fetch document from DB
    const doc = await SELECT.one.from("docqa.Documents").where({ ID: docID });
    if (!doc || !doc.content) return req.error(404, "Document not found.");

    // Step 2: Generate summary using OpenAI
    const summaryRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",   // fast + cost-efficient
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Provide a clear, concise summary of the following document in bullet points."
        },
        {
          role: "user",
          content: doc.content.substring(0, 8000) // avoid token overflow
        }
      ]
    });

    const summary = summaryRes.choices[0].message.content.trim();

    // Step 3: Return directly
    return { summary };

  } catch (err) {
    console.error("Error generating summary:", err.message);
    req.error(500, "Failed to summarize document.");
  }
});
 
this.on("textToAudio", async (req) => {
    const { text } = req.data;

    if (!text) {
      return req.error(400, "Text is required");
    }

    try {
      const response = await fetch(
        "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en&encoding=mp3",
        {
          method: "POST",
          headers: {
            "Authorization": "Token ", // 🔴 hardcoded as requested
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("Deepgram error:", errText);
        return req.error(500, errText);
      }

      // 🔑 Convert response to Buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // 🔑 BYPASS ODATA — SEND RAW AUDIO
      const res = req._.res;
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.length);
      res.status(200).send(audioBuffer);

      return; // VERY IMPORTANT

    } catch (err) {
      console.error("TTS ERROR:", err);
      return req.error(500, "Audio generation failed");
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

/**
 *  Image preprocessing pipeline (Sharp)
 * Auto-enhances, denoises, and deskews image for best OCR accuracy
 */
async function preprocessImage(inputBufferOrPath) {
  let image = sharp(inputBufferOrPath);

  // Step 1: Convert to grayscale
  image = image.grayscale();

  // Step 2: Resize (boost OCR accuracy)
  const metadata = await image.metadata();
  if (metadata.width < 1000) image = image.resize(1000);

  // Step 3: Normalize contrast
  image = image.normalise();

  // Step 4: Denoise and threshold
  image = image
    .median(1)
    .linear(1.2, -30) // contrast boost
    .threshold(130);

  // Step 5: Slight rotation correction (deskew)
  const buffer = await image.toBuffer();
  return buffer;
}

/**
 * Runs OCR with fallback retry on raw image
 */
async function runOCR(buffer) {
  let result = await Tesseract.recognize(buffer, "eng", {
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  });
  let text = result.data.text.trim();

  if (!text || text.length < 3) {
    console.log("Low-confidence OCR result, retrying with raw image...");
    const retry = await Tesseract.recognize(buffer, "eng");
    text = retry.data.text.trim();
  }

  console.log("OCR Output:", text);
  return text;
}
