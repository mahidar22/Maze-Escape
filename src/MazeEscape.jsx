import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Trophy, Clock, Users } from 'lucide-react';

const MazeEscape = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing, won, lost
  const [maze, setMaze] = useState([]);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [exit, setExit] = useState({ x: 0, y: 0 });
  const [bots, setBots] = useState([]);
  const [difficulty, setDifficulty] = useState(1);
  const [timer, setTimer] = useState(0);
  const [blockedTime, setBlockedTime] = useState(0);
  const [score, setScore] = useState(0);
  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);

  const CELL_SIZE = 20;
  const MAZE_SIZES = [15, 20, 25, 30];
  const BOT_COUNTS = [2, 4, 6, 8];
  const MAX_BLOCKED_TIME = 5000; // 5 seconds

  // Generate maze using DFS algorithm
  const generateMaze = (size) => {
    const grid = Array(size).fill().map(() => Array(size).fill(1)); // 1 = wall
    const stack = [];
    const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]];

    const startX = 1;
    const startY = 1;
    grid[startY][startX] = 0; // 0 = path
    stack.push([startX, startY]);

    while (stack.length > 0) {
      const [x, y] = stack[stack.length - 1];
      const neighbors = [];

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === 1) {
          neighbors.push([nx, ny, x + dx / 2, y + dy / 2]);
        }
      }

      if (neighbors.length > 0) {
        const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[ny][nx] = 0;
        grid[wy][wx] = 0;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }

    return grid;
  };

  // Find valid starting positions
  const findValidPositions = (grid, count) => {
    const positions = [];
    for (let y = 1; y < grid.length - 1; y++) {
      for (let x = 1; x < grid[0].length - 1; x++) {
        if (grid[y][x] === 0) {
          positions.push({ x, y });
        }
      }
    }
    
    const selected = [];
    for (let i = 0; i < count && positions.length > 0; i++) {
      const idx = Math.floor(Math.random() * positions.length);
      selected.push(positions[idx]);
      positions.splice(idx, 1);
    }
    return selected;
  };

  // BFS pathfinding for bots
  const findPath = (grid, start, end) => {
    const queue = [[start.x, start.y, []]];
    const visited = new Set([`${start.x},${start.y}`]);
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length > 0) {
      const [x, y, path] = queue.shift();

      if (x === end.x && y === end.y) {
        return path;
      }

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;

        if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length &&
            grid[ny][nx] === 0 && !visited.has(key)) {
          visited.add(key);
          queue.push([nx, ny, [...path, { x: nx, y: ny }]]);
        }
      }
    }

    return [];
  };

  // Check if player can move
  const canMove = (grid, x, y, bots) => {
    if (x < 0 || x >= grid[0].length || y < 0 || y >= grid.length) return false;
    if (grid[y][x] === 1) return false;
    return true;
  };

  // Initialize game
  const initGame = useCallback(() => {
    const size = MAZE_SIZES[Math.min(difficulty - 1, MAZE_SIZES.length - 1)];
    const newMaze = generateMaze(size);
    
    // Find exit on boundary
    const boundaries = [];
    for (let i = 1; i < size - 1; i++) {
      if (newMaze[1][i] === 0) boundaries.push({ x: i, y: 0 });
      if (newMaze[size - 2][i] === 0) boundaries.push({ x: i, y: size - 1 });
      if (newMaze[i][1] === 0) boundaries.push({ x: 0, y: i });
      if (newMaze[i][size - 2] === 0) boundaries.push({ x: size - 1, y: i });
    }
    
    const exitPos = boundaries[Math.floor(Math.random() * boundaries.length)];
    newMaze[exitPos.y][exitPos.x] = 0;

    const positions = findValidPositions(newMaze, BOT_COUNTS[Math.min(difficulty - 1, BOT_COUNTS.length - 1)] + 1);
    const playerPos = positions[0];
    
    const newBots = positions.slice(1).map((pos, i) => ({
      id: i,
      x: pos.x,
      y: pos.y,
      path: [],
      pauseUntil: 0,
      speed: 200 + Math.random() * 200
    }));

    setMaze(newMaze);
    setPlayer(playerPos);
    setExit(exitPos);
    setBots(newBots);
    setTimer(0);
    setBlockedTime(0);
    setGameState('playing');
  }, [difficulty]);

  // Handle player movement
  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== 'playing') return;

    setPlayer(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;

      if (canMove(maze, newX, newY, bots)) {
        const moved = { x: newX, y: newY };
        
        // Check win condition
        if (newX === exit.x && newY === exit.y) {
          const finalScore = Math.max(10000 - timer * 10, 1000) + difficulty * 1000;
          setScore(finalScore);
          setGameState('won');
        }
        
        return moved;
      }
      return prev;
    });
  }, [gameState, maze, bots, exit, timer, difficulty]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer]);

  // Game loop for bots
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateBots = () => {
      const now = Date.now();
      
      setBots(prevBots => prevBots.map(bot => {
        if (bot.pauseUntil > now) return bot;

        // Recalculate path if needed
        if (bot.path.length === 0 || Math.random() < 0.1) {
          const newPath = findPath(maze, bot, exit);
          return { ...bot, path: newPath.slice(1) };
        }

        // Move to next position in path
        if (bot.path.length > 0) {
          const next = bot.path[0];
          const occupied = prevBots.some(b => b.id !== bot.id && b.x === next.x && b.y === next.y);
          
          if (!occupied) {
            // Random pause
            if (Math.random() < 0.05) {
              return { ...bot, pauseUntil: now + 500 + Math.random() * 1000 };
            }
            
            return {
              ...bot,
              x: next.x,
              y: next.y,
              path: bot.path.slice(1)
            };
          }
        }

        return bot;
      }));
    };

    gameLoopRef.current = setInterval(updateBots, 300);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, maze, exit]);

  // Timer and blocking check
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 100);

      // Check if player is blocked
      const canMoveAny = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => 
        canMove(maze, player.x + dx, player.y + dy, bots)
      );

      if (!canMoveAny) {
        setBlockedTime(prev => {
          const newTime = prev + 100;
          if (newTime >= MAX_BLOCKED_TIME) {
            setGameState('lost');
          }
          return newTime;
        });
      } else {
        setBlockedTime(0);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, maze, player, bots]);

  const renderMaze = () => {
    if (!maze.length) return null;

    return (
      <div className="inline-block border-4 border-gray-800 bg-gray-900">
        {maze.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isExit = exit.x === x && exit.y === y;
              const isBot = bots.some(bot => bot.x === x && bot.y === y);

              let bgColor = cell === 1 ? 'bg-gray-700' : 'bg-gray-900';
              if (isPlayer) bgColor = 'bg-blue-500';
              if (isExit) bgColor = 'bg-green-500';
              if (isBot) bgColor = 'bg-red-500';

              return (
                <div
                  key={x}
                  className={`${bgColor} transition-colors duration-150`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4">
      {gameState === 'menu' && (
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">
            Maze Escape
          </h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level: {difficulty}
            </label>
            <input
              type="range"
              min="1"
              max="4"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Easy</span>
              <span>Normal</span>
              <span>Hard</span>
              <span>Expert</span>
            </div>
          </div>

          <div className="space-y-3 mb-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>You (Blue)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Exit (Green)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Bots (Red)</span>
            </div>
          </div>

          <button
            onClick={initGame}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Play size={20} />
            Start Game
          </button>

          <div className="mt-6 text-xs text-gray-500 text-center">
            Use Arrow Keys or WASD to move
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-lg shadow-lg p-4 flex gap-6">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              <span className="font-mono">{(timer / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={20} className="text-red-600" />
              <span>{bots.length} Bots</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-600" />
              <span>Level {difficulty}</span>
            </div>
          </div>

          {blockedTime > 0 && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 text-red-700 font-semibold">
              Blocked! {((MAX_BLOCKED_TIME - blockedTime) / 1000).toFixed(1)}s remaining
            </div>
          )}

          {renderMaze()}

          <div className="text-white text-sm">
            Use Arrow Keys or WASD to move
          </div>
        </div>
      )}

      {(gameState === 'won' || gameState === 'lost') && (
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className={`text-4xl font-bold mb-4 ${gameState === 'won' ? 'text-green-600' : 'text-red-600'}`}>
            {gameState === 'won' ? '🎉 You Escaped!' : '😞 Trapped!'}
          </h2>
          
          {gameState === 'won' && (
            <div className="mb-6">
              <div className="text-2xl font-bold text-gray-800 mb-2">
                Score: {score.toLocaleString()}
              </div>
              <div className="text-gray-600">
                Time: {(timer / 1000).toFixed(1)}s
              </div>
            </div>
          )}

          {gameState === 'lost' && (
            <p className="text-gray-600 mb-6">
              You were blocked by bots for too long!
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setGameState('menu')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Menu
            </button>
            <button
              onClick={initGame}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={20} />
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MazeEscape;