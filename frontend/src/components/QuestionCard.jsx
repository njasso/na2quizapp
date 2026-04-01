// src/components/QuestionCard.jsx

import React from 'react';

const QuestionCard = ({ question, index, userAnswer = [], onAnswerSelect, showResults }) => {
  const isSelected = (optionIndex) => userAnswer.includes(optionIndex);
  const isCorrect = (option) => option.isCorrect;

  const handleClick = (optionIndex) => {
    if (!showResults) {
      onAnswerSelect(index, optionIndex);
    }
  };

  return (
    <div className="mb-6 p-5 bg-gray-800 rounded-xl border border-gray-700 print:bg-white print:border-gray-300">
      <div className="flex items-start mb-4">
        <span className="bg-blue-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-1 print:bg-blue-500">
          {index + 1}
        </span>
        <h3 className="font-medium text-lg print:text-base text-gray-200 print:text-gray-800">
          {question.text}
        </h3>
      </div>
      
      <ul className="space-y-3 pl-11">
        {question.options.map((option, i) => {
          const selected = isSelected(i);
          const correct = isCorrect(option);
          const showFeedback = showResults;
          
          let optionClasses = "flex items-center p-3 rounded-lg border cursor-pointer transition-all text-gray-300 hover:text-gray-200 print:text-gray-800 ";
          let indicatorClasses = "w-6 h-6 border mr-3 flex-shrink-0 flex items-center justify-center ";

          if (question.questionType === 'single') {
            indicatorClasses += "rounded-full ";
          } else {
            indicatorClasses += "rounded-md ";
          }

          if (showFeedback) {
            if (correct) {
              optionClasses += "bg-green-900/50 border-green-500 print:bg-green-100 print:border-green-500 ";
              indicatorClasses += "bg-green-500 border-green-500 ";
            } else if (selected && !correct) {
              optionClasses += "bg-red-900/50 border-red-500 print:bg-red-100 print:border-red-500 ";
              indicatorClasses += "bg-red-500 border-red-500 ";
            } else {
              optionClasses += "bg-gray-700/50 border-gray-600 ";
              indicatorClasses += "border-gray-500 ";
            }
          } else {
            if (selected) {
              optionClasses += "bg-blue-900/50 border-blue-500 ";
              indicatorClasses += "bg-blue-500 border-blue-500 ";
            } else {
              optionClasses += "bg-gray-700/50 border-gray-600 hover:border-gray-500 ";
              indicatorClasses += "border-gray-500 ";
            }
          }

          return (
            <li key={i}>
              <div 
                onClick={() => handleClick(i)}
                className={optionClasses}
              >
                <div className={indicatorClasses}>
                  {selected && question.questionType === 'multiple' && (
                    <div className="w-3 h-3 rounded-sm bg-white" />
                  )}
                  {selected && question.questionType === 'single' && (
                    <div className="w-3 h-3 rounded-full bg-white" />
                  )}
                </div>
                <span className="font-medium flex-1">{option.text}</span>
                
                {showFeedback && (
                  <span className="ml-2">
                    {correct ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 inline print:text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : selected && !correct ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 inline print:text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : null}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default QuestionCard;