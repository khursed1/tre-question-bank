'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function convertToLatex(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: 'Please set GEMINI_API_KEY in your environment variables to use this feature.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are a highly accurate mathematical formatting assistant.
Your task is to take messy, plain-text math equations or expressions and convert them into beautifully formatted, clean LaTeX wrapped in $ $ (for inline) or $$ $$ (for block).

Important rules:
1. ONLY return the final LaTeX code. Do NOT return any markdown code blocks (like \`\`\`latex), conversational text, or explanations. Just the raw LaTeX string.
2. If the input is clearly a single inline expression, wrap it in $ $.
3. If the input is multiple lines or a large equation, wrap it in $$ $$.
4. Do your best to interpret typos, like "x2" as "x^2", "alpha" as "\\alpha", "integral" as "\\int", etc.
5. If the input is not math at all, just return the original text wrapped in $ $.

Input text to convert:
${text}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let latexText = response.text().trim();
    
    // Fallback cleanup in case the model returns markdown code blocks despite instructions
    if (latexText.startsWith('```latex')) {
      latexText = latexText.replace(/^```latex\n?/, '').replace(/\n?```$/, '');
    } else if (latexText.startsWith('```')) {
      latexText = latexText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return { result: latexText.trim() };
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return { error: error.message || 'Failed to convert to LaTeX using AI.' };
  }
}
