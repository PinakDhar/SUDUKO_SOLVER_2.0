import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import '../styles/Board.css';

type CellValue = number | null;
type BoardType = CellValue[][];

const Board: React.FC = () => {
  const initialBoard: BoardType = Array(9).fill(null).map(() => Array(9).fill(null));
  const [board, setBoard] = useState<BoardType>(initialBoard);
  const [initialBoardState, setInitialBoardState] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [solvingSpeed, setSolvingSpeed] = useState(50); // ms delay between steps

  // Initialize the board with some numbers for testing
  useEffect(() => {
    resetBoard();
  }, []);

  const resetBoard = () => {
    const exampleBoard: BoardType = [
      [5, 3, null, null, 7, null, null, null, null],
      [6, null, null, 1, 9, 5, null, null, null],
      [null, 9, 8, null, null, null, null, 6, null],
      [8, null, null, null, 6, null, null, null, 3],
      [4, null, null, 8, null, 3, null, null, 1],
      [7, null, null, null, 2, null, null, null, 6],
      [null, 6, null, null, null, null, 2, 8, null],
      [null, null, null, 4, 1, 9, null, null, 5],
      [null, null, null, null, 8, null, null, 7, 9]
    ];
    
    setBoard(exampleBoard);
    
    // Track which cells are part of the initial puzzle (non-editable)
    const initialCells = exampleBoard.map(row => 
      row.map(cell => cell !== null)
    );
    setInitialBoardState(initialCells);
  };

  const handleCellClick = (row: number, col: number) => {
    // Only allow selecting empty cells or user-filled cells
    if (initialBoardState[row]?.[col]) return;
    setSelectedCell([row, col]);
  };

  const handleNumberClick = (num: number) => {
    if (!selectedCell) return;
    
    const [row, col] = selectedCell;
    
    // Don't allow modifying initial puzzle cells
    if (initialBoardState[row]?.[col]) return;
    
    const newBoard = [...board];
    // Toggle number - if the same number is clicked again, clear the cell
    newBoard[row][col] = newBoard[row][col] === num ? null : num;
    setBoard(newBoard);
  };

  const isInSameBox = (row: number, col: number, selectedRow: number, selectedCol: number) => {
    const boxStartRow = Math.floor(selectedRow / 3) * 3;
    const boxStartCol = Math.floor(selectedCol / 3) * 3;
    return row >= boxStartRow && row < boxStartRow + 3 && 
           col >= boxStartCol && col < boxStartCol + 3;
  };

  const getCellClass = (row: number, col: number) => {
    const classes = ['cell'];
    
    // Highlight selected cell and its row/column/box
    if (selectedCell) {
      const [selectedRow, selectedCol] = selectedCell;
      if (row === selectedRow && col === selectedCol) classes.push('selected');
      if (row === selectedRow || col === selectedCol) classes.push('highlighted');
      if (isInSameBox(row, col, selectedRow, selectedCol)) classes.push('highlighted-box');
    }
    
    // Add borders for 3x3 boxes
    if (row % 3 === 2 && row < 8) classes.push('border-bottom');
    if (col % 3 === 2 && col < 8) classes.push('border-right');
    
    // Style for initial puzzle numbers
    if (initialBoardState[row]?.[col]) classes.push('initial-number');
    
    return classes.join(' ');
  };

  // Check if a number can be placed in a cell
  const isValid = useCallback((board: BoardType, row: number, col: number, num: number): boolean => {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }

    // Check 3x3 box
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxStartRow + i][boxStartCol + j] === num) return false;
      }
    }

    return true;
  }, []);

  // Solve the Sudoku using backtracking with visualization
  const solveSudoku = async (board: BoardType): Promise<boolean> => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        // Find empty cell
        if (board[row][col] === null) {
          // Try numbers 1-9
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              // Place the number
              const newBoard = [...board];
              newBoard[row] = [...newBoard[row]];
              newBoard[row][col] = num;
              
              // Update the board with animation
              setBoard([...newBoard]);
              
              // Add delay for visualization
              await new Promise(resolve => setTimeout(resolve, solvingSpeed));
              
              // Recursively solve the rest
              if (await solveSudoku(newBoard)) {
                return true;
              }
              
              // Backtrack
              newBoard[row][col] = null;
              setBoard([...newBoard]);
              await new Promise(resolve => setTimeout(resolve, solvingSpeed));
            }
          }
          return false; // No valid number found
        }
      }
    }
    return true; // Board is solved
  };

  // Start solving the puzzle
  const handleSolveClick = async () => {
    if (isSolving) return;
    
    setIsSolving(true);
    try {
      const boardCopy = JSON.parse(JSON.stringify(board));
      await solveSudoku(boardCopy);
    } catch (error) {
      console.error('Error solving Sudoku:', error);
    } finally {
      setIsSolving(false);
    }
  };

  // Generate a new random puzzle
  const generateNewPuzzle = () => {
    // For now, just reset to the example board
    // In a real app, you'd generate a random valid Sudoku puzzle here
    resetBoard();
  };

  // Handle speed change
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSolvingSpeed(parseInt(e.target.value));
  };

  return (
    <div className="sudoku-container">
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
              disabled={isSolving}
            >
              {num}
            </button>
          ))}
          <button 
            className="clear-button"
            onClick={() => selectedCell && handleNumberClick(0)}
            disabled={isSolving}
          >
            Clear
          </button>
        </div>
        
        <div className="ai-controls">
          <button 
            className="solve-button"
            onClick={handleSolveClick}
            disabled={isSolving}
          >
            {isSolving ? 'Solving...' : 'Solve with AI'}
          </button>
          
          <button 
            className="new-puzzle-button"
            onClick={generateNewPuzzle}
            disabled={isSolving}
          >
            New Puzzle
          </button>
          
          <div className="speed-control">
            <label>Speed:</label>
            <input 
              type="range" 
              min="1" 
              max="1000" 
              value={solvingSpeed} 
              onChange={handleSpeedChange}
              disabled={isSolving}
            />
            <span>{solvingSpeed}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
