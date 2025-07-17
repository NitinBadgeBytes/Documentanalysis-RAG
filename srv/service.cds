using { docqa as db } from '../db/schema';
type Highlight {
  similarity: String;
  excerpt: String;
}

type AskQuestionResult {
  answer: String;
  highlights: array of Highlight;
}
service DocQAService {
  entity Documents as projection on db.Documents;
  entity Embeddings as projection on db.Embeddings;

  action UploadDocument(filename: String, content: LargeBinary) returns String;
  action GenerateEmbeddings(docID: UUID) returns String;
//   action AskQuestion(question: String) returns String;
 action AskQuestion(question: String, docID: UUID) returns AskQuestionResult;
};