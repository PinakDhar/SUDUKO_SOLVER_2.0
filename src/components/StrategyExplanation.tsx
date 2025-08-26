import React from 'react';

type StrategyExplanationProps = {
  strategy: string;
};

const explanations: Record<string, { title: string; description: string }> = {
  'naked-single': {
    title: 'Naked Single',
    description: 'A Naked Single is a cell that has only one possible number it can be. This is the most basic and common strategy. Look for a cell where all other numbers in its row, column, and 3x3 box are already filled in.',
  },
  'hidden-single': {
    title: 'Hidden Single',
    description: 'A Hidden Single is a cell where a certain number can only go in that one cell within a row, column, or 3x3 box, even if that cell has other pencil marks. Look for a number that appears only once in the pencil marks of a single row, column, or box.',
  },
  // Add more explanations for other strategies here
};

const StrategyExplanation: React.FC<StrategyExplanationProps> = ({ strategy }) => {
  const explanation = explanations[strategy];

  if (!explanation) {
    return null;
  }

  return (
    <div className="strategy-explanation">
      <h4>{explanation.title}</h4>
      <p>{explanation.description}</p>
    </div>
  );
};

export default StrategyExplanation;
