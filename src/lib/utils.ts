import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vibrate() {
  if ("vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function useVoiceCommand(onCommand: (command: string) => void) {
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      onCommand(command);
    };
    recognition.start();
  };

  return { startListening };
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message?.toLowerCase() || "";
      const isRateLimit = errorMessage.includes('429') || err.status === 'RESOURCE_EXHAUSTED' || err.code === 429;
      const isNetworkError = errorMessage.includes('failed to fetch') || errorMessage.includes('network error') || errorMessage.includes('econnrefused');
      
      if ((isRateLimit || isNetworkError) && i < maxRetries - 1) {
        const waitTime = delay * Math.pow(2, i);
        console.warn(`${isRateLimit ? 'Rate limit' : 'Network error'} hit. Retrying in ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
