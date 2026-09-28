'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateExplanation(questionData: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: 'Please set GEMINI_API_KEY in your environment variables to use this feature.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const prompt = `
You are an expert tutor and subject matter expert. Your task is to provide a detailed explanation for the following multiple-choice question, given the correct answer.

Question:
${questionData.question_text || ''}

Options:
A. ${questionData.option_a || ''}
B. ${questionData.option_b || ''}
C. ${questionData.option_c || ''}
D. ${questionData.option_d || ''}
${questionData.option_e ? `E. ${questionData.option_e}` : ''}

Correct Answer:
${questionData.answer || 'Unknown'}

Please return ONLY the explanation text. No conversational filler, no markdown code blocks, just the explanation itself.
Use markdown for formatting, and enclose math in $ $ for inline or $$ $$ for block math. Explain why the given answer is correct, and why other options might be wrong.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up if it returned markdown block
    if (text.startsWith('\`\`\`markdown')) {
      text = text.replace(/^\`\`\`markdown\n?/, '').replace(/\n?\`\`\`$/, '');
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
    }

    return { result: text.trim() };
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return { error: error.message || 'Failed to generate explanation.' };
  }
}
