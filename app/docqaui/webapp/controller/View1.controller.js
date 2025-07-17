sap.ui.define([
    "sap/ui/core/mvc/Controller",
     "sap/m/MessageToast",
     "sap/ui/model/json/JSONModel"
], (Controller,MessageToast,JSONModel) => {
    "use strict";

    return Controller.extend("com.docqa.docqaui.controller.View1", {
        onInit() {
            this.getView().setModel(new JSONModel({ answer: "", highlights: [] }));
            this.docID = null;
        },
        onFileChange: async function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;
      
            const base64 = await this._fileToBase64(file);
            const filename = file.name;
      
            try {
              // Upload Document
              const uploadRes = await fetch("/odata/v4/DocQAService/UploadDocument", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, content: base64 })
              });
      
              if (!uploadRes.ok) throw new Error("Upload failed");
              const uploadedDocID = await uploadRes.json();
              this.docID = uploadedDocID;
      
              MessageToast.show("PDF uploaded. Generating embeddings...");
      
              // Generate Embeddings
              const genRes = await fetch("/odata/v4/DocQAService/GenerateEmbeddings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docID: this.docID })
              });
      
              if (!genRes.ok) throw new Error("Embedding failed");
              MessageToast.show("Embeddings generated. You can now ask a question.");
      
            } catch (err) {
              console.error(err);
              MessageToast.show("Error: " + err.message);
            }
          },
      
          onAskQuestion: async function () {
            const question = this.byId("questionInput").getValue();
            if (!question || !this.docID) {
              MessageToast.show("Please upload a PDF and enter a question.");
              return;
            }
      
            try {
              const askRes = await fetch("/odata/v4/DocQAService/AskQuestion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, docID: this.docID })
              });
      
              if (!askRes.ok) throw new Error("Ask failed");
              const result = await askRes.json();
              this.getView().getModel().setData(result);
      
            } catch (err) {
              console.error(err);
              MessageToast.show("Failed to get answer.");
            }
          },
      
          _fileToBase64(file) {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result.split(",")[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
        }
    });
});