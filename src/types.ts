export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // base64 encoded content
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
}
