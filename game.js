const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("start-button");
const scoreLabel = document.getElementById("score");
const speedLabel = document.getElementById("speed-multiplier");
const effectLabel = document.getElementById("effect-name");
const leaderboardList = document.getElementById("leaderboard-list");
const refreshLeaderboardBtn = document.getElementById("refresh-leaderboard");
const nameOverlay = document.getElementById("name-overlay");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("player-name");
const nameError = document.getElementById("name-error");
const playerDisplay = document.getElementById("player-display");
const editNameBtn = document.getElementById("edit-name-btn");
const jumpSound = document.getElementById("jump-sound");
const scoreSound = document.getElementById("score-sound");
const livesCountLabel = document.getElementById("lives-count");
const speedKmhLabel = document.getElementById("speed-kmh");

const SUPABASE = {
    url: "https://kwgpwqsezwyzukxonjeh.supabase.co",
    anonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Z3B3cXNlend5enVreG9uamVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDk0ODQsImV4cCI6MjA3OTcyNTQ4NH0.VDE2BJLrqjUqWcIwES2b2Dq89hrHr8XeJaIgY_Uea1A",
};

const SUPABASE_HEADERS = {
    apikey: SUPABASE.anonKey,
    Authorization: `Bearer ${SUPABASE.anonKey}`,
    "Content-Type": "application/json",
};

const CONFIG = {
    baseSpeed: 360, // px per second
    gravity: 2600,
    jumpVelocity: -950,
    coyoteMs: 120,
    jumpBufferMs: 150,
    milestoneScore: 5000,
    milestoneIncrement: 0.15,
    maxSpeedMultiplier: 3,
    scoreRate: 0.25, // points per ms
    dustSpawnIntervalMs: 70,
    maxLives: 3,
    pixelsPerMeter: 100,
    lifeBonusInterval: 3,
    patternScoreGap: { min: 2400, max: 4200 },
    scoreFrenzyMultiplier: 2.2,
    difficultyStepScore: 2500,
    minObstacleGap: 120,
    spawnRules: {
        baseIntervalMs: 1500,
        minIntervalMs: 850,
        intervalVariance: 0.25,
        difficultyRampMs: 45,
        safeMinGap: 240,
        gapDecayPerDifficulty: 5,
        maxSameTypeStreak: 2,
        maxActiveObstacles: 2,
        globalCooldownMs: 320,
        laneCooldownMs: {
            ground: 420,
            aerial: 520,
            vertical: 560,
        },
    },
    laneLimits: {
        ground: 1,
        aerial: 1,
        vertical: 1,
    },
};

const LEADERBOARD_LIMIT = 10;

const evergreenPalette = {
    foliage: ["#245b31", "#2f7343", "#35844f"],
    trunk: "#5c3b1e",
    snow: "#f6fbff",
};

const OBSTACLE_TYPES = [
    {
        name: "tree-single",
        weight: 3,
        minWidth: 24,
        maxWidth: 32,
        minHeight: 36,
        maxHeight: 56,
        renderMode: "tree",
        palette: evergreenPalette,
        treeLayers: 3,
        hitbox: { left: 4, right: 4, top: 2, bottom: 2 },
        minGap: 180,
        lane: "ground",
    },
    {
        name: "tree-double",
        weight: 2,
        minWidth: 44,
        maxWidth: 58,
        minHeight: 44,
        maxHeight: 68,
        renderMode: "tree",
        palette: evergreenPalette,
        treeLayers: 4,
        hitbox: { left: 6, right: 6, top: 4, bottom: 2 },
        minGap: 220,
        lane: "ground",
    },
    {
        name: "pterodactyl",
        weight: 1,
        width: 54,
        height: 26,
        color: "#444",
        elevationRange: { min: 32, max: 90 },
        minSpeedMultiplier: 1.1,
        flutterSpeed: 280,
        speedOffsetRange: [-30, 20],
        hitbox: { left: 4, right: 4, top: 4, bottom: 4 },
        lane: "aerial",
    },
    {
        name: "snowball",
        weight: 2,
        width: 46,
        height: 46,
        renderMode: "snowball",
        behavior: "rolling",
        rollScale: 1.2,
        hitbox: { left: 4, right: 4, top: 4, bottom: 4 },
        minDifficulty: 1,
        minGap: 240,
        lane: "ground",
    },
    {
        name: "icicle",
        weight: 1.5,
        width: 26,
        height: 70,
        renderMode: "icicle",
        behavior: "falling",
        gravity: 2400,
        dropDelayRange: [120, 420],
        spawnElevation: 140,
        hitbox: { left: 6, right: 6, top: 10, bottom: 6 },
        minDifficulty: 1,
        lane: "vertical",
    },
    {
        name: "meteor",
        weight: 1,
        width: 38,
        height: 24,
        renderMode: "meteor",
        behavior: "meteor",
        verticalSpeed: -220,
        trailColor: "#ffb65c",
        hitbox: { left: 6, right: 6, top: 4, bottom: 8 },
        minDifficulty: 2,
        lane: "vertical",
    },
];

const PATTERN_BUILDERS = [
    { name: "tree-volley", weight: 3, minDifficulty: 0, handler: spawnTreeVolley },
    { name: "ptera-chase", weight: 2, minDifficulty: 1, handler: spawnPterodactylChase },
    { name: "snowball-rush", weight: 2, minDifficulty: 1, handler: spawnSnowballRush },
    { name: "icicle-storm", weight: 1.5, minDifficulty: 1, handler: spawnIcicleStorm },
    { name: "meteor-rain", weight: 1, minDifficulty: 2, handler: spawnMeteorRain },
];

const POWERUP_TYPES = {
    shield: {
        label: "Shield",
        color: "#89e5ff",
        glow: "#c5f2ff",
        size: 28,
        durationMs: 8000,
        hits: 1,
        altitude: 50,
    },
    slowmo: {
        label: "Slow-Mo",
        color: "#ffe082",
        glow: "#fff7c7",
        size: 30,
        durationMs: 5000,
        speedScale: 0.55,
        altitude: 110,
    },
    doublejump: {
        label: "Air Dash",
        color: "#b085ff",
        glow: "#e4d1ff",
        size: 28,
        durationMs: 6000,
        altitude: 90,
    },
    phase: {
        label: "Phase Shift",
        color: "#7cf7ff",
        glow: "#c3fbff",
        size: 34,
        durationMs: 4000,
        altitude: 70,
    },
    frenzy: {
        label: "Score Frenzy",
        color: "#ff8a65",
        glow: "#ffd3c4",
        size: 30,
        durationMs: 5000,
        altitude: 120,
        scoreMultiplier: CONFIG.scoreFrenzyMultiplier,
    },
};

const POWERUP_SCHEDULE = [
    { type: "shield", firstScore: 4000, interval: 6000 },
    { type: "slowmo", firstScore: 6500, interval: 6000 },
    { type: "doublejump", firstScore: 2500, interval: 5500 },
    { type: "phase", firstScore: 5200, interval: 7000 },
    { type: "frenzy", firstScore: 3200, interval: 6200 },
];

const GAME_STATE = {
    running: false,
    crashed: false,
    score: 0,
    speedMultiplier: 1,
    postedScore: false,
    lives: CONFIG.maxLives,
};

const effects = {
    shield: { active: false, remainingMs: 0, hitsLeft: 0 },
    slowmo: { active: false, remainingMs: 0 },
    doublejump: { active: false, remainingMs: 0 },
    phase: { active: false, remainingMs: 0 },
    frenzy: { active: false, remainingMs: 0 },
};

const WORLD = {
    width: canvas.width,
    height: canvas.height,
    groundHeight: 70,
};

WORLD.groundY = WORLD.height - WORLD.groundHeight;

const dino = {
    x: 120,
    y: WORLD.groundY,
    width: 46,
    height: 50,
    velocityY: 0,
    grounded: true,
    animationMs: 0,
    extraJumpAvailable: false,
};

const clouds = [];
const obstacles = [];
const powerups = [];
const particles = [];
const ambientFlakes = [];
const nextPowerupScore = {};
let nextPatternScore = 0;
let lastLifeBonusMilestone = 0;
let patternCooldownMs = 0;
const SPAWN_STATE = {
    lastType: null,
    repeatCount: 0,
};
const LANE_KEYS = ["ground", "aerial", "vertical"];

function createLaneLockMap() {
    return LANE_KEYS.reduce((locks, lane) => {
        locks[lane] = 0;
        return locks;
    }, {});
}

const SPAWN_MANAGER = {
    queue: [],
    delayMs: 0,
    laneLocks: createLaneLockMap(),
    globalLockUntil: 0,
};

let nextSpeedMilestoneScore = CONFIG.milestoneScore;

let lastTimestamp = 0;
let globalTimeMs = 0;
let spawnCountdownMs = 0;
let coyoteTimerMs = 0;
let jumpBufferTimerMs = 0;
let dustTimerMs = 0;
let wasGroundedLastFrame = true;
let playerName = localStorage.getItem("mrDinoPlayerName") ?? "";

function updatePlayerDisplay() {
    if (!playerDisplay) return;
    playerDisplay.textContent = playerName || "Not set";
}

function setPlayerName(name) {
    playerName = name;
    localStorage.setItem("mrDinoPlayerName", playerName);
    updatePlayerDisplay();
}

function updateLivesDisplay() {
    if (!livesCountLabel) return;
    livesCountLabel.textContent = `${GAME_STATE.lives}`;
}

function getCurrentSpeedKmh() {
    const pxPerSecond = CONFIG.baseSpeed * getEffectiveSpeedMultiplier();
    const metersPerSecond = pxPerSecond / CONFIG.pixelsPerMeter;
    return metersPerSecond * 3.6;
}

function resetRunState({ preserveScore = false, preserveSpeed = false } = {}) {
    GAME_STATE.running = true;
    GAME_STATE.crashed = false;
    GAME_STATE.postedScore = false;

    if (!preserveScore) {
        GAME_STATE.score = 0;
    }
    if (!preserveSpeed) {
        GAME_STATE.speedMultiplier = 1;
        nextSpeedMilestoneScore = CONFIG.milestoneScore;
    }

    obstacles.length = 0;
    powerups.length = 0;
    particles.length = 0;
    seedSkyLayers();
    deactivateShield();
    deactivateSlowmo();
    deactivateDoublejump();
    deactivatePhase();
    deactivateFrenzy();

    dino.y = WORLD.groundY;
    dino.velocityY = 0;
    dino.grounded = true;
    dino.animationMs = 0;
    dino.extraJumpAvailable = false;

    coyoteTimerMs = 0;
    jumpBufferTimerMs = 0;
    spawnCountdownMs = 600;
    dustTimerMs = 0;
    wasGroundedLastFrame = true;
    lastTimestamp = 0;
    globalTimeMs = 0;

    patternCooldownMs = 0;
    resetSpawnQueues({ clearHistory: true });
    updateEffectLabel();
}

function resetGame() {
    GAME_STATE.lives = CONFIG.maxLives;
    updateLivesDisplay();
    initializePowerupSchedule();
    scheduleNextPattern(0);
    lastLifeBonusMilestone = 0;
    nextSpeedMilestoneScore = CONFIG.milestoneScore;
    resetRunState();
}

function seedSkyLayers() {
    clouds.length = 0;
    for (let i = 0; i < 4; i += 1) {
        clouds.push({
            x: Math.random() * WORLD.width,
            y: 30 + Math.random() * 70,
            speed: 25 + Math.random() * 20,
            depth: 0.6 + Math.random() * 0.6,
        });
    }
    seedAmbientSnow();
}

function scheduleNextPattern(baseScore = GAME_STATE.score) {
    const gap = randomBetween(CONFIG.patternScoreGap.min, CONFIG.patternScoreGap.max);
    nextPatternScore = baseScore + gap;
}

function seedAmbientSnow() {
    ambientFlakes.length = 0;
    for (let i = 0; i < 32; i += 1) {
        ambientFlakes.push(createAmbientFlake());
    }
}

function createAmbientFlake() {
    return {
        x: Math.random() * WORLD.width,
        y: Math.random() * WORLD.height,
        speed: 15 + Math.random() * 25,
        drift: -15 + Math.random() * 30,
        size: 1 + Math.random() * 2,
    };
}

function initializePowerupSchedule() {
    POWERUP_SCHEDULE.forEach((slot) => {
        nextPowerupScore[slot.type] = slot.firstScore;
    });
}

function scheduleNextSpawn() {
    const rules = CONFIG.spawnRules;
    const difficulty = getDifficultyLevel();
    const falloff = difficulty * (rules.difficultyRampMs ?? 0);
    const baseInterval = Math.max(rules.minIntervalMs, rules.baseIntervalMs - falloff);
    const variance = randomBetween(1 - rules.intervalVariance, 1 + rules.intervalVariance);
    spawnCountdownMs = Math.max(rules.minIntervalMs, baseInterval * variance);
}

function spawnObstacle(templateOverride = null, options = {}) {
    const difficulty = getDifficultyLevel();
    const candidates = OBSTACLE_TYPES.filter((type) => {
        const meetsSpeed = (type.minSpeedMultiplier ?? 0) <= GAME_STATE.speedMultiplier;
        const meetsDifficulty = (type.minDifficulty ?? 0) <= difficulty;
        return meetsSpeed && meetsDifficulty;
    });
    const template = templateOverride ?? weightedRandom(candidates);
    if (!template) return null;
    if (!options.ignoreLaneLimit && !canSpawnInLane(template.lane ?? "ground")) {
        return null;
    }
    if (!options.ignoreLocks && !canSpawnWithLocks(template)) {
        return null;
    }

    const width = options.width ?? template.width ?? randomBetween(template.minWidth, template.maxWidth);
    const height = options.height ?? template.height ?? randomBetween(template.minHeight, template.maxHeight);
    const spawnElevation = template.spawnElevation ?? 0;
    const baseY = WORLD.groundY - height - spawnElevation;
    const defaultStartX = WORLD.width + width + (options.offsetX ?? 0);
    const baseStartX = options.startX ?? defaultStartX;
    const templateGap = template.minGap ?? CONFIG.minObstacleGap;
    const minGap = options.minGap ?? templateGap;
    const safeStartX = options.ignoreGlobalGap
        ? baseStartX
        : Math.max(baseStartX, getFurthestObstacleEdge() + minGap);
    const speedOffset = (() => {
        if (options.speedOffset !== undefined) return options.speedOffset;
        if (template.speedOffsetRange) {
            const [min, max] = template.speedOffsetRange;
            return randomBetween(min, max);
        }
        return template.speedOffset ?? 0;
    })();
    const obstacle = {
        x: safeStartX,
        y: options.startY ?? baseY,
        width,
        height,
        type: template.name,
        lane: template.lane ?? "ground",
        hitbox: { ...(template.hitbox ?? {}) },
        speedOffset,
        animationTimer: 0,
        flutterSpeed: template.flutterSpeed ?? 0,
        passed: false,
        renderMode: template.renderMode ?? "rect",
        palette: template.palette,
        treeLayers: template.treeLayers ?? 3,
        color: template.color ?? "#2f2f2f",
        behavior: template.behavior ?? null,
        vy: options.initialVy ?? 0,
        gravity: template.gravity,
        dropDelay:
            options.dropDelay ??
            (template.dropDelayRange
                ? randomBetween(template.dropDelayRange[0], template.dropDelayRange[1])
                : template.dropDelay ?? 0),
        verticalSpeed: template.verticalSpeed ?? options.verticalSpeed ?? 0,
        rotation: 0,
        rollScale: template.rollScale ?? 1,
        trailColor: template.trailColor,
    };

    if (template.elevationRange && options.startY === undefined) {
        const elevation = randomBetween(template.elevationRange.min, template.elevationRange.max);
        obstacle.y -= elevation;
    }

    obstacles.push(obstacle);
    if (!options.ignoreLocks) {
        recordSpawnLocks(template);
    }
    return obstacle;
}

// Procedure ensures random spawns respect spacing, difficulty, and repetition caps.
function attemptProceduralSpawn() {
    const template = pickNextProceduralTemplate();
    if (!template) return;
    const minGap = getDynamicMinGap(template);
    const spawned = spawnObstacle(template, { minGap });
    if (spawned) {
        recordSpawnHistory(template.name);
    }
}

// Picks a weighted obstacle while avoiding streaks of the same type.
function pickNextProceduralTemplate() {
    const difficulty = getDifficultyLevel();
    const candidates = OBSTACLE_TYPES.filter((type) => {
        const meetsSpeed = (type.minSpeedMultiplier ?? 0) <= GAME_STATE.speedMultiplier;
        const meetsDifficulty = (type.minDifficulty ?? 0) <= difficulty;
        return meetsSpeed && meetsDifficulty;
    });
    if (!candidates.length) return null;

    const streakLimitReached =
        SPAWN_STATE.lastType && SPAWN_STATE.repeatCount >= CONFIG.spawnRules.maxSameTypeStreak;
    if (streakLimitReached && candidates.length > 1) {
        const filtered = candidates.filter((type) => type.name !== SPAWN_STATE.lastType);
        if (filtered.length) {
            return weightedRandom(filtered);
        }
    }

    return weightedRandom(candidates);
}

// Shrinks obstacle gaps as difficulty rises without crossing the global safety minimum.
function getDynamicMinGap(template) {
    const rules = CONFIG.spawnRules;
    const baseGap = template.minGap ?? CONFIG.minObstacleGap;
    const reduction = getDifficultyLevel() * rules.gapDecayPerDifficulty;
    return Math.max(rules.safeMinGap, baseGap - reduction);
}

// Tracks the last spawned template to block repetitive sequences.
function recordSpawnHistory(typeName) {
    if (SPAWN_STATE.lastType === typeName) {
        SPAWN_STATE.repeatCount += 1;
    } else {
        SPAWN_STATE.lastType = typeName;
        SPAWN_STATE.repeatCount = 1;
    }
}

function getFurthestObstacleEdge() {
    if (!obstacles.length) return -Infinity;
    return obstacles.reduce((max, obs) => Math.max(max, obs.x + obs.width), -Infinity);
}

function spawnPowerup(type) {
    const definition = POWERUP_TYPES[type];
    if (!definition) return;
    if (powerups.some((p) => p.type === type)) return;

    powerups.push({
        type,
        x: WORLD.width + definition.size + 20,
        y: WORLD.groundY - definition.size - definition.altitude,
        size: definition.size,
        pulse: 0,
    });
}

function getObstacleTemplateByName(name) {
    return OBSTACLE_TYPES.find((type) => type.name === name) ?? null;
}

function getPatternOrigin(extraGap = CONFIG.minObstacleGap) {
    const ahead = Math.max(WORLD.width + 160, getFurthestObstacleEdge() + extraGap);
    return ahead;
}

function resetSpawnQueues({ clearHistory = false } = {}) {
    SPAWN_MANAGER.queue.length = 0;
    SPAWN_MANAGER.delayMs = 0;
    SPAWN_MANAGER.globalLockUntil = 0;
    for (const lane of LANE_KEYS) {
        SPAWN_MANAGER.laneLocks[lane] = 0;
    }
    if (clearHistory) {
        SPAWN_STATE.lastType = null;
        SPAWN_STATE.repeatCount = 0;
    }
}

function getActiveObstacleCount() {
    let count = 0;
    for (const obstacle of obstacles) {
        if (!obstacle.passed) {
            count += 1;
        }
    }
    return count;
}

function canSpawnWithLocks(template) {
    const rules = CONFIG.spawnRules;
    if (!template) return false;
    if (rules.maxActiveObstacles && getActiveObstacleCount() >= rules.maxActiveObstacles) {
        return false;
    }
    if (globalTimeMs < SPAWN_MANAGER.globalLockUntil) {
        return false;
    }
    const lane = template.lane ?? "ground";
    const laneLock = SPAWN_MANAGER.laneLocks[lane] ?? 0;
    if (globalTimeMs < laneLock) {
        return false;
    }
    return true;
}

function recordSpawnLocks(template) {
    const rules = CONFIG.spawnRules;
    const lane = template.lane ?? "ground";
    const laneCooldowns = rules.laneCooldownMs ?? {};
    const laneCooldown = laneCooldowns[lane] ?? laneCooldowns.default ?? 320;
    SPAWN_MANAGER.laneLocks[lane] = globalTimeMs + laneCooldown;
    const globalCooldown = rules.globalCooldownMs ?? 300;
    SPAWN_MANAGER.globalLockUntil = globalTimeMs + globalCooldown;
}

function canSpawnInLane(lane) {
    const limit = CONFIG.laneLimits?.[lane] ?? Infinity;
    if (!Number.isFinite(limit)) return true;
    let active = 0;
    for (const obstacle of obstacles) {
        if (obstacle.lane === lane && !obstacle.passed) {
            active += 1;
            if (active >= limit) {
                return false;
            }
        }
    }
    return true;
}

function enqueuePatternSequence(entries = [], initialDelayMs = 0) {
    if (!entries.length) return;
    const wasIdle = SPAWN_MANAGER.queue.length === 0;
    SPAWN_MANAGER.queue.push(...entries);
    if (wasIdle) {
        SPAWN_MANAGER.delayMs = Math.max(0, initialDelayMs);
    }
}

function processSpawnQueue(deltaMs) {
    if (!SPAWN_MANAGER.queue.length) return false;
    SPAWN_MANAGER.delayMs = Math.max(0, SPAWN_MANAGER.delayMs - deltaMs);
    if (SPAWN_MANAGER.delayMs > 0) return true;
    const next = SPAWN_MANAGER.queue[0];
    const template = typeof next.templateName === "string" ? getObstacleTemplateByName(next.templateName) : next.templateName;
    const options = typeof next.buildOptions === "function" ? next.buildOptions() : { ...(next.options ?? {}) };

    if (!template) {
        SPAWN_MANAGER.queue.shift();
        SPAWN_MANAGER.delayMs = next?.waitMs ?? 0;
        return SPAWN_MANAGER.queue.length > 0 || SPAWN_MANAGER.delayMs > 0;
    }

    const spawned = spawnObstacle(template, options ?? {});
    if (spawned) {
        SPAWN_MANAGER.queue.shift();
        SPAWN_MANAGER.delayMs = next.waitMs ?? 0;
        recordSpawnHistory(template.name);
    } else {
        SPAWN_MANAGER.delayMs = Math.max(90, next.waitMs ?? 150);
    }
    return SPAWN_MANAGER.queue.length > 0 || SPAWN_MANAGER.delayMs > 0;
}

function spawnTreeVolley() {
    const spacing = 320;
    const entries = [];
    for (let i = 0; i < 2; i += 1) {
        const templateName = i % 2 === 0 ? "tree-double" : "tree-single";
        const offsetIndex = i;
        entries.push({
            templateName,
            buildOptions: () => {
                const template = getObstacleTemplateByName(templateName);
                return {
                    startX: getPatternOrigin(spacing) + offsetIndex * spacing,
                    minGap: template?.minGap ?? CONFIG.minObstacleGap,
                };
            },
            waitMs: 320,
        });
    }
    enqueuePatternSequence(entries);
}

function spawnPterodactylChase() {
    const template = getObstacleTemplateByName("pterodactyl");
    if (!template) return;
    const spacing = 280;
    const flockSize = 2; // keep aerial formations manageable
    const entries = [];
    for (let i = 0; i < flockSize; i += 1) {
        const offsetIndex = i;
        entries.push({
            templateName: "pterodactyl",
            buildOptions: () => {
                const tpl = getObstacleTemplateByName("pterodactyl");
                return {
                    startX: getPatternOrigin(spacing) + offsetIndex * spacing,
                    startY:
                        WORLD.groundY - tpl.height - (tpl.elevationRange?.min ?? 40) - offsetIndex * 12,
                    speedOffset: -40 + offsetIndex * 20,
                };
            },
            waitMs: 260,
        });
    }
    enqueuePatternSequence(entries);
}

function spawnSnowballRush() {
    const template = getObstacleTemplateByName("snowball");
    if (!template) return;
    const spacing = 360;
    const volleySize = 2;
    const entries = [];
    for (let i = 0; i < volleySize; i += 1) {
        const offsetIndex = i;
        entries.push({
            templateName: "snowball",
            buildOptions: () => {
                const tpl = getObstacleTemplateByName("snowball");
                return {
                    startX: getPatternOrigin(spacing) + offsetIndex * spacing,
                    speedOffset: -20 + offsetIndex * 10,
                    minGap: tpl.minGap,
                };
            },
            waitMs: 320,
        });
    }
    enqueuePatternSequence(entries);
}

function spawnIcicleStorm() {
    const template = getObstacleTemplateByName("icicle");
    if (!template) return;
    const spacing = 220;
    const entries = [];
    for (let i = 0; i < 3; i += 1) {
        const offsetIndex = i;
        entries.push({
            templateName: "icicle",
            buildOptions: () => {
                const tpl = getObstacleTemplateByName("icicle");
                return {
                    startX: getPatternOrigin(spacing) + offsetIndex * spacing,
                    dropDelay: 120 + offsetIndex * 70,
                    minGap: tpl?.minGap ?? CONFIG.minObstacleGap,
                };
            },
            waitMs: 220,
        });
    }
    enqueuePatternSequence(entries);
}

function spawnMeteorRain() {
    const template = getObstacleTemplateByName("meteor");
    if (!template) return;
    const spacing = 260;
    const entries = [];
    for (let i = 0; i < 3; i += 1) {
        const offsetIndex = i;
        entries.push({
            templateName: "meteor",
            buildOptions: () => {
                const tpl = getObstacleTemplateByName("meteor");
                return {
                    startX: getPatternOrigin(spacing) + offsetIndex * spacing,
                    startY: 60 + offsetIndex * 20,
                    verticalSpeed: -180 - offsetIndex * 20,
                    minGap: tpl?.minGap ?? CONFIG.minObstacleGap,
                };
            },
            waitMs: 220,
        });
    }
    enqueuePatternSequence(entries);
}

function maybeTriggerPattern() {
    if (SPAWN_MANAGER.queue.length) return;
    if (!Number.isFinite(nextPatternScore) || GAME_STATE.score < nextPatternScore) return;
    runPatternForDifficulty();
    scheduleNextPattern(GAME_STATE.score);
    patternCooldownMs = 1800;
}

function runPatternForDifficulty() {
    const difficulty = getDifficultyLevel();
    const pool = PATTERN_BUILDERS.filter((pattern) => difficulty >= (pattern.minDifficulty ?? 0));
    if (!pool.length) return;
    const selection = weightedRandom(pool);
    selection?.handler?.();
    SPAWN_STATE.lastType = null;
    SPAWN_STATE.repeatCount = 0;
}

function update(deltaMs) {
    if (!GAME_STATE.running) return;

    const clampedDelta = Math.min(deltaMs, 32);
    const dt = clampedDelta / 1000;

    updateEffects(clampedDelta);

    if (dino.grounded) {
        coyoteTimerMs = CONFIG.coyoteMs;
    } else if (coyoteTimerMs > 0) {
        coyoteTimerMs = Math.max(0, coyoteTimerMs - clampedDelta);
    }

    if (jumpBufferTimerMs > 0) {
        jumpBufferTimerMs = Math.max(0, jumpBufferTimerMs - clampedDelta);
        if (coyoteTimerMs > 0) {
            performJump();
            jumpBufferTimerMs = 0;
        }
    }

    dino.velocityY += CONFIG.gravity * dt;
    dino.y += dino.velocityY * dt;

    if (dino.y >= WORLD.groundY) {
        dino.y = WORLD.groundY;
        dino.velocityY = 0;
        dino.grounded = true;
    } else {
        dino.grounded = false;
    }

    if (!wasGroundedLastFrame && dino.grounded) {
        spawnLandingBurst();
        if (effects.doublejump.active) {
            dino.extraJumpAvailable = true;
        }
    }
    wasGroundedLastFrame = dino.grounded;
    dino.animationMs += clampedDelta * (dino.grounded ? getEffectiveSpeedMultiplier() : 0.6);

    const queueActive = processSpawnQueue(clampedDelta);
    if (!queueActive) {
        patternCooldownMs = Math.max(0, patternCooldownMs - clampedDelta);
        if (patternCooldownMs <= 0) {
            spawnCountdownMs -= clampedDelta;
            if (spawnCountdownMs <= 0) {
                attemptProceduralSpawn();
                scheduleNextSpawn();
            }
        }
    }

    const effectiveMultiplier = getEffectiveSpeedMultiplier();
    const baseSpeed = CONFIG.baseSpeed * effectiveMultiplier;

    updateObstacles(clampedDelta, dt, baseSpeed);

    updateClouds(dt);
    updatePowerupSchedule();
    updatePowerups(dt, baseSpeed);
    handlePowerupPickup();
    maybeTriggerPattern();

    emitDust(clampedDelta);
    updateParticles(clampedDelta);

    let scoreGain = Math.floor(clampedDelta * CONFIG.scoreRate * effectiveMultiplier);
    if (effects.frenzy.active) {
        scoreGain = Math.floor(scoreGain * (POWERUP_TYPES.frenzy.scoreMultiplier ?? CONFIG.scoreFrenzyMultiplier));
    }
    GAME_STATE.score += scoreGain;

    const milestone = Math.floor(GAME_STATE.score / CONFIG.milestoneScore);
    let speedIncreased = false;
    while (
        GAME_STATE.score >= nextSpeedMilestoneScore &&
        GAME_STATE.speedMultiplier < CONFIG.maxSpeedMultiplier
    ) {
        GAME_STATE.speedMultiplier = Math.min(
            CONFIG.maxSpeedMultiplier,
            GAME_STATE.speedMultiplier + CONFIG.milestoneIncrement,
        );
        nextSpeedMilestoneScore += CONFIG.milestoneScore;
        speedIncreased = true;
    }

    if (speedIncreased) {
        scoreSound?.pause();
        if (scoreSound) scoreSound.currentTime = 0;
        scoreSound?.play().catch(() => {});
    }

    maybeAwardBonusLife(milestone);

    const collided = effects.phase.active ? null : detectCollision();
    if (collided) {
        if (effects.shield.active && effects.shield.hitsLeft > 0) {
            effects.shield.hitsLeft -= 1;
            if (effects.shield.hitsLeft <= 0) {
                deactivateShield();
            }
            const idx = obstacles.indexOf(collided);
            if (idx >= 0) obstacles.splice(idx, 1);
            spawnLandingBurst();
        } else {
            GAME_STATE.running = false;
            GAME_STATE.crashed = true;
            handleLifeLoss();
        }
    }
}

function updateEffects(deltaMs) {
    if (effects.shield.active) {
        effects.shield.remainingMs -= deltaMs;
        if (effects.shield.remainingMs <= 0) {
            deactivateShield();
        }
    }
    if (effects.slowmo.active) {
        effects.slowmo.remainingMs -= deltaMs;
        if (effects.slowmo.remainingMs <= 0) {
            deactivateSlowmo();
        }
    }
    if (effects.doublejump.active) {
        effects.doublejump.remainingMs -= deltaMs;
        if (effects.doublejump.remainingMs <= 0) {
            deactivateDoublejump();
        }
    }
    if (effects.phase.active) {
        effects.phase.remainingMs -= deltaMs;
        if (effects.phase.remainingMs <= 0) {
            deactivatePhase();
        }
    }
    if (effects.frenzy.active) {
        effects.frenzy.remainingMs -= deltaMs;
        if (effects.frenzy.remainingMs <= 0) {
            deactivateFrenzy();
        }
    }
}

function updatePowerupSchedule() {
    for (const slot of POWERUP_SCHEDULE) {
        const nextScore = nextPowerupScore[slot.type];
        if (nextScore === undefined) continue;
        if (GAME_STATE.score >= nextScore) {
            spawnPowerup(slot.type);
            nextPowerupScore[slot.type] = nextScore + slot.interval;
        }
    }
}

function updatePowerups(dt, baseSpeed) {
    for (const powerup of powerups) {
        powerup.x -= baseSpeed * 0.85 * dt;
        powerup.pulse = (powerup.pulse ?? 0) + dt;
    }

    for (let i = powerups.length - 1; i >= 0; i -= 1) {
        if (powerups[i].x + powerups[i].size < -40) {
            powerups.splice(i, 1);
        }
    }
}

function handlePowerupPickup() {
    if (!powerups.length) return;
    const dinoBox = {
        left: dino.x + 4,
        right: dino.x + dino.width - 4,
        top: dino.y - dino.height + 4,
        bottom: dino.y - 4,
    };

    for (let i = powerups.length - 1; i >= 0; i -= 1) {
        const pu = powerups[i];
        const box = {
            left: pu.x,
            right: pu.x + pu.size,
            top: pu.y,
            bottom: pu.y + pu.size,
        };
        if (boxesOverlap(dinoBox, box)) {
            applyPowerup(pu.type);
            powerups.splice(i, 1);
        }
    }
}

function updateObstacles(deltaMs, dt, baseSpeed) {
    for (const obstacle of obstacles) {
        obstacle.x -= (baseSpeed + (obstacle.speedOffset ?? 0)) * dt;
        obstacle.animationTimer += deltaMs;

        if (!obstacle.passed && obstacle.x + obstacle.width < dino.x) {
            obstacle.passed = true;
            GAME_STATE.score += 125;
        }

        switch (obstacle.behavior) {
            case "rolling":
                obstacle.rotation += (baseSpeed * dt * obstacle.rollScale) / Math.max(obstacle.width, 1);
                obstacle.y = WORLD.groundY - obstacle.height;
                break;
            case "falling":
                if (obstacle.dropDelay > 0) {
                    obstacle.dropDelay = Math.max(0, obstacle.dropDelay - deltaMs);
                } else {
                    obstacle.vy = (obstacle.vy ?? 0) + (obstacle.gravity ?? CONFIG.gravity) * dt;
                    obstacle.y += obstacle.vy * dt;
                    if (obstacle.y > WORLD.groundY - obstacle.height) {
                        obstacle.y = WORLD.groundY - obstacle.height;
                        obstacle.vy = 0;
                    }
                }
                break;
            case "meteor":
                obstacle.y += (obstacle.verticalSpeed ?? -160) * dt;
                spawnMeteorTrail(obstacle);
                break;
            default:
                break;
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const obs = obstacles[i];
        if (obs.x + obs.width < -80 || obs.y > WORLD.height + 120) {
            obstacles.splice(i, 1);
        }
    }
}

function spawnMeteorTrail(obstacle) {
    if (Math.random() > 0.45) return;
    addDustParticle({
        x: obstacle.x + obstacle.width / 2,
        y: obstacle.y + obstacle.height / 2,
        vx: -180 - Math.random() * 80,
        vy: 40 * (Math.random() - 0.5),
        radius: 2 + Math.random() * 2,
        life: 260,
        tint: "255, 172, 104",
    });
}

function emitDust(deltaMs) {
    if (!dino.grounded) return;
    dustTimerMs += deltaMs * getEffectiveSpeedMultiplier();
    while (dustTimerMs > CONFIG.dustSpawnIntervalMs) {
        dustTimerMs -= CONFIG.dustSpawnIntervalMs;
        addDustParticle({
            x: dino.x + 10 + Math.random() * 16,
            y: dino.y - 3,
            vx: -120 - Math.random() * 80,
            vy: -40 - Math.random() * 20,
            radius: 2 + Math.random() * 2,
            life: 420,
        });
    }
}

function spawnLandingBurst() {
    for (let i = 0; i < 6; i += 1) {
        const angle = Math.random() * Math.PI - Math.PI / 2;
        addDustParticle({
            x: dino.x + 14,
            y: dino.y - 2,
            vx: Math.cos(angle) * (80 + Math.random() * 60) - CONFIG.baseSpeed * 0.1,
            vy: Math.sin(angle) * (60 + Math.random() * 30),
            radius: 2 + Math.random() * 3,
            life: 360,
        });
    }
}

function spawnLifeBurst() {
    for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
        addDustParticle({
            x: dino.x + dino.width / 2,
            y: dino.y - dino.height,
            vx: Math.cos(angle) * (120 + Math.random() * 60),
            vy: Math.sin(angle) * (90 + Math.random() * 40),
            radius: 2 + Math.random() * 2,
            life: 480,
            tint: "255, 120, 180",
        });
    }
}

function addDustParticle({ x, y, vx, vy, radius, life, tint }) {
    particles.push({
        x,
        y,
        vx,
        vy,
        radius,
        life,
        maxLife: life,
        tint,
    });
}

function updateParticles(deltaMs) {
    const dt = deltaMs / 1000;
    for (const particle of particles) {
        particle.life -= deltaMs;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateClouds(dt) {
    for (const cloud of clouds) {
        cloud.x -= cloud.speed * dt * cloud.depth;
        if (cloud.x < -80) {
            cloud.x = WORLD.width + Math.random() * 120;
            cloud.y = 30 + Math.random() * 70;
            cloud.depth = 0.6 + Math.random() * 0.6;
        }
    }
}

function updateAmbientSnow(deltaMs) {
    const dt = deltaMs / 1000;
    for (const flake of ambientFlakes) {
        flake.x += flake.drift * dt;
        flake.y += flake.speed * dt;
        if (flake.y > WORLD.height + 10) {
            flake.y = -10;
            flake.x = Math.random() * WORLD.width;
        }
        if (flake.x < -20) {
            flake.x = WORLD.width + 10;
        } else if (flake.x > WORLD.width + 20) {
            flake.x = -10;
        }
    }
}

function drawGround() {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    skyGradient.addColorStop(0, "#07152e");
    skyGradient.addColorStop(0.35, "#0f2957");
    skyGradient.addColorStop(0.7, "#1c3f68");
    skyGradient.addColorStop(1, "#2c2b3c");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    drawAuroraBands();
    drawDistantHills();
    drawNearRidge();

    const iceGradient = ctx.createLinearGradient(0, WORLD.groundY, 0, WORLD.height);
    iceGradient.addColorStop(0, "#dfe7ff");
    iceGradient.addColorStop(1, "#a6b8d3");
    ctx.fillStyle = iceGradient;
    ctx.fillRect(0, WORLD.groundY, WORLD.width, WORLD.groundHeight);

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(0, WORLD.groundY - 4, WORLD.width, 4);

    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    for (let i = 0; i < WORLD.width; i += 130) {
        ctx.fillRect(i, WORLD.groundY + 16, 70, 3);
    }
}

function drawAuroraBands() {
    const bandCount = 3;
    for (let i = 0; i < bandCount; i += 1) {
        const offset = (globalTimeMs * 0.00015 + i * 0.3) % 1;
        const gradient = ctx.createLinearGradient(0, 0, WORLD.width, 0);
        gradient.addColorStop(0, "rgba(123, 255, 248, 0)");
        gradient.addColorStop(0.3, "rgba(123, 255, 248, 0.35)");
        gradient.addColorStop(0.6, "rgba(255, 141, 209, 0.32)");
        gradient.addColorStop(1, "rgba(255, 141, 209, 0)");
        ctx.save();
        ctx.translate(0, 80 + i * 25);
        ctx.rotate(Math.sin(globalTimeMs * 0.00015 + i) * 0.05);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.6 - i * 0.15;
        ctx.beginPath();
        ctx.moveTo(-50, 20 * Math.sin(offset * Math.PI * 2));
        ctx.bezierCurveTo(
            WORLD.width * 0.25,
            -20 + 20 * Math.sin(offset * 5),
            WORLD.width * 0.75,
            20 + 18 * Math.cos(offset * 4),
            WORLD.width + 50,
            -10 * Math.sin(offset * 3),
        );
        ctx.lineTo(WORLD.width + 50, 80);
        ctx.lineTo(-50, 80);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawDistantHills() {
    const horizon = WORLD.groundY - 80;
    ctx.fillStyle = "rgba(64, 97, 160, 0.45)";
    ctx.beginPath();
    ctx.moveTo(0, horizon + 60);
    ctx.quadraticCurveTo(WORLD.width * 0.2, horizon, WORLD.width * 0.45, horizon + 40);
    ctx.quadraticCurveTo(WORLD.width * 0.7, horizon + 120, WORLD.width, horizon + 30);
    ctx.lineTo(WORLD.width, WORLD.groundY);
    ctx.lineTo(0, WORLD.groundY);
    ctx.closePath();
    ctx.fill();
}

function drawNearRidge() {
    const ridgeY = WORLD.groundY - 45;
    ctx.fillStyle = "rgba(36, 63, 118, 0.65)";
    ctx.beginPath();
    ctx.moveTo(0, ridgeY + 50);
    ctx.quadraticCurveTo(WORLD.width * 0.2, ridgeY, WORLD.width * 0.38, ridgeY + 25);
    ctx.quadraticCurveTo(WORLD.width * 0.6, ridgeY + 70, WORLD.width, ridgeY + 18);
    ctx.lineTo(WORLD.width, WORLD.groundY);
    ctx.lineTo(0, WORLD.groundY);
    ctx.closePath();
    ctx.fill();
}

function drawClouds() {
    for (const cloud of clouds) {
        const scale = 0.8 + (1.2 - cloud.depth) * 0.5;
        const alpha = 0.4 + (1.2 - cloud.depth) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, 36 * scale, 16 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cloud.x - 18 * scale, cloud.y + 4 * scale, 22 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawAmbientSnow() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    for (const flake of ambientFlakes) {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPowerups() {
    for (const pu of powerups) {
        const def = POWERUP_TYPES[pu.type];
        if (!def) continue;
        const glowPulse = 0.4 + 0.2 * Math.sin(((pu.pulse ?? 0) + globalTimeMs * 0.001) * 4);

        ctx.save();
        ctx.globalAlpha = glowPulse;
        ctx.fillStyle = def.glow;
        ctx.beginPath();
        ctx.ellipse(pu.x + pu.size / 2, pu.y + pu.size / 2, pu.size, pu.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = def.color;
        if (pu.type === "shield") {
            ctx.beginPath();
            ctx.arc(pu.x + pu.size / 2, pu.y + pu.size / 2, pu.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#5fc6ff";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (pu.type === "slowmo") {
            ctx.save();
            ctx.translate(pu.x + pu.size / 2, pu.y + pu.size / 2);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-pu.size / 3, -pu.size / 3, (2 * pu.size) / 3, (2 * pu.size) / 3);
            ctx.restore();
            ctx.fillStyle = "#f9c400";
            ctx.fillRect(pu.x + pu.size / 2 - 2, pu.y + 6, 4, pu.size - 12);
        } else if (pu.type === "doublejump") {
            ctx.save();
            ctx.translate(pu.x + pu.size / 2, pu.y + pu.size / 2);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-pu.size / 3, -pu.size / 3, (2 * pu.size) / 3, (2 * pu.size) / 3);
            ctx.restore();
        } else if (pu.type === "phase") {
            ctx.strokeStyle = "#aef9ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(
                pu.x + pu.size / 2,
                pu.y + pu.size / 2,
                pu.size / 2,
                pu.size / 2.4,
                0,
                0,
                Math.PI * 2,
            );
            ctx.stroke();
        } else if (pu.type === "frenzy") {
            ctx.beginPath();
            ctx.moveTo(pu.x + pu.size / 2, pu.y + 4);
            ctx.lineTo(pu.x + pu.size - 4, pu.y + pu.size - 4);
            ctx.lineTo(pu.x + 4, pu.y + pu.size - 4);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawDino() {
    const x = dino.x;
    const y = dino.y;
    const bob = dino.grounded ? Math.sin(dino.animationMs * 0.02) * 1.5 : 0;
    const legSwing = Math.sin(dino.animationMs * 0.03) * 4;

    ctx.save();
    const bodyGradient = ctx.createLinearGradient(x, y - dino.height, x + dino.width, y);
    bodyGradient.addColorStop(0, "#10141c");
    bodyGradient.addColorStop(1, "#2b2f44");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y - 38 + bob, 36, 30, 10);
    } else {
        ctx.rect(x, y - 38 + bob, 36, 30);
    }
    ctx.fill();

    ctx.fillStyle = "#1c2230";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x + 22, y - 60 + bob, 22, 24, 8);
    } else {
        ctx.rect(x + 22, y - 60 + bob, 22, 24);
    }
    ctx.fill();

    ctx.fillStyle = "#0c0f16";
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 26 + bob);
    ctx.quadraticCurveTo(x - 16, y - 32 + bob, x - 10, y - 18 + bob);
    ctx.lineTo(x, y - 18 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fefefe";
    ctx.fillRect(x + 37, y - 52 + bob, 5, 5);
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 39, y - 50 + bob, 2, 2);

    ctx.fillStyle = "#2f354d";
    ctx.fillRect(x + 10, y - 12, 12, 12);
    ctx.fillRect(x + 24, y - 12 + legSwing * 0.3, 10, 12 - legSwing * 0.2);

    ctx.fillStyle = "#2f3c59";
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 30 + bob);
    ctx.lineTo(x + 18, y - 36 + bob);
    ctx.lineTo(x + 16, y - 44 + bob);
    ctx.lineTo(x + 8, y - 48 + bob);
    ctx.closePath();
    ctx.fill();

    if (effects.doublejump.active && !dino.grounded) {
        drawAirDashTrail();
    }

    ctx.restore();

    if (effects.phase.active) {
        drawPhaseAura();
    }
    if (effects.shield.active) {
        drawShieldAura();
    }
}

function drawAirDashTrail() {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#c7a2ff";
    ctx.beginPath();
    ctx.moveTo(dino.x - 8, dino.y - dino.height + 6);
    ctx.lineTo(dino.x + 2, dino.y - dino.height + 20);
    ctx.lineTo(dino.x + 8, dino.y - dino.height + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPhaseAura() {
    ctx.save();
    ctx.strokeStyle = "rgba(124, 247, 255, 0.8)";
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#7cf7ff";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    const radius = dino.width + 16 + Math.sin(globalTimeMs * 0.02) * 4;
    ctx.ellipse(
        dino.x + dino.width / 2,
        dino.y - dino.height / 2,
        radius / 1.6,
        radius / 1.8,
        0,
        0,
        Math.PI * 2,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawShieldAura() {
    const pulse = 0.1 + 0.05 * Math.sin(globalTimeMs * 0.015);
    ctx.save();
    ctx.strokeStyle = "rgba(137, 229, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#89e5ff";
    ctx.beginPath();
    const rectX = dino.x - 6;
    const rectY = dino.y - dino.height - 6 + pulse * 6;
    const rectW = dino.width + 12;
    const rectH = dino.height + 12;
    if (ctx.roundRect) {
        ctx.roundRect(rectX, rectY, rectW, rectH, 14);
    } else {
        ctx.rect(rectX, rectY, rectW, rectH);
    }
    ctx.stroke();
    ctx.restore();
}

function drawSlowmoTint() {
    if (!effects.slowmo.active || GAME_STATE.crashed) return;
    ctx.fillStyle = "rgba(120, 185, 255, 0.08)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawObstacles() {
    for (const obstacle of obstacles) {
        if (obstacle.type === "pterodactyl") {
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            const wingPhase = obstacle.animationTimer / obstacle.flutterSpeed;
            const wingOffset = Math.sin(wingPhase * Math.PI * 2) * 8;
            ctx.fillRect(obstacle.x - 10, obstacle.y + obstacle.height / 2 + wingOffset, 34, 4);
            ctx.fillRect(obstacle.x + obstacle.width - 24, obstacle.y + obstacle.height / 2 - wingOffset, 34, 4);
            continue;
        }

        if (obstacle.renderMode === "tree") {
            drawTreeObstacle(obstacle);
            continue;
        }

        if (obstacle.renderMode === "snowball") {
            drawSnowball(obstacle);
            continue;
        }

        if (obstacle.renderMode === "icicle") {
            drawIcicle(obstacle);
            continue;
        }

        if (obstacle.renderMode === "meteor") {
            drawMeteor(obstacle);
            continue;
        }

        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
}

function drawTreeObstacle(obstacle) {
    const { x, y, width, height, palette, treeLayers } = obstacle;
    const layers = Math.max(3, treeLayers || 3);
    const trunkHeight = Math.max(12, height * 0.22);
    const trunkWidth = Math.max(6, width * 0.25);
    const trunkX = x + (width - trunkWidth) / 2;
    const trunkY = y + height - trunkHeight;

    ctx.fillStyle = palette?.trunk ?? "#5c3b1e";
    ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);

    const foliageHeight = height - trunkHeight;
    const centerX = x + width / 2;
    for (let i = 0; i < layers; i += 1) {
        const progress = 1 - i / layers;
        const halfWidth = (width / 2) * (0.4 + progress * 0.6);
        const topY = y + (foliageHeight / layers) * i;
        const bottomY = y + (foliageHeight / layers) * (i + 1) + 4;
        ctx.fillStyle = palette?.foliage?.[i % (palette?.foliage.length ?? 1)] ?? "#2f6b3f";
        ctx.beginPath();
        ctx.moveTo(centerX, topY);
        ctx.lineTo(centerX - halfWidth, bottomY);
        ctx.lineTo(centerX + halfWidth, bottomY);
        ctx.closePath();
        ctx.fill();
    }

    if (palette?.snow) {
        ctx.fillStyle = palette.snow;
        ctx.beginPath();
        ctx.ellipse(centerX, y + 6, width * 0.18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSnowball(obstacle) {
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(obstacle.rotation * 0.08);
    const gradient = ctx.createRadialGradient(0, 0, obstacle.width * 0.1, 0, 0, obstacle.width * 0.6);
    gradient.addColorStop(0, "#fefefe");
    gradient.addColorStop(1, "#cfd9f5");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawIcicle(obstacle) {
    ctx.fillStyle = "#d1ecff";
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height - 6);
    ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x, obstacle.y + obstacle.height - 6);
    ctx.closePath();
    ctx.fill();
}

function drawMeteor(obstacle) {
    ctx.fillStyle = obstacle.color ?? "#ffb65c";
    ctx.beginPath();
    ctx.ellipse(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width / 2,
        obstacle.height / 2,
        0,
        0,
        Math.PI * 2,
    );
    ctx.fill();
    const tailGradient = ctx.createLinearGradient(obstacle.x - 20, obstacle.y, obstacle.x, obstacle.y);
    tailGradient.addColorStop(0, "rgba(255, 182, 92, 0)");
    tailGradient.addColorStop(1, "rgba(255, 182, 92, 0.6)");
    ctx.fillStyle = tailGradient;
    ctx.fillRect(obstacle.x - 40, obstacle.y + obstacle.height / 2 - 4, 40, 8);
}

function drawParticles() {
    for (const particle of particles) {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        const tint = particle.tint ?? "90, 90, 90";
        ctx.fillStyle = `rgba(${tint}, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.radius, particle.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGameOver() {
    if (!GAME_STATE.crashed) return;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = "#fff";
    ctx.font = "24px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", WORLD.width / 2, WORLD.height / 2 - 10);
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.fillText("No lives remaining.", WORLD.width / 2, WORLD.height / 2 + 20);
    ctx.fillText("Press Space or tap to restart", WORLD.width / 2, WORLD.height / 2 + 46);
    ctx.textAlign = "left";
}

function detectCollision() {
    const dinoBox = {
        left: dino.x + 6,
        right: dino.x + dino.width - 6,
        top: dino.y - dino.height + 6,
        bottom: dino.y - 2,
    };

    for (const obstacle of obstacles) {
        const hitbox = obstacle.hitbox ?? {};
        const obstacleBox = {
            left: obstacle.x + (hitbox.left ?? 0),
            right: obstacle.x + obstacle.width - (hitbox.right ?? 0),
            top: obstacle.y + (hitbox.top ?? 0),
            bottom: obstacle.y + obstacle.height - (hitbox.bottom ?? 0),
        };

        if (boxesOverlap(dinoBox, obstacleBox)) {
            return obstacle;
        }
    }
    return null;
}

function render() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawGround();
    drawClouds();
    drawAmbientSnow();
    drawObstacles();
    drawPowerups();
    drawParticles();
    drawDino();
    drawSlowmoTint();
    drawGameOver();
}

function gameLoop(timestamp) {
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
    }
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    globalTimeMs += delta;

    update(delta);
    updateAmbientSnow(delta);
    render();

    scoreLabel.textContent = GAME_STATE.score.toString().padStart(5, "0");
    speedLabel.textContent = getEffectiveSpeedMultiplier().toFixed(1);
    if (speedKmhLabel) {
        speedKmhLabel.textContent = `${getCurrentSpeedKmh().toFixed(1)} km/h`;
    }

    requestAnimationFrame(gameLoop);
}

function performJump({ isAir = false } = {}) {
    const velocity = isAir ? CONFIG.jumpVelocity * 0.92 : CONFIG.jumpVelocity;
    dino.velocityY = velocity;
    dino.grounded = false;
    coyoteTimerMs = 0;
    if (isAir) {
        dino.extraJumpAvailable = false;
    }
    jumpSound?.pause();
    jumpSound && (jumpSound.currentTime = 0);
    jumpSound?.play().catch(() => {});
}

function queueJump() {
    if (!ensurePlayerName()) return;
    if (!GAME_STATE.running) {
        resetGame();
        return;
    }

    if (dino.grounded || coyoteTimerMs > 0) {
        jumpBufferTimerMs = CONFIG.jumpBufferMs;
        return;
    }

    if (hasAirJumpReady()) {
        performJump({ isAir: true });
    }
}

function hasAirJumpReady() {
    return effects.doublejump.active && dino.extraJumpAvailable;
}

startBtn.addEventListener("click", () => {
    if (!ensurePlayerName()) return;
    resetGame();
});

document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "ArrowUp") return;
    event.preventDefault();
    queueJump();
});

canvas.addEventListener("pointerdown", () => {
    queueJump();
});

function getEffectiveSpeedMultiplier() {
    let multiplier = GAME_STATE.speedMultiplier;
    if (effects.slowmo.active) {
        multiplier *= POWERUP_TYPES.slowmo.speedScale;
    }
    return multiplier;
}

function getDifficultyLevel() {
    return Math.floor(GAME_STATE.score / CONFIG.difficultyStepScore);
}

function applyPowerup(type) {
    const definition = POWERUP_TYPES[type];
    if (!definition) return;

    if (type === "shield") {
        effects.shield.active = true;
        effects.shield.remainingMs = definition.durationMs;
        effects.shield.hitsLeft = definition.hits;
    } else if (type === "slowmo") {
        effects.slowmo.active = true;
        effects.slowmo.remainingMs = definition.durationMs;
    } else if (type === "doublejump") {
        effects.doublejump.active = true;
        effects.doublejump.remainingMs = definition.durationMs;
        dino.extraJumpAvailable = true;
    } else if (type === "phase") {
        effects.phase.active = true;
        effects.phase.remainingMs = definition.durationMs;
    } else if (type === "frenzy") {
        effects.frenzy.active = true;
        effects.frenzy.remainingMs = definition.durationMs;
    }

    updateEffectLabel();
}

function deactivateShield() {
    effects.shield.active = false;
    effects.shield.remainingMs = 0;
    effects.shield.hitsLeft = 0;
    updateEffectLabel();
}

function deactivateSlowmo() {
    effects.slowmo.active = false;
    effects.slowmo.remainingMs = 0;
    updateEffectLabel();
}

function deactivateDoublejump() {
    effects.doublejump.active = false;
    effects.doublejump.remainingMs = 0;
    dino.extraJumpAvailable = false;
    updateEffectLabel();
}

function deactivatePhase() {
    effects.phase.active = false;
    effects.phase.remainingMs = 0;
    updateEffectLabel();
}

function deactivateFrenzy() {
    effects.frenzy.active = false;
    effects.frenzy.remainingMs = 0;
    updateEffectLabel();
}

function updateEffectLabel() {
    if (!effectLabel) return;
    const active = [];
    if (effects.shield.active) active.push(POWERUP_TYPES.shield.label);
    if (effects.slowmo.active) active.push(POWERUP_TYPES.slowmo.label);
    if (effects.doublejump.active) active.push(POWERUP_TYPES.doublejump.label);
    if (effects.phase.active) active.push(POWERUP_TYPES.phase.label);
    if (effects.frenzy.active) active.push(POWERUP_TYPES.frenzy.label);
    effectLabel.textContent = active.length ? active.join(" + ") : "None";
}

function boxesOverlap(a, b) {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
}

async function fetchLeaderboard() {
    if (!leaderboardList) return;
    setLeaderboardMessage("Loading leaderboard…");
    try {
        const response = await fetch(
            `${SUPABASE.url}/rest/v1/leaderboard_scores?select=player_name,score,created_at&order=score.desc,created_at.asc&limit=${
                LEADERBOARD_LIMIT * 5
            }` ,
            {
                method: "GET",
                headers: SUPABASE_HEADERS,
            },
        );
        if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard (${response.status})`);
        }
        const data = await response.json();
        renderLeaderboard(data);
    } catch (error) {
        console.error(error);
        setLeaderboardMessage("Could not load leaderboard. Try again later.");
    }
}

async function submitScore(name, score) {
    if (!name || !Number.isFinite(score)) return;
    try {
        const best = await fetchBestScore(name);
        if (best && score <= (best.score ?? 0)) {
            return; // no improvement, skip submission
        }

        let success = false;
        if (best) {
            const updateResponse = await fetch(
                `${SUPABASE.url}/rest/v1/leaderboard_scores?id=eq.${best.id}`,
                {
                    method: "PATCH",
                    headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
                    body: JSON.stringify({ score }),
                },
            );
            if (updateResponse.ok) {
                success = true;
            } else if ([401, 403, 404, 405].includes(updateResponse.status)) {
                success = await insertScore(name, score);
            } else {
                throw new Error(`Failed to update score (${updateResponse.status})`);
            }
        } else {
            success = await insertScore(name, score);
        }

        if (success) {
            await fetchLeaderboard();
        }
    } catch (error) {
        console.error("Score submission failed", error);
    }
}

async function insertScore(name, score) {
    const response = await fetch(`${SUPABASE.url}/rest/v1/leaderboard_scores`, {
        method: "POST",
        headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ player_name: name, score }),
    });
    if (!response.ok) {
        console.error(`Failed to insert score (${response.status})`);
        return false;
    }
    return true;
}

async function fetchBestScore(name) {
    const response = await fetch(
        `${SUPABASE.url}/rest/v1/leaderboard_scores?select=id,score&player_name=eq.${encodeURIComponent(
            name,
        )}&order=score.desc&limit=1`,
        {
            method: "GET",
            headers: SUPABASE_HEADERS,
        },
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch best score (${response.status})`);
    }
    const data = await response.json();
    return data?.[0];
}

function renderLeaderboard(entries = []) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = "";
    if (!entries.length) {
        setLeaderboardMessage("No runs yet. Be the first!");
        return;
    }
    const seen = new Set();
    let placed = 0;
    for (const entry of entries) {
        const name = entry.player_name ?? "Mystery Runner";
        const key = name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const item = document.createElement("li");
        item.classList.add("leaderboard-entry");
        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;
        const scoreSpan = document.createElement("span");
        scoreSpan.textContent = (entry.score ?? 0).toString().padStart(5, "0");
        item.append(nameSpan, scoreSpan);
        leaderboardList.appendChild(item);
        placed += 1;
        if (placed >= LEADERBOARD_LIMIT) break;
    }
    if (placed === 0) {
        setLeaderboardMessage("Play a round to claim a spot!");
    }
}

function setLeaderboardMessage(message) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = "";
    const item = document.createElement("li");
    item.textContent = message;
    leaderboardList.appendChild(item);
}

function maybeAwardBonusLife(milestone) {
    if (milestone <= lastLifeBonusMilestone) return;
    if (
        milestone > 0 &&
        milestone % CONFIG.lifeBonusInterval === 0 &&
        GAME_STATE.lives < CONFIG.maxLives
    ) {
        GAME_STATE.lives += 1;
        updateLivesDisplay();
        spawnLifeBurst();
    }
    lastLifeBonusMilestone = milestone;
}

function handleLifeLoss() {
    if (GAME_STATE.lives <= 0) {
        handleGameOver();
        return;
    }

    GAME_STATE.lives -= 1;
    updateLivesDisplay();

    if (GAME_STATE.lives > 0) {
        resetRunState({ preserveScore: true, preserveSpeed: true });
    } else {
        handleGameOver();
    }
}

function handleGameOver() {
    if (GAME_STATE.postedScore || !playerName) return;
    GAME_STATE.postedScore = true;
    submitScore(playerName, GAME_STATE.score);
}

function ensurePlayerName() {
    if (playerName) return true;
    openNameOverlay();
    return false;
}

function openNameOverlay() {
    if (!nameOverlay) return;
    if (nameInput) {
        nameInput.value = playerName ?? "";
        setTimeout(() => nameInput.select?.(), 0);
    }
    if (nameError) nameError.textContent = "";
    nameOverlay.setAttribute("aria-hidden", "false");
    setTimeout(() => {
        nameInput?.focus();
    }, 100);
}

function closeNameOverlay() {
    if (!nameOverlay) return;
    nameOverlay.setAttribute("aria-hidden", "true");
    nameInput?.blur();
}

function validateName(rawName) {
    const trimmed = rawName.trim();
    if (trimmed.length < 3) {
        return { valid: false, message: "Name must be at least 3 characters." };
    }
    if (trimmed.length > 30) {
        return { valid: false, message: "Name must be 30 characters or less." };
    }
    if (!/^[A-Za-z0-9 _.-]+$/.test(trimmed)) {
        return { valid: false, message: "Use only letters, numbers, spaces, _ . -" };
    }
    return { valid: true, value: trimmed };
}

function initializeNameFlow() {
    if (!nameOverlay || !nameInput) return;
    if (playerName) {
        nameInput.value = playerName;
        closeNameOverlay();
    } else {
        openNameOverlay();
    }
}

nameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!nameInput) return;
    const validation = validateName(nameInput.value ?? "");
    if (!validation.valid) {
        if (nameError) nameError.textContent = validation.message;
        return;
    }

    setPlayerName(validation.value);
    if (nameError) nameError.textContent = "";
    closeNameOverlay();
});

refreshLeaderboardBtn?.addEventListener("click", () => {
    fetchLeaderboard();
});

editNameBtn?.addEventListener("click", () => {
    openNameOverlay();
});

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function weightedRandom(list) {
    const totalWeight = list.reduce((acc, item) => acc + (item.weight ?? 1), 0);
    let threshold = Math.random() * totalWeight;
    for (const item of list) {
        threshold -= item.weight ?? 1;
        if (threshold <= 0) return item;
    }
    return list[list.length - 1];
}

updatePlayerDisplay();
initializeNameFlow();
fetchLeaderboard();
resetGame();
requestAnimationFrame(gameLoop);
