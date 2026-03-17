import OpenAI from "openai";

const openai = new OpenAI();

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 1024,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: texts,
    dimensions: 1024,
    encoding_format: "float",
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export function buildEmbedText(
  front: string,
  back: string,
  conceptTitle: string,
): string {
  return `Question: ${front}\nAnswer: ${back}\nConcept: ${conceptTitle}`;
}
