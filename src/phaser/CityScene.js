import Phaser from 'phaser';

/**
 * CityScene - Isometric view of the agent city
 * This scene renders agents as buildings in a SimCity-style isometric view
 */
export default class CityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CityScene' });
    this.agents = [];
    this.buildings = {};
    this.infoFlows = [];
  }

  init(data) {
    this.userId = data.userId;
    this.onAgentClick = data.onAgentClick || (() => {});
  }

  preload() {
    // Create simple geometric shapes for buildings
    // In production, you could load actual isometric sprites
  }

  create() {
    // Set up the camera
    this.cameras.main.setBackgroundColor('#87CEEB'); // Sky blue

    // Draw ground grid (isometric)
    this.drawIsometricGrid();

    // Create coordinator building at center
    this.createCoordinatorBuilding();

    // Add input handlers
    this.input.on('gameobjectdown', this.onBuildingClick, this);
  }

  update(time, delta) {
    // Animate info flows
    this.updateInfoFlows(delta);
  }

  /**
   * Draw an isometric grid for the city ground
   */
  drawIsometricGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x90EE90, 0.3);

    const gridSize = 50;
    const cols = 16;
    const rows = 12;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * gridSize - row * gridSize;
        const y = col * gridSize / 2 + row * gridSize / 2;

        const points = [
          x, y,
          x + gridSize, y + gridSize / 2,
          x, y + gridSize,
          x - gridSize, y + gridSize / 2,
          x, y
        ];

        graphics.strokePoints(points);
      }
    }
  }

  /**
   * Create the coordinator building at the center
   */
  createCoordinatorBuilding() {
    const x = 400;
    const y = 300;

    const building = this.createIsometricBuilding(x, y, 80, 80, 120, 0x4169E1, 'Coordination\nOffice');
    building.setData('agentType', 'coordinator');
    building.setData('agentId', 'coordinator');

    this.buildings['coordinator'] = building;
  }

  /**
   * Create an isometric building
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Building width
   * @param {number} depth - Building depth
   * @param {number} height - Building height
   * @param {number} color - Building color
   * @param {string} label - Building label
   * @returns {Phaser.GameObjects.Container} - The building container
   */
  createIsometricBuilding(x, y, width, depth, height, color, label) {
    const container = this.add.container(x, y);

    // Draw isometric building using graphics
    const graphics = this.add.graphics();

    // Top face (roof)
    graphics.fillStyle(this.lighten(color, 0.3), 1);
    graphics.beginPath();
    graphics.moveTo(0, -height);
    graphics.lineTo(width / 2, -height + depth / 4);
    graphics.lineTo(0, -height + depth / 2);
    graphics.lineTo(-width / 2, -height + depth / 4);
    graphics.closePath();
    graphics.fill();

    // Left face
    graphics.fillStyle(this.darken(color, 0.2), 1);
    graphics.beginPath();
    graphics.moveTo(-width / 2, -height + depth / 4);
    graphics.lineTo(-width / 2, depth / 4);
    graphics.lineTo(0, depth / 2);
    graphics.lineTo(0, -height + depth / 2);
    graphics.closePath();
    graphics.fill();

    // Right face
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(width / 2, -height + depth / 4);
    graphics.lineTo(width / 2, depth / 4);
    graphics.lineTo(0, depth / 2);
    graphics.lineTo(0, -height + depth / 2);
    graphics.closePath();
    graphics.fill();

    // Add outline
    graphics.lineStyle(2, 0x000000, 0.5);
    graphics.strokeRect(-width / 2, -height, width, height);

    container.add(graphics);

    // Add label
    const text = this.add.text(0, -height - 30, label, {
      fontSize: '14px',
      fill: '#000',
      align: 'center',
      fontFamily: 'Arial',
      backgroundColor: '#ffffffcc',
      padding: { x: 8, y: 4 }
    });
    text.setOrigin(0.5);
    container.add(text);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height, width, height);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    // Add hover effect
    container.on('pointerover', () => {
      container.setScale(1.1);
    });

    container.on('pointerout', () => {
      container.setScale(1.0);
    });

    return container;
  }

  /**
   * Add an agent building to the scene
   * @param {Object} agent - Agent data
   */
  addAgent(agent) {
    if (this.buildings[agent.id]) {
      return; // Already exists
    }

    const colors = {
      researcher: 0x9370DB,  // Purple
      writer: 0xFF6347,      // Tomato red
      editor: 0xFFD700,      // Gold
      analyst: 0x20B2AA      // Light sea green
    };

    const color = colors[agent.type] || 0x808080;
    const x = agent.position?.x || 400;
    const y = agent.position?.y || 300;

    const building = this.createIsometricBuilding(
      x,
      y,
      60,
      60,
      80,
      color,
      agent.type.charAt(0).toUpperCase() + agent.type.slice(1)
    );

    building.setData('agentType', agent.type);
    building.setData('agentId', agent.id);

    this.buildings[agent.id] = building;
    this.agents.push(agent);

    // Animate appearance
    building.setScale(0);
    this.tweens.add({
      targets: building,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Show information flow between two agents
   * @param {string} fromAgentId - Source agent ID
   * @param {string} toAgentId - Target agent ID
   * @param {string} message - Message being sent (optional)
   */
  showInfoFlow(fromAgentId, toAgentId, message = '') {
    const fromBuilding = this.buildings[fromAgentId];
    const toBuilding = this.buildings[toAgentId];

    if (!fromBuilding || !toBuilding) {
      return;
    }

    // Create a particle that travels from one building to another
    const startX = fromBuilding.x;
    const startY = fromBuilding.y - 60;
    const endX = toBuilding.x;
    const endY = toBuilding.y - 60;

    const particle = this.add.circle(startX, startY, 8, 0xFFFF00, 1);
    particle.setStrokeStyle(2, 0xFF8C00);

    // Animate the particle
    this.tweens.add({
      targets: particle,
      x: endX,
      y: endY,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Flash the destination building
        this.flashBuilding(toBuilding);
        particle.destroy();
      }
    });

    // Draw temporary line
    const line = this.add.graphics();
    line.lineStyle(3, 0xFFFF00, 0.5);
    line.lineBetween(startX, startY, endX, endY);

    this.time.delayedCall(1000, () => {
      line.destroy();
    });
  }

  /**
   * Flash a building to indicate activity
   * @param {Phaser.GameObjects.Container} building - The building to flash
   */
  flashBuilding(building) {
    this.tweens.add({
      targets: building,
      alpha: 0.5,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
  }

  /**
   * Handle building click
   * @param {*} pointer - Pointer event
   * @param {*} gameObject - Clicked game object
   */
  onBuildingClick(pointer, gameObject) {
    const container = gameObject.parentContainer;
    if (container) {
      const agentId = container.getData('agentId');
      const agentType = container.getData('agentType');

      if (this.onAgentClick) {
        this.onAgentClick({ id: agentId, type: agentType });
      }
    }
  }

  /**
   * Update info flows animation
   * @param {number} delta - Time delta
   */
  updateInfoFlows(delta) {
    // Handle any ongoing flow animations
    // (Currently handled by tweens)
  }

  /**
   * Lighten a color
   * @param {number} color - Hex color
   * @param {number} amount - Amount to lighten (0-1)
   * @returns {number} - Lightened color
   */
  lighten(color, amount) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    const newR = Math.min(255, r + (255 - r) * amount);
    const newG = Math.min(255, g + (255 - g) * amount);
    const newB = Math.min(255, b + (255 - b) * amount);

    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Darken a color
   * @param {number} color - Hex color
   * @param {number} amount - Amount to darken (0-1)
   * @returns {number} - Darkened color
   */
  darken(color, amount) {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    const newR = Math.floor(r * (1 - amount));
    const newG = Math.floor(g * (1 - amount));
    const newB = Math.floor(b * (1 - amount));

    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Clear all agents except coordinator
   */
  clearAgents() {
    Object.keys(this.buildings).forEach(id => {
      if (id !== 'coordinator') {
        this.buildings[id].destroy();
        delete this.buildings[id];
      }
    });
    this.agents = [];
  }

  /**
   * Remove a specific agent
   * @param {string} agentId - Agent ID to remove
   */
  removeAgent(agentId) {
    if (this.buildings[agentId]) {
      this.tweens.add({
        targets: this.buildings[agentId],
        scale: 0,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.buildings[agentId].destroy();
          delete this.buildings[agentId];
        }
      });
    }

    this.agents = this.agents.filter(a => a.id !== agentId);
  }
}
