import mammoth from 'mammoth';

export const extractTextFromBuffer = async (buffer: Buffer, mimetype: string): Promise<string> => {
  if (mimetype === 'application/pdf') {
    try {
      // pdf-parse is required dynamically to prevent environment-specific load issues
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (err: any) {
      console.error("PDF Parsing Error:", err);
      throw new Error("Failed to parse PDF document.");
    }
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const data = await mammoth.extractRawText({ buffer });
    return data.value;
  } else {
    throw new Error("Unsupported file format. Please upload PDF or DOCX.");
  }
};
