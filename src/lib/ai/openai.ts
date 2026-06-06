import OpenAI from 'openai';

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing.');
  return new OpenAI({ apiKey });
}

export async function generateText(prompt: string) {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    temperature: 0.8,
    max_output_tokens: 220,
  });

  return response.output_text.trim();
}
