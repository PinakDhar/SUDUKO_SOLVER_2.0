import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/Board.css';
import GuidancePanel from './GuidancePanel';
import { hint as getHint, solve as solveSudoku, generate as generateSudoku } from 'sudoku-core';
import type {
  PencilMarks,
  BoardType,
  Hint,
  SolutionStep,
  Achievement,
  SudokuBoard,
  SolvingStep
} from '../types';
import { ALL_ACHIEVEMENTS } from '../types';

// Helper to convert 1D board to 2D
const to2D = (board: SudokuBoard): BoardType => {
  const newBoard: BoardType = [];
  for (let i = 0; i < 9; i++) {
    newBoard.push(board.slice(i * 9, i * 9 + 9));
  }
  return newBoard;
};

// Helper to convert 2D board to 1D
const to1D = (board: BoardType): SudokuBoard => {
  return board.flat();
};

const Board: React.FC = () => {
  const [board, setBoard] = useState<BoardType>(to2D(generateSudoku('easy')));
  const [pencilMarks, setPencilMarks] = useState<PencilMarks[][]>(
    Array(9).fill(null).map(() => Array(9).fill([]))
  );
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [initialBoardState, setInitialBoardState] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [conflictCells, setConflictCells] = useState<[number, number][]>([]);
  const [hint, setHint] = useState<Hint>(null);
  const [solutionSteps, setSolutionSteps] = useState<SolutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isStepMode, setIsStepMode] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const savedAchievements = localStorage.getItem('sudokuAchievements');
    return savedAchievements ? JSON.parse(savedAchievements) : ALL_ACHIEVEMENTS;
  });
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [score, setScore] = useState(0);

  // Undo/Redo functionality
  const [history, setHistory] = useState<{
    board: BoardType;
    pencilMarks: PencilMarks[][];
  }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [future, setFuture] = useState<{
    board: BoardType;
    pencilMarks: PencilMarks[][];
  }[]>([]);

  useEffect(() => {
    localStorage.setItem('sudokuAchievements', JSON.stringify(achievements));
  }, [achievements]);

  // Update board when navigating through solution steps
  useEffect(() => {
    if (currentStepIndex >= 0 && solutionSteps[currentStepIndex]) {
      const currentStep = solutionSteps[currentStepIndex];
      setBoard(currentStep.board);
    }
  }, [currentStepIndex, solutionSteps]);

  const checkAchievement = useCallback((id: string) => {
    setAchievements(prevAchievements =>
      prevAchievements.map(achievement =>
        achievement.id === id && !achievement.earned
          ? { ...achievement, earned: true }
          : achievement
      )
    );
  }, []);

  // Save current state to history before making changes
  const saveToHistory = useCallback((newBoard: BoardType, newPencilMarks: PencilMarks[][]) => {
    // Don't save if nothing has changed
    if (JSON.stringify(newBoard) === JSON.stringify(board) &&
      JSON.stringify(newPencilMarks) === JSON.stringify(pencilMarks)) {
      return;
    }

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        board: JSON.parse(JSON.stringify(board)),
        pencilMarks: JSON.parse(JSON.stringify(pencilMarks))
      });
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setFuture([]); // Clear redo history when making new changes
  }, [board, pencilMarks, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex < 0) return;

    const previousState = history[historyIndex];
    setBoard(previousState.board);
    setPencilMarks(previousState.pencilMarks);

    // Move current state to redo stack
    setFuture(prev => [{
      board: JSON.parse(JSON.stringify(board)),
      pencilMarks: JSON.parse(JSON.stringify(pencilMarks))
    }, ...prev].slice(0, 49));

    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex, board, pencilMarks]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const nextState = future[0];
    setBoard(nextState.board);
    setPencilMarks(nextState.pencilMarks);

    // Move state back to history
    setHistory(prev => {
      const newHistory = [...prev, {
        board: JSON.parse(JSON.stringify(board)),
        pencilMarks: JSON.parse(JSON.stringify(pencilMarks))
      }];
      return newHistory.slice(-50);
    });

    setFuture(prev => prev.slice(1));
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [future, board, pencilMarks]);

  // Handle cell clearing
  const handleClearCell = useCallback(() => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;

    if (initialBoardState[row]?.[col]) return; // Don't clear initial numbers

    // Save current state before making changes
    saveToHistory(board, pencilMarks);

    const newBoard = board.map((r, rIdx) =>
      rIdx === row ? [...r.slice(0, col), null, ...r.slice(col + 1)] : [...r]
    );
    setBoard(newBoard);

    const newPencilMarks = pencilMarks.map((r, rIdx) =>
      rIdx === row ? [...r.slice(0, col), [], ...r.slice(col + 1)] : [...r]
    );
    setPencilMarks(newPencilMarks);
  }, [selectedCell, initialBoardState, board, pencilMarks, saveToHistory]);

  // Handle keyboard input for numbers and navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle number input
    if (/^[1-9]$/.test(e.key) && selectedCell) {
      const [row, col] = selectedCell;
      const num = parseInt(e.key);

      if (isPencilMode) {
        // Toggle pencil mark
        const newPencilMarks = [...pencilMarks];
        newPencilMarks[row] = [...newPencilMarks[row]];

        if (newPencilMarks[row][col].includes(num)) {
          newPencilMarks[row][col] = newPencilMarks[row][col].filter(n => n !== num);
        } else {
          newPencilMarks[row][col] = [...newPencilMarks[row][col], num].sort((a, b) => a - b);
        }

        setPencilMarks(newPencilMarks);
      } else {
        // Set cell value
        const newBoard = [...board];
        newBoard[row] = [...newBoard[row]];
        newBoard[row][col] = num;

        // Clear pencil marks for this cell when setting a number
        const newPencilMarks = [...pencilMarks];
        newPencilMarks[row] = [...newPencilMarks[row]];
        newPencilMarks[row][col] = [];

        setBoard(newBoard);
        setPencilMarks(newPencilMarks);
      }
    }
    // Handle backspace/delete for clearing cell
    else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCell) {
      handleClearCell();
    }
    // Handle arrow key navigation
    else if (selectedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const [row, col] = selectedCell;

      switch (e.key) {
        case 'ArrowUp':
          if (row > 0) setSelectedCell([row - 1, col]);
          break;
        case 'ArrowDown':
          if (row < 8) setSelectedCell([row + 1, col]);
          break;
        case 'ArrowLeft':
          if (col > 0) setSelectedCell([row, col - 1]);
          break;
        case 'ArrowRight':
          if (col < 8) setSelectedCell([row, col + 1]);
          break;
      }
    }
    // Handle undo/redo
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
      e.preventDefault();
      if (e.key === 'z' && !e.shiftKey) {
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        redo();
      }
    }
    // Toggle pencil mode with 'P' key
    else if (e.key.toLowerCase() === 'p') {
      e.preventDefault();
      setIsPencilMode(prev => !prev);
    }
  }, [selectedCell, isPencilMode, pencilMarks, board, handleClearCell, undo, redo]);

  const handleHint = () => {
    setHintsUsed(prev => prev + 1);
    const board1D = to1D(board);
    const hintResult = getHint(board1D);

    if (hintResult && hintResult.steps && hintResult.steps.length > 0) {
      const hintStep = hintResult.steps[0];
      const update = hintStep.updates[0];
      const row = Math.floor(update.index / 9);
      const col = update.index % 9;
      setHint({ strategy: hintStep.strategy, cell: [row, col], value: update.filledValue });
      setSelectedCell([row, col]);
      setScore(prev => Math.max(0, prev - 50)); // Deduct points for using a hint
    } else {
      setHint(null);
      alert("No obvious hints found!");
    }
  };

  // Initialize the board with a new puzzle
  const resetBoard = useCallback(() => {
    const newBoard = to2D(generateSudoku('easy'));
    setBoard(newBoard);
    setPencilMarks(Array(9).fill(null).map(() => Array(9).fill([])));

    // Track which cells are part of the initial puzzle (non-editable)
    const initialCells = newBoard.map(row =>
      row.map(cell => cell !== null)
    );
    setInitialBoardState(initialCells);
    setConflictCells([]);
    setSelectedCell(null);
    setHintsUsed(0);
    setStartTime(Date.now());
    setScore(0);
    setSolutionSteps([]);
    setCurrentStepIndex(-1);
    setIsStepMode(false);
    setHistory([]);
    setFuture([]);
    setHistoryIndex(-1);
  }, []);

  // Initialize the board with a new puzzle
  useEffect(() => {
    resetBoard();
  }, [resetBoard]);

  // Using a ref to hold the callback to avoid re-adding the event listener.
  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;

  useEffect(() => {
    const callback = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener('keydown', callback);
    return () => {
      window.removeEventListener('keydown', callback);
    };
  }, []); // Empty array means this effect runs only once on mount.

  const handleCellClick = (row: number, col: number) => {
    // Only allow selecting empty cells or user-filled cells
    if (initialBoardState[row]?.[col]) return;
    setSelectedCell([row, col]);
  };

  const awardPoints = (strategy: string) => {
    switch (strategy) {
      case 'naked-single':
        setScore(prev => prev + 10);
        break;
      case 'hidden-single':
        setScore(prev => prev + 20);
        break;
      default:
        setScore(prev => prev + 5);
        break;
    }
  };

  const handleNumberClick = (num: number) => {
    if (!selectedCell) return;

    const [row, col] = selectedCell;

    // Don't allow modifying initial puzzle cells
    if (initialBoardState[row]?.[col]) return;

    // Save current state before making changes
    saveToHistory(board, pencilMarks);

    if (isPencilMode) {
      // Toggle pencil mark
      const newPencilMarks = [...pencilMarks];
      newPencilMarks[row] = [...newPencilMarks[row]];

      if (newPencilMarks[row][col].includes(num)) {
        // Remove the pencil mark if it exists
        newPencilMarks[row][col] = newPencilMarks[row][col].filter(n => n !== num);
      } else {
        // Add the pencil mark if it doesn't exist
        newPencilMarks[row][col] = [...newPencilMarks[row][col], num].sort((a, b) => a - b);
      }

      setPencilMarks(newPencilMarks);
    } else {
      // Regular number input
      const newBoard = [...board];
      // Clear pencil marks for this cell when entering a number
      const newPencilMarks = [...pencilMarks];
      newPencilMarks[row] = [...newPencilMarks[row]];
      newPencilMarks[row][col] = [];

      // Toggle number - if the same number is clicked again, clear the cell
      newBoard[row] = [...newBoard[row]];
      const isCorrectMove = () => {
        const board1D = to1D(board);
        const hintResult = getHint(board1D);
        if (hintResult && hintResult.steps && hintResult.steps.length > 0) {
          const hintStep = hintResult.steps[0];
          const update = hintStep.updates[0];
          return update.index === row * 9 + col && update.filledValue === num;
        }
        return false;
      };

      if (isCorrectMove()) {
        const board1D = to1D(board);
        const hintResult = getHint(board1D);
        if (hintResult && hintResult.steps && hintResult.steps.length > 0) {
          const hintStep = hintResult.steps[0];
          awardPoints(hintStep.strategy);
          checkAchievement(`${hintStep.strategy}-master`);
        }
      }

      newBoard[row][col] = newBoard[row][col] === num ? null : num;

      setBoard(newBoard);
      setPencilMarks(newPencilMarks);
    }
  };

  const handleCheckSolution = () => {
    const { isValid, conflicts } = checkSolution();

    if (isValid) {
      alert('Congratulations! The solution is correct!');
      setConflictCells([]);
      checkAchievement('first-solve');
      if (hintsUsed === 0) {
        checkAchievement('no-hint-master');
      }
      const timeTaken = (Date.now() - startTime) / 1000; // in seconds
      if (timeTaken < 300) { // 5 minutes
        checkAchievement('speed-demon');
      }
    } else {
      setConflictCells(conflicts);

      // Reset after 2 seconds
      setTimeout(() => {
        setConflictCells([]);
      }, 2000);
    }
  };

  // Check if the current board is solved correctly
  const checkSolution = (): { isValid: boolean; conflicts: [number, number][] } => {
    const conflicts = new Set<string>();

    // Check rows
    for (let row = 0; row < 9; row++) {
      const seen = new Set<number>();
      for (let col = 0; col < 9; col++) {
        const value = board[row][col];
        if (!value) continue;
        if (seen.has(value)) {
          // Mark all instances of this value in the row as conflicting
          for (let c = 0; c < 9; c++) {
            if (board[row][c] === value) {
              conflicts.add(`${row},${c}`);
            }
          }
        }
        seen.add(value);
      }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
      const seen = new Set<number>();
      for (let row = 0; row < 9; row++) {
        const value = board[row][col];
        if (!value) continue;
        if (seen.has(value)) {
          // Mark all instances of this value in the column as conflicting
          for (let r = 0; r < 9; r++) {
            if (board[r][col] === value) {
              conflicts.add(`${r},${col}`);
            }
          }
        }
        seen.add(value);
      }
    }

    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = new Set<number>();
        for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
          for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
            const value = board[row][col];
            if (!value) continue;
            if (seen.has(value)) {
              // Mark all instances of this value in the box as conflicting
              for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
                for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
                  if (board[r][c] === value) {
                    conflicts.add(`${r},${c}`);
                  }
                }
              }
            }
            seen.add(value);
          }
        }
      }
    }

    // Check for empty cells
    let isComplete = true;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!board[row][col]) {
          isComplete = false;
          break;
        }
      }
    }

    // Convert string coordinates back to [number, number] tuples
    const conflictCoords: [number, number][] = Array.from(conflicts).map(coord => {
      const [r, c] = coord.split(',').map(Number);
      return [r, c];
    });

    return {
      isValid: isComplete && conflicts.size === 0,
      conflicts: conflictCoords
    };
  };

  const isInSameBox = (row1: number, col1: number, row2: number, col2: number) => {
    const boxRow1 = Math.floor(row1 / 3);
    const boxCol1 = Math.floor(col1 / 3);
    const boxRow2 = Math.floor(row2 / 3);
    const boxCol2 = Math.floor(col2 / 3);
    return boxRow1 === boxRow2 && boxCol1 === boxCol2;
  };

  const getCellClass = (row: number, col: number) => {
    const classes = ['cell'];

    if (initialBoardState[row]?.[col]) {
      classes.push('initial-number');
    }

    if (selectedCell) {
      const [selectedRow, selectedCol] = selectedCell;
      if (row === selectedRow && col === selectedCol) {
        classes.push('selected');
      }
      if (
        row === selectedRow ||
        col === selectedCol ||
        isInSameBox(row, col, selectedRow, selectedCol)
      ) {
        classes.push('highlighted');
      }
    }

    if (conflictCells.some(([r, c]) => r === row && c === col)) {
      classes.push('conflict');
    }

    if (hint) {
      const { cell: hintCell, strategy } = hint;
      if (row === hintCell[0] && col === hintCell[1]) {
        classes.push('hint-cell');
      }

      if (strategy === 'hidden-single') {
        // Assuming the hint object has a 'unit' property for hidden-single
        const unit = (hint as any).unit;
        if (unit === 'row' && row === hintCell[0]) {
          classes.push('hint-unit');
        }
        if (unit === 'col' && col === hintCell[1]) {
          classes.push('hint-unit');
        }
        if (unit === 'box' && isInSameBox(row, col, hintCell[0], hintCell[1])) {
          classes.push('hint-unit');
        }
      }
    }

    // Highlight current step in solution mode
    if (isStepMode && currentStepIndex >= 0 && solutionSteps[currentStepIndex]) {
      const currentStep = solutionSteps[currentStepIndex];
      if (row === currentStep.cell[0] && col === currentStep.cell[1]) {
        classes.push('current-step');
      }
    }

    return classes.join(' ');
  };

  // Generate step-by-step solution using sudoku-core
  const generateSolutionSteps = useCallback(() => {
    const board1D = to1D(board);
    const solution = solveSudoku(board1D);
    if (solution.solved && solution.steps) {
      let currentBoard = [...board];
      return solution.steps.map((step: SolvingStep) => {
        const update = step.updates[0];
        const row = Math.floor(update.index / 9);
        const col = update.index % 9;
        const newBoard = currentBoard.map((r, rIdx) => r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return update.filledValue;
          }
          return c;
        }));
        currentBoard = newBoard;
        return {
          board: newBoard,
          cell: [row, col] as [number, number],
          value: update.filledValue,
          strategy: step.strategy,
          explanation: generateStepExplanation(step.strategy, row, col, update.filledValue)
        };
      });
    }
    return [];
  }, [board]);

  // Generate human-readable explanation for each step
  const generateStepExplanation = (strategy: string, row: number, col: number, value: number): string => {
    const rowNum = row + 1;
    const colNum = col + 1;

    switch (strategy) {
      case 'naked-single':
        return `Cell [${rowNum}, ${colNum}] can only be ${value}. All other numbers 1-9 are already present in its row, column, or 3x3 box.`;

      case 'hidden-single':
        return `In the row/column/box containing cell [${rowNum}, ${colNum}], the number ${value} can only go in this one cell.`;

      case 'naked-pair':
        return `Found a naked pair in the row/column/box containing cell [${rowNum}, ${colNum}]. This allows us to place ${value}.`;

      case 'hidden-pair':
        return `Found a hidden pair pattern that reveals ${value} must go in cell [${rowNum}, ${colNum}].`;

      default:
        return `Using ${strategy} strategy to place ${value} in cell [${rowNum}, ${colNum}].`;
    }
  };

  // Start step-by-step solution mode
  const handleShowMeHow = () => {
    if (isSolving) return;

    setIsSolving(true);
    const steps = generateSolutionSteps();

    if (steps.length === 0) {
      alert('No solution steps found!');
      setIsSolving(false);
      return;
    }

    setSolutionSteps(steps);
    setCurrentStepIndex(0);
    setIsStepMode(true);
    setIsSolving(false);

    // Award points for learning
    setScore(prev => prev + 25);
  };

  // Navigate to previous step
  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Navigate to next step
  const handleNextStep = () => {
    if (currentStepIndex < solutionSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Exit step mode and return to original board
  const handleExitStepMode = () => {
    setIsStepMode(false);
    setCurrentStepIndex(-1);
    setSolutionSteps([]);
    // Restore original board state
    resetBoard();
  };

  // Render pencil marks for a cell
  const renderPencilMarks = useCallback((row: number, col: number) => {
    if (!pencilMarks[row]?.[col]?.length || board[row][col] !== null) return null;

    return (
      <div className="pencil-marks">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <div
            key={num}
            className={`pencil-mark ${pencilMarks[row][col].includes(num) ? 'active' : ''}`}
          >
            {pencilMarks[row][col].includes(num) ? num : ''}
          </div>
        ))}
      </div>
    );
  }, [pencilMarks, board]);

  return (
    <div className="game-content">
      <div className="game-info">
        <h1>Sudoku Learning Game</h1>
        <div className="score">Score: {score}</div>
        {isStepMode && (
          <div className="step-info">
            Step {currentStepIndex + 1} of {solutionSteps.length}
          </div>
        )}
      </div>

      <div className="sudoku-container">
        <div className="game-board-container">
          <div className="board">
            {board.map((row, rowIndex) => (
              <div key={rowIndex} className="row">
                {row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={getCellClass(rowIndex, colIndex)}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {cell || ''}
                    {renderPencilMarks(rowIndex, colIndex)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="controls">
            <div className="number-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  className="number-button"
                  onClick={() => handleNumberClick(num)}
                  disabled={isStepMode}
                >
                  {num}
                </button>
              ))}
              <button
                className="clear-button"
                onClick={handleClearCell}
                disabled={isStepMode}
                title="Clear selected cell"
              >
                Clear
              </button>
            </div>

            <div className="toolbar">
              <button
                className={`tool-button ${isPencilMode ? 'active' : ''}`}
                onClick={() => setIsPencilMode(!isPencilMode)}
                disabled={isStepMode}
                title="Toggle Pencil Mode (P)"
              >
                ✏️ Pencil
              </button>

              <div className="undo-redo-buttons">
                <button
                  className="tool-button"
                  onClick={undo}
                  disabled={historyIndex < 0 || isStepMode}
                  title="Undo (Ctrl+Z)"
                >
                  ↩️ Undo
                </button>
                <button
                  className="tool-button"
                  onClick={redo}
                  disabled={future.length === 0 || isStepMode}
                  title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                >
                  ↪️ Redo
                </button>
              </div>

              <button
                className="tool-button hint-button"
                onClick={handleHint}
                disabled={isStepMode}
                title="Get a hint"
              >
                💡 Hint
              </button>

              <button
                className="check-button"
                onClick={handleCheckSolution}
                disabled={isStepMode}
                title="Check solution"
              >
                ✓ Check
              </button>

              {!isStepMode ? (
                <button
                  className="solve-button"
                  onClick={handleShowMeHow}
                  disabled={isSolving}
                  title="Learn step-by-step how to solve this puzzle"
                >
                  🎓 Show Me How
                </button>
              ) : (
                <div className="step-controls">
                  <button
                    className="tool-button"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex <= 0}
                    title="Previous step"
                  >
                    &lt; Previous
                  </button>
                  <button
                    className="tool-button"
                    onClick={handleNextStep}
                    disabled={currentStepIndex >= solutionSteps.length - 1}
                    title="Next step"
                  >
                    Next &gt;
                  </button>
                  <button
                    className="tool-button exit-button"
                    onClick={handleExitStepMode}
                    title="Exit learning mode"
                  >
                    ✕ Exit Learning
                  </button>
                </div>
              )}

              <button
                className="new-puzzle-button"
                onClick={resetBoard}
                disabled={isStepMode}
              >
                🆕 New Puzzle
              </button>
            </div>

            <div className="hint">
              {isStepMode
                ? `Learning Mode: Step ${currentStepIndex + 1} of ${solutionSteps.length}`
                : isPencilMode
                  ? "Pencil Mode: Click numbers to add/remove pencil marks"
                  : "Normal Mode: Click numbers to fill cells"}
            </div>
          </div>
        </div>

        <div className="guidance-container">
          <GuidancePanel
            currentStep={solutionSteps[currentStepIndex]}
            checkAchievement={checkAchievement}
            hint={hint}
            isStepMode={isStepMode}
            totalSteps={solutionSteps.length}
            currentStepIndex={currentStepIndex}
          />
        </div>
      </div>
    </div>
  );
};

export default Board;