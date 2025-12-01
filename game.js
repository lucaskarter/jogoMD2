
// --- Referências aos elementos da tela de início ---
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('startButton');
const gameScreen = document.getElementById('game-screen');
const gameMap = document.getElementById('game-map');
// --- Referências aos elementos do Minimapa ---
const minimapToggleButton = document.getElementById('minimap-toggle-button');
const minimapOverlay = document.getElementById('minimap-overlay');
const minimapLargeContainer = document.getElementById('minimap-large-container');
const minimapLargeImage = document.getElementById('minimap-large-image');
const minimapPlayerDot = document.getElementById('minimap-player-dot');

// --- NOVO: Referências aos elementos da Missão e Puzzle ---
const alertLight = document.getElementById('alert-light');
const missionHotspot = document.getElementById('mission-hotspot');
const interactionMessage = document.getElementById('interaction-message');
const puzzleScreen = document.getElementById('puzzle-screen');
const puzzleImage = document.getElementById('puzzle-image');
const closePuzzleButton = document.getElementById('close-puzzle-button');
const puzzleError = document.getElementById('puzzle-error');
const svgLines = document.getElementById('neon-lines');
const allNodes = document.querySelectorAll('.node');
const graphInteractiveLayer = document.getElementById('graph-interactive-layer'); // Para calcular %
const missionArrow = document.getElementById('mission-arrow');
const puzzleFeedbackSuccess = document.querySelector('#puzzle-feedback.success');
const puzzleFeedbackFailure = document.querySelector('#puzzle-feedback.failure');
// --- NOVO: Referências da Fase 2 ---
const elétricaHotspot = document.getElementById('elétrica-hotspot');
const elétricaInteractionMessage = document.getElementById('elétrica-interaction-message');
const weightIds = [
    'w-n1-n2', 'w-n2-n5', 'w-n1-n5', 'w-n2-n3', 'w-n3-n5',
    'w-n4-n5', 'w-n3-n4', 'w-n3-n6', 'w-n4-n6'
];

// --- NOVO: "Cérebro" do Grafo (Mapa de Adjacência e Coordenadas) ---
// Define quais nós estão conectados e suas posições (centro, em %)
const graph = {
    'n1': { adj: ['n2', 'n5'], coords: { x: 18.0, y: 51.4 } }, // Nó Vermelho
    'n2': { adj: ['n1', 'n3','n5'], coords: { x: 30.4, y: 27.1 } },
    'n3': { adj: ['n2', 'n4', 'n5', 'n6'], coords: { x: 49.6, y: 26.9 } },
    'n4': { adj: ['n3', 'n5', 'n6'], coords: { x: 49.5, y: 75.5 } },
    'n5': { adj: ['n1', 'n2', 'n3', 'n4'], coords: { x: 30.4, y: 75.5 } },
    'n6': { adj: ['n3', 'n4'], coords: { x: 62.1, y: 51.6 } }  // Nó Azul
};

let currentNodeId = 'n1'; // Onde o jogador está
let errorTimeout; // Para controlar a mensagem de erro
// --- NOVO: Estado do Jogo ---
let isMinimapOpen = false;
let isGamePaused = false; // Para pausar o jogo durante o puzzle
let isMissionComplete = false; // Para controlar se a luz apaga
let currentMission = 1; // 1 = Fogo, 2 = Elétrica
let feedbackTimeout;
let currentWeights = {}; // Armazena os pesos aleatórios
let playerPath = []; // Armazena os nós que o jogador clicou
let playerScore = 0; // Armazena a soma dos pesos do jogador
let shortestPathScore = 0; // Armazena a resposta correta

// --- Variável para o contexto do canvas de colisão ---
let collisionContext;

// --- Função setupCollisionCanvas (Sem mudanças) ---
function setupCollisionCanvas(callback) {
    const collisionImage = new Image();
    collisionImage.src = 'mask.png'; 

    collisionImage.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = collisionImage.width;
        canvas.height = collisionImage.height;
        collisionContext = canvas.getContext('2d');
        collisionContext.drawImage(collisionImage, 0, 0);
        console.log('Máscara de colisão carregada com sucesso.');
        callback(); 
    };

    collisionImage.onerror = () => {
        console.error('ERRO: Não foi possível carregar a imagem "mask.png".');
    };
}

// --- Função isWalkable (Sem mudanças) ---
/*function isWalkable(x, y) {
    if (!collisionContext) return true;
    const pixelData = collisionContext.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const r = pixelData[0];
    return r > 200; 
}*/
function isWalkable(x, y) {
    // Se a máscara ainda não carregou, retorna true para não travar o jogo
    if (!collisionContext) return true;

    // Arredonda para garantir número inteiro
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);

    // Proteção para não ler fora do mapa
    if (pixelX < 0 || pixelX >= 4096 || pixelY < 0 || pixelY >= 4096) {
        return false;
    }

    // Lê o pixel (1x1)
    const pixelData = collisionContext.getImageData(pixelX, pixelY, 1, 1).data;
    
    // pixelData[0] é o canal VERMELHO (R).
    // Se for maior que 100, é BRANCO (Chão). 
    // Se for menor (preto), é PAREDE.
    // IMPORTANTE: Se sua máscara for invertida (Chão Preto), mude para '< 100'.
    return pixelData[0] > 100; 
}

function updatePlayerOnMinimap(playerPosition) {
    const gameMapWidth = 4096;
    const gameMapHeight = 4096;
    
    // Dimensões do Personagem (Baseado no seu código: 200x229)
    const playerWidth = 200;
    const playerHeight = 229;

    const minimapDisplayWidth = minimapLargeImage.clientWidth;
    const minimapDisplayHeight = minimapLargeImage.clientHeight;
    
    const scaleX = minimapDisplayWidth / gameMapWidth;
    const scaleY = minimapDisplayHeight / gameMapHeight;
    
    // --- CORREÇÃO AQUI ---
    // Calculamos o CENTRO do personagem no mundo real antes de escalar
    const realCenterX = playerPosition.x + (playerWidth / 2);
    const realCenterY = playerPosition.y + (playerHeight / 2);

    // Agora aplicamos a escala no centro
    const dotX = (realCenterX * scaleX) - (minimapPlayerDot.clientWidth / 2);
    const dotY = (realCenterY * scaleY) - (minimapPlayerDot.clientHeight / 2);
    
    minimapPlayerDot.style.left = `${dotX}px`;
    minimapPlayerDot.style.top = `${dotY}px`;
}

// --- Função toggleMinimap (Sem mudanças) ---
function toggleMinimap() {
    isMinimapOpen = !isMinimapOpen;

    if (isMinimapOpen) {
        minimapOverlay.style.display = 'flex'; 
        minimapLargeContainer.style.display = 'block';
    } else {
        minimapOverlay.style.display = 'none';
        minimapLargeContainer.style.display = 'none';
    }
}


// --- NOVO: Função para abrir o jogo de Puzzle ---
function openPuzzle() {
    isGamePaused = true; 
    puzzleScreen.style.display = 'flex';
    closePuzzleButton.style.display = 'block';
    //alertLight.style.animation = 'none'; 
    //alertLight.style.opacity = '0'; 
    //isMissionComplete = true; 

    // 1. Gera pesos aleatórios e os exibe
    generateWeights();
    // 2. Calcula o caminho mais curto usando Dijkstra
    const solution = dijkstra(graph, currentWeights, 'n1', 'n6');
    shortestPathScore = solution.distance;
    console.log(`Caminho mais curto: ${solution.path.join(' -> ')} (Custo: ${shortestPathScore})`);
    // --- NOVO: Inicia o estado do puzzle ---
    currentNodeId = 'n1'; // Reseta para o início
    playerPath = ['n1'];
    playerScore = 0;
    svgLines.innerHTML = ''; // Limpa linhas antigas
    allNodes.forEach(node => {
        node.innerHTML = ''; // Limpa todos 'X'
    });
    // Marca o início
    document.getElementById(currentNodeId).innerHTML = 'X'; 
    puzzleFeedbackSuccess.style.display = 'none';
    puzzleFeedbackFailure.style.display = 'none';
}

// --- NOVO: Função para fechar o jogo de Puzzle ---
function closePuzzle() {
    isGamePaused = false; 
    puzzleScreen.style.display = 'none';
    closePuzzleButton.style.display = 'none';
    
    svgLines.innerHTML = ''; 
    allNodes.forEach(node => {
        node.innerHTML = ''; 
    });
    puzzleFeedbackSuccess.style.display = 'none';
    puzzleFeedbackFailure.style.display = 'none';
    
    // --- NOVO: Ativa a Fase 2 se o jogador ganhou ---
    if (isMissionComplete) {
        currentMission = 2;
        setTimeout(() => {
             startDialogueSequence(phase2Dialogues, 'audio-fase2', null);
        }, 500); // Pequeno delay para ficar suave
    }
}


// --- Função startGame (com adição da lógica de interação) ---
function startGame() {
    console.log('Iniciando o gameLoop...');

    const player = document.getElementById('player');
    const gameMap = document.getElementById('game-map');
    const gameContainer = document.getElementById('game-container');

    let playerPosition = {
        x: 1950, 
        y: 1850
    };
    
    let hotspotIsOnScreen = false;
    let isNearHotspot = false;
    // --- NOVO: Coordenadas da Fase 2 ---
    let elétricaHotspotX = 0;
    let elétricaHotspotY = 0;
    let elétricaHotspotWidth = 0;
    let elétricaHotspotHeight = 0;

    const playerSpeed = 8;
    const keysPressed = {};
    
    const playerWidth = 200; 
    const playerHeight = 229; 

    const idleFrame = 'personagemparado.png'; 
    const walkFrames = [
        'andando1.1.png', 'andando1.2.png', 'personagemparado.png',
        'andando2.1.png', 'andando2.2.png', 'personagemparado.png'
    ];
    let currentFrameIndex = 0; 
    let animationTimer = 0; 
    const animationSpeed = 6; 
    let isMoving = false; 

    // --- NOVO: Posição e tamanho do Hotspot de Interação ---
    // Leia a posição do CSS e adicione qualquer offset necessário
    const hotspotRect = missionHotspot.getBoundingClientRect();
    const hotspotX = missionHotspot.offsetLeft;
    const hotspotY = missionHotspot.offsetTop;
    const hotspotWidth = missionHotspot.clientWidth;
    const hotspotHeight = missionHotspot.clientHeight;
    // --- NOVO: Pega coordenadas da Elétrica ---
    elétricaHotspotX = elétricaHotspot.offsetLeft;
    elétricaHotspotY = elétricaHotspot.offsetTop;
    elétricaHotspotWidth = elétricaHotspot.clientWidth;
    elétricaHotspotHeight = elétricaHotspot.clientHeight;
    elétricaInteractionMessage.style.display = 'none'; // Garante que começa escondido

    document.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;

        // --- NOVO: Lógica de Interação com a tecla 'E' ---
        if (event.key === 'e' || event.key === 'E') {
            // Verifica se o jogador está perto, se o jogo não está pausado, E SE A MISSÃO AINDA NÃO FOI COMPLETA
            if (!isGamePaused && isPlayerNearHotspot(playerPosition, hotspotX, hotspotY, hotspotWidth, hotspotHeight) && !isMissionComplete) {
                openPuzzle();
                startDialogueSequence(phase1Dialogues, 'audio-fase1', openPuzzle);
            }
        // 2. Interação da FASE 2 (Elétrica)
            if (currentMission === 2) {
                // Usa as coordenadas da elétrica que definimos antes
                if (!isGamePaused && isPlayerNearHotspot(playerPosition, elétricaHotspotX, elétricaHotspotY, elétricaHotspotWidth, elétricaHotspotHeight)) {
                    startDialogueSequence(phase2IntroDialogues, null, openElectricPuzzle);
                    openElectricPuzzle(); // <--- Chama a função nova
                }
            }
            if (currentMission === 3) {
                const cafeHotspot = document.getElementById('cafeteria-hotspot');
                if (isPlayerNearHotspot(playerPosition, cafeHotspot.offsetLeft, cafeHotspot.offsetTop, 80, 80)) {
                    startDialogueSequence(phase3IntroDialogues, null, openHullRepair);
                    openHullRepair();
                }
            }
            // --- NOVO: FASE 4 (MOTOR) ---
            if (currentMission === 4) {
                handlePhase4Interaction(playerPosition);
            }
            if (!isGamePaused && !isTeleporting) {
                // Verifica se está perto de algum ponto de entrada
                teleportSpots.forEach(spot => {
                    // Raio de 80px para interagir
                    if (isPlayerNearHotspot(playerPosition, spot.entry.x - 50, spot.entry.y - 50, 100, 100)) {
                        triggerTeleport(spot, playerPosition);
                    }
                });
            }
        }    
    });

    document.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });

    // --- NOVO: Função auxiliar para verificar proximidade ---
    function isPlayerNearHotspot(playerPos, hX, hY, hW, hH) {
        // Calcula o centro do jogador para a checagem
        const playerCenterX = playerPos.x + (playerWidth / 2);
        const playerCenterY = playerPos.y + (playerHeight / 2);

        // Calcula o centro do hotspot
        const hotspotCenterX = hX + (hW / 2);
        const hotspotCenterY = hY + (hH / 2);

        // Distância entre os centros (aprox.)
        const distanceX = Math.abs(playerCenterX - hotspotCenterX);
        const distanceY = Math.abs(playerCenterY - hotspotCenterY);

        // Define uma "área de ativação" um pouco maior que o hotspot
        const activationRadius = Math.max(hW, hH) * 1.5; // Ajuste este valor conforme necessário

        return distanceX < activationRadius && distanceY < activationRadius;
    }


    // --- O Game Loop ---
    function gameLoop() {
        // Se o jogo está pausado, não processe movimento ou animação do jogador
        if (isGamePaused) {
            requestAnimationFrame(gameLoop);
            return; // Sai da função gameLoop para não mover o jogador
        }

        // --- MUDANÇA: Lógica da Mensagem de Interação ---
        // Salva o resultado na variável 'isNearHotspot'
        isNearHotspot = isPlayerNearHotspot(playerPosition, hotspotX, hotspotY, hotspotWidth, hotspotHeight);
        
        if (isNearHotspot && !isMissionComplete) {
            interactionMessage.style.display = 'block';
        } else {
            interactionMessage.style.display = 'none';
        }

        // --- Lógica de Movimento ---
        let dx = 0; 
        let dy = 0; 
        isMoving = false;

        if (keysPressed['ArrowLeft'] || keysPressed['a']) {
            dx = -1; isMoving = true; 
        } else if (keysPressed['ArrowRight'] || keysPressed['d']) {
            dx = 1; isMoving = true; 
        }
        if (keysPressed['ArrowUp'] || keysPressed['w']) {
            dy = -1; isMoving = true; 
        } else if (keysPressed['ArrowDown'] || keysPressed['s']) {
            dy = 1; isMoving = true; 
        }
        
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy); 
            dx = (dx / length) * playerSpeed;
            dy = (dy / length) * playerSpeed;
        } else {
            dx *= playerSpeed;
            dy *= playerSpeed;
        }

        // --- Lógica de Colisão ---
        const collisionXOffsetCorrection = 0; 
        const collisionYOffsetCorrection = 0; 
        // --- NOVO: Padding para "encolher" o hitbox ---
        const hitboxPaddingX = 55; // Ex: Encolhe 20px de cada lado (horizontal)
        const hitboxPaddingY = 40; // Ex: Encolhe 15px de cima e de baixo (vertical)

        // 1. Checar X
        let nextX = playerPosition.x + dx;
        let nextLeft = nextX + collisionXOffsetCorrection + hitboxPaddingX;
        let nextRight = nextX + playerWidth + collisionXOffsetCorrection - hitboxPaddingX;
        let currentTop = playerPosition.y + collisionYOffsetCorrection + hitboxPaddingY;
        let currentMiddleY = playerPosition.y + playerHeight / 2 + collisionYOffsetCorrection; // O meio não precisa de padding
        let currentBottom = playerPosition.y + playerHeight + collisionYOffsetCorrection - hitboxPaddingY;

        let canMoveX = false;
        if (dx > 0) { 
            canMoveX = isWalkable(nextRight, currentTop) && 
                         isWalkable(nextRight, currentMiddleY) &&
                         isWalkable(nextRight, currentBottom);
        } else if (dx < 0) { 
            canMoveX = isWalkable(nextLeft, currentTop) && 
                         isWalkable(nextLeft, currentMiddleY) &&
                         isWalkable(nextLeft, currentBottom);
        } else { 
            canMoveX = true; 
        }

        if (canMoveX) {
            playerPosition.x = nextX;
        }

        // 2. Checar Y
        let nextY = playerPosition.y + dy;
        let validatedLeft = playerPosition.x + collisionXOffsetCorrection + hitboxPaddingX; 
        let validatedMiddleX = playerPosition.x + playerWidth / 2 + collisionXOffsetCorrection; // O meio não precisa
        let validatedRight = playerPosition.x + playerWidth + collisionXOffsetCorrection - hitboxPaddingX;
        let nextTop = nextY + collisionYOffsetCorrection + hitboxPaddingY;
        let nextBottom = nextY + playerHeight + collisionYOffsetCorrection - hitboxPaddingY;

        let canMoveY = false;
        if (dy > 0) { 
            canMoveY = isWalkable(validatedLeft, nextBottom) && 
                         isWalkable(validatedMiddleX, nextBottom) &&
                         isWalkable(validatedRight, nextBottom);
        } else if (dy < 0) { 
            canMoveY = isWalkable(validatedLeft, nextTop) && 
                         isWalkable(validatedMiddleX, nextTop) &&
                         isWalkable(validatedRight, nextTop);
        } else { 
            canMoveY = true; 
        }

        if (canMoveY) {
            playerPosition.y = nextY;
        }
        
        // --- Lógica de Animação ---
        if (isMoving) {
            animationTimer++; 
            if (animationTimer >= animationSpeed) {
                animationTimer = 0; 
                currentFrameIndex++; 
                if (currentFrameIndex >= walkFrames.length) {
                    currentFrameIndex = 0; 
                }
                player.src = walkFrames[currentFrameIndex];
            }
        } else {
            player.src = idleFrame;
            animationTimer = 0;
            currentFrameIndex = 0;
        }

        // --- Lógica de Renderização ---
        if (dx > 0) {
            player.style.transform = 'scaleX(1)';
        } else if (dx < 0) {
            player.style.transform = 'scaleX(-1)';
        }

        player.style.left = playerPosition.x + 'px';
        player.style.top = playerPosition.y + 'px';

        const cameraWidth = gameContainer.clientWidth;
        const cameraHeight = gameContainer.clientHeight;
        let mapTranslateX = -playerPosition.x + (cameraWidth / 2) - (playerWidth / 2);
        let mapTranslateY = -playerPosition.y + (cameraHeight / 2) - (playerHeight / 2);

        gameMap.style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px)`;
        
        if (isMinimapOpen) {
            updatePlayerOnMinimap(playerPosition);
        }
        // ... (dentro de gameLoop) ...

        // --- LÓGICA DA MENSAGEM DE TELEPORTE ---
        // Verifica se está perto de QUALQUER ponto de entrada configurado
        let nearTeleport = null;

        // Procura na lista de teleportes
        for (let i = 0; i < teleportSpots.length; i++) {
            const spot = teleportSpots[i];
            if (isPlayerNearHotspot(playerPosition, spot.entry.x - 50, spot.entry.y - 50, 100, 100)) {
                nearTeleport = spot;
                break; // Achou um, não precisa procurar mais
            }
        }

        // Mostra ou esconde a mensagem
        const tpMsg = document.getElementById('teleport-message');
        if (tpMsg) {
            if (nearTeleport && !isTeleporting && !isGamePaused) {
                tpMsg.style.display = 'block';
                
                // Posiciona a mensagem em cima da entrada
                // (-40 e -60 são ajustes para centralizar o texto acima do ponto)
                tpMsg.style.left = (nearTeleport.entry.x - 40) + 'px';
                tpMsg.style.top = (nearTeleport.entry.y - 80) + 'px';
            } else {
                tpMsg.style.display = 'none';
            }
        }

        if (currentMission === 1) {
            // --- LÓGICA DA FASE 1 (FOGO) ---
            
            // Lógica da Mensagem de Interação
            isNearHotspot = isPlayerNearHotspot(playerPosition, hotspotX, hotspotY, hotspotWidth, hotspotHeight);
            if (isNearHotspot && !isMissionComplete) {
                interactionMessage.style.display = 'block';
            } else {
                interactionMessage.style.display = 'none';
            }
            
            // Controla a animação da luz de alerta
            if (isMissionComplete) {
                alertLight.style.animation = 'none';
                alertLight.style.opacity = '0';
            } else {
                alertLight.style.animation = 'alert-pulse 4s infinite';
            }
            
            // Lógica da Seta Guia
            if (!isMissionComplete && !isNearHotspot) {
                const hotspotScreenX = hotspotX - playerPosition.x + (cameraWidth / 2);
                const hotspotScreenY = hotspotY - playerPosition.y + (cameraHeight / 2);
                const playerScreenX = cameraWidth / 2;
                const playerScreenY = cameraHeight / 2;
                
                hotspotIsOnScreen = (hotspotScreenX > 50 && hotspotScreenX < cameraWidth - 50 && hotspotScreenY > 50 && hotspotScreenY < cameraHeight - 50);
                
                if (hotspotIsOnScreen) {
                    missionArrow.style.display = 'none';
                } else {
                    missionArrow.style.display = 'block';
                    const deltaX = hotspotScreenX - playerScreenX;
                    const deltaY = hotspotScreenY - playerScreenY;
                    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                    missionArrow.style.transform = `rotate(${angle}deg) translateX(120px)`;
                }
            } else {
                missionArrow.style.display = 'none';
            }

        } else if (currentMission === 2) {
            // --- LÓGICA DA FASE 2 (ELÉTRICA) ---
            
            // 1. Ativa a Vinheta (Campo de Visão)
            // (Assumindo que o CSS para #game-map::before existe)
            gameMap.classList.add('phase-2-active'); // Ativa a classe CSS

            const vignetteWidth = 1778; // Largura calculada (16:9)
            const vignetteHeight = 1000; // Altura que você escolheu
            const manualOffsetX = 100; 
            const manualOffsetY = 0;
            
            const lightRadius = 500; // Raio do 'circle 350px' do seu CSS
            const playerCenterX = playerPosition.x + (playerWidth / 2);
            const playerCenterY = playerPosition.y + (playerHeight / 2);
            const maskX = playerCenterX - (vignetteWidth / 2) + manualOffsetX;
            const maskY = playerCenterY - (vignetteHeight / 2) + manualOffsetY;

            gameMap.style.setProperty('--vignette-x', `${maskX}px`);
            gameMap.style.setProperty('--vignette-y', `${maskY}px`);

            // 2. Reativa a luz de alerta
            alertLight.style.animation = 'alert-pulse 4s infinite';
            
            // 3. Verifica proximidade com o NOVO hotspot
            if (!window.cachedElectricaX || window.cachedElectricaX === 0) {
                const elElement = document.getElementById('elétrica-hotspot');
                if (elElement) {
                    window.cachedElectricaX = elElement.offsetLeft;
                    window.cachedElectricaY = elElement.offsetTop;
                    window.cachedElectricaW = elElement.clientWidth;
                    window.cachedElectricaH = elElement.clientHeight;
                    
                    // Já posiciona a mensagem AGORA, uma única vez, e não no loop
                    elétricaInteractionMessage.style.left = (window.cachedElectricaX - 20) + 'px';
                    elétricaInteractionMessage.style.top = (window.cachedElectricaY - 40) + 'px';
                }
            }

            // Agora o loop usa os números guardados na memória (muito rápido!)
            isNearHotspot = isPlayerNearHotspot(
                playerPosition, 
                window.cachedElectricaX || 0, 
                window.cachedElectricaY || 0, 
                window.cachedElectricaW || 50, 
                window.cachedElectricaH || 50
            );

            if (isNearHotspot) {
                elétricaInteractionMessage.style.display = 'block';
            } else {
                elétricaInteractionMessage.style.display = 'none';
            }
            
            // 4. Aponta a seta para o NOVO hotspot
            if (!isNearHotspot) {
                const hotspotScreenX = elétricaHotspotX - playerPosition.x + (cameraWidth / 2);
                const hotspotScreenY = elétricaHotspotY - playerPosition.y + (cameraHeight / 2);
                const playerScreenX = cameraWidth / 2;
                const playerScreenY = cameraHeight / 2;
                
                hotspotIsOnScreen = (hotspotScreenX > 50 && hotspotScreenX < cameraWidth - 50 && hotspotScreenY > 50 && hotspotScreenY < cameraHeight - 50);
                
                if (hotspotIsOnScreen) {
                    missionArrow.style.display = 'none';
                } else {
                    missionArrow.style.display = 'block';
                    const deltaX = hotspotScreenX - playerScreenX;
                    const deltaY = hotspotScreenY - playerScreenY;
                    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                    missionArrow.style.transform = `rotate(${angle}deg) translateX(120px)`;
                }
            } else {
                missionArrow.style.display = 'none';
            }
        }
        // Dentro de gameLoop...
        if (currentMission === 3) {
            // Verifica proximidade da Cafeteria
            /*const cafeHotspot = document.getElementById('cafeteria-hotspot');
            const isNearCafe = isPlayerNearHotspot(
                playerPosition, 
                cafeHotspot.offsetLeft, cafeHotspot.offsetTop, 
                80, 80
            );

            if (isNearCafe) {
                cafeteriaMsg.style.display = 'block';
                // Atualiza posição da msg
                cafeteriaMsg.style.left = cafeHotspot.offsetLeft + 'px';
                cafeteriaMsg.style.top = (cafeHotspot.offsetTop - 30) + 'px';
            } else {
                cafeteriaMsg.style.display = 'none';
            }*/
           if (currentMission === 3) {
            // --- LÓGICA DA FASE 3 (CASCO) ---
            const cafeHotspot = document.getElementById('cafeteria-hotspot');
            
            // 1. Mensagem de Interação
            const isNearCafe = isPlayerNearHotspot(
                playerPosition, 
                cafeHotspot.offsetLeft, cafeHotspot.offsetTop, 
                80, 80
            );

            if (isNearCafe) {
                cafeteriaMsg.style.display = 'block';
                cafeteriaMsg.style.left = cafeHotspot.offsetLeft + 'px';
                cafeteriaMsg.style.top = (cafeHotspot.offsetTop - 30) + 'px';
            } else {
                cafeteriaMsg.style.display = 'none';
            }

            // 2. Seta Guia (NOVO)
            if (!isNearCafe) {
                const hotspotScreenX = cafeHotspot.offsetLeft - playerPosition.x + (cameraWidth / 2);
                const hotspotScreenY = cafeHotspot.offsetTop - playerPosition.y + (cameraHeight / 2);
                
                // Verifica se o local já está visível na tela
                hotspotIsOnScreen = (hotspotScreenX > 50 && hotspotScreenX < cameraWidth - 50 && hotspotScreenY > 50 && hotspotScreenY < cameraHeight - 50);
                
                if (hotspotIsOnScreen) {
                    missionArrow.style.display = 'none';
                } else {
                    missionArrow.style.display = 'block';
                    const deltaX = hotspotScreenX - (cameraWidth / 2);
                    const deltaY = hotspotScreenY - (cameraHeight / 2);
                    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                    
                    // Rotaciona a seta
                    missionArrow.style.transform = `rotate(${angle}deg) translateX(120px)`;
                }
            } else {
                missionArrow.style.display = 'none';
            }
        }
        }

        // --- FASE 4: VISIBILIDADE DA MENSAGEM DO MOTOR ---
        if (currentMission === 4) {
            const motorSpot = document.getElementById('engine-hotspot');
            const engMsg = document.getElementById('engine-message');

            if (motorSpot && engMsg) {
                // Verifica se está perto do motor (Raio de 150px)
                const isNearMotor = isPlayerNearHotspot(
                    playerPosition, 
                    motorSpot.offsetLeft, 
                    motorSpot.offsetTop, 
                    150, 
                    150
                );

                // Só mostra a mensagem se:
                // 1. Estiver perto
                // 2. E AINDA NÃO começou a busca (stage -1) OU JÁ terminou a busca (stage 3)
                if (isNearMotor && (currentEngineStage === -1 || currentEngineStage === 3)) {
                    engMsg.style.display = 'block';
                    
                    // Posiciona a mensagem em cima do hotspot
                    engMsg.style.left = (motorSpot.offsetLeft - 20) + 'px';
                    engMsg.style.top = (motorSpot.offsetTop - 50) + 'px';
                } else {
                    engMsg.style.display = 'none';
                }
                const shouldShowArrow = !isNearMotor && (currentEngineStage === -1 || currentEngineStage === 3);

                if (shouldShowArrow) {
                    const hotspotScreenX = motorSpot.offsetLeft - playerPosition.x + (cameraWidth / 2);
                    const hotspotScreenY = motorSpot.offsetTop - playerPosition.y + (cameraHeight / 2);
                    
                    hotspotIsOnScreen = (hotspotScreenX > 50 && hotspotScreenX < cameraWidth - 50 && hotspotScreenY > 50 && hotspotScreenY < cameraHeight - 50);
                    
                    if (hotspotIsOnScreen) {
                        missionArrow.style.display = 'none';
                    } else {
                        missionArrow.style.display = 'block';
                        const deltaX = hotspotScreenX - (cameraWidth / 2);
                        const deltaY = hotspotScreenY - (cameraHeight / 2);
                        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                        
                        missionArrow.style.transform = `rotate(${angle}deg) translateX(120px)`;
                    }
                } else {
                    missionArrow.style.display = 'none';
                }
            }
        }
        requestAnimationFrame(gameLoop);
    }

    // Inicia o game loop
    requestAnimationFrame(gameLoop);
}
// --- Início do Script quando a página carrega ---
window.addEventListener('load', () => {
    // 1. Esconde a tela do jogo no início
    gameScreen.style.display = 'none';
    startScreen.style.display = 'flex'; 

    // 2. Adiciona o evento de clique ao botão Start
    startButton.addEventListener('click', () => {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'flex'; 
        // 1. Esconde a tela de início
        // 2. Inicia a Cutscene
        playCutscene();
        console.log('Carregando máscara de colisão para iniciar o jogo...');
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) {
            bgMusic.volume = 0.8; // Volume baixo (30%) para não atrapalhar os efeitos
            bgMusic.play().catch(error => {
                console.log("O navegador bloqueou o autoplay da música:", error);
            });
        }
        setupCollisionCanvas(()=>{
            startGame();          // Inicia o loop do jogo
            startDialogueSequence(introDialogues, 'dialogue-audio', null);
        });
        
    });

    // --- Adiciona o evento de clique ao ÍCONE do mapa ---
    minimapToggleButton.addEventListener('click', () => {
        // Se o jogo está pausado (puzzle aberto), não abra o minimapa
        if (!isGamePaused) {
            toggleMinimap();
        }
    });

    // --- NOVO: Adiciona evento de clique para fechar o puzzle ---
    closePuzzleButton.addEventListener('click', () => {
        closePuzzle();
    });
});

// --- NOVO: CÓDIGO DE AJUDA PARA ENCONTRAR COORDENADAS ---
// (Você pode apagar isso quando o alinhamento estiver perfeito)

const interactiveLayer = document.getElementById('graph-interactive-layer');

interactiveLayer.addEventListener('click', function(e) {
    // Pega o tamanho atual da camada interativa
    const rect = interactiveLayer.getBoundingClientRect();
    
    // Calcula a posição X e Y do clique DENTRO da camada
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Converte para porcentagem
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Mostra no console (F12)
    console.log(`{ x: ${xPercent.toFixed(1)}, y: ${yPercent.toFixed(1)} }`);
});
// --- NOVO: LÓGICA DO PUZZLE ---

// Adiciona o listener de clique a CADA nó
allNodes.forEach(node => {
    node.addEventListener('click', handleNodeClick);
});

function handleNodeClick(event) {
    const clickedNodeId = event.target.id;
    
    // 1. Checa se o clique é adjacente (é um movimento válido?)
    const isAdjacent = graph[currentNodeId].adj.includes(clickedNodeId);
    
    if (isAdjacent) {
        // --- MOVIMENTO VÁLIDO ---
        
        // Desenha a linha neon
        drawNeonLine(currentNodeId, clickedNodeId);
        
        // Atualiza o 'X'
        document.getElementById(currentNodeId).innerHTML = ''; // Limpa 'X' antigo
        event.target.innerHTML = 'X'; // Adiciona 'X' no novo
        
        // Atualiza o nó atual
        currentNodeId = clickedNodeId;
        
        // 2. Checa se é o nó final (objetivo)
        if (clickedNodeId === 'n6') {
            console.log("Puzzle Concluído!");
            // Atraso de 1 segundo para o jogador ver a linha final
            setTimeout(() => {
                closePuzzle(); 
            }, 1000);
        }
        
    } else if (clickedNodeId !== currentNodeId) {
        // --- MOVIMENTO INVÁLIDO ---
        showPuzzleError();
    }
}

// Função para desenhar a linha neon no SVG
function drawNeonLine(nodeIdA, nodeIdB) {
    const coordsA = graph[nodeIdA].coords;
    const coordsB = graph[nodeIdB].coords;
    
    // Pega as dimensões atuais da camada interativa
    const layerWidth = graphInteractiveLayer.clientWidth;
    const layerHeight = graphInteractiveLayer.clientHeight;

    // Converte as coordenadas % em pixels
    const p1x = (coordsA.x / 100) * layerWidth;
    const p1y = (coordsA.y / 100) * layerHeight;
    const p2x = (coordsB.x / 100) * layerWidth;
    const p2y = (coordsB.y / 100) * layerHeight;

    // Cria um elemento de linha SVG
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1x);
    line.setAttribute('y1', p1y);
    line.setAttribute('x2', p2x);
    line.setAttribute('y2', p2y);
    line.setAttribute('class', 'neon-line');
    
    svgLines.appendChild(line);
}

// Função para mostrar a mensagem "Não é possível"
function showPuzzleError() {
    clearTimeout(errorTimeout); 
    puzzleError.style.display = 'block';
    
    errorTimeout = setTimeout(() => {
        puzzleError.style.display = 'none';
    }, 3000);
}

// --- NOVO: LÓGICA DO PUZZLE (Funções Adicionadas) ---

// Adiciona o listener de clique a CADA nó
allNodes.forEach(node => {
    node.addEventListener('click', handleNodeClick);
});

function handleNodeClick(event) {
    const clickedNodeId = event.target.id;
    
    // Para o clique se já terminou
    if (currentNodeId === 'n6') return; 
    
    // 1. Checa se o clique é adjacente
    const isAdjacent = graph[currentNodeId].adj.includes(clickedNodeId);
    
    if (isAdjacent) {
        // --- MOVIMENTO VÁLIDO ---
        
        // Pega o peso da aresta
        const edgeWeight = getEdgeWeight(currentNodeId, clickedNodeId);
        playerScore += edgeWeight;
        playerPath.push(clickedNodeId);
        
        drawNeonLine(currentNodeId, clickedNodeId);
        
        document.getElementById(currentNodeId).innerHTML = ''; 
        event.target.innerHTML = 'X'; 
        
        currentNodeId = clickedNodeId;
        
        // 2. Checa se é o nó final (objetivo)
        if (clickedNodeId === 'n6') {
            // Compara a pontuação
            if (playerScore === shortestPathScore) {
                showPuzzleFeedback(true); // Sucesso
                isMissionComplete = true; // 1. Trava a missão permanentemente
                missionHotspot.style.display = 'none'; // 2. Esconde o fogo
            } else {
                showPuzzleFeedback(false); // Falha
            }
            
            // Fecha o puzzle após 4 segundos
            setTimeout(() => {
                closePuzzle(); 
            }, 4000);
        }
        
    } else if (clickedNodeId !== currentNodeId) {
        // --- MOVIMENTO INVÁLIDO ---
        showPuzzleError();
    }
}

// Função para desenhar a linha neon no SVG
function drawNeonLine(nodeIdA, nodeIdB) {
    const coordsA = graph[nodeIdA].coords;
    const coordsB = graph[nodeIdB].coords;
    
    const layerWidth = graphInteractiveLayer.clientWidth;
    const layerHeight = graphInteractiveLayer.clientHeight;

    const p1x = (coordsA.x / 100) * layerWidth;
    const p1y = (coordsA.y / 100) * layerHeight;
    const p2x = (coordsB.x / 100) * layerWidth;
    const p2y = (coordsB.y / 100) * layerHeight;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1x);
    line.setAttribute('y1', p1y);
    line.setAttribute('x2', p2x);
    line.setAttribute('y2', p2y);
    line.setAttribute('class', 'neon-line');
    
    svgLines.appendChild(line);
}

// Função para mostrar a mensagem "Não é possível"
function showPuzzleError() {
    clearTimeout(errorTimeout); 
    puzzleError.style.display = 'block';
    
    errorTimeout = setTimeout(() => {
        puzzleError.style.display = 'none';
    }, 3000);
}

// --- NOVO: Função para mostrar feedback de sucesso/falha ---
function showPuzzleFeedback(isSuccess) {
    clearTimeout(feedbackTimeout);
    
    if (isSuccess) {
        puzzleFeedbackSuccess.style.display = 'block';
    } else {
        puzzleFeedbackFailure.style.display = 'block';
    }

    // O feedback desaparece quando o puzzle fecha (em closePuzzle)
}


// --- NOVO: Função para gerar pesos aleatórios ---
function generateWeights() {
    let weights = new Set();
    while (weights.size < 9) { // 9 arestas
        weights.add(Math.floor(Math.random() * 100) + 1); // Números de 1 a 100
    }
    
    const weightArray = Array.from(weights);
    currentWeights = {};
    
    // Mapeia os pesos para as arestas e atualiza o HTML
    // (A ordem aqui deve bater com 'weightIds' e 'edgeMap')
    const edgeMap = [
        'n1-n2', 'n2-n5', 'n1-n5', 'n2-n3', 'n3-n5',
        'n4-n5', 'n3-n4', 'n3-n6', 'n4-n6'
    ];
    
    for (let i = 0; i < edgeMap.length; i++) {
        const edgeName = edgeMap[i];
        const weight = weightArray[i];
        const elementId = weightIds[i];
        
        currentWeights[edgeName] = weight;
        document.getElementById(elementId).innerHTML = weight;
    }
}

// --- NOVO: Função para pegar o peso (lida com 'n1-n2' vs 'n2-n1') ---
function getEdgeWeight(nodeA, nodeB) {
    if (currentWeights[`${nodeA}-${nodeB}`]) {
        return currentWeights[`${nodeA}-${nodeB}`];
    }
    if (currentWeights[`${nodeB}-${nodeA}`]) {
        return currentWeights[`${nodeB}-${nodeA}`];
    }
    
    // Backup (caso o mapa de arestas esteja errado, mas o 'graph' correto)
    // Isso é mais lento, mas garante o funcionamento
    for (const key in currentWeights) {
        if (key.includes(nodeA) && key.includes(nodeB)) {
            return currentWeights[key];
        }
    }
    return 0; // Erro
}


// --- NOVO: Implementação do Algoritmo de Dijkstra ---
function dijkstra(graph, weights, startNode, endNode) {
    const distances = {};
    const prev = {};
    const pq = new Set();

    // Inicializa distâncias
    for (const node in graph) {
        distances[node] = Infinity;
        prev[node] = null;
        pq.add(node);
    }
    distances[startNode] = 0;

    while (pq.size > 0) {
        // Encontra o nó com a menor distância
        let minNode = null;
        for (const node of pq) {
            if (minNode === null || distances[node] < distances[minNode]) {
                minNode = node;
            }
        }
        
        if (minNode === null) break;
        
        pq.delete(minNode);
        
        if (minNode === endNode) break;

        // Para cada vizinho do nó atual
        for (const neighbor of graph[minNode].adj) {
            if (pq.has(neighbor)) {
                const weight = getEdgeWeight(minNode, neighbor);
                const alt = distances[minNode] + weight;
                
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    prev[neighbor] = minNode;
                }
            }
        }
    }

    // Reconstrói o caminho
    const path = [];
    let u = endNode;
    while (prev[u] !== null) {
        path.unshift(u);
        u = prev[u];
    }
    path.unshift(startNode);
    
    return {
        distance: distances[endNode],
        path: path
    };
}

// ======================================================
// === CÓDIGO DA MISSÃO 2: PUZZLE ELÉTRICO (HAMILTON) ===
// ======================================================

const electricScreen = document.getElementById('electric-puzzle-screen');
const electricLinesSvg = document.getElementById('electric-neon-lines');
const electricFeedback = document.getElementById('electric-feedback');
const closeElectricBtn = document.getElementById('close-electric-button');
const allElectricNodes = document.querySelectorAll('.elec-node');

let currentElectricNode = null; 
let startElectricNode = null;
let visitedElectricNodes = [];  
const totalNodesRequired = () => Object.keys(electricGraph).length;

// --- CONFIGURAÇÃO DO GRAFO (COORDENADAS E CONEXÕES) ---
// IDs devem bater com o HTML (e1, e2, etc.)
const electricGraph = {
    'e1': { x: 51.0, y: 10.0, adj: ['e4','e5','e10']}, // TOPO
    'e2': { x: 36.0, y: 28.0, adj: ['e4','e6','e7'] }, 
    'e3': { x: 65.0, y: 28.0, adj: ['e4','e8','e9'] }, 
    'e4': { x: 50.8, y: 26.5, adj: ['e1','e2', 'e3'] }, 
    'e5': { x: 14.8, y: 36.3, adj: ['e1', 'e6','e19'] },
    'e6': { x: 25.8, y: 41.5, adj: ['e2', 'e5','e11'] }, 
    'e7': { x: 43.3, y: 38.2, adj: ['e2', 'e8','e12'] }, 
    'e8': { x: 57.0, y: 38.8, adj: ['e3', 'e7','e14'] }, 
    'e9': { x: 74.1, y: 41.4, adj: ['e3', 'e10','e15'] }, 
    'e10': { x: 83.5, y: 36.5, adj: ['e1', 'e9','e20'] },  
    'e11': { x: 29.0, y: 60.0, adj: ['e6', 'e12','e16'] },
    'e12': { x: 39.6, y: 58.5, adj: ['e7', 'e11','e13'] },
    'e13': { x: 50.8, y: 68.2, adj: ['e12', 'e14', 'e17'] },
    'e14': { x: 61.0, y: 58.1, adj: ['e8', 'e13','e15'] },
    'e15': { x: 70.0, y: 60.2, adj: ['e9', 'e14', 'e18'] },
    'e16': { x: 39.7, y: 78.4, adj: ['e11', 'e17','e19'] },
    'e17': { x: 50.2, y: 82.5, adj: ['e16', 'e18','e19'] },
    'e18': { x: 61.0, y: 78.2, adj: ['e15', 'e17','e20'] },
    'e19': { x: 30.1, y: 89.2, adj: ['e5', 'e16', 'e20'] },
    'e20': { x: 71.1, y: 90.2, adj: ['e10', 'e18','e19'] },
};

function openElectricPuzzle() {
    isGamePaused = true;
    electricScreen.style.display = 'flex';
    resetElectricPuzzle();
}

// Função para fechar (agora aceita um parâmetro de vitória)
function closeElectricPuzzle(forceWin = false) {
    if (typeof forceWin === 'object') forceWin = false;
    isGamePaused = false;
    electricScreen.style.display = 'none';
    
    // VERIFICAÇÃO SIMPLIFICADA
    // Se passarmos 'true' (forceWin) OU se as variáveis baterem, ele limpa tudo.
    const isVictory = forceWin || (visitedElectricNodes.length === totalNodesRequired() && currentElectricNode === startElectricNode);

    if (isVictory) {
        console.log("VITÓRIA CONFIRMADA! Removendo escuridão...");

        // 1. Remove elementos visuais da Fase 2
        const visualImage = document.getElementById('elétrica-visual');
        const interactionMsg = document.getElementById('elétrica-interaction-message');
        const electricHotspot = document.getElementById('elétrica-hotspot');

        if(visualImage) visualImage.style.display = 'none';
        if(interactionMsg) interactionMsg.style.display = 'none';
        if(electricHotspot) electricHotspot.style.display = 'none'; 

        // 2. A MÁGICA: Remove a classe que faz a escuridão
        // Certifique-se que a variável 'gameMap' está definida no topo do seu arquivo
        const mapElement = document.getElementById('game-map');
        mapElement.classList.remove('phase-2-active'); 

        // 3. Atualiza estado para Fase 3 (para não voltar a lógica antiga)
        isMissionComplete = true; 
        currentMission = 3; 
        
        setTimeout(() => {
            startDialogueSequence(phase2EndDialogues, 'audio-brecha', null);
        }, 1000);
        // 4. Limpa luzes e setas
        alertLight.style.animation = 'none';
        alertLight.style.opacity = 0;
        missionArrow.style.display = 'none';
    }
}
    function resetElectricPuzzle() {
    electricLinesSvg.innerHTML = ''; 
    visitedElectricNodes = [];   
    currentElectricNode = null;
    startElectricNode = null;
    
    electricFeedback.innerText = "Escolha um ponto para iniciar o circuito.";
    electricFeedback.style.color = "white";

    // Limpa o visual de todos os nós (ninguém começa ativo)
    allElectricNodes.forEach(node => {
        node.classList.remove('visited', 'active', 'start-node');
        
        // Posiciona (mantém essa parte igual)
        const id = node.getAttribute('data-id');
        if (electricGraph[id]) {
            node.style.left = electricGraph[id].x + '%';
            node.style.top = electricGraph[id].y + '%';
        }
    });
}
// --- LÓGICA DE CLIQUE (CICLO HAMILTONIANO) ---
// --- LÓGICA DE CLIQUE (CORRIGIDA) ---
allElectricNodes.forEach(node => {
    node.addEventListener('click', (e) => {
        const clickedId = e.target.getAttribute('data-id');
        
        // 1. Primeiro Clique
        if (visitedElectricNodes.length === 0) {
            startElectricNode = clickedId;
            currentElectricNode = clickedId;
            visitedElectricNodes.push(clickedId);
            e.target.classList.add('visited', 'active', 'start-node');
            electricFeedback.innerText = "Agora passe por todos os pontos!";
            return; 
        }

        if (!currentElectricNode || !electricGraph[currentElectricNode]) return;
        const possibleMoves = electricGraph[currentElectricNode].adj;
        
        if (possibleMoves.includes(clickedId)) {
            
            // --- SITUAÇÃO 2: VITÓRIA (CORRIGIDO) ---
            if (clickedId === startElectricNode && visitedElectricNodes.length === totalNodesRequired()) {
                
                drawRedNeonLine(currentElectricNode, clickedId);
                
                // ATUALIZAÇÃO IMPORTANTE: Marcamos que o nó atual É o inicial (fechou o ciclo)
                currentElectricNode = clickedId; 
                
                electricFeedback.innerText = "SISTEMA RESTAURADO!";
                electricFeedback.style.color = "#00FF00";
                
                // Chama o fechar passando TRUE para garantir que limpe a tela
                setTimeout(() => {
                    closeElectricPuzzle(true); 
                }, 1500);
                return;
            }

            // --- SITUAÇÃO 3: Movimento Normal ---
            if (!visitedElectricNodes.includes(clickedId)) {
                drawRedNeonLine(currentElectricNode, clickedId);
                document.getElementById(currentElectricNode).classList.remove('active'); 
                currentElectricNode = clickedId;
                visitedElectricNodes.push(clickedId);
                e.target.classList.add('visited', 'active');
            } else {
                // Erro: Já visitado
                const msg = (clickedId !== startElectricNode) ? "Ponto já energizado!" : "Visite todos os pontos antes de voltar!";
                pulseErrorFeedback(msg);
            }

        } else {
            pulseErrorFeedback("Conexão muito distante!");
        }
    });
});

// Função auxiliar para mensagem de erro piscando
function pulseErrorFeedback(msg) {
    const originalText = electricFeedback.innerText;
    electricFeedback.innerText = msg;
    electricFeedback.style.color = "red";
    setTimeout(() => {
        electricFeedback.innerText = originalText; // Volta o texto anterior
        electricFeedback.style.color = "white";
    }, 1500);
}

function drawRedNeonLine(idA, idB) {
    const layer = document.getElementById('electric-interactive-layer');
    const w = layer.clientWidth;
    const h = layer.clientHeight;
    
    const cA = electricGraph[idA];
    const cB = electricGraph[idB];

    const x1 = (cA.x / 100) * w;
    const y1 = (cA.y / 100) * h;
    const x2 = (cB.x / 100) * w;
    const y2 = (cB.y / 100) * h;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'electric-line');
    
    electricLinesSvg.appendChild(line);
}

// Botão fechar
if(closeElectricBtn) {
    closeElectricBtn.addEventListener('click', () => closeElectricPuzzle(false));
}

// Debug para achar coordenadas
const layerDebug = document.getElementById('electric-interactive-layer');
if(layerDebug){
    layerDebug.addEventListener('click', function(e) {
        if(e.target !== this) return;
        const rect = this.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        console.log(`Ponto Elétrico -> x: ${x.toFixed(1)}, y: ${y.toFixed(1)}`);
    });
}

// ======================================================
// === CÓDIGO DA FASE 3: REPARO DO CASCO (GRAFO) ===
// ======================================================

const hullScreen = document.getElementById('hull-repair-screen');
const hullOptionsContainer = document.getElementById('hull-options-container');
const hullFeedback = document.getElementById('hull-feedback');
const draggedPieceImg = document.getElementById('dragged-piece');
const cafeteriaMsg = document.getElementById('cafeteria-interaction-message');

// --- CONFIGURAÇÃO: IMAGENS DAS 11 PEÇAS ---
// Coloque aqui o nome dos seus 11 arquivos de imagem
const hullPieceImages = [
    '1.png', '2.png', '3.png', '4.png', 
    '5.png', '6.png', '7.png', '8.png', 
    '9.png', '10.png', '11.png'
];

// --- CONFIGURAÇÃO: GRAFO DE ADJACÊNCIA (QUEM ENCOSTA EM QUEM) ---
// Isso define a regra da coloração.
// Ex: O slot 0 encosta no 1 e no 2.
const hullGraph = {
    0: [1, 2],
    1: [0, 2, 3],
    2: [0, 1, 3, 4],
    3: [1, 2, 4, 6],
    4: [2, 3, 5, 6],
    5: [4, 6, 7],
    6: [3, 4, 5, 7, 8],
    7: [5, 6, 8, 9],
    8: [7, 9, 10],
    9: [6, 7, 8, 10],
    10: [8, 9]
    // VOCÊ PRECISA AJUSTAR ISSO OLHANDO PARA O SEU MAPA
};

// Cores disponíveis
const hullColors = ['yellow', 'blue', 'red', 'green'];

// Estado do Jogo
let currentHullIndex = 0; // Qual peça estamos colocando (0 a 10)
let slotsState = {};      // Guarda a cor de cada slot preenchido
let repairOrder = [];
let selectedColor = null; // Cor da peça que estamos arrastando
let isDragging = false;

// --- FUNÇÕES DE CONTROLE ---

function openHullRepair() {
    isGamePaused = true;
    hullScreen.style.display = 'flex';
    currentHullIndex = 0;
    slotsState = {};
    
    repairOrder = Array.from({length: hullPieceImages.length}, (_, i) => i);
    
    // 2. Embaralha a lista aleatoriamente
    repairOrder.sort(() => Math.random() - 0.5);
    
    console.log("Ordem do reparo:", repairOrder);
    // Limpa slots visuais
    document.querySelectorAll('.hull-slot').forEach(slot => {
        slot.innerHTML = '';
        slot.classList.remove('filled');
        // Define posição de teste se não tiver CSS (ajuda a achar)
        // slot.style.left = (10 + slot.getAttribute('data-id')*8) + '%';
        // slot.style.top = '50%';
    });

    spawnNextPieceOptions();
}

function spawnNextPieceOptions() {
    hullOptionsContainer.innerHTML = ''; 
    
    if (currentHullIndex >= hullPieceImages.length) {
        hullFeedback.innerText = "NAVE REPARADA COM SUCESSO!";
        hullFeedback.style.color = "#00FF00";
        setTimeout(finishGame, 3000);
        return;
    }

    const realPieceId = repairOrder[currentHullIndex];
    // Pega a imagem correspondente ao ID Real
    const imgSource = hullPieceImages[realPieceId];
    
    hullFeedback.innerText = `Encaixe a peça! (${currentHullIndex + 1}/${hullPieceImages.length})`;
    /*const imgSource = hullPieceImages[currentHullIndex];*/////////////
    hullFeedback.innerText = `Encaixe a peça ${currentHullIndex + 1} de 11`;

    hullColors.forEach(color => {
        // MUDANÇA: Criamos DIV em vez de IMG
        const div = document.createElement('div');
        
        // Define a imagem como background
        div.style.backgroundImage = `url('${imgSource}')`;
        
        div.classList.add('hull-option', `piece-${color}`);
        div.dataset.color = color;
        
        div.addEventListener('mousedown', (e) => startDrag(e, color, imgSource));
        
        hullOptionsContainer.appendChild(div);
    });
}

// 2. INICIA O ARRASTO (Usa background-image)
function startDrag(e, color, imgSrc) {
    e.preventDefault();
    isDragging = true;
    selectedColor = color;
    
    // MUDANÇA: Define background em vez de src
    draggedPieceImg.style.backgroundImage = `url('${imgSrc}')`;
    
    // A classe adiciona o ponto colorido automaticamente via CSS (::after)
    draggedPieceImg.className = `piece-${color}`; 
    draggedPieceImg.style.display = 'block';
    
    moveDrag(e);
}

// Move a imagem com o mouse
document.addEventListener('mousemove', moveDrag);

function moveDrag(e) {
    if (!isDragging) return;
    draggedPieceImg.style.left = (e.clientX - 95) + 'px'; // -40 para centralizar
    draggedPieceImg.style.top = (e.clientY - 95) + 'px';
}

// Soltar a peça
// --- NOVO CÓDIGO DE SOLTAR COM EFEITO IMÃ ---
document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    isDragging = false;
    draggedPieceImg.style.display = 'none'; // Esconde a peça flutuante temporariamente
    
    // Configuração do Imã
    const limitDistance = 30; // Raio do imã em pixels (quanto maior, mais forte)
    
    let closestSlotId = null;
    let minDist = Infinity;

    // 1. Procura qual é o slot mais próximo do mouse
    const allSlots = document.querySelectorAll('.hull-slot');
    
    allSlots.forEach(slot => {
        // Ignora slots que já estão cheios
        if (slot.classList.contains('filled')) return;

        // Pega a posição exata do centro do slot na tela
        const rect = slot.getBoundingClientRect();
        const slotCenterX = rect.left + (rect.width / 2);
        const slotCenterY = rect.top + (rect.height / 2);

        // Calcula a distância (Teorema de Pitágoras)
        const dist = Math.hypot(e.clientX - slotCenterX, e.clientY - slotCenterY);

        // Se for o mais próximo até agora, salva ele
        if (dist < minDist) {
            minDist = dist;
            closestSlotId = parseInt(slot.dataset.id);
        }
    });

    // 2. Verifica se o slot mais próximo está dentro do alcance do imã
    if (closestSlotId !== null && minDist <= limitDistance) {
        // Tenta encaixar (vai verificar as cores/grafo)
        attemptDrop(closestSlotId);
    } else {
        // Se soltou longe de tudo, toca um som ou feedback (opcional)
        console.log("Nenhum slot próximo detectado.");
    }
});

function attemptDrop(slotId) {
    const targetPieceId = repairOrder[currentHullIndex];

    // O Slot escolhido (slotId) é igual à peça que ele está segurando?
    if (slotId !== targetPieceId) {
        hullFeedback.innerText = "Esta peça não encaixa neste formato!";
        hullFeedback.style.color = "orange";
        setTimeout(() => {
            hullFeedback.innerText = "Tente outro lugar!";
            hullFeedback.style.color = "white";
        }, 1500);
        return; 
    }
    // 1. Verifica conflito de cores (GRAFO)
    const neighbors = hullGraph[slotId] || [];
    let conflict = false;

    neighbors.forEach(neighborId => {
        if (slotsState[neighborId] === selectedColor) {
            conflict = true;
        }
    });

    if (conflict) {
        hullFeedback.innerText = "ERRO! Cores vizinhas não podem ser iguais!";
        hullFeedback.style.color = "red";
        setTimeout(() => hullFeedback.style.color = "white", 1500);
        return;
    }

    // 2. Sucesso!
    placePiece(slotId);
}

function placePiece(slotId) {
    slotsState[slotId] = selectedColor;
    
    const slot = document.getElementById(`slot-${slotId}`);
    const realPieceId = repairOrder[currentHullIndex];
    // MUDANÇA: Cria DIV final em vez de IMG
    const finalDiv = document.createElement('div');
    finalDiv.style.backgroundImage = `url('${hullPieceImages[realPieceId]}')`;
    finalDiv.style.width = "100%";
    finalDiv.style.height = "100%";
    finalDiv.style.backgroundSize = "contain";
    finalDiv.style.backgroundRepeat = "no-repeat";
    finalDiv.style.backgroundPosition = "center";
    finalDiv.style.position = "relative"; // Para o ponto aparecer
    
    // Adiciona a classe para aparecer o ponto colorido
    finalDiv.classList.add(`piece-${selectedColor}`);
    
    slot.appendChild(finalDiv);
    slot.classList.add('filled');
    
    currentHullIndex++;
    spawnNextPieceOptions();
}

function finishGame() {
    hullScreen.style.display = 'none';
    isGamePaused = false;
    startDialogueSequence(phase3EndDialogues, 'audio-motor', initPhase4);
    initPhase4(); // <--- Chama a função da Fase 4
}

// --- DEBUG PARA POSICIONAR OS SLOTS ---
// Clique na tela do Hull para ver onde posicionar os slots no CSS
hullScreen.addEventListener('click', (e) => {
    if(e.target === hullScreen || e.target.id === 'hull-slots-layer') {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        console.log(`Slot Pos: left: ${x.toFixed(1)}%; top: ${y.toFixed(1)}%;`);
    }
});

// ======================================================
// === FUNÇÃO GLOBAL DE DISTÂNCIA (COLE NO FINAL DO ARQUIVO) ===
// ======================================================

function isPlayerNearHotspot(playerPos, hX, hY, hW, hH) {
    // 200 e 229 são a largura e altura do personagem (hardcoded baseado no seu código anterior)
    const pWidth = 200; 
    const pHeight = 229;

    // Calcula o centro do jogador
    const playerCenterX = playerPos.x + (pWidth / 2);
    const playerCenterY = playerPos.y + (pHeight / 2);

    // Calcula o centro do hotspot
    const hotspotCenterX = hX + (hW / 2);
    const hotspotCenterY = hY + (hH / 2);

    // Distância entre os centros
    const distanceX = Math.abs(playerCenterX - hotspotCenterX);
    const distanceY = Math.abs(playerCenterY - hotspotCenterY);

    // Área de ativação (1.5x o tamanho do objeto)
    const activationRadius = Math.max(hW, hH) * 1.5; 

    return distanceX < activationRadius && distanceY < activationRadius;
}
// ======================================================
// === CÓDIGO DA FASE 4: MOTOR (Árvores / Busca) ===
// ======================================================

const engineHud = document.getElementById('engine-hud');
const engineMessage = document.getElementById('engine-message');
const itemsContainer = document.getElementById('game-map'); // Jogamos itens direto no mapa
const hudStatus = document.getElementById('hud-status');

// --- CONFIGURAÇÃO ---
const truePartsConfig = [
    { id: 'alavanca', name: 'Alavanca', img: 'alavanca.png', totalSpawns: 4 }, // 1 Certa + 3 Falsas
    { id: 'capacitor', name: 'Capacitor', img: 'capacitor.png', totalSpawns: 5 }, // 1 Certa + 4 Falsas
    { id: 'rolamento', name: 'Rolamento', img: 'rolamento.png', totalSpawns: 5 }  // 1 Certa + 4 Falsas
];

const falsePartsImages = [
    'false1.png', 'false2.png', 'false3.png', 'false4.png', 'false5.png',
    'false6.png', 'false7.png', 'false8.png', 'false9.png', 'false10.png'
];

// Estado da Fase 4
let currentEngineStage = -1; // -1 = Não começou, 0=Alavanca, 1=Cap, 2=Rol, 3=Voltar pro Motor
let activeItems = []; // Guarda os objetos {x, y, type, element, id}

// --- FUNÇÕES PRINCIPAIS ---

// Chamada quando termina a Fase 3 ou para teste
function initPhase4() {
    console.log("Fase 4 Iniciada: Vá para a Mecânica");
    currentMission = 4;
    currentEngineStage = -1; // Esperando primeira interação no motor
    
    // Mostra hotspot do motor
    document.getElementById('engine-hotspot').style.display = 'block';
}

// Lógica ao apertar 'E'
// Lógica ao apertar 'E' na Fase 4
function handlePhase4Interaction(playerPos) {
    console.log("Tentando interagir na Fase 4..."); // Debug

    // --- 1. Interação com o MOTOR (Mecânica) ---
    const motorSpot = document.getElementById('engine-hotspot');
    
    // Usa a função global isPlayerNearHotspot (que já calcula centro)
    if (isPlayerNearHotspot(playerPos, motorSpot.offsetLeft, motorSpot.offsetTop, 150, 150)) {
        if (currentEngineStage === -1) {
            startDialogueSequence(phase4IntroDialogues, null, () => {
                startPartSearch(0);
            });
            //startPartSearch(0);
            return;
        } else if (currentEngineStage === 3) {
            finishGamePhase4();
            return;
        } else {
            showCustomAlert("Faltam peças! Consulte o HUD abaixo.", "error");
            return;
        }
    }

    // --- 2. Interação com ITENS NO CHÃO ---
    let itemFoundIndex = -1;

    // Dimensões do Jogador (para achar o centro)
    const playerWidth = 200; 
    const playerHeight = 229;
    const playerCenterX = playerPos.x + (playerWidth / 2);
    const playerCenterY = playerPos.y + (playerHeight / 2);

    // Dimensões do Item
    const itemSize = 50; 

    // Loop para checar todos os itens ativos
    for (let i = 0; i < activeItems.length; i++) {
        const item = activeItems[i];
        
        // Calcula o centro do item
        const itemCenterX = item.x + (itemSize / 2);
        const itemCenterY = item.y + (itemSize / 2);

        // Calcula a distância entre os CENTROS
        const dist = Math.hypot(playerCenterX - itemCenterX, playerCenterY - itemCenterY);
        
        // Debug: Mostra no console a distância atual (Aperte F12 para ver)
        // console.log(`Distância do item ${i}: ${dist.toFixed(0)}px`);

        // Aumentei a tolerância para 120px (fica mais fácil pegar)
        if (dist < 120) {
            itemFoundIndex = i;
            break; 
        }
    }

    if (itemFoundIndex !== -1) {
        console.log("Item encontrado! Coletando...");
        collectItem(itemFoundIndex);
    } else {
        console.log("Nenhum item perto o suficiente.");
    }
}

// Inicia um estágio de busca (0, 1 ou 2)
function startPartSearch(stageIndex) {
    currentEngineStage = stageIndex;
    
    // UI
    engineHud.style.display = 'block';
    hudStatus.innerText = `Procure: ${truePartsConfig[stageIndex].name.toUpperCase()}`;
    engineMessage.style.display = 'none'; // Esconde msg do motor
    
    spawnItemsForStage(stageIndex);
}

// Spawna itens (1 Correto + N Falsos)
function spawnItemsForStage(stageIndex) {
    // Limpa itens anteriores
    clearActiveItems();

    const config = truePartsConfig[stageIndex];
    const totalItems = config.totalSpawns;
    
    // Lista de imagens para usar neste spawn (para não repetir)
    let availableFalseImages = [...falsePartsImages];
    // Embaralha array de falsos
    availableFalseImages.sort(() => Math.random() - 0.5);

    // Gera lista de tipos (1 verdadeiro, resto falso)
    let typesToSpawn = ['true'];
    for(let i=0; i < totalItems - 1; i++) typesToSpawn.push('false');
    
    // Embaralha a ordem de spawn (para o verdadeiro não ser sempre o primeiro)
    typesToSpawn.sort(() => Math.random() - 0.5);

    // Loop de criação
    typesToSpawn.forEach((type, index) => {
        let imgSrc;
        if (type === 'true') {
            imgSrc = config.img;
        } else {
            imgSrc = availableFalseImages[index]; // Pega um falso único
        }

        // Tenta achar posição válida (sem colisão)
        const pos = getRandomValidPosition();
        
        if (pos) {
            createItemOnMap(pos.x, pos.y, type, imgSrc, index);
        }
    });

    updateMinimapDots();
}

// Cria o elemento visual e lógico
function createItemOnMap(x, y, type, imgSrc, id) {
    const div = document.createElement('div');
    div.classList.add('map-item');
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    
    const img = document.createElement('img');
    img.src = imgSrc;
    div.appendChild(img);

    itemsContainer.appendChild(div);

    activeItems.push({
        x: x,
        y: y,
        type: type, // 'true' ou 'false'
        element: div,
        id: id
    });
}

// Tenta achar uma posição X,Y que não seja parede (preto na mask.png)
function getRandomValidPosition() {
    let attempts = 0;
    const maxAttempts = 2000; // Tenta bastante vezes
    
    // Área de busca (Evita bordas extremas do mapa)
    const minMapX = 200, maxMapX = 3900;
    const minMapY = 200, maxMapY = 3900;
    
    // Tamanho do item (para calcular as bordas)
    const itemRadius = 30; // Verifica 30px para cada lado do centro

    while (attempts < maxAttempts) {
        // 1. Sorteia um ponto central
        const testX = Math.floor(Math.random() * (maxMapX - minMapX)) + minMapX;
        const testY = Math.floor(Math.random() * (maxMapY - minMapY)) + minMapY;

        // 2. VERIFICAÇÃO DE SEGURANÇA (A Mágica acontece aqui)
        // Não basta o centro ser chão. As bordas também precisam ser!
        
        const centerOk = isWalkable(testX, testY);
        const leftOk   = isWalkable(testX - itemRadius, testY);
        const rightOk  = isWalkable(testX + itemRadius, testY);
        const topOk    = isWalkable(testX, testY - itemRadius);
        const bottomOk = isWalkable(testX, testY + itemRadius);
        
        // Só aceita se TODOS os pontos forem chão (Branco)
        if (centerOk && leftOk && rightOk && topOk && bottomOk) {
            return { x: testX, y: testY };
        }
        
        attempts++;
    }
    
    console.warn("Não achei lugar seguro. Colocando no centro de emergência.");
    return { x: 2000, y: 2000 }; 
}

function collectItem(index) {
    const item = activeItems[index];

    if (item.type === 'false') {
        showCustomAlert("Peça Incorreta! O sistema reiniciou a busca.", "error");
        spawnItemsForStage(currentEngineStage);
    } else {
        // --- ANTES: alert(`Você encontrou: ${truePartsConfig[currentEngineStage].name}!`); ---
        
        // --- DEPOIS: ---
        const partName = truePartsConfig[currentEngineStage].name;
        showCustomAlert(`Excelente! Você encontrou: ${partName}`, "success");
        
        // Atualiza HUD
        const slotId = `slot-${truePartsConfig[currentEngineStage].id}`;
        document.getElementById(slotId).classList.add('acquired');

        // Limpa TODOS os itens do mapa
        clearActiveItems();

        // Avança estágio
        const nextStage = currentEngineStage + 1;
        
        if (nextStage < truePartsConfig.length) {
            setTimeout(() => {
                startPartSearch(nextStage);
            }, 1000);
        } else {
            currentEngineStage = 3; 
            hudStatus.innerText = "VOLTE PARA A MECÂNICA!";
            hudStatus.style.color = "#00FF00";
            
            // Avisa para voltar
            setTimeout(() => {
                showCustomAlert("Todas as peças encontradas! Volte ao Motor.", "info");
            }, 2000);
            
            engineMessage.style.display = 'block'; 
        }
    }
}

function clearActiveItems() {
    activeItems.forEach(i => i.element.remove());
    activeItems = [];
    updateMinimapDots();
}

function finishGamePhase4() {
    clearActiveItems();
    engineHud.style.display = 'none';
    const engMsg = document.getElementById('engine-message');
    if (engMsg) engMsg.style.display = 'none';
    // SEQUÊNCIA FINAL:
    // 1. Toca o primeiro diálogo com áudio 1
    startDialogueSequence(finalDialogues1, 'audio-final1', () => {
        
        // 2. Quando acabar, espera 1 segundo e toca o segundo diálogo com áudio 2
        setTimeout(() => {
            startDialogueSequence(finalDialogues2, 'audio-final2', () => {
                
                // 3. Fim real (Créditos ou Reload)
                alert("FIM DE JOGO! OBRIGADO POR JOGAR.");
                location.reload();
            });
        }, 1000);
    });
}

// --- MINIMAPA ---
function updateMinimapDots() {
    // Remove pontos antigos
    const oldDots = document.querySelectorAll('.minimap-item-dot');
    oldDots.forEach(d => d.remove());

    if (!activeItems.length) return;

    const gameMapWidth = 4096;
    const gameMapHeight = 4096;
    // Precisamos das dimensões da imagem grande do minimapa
    const minimapImg = document.getElementById('minimap-large-image');
    
    // Só funciona se o minimapa estiver carregado/visível em algum momento
    // Se o display for none, clientWidth pode ser 0. 
    // Assumindo que a proporção é constante, calculamos escala.
    
    // Cálculo de escala (mesma lógica do updatePlayerOnMinimap)
    // Nota: Se o minimapa estiver fechado (display none), width pode ser 0.
    // O ideal é calcular isso quando abrir o minimapa ou garantir tamanho fixo.
    // Vamos usar style width se possível ou assumir um tamanho padrão
    
    const w = minimapImg.clientWidth || 600; // Fallback
    const h = minimapImg.clientHeight || 600;

    const scaleX = w / gameMapWidth;
    const scaleY = h / gameMapHeight;

    const container = document.getElementById('minimap-large-container');

    activeItems.forEach(item => {
        const dot = document.createElement('div');
        dot.classList.add('minimap-item-dot');
        
        const dotX = (item.x * scaleX) - 4; // -4 para centralizar (width 8)
        const dotY = (item.y * scaleY) - 4;
        
        dot.style.left = dotX + 'px';
        dot.style.top = dotY + 'px';
        
        container.appendChild(dot);
    });
}

// Precisamos chamar o updateMinimapDots sempre que abrir o minimapa
// para garantir que as posições estejam certas caso a janela tenha redimensionado
const originalToggleMinimap = toggleMinimap;
toggleMinimap = function() {
    originalToggleMinimap(); // Chama a original
    if (isMinimapOpen && currentMission === 4) {
        // Pequeno delay para garantir que o CSS renderizou o tamanho
        setTimeout(updateMinimapDots, 50); 
    }
};

// ======================================================
// === SISTEMA DE ALERTA PERSONALIZADO ===
// ======================================================

let alertTimeout; // Variável para controlar o tempo

function showCustomAlert(message, type = 'info') {
    const overlay = document.getElementById('game-alert-overlay');
    const box = document.getElementById('game-alert-box');
    const text = document.getElementById('game-alert-text');

    // 1. Define o texto
    text.innerText = message;

    // 2. Limpa classes antigas e adiciona a nova cor
    box.className = ''; // Remove tudo
    if (type === 'success') box.classList.add('alert-success');
    if (type === 'error') box.classList.add('alert-error');
    if (type === 'info') box.classList.add('alert-info');

    // 3. Mostra na tela
    overlay.style.display = 'block';

    // 4. Reseta o timer anterior (caso tenha uma msg ativa)
    clearTimeout(alertTimeout);

    // 5. Esconde automaticamente após 3 segundos
    alertTimeout = setTimeout(() => {
        overlay.style.display = 'none';
    }, 3000);
}

// --- LISTA DE TELEPORTES (Entrada e Saída) ---
const teleportSpots = [
    {
        entry: { x: 1400, y: 400 }, 
        exit: { x: 400, y: 3000 }
    },
];

let isTeleporting = false; // Trava o movimento
/*function triggerTeleport(spot) {
    if (isTeleporting) return;
    isTeleporting = true;

    const player = document.getElementById('player');
    const effectImg = document.getElementById('teleport-visual-effect');
    const gameContainer = document.getElementById('game-container');

    // 1. TOCA GIF DE ENTRADA (Onde o jogador está agora)
    // Centraliza o GIF no jogador (Player tem 200x229)
    const centerX = playerPosition.x + 100; 
    const centerY = playerPosition.y + 114;

    effectImg.style.left = centerX + 'px';
    effectImg.style.top = centerY + 'px';
    effectImg.src = 'entrando.gif' + Date.now(); // Reinicia GIF
    effectImg.style.display = 'block';

    // Esconde o jogador imediatamente
    player.style.opacity = '0';

    // 2. AGUARDA 800ms (Tempo do GIF de entrada) E FAZ O VULTO
    setTimeout(() => {
        
        // Ativa o efeito de "Vulto" na tela inteira
        gameContainer.classList.add('teleport-vulto');

        // MUDA A POSIÇÃO DO JOGADOR (Instantâneo durante o vulto)
        playerPosition.x = spot.exit.x;
        playerPosition.y = spot.exit.y;

        // Atualiza a câmera imediatamente para o novo local
        // (Copiando sua lógica de câmera para forçar atualização agora)
        const cameraWidth = document.getElementById('game-container').clientWidth;
        const cameraHeight = document.getElementById('game-container').clientHeight;
        let mapTranslateX = -playerPosition.x + (cameraWidth / 2) - (200 / 2);
        let mapTranslateY = -playerPosition.y + (cameraHeight / 2) - (229 / 2);
        document.getElementById('game-map').style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px)`;

        // POSICIONA O GIF DE SAÍDA NO NOVO LOCAL
        const newCenterX = playerPosition.x + 100;
        const newCenterY = playerPosition.y + 114;
        effectImg.style.left = newCenterX + 'px';
        effectImg.style.top = newCenterY + 'px';
        
        // Toca GIF de saída
        effectImg.src = 'saindo.gif' + Date.now();

    }, 800); // Ajuste esse tempo conforme a duração do seu GIF de entrada

    // 3. FINALIZAÇÃO (Após o vulto e GIF de saída)
    setTimeout(() => {
        // Mostra o jogador
        player.style.opacity = '1';
        
        // Esconde o efeito
        effectImg.style.display = 'none';
        
        // Remove o efeito de vulto do container
        gameContainer.classList.remove('teleport-vulto');
        
        isTeleporting = false; // Destrava controles
    }, 1600); // 800ms entrada + 800ms saída = 1.6s total
}*/
// MUDANÇA 1: Adicione 'playerPos' dentro dos parênteses
function triggerTeleport(spot, playerPos) {
    if (isTeleporting) return;
    isTeleporting = true;

    const player = document.getElementById('player');
    const effectImg = document.getElementById('teleport-visual-effect');
    const gameContainer = document.getElementById('game-container');

    // MUDANÇA 2: Use 'playerPos' em vez de 'playerPosition' aqui
    const centerX = playerPos.x + 100; 
    const centerY = playerPos.y + 114;

    effectImg.style.left = centerX + 'px';
    effectImg.style.top = centerY + 'px';
    effectImg.src = 'teleport_enter.gif?' + Date.now(); 
    effectImg.style.display = 'block';

    player.style.opacity = '0';

    setTimeout(() => {
        gameContainer.classList.add('teleport-vulto');

        // MUDANÇA 3: Atualiza a posição usando 'playerPos'
        playerPos.x = spot.exit.x;
        playerPos.y = spot.exit.y;

        const cameraWidth = document.getElementById('game-container').clientWidth;
        const cameraHeight = document.getElementById('game-container').clientHeight;
        
        // MUDANÇA 4: Use 'playerPos' aqui também
        let mapTranslateX = -playerPos.x + (cameraWidth / 2) - (200 / 2);
        let mapTranslateY = -playerPos.y + (cameraHeight / 2) - (229 / 2);
        
        document.getElementById('game-map').style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px)`;

        // MUDANÇA 5: E aqui
        const newCenterX = playerPos.x + 100;
        const newCenterY = playerPos.y + 114;
        
        effectImg.style.left = newCenterX + 'px';
        effectImg.style.top = newCenterY + 'px';
        effectImg.src = 'teleport_exit.gif?' + Date.now();

    }, 800); 

    setTimeout(() => {
        player.style.opacity = '1';
        effectImg.style.display = 'none';
        gameContainer.classList.remove('teleport-vulto');
        isTeleporting = false;
    }, 1600);
}
// ======================================================
// === DEBUG: VISUALIZADOR DE ÁREAS DE TELEPORTE ===
// ======================================================

/*function showTeleportHitboxes() {
    const map = document.getElementById('game-map');
    
    // O tamanho da área sensível (Baseado no seu código: 100x100)
    const size = 100; 
    const offset = size / 2; // 50px para centralizar

    teleportSpots.forEach((spot, index) => {
        
        // --- 1. QUADRADO DE ENTRADA (VERDE) ---
        const entryBox = document.createElement('div');
        entryBox.style.position = 'absolute';
        entryBox.style.left = (spot.entry.x - offset) + 'px';
        entryBox.style.top = (spot.entry.y - offset) + 'px';
        entryBox.style.width = size + 'px';
        entryBox.style.height = size + 'px';
        
        // Estilo visual
        entryBox.style.border = '3px solid #00FF00'; // Borda Verde Neon
        entryBox.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'; // Fundo semi-transparente
        entryBox.style.zIndex = '1000'; // Acima de tudo
        entryBox.style.pointerEvents = 'none'; // Não atrapalha o clique
        
        // Texto para identificar
        entryBox.innerHTML = `<span style="color:white; font-weight:bold; text-shadow:1px 1px black;">ENTRADA ${index + 1}</span>`;
        
        map.appendChild(entryBox);

        // --- 2. QUADRADO DE SAÍDA (VERMELHO) ---
        const exitBox = document.createElement('div');
        exitBox.style.position = 'absolute';
        exitBox.style.left = (spot.exit.x - offset) + 'px';
        exitBox.style.top = (spot.exit.y - offset) + 'px';
        exitBox.style.width = size + 'px';
        exitBox.style.height = size + 'px';
        
        // Estilo visual
        exitBox.style.border = '3px solid #FF0000'; // Borda Vermelha
        exitBox.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        exitBox.style.zIndex = '1000';
        exitBox.style.pointerEvents = 'none';
        
        // Texto
        exitBox.innerHTML = `<span style="color:white; font-weight:bold; text-shadow:1px 1px black;">SAÍDA ${index + 1}</span>`;
        
        map.appendChild(exitBox);
        
        // --- 3. LINHA CONECTANDO (OPCIONAL) ---
        // Ajuda a saber qual entrada leva a qual saída
        // (Isso é apenas visualização técnica, não precisa ser perfeito)
    });
    
    console.log("Modo Debug Ativado: Mostrando áreas de teleporte.");
}

// Ativa automaticamente quando a página carrega (para você testar)
// Remova ou comente esta linha quando for publicar o jogo!
window.addEventListener('load', () => {
    // Damos um pequeno atraso para garantir que o mapa carregou
    setTimeout(showTeleportHitboxes, 1000);
});*/
// ======================================================
// === SISTEMA DE DIÁLOGO (MÁQUINA DE ESCREVER) ===
// ======================================================

// Lista de Falas (Textos em vez de GIFs)
const introDialogues = [
    "Capitão, acordou? Estamos com falhas críticas em múltiplos sistemas após a passagem pelo campo de asteroides.",
    "Use as setas ou WASD para se mover. Fique atento aos alertas piscando.",
    "Aproxime-se dos objetos piscantes e pressione 'E' para interagir e iniciar os reparos."
];
// Fase 1: Incêndio
const phase1Dialogues = [
    "DETECTADO INCÊNDIO NO SETOR 1! O sistema de supressão manual precisa ser ativado.",
    "A tubulação está danificada. Precisamos enviar o fluido extintor pelo caminho de menor resistência.",
    "Analise a rede. Cada conexão tem um 'custo'. Clique nos nós para criar o caminho onde a soma total seja a MENOR possível.",
    "Não é sobre o caminho mais curto visualmente, mas sim a menor soma matemática!"
];

// Fase 2: Energia (Elétrica)
const phase2Dialogues = [
    "FALHA DE ENERGIA CRÍTICA. Visibilidade reduzida. Sensores inoperantes."
];

// Fase 2: Elétrica (Intro) - SEM ÁUDIO
const phase2IntroDialogues = [
    "O circuito principal queimou. Precisamos reenergizar a rede passando corrente por todos os terminais.",
    "Ligue os pontos! Você deve traçar uma linha que passe por TODOS os pontos vermelhos exatamente uma vez.",
    "Não deixe nenhum ponto de fora e não repita nenhum ponto. O circuito deve ser contínuo."
];

// Fim da Fase 2 / Alerta Fase 3 - COM ÁUDIO
const phase2EndDialogues = [
    "BRECHA NO CASCO DETECTADA! Risco de descompressão."
];

// Fase 3: Casco (Intro) - SEM ÁUDIO
const phase3IntroDialogues = [
    "Precisamos soldar placas de liga magnética na fenda. Porém, essas placas possuem polaridades instáveis.",
    "Arraste as peças para preencher os buracos. Atenção: Peças vizinhas (que se encostam) NÃO podem ter a mesma cor, ou o campo magnético falhará.",
    "Se uma peça não encaixar, verifique se ela não está encostando em outra da mesma cor. Tente outra posição!"
];

// Fim da Fase 3 / Alerta Fase 4 - COM ÁUDIO
const phase3EndDialogues = [
    "O MOTOR PRINCIPAL ESTÁ TRAVADO. O computador de bordo não consegue reiniciar."
];

// Fase 4: Motor (Intro) - SEM ÁUDIO
const phase4IntroDialogues = [
    "Precisamos substituir componentes físicos manualmente. Os sensores estão danificados e mostrando 'fantasmas' (peças falsas) pelo mapa.",
    "Encontre as peças na ordem: Alavanca > Capacitor > Rolamento. Existem várias cópias falsas espalhadas.",
    "Clique em uma peça: Se for falsa, o sistema vai recalcular e mudar as peças de lugar.",
    "Se for verdadeira, ela vai para seu inventário e a próxima busca começa."
];

// Final 1 - COM ÁUDIO
const finalDialogues1 = [
    "Diagnóstico completo. Motor Operacional. Pressão estabilizada. Energia restaurada."
];

// Final 2 - COM ÁUDIO
const finalDialogues2 = [
    "Excelente trabalho, Capitão. Estamos prontos para seguir viagem."
];

// Variáveis de Controle do Sistema de Diálogo Genérico
let activeDialogues = []; // Qual lista estamos lendo agora
let activeAudioId = null; // Qual áudio está tocando
let onDialogueFinish = null; // O que fazer quando acabar (Callback)

let currentDialogueIndex = 0;
let typingInterval;     // Controla a velocidade da digitação
let isTyping = false;   // Para saber se ainda está escrevendo

// --- SISTEMA DE DIÁLOGO GENÉRICO ---

/**
 * Inicia uma sequência de diálogo.
 * @param {Array} textArray - Lista de frases a serem ditas.
 * @param {String} audioId - ID do elemento <audio> no HTML.
 * @param {Function} callback - (Opcional) Função para rodar quando o diálogo acabar.
 */
function startDialogueSequence(textArray, audioId, callback = null) {
    isGamePaused = true;
    currentDialogueIndex = 0;
    activeDialogues = textArray; // Define qual texto vamos usar
    activeAudioId = audioId;     // Define qual áudio vamos usar
    onDialogueFinish = callback; // Salva o que fazer depois
    
    // Mostra a tela
    const overlay = document.getElementById('dialogue-overlay');
    overlay.style.display = 'flex';
    
    // Toca o áudio específico desta fala
    if (activeAudioId) {
        const audio = document.getElementById(activeAudioId);
        if (audio) {
            audio.volume = 0.5;
            audio.currentTime = 0;
            audio.play().catch(e => console.log("Erro ao tocar áudio:", e));
        }
    }
    
    playNextDialogue();
}

function playNextDialogue() {
    // Se acabaram as frases da lista atual...
    if (currentDialogueIndex >= activeDialogues.length) {
        finishDialogue();
        return;
    }

    const text = activeDialogues[currentDialogueIndex];
    const textElement = document.getElementById('typewriter-text');
    
    textElement.innerHTML = "";
    isTyping = true;
    let charIndex = 0;
    const typingSpeed = 30; // Velocidade da digitação

    clearInterval(typingInterval);

    typingInterval = setInterval(() => {
        textElement.innerHTML += text.charAt(charIndex);
        charIndex++;

        if (charIndex >= text.length) {
            clearInterval(typingInterval);
            isTyping = false;
            
            // Espera um pouco e vai para a próxima
            setTimeout(() => {
                if (currentDialogueIndex < activeDialogues.length && !isTyping) {
                    currentDialogueIndex++;
                    playNextDialogue();
                }
            }, 6500); // Tempo de leitura
        }
    }, typingSpeed);
}

function finishDialogue() {
    clearInterval(typingInterval);
    document.getElementById('dialogue-overlay').style.display = 'none';
    
    // Para o áudio que estava tocando
    if (activeAudioId) {
        const audio = document.getElementById(activeAudioId);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    isGamePaused = false;

    // Se houver uma função agendada para rodar depois (ex: abrir puzzle), roda agora!
    if (onDialogueFinish) {
        onDialogueFinish();
        onDialogueFinish = null; // Limpa para não rodar de novo
    }
}

// Controle de Espaço (Atualizado para usar activeDialogues)
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('dialogue-overlay');
    
    if (overlay.style.display === 'flex' && e.code === 'Space') {
        if (isTyping) {
            clearInterval(typingInterval);
            document.getElementById('typewriter-text').innerHTML = activeDialogues[currentDialogueIndex];
            isTyping = false;
        } else {
            currentDialogueIndex++;
            playNextDialogue();
        }
    }
});
/*function startIntroSequence() {
    isGamePaused = true;
    currentDialogueIndex = 0;
    
    const overlay = document.getElementById('dialogue-overlay');
    overlay.style.display = 'flex';
    
    // --- NOVO: TOCA O SOM ---
    const audio = document.getElementById('dialogue-audio');
    if (audio) {
        audio.volume = 0.5; // Ajuste o volume (0.0 a 1.0)
        audio.currentTime = 0; // Garante que comece do início
        audio.play().catch(e => console.log("O navegador bloqueou o áudio:", e));
    }
    // ------------------------

    playNextDialogue();
}

function playNextDialogue() {
    // Se acabaram as falas, encerra
    if (currentDialogueIndex >= introDialogues.length) {
        finishDialogue();
        return;
    }

    const text = introDialogues[currentDialogueIndex];
    const textElement = document.getElementById('typewriter-text');
    
    // Limpa o texto anterior
    textElement.innerHTML = "";
    isTyping = true;

    let charIndex = 0;
    
    // VELOCIDADE DA DIGITAÇÃO (menor = mais rápido)
    const typingSpeed = 40; 

    // Limpa intervalo anterior se houver
    clearInterval(typingInterval);

    // Começa a digitar letra por letra
    typingInterval = setInterval(() => {
        textElement.innerHTML += text.charAt(charIndex);
        charIndex++;

        // Toca som de teclado aqui se quiser (opcional)

        // Se acabou a frase
        if (charIndex >= text.length) {
            clearInterval(typingInterval);
            isTyping = false;
            
            // Aguarda 2 segundos e vai para a próxima automaticamente
            // (Ou espera o jogador apertar Espaço)
            setTimeout(() => {
                // Só avança se o jogador não tiver pulado manualmente
                if (currentDialogueIndex < introDialogues.length && !isTyping) {
                    currentDialogueIndex++;
                    playNextDialogue();
                }
            }, 3000); // Tempo de leitura após terminar de escrever
        }
    }, typingSpeed);
}

function finishDialogue() {
    clearInterval(typingInterval);
    document.getElementById('dialogue-overlay').style.display = 'none';
    
    // --- NOVO: PARA O SOM ---
    const audio = document.getElementById('dialogue-audio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0; // Reseta para a próxima vez
    }
    // ------------------------

    isGamePaused = false;
}

// Controle de Pular com ESPAÇO
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('dialogue-overlay');
    
    if (overlay.style.display === 'flex' && e.code === 'Space') {
        if (isTyping) {
            // SE ESTIVER DIGITANDO: Completa a frase instantaneamente
            clearInterval(typingInterval);
            const fullText = introDialogues[currentDialogueIndex];
            document.getElementById('typewriter-text').innerHTML = fullText;
            isTyping = false;
        } else {
            // SE JÁ TERMINOU DE DIGITAR: Vai para a próxima
            currentDialogueIndex++;
            playNextDialogue();
        }
    }
});*/
function playCutscene() {
    const overlay = document.getElementById('cutscene-overlay');
    const video = document.getElementById('cutscene-video');
    
    if (!video) {
        // Se não tiver vídeo, vai direto pro jogo
        startGameSequence(); 
        return;
    }

    // Mostra o vídeo e dá play
    overlay.style.display = 'flex';
    video.volume = 1.0;
    video.currentTime = 0;
    
    video.play().catch(e => {
        console.log("Erro ao tocar vídeo (autoplay bloqueado?):", e);
        startGameSequence(); // Se der erro, pula pro jogo
    });

    // --- EFEITO FADE OUT (Último Segundo) ---
    video.ontimeupdate = () => {
        // Se faltar menos de 1.2 segundos para acabar (margem de segurança)
        if ((video.duration - video.currentTime) < 1.2) {
            overlay.classList.add('fade-out');
        }
    };

    // --- QUANDO O VÍDEO ACABA ---
    video.onended = () => {
        finishCutscene();
    };
}

function finishCutscene() {
    const overlay = document.getElementById('cutscene-overlay');
    const video = document.getElementById('cutscene-video');
    
    // 1. Para o áudio do vídeo imediatamente
    if(video) {
        video.pause();
        video.currentTime = 0; // Reseta
    }
    
    // 2. Some com a tela do vídeo
    overlay.style.display = 'none';
    overlay.classList.remove('fade-out'); 

    // 3. AGORA SIM inicia o jogo e os áudios do jogo
    startGameSequence();
}
function startGameSequence() {
    const gameScreen = document.getElementById('game-screen');
    gameScreen.style.display = 'flex'; 
    
    console.log('Cutscene finalizada. Iniciando jogo...');

    // 1. Inicia Música de Fundo (Loop)
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.volume = 0.2; // Volume baixo para não brigar com a fala
        bgMusic.currentTime = 0;
        bgMusic.play().catch(e => console.log("Erro música:", e));
    }
    
    // 2. Carrega Colisão e Inicia o Jogo + Diálogo
    setupCollisionCanvas(() => {
        startGame(); // Inicia o loop visual e mecânicas
        
        // 3. INICIA O DIÁLOGO (Com o áudio do robô)
        // Isso garante que o áudio 'dialogo.mp3' comece APÓS o vídeo
        startDialogueSequence(introDialogues, 'dialogue-audio', null);
    }); 
}