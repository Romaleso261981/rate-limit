export interface ResponseItem {
  index: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface Stats {
  success: number;
  errors: number;
}

export interface Progress {
  completed: number;
  total: number;
}

