namespace docqa;

entity Documents {
  key ID       : UUID;
  filename     : String;
  content      : LargeString;
}

entity Embeddings {
  key ID       : UUID;
  doc_ID       : Association to Documents;
  chunk        : LargeString;
  vector       : LargeString; 
   lang         : String(5);   // 'en', 'or', 'hi', etc. newly  added
}

entity AskedQuestions {
  key ID          : UUID;
  Question    : String;
  Answer      : LargeString;
  CreatedAt   : Timestamp;
}