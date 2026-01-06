import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import CityScene from '../phaser/CityScene';
import './CityView.css';

export default function CityView({ userId, agents, onAgentClick }) {
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const [game, setGame] = useState(null);

  useEffect(() => {
    if (!gameRef.current || game) return;

    // Phaser game configuration
    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: 800,
      height: 600,
      backgroundColor: '#87CEEB',
      scene: CityScene,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      }
    };

    // Create game instance
    const newGame = new Phaser.Game(config);
    setGame(newGame);

    // Get scene reference
    newGame.scene.start('CityScene', { userId, onAgentClick });
    sceneRef.current = newGame.scene.getScene('CityScene');

    // Cleanup on unmount
    return () => {
      if (newGame) {
        newGame.destroy(true);
      }
    };
  }, []);

  // Update agents when they change
  useEffect(() => {
    if (sceneRef.current && agents) {
      agents.forEach(agent => {
        if (agent.type !== 'coordinator') {
          sceneRef.current.addAgent(agent);
        }
      });
    }
  }, [agents]);

  return (
    <div className="city-view-container">
      <div ref={gameRef} className="game-canvas" />
      <div className="city-info">
        <h3>Agent City</h3>
        <p>{agents?.length || 0} active agent(s)</p>
      </div>
    </div>
  );
}
