// script.js

// HTML 요소 가져오기
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const dishImg = document.getElementById('dish-img');
const timingBar = document.getElementById('timing-bar');
const actionButton = document.getElementById('action-button');
const messageArea = document.getElementById('message-area');
const difficultySelection = document.getElementById('difficulty-selection');
const difficultyButtons = document.querySelectorAll('.difficulty-button');
const cookingArea = document.getElementById('cooking-area'); // main 태그
const gameOverMessage = document.getElementById('game-over-message');

// 새로 추가된 요소들
const gameOverPanel = document.getElementById('game-over-panel');
const restartButton = document.getElementById('restart-button');
const dishSelection = document.getElementById('dish-selection');
const dishButtons = document.querySelectorAll('.dish-button');

// --- 새로 추가된 도감 관련 DOM 요소 참조 ---
const cookbookPanel = document.getElementById('cookbook-panel');
const dishGallery = document.getElementById('dish-gallery');
const backToMenuButton = document.getElementById('back-to-menu-button');
const cookbookButton = document.getElementById('cookbook-button'); // 요리 도감 버튼

// 게임 변수
let score = 0;
let timeLeft = 120;
let gameInterval;
let barAnimationId;
let isGameRunning = false;
let currentBarPosition = 0;
let currentStageIndex = 0;

let barDirection = 1;
let barSpeed;
let targetStart;
let targetEnd;

let currentDifficulty = 'easy'; // 현재 선택된 난이도
let currentSelectedDish = 'omelet'; // 현재 선택된 요리 (기본값)

// --- 도감 데이터 저장 변수 ---
let unlockedDishes = []; // 완성된 요리 이미지 경로 및 종류를 저장할 배열

// === 난이도별 설정 ===
const difficultySettings = {
    easy: { 
        barSpeed: {
            omelet: 1.0, 
            steak: 0.75   
        }, 
        targetStart: 30, targetEnd: 70, minScoreToUnlock: 0 
    },
    normal: { 
        barSpeed: {
            omelet: 1.25, 
            steak: 0.9375 
        }, 
        targetStart: 30, targetEnd: 70, minScoreToUnlock: 30 
    },
    hard: { 
        barSpeed: {
            omelet: 1.5, 
            steak: 1.1   
        }, 
        targetStart: 30, targetEnd: 70, minScoreToUnlock: 200 
    }
};

let unlockedDifficulties = { easy: true, normal: false, hard: false };

// === 각 요리별 조리 단계 정의 (이미지 경로 확인 중요!) ===
const omeletStages = [
    { name: "계란 깨고 풀기", img: "images/egg_raw.jpg", successMsg: "계란을 완벽하게 풀었습니다!", failMsg: "계란을 엉망으로 풀었습니다!", buttonText: "준비!" },
    { name: "재료 썰기", img: "images/vegetables.jpg", successMsg: "재료를 잘게 썰었습니다!", failMsg: "재료가 큼직하네요...", buttonText: "썰기!" },
    { name: "팬 달구기 & 붓기", img: "images/pan_empty.jpg", successMsg: "계란물을 팬에 멋지게 부었습니다!", failMsg: "팬이 너무 뜨겁거나 차가워요!", buttonText: "붓기!" },
    { name: "오믈렛 뒤집기", img: "images/omelet_cooking.jpg", successMsg: "오믈렛을 완벽하게 뒤집었습니다!", failMsg: "오믈렛이 찢어졌습니다!", buttonText: "뒤집기!" },
    { name: "플레이팅", img: "images/omelet_finished.jpg", successMsg: "아름다운 오믈렛 완성!", failMsg: "플레이팅이 엉성하네요...", buttonText: "완성!", finalDishImg: "images/omelet_finished.jpg" } 
];

const steakStages = [
    { name: "스테이크 해동 및 시즈닝", img: "images/steak_raw.jpg", successMsg: "스테이크 시즈닝 완료!", failMsg: "시즈닝이 고르지 않아요!", buttonText: "시즈닝!" },
    { name: "팬 달구기", img: "images/pan_empty.jpg", successMsg: "팬이 완벽하게 달궈졌습니다!", failMsg: "팬이 너무 뜨겁거나 차가워요!", buttonText: "달구기!" },
    { name: "스테이크 굽기", img: "images/steak_cooking.jpg", successMsg: "스테이크가 멋지게 구워지고 있어요!", failMsg: "스테이크가 탔어요!", buttonText: "뒤집기!" },
    { name: "레스팅하기", img: "images/steak_resting.jpg", successMsg: "육즙 가득한 레스팅 완료!", failMsg: "육즙이 다 빠졌네요!", buttonText: "레스팅!" },
    { name: "플레이팅", img: "images/steak_finished.jpg", successMsg: "환상적인 스테이크 완성!", failMsg: "플레이팅이 엉성하네요!", buttonText: "완성!", finalDishImg: "images/steak_finished.jpg" } 
];

// 선택된 요리에 따라 동적으로 바뀔 현재 조리 과정 배열
let currentCookingStages;

// === 요리 선택 버튼 이벤트 리스너 ===
dishButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentSelectedDish = button.dataset.dish;

        dishButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        dishSelection.style.display = 'none';
        difficultySelection.style.display = 'block';
        messageArea.textContent = `'${button.textContent}' 요리, 난이도를 선택해주세요.`;
        
        updateDifficultyButtons();
    });
});

// --- 난이도 선택 버튼 이벤트 리스너 ---
difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (button.disabled) return;

        currentDifficulty = button.dataset.difficulty;
        difficultyButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        startGame(); // 난이도 선택 후 게임 시작
    });
});

// --- 초기 설정 및 난이도 상태 불러오기 ---
function loadDifficultyStatus() {
    const savedStatus = localStorage.getItem('omeletUnlockedDifficulties');
    if (savedStatus) {
        unlockedDifficulties = JSON.parse(savedStatus);
    }
    updateDifficultyButtons();
}

// --- 난이도 버튼 상태 업데이트 ---
function updateDifficultyButtons() {
    difficultyButtons.forEach(button => {
        const difficulty = button.dataset.difficulty;
        if (unlockedDifficulties[difficulty]) {
            button.disabled = false;
        } else {
            button.disabled = true;
        }
    });
}

// --- 게임 시작 함수 (이미지/바 보이도록 `display: block` 설정 추가/확인) ---
function startGame() {
    if (isGameRunning) return;
    isGameRunning = true;
    score = 0;
    timeLeft = 120;
    currentStageIndex = 0;

    // === 선택된 요리에 따라 currentCookingStages 설정 ===
    if (currentSelectedDish === 'omelet') {
        currentCookingStages = omeletStages;
    } else if (currentSelectedDish === 'steak') {
        currentCookingStages = steakStages;
    }

    scoreElement.textContent = score;
    timerElement.textContent = timeLeft;
    messageArea.textContent = ''; 
    difficultySelection.style.display = 'none';
    dishSelection.style.display = 'none'; 
    gameOverPanel.style.display = 'none';
    cookbookPanel.style.display = 'none'; 
    
    // --- 이미지, 액션 버튼, 쿠킹 영역(바 포함)을 'block'으로 설정하여 보이게 함 ---
    dishImg.style.display = 'block'; 
    actionButton.style.display = 'block'; 
    cookingArea.style.display = 'block'; // cooking-area (main 태그)를 보이게 함
    
    actionButton.disabled = false; 
    timingBar.style.width = '0%'; 
    cookingArea.style.borderColor = '#ffc107'; 

    const settings = difficultySettings[currentDifficulty];
    barSpeed = settings.barSpeed[currentSelectedDish]; 
    targetStart = settings.targetStart;
    targetEnd = settings.targetEnd;     

    gameInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame('time_out'); 
        }
    }, 1000);

    prepareNextStage(); // 첫 번째 단계 준비
}

// --- 게임 종료 함수 ---
function endGame(status = 'time_out') { 
    isGameRunning = false;
    clearInterval(gameInterval); 
    cancelAnimationFrame(barAnimationId); 
    
    // --- 게임 종료 시 이미지, 액션 버튼, 쿠킹 영역 숨김 ---
    dishImg.style.display = 'none'; 
    actionButton.style.display = 'none'; 
    cookingArea.style.display = 'none'; // cooking-area (main 태그)를 숨김

    if (status === 'win') {
        gameOverMessage.textContent = `🎉 축하합니다! 모든 요리 과정을 성공적으로 마쳤습니다! 최종 점수: ${score}점`;
        
        const finalDishImage = currentCookingStages[currentCookingStages.length - 1].finalDishImg;
        if (finalDishImage && !unlockedDishes.some(item => item.src === finalDishImage)) { 
            unlockedDishes.push({ dish: currentSelectedDish, src: finalDishImage }); 
            saveUnlockedDishes(); 
            messageArea.textContent += `\n새로운 요리를 도감에 등록했습니다!`;
        }
    } else { 
        gameOverMessage.textContent = `게임 종료! 최종 점수: ${score}점`;
    }
    
    cookingArea.style.borderColor = '#e57373'; 

    unlockNextDifficulty();
    saveDifficultyStatus(); 
    updateDifficultyButtons(); 

    gameOverPanel.style.display = 'block'; 
}

// --- 다음 조리 단계 준비 및 게이지 바 애니메이션 시작 ---
function prepareNextStage() {
    if (!isGameRunning) return;
    
    if (currentStageIndex >= currentCookingStages.length) {
        endGame('win'); 
        return;
    }

    const currentStage = currentCookingStages[currentStageIndex]; 
    dishImg.src = currentStage.img; 
    actionButton.textContent = currentStage.buttonText; 

    currentBarPosition = 0; 
    barDirection = 1; 
    timingBar.style.width = '0%';
    timingBar.style.backgroundColor = '#ffb300';
    messageArea.textContent = '';
    actionButton.disabled = false;

    barAnimationId = requestAnimationFrame(animateTimingBar);
}

// --- 게이지 바 왕복 애니메이션 함수 ---
function animateTimingBar() {
    if (!isGameRunning) {
        cancelAnimationFrame(barAnimationId);
        return;
    }

    if (currentSelectedDish === 'steak') {
        currentBarPosition += barSpeed; 

        if (currentBarPosition >= 100) {
            currentBarPosition = 100; 
            timingBar.style.width = `${currentBarPosition}%`; 

            messageArea.textContent = currentCookingStages[currentStageIndex].failMsg; 
            score -= 10; 
            scoreElement.textContent = score;

            actionButton.disabled = true;
            cancelAnimationFrame(barAnimationId); 

            setTimeout(() => {
                currentStageIndex++; 
                if (timeLeft <= 0) { 
                    endGame('time_out'); 
                } else {
                    prepareNextStage(); 
                }
            }, 1500); 

            return; 
        }
    } else {
        currentBarPosition += barSpeed * barDirection;

        if (currentBarPosition >= 100) {
            currentBarPosition = 100;
            barDirection = -1;
        } else if (currentBarPosition <= 0) {
            currentBarPosition = 0;
            barDirection = 1;
        }
    }

    timingBar.style.width = `${currentBarPosition}%`;
    barAnimationId = requestAnimationFrame(animateTimingBar);
}

// --- 액션 버튼 클릭 시 로직 ---
actionButton.addEventListener('click', () => {
    if (!isGameRunning || actionButton.disabled) return;

    cancelAnimationFrame(barAnimationId);
    actionButton.disabled = true;

    const currentStage = currentCookingStages[currentStageIndex]; 

    let isSuccess = false;
    if (currentBarPosition >= targetStart && currentBarPosition <= targetEnd) {
        messageArea.textContent = currentStage.successMsg + ` (+10점)`;
        score += 10;
        timingBar.style.backgroundColor = '#4caf50';
        isSuccess = true;
    } else {
        messageArea.textContent = currentStage.failMsg + ` (-5점)`;
        score = Math.max(0, score - 5);
        timingBar.style.backgroundColor = '#d32f2f';
    }
    scoreElement.textContent = score;
    
    currentStageIndex++; 

    setTimeout(() => {
        if (isSuccess && currentStageIndex >= currentCookingStages.length) { 
             endGame('win');
        } else if (timeLeft <=0 ) { 
            endGame('time_out');
        } else { 
            prepareNextStage(); 
        }
    }, 1200);
});

// --- 난이도 해금 로직 ---
function unlockNextDifficulty() {
    let currentDifficultyKeys = Object.keys(difficultySettings);
    let currentDifficultyIndex = currentDifficultyKeys.indexOf(currentDifficulty);
    let nextDifficultyKey = currentDifficultyKeys[currentDifficultyIndex + 1];

    if (nextDifficultyKey && !unlockedDifficulties[nextDifficultyKey]) {
        const requiredScore = difficultySettings[nextDifficultyKey].minScoreToUnlock;
        if (score >= requiredScore) {
            unlockedDifficulties[nextDifficultyKey] = true;
            messageArea.textContent += `\n새로운 난이도 '${nextDifficultyKey}' 해금!`;
        }
    }
}

// --- 해금 상태를 로컬 스토리지에 저장 ---
function saveDifficultyStatus() {
    localStorage.setItem('omeletUnlockedDifficulties', JSON.stringify(unlockedDifficulties));
}

// --- 도감 데이터 저장 함수 ---
function saveUnlockedDishes() {
    localStorage.setItem('unlockedDishes', JSON.stringify(unlockedDishes));
}

// --- 도감 데이터 불러오기 함수 ---
function loadUnlockedDishes() {
    const savedDishes = localStorage.getItem('unlockedDishes');
    if (savedDishes) {
        unlockedDishes = JSON.parse(savedDishes);
    }
}

// --- 도감(Cookbook) 화면 표시 함수 ---
function showCookbook() {
    dishSelection.style.display = 'none';
    difficultySelection.style.display = 'none';
    cookingArea.style.display = 'none'; // 도감 열 때 게임 화면 숨김
    gameOverPanel.style.display = 'none';
    cookbookPanel.style.display = 'block';

    dishGallery.innerHTML = ''; // 갤러리 초기화

    if (unlockedDishes.length === 0) { 
        dishGallery.innerHTML = '<p>아직 완성된 요리가 없습니다. 요리하여 도감을 채워보세요!</p>';
    } else {
        unlockedDishes.forEach(dishItem => { 
            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');
            const img = document.createElement('img');
            img.src = dishItem.src; 
            img.alt = `${dishItem.dish} 완성`; 
            galleryItem.appendChild(img);
            dishGallery.appendChild(galleryItem);
        });
    }
}

// --- 게임 다시 시작 함수 (전체 초기화 및 패널 숨김) ---
function restartGame() {
    isGameRunning = false;
    score = 0;
    timeLeft = 120;
    currentStageIndex = 0;
    currentSelectedDish = 'omelet'; 
    barSpeed = 0;
    currentBarPosition = 0;
    barDirection = 1;

    scoreElement.textContent = score;
    timerElement.textContent = timeLeft;
    messageArea.textContent = '원하는 요리를 선택하세요.';
    timingBar.style.width = '0%';
    timingBar.style.backgroundColor = '#ffb300';
    cookingArea.style.borderColor = '#ffc107';

    // 모든 패널 및 게임 요소 숨김
    gameOverPanel.style.display = 'none';
    cookbookPanel.style.display = 'none';
    dishImg.style.display = 'none';
    actionButton.style.display = 'none';
    cookingArea.style.display = 'none'; // cooking-area (main 태그)를 숨김
    difficultySelection.style.display = 'none';
    
    showDishSelection(); // 요리 선택 화면 표시

    // 요리 선택 버튼 초기화
    dishButtons.forEach(btn => btn.classList.remove('selected'));
    document.querySelector('.dish-button[data-dish="omelet"]').classList.add('selected'); 
    updateDifficultyButtons();
}

// --- 요리 선택 화면 표시 함수 ---
function showDishSelection() {
    dishSelection.style.display = 'block';
    difficultySelection.style.display = 'none';
    cookingArea.style.display = 'none'; // 요리 선택 화면일 때 게임 영역 숨김
    gameOverPanel.style.display = 'none';
    cookbookPanel.style.display = 'none'; 
}

// --- "다시하기" 버튼 이벤트 리스너 ---
restartButton.addEventListener('click', () => {
    restartGame();
});

// --- "메뉴로 돌아가기" 버튼 이벤트 리스너 (도감 패널 내) ---
if (backToMenuButton) { 
    backToMenuButton.addEventListener('click', () => {
        showDishSelection(); 
    });
}

// --- "요리 도감" 버튼 이벤트 리스너 ---
if (cookbookButton) { 
    cookbookButton.addEventListener('click', showCookbook);
}


// --- 페이지 로드 시 초기화 및 UI 설정 ---
document.addEventListener('DOMContentLoaded', () => {
    loadDifficultyStatus(); 
    loadUnlockedDishes(); // 도감 데이터 불러오기
    
    // 초기 UI 설정: 요리 선택 패널만 보이고 나머지는 숨김
    dishSelection.style.display = 'block'; 
    document.querySelector('.dish-button[data-dish="omelet"]').classList.add('selected'); 
    currentSelectedDish = 'omelet'; 

    dishImg.style.display = 'none';
    actionButton.style.display = 'none';
    gameOverPanel.style.display = 'none';
    difficultySelection.style.display = 'none';
    cookbookPanel.style.display = 'none';
    cookingArea.style.display = 'none'; // 초기 로드 시 cooking-area 숨김

    messageArea.textContent = '원하는 요리를 선택하세요.';
});