'use server'

import OpenAI from 'openai';

export async function generateAnswer(questionData: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { error: 'Please set OPENAI_API_KEY in your environment variables to use this feature.' };
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `
You are an expert tutor and subject matter expert. Your task is to provide the correct answer and a detailed explanation for the following multiple-choice question.

Question:
${questionData.question_text || ''}

Options:
A. ${questionData.option_a || ''}
B. ${questionData.option_b || ''}
C. ${questionData.option_c || ''}
D. ${questionData.option_d || ''}
${questionData.option_e ? `E. ${questionData.option_e}` : ''}

Please return your response EXACTLY as a JSON object with two keys: "answer" and "explanation".
- "answer": The correct option's letter and text (e.g., "A. [Text]"). Use markdown and LaTeX where appropriate.
- "explanation": A detailed, step-by-step explanation of why this answer is correct and why others might be wrong. Use markdown for formatting, and enclose math in $ $ for inline or $$ $$ for block math. Do not wrap the JSON in markdown code blocks.

JSON format:
{
  "answer": "...",
  "explanation": "..."
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    let text = response.choices[0].message.content || '';
    text = text.trim();
    
    // Clean up if it returned markdown block
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(text);
    return { result: parsed };
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return { error: error.message || 'Failed to generate answer.' };
  }
}
