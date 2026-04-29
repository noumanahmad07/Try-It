export const Type = {
  OBJECT: "object",
  STRING: "string",
  ARRAY: "array",
};

class DummyChat {
  async sendMessage(_options: any) {
    return { text: "Gemini is unavailable in the browser build." };
  }
}

class DummyModels {
  async generateContent(_options: any) {
    return {
      candidates: [
        {
          content: {
            parts: [
              {
                text: "Gemini AI is not available in this browser environment.",
              },
            ],
          },
        },
      ],
    };
  }
}

export class GoogleGenAI {
  constructor(_options: any) {}

  get chats() {
    return {
      create: (_options: any) => new DummyChat(),
    };
  }

  get models() {
    return new DummyModels();
  }
}
