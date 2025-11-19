
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
function isWalkable(x, y) {
    if (!collisionContext) return true;
    const pixelData = collisionContext.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const r = pixelData[0];
    return r > 200; 
}

// --- Função updatePlayerOnMinimap (Sem mudanças) ---
function updatePlayerOnMinimap(playerPosition) {
    const gameMapWidth = 4096;
    const gameMapHeight = 4096;
    const minimapDisplayWidth = minimapLargeImage.clientWidth;
    const minimapDisplayHeight = minimapLargeImage.clientHeight;
    const scaleX = minimapDisplayWidth / gameMapWidth;
    const scaleY = minimapDisplayHeight / gameMapHeight;
    const dotX = (playerPosition.x * scaleX) - (minimapPlayerDot.clientWidth / 2);
    const dotY = (playerPosition.y * scaleY) - (minimapPlayerDot.clientHeight / 2);
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
    }
}


// --- Função startGame (com adição da lógica de interação) ---
function startGame() {
    console.log('Iniciando o gameLoop...');

    const player = document.getElementById('player');
    const gameMap = document.getElementById('game-map');
    const gameContainer = document.getElementById('game-container');

    let playerPosition = {
        x: 1500, 
        y: 1250
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
        let mapTranslateX = -playerPosition.x + (cameraWidth / 2);
        let mapTranslateY = -playerPosition.y + (cameraHeight / 2);

        gameMap.style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px)`;
        
        if (isMinimapOpen) {
            updatePlayerOnMinimap(playerPosition);
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
            
            const lightRadius = 350; // Raio do 'circle 350px' do seu CSS
            const playerCenterX = playerPosition.x + (playerWidth / 2);
            const playerCenterY = playerPosition.y + (playerHeight / 2);
            const maskX = playerCenterX - lightRadius;
            const maskY = playerCenterY - lightRadius;

            gameMap.style.setProperty('--vignette-x', `${maskX}px`);
            gameMap.style.setProperty('--vignette-y', `${maskY}px`);

            // 2. Reativa a luz de alerta
            alertLight.style.animation = 'alert-pulse 4s infinite';
            
            // 3. Verifica proximidade com o NOVO hotspot
            isNearHotspot = isPlayerNearHotspot(playerPosition, elétricaHotspotX, elétricaHotspotY, elétricaHotspotWidth, elétricaHotspotHeight);
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
        // --- NOVO: Lógica da Mensagem de Interação ---
        /*if (isPlayerNearHotspot(playerPosition, hotspotX, hotspotY, hotspotWidth, hotspotHeight) && !isMissionComplete) {
            interactionMessage.style.display = 'block';
        } else {
            interactionMessage.style.display = 'none';
        }
        
        // --- NOVO: Controla a animação da luz de alerta ---
        if (isMissionComplete) {
            alertLight.style.animation = 'none';
            alertLight.style.opacity = '0';
        } else {
            alertLight.style.animation = 'alert-pulse 4s infinite';
        }
        
        // --- NOVO: Lógica da Seta Guia ---
        // Se a missão não está completa E não estamos perto do objetivo
        if (!isMissionComplete && !isNearHotspot) {
            const cameraWidth = gameContainer.clientWidth;
            const cameraHeight = gameContainer.clientHeight;
            
            // Posição do Hotspot na TELA
            const hotspotScreenX = hotspotX - playerPosition.x + (cameraWidth / 2);
            const hotspotScreenY = hotspotY - playerPosition.y + (cameraHeight / 2);
            
            // Posição do Jogador na TELA (sempre o centro)
            const playerScreenX = cameraWidth / 2;
            const playerScreenY = cameraHeight / 2;
            
            // Verifica se o hotspot está visível na tela (com uma margem de 50px)
            hotspotIsOnScreen = (
                hotspotScreenX > 50 && 
                hotspotScreenX < cameraWidth - 50 && 
                hotspotScreenY > 50 && 
                hotspotScreenY < cameraHeight - 50
            );
            
            if (hotspotIsOnScreen) {
                // Se o hotspot já está visível, esconde a seta
                missionArrow.style.display = 'none';
            } else {
                // Se estiver fora da tela, calcula o ângulo e mostra a seta
                missionArrow.style.display = 'block';
                
                // Vetor do jogador para o hotspot
                const deltaX = hotspotScreenX - playerScreenX;
                const deltaY = hotspotScreenY - playerScreenY;
                
                // Ângulo em radianos, e depois em graus
                const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                
                // Posiciona a seta no centro da tela (onde o jogador está)
                // e a rotaciona para apontar para o hotspot.
                // O 'translateX(120px)' empurra a seta para fora do centro,
                // para que ela "orbite" o jogador.
                missionArrow.style.transform = `rotate(${angle}deg) translateX(120px)`;
            }
        } else {
            // Se a missão está completa OU o jogador está perto, esconde a seta
            missionArrow.style.display = 'none';
        }*/
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
        console.log('Carregando máscara de colisão para iniciar o jogo...');
        setupCollisionCanvas(startGame); 
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
