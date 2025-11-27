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

export interface Person {
  name: string;
  start_date?: string;
  end_date?: string;
  meeting_place?: string;
  how_we_met?: string;
  details?: string;
  status?: 'active' | 'paused' | 'exploring' | 'not_pursuing' | 'past';
  memory_tags?: string;
  last_updated?: string;
  created_at?: string;
  photo_url?: string;
  dates?: DateLogEntry[];
}

export interface DatingStatistics {
  total_people: number;
  active_count: number;
  not_pursuing_count: number;
  paused_count: number;
  exploring_count: number;
  common_meeting_places?: Array<{ place: string; count: number }>;
  common_how_we_met?: Array<{ place: string; count: number }>;
  total_dates?: number;
  avg_dates_per_person?: number;
  avg_relationship_duration_days?: number;
  longest_relationship?: { name: string; days: number };
}

export interface DashboardData {
  statistics: DatingStatistics;
  activePeople: Person[];
  nextDate?: {
    name: string;
    date: string;
  };
  datingHistory?: Array<{
    month: string;
    count: number;
  }>;
}

export interface UpcomingDate {
  id: string;
  person_name: string;
  when: string;
  where?: string;
}

export interface AnalyticsData {
  dates_per_person: Array<{ name: string; count: number }>;
  date_locations: Array<{ location: string; count: number }>;
  dates_by_month: Array<{ month: string; count: number }>;
  relationship_durations: Array<{ name: string; days: number }>;
  date_frequency_distribution: Array<{ dates: number; people: number }>;
}

export interface DateLogEntry {
  where: string;
  when: string;
  notes?: string;
  learnings?: string;
  id?: string;
  completed?: boolean;
  person_name?: string;
}

export interface RomanticDate extends DateLogEntry {
  id: string;
  person_name: string;
  where: string;
  when: string;
  completed: boolean;
}

export interface DatePrep {
  overview?: string;
  keyMemories?: Array<{ text: string; why: string }>;
  conversationStarters?: string[];
  thingsSheLikes?: string[];
  dateHistorySummary?: string;
  dateSuggestions?: string[];
  thingsToAvoid?: string[];
  tips?: string[];
}

export interface MemoryRecordLite {
  id: string;
  memory_type: string;
  text: string;
  event_date?: string;
}

export interface DossierChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DossierBrief {
  personaTone?: string;
  summary?: string;
  signalBars?: Array<{ label: string; score: number; note: string }>;
  highlightCards?: Array<{ id: string; title: string; detail: string; tone: "violet" | "emerald" | "amber" }>;
  actionItems?: string[];
}

export interface DossierPayload {
  person: Person;
  brief: DossierBrief;
  memories: MemoryRecordLite[];
  dates: DateLogEntry[];
  memoryStats?: { total: number; lastUpdated: string };
  lastRefreshed?: string;
}
