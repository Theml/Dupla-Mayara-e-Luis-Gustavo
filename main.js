// ===============================
// GALACTIC DEFENDER - FASES COM INIMIGOS DIFERENTES
// ===============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// === SISTEMA DE CENÁRIOS / PARALLAX ===
// Definição de três "biomas" ou conjuntos de camadas.
// Ajuste os arquivos conforme os assets disponíveis.
const SCENES = [
  {
    name: "fundo",
    layers: [
      { src: "assets/fundo-espaco.png", v: 10 },
      { src: "assets/fundo-nuvens.png", v: 60 },
      { src: "assets/fundo-estrelas.png", v: 25 },
    ],
  },
  {
    name: "fundo-blue",
    layers: [
      { src: "assets/fundo-blue-back.png", v: 5 },
      { src: "assets/fundo-blue-stars.png", v: 12 },
      { src: "assets/prop-buff-small.png",
        v: 30,
        sprite: true,
        scale: 1.5,
        xP: 0.8,
        yP: 0.2,
      },
      {
        src: "assets/fundo-prop-planet-big.png",
        v: 5,
        sprite: true,
        scale: 1,
        xP: 0.62,
        yP: 0.18,
      },
      {
        src: "assets/fundo-prop-planet-big.png",
        v: 5,
        sprite: true,
        scale: 1.2,
        xP: 0.18,
        yP: 0.32,
      },
      {
        src: "assets/fundo-prop-planet-big.png",
        v: 5,
        sprite: true,
        scale: 1.1,
        xP: 0.8,
        yP: 0.45,
      },
      {
        src: "assets/fundo-prop-planet-big.png",
        v: 5,
        sprite: true,
        scale: 1,
        xP: 0.35,
        yP: 0.15,
      },
    ],
  },
  {
    name: "fundo-boss",
    layers: [
      { src: "assets/fundo-brown-space-background.png", v: 20 },
      { src: "assets/fundo-brown-space-stars.png", v: 15 },
      { src: "assets/fundo-brown-space-far-planet.png", v: 30 },
      { src: "assets/prop-buff-ring-planet.png", 
        v: 5,
        sprite: true,
        scale: 1.5,
        xP: 0.3,
        yP: 0.6,
       },
      {
        src: "assets/fundo-brown-space-big-planet.png",
        v: 30,
        sprite: true,
        scale: 1.5,
        xP: 0.7,
        yP: 0.4,
      },
      { src: "assets/fundo-asteroid.png", 
        v: 30,
        sprite: true,
        scale: 1.5, 
      },
      { src: "assets/fundo-asteroid-2.png", 
        v: 30,
        sprite: true,
        scale: 1.5,
        xP: 0.8,
        yP: 0.2,
      },
    ],
  },
];

// Cada cena será instanciada como { name, layers:[Fundo,...], ready }
let scenesInstances = [];
function loadScenes() {
  scenesInstances = SCENES.map((scene) => {
    const inst = { name: scene.name, layers: [], ready: false, loaded: 0 };
    scene.layers.forEach((cfg) => {
      const img = new Image();
      img.src = cfg.src;
      img.onload = () => {
        let layer;
        if (cfg.sprite) {
          layer = new SpriteLayer(ctx, img, cfg);
        } else {
          layer = new Fundo(ctx, img);
          layer.velocidadeBase = cfg.v;
        }
        inst.layers.push(layer);
        inst.loaded++;
        if (inst.loaded === scene.layers.length) inst.ready = true;
      };
    });
    return inst;
  });
}
loadScenes();

let currentSceneIndex = 0;
let nextSceneIndex = null; // índice da próxima cena durante transição
let sceneTransition = 0; // 0..1 progresso do fade
let sceneTransitionSpeed = 1.0; // velocidade do crossfade (1 => ~1s)

function startSceneTransition(newIndex) {
  if (newIndex === currentSceneIndex) return;
  nextSceneIndex =
    ((newIndex % scenesInstances.length) + scenesInstances.length) %
    scenesInstances.length;
  sceneTransition = 0;
}

function updateScenes(deltaTime) {
  const dtSeconds = deltaTime / 1000;
  const currentScene = scenesInstances[currentSceneIndex];
  if (currentScene && currentScene.ready) {
    currentScene.layers.forEach((layer) => {
      layer.velocidade = layer.velocidadeBase * dtSeconds;
      layer.atualizar(dtSeconds);
    });
  }
  if (nextSceneIndex !== null) {
    const nextScene = scenesInstances[nextSceneIndex];
    if (nextScene && nextScene.ready) {
      nextScene.layers.forEach((layer) => {
        layer.velocidade = layer.velocidadeBase * dtSeconds;
        layer.atualizar(dtSeconds);
      });
      sceneTransition += sceneTransitionSpeed * dtSeconds;
      if (sceneTransition >= 1) {
        currentSceneIndex = nextSceneIndex;
        nextSceneIndex = null;
        sceneTransition = 0;
      }
    }
  }
}

function drawScenes() {
  const currentScene = scenesInstances[currentSceneIndex];
  const nextScene =
    nextSceneIndex !== null ? scenesInstances[nextSceneIndex] : null;
  const isBossTransition = nextScene && nextScene.name === "fundo-boss";
  const t = sceneTransition;
  if (currentScene && currentScene.ready) {
    // Se for transição para boss, escurece a cena atual antes
    const darken = isBossTransition ? Math.min(1, t * 1.2) : 0;
    currentScene.layers.forEach((layer) => layer.desenhar(0, 1));
    if (darken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${darken * 0.9})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
  if (nextScene && nextScene.ready) {
    if (isBossTransition) {
      // Fade from black: primeiro pinta preto crescente, depois aparece cena
      const appear = Math.max(0, t - 0.5) * 2; // começa a aparecer após metade
      ctx.fillStyle = `rgba(0,0,0,${1 - appear})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      if (appear > 0) {
        nextScene.layers.forEach((layer) => layer.desenhar(0, appear));
      }
    } else {
      const alpha = Math.min(1, t);
      nextScene.layers.forEach((layer) => layer.desenhar(0, alpha));
    }
  }
}

const keys = {};
let paused = false;
const victoryButtonBounds = { x: 0, y: 0, w: 0, h: 0 };
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // Reiniciar jogo
  if ((e.key === "r" || e.key === "R") && (gameOver || paused)) {
    resetGame();
    return; // evita também despausar com ESC na mesma tecla (se for combinado)
  }
  // Toggle pause
  if (e.key === "Escape") {
    paused = !paused;
    // Evita deltaTime gigante ao retomar
    if (!paused) {
      lastTime = performance.now();
    }
  }
});
window.addEventListener("keyup", (e) => (keys[e.key] = false));
canvas.addEventListener("click", (e) => {
  if (!victory) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (
    mx >= victoryButtonBounds.x &&
    mx <= victoryButtonBounds.x + victoryButtonBounds.w &&
    my >= victoryButtonBounds.y &&
    my <= victoryButtonBounds.y + victoryButtonBounds.h
  ) {
    resetGame();
  }
});

// === PLAYER ===
const playerImg = new Image();
playerImg.src = "assets/player.png";

let gameOver = false;
let victory = false; // estado de vitória ao derrotar o boss
let startScreen = true; // tela inicial
let historyScreen = false; // tela de histórico/ranking

// Histórico de runs: {score, phase, dateISO}
let runHistory = [];
const RUN_HISTORY_KEY = "gd_runHistory";
function loadRunHistory() {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    if (raw) runHistory = JSON.parse(raw);
  } catch (e) {
    runHistory = [];
  }
}
function saveRunHistory() {
  try {
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(runHistory));
  } catch (e) {}
}
loadRunHistory();

let highestPhaseThisRun = 1;
let runRecorded = false;
let score = 0;
let highScore = 0;
try {
  highScore = parseInt(localStorage.getItem("gd_highScore") || "0");
} catch (e) {
  highScore = 0;
}

// Player base
const player = {
  x: WIDTH / 2 - 20,
  y: HEIGHT - 80,
  w: 40,
  h: 40,
  speed: 4,
  lives: 5,
};

// Extensões do player para power-ups
player.shieldHits = 0; // absorção de dano
player.weapon = "normal"; // 'normal' | 'missile'
player.weaponTimer = 0; // ms restantes para arma especial

// === POWER-UPS ===
const powerUps = [];
const POWERUP_SIZE = 40;
const POWERUP_DROP_CHANCE = 0.18;
const puImages = {
  life: (() => {
    const i = new Image();
    i.src = "assets/bonus_life.png";
    return i;
  })(),
  shield: (() => {
    const i = new Image();
    i.src = "assets/bonus_shield.png";
    return i;
  })(),
  time: (() => {
    const i = new Image();
    i.src = "assets/bonus_time.png";
    return i;
  })(),
  shieldAura: (() => {
    const i = new Image();
    i.src = "assets/bonus_shield_aura.png";
    return i;
  })(),
};

// === SPRITES DE BALAS ===
const bulletPlayerImg = new Image();
bulletPlayerImg.src = "assets/player-bullet.png";
let PLAYER_BULLET_W = 14;
let PLAYER_BULLET_H = 34;
const BULLET_SCALE = 1.9;
const BULLET_MAX_H = 60;
bulletPlayerImg.onload = () => {
  if (bulletPlayerImg.width && bulletPlayerImg.height) {
    const desiredH = Math.min(
      bulletPlayerImg.height * BULLET_SCALE,
      BULLET_MAX_H
    );
    const scale = desiredH / bulletPlayerImg.height;
    PLAYER_BULLET_W = Math.round(bulletPlayerImg.width * scale);
    PLAYER_BULLET_H = Math.round(bulletPlayerImg.height * scale);
  }
};
const enemyBulletImgs = [new Image(), new Image()];
enemyBulletImgs[0].src = "assets/bullet-1.png";
enemyBulletImgs[1].src = "assets/bullet-2.png";
let ENEMY_BULLET_W = 14;
let ENEMY_BULLET_H = 34;
const ENEMY_BULLET_SCALE = 1;
const ENEMY_BULLET_MAX_H = 48;
function recalcEnemyBulletSize() {
  const ref = enemyBulletImgs[0];
  if (!ref.width || !ref.height) return;
  const desiredH = Math.min(
    ref.height * ENEMY_BULLET_SCALE,
    ENEMY_BULLET_MAX_H
  );
  const scale = desiredH / ref.height;
  ENEMY_BULLET_W = Math.round(ref.width * scale);
  ENEMY_BULLET_H = Math.round(ref.height * scale);
}
let enemyBulletLoaded = 0;
enemyBulletImgs.forEach((img) => {
  img.onload = () => {
    enemyBulletLoaded++;
    if (enemyBulletLoaded === enemyBulletImgs.length) recalcEnemyBulletSize();
  };
});

// === SPRITE DE MÍSSIL (ROCKET) ===
const rocketImg = new Image();
rocketImg.src = "assets/rocket.png";
let ROCKET_W = 20;
let ROCKET_H = 48;
rocketImg.onload = () => {
  if (rocketImg.width && rocketImg.height) {
    const targetH = 54;
    const scale = targetH / rocketImg.height;
    ROCKET_H = Math.round(rocketImg.height * scale);
    ROCKET_W = Math.round(rocketImg.width * scale);
  }
};

// === ANIMAÇÃO DE IMPACTO DO ESCUDO ===
const shieldHitImg = new Image();
shieldHitImg.src = "assets/shield.png";
const shieldImpact = {
  active: false,
  frame: 0,
  frameTimer: 0,
  frameInterval: 55,
  frames: 1,
  frameW: 0,
  frameH: 0,
};
shieldHitImg.onload = () => {
  shieldImpact.frameH = shieldHitImg.height;
  if (shieldHitImg.height && shieldHitImg.width % shieldHitImg.height === 0) {
    shieldImpact.frames = shieldHitImg.width / shieldHitImg.height;
    shieldImpact.frameW = shieldHitImg.height;
  } else {
    shieldImpact.frames = 1;
    shieldImpact.frameW = shieldHitImg.width;
  }
};
function triggerShieldImpact() {
  shieldImpact.active = true;
  shieldImpact.frame = 0;
  shieldImpact.frameTimer = 0;
}
function updateShieldImpact(dt) {
  if (!shieldImpact.active) return;
  shieldImpact.frameTimer += dt;
  if (shieldImpact.frameTimer > shieldImpact.frameInterval) {
    shieldImpact.frameTimer = 0;
    shieldImpact.frame++;
    if (shieldImpact.frame >= shieldImpact.frames) shieldImpact.active = false;
  }
}

function spawnPowerUp(x, y) {
  const types = ["life", "shield", "time"];
  const type = types[Math.floor(Math.random() * types.length)];
  powerUps.push({
    type,
    x: x - POWERUP_SIZE / 2,
    y: y - POWERUP_SIZE / 2,
    w: POWERUP_SIZE,
    h: POWERUP_SIZE,
    vy: 2 + Math.random() * 1.5,
    img: puImages[type],
  });
}
function applyPowerUp(type) {
  switch (type) {
    case "life":
      player.lives = Math.min(9, player.lives + 1);
      break;
    case "shield":
      player.shieldHits = 2;
      break;
    case "time":
      player.weapon = "missile";
      player.weaponTimer = 10000;
      break; // 10s
  }
}
function updatePowerUps(dt) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += p.vy;
    if (isColliding(p, player)) {
      applyPowerUp(p.type);
      powerUps.splice(i, 1);
      continue;
    }
    if (p.y > HEIGHT + 60) powerUps.splice(i, 1);
  }
  if (player.weapon !== "normal") {
    player.weaponTimer -= dt;
    if (player.weaponTimer <= 0) {
      player.weapon = "normal";
      player.weaponTimer = 0;
    }
  }
}
function drawPowerUps() {
  powerUps.forEach((p) => {
    if (p.img && p.img.width) ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
    else {
      ctx.fillStyle = "#ff0";
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  });
}

// Propriedades de animação do player (spritesheet)
player.frameX = 0; // coluna atual
player.frameY = 0; // linha atual (idle/run/shoot etc.)
player.frameTimer = 0; // acumulador de tempo
player.frameInterval = 120; // ms entre frames (ajuste conforme necessário)
player.frameMax = 0; // será calculado após carregar a imagem
player.frameRows = 1; // total de linhas detectadas (definido no onload)

function updatePlayerAnimation(deltaTime) {
  player.frameTimer += deltaTime;
  if (player.frameTimer > player.frameInterval) {
    player.frameX = (player.frameX + 1) % (player.frameMax + 1);
    player.frameTimer = 0;
  }
}

// === INIMIGOS COM DISPARO ===
const enemySprites = [
  "assets/enemy1.png",
  "assets/enemy2.png",
  "assets/enemy3.png",
  "assets/enemy4.png",
  "assets/enemy5.png",
  "assets/enemy6.png",
  "assets/enemy7.png",
];

// Tamanho padrão desejado para inimigos normais
const ENEMY_BOX_W = 64;
const ENEMY_BOX_H = 72;

function computeEnemyScaledSize(img) {
  if (img && img.width && img.height) {
    const scale = Math.min(ENEMY_BOX_W / img.width, ENEMY_BOX_H / img.height);
    return {
      w: Math.round(img.width * scale),
      h: Math.round(img.height * scale),
    };
  }
  return { w: ENEMY_BOX_W, h: ENEMY_BOX_H };
}

// Boss e explosões
const bossImg = new Image();
bossImg.src = "assets/bossEnemy.png";
const explosionImg = new Image();
explosionImg.src = "assets/explosao.png";
let explosionFrameSize = 0;
let explosionFrames = 1;
explosionImg.onload = () => {
  explosionFrameSize = explosionImg.height; // assume frames quadrados
  explosionFrames = Math.max(
    1,
    Math.floor(explosionImg.width / explosionFrameSize)
  );
};
let explosions = [];

let currentLevel = 9;
let enemies = [];
let enemyBullets = [];
let enemyImg = new Image();
enemyImg.src = enemySprites[currentLevel];

// Detecta o tamanho real da sprite quando a imagem for carregada
let enemyWidth = 0;
let enemyHeight = 0;

enemyImg.onload = () => {
  enemyWidth = enemyImg.width;
  enemyHeight = enemyImg.height;
  if (enemies.length === 0) {
    spawnEnemies(currentLevel);
  }
};

// Spawn inicial imediato para evitar frame vazio que faria avançar a fase
spawnEnemies(currentLevel);

// Cria inimigos com base no nível atual
function spawnEnemies(level) {
  enemies = [];
  enemyBullets = [];

  // Fase 10 (level index 9): Boss
  if (level === 9) {
    const w = bossImg.width;
    const h = bossImg.height;
    enemies.push({
      type: "boss",
      img: bossImg,
      x: WIDTH / 2 - w / 2,
      y: 60,
      w,
      h,
      speed: 1.2,
      dir: 1,
      fireCooldown: 1000,
      firePatternCooldown: 2000,
      health: 60,
      frameX: 0,
      frameTimer: 0,
      frameInterval: 300,
    });
    return;
  }

  // Número base de inimigos (cap para não exagerar nas fases altas)
  const count = Math.min(25, 5 + level * 2);
  for (let i = 0; i < count; i++) {
    let imgRef;
    if (level >= 7) {
      // Fase 8+ inimigos diversos aleatórios
      const idx = Math.floor(Math.random() * enemySprites.length);
      imgRef = new Image();
      imgRef.src = enemySprites[idx];
    } else {
      imgRef = enemyImg; // padrão
    }
    const size = computeEnemyScaledSize(imgRef);
    const enemyObj = {
      type: "normal",
      img: imgRef,
      x: 60 + (i % 5) * 120,
      y: 50 + Math.floor(i / 5) * 60,
      w: size.w,
      h: size.h,
      speed: 1 + level * 0.5,
      dir: 1,
      fireCooldown: Math.random() * 2000,
      health: 1,
      frameX: 0,
      frameTimer: 0,
      frameInterval: 250,
    };
    // Se a imagem ainda não carregou, atualiza tamanho quando carregar
    if (!imgRef.width) {
      imgRef.onload = () => {
        const ns = computeEnemyScaledSize(imgRef);
        enemyObj.w = ns.w;
        enemyObj.h = ns.h;
      };
    }
    enemies.push(enemyObj);
  }
}

function spawnExplosion(x, y, scale = 1) {
  explosions.push({
    x,
    y,
    frame: 0,
    timer: 0,
    interval: 60,
    scale,
    done: false,
  });
}

function updateExplosions(deltaTime) {
  explosions.forEach((e) => {
    e.timer += deltaTime;
    if (e.timer > e.interval) {
      e.timer = 0;
      e.frame++;
      if (e.frame >= explosionFrames) {
        e.done = true;
      }
    }
  });
  explosions = explosions.filter((e) => !e.done);
}

// Reinicia o jogo
function resetGame() {
  gameOver = false;
  victory = false;
  paused = false;
  runRecorded = false;
  highestPhaseThisRun = 1;
  currentLevel = 0;
  enemyImg.src = enemySprites[currentLevel];
  bullets.length = 0;
  enemies = [];
  enemyBullets = [];
  player.x = WIDTH / 2 - player.w / 2;
  player.y = HEIGHT - 80;
  player.lives = 5;
  player.frameX = 0;
  player.frameY = 0;
  player.frameTimer = 0;
  score = 0;
  spawnEnemies(currentLevel);
  // Reinicia cenas
  currentSceneIndex = 0;
  nextSceneIndex = null;
  sceneTransition = 0;
  lastTime = performance.now();
}

function addScore(points) {
  score += points;
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem("gd_highScore", String(highScore));
    } catch (e) {}
  }
}

// Atualiza inimigos e seus tiros
function updateEnemies(deltaTime) {
  if (gameOver) return; // pausa atualização se o jogo acabou

  const fireRate = 2000 - currentLevel * 200; // quanto menor, mais rápido disparam
  const bulletSpeed = 2 + currentLevel * 0.3;

  enemies.forEach((e) => {
    // Movimento lateral
    if (e.type === "boss") {
      e.x += e.speed * e.dir;
      if (e.x <= 40 || e.x + e.w >= WIDTH - 40) {
        e.dir *= -1;
      }
      // Oscilação vertical leve
      e.y = 50 + Math.sin(performance.now() * 0.001) * 25;
    } else {
      e.x += e.speed * e.dir;
      if (e.x <= 0 || e.x + e.w >= WIDTH) {
        e.dir *= -1;
        e.y += 10;
      }
    }

    // Disparo
    e.fireCooldown -= deltaTime;
    if (e.type === "boss") {
      e.firePatternCooldown -= deltaTime;
      if (e.firePatternCooldown <= 0) {
        // padrão múltiplo (leque)
        const centerX = e.x + e.w / 2;
        const originY = e.y + e.h - 10;
        const spread = [-2, -1, 0, 1, 2];
        spread.forEach((ix) => {
          enemyBullets.push({
            x: centerX - ENEMY_BULLET_W / 2,
            y: originY,
            w: ENEMY_BULLET_W,
            h: ENEMY_BULLET_H,
            speed: bulletSpeed + 1,
            vx: ix * 0.8,
          });
        });
        e.firePatternCooldown = 1800; // próximo leque
      }
      if (e.fireCooldown <= 0) {
        // tiro rápido central
        enemyBullets.push({
          x: e.x + e.w / 2 - ENEMY_BULLET_W / 2,
          y: e.y + e.h,
          w: ENEMY_BULLET_W,
          h: ENEMY_BULLET_H,
          speed: bulletSpeed + 2,
        });
        e.fireCooldown = 400; // boss atira mais rápido
      }
    } else {
      if (e.fireCooldown <= 0) {
        enemyBullets.push({
          x: e.x + e.w / 2 - ENEMY_BULLET_W / 2,
          y: e.y + e.h,
          w: ENEMY_BULLET_W,
          h: ENEMY_BULLET_H,
          speed: bulletSpeed,
        });
        e.fireCooldown = fireRate + Math.random() * 1000;
      }
    }

    // Animação
    if (typeof e.frameTimer === "number") {
      e.frameTimer += deltaTime;
      if (e.frameTimer > e.frameInterval) {
        e.frameX = (e.frameX + 1) % 2;
        e.frameTimer = 0;
      }
    }
  });

  // Atualiza movimento das balas
  enemyBullets.forEach((b) => {
    b.y += b.speed;
    if (b.vx) b.x += b.vx;
  });

  // Remove balas fora da tela
  enemyBullets = enemyBullets.filter((b) => b.y < HEIGHT);

  // ✅ Colisão das balas inimigas com o player
  enemyBullets.forEach((b, index) => {
    if (
      b.x < player.x + player.w &&
      b.x + b.w > player.x &&
      b.y < player.y + player.h &&
      b.y + b.h > player.y
    ) {
      // Remove o tiro
      enemyBullets.splice(index, 1);
      if (player.shieldHits > 0) {
        player.shieldHits--;
        triggerShieldImpact();
      } else {
        spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, 1.1);
        player.lives--;
        console.log("Player atingido! Vidas restantes:", player.lives);
        if (player.lives <= 0) gameOver = true;
      }
    }
  });
}
// === DRAW ENEMIES (renderização) ===
function drawEnemies() {
  enemies.forEach((e) => {
    const imgRef = e.img || enemyImg;
    if (e.type === "boss") {
      ctx.drawImage(imgRef, e.x, e.y, e.w, e.h);
    } else {
      // Desenha escalado mantendo bounding box padrão
      ctx.drawImage(
        imgRef,
        0,
        0,
        imgRef.width || e.w,
        imgRef.height || e.h,
        e.x,
        e.y,
        e.w,
        e.h
      );
    }

    // Barra de vida do boss
    if (e.type === "boss") {
      const pct = e.health / 60;
      ctx.fillStyle = "#400";
      ctx.fillRect(e.x, e.y - 12, e.w, 6);
      ctx.fillStyle = "#f33";
      ctx.fillRect(e.x, e.y - 12, e.w * pct, 6);
    }
  });
  ctx.fillStyle = "red";
  enemyBullets.forEach((b) => {
    if (enemyBulletImgs[0].width) {
      // Seleciona frame pelo tempo
      const frame =
        Math.floor(performance.now() / 120) % enemyBulletImgs.length;
      ctx.drawImage(enemyBulletImgs[frame], b.x, b.y, b.w, b.h);
    } else {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });
}

// === BALAS ===
const bullets = [];

// === COLISÃO AABB ===
function isColliding(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// === UPDATE ===
function update(deltaTime) {
  if (gameOver || paused) return; // não atualiza lógica se game over ou pausado
  // Atualiza cenas
  updateScenes(deltaTime);
  // Movimento player
  let moving = false;
  if (keys["ArrowLeft"] || keys["a"]) {
    player.x -= player.speed;
    moving = true;
  }
  if (keys["ArrowRight"] || keys["d"]) {
    player.x += player.speed;
    moving = true;
  }
  // Movimento vertical opcional (se quiser limitar, remova estas linhas)
  if (keys["ArrowUp"] || keys["w"]) {
    player.y -= player.speed;
    moving = true;
  }
  if (keys["ArrowDown"] || keys["s"]) {
    player.y += player.speed;
    moving = true;
  }

  // Estados
  if (keys[" "]) {
    player.state = "shoot";
    // Disparo controlado
    if (bullets.length < 5) {
      if (player.weapon === "missile") {
        bullets.push({
          x: player.x + player.w / 2 - ROCKET_W / 2,
          y: player.y - 4,
          w: ROCKET_W,
          h: ROCKET_H,
          speed: 7,
          type: "missile",
        });
      } else {
        bullets.push({
          x: player.x + player.w / 2 - PLAYER_BULLET_W / 2,
          y: player.y - 2,
          w: PLAYER_BULLET_W,
          h: PLAYER_BULLET_H,
          speed: 6,
          type: "normal",
        });
      }
    }
    keys[" "] = false;
  } else if (moving) player.state = "run";
  else player.state = "idle";

  switch (player.state) {
    case "idle":
      player.frameY = 0;
      break;
    case "run":
      player.frameY = 1;
      break;
    case "shoot":
      player.frameY = 2;
      break;
  }

  // Evita desaparecer se a spritesheet não tiver todas as linhas
  if (player.frameY >= player.frameRows) player.frameY = 0;

  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x));
  player.y = Math.max(0, Math.min(HEIGHT - player.h, player.y));
  updatePlayerAnimation(deltaTime);

  // Balas
  bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.y + b.h < 0) bullets.splice(i, 1);
  });

  updatePowerUps(deltaTime);

  // Colisões
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (isColliding(b, e)) {
        // Explosão no contato
        spawnExplosion(b.x + b.w / 2, b.y, e.type === "boss" ? 1.3 : 0.9);
        // Dano
        const baseDamage =
          b.type === "missile" ? (e.type === "boss" ? 3 : 1) : 1;
        e.health = (e.health || 1) - baseDamage;
        bullets.splice(bi, 1);
        if (e.health <= 0) {
          spawnExplosion(
            e.x + e.w / 2,
            e.y + e.h / 2,
            e.type === "boss" ? 2.2 : 1.2
          );
          addScore(e.type === "boss" ? 1000 : 100);
          if (e.type === "boss") {
            // Marca vitória e impede avanço automático de fase
            victory = true;
          }
          if (
            currentLevel >= 3 &&
            e.type !== "boss" &&
            Math.random() < POWERUP_DROP_CHANCE
          ) {
            spawnPowerUp(e.x + e.w / 2, e.y + e.h / 2);
          }
          enemies.splice(ei, 1);
        } else {
          addScore(20);
        }

        // Dano em área se míssil
        if (b.type === "missile") {
          const radius = 110;
          enemies.forEach((other) => {
            if (other === e) return;
            const cx = b.x + b.w / 2,
              cy = b.y + b.h / 2;
            const ox = other.x + other.w / 2,
              oy = other.y + other.h / 2;
            if (Math.hypot(cx - ox, cy - oy) < radius) {
              other.health = (other.health || 1) - 1;
            }
          });
          enemies = enemies.filter((en) => en.health > 0);
        }
      }
    });
  });

  // Próxima fase
  if (enemies.length === 0 && !victory) {
    currentLevel++;
    if (currentLevel > 9) {
      // depois do boss, reinicia ciclo
      currentLevel = 0;
    }
    highestPhaseThisRun = Math.max(highestPhaseThisRun, currentLevel + 1);
    if (currentLevel < 7) {
      enemyImg.src = enemySprites[currentLevel % enemySprites.length];
    }
    spawnEnemies(currentLevel);
    // Regras de faixa:
    // Fases 1-5 -> fundo (index 0)
    // Fases 6-9 -> fundo-blue (index 1)
    // Fase 10 (boss) -> fundo-boss (index 2)
    let targetScene = currentSceneIndex;
    if (currentLevel <= 4) targetScene = 0; // indices de fase começam em 0
    else if (currentLevel >= 5 && currentLevel <= 8) targetScene = 1;
    else if (currentLevel === 9) targetScene = 2; // boss
    if (targetScene !== currentSceneIndex) {
      startSceneTransition(targetScene);
    }
  }
}

// === DRAW ===
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawScenes();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Player
  ctx.drawImage(
    playerImg,
    player.frameX * player.w,
    player.frameY * player.h,
    player.w,
    player.h,
    player.x,
    player.y,
    player.w,
    player.h
  );
  if (
    player.shieldHits > 0 &&
    puImages.shieldAura &&
    puImages.shieldAura.width
  ) {
    const auraScale = 0.8 + 0.05 * Math.sin(performance.now() * 0.005);
    const aw = player.w * 2.2 * auraScale;
    const ah = player.h * 1.6 * auraScale;
    ctx.globalAlpha = 0.65;
    ctx.drawImage(
      puImages.shieldAura,
      player.x + player.w / 2 - aw / 2,
      player.y + player.h / 2 - ah / 2,
      aw,
      ah
    );
    ctx.globalAlpha = 1;
  }

  // Balas
  bullets.forEach((b) => {
    if (b.type === "normal" && bulletPlayerImg.width) {
      ctx.drawImage(bulletPlayerImg, b.x, b.y, b.w, b.h);
    } else if (b.type === "missile") {
      if (rocketImg.width) {
        ctx.drawImage(rocketImg, b.x, b.y, b.w, b.h);
        const flameH = b.h * 0.3;
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.02);
        ctx.globalAlpha = 0.8;
        const grad = ctx.createRadialGradient(
          b.x + b.w / 2,
          b.y + b.h,
          1,
          b.x + b.w / 2,
          b.y + b.h,
          flameH
        );
        grad.addColorStop(0, `rgba(255,255,200,${pulse})`);
        grad.addColorStop(0.4, `rgba(255,180,0,${pulse * 0.8})`);
        grad.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(
          b.x + b.w / 2,
          b.y + b.h + flameH * 0.2,
          b.w * 0.35,
          flameH,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#ff0";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    } else {
      ctx.fillStyle = "#0f0";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });

  // Impacto do escudo
  if (shieldImpact.active && shieldHitImg.width) {
    const fw = shieldImpact.frameW;
    const fh = shieldImpact.frameH;
    const sx = shieldImpact.frame * fw;
    const scale = 2.3;
    const dw = player.w * scale;
    const dh = player.h * scale * 0.9;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(
      shieldHitImg,
      sx,
      0,
      fw,
      fh,
      player.x + player.w / 2 - dw / 2,
      player.y + player.h / 2 - dh / 2,
      dw,
      dh
    );
    ctx.globalAlpha = 1;
  }

  // Inimigos
  drawEnemies();

  // PowerUps
  drawPowerUps();

  // Explosões
  explosions.forEach((ex) => {
    if (!explosionFrameSize) return;
    const size = explosionFrameSize * ex.scale;
    const sx = ex.frame * explosionFrameSize;
    ctx.drawImage(
      explosionImg,
      sx,
      0,
      explosionFrameSize,
      explosionFrameSize,
      ex.x - size / 2,
      ex.y - size / 2,
      size,
      size
    );
  });

  // === UI ===
  ctx.fillStyle = "#0ff";
  ctx.font = "16px Consolas";
  ctx.textAlign = "left";
  ctx.fillText(`Fase: ${currentLevel + 1}`, 10, 20);
  ctx.fillText(`Inimigos: ${enemies.length}`, 10, 40);
  ctx.fillText(`Score: ${score}`, WIDTH - 160, 20);
  ctx.fillText(`High: ${highScore}`, WIDTH - 160, 40);

  // === HUD ===
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  const vidaText = "Vidas: " + player.lives;
  ctx.fillText(vidaText, 20, HEIGHT - 20);
  if (player.shieldHits > 0) {
    ctx.fillStyle = "#4af";
    ctx.font = "16px Arial";
    ctx.fillText("Escudo: " + player.shieldHits, 20, HEIGHT - 45);
  }
  if (player.weapon !== "normal") {
    ctx.fillStyle = "#fa0";
    ctx.font = "16px Arial";
    ctx.fillText(
      "Míssil: " + Math.ceil(player.weaponTimer / 1000) + "s",
      20,
      HEIGHT - 65
    );
  }

  // === GAME OVER ===
  if (gameOver) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "red";
    ctx.font = "48px Arial Black";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER!", WIDTH / 2, HEIGHT / 2);
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(
      `Score: ${score}  |  High: ${highScore}`,
      WIDTH / 2,
      HEIGHT / 2 + 30
    );
    ctx.fillText("Pressione R para reiniciar", WIDTH / 2, HEIGHT / 2 + 60);
    ctx.restore();
  } else if (victory) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = "center";
    ctx.fillStyle = "#0f0";
    ctx.font = "34px Arial Black";
    ctx.fillText("CONGRATULATIONS!", WIDTH / 2, HEIGHT / 2 - 80);
    ctx.font = "20px Arial";
    const msg = "You eliminated all the invaders!";
    const msg2 = "The galaxy appreciates your courage and determination.";
    ctx.fillStyle = "#fff";
    ctx.fillText(msg, WIDTH / 2, HEIGHT / 2 - 40);
    ctx.fillText(msg2, WIDTH / 2, HEIGHT / 2 - 10);
    // Botão
    const btnW = 260;
    const btnH = 56;
    const btnX = WIDTH / 2 - btnW / 2;
    const btnY = HEIGHT / 2 + 30;
    ctx.fillStyle = "#123";
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 3;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = "#0f0";
    ctx.font = "24px Arial";
    ctx.fillText("Jogar Novamente", WIDTH / 2, btnY + btnH / 2 + 8);
    ctx.restore();
    victoryButtonBounds.x = btnX;
    victoryButtonBounds.y = btnY;
    victoryButtonBounds.w = btnW;
    victoryButtonBounds.h = btnH;
  } else if (paused) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "42px Arial Black";
    ctx.textAlign = "center";
    ctx.fillText("PAUSADO", WIDTH / 2, HEIGHT / 2);
    ctx.font = "18px Arial";
    ctx.fillText(
      "ESC = Continuar  |  R = Reiniciar",
      WIDTH / 2,
      HEIGHT / 2 + 40
    );
    ctx.restore();
  }
}

// === LOOP ===
let lastTime = 0;
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (!paused && !startScreen && !historyScreen) {
    update(deltaTime);
    updateEnemies(deltaTime);
    updateExplosions(deltaTime);
    updateShieldImpact(deltaTime);
  }
  if (startScreen) drawStartScreen();
  else if (historyScreen) drawHistoryScreen();
  else draw();
  if ((gameOver || victory) && !runRecorded) recordRun();
  requestAnimationFrame(gameLoop);
}

playerImg.onload = () => {
  // Calcula quantos frames horizontais existem baseado na largura declarada de cada frame (player.w)
  if (player.w > 0) {
    const framesHoriz = Math.floor(playerImg.width / player.w);
    player.frameMax = Math.max(0, framesHoriz - 1); // se só 1 frame => frameMax = 0 (sem animação)
    // Detecta numero de linhas
    player.frameRows = Math.max(1, Math.floor(playerImg.height / player.h));
  } else {
    player.frameMax = 0;
    player.frameRows = 1;
  }
  gameLoop(0);
};

// =====================
// TELA INICIAL & HISTÓRICO
// =====================
const menuButtons = {
  start: { x: 0, y: 0, w: 0, h: 0 },
  history: { x: 0, y: 0, w: 0, h: 0 },
  back: { x: 0, y: 0, w: 0, h: 0 },
};

function drawBossBackgroundStatic(alpha = 1) {
  const bossScene = scenesInstances.find((s) => s.name === "fundo-boss");
  if (bossScene && bossScene.ready) {
    bossScene.layers.forEach((l) => l.desenhar(0, alpha));
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawStartScreen() {
  drawBossBackgroundStatic();
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f0";
  ctx.font = "64px Arial Black";
  ctx.fillText("GALACTIC DEFENDER", WIDTH / 2, HEIGHT / 2 - 140);
  ctx.font = "20px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("Pressione os botões para começar", WIDTH / 2, HEIGHT / 2 - 100);

  // Botões
  const btnW = 260;
  const btnH = 60;
  const gap = 25;
  const startY = HEIGHT / 2 - 20;
  const startBtnX = WIDTH / 2 - btnW / 2;
  const startBtnY = startY;
  const histBtnX = startBtnX;
  const histBtnY = startBtnY + btnH + gap;
  drawMenuButton(startBtnX, startBtnY, btnW, btnH, "Iniciar Jogo");
  drawMenuButton(histBtnX, histBtnY, btnW, btnH, "Histórico / Ranking");
  menuButtons.start = { x: startBtnX, y: startBtnY, w: btnW, h: btnH };
  menuButtons.history = { x: histBtnX, y: histBtnY, w: btnW, h: btnH };

  // Melhor score
  ctx.font = "18px Arial";
  ctx.fillStyle = "#0ff";
  ctx.fillText(`High Score: ${highScore}`, WIDTH / 2, histBtnY + btnH + 50);
  ctx.restore();
}

function drawMenuButton(x, y, w, h, label) {
  ctx.save();
  ctx.fillStyle = "rgba(10,20,40,0.8)";
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#0f0";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
}

function drawHistoryScreen() {
  drawBossBackgroundStatic();
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f0";
  ctx.font = "48px Arial Black";
  ctx.fillText("HISTÓRICO / RANKING", WIDTH / 2, 80);
  ctx.font = "18px Consolas";
  const sorted = [...runHistory].sort((a, b) => b.score - a.score);
  const maxRows = 10;
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  const headerY = 130;
  ctx.fillText("#  SCORE   FASE   DATA", WIDTH / 2 - 240, headerY);
  sorted.slice(0, maxRows).forEach((r, i) => {
    const y = headerY + 30 + i * 26;
    const date = new Date(r.dateISO);
    const dateStr =
      date.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) +
      " " +
      date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    const line = `${String(i + 1).padEnd(2)} ${String(r.score).padEnd(
      7
    )} ${String(r.phase).padEnd(5)} ${dateStr}`;
    ctx.fillText(line, WIDTH / 2 - 240, y);
  });
  // Botão Voltar
  const btnW = 200,
    btnH = 54;
  const btnX = WIDTH / 2 - btnW / 2;
  const btnY = HEIGHT - 120;
  drawMenuButton(btnX, btnY, btnW, btnH, "Voltar");
  menuButtons.back = { x: btnX, y: btnY, w: btnW, h: btnH };
  ctx.restore();
}

function recordRun() {
  runRecorded = true;
  const phase = highestPhaseThisRun;
  runHistory.push({ score, phase, dateISO: new Date().toISOString() });
  // Limite opcional
  if (runHistory.length > 100) runHistory = runHistory.slice(-100);
  saveRunHistory();
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (startScreen) {
    if (pointIn(mx, my, menuButtons.start)) {
      startScreen = false;
      resetGame();
      return;
    }
    if (pointIn(mx, my, menuButtons.history)) {
      historyScreen = true;
      startScreen = false;
      return;
    }
  } else if (historyScreen) {
    if (pointIn(mx, my, menuButtons.back)) {
      historyScreen = false;
      startScreen = true;
      return;
    }
  }
});

function pointIn(x, y, r) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
