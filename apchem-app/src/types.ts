export interface MCOption {
  letter: string;
  text: string;
}

export interface SavedQuestion {
  id: string;
  type: "MC" | "FRQ";
  topic: string;
  question: string;
  options?: MCOption[];      // MC only
  correctAnswer?: string;    // MC only — letter e.g. "A"
  explanation?: string;
  savedAt: string;
  answered?: boolean;
  userAnswer?: string;
  wasCorrect?: boolean;
}

export interface TopicStats {
  [topic: string]: {
    correct: number;
    total: number;
  };
}
