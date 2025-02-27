interface TextSplitterOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(options: TextSplitterOptions) {
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap;
  }

  splitText(text: string): string[] {
    if (text.length <= this.chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;

      // If we're not at the end of the text, try to break at a natural point
      if (end < text.length) {
        // Look for the last occurrence of common sentence endings
        const lastPeriod = text.lastIndexOf('.', end);
        const lastQuestion = text.lastIndexOf('?', end);
        const lastExclamation = text.lastIndexOf('!', end);
        const lastNewline = text.lastIndexOf('\n', end);

        // Find the latest natural break point
        const breakPoints = [lastPeriod, lastQuestion, lastExclamation, lastNewline]
          .filter(point => point > start && point < end);

        if (breakPoints.length > 0) {
          end = Math.max(...breakPoints) + 1; // Include the punctuation mark
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - this.chunkOverlap;
    }

    return chunks;
  }
}
