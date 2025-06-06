import React, { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const CAR_WIDTH = 45;
const CAR_HEIGHT = 70;
const OBSTACLE_WIDTH = 30;  // 40 → 30으로 축소
const OBSTACLE_HEIGHT = 45; // 60 → 45로 축소
const STAR_SIZE = 30;
const STAR_SPAWN_RATE = 0.005;
const LINE_SPACING = 100;
const LINE_WIDTH = 6;
const LINE_HEIGHT = 40;

// 총알 관련 상수
const BULLET_WIDTH = 6;
const BULLET_HEIGHT = 15;
const BULLET_SPEED = 15;

const DIFFICULTY_SETTINGS = {
  easy: { speed: 2, spawn: 0.004 },
  normal: { speed: 4, spawn: 0.008 },
  hard: { speed: 6, spawn: 0.013 },
};

const LANE_COUNT = 4;
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
const LANE_POSITIONS = Array.from({ length: LANE_COUNT }, (_, i) =>
  i * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2
);

function getRandomX() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  return LANE_POSITIONS[lane];
}

function spawnObstacles() {
  const emptyLane = Math.floor(Math.random() * LANE_COUNT);
  return [...Array(LANE_COUNT).keys()]
    .filter(lane => lane !== emptyLane)
    .map(lane => ({
      x: LANE_POSITIONS[lane],
      y: -OBSTACLE_HEIGHT,
      id: Math.random(), // 고유 ID 추가
    }));
}

function spawnStar(obstacles) {
  const occupiedLanes = new Set();
  obstacles.forEach(obs => {
    const obsLane = LANE_POSITIONS.findIndex(pos => pos === obs.x);
    if (obsLane !== -1 && obs.y < 200) {
      occupiedLanes.add(obsLane);
    }
  });
  
  const availableLanes = [...Array(LANE_COUNT).keys()].filter(lane => !occupiedLanes.has(lane));
  if (availableLanes.length === 0) return null;
  
  const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
  return { x: LANE_POSITIONS[lane], y: -STAR_SIZE, id: Math.random() };
}

function fireBullet(carX) {
  return {
    x: carX + CAR_WIDTH / 2 - BULLET_WIDTH / 2,
    y: GAME_HEIGHT - CAR_HEIGHT - 10,
    id: Date.now() + Math.random()
  };
}

// 자동차 컴포넌트
function Car({ x, invulnerable }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: GAME_HEIGHT - CAR_HEIGHT - 10,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        transition: 'left 0.1s ease-out',
        pointerEvents: 'none',
        opacity: invulnerable ? 0.5 : 1,
        animation: invulnerable ? 'blink 0.3s infinite' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: CAR_HEIGHT - 18,
          background: 'linear-gradient(to bottom, #ff6b6b, #ee4d4d)',
          borderRadius: '6px 6px 3px 3px',
          boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 4,
          right: 4,
          top: 4,
          height: 18,
          background: '#c0e0ff',
          borderRadius: 3,
          boxShadow: 'inset 0 0 2px rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: 4,
          width: 12,
          height: 12,
          background: '#222',
          borderRadius: '50%',
          boxShadow: '0 0 1px rgba(0,0,0,0.6) inset',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          width: 12,
          height: 12,
          background: '#222',
          borderRadius: '50%',
          boxShadow: '0 0 1px rgba(0,0,0,0.6) inset',
        }}
      />
    </div>
  );
}

function App() {
  const [laneIndex, setLaneIndex] = useState(Math.floor(LANE_COUNT / 2) - 1);
  const carX = LANE_POSITIONS[laneIndex];
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('normal');
  const initialLines = Array.from({ length: Math.ceil(GAME_HEIGHT / LINE_SPACING) + 1 }, (_, i) => i * LINE_SPACING);
  const TOTAL_LINE_LENGTH = LINE_SPACING * initialLines.length;
  const [lines, setLines] = useState(initialLines);
  const gameRef = useRef();
  const scoreRef = useRef(0);
  const [stars, setStars] = useState([]);
  
  const [lives, setLives] = useState(1);
  const [canAttack, setCanAttack] = useState(false);
  const [bullets, setBullets] = useState([]);
  const [invulnerable, setInvulnerable] = useState(false);
  const invulnerableRef = useRef(false);

  // 간단한 메인 게임 루프
  useEffect(() => {
    if (gameOver) return;
    
    const { speed, spawn } = DIFFICULTY_SETTINGS[difficulty];
    const interval = setInterval(() => {
      
      // 점수 증가
      setScore(prev => {
        const newScore = prev + 3;
        scoreRef.current = newScore;
        return newScore;
      });
      
      // 총알 이동
      setBullets(prev => prev
        .map(bullet => ({ ...bullet, y: bullet.y - BULLET_SPEED }))
        .filter(bullet => bullet.y > -BULLET_HEIGHT)
      );
      
      // 장애물 이동
      setObstacles(prev => {
        let moved = prev
          .map(o => ({ ...o, y: o.y + speed + Math.floor(scoreRef.current / 500) }))
          .filter(o => o.y < GAME_HEIGHT);
        
        if (Math.random() < spawn + scoreRef.current / 8000) {
          moved = [...moved, ...spawnObstacles()];
        }
        
        return moved;
      });
      
      // 별 이동
      setStars(prev => prev
        .map(s => ({ ...s, y: s.y + speed + Math.floor(scoreRef.current / 500) }))
        .filter(s => s.y < GAME_HEIGHT)
      );
      
      // 별 생성
      if (scoreRef.current > 100 && Math.random() < STAR_SPAWN_RATE) {
        setObstacles(currentObs => {
          const newStar = spawnStar(currentObs);
          if (newStar) {
            setStars(prev => [...prev, newStar]);
          }
          return currentObs;
        });
      }
      
      // 도로선 이동
      setLines(prev => prev.map(y =>
        y + speed + 3 >= GAME_HEIGHT
          ? y + speed + 3 - TOTAL_LINE_LENGTH
          : y + speed + 3
      ));
      
    }, 20);
    
    return () => clearInterval(interval);
  }, [gameOver, difficulty]);

  // 총알-장애물 충돌 (단순화)
  useEffect(() => {
    if (gameOver) return;
    
    setBullets(currentBullets => {
      const remainingBullets = [];
      
      currentBullets.forEach(bullet => {
        let hit = false;
        
        setObstacles(currentObstacles => {
          return currentObstacles.filter(obstacle => {
            const collision = bullet.x < obstacle.x + OBSTACLE_WIDTH &&
                            bullet.x + BULLET_WIDTH > obstacle.x &&
                            bullet.y < obstacle.y + OBSTACLE_HEIGHT &&
                            bullet.y + BULLET_HEIGHT > obstacle.y;
            
            if (collision) {
              hit = true;
              return false; // 장애물 제거
            }
            return true; // 장애물 유지
          });
        });
        
        if (!hit) {
          remainingBullets.push(bullet);
        }
      });
      
      return remainingBullets;
    });
  }, [bullets, obstacles, gameOver]);

  // 자동차 충돌 체크
  useEffect(() => {
    if (gameOver || invulnerableRef.current) return;
    
    const hitObstacle = obstacles.find(o =>
      o.y + OBSTACLE_HEIGHT > GAME_HEIGHT - CAR_HEIGHT - 10 &&
      o.y < GAME_HEIGHT - 10 &&
      o.x < carX + CAR_WIDTH &&
      o.x + OBSTACLE_WIDTH > carX
    );
    
    if (hitObstacle) {
      setObstacles(prev => prev.filter(obs => obs.id !== hitObstacle.id));
      
      if (lives > 1) {
        setLives(prev => prev - 1);
        setCanAttack(false);
        
        setInvulnerable(true);
        invulnerableRef.current = true;
        setTimeout(() => {
          setInvulnerable(false);
          invulnerableRef.current = false;
        }, 2000);
      } else {
        setGameOver(true);
      }
    }
    
    // 별 수집
    const hitStar = stars.find(s => {
      const starX = s.x + (OBSTACLE_WIDTH - STAR_SIZE) / 2;
      return s.y + STAR_SIZE > GAME_HEIGHT - CAR_HEIGHT - 10 &&
             s.y < GAME_HEIGHT - 10 &&
             starX < carX + CAR_WIDTH &&
             starX + STAR_SIZE > carX;
    });
    
    if (hitStar) {
      setStars(prev => prev.filter(star => star.id !== hitStar.id));
      setScore(prev => prev + 20);
      setLives(prev => prev + 1);
      setCanAttack(true);
    }
  }, [obstacles, stars, carX, lives, gameOver]);

  // 키보드 조작
  useEffect(() => {
    let lastKeyTime = 0;
    let lastAttackTime = 0;
    const KEY_DELAY = 150;
    const ATTACK_DELAY = 200;
    
    const handleKeyDown = e => {
      if (gameOver) return;
      
      const now = Date.now();
      
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && now - lastKeyTime >= KEY_DELAY) {
        if (e.key === 'ArrowLeft') {
          setLaneIndex(i => Math.max(0, i - 1));
        }
        if (e.key === 'ArrowRight') {
          setLaneIndex(i => Math.min(LANE_COUNT - 1, i + 1));
        }
        lastKeyTime = now;
      }
      
      if (e.key === ' ' && canAttack && now - lastAttackTime >= ATTACK_DELAY) {
        setBullets(prev => [...prev, fireBullet(carX)]);
        lastAttackTime = now;
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, canAttack, carX]);

  // 랭킹 관련 함수들
  const fetchRanking = async () => {
    try {
      const res = await fetch('http://localhost:5000/ranking');
      const data = await res.json();
      setRanking(data);
    } catch (error) {
      console.error('랭킹 로드 실패:', error);
    }
  };

  const submitScore = async () => {
    try {
      await fetch('http://localhost:5000/submit_score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: scoreRef.current }),
      });
      setName('');
      fetchRanking();
    } catch (error) {
      console.error('점수 제출 실패:', error);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  const restart = () => {
    setGameOver(false);
    setLaneIndex(Math.floor(LANE_COUNT / 2) - 1);
    setObstacles([]);
    setStars([]);
    setBullets([]);
    setScore(0);
    scoreRef.current = 0;
    setLines([...initialLines]);
    setName('');
    setLives(1);
    setCanAttack(false);
    setInvulnerable(false);
    invulnerableRef.current = false;
    
    setTimeout(() => {
      fetchRanking();
    }, 100);
  };

  return (
    <>
      <style>{`
        @keyframes blink {
          0% { opacity: 0.5; }
          50% { opacity: 0.2; }
          100% { opacity: 0.5; }
        }
      `}</style>
      <div style={{ textAlign: 'center', position: 'relative', paddingBottom: '80px' }}>
        <h1>원텍시스템 레이싱 게임</h1>
        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
          조작법: 화살표 키 ← → 또는 게임 화면 클릭으로 이동, 스페이스바로 공격
        </div>
        <div style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
          <span style={{ marginRight: '20px', color: '#e74c3c' }}>
            ❤️ 생명: {lives}
          </span>
          <span style={{ color: canAttack ? '#27ae60' : '#95a5a6', marginRight: '20px' }}>
            🔫 공격: {canAttack ? 'ON' : 'OFF'}
          </span>
          {invulnerable && (
            <span style={{ color: '#f39c12', fontSize: '14px' }}>
              🛡️ 무적
            </span>
          )}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            난이도:
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              style={{ marginLeft: '8px' }}
            >
              <option value="easy">쉬움</option>
              <option value="normal">보통</option>
              <option value="hard">어려움</option>
            </select>
          </label>
        </div>
        <div
          ref={gameRef}
          onClick={(e) => {
            if (gameOver) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const centerX = GAME_WIDTH / 2;
            
            if (clickX < centerX) {
              setLaneIndex(i => Math.max(0, i - 1));
            } else {
              setLaneIndex(i => Math.min(LANE_COUNT - 1, i + 1));
            }
          }}
          style={{
            position: 'relative',
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            margin: '0 auto',
            background: '#222',
            overflow: 'hidden',
            cursor: gameOver ? 'default' : 'pointer',
          }}
        >
          {/* 도로 중앙선 */}
          {lines.map((y, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: GAME_WIDTH / 2 - LINE_WIDTH / 2,
                top: y,
                width: LINE_WIDTH,
                height: LINE_HEIGHT,
                background: '#fff',
                opacity: 0.7,
              }}
            />
          ))}
          
          {/* 별 아이템 */}
          {stars.map((s, i) => (
            <div
              key={s.id || i}
              style={{
                position: 'absolute',
                left: s.x + (OBSTACLE_WIDTH - STAR_SIZE) / 2,
                top: s.y,
                width: STAR_SIZE,
                height: STAR_SIZE,
                background: 'radial-gradient(circle, #ffeb3b, #ffc107)',
                borderRadius: '50%',
                boxShadow: '0 0 8px rgba(255,255,0,0.8)',
                border: '2px solid #fff',
              }}
            />
          ))}
          
          {/* 자동차 */}
          <Car x={carX} invulnerable={invulnerable} />
          
          {/* 총알 */}
          {bullets.map((bullet, i) => (
            <div
              key={bullet.id || i}
              style={{
                position: 'absolute',
                left: bullet.x,
                top: bullet.y,
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT,
                background: 'linear-gradient(to top, #f39c12, #e74c3c)',
                borderRadius: '2px',
                boxShadow: '0 0 4px rgba(231,76,60,0.8)',
              }}
            />
          ))}
          
          {/* 장애물 */}
          {obstacles.map((o, i) => (
            <div
              key={o.id || i}
              style={{
                position: 'absolute',
                left: o.x,
                top: o.y,
                width: OBSTACLE_WIDTH,
                height: OBSTACLE_HEIGHT,
                background: 'linear-gradient(to bottom, #a0a0a0, #888888)',
                borderRadius: 8,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          ))}
        </div>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#e74c3c',
          margin: '15px 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          border: '3px solid #3498db', 
          padding: '10px 20px',
          borderRadius: '15px',
          backgroundColor: '#f8f9fa',
          display: 'inline-block'
        }}>
          🏆 점수: {score}
        </div>
        {gameOver && (
          <div>
            <h2>게임 오버!</h2>
            <input
              placeholder="이름 입력"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button onClick={submitScore} disabled={!name}>
              점수 제출
            </button>
            <button onClick={restart}>다시 시작</button>
          </div>
        )}

        {/* 랭킹 표시 */}
        <div style={{
          position: 'fixed',
          left: '10px',
          bottom: '10px',
          width: '220px',
          background: '#444',
          color: '#fff',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>순위</h3>
          <ol style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            {ranking.map((r, i) => (
              <li key={i} style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                {r.name}: {r.score}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

export default App;
