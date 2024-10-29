"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";
import { Hands } from '@mediapipe/hands';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function Home() 
{
  const [page, setPage] = useState('home');
  const [score, setScore] = useState(0);
  const [numberOfIncrementScore, setNumberOfIncrementScore] = useState(1);
  const [lastScore, setLastScore] = useState(null);
  const [maxHealth, setMaxHealth] = useState(5);
  const [countdown, setCountdown] = useState(60);
  const [health, setHealth] = useState(maxHealth * 19);
  const [isGameFinish, setIsGameFinish] = useState(false);

  const webcamBackgroundRef = useRef(null);
  const isGameFinishRef = useRef(isGameFinish);

  const config = {
    sensorHuman: 'head', // hand or head
    sensorUsingJavascript: true
  };

  useEffect(() => {
    isGameFinishRef.current = isGameFinish;
  }, [isGameFinish]);

  useEffect(() => {
    if(health <= 0)
    {
      if(isGameFinish) return;

      showScorePage();
    }
  }, [health]);

  useEffect(() => {
    if(lastScore !== null)
    {
      // Stop item falls
      document.getElementById('gameArea').remove;

      setIsGameFinish(true);

      // Play game over sound
      document.getElementById('backsound-game').pause();
      document.getElementById('backsound-loser').play();

      setTimeout(() => {
        window.location.reload();
      }, 15000);
    }
  }, [lastScore]);

  const showScorePage = () => 
  {
      setLastScore(Math.floor(score / 19));
      setIsGameFinish(true); // Ensure game is marked as finished
  };

  const changePage = (page) => 
  {
    setPage(page);

    if (page === 'game') {
      document.getElementById('backsound-game').play();

      // Ensure MediaPipe is fully loaded before starting the game
      runMoveCollector();
    }
  };

  const startCountdown = async () => 
  {
    setInterval(() => {
      setCountdown((prevCountdown) => {
        if(prevCountdown <= 0){
          showScorePage();
          setIsGameFinish(true);
          return 0;
        }

        return prevCountdown - 1;
      });
    }, 1000);
  };

  const runItemFalls = async () => 
  {
    try {
      const response = await fetch('items/lists.json');
      const itemList = await response.json();
      
      const gameArea = document.getElementById('gameArea');
      const gameAreaRect = gameArea.getBoundingClientRect();

      const createFallingItem = (item) => {
        const itemElement = document.createElement('img');
        itemElement.classList.add('item-falls');
        itemElement.src = `items/${item.name}`;
        itemElement.style.position = 'absolute';
        itemElement.style.left = `${Math.random() * (gameAreaRect.width - item.width)}px`;
        itemElement.style.top = '-50px';
        itemElement.style.width = item.width + 'px';
        itemElement.style.height = 'auto';
        // itemElement.style.boxShadow = '0 0 100px 0 rgba(255, 255, 255, 0.5)';
        // itemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        itemElement.style.padding = '70px';
        
        gameArea.appendChild(itemElement);

        const fall = () => {
          let topPosition = parseFloat(itemElement.style.top);
          if (topPosition < gameAreaRect.height) {
            itemElement.style.top = `${topPosition + 24}px`;
            requestAnimationFrame(fall);
          } else {
            gameArea.removeChild(itemElement);

            // Decrease health if item is not caught
            // setHealth((prevHealth) => prevHealth - 19);
          }
        };

        requestAnimationFrame(fall);
      };

      const spawnItems = () => {
        const randomItem = itemList[Math.floor(Math.random() * itemList.length)];
        createFallingItem(randomItem);
      };

      const gameInterval = setInterval(spawnItems, 2500);

      // Clean up function to stop the game
      return () => clearInterval(gameInterval);
    } catch (error) {
      console.error('Error fetching item list:', error);
    }
  };

  const runMoveCollector = () => 
  {
    if(config.sensorHuman === 'hand')
    {
      if(config.sensorUsingJavascript)
      {
        _runMoveHandJavascript();
      }
      else 
      {
        _runMoveHandPython();
      }
    }
    else if(config.sensorHuman === 'head')
    {
      if(config.sensorUsingJavascript)
      {
        _runMoveHeadJavascript();
        console.log('_runMoveHeadJavascript');
      }
      else 
      {
        _runMoveHeadPython();
      }
    }

    // Load asset then runItemFalls
    runItemFalls();

    let collisionDetected = false;

    const checkCollision = () => {
      const handRect = handSensor.getBoundingClientRect();
      const items = document.querySelectorAll('main img.item-falls');

      items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        if (
          handRect.left < itemRect.right &&
          handRect.right > itemRect.left &&
          handRect.top < itemRect.bottom &&
          handRect.bottom > itemRect.top
        ) {
          if (!collisionDetected) {
            collisionDetected = true;
            setTimeout(() => collisionDetected = false, 300); // Debounce for 300ms

            // Collision detected
            item.style.transition = 'transform 0.3s ease-in-out';
            item.style.transform = 'scale(1.6)';
            setTimeout(() => {
              item.remove();
            }, 300);

            // Add catch animation to handSensor
            handSensor.style.transition = 'transform 0.2s ease-in-out';
            handSensor.style.transform = 'scale(0.9)';
            setTimeout(() => {
              handSensor.style.transform = 'scale(1)';
            }, 200);

            // Play catch sound
            document.getElementById('backsound-catch').play();

            // Add score
            if (!isGameFinishRef.current) {  // Check if the game is not finished
              if (item.src.includes('/items/jahat.png')){
                setScore((prevScore) => {
                  console.log('Decrementing score by:', numberOfIncrementScore);
                  return prevScore - numberOfIncrementScore;
                });
              } else {
                setScore((prevScore) => {
                  console.log('Incrementing score by:', numberOfIncrementScore);
                  return prevScore + numberOfIncrementScore;
                });
              }
            }
          }
        }
      });
    };

    startCountdown();

    const animationFrame = () => {
      checkCollision();
      requestAnimationFrame(animationFrame);
    };

    requestAnimationFrame(animationFrame);    
  };

  const _runMoveHandJavascript = () => 
  {
    const handSensor = document.querySelector('#handSensor');
    const videoElement = document.createElement('video');
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);

    var hands = new Hands({
      locateFile: (file) => `mediapipe/${file}`,
    });
    
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const handLandmarks = results.multiHandLandmarks[0];
        const indexFingerTip = handLandmarks[8];
        const gameArea = document.querySelector('main');
        const gameAreaRect = gameArea.getBoundingClientRect();
        const handPosition = (indexFingerTip.x * gameAreaRect.width) / gameAreaRect.width * 100;
        handSensor.style.left = `${Math.max(0, Math.min(100, handPosition))}%`;
      }
    });

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      camera.stop();
      document.body.removeChild(videoElement);
    };
  };

  const _runMoveHandPython = () => 
  {
    const handleMouseMove = (event) => {
      const gameArea = document.querySelector('main');
      const gameAreaRect = gameArea.getBoundingClientRect();
      const mouseX = event.clientX - gameAreaRect.left;
      const handPosition = (mouseX / gameAreaRect.width) * 100;
      handSensor.style.left = `${Math.max(0, Math.min(100, handPosition))}%`;
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  };

  const _runMoveHeadJavascript = () => {
    const videoElement = webcamBackgroundRef.current;
    const faceMesh = new FaceMesh({
      locateFile: (file) => `mediapipe/${file}`,
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0];
        const noseTip = faceLandmarks[1]; // Nose tip landmark
        const gameArea = document.querySelector('main');
        const gameAreaRect = gameArea.getBoundingClientRect();
        const headPositionX = (noseTip.x * gameAreaRect.width) / gameAreaRect.width * 100;
        const headPositionY = (noseTip.y * gameAreaRect.height) / gameAreaRect.height * 100;
        
        handSensor.style.left = `${Math.max(0, Math.min(100, headPositionX))}%`;
      }
    });

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    // const checkCollision = (headPositionX, headPositionY) => {
    //   const gameArea = document.querySelector('main');
    //   const gameAreaRect = gameArea.getBoundingClientRect();
    //   const headSensor = document.getElementById('handSensor');
    //   const headSensorRect = headSensor.getBoundingClientRect();

    //   const headSensorX = (headSensorRect.left - gameAreaRect.left) / gameAreaRect.width * 100;
    //   const headSensorY = (headSensorRect.top - gameAreaRect.top) / gameAreaRect.height * 100;

    //   // Check if the head position collides with the head sensor
    //   if (Math.abs(headPositionX - headSensorX) < 5 && Math.abs(headPositionY - headSensorY) < 5) {
    //     // Collision detected, perform necessary actions
    //     console.log('Collision detected with head sensor');
    //   }
    // };

    return () => {
      camera.stop();
      document.body.removeChild(videoElement);
    };
  }

  const _runMoveHeadPython = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
          const webcamBackground = document.getElementById('webcamBackground');
          if (webcamBackground) {
            webcamBackground.srcObject = stream;
          }
        })
        .catch(function(error) {
          console.error("Error accessing webcam: ", error);
        });
    } else {
      console.error("getUserMedia not supported on your browser!");
    }
  }

  return (
    <main className={styles.main}>
      <audio id="backsound-game" loop><source src="audios/concall.mp3" type="audio/mp3" /></audio>
      <audio id="backsound-winner" loop><source src="audios/game-winner.mp3" type="audio/mp3" /></audio>
      <audio id="backsound-loser" loop><source src="audios/game-over.mp3" type="audio/mp3" /></audio>
      <audio id="backsound-catch" loop><source src="audios/flip-correct.mp3" type="audio/mp3" /></audio>
      <img id="handSensor" src="imgs/hand-sensor.png" style={{display: page === 'game' ? 'block' : 'none'}} className={styles.handSensor} />
      <video id="webcamBackground" ref={webcamBackgroundRef} autoPlay muted style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          // opacity: 0.3,
          opacity: 1,
          zIndex: -1,
          display: page === 'game' ? 'block' : 'none'
        }}></video>

      {page === 'home' && (
        <video src="videos/itemfall-homepage.mp4" onClick={() => changePage('game')} className={styles.videoBackground} autoPlay muted loop />
      )}

      {page === 'game' && (
        <>
          {/* <img src="/imgs/framegames4.png" className={styles.frameGame4} /> */}
          <div className={styles.score}>
            <div> 
            Score: {score}
            </div>
            <div className={styles.countdown}>
            {countdown}
            </div>
          </div>
          <div className={styles.healthWrapper}>
            {/* {Array.from({ length: health / 19 }, (_, index) => (
              <img key={index} src="/imgs/heart.png" className={styles.health} />
            ))} */}

            <img src="/imgs/logo.png" className={styles.health} style={{width: '550px'}} />
          </div>

          <div id="gameArea" className={styles.gameArea}>
            
          </div>

          {isGameFinish === true && (
            <div id="modal-game-over" onClick={() => window.location.reload()} style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div className={styles.lastScore}>
                YOUR SCORE: {Math.floor(score)}
              </div>
              <video
                src="videos/itemfall-gameover.mp4"
                style={{
                  width: '80%',
                  borderRadius: '10px'
                }}
                autoPlay
                muted
                loop
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
