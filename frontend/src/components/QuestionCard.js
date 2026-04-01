import React from 'react';
import { Check, X } from 'lucide-react';

const QuestionCard = ({
  question,
  index,
  userAnswer = [],
  onAnswerSelect,
  showResults = false
}) => {
  if (!question || !question.options) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-red-500 mb-4">
        <p className="text-red-400">Erreur: Question invalide ou manquante</p>
      </div>
    );
  }

  const isCorrect = () => {
    if (!showResults) return false;

    const correctAnswers = question.options
      .map((option, i) => option.isCorrect ? i : -1)
      .filter(i => i !== -1);

    if (question.questionType === 'single') {
      return userAnswer.length === 1 && correctAnswers.includes(userAnswer[0]);
    } else {
      return userAnswer.length === correctAnswers.length &&
        userAnswer.every(ans => correctAnswers.includes(ans));
    }
  };

  const handleSelect = (optIndex) => {
    if (showResults) return;

    let newAnswer;
    if (question.questionType === 'single') {
      newAnswer = [optIndex];
    } else {
      if (userAnswer.includes(optIndex)) {
        newAnswer = userAnswer.filter(i => i !== optIndex);
      } else {
        newAnswer = [...userAnswer, optIndex];
      }
    }

    onAnswerSelect(index, newAnswer);
  };

  return (
    <div className={`bg-gray-800/50 p-5 rounded-xl border ${
      showResults
        ? isCorrect()
          ? 'border-green-500/50 bg-green-900/10'
          : 'border-red-500/50 bg-red-900/10'
        : 'border-gray-700'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg flex items-center">
            Question {index + 1}
            {showResults && (
              <span className="ml-2">
                {isCorrect() ? (
                  <Check className="w-5 h-5 text-green-500 inline" />
                ) : (
                  <X className="w-5 h-5 text-red-500 inline" />
                )}
              </span>
            )}
          </h3>
          <p className="text-gray-300 mt-2">{question.questionText}</p>
        </div>
        <span className="bg-blue-900/30 text-blue-300 text-sm px-2 py-1 rounded">
          {question.points} point{question.points > 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-gray-400 mb-3">
          {question.questionType === 'single'
            ? 'Choisissez une réponse :'
            : 'Choisissez une ou plusieurs réponses :'}
        </h4>

        <div className="space-y-2">
          {question.options.map((option, optIndex) => {
            const isSelected = userAnswer.includes(optIndex);
            const isCorrectOption = option.isCorrect;
            let optionClass = "p-3 rounded-lg border flex items-start cursor-pointer transition-all";

            if (showResults) {
              if (isCorrectOption) {
                optionClass += " border-green-500 bg-green-900/20";
              } else if (isSelected && !isCorrectOption) {
                optionClass += " border-red-500 bg-red-900/20";
              } else {
                optionClass += " border-gray-600 bg-gray-700/30";
              }
            } else {
              optionClass += isSelected
                ? " border-blue-500 bg-blue-900/20"
                : " border-gray-600 bg-gray-700/30 hover:bg-gray-700/50";
            }

            return (
              <div
                key={optIndex}
                className={optionClass}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(optIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelect(optIndex);
                  }
                }}
              >
                <div className={`flex items-center justify-center w-5 h-5 rounded-full border mr-3 flex-shrink-0 ${
                  showResults
                    ? isCorrectOption
                      ? "border-green-500 bg-green-500/20"
                      : "border-gray-500"
                    : isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-500"
                }`}>
                  {isSelected && !showResults && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                  {showResults && isCorrectOption && (
                    <Check className="w-3 h-3 text-green-500" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-gray-200">{option.text}</p>
                  {showResults && isSelected && !isCorrectOption && (
                    <p className="text-red-400 text-sm mt-1">Votre réponse</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
