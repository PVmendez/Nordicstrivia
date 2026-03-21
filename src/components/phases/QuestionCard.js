import React, { useState, useRef, useEffect } from 'react';
import { FaCheck, FaMicrophone, FaRedo, FaStop } from 'react-icons/fa';
import '../../styles/phases/QuestionCard.css';

const QuestionCard = ({ letter, question, correctAnswer, onAnswerCorrect, onAnswerIncorrect, onPass }) => {
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Inicializar Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        console.log('Grabación iniciada');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        console.log('Resultados recibidos:', event.results);
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log('Transcript:', transcript, 'IsFinal:', event.results[i].isFinal);
          
          if (transcript && transcript.trim()) {
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }
        }
        
        if (finalTranscript.trim()) {
          console.log('Guardando respuesta final:', finalTranscript.toLowerCase());
          setAnswer(finalTranscript.toLowerCase());
        }
      };

      recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('Grabación terminada');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Normalizar respuestas: sin tildes, sin mayúsculas, sin puntuación
  const normalizeAnswer = (text) => {
    if (!text) return '';
    
    // Convertir a minúsculas
    let normalized = text.toLowerCase().trim();
    
    // Remover tildes y acentos
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remover puntuación (comas, puntos, comillas, etc)
    normalized = normalized.replace(/[.,;:!?"'"-]/g, '');
    
    // Remover espacios múltiples
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  };

  // Validar si dos palabras son similares (incluyendo singular/plural)
  const areAnagramSimilar = (word1, word2) => {
    // Si son exactamente iguales
    if (word1 === word2) return true;
    
    // Intentar variaciones de singular/plural
    // Eliminar 's' final si existe
    const word1Singular = word1.replace(/s$/, '');
    const word2Singular = word2.replace(/s$/, '');
    
    // Eliminar 'es' final si existe
    const word1SingularES = word1.replace(/es$/, '');
    const word2SingularES = word2.replace(/es$/, '');
    
    return (
      word1Singular === word2 ||
      word2Singular === word1 ||
      word1SingularES === word2 ||
      word2SingularES === word1 ||
      word1Singular === word2Singular ||
      word1SingularES === word2SingularES
    );
  };

  // Validar respuesta contra la respuesta correcta
  const validateAnswer = (userAnswer) => {
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);
    
    // Comparación exacta después de normalizar
    if (normalizedUser === normalizedCorrect) {
      return true;
    }
    
    // Si el usuario escribió varias palabras, validar palabra por palabra
    const userWords = normalizedUser.split(' ');
    const correctWords = normalizedCorrect.split(' ');
    
    // Si tienen el mismo número de palabras, validar cada una
    if (userWords.length === correctWords.length) {
      return userWords.every((word, index) => 
        areAnagramSimilar(word, correctWords[index])
      );
    }
    
    // Si es una sola palabra, compararlas directamente
    if (userWords.length === 1 && correctWords.length === 1) {
      return areAnagramSimilar(userWords[0], correctWords[0]);
    }
    
    return false;
  };

  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      setAnswer('');
      recognitionRef.current.start();
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;
    
    const userAnswerIsCorrect = validateAnswer(answer);
    setIsCorrect(userAnswerIsCorrect);
    setShowAnswer(true);
    
    if (userAnswerIsCorrect) {
      setFeedback('¡Correcto!');
    } else {
      setFeedback(`Respuesta incorrecta. Era: ${correctAnswer}`);
    }

    setTimeout(() => {
      if (userAnswerIsCorrect) {
        onAnswerCorrect();
      } else {
        // Pasar información de la respuesta incorrecta
        onAnswerIncorrect({
          letter,
          question,
          userAnswer: answer,
          correctAnswer
        });
      }
      setAnswer('');
      setShowAnswer(false);
    }, 2000);
  };

  const handlePass = () => {
    onPass();
    setAnswer('');
    setShowAnswer(false);
  };

  // Efecto para monitorear cambios en answer
  useEffect(() => {
    console.log('Answer actualizado:', answer);
  }, [answer]);

  return (
    <div className="question-card">
      <div className="card-header">
        <div className="letter-display">{letter}</div>
      </div>

      <div className="card-body">
        <div className="question">
          <h3>Pregunta:</h3>
          <p>{question}</p>
        </div>

        {!showAnswer && (
          <div className="answer-input-section">
            <div className="input-wrapper">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value.toLowerCase())}
                placeholder={isListening ? "Escuchando..." : "Escribe o usa micrófono..."}
                className={`answer-input ${isListening ? 'listening' : ''}`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && answer.trim()) {
                    handleSubmit();
                  }
                }}
              />
              
              {isSpeechSupported && (
                <div className="voice-controls">
                  {!isListening ? (
                    <button
                      onClick={handleStartListening}
                      className="btn-voice"
                      title="Presiona para grabar tu respuesta"
                    >
                      <FaMicrophone />
                    </button>
                  ) : (
                    <button
                      onClick={handleStopListening}
                      className="btn-voice listening"
                      title="Detener grabación"
                    >
                      <FaStop />
                    </button>
                  )}
                </div>
              )}
            </div>

            {answer && (
              <div className="recognized-text">
                <p>Reconocido: <strong>{answer}</strong></p>
                <button
                  onClick={() => setAnswer('')}
                  className="btn-clear"
                >
                  Limpiar
                </button>
              </div>
            )}

            <div className="button-group">
              <button
                onClick={handleSubmit}
                className="btn btn-submit"
                disabled={!answer.trim()}
              >
                <FaCheck /> Enviar Respuesta
              </button>
            </div>

            <button
              onClick={handlePass}
              className="btn btn-pass"
            >
              <FaRedo /> Pasar Palabra
            </button>
          </div>
        )}

        {showAnswer && (
          <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
            <p className="feedback-text">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
