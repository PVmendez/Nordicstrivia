import React from 'react';
import '../../styles/phases/Rosco.css';

const Rosco = ({ letters, currentIndex }) => {
  const calculateRotation = (index, totalLetters = 26) => {
    return (index * 360) / totalLetters;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'correct':
        return 'correct';
      case 'incorrect':
        return 'incorrect';
      case 'pending':
        return 'pending';
      default:
        return 'pending';
    }
  };

  return (
    <div className="rosco-container">
      <div className="rosco">
        {letters.map((letter, index) => {
          const rotation = calculateRotation(index, letters.length);
          const isCurrentLetter = index === currentIndex;
          
          return (
            <div
              key={index}
              className={`rosco-letter ${getStatusClass(letter.status)} ${isCurrentLetter ? 'current' : ''}`}
              style={{
                transform: `rotate(${rotation}deg) translateY(-220px) rotate(-${rotation}deg)`
              }}
            >
              <span className="letter">{letter.letter}</span>
            </div>
          );
        })}
        
        <div className="rosco-center">
          <div className="center-indicator">?</div>
        </div>
      </div>
    </div>
  );
};

export default Rosco;
