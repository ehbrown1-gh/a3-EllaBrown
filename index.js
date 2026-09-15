const gameContainer = document.querySelector("#game-container");
const scoreText = document.querySelector("#score-text");
const resetButton = document.querySelector("#reset-button");
const timerText = document.querySelector("#timer-text");

const scoreForm = document.querySelector("#score-form");
const leaderboard = document.querySelector("#leaderboard");
const resultsBody = document.querySelector("#results-body");
const submissionStatus = document.querySelector("#submission-status");
const accountArea = document.querySelector("#account-area");

const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;

const SLING_X = 140;
const SLING_Y = 380;

let engine;
let render;
let runner;
let mouseConstraint;

let ball;
let sling;
let targets = [];

let score = 0;
let firing = false;
let roundResetTimer = null;

const NUM_TARGETS = 4;
const TARGET_MIN_Y = 130;
const TARGET_MAX_Y = 360;
const TARGET_RESPAWN_DELAY = 900;

let gameId = 0;

const ROUND_SECONDS = 60;
let timeRemaining = ROUND_SECONDS;
let timerInterval = null;
let roundOver = false;

let sessionSubmitted = false;

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers: {
            ...(options.body ? {"Content-Type": "application/json"} : {}),
            ...(options.headers || {})
        }
    });

    let data = {};
    try {
        data = await response.json();
    } catch (_) {}

    if (response.status === 401) {
        window.location.href = "/";
        throw new Error("Your login session has expired.");
    }

    if (!response.ok) {
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

async function loadAccount() {
    const account = await apiRequest("/api/me");
    accountArea.innerHTML = "";

    const label = document.createElement("span");
    label.textContent = `Logged in as ${account.displayName}`;

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "nes-btn is-error";
    logout.textContent = "Log out";
    logout.addEventListener("click", async () => {
        await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
        window.location.href = "/";
    });

    accountArea.append(label, logout);
    sessionSubmitted = account.submittedThisSession;
    updateSubmissionState();
}

async function loadData() {
    try {
        const data = await apiRequest("/api/data");
        renderResults(data);
    } catch (error) {
        console.error(error);
    }
}

function updateSubmissionState() {
    if (sessionSubmitted) {
        submissionStatus.textContent =
            "This login session has already submitted a score. You cannot submit another one until you log in again.";
        scoreForm.querySelector("button[type='submit']").disabled = true;
    } else {
        submissionStatus.textContent = "You may submit one score during this login session.";
        scoreForm.querySelector("button[type='submit']").disabled = false;
    }
}

async function sendEntry(entry) {
    const data = await apiRequest("/api/data", {
        method: "POST",
        body: JSON.stringify(entry)
    });
    sessionSubmitted = true;
    updateSubmissionState();
    renderResults(data);
}

scoreForm.addEventListener("submit", submitScore);

async function submitScore(event) {
    event.preventDefault();

    if (sessionSubmitted) {
        alert("You have already submitted a score during this login session.");
        return;
    }

    try {
        await sendEntry({
            name: document.querySelector("#game-name").value,
            score: Number(document.querySelector("#score-input").value)
        });

        scoreForm.reset();
        document.querySelector("#score-input").value = 0;
        alert("Your score was added!");
    } catch (error) {
        alert(error.message);
    }
}

function renderResults(data) {
    leaderboard.innerHTML = "";

    const scoredEntries = data
        .filter(item => Number(item.score) > 0)
        .sort((a, b) => Number(b.score) - Number(a.score));

    scoredEntries.slice(0, 10).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.name} — ${item.score} points`;
        leaderboard.appendChild(li);
    });

    if (scoredEntries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No scores yet.";
        leaderboard.appendChild(li);
    }

    resultsBody.innerHTML = "";

    data.forEach((item) => {
        const row = document.createElement("tr");

        const values = [
            item.name,
            item.score,
            new Date(item.submittedAt).toLocaleString(),
            item.scoreLevel
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "nes-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editEntry(item));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "nes-btn is-error";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteEntry(item._id));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);
        resultsBody.appendChild(row);
    });
}

async function deleteEntry(id) {
    if (!confirm("Delete this entry?")) return;

    try {
        const data = await apiRequest(`/api/data/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
        renderResults(data);
    } catch (error) {
        alert(error.message);
    }
}

async function editEntry(item) {
    const name = prompt("Name:", item.name);
    if (name === null) return;

    const scoreValue = prompt("Score:", item.score);
    if (scoreValue === null) return;

    try {
        const data = await apiRequest(`/api/data/${encodeURIComponent(item._id)}`, {
            method: "PUT",
            body: JSON.stringify({
                name,
                score: Number(scoreValue)
            })
        });
        renderResults(data);
    } catch (error) {
        alert(error.message);
    }
}

function startTimer() {
    timeRemaining = ROUND_SECONDS;
    timerText.textContent = `Time: ${timeRemaining}`;
    roundOver = false;

    clearInterval(timerInterval);
    timerInterval = setInterval(function () {
        timeRemaining--;
        timerText.textContent = `Time: ${timeRemaining}`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            endRound();
        }
    }, 1000);
}

function endRound() {
    roundOver = true;

    if (mouseConstraint) {
        mouseConstraint.constraint.stiffness = 0;
    }
}

//SCORE

function updateScore(points) {
    score += points;
    scoreText.textContent = `Score: ${score}`;
}


//CREATE BALL

function makeBall() {
    return Matter.Bodies.circle(
        SLING_X,
        SLING_Y,
        20,
        {
            restitution: 0.5,
            friction: 0.01,
            density: 0.004
        }
    );
}


//CREATE SLINGSHOT

function makeSling(body) {
    return Matter.Constraint.create({
        pointA: {
            x: SLING_X,
            y: SLING_Y
        },
        bodyB: body,
        stiffness: 0.05,
        length: 0
    });
}


//CREATE TARGETS

function makeTarget(slot) {

    const baseX = 560 + slot * 65;
    const baseY = (TARGET_MIN_Y + TARGET_MAX_Y) / 2;

    const body = Matter.Bodies.polygon(
        baseX,
        baseY,
        8,
        26,
        {
            isStatic: true,
            restitution: 0.2,
            friction: 0.8,
            render: {
                fillStyle: "#f39c12"
            }
        }
    );

    return {
        body: body,
        slot: slot,
        baseX: baseX,
        baseY: baseY,
        amplitude: (TARGET_MAX_Y - TARGET_MIN_Y) / 2 - 10,
        speed: 0.0012 + Math.random() * 0.0015,
        phase: Math.random() * Math.PI * 2
    };
}

function makeTargets() {
    const list = [];
    for (let slot = 0; slot < NUM_TARGETS; slot++) {
        list.push(makeTarget(slot));
    }
    return list;
}

function removeTarget(body) {

    const index = targets.findIndex(function (t) {
        return t.body === body;
    });

    if (index === -1) {
        return;
    }

    const slot = targets[index].slot;
    const thisGameId = gameId;

    targets.splice(index, 1);
    Matter.World.remove(engine.world, body);

    setTimeout(
        function () {

            // Only respawn if the game hasn't been reset in the meantime
            if (thisGameId !== gameId) {
                return;
            }

            const meta = makeTarget(slot);
            targets.push(meta);
            Matter.World.add(engine.world, meta.body);
        },
        TARGET_RESPAWN_DELAY
    );
}


//CREATE GAME

function createGame() {

    gameId++;

    gameContainer.innerHTML = "";

    engine = Matter.Engine.create();

    engine.world.gravity.y = 1;

    render = Matter.Render.create({
        element: gameContainer,
        engine: engine,
        options: {
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            wireframes: false,
            background: "#bad7dd"
        }
    });

    runner = Matter.Runner.create();


    //BOUNDARIES

    const ground = Matter.Bodies.rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 10,
        GAME_WIDTH,
        20,
        {
            isStatic: true,
            render: {
                fillStyle: "#555555"
            }
        }
    );

    const leftWall = Matter.Bodies.rectangle(
        0,
        GAME_HEIGHT / 2,
        20,
        GAME_HEIGHT,
        {
            isStatic: true
        }
    );

    const rightWall = Matter.Bodies.rectangle(
        GAME_WIDTH,
        GAME_HEIGHT / 2,
        20,
        GAME_HEIGHT,
        {
            isStatic: true
        }
    );

    ball = makeBall();

    ball.render.fillStyle = "#e74c3c";

    function spawnNewBall() {
        ball = makeBall();
        ball.render.fillStyle = "#e74c3c";
        sling = makeSling(ball);

        Matter.World.add(engine.world, [ball, sling]);
    }


    sling = makeSling(ball);

    targets = makeTargets();


    //MOUSE CONTROL

    const mouse = Matter.Mouse.create(render.canvas);

    mouseConstraint = Matter.MouseConstraint.create(
        engine,
        {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        }
    );

    render.mouse = mouse;


    //DETECT WHEN BALL IS FIRED

    firing = false;

    Matter.Events.on(
        mouseConstraint,
        "enddrag",
        function (event) {

            if (event.body === ball) {
                firing = true;
            }
        }
    );


    //MOVE TARGETS

    Matter.Events.on(
        engine,
        "beforeUpdate",
        function (event) {

            const time = event.timestamp;

            targets.forEach(function (meta) {

                const y = meta.baseY + Math.sin(time * meta.speed + meta.phase) * meta.amplitude;

                Matter.Body.setPosition(
                    meta.body,
                    {
                        x: meta.baseX,
                        y: y
                    }
                );
            });
        }
    );


    //COLLISION DETECTION

    Matter.Events.on(
        engine,
        "collisionStart",
        function (event) {

            event.pairs.forEach(function (pair) {

                let bodyA = pair.bodyA;
                let bodyB = pair.bodyB;

                let hitTargetBody = null;

                if (bodyA === ball && targets.some(function (t) { return t.body === bodyB; })) {
                    hitTargetBody = bodyB;
                } else if (bodyB === ball && targets.some(function (t) { return t.body === bodyA; })) {
                    hitTargetBody = bodyA;
                }

                if (hitTargetBody) {
                    updateScore(10);
                    removeTarget(hitTargetBody);
                    
                    if (ball) {
                        Matter.World.remove(engine.world, ball);
                        ball = null;
                        firing = false;
                        clearTimeout(roundResetTimer);

                        roundResetTimer = setTimeout(spawnNewBall, 700);
                    }
                }
            });
        }
    );


    //AFTER ENGINE UPDATE

    Matter.Events.on(
        engine,
        "afterUpdate",
        function () {

            if (!firing || !ball) {
                return;
            }

            const distanceFromSling = Math.sqrt(
                Math.pow(ball.position.x - SLING_X, 2) +
                Math.pow(ball.position.y - SLING_Y, 2)
            );

            if (distanceFromSling > 50) {

                if (sling) {
                    Matter.World.remove(
                        engine.world,
                        sling
                    );

                    sling = null;
                }

                firing = false;

                clearTimeout(roundResetTimer);

                roundResetTimer = setTimeout(spawnNewBall, 700);
            }
        }
    );


    //ADD EVERYTHING TO WORLD

    Matter.World.add(
        engine.world,
        [
            ground,
            leftWall,
            rightWall,
            ball,
            sling,
            mouseConstraint
        ]
    );

    Matter.World.add(
        engine.world,
        targets.map(function (meta) {
            return meta.body;
        })
    );


    //START GAME

    Matter.Runner.run(
        runner,
        engine
    );

    Matter.Render.run(
        render
    );

    startTimer();
}


//RESET GAME

resetButton.addEventListener(
    "click",
    function () {

        if (runner) {
            Matter.Runner.stop(runner);
        }

        if (render) {
            Matter.Render.stop(render);
        }

        clearTimeout(roundResetTimer);
        clearInterval(timerInterval);

        score = 0;
        scoreText.textContent = "Score: 0";

        createGame();
    }
);

loadData();
createGame();
