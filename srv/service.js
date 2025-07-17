const cds = require('@sap/cds');
const pdf = require('pdf-parse');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '' // Replace or keep env
});

module.exports = async function (srv) {
  const db = await cds.connect.to('db');

  // Upload Document
  srv.on('UploadDocument', async (req) => {
    const { filename, content } = req.data;
    const buffer = Buffer.from(content, 'base64');

    const parsed = await pdf(buffer);
    // const { ID } = await INSERT.into('docqa.Documents').entries({
    //   ID: cds.utils.uuid(),
    //   filename,
    //   content: parsed.text
    // });

    // return 'Uploaded & parsed successfully.';
    const id = cds.utils.uuid();
    await INSERT.into('docqa.Documents').entries({
     ID: id,
     filename,
     content: parsed.text
});
return id;
  });

  // Generate Embeddings
  srv.on('GenerateEmbeddings', async (req) => {
    try {
      const docID = req.data.docID;
      const doc = await SELECT.one.from('docqa.Documents').where({ ID: docID });

      if (!doc || !doc.content) return req.error(404, 'Document not found.');

      const chunks = splitTextByQuestion(doc.content);
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

      return 'Embeddings stored successfully ';
    } catch (err) {
      console.error(' Error:', err.message);
      req.error(500, 'Embedding generation failed.');
    }
  });

  // Ask Question
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

    // Sort by similarity
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

    return {
      answer,
      highlights: topChunks.map(c => ({
        similarity: c.similarity.toFixed(3),
        excerpt: c.chunk
      }))
    };
  });
};

// --- Utility: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Utility: Q&A Chunk Splitter
function splitTextByQuestion(text) {
  return text
    .split(/(?:\r?\n)?Q\.\s+(?=[A-Z])/g)
    .map((chunk, idx) => idx === 0 ? chunk.trim() : 'Q. ' + chunk.trim())
    .filter(c => c.length >= 30);
}
