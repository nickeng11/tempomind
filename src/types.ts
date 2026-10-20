export type Energy = 'high' | 'steady' | 'low' | 'fried';

export interface MicroStep {
  id: string;
  title: string;
  minutes: number;
  done: boolean;
  doneAt?: number;
}

export interface Task {
  id: string;
  milestoneId: string;
  phase: string;
  title: string;
  /** Scheduled day (YYYY-MM-DD). Energy re-slicing never changes this. */
  date: string;
  kind?: 'review';
  steps: MicroStep[];
}

export interface Milestone {
  id: string;
  week: number;
  title: string;
  deliverable: string;
  startDate: string;
  endDate: string;
}

export type EffortSize = 'small' | 'medium' | 'large';

/** The sizing assumptions a plan was built with. */
export interface EffortPlan {
  size: EffortSize;
  hoursPerWeek: number;
  /** Working days left free before the deadline. */
  bufferDays: number;
}

export interface WorkSession {
  taskId: string;
  startedAt: number;
  durationMin: number;
}

/** Project data. Teammates can see a projection of this (see toPublicView). */
export interface Project {
  id: string;
  goal: string;
  title: string;
  category: string;
  startDate: string;
  deadline: string;
  createdAt: number;
  milestones: Milestone[];
  tasks: Task[];
  session: WorkSession | null;
  /** Missing on projects created before effort sizing existed. */
  effort?: EffortPlan;
  /** Set when the owner confirms completion. The project then becomes read-only. */
  completedAt?: number;
}

/**
 * Owner-only well-being data. Stored separately from projects and never
 * passed to team-facing views or share links.
 */
export interface OwnerPrivateState {
  energy: Energy | null;
  energyDate: string | null;
}
