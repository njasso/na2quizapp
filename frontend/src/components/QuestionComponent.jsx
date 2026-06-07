import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import './QuestionComponent.css';

const QuestionComponent = ({ question, selectedAnswers, onAnswerChange, submitted }) => {
  const handleAnswerToggle = (optionId) => {
    if (submitted) return;
    
    const newAnswers = question.type === 'multiple'
      ? selectedAnswers.includes(optionId)
        ? selectedAnswers.filter(id => id !== optionId)
        : [...selectedAnswers, optionId]
      : [optionId];

    onAnswerChange(newAnswers);
  };

  return (
    <div className="question-card">
      <h3 className="question-text">{question.text}</h3>
      
      <div className="options-grid">
        {question.options.map((option) => {
          const isSelected = selectedAnswers.includes(option.id);
          const isCorrect = option.isCorrect;
          
          return (
            <div
              key={option.id}
              className={`option-item ${isSelected ? 'selected' : ''} ${submitted ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
              onClick={() => handleAnswerToggle(option.id)}
            >
              <div className="checkbox">
                {question.type === 'multiple' ? (
                  isSelected ? <CheckSquare size={20} /> : <Square size={20} />
                ) : (
                  <div className="radio-indicator">{isSelected && <div className="radio-dot" />}</div>
                )}
              </div>
              <span className="option-text">{option.text}</span>
              
              {submitted && isCorrect && (
                <span className="correct-badge">✓ Correct</span>
              )}
            </div>
          );
        })}
      </div>

      {submitted && question.explanation && (
        <div className="explanation-box">
          <div className="explanation-header">Explication</div>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionComponent;