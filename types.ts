
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum FilterStatus {
  ALL = 'All',
  PENDING = 'Pending',
  COMPLETED = 'Completed'
}

export enum AppView {
  DASHBOARD = 'Dashboard',
  RECORDS = 'Records'
}

export interface User {
  username: string;
  id: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  priority: Priority;
  tags: string[];
  timeSpent: number; // in seconds
  isTimerRunning: boolean;
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
}
