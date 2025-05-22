import React, { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 80;

function getRandomX() {
  return Math.floor(Math.random() * (GAME_WIDTH - OBSTACLE_WIDTH));
}

function App() {
  const [carX, setCarX] = useState(GAME_WIDTH / 2 - CAR_WIDTH / 2);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [name, setName] = useState('');
  const gameRef = useRef();

  // 장애물 생성 및 이동
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setObstacles(obs =>
        obs
          .map(o => ({ ...o, y: o.y + 2 + Math.floor(score / 500) })) // 난이도 더 완화: 초기 속도 느리게, 증가율 낮게
          .filter(o => o.y < GAME_HEIGHT)
      );
      if (Math.random() < 0.008 + score / 8000) { // 난이도 더 완화: 초기 생성 빈도 매우 낮게, 증가율 낮게
        setObstacles(obs => [...obs, { x: getRandomX(), y: -OBSTACLE_HEIGHT }]);
      }
      setScore(s => s + 1);
    }, 20);
    return () => clearInterval(interval);
  }, [gameOver, score]);

  // 충돌 체크
  useEffect(() => {
    for (let o of obstacles) {
      if (
        o.y + OBSTACLE_HEIGHT > GAME_HEIGHT - CAR_HEIGHT - 10 &&
        o.y < GAME_HEIGHT - 10 &&
        o.x < carX + CAR_WIDTH &&
        o.x + OBSTACLE_WIDTH > carX
      ) {
        setGameOver(true);
        break;
      }
    }
  }, [obstacles, carX]);

  // 키보드 조작
  useEffect(() => {
    const handleKeyDown = e => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') setCarX(x => Math.max(0, x - 20));
      if (e.key === 'ArrowRight') setCarX(x => Math.min(GAME_WIDTH - CAR_WIDTH, x + 20));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  // 점수 제출 및 랭킹 조회
  const fetchRanking = async () => {
    const res = await fetch('http://localhost:5000/ranking');
    const data = await res.json();
    setRanking(data);
  };

  const submitScore = async () => {
    await fetch('http://localhost:5000/submit_score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    fetchRanking();
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  // 게임 재시작
  const restart = () => {
    setCarX(GAME_WIDTH / 2 - CAR_WIDTH / 2);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setName('');
    fetchRanking(); // 재시작 시 랭킹 다시 불러오기 (이미 하단에 표시되지만 혹시 몰라 추가)
  };

  return (
    <div style={{
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif', // 현대적인 폰트 적용
      backgroundColor: '#f0f0f0', // 배경색 변경
      minHeight: '100vh', // 전체 높이 채우기
      padding: '20px 0', // 상하 패딩
      position: 'relative', // 랭킹 푸터를 위해 필요
      paddingBottom: '80px', // 푸터 높이만큼 패딩
    }}>
      <h1>자동차 레이싱 게임</h1>
      <div
        ref={gameRef}
        style={{
          position: 'relative',
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          margin: '20px auto',
          background: 'linear-gradient(to bottom, #6a6a6a, #444444)', // 그라데이션 배경 변경
          overflow: 'hidden',
          border: '5px solid #777', // 테두리 변경
          boxShadow: '0 0 15px rgba(0,0,0,0.6)', // 그림자 강화
          borderRadius: '12px', // 모서리 더 둥글게
        }}
      >
        {/* 자동차 */}
        <div
          style={{
            position: 'absolute',
            left: carX,
            top: GAME_HEIGHT - CAR_HEIGHT - 10,
            width: CAR_WIDTH,
            height: CAR_HEIGHT,
            background: 'linear-gradient(to bottom, #ff6b6b, #ee4d4d)', // 자동차 색상 그라데이션
            borderRadius: 10,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)', // 자동차 그림자
            transition: 'left 0.1s ease-out', // 부드러운 이동 효과
          }}
        />
        {/* 장애물 */}
        {obstacles.map((o, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: o.x,
              top: o.y,
              width: OBSTACLE_WIDTH,
              height: OBSTACLE_HEIGHT,
              background: 'linear-gradient(to bottom, #a0a0a0, #888888)', // 장애물 색상 그라데이션
              borderRadius: 10,
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // 장애물 그림자
            }}
          />
        ))}
      </div>
      <h2 style={{ color: '#333', marginTop: '10px' }}>점수: {score}</h2>
      {gameOver && (
        <div>
          <h2>게임 오버!</h2>
          <input
            placeholder="이름 입력"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={ranking.length > 0}
            style={{
              marginRight: '10px',
              padding: '10px 12px', // 패딩 증가
              borderRadius: '6px', // 모서리 더 둥글게
              border: '1px solid #ccc',
              fontSize: '1rem', // 폰트 크기
            }}
          />
          <button onClick={submitScore} disabled={!name || ranking.length > 0}
            style={{
              padding: '10px 20px', // 패딩 증가
              backgroundColor: '#28a745', // 녹색 계열 버튼
              color: 'white',
              border: 'none',
              borderRadius: '6px', // 모서리 둥글게
              cursor: 'pointer',
              fontSize: '1rem', // 폰트 크기
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // 버튼 그림자
              transition: 'background-color 0.2s ease', // 호버 효과 준비
            }}
          >
            점수 제출
          </button>
          <button onClick={restart}
            style={{
              padding: '10px 20px', // 패딩 증가
              backgroundColor: '#007bff', // 파란색 계열 버튼
              color: 'white',
              border: 'none',
              borderRadius: '6px', // 모서리 둥글게
              cursor: 'pointer',
              fontSize: '1rem', // 폰트 크기
              marginLeft: '10px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // 버튼 그림자
              transition: 'background-color 0.2s ease', // 호버 효과 준비
            }}
          >
            다시 시작
          </button>
        </div>
      )}

      {/* 항상 하단에 랭킹 표시 */}
      <div style={{
        position: 'fixed',
        left: '10px',
        bottom: '10px',
        width: '240px',
        background: '#444', // 배경색
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 1000,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)', // 그림자
      }}>
        <h3 style={{margin: '0 0 8px 0'}}>랭킹</h3>
        <ol style={{
          listStyle: 'none', // 기본 목록 스타일 제거
          padding: 0,
          margin: 0,
        }}>
          {/* 랭킹 데이터 매핑 */}
          {ranking.map((r, i) => (
            <li key={i} style={{ marginBottom: '4px', fontWeight: 'bold' }}>
              {r.name}: {r.score}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
