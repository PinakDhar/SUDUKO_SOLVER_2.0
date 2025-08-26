import React, { useState, useEffect } from 'react';
import '../styles/GuidancePanel.css';
import '../styles/StrategyExplanation.css';
import StrategyExplanation from './StrategyExplanation';
import type { Hint, SolutionStep, Achievement } from '../types';
import { ALL_ACHIEVEMENTS } from '../types';

const GuidancePanel: React.FC<{
  currentStep: SolutionStep | undefined;
  checkAchievement: (id: string) => void;
  hint: Hint;
  isStepMode?: boolean;
  totalSteps?: number;
  currentStepIndex?: number;
}> = ({ currentStep, hint, isStepMode = false, totalSteps = 0, currentStepIndex = -1 }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'hints' | 'tutorial' | 'strategies' | 'solver' | 'achievements'>('guide');
  const [achievements] = useState<Achievement[]>(() => {
    const savedAchievements = localStorage.getItem('sudokuAchievements');
    return savedAchievements ? JSON.parse(savedAchievements) : ALL_ACHIEVEMENTS;
  });

  useEffect(() => {
    localStorage.setItem('sudokuAchievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    if (hint) {
      setActiveTab('hints');
    }
  }, [hint]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'guide':
        return (
          <div className="tab-content">
            <h3>How to Play</h3>
            <div className="hint-card tutorial">
              <h4>Basic Rules</h4>
              <p>Fill the grid so that every row, column, and 3x3 box contains the numbers 1-9 without repeating any numbers.</p>
            </div>
            <div className="hint-card tip">
              <h4>Tips for Beginners</h4>
              <ul>
                <li>Start with the numbers that appear most frequently in the puzzle</li>
                <li>Look for rows or columns that are nearly complete</li>
                <li>Use the "Solve with AI" button if you get stuck and want to see how it's done</li>
              </ul>
            </div>
          </div>
        );
      case 'hints':
        return (
          <div className="tab-content">
            <h3>Need Help?</h3>
            {hint ? (
              <>
                <div className="hint-card hint">
                  <h4>Strategy: {hint.strategy}</h4>
                  <p>Look at cell [{hint.cell[0] + 1}, {hint.cell[1] + 1}]. The correct value is {hint.value}.</p>
                </div>
                <StrategyExplanation strategy={hint.strategy} />
              </>
            ) : (
              <p>Click the "Hint" button to get a strategic hint.</p>
            )}
          </div>
        );
      case 'tutorial':
        return (
          <div className="tab-content">
            <h3>Step-by-Step Tutorial</h3>
            <div className="tutorial-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Scan the Grid</h4>
                  <p>Look for rows, columns, or boxes that are almost complete.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Eliminate Possibilities</h4>
                  <p>For each empty cell, eliminate numbers that already appear in its row, column, and box.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Look for Singles</h4>
                  <p>If a cell can only be one number, that's your answer!</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'strategies':
        return (
          <div className="tab-content">
            <h3>Sudoku Strategies</h3>
            <div className="hint-card tip">
              <h4>Naked Single</h4>
              <p>A naked single is a cell that has only one possible number it can be. This is the most basic and common strategy.</p>
            </div>
            <div className="hint-card tip">
              <h4>Hidden Single</h4>
              <p>A hidden single is a cell where a certain number can only go in that one cell within a row, column, or 3x3 box, even if that cell has other pencil marks.</p>
            </div>
          </div>
        );
      case 'solver':
        return (
          <div className="tab-content">
            <h3>AI Solver Explanation</h3>
            {currentStep ? (
              <div className="hint-card explanation">
                <h4>Step: [{currentStep.cell[0] + 1}, {currentStep.cell[1] + 1}] = {currentStep.value}</h4>
                <p><strong>Strategy:</strong> {currentStep.strategy}</p>
                {currentStep.explanation && (
                  <p><strong>Explanation:</strong> {currentStep.explanation}</p>
                )}
                {isStepMode && (
                  <div className="step-navigation-info">
                    <p>Step {currentStepIndex + 1} of {totalSteps}</p>
                    <p className="step-tip">Use the Previous/Next buttons to navigate through the solution step by step!</p>
                  </div>
                )}
              </div>
            ) : (
              <p>Click "Show Me How" on the board to see the AI solver in action!</p>
            )}
          </div>
        );
      case 'achievements':
        return (
          <div className="tab-content">
            <h3>Your Achievements</h3>
            <div className="achievements-list">
              {achievements.map(achievement => (
                <div key={achievement.id} className={`hint-card achievement ${achievement.earned ? 'earned' : ''}`}>
                  <h4>{achievement.title} {achievement.earned && '🏆'}</h4>
                  <p>{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="guidance-panel">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          Guide
        </button>
        <button
          className={`tab ${activeTab === 'hints' ? 'active' : ''}`}
          onClick={() => setActiveTab('hints')}
        >
          Hints
        </button>
        <button
          className={`tab ${activeTab === 'tutorial' ? 'active' : ''}`}
          onClick={() => setActiveTab('tutorial')}
        >
          Tutorial
        </button>
        <button
          className={`tab ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
        >
          Strategies
        </button>
        <button
          className={`tab ${activeTab === 'solver' ? 'active' : ''}`}
          onClick={() => setActiveTab('solver')}
        >
          Solver
        </button>
        <button
          className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </button>
      </div>

      <div className="panel-content">
        {renderTabContent()}
      </div>

      <div className="motivational-quote">
        "Every expert was once a beginner. Take your time and enjoy the puzzle!"
      </div>
    </div>
  );
};

export default GuidancePanel;
