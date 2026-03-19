import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface QuestionMix {
  type: string;
  count: number;
  marksPerQuestion: number;
}

export interface PaperConfig {
  teacherName: string;
  subject: string;
  classLevel: string;
  board: string;
  chapters: string[];
  questionMix: QuestionMix[];
  difficulty: string;
  timeDuration: string;
  totalMarks: number;
}

export interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  answer?: string;
  marks: number;
  imagePrompt?: string;
  imageUrl?: string;
}

export interface QuestionPaper {
  id: string;
  title: string;
  config: PaperConfig;
  questions: Question[];
  createdAt: string;
  htmlContent?: string;
  isBookmarked?: boolean;
}

export async function fetchChapters(board: string, subject: string, classLevel: string): Promise<string[]> {
  const cacheKey = `fusion_chapters_${board}_${subject}_${classLevel}`.toLowerCase().replace(/\s+/g, '_');
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // Ignore parse error and fetch fresh
    }
  }

  const prompt = `List the chapters for ${board} board, Subject: ${subject}, Class: ${classLevel}. 
  Return ONLY a JSON array of strings representing the chapter names. Do not include any markdown formatting or other text.`;

  try {
    const fetchPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    // Add a 15-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 15000)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    const result = JSON.parse(response.text || "[]");
    
    if (Array.isArray(result) && result.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    }
    
    return result;
  } catch (e) {
    console.error("Failed to fetch chapters", e);
    return [];
  }
}

export async function generateQuestionImage(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to generate image", e);
    return null;
  }
}

export async function generateQuestionPaper(config: PaperConfig): Promise<Question[]> {
  const mixInstructions = config.questionMix
    .map(m => `- ${m.count} questions of type "${m.type}", each worth ${m.marksPerQuestion} marks.`)
    .join('\n');

  const prompt = `Generate a professional question paper for:
    Teacher: ${config.teacherName}
    Subject: ${config.subject}
    Class: ${config.classLevel}
    Board: ${config.board}
    Chapters: ${config.chapters.join(", ")}
    Difficulty: ${config.difficulty}
    Time Duration: ${config.timeDuration}
    Total Marks: ${config.totalMarks}

    You MUST generate EXACTLY the following mix of questions:
    ${mixInstructions}

    CRITICAL FORMATTING INSTRUCTIONS:
    - Format the \`question\` and \`answer\` fields using basic HTML tags (e.g., <p>, <br>, <strong>, <ul>, <li>).
    - For "Case Study/Paragraph" questions, provide a substantial, detailed passage wrapped in <p> tags. Then, list the sub-questions using an ordered list with lowercase letters: <ol type="a"><li>...</li></ol>.
    - If any question has sub-parts, ALWAYS use <ol type="a"><li>...</li></ol> so they are numbered like a), b), c).
    - Do NOT include the answers in the \`question\` field. Put all answers and marking schemes strictly in the \`answer\` field.
    - For MCQ, do NOT put the options in the \`question\` field. Use the \`options\` array.
    - Do NOT use markdown formatting (like **bold**) inside the HTML strings. Use HTML tags only.
    
    Return a JSON array of questions. Each question object should have:
    - id: string (unique)
    - type: string (must match one of the requested types)
    - question: string (HTML formatted)
    - options: string[] (only for MCQ or Fill in the Blanks if choices are provided)
    - answer: string (HTML formatted, the correct answer or a sample answer/marking scheme)
    - marks: number (must match the requested marksPerQuestion for this type)
    - imagePrompt: string (OPTIONAL. Only include if the question requires a diagram or image to be understood. Provide a detailed prompt for an AI image generator to create this diagram/image. Leave undefined if no image is needed.)

    Ensure the questions are high quality, strictly follow the ${config.board} curriculum style, and are balanced across the selected chapters.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            answer: { type: Type.STRING },
            marks: { type: Type.NUMBER },
            imagePrompt: { type: Type.STRING }
          },
          required: ["id", "type", "question", "answer", "marks"]
        }
      }
    }
  });

  try {
    const questions: Question[] = JSON.parse(response.text || "[]");
    
    // Post-process to generate images
    for (const q of questions) {
      if (q.imagePrompt) {
        const imageUrl = await generateQuestionImage(q.imagePrompt);
        if (imageUrl) {
          q.imageUrl = imageUrl;
        }
      }
    }
    
    return questions;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
}

export async function editPaperWithAI(htmlContent: string, prompt: string, imageBase64?: string): Promise<string> {
  // Extract base64 images to avoid token limit issues
  const imageMap = new Map<string, string>();
  let placeholderIndex = 0;
  
  // Regex to match base64 image data anywhere in the HTML
  const processedHtml = htmlContent.replace(/(data:image\/[^;]+;base64,[^"'\s\)]+)/g, (match) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${placeholderIndex}__`;
    imageMap.set(placeholder, match);
    placeholderIndex++;
    return placeholder;
  });

  const fullPrompt = `You are an expert AI assistant that edits HTML documents.
  The user has provided the following HTML content for a question paper, and a request to modify it.
  ${imageBase64 ? '\nThe user has also provided an image. You MUST insert this exact image into the HTML where appropriate based on the user request. To insert it, use the exact string __UPLOADED_IMAGE__ as the src attribute of an img tag. Example: <img src="__UPLOADED_IMAGE__" alt="Uploaded Image" style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 8px;" />' : ''}
  
  USER REQUEST:
  ${prompt}
  
  CURRENT HTML CONTENT:
  \`\`\`html
  ${processedHtml}
  \`\`\`
  
  INSTRUCTIONS:
  1. Understand the user's request and apply the necessary changes to the HTML content.
  2. Maintain the existing HTML structure and inline styles as much as possible.
  3. Return ONLY the modified HTML code. Do not include any markdown formatting like \`\`\`html or \`\`\`. Just the raw HTML string.
  4. Ensure the output is valid HTML.
  5. DO NOT modify any image src attributes that look like __IMAGE_PLACEHOLDER_X__. Leave them exactly as they are.
  6. If the user asks to add a NEW image, illustration, or media (not the one they uploaded), you MUST insert an image tag with a special attribute like this: <img data-ai-prompt="detailed visual description of the image to generate" src="https://placehold.co/600x400?text=Generating+Image..." alt="description" style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 8px;" />. The system will automatically generate the real image based on the data-ai-prompt attribute.`;

  const contents: any = [
    { text: fullPrompt }
  ];

  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      contents.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    
    let result = response.text || "";
    // Remove markdown code blocks if the model still includes them
    result = result.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    
    // Restore base64 images
    let finalHtml = result.trim();
    imageMap.forEach((base64Data, placeholder) => {
      finalHtml = finalHtml.replace(placeholder, base64Data);
    });

    // Replace uploaded image placeholder with actual base64
    if (imageBase64) {
      finalHtml = finalHtml.replace(/__UPLOADED_IMAGE__/g, () => imageBase64);
    }
    
    // Post-process to generate new images requested by AI
    const imgRegex = /<img[^>]+data-ai-prompt=["']([^"']+)["'][^>]*>/g;
    let match;
    const imagePromises: Promise<{match: string, replacement: string}>[] = [];
    
    // Reset regex index just in case
    imgRegex.lastIndex = 0;
    
    while ((match = imgRegex.exec(finalHtml)) !== null) {
      const fullMatch = match[0];
      const imagePrompt = match[1];
      
      const promise = generateQuestionImage(imagePrompt).then(base64Url => {
        if (base64Url) {
          // Replace the src attribute with the generated base64 URL
          return {
            match: fullMatch,
            replacement: fullMatch.replace(/src=["'][^"']+["']/, `src="${base64Url}"`).replace(/data-ai-prompt=["'][^"']+["']/, '')
          };
        }
        return { match: fullMatch, replacement: fullMatch };
      });
      imagePromises.push(promise);
    }
    
    if (imagePromises.length > 0) {
      const replacements = await Promise.all(imagePromises);
      for (const {match, replacement} of replacements) {
        finalHtml = finalHtml.replace(match, replacement);
      }
    }
    
    return finalHtml;
  } catch (e) {
    console.error("Failed to edit paper with AI", e);
    throw new Error("Failed to edit paper with AI");
  }
}
