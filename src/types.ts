export type CellValue = number | null;
export type PencilMarks = number[];
export type BoardType = (CellValue)[][];

// Types from sudoku-core
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';
export type SudokuBoard = Array<number | null>;
export interface Update {
  index: number;
  eliminatedCandidate?: number;
  filledValue: number;
}
export interface SolvingStep {
  strategy: string;
  updates: Array<Update>;
  type: "value" | "elimination";
}

export type Hint = {
  strategy: string;
  cell: [number, number];
  value: number;
} | null;

export type SolutionStep = {
  board: BoardType;
  cell: [number, number];
  value: number;
  strategy: string;
  explanation: string;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
};

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-solve',
    title: 'First Solve',
    description: 'Solve your first Sudoku puzzle.',
    earned: false,
  },
  {
    id: 'naked-single-master',
    title: 'Naked Single Master',
    description: 'Solve a puzzle using only Naked Single strategy.',
    earned: false,
  },
  {
    id: 'hidden-single-master',
    title: 'Hidden Single Master',
    description: 'Solve a puzzle using at least one Hidden Single strategy.',
    earned: false,
  },
  {
    id: 'no-hint-master',
    title: 'No Hint Master',
    description: 'Solve a puzzle without using any hints.',
    earned: false,
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Solve a puzzle in under 5 minutes.',
    earned: false,
  },
];