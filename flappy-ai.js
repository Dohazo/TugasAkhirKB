const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const genDisplay = document.getElementById('gen');
const highDisplay = document.getElementById('highScore');
const gameOverDisplay = document.getElementById('gameOver');

// Variable game
const bird = { x: 50, y: 500, width: 20, height: 20, gravity: 5, lift: -15, velocity: 0 };
const pipes = [];
const pipeWidth = 30;
const pipeGap = 200;
const pipeFrequency = 130;
let frameCount = 0;
let score = 0;
let highsScore = 0;
let gen = 0
let gameOver = false;

// Variable Qlearning
let Q = {};
const gamma = 0.99;
const alpha = 0.1;
let epsilon = 1;
const epsilonDecay = 0.995;
const epsilonMin = 0.01;
const totalEpisodes = 1000;

// Data buat Graph python
let graph = [];

function getState() {
    const birdY = Math.floor(bird.y / canvas.height * 10);
    const pipeX = pipes[0] ? Math.floor(pipes[0].x / canvas.width * 10) : 0;
    const pipeGapY = pipes[0] ? Math.floor(pipes[0].gapY / canvas.height * 10) : 0;
    return `${birdY},${pipeX},${pipeGapY}`;
}

function getQValue(state, action) {
    return Q[state] && Q[state][action] ? Q[state][action] : 0;
}

function setQValue(state, action, value) {
    if (!Q[state]) Q[state] = {};
    Q[state][action] = value;
}

function chooseAction(state) {
    var random = Math.random();
    // console.log("Random: " + random);
    // console.log("epsilon: " + epsilon);
    if (random < epsilon) {
        // console.log("Random");
        return Math.random() < 0.5 ? 0 : 1; // Random action: 0 (No Flap) atau 1 (Flap)
    } else {
        // console.log("mikir");
        const qNoFlap = getQValue(state, 0);
        const qFlap = getQValue(state, 1);
        return qNoFlap > qFlap ? 0 : 1; // Pilih action yang Q valuenya terbesar
    }
}

function updateQ(state, action, reward, nextState) {
    const qCurrent = getQValue(state, action);
    const qNextMax = Math.max(getQValue(nextState, 0), getQValue(nextState, 1));
    const qNew = qCurrent + alpha * (reward + gamma * qNextMax - qCurrent);
    setQValue(state, action, qNew);
}

function resetGame() {
    if (score > highsScore) {
        highsScore = score;
    }
    // console.log(bird.y);
    bird.y = 500;
    bird.velocity = 0;
    pipes.length = 0;
    frameCount = 0;
    score = 0;
    gameOver = false;
    gameOverDisplay.style.display = 'none';
    scoreDisplay.textContent = `Score: ${score}`;
    genDisplay.textContent = `gen: ${gen}`;
    highDisplay.textContent = `High Score: ${highsScore}`;
}

function trainAgent(totalEpisodes) {
    for (let episode = 0; episode < totalEpisodes; episode++) {
        resetGame();
        let state = getState();
        let done = false;
        while (!done) {
            const action = chooseAction(state);
            const result = step(action);
            updateQ(state, action, result.reward, result.nextState);
            state = result.nextState;
            done = result.done;
        }
        if (epsilon > epsilonMin) {epsilon *= epsilonDecay};
    }
    // console.log(Q);
}

let timeSurvived = 0;
function step(action) {
    if (action === 1) bird.velocity = bird.lift;
    bird.velocity += bird.gravity;
    if(!(bird.y + bird.velocity >= canvas.height) && !(bird.y + bird.velocity <= 0)){
        bird.y += bird.velocity;
    }

    if (frameCount % pipeFrequency === 0) {
        const gapY = Math.floor(Math.random() * (canvas.height - pipeGap));
        pipes.push({ x: canvas.width, gapY });
    }

    for (const pipe of pipes) {
        pipe.x -= 2;
        if (pipe.x + pipeWidth < 0) pipes.shift();
        if (pipe.x === bird.x) score++;
    }

    const nextState = getState();
    let reward = -1;
    let done = false;

    if (pipes.some(pipe => 
        bird.x < pipe.x + pipeWidth && bird.x + bird.width > pipe.x && 
        (bird.y < pipe.gapY || bird.y + bird.height > pipe.gapY + pipeGap))) {
        reward = -1000;
        done = true;
        gameOver = true;
        gameOverDisplay.style.display = 'block';
        return { nextState, reward, done };
    } else if (pipes.some(pipe => bird.x === pipe.x)) {
        reward = 10;
    }

    scoreDisplay.textContent = `Score: ${score}`;
    return { nextState, reward, done };
}

function drawBird() {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
    ctx.fillStyle = 'green';
    for (const pipe of pipes) {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
        ctx.fillRect(pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBird();
    drawPipes();
}

function update() {
    if (!gameOver) {
        const state = getState();
        const action = chooseAction(state);
        const result = step(action);
        updateQ(state, action, result.reward, result.nextState);
        draw();
        frameCount++;
    } else {
        // console.log(Q);
        gen++;
        graph.push(score);
        resetGame();
    }
    requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => { 
	
    if (e.key == 's') { 
        saveQ();
        console.log("Saved");
        console.log(Q);
    } 
    if (e.key == 'l') { 
        loadQ();
        console.log("Loaded");
        console.log(Q);
    } 

    if (e.key == 'd') { 
        saveFile();
        console.log("Downloaded");
        console.log(Q);
    } 

    if (e.key == 'f') { 
        loadFile();
        console.log("File Loaded");
        console.log(Q);
    } 
    }); 

function saveQ() {
    localStorage.setItem('Q', JSON.stringify(Q));
    localStorage.setItem('Gen', JSON.stringify(gen));
}

function loadQ() {
    const savedQ = localStorage.getItem('Q');
    const savedGen = localStorage.getItem('Gen');
    if (savedQ) {
        Q = JSON.parse(savedQ);
    }

    if(savedGen){
        gen = JSON.parse(savedGen);
        genDisplay.textContent = `gen: ${gen}`;
    }
}

function saveFile() {
    const data = JSON.stringify(Q, null, 2); // Serialize Q to JSON with 2 spaces indentation

    // Create a Blob object containing the JSON data
    const blob = new Blob([data], { type: 'application/json' });

    // Create a link element
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Q.json';

    // Trigger a click event on the link to initiate download
    a.click();

    // Cleanup
    URL.revokeObjectURL(a.href);

    saveStats();
}

function loadFile(){
    fetch('Q.json')
    .then(response => response.json())
    .then(data => {
      // Loop through the keys and add them to the Q object
      Object.keys(data).forEach(key => {
        Q[key] = data[key];
      });
    })
    .catch(error => console.error('Error:', error));

    loadStats();
}

function saveStats(){
    const data = JSON.stringify(graph, null, 2); // Serialize Q to JSON with 2 spaces indentation

    // Create a Blob object containing the JSON data
    const blob = new Blob([data], { type: 'application/json' });

    // Create a link element
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'graph.json';

    // Trigger a click event on the link to initiate download
    a.click();

    // Cleanup
    URL.revokeObjectURL(a.href);
}

function loadStats(){
   fetch('graph.json') // Replace 'your_file.json' with the path to your JSON file
  .then(response => response.json())
  .then(data => {
    graph = data; // Assign the parsed JSON array directly to the graph variable

    // Now you can work with your graph array here
    console.log(graph);
    gen = graph.length;
    genDisplay.textContent = `gen: ${gen}`;
  })
  .catch(error => console.error('Error:', error));
}



// Train the agent and start the game
trainAgent(totalEpisodes);
resetGame();
update();