import { GoogleGenAI, Modality, type Content } from "@google/genai";
// Fix: Import Author as a value, not just a type, because it is used at runtime.
import { Author, type GenerationEvent, type ChatMessage, type GeminiChatModel } from '../types';

if (!import.meta.env.VITE_API_KEY) {
  throw new Error("VITE_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const geminiService = {
  getChatResponse: async (messages: ChatMessage[], model: GeminiChatModel): Promise<string> => {
    try {
      const contents: Content[] = messages.map(msg => ({
          role: msg.author === Author.USER ? 'user' : 'model',
          // Ensure content is always a string for the API call
          parts: [{ text: typeof msg.content === 'string' ? msg.content : '' }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
           systemInstruction: 'You are a helpful and creative AI assistant. Your name is Gemini.',
        }
      });
      return response.text;
    } catch (error) {
      console.error("Error getting chat response:", error);
      return "Sorry, I encountered an error. Please try again.";
    }
  },

  generateImage: async (prompt: string, params: GenerationEvent['parameters']): Promise<string[] | null> => {
    try {
      const { model, numberOfImages, aspectRatio, outputMimeType } = params;
      
      const config: any = {
          numberOfImages,
          aspectRatio,
          outputMimeType: outputMimeType || 'image/png',
      };

      const response = await ai.models.generateImages({
        model,
        prompt,
        config,
      });

      const mimeType = outputMimeType || 'image/png';
      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages.map(img => `data:${mimeType};base64,${img.image.imageBytes}`);
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  },

  analyzeImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      };
      const textPart = {
        text: prompt,
      };
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      return response.text;
    } catch (error) {
      console.error("Error analyzing image:", error);
      return "Sorry, I couldn't analyze the image.";
    }
  },

  editImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          return `data:image/png;base64,${base64ImageBytes}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Error editing image:", error);
      return null;
    }
  },
};