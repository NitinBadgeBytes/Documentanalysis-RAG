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
}