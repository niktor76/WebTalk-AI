export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY_TO_CHAT = 'READY_TO_CHAT',
  LIVE_ACTIVE = 'LIVE_ACTIVE',
  ERROR = 'ERROR'
}

export interface WebsiteContext {
  url: string;
  summary: string; // Short summary for UI display
  fullContent: string; // Complete text content for AI context
  groundingUrls: string[];
}

export interface ChatMessage {
  id: string;
  speaker: 'user' | 'model';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface SavedSession {
  id: string;
  title: string;
  context: WebsiteContext;
  messages: ChatMessage[];
  lastUpdated: number;
}