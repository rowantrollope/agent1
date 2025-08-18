import { getOpenAIClient } from './client';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class Agent {
  private client = getOpenAIClient();
  private config: Required<AgentConfig>;
  private messages: ChatMessage[] = [];

  constructor(config: AgentConfig = {}) {
    this.config = {
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 2000,
      systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
    };

    // Add system message
    this.addMessage('system', this.config.systemPrompt);
  }

  private addMessage(role: ChatMessage['role'], content: string): ChatMessage {
    const message: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
    };

    this.messages.push(message);
    return message;
  }

  async chat(userMessage: string): Promise<ChatMessage> {
    // Add user message
    this.addMessage('user', userMessage);

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: this.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      return this.addMessage('assistant', assistantMessage);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.addMessage('assistant', 'Sorry, there was an error processing your request.');
    }
  }

  getMessages(): ChatMessage[] {
    return this.messages.filter(msg => msg.role !== 'system');
  }

  clearHistory(): void {
    this.messages = this.messages.filter(msg => msg.role === 'system');
  }

  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
    // Remove old system messages and add new one
    this.messages = this.messages.filter(msg => msg.role !== 'system');
    this.addMessage('system', prompt);
  }
}