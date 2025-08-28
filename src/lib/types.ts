export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: ChatMessage;
  history: ChatMessage[];
}

export interface ApiResponse {
  history?: ChatMessage[];
  success?: boolean;
  message?: string;
  error?: string;
}
