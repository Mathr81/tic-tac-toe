import React, { useState, useEffect, useCallback } from 'react';
import ReactConfetti from 'react-confetti';
import Modal from 'react-modal';
import './App.css';

Modal.setAppElement('#root');

function GameMenu({ onStartGame }) {
  return (
    <div className="game-menu">
      <h2>Choose Game Mode</h2>
      <button onClick={() => onStartGame('friend')}>
        Play with Friend
      </button>
      <div className="bot-options">
        <h3>Play with Bot</h3>
        <button onClick={() => onStartGame('bot-easy')}>Easy</button>
        <button onClick={() => onStartGame('bot-medium')}>Medium</button>
        <button onClick={() => onStartGame('bot-hard')}>Hard</button>
      </div>
    </div>
  );
}

function Square({ value, onClick, className }) {
  return (
    <button 
      className={`square ${value ? value : ''} ${className || ''}`}
      onClick={onClick}
    >
      {value}
    </button>
  );
}

function ResultModal({ isOpen, message, type, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className={`result-modal ${type}`}
      overlayClassName="result-overlay"
    >
      <div className="modal-content">
        <h2>{message}</h2>
        {type === 'win' && (
          <div className="trophy">🏆</div>
        )}
        {type === 'draw' && (
          <div className="draw-emoji">🤝</div>
        )}
        <button onClick={onClose}>Play Again</button>
      </div>
    </Modal>
  );
}

function Board() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameStatus, setGameStatus] = useState('');
  const [winningLine, setWinningLine] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [modalInfo, setModalInfo] = useState({ isOpen: false, message: '', type: '' });
  const [gameMode, setGameMode] = useState(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Helper function for minimax
  const checkWinner = useCallback((board, player) => {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    return winningLines.some(line => {
      const [a, b, c] = line;
      return board[a] === player && board[b] === player && board[c] === player;
    });
  }, []); // pas de dépendances car la fonction est pure

  // Minimax algorithm
  const minimax = useCallback((board, player) => {
    const availableSpots = board.reduce((acc, spot, index) => {
      if (!spot) acc.push(index);
      return acc;
    }, []);

    if (checkWinner(board, 'X')) {
      return { score: -10 };
    } else if (checkWinner(board, 'O')) {
      return { score: 10 };
    } else if (availableSpots.length === 0) {
      return { score: 0 };
    }

    const moves = [];

    for (let i = 0; i < availableSpots.length; i++) {
      const move = {};
      move.index = availableSpots[i];
      board[availableSpots[i]] = player;

      if (player === 'O') {
        const result = minimax(board, 'X');
        move.score = result.score;
      } else {
        const result = minimax(board, 'O');
        move.score = result.score;
      }

      board[availableSpots[i]] = null;
      moves.push(move);
    }

    let bestMove;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }

    return moves[bestMove];
  }, [checkWinner]); // dépend de checkWinner

  // Bot move calculation
  const calculateBotMove = useCallback((currentSquares, difficulty) => {
    // Easy: Random move
    if (difficulty === 'easy') {
      const emptySquares = currentSquares.reduce((acc, square, index) => {
        if (!square) acc.push(index);
        return acc;
      }, []);
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }

    // Medium: Mix of random and smart moves
    if (difficulty === 'medium') {
      if (Math.random() < 0.5) {
        const bestMove = minimax(currentSquares, 'O').index;
        return bestMove;
      } else {
        const emptySquares = currentSquares.reduce((acc, square, index) => {
          if (!square) acc.push(index);
          return acc;
        }, []);
        return emptySquares[Math.floor(Math.random() * emptySquares.length)];
      }
    }

    // Hard: Always best move
    return minimax(currentSquares, 'O').index;
  }, [minimax]); // dépend de minimax

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const winner = calculateWinner(squares);
    if (winner) {
      const winMessage = gameMode?.startsWith('bot') 
        ? `${winner.winner === 'X' ? 'You Win!' : 'Bot Wins!'} 🎉`
        : `Player ${winner.winner} Wins! 🎉`;
      setGameStatus(winMessage);
      setWinningLine(winner.line);
      setShowConfetti(true);
      setModalInfo({ 
        isOpen: true, 
        message: winMessage,
        type: 'win'
      });
    } else if (squares.every(square => square)) {
      setGameStatus("It's a Draw!");
      setIsDraw(true);
      setModalInfo({ 
        isOpen: true, 
        message: "It's a Draw! 🤝",
        type: 'draw'
      });
    } else {
      setGameStatus(`Next player: ${xIsNext ? 'X' : 'O'}`);
    }
  }, [squares, xIsNext, gameMode]);

  useEffect(() => {
    if (gameMode?.startsWith('bot') && !xIsNext && !calculateWinner(squares)) {
      const difficulty = gameMode.split('-')[1];
      const timer = setTimeout(() => {
        const botMove = calculateBotMove([...squares], difficulty);
        if (botMove !== undefined && !squares[botMove]) {
          const newSquares = squares.slice();
          newSquares[botMove] = 'O';
          setSquares(newSquares);
          setXIsNext(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [squares, xIsNext, gameMode, calculateBotMove]);

  const handleClick = (i) => {
    if (calculateWinner(squares) || squares[i] || (!xIsNext && gameMode?.startsWith('bot'))) {
      return;
    }
    const newSquares = squares.slice();
    newSquares[i] = xIsNext ? 'X' : 'O';
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  };

  const renderSquare = (i) => {
    const isWinningSquare = winningLine?.includes(i);
    return (
      <Square
        value={squares[i]}
        onClick={() => handleClick(i)}
        className={isWinningSquare ? 'winning' : ''}
      />
    );
  };

  const resetGame = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameStatus('');
    setWinningLine(null);
    setIsDraw(false);
    setShowConfetti(false);
    setModalInfo({ isOpen: false, message: '', type: '' });
    setIsGameStarted(false);
    setGameMode(null);
  };

  const handleStartGame = (mode) => {
    setGameMode(mode);
    setIsGameStarted(true);
  };

  if (!isGameStarted) {
    return <GameMenu onStartGame={handleStartGame} />;
  }

  return (
    <div className="game-container">
      {showConfetti && (
        <ReactConfetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          numberOfPieces={200}
          recycle={false}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
        />
      )}
      <div className="game-info">
        <div className="mode-indicator">
          {gameMode === 'friend' ? 'Playing with Friend' : `Playing against Bot (${gameMode.split('-')[1]})`}
        </div>
        <div className={`status ${isDraw ? 'game-draw' : ''}`}>{gameStatus}</div>
      </div>
      <div className="board">
        <div className="board-row">
          {renderSquare(0)}
          {renderSquare(1)}
          {renderSquare(2)}
        </div>
        <div className="board-row">
          {renderSquare(3)}
          {renderSquare(4)}
          {renderSquare(5)}
        </div>
        <div className="board-row">
          {renderSquare(6)}
          {renderSquare(7)}
          {renderSquare(8)}
        </div>
      </div>
      <div className="game-controls">
        <button className="reset-button" onClick={resetGame}>
          New Game
        </button>
      </div>
      <ResultModal
        isOpen={modalInfo.isOpen}
        message={modalInfo.message}
        type={modalInfo.type}
        onClose={resetGame}
      />
    </div>
  );
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return {
        winner: squares[a],
        line: lines[i]
      };
    }
  }
  return null;
}

function App() {
  return (
    <div className="App">
      <h1>Tic Tac Toe</h1>
      <Board />
    </div>
  );
}

export default App;
