import { ITEM_CATALOG, NPC_CATALOGS } from './item-catalog.js';
import { renderItemGrid, bindItemGrid } from './item-grid.js';
import { CombatTraining, COMBAT_TRAINING_LESSONS } from './combat-training.js';
import { createGrassTileTexture, createLamentForest, createTerrainTileTexture } from './forest-scene.js';
import { applyKaelenAtlasToCharacter, createRoundedBoxGeometry, loadKaelenAtlasTextures } from './kaelen-atlas.js';
import { walpiraScriptSvg } from './walpira-language.js';

const world = document.getElementById('game-world');
const profileArea = document.getElementById('profile-area');
const modal = document.getElementById('profile-modal');
const nameInput = document.getElementById('profile-name');
const toast = document.getElementById('toast');
const palette = ['#6c4939', '#365b56', '#63523a', '#4b4d70', '#70404a', '#4c6240'];
const PLAYABLE_CHARACTER_IDS = ['kaelen', 'brujo'];
let profiles = loadProfiles();
let selectedProfileId = null;
let toastTimer;
let graphicsMaxPixelRatio = 1;
let renderQualityScale = 1, renderFrameTime = 0, renderFrameCount = 0;
let scene, camera, renderer, heroRoot, heroGroup, hips, spine, torso, chestGroup, neck, headGroup, cape, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, leftHip, rightHip, leftKnee, rightKnee, leftFoot, rightFoot, leftHand, rightHand, rightHandGrip, swordGroup, axeGroup, daggerGroup, staffGroup, spearGroup, bowGroup, swordGuard, swordBlade, swordLight, shieldField, shieldRim, shieldLight, bladeSparks, bladeSparkData = [], shockwaveRing, dust, dustData = [];
let aimMode=false,aimCharge=0,aimTrajectoryLine=null,aimPreviewPositions=null,aimedProjectiles=[],bowProjectiles=[],bowImpactParticles=[],bowShotCooldown=0,bowNockedArrow=null;
let equipmentDrawn = false, equipmentDrawTransition = null, heroHeadEquipment = null, heroHelmetGroup = null, heroChestEquipment = [], heroShoulderEquipment = [], heroGloveEquipment = [], heroLegEquipment = [], heroBaseLegParts = [], heroBootEquipment = [];
let brujoVisualParts = [];
let kaelenAtlasTextures = null;
let cityMaterials, cityColliders = [], cityRoads = [], cameraBlockers = [], cameraCollisionRaycaster, npcRaycaster, townNpcs = [], forestNpcs = [], townHouseInteriors = [], nearestNpcId = null, trainingDummy = null, enemyCombatants = [], infernalProjectiles = [], templeBuildings = [], riverCenterline = [], riverBranches = [], bridgeColliders = [], fountainWater = null, lakeCollider = null, dockWalkways = [], walkSurfaces = [], footstepRaycaster, waterWheel = null, waterWheelBase = null, skyDome = null;
let currentWorldId = 'villa';
let storyGuidanceMarker = null, storyGuidanceArrow = null, storyGuidanceTarget = null, storyGuidanceQuestId = null, storyGuidanceRefresh = 0, storyTrainingPending = false, openingCinematicIndex = 0, openingCinematicActive = false;
let villaWorldGroup = null;
let villaWorldColliders = [];
let villaWorldWalkSurfaces = [];
let villaFog = null;
let villaEnemyStates = [];
let forestScene = null;
let arenaWorldGroup = null;
let arenaWorldWalkSurfaces = [];
let arenaWorldFog = null;
let arenaPreviousWorldId = 'villa';
let forestEnemies = [];
let groundLootPiles = [];
let nearbyGroundLoot = null;
let lootPausedBeforeOpen = false;
let ambientVillagers = [];
let forestProjectiles = [];
let arcaneProjectiles = [];
let arcaneOrbCooldown = 0;
let forestHazards = [];
let experienceOrbs = [];
let forestNavigationFrame = 0;
let villaMapView = { zoom: 1, panX: 0, panY: 0, marker: null, drag: null };
const SAFE_PLAZA_RADIUS = 11.2;
const WALPIRA_HOME_SPAWN = { x: 18, z: -26.2 };
const WALPIRA_HOME_SAFE_RADIUS = 14.5;
const FOREST_GATE_RESPAWN = { x: 0, z: 17.5 };
const PLAYER_INVULNERABILITY_MS = 2000;
const BACKPACK_CAPACITY = 30;
const ARROW_ITEM_ID = 'flecha_de_rafia';

function normalizeArrowStack(items, stacks) {
  const indices = items.map((id, index) => id === ARROW_ITEM_ID ? index : -1).filter(index => index >= 0);
  if (!indices.length) { delete stacks[ARROW_ITEM_ID]; return; }
  stacks[ARROW_ITEM_ID] = Math.max(indices.length, Number(stacks[ARROW_ITEM_ID]) || 0);
  for (const index of indices.slice(1).reverse()) items.splice(index, 1);
}
function getStackQuantity(items, stacks, id) {
  return id === ARROW_ITEM_ID && items.includes(id) ? Math.max(1, Number(stacks?.[id]) || 1) : null;
}
function addRpgItem(items, stacks, id, quantity = 1, capacity = Infinity) {
  if (id === ARROW_ITEM_ID) {
    if (!items.includes(id)) {
      if (items.length >= capacity) return false;
      items.push(id);
    }
    stacks[id] = (Number(stacks[id]) || 0) + quantity;
    return true;
  }
  if (items.length >= capacity) return false;
  items.push(id);
  return true;
}
function removeRpgItem(items, stacks, index, quantity = Infinity) {
  const id = items[index];
  if (!id) return null;
  if (id === ARROW_ITEM_ID) {
    const current = getStackQuantity(items, stacks, id) || 1;
    const removed = Math.min(current, quantity);
    const remaining = current - removed;
    if (remaining > 0) stacks[id] = remaining;
    else { delete stacks[id]; items.splice(index, 1); }
    return { id, quantity: removed };
  }
  items.splice(index, 1);
  return { id, quantity: 1 };
}
const ENEMY_COMBATANT_NAMES = ['Sombra Carmesí', 'Vigía Umbrío', 'Loto Marchito', 'Cuervo de Jade'];
const ENEMY_PERCEPTION = { sightRange: 18, visionDot: .5, hearingWalkRange: 14, hearingRunRange: 23, hearingActionRange: 12, memoryDuration: 4.2, investigateDuration: 2.1, returnRange: 1.35 };
const BESTIARY_CREATURES = [
  { id:'crimson_shade', name:'Sombra Carmesí', kind:'Acechador', level:3, color:'#b94e44', lore:'Un duelista que aparece en las calles exteriores de Walpira.', abilities:['Tajo rápido','Combo de tres golpes','Embestida frontal','Finta de represalia'], strategy:'Espera a que termine el combo y castiga su recuperación; no persigas su finta.' },
  { id:'veiled_watcher', name:'Vigía Umbrío', kind:'Vigía', level:4, color:'#687b70', lore:'Observa los caminos y persigue el ruido dentro de su territorio.', abilities:['Golpe de guardia','Combo corto','Salto de intercepción','Alarma del vigía'], strategy:'Rompe su línea de visión y cambia de dirección para que pierda tu rastro.' },
  { id:'wilted_lotus', name:'Loto Marchito', kind:'Espadachín', level:5, color:'#a17781', lore:'Un guerrero corrompido que castiga a quien se acerca demasiado.', abilities:['Corte lateral','Estocada','Salto cortante','Floración marchita'], strategy:'Muévete lateralmente durante la preparación de su estocada y no te quedes frente a él.' },
  { id:'jade_raven', name:'Cuervo de Jade', kind:'Hostigador', level:5, color:'#628e79', lore:'Se mueve alrededor del objetivo y busca un ángulo para atacar.', abilities:['Picotazo','Aleteo cortante','Picada rasante','Torbellino de plumas'], strategy:'Gírate hacia él cuando alce vuelo; su picada deja una ventana para contraatacar.' },
  { id:'lichen_goblin', name:'Duende del Liquen', kind:'Acechador', level:6, color:'#91a95f', lore:'Acecha entre raíces; si te acercas por detrás y sin hacer ruido, no te ve.', abilities:['Garrazo','Púas que brotan del suelo','Mordisco de embestida','Rama atrapapiernas · aturde 2 s'], strategy:'Esquiva las púas y el mordisco. Si huyes o haces Dash, prepárate para que plante una rama en tu camino.' },
  { id:'thorn_spitter', name:'Escupidora de Espinas', kind:'Hostigadora vegetal', level:6, color:'#8eaa50', lore:'Mantiene distancia y castiga las aproximaciones con proyectiles y toxinas.', abilities:['Espina certera','Ráfaga doble','Lluvia de púas','Nube tóxica'], strategy:'Acércate durante la lluvia marcada; si entras en su radio corto, puede soltar una nube tóxica alrededor suyo.' },
  { id:'hollow_trunk', name:'Tronco Hueco', kind:'Tanque guardián', level:6, color:'#956b42', lore:'Avanza lentamente, bloquea de frente y entra en furia cuando está herido.', abilities:['Manotazo de tronco','Astilla lanzada','Carga de raíces','Derrumbe sísmico · furia al 30%'], strategy:'No golpees su frente protegida. Aléjate del círculo de impacto y aprovecha la recuperación tras caer.' },
  { id:'moss_stalker', name:'Acechador del musgo', kind:'Acechador del bosque', level:5, color:'#6d8553', lore:'Sigue los pasos que resuenan entre los árboles.', abilities:['Garra de raíz','Tajo doble','Carrera baja','Zarcillos de captura'], strategy:'Detén la carrera lateral cuando aparezcan los zarcillos y ataca después de su tirón fallido.' },
  { id:'branch_sentinel', name:'Vigía del ramaje', kind:'Centinela', level:6, color:'#77865d', lore:'Protege los senderos y reacciona al movimiento en su cono de visión.', abilities:['Golpe de rama','Astillas en abanico','Pisotón de guardia','Raíces de alarma'], strategy:'Evita su arco frontal y rompe la línea de visión antes de que complete la alarma.' },
  { id:'withered_duelist', name:'Duelista marchito', kind:'Duelista', level:7, color:'#916c69', lore:'Ataca cuando tiene una línea clara hacia su presa.', abilities:['Corte veloz','Estocada','Paso evasivo','Réplica marchita'], strategy:'No ataques durante su postura; obliga a que falle la réplica y castígalo al recuperarse.' },
  { id:'veil_hunter', name:'Cazador del velo', kind:'Cazador', level:8, color:'#707d70', lore:'Investiga ruidos y no olvida enseguida la última posición del jugador.', abilities:['Flecha umbría','Ráfaga de caza','Salto perseguidor','Marca del velo'], strategy:'Cambia de cobertura después de la marca para evitar su siguiente persecución.' },
  { id:'root_warden', name:'Custodio de raíces', kind:'Guardián', level:9, color:'#8b7951', lore:'Una presencia pesada que guarda los claros profundos del bosque.', abilities:['Puño de corteza','Pisotón','Empuje de raíces','Cúpula de espinas'], strategy:'Rompe contacto cuando el suelo empieza a temblar y entra por un costado tras la cúpula.' },
  { id:'ash_colossus', name:'Azhkar, Coloso de Ceniza', kind:'Jefe', level:12, color:'#c56636', lore:'El coloso infernal que amenaza el reino desde las montañas.', abilities:['Puño de ceniza','Proyectil ígneo','Carga volcánica','Nova infernal'], strategy:'Usa la cobertura ante la nova y castiga el final de la carga; su furia acorta las pausas.' }
];
const FOREST_SPECIES = [
  { id:'lichen_goblin', name:'Duende del Liquen', kind:'Acechador', color:'#91a95f', health:105, defense:4, damage:8, xp:18 },
  { id:'thorn_spitter', name:'Escupidora de Espinas', kind:'Hostigadora vegetal', color:'#8eaa50', health:82, defense:2, damage:7, xp:22 },
  { id:'hollow_trunk', name:'Tronco Hueco', kind:'Tanque guardián', color:'#956b42', health:185, defense:15, damage:13, xp:30 }
];
const FOREST_LEVEL_WEIGHTS = [18, 23, 22, 17, 13, 7];
const FOREST_FACTION_MEMBER_LIMIT = 20;
const ENEMY_CORPSE_SECONDS = 20;
const FOREST_CAMP_ROSTER = [
  {id:'pacto_leader',role:'leader',speciesId:'hollow_trunk',x:56,z:-40},
  {id:'pacto_healer',role:'healer',speciesId:'thorn_spitter',x:61,z:-43},
  {id:'pacto_watcher_east',role:'watcher',speciesId:'lichen_goblin',x:64,z:-33},
  {id:'pacto_guard_east',role:'guard',speciesId:'hollow_trunk',x:64,z:-48},
  {id:'pacto_watcher_west',role:'watcher',speciesId:'lichen_goblin',x:48,z:-33},
  {id:'pacto_guard_west',role:'guard',speciesId:'lichen_goblin',x:48,z:-48}
];
let enemyCombatantCount = 0;
const LOCK_ON_CONFIG = {
  toggleKey: 'q', previousTargetKey: '[', nextTargetKey: ']', lockButton: 10,
  maxRange: 20, exploreDistance: 3.8, combatDistance: 4.9, focusHeight: 1.2,
  cameraFollow: .24, cameraTurn: .16, heroTurn: .20, visibilityGrace: 2.2,
  retargetSideBias: .2, recenterRate: .035, minDistance: 2.2, maxDistance: 12.5,
  focusBlend: .38, playerVisibilityBias: .62
};
const hero = {};
const ARENA_ROUNDS = [
  { name: 'Nómada Carmesí', level: 3, health: 125, aggression: 1.12, damage: 1, tint: .08 },
  { name: 'Duelista Umbrío', level: 7, health: 185, aggression: 1.38, damage: 1.22, tint: .28 },
  { name: 'Campeón del Alba', level: 12, health: 265, aggression: 1.68, damage: 1.48, tint: .52 }
];
let audioManager = null;
let audioUnlocked = false;
let chapterScrollFrame = 0;
let gameMode = false;
let trainingMode = false;
let trainingPending = false;
let trainingSnapshot = null;
let trainingEnemy = null;
let trainingExtraEnemies = [];
let trainingAiStyle = 'passive';
let trainingDebugEnabled = false;
let trainingHelpVisible = true;
let trainingDebugGroup = null;
let trainingEnemyInvulnerability = new Map();
let heavyAttackActive = false;
let comboFlashLight = null;
let comboFlashTimer = 0;
let trainingOrigin = 'menu';
let trainingPreviousLockedTarget = null;
let trainingSelectedLesson = 0;
let trainingLastPosition = new THREE.Vector3();
let arenaPending = false;
let arenaActive = false;
let arenaRound = 0;
let arenaOpponent = null;
let arenaTransitionTimer = 0;
let arenaCompleted = false;
let arenaWorldEnemyStates = [];
let gameMenuOpen = false;
let manualPaused = false;
let quickMenuOpen = false;
let activeGamePanel = null;
let currentNpcId = null;
let rpgState = null;
let churchRenderLimit = 2;
let churchVisibilityTimer = 0;
const CHURCH_RENDER_RADIUS = 54;
let tutorialActive = false;
let tutorialStep = 0;
let tutorialOrigin = null;
let tutorialDistance = 0;
let tutorialComboDone = false;
let tutorialWeaponWasThrown = false;
let joystickVector = { x: 0, y: 0 };
let joystickPointer = null;
let joystickGesture = { active: false, pointerId: null, lastAngle: 0, sweep: 0, sawRightSide: false };
let risingSlashGestureTimer = 0;
let attackHeld = false;
let shieldButtonHeld = false;
let shieldParryTimer = 0;
let weaponThrown = false;
let thrownWeapon = null;
let thrownWeaponVelocity = new THREE.Vector3();
let thrownWeaponTimer = 0;
let thrownWeaponEmbeddedTarget = null;
let thrownWeaponEmbedTimer = 0;
let thrownWeaponReturning = false;
let clashSparks = null;
let clashSparkTimer = 0;
let movementVelocity;
let cameraDragPointer = null;
let cameraDragLast = null;
let pointerDownPosition = null;
let lastScreenTap = null;
const cameraTouchPointers = new Map();
let cameraPinchDistance = 0;
let cameraPinchActive = false;
let cameraYawVelocity = 0;
let cameraPitchVelocity = 0;
let walkPhase = 0;
let jumpActive = false;
let jumpElapsed = 0;
let jumpPhase = 'ground';
let jumpLandTimer = 0;
let jumpStartedWithForward = false;
let verticalVelocity = 0;
let gaitWeight = 0;
let runWeight = 0;
let brakingWeight = 0;
let previousMovementSpeed = 0;
let dashTimer = 0;
let dashCooldown = 0;
const PLAYER_POWER_COOLDOWNS = { moon_slash:5.5, dragon_rise:10, hurricane:9, dash:3.2, charge:7, shield_bash:5 };
let playerPowerCooldowns = Object.create(null);
let dashInvulnerability = 0;
let dashBufferTimer = 0;
let staminaRecoveryDelay = 0;
let manaRecoveryDelay = 0;
const DASH_INERTIA_CONFIG = { baseCharge: .25, carryCharge: .35, maxCharge: .6, maxDashSpeed: 10.5, minSpeed: 1.15, deceleration: 10.5, window: 1.2 };
const SHIELD_BASH_CONFIG = { baseDamage: 14, bonusDamage: 66, minimumSpeed: 1.15, windup: .08, active: .2, recovery: .32, stunDuration: 1, knockbackSpeed: 6.8, knockbackBonusSpeed: 32, knockbackDuration: .45, impactRange: 1.5 };
let dashInertia = { active: false, direction: new THREE.Vector2(), charge: 0, elapsed: 0 };
let shieldBash = { phase: 'IDLE', elapsed: 0, direction: new THREE.Vector2(), speed: 0, power: 0, hitTargets: new Set() };
let jumpBufferTimer = 0;
let airDashAvailable = true;
let heroHealth = 100;
let invulnerabilityExpiresAt = 0;
let heroStunTimer = 0;
let dashDirection = new THREE.Vector3();
let leftFootPlant = { planted: false, anchor: new THREE.Vector3(), rotation: new THREE.Quaternion() };
let rightFootPlant = { planted: false, anchor: new THREE.Vector3(), rotation: new THREE.Quaternion() };
let activeAttackHitTargets = new Set();
let comboStreak = 0;
let attackDidHit = false;
let activeAttackTarget = null;
let lockedEnemy = null;
let heroWeaponStance = 'holstered';
let heroWeaponTransition = null;
let heroWeaponBlend = 0;
let lockCandidates = [];
let lockCandidateRefresh = 0;
let lockVisibilityTimer = 0;
let lockCheckTimer = 0;
let lockCameraYawOffset = 0;
let lockIndicator = null;
let gamepadLockWasDown = false;
let gamepadSwitchLatch = 0;
let gamepadSwitchCooldown = 0;
const lockEnemyPosition = new THREE.Vector3();
const lockPlayerPosition = new THREE.Vector3();
const lockFocusPoint = new THREE.Vector3();
const lockRayDirection = new THREE.Vector3();
const lockScreenPoint = new THREE.Vector3();
const lockScreenCenter = new THREE.Vector2(0, 0);
let comboInputWindow = 0;
let comboRecoveryWindowStarted = false;
let attackStepApplied = 0;
let attackStrikeStarted = false;
let activeAttackPoses = null;
let shockwaveTimer = 0;
let hitStopTimer = 0;
let animationDelta = 1 / 60;
let handDrawnNoise = null;
const calligraphyTextureCache = new Map();
let sceneTarget = null, postScene = null, postCamera = null, postMaterial = null, postQuad = null;
let cameraYaw = Math.PI;
let cameraPitch = 0;
let cameraZoom = 1;
const cameraRayDirection = new THREE.Vector3();
let comboState = 'IDLE';
let risingSlash = { phase: 'IDLE', target: null, elapsed: 0, impactDone: false, trailStarted: false };
const MEDIA_LUNA_CONFIG = { downThreshold:.48, decisionWindow:3.2, maxDecisionWindow:3.6, maxAirHits:9, airHeight:1.55, playerAirOffset:.16, liftDuration:.14, strikeDuration:.16, ascentDuration:.14, airWindup:.06, airStrike:.16, airRecovery:.06, slamWindup:.1, slamDescent:.22, recoveryDuration:.2 };
const MEDIA_LUNA_GROUND_SPACING = 1.3;
let mediaLunaDebris = [];
let mediaLunaSlashEffects = [];
let mediaLunaSlashResources = null;
let cameraShakeTimer = 0;
let cameraShakeDuration = 0;
let cameraShakeStrength = 0;
let comboElapsed = 0;
let comboQueued = false;
let comboHit = 0;
let comboStartShoulderX = 0;
let comboStartShoulderZ = 0;
let comboStartTorsoY = 0;
let comboStartElbowX = 0;
let comboStartHandY = 0;
let slashTrails = [];
let activeSlashTrail = null;
let dashWindTrail = null;
let footstepTimer = 0;
let cameraGoal = new THREE.Vector3();
let cameraTarget = new THREE.Vector3(0, 1.05, 0);
let cameraFocusGoal = new THREE.Vector3(0, 1.05, 0);
let baseCameraPosition = new THREE.Vector3(0, 1.9, 6);
let clock;
const mobileLandscapeQuery = window.matchMedia('(orientation: landscape) and (pointer: coarse)');
let fullscreenRetryPending = false;
let multiplayerSocket = null;
let multiplayerPlayerId = null;
let multiplayerIsHost = false;
let multiplayerName = 'Jugador';
let multiplayerSpawn = null;
let activeLobbyId = null;
let activeLobbyName = '';
let pendingLobbyAction = null;
let startGameAfterJoin = false;
let gameSessionMode = 'solo';
let availableLobbies = [];
let remotePlayers = new Map();
let multiplayerHitReaction = null;
let lastNetworkSend = 0;
let networkReconnectTimer = 0;
const trainingCourse = new CombatTraining(updateTrainingHud);

function loadProfiles() {
  try {
    const value = JSON.parse(localStorage.getItem('walpira_profiles') || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'number' && typeof item.name === 'string').map(profile => {
      profile.unlockedCharacters = Array.isArray(profile.unlockedCharacters) ? [...new Set(['kaelen', ...profile.unlockedCharacters.filter(id => PLAYABLE_CHARACTER_IDS.includes(id))])] : ['kaelen'];
      if (!profile.unlockedCharacters.includes(profile.activeCharacter)) profile.activeCharacter = 'kaelen';
      return profile;
    }) : [];
  } catch {
    return [];
  }
}
function saveProfiles() { localStorage.setItem('walpira_profiles', JSON.stringify(profiles)); }
function getActiveCharacterId() {
  const profile = getSelectedProfile();
  return profile?.unlockedCharacters?.includes(profile.activeCharacter) ? profile.activeCharacter : 'kaelen';
}
function captureCharacterProgress(state = rpgState) {
  return {
    level:state.level,xp:state.xp,xpNext:state.xpNext,attributePoints:state.attributePoints,skillPoints:state.skillPoints,
    attributes:{...state.attributes},skills:{...state.skills},quickSkills:[...state.quickSkills],gold:state.gold,
    inventory:[...state.inventory],inventoryStacks:{...(state.inventoryStacks||{})},storage:[...(state.storage||[])],storageStacks:{...(state.storageStacks||{})},forgeItems:[...(state.forgeItems||[])],
    equipment:{...state.equipment},mana:state.mana,stamina:state.stamina
  };
}
function createCharacterProgress(id) {
  const equipment=Object.fromEntries(EQUIPMENT_SLOTS.map(([slot])=>[slot,null]));
  if(id==='brujo')equipment.weapon='cetro_de_raiz_negra';
  return {
    level:1,xp:0,xpNext:100,attributePoints:0,skillPoints:0,
    attributes:{str:5,agi:5,con:5,int:5},skills:Object.fromEntries(SKILL_INFO.map(skill=>[skill.id,0])),
    quickSkills:Array(QUICK_SKILL_SLOT_COUNT).fill(null),gold:0,inventory:[],inventoryStacks:{},storage:[],storageStacks:{},forgeItems:[],equipment,
    mana:84,stamina:180
  };
}
function setActiveCharacter(id) {
  const profile = getSelectedProfile();
  if (!profile?.unlockedCharacters?.includes(id)) return false;
  const previousId = profile.activeCharacter || 'kaelen';
  if(previousId===id)return true;
  if (rpgState) {
    rpgState.characterProgress ||= {};
    rpgState.characterProgress[previousId] ||= captureCharacterProgress();
    rpgState.characterLoadouts ||= {};
    rpgState.characterLoadouts[previousId] = { ...rpgState.equipment };
    rpgState.characterProgress[id] ||= createCharacterProgress(id);
    const progress=rpgState.characterProgress[id];
    Object.assign(rpgState,{
      level:progress.level,xp:progress.xp,xpNext:progress.xpNext,attributePoints:progress.attributePoints,skillPoints:progress.skillPoints,
      attributes:{...progress.attributes},skills:{...progress.skills},quickSkills:[...progress.quickSkills],gold:progress.gold,
      inventory:[...progress.inventory],inventoryStacks:{...(progress.inventoryStacks||{})},storage:[...progress.storage],storageStacks:{...(progress.storageStacks||{})},forgeItems:[...progress.forgeItems],equipment:{...progress.equipment},
      mana:progress.mana,stamina:progress.stamina
    });
    rpgState.characterLoadouts[id] = { ...rpgState.equipment };
  }
  profile.activeCharacter = id;
  saveProfiles();
  if (gameMode) {
    applyPlayerCharacterDesign();
    syncEquippedVisuals();
    renderQuickSkills();
    updatePlayableCharacterMenu();
    heroHealth=playerMaxHealth();
    updatePlayerHealthHud();
  }
  document.getElementById('hud-profile').textContent = getPlayerCharacterName();
  showToast('Personaje activo: ' + (id === 'brujo' ? 'Brujo arcano' : 'Kaelen') + '.');
  return true;
}
function updatePlayableCharacterMenu() {
  const profile = getSelectedProfile();
  document.querySelectorAll('[data-character-switch]').forEach(button => {
    const id = button.dataset.characterSwitch;
    button.hidden = !profile?.unlockedCharacters?.includes(id);
    button.setAttribute('aria-pressed', String(getActiveCharacterId() === id));
  });
}
function getPlayerCharacterName() {
  const profile = getSelectedProfile();
  if (getActiveCharacterId() === 'brujo') return profile?.characterNames?.brujo || 'Brujo';
  const profileName = profile?.characterName?.trim().replace(/[<>"'&]/g, '').slice(0, 24);
  if (profileName) return profileName;
  try {
    const savedName = localStorage.getItem('walpira_character_name')?.trim().replace(/[<>"'&]/g, '').slice(0, 24);
    if (savedName) return savedName;
  } catch {}
  return getSelectedProfile()?.name || 'Jugador';
}
function getPlayerCharacterDesign() {
  const profile = getSelectedProfile();
  if (getActiveCharacterId() === 'brujo') return profile?.characterDesigns?.brujo || null;
  if (profile?.characterDesign && typeof profile.characterDesign === 'object') return profile.characterDesign;
  try {
    const design = JSON.parse(localStorage.getItem('walpira_character_design') || 'null');
    return design && typeof design === 'object' ? design : null;
  } catch { return null; }
}
function applyPlayerCharacterDesign() {
  if (!heroRoot || !headGroup) return;
  const isBrujo = getActiveCharacterId() === 'brujo';
  heroRoot.traverse(object => {
    if (!object.isMesh || !object.userData.characterBaseMaterial) return;
    object.material = object.userData.characterBaseMaterial;
  });
  if (isBrujo) { applyPlayableCharacterVisuals(); return; }
  const design = getPlayerCharacterDesign();
  if (!design) { applyPlayableCharacterVisuals(); return; }
  const isColor = value => typeof value === 'string' && /^#?[0-9a-f]{6}$/i.test(value);
  const color = value => new THREE.Color(value.startsWith('#') ? value : '#' + value);
  const skinColor = isColor(design.skin) ? color(design.skin) : null;
  const shirtColor = isColor(design.shirt) ? color(design.shirt) : null;
  const pantsColor = isColor(design.pants) ? color(design.pants) : null;
  const hairColor = isColor(design.hair) ? color(design.hair) : null;
  heroRoot.traverse(object => {
    if (!object.isMesh || !object.material?.color) return;
    if (skinColor && (['headMesh', 'neckMesh', 'sculptedNose', 'leftEar', 'rightEar', 'leftHandMesh', 'rightHandMesh', 'leftFootBaseMesh', 'rightFootBaseMesh'].includes(object.name) || /^(left|right)Toe/.test(object.name))) object.material.color.copy(skinColor);
    if (shirtColor && object.name === 'torsoMesh') object.material.color.copy(shirtColor);
    if (pantsColor && ['leftThighMesh', 'rightThighMesh', 'leftKneeJoint', 'rightKneeJoint', 'leftShinMesh', 'rightShinMesh'].includes(object.name)) object.material.color.copy(pantsColor);
  });
  const feminine = design.gender === 'femenino';
  torso.scale.x = feminine ? .8 : .84;
  leftShoulder.position.x = feminine ? .205 : .22;
  rightShoulder.position.x = feminine ? -.205 : -.22;
  leftHip.position.x = feminine ? .145 : .13;
  rightHip.position.x = feminine ? -.145 : -.13;
  const height = THREE.MathUtils.clamp(Number(design.height || 100) / 100, .85, 1.15);
  const build = THREE.MathUtils.clamp(Number(design.build || 100) / 100, .94, 1.08);
  heroRoot.scale.set(build, height, 1);
  const oldHair = headGroup.getObjectByName('player-custom-hair');
  if (oldHair) headGroup.remove(oldHair);
  const hairGroup = new THREE.Group();
  hairGroup.name = 'player-custom-hair';
  headGroup.add(hairGroup);
  const hairMaterial = material(hairColor ? '#' + hairColor.getHexString() : '#30251f', .9);
  const addHair = (geometry, position, scale = null, rotation = null) => {
    const mesh = new THREE.Mesh(geometry, hairMaterial);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    hairGroup.add(mesh);
    return mesh;
  };
  addHair(new THREE.SphereGeometry(.17, 16, 12), [0, .075, -.015], [1, .55, 1]);
  const hairstyle = design.hairstyle || 'alborotado';
  if (['largo', 'cola', 'rizado'].includes(hairstyle)) for (const side of [-1, 1]) addHair(new THREE.CapsuleGeometry(.045, .17, 3, 6), [side * .135, -.045, 0]);
  if (hairstyle === 'cola') addHair(new THREE.SphereGeometry(.075, 10, 8), [0, .08, -.15]);
  if (hairstyle === 'rizado') for (const side of [-1, 1]) addHair(new THREE.SphereGeometry(.075, 10, 8), [side * .12, .12, .015]);
  if (hairstyle === 'alborotado') {
    for (const [x, y, z, tilt] of [
      [-.12, .16, .01, -.48], [-.045, .19, -.025, -.2], [.055, .18, -.02, .24], [.13, .15, -.015, .55],
      [-.15, -.02, -.035, -.22], [.15, -.04, -.04, .24], [-.12, -.045, -.12, -.15], [-.04, -.06, -.145, -.08],
      [.055, -.065, -.145, .1], [.13, -.045, -.12, .2]
    ]) addHair(new THREE.CapsuleGeometry(.026, .13, 3, 6), [x, y, z], null, [0, 0, tilt]);
  }
  if (hairstyle === 'alborotado') {
    for (const [x, y, z, tilt] of [
      [-.12, .16, .01, -.48], [-.045, .19, -.025, -.2], [.055, .18, -.02, .24], [.13, .15, -.015, .55],
      [-.15, -.02, -.035, -.22], [.15, -.04, -.04, .24], [-.12, -.045, -.12, -.15], [-.04, -.06, -.145, -.08],
      [.055, -.065, -.145, .1], [.13, -.045, -.12, .2]
    ]) addHair(new THREE.CapsuleGeometry(.026, .13, 3, 6), [x, y, z], null, [0, 0, tilt]);
  }
  if (heroHeadEquipment) heroHeadEquipment.visible = false;
  for (const name of ['fishbowl-helmet-glass', 'fishbowlRim', 'fishbowlHighlight', 'heroRearBand', 'asymmetricHairLock']) {
    const object = headGroup.getObjectByName(name);
    if (object) object.visible = false;
  }
  applyPlayableCharacterVisuals();
}
function applyPlayableCharacterVisuals() {
  if (!heroRoot) return;
  const isBrujo = getActiveCharacterId() === 'brujo';
  brujoVisualParts.forEach(part => { part.visible = isBrujo; });
  const alternateColors = { torsoMesh:'#ded8cb', hipsMesh:'#5f272e', leftThighMesh:'#702e34', rightThighMesh:'#702e34' };
  heroRoot.traverse(object => {
    if (!object.isMesh || !alternateColors[object.name]) return;
    object.userData.characterBaseMaterial ||= object.material;
    if (isBrujo) {
      object.userData.brujoMaterial ||= object.material.clone();
      object.userData.brujoMaterial.color.set(alternateColors[object.name]);
      object.material = object.userData.brujoMaterial;
    } else object.material = object.userData.characterBaseMaterial;
  });
  const sideLock = headGroup.getObjectByName('asymmetricHairLock');
  if (sideLock) sideLock.visible = isBrujo;
  const kaelenHair = headGroup.getObjectByName('player-custom-hair');
  if (kaelenHair) kaelenHair.visible = !isBrujo;
  if (heroHeadEquipment) heroHeadEquipment.visible = false;
  applyKaelenAtlasToCharacter(THREE, heroRoot, kaelenAtlasTextures, !isBrujo, Boolean(getPlayerCharacterDesign()));
  const faceDecal = headGroup.getObjectByName('heroFaceDecal');
  if (faceDecal) faceDecal.visible = false;
  const sculptedNose = headGroup.getObjectByName('sculptedNose');
  if (sculptedNose) sculptedNose.visible = true;
}
function profileColor(profile) {
  let hash = 0;
  for (const character of String(profile.id) + profile.name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id));
  hideToast();
  if (audioManager && audioUnlocked) audioManager.switchTheme(id === 'screen-gameplay' ? 'gameplay' : 'menu');
  if (chapterScrollFrame) { cancelAnimationFrame(chapterScrollFrame); chapterScrollFrame = 0; }
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 2600);
}
function hideToast() { toast.classList.remove('visible'); }
function updateTrainingHud(course = trainingCourse) {
  const hud = document.getElementById('training-hud');
  if (!hud) return;
  hud.hidden = !trainingMode;
  if (!trainingMode) return;
  const lesson = course.lesson;
  if (lesson) document.getElementById('training-lesson-select').value = String(course.index);
  const title = document.getElementById('training-lesson-title');
  const count = document.getElementById('training-lesson-count');
  const instruction = document.getElementById('training-instruction');
  const controls = document.getElementById('training-controls');
  const fill = document.getElementById('training-progress-fill');
  const copy = document.getElementById('training-progress-copy');
  if (!lesson) {
    title.textContent = 'Entrenamiento completo';
    count.textContent = course.completedCount + ' / ' + COMBAT_TRAINING_LESSONS.length + ' ejercicios';
    instruction.textContent = 'Puedes repetir cualquier lección desde el menú de práctica.';
    controls.textContent = '';
    fill.style.width = '100%';
    copy.textContent = course.completedCount + ' completadas · ' + course.status.filter(status => status === 'skipped').length + ' saltadas';
    return;
  }
  const requirements = Object.entries(lesson.requirements);
  const total = requirements.reduce((sum, [, value]) => sum + value, 0);
  const done = requirements.reduce((sum, [action, value]) => sum + Math.min(value, course.progress[action] || 0), 0);
  const status = course.status[course.index];
  title.textContent = lesson.title;
  count.textContent = 'Lección ' + (course.index + 1) + ' / ' + COMBAT_TRAINING_LESSONS.length;
  instruction.textContent = trainingHelpVisible ? lesson.instruction : '';
  controls.textContent = trainingHelpVisible ? lesson.controls : '';
  fill.style.width = Math.round(total ? done / total * 100 : 0) + '%';
  copy.textContent = status === 'complete' ? 'Ejercicio completado · ' + course.completedCount + ' lecciones superadas' : done + ' / ' + total + ' acciones';
  document.getElementById('training-continue-button').disabled = !['complete', 'skipped'].includes(status);
  document.getElementById('training-continue-button').textContent = course.index === COMBAT_TRAINING_LESSONS.length - 1 && status === 'complete' ? 'FINALIZAR' : 'CONTINUAR';
  document.getElementById('training-pause-button').textContent = course.paused ? 'REANUDAR' : 'PAUSAR';
}
function recordTrainingAction(action, amount = 1) {
  if (!trainingMode) return false;
  const completed = trainingCourse.record(action, amount);
  if (completed) {
    audioManager?.playTutorialChime();
    showToast('Ejercicio completado. Puedes continuar o repetirlo.');
  }
  return completed;
}
function captureTrainingSnapshot() {
  return {
    position: heroGroup.position.clone(), yaw: heroRoot.rotation.y, cameraYaw, cameraPitch,
    health: heroHealth, invulnerabilityExpiresAt,
    lockedTarget: lockedEnemy,
    thrown: weaponThrown && thrownWeapon ? { position: thrownWeapon.position.clone(), quaternion: thrownWeapon.quaternion.clone() } : null,
    enemies: enemyCombatants.map(enemy => ({
      enemy,
      position: enemy.position.clone(),
      rotation: enemy.rotation.y,
      health: enemy.userData.health,
      ai: { ...enemy.userData.ai, knockback: enemy.userData.ai.knockback ? { ...enemy.userData.ai.knockback } : null }
    }))
  };
}
function activateTrainingArena() {
  trainingMode = true;
  enterArenaTerrain();
  trainingCourse.start();
  if (trainingSelectedLesson > 0) trainingCourse.select(trainingSelectedLesson);
  trainingDebugEnabled = false;
  document.getElementById('training-debug-toggle').checked = false;
  trainingHelpVisible = true;
  document.getElementById('training-help-toggle').checked = true;
  document.getElementById('training-ai-mode').value = trainingAiStyle;
  trainingEnemy = createEnemyCombatant({ x: 0, z: -3.2, rotationY: 0, tint: .12 });
  trainingEnemy.userData.trainingOpponent = true;
  trainingEnemy.userData.health = trainingEnemy.userData.maxHealth;
  trainingEnemy.userData.ai.trainingMode = true;
  trainingEnemy.userData.ai.trainingStyle = trainingAiStyle;
  trainingEnemy.userData.ai.attackCooldown = .8;
  for (const enemy of enemyCombatants) {
    if (enemy !== trainingEnemy) enemy.userData.ai.trainingDisabled = true;
  }
  trainingDummy.userData.hitCount = 0;
  trainingDummy.userData.hitTimer = 0;
  trainingDummy.position.set(-3.2, 0, -3.5);
  updateTrainingDummyLabel();
  if (thrownWeapon) scene.remove(thrownWeapon);
  thrownWeapon = null; weaponThrown = false;
  heroGroup.position.set(0, 0, 3.2);
  trainingLastPosition.copy(heroGroup.position);
  heroRoot.rotation.y = Math.atan2(trainingEnemy.position.x - heroRoot.position.x, trainingEnemy.position.z - heroRoot.position.z);
  cameraYaw = heroRoot.rotation.y;
  cameraPitch = 0;
  movementVelocity.set(0, 0);
  heroHealth = 100;
  setLockedEnemy(null);
  if (trainingCourse.index === COMBAT_TRAINING_LESSONS.length - 1) ensureTrainingGroup();
  camera.position.set(heroGroup.position.x, 5.8, heroGroup.position.z + 8);
  cameraTarget.set(heroGroup.position.x, 1.1, heroGroup.position.z);
  cameraFocusGoal.copy(cameraTarget);
  camera.lookAt(cameraTarget);
  syncEquippedVisuals();
  updateTrainingHud();
}
function startTrainingFromMenu() {
  if (!getSelectedProfile()) { renderProfiles(); showScreen('screen-profiles'); return; }
  gameSessionMode = 'solo';
  trainingOrigin = 'menu';
  trainingSnapshot = null;
  trainingPending = true;
  trainingMode = true;
  startAdventure();
}
function startTrainingFromGameplay() {
  if (!gameMode || trainingMode) return;
  trainingOrigin = 'game';
  trainingSnapshot = captureTrainingSnapshot();
  closeGamePanel();
  activateTrainingArena();
}
function removeTrainingOpponents() {
  const extras = [trainingEnemy, ...trainingExtraEnemies].filter(Boolean);
  for (const enemy of extras) {
    scene.remove(enemy);
    enemyCombatants = enemyCombatants.filter(candidate => candidate !== enemy);
    enemy.traverse(object => {
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material.dispose?.());
    });
  }
  trainingEnemy = null;
  trainingExtraEnemies = [];
  window.enemyCombatants = enemyCombatants;
  for (const enemy of enemyCombatants) if (enemy.userData.ai) delete enemy.userData.ai.trainingDisabled;
}
function exitTrainingSession() {
  if (!trainingMode) return;
  trainingCourse.stop();
  if (trainingDebugGroup) { scene.remove(trainingDebugGroup); trainingDebugGroup = null; }
  removeTrainingOpponents();
  leaveArenaTerrain();
  trainingMode = false;
  trainingPending = false;
  document.getElementById('training-hud').hidden = true;
  setLockedEnemy(null);
  if (trainingOrigin === 'game' && trainingSnapshot) {
    heroGroup.position.copy(trainingSnapshot.position);
    heroRoot.rotation.y = trainingSnapshot.yaw;
    cameraYaw = trainingSnapshot.cameraYaw;
    cameraPitch = trainingSnapshot.cameraPitch;
    heroHealth = trainingSnapshot.health;
    invulnerabilityExpiresAt = trainingSnapshot.invulnerabilityExpiresAt;
    for (const state of trainingSnapshot.enemies || []) {
      if (!state.enemy.parent) continue;
      state.enemy.position.copy(state.position);
      state.enemy.rotation.y = state.rotation;
      state.enemy.userData.health = state.health;
      Object.assign(state.enemy.userData.ai, state.ai);
    }
    if (trainingSnapshot.thrown && rpgState?.equipment?.weapon) {
      throwOrRecoverWeapon();
      if (thrownWeapon) {
        thrownWeapon.position.copy(trainingSnapshot.thrown.position);
        thrownWeapon.quaternion.copy(trainingSnapshot.thrown.quaternion);
        thrownWeaponVelocity.set(0, 0, 0);
        thrownWeaponTimer = 3;
        syncWeaponActionButton();
      }
    }
    camera.position.set(heroGroup.position.x, 5.8, heroGroup.position.z + 8);
    cameraTarget.set(heroGroup.position.x, 1.1, heroGroup.position.z);
    cameraFocusGoal.copy(cameraTarget);
    camera.lookAt(cameraTarget);
    const previousTarget = trainingSnapshot.lockedTarget;
    trainingSnapshot = null;
    if (previousTarget && isLockTargetAlive(previousTarget)) setLockedEnemy(previousTarget);
    updatePlayerHealthHud();
    updateTrainingHud();
    return;
  }
  trainingSnapshot = null;
  if(storyTrainingPending){storyTrainingPending=false;gameMode=false;manualPaused=false;startAdventure();startWalpiraOpeningCinematic();return;}
  gameMode = false;
  manualPaused = false;
  showScreen('screen-main');
}
function ensureTrainingGroup() {
  if (trainingExtraEnemies.length) return;
  trainingExtraEnemies = [
    createEnemyCombatant({ x: -3, z: -6.2, rotationY: .35, tint: .18 }),
    createEnemyCombatant({ x: 3, z: -6.2, rotationY: -.35, tint: .24 })
  ];
  for (const enemy of trainingExtraEnemies) {
    enemy.userData.trainingOpponent = true;
    enemy.userData.ai.trainingMode = true;
    enemy.userData.ai.trainingStyle = 'passive';
    enemy.userData.ai.attackCooldown = 999;
  }
}
function updateTrainingDebug() {
  if (!trainingMode || !trainingDebugEnabled) {
    if (trainingDebugGroup) trainingDebugGroup.visible = false;
    document.getElementById('training-diagnostics').hidden = true;
    return;
  }
  if (!trainingDebugGroup) {
    trainingDebugGroup = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(.85, .9, 28), new THREE.MeshBasicMaterial({ color: '#80e6ff', side: THREE.DoubleSide, transparent: true, opacity: .8 }));
    ring.name = 'training-player-radius'; ring.rotation.x = -Math.PI / 2; ring.position.y = .04; trainingDebugGroup.add(ring);
    const target = new THREE.Mesh(new THREE.RingGeometry(.85, .9, 28), new THREE.MeshBasicMaterial({ color: '#ffb86c', side: THREE.DoubleSide, transparent: true, opacity: .8 }));
    target.name = 'training-target-radius'; target.rotation.x = -Math.PI / 2; target.position.y = .05; trainingDebugGroup.add(target);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1.2, 0)]), new THREE.LineBasicMaterial({ color: '#ffe58a' }));
    line.name = 'training-facing-line'; trainingDebugGroup.add(line);
    scene.add(trainingDebugGroup);
  }
  trainingDebugGroup.visible = true;
  trainingDebugGroup.position.set(heroRoot.position.x, 0, heroRoot.position.z);
  const target = trainingDebugGroup.getObjectByName('training-target-radius');
  target.position.set(trainingEnemy?.position.x - heroRoot.position.x || 0, .05, trainingEnemy?.position.z - heroRoot.position.z || 0);
  const line = trainingDebugGroup.getObjectByName('training-facing-line');
  line.rotation.y = heroRoot.rotation.y;
  const distance = trainingEnemy ? Math.hypot(trainingEnemy.position.x - heroRoot.position.x, trainingEnemy.position.z - heroRoot.position.z).toFixed(1) : '—';
  document.getElementById('training-diagnostics').hidden = false;
  document.getElementById('training-diagnostics').textContent = 'Distancia ' + distance + ' m · Estado ' + comboState + ' · IA ' + (trainingEnemy?.userData.ai.trainingStyle || trainingAiStyle) + ' · Ventana ' + comboInputWindow.toFixed(2) + ' s';
}
function openProfileModal() {
  document.getElementById('form-error').textContent = '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => nameInput.focus(), 120);
}
function closeProfileModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  nameInput.value = '';
}
function renderProfiles() {
  profileArea.replaceChildren();
  if (!profiles.length) {
    const message = document.createElement('p');
    message.className = 'empty-message';
    message.textContent = 'No tienes perfiles creados. Crea uno para comenzar.';
    const createButton = document.createElement('button');
    createButton.className = 'primary-create';
    createButton.textContent = 'CREAR PERFIL';
    createButton.addEventListener('click', openProfileModal);
    profileArea.append(message, createButton);
    return;
  }
  const list = document.createElement('div');
  list.className = 'profile-list';
  profiles.forEach(profile => {
    const card = document.createElement('article');
    card.className = 'profile-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', profile.name);
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.backgroundColor = profileColor(profile);
    avatar.textContent = (profile.name.trim()[0] || '?').toLocaleUpperCase('es');
    const details = document.createElement('div');
    details.className = 'profile-details';
    const profileName = document.createElement('span');
    profileName.className = 'profile-name';
    profileName.textContent = profile.name;
    const level = document.createElement('span');
    level.className = 'profile-level';
    level.textContent = 'Nivel ' + (profile.lastSavedLevel || 1);
    const date = document.createElement('span');
    date.className = 'profile-date';
    date.textContent = 'Última partida: ' + (profile.lastSavedDate || 'Sin partidas');
    details.append(profileName, level, date);
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-profile';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', event => {
      event.stopPropagation();
      if (!window.confirm('¿Eliminar el perfil «' + profile.name + '»?')) return;
      profiles = profiles.filter(item => item.id !== profile.id);
      saveProfiles();
      renderProfiles();
    });
    const select = () => {
      selectedProfileId = profile.id;
      renderMainMenu();
      showScreen('screen-main');
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', event => { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(); } });
    card.append(avatar, details, deleteButton);
    list.append(card);
  });
  const createButton = document.createElement('button');
  createButton.className = 'primary-create';
  createButton.textContent = 'CREAR NUEVO PERFIL';
  createButton.addEventListener('click', openProfileModal);
  profileArea.append(list, createButton);
}
function getProfileBestiary(profile) {
  const roster = Array.isArray(profile?.bestiary) ? profile.bestiary : [];
  if (!profile) return [];
  profile.bestiary = roster;
  return roster;
}
function unlockBestiaryEntry(creatureId) {
  const profile = getSelectedProfile();
  if (!profile) return;
  const roster = getProfileBestiary(profile);
  if (!roster.includes(creatureId)) roster.push(creatureId);
  saveProfiles();
}
function openBestiaryScreen() {
  renderBestiary();
  showScreen('screen-bestiary');
}
function renderBestiary() {
  const bestiaryGrid = document.getElementById('bestiary-grid');
  const bestiaryProgress = document.getElementById('bestiary-progress');
  if (!bestiaryGrid || !bestiaryProgress) return;
  const profile = getSelectedProfile();
  const roster = profile ? getProfileBestiary(profile) : [];
  bestiaryGrid.replaceChildren();
  BESTIARY_CREATURES.forEach(creature => {
    const discovered = roster.includes(creature.id);
    const card = document.createElement('article');
    card.className = 'bestiary-card' + (discovered ? ' discovered' : ' locked');
    card.innerHTML = '<div class="bestiary-sigil" style="background:' + creature.color + '"></div>' +
      '<div class="bestiary-copy"><h3>' + (discovered ? creature.name : '???') + '</h3>' +
      '<p class="bestiary-kind">' + (discovered ? creature.kind : 'Desconocido') + '</p>' +
      '<p class="bestiary-lore">' + (discovered ? creature.lore : 'Se revela al vencer a la criatura en combate.') + '</p>' +
      (discovered && creature.strategy ? '<p class="bestiary-strategy"><b>Estrategia</b> · ' + creature.strategy + '</p>' : '') +
      '<div class="bestiary-tags">' + (discovered ? (creature.abilities || []).map(ability => '<span>' + ability + '</span>').join('') : '<span>Sin registro</span>') + '</div></div>';
    bestiaryGrid.append(card);
  });
  bestiaryProgress.textContent = (profile ? roster.length : 0) + ' criaturas descubiertas';
}
function renderMainMenu() {
  const profile = profiles.find(item => item.id === selectedProfileId);
  if (!profile) { showScreen('screen-profiles'); return; }
  const activeProfile = document.getElementById('active-profile');
  activeProfile.replaceChildren();
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.backgroundColor = profileColor(profile);
  avatar.textContent = (profile.name.trim()[0] || '?').toLocaleUpperCase('es');
  const label = document.createElement('span');
  label.textContent = 'Perfil: ' + profile.name;
  activeProfile.append(avatar, label);
  const hasSave = Array.isArray(profile.saveSlots) && profile.saveSlots.some(slot => slot !== null);
  document.getElementById('continue-button').disabled = !hasSave;
  updatePlayableCharacterMenu();
}

document.getElementById('start-button').addEventListener('click', () => { renderProfiles(); showScreen('screen-profiles'); });
document.getElementById('profiles-back').addEventListener('click', () => showScreen('screen-home'));
document.getElementById('change-profile').addEventListener('click', () => { renderProfiles(); showScreen('screen-profiles'); });
document.getElementById('main-bestiary-button').addEventListener('click', () => openBestiaryScreen());
document.getElementById('game-bestiary-button').addEventListener('click', () => openBestiaryScreen());
document.getElementById('bestiary-back').addEventListener('click', () => { renderMainMenu(); showScreen('screen-main'); });
document.getElementById('home-options').addEventListener('click', () => showToast('Próximamente: opciones'));
document.querySelectorAll('.main-actions .main-button').forEach(button => button.addEventListener('click', () => {
  if (!button.disabled && button.dataset.message) showToast(button.dataset.message);
}));
document.getElementById('cancel-modal').addEventListener('click', closeProfileModal);
modal.addEventListener('click', event => { if (event.target === modal) closeProfileModal(); });
document.getElementById('profile-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) { document.getElementById('form-error').textContent = 'Escribe un nombre para continuar.'; return; }
  const profile = { id: Date.now() + Math.floor(Math.random() * 1000), name, lastSavedLevel: 1, lastSavedDate: 'Sin partidas', saveSlots: [null, null, null, null], unlockedCharacters:['kaelen'], activeCharacter:'kaelen', characterDesigns:{} };
  profiles.push(profile);
  saveProfiles();
  closeProfileModal();
  selectedProfileId = profile.id;
  renderMainMenu();
  showScreen('screen-main');
});
document.addEventListener('pointerdown', event => {
  const button = event.target.closest('.main-button, .primary-create, .create-button');
  if (!button || button.disabled) return;
  button.classList.add('pressed');
  setTimeout(() => button.classList.remove('pressed'), 150);
});

function createSurfaceNoise() {
  if (handDrawnNoise) return handDrawnNoise;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const image = context.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 112 + Math.floor(Math.random() * 32);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value; image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  handDrawnNoise = new THREE.CanvasTexture(canvas);
  handDrawnNoise.wrapS = handDrawnNoise.wrapT = THREE.RepeatWrapping;
  handDrawnNoise.repeat.set(5, 5);
  handDrawnNoise.colorSpace = THREE.NoColorSpace;
  return handDrawnNoise;
}
function applyHandDrawnSurface(surface, bumpScale = .045) {
  if (!surface) return surface;
  surface.bumpMap = null;
  surface.bumpScale = 0;
  delete surface.onBeforeCompile;
  delete surface.customProgramCacheKey;
  surface.userData.handDrawnStyle = false;
  return surface;
}
function createCalligraphyTexture(character) {
  if (calligraphyTextureCache.has(character)) return calligraphyTextureCache.get(character);
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 192;
  const context = canvas.getContext('2d');
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = 'bold 94px "Noto Serif SC", "Songti SC", serif';
  context.shadowColor = '#5c321d'; context.shadowBlur = 5;
  context.fillStyle = '#f3d99c'; context.fillText(character, 64, 92);
  context.shadowBlur = 0; context.strokeStyle = '#d4a861'; context.lineWidth = 3;
  context.strokeRect(17, 145, 24, 24);
  context.fillStyle = '#a94b39'; context.fillRect(20, 148, 18, 18);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  calligraphyTextureCache.set(character, texture);
  return texture;
}
function material(color, roughness = 0.8, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function createHeroFaceDecal(back = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (back) {
    ctx.fillStyle = '#34483c'; ctx.strokeStyle = '#14201a'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(25,89); ctx.quadraticCurveTo(125,62,231,89); ctx.lineTo(225,116); ctx.quadraticCurveTo(124,93,31,117); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#566e4c'; ctx.beginPath(); ctx.moveTo(34,101); ctx.lineTo(8,116); ctx.lineTo(34,130); ctx.lineTo(48,113); ctx.fill();
    ctx.beginPath(); ctx.moveTo(23,120); ctx.lineTo(4,151); ctx.lineTo(39,133); ctx.fill();
  } else {
    ctx.fillStyle = '#34483c'; ctx.strokeStyle = '#14201a'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(20,62); ctx.quadraticCurveTo(126,33,236,62); ctx.lineTo(231,89); ctx.quadraticCurveTo(126,67,25,91); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#24211e'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(61,105); ctx.quadraticCurveTo(81,96,103,104); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(153,104); ctx.quadraticCurveTo(175,96,195,105); ctx.stroke();
    ctx.fillStyle = '#11191a';
    ctx.beginPath(); ctx.ellipse(83,132,9,12,0,0,Math.PI*2); ctx.ellipse(173,132,9,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#b49a70';
    ctx.beginPath(); ctx.ellipse(84,132,3,7,0,0,Math.PI*2); ctx.ellipse(172,132,3,7,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#5e4134'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(114,169); ctx.quadraticCurveTo(130,174,147,169); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;
  texture.needsUpdate = true;
  return texture;
}
function createEnemyFaceDecal(back = false, dead = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dead) {
    ctx.fillStyle = '#1b1419'; ctx.strokeStyle = '#3b0f18'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(18,60); ctx.quadraticCurveTo(126,24,238,60); ctx.lineTo(233,90); ctx.quadraticCurveTo(126,66,24,92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ded6c9'; ctx.lineWidth = 8;
    for (const eyeX of [82, 174]) {
      ctx.beginPath(); ctx.moveTo(eyeX - 10, 119); ctx.lineTo(eyeX + 10, 143); ctx.moveTo(eyeX + 10, 119); ctx.lineTo(eyeX - 10, 143); ctx.stroke();
    }
    ctx.fillStyle = '#a72e37'; ctx.strokeStyle = '#57151d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(128, 171, 15, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (back) {
    ctx.fillStyle = '#1b1419'; ctx.strokeStyle = '#3b0f18'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(26,88); ctx.quadraticCurveTo(126,55,230,89); ctx.lineTo(225,118); ctx.quadraticCurveTo(125,94,30,118); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a2b2d'; ctx.beginPath(); ctx.moveTo(38,100); ctx.lineTo(8,118); ctx.lineTo(38,130); ctx.lineTo(52,112); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18,122); ctx.lineTo(2,155); ctx.lineTo(42,134); ctx.fill();
  } else {
    ctx.fillStyle = '#1b1419'; ctx.strokeStyle = '#3b0f18'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(18,60); ctx.quadraticCurveTo(126,24,238,60); ctx.lineTo(233,90); ctx.quadraticCurveTo(126,66,24,92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2b110f'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(58,106); ctx.quadraticCurveTo(82,92,102,105); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(154,105); ctx.quadraticCurveTo(176,92,198,106); ctx.stroke();
    ctx.fillStyle = '#ab0d12';
    ctx.beginPath(); ctx.ellipse(82,132,11,15,0,0,Math.PI*2); ctx.ellipse(174,132,11,15,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f7d7ad';
    ctx.beginPath(); ctx.ellipse(82,131,3.2,7.4,0,0,Math.PI*2); ctx.ellipse(174,131,3.2,7.4,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#7d201f'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(104,168); ctx.quadraticCurveTo(128,186,151,169); ctx.stroke();
    ctx.strokeStyle = '#3b090d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(112,112); ctx.lineTo(133,122); ctx.moveTo(144,122); ctx.lineTo(165,112); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;
  texture.needsUpdate = true;
  return texture;
}
function addMesh(parent, geometry, mat, position, scale, rotation) {
  const mesh = new THREE.Mesh(geometry, mat);
  if (position) mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}
function addCapsule(parent, radius, length, mat, position, rotation = [0, 0, 0]) {
  return addMesh(parent, new THREE.CapsuleGeometry(radius, length, 4, 8), mat, position, null, rotation);
}
function createHero() {
  brujoVisualParts = [];
  heroHeadEquipment = null;
  heroHelmetGroup = null;
  heroChestEquipment = [];
  heroShoulderEquipment = [];
  heroGloveEquipment = [];
  heroLegEquipment = [];
  heroBaseLegParts = [];
  heroBootEquipment = [];
  equipmentDrawn = false;
  equipmentDrawTransition = null;
  const group = (parent, name, position = [0, 0, 0]) => {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(...position);
    parent.add(node);
    return node;
  };
  const part = (parent, name, geometry, mat, position = [0, 0, 0], scale = null, rotation = null) => {
    const mesh = addMesh(parent, geometry, mat, position, scale, rotation);
    mesh.name = name;
    return mesh;
  };
  heroRoot = new THREE.Group();
  heroRoot.name = 'heroRoot';
  heroRoot.position.set(0, 0, 0);
  heroRoot.visible = true;
  heroGroup = heroRoot;
  scene.add(heroRoot);
  comboFlashLight = new THREE.PointLight('#fff0b0', 0, 4.5, 2);
  comboFlashLight.position.set(0, 1.1, .1);
  comboFlashLight.visible = false;
  heroRoot.add(comboFlashLight);
  const heroRimLight = new THREE.PointLight('#d6d7c4', .42, 5.5, 2);
  heroRimLight.position.set(.35, 2.1, -1.05);
  heroRoot.add(heroRimLight);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(64, 64, 2, 64, 64, 64);
  shadowGradient.addColorStop(0, 'rgba(18,12,8,.34)');
  shadowGradient.addColorStop(.62, 'rgba(18,12,8,.13)');
  shadowGradient.addColorStop(1, 'rgba(18,12,8,0)');
  shadowContext.fillStyle = shadowGradient; shadowContext.fillRect(0, 0, 128, 128);
  const heroShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false }));
  heroShadow.rotation.x = -Math.PI / 2; heroShadow.position.y = .018; heroShadow.renderOrder = 1; heroShadow.name = 'soft-ground-shadow'; heroRoot.add(heroShadow);

  const skin = material('#f0c9a3', .94, 0);
  const armor = material('#f1ede3', .42, .36);
  const pauldronMetal = material('#eeeae0', .48, .28);
  const jade = material('#28201c', .86, .02);
  const bronze = material('#c49a55', .48, .54);
  const bronzeArmor = material('#e6e0d2', .44, .42);
  const leather = material('#241b19', .88, .03);
  const cloth = material('#702e34', .78, .02);
  const shirt = material('#eeeae0', .9, .08);
  const hatMaterial = material('#493628', .92, 0);
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#d1d9ca', emissive: '#a4773e', emissiveIntensity: .18, roughness: .28, metalness: .84 });

  hips = group(heroRoot, 'hips', [0, .95, 0]);
  part(hips, 'hipsMesh', createRoundedBoxGeometry(THREE, .32, .15, .24, .04), cloth, [0, .08, 0]);
  spine = group(hips, 'spine', [0, .45, 0]);
  torso = group(spine, 'torso', [0, 0, .02]);
  const bodyGeometry = createRoundedBoxGeometry(THREE, .58, .72, .34, .085);
  part(torso, 'torsoMesh', bodyGeometry, shirt, [0, .08, 0]);
  part(torso, 'ivoryCuirass', createRoundedBoxGeometry(THREE, .47, .56, .065, .055), armor, [0, .06, .19]);
  for (const side of [-1, 1]) part(torso, 'cuirassTrim' + side, new THREE.BoxGeometry(.055, .46, .022), jade, [side * .15, .055, .23]);
  chestGroup = group(torso, 'chest', [0, .06, 0]);
  heroChestEquipment.push(part(torso, 'bronzeCuirass', new THREE.CylinderGeometry(.244, .214, .48, 12, 1, true, -Math.PI / 3, Math.PI * 2 / 3), bronzeArmor, [0, .025, 0]));
  const jadePlateShape = new THREE.Shape();
  jadePlateShape.moveTo(-.17, .20); jadePlateShape.lineTo(.17, .20); jadePlateShape.lineTo(.145, -.07); jadePlateShape.quadraticCurveTo(0, -.23, -.145, -.07); jadePlateShape.closePath();
  heroChestEquipment.push(part(torso, 'carvedJadeCuirass', new THREE.ExtrudeGeometry(jadePlateShape, { depth: .035, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .012, bevelThickness: .008 }), armor, [0, .025, .225]));
  heroChestEquipment.push(part(torso, 'cuirassSeam', new THREE.BoxGeometry(.018, .32, .018), bronze, [0, .02, .251]));
  part(torso, 'waistBeltMesh', new THREE.TorusGeometry(.205, .025, 8, 24), leather, [0, -.23, 0], null, [Math.PI / 2, 0, 0]);
  part(torso, 'beltBuckleMesh', new THREE.BoxGeometry(.065, .055, .025), bronze, [0, -.23, .078]);
  part(torso, 'leftChestStrap', new THREE.BoxGeometry(.055, .46, .022), leather, [.15, .055, .23]);
  part(torso, 'rightChestStrap', new THREE.BoxGeometry(.055, .46, .022), leather, [-.15, .055, .23]);
  part(torso, 'chestSigil', new THREE.OctahedronGeometry(.072, 0), bronze, [0, .12, .238], [1, 1.25, .55]);

  leftShoulder = group(chestGroup, 'leftShoulder', [.265, .17, 0]);
  rightShoulder = group(chestGroup, 'rightShoulder', [-.265, .17, .06]);
  for (const [shoulder, side] of [[leftShoulder, 'left'], [rightShoulder, 'right']]) {
    const padScale = [1, 1, 1];
    heroShoulderEquipment.push(part(shoulder, side + 'ShoulderPad', new THREE.SphereGeometry(.11, 12, 8), pauldronMetal, [0, 0, 0], padScale));
    heroShoulderEquipment.push(part(shoulder, side + 'ShoulderTrim', new THREE.TorusGeometry(side === 'left' ? .12 : .085, .007, 6, 14), bronze, [0, 0, .01], [padScale[0], padScale[1], 1]));
    for (const rivetSide of [-1, 1]) heroShoulderEquipment.push(part(shoulder, side + 'PauldronRivet' + rivetSide, new THREE.SphereGeometry(.014, 8, 6), bronze, [rivetSide * .065, -.035, .096]));
    part(shoulder, side + 'UpperArmMesh', new THREE.CapsuleGeometry(.075, .18, 4, 8), pauldronMetal, [0, -.14, .015]);
  }
  leftElbow = group(leftShoulder, 'leftElbow', [0, -.31, 0]);
  rightElbow = group(rightShoulder, 'rightElbow', [0, -.31, 0]);
  for (const [elbow, side] of [[leftElbow, 'left'], [rightElbow, 'right']]) {
    part(elbow, side + 'ElbowJoint', new THREE.SphereGeometry(.063, 10, 8), skin);
    part(elbow, side + 'ForearmMesh', new THREE.CapsuleGeometry(.056, .24, 4, 8), skin, [0, -.14, 0]);
    part(elbow, side + 'BracerMesh', new THREE.CylinderGeometry(.069, .069, .11, 10), bronzeArmor, [0, -.12, .012]);
  }
  leftWrist = group(leftElbow, 'leftWrist', [0, -.29, 0]);
  rightWrist = group(rightElbow, 'rightWrist', [0, -.29, 0]);
  leftHand = group(leftWrist, 'leftHand', [0, 0, 0]);
  rightHand = group(rightWrist, 'rightHand', [0, 0, 0]);
  leftShoulder.rotation.z = .08;
  rightShoulder.rotation.x = -.72;
  rightShoulder.rotation.z = -.08;
  rightElbow.rotation.x = -.78;
  leftElbow.rotation.x = -.18;
  part(leftHand, 'leftHandMesh', new THREE.SphereGeometry(.067, 12, 10), skin);
  part(rightHand, 'rightHandMesh', new THREE.SphereGeometry(.067, 12, 10), skin, [0, 0, .035]);
  for (const [hand, side] of [[leftHand, 'left'], [rightHand, 'right']]) {
    heroGloveEquipment.push(part(hand, side + 'BasicGlove', new THREE.SphereGeometry(.073, 12, 9), pauldronMetal, [0, -.015, .025], [1.05, .78, 1.12]));
  }

  const shield = group(leftHand, 'shield', [0, 0, .17]);
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(-.235, .225); shieldShape.quadraticCurveTo(0, .285, .235, .225);
  shieldShape.lineTo(.245, -.045); shieldShape.quadraticCurveTo(.21, -.19, 0, -.315);
  shieldShape.quadraticCurveTo(-.21, -.19, -.245, -.045); shieldShape.closePath();
  shieldField = part(shield, 'shieldDisc', new THREE.ShapeGeometry(shieldShape, 12), new THREE.MeshStandardMaterial({ color: '#46584a', roughness: .5, metalness: .3, transparent: true, opacity: .9, side: THREE.DoubleSide }), [0, 0, 0]);
  const shieldEdge = new THREE.BufferGeometry().setFromPoints(shieldShape.getPoints(48).map(point => new THREE.Vector3(point.x, point.y, .018)));
  shieldRim = new THREE.LineLoop(shieldEdge, new THREE.LineBasicMaterial({ color: '#c6a767', transparent: true, opacity: .88 }));
  shieldRim.name = 'shieldRim'; shield.add(shieldRim);
  part(shield, 'shieldBoss', new THREE.OctahedronGeometry(.075, 0), bronze, [0, -.01, .035]);
  const shieldInsignia = new THREE.Mesh(new THREE.PlaneGeometry(.19, .24), new THREE.MeshBasicMaterial({ map: createCalligraphyTexture('山'), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  shieldInsignia.position.set(0, -.04, .026); shield.add(shieldInsignia);
  shieldLight = new THREE.PointLight('#e6c27c', .10, 1.5); shieldLight.position.set(0, 0, .16); shield.add(shieldLight);
  rightHandGrip = group(rightHand, 'rightHandGrip', [0, 0, .04]);
  rightHandGrip.rotation.set(-.38, .22, -.82);
  swordGroup = group(rightHandGrip, 'sword', [0, 0, 0]);
  swordGroup.rotation.set(.18, -.12, Math.PI - .38);
  part(swordGroup, 'swordGrip', new THREE.CylinderGeometry(.018, .018, .16, 10), leather, [0, 0, 0]);
  part(swordGroup, 'swordPommel', new THREE.SphereGeometry(.032, 10, 8), bronze, [0, -.105, 0]);
  swordGuard = part(swordGroup, 'swordGuard', new THREE.BoxGeometry(.16, .03, .042), bronze, [0, .095, 0]);
  const bladeProfile = new THREE.Shape();
  bladeProfile.moveTo(-.04, -.26); bladeProfile.lineTo(.04, -.26);
  bladeProfile.lineTo(.029, .14); bladeProfile.lineTo(0, .30); bladeProfile.lineTo(-.029, .14); bladeProfile.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeProfile, { depth: .026, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .004, bevelThickness: .004 });
  swordBlade = part(swordGroup, 'swordBlade', bladeGeometry, bladeMat, [0, .37, 0]);
  part(swordGroup, 'swordBladeCore', new THREE.BoxGeometry(.016, .42, .032), new THREE.MeshBasicMaterial({ color: '#ecfff8', toneMapped: false }), [0, .37, .018]);
  swordLight = new THREE.PointLight('#e6bd74', .32, 2.2); swordLight.position.set(0, .37, .1); swordGroup.add(swordLight);
  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(24 * 3);
  bladeSparkData = Array.from({ length: 24 }, () => ({ age: Math.random(), life: .12 + Math.random() * .38, x: (Math.random() - .5) * .12, y: .12 + Math.random() * .55, z: (Math.random() - .5) * .10 }));
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3).setUsage(THREE.DynamicDrawUsage));
  bladeSparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ color: '#ffe19a', size: .045, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  swordGroup.add(bladeSparks);
  axeGroup = group(swordGroup, 'weapon-axe');
  const axeWood = material('#765337', .92, .02);
  const axeSteel = material('#aab4b4', .3, .78);
  part(axeGroup, 'axeHaft', new THREE.CylinderGeometry(.023, .032, .55, 9), axeWood, [0, .12, 0]);
  const axeHeadShape = new THREE.Shape();
  axeHeadShape.moveTo(-.02, .18); axeHeadShape.lineTo(.13, .23); axeHeadShape.quadraticCurveTo(.35, .19, .34, .02);
  axeHeadShape.quadraticCurveTo(.29, -.08, .13, -.07); axeHeadShape.lineTo(-.02, -.01); axeHeadShape.closePath();
  part(axeGroup, 'axeHead', new THREE.ExtrudeGeometry(axeHeadShape, { depth: .045, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .012, bevelThickness: .012 }), axeSteel, [0, .27, -.022]);
  part(axeGroup, 'axeSocket', new THREE.CylinderGeometry(.055, .065, .11, 8), axeWood, [.035, .29, 0], null, [0, 0, Math.PI / 2]);
  daggerGroup = group(swordGroup, 'weapon-dagger');
  const daggerMaterial = material('#c2cec9', .26, .82);
  part(daggerGroup, 'daggerGrip', new THREE.CylinderGeometry(.022, .026, .2, 8), leather, [0, -.09, 0]);
  part(daggerGroup, 'daggerBlade', new THREE.ConeGeometry(.065, .38, 4), daggerMaterial, [0, .2, 0], [1, 1, .32]);
  part(daggerGroup, 'daggerGuard', new THREE.BoxGeometry(.17, .025, .035), bronze, [0, .015, 0]);
  staffGroup = group(swordGroup, 'weapon-staff');
  const staffWood = material('#604734', .88, .03);
  const staffGem = new THREE.MeshStandardMaterial({ color: '#c45740', emissive: '#8c251c', emissiveIntensity: .55, roughness: .22, metalness: .3 });
  part(staffGroup, 'staffShaft', new THREE.CylinderGeometry(.027, .045, .76, 9), staffWood, [0, .18, 0]);
  part(staffGroup, 'staffCollar', new THREE.TorusGeometry(.075, .018, 6, 12), bronze, [0, .48, 0]);
  part(staffGroup, 'staffGem', new THREE.OctahedronGeometry(.105, 0), staffGem, [0, .59, 0]);
  spearGroup=group(swordGroup,'weapon-spear');
  part(spearGroup,'spearShaft',new THREE.CylinderGeometry(.022,.032,.98,8),staffWood,[0,.18,0]);
  part(spearGroup,'spearTip',new THREE.ConeGeometry(.075,.24,5),axeSteel,[0,.79,0]);
  part(spearGroup,'spearWrap',new THREE.TorusGeometry(.045,.012,5,10),leather,[0,.53,0],null,[Math.PI/2,0,0]);
  bowGroup=group(leftHand,'weapon-bow',[0,.08,.16]);
  const bowMaterial=material('#765337',.86,.02);
  const bowCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.48,0),new THREE.Vector3(.18,-.32,0),new THREE.Vector3(.25,0,0),new THREE.Vector3(.18,.32,0),new THREE.Vector3(0,.48,0)]);
  bowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(bowCurve,24,.035,7,false),bowMaterial));
  bowGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.48,.01),new THREE.Vector3(0,.48,.01)]),new THREE.LineBasicMaterial({color:'#dbc993'})));
  axeGroup.visible = daggerGroup.visible = staffGroup.visible = false;
  spearGroup.visible=bowGroup.visible=false;

  neck = group(chestGroup, 'neck', [0, .43, 0]);
  part(neck, 'neckMesh', new THREE.CylinderGeometry(.065, .075, .12, 8), skin);
  headGroup = group(neck, 'head', [0, .23, 0]);
  part(headGroup, 'headMesh', createRoundedBoxGeometry(THREE, .34, .38, .30, .045), skin);
  const eyeWhite = material('#f5f0e3', .55, 0);
  const eyePupil = material('#302721', .46, .04);
  for (const side of [-1, 1]) {
    part(headGroup, side < 0 ? 'leftEyeWhite' : 'rightEyeWhite', new THREE.SphereGeometry(.024, 10, 8), eyeWhite, [side * .071, .025, .148], [1, .72, .48]);
    part(headGroup, side < 0 ? 'leftEyePupil' : 'rightEyePupil', new THREE.SphereGeometry(.011, 8, 6), eyePupil, [side * .071, .025, .158], [1, 1, .5]);
    part(headGroup, side < 0 ? 'leftEyebrow' : 'rightEyebrow', new THREE.CapsuleGeometry(.009, .045, 2, 5), leather, [side * .071, .062, .15], null, [0, 0, side * -.08]);
  }
  part(headGroup, 'heroMouth', new THREE.BoxGeometry(.055, .008, .009), leather, [0, -.065, .147]);
  const faceDecal = new THREE.Mesh(new THREE.PlaneGeometry(.30, .32), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  faceDecal.name = 'heroFaceDecal'; faceDecal.visible = false; faceDecal.position.set(0, 0, .151); headGroup.add(faceDecal);
  const hairMaterial = material('#171717', .9, 0);
  const kaelenHair = new THREE.Group();
  kaelenHair.name = 'player-custom-hair';
  headGroup.add(kaelenHair);
  const baseHairMesh = (geometry, position, scale = null, rotation = null) => {
    const mesh = new THREE.Mesh(geometry, hairMaterial);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    kaelenHair.add(mesh);
  };
  baseHairMesh(new THREE.SphereGeometry(.17, 12, 8), [0, .105, -.02], [1, .55, 1]);
  for (const [x, y, z, tilt] of [
    [-.12, .19, .01, -.48], [-.045, .22, -.025, -.2], [.055, .21, -.02, .24], [.13, .18, -.015, .55],
    [-.15, .01, -.035, -.22], [.15, -.01, -.04, .24], [-.12, -.015, -.12, -.15], [-.04, -.03, -.145, -.08],
    [.055, -.035, -.145, .1], [.13, -.015, -.12, .2]
  ]) baseHairMesh(new THREE.CapsuleGeometry(.026, .13, 3, 6), [x, y, z], null, [0, 0, tilt]);
  part(headGroup, 'sculptedNose', new THREE.SphereGeometry(.032, 8, 6), skin, [0, -.025, .179], [.78, 1.15, 1.6]);
  part(headGroup, 'leftEar', new THREE.SphereGeometry(.045, 8, 6), skin, [-.16, -.005, -.01], [.68, 1.1, .8]);
  part(headGroup, 'rightEar', new THREE.SphereGeometry(.045, 8, 6), skin, [.16, -.005, -.01], [.68, 1.1, .8]);
  part(headGroup, 'asymmetricHairLock', new THREE.CapsuleGeometry(.032, .15, 2, 5), hairMaterial, [.13, .07, .055], [0, 0, 0], [1, 1, 1]);
  part(headGroup, 'hairBraidTie', new THREE.SphereGeometry(.045, 7, 5), bronze, [.16, -.105, -.01], [1, .7, .8]);
  const fishbowlGlass = new THREE.Mesh(new THREE.SphereGeometry(.186, 32, 24), new THREE.MeshPhysicalMaterial({ color: '#b6d8d0', roughness: .12, metalness: .08, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide, clearcoat: .9, clearcoatRoughness: .08 }));
  fishbowlGlass.name = 'fishbowl-helmet-glass'; fishbowlGlass.renderOrder = 2; headGroup.add(fishbowlGlass);
  const fishbowlRim = new THREE.Mesh(new THREE.TorusGeometry(.154, .018, 8, 32), bronze);
  fishbowlRim.rotation.x = Math.PI / 2; fishbowlRim.position.y = -.105; headGroup.add(fishbowlRim);
  const fishbowlHighlight = new THREE.Mesh(new THREE.TorusGeometry(.168, .006, 5, 32, Math.PI * .42), new THREE.MeshBasicMaterial({ color: '#e4f1d7', transparent: true, opacity: .6 }));
  fishbowlHighlight.position.set(-.025, .06, .10); fishbowlHighlight.rotation.set(.35, -.2, .35); headGroup.add(fishbowlHighlight);
  const rearBand = new THREE.Mesh(new THREE.PlaneGeometry(.18, .18), new THREE.MeshBasicMaterial({ map: createHeroFaceDecal(true), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  rearBand.name = 'heroRearBand'; rearBand.position.set(0, 0, -.166); rearBand.rotation.y = Math.PI; headGroup.add(rearBand);
  const travelHat = group(headGroup, 'traditionalTravelHat', [0, .17, 0]);
  heroHeadEquipment = travelHat;
  part(travelHat, 'hatBrim', new THREE.CylinderGeometry(.255, .255, .026, 28), hatMaterial);
  part(travelHat, 'hatCrown', new THREE.ConeGeometry(.145, .19, 10), hatMaterial, [0, .105, 0]);
  part(travelHat, 'hatBand', new THREE.TorusGeometry(.143, .009, 6, 20), bronze, [0, .018, 0], null, [Math.PI / 2, 0, 0]);
  heroHelmetGroup = group(headGroup, 'equipped-helmet', [0, .005, 0]);
  const helmetMaterial = material('#77857f', .38, .68);
  part(heroHelmetGroup, 'helmetDome', new THREE.SphereGeometry(.17, 16, 10, 0, Math.PI * 2, 0, Math.PI * .58), helmetMaterial, [0, .015, 0]);
  part(heroHelmetGroup, 'helmetBrow', new THREE.BoxGeometry(.34, .045, .075), bronzeArmor, [0, -.045, .125]);
  part(heroHelmetGroup, 'helmetNoseGuard', new THREE.BoxGeometry(.04, .15, .04), bronze, [0, -.12, .15]);
  heroHelmetGroup.visible = false;

  cape = group(chestGroup, 'cape', [0, .29, -.30]);
  const makeCapePanel = (parent, name, width, height, color, position) => {
    const panel = group(parent, name, position);
    const shape = new THREE.Shape();
    shape.moveTo(-width * .5, 0);
    shape.quadraticCurveTo(0, .04, width * .5, 0);
    shape.lineTo(width * .5 + .04, -height * .82);
    shape.quadraticCurveTo(0, -height, -width * .5 - .04, -height * .82);
    shape.closePath();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .95, side: THREE.DoubleSide });
    part(panel, name + 'Mesh', new THREE.ShapeGeometry(shape, 8), mat, [0, 0, -.015]);
    return panel;
  };
  const capeTop = makeCapePanel(cape, 'capeTop', .42, .38, '#71373a', [0, 0, 0]);
  const capeMid = makeCapePanel(capeTop, 'capeMid', .42, .32, '#5c2d34', [0, -.30, -.01]);
  makeCapePanel(capeMid, 'capeBottom', .46, .24, '#46272e', [0, -.25, -.01]);

  leftHip = group(hips, 'leftHip', [.13, .05, 0]);
  rightHip = group(hips, 'rightHip', [-.13, .05, 0]);
  for (const [hip, side] of [[leftHip, 'left'], [rightHip, 'right']]) {
    heroBaseLegParts.push(part(hip, side + 'ThighMesh', createRoundedBoxGeometry(THREE, .19, .47, .18, .04), cloth, [0, -.25, 0]));
    heroLegEquipment.push(part(hip, side + 'LegArmorShell', new THREE.CapsuleGeometry(.11, .37, 5, 10), armor, [0, -.25, .018]));
  }
  leftKnee = group(leftHip, 'leftKnee', [0, -.5, 0]);
  rightKnee = group(rightHip, 'rightKnee', [0, -.5, 0]);
  const bootMaterial = material('#202525', .94, 0);
  const bootTrim = material('#51483c', .92, 0);
  leftFoot = group(leftKnee, 'leftFoot', [0, -.49, 0]);
  rightFoot = group(rightKnee, 'rightFoot', [0, -.49, 0]);
  for (const [foot, side] of [[leftFoot, 'left'], [rightFoot, 'right']]) {
    heroBaseLegParts.push(part(foot.parent, side + 'KneeJoint', createRoundedBoxGeometry(THREE, .17, .16, .16, .035), cloth));
    heroBaseLegParts.push(part(foot.parent, side + 'ShinMesh', createRoundedBoxGeometry(THREE, .16, .41, .16, .035), cloth, [0, -.24, 0]));
    part(foot, side + 'FootBaseMesh', new THREE.SphereGeometry(1, 12, 8), skin, [0, .02, .045], [.095, .07, .16]);
    for (let toe = -1; toe <= 1; toe++) part(foot, side + 'Toe' + toe, new THREE.SphereGeometry(.035, 8, 6), skin, [toe * .045, .008, .16], [.8, .65, 1.2]);
    const boot = group(foot, side + 'BootEquipment');
    heroBootEquipment.push(boot);
    part(boot, side + 'BootUpper', new THREE.SphereGeometry(.12, 14, 10), bootMaterial, [0, .018, .085], [.84, .58, 1.22]);
    part(boot, side + 'BootToe', new THREE.SphereGeometry(.095, 12, 9), bootMaterial, [0, .008, .17], [.92, .58, 1.12]);
    part(boot, side + 'BootSole', new THREE.BoxGeometry(.19, .024, .27), leather, [0, -.045, .09]);
    part(boot, side + 'BootStrap', new THREE.BoxGeometry(.15, .018, .055), bootTrim, [0, .075, .035]);
  }

  const brujoRobe = material('#e2d8c4', .94, 0);
  const brujoTrim = material('#79664b', .82, .05);
  const robeShape = new THREE.Shape();
  robeShape.moveTo(-.21,.28); robeShape.lineTo(.21,.28); robeShape.lineTo(.24,-.2);
  robeShape.quadraticCurveTo(0,-.34,-.24,-.2); robeShape.closePath();
  brujoVisualParts.push(part(torso,'brujoRobeFront',new THREE.ExtrudeGeometry(robeShape,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.008}),brujoRobe,[0,-.015,.165]));
  const robeBackShape = new THREE.Shape();
  robeBackShape.moveTo(-.2,.18); robeBackShape.quadraticCurveTo(0,.25,.2,.18); robeBackShape.lineTo(.25,-.55);
  robeBackShape.quadraticCurveTo(0,-.66,-.25,-.55); robeBackShape.closePath();
  brujoVisualParts.push(part(chestGroup,'brujoRobeBack',new THREE.ShapeGeometry(robeBackShape,8),brujoRobe,[0,.03,-.19]));
  brujoVisualParts.push(part(torso,'brujoCollar',new THREE.TorusGeometry(.145,.025,7,20),brujoTrim,[0,.29,0],null,[Math.PI/2,0,0]));
  for (const shoulder of [leftShoulder,rightShoulder]) brujoVisualParts.push(part(shoulder,'brujoSleeve',new THREE.CapsuleGeometry(.076,.22,4,8),brujoRobe,[0,-.14,.025]));
  for (const [hip,side] of [[leftHip,'left'],[rightHip,'right']]) {
    for (let stripe=0;stripe<3;stripe++) brujoVisualParts.push(part(hip,'brujo-'+side+'-stripe-'+stripe,new THREE.TorusGeometry(.094,.008,5,16),brujoTrim,[0,-.14-stripe*.11,0],null,[Math.PI/2,0,0]));
  }
  const arcaneHair = part(headGroup,'brujoSideFringe',new THREE.CapsuleGeometry(.045,.18,4,8),material('#292523',.9),[-.08,.105,.105],null,[0,0,-.62]);
  brujoVisualParts.push(arcaneHair);
  const eyeGlowMaterial = new THREE.MeshStandardMaterial({color:'#d8c77b',emissive:'#7d682e',emissiveIntensity:1.4,roughness:.3});
  for (const x of [-.055,.055]) brujoVisualParts.push(part(headGroup,'brujoEyeGlow',new THREE.SphereGeometry(.014,8,6),eyeGlowMaterial,[x,-.01,.161]));
  brujoVisualParts.push(part(heroRoot,'brujoFocusStone',new THREE.OctahedronGeometry(.09,0),new THREE.MeshStandardMaterial({color:'#8f7cc0',emissive:'#554188',emissiveIntensity:.8,roughness:.24,metalness:.35}),[-.29,1.35,-.16]));

  hero.root = heroRoot;
  hero.heroRoot = heroRoot;
  hero.hips = hips;
  hero.spine = spine;
  hero.torso = torso;
  hero.chest = chestGroup;
  hero.neck = neck;
  hero.head = headGroup;
  hero.cape = cape;
  hero.leftShoulder = leftShoulder;
  hero.rightShoulder = rightShoulder;
  hero.leftElbow = leftElbow;
  hero.rightElbow = rightElbow;
  hero.leftWrist = leftWrist;
  hero.rightWrist = rightWrist;
  hero.leftHip = leftHip;
  hero.rightHip = rightHip;
  hero.leftKnee = leftKnee;
  hero.rightKnee = rightKnee;
  hero.leftHand = leftHand;
  hero.rightHand = rightHand;
  hero.shield = shield;
  hero.sword = swordGroup;
  hero.axe = axeGroup;
  hero.dagger = daggerGroup;
  hero.staff = staffGroup;
  hero.rightHandGrip = rightHandGrip;
  hero.leftFoot = leftFoot;
  hero.rightFoot = rightFoot;
  hero.backHarness = group(heroRoot, 'back-equipment-harness');
  part(hero.backHarness, 'backHarnessStrap', new THREE.BoxGeometry(.42, .075, .035), leather, [0, 1.35, -.235], null, [0, 0, -.22]);
  part(hero.backHarness, 'swordBackLoop', new THREE.BoxGeometry(.12, .07, .06), bronzeArmor, [-.22, 1.22, -.26]);
  part(hero.backHarness, 'shieldBackLoop', new THREE.BoxGeometry(.12, .07, .06), bronzeArmor, [.22, 1.36, -.26]);
  heroRoot.updateMatrixWorld(true);
  heroRoot.attach(swordGroup);
  swordGroup.position.set(-.22, 1.12, -.27);
  swordGroup.rotation.set(0, Math.PI, .12);
  heroRoot.attach(shield);
  shield.position.set(.22, 1.36, -.29);
  shield.rotation.set(0, Math.PI, 0);
  hero.backHarness.visible = false;
  window.hero = hero;

  slashTrails = [
    createSwordTrail(.22, .84, 'slashTrail1'),
    createSwordTrail(.27, .84, 'slashTrail2'),
    createSwordTrail(.42, .94, 'slashTrail3')
  ];
  slashTrails[2].glow = createSwordTrail(.72, .42, 'finisherSlashGlow');
  slashTrails.forEach(trail => scene.add(trail.mesh));
  scene.add(slashTrails[2].glow.mesh);
  dashWindTrail = createSwordTrail(.58, .78, 'dashWindSlash');
  dashWindTrail.dashWind = true;
  slashTrails.push(dashWindTrail);
  scene.add(dashWindTrail.mesh);
  const shockwaveMaterial = new THREE.MeshBasicMaterial({ color: '#f5f3e8', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), shockwaveMaterial);
  shockwaveRing.name = 'shockwaveRing';
  shockwaveRing.rotation.x = -Math.PI / 2;
  shockwaveRing.visible = false;
  scene.add(shockwaveRing);
  loadKaelenAtlasTextures(THREE).then(textures => {
    kaelenAtlasTextures = textures;
    applyKaelenAtlasToCharacter(THREE, heroRoot, textures, getActiveCharacterId() !== 'brujo', Boolean(getPlayerCharacterDesign()));
  }).catch(error => console.error('Error al cargar las texturas de Kaelen:', error));
}
function cityBox(parent, width, height, depth, mat, x, y, z, rz = 0) {
  return addMesh(parent, new THREE.BoxGeometry(width, height, depth), mat, [x, y, z], null, [0, 0, rz]);
}
function markWalkSurface(mesh, type) {
  mesh.userData.walkSurface = type;
  walkSurfaces.push(mesh);
  return mesh;
}
function registerCityCollider(x, z, width, depth, yaw = 0, padding = .28, owner = null) {
  cityColliders.push({ x, z, halfWidth: width * .5 + padding, halfDepth: depth * .5 + padding, yaw, owner });
}
function registerTownWall(building, localX, localZ, width, depth) {
  const { x, z } = building.position;
  const yaw = building.rotation.y;
  registerCityCollider(x + localX * Math.cos(yaw) + localZ * Math.sin(yaw), z - localX * Math.sin(yaw) + localZ * Math.cos(yaw), width, depth, yaw, .02);
}
function buildCameraBlockers() {
  cameraBlockers = cityColliders.map(box => {
    const width = box.halfWidth * 2;
    const depth = box.halfDepth * 2;
    const longSide = Math.max(width, depth);
    const shortSide = Math.min(width, depth);
    const height = shortSide > 8 ? 22 : shortSide > 4 ? 11 : shortSide > 2 ? 7 : longSide > 8 ? 5.5 : 4.5;
    const blocker = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial());
    blocker.position.set(box.x, height * .5, box.z);
    blocker.rotation.y = box.yaw;
    blocker.userData.enemyOwner = box.owner;
    blocker.updateMatrixWorld(true);
    return blocker;
  });
}
function makeRoofMaterial(color = '#755044') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = color; context.fillRect(0, 0, 256, 256);
  const tileColors = ['#8c5c48', '#745044', '#9a674c', '#69483f', '#815746'];
  for (let row = 0; row < 12; row++) {
    const offset = row % 2 ? -12 : 0;
    for (let col = -1; col < 9; col++) {
      const x = col * 32 + offset;
      context.fillStyle = tileColors[(row * 5 + col + 20) % tileColors.length];
      context.beginPath(); context.roundRect(x + 1, row * 22 + 1, 31, 21, [0, 0, 5, 5]); context.fill();
      context.strokeStyle = 'rgba(39,27,25,.48)'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(x + 2, row * 22 + 20); context.lineTo(x + 30, row * 22 + 20); context.stroke();
      context.strokeStyle = 'rgba(226,177,127,.18)'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(x + 3, row * 22 + 4); context.lineTo(x + 3, row * 22 + 16); context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, color: '#c0aaa0', roughness: .94, metalness: 0 });
}
let woodGrainTexture = null;
function makeWoodMaterial(color) {
  if (!woodGrainTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ddc39d'; context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 52; i++) {
      const x = Math.random() * 256, bend = 2 + Math.random() * 5;
      context.beginPath(); context.moveTo(x, 0);
      for (let y = 0; y <= 256; y += 32) context.lineTo(x + Math.sin(y * .035 + i) * bend, y);
      context.strokeStyle = i % 3 ? 'rgba(73,45,28,.12)' : 'rgba(255,244,216,.24)';
      context.lineWidth = 1 + Math.random() * 2; context.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      context.strokeStyle = 'rgba(77,47,29,.14)'; context.lineWidth = 2;
      context.beginPath(); context.ellipse(x,y,5,13,Math.random(),0,Math.PI*2); context.stroke();
    }
    woodGrainTexture = new THREE.CanvasTexture(canvas);
    woodGrainTexture.wrapS = woodGrainTexture.wrapT = THREE.RepeatWrapping;
    woodGrainTexture.repeat.set(1.5, 1);
    woodGrainTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return applyHandDrawnSurface(new THREE.MeshStandardMaterial({ color, map: woodGrainTexture, roughness: .86, metalness: .02 }), .018);
}
let ricePaperTexture = null;
function makeRicePaperMaterial(color) {
  if (!ricePaperTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#e8dcc2'; context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 210; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      context.strokeStyle = i % 2 ? 'rgba(111,91,63,.08)' : 'rgba(255,250,231,.35)';
      context.lineWidth = .5 + Math.random(); context.beginPath(); context.moveTo(x,y); context.lineTo(x + 2 + Math.random() * 9,y - 1 + Math.random() * 3); context.stroke();
    }
    ricePaperTexture = new THREE.CanvasTexture(canvas);
    ricePaperTexture.wrapS = ricePaperTexture.wrapT = THREE.RepeatWrapping;
    ricePaperTexture.repeat.set(2, 2);
    ricePaperTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return applyHandDrawnSurface(new THREE.MeshStandardMaterial({ color, map: ricePaperTexture, roughness: .96 }), .012);
}
function initCityMaterials() {
  cityMaterials = {
    stone: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 2, 0, '#817667', 2, 2), color: '#ffffff', roughness: .95 }), foundation: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 4, 3, '#51483d', 2, 2), color: '#e3dfd3', roughness: .98 }), paleStone: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 0, 2, '#b4a182', 2, 2), color: '#ffffff', roughness: .92 }), plaster: makeRicePaperMaterial('#c2ad88'), plasterPale: makeRicePaperMaterial('#d0bd9d'), plasterOchre: makeRicePaperMaterial('#a98a63'), timber: makeWoodMaterial('#815b3d'), timberLight: makeWoodMaterial('#a57c52'), lacquer: material('#813b32', .62, .12), jade: material('#557662', .54, .25), dark: material('#211b17', .96), glass: material('#263b3b', .3, .1), door: makeWoodMaterial('#785033'), roof: makeRoofMaterial('#704638'), roofRed: makeRoofMaterial('#8b4435'), roofGray: makeRoofMaterial('#5c6157'), gold: material('#c19a55', .5, .42), water: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 0, 6, '#426d72', 2, 2), color: '#b3d5df', roughness: .22, metalness: .25, transparent: true, opacity: .84 }), grass: new THREE.MeshStandardMaterial({ map: createGrassTileTexture(THREE), color: '#ffffff', roughness: .98 }), leaf: material('#40513a', .98), leafLight: material('#62734b', .98), road: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 1, 2, '#948675', 2, 2), color: '#ffffff', roughness: .98 }), cobble: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 4, 2, '#a0947f', 2, 2), color: '#ffffff', roughness: .96 }), planks: new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 0, 7, '#815b3d', 1, 2), color: '#ffffff', roughness: .86 }), iron: material('#45413a', .6, .5)
  };
}
function addBuildingWindow(parent, x, y, z, side = 'front', width = .76) {
  const frame = new THREE.Group();
  frame.position.set(x, y, z);
  if (side === 'left') frame.rotation.y = -Math.PI / 2;
  if (side === 'right') frame.rotation.y = Math.PI / 2;
  parent.add(frame);
  cityBox(frame, width, .88, .07, cityMaterials.timber, 0, 0, 0);
  cityBox(frame, width - .14, .68, .025, cityMaterials.glass, 0, .02, .05);
  cityBox(frame, .075, .66, .045, cityMaterials.timberLight, 0, .02, .075);
  cityBox(frame, width - .16, .07, .045, cityMaterials.timberLight, 0, .02, .078);
  cityBox(frame, width + .18, .10, .16, cityMaterials.timber, 0, -.48, .045);
}
function makeSilkCanopyMaterial(baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = baseColor; context.fillRect(0, 0, 256, 128);
  context.fillStyle = 'rgba(241,210,151,.25)';
  for (let x = 0; x < 256; x += 64) context.fillRect(x, 0, 8, 128);
  context.strokeStyle = 'rgba(242,216,164,.62)'; context.lineWidth = 3;
  context.strokeRect(8, 8, 240, 112);
  for (let x = 32; x < 256; x += 64) {
    context.beginPath(); context.moveTo(x, 34); context.lineTo(x + 16, 50); context.lineTo(x, 66); context.lineTo(x - 16, 50); context.closePath(); context.stroke();
  }
  context.fillStyle = 'rgba(40,23,18,.22)';
  for (let x = 0; x < 256; x += 24) context.fillRect(x, 119, 12, 9);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;
  return new THREE.MeshStandardMaterial({ map: texture, color: '#fff0d2', roughness: .84, side: THREE.DoubleSide });
}
function addBuildingSign(parent, label, x, y, z, width = 2.2) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#392a1d'; context.fillRect(0, 0, 512, 128);
  context.fillStyle = '#cbb58c'; context.fillRect(9, 9, 494, 110);
  context.strokeStyle = '#63472d'; context.lineWidth = 8; context.strokeRect(14, 14, 484, 100);
  context.fillStyle = '#30251b'; context.font = 'bold 34px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle';
  const words = label.split(' ');
  if (label.length > 16 && words.length > 1) {
    const split = Math.ceil(words.length / 2);
    context.font = 'bold 30px Georgia';
    context.fillText(words.slice(0, split).join(' '), 256, 48);
    context.fillText(words.slice(split).join(' '), 256, 83);
  } else context.fillText(label, 256, 66, 470);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(width, .62), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  plaque.position.set(x, y, z);
  parent.add(plaque);
  cityBox(parent, width + .14, .12, .12, cityMaterials.timber, x, y + .36, z - .015);
}
function buildTownHouse(config) {
  const { x, z, width, depth, height = 2.8, yaw = 0, type = 'house', label = '', plaster } = config;
  const building = new THREE.Group();
  building.name = 'walpira-' + type;
  building.position.set(x, 0, z);
  building.rotation.y = yaw;
  building.userData.landmark = type;
  scene.add(building);
  if (type === 'temple' || type === 'sun-temple') {
    templeBuildings.push(building);
    building.visible = false;
  }
  cityBox(building, width + .34, .38, depth + .34, cityMaterials.foundation, 0, .19, 0);
  markWalkSurface(cityBox(building, width - .36, .04, depth - .36, cityMaterials.road, 0, .40, 0), 'stone');
  cityBox(building, width + .1, .14, depth + .1, cityMaterials.timber, 0, .46 + height, 0);
  const front = depth * .5 + .045;
  const doorWidth = type === 'temple' || type === 'sun-temple' ? 1.8 : type === 'mayor' ? 1.6 : 1.5;
  const doorHeight = type === 'temple' || type === 'sun-temple' ? 2.3 : 1.85;
  const wallThickness = .22;
  const wallY = .38 + height * .5;
  const frontWall = new THREE.Group();
  building.add(frontWall);
  const addWall = (parent, wallWidth, wallHeight, wallDepth, localX, localY, localZ) => {
    cityBox(parent, wallWidth, wallHeight, wallDepth, plaster || cityMaterials.plaster, localX, localY, localZ);
  };
  for (const side of [-1, 1]) {
    const localX = side * (width * .5 - wallThickness * .5);
    addWall(building, wallThickness, height, depth, localX, wallY, 0);
    registerTownWall(building, localX, 0, wallThickness, depth);
  }
  const backZ = -depth * .5 + wallThickness * .5;
  addWall(building, width, height, wallThickness, 0, wallY, backZ);
  registerTownWall(building, 0, backZ, width, wallThickness);
  const frontSegmentWidth = (width - doorWidth) * .5;
  for (const side of [-1, 1]) {
    const localX = side * (doorWidth * .5 + frontSegmentWidth * .5);
    const frontZ = depth * .5 - wallThickness * .5;
    addWall(frontWall, frontSegmentWidth, height, wallThickness, localX, wallY, frontZ);
    registerTownWall(building, localX, frontZ, frontSegmentWidth, wallThickness);
  }
  const upperWallHeight = Math.max(.1, height - doorHeight);
  addWall(frontWall, doorWidth, upperWallHeight, wallThickness, 0, .38 + doorHeight + upperWallHeight * .5, depth * .5 - wallThickness * .5);
  const doorFrame = new THREE.Group();
  building.add(doorFrame);
  for (const side of [-1, 1]) cityBox(doorFrame, .14, doorHeight, .18, cityMaterials.timber, side * (doorWidth * .5 + .04), doorHeight * .5 + .39, front + .015);
  cityBox(doorFrame, doorWidth + .22, .16, .18, cityMaterials.timber, 0, doorHeight + .39, front + .015);
  cityBox(building, doorWidth + .42, .16, .44, cityMaterials.paleStone, 0, .13, front + .22);
  const windowY = type === 'inn' ? 2.55 : 1.75;
  addBuildingWindow(building, -width * .29, windowY, front, 'front', Math.min(.88, width * .16));
  addBuildingWindow(building, width * .29, windowY, front, 'front', Math.min(.88, width * .16));
  addBuildingWindow(building, -width * .5 - .04, windowY, 0, 'left', .72);
  addBuildingWindow(building, width * .5 + .04, windowY, 0, 'right', .72);
  const beamY = .5 + Math.min(height * .55, 1.7);
  [-width * .46, -width * .28, width * .28, width * .46].forEach(bx => cityBox(building, .13, height - .18, .14, cityMaterials.timber, bx, .48 + height * .5, front - .055));
    [-width * .46, -width * .28, width * .28, width * .46].forEach(bx => cityBox(building, .13, height - .18, .14, cityMaterials.lacquer, bx, .48 + height * .5, front - .055));
  cityBox(building, width + .04, .13, .15, cityMaterials.timberLight, 0, beamY, front - .06);
  cityBox(building, width + .04, .13, .15, cityMaterials.timberLight, 0, .54 + height, front - .06);
  cityBox(building, .10, .10, .14, cityMaterials.timber, -width * .29, windowY, front - .05);
  cityBox(building, .10, .10, .14, cityMaterials.timber, width * .29, windowY, front - .05);
  const roofRise = type === 'mayor' || type === 'guilder' || type === 'residence' ? 1.55 : type === 'temple' || type === 'sun-temple' ? 2.0 : 1.25;
  const roofRun = width * .5 + .48;
  const roofLength = Math.hypot(roofRun, roofRise);
  const roofAngle = Math.atan2(roofRise, roofRun);
  const roofMat = type === 'temple' || type === 'sun-temple' ? cityMaterials.roofGray : type === 'inn' || type === 'alchemist' ? cityMaterials.roofRed : cityMaterials.roof;
  const roofY = .52 + height + roofRise * .5;
  const roofGroup = new THREE.Group();
  building.add(roofGroup);
  addMesh(roofGroup, new THREE.BoxGeometry(roofLength + .12, .19, depth + .86), roofMat, [-roofRun * .5, roofY, 0], null, [0, 0, roofAngle]);
  addMesh(roofGroup, new THREE.BoxGeometry(roofLength + .12, .19, depth + .86), roofMat, [roofRun * .5, roofY, 0], null, [0, 0, -roofAngle]);
  addMesh(building, new THREE.CylinderGeometry(.085, .085, depth + .9, 8), cityMaterials.lacquer, [0, .52 + height + roofRise, 0], null, [Math.PI / 2, 0, 0]);
  for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
    const eaveZ = sideZ * (depth * .5 + .42);
    const eaveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideX * roofRun, .52 + height, eaveZ),
      new THREE.Vector3(sideX * (roofRun + .18), .59 + height, eaveZ),
      new THREE.Vector3(sideX * (roofRun + .42), .91 + height, eaveZ)
    ]);
    addMesh(building, new THREE.TubeGeometry(eaveCurve, 10, .055, 6, false), cityMaterials.lacquer);
    addMesh(building, new THREE.SphereGeometry(.075, 8, 6), cityMaterials.gold, [sideX * (roofRun + .42), .91 + height, eaveZ]);
  }
  for (const sideZ of [-depth * .5 - .035, depth * .5 + .035]) {
    const gable = new THREE.Shape();
    gable.moveTo(-width * .5, .38 + height);
    gable.lineTo(width * .5, .38 + height);
    gable.lineTo(0, .38 + height + roofRise);
    gable.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(gable), (plaster || cityMaterials.plaster).clone());
    mesh.material.side = THREE.DoubleSide;
    mesh.position.z = sideZ;
    building.add(mesh);
  }
  cityBox(building, .16, roofRise + .15, .15, cityMaterials.timber, 0, .48 + height + roofRise * .5, front - .10);
  if (label) addBuildingSign(building, label, 0, doorHeight + .85, front + .12, Math.min(width * .66, label.length > 16 ? 3.2 : 2.8));
  if (type === 'temple' || type === 'sun-temple') {
    const count = type === 'sun-temple' ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const px = -width * .39 + i * (width * .78 / (count - 1));
      addMesh(building, new THREE.CylinderGeometry(.16, .22, 2.2, 8), cityMaterials.paleStone, [px, 1.5, front + .68]);
      cityBox(building, .52, .16, .50, cityMaterials.paleStone, px, 2.65, front + .68);
    }
    cityBox(building, width * .9, .32, .42, cityMaterials.paleStone, 0, 2.8, front + .68);
    if (type === 'sun-temple') {
      addMesh(building, new THREE.CylinderGeometry(1.15, 1.45, .5, 12), cityMaterials.paleStone, [0, .6 + height + roofRise, 0]);
      addMesh(building, new THREE.SphereGeometry(1.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cityMaterials.gold, [0, .83 + height + roofRise, 0]);
      addMesh(building, new THREE.ConeGeometry(.32, .8, 8), cityMaterials.gold, [0, 1.93 + height + roofRise, 0]);
      addMesh(building, new THREE.CircleGeometry(.75, 24), new THREE.MeshBasicMaterial({ color: '#e8c978', side: THREE.DoubleSide }), [0, 4.4, front + .93]);
    } else {
      addMesh(building, new THREE.BoxGeometry(2.3, 3.5, 2.3), cityMaterials.paleStone, [width * .34, height + 1.9, -depth * .18]);
      addMesh(building, new THREE.ConeGeometry(1.55, 1.5, 4), cityMaterials.roofGray, [width * .34, height + 4.35, -depth * .18], null, [0, Math.PI / 4, 0]);
      addMesh(building, new THREE.TorusGeometry(.44, .045, 8, 20), cityMaterials.gold, [width * .34, height + 2.2, -depth * .18], null, [0, Math.PI / 2, 0]);
    }
  }
  if (type === 'guilder') {
    cityBox(building, width + .8, .22, 1.0, cityMaterials.timber, 0, height + .25, front + .42);
    addMesh(building, new THREE.CylinderGeometry(.42, .48, .72, 10), cityMaterials.timberLight, [-width * .35, .36, front + .6]);
    addMesh(building, new THREE.CylinderGeometry(.42, .48, .72, 10), cityMaterials.timberLight, [width * .35, .36, front + .6]);
  }
  if (type === 'residence') {
    addMesh(building, new THREE.CylinderGeometry(.72, .86, 2.2, 10), cityMaterials.paleStone, [-width * .34, height + 1.25, -depth * .27]);
    addMesh(building, new THREE.ConeGeometry(1.0, 1.25, 8), cityMaterials.roofRed, [-width * .34, height + 2.95, -depth * .27]);
  }
  if (type === 'alchemist') {
    [-.6, 0, .6].forEach((px, i) => addMesh(building, new THREE.SphereGeometry(.18, 10, 8), [cityMaterials.gold, cityMaterials.water, cityMaterials.leafLight][i], [px, 1.2, front + .26], [1, 1.25, .65]));
    addMesh(building, new THREE.TorusGeometry(.38, .035, 6, 20), cityMaterials.iron, [0, 2.8, front + .4]);
  }
  if (type === 'inn') cityBox(building, .14, .95, .14, cityMaterials.iron, width * .46, 2.55, front + .5, -.18);
  townHouseInteriors.push({ x, z, halfWidth: width * .5, halfDepth: depth * .5, yaw, roof: roofGroup, front: frontWall });
  return building;
}
function updateTempleVisibility(delta = 0, force = false) {
  if (!heroRoot || !templeBuildings.length) return;
  churchVisibilityTimer -= delta;
  if (!force && churchVisibilityTimer > 0) return;
  churchVisibilityTimer = .4;
  const radiusSquared = CHURCH_RENDER_RADIUS * CHURCH_RENDER_RADIUS;
  const nearbyTemples = templeBuildings
    .map(building => ({ building, distance: building.position.distanceToSquared(heroRoot.position) }))
    .filter(entry => entry.distance <= radiusSquared)
    .sort((left, right) => left.distance - right.distance);
  const visibleTemples = new Set(nearbyTemples.slice(0, churchRenderLimit).map(entry => entry.building));
  for (const building of templeBuildings) building.visible = visibleTemples.has(building);
  for (const room of townHouseInteriors) {
    const inside = currentWorldId === 'villa' && isInsideOrientedBox(heroRoot.position.x, heroRoot.position.z, room, -.12);
    room.roof.visible = !inside;
    room.front.visible = !inside;
  }
}
function addRoadPath(points, width, mat = cityMaterials.road) {
  cityRoads.push({ points: points.map(point => [...point]), width });
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const segment = new THREE.Mesh(new THREE.BoxGeometry(width, .045, length), mat);
    segment.position.set((a[0] + b[0]) * .5, .005, (a[1] + b[1]) * .5);
    segment.rotation.y = Math.atan2(dx, dz);
    segment.receiveShadow = true;
    scene.add(segment);
    markWalkSurface(segment, 'asphalt');
  }
}
const NPC_DEFINITIONS = [
  { id:'elena', name:'Elena', role:'Almacén y Cofre', x:29.05, y:0, z:.35, color:'#813d48', shop:'storage', portrait:'img/npc-elena.jpg', dialogue:'La fuente guarda secretos; el cofre, cosas de más valor.' },
  { id:'dohan', name:'Dohan', role:'Maestro de Armas', x:6.93, y:0, z:14.30, color:'#62718c', shop:'weapons', portrait:'img/npc-dohan.jpg', dialogue:'La milicia no entrega acero a manos inexpertas.' },
  { id:'glemier', name:'Glemier', role:'Consejero de Misiones', x:-17.08, y:0, z:-10.70, color:'#796c50', shop:'missions', portrait:'img/npc-glemier.jpg', dialogue:'La costa recibió tres pulsos y una voz incompleta. No sabemos quién transmitió ni si pedía ayuda.' },
  { id:'mikel', name:'Mikel', role:'Boticario y Alquimista', x:25.07, y:0, z:6.35, color:'#537d69', shop:'alchemy', portrait:'img/npc-mikel.jpg', dialogue:'Cada remedio exige una gota de paciencia... o de sangre.' },
  { id:'barric', name:'Barric', role:'Herrero de la Fragua', x:44.11, y:0, z:-6.59, color:'#80523e', shop:'forge', portrait:'img/npc-barric.jpg', dialogue:'El hierro resiste. La voluntad, no siempre.' }
  ,{id:'camp_apothecary',name:'Luma',role:'Recolectora de remedios',world:'forest',x:14,y:0,z:-10,color:'#6f8850',shop:'camp_apothecary',dialogue:'Traigo remedios para cuidar el camino.',nairu:'An pana na tora.',translation:'Llevo remedios.'}
  ,{id:'camp_armorer',name:'Taru',role:'Artesano de herramientas',world:'forest',x:22,y:0,z:-10,color:'#8c6746',shop:'camp_armorer',dialogue:'Madera, hierro y rafia: cada pieza conoce su oficio.',nairu:'An kema na tora.',translation:'Llevo herramientas.'}
];
function makeNpcLabel(name, role) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(12,14,19,.84)'; context.beginPath(); context.roundRect(12, 12, 488, 104, 18); context.fill();
  context.strokeStyle = '#d7b762'; context.lineWidth = 4; context.stroke();
  context.textAlign = 'center'; context.font = 'bold 42px Georgia'; context.fillStyle = '#f0d785'; context.fillText(name, 256, 61);
  context.font = '24px Georgia'; context.fillStyle = '#e4ddc9'; context.fillText(role, 256, 94);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, depthTest:false }));
  sprite.scale.set(3.15, .79, 1); sprite.position.y = 2.75; sprite.renderOrder = 5; return sprite;
}
function addNpcLandmark(npc, id) {
  const iron = new THREE.MeshStandardMaterial({ color:'#252327', roughness:.48, metalness:.8 });
  const gold = new THREE.MeshStandardMaterial({ color:'#98763e', roughness:.55, metalness:.65 });
  const redGlow = new THREE.MeshStandardMaterial({ color:'#812e32', emissive:'#a3262d', emissiveIntensity:1.2, roughness:.35 });
  const greenGlow = new THREE.MeshStandardMaterial({ color:'#426d48', emissive:'#52c878', emissiveIntensity:.9, roughness:.32 });
  const chestWood = new THREE.MeshStandardMaterial({ color:'#503322', roughness:.78 });
  const box = (w,h,d,mat,x,y,z,parent=npc) => { const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; };
  if (id === 'barric') {
    box(1.35,.72,.82,iron,-1.25,.38,.55);
    box(1.12,.16,.64,chestWood,-1.25,.78,.55);
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),redGlow); flame.position.set(-1.25,1.12,.55); npc.add(flame);
    const hearth = new THREE.PointLight('#a82b32',2.1,10,1.8); hearth.position.set(-1.25,1.25,.55); npc.add(hearth);
  }
  if (id === 'mikel') {
    [-1,0,1].forEach((x,index)=>{
      const cauldron=new THREE.Mesh(new THREE.CylinderGeometry(.32,.25,.38,10),iron); cauldron.position.set(x,.38,.8); npc.add(cauldron);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.28,.035,6,16),gold); rim.rotation.x=Math.PI/2; rim.position.set(x,.59,.8); npc.add(rim);
      const vapor=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),greenGlow); vapor.position.set(x,.82+index*.1,.8); npc.add(vapor);
    });
    const glow=new THREE.PointLight('#6fc884',1.05,8,2); glow.position.set(0,1.3,.8); npc.add(glow);
  }
  if (id === 'dohan') {
    for (const side of [-1,1]) {
      box(.09,2.75,.09,iron,side*1.85,1.37,.25);
      const banner=box(.9,.92,.06,side<0?redGlow:new THREE.MeshStandardMaterial({color:'#343d4c',emissive:'#28384a',emissiveIntensity:.22}),side*1.55,2.03,.25);
      banner.rotation.z=side*.06;
      box(.1,.08,.1,gold,side*1.85,2.82,.25);
    }
    box(1.7,.12,.48,chestWood,0,.53,-.95);
    [-.58,0,.58].forEach((x,index)=>{
      const blade=new THREE.Mesh(new THREE.BoxGeometry(.055,.85,.07),new THREE.MeshStandardMaterial({color:'#b7b4a7',emissive:'#716a50',emissiveIntensity:.3,metalness:.8,roughness:.3}));
      blade.position.set(x,.98,-.95); blade.rotation.z=(index-1)*-.16; npc.add(blade);
    });
  }
  if (id === 'elena') {
    const counterX = .72, counterZ = .56;
    box(1.75,.62,.72,chestWood,counterX,.35,counterZ);
    box(1.88,.13,.82,gold,counterX,.72,counterZ);
    box(.15,.16,.12,gold,counterX,.58,counterZ+.42);
    for (const postX of [-.38,1.82]) box(.10,1.55,.10,cityMaterials.lacquer,postX,1.50,.42);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.55,.14,1.35),makeSilkCanopyMaterial('#843d35'));
    canopy.position.set(.72,2.30,.42); npc.add(canopy);
    box(2.58,.12,.14,cityMaterials.lacquer,.72,2.20,1.06);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.42,.55),new THREE.MeshBasicMaterial({map:createCalligraphyTexture('福'),transparent:true,side:THREE.DoubleSide,toneMapped:false}));
    sign.position.set(.72,1.82,1.15); npc.add(sign);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.30,8),new THREE.MeshStandardMaterial({color:'#d39b62',emissive:'#b56c35',emissiveIntensity:.4,roughness:.82}));
    lantern.position.set(1.72,1.93,.82); npc.add(lantern);
    const rune=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,5,32),new THREE.MeshBasicMaterial({color:'#e9c77b',transparent:true,opacity:.38})); rune.rotation.x=-Math.PI/2; rune.position.set(0,.12,0); npc.add(rune);
    const glow=new THREE.PointLight('#f0b66f',.82,6,2); glow.position.set(.72,1.35,.45); npc.add(glow);
  }
  if (id === 'glemier') {
    box(1.7,.2,.62,chestWood,0,.85,-1.1);
    box(.18,1.45,.2,iron,-.78,1.55,-1.1); box(.18,1.45,.2,iron,.78,1.55,-1.1);
    box(1.7,.2,.2,gold,0,2.28,-1.1);
    const guard=new THREE.Group(); guard.position.set(1.75,0,.1); npc.add(guard);
    const armor=new THREE.MeshStandardMaterial({color:'#7a7d78',roughness:.34,metalness:.82});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.26,.55,4,8),armor); body.position.y=.96; guard.add(body);
    const helm=new THREE.Mesh(new THREE.SphereGeometry(.23,12,10),iron); helm.position.y=1.62; guard.add(helm);
    box(.08,.9,.08,iron,1.75,.52,.1);
  }
}
function registerDefensiveNpc(npc, data, rig) {
  const healthBar = createEnemyHealthBar(npc);
  healthBar.sprite.position.y = 2.45;
  healthBar.sprite.visible = false;
  const baseX = npc.position.x;
  const baseZ = npc.position.z;
  Object.assign(npc.userData, {
    isEnemy: true,
    isFriendlyNpc: true,
    combatant: true,
    health: 140,
    maxHealth: 140,
    defense: 8,
    level: 1,
    name: data.name,
    healthBar,
    ai: {
      phase: Math.random() * Math.PI * 2,
      strafeDirection: Math.random() < .5 ? -1 : 1,
      attackCooldown: .55,
      dashCooldown: 1.5,
      stunTimer: 0,
      knockback: null,
      dead: false,
      deathTime: 0,
      defending: false,
      worldDisabled: false,
      baseX,
      baseZ
    },
    rig,
    baseX,
    baseZ
  });
  enemyCombatants.push(npc);
  window.enemyCombatants = enemyCombatants;
}
function addHumanoidNpcStructure(npc, { cloth, skin, hair, trousers }) {
  const torso = addMesh(npc, createRoundedBoxGeometry(THREE, .48, .62, .30, .055), cloth, [0, 1.12, 0]);
  addMesh(npc, createRoundedBoxGeometry(THREE, .4, .22, .28, .04), trousers, [0, .7, 0]);
  addMesh(npc, new THREE.CylinderGeometry(.075, .085, .14, 8), skin, [0, 1.48, 0]);
  const head = new THREE.Group();
  head.position.y = 1.64;
  npc.add(head);
  addMesh(head, createRoundedBoxGeometry(THREE, .34, .38, .30, .045), skin, [0, .06, 0]);
  addMesh(head, new THREE.SphereGeometry(.195, 14, 10), hair, [0, .25, -.015], [1, .55, 1]);
  const eyes = material('#302721', .5);
  const whites = material('#f5f0e3', .55);
  for (const side of [-1, 1]) {
    addMesh(head, new THREE.SphereGeometry(.023, 8, 6), whites, [side * .072, .085, .151]);
    addMesh(head, new THREE.SphereGeometry(.011, 8, 6), eyes, [side * .072, .085, .164]);
    addMesh(head, new THREE.SphereGeometry(.045, 8, 6), skin, [side * .17, .055, 0], [.68, 1.1, .8]);
  }
  addMesh(head, new THREE.SphereGeometry(.025, 8, 6), skin, [0, .025, .17], [.8, 1.1, 1]);
  addMesh(head, new THREE.BoxGeometry(.05, .007, .008), eyes, [0, -.02, .154]);
  const shoulders = [], elbows = [], hips = [], knees = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * .29, 1.35, 0);
    npc.add(shoulder);
    addMesh(shoulder, new THREE.CapsuleGeometry(.085, .15, 3, 7), cloth, [0, -.08, 0]);
    addMesh(shoulder, new THREE.CapsuleGeometry(.067, .20, 3, 7), skin, [0, -.25, .005]);
    const elbow = new THREE.Group();
    elbow.position.y = -.36;
    shoulder.add(elbow);
    addMesh(elbow, new THREE.SphereGeometry(.058, 8, 6), skin);
    addMesh(elbow, new THREE.CapsuleGeometry(.06, .21, 3, 7), skin, [0, -.13, .01]);
    addMesh(elbow, new THREE.SphereGeometry(.063, 8, 6), skin, [0, -.29, .02], [.9, .85, .8]);
    shoulders.push(shoulder);
    elbows.push(elbow);
    const hip = new THREE.Group();
    hip.position.set(side * .115, .69, 0);
    npc.add(hip);
    addMesh(hip, createRoundedBoxGeometry(THREE, .17, .42, .17, .035), trousers, [0, -.21, 0]);
    const knee = new THREE.Group();
    knee.position.y = -.42;
    hip.add(knee);
    addMesh(knee, createRoundedBoxGeometry(THREE, .16, .13, .16, .03), trousers, [0, 0, 0]);
    addMesh(knee, createRoundedBoxGeometry(THREE, .15, .36, .15, .03), trousers, [0, -.19, 0]);
    addMesh(knee, new THREE.SphereGeometry(.095, 10, 8), skin, [0, -.39, .06], [1, .62, 1.45]);
    hips.push(hip);
    knees.push(knee);
  }
  return { headGroup: head, torso, leftShoulder: shoulders[0], rightShoulder: shoulders[1], leftElbow: elbows[0], rightElbow: elbows[1], leftHip: hips[0], rightHip: hips[1], leftKnee: knees[0], rightKnee: knees[1] };
}
function buildTownNPCs() {
  townNpcs = NPC_DEFINITIONS.filter(data=>data.world!=='forest').map(data => {
    const npc = new THREE.Group(); npc.name = 'npc-' + data.id; npc.position.set(data.x, data.y, data.z); npc.userData = { npc: data, isLockTarget: true, targetType: 'NPC' };
    const cloth = material(data.color, .86), trim = material('#d3b66d', .5, .22), skin = material('#d4a783', .9), dark = material('#403b38', .92);
    const rig = addHumanoidNpcStructure(npc, { cloth, skin, hair: dark, trousers: dark });
    addMesh(npc, new THREE.CylinderGeometry(.48,.55,.12,16), trim, [0,.08,0]);
    addMesh(npc, new THREE.ConeGeometry(.27,.28,8), data.id==='barric'?dark:cloth, [0,1.98,0]);
    if (data.id === 'elena') {
      const hanfu = material('#873f49', .72, .02), innerSilk = material('#dfc58e', .64, .08), hair = material('#231b1c', .72), jadeSash = material('#3d6956', .5, .32);
      addMesh(npc,new THREE.ConeGeometry(.48,1.02,12),hanfu,[0,.93,0]);
      addMesh(npc,new THREE.CapsuleGeometry(.15,.35,4,8),hanfu,[-.40,1.14,.03],null,[0,0,.18]);
      addMesh(npc,new THREE.CapsuleGeometry(.15,.35,4,8),hanfu,[.40,1.14,.03],null,[0,0,-.18]);
      const collarLeft=new THREE.Shape(); collarLeft.moveTo(-.16,1.48); collarLeft.lineTo(-.04,1.48); collarLeft.lineTo(.11,.88); collarLeft.lineTo(.02,.88); collarLeft.closePath();
      const collarRight=new THREE.Shape(); collarRight.moveTo(.16,1.48); collarRight.lineTo(.04,1.48); collarRight.lineTo(-.11,.88); collarRight.lineTo(-.02,.88); collarRight.closePath();
      addMesh(npc,new THREE.ShapeGeometry(collarLeft),innerSilk,[0,0,.31]);
      addMesh(npc,new THREE.ShapeGeometry(collarRight),jadeSash,[0,0,.32]);
      const sash=new THREE.Mesh(new THREE.TorusGeometry(.31,.035,8,24),jadeSash); sash.rotation.x=Math.PI/2; sash.position.y=.76; npc.add(sash);
      addMesh(npc,new THREE.SphereGeometry(.265,16,12),hair,[0,1.82,-.035],[1.08,.54,1.02]);
      addMesh(npc,new THREE.SphereGeometry(.12,12,10),hair,[-.22,1.88,-.04],[1,1.1,1]);
      addMesh(npc,new THREE.SphereGeometry(.12,12,10),hair,[.22,1.88,-.04],[1,1.1,1]);
      const pin=addMesh(npc,new THREE.CylinderGeometry(.012,.012,.34,6),trim,[0,1.96,-.02]); pin.rotation.z=Math.PI/2;
      const eyeMaterial=new THREE.MeshStandardMaterial({color:'#241a1b',roughness:.58});
      addMesh(npc,new THREE.SphereGeometry(.022,8,6),eyeMaterial,[-.078,1.69,.222]);
      addMesh(npc,new THREE.SphereGeometry(.022,8,6),eyeMaterial,[.078,1.69,.222]);
      const aura=new THREE.Mesh(new THREE.TorusGeometry(.78,.018,6,40),new THREE.MeshBasicMaterial({color:'#d6b675',transparent:true,opacity:.55})); aura.rotation.x=-Math.PI/2; aura.position.y=.17; npc.add(aura);
    }
    const marker = new THREE.Mesh(new THREE.TorusGeometry(.66,.045,6,28), trim); marker.rotation.x = -Math.PI/2; marker.position.y = .15; npc.add(marker);
    const label = makeNpcLabel(data.name, data.role); npc.add(label);
    addNpcLandmark(npc, data.id);
    npc.traverse(object => { if (object.isMesh || object.isSprite) object.userData.npcId = data.id; });
    npc.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    scene.add(npc);
    registerDefensiveNpc(npc, data, rig);
    return npc;
  });
}
function buildForestCampVendors(){
  forestNpcs=[];
  for(const data of NPC_DEFINITIONS.filter(entry=>entry.world==='forest')){
    const npc=new THREE.Group();npc.name='npc-'+data.id;npc.position.set(data.x,data.y,data.z);
    npc.userData={npc:data,isLockTarget:true,targetType:'NPC'};
    const cloth=material(data.color,.9),skin=material('#bb896b',.92),dark=material('#3e352d',.96),trim=material('#c3a36a',.84);
    const rig=addHumanoidNpcStructure(npc,{cloth,skin,hair:dark,trousers:dark});
    addMesh(npc,new THREE.BoxGeometry(.34,.42,.06),trim,[0,.76,.22]);
    const stall=new THREE.Group();stall.position.set(data.id==='camp_apothecary'?.9:-.9,.05,-.55);npc.add(stall);
    addMesh(stall,new THREE.BoxGeometry(1.35,.58,.62),dark,[0,.3,0]);
    addMesh(stall,new THREE.BoxGeometry(1.42,.12,.68),trim,[0,.64,0]);
    if(data.id==='camp_apothecary'){
      for(let index=0;index<3;index++){
        const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.25,8),material(['#738b4a','#536f75','#876a3c'][index],.32,.06));
        bottle.position.set((index-1)*.36,.84,.04);stall.add(bottle);
      }
    }else{
      for(let index=0;index<3;index++){
        const tool=new THREE.Mesh(new THREE.BoxGeometry(.055,.54,.06),material('#7f8581',.32,.62));
        tool.position.set((index-1)*.32,.91,.05);tool.rotation.z=(index-1)*-.12;stall.add(tool);
      }
    }
    npc.add(makeNpcLabel(data.name,data.role));
    npc.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.userData.npcId=data.id;}});
    forestScene.group.add(npc);forestNpcs.push(npc);
    registerDefensiveNpc(npc,data,rig);
  }
}
function buildAmbientVillagers(){
  ambientVillagers=[];
  const palette=['#8b4c3d','#476d68','#76603c','#5b536d','#78804a','#a46f42'];
  for(let index=0;index<6;index++){
    const group=new THREE.Group(),cloth=material(palette[index],.86),skin=material(index%2?'#c88f70':'#d7ad86',.92),dark=material(index%3?'#322a27':'#4c3a2e',.9),trim=material('#c7a45b',.62,.18);
    const x=-13+index*5.2,z=index%2?11.3:15.6;
    group.name='aldeano-ambulante-'+index;group.position.set(x,0,z);
    const rig=addHumanoidNpcStructure(group,{cloth,skin,hair:dark,trousers:dark});
    const apron=new THREE.Mesh(new THREE.BoxGeometry(.29,.42,.04),trim);apron.position.set(0,.82,.24);group.add(apron);
    if(index%2===0){const bag=new THREE.Mesh(new THREE.BoxGeometry(.2,.26,.12),dark);bag.position.set(.29,.85,-.17);group.add(bag);}
    group.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
    scene.add(group);
    const villagerName = 'Aldeano ' + (index + 1);
    group.userData = { npc: { id: 'ambient-' + index, name: villagerName, world: 'villa' }, isLockTarget: true, targetType: 'NPC' };
    registerDefensiveNpc(group, { id: 'ambient-' + index, name: villagerName, world: 'villa' }, rig);
    ambientVillagers.push({group,head:rig.headGroup,leftArm:rig.leftShoulder,rightArm:rig.rightShoulder,leftLeg:rig.leftHip,rightLeg:rig.rightHip,originX:x,originZ:z,phase:index*1.73,speed:.45+index*.035,direction:index%2?1:-1});
  }
}
function updateAmbientVillagers(time){
  for(const villager of ambientVillagers){
    if(villager.group.userData.ai?.defending)continue;
    const phase=time*villager.speed+villager.phase,walk=Math.sin(phase),step=Math.cos(phase);
    villager.group.position.x=villager.originX+walk*1.05*villager.direction;
    villager.group.position.y=Math.max(0,step)*.018;
    villager.group.position.z=villager.originZ+Math.sin(phase*.5)*.12;
    villager.group.rotation.y=walk*.22+(villager.direction<0?Math.PI:0);
    villager.leftArm.rotation.x=step*.28;villager.rightArm.rotation.x=-step*.28;
    villager.leftLeg.rotation.x=-step*.24;villager.rightLeg.rotation.x=step*.24;
    villager.head.rotation.y=Math.sin(time*.6+villager.phase)*.12;
  }
}
function makeTrainingDummyLabel(dummy) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(12,14,19,.88)'; context.beginPath(); context.roundRect(8, 8, 496, 112, 18); context.fill();
  context.strokeStyle = '#d7b762'; context.lineWidth = 4; context.stroke();
  context.textAlign = 'center'; context.fillStyle = '#f0d785'; context.font = 'bold 35px Georgia'; context.fillText('MUÑECO DE PRÁCTICA', 256, 54);
  context.fillStyle = '#e4ddc9'; context.font = '25px Georgia'; context.fillText('IMPACTOS 0', 256, 91);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.scale.set(3.35, .84, 1); label.position.y = 2.65; label.renderOrder = 6; dummy.add(label);
  dummy.userData.hitLabelContext = context; dummy.userData.hitLabelTexture = texture;
}
function updateTrainingDummyLabel() {
  if (!trainingDummy) return;
  const data = trainingDummy.userData;
  const context = data.hitLabelContext;
  context.clearRect(0, 0, 512, 128);
  context.fillStyle = 'rgba(12,14,19,.88)'; context.beginPath(); context.roundRect(8, 8, 496, 112, 18); context.fill();
  context.strokeStyle = '#d7b762'; context.lineWidth = 4; context.stroke();
  context.textAlign = 'center'; context.fillStyle = '#f0d785'; context.font = 'bold 35px Georgia'; context.fillText('MUÑECO DE PRÁCTICA', 256, 54);
  context.fillStyle = '#e4ddc9'; context.font = '25px Georgia'; context.fillText('IMPACTOS ' + data.hitCount, 256, 91);
  data.hitLabelTexture.needsUpdate = true;
}
function buildPlazaSafeMarker() {
  const gate = new THREE.Group(); gate.position.set(0, 0, -9.35); scene.add(gate);
  for (const x of [-2.72, 2.72]) {
    cityBox(gate, .18, 3.2, .2, cityMaterials.timber, x, 1.6, 0);
    cityBox(gate, .34, .18, .34, cityMaterials.gold, x, 3.25, 0);
    registerCityCollider(x, -9.35, .2, .22, 0, .08);
  }
  cityBox(gate, 5.65, .28, .34, cityMaterials.timberLight, 0, 3.05, 0);
  addBuildingSign(gate, 'PLAZA SEGURA', 0, 2.58, .19, 4.5);
}
function buildTrainingYard() {
  const centerX = -8.7, centerZ = -16.25, radius = 3.25;
  const path = new THREE.Mesh(new THREE.CircleGeometry(3.48, 56), cityMaterials.cobble);
  path.rotation.x = -Math.PI / 2; path.position.set(centerX, .012, centerZ); path.receiveShadow = true; path.name = 'patio-de-entrenamiento';
  scene.add(path); markWalkSurface(path, 'stone');
  const boundary = new THREE.Mesh(new THREE.TorusGeometry(3.34, .075, 8, 56), cityMaterials.gold);
  boundary.rotation.x = -Math.PI / 2; boundary.position.set(centerX, .08, centerZ); boundary.receiveShadow = true; scene.add(boundary);
  addRoadPath([[0, centerZ], [centerX - radius, centerZ]], 1.8, cityMaterials.road);
  const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * .75, 2.86, 3.42, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
  const posts = angles.map(angle => {
    const x = centerX + Math.cos(angle) * radius, z = centerZ + Math.sin(angle) * radius;
    addMesh(scene, new THREE.CylinderGeometry(.11, .15, 1.15, 8), cityMaterials.timber, [x, .575, z]);
    addMesh(scene, new THREE.SphereGeometry(.14, 8, 6), cityMaterials.gold, [x, 1.18, z]);
    return new THREE.Vector3(x, .78, z);
  });
  for (let i = 0; i < posts.length; i++) {
    if (i === 4) continue;
    const start = posts[i], end = posts[(i + 1) % posts.length];
    const direction = end.clone().sub(start);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, direction.length(), 8), cityMaterials.timberLight);
    rail.position.copy(start).add(end).multiplyScalar(.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    rail.castShadow = true; scene.add(rail);
  }
  const entrance = new THREE.Group(); entrance.position.set(centerX - radius - .18, 0, centerZ + 1.3); entrance.rotation.y = -Math.PI / 2; scene.add(entrance);
  cityBox(entrance, .16, 2.3, .16, cityMaterials.timber, 0, 1.15, 0);
  addBuildingSign(entrance, 'CAMPO DE ENTRENAMIENTO', 0, 2.02, .08, 3.0);

  trainingDummy = new THREE.Group(); trainingDummy.name = 'muñeco-de-práctica';
  trainingDummy.position.set(centerX - .42, 0, centerZ); trainingDummy.rotation.y = -Math.PI / 2;
  registerCityCollider(centerX - .42, centerZ, .55, .55, 0, .06, trainingDummy);
  trainingDummy.userData = { isEnemy: true, isTrainingDummy: true, name: 'Maniquí de entrenamiento', health: 100, hitCount: 0, hitTimer: 0, baseX: centerX - .42, baseZ: centerZ, hitDirectionX: 0, hitDirectionZ: 0 };
  const body = new THREE.Group(); trainingDummy.add(body); trainingDummy.userData.animatedBody = body;
  const wood = material('#67452d', .92), straw = material('#b28d55', .97), leatherTarget = material('#792e2d', .86), targetTrim = material('#e1bb69', .55, .2);
  straw.emissive.set('#e88c34'); straw.emissiveIntensity = 0;
  addMesh(body, new THREE.BoxGeometry(.95, .16, .68), wood, [0, .12, 0]);
  addMesh(body, new THREE.CylinderGeometry(.085, .12, 1.55, 10), wood, [0, .9, 0]);
  addMesh(body, new THREE.CapsuleGeometry(.23, .38, 4, 8), straw, [0, 1.32, 0]);
  addMesh(body, new THREE.SphereGeometry(.22, 12, 10), straw, [0, 1.82, 0]);
  addMesh(body, new THREE.BoxGeometry(1.05, .12, .15), wood, [0, 1.55, 0]);
  for (const x of [-.57, .57]) addMesh(body, new THREE.SphereGeometry(.09, 8, 6), targetTrim, [x, 1.55, 0]);
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(.14, .19, 24), targetTrim); targetRing.position.set(0, 1.35, .232); body.add(targetRing);
  addMesh(body, new THREE.CircleGeometry(.145, 24), leatherTarget, [0, 1.35, .23]);
  addMesh(body, new THREE.CircleGeometry(.052, 20), targetTrim, [0, 1.35, .234]);
  trainingDummy.userData.hitMaterial = straw;
  scene.add(trainingDummy); makeTrainingDummyLabel(trainingDummy);
}
function buildWalpiraTown() {
  initCityMaterials();
  cityColliders = [];
  townHouseInteriors = [];
  cityRoads = [];
  walkSurfaces = [];
  riverCenterline = [];
  riverBranches = [];
  dockWalkways = [];
  bridgeColliders = [];
  lakeCollider = null;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), cityMaterials.grass);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.035; ground.receiveShadow = true; scene.add(ground); markWalkSurface(ground, 'grass');
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11.4, 72), cityMaterials.road);
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = -.005; plaza.name = 'plazaCentral'; scene.add(plaza); markWalkSurface(plaza, 'stone');
  addRoadPath([[0, -6], [0, -34]], 4.4);
  addRoadPath([[-5, -2], [-32, -3]], 4.0);
  addRoadPath([[6, 1], [33, 0]], 4.2);
  addRoadPath([[-2, 8], [1, 17], [10, 23], [18, 26]], 4.4);
  addRoadPath([[0, -25], [8, -27], [19, -25]], 3.4);
  addRoadPath([[0,-10],[5,-10],[7,-13]],2.5);
  addRoadPath([[-12,-3],[-14,-7],[-17,-9]],2.5);
  addRoadPath([[-2,9],[-10,10],[-14,10],[-17,10]],2.8);
  addRoadPath([[21,-25],[22,-20],[22,-14]],2.8);
  addRoadPath([[25,0],[25,5],[25,10],[25,13]],2.7);
  addRoadPath([[5,12],[7,17],[9,20]],2.6);
  addRoadPath([[0,8],[1,17],[10,23],[18,26]],1.0,cityMaterials.lacquer);
  buildPlazaPavers();
  buildCentralFountain();
  const stallSpots = [[-6.4,-4.2],[6.2,-4.2],[6.3,4.4],[-6.5,4.3],[-7.5,0]];
  const stallColors = ['#a84f3c','#c59a4d','#557c82','#73814c','#8c5949','#b78045'];
  stallSpots.forEach((point, i) => buildMarketStall(point[0], point[1], stallColors[i], i));
  buildWalpiraBuildings();
  buildWalpiraRiver();
  buildWalpiraOuterTerritories();
  buildTownTrees();
  buildTownLamps();
  buildVillaStreetDetails();
}
function buildPlazaPavers() {
  const geometry = new THREE.BoxGeometry(.55, .12, .42);
  const pavers = new THREE.InstancedMesh(geometry, cityMaterials.cobble, 420);
  const matrix = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  while (placed < 420) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 10.9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x, z) < 2.15) continue;
    if ([[-6.4,-4.2],[6.2,-4.2],[6.3,4.4],[-6.5,4.3],[-7.5,0]].some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.65)) continue;
    matrix.position.set(x, .055, z);
    matrix.rotation.set(0, Math.random() * Math.PI, (Math.random() - .5) * .03);
    matrix.scale.set(.75 + Math.random() * .55, .75 + Math.random() * .45, .8 + Math.random() * .5);
    matrix.updateMatrix();
    pavers.setMatrixAt(placed, matrix.matrix);
    const shade = .78 + Math.random() * .32;
    color.setRGB(shade, shade * .96, shade * .88);
    pavers.setColorAt(placed, color);
    placed++;
  }
  pavers.instanceMatrix.needsUpdate = true;
  if (pavers.instanceColor) pavers.instanceColor.needsUpdate = true;
  pavers.receiveShadow = true;
  pavers.name = 'adoquines-plaza';
  scene.add(pavers); markWalkSurface(pavers, 'stone');
}
function buildCentralFountain() {
  const basin = new THREE.Group(); basin.name = 'fuente-central'; scene.add(basin);
  addMesh(basin, new THREE.CylinderGeometry(2.05, 2.12, .35, 40), cityMaterials.foundation, [0, .20, 0]);
  addMesh(basin, new THREE.CylinderGeometry(1.82, 1.94, .34, 40, 1, true), cityMaterials.paleStone, [0, .49, 0]);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.87, .18, 10, 48), cityMaterials.paleStone);
  rim.rotation.x = Math.PI / 2; rim.position.y = .68; basin.add(rim);
  fountainWater = new THREE.Mesh(new THREE.CircleGeometry(1.72, 48), cityMaterials.water);
  fountainWater.rotation.x = -Math.PI / 2; fountainWater.position.y = .52; basin.add(fountainWater);
  addMesh(basin, new THREE.CylinderGeometry(.42, .58, 1.35, 12), cityMaterials.paleStone, [0, 1.12, 0]);
  addMesh(basin, new THREE.CylinderGeometry(.86, .60, .22, 24), cityMaterials.stone, [0, 1.87, 0]);
  addMesh(basin, new THREE.CylinderGeometry(.20, .32, .95, 10), cityMaterials.paleStone, [0, 2.42, 0]);
  addMesh(basin, new THREE.SphereGeometry(.38, 12, 10), cityMaterials.gold, [0, 2.98, 0], [1, .72, 1]);
  registerCityCollider(0, 0, 4.3, 4.3, 0, .12);
}
function buildMarketStall(x, z, canopyColor, index) {
  const stall = new THREE.Group(); stall.name = 'puesto-mercado-' + (index + 1); stall.position.set(x, 0, z); scene.add(stall);
  registerCityCollider(x, z, 2.5, 2.2, 0, .22);
  cityBox(stall, 2.35, .18, 1.45, cityMaterials.timber, 0, .86, 0);
  cityBox(stall, 2.45, .12, 1.55, cityMaterials.timberLight, 0, .70, 0);
  for (const px of [-1.08, 1.08]) for (const pz of [-.68, .68]) {
    cityBox(stall, .10, 2.25, .10, cityMaterials.timber, px, 1.15, pz);
      cityBox(stall, .10, 2.25, .10, cityMaterials.lacquer, px, 1.15, pz);
    addMesh(stall, new THREE.CylinderGeometry(.08, .08, .1, 8), cityMaterials.iron, [px, 2.28, pz]);
  }
  const cloth = makeSilkCanopyMaterial(canopyColor);
  addMesh(stall, new THREE.BoxGeometry(2.55, .12, 2.25), cloth, [0, 2.30, 0], null, [0, 0, -.04]);
  for (let i = 0; i < 9; i++) {
    const fringe = addMesh(stall, new THREE.BoxGeometry(.15, .22, .07), cloth, [-1.02 + i * .255, 2.13, 1.12]);
    fringe.rotation.z = (i % 2 ? 1 : -1) * .06;
  }
  addMesh(stall, new THREE.BoxGeometry(2.55, .12, 2.25), cloth, [0, 2.30, 0], null, [0, 0, -.04]);
  for (let i = 0; i < 4; i++) {
    const itemMat = [cityMaterials.gold, cityMaterials.leafLight, cityMaterials.water, cityMaterials.plasterOchre][(i + index) % 4];
    addMesh(stall, new THREE.SphereGeometry(.13, 8, 6), itemMat, [-.75 + i * .5, 1.03, .16], [1.1, .8, 1]);
  }
  cityBox(stall, .8, .38, .65, cityMaterials.foundation, .84, .34, -.98);
  if (index === 4) {
    addMesh(stall,new THREE.CylinderGeometry(.17,.22,.22,8),cityMaterials.lacquer,[-.55,1.03,.12]);
    const bonsaiTrunk=addMesh(stall,new THREE.CylinderGeometry(.035,.055,.42,6),cityMaterials.timber,[-.55,1.34,.12]);
    bonsaiTrunk.rotation.z=-.18;
    addMesh(stall,new THREE.SphereGeometry(.28,10,8),cityMaterials.leaf,[-.58,1.58,.12],[1.35,.62,1]);
    addMesh(stall,new THREE.SphereGeometry(.22,10,8),cityMaterials.leafLight,[-.38,1.68,.10],[1.3,.58,1]);
    addMesh(stall,new THREE.TorusGeometry(.18,.025,6,16),cityMaterials.gold,[-.55,1.15,.12],null,[Math.PI/2,0,0]);
  }
}
function buildWalpiraBuildings() {
  const homes = [
    {x:-27,z:-17,w:6,d:5,h:2.8,yaw:.10,label:'Casa de Kaelen'},{x:-26,z:-8,w:5.5,d:5,h:2.7,yaw:-.08},
    {x:-27,z:1,w:6,d:5,h:2.8,yaw:.05},{x:-26,z:11,w:5.6,d:5.2,h:2.8,yaw:-.05},
    {x:-25,z:20,w:6,d:5.5,h:2.9,yaw:.12},{x:-16,z:17,w:5.5,d:5,h:2.6,yaw:-.1},
    {x:-16,z:-22,w:6,d:5.3,h:2.7,yaw:.08},{x:-7,z:-27,w:5.5,d:5.2,h:2.8,yaw:-.05},
    {x:5,z:-26,w:5.8,d:5.4,h:2.7,yaw:.04},
    {x:29,z:1,w:5.5,d:5,h:2.7,yaw:-.08,label:'Casa de Elena'},
    {x:29,z:15,w:5.8,d:5.4,h:2.8,yaw:.08},{x:-13,z:26,w:5.8,d:5.4,h:2.7,yaw:-.1},
    {x:-4,z:27,w:5.5,d:5,h:2.7,yaw:.08},{x:6,z:26,w:5.8,d:5,h:2.8,yaw:-.07}
  ];
  homes.forEach((home, i) => buildTownHouse({ x:home.x,z:home.z,width:home.w,depth:home.d,height:home.h,yaw:home.yaw,type:'house',label:home.label||'',plaster:[cityMaterials.plaster,cityMaterials.plasterPale,cityMaterials.plasterOchre][i%3] }));
  buildTownHouse({x:-17,z:5,width:8.2,depth:7.2,height:3.6,yaw:-.16,type:'mayor',label:'Residencia del Alcalde',plaster:cityMaterials.plasterPale});
  buildTownHouse({x:-17,z:-10,width:7.2,depth:6.4,height:3.3,yaw:.12,type:'residence',label:'Residencia de Glemier',plaster:cityMaterials.plasterOchre});
  buildTownHouse({x:10,z:-13,width:9.5,depth:8.4,height:4.2,yaw:-.12,type:'temple',label:'Templo',plaster:cityMaterials.plasterPale});
  buildTownHouse({x:23,z:-21,width:10.5,depth:9.2,height:4.3,yaw:.08,type:'sun-temple',label:'Templo del Sol',plaster:cityMaterials.paleStone});
  buildTownHouse({x:21.5,z:-8,width:8.5,depth:7.2,height:4.0,yaw:-.08,type:'inn',label:'Posada del Dragón Oxidado',plaster:cityMaterials.plasterOchre});
  buildTownHouse({x:7,z:15,width:7.3,depth:6.4,height:3.4,yaw:.10,type:'guilder',label:'Residencia de Dohan',plaster:cityMaterials.plaster});
  buildTownHouse({x:25,z:7,width:6.4,depth:5.8,height:3.2,yaw:-.1,type:'alchemist',label:'Residencia de Mikel',plaster:cityMaterials.plasterPale});
  buildTownHouse({x:15,z:-42,width:12,depth:9,height:5.2,yaw:0,type:'keep',label:'Alcázar de Walpira',plaster:cityMaterials.stone});
}
function addTerrainStrip(path, width, mat, y) {
  const curve = new THREE.CatmullRomCurve3(path.map(point => new THREE.Vector3(point[0], y, point[1])));
  const points = curve.getPoints(48);
  const positions = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    const tangent = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width * .5);
    positions.push(points[i].x - side.x, y, points[i].z - side.z, points[i].x + side.x, y, points[i].z + side.z);
    if (i < points.length - 1) {
      const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat); mesh.receiveShadow = true; scene.add(mesh);
  markWalkSurface(mesh, mat === cityMaterials.water ? 'water' : 'stone');
  return mesh;
}
function buildWalpiraRiver() {
  riverCenterline = [[-5,32],[4,31.8],[13,30.4],[21,28.7],[29,25.5],[37,20],[42,13],[41,1],[38,-14],[31,-28],[17,-37],[0,-40],[-17,-38],[-32,-30],[-40,-18],[-43,0],[-42,17],[-35,29],[-20,33],[-5,32]];
  addTerrainStrip(riverCenterline, 8.2, cityMaterials.foundation, -.06);
  addTerrainStrip(riverCenterline, 5.4, cityMaterials.water, .015).name = 'rio-de-walpira';
  const buildStoneBridge = (x, z, yaw, name) => {
    const bridge = new THREE.Group(); bridge.name = name; bridge.position.set(x, 0, z); bridge.rotation.y = yaw; scene.add(bridge);
    cityBox(bridge, 4.4, .18, 10.5, cityMaterials.paleStone, 0, -.025, 0);
    markWalkSurface(cityBox(bridge, 3.8, .05, 9.9, cityMaterials.road, 0, .09, 0), 'stone');
    for (const side of [-1,1]) {
      cityBox(bridge, .34, .62, 10.5, cityMaterials.stone, side * 2.05, .39, 0);
      for (let i = 0; i < 7; i++) cityBox(bridge, .42, .18, .42, cityMaterials.paleStone, side * 2.05, .79, -4.2 + i * 1.4);
    }
    for (let i = 0; i < 9; i++) cityBox(bridge, 3.82, .025, .035, cityMaterials.foundation, 0, .12, -4.2 + i * 1.05);
    bridgeColliders.push({ x, z, halfWidth: 2.05, halfDepth: 5.0, yaw });
  };
  buildStoneBridge(18, 29.1, 0, 'puente-principal');
  buildStoneBridge(41.5, 7, Math.PI / 2, 'puente-sur');
  addRoadPath([[1,17],[10,23],[18,23.5],[18,35]], 4.1);
}
function buildWallSegment(x, z, length, yaw = 0) {
  const wall = new THREE.Group(); wall.position.set(x, 0, z); wall.rotation.y = yaw; scene.add(wall);
  cityBox(wall, length, 3.6, .86, cityMaterials.stone, 0, 1.8, 0);
  cityBox(wall, length + .15, .20, 1.0, cityMaterials.paleStone, 0, 3.62, 0);
  const crenels = Math.max(1, Math.floor(length / 1.45));
  for (let i = 0; i < crenels; i++) cityBox(wall, .72, .52, .94, cityMaterials.paleStone, -length * .5 + .48 + i * (length / crenels), 3.98, 0);
  registerCityCollider(x, z, length, .95, yaw, .18);
  return wall;
}
function buildWallTower(x, z, radius = 1.75, height = 5.1) {
  const tower = new THREE.Group(); tower.name = 'torre-muralla'; tower.position.set(x, 0, z); scene.add(tower);
  addMesh(tower, new THREE.CylinderGeometry(radius * .93, radius, height, 12), cityMaterials.stone, [0, height * .5, 0]);
  addMesh(tower, new THREE.CylinderGeometry(radius * 1.12, radius * 1.08, .38, 12), cityMaterials.paleStone, [0, height, 0]);
  addMesh(tower, new THREE.ConeGeometry(radius * 1.15, 1.65, 8), cityMaterials.roofGray, [0, height + 1.0, 0]);
  addMesh(tower, new THREE.TorusGeometry(radius * .72, .055, 8, 20), cityMaterials.gold, [0, height * .62, 0]);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    addMesh(tower, new THREE.BoxGeometry(.4, .65, .42), cityMaterials.paleStone, [Math.cos(angle) * radius * .82, height + .45, Math.sin(angle) * radius * .82]);
  }
  cityColliders.push({ x, z, halfWidth: radius + .35, halfDepth: radius + .35, yaw: 0 });
}
function buildWalpiraWalls() {
  const edge = 35;
  buildWallSegment(-19, -edge, 30, 0); buildWallSegment(19, -edge, 30, 0);
  buildWallSegment(-edge, -19, 30, Math.PI / 2); buildWallSegment(-edge, 19, 30, Math.PI / 2);
  buildWallSegment(edge, -19, 30, Math.PI / 2); buildWallSegment(edge, 19, 30, Math.PI / 2);
  buildWallSegment(-10.5, edge, 47, 0); buildWallSegment(29, edge, 12, 0);
  [[-35,-35],[-35,35],[35,-35],[35,35],[-4,-35],[4,-35],[-35,-4],[-35,4],[35,-4],[35,4],[12,35],[24,35]].forEach(([x,z],i) => buildWallTower(x,z,i<4?1.9:1.35,i<4?5.8:4.5));
  const gate = new THREE.Group(); gate.name = 'puerta-norte'; gate.position.set(0,0,-35); scene.add(gate);
  cityBox(gate, .38, 4.8, .45, cityMaterials.timber, -2.85, 2.15, 0);
  cityBox(gate, .38, 4.8, .45, cityMaterials.timber, 2.85, 2.15, 0);
  cityBox(gate, 5.9, .40, .50, cityMaterials.paleStone, 0, 4.55, 0);
  cityBox(gate, .25, 3.4, .4, cityMaterials.iron, -2.4, 1.75, 0);
  cityBox(gate, .25, 3.4, .4, cityMaterials.iron, -1.6, 1.75, 0);
  cityBox(gate, .25, 3.4, .4, cityMaterials.iron, 1.6, 1.75, 0);
  cityBox(gate, .25, 3.4, .4, cityMaterials.iron, 2.4, 1.75, 0);
  const outsideRoad = new THREE.Mesh(new THREE.BoxGeometry(4.2,.05,16),cityMaterials.road); outsideRoad.position.set(0,.01,-43); scene.add(outsideRoad); markWalkSurface(outsideRoad, 'asphalt');
}
function buildArcuzKeep(x, z) {
  const keep = new THREE.Group(); keep.name = 'castillo-arcuz-keep'; keep.position.set(x,0,z); scene.add(keep);
  keep.userData.landmark = 'Castillo Arcuz Keep';
  cityBox(keep,22,.35,18,cityMaterials.foundation,0,.18,0);
  cityBox(keep,13,9,10,cityMaterials.stone,0,4.7,0);
  cityBox(keep,14,.4,11,cityMaterials.paleStone,0,9.35,0);
  cityBox(keep,2.2,3.8,.2,cityMaterials.door,0,2.1,5.12);
  cityBox(keep,2.8,.24,.35,cityMaterials.paleStone,0,4.1,5.2);
  for (const px of [-4.5,-2.4,2.4,4.5]) cityBox(keep,.38,1.05,.32,cityMaterials.dark,px,6.2,5.12);
  for (const [tx,tz] of [[-9,-7],[9,-7],[-9,7],[9,7]]) {
    addMesh(keep,new THREE.CylinderGeometry(1.45,1.72,8.2,12),cityMaterials.paleStone,[tx,4.1,tz]);
    addMesh(keep,new THREE.CylinderGeometry(1.65,1.52,.35,12),cityMaterials.stone,[tx,8.35,tz]);
    addMesh(keep,new THREE.ConeGeometry(1.65,2.1,8),cityMaterials.roofRed,[tx,9.55,tz]);
  }
  for (let i=0;i<9;i++) cityBox(keep,1.0,.75,1.2,cityMaterials.paleStone,-6+i*1.5,9.9,0);
  addBuildingSign(keep,'Castillo Arcuz Keep',0,6.4,5.28,5.4);
  registerCityCollider(x,z,22,18,0,.65);
  return keep;
}
function buildOuterGate(x,z,yaw,label) {
  const gate = new THREE.Group(); gate.name = label === 'Puerta Norte' ? 'puerta-norte-exterior' : 'puerta-sur-exterior';
  gate.position.set(x,0,z); gate.rotation.y=yaw; scene.add(gate);
  for (const side of [-1,1]) {
    const tx=x+Math.cos(yaw)*side*5.2, tz=z-Math.sin(yaw)*side*5.2;
    buildWallTower(tx,tz,1.85,5.6);
    cityBox(gate,.55,5.2,.7,cityMaterials.paleStone,side*4.25,2.55,0);
    cityBox(gate,.28,3.7,.48,cityMaterials.iron,side*3.55,1.85,0);
  }
  for (const side of [-1,1]) cityBox(gate,.72,2.8,.92,cityMaterials.paleStone,side*3.35,1.4,0);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.36,.42,8,24,Math.PI),cityMaterials.paleStone);
  arch.position.set(0,2.8,.08); gate.add(arch);
  cityBox(gate,.68,.72,.92,cityMaterials.paleStone,0,6.15,0);
  addBuildingSign(gate,label,0,5.25,.72,3.3);
  return gate;
}
function buildRoundOuterWall() {
  const radius=68, count=72, step=Math.PI*2/count;
  const northGateAngle=0, southGateAngle=Math.PI-Math.asin(18/radius);
  const angularGap=7.0/radius;
  for (let i=0;i<count;i++) {
    const angle=i*step;
    const nearGate=[northGateAngle,southGateAngle].some(gateAngle=>Math.abs(Math.atan2(Math.sin(angle-gateAngle),Math.cos(angle-gateAngle)))<angularGap);
    if (nearGate) continue;
    const x=radius*Math.sin(angle), z=-radius*Math.cos(angle), yaw=-angle;
    const length=radius*step+ .22;
    const wall=new THREE.Group(); wall.position.set(x,0,z); wall.rotation.y=yaw; wall.name='muralla-circular-segmento'; scene.add(wall);
    cityBox(wall,length,4.2,1.0,cityMaterials.stone,0,2.1,0);
    cityBox(wall,length+.16,.24,1.12,cityMaterials.paleStone,0,4.22,0);
    for (const offset of [-length*.28,length*.28]) cityBox(wall,.82,.62,1.05,cityMaterials.paleStone,offset,4.62,0);
    registerCityCollider(x,z,length,1.1,yaw,.14);
  }
  for (let i=0;i<8;i++) {
    const angle=i*Math.PI/4;
    if ([northGateAngle,southGateAngle].some(gateAngle=>Math.abs(Math.atan2(Math.sin(angle-gateAngle),Math.cos(angle-gateAngle)))<.28)) continue;
    buildWallTower(radius*Math.sin(angle),-radius*Math.cos(angle),1.9,6.0);
  }
  const southZ=Math.sqrt(radius*radius-18*18);
  buildOuterGate(0,-radius,0,'Puerta Norte');
  buildOuterGate(18,southZ,-southGateAngle,'Puerta Sur');
  addRoadPath([[0,-34],[0,-radius-16]],4.8);
  addRoadPath([[18,35],[18,southZ+15]],4.8);
}
function buildWalpiraMill() {
  const x=43,z=19;
  buildTownHouse({x,z,width:7.2,depth:6.2,height:3.4,yaw:-.18,type:'house',label:'Molino Watermill',plaster:cityMaterials.plasterOchre});
  const wheel=new THREE.Group(); wheel.name='rueda-del-molino'; wheel.position.set(x+4.25,1.75,z+.1); scene.add(wheel);
  waterWheel=wheel; waterWheelBase=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2); wheel.quaternion.copy(waterWheelBase);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(2.15,.16,8,28),cityMaterials.timber); wheel.add(rim);
  for (let i=0;i<10;i++) {
    const angle=i*Math.PI/5;
    cityBox(wheel,4.05,.12,.14,cityMaterials.timberLight,0,0,0,angle);
    const paddle=cityBox(wheel,.72,.16,.26,cityMaterials.timber,Math.cos(angle)*2.08,Math.sin(angle)*2.08,0,angle);
  }
  addMesh(wheel,new THREE.CylinderGeometry(.28,.28,.75,10),cityMaterials.iron,[0,0,0],null,[0,0,Math.PI/2]);
  for (const side of [-1,1]) addMesh(scene,new THREE.CylinderGeometry(.22,.3,2.3,8),cityMaterials.timber,[x+4.25+side*.45,.95,z+.1]);
  registerCityCollider(x+4.25,z+.1,1.15,4.8,0,.18);
  riverBranches.push([[44,32.5],[47,27],[48,22],[47.2,19.1]]);
  addTerrainStrip(riverBranches[riverBranches.length-1],2.8,cityMaterials.water,.02).name='canal-del-molino';
  addRoadPath([[35,0],[40,5],[40,15],[38,23],[43,24]],3.8);
}
function buildForge() {
  const x=46,z=-5;
  const forge=buildTownHouse({x,z,width:7.4,depth:6.2,height:3.3,yaw:.1,type:'house',label:'Fragua de Barric',plaster:cityMaterials.stone});
  const front=3.15;
  cityBox(forge,1.55,5.6,1.65,cityMaterials.foundation,2.25,5.9,-1.65);
  cityBox(forge,1.12,2.2,1.18,cityMaterials.dark,2.25,1.55,-.67);
  cityBox(forge,.86,.72,.12,cityMaterials.iron,2.25,.65,front+.28);
  const ember=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),new THREE.MeshBasicMaterial({color:'#ff8a36'})); ember.position.set(2.25,1.3,front+.34); forge.add(ember);
  const glow=new THREE.PointLight('#e27332',.8,7); glow.position.set(x+2.25,1.8,z+front+.4); scene.add(glow);
  addMesh(forge,new THREE.CylinderGeometry(.24,.3,.42,8),cityMaterials.iron,[-2.2,.24,front+.65],null,[Math.PI/2,0,0]);
  addRoadPath([[35,0],[40,-2],[43,-.6],[46,-.4]],3.4);
}
function buildMirrorLakeAndDocks() {
  const x=51,z=34,radius=8.2;
  lakeCollider={x,z,radius:7.8};
  const shore=new THREE.Mesh(new THREE.CircleGeometry(9.0,56),cityMaterials.paleStone); shore.rotation.x=-Math.PI/2; shore.position.set(x,.005,z); scene.add(shore);
  const lake=new THREE.Mesh(new THREE.CircleGeometry(radius,56),cityMaterials.water); lake.rotation.x=-Math.PI/2; lake.position.set(x,.025,z); lake.name='lago-espejo'; lake.userData.landmark='Lago Espejo'; scene.add(lake); markWalkSurface(lake, 'water');
  addTerrainStrip([[29,25.5],[37,29],[44,32.5],[50,34]],4.3,cityMaterials.water,.02).name='rio-arcuz';
  riverBranches.push([[29,25.5],[37,29],[44,32.5],[50,34]]);
  const makePier=(px,pz,length) => {
    const pier=new THREE.Group(); pier.name='muelle'; pier.position.set(px,0,pz); scene.add(pier);
    markWalkSurface(cityBox(pier,2.1,.18,length,cityMaterials.planks,0,.22,length*.5), 'wood');
    cityBox(pier,2.3,.12,.35,cityMaterials.timberLight,0,.35,.25);
    const sections=Math.floor(length/2);
    for(let i=0;i<=sections;i++) for(const side of [-1,1]) addMesh(pier,new THREE.CylinderGeometry(.12,.15,1.15,7),cityMaterials.timber,[side*.82,-.28,i*2]);
    for(let i=1;i<sections;i++) cityBox(pier,2.0,.04,.06,cityMaterials.paleStone,0,.34,i*2);
    dockWalkways.push({x:px,z:pz+length*.5,halfWidth:1.05,halfDepth:length*.5,yaw:0});
    return pier;
  };
  makePier(47.4,24.1,13.0);
  makePier(54.3,25.8,10.6);
  const boat=new THREE.Group(); boat.name='barca-de-los-muelles'; boat.position.set(57,.05,30); scene.add(boat);
  cityBox(boat,1.8,.35,4.3,cityMaterials.timber,-.12,0,0,.08);
  cityBox(boat,.12,2.2,.12,cityMaterials.timber,0,1.15,0);
  addMesh(boat,new THREE.ConeGeometry(1.05,1.7,4),new THREE.MeshStandardMaterial({color:'#d3c59e',side:THREE.DoubleSide}),[.52,1.05,0],null,[0,0,-Math.PI/2]);
  addRoadPath([[18,35],[26,38],[34,37],[41,34]],3.6);
}
function buildField(x,z,width,depth,yaw,label) {
  const field=new THREE.Group(); field.name='campo-' + label.toLowerCase().replaceAll(' ','-'); field.position.set(x,-.005,z); field.rotation.y=yaw; scene.add(field);
  field.userData.landmark=label;
  const soil=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color:'#66513a',roughness:1})); soil.rotation.x=-Math.PI/2; field.add(soil);
  const cropGeometry=new THREE.CylinderGeometry(.035,.075,.62,5);
  const cropMaterial=new THREE.MeshStandardMaterial({color:'#82904a',roughness:.96});
  const count=88; const crops=new THREE.InstancedMesh(cropGeometry,cropMaterial,count); const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++) {
    const row=i%8, col=Math.floor(i/8);
    dummy.position.set(-width*.40+row*(width*.8/7),.33,-depth*.38+col*(depth*.76/10));
    dummy.rotation.set(0,(i%3)*.25,0); dummy.scale.set(.8+Math.random()*.35,.7+Math.random()*.6,.8+Math.random()*.35); dummy.updateMatrix(); crops.setMatrixAt(i,dummy.matrix);
  }
  crops.instanceMatrix.needsUpdate=true; field.add(crops);
  const fence=cityMaterials.timber;
  cityBox(field,width,.12,.16,fence,0,.5,-depth*.5);
  cityBox(field,width,.12,.16,fence,0,.5,depth*.5);
  cityBox(field,.16,.12,depth,fence,-width*.5,.5,0);
  cityBox(field,.16,.12,depth*.72,fence,width*.5,.5,-depth*.14);
  const barnX=x+Math.cos(yaw)*(width*.65), barnZ=z-Math.sin(yaw)*(width*.65);
  addMesh(scene,new THREE.CylinderGeometry(1.25,1.5,1.8,9),cityMaterials.timber,[barnX,.9,barnZ]);
  addMesh(scene,new THREE.ConeGeometry(1.8,1.45,6),cityMaterials.roofRed,[barnX,2.5,barnZ]);
  registerCityCollider(barnX,barnZ,2.8,2.8,0,.15);
}
function buildOuterFields() {
  buildField(-71,-24,16,12,.2,'Campos del Norte');
  buildField(-72,7,15,12,-.1,'Huertos del Oeste');
  buildField(-52,58,18,13,.15,'Campos del Río');
  buildField(0,79,20,13,0,'Campos del Sur');
  buildField(73,1,16,12,-.2,'Granjas del Este');
  buildField(65,52,16,12,.12,'Huertos del Lago');
}
function buildWalpiraOuterTerritories() {
  const radius=68, southZ=Math.sqrt(radius*radius-18*18);
  buildRoundOuterWall();
  const keepRise = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({color:'#77715f',roughness:1}));
  keepRise.name = 'elevacion-arcuz-keep'; keepRise.position.set(-18,.55,-50); keepRise.scale.set(14,1,11); keepRise.receiveShadow = true; scene.add(keepRise);
  const keep = buildArcuzKeep(-18,-50); keep.position.y = 1.3;
  buildWalpiraMill();
  buildForge();
  buildMirrorLakeAndDocks();
  buildOuterFields();
  addRoadPath([[0,-34],[0,-38],[-5,-39.4],[-18,-39.7],[-18,-43],[-18,-45]],3.4);
  addRoadPath([[0,-radius],[0,-80]],4.4);
  addRoadPath([[18,southZ],[18,80]],4.4);
}
function buildNorthForestAndScarMountains() {
  for (let row = 0; row < 7; row++) {
    const z = -57 - row * 5.2;
    for (let col = 0; col < 13; col++) {
      const x = -59 + col * 8.1 + (row % 2) * 3.2;
      if ((Math.abs(x) < 10 && z < -60) || Math.hypot(x + 18, z + 50) < 17 || x > 48) continue;
      const jitter = Math.sin(col * 13.7 + row * 7.1) * 1.8;
      addTownTree(x + jitter, z + Math.cos(col * 4.2 + row) * 1.3, 1.05 + ((row * 5 + col * 3) % 7) * .09, true);
    }
  }
  const rock = new THREE.MeshStandardMaterial({color:'#77766f',roughness:.98});
  const peaks = [[62,-79,10,20], [76,-83,14,29], [88,-73,12,23], [78,-65,10,17]];
  peaks.forEach(([x,z,radius,height], index) => {
    const peak = new THREE.Group(); peak.name = 'montanas-de-la-cicatriz'; peak.position.set(x,0,z); scene.add(peak);
    addMesh(peak,new THREE.ConeGeometry(radius,height,6,1),rock,[0,height*.5,0],null,[.06,index*.19,-.08]);
    addMesh(peak,new THREE.ConeGeometry(radius*.66,height*.72,5,1),rock,[radius*.58,height*.36,radius*.1],null,[-.08,.4,.11]);
    cityColliders.push({x,z,halfWidth:radius*.78,halfDepth:radius*.72,yaw:0});
  });
}
function addTownTree(x, z, scale = 1, solid = true) {
  const tree = new THREE.Group(); tree.name = 'arbol-walpira'; tree.position.set(x,0,z); tree.scale.setScalar(scale); scene.add(tree);
  addMesh(tree, new THREE.CylinderGeometry(.16,.28,1.55,7), cityMaterials.timber, [0,.77,0]);
  addMesh(tree, new THREE.ConeGeometry(1.15,2.1,8), cityMaterials.leaf, [0,2.0,0]);
  addMesh(tree, new THREE.ConeGeometry(.86,1.7,8), cityMaterials.leafLight, [0,3.05,0]);
  addMesh(tree, new THREE.SphereGeometry(.56,8,7), cityMaterials.leaf, [.45,2.18,.1]);
  if (solid) cityColliders.push({x,z,halfWidth:.55*scale,halfDepth:.55*scale,yaw:0});
}
function buildTownTrees() {
  const trees = [[-39,-30,1.3],[-42,-22,1.1],[-40,-10,1.25],[-41,4,1.2],[-39,17,1.4],[-34,28,1.1],[-27,39,1.5],[-14,40,1.2],[0,41,1.3],[8,39,1.1],[28,39,1.4],[39,34,1.3],[43,27,1.1],[43,2,1.4],[40,-15,1.2],[35,-29,1.3],[20,-39,1.4],[5,-41,1.2],[-15,-40,1.35],[-36,-37,1.2],[-32,31,.95],[31,32,1.0]];
  trees.forEach(([x,z,s]) => addTownTree(x,z,s,Math.abs(x)<36&&Math.abs(z)<36));
}
function buildTownLamps() {
  const positions = [[-3,-14],[3,-14],[-13,-3],[-13,4],[14,-4],[14,5],[-3,14],[4,19],[18,19],[18,8],[0,-30]];
  const lanternPaper = new THREE.MeshStandardMaterial({ color: '#d39b62', emissive: '#b56c35', emissiveIntensity: .46, roughness: .82 });
  const calligraphy = ['福', '安', '吉', '禄', '寿'];
  positions.forEach(([x,z], index) => {
    addMesh(scene,new THREE.CylinderGeometry(.07,.11,3.2,8),cityMaterials.timber,[x,1.6,z]);
    addMesh(scene,new THREE.BoxGeometry(.76,.12,.58),cityMaterials.lacquer,[x,3.18,z]);
    addMesh(scene,new THREE.CylinderGeometry(.025,.025,.26,6),cityMaterials.lacquer,[x,3.03,z]);
    addMesh(scene,new THREE.CylinderGeometry(.24,.24,.48,8),lanternPaper,[x,2.70,z]);
    addMesh(scene,new THREE.CylinderGeometry(.08,.29,.16,8),cityMaterials.lacquer,[x,3.02,z]);
    addMesh(scene,new THREE.CylinderGeometry(.29,.08,.14,8),cityMaterials.lacquer,[x,2.42,z]);
    addMesh(scene,new THREE.CylinderGeometry(.045,.045,.12,6),cityMaterials.gold,[x,2.30,z]);
    const paperPanel = new THREE.Mesh(new THREE.PlaneGeometry(.25,.34),new THREE.MeshBasicMaterial({ map:createCalligraphyTexture(calligraphy[index % calligraphy.length]), transparent:true, side:THREE.DoubleSide, depthWrite:false, toneMapped:false }));
    paperPanel.position.set(x,2.70,z+.244); scene.add(paperPanel);
    const glow = new THREE.PointLight('#f0b66f',.82,8.5,2); glow.position.set(x,2.72,z); scene.add(glow);
    cityColliders.push({x,z,halfWidth:.16,halfDepth:.16,yaw:0});
  });
}
function buildVillaStreetDetails() {
  const potMaterials = ['#a84f3c', '#497b7a', '#bd8a4f'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .78 }));
  const flowerMaterials = ['#e6bf68', '#d97861', '#e6e0c5'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .62 }));
  const foliage = new THREE.MeshStandardMaterial({ color: '#6e8a55', roughness: .9 });
  const positions = [[-12,-11],[12,-11],[-12,11],[12,11],[-31,-22],[-30,13],[34,-17],[34,15],[44,29],[55,41],[-21,-47],[-10,-43]];
  positions.forEach(([x, z], index) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .29, .38, 8), potMaterials[index % potMaterials.length]);
    pot.position.set(x, .19, z); pot.name = 'maceta-decorativa'; scene.add(pot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.235, .035, 6, 12), cityMaterials.gold);
    rim.rotation.x = Math.PI / 2; rim.position.set(x, .36, z); scene.add(rim);
    for (let flowerIndex = 0; flowerIndex < 3; flowerIndex++) {
      const angle = flowerIndex * Math.PI * 2 / 3 + index * .31;
      const flowerX = x + Math.cos(angle) * .12, flowerZ = z + Math.sin(angle) * .12;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.018, .025, .36, 5), foliage);
      stem.position.set(flowerX, .52, flowerZ); stem.rotation.z = Math.cos(angle) * .18; scene.add(stem);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.075, 7, 5), foliage);
      leaf.position.set(flowerX + Math.cos(angle + 1) * .08, .56, flowerZ + Math.sin(angle + 1) * .08); leaf.scale.set(1.5, .45, .7); scene.add(leaf);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), flowerMaterials[(index + flowerIndex) % flowerMaterials.length]);
      bloom.position.set(flowerX, .73 + (flowerIndex % 2) * .04, flowerZ); scene.add(bloom);
    }
  });
}
function isInsideOrientedBox(x,z,box,radius=0) {
  const dx=x-box.x, dz=z-box.z, cosine=Math.cos(box.yaw), sine=Math.sin(box.yaw);
  const localX=dx*cosine-dz*sine, localZ=dx*sine+dz*cosine;
  return Math.abs(localX)<=box.halfWidth+radius && Math.abs(localZ)<=box.halfDepth+radius;
}
function isTownPositionBlocked(x,z) {
  const radius=.36;
  if (currentWorldId === 'forest') {
    if (Math.abs(x) > 82 || z > 25 || z < -124) return true;
    const nearby=forestScene?.collidersNear?.(x,z,radius)||cityColliders;
    return nearby.some(box => isInsideOrientedBox(x, z, box, radius));
  }
  if (currentWorldId === 'arena') return Math.abs(x) > 40 || Math.abs(z) > 40;
  if (Math.abs(x)>98 || Math.abs(z)>98) return true;
  if (Math.abs(x) < 2.1 && z <= -34 && z >= -43) return false;
  if (cityColliders.some(box=>isInsideOrientedBox(x,z,box,radius))) return true;
  const onBridge=bridgeColliders.some(bridge=>isInsideOrientedBox(x,z,bridge,-.12));
  const onDock=dockWalkways.some(box=>isInsideOrientedBox(x,z,box,-.08));
  return false;
}
function isProjectilePathBlocked(start,end) {
  const dx=end.x-start.x,dz=end.z-start.z;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.16));
  for(let step=1;step<=steps;step++){
    const amount=step/steps;
    if(isTownPositionBlocked(start.x+dx*amount,start.z+dz*amount))return true;
  }
  return false;
}
function isOnWaterSurface(x, z) {
  if (currentWorldId !== 'villa') return false;
  if (lakeCollider && Math.hypot(x - lakeCollider.x, z - lakeCollider.z) <= lakeCollider.radius) return true;
  for (const channel of [riverCenterline, ...riverBranches]) {
    for (let index = 0; index < channel.length - 1; index++) {
      const [ax, az] = channel[index], [bx, bz] = channel[index + 1];
      const dx = bx - ax, dz = bz - az;
      const amount = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      if (Math.hypot(x - (ax + dx * amount), z - (az + dz * amount)) <= 2.35) return true;
    }
  }
  return false;
}
function isCombatantPositionBlocked(x, z, ignoredEnemy = null, minimumDistance = .82) {
  return enemyCombatants.some(enemy => enemy !== ignoredEnemy && !enemy.userData.isFriendlyNpc && enemy.parent && enemy.userData.health > 0 && Math.hypot(x - enemy.position.x, z - enemy.position.z) < minimumDistance);
}
function rollForestEnemyLevel() {
  let roll = Math.random() * FOREST_LEVEL_WEIGHTS.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < FOREST_LEVEL_WEIGHTS.length; index++) {
    roll -= FOREST_LEVEL_WEIGHTS[index];
    if (roll < 0) return index + 1;
  }
  return 6;
}
function findForestSpawn(x, z) {
  if (!isTownPositionBlocked(x, z) && !isCombatantPositionBlocked(x, z, null, 2.2)) return { x, z };
  for (let radius = 2; radius <= 14; radius += 2) {
    for (let step = 0; step < 16; step++) {
      const angle = step * Math.PI / 8;
      const candidateX = x + Math.cos(angle) * radius;
      const candidateZ = z + Math.sin(angle) * radius;
      if (!isTownPositionBlocked(candidateX, candidateZ) && !isCombatantPositionBlocked(candidateX, candidateZ, null, 2.2)) return { x: candidateX, z: candidateZ };
    }
  }
  return { x, z };
}
function enterLamentForest() {
  if (currentWorldId === 'forest' || !forestScene) return;
  clearGroundLootForWorld(currentWorldId);
  currentWorldId = 'forest';
  audioManager?.switchWorldAmbience(currentWorldId);
  villaWorldGroup.visible = false;
  forestScene.group.visible = true;
  scene.fog = forestScene.fog;
  cityColliders = forestScene.colliders;
  walkSurfaces = forestScene.walkSurfaces;
  cameraBlockers = [];
  villaEnemyStates = enemyCombatants.map(enemy => ({ enemy, position: enemy.position.clone(), rotation: enemy.rotation.y, worldDisabled: Boolean(enemy.userData.ai?.worldDisabled) }));
  for (const state of villaEnemyStates) {
    state.enemy.userData.ai.worldDisabled = true;
    if (state.enemy.userData.healthBar?.sprite) state.enemy.userData.healthBar.sprite.visible = false;
  }
  forestEnemies = [];
  const spawns = [
    [-18,-16],[-15,-19],[-21,-20],[3,-38],[7,-42],[0,-45],[-43,-54],[-46,-57],[-40,-58],
    [47,-70],[50,-73],[44,-75],[-4,-86],[0,-89],[4,-86]
  ];
  spawns.slice(0, 9).forEach(([x, z], index) => {
    const position = findForestSpawn(x, z);
    const species = FOREST_SPECIES[index % FOREST_SPECIES.length];
    const enemy = createForestCreatureCombatant({ species, ...position, level: rollForestEnemyLevel(), rotationY: Math.atan2(-position.x, 15 - position.z) });
    if (enemy) { enemy.userData.ai.squadId = 'forest-squad-' + Math.floor(index / 3); forestEnemies.push(enemy); }
  });
  const camp=forestScene.camps?.[0],defeatedMembers=new Set(rpgState?.factionState?.defeatedMembers||[]);
  if(camp){
    const speciesById=new Map(FOREST_SPECIES.map(species=>[species.id,species]));
    const activeFactionCount=()=>enemyCombatants.filter(enemy=>enemy.parent&&enemy.userData.factionId===camp.id&&enemy.userData.health>0).length;
    FOREST_CAMP_ROSTER.slice(0,Math.min(camp.maxMembers,FOREST_FACTION_MEMBER_LIMIT)).forEach((member,index)=>{
      if(defeatedMembers.has(member.id)||activeFactionCount()>=FOREST_FACTION_MEMBER_LIMIT)return;
      const position=findForestSpawn(member.x,member.z),species=speciesById.get(member.speciesId);
      const enemy=createForestCreatureCombatant({species,...position,level:rollForestEnemyLevel()+1,rotationY:Math.atan2(camp.x-position.x,camp.z-position.z)});
      if(!enemy)return;
      const alertLevel=rpgState?.factionState?.alertLevels?.[camp.id]||0;
      Object.assign(enemy.userData,{factionId:camp.id,factionMemberId:member.id,campId:camp.id,factionRole:member.role});
      Object.assign(enemy.userData.ai,{factionId:camp.id,factionMemberId:member.id,campId:camp.id,factionRole:member.role,factionAlertLevel:alertLevel,squadId:'camp-squad-'+Math.floor(index/3)});
      forestEnemies.push(enemy);
    });
  }
  [[-57,-26],[57,-48]].forEach(([x, z], index) => {
    const position = findForestSpawn(x, z);
    const clone = createForestPlayerClone({ ...position, level: 20 + Math.floor(Math.random() * 21), rotationY: Math.atan2(-position.x, 15 - position.z), tint: index ? .46 : .12 });
    if (clone) forestEnemies.push(clone);
  });
  heroGroup.position.set(forestScene.entry.x, forestScene.entry.y, forestScene.entry.z);
  heroRoot.rotation.y = Math.PI;
  cameraYaw = 0;
  cameraPitch = 0;
  movementVelocity.set(0, 0);
  setLockedEnemy(null);
  camera.position.set(heroGroup.position.x, 5.8, heroGroup.position.z + 8);
  cameraTarget.set(heroGroup.position.x, 1.1, heroGroup.position.z);
  cameraFocusGoal.copy(cameraTarget);
  camera.lookAt(cameraTarget);
  document.getElementById('forest-navigation').hidden = false;
  document.getElementById('villa-navigation').hidden = true;
  document.getElementById('villa-map-overlay').hidden = true;
  updateForestNavigation(.12);
  showToast('Bosque de los Lamentos');
}
function returnToWalpiraNorthGate() {
  if (currentWorldId !== 'forest') return;
  clearGroundLootForWorld(currentWorldId);
  forestScene.group.visible = false;
  villaWorldGroup.visible = true;
  scene.fog = villaFog;
  currentWorldId = 'villa';
  audioManager?.switchWorldAmbience(currentWorldId);
  cityColliders = villaWorldColliders;
  walkSurfaces = villaWorldWalkSurfaces;
  buildCameraBlockers();
  for (const enemy of forestEnemies) {
    scene.remove(enemy);
    enemyCombatants = enemyCombatants.filter(candidate => candidate !== enemy);
    enemy.traverse(object => {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose?.();
    });
  }
  forestEnemies = [];
  for (const state of villaEnemyStates) {
    state.enemy.position.copy(state.position);
    state.enemy.rotation.y = state.rotation;
    state.enemy.userData.ai.worldDisabled = state.worldDisabled;
    if (state.enemy.userData.healthBar?.sprite) state.enemy.userData.healthBar.sprite.visible = state.enemy.userData.health > 0;
  }
  villaEnemyStates = [];
  window.enemyCombatants = enemyCombatants;
  heroGroup.position.set(0, 0, -65.5);
  heroRoot.rotation.y = 0;
  cameraYaw = 0;
  cameraPitch = 0;
  movementVelocity.set(0, 0);
  setLockedEnemy(null);
  camera.position.set(heroGroup.position.x, 5.8, heroGroup.position.z - 8);
  cameraTarget.set(heroGroup.position.x, 1.1, heroGroup.position.z);
  cameraFocusGoal.copy(cameraTarget);
  camera.lookAt(cameraTarget);
  document.getElementById('forest-navigation').hidden = true;
  document.getElementById('forest-map-overlay').hidden = true;
  document.getElementById('villa-map-overlay').hidden = true;
  showToast('Puerta Norte · Villa Walpira');
}
function updateWorldTransitions() {
  if (currentWorldId === 'villa' && heroGroup.position.z < -69 && Math.abs(heroGroup.position.x) < 5.2) enterLamentForest();
  else if (currentWorldId === 'forest' && heroGroup.position.z > forestScene.returnTrigger.z && Math.abs(heroGroup.position.x) < forestScene.returnTrigger.radius) returnToWalpiraNorthGate();
}
function updateForestNavigation(delta) {
  forestNavigationFrame += delta;
  if (forestNavigationFrame < .12) return;
  forestNavigationFrame = 0;
  const x = heroGroup.position.x, z = heroGroup.position.z;
  document.getElementById('forest-coordinate').textContent = 'X ' + x.toFixed(0) + ' · Z ' + z.toFixed(0);
  drawForestMap(document.getElementById('forest-minimap'), true);
  drawForestCompass(document.getElementById('forest-compass'));
  if (!document.getElementById('forest-map-overlay').hidden) drawForestMap(document.getElementById('forest-full-map'), false);
}
function updateVillaNavigation(delta) {
  const navigation = document.getElementById('villa-navigation');
  if (!navigation) return;
  if (currentWorldId !== 'villa') { navigation.hidden = true; return; }
  navigation.hidden = false;
  forestNavigationFrame += delta;
  if (forestNavigationFrame < .12) return;
  forestNavigationFrame = 0;
  document.getElementById('villa-coordinate').textContent = 'X ' + heroRoot.position.x.toFixed(0) + ' · Z ' + heroRoot.position.z.toFixed(0);
  drawVillaMap(document.getElementById('villa-minimap'), true);
  if (!document.getElementById('villa-map-overlay').hidden) drawVillaMap(document.getElementById('villa-full-map'), false);
}
function setVillaMapZoom(factor) {
  const previousZoom = villaMapView.zoom;
  villaMapView.zoom = THREE.MathUtils.clamp(previousZoom * factor, 1, 4);
  const ratio = villaMapView.zoom / previousZoom;
  villaMapView.panX *= ratio;
  villaMapView.panY *= ratio;
  drawVillaMap(document.getElementById('villa-full-map'), false);
}
function resetVillaMapView() {
  villaMapView.zoom = 1;
  villaMapView.panX = 0;
  villaMapView.panY = 0;
  drawVillaMap(document.getElementById('villa-full-map'), false);
}
function drawVillaMap(canvas, centered) {
  if (!canvas || !heroRoot) return;
  const context = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  const range = centered ? 26 : 90;
  const minX = centered ? heroRoot.position.x - range : -90;
  const maxX = centered ? heroRoot.position.x + range : 90;
  const minZ = centered ? heroRoot.position.z - range : -90;
  const maxZ = centered ? heroRoot.position.z + range : 90;
  const mapPoint = (x, z) => {
    const point = { x: (x - minX) / (maxX - minX) * width, y: (z - minZ) / (maxZ - minZ) * height };
    if (centered) return point;
    return { x: (point.x - width / 2) * villaMapView.zoom + width / 2 + villaMapView.panX, y: (point.y - height / 2) * villaMapView.zoom + height / 2 + villaMapView.panY };
  };
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#64705a';
  context.fillRect(0, 0, width, height);
  context.globalAlpha = .2;
  context.strokeStyle = '#e0c28e';
  context.lineWidth = centered ? 1 : 1.5;
  for (let x = 0; x <= width; x += width / 6) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y <= height; y += height / 6) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.globalAlpha = 1;
  const drawPath = (points, color, lineWidth) => {
    context.beginPath();
    points.forEach((point, index) => {
      const mapped = mapPoint(point[0], point[1]);
      if (!index) context.moveTo(mapped.x, mapped.y);
      else context.lineTo(mapped.x, mapped.y);
    });
    context.strokeStyle = color; context.lineWidth = lineWidth;
    context.lineCap = 'round'; context.lineJoin = 'round'; context.stroke();
  };
  const wallCenter = mapPoint(0, 0);
  context.beginPath();
  context.ellipse(wallCenter.x, wallCenter.y, 68 / (maxX - minX) * width, 68 / (maxZ - minZ) * height, 0, 0, Math.PI * 2);
  context.strokeStyle = '#b89b70'; context.lineWidth = centered ? 2 : 5; context.stroke();
  cityRoads.forEach(road => drawPath(road.points, '#c6a77a', Math.max(centered ? 1.2 : 2.5, road.width / (maxX - minX) * width)));
  for (const river of [riverCenterline, ...riverBranches]) if (river.length > 1) drawPath(river, '#8fc1c0', centered ? 2.5 : 7);
  cityColliders.forEach((obstacle, index) => {
    const point = mapPoint(obstacle.x, obstacle.z);
    if (point.x < -4 || point.x > width + 4 || point.y < -4 || point.y > height + 4) return;
    context.fillStyle = index % 3 ? '#716451' : '#82745b';
    const size = centered ? 2 : 3.5;
    context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
  });
  const landmarks = [
    { x: 0, z: 0, label: 'PLAZA', color: '#f3d28d' },
    { x: -18, z: -50, label: 'CASTILLO', color: '#f1a875' },
    { x: 10, z: -13, label: 'TEMPLO', color: '#ddd4b6' },
    { x: 23, z: -21, label: 'TEMPLO DEL SOL', color: '#ffd07b' },
    { x: 43, z: 19, label: 'MOLINO', color: '#d7c18d' },
    { x: 51, z: 34, label: 'LAGO', color: '#a9d6d3' },
    { x: 0, z: -68, label: 'PUERTA NORTE', color: '#e6c989' },
    { x: 18, z: 72, label: 'PUERTA SUR', color: '#e6c989' }
  ];
  landmarks.forEach(place => {
    const point = mapPoint(place.x, place.z);
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return;
    context.beginPath(); context.arc(point.x, point.y, centered ? 3 : 6, 0, Math.PI * 2);
    context.fillStyle = place.color; context.fill();
    if (!centered) {
      context.font = '11px Georgia'; context.textAlign = 'left'; context.textBaseline = 'middle';
      context.fillStyle = '#fff0d0'; context.fillText(place.label, point.x + 9, point.y);
    }
  });
  townNpcs.forEach(npc => {
    const point = mapPoint(npc.position.x, npc.position.z);
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return;
    context.beginPath(); context.arc(point.x, point.y, centered ? 2 : 4, 0, Math.PI * 2);
    context.fillStyle = '#a9d6ad'; context.fill();
  });
  const storyQuest=currentStoryQuest();
  if(storyQuest){const npc=storyQuest.npc&&townNpcs.find(entry=>entry.userData.npc.id===storyQuest.npc);const destination=npc?npc.position:storyQuest.location==='forest'?{x:0,z:-70}:null;if(destination){const raw=mapPoint(destination.x,destination.z),p=centered?{x:THREE.MathUtils.clamp(raw.x,12,width-12),y:THREE.MathUtils.clamp(raw.y,12,height-12)}:raw;if(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height){context.beginPath();context.arc(p.x,p.y,centered?6:10,0,Math.PI*2);context.fillStyle='#ffd178';context.fill();context.strokeStyle='#2b2117';context.lineWidth=centered?2:3;context.stroke();if(!centered){context.fillStyle='#fff0ca';context.font='bold 11px Georgia';context.textAlign='left';context.fillText('MISIÓN',p.x+13,p.y);}}}}
  enemyCombatants.forEach(enemy => {
    if (!enemy.parent || enemy.userData.health <= 0 || enemy.userData.ai?.worldDisabled || (enemy.userData.isFriendlyNpc && !enemy.userData.ai?.defending)) return;
    const point = mapPoint(enemy.position.x, enemy.position.z);
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return;
    context.beginPath(); context.arc(point.x, point.y, centered ? 2.5 : 5, 0, Math.PI * 2);
    context.fillStyle = '#e78168'; context.fill();
  });
  const player = mapPoint(heroRoot.position.x, heroRoot.position.z);
  context.save(); context.translate(player.x, player.y); context.rotate(heroRoot.rotation.y);
  context.fillStyle = '#fff2cc'; context.strokeStyle = '#39291f'; context.lineWidth = centered ? 1.5 : 3;
  context.beginPath();
  context.moveTo(0, centered ? 8 : 15);
  context.lineTo(centered ? 5 : 10, centered ? -6 : -12);
  context.lineTo(0, centered ? -3 : -7);
  context.lineTo(centered ? -5 : -10, centered ? -6 : -12);
  context.closePath(); context.fill(); context.stroke(); context.restore();
  if (!centered && villaMapView.marker) {
    const marker = mapPoint(villaMapView.marker.x, villaMapView.marker.z);
    context.beginPath(); context.arc(marker.x, marker.y, 9, 0, Math.PI * 2);
    context.fillStyle = '#ffd178'; context.fill();
    context.strokeStyle = '#39291f'; context.lineWidth = 3; context.stroke();
    context.fillStyle = '#30251b'; context.font = 'bold 11px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText('M', marker.x, marker.y);
  }
  context.strokeStyle = '#d0a56d'; context.lineWidth = 2; context.strokeRect(1, 1, width - 2, height - 2);
}
function drawForestMap(canvas, centered) {
  if (!canvas || !forestScene) return;
  const context = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#1a281f';
  context.fillRect(0, 0, width, height);
  const rangeX = centered ? 28 : 84;
  const rangeZ = centered ? 25 : 63;
  const minX = centered ? heroGroup.position.x - rangeX : -84;
  const maxX = centered ? heroGroup.position.x + rangeX : 84;
  const minZ = centered ? heroGroup.position.z - rangeZ : -99;
  const maxZ = centered ? heroGroup.position.z + rangeZ : 27;
  const mapPoint = (x, z) => ({ x: (x - minX) / (maxX - minX) * width, y: (z - minZ) / (maxZ - minZ) * height });
  context.strokeStyle = '#596955';
  context.lineWidth = centered ? 1 : 1.5;
  context.globalAlpha = .24;
  for (let x = 0; x <= width; x += width / 6) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y <= height; y += height / 6) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.globalAlpha = 1;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  forestScene.map.trails.forEach((trail, index) => {
    context.beginPath();
    trail.forEach((point, pointIndex) => {
      const mapped = mapPoint(point.x, point.z);
      if (!pointIndex) context.moveTo(mapped.x, mapped.y);
      else context.lineTo(mapped.x, mapped.y);
    });
    context.strokeStyle = index ? '#8c7958' : '#c4a875';
    context.lineWidth = centered ? (index ? 2.5 : 4) : (index ? 5 : 8);
    context.stroke();
  });
  forestScene.colliders.forEach((obstacle, index) => {
    const point = mapPoint(obstacle.x, obstacle.z);
    context.fillStyle = index % 3 ? '#31463a' : '#455440';
    const size = centered ? 2.2 : 4;
    context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
  });
  const gate = mapPoint(forestScene.map.gate.x, forestScene.map.gate.z);
  context.fillStyle = '#d8c28b';
  context.beginPath(); context.arc(gate.x, gate.y, centered ? 4 : 8, 0, Math.PI * 2); context.fill();
  for(const camp of forestScene.camps||[]){const marker=mapPoint(camp.x,camp.z);context.fillStyle='#d1a34e';context.strokeStyle='#201c15';context.lineWidth=centered?1.5:3;context.beginPath();context.moveTo(marker.x,marker.y-(centered?5:10));context.lineTo(marker.x+(centered?5:10),marker.y);context.lineTo(marker.x,marker.y+(centered?5:10));context.lineTo(marker.x-(centered?5:10),marker.y);context.closePath();context.fill();context.stroke();if(!centered){context.fillStyle='#fff0ca';context.font='bold 11px Georgia';context.textAlign='left';context.fillText(camp.name,marker.x+13,marker.y);}}
  const storyQuest=currentStoryQuest();
  if(storyQuest){let destination=null;if(storyQuest.npc)destination=forestScene.map.gate;else if(storyQuest.type==='forestKills'||storyQuest.type==='forestMaterials'){const target=enemyCombatants.find(enemy=>enemy.parent&&enemy.userData.isForestCreature&&enemy.userData.health>0&&(storyQuest.type!=='forestMaterials'||enemy.userData.speciesId==='thorn_spitter'));destination=target?.position||forestScene.camps?.[0]?.entrance||{x:0,z:-35};}if(destination){const raw=mapPoint(destination.x,destination.z),point=centered?{x:THREE.MathUtils.clamp(raw.x,10,width-10),y:THREE.MathUtils.clamp(raw.y,10,height-10)}:raw;if(point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height){context.beginPath();context.arc(point.x,point.y,centered?6:10,0,Math.PI*2);context.fillStyle='#ffd178';context.fill();context.strokeStyle='#101710';context.lineWidth=centered?2:3;context.stroke();if(!centered){context.fillStyle='#fff0ca';context.font='bold 11px Georgia';context.textAlign='left';context.fillText('MISIÓN',point.x+13,point.y);}}}}
  context.fillStyle = '#e18a68';
  forestEnemies.forEach(enemy => {
    if (!enemy.parent || enemy.userData.health <= 0) return;
    const point = mapPoint(enemy.position.x, enemy.position.z);
    context.beginPath(); context.arc(point.x, point.y, centered ? 2.5 : 5, 0, Math.PI * 2); context.fill();
  });
  const player = mapPoint(heroGroup.position.x, heroGroup.position.z);
  const headingX = Math.sin(heroRoot.rotation.y), headingY = Math.cos(heroRoot.rotation.y);
  context.save();
  context.translate(player.x, player.y);
  context.rotate(Math.atan2(headingY, headingX) + Math.PI / 2);
  context.fillStyle = '#f6e6b5';
  context.strokeStyle = '#172019';
  context.lineWidth = centered ? 1.5 : 3;
  context.beginPath();
  context.moveTo(0, centered ? -8 : -15);
  context.lineTo(centered ? 5 : 10, centered ? 6 : 12);
  context.lineTo(0, centered ? 3 : 7);
  context.lineTo(centered ? -5 : -10, centered ? 6 : 12);
  context.closePath(); context.fill(); context.stroke();
  context.restore();
  context.strokeStyle = '#a89568'; context.lineWidth = 2; context.strokeRect(1, 1, width - 2, height - 2);
}
function drawForestCompass(canvas) {
  if (!canvas || !heroRoot) return;
  const context = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  const center = width / 2;
  context.clearRect(0, 0, width, height);
  context.beginPath(); context.arc(center, center, center - 4, 0, Math.PI * 2);
  context.fillStyle = '#111914e8'; context.fill(); context.strokeStyle = '#a89568'; context.lineWidth = 2; context.stroke();
  context.font = 'bold 10px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle';
  [['N',center,10],['E',width-10,center],['S',center,height-10],['O',10,center]].forEach(([label,x,y]) => { context.fillStyle = label === 'N' ? '#e2c77e' : '#cbc7b4'; context.fillText(label,x,y); });
  const directionX = Math.sin(heroRoot.rotation.y), directionY = Math.cos(heroRoot.rotation.y);
  context.beginPath(); context.moveTo(center,center); context.lineTo(center + directionX * (center - 16), center + directionY * (center - 16));
  context.strokeStyle = '#df7057'; context.lineWidth = 4; context.lineCap = 'round'; context.stroke();
  context.beginPath(); context.arc(center,center,3,0,Math.PI*2); context.fillStyle = '#f2dfad'; context.fill();
}
function updatePlayerHealthHud() {
  const fill = document.querySelector('.health-track span');
  if (fill) fill.style.width = Math.min(100, Math.max(0, heroHealth) / playerMaxHealth() * 100) + '%';
  const remaining = playerInvulnerabilityRemaining();
  const invulnerabilityFill = document.querySelector('.invulnerability-track span');
  if (invulnerabilityFill) invulnerabilityFill.style.width = Math.min(100, remaining / PLAYER_INVULNERABILITY_MS * 100) + '%';
  if (heroRoot) updateInvulnerabilityVisual(heroRoot, remaining, performance.now());
}
function playerMaxStamina() { return 120 + Math.max(0, (rpgState?.attributes?.con || 5) - 5) * 4; }
function updatePlayerResourcesHud() {
  if (!rpgState) return;
  const resources = [
    ['mana-fill', rpgState.mana, derivedCharacterStats().sp],
    ['stamina-fill', rpgState.stamina, playerMaxStamina()]
  ];
  for (const [id, current, maximum] of resources) {
    const fill = document.getElementById(id);
    if (!fill) continue;
    const percent = Math.min(100, Math.max(0, current) / Math.max(1, maximum) * 100);
    fill.style.width = percent + '%';
    fill.parentElement.setAttribute('aria-valuenow', String(Math.round(percent)));
  }
}
function spendStamina(amount, label = 'esa acción') {
  if (!rpgState) return true;
  if (rpgState.stamina < amount) { showToast('Te falta aguante para '+label+'.'); return false; }
  rpgState.stamina = Math.max(0, rpgState.stamina - amount);
  staminaRecoveryDelay = Math.max(staminaRecoveryDelay, .8);
  updatePlayerResourcesHud();
  return true;
}
function spendMana(amount, label = 'esa técnica') {
  if (!rpgState) return true;
  if (rpgState.mana < amount) { showToast('No tienes maná suficiente para '+label+'.'); return false; }
  rpgState.mana = Math.max(0, rpgState.mana - amount);
  manaRecoveryDelay = Math.max(manaRecoveryDelay, 1.1);
  updatePlayerResourcesHud();
  return true;
}
function updatePlayerResources(delta, sprinting, moving) {
  if (!rpgState || delta <= 0) return;
  const maxStamina = playerMaxStamina(), maxMana = derivedCharacterStats().sp;
  staminaRecoveryDelay = Math.max(0, staminaRecoveryDelay - delta);
  manaRecoveryDelay = Math.max(0, manaRecoveryDelay - delta);
  if (sprinting) { rpgState.stamina = Math.max(0, rpgState.stamina - 7 * delta); staminaRecoveryDelay = Math.max(staminaRecoveryDelay, .3); }
  else if (!staminaRecoveryDelay) rpgState.stamina = Math.min(maxStamina, rpgState.stamina + (moving ? 12 : 24) * delta);
  if (!manaRecoveryDelay) rpgState.mana = Math.min(maxMana, rpgState.mana + 5 * delta);
  updatePlayerResourcesHud();
}
function playerInvulnerabilityRemaining() {
  return Math.max(0, invulnerabilityExpiresAt - performance.now());
}
function updateInvulnerabilityVisual(root, remaining, time) {
  const active = remaining > 0;
  const phase = active ? Math.floor(time / 110) % 2 : -1;
  if (root.userData.invulnerabilityVisualPhase === phase) return;
  root.userData.invulnerabilityVisualPhase = phase;
  root.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material.userData.invulnerabilityBaseOpacity === undefined) {
        material.userData.invulnerabilityBaseOpacity = material.opacity;
        material.userData.invulnerabilityBaseTransparent = material.transparent;
        material.userData.invulnerabilityBaseDepthWrite = material.depthWrite;
      }
      if (active) {
        material.transparent = true;
        material.opacity = material.userData.invulnerabilityBaseOpacity * (phase ? .68 : .28);
        material.depthWrite = false;
      } else {
        material.opacity = material.userData.invulnerabilityBaseOpacity;
        material.transparent = material.userData.invulnerabilityBaseTransparent;
        material.depthWrite = material.userData.invulnerabilityBaseDepthWrite;
      }
      material.needsUpdate = true;
    }
  });
}
function setMultiplayerStatus(message) {
  const status = document.getElementById('multiplayer-status');
  if (status) {
    status.textContent = message;
    status.hidden = gameMode && gameSessionMode === 'solo';
  }
}
function resetMultiplayerSessionState() {
  multiplayerPlayerId = null;
  multiplayerIsHost = false;
  multiplayerSpawn = null;
  activeLobbyId = null;
  activeLobbyName = '';
  pendingLobbyAction = null;
  startGameAfterJoin = false;
  setMultiplayerStatus('MULTIJUGADOR DESCONECTADO');
}
function disconnectMultiplayerSocket() {
  if (multiplayerSocket) {
    const socket = multiplayerSocket;
    multiplayerSocket = null;
    try { socket.close(); } catch (error) {}
  }
  resetMultiplayerSessionState();
}
function sendMultiplayerMessage(message) {
  if (multiplayerSocket?.readyState === WebSocket.OPEN) multiplayerSocket.send(JSON.stringify(message));
}
function syncSettingsSessionButtons() {
  const returnButton = document.getElementById('return-to-main-menu-button');
  const leaveButton = document.getElementById('leave-session-button');
  const closeButton = document.getElementById('close-lobby-button');
  if (!returnButton || !leaveButton || !closeButton) return;
  const isMultiplayer = gameSessionMode === 'multiplayer';
  returnButton.hidden = isMultiplayer || !gameMode;
  leaveButton.hidden = !isMultiplayer || !gameMode;
  closeButton.hidden = !isMultiplayer || !gameMode || !multiplayerIsHost;
}
function saveAndReturnToMainMenu() {
  if (trainingMode) { exitTrainingSession(); return; }
  const returningFromArena = arenaActive || arenaPending;
  if (returningFromArena) endArenaSession();
  if (gameSessionMode === 'multiplayer') {
    leaveCurrentMultiplayerSession(false);
    return;
  }
  if (!returningFromArena) saveGame();
  gameMode = false;
  gameMenuOpen = false;
  if (document.getElementById('arpg-backdrop')) document.getElementById('arpg-backdrop').classList.remove('open');
  document.getElementById('pause-overlay').hidden = true;
  showScreen('screen-main');
  syncSettingsSessionButtons();
}
function startArenaFromMenu() {
  if (!getSelectedProfile()) { renderProfiles(); showScreen('screen-profiles'); return; }
  trainingMode = false;
  arenaPending = true;
  startAdventure();
}
function ensureArenaTerrain() {
  if (arenaWorldGroup) return;
  arenaWorldGroup = new THREE.Group();
  arenaWorldGroup.name = 'terreno-arena-independiente';
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(84, 84), new THREE.MeshStandardMaterial({ color: '#4d5c48', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.06;
  ground.receiveShadow = true;
  ground.userData.walkSurface = 'grass';
  arenaWorldGroup.add(ground);
  arenaWorldWalkSurfaces = [ground];
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: '#77705b', roughness: .92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.025;
  floor.userData.walkSurface = 'stone';
  arenaWorldGroup.add(floor);
  arenaWorldWalkSurfaces.push(floor);
  const boundary = new THREE.Mesh(new THREE.TorusGeometry(16, .22, 8, 64), new THREE.MeshStandardMaterial({ color: '#b79a62', roughness: .6, metalness: .2 }));
  boundary.rotation.x = -Math.PI / 2;
  boundary.position.y = .08;
  arenaWorldGroup.add(boundary);
  const pillarMaterial = new THREE.MeshStandardMaterial({ color: '#625b49', roughness: .88 });
  for (const x of [-18, 18]) for (const z of [-18, 18]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.8, 1.05, 4.2, 8), pillarMaterial);
    pillar.position.set(x, 2.05, z);
    arenaWorldGroup.add(pillar);
  }
  arenaWorldGroup.add(new THREE.AmbientLight('#d4d9c5', .85));
  const key = new THREE.DirectionalLight('#f2ddb0', 1.15);
  key.position.set(-18, 30, 12);
  arenaWorldGroup.add(key);
  arenaWorldFog = new THREE.FogExp2('#56614c', .0032);
  arenaWorldGroup.visible = false;
  scene.add(arenaWorldGroup);
}
function enterArenaTerrain() {
  ensureArenaTerrain();
  if (currentWorldId !== 'arena') arenaPreviousWorldId = currentWorldId;
  if (villaWorldGroup) villaWorldGroup.visible = false;
  if (forestScene) forestScene.group.visible = false;
  arenaWorldGroup.visible = true;
  currentWorldId = 'arena';
  audioManager?.switchWorldAmbience(currentWorldId);
  scene.fog = arenaWorldFog;
  cityColliders = [];
  walkSurfaces = arenaWorldWalkSurfaces;
  cameraBlockers = [];
  document.getElementById('villa-navigation').hidden = true;
  document.getElementById('forest-navigation').hidden = true;
  document.getElementById('villa-map-overlay').hidden = true;
  document.getElementById('forest-map-overlay').hidden = true;
}
function leaveArenaTerrain() {
  if (!arenaWorldGroup || currentWorldId !== 'arena') return;
  arenaWorldGroup.visible = false;
  currentWorldId = arenaPreviousWorldId === 'forest' ? 'forest' : 'villa';
  audioManager?.switchWorldAmbience(currentWorldId);
  if (currentWorldId === 'forest') {
    if (villaWorldGroup) villaWorldGroup.visible = false;
    forestScene.group.visible = true;
    scene.fog = forestScene.fog;
    cityColliders = forestScene.colliders;
    walkSurfaces = forestScene.walkSurfaces;
    cameraBlockers = [];
  } else {
    if (forestScene) forestScene.group.visible = false;
    villaWorldGroup.visible = true;
    scene.fog = villaFog;
    cityColliders = villaWorldColliders;
    walkSurfaces = villaWorldWalkSurfaces;
    buildCameraBlockers();
  }
}
function activateArenaSession() {
  arenaPending = false;
  arenaActive = true;
  enterArenaTerrain();
  arenaRound = 0;
  arenaTransitionTimer = 0;
  arenaCompleted = false;
  arenaWorldEnemyStates = [];
  for (const [index, enemy] of enemyCombatants.entries()) {
    if (!enemy.userData.ai || enemy.userData.ai.arenaOpponent) continue;
    arenaWorldEnemyStates.push({ enemy, position: enemy.position.clone(), rotation: enemy.rotation.y, trainingDisabled: enemy.userData.ai.trainingDisabled });
    enemy.userData.ai.trainingDisabled = true;
    enemy.position.set(500 + index * 4, 0, 500);
    if (enemy.userData.healthBar?.sprite) enemy.userData.healthBar.sprite.visible = false;
  }
  heroGroup.position.set(0, 0, 4.2);
  heroRoot.rotation.y = Math.PI;
  movementVelocity.set(0, 0);
  heroHealth = 100;
  setLockedEnemy(null);
  cameraYaw = heroRoot.rotation.y;
  cameraPitch = 0;
  camera.position.set(heroGroup.position.x, 5.8, heroGroup.position.z + 8);
  cameraTarget.set(heroGroup.position.x, 1.1, heroGroup.position.z);
  cameraFocusGoal.copy(cameraTarget);
  camera.lookAt(cameraTarget);
  document.getElementById('arena-hud').hidden = false;
  beginArenaRound(1);
  updatePlayerHealthHud();
}
function beginArenaRound(round) {
  const settings = ARENA_ROUNDS[round - 1];
  if (!settings) return;
  arenaRound = round;
  arenaTransitionTimer = 0;
  const x = heroRoot.position.x + (round === 2 ? -2.4 : 2.4);
  const z = heroRoot.position.z - 2.8;
  arenaOpponent = createEnemyCombatant({ x, z, rotationY: Math.atan2(heroRoot.position.x - x, heroRoot.position.z - z), tint: settings.tint });
  if (!arenaOpponent) return;
  Object.assign(arenaOpponent.userData, { name: settings.name, level: settings.level, health: settings.health, maxHealth: settings.health });
  Object.assign(arenaOpponent.userData.ai, { arenaOpponent: true, arenaAggression: settings.aggression, arenaDamage: settings.damage, attackCooldown: .55, dashCooldown: .55 });
  if (arenaOpponent.userData.healthBar) arenaOpponent.userData.healthBar.lastHealth = null;
  document.getElementById('arena-round-copy').textContent = 'RIVAL ' + round + ' / 3 · NIVEL ' + settings.level;
  document.getElementById('arena-status').textContent = settings.name + ' · PREPÁRATE';
  audioManager?.playTutorialChime();
}
function updateArenaHud(status) {
  const label = document.getElementById('arena-status');
  const exitButton = document.getElementById('arena-exit-button');
  if (status && label) label.textContent = status;
  if (exitButton) exitButton.textContent = arenaCompleted ? 'SALIR' : 'ABANDONAR';
}
function updateArenaRound(delta) {
  if (!arenaActive || !arenaOpponent) return;
  if (arenaOpponent.userData.health > 0) return;
  arenaTransitionTimer += delta;
  updateArenaHud(arenaTransitionTimer < .75 ? 'RIVAL DERROTADO' : 'SIGUIENTE RIVAL…');
  if (arenaTransitionTimer < 1.35) return;
  removeArenaOpponent(arenaOpponent);
  arenaOpponent = null;
  if (arenaRound >= ARENA_ROUNDS.length) {
    arenaCompleted = true;
    document.getElementById('arena-round-copy').textContent = 'SERIE COMPLETADA · 3 / 3';
    updateArenaHud('VICTORIA · TODOS DERROTADOS');
    return;
  }
  beginArenaRound(arenaRound + 1);
}
function removeArenaOpponent(enemy) {
  if (!enemy) return;
  scene.remove(enemy);
  enemyCombatants = enemyCombatants.filter(candidate => candidate !== enemy);
  enemy.traverse(object => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => material?.dispose?.());
  });
  window.enemyCombatants = enemyCombatants;
}
function endArenaSession() {
  if (arenaOpponent) removeArenaOpponent(arenaOpponent);
  arenaWorldEnemyStates.forEach(state => {
    if (!state.enemy.parent) scene.add(state.enemy);
    state.enemy.position.copy(state.position);
    state.enemy.rotation.y = state.rotation;
    if (state.trainingDisabled === undefined) delete state.enemy.userData.ai.trainingDisabled;
    else state.enemy.userData.ai.trainingDisabled = state.trainingDisabled;
    if (state.enemy.userData.healthBar?.sprite) state.enemy.userData.healthBar.sprite.visible = state.enemy.userData.health > 0;
  });
  arenaWorldEnemyStates = [];
  arenaOpponent = null;
  arenaActive = false;
  arenaPending = false;
  arenaRound = 0;
  arenaCompleted = false;
  document.getElementById('arena-hud').hidden = true;
  setLockedEnemy(null);
  leaveArenaTerrain();
}
function leaveCurrentMultiplayerSession(closeLobby = false) {
  if (trainingMode) exitTrainingSession();
  if (gameSessionMode !== 'multiplayer') return;
  const messageType = closeLobby || multiplayerIsHost ? 'closeLobby' : 'leaveLobby';
  if (multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
    sendMultiplayerMessage({ type: messageType });
  }
  disconnectMultiplayerSocket();
  gameSessionMode = 'solo';
  gameMode = false;
  manualPaused = false;
  activeGamePanel = null;
  gameMenuOpen = false;
  document.getElementById('pause-overlay').hidden = true;
  if (document.getElementById('screen-gameplay')) document.getElementById('screen-gameplay').classList.remove('menu-open');
  if (document.getElementById('arpg-backdrop')) document.getElementById('arpg-backdrop').classList.remove('open');
  showScreen('screen-main');
  syncSettingsSessionButtons();
}
function renderLobbyList(lobbies) {
  const list = document.getElementById('lobby-list');
  const state = document.getElementById('lobby-list-state');
  if (!list || !state) return;
  availableLobbies = lobbies;
  const filter = document.getElementById('lobby-search').value.trim().toLocaleLowerCase('es');
  const visibleLobbies = lobbies.filter(lobby => lobby.name.toLocaleLowerCase('es').includes(filter));
  list.replaceChildren();
  state.textContent = visibleLobbies.length ? visibleLobbies.length + (visibleLobbies.length === 1 ? ' partida disponible' : ' partidas disponibles') : lobbies.length ? 'No hay partidas con ese nombre.' : 'No hay partidas activas. Crea una para que otros puedan unirse.';
  for (const lobby of visibleLobbies) {
    const card = document.createElement('article');
    card.className = 'lobby-card';
    const details = document.createElement('div');
    details.className = 'lobby-card-details';
    const name = document.createElement('strong');
    name.textContent = lobby.name;
    const count = document.createElement('span');
    count.textContent = 'Anfitrión: ' + lobby.hostName + ' · ' + lobby.players + ' / ' + lobby.maxPlayers + ' jugadores';
    details.append(name, count);
    const join = document.createElement('button');
    join.type = 'button';
    join.className = 'lobby-join-button';
    join.textContent = 'UNIRSE';
    join.disabled = lobby.players >= lobby.maxPlayers;
    join.addEventListener('click', () => {
      const nameInput = document.getElementById('join-player-name');
      const playerName = nameInput.value.trim();
      if (!playerName) { nameInput.focus(); return; }
      gameSessionMode = 'multiplayer';
      multiplayerName = playerName;
      startGameAfterJoin = true;
      pendingLobbyAction = { type: 'joinLobby', lobbyId: lobby.id, name: playerName };
      connectMultiplayer();
    });
    card.append(details, join);
    list.append(card);
  }
}
function connectMultiplayer() {
  if (multiplayerSocket?.readyState === WebSocket.OPEN) {
    if (pendingLobbyAction) sendMultiplayerMessage(pendingLobbyAction);
    else if (gameMode && activeLobbyId) sendMultiplayerMessage({ type: 'joinLobby', lobbyId: activeLobbyId, name: multiplayerName });
    else sendMultiplayerMessage({ type: 'listLobbies' });
    return;
  }
  if (multiplayerSocket?.readyState === WebSocket.CONNECTING) return;
  clearTimeout(networkReconnectTimer);
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  multiplayerSocket = new WebSocket(`${protocol}//${location.host}/ws`);
  if (document.getElementById('screen-join-lobby').classList.contains('active')) document.getElementById('lobby-list-state').textContent = 'Conectando al servidor...';
  multiplayerSocket.addEventListener('open', () => {
    if (pendingLobbyAction) sendMultiplayerMessage(pendingLobbyAction);
    else if (gameMode && activeLobbyId) sendMultiplayerMessage({ type: 'joinLobby', lobbyId: activeLobbyId, name: multiplayerName });
    else sendMultiplayerMessage({ type: 'listLobbies' });
  });
  multiplayerSocket.addEventListener('message', event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'lobbies') {
      renderLobbyList(message.lobbies || []);
    } else if (message.type === 'joined') {
      pendingLobbyAction = null;
      gameSessionMode = 'multiplayer';
      multiplayerPlayerId = message.player.id;
      multiplayerIsHost = Boolean(message.isHost);
      multiplayerName = message.player.name;
      activeLobbyId = message.lobby.id;
      activeLobbyName = message.lobby.name;
      multiplayerSpawn = { x: message.player.x, y: message.player.y, z: message.player.z };
      heroRoot.position.set(message.player.x, message.player.y, message.player.z);
      heroRoot.rotation.y = message.player.yaw;
      applyMultiplayerSnapshot(message.players || []);
      syncSettingsSessionButtons();
      if (startGameAfterJoin) {
        startGameAfterJoin = false;
        startAdventure();
      }
    } else if (message.type === 'snapshot') {
      applyMultiplayerSnapshot(message.players || []);
    } else if (message.type === 'combatHit') {
      applyMultiplayerCombatHit(message);
    } else if (message.type === 'lobbyError') {
      pendingLobbyAction = null;
      startGameAfterJoin = false;
      showToast(message.message || 'No se pudo entrar a la partida.');
    } else if (message.type === 'lobbyClosed') {
      disconnectMultiplayerSocket();
      gameSessionMode = 'solo';
      if (gameMode) {
        gameMode = false;
        manualPaused = false;
        activeGamePanel = null;
      }
      showToast('La partida se cerró.');
      showScreen('screen-main');
      syncSettingsSessionButtons();
    } else if (message.type === 'leftLobby') {
      disconnectMultiplayerSocket();
      gameSessionMode = 'solo';
      showScreen('screen-main');
      syncSettingsSessionButtons();
    }
  });
  multiplayerSocket.addEventListener('close', () => {
    multiplayerPlayerId = null;
    setMultiplayerStatus('SERVIDOR DESCONECTADO');
    const browsing = document.getElementById('screen-join-lobby').classList.contains('active');
    if ((gameMode && activeLobbyId) || browsing) networkReconnectTimer = window.setTimeout(connectMultiplayer, 2500);
  });
  multiplayerSocket.addEventListener('error', () => {
    setMultiplayerStatus('SIN CONEXIÓN MULTIJUGADOR');
    const state = document.getElementById('lobby-list-state');
    if (state && document.getElementById('screen-join-lobby').classList.contains('active')) state.textContent = 'No se pudo conectar con el servidor.';
  });
}
function createRemotePlayer(player) {
  const remote = heroRoot.clone(true);
  remote.name = 'remote-player-' + player.id;
  remote.traverse(object => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const clones = materials.map(source => {
      const material = source.clone();
      if (material.color) material.color.offsetHSL(.04, -.08, -.08);
      return material;
    });
    object.material = Array.isArray(object.material) ? clones : clones[0];
  });
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sprite.name = 'remote-player-health';
  sprite.position.set(0, 2.72, 0);
  sprite.scale.set(1.75, .44, 1);
  sprite.renderOrder = 9;
  remote.add(sprite);
  remote.userData = {
    isEnemy: true, isPlayer: true, playerId: player.id, health: player.health, maxHealth: player.maxHealth,
    name: player.name, level: 1, targetPosition: new THREE.Vector3(player.x, player.y, player.z), targetYaw: player.yaw,
    healthLabel: { canvas, context: canvas.getContext('2d'), texture, lastHealth: -1, lastName: '', lastInvulnerabilityStep: -1 },
    attacking: false, invulnerabilityUntil: performance.now() + (player.invulnerabilityRemaining || 0)
  };
  remote.position.set(player.x, player.y, player.z);
  remote.rotation.y = player.yaw;
  scene.add(remote);
  remotePlayers.set(player.id, remote);
  return remote;
}
function applyMultiplayerSnapshot(players) {
  const seen = new Set();
  for (const player of players) {
    if (!player || typeof player.id !== 'string') continue;
    seen.add(player.id);
    if (player.id === multiplayerPlayerId) {
      if (heroHealth <= 0 && player.health > 0) heroRoot.position.set(player.x, player.y, player.z);
      heroHealth = player.health;
      invulnerabilityExpiresAt = performance.now() + Math.max(0, player.invulnerabilityRemaining || 0);
      updatePlayerHealthHud();
      continue;
    }
    const remote = remotePlayers.get(player.id) || createRemotePlayer(player);
    const data = remote.userData;
    data.name = player.name;
    data.health = player.health;
    data.maxHealth = player.maxHealth;
    data.targetPosition.set(player.x, player.y, player.z);
    data.targetYaw = player.yaw;
    data.attacking = player.attacking;
    data.invulnerabilityUntil = performance.now() + Math.max(0, player.invulnerabilityRemaining || 0);
    const invulnerabilityStep = Math.ceil((player.invulnerabilityRemaining || 0) / 50);
    if (data.healthLabel.lastHealth !== data.health || data.healthLabel.lastName !== data.name || data.healthLabel.lastInvulnerabilityStep !== invulnerabilityStep) {
      const { canvas, context, texture } = data.healthLabel;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = '600 32px Cinzel, serif';
      context.textAlign = 'center';
      context.fillStyle = '#f4e8c7';
      context.shadowColor = '#080b0a';
      context.shadowBlur = 6;
      context.fillText(data.name, canvas.width / 2, 30, 460);
      context.shadowBlur = 0;
      context.fillStyle = '#171212';
      context.fillRect(92, 40, 328, 18);
      context.fillStyle = '#b34c43';
      context.fillRect(96, 44, 320 * THREE.MathUtils.clamp(data.health / data.maxHealth, 0, 1), 10);
      context.fillStyle = '#171212';
      context.fillRect(92, 66, 328, 10);
      context.fillStyle = '#fff';
      context.fillRect(96, 68, 320 * THREE.MathUtils.clamp((player.invulnerabilityRemaining || 0) / PLAYER_INVULNERABILITY_MS, 0, 1), 6);
      texture.needsUpdate = true;
      data.healthLabel.lastHealth = data.health;
      data.healthLabel.lastName = data.name;
      data.healthLabel.lastInvulnerabilityStep = invulnerabilityStep;
    }
  }
  for (const [id, remote] of remotePlayers) {
    if (seen.has(id)) continue;
    scene.remove(remote);
    remote.traverse(object => {
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose?.());
      }
    });
    remotePlayers.delete(id);
  }
  setMultiplayerStatus('EN LÍNEA · ' + players.length + (players.length === 1 ? ' JUGADOR' : ' JUGADORES'));
}
function updateRemotePlayers(delta, time) {
  for (const remote of remotePlayers.values()) {
    const data = remote.userData;
    const position = data.targetPosition;
    updateInvulnerabilityVisual(remote, data.invulnerabilityUntil - performance.now(), performance.now());
    const distance = Math.hypot(position.x - remote.position.x, position.z - remote.position.z);
    const blend = 1 - Math.exp(-12 * delta);
    remote.position.lerp(position, blend);
    const yawDelta = Math.atan2(Math.sin(data.targetYaw - remote.rotation.y), Math.cos(data.targetYaw - remote.rotation.y));
    remote.rotation.y += yawDelta * blend;
    const hips = remote.getObjectByName('hips');
    const leftHip = remote.getObjectByName('leftHip');
    const rightHip = remote.getObjectByName('rightHip');
    const leftShoulder = remote.getObjectByName('leftShoulder');
    const rightShoulder = remote.getObjectByName('rightShoulder');
    const stride = distance > .015 ? Math.sin(time * 11) * .32 : 0;
    if (hips) hips.rotation.z = THREE.MathUtils.lerp(hips.rotation.z, distance > .015 ? Math.sin(time * 11) * .035 : 0, blend);
    if (leftHip) leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, stride, blend);
    if (rightHip) rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, -stride, blend);
    const attackPose = data.attacking ? -.3 + Math.sin(time * 22) * .95 : -.72;
    if (rightShoulder) rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, attackPose, blend);
    if (leftShoulder) leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, data.attacking ? -.95 : 0, blend);
    if (data.mediaLunaReaction) {
      const reaction = data.mediaLunaReaction;
      reaction.elapsed += delta;
      const pose = getMultiplayerHitPose(reaction, delta);
      remote.position.y = data.targetPosition.y + pose.height;
      if (hips) hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, pose.torso, blend);
      if (rightShoulder) rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, pose.shoulder, blend);
      if (remote.getObjectByName('rightElbow')) remote.getObjectByName('rightElbow').rotation.x = THREE.MathUtils.lerp(remote.getObjectByName('rightElbow').rotation.x, pose.elbow, blend);
      if (remote.getObjectByName('rightHandGrip')) remote.getObjectByName('rightHandGrip').rotation.x = THREE.MathUtils.lerp(remote.getObjectByName('rightHandGrip').rotation.x, pose.grip, blend);
      if (reaction.elapsed >= reaction.duration) { remote.position.y = data.targetPosition.y; data.mediaLunaReaction = null; }
    }
  }
}
function getMultiplayerHitPose(reaction, delta) {
  const elapsed = reaction.elapsed;
  const duration = reaction.duration;
  const lift = reaction.move === 'mediaLunaLaunch' ? .2 : reaction.move === 'mediaLunaAir' ? .08 : .13;
  const hold = reaction.move === 'mediaLunaLaunch' ? .42 : reaction.move === 'mediaLunaAir' ? .08 : .05;
  const fall = Math.max(.12, duration - lift - hold);
  let height = elapsed < lift ? .95 * easeOut(elapsed / lift) : elapsed < lift + hold ? .95 : .95 * (1 - easeInOut(THREE.MathUtils.clamp((elapsed - lift - hold) / fall, 0, 1)));
  if (reaction.move === 'mediaLunaSlam') height = .95 * (1 - easeInOut(THREE.MathUtils.clamp(elapsed / duration, 0, 1)));
  const active = elapsed < duration * .72;
  const shoulder = !active ? -.72 : reaction.move === 'mediaLunaSlam' ? -1.48 : -1.04;
  const elbow = !active ? -.78 : reaction.move === 'mediaLunaSlam' ? -.22 : -.98;
  const grip = !active ? 0 : reaction.move === 'mediaLunaSlam' ? .48 : .22;
  return { height, torso: active ? -.18 : 0, shoulder, elbow, grip };
}
function applyMultiplayerCombatHit(message) {
  const move = ['mediaLunaLaunch', 'mediaLunaAir', 'mediaLunaSlam'].includes(message.move) ? message.move : 'normal';
  const duration = move === 'mediaLunaLaunch' ? .96 : move === 'mediaLunaSlam' ? .42 : move === 'mediaLunaAir' ? .34 : .24;
  if (message.targetId === multiplayerPlayerId) {
    if (risingSlash.target) releaseMediaLunaTarget(risingSlash.target);
    risingSlash.phase = 'IDLE';
    risingSlash.target = null;
    comboState = 'IDLE';
    comboHit = 0;
    comboQueued = false;
    activeAttackPoses = null;
    activeAttackTarget = null;
    jumpActive = false;
    jumpPhase = 'ground';
    movementVelocity.set(0, 0);
    multiplayerHitReaction = { move, elapsed: 0, duration, baseY: heroGroup.position.y };
  } else {
    const remote = remotePlayers.get(message.targetId);
    if (remote) remote.userData.mediaLunaReaction = { move, elapsed: 0, duration };
  }
}
function updateLocalMultiplayerHitReaction(delta) {
  if (!multiplayerHitReaction) return false;
  const reaction = multiplayerHitReaction;
  reaction.elapsed += delta;
  const pose = getMultiplayerHitPose(reaction, delta);
  heroGroup.position.y = reaction.baseY + pose.height;
  torso.rotation.x = smoothLerp(torso.rotation.x, pose.torso, .28);
  rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, pose.shoulder, .28);
  rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, pose.elbow, .28);
  rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, pose.grip, .28);
  swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, pose.grip + .08, .28);
  if (reaction.elapsed >= reaction.duration) {
    heroGroup.position.y = reaction.baseY;
    multiplayerHitReaction = null;
    return false;
  }
  return true;
}
function sendPlayerAttack(targetId, move = 'normal') {
  if (targetId && multiplayerPlayerId) sendMultiplayerMessage({ type: 'attack', targetId, move });
}
function sendPlayerSwing() {
  if (multiplayerPlayerId) sendMultiplayerMessage({ type: 'swing' });
}
function emitSwordClash(position) {
  if (!clashSparks) {
    const vertices = new Float32Array(18 * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({ color: '#ffe8a1', transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    clashSparks = new THREE.LineSegments(geometry, material);
    clashSparks.frustumCulled = false;
    scene.add(clashSparks);
  }
  const points = [];
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + Math.random() * .18;
    const direction = new THREE.Vector3(Math.cos(angle), (Math.random() - .5) * 1.3, Math.sin(angle));
    const length = .18 + Math.random() * .42;
    points.push(new THREE.Vector3(), direction.multiplyScalar(length));
  }
  clashSparks.geometry.setFromPoints(points);
  clashSparks.position.copy(position);
  clashSparks.visible = true;
  clashSparks.material.opacity = 1;
  clashSparkTimer = .22;
  audioManager?.playSwordImpact(1.45);
}
function updateSwordClashEffect(delta) {
  if (!clashSparks?.visible) return;
  clashSparkTimer = Math.max(0, clashSparkTimer - delta);
  clashSparks.scale.setScalar(.8 + (1 - clashSparkTimer / .22) * .8);
  clashSparks.material.opacity = clashSparkTimer / .22;
  if (!clashSparkTimer) clashSparks.visible = false;
}
function triggerComboFlash() {
  comboFlashTimer = .42;
  if (comboFlashLight) {
    comboFlashLight.visible = true;
    comboFlashLight.intensity = 0;
  }
  document.getElementById('screen-gameplay').classList.add('combo-confirmed');
  window.setTimeout(() => document.getElementById('screen-gameplay').classList.remove('combo-confirmed'), 260);
  audioManager?.playCombo();
}
function updateComboFlash(delta) {
  if (!comboFlashLight?.visible) return;
  comboFlashTimer = Math.max(0, comboFlashTimer - delta);
  const progress = 1 - comboFlashTimer / .42;
  comboFlashLight.intensity = Math.sin(progress * Math.PI) * 5.2;
  comboFlashLight.distance = 3.2 + Math.sin(progress * Math.PI) * 1.2;
  if (!comboFlashTimer) {
    comboFlashLight.intensity = 0;
    comboFlashLight.visible = false;
  }
}
function damagePlayer(damage, direction, stunDuration = .22, attacker = null) {
  if (attacker?.userData?.ai && !enemyHasLineOfSight(attacker)) return false;
  if (isInSafePlaza(heroRoot.position) || dashInvulnerability > 0 || (!trainingMode && playerInvulnerabilityRemaining() > 0) || heroHealth <= 0) return false;
  const guarding = Boolean(shieldButtonHeld || window.gameKeys?.Shift || window.gameKeys?.Control);
  const hasShield = Boolean(rpgState?.equipment?.offhand);
  const facing = new THREE.Vector3(Math.sin(heroRoot.rotation.y), 0, Math.cos(heroRoot.rotation.y));
  const incoming = new THREE.Vector3(-direction.x, 0, -direction.z).normalize();
  const frontal = facing.dot(incoming) > .2;
  let blocked = guarding && hasShield && frontal;
  let parried = blocked && shieldParryTimer > 0;
  if (blocked && !spendStamina(parried ? 7 : 5, 'bloquear')) { blocked = false; parried = false; }
  if (!blocked && comboStreak > 0) {
    comboStreak = 0;
    updateComboStreakDisplay(true);
  }
  if (parried) {
    if (attacker?.userData?.ai) {
      attacker.userData.ai.stunTimer = Math.max(attacker.userData.ai.stunTimer || 0, .55);
      attacker.userData.ai.comboRemaining = 0;
      attacker.userData.ai.attackTimer = 0;
      attacker.userData.ai.attackPoses = null;
      attacker.userData.ai.attackPending = null;
      attacker.userData.ai.exposedTimer = .9;
    }
    const clashPoint = heroGroup.position.clone().add(attacker ? attacker.position : incoming).multiplyScalar(.5);
    clashPoint.y += 1.1;
    emitSwordClash(clashPoint);
    shieldParryTimer = 0;
  }
  if (trainingMode) {
    heroStunTimer = Math.max(heroStunTimer, parried ? 0 : blocked ? .045 : Math.min(.12, stunDuration));
    movementVelocity.x += direction.x * (blocked ? .18 : .3);
    movementVelocity.y += direction.z * (blocked ? .18 : .3);
    updatePlayerHealthHud();
    showCombatFeedback(parried ? 'PARADA · RIVAL EXPUESTO' : blocked ? 'BLOQUEO DE PRÁCTICA' : 'IMPACTO DE PRÁCTICA', false);
    if (parried) recordTrainingAction('parry');
    else if (blocked) recordTrainingAction('block');
    return true;
  }
  const defense = rpgState ? derivedCharacterStats().defense : 0;
  const mitigatedDamage = damage * (100 / (100 + Math.max(0, defense)));
  const finalDamage = blocked ? mitigatedDamage * (parried ? 0 : .15) : mitigatedDamage;
  if (finalDamage > 0) {
    if (multiplayerPlayerId) sendMultiplayerMessage({ type: 'worldDamage', damage: finalDamage });
    else heroHealth = Math.max(0, heroHealth - finalDamage);
  }
  heroStunTimer = Math.max(heroStunTimer, parried ? 0 : blocked ? .045 : stunDuration);
  movementVelocity.x += direction.x * (blocked ? .18 : 1.8);
  movementVelocity.y += direction.z * (blocked ? .18 : 1.8);
  updatePlayerHealthHud();
  showCombatFeedback(parried ? 'PARADA · ESPADA DESVIADA' : blocked ? 'ESCUDO · ' + Math.round(finalDamage) : 'IMPACTO · ' + Math.round(finalDamage), !blocked);
  if (heroHealth <= 0 && !multiplayerPlayerId && !trainingMode) respawnPlayerAtWalpira();
  return true;
}
function respawnPlayerAtWalpira() {
  const fallenAt = heroGroup.position.clone();
  const world = currentWorldId;
  const candidates = world === 'forest'
    ? [WALPIRA_HOME_SPAWN, FOREST_GATE_RESPAWN]
    : world === 'arena'
      ? [{ x: 0, z: 0 }]
      : Array.from({ length: 32 }, (_, index) => {
          const angle = index * Math.PI / 16;
          const radius = index === 0 ? 0 : 8.5;
          return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
        });
  const spawn = candidates
    .filter(point => !isTownPositionBlocked(point.x, point.z))
    .sort((a, b) => Math.hypot(a.x - fallenAt.x, a.z - fallenAt.z) - Math.hypot(b.x - fallenAt.x, b.z - fallenAt.z))[0]
    || (world === 'forest' ? WALPIRA_HOME_SPAWN : world === 'arena' ? { x: 0, z: 0 } : { x: 0, z: 7.4 });
  heroGroup.position.set(spawn.x, 0, spawn.z);
  heroRoot.rotation.y = 0;
  cameraYaw = 0;
  cameraPitch = 0;
  camera.position.set(spawn.x, 5.8, spawn.z - 8);
  cameraTarget.set(spawn.x, 1.1, spawn.z);
  cameraFocusGoal.copy(cameraTarget);
  camera.lookAt(cameraTarget);
  movementVelocity.set(0, 0);
  heroHealth = playerMaxHealth();
  heroStunTimer = 0;
  dashInvulnerability = 2;
  setLockedEnemy(null);
  updatePlayerHealthHud();
  showToast('Has caído en combate. Regresas a una zona segura de este mapa.');
}
function refreshLockedEnemyHud() {
  const hud = document.getElementById('locked-enemy-hud');
  if (!hud) return;
  const enemy = lockedEnemy;
  hud.hidden = !enemy || !isLockTargetAlive(enemy);
  if (!enemy || hud.hidden) return;
  const data = enemy.userData;
  const maxHealth = Number(data.maxHealth) || 100;
  const health = THREE.MathUtils.clamp(Number(data.health) || maxHealth, 0, maxHealth);
  const hasHealth = (data.health !== undefined && data.health !== null) || (data.maxHealth !== undefined && data.maxHealth !== null);
  const kind = lockTargetKind(data);
  document.getElementById('locked-enemy-name').textContent = data.name || data.npc?.name || kind;
  document.getElementById('locked-enemy-kind').textContent = kind;
  document.getElementById('locked-enemy-detail').textContent = data.npc?.role || data.role || data.species || (data.isPlayer ? 'Multijugador' : data.isEnemy ? 'Hostil' : 'Objetivo fijado');
  const level = document.getElementById('locked-enemy-level');
  level.parentElement.hidden = !Number.isFinite(Number(data.level));
  level.textContent = String(data.level || 1);
  const healthBar = document.querySelector('#locked-enemy-hud .locked-enemy-health');
  const healthCopy = document.getElementById('locked-enemy-health-copy');
  healthBar.hidden = !hasHealth;
  healthCopy.hidden = !hasHealth;
  document.getElementById('locked-enemy-health-value').textContent = String(Math.ceil(health));
  document.getElementById('locked-enemy-health-max').textContent = String(maxHealth);
  document.getElementById('locked-enemy-health-fill').style.width = (health / maxHealth * 100) + '%';
  const portrait = enemy.getObjectByName('heroFaceDecal')?.material?.map?.image;
  const image = document.getElementById('locked-enemy-portrait');
  image.hidden = !portrait;
  if (portrait && image.dataset.enemyUuid !== enemy.uuid) {
    image.src = portrait.toDataURL();
    image.dataset.enemyUuid = enemy.uuid;
  }
}
function createGroundLootPile(position,itemIds) {
  const group=new THREE.Group(),gold=new THREE.MeshStandardMaterial({color:'#d5ad58',emissive:'#86602a',emissiveIntensity:.52,metalness:.52,roughness:.36});
  group.userData.isGroundLootPile = true;
  const bag=new THREE.Mesh(new THREE.DodecahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:'#654b32',roughness:.84}));bag.position.y=.34;group.add(bag);
  const seal=new THREE.Mesh(new THREE.TorusGeometry(.23,.045,7,18),gold);seal.position.y=.43;group.add(seal);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.58,.025,6,32),new THREE.MeshBasicMaterial({color:'#f5d47c',transparent:true,opacity:.72}));halo.rotation.x=-Math.PI/2;halo.position.y=.08;group.add(halo);
  const light=new THREE.PointLight('#f3c86e',1.2,4.2,2);light.position.y=.75;group.add(light);
  const gemColor=itemIds.some(id=>id==='piedra_del_alma')?'#c79cff':'#90d5bc';
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.13,0),new THREE.MeshStandardMaterial({color:gemColor,emissive:gemColor,emissiveIntensity:.55,metalness:.3,roughness:.25}));gem.position.set(.35,.56,0);group.add(gem);
  group.position.set(position.x,.04,position.z);scene.add(group);
  groundLootPiles.push({group,items:[...itemIds],phase:Math.random()*Math.PI*2,light,halo,worldId:currentWorldId});
}
function removeGroundLootPile(pile) {
  scene.remove(pile.group);
  pile.group.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose?.();});
  groundLootPiles=groundLootPiles.filter(entry=>entry!==pile);
  if(nearbyGroundLoot===pile)nearbyGroundLoot=null;
  if(activeLootPile===pile){activeLootPile=null;const panel=document.getElementById('ground-loot-panel');if(panel)panel.hidden=true;manualPaused=lootPausedBeforeOpen;}
}
function clearGroundLootForWorld(worldId) {
  for(const pile of [...groundLootPiles]){if(pile.worldId===worldId)removeGroundLootPile(pile);}
}
function awardForestMaterialLoot(enemy) {
  const data=enemy.userData;
  if(!data.isForestCreature||!rpgState)return;
  const drops=data.speciesId==='hollow_trunk'?['piedra_del_alma','gema_de_roca']:data.speciesId==='thorn_spitter'?['gema_de_agua','gema_de_escarcha']:['gema_de_viento','gema_de_roca'];
  const loot=data.speciesId==='hollow_trunk'?drops:(Math.random()<.52?[drops[Math.floor(Math.random()*drops.length)]]:[]);
  const quest=currentStoryQuest();
  if(quest?.type==='forestMaterials'&&data.speciesId==='thorn_spitter')loot.unshift(quest.itemId);
  if(loot.length)createGroundLootPile(enemy.position,loot);
}
function beginEnemyDeath(enemy) {
  const data = enemy.userData;
  const ai = data.ai;
  if (trainingMode && ai?.trainingMode) {
    data.health = data.maxHealth || 100;
    ai.dead = false;
    ai.stunTimer = Math.max(ai.stunTimer || 0, .35);
    return;
  }
  if (ai.dead) return;
  const creatureId = data.bestiaryId || BESTIARY_CREATURES.find(entry => entry.name === data.name)?.id;
  if (creatureId) unlockBestiaryEntry(creatureId);
  ai.dead = true;
  if(data.factionMemberId&&rpgState){const state=rpgState.factionState;state.defeatedMembers ||= [];if(!state.defeatedMembers.includes(data.factionMemberId))state.defeatedMembers.push(data.factionMemberId);if(data.factionRole==='leader')state.leaderDefeated=true;saveRpgProfile();}
  recordStoryEnemyDefeated(enemy);
  awardForestMaterialLoot(enemy);
  ai.deathTime = 0;
  dropExperienceOrb(enemy);
  ai.stunTimer = 0;
  if (data.healthBar) data.healthBar.visible = false;
  const face = enemy.getObjectByName('heroFaceDecal');
  if (face?.material) {
    face.material.map = createEnemyFaceDecal(false, true);
    face.material.needsUpdate = true;
  }
  const tongue = enemy.getObjectByName('enemyTongue');
  if (tongue) tongue.visible = true;
  enemy.traverse(object => {
    if (!object.isMesh || object.name === 'heroFaceDecal' || object.name === 'heroRearBand' || object.name === 'enemyTongue') return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material?.color) material.color.lerp(new THREE.Color('#77736f'), .68);
      if (material?.emissive) material.emissive.set('#171313');
    }
  });
  if (lockedEnemy === enemy) setLockedEnemy(null);
}
function removeExpiredCombatant(enemy){
  if(lockedEnemy===enemy)setLockedEnemy(null);
  scene.remove(enemy);
  enemyCombatants=enemyCombatants.filter(entry=>entry!==enemy);
  forestEnemies=forestEnemies.filter(entry=>entry!==enemy);
  villaEnemyStates=villaEnemyStates.filter(state=>state.enemy!==enemy);
  arenaWorldEnemyStates=arenaWorldEnemyStates.filter(state=>state.enemy!==enemy);
  enemy.traverse(object=>{
    object.geometry?.dispose?.();
    for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){
      for(const texture of [material.map,material.alphaMap,material.emissiveMap])texture?.dispose?.();
      material.dispose?.();
    }
  });
  window.enemyCombatants=enemyCombatants;
}
function damageEnemy(enemy, damage, direction, stunScale = 1) {
  const data = enemy.userData;
  const ai = data.ai || {};
  if (isInSafePlaza(heroRoot.position) || !data?.isEnemy || data.isTrainingDummy || data.health <= 0) return 0;
  if (data.isPlayer) { sendPlayerAttack(data.playerId); return; }
  if (data.isFriendlyNpc) {
    ai.defending = true;
    ai.alertTimer = Math.max(ai.alertTimer || 0, ENEMY_PERCEPTION.memoryDuration);
    ai.lastKnownPlayerX = heroRoot.position.x;
    ai.lastKnownPlayerZ = heroRoot.position.z;
    if (data.healthBar?.sprite) data.healthBar.sprite.visible = true;
    showToast(data.name + ' se defiende.');
  }
  if (trainingMode && data.ai?.trainingMode) {
    const ai = data.ai;
    if (ai.blocking) {
      const clashPoint = heroGroup.position.clone().add(enemy.position).multiplyScalar(.5);
      clashPoint.y += 1.05;
      emitSwordClash(clashPoint);
      showCombatFeedback('BLOQUEADO · BUSCA UNA APERTURA', true);
      ai.attackCooldown = Math.max(ai.attackCooldown || 0, .8);
      return;
    }
    ai.stunTimer = Math.max(ai.stunTimer || 0, THREE.MathUtils.clamp(damage / 45 * stunScale, .18, .75));
    ai.knockback = { x: direction.x * Math.min(4, 1.8 + damage * .05), z: direction.z * Math.min(4, 1.8 + damage * .05), duration: .22 };
    const wasExposed = ai.exposedTimer > 0;
    ai.exposedTimer = Math.max(ai.exposedTimer || 0, .8);
    data.health = data.maxHealth || 100;
    if (wasExposed) recordTrainingAction('counter');
    refreshLockedEnemyHud();
    return;
  }
  let incomingDamage = damage;
  if (data.speciesId === 'hollow_trunk' && ai.blocking) {
    const facing = new THREE.Vector3(Math.sin(enemy.rotation.y), 0, Math.cos(enemy.rotation.y));
    const incoming = new THREE.Vector3(-direction.x, 0, -direction.z).normalize();
    if (facing.dot(incoming) > .2) {
      incomingDamage *= .18;
      showCombatFeedback('TRONCO HUECO · BLOQUEO FRONTAL', true);
    }
  }
  incomingDamage *= 100 / (100 + Math.max(0, Number(data.defense) || 0));
  const previousHealth = Number(data.health) || 0;
  data.health = Math.max(data.isFriendlyNpc ? 1 : 0, (data.health ?? data.maxHealth ?? 100) - incomingDamage);
  const actualDamage = Math.max(0, previousHealth - data.health);
  data.ai.stunTimer = Math.max(data.ai.stunTimer || 0, THREE.MathUtils.clamp(damage / 45 * stunScale, .12, .72));
  data.ai.knockback = { x: direction.x * Math.min(6, 2.2 + damage * .08), z: direction.z * Math.min(6, 2.2 + damage * .08), duration: .22 };
  if (data.health <= 0) beginEnemyDeath(enemy);
  refreshLockedEnemyHud();
  return actualDamage;
}
function createEnemyHealthBar(enemy) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 32;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sprite.name = 'enemy-health-bar';
  sprite.position.set(0, 2.12, 0);
  sprite.scale.set(1.15, .145, 1);
  sprite.renderOrder = 8;
  enemy.add(sprite);
  return { sprite, canvas, context, texture, lastHealth: -1 };
}
function applySceneStyleAndShadows() {
  scene.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    object.castShadow = false;
    object.receiveShadow = false;
    materials.forEach(surface => {
      if (surface?.isMeshStandardMaterial && surface !== cityMaterials.water) {
        surface.bumpMap = null;
        surface.bumpScale = 0;
        delete surface.onBeforeCompile;
        delete surface.customProgramCacheKey;
        surface.userData.handDrawnStyle = false;
      }
    });
  });
}
function setupOutlinePass() {
  sceneTarget = null;
}
function resizeOutlinePass() {
  return;
}
function initScene() {
  movementVelocity = new THREE.Vector2();
  npcRaycaster = new THREE.Raycaster();
  footstepRaycaster = new THREE.Raycaster();
  cameraCollisionRaycaster = new THREE.Raycaster();
  lockIndicator = new THREE.Mesh(new THREE.RingGeometry(.52, .61, 40), new THREE.MeshBasicMaterial({ color: '#e4bd60', transparent: true, opacity: .86, side: THREE.DoubleSide, depthWrite: false }));
  lockIndicator.rotation.x = -Math.PI / 2;
  lockIndicator.position.y = .075;
  lockIndicator.renderOrder = 2;
  lockIndicator.visible = false;
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#52604a');
  scene.add(lockIndicator);
  scene.fog = new THREE.FogExp2('#bfd9eb', .0015);
  const viewport = getGameViewportSize();
  camera = new THREE.PerspectiveCamera(48, viewport.width / viewport.height, .1, 340);
  baseCameraPosition.set(15, 13, 19);
  cameraTarget.set(0, 1.2, 0);
  camera.position.copy(baseCameraPosition); camera.lookAt(cameraTarget);
  const lowPowerDevice = window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  renderer = new THREE.WebGLRenderer({ antialias: !lowPowerDevice, alpha: false });
  graphicsMaxPixelRatio = Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.2 : 1.5);
  renderer.setPixelRatio(requestedRenderPixelRatio());
  renderer.setSize(viewport.width, viewport.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  world.appendChild(renderer.domElement);
  resizeScene();
  const skyGeometry = new THREE.SphereGeometry(300, 32, 24);
  const skyPositions = skyGeometry.attributes.position;
  const skyColors = [];
  const bottom = new THREE.Color('#d9edfa'), top = new THREE.Color('#5797cc');
  for (let i = 0; i < skyPositions.count; i++) {
    const mix = THREE.MathUtils.smoothstep(skyPositions.getY(i), -5, 70);
    const color = bottom.clone().lerp(top, mix);
    skyColors.push(color.r, color.g, color.b);
  }
  skyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
  skyDome = new THREE.Mesh(skyGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, toneMapped: false }));
  scene.add(skyDome);
  const ambient = new THREE.AmbientLight('#fff7e8', .92); scene.add(ambient);
  const moon = new THREE.DirectionalLight('#e8f2ff', .12); moon.position.set(-18, 28, 12); scene.add(moon);
  const warm = new THREE.PointLight('#fff0d4', .55, 28); warm.position.set(2, 5, 0); scene.add(warm);
  const keyLight = new THREE.DirectionalLight('#fff1d6', 1.05); keyLight.position.set(-42, 32, 38);
  keyLight.castShadow = false; keyLight.shadow.mapSize.set(lowPowerDevice ? 1024 : 1536, lowPowerDevice ? 1024 : 1536);
  keyLight.shadow.camera.left = -105; keyLight.shadow.camera.right = 105;
  keyLight.shadow.camera.top = 105; keyLight.shadow.camera.bottom = -105;
  keyLight.shadow.camera.near = .5; keyLight.shadow.camera.far = 180;
  keyLight.shadow.bias = -.00015; keyLight.shadow.normalBias = .025;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight('#d9ebff', .22); rimLight.position.set(18, 12, -24); scene.add(rimLight);
  buildWalpiraTown();
  buildTownNPCs();
  buildAmbientVillagers();
  buildPlazaSafeMarker();
  buildTrainingYard();
  buildCameraBlockers();
  villaWorldColliders = cityColliders;
  villaWorldWalkSurfaces = walkSurfaces;
  villaFog = scene.fog;
  villaWorldGroup = new THREE.Group();
  villaWorldGroup.name = 'villa-walpira-world';
  const persistentWorldObjects = new Set([lockIndicator, skyDome]);
  for (const object of [...scene.children]) if (!persistentWorldObjects.has(object)) villaWorldGroup.add(object);
  scene.add(villaWorldGroup);
  forestScene = createLamentForest(THREE);
  scene.add(forestScene.group);
  buildForestCampVendors();
  const dustCount = lowPowerDevice ? 110 : 220;
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const data = { x: (Math.random() - .5) * 14, y: Math.random() * 5, z: Math.random() * -19 + 2, speed: .12 + Math.random() * .2, drift: .08 + Math.random() * .15 };
    dustData.push(data); dustPositions.set([data.x, data.y, data.z], i * 3);
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#d4a574', size: .05, transparent: true, opacity: .6, sizeAttenuation: true, depthWrite: false })); scene.add(dust);
  createHero();
  prepareMediaLunaSlashEffects();
  createStoryGuidanceMarker();
  updateTempleVisibility(0, true);
  applySceneStyleAndShadows();
  setupOutlinePass();
  clock = new THREE.Clock();
  animate();
}
const frameUpdateErrorTimes=new Map();
function runFrameUpdate(label,update){
  try{update();}
  catch(error){const now=performance.now(),last=frameUpdateErrorTimes.get(label)||0;if(now-last>3000){frameUpdateErrorTimes.set(label,now);console.error('[Walpira] Falló la actualización de '+label+'.',error);}}
}
function animate() {
  requestAnimationFrame(animate);
  const frameDelta = Math.min(clock.getDelta(), .1);
  let delta = frameDelta;
  if (hitStopTimer > 0) { hitStopTimer = Math.max(0, hitStopTimer - frameDelta); delta = 0; }
  animationDelta = delta;
  const time = clock.elapsedTime;
  updateAmbientVillagers(time);
  if (gameMode && heroGroup) {
    const position = heroGroup.position;
    updateNpcPrompt();
    updateGroundLoot(delta,time);
    updateStoryGuidance(time);
    if (!gameMenuOpen && !manualPaused) {
      runFrameUpdate('combate',()=>updateCombat(delta * 1.14));
      runFrameUpdate('fijación de objetivo',()=>updateLockOn(delta));
      runFrameUpdate('jugador',()=>updatePlayer(delta * 1.08, time));
      runFrameUpdate('transición de mundo',updateWorldTransitions);
      if (currentWorldId === 'forest') {
        if (forestScene.homeRoof) forestScene.homeRoof.visible = Math.hypot(position.x-WALPIRA_HOME_SPAWN.x,position.z-WALPIRA_HOME_SPAWN.z)>WALPIRA_HOME_SAFE_RADIUS;
        runFrameUpdate('misión del campamento', updateStoryCampQuest);
        runFrameUpdate('orbes arcanos', () => updateArcaneProjectiles(delta));
        runFrameUpdate('ambiente del bosque',()=>forestScene.update(delta, time, heroGroup?.position));
        runFrameUpdate('navegación del bosque',()=>updateForestNavigation(delta));
        runFrameUpdate('orbes de experiencia',()=>updateExperienceOrbs(delta, time));
        runFrameUpdate('efectos de combate del bosque',()=>updateForestCombatEffects(delta));
      } else updateVillaNavigation(delta);
      updateJoystickGestureGuide();
      updateThrownWeapon(delta);
      updateBowProjectiles(delta);
      updateAimPreview(delta);
    } else if(openingCinematicActive){
      updateOpeningCinematicCamera(delta);
    }
  } else {
    camera.position.x = baseCameraPosition.x + Math.sin(time * Math.PI / 3) * .05;
    camera.position.y = baseCameraPosition.y + Math.sin(time * Math.PI / 3 + .7) * .03;
    camera.lookAt(cameraTarget);
    torso.position.y = Math.sin(time * Math.PI * 2 / 3) * .012;
    hips.rotation.z = Math.sin(time * Math.PI * 2 / 5) * .012;
    headGroup.rotation.y = Math.sin(time * Math.PI * 2 / 4) * .04;
  }
  updateSwordTrailEffects(delta);
  updateSwordClashEffect(frameDelta);
  updateComboFlash(frameDelta);
  updateMediaLunaDebris(frameDelta);
  updateMediaLunaSlashEffects(frameDelta);
  updateTrainingDummy(frameDelta, time);
  const guarding = Boolean(gameMode && !gameMenuOpen && !manualPaused && (shieldButtonHeld || window.gameKeys?.Shift || window.gameKeys?.Control));
  if (shieldField) shieldField.material.opacity = guarding ? .98 : .9;
  if (shieldRim) shieldRim.material.opacity = guarding ? .94 + Math.sin(time * 13) * .06 : .72;
  if (shieldLight) shieldLight.intensity = guarding ? .65 + Math.sin(time * 13) * .22 : .12;
  if (swordLight) swordLight.intensity = .85 + Math.sin(time * 9) * .25 + (comboState === 'IDLE' ? 0 : 1.1);
  if (bladeSparks) {
    const positions = bladeSparks.geometry.attributes.position;
    bladeSparkData.forEach((spark, index) => {
      spark.age += delta;
      if (spark.age > spark.life || (comboState !== 'IDLE' && Math.random() < .22)) {
        spark.age = 0; spark.life = .12 + Math.random() * .38;
        spark.x = (Math.random() - .5) * .12; spark.y = .12 + Math.random() * .55; spark.z = (Math.random() - .5) * .1;
      }
      const fade = 1 - spark.age / spark.life;
      positions.setXYZ(index, spark.x * fade, spark.y, spark.z * fade);
    });
    positions.needsUpdate = true;
    bladeSparks.visible = gameMode || comboState !== 'IDLE';
  }
  runFrameUpdate('enemigos',()=>updateEnemyCombatants(frameDelta, time));
  updateArenaRound(frameDelta);
  updateInfernalProjectiles(frameDelta);
  if (trainingMode && trainingDebugEnabled) updateTrainingDebug();
  updateRemotePlayers(frameDelta, time);
  if (gameMode) updatePlayerHealthHud();
  if (gameMode && gameSessionMode === 'multiplayer' && multiplayerPlayerId && heroRoot && performance.now() - lastNetworkSend >= 50) {
    lastNetworkSend = performance.now();
    sendMultiplayerMessage({ type: 'state', x: heroRoot.position.x, y: heroRoot.position.y, z: heroRoot.position.z, yaw: heroRoot.rotation.y });
  }
  updateTempleVisibility(frameDelta);
  if (fountainWater) fountainWater.rotation.z = time * .16;
  if (waterWheel && waterWheelBase) waterWheel.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), time * .72).multiply(waterWheelBase);
  if (!gameMode) {
    cape.rotation.z = Math.sin(time * 1.1) * .025;
    cape.rotation.x = Math.sin(time * .9 + 1) * .012;
  }
  if (shockwaveTimer > 0) {
    shockwaveTimer = Math.max(0, shockwaveTimer - delta);
    const progress = 1 - shockwaveTimer / .4;
    shockwaveRing.scale.setScalar(Math.max(.001, progress * 3));
    shockwaveRing.material.opacity = .82 * (1 - progress);
    if (shockwaveTimer === 0) shockwaveRing.visible = false;
  }
  const position = dust.geometry.attributes.position;
  dustData.forEach((item, index) => {
    item.y += item.speed * .008;
    item.x += Math.sin(time * .45 + index) * item.drift * .001;
    if (item.y > 5.2) { item.y = -.15; item.x = (Math.random() - .5) * 14; }
    position.setXYZ(index, item.x, item.y, item.z);
  });
  position.needsUpdate = true;
  if (skyDome) skyDome.position.copy(camera.position);
  runFrameUpdate('renderizado',()=>renderer.render(scene, camera));
  runFrameUpdate('calidad de renderizado',()=>updateAdaptiveRenderQuality(frameDelta));
}
function resizeScene() {
  if (!renderer || !camera) return;
  const { width, height } = getGameViewportSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  resizeOutlinePass();
}
function getGameViewportSize() {
  const rect = world.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width || window.innerWidth)),
    height: Math.max(1, Math.round(rect.height || window.innerHeight))
  };
}
let resizeFrame = 0;
let resizeSettleTimer = 0;
function scheduleSceneResize() {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    resizeScene();
  });
}
function scheduleStableSceneResize() {
  clearTimeout(resizeSettleTimer);
  scheduleSceneResize();
  let attempts = 0;
  const resizeAfterViewportSettles = () => {
    scheduleSceneResize();
    attempts++;
    if (attempts < 6) resizeSettleTimer = window.setTimeout(resizeAfterViewportSettles, 100);
  };
  resizeSettleTimer = window.setTimeout(resizeAfterViewportSettles, 100);
}
window.addEventListener('resize', scheduleSceneResize);
window.addEventListener('orientationchange', scheduleStableSceneResize);
window.visualViewport?.addEventListener('resize', scheduleSceneResize);
document.addEventListener('fullscreenchange', scheduleStableSceneResize);
document.addEventListener('webkitfullscreenchange', scheduleStableSceneResize);
if ('ResizeObserver' in window) new ResizeObserver(scheduleSceneResize).observe(world);
class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.effectsBus = null;
    this.musicBus = null;
    this.gameBus = null;
    this.villaMusicBus = null;
    this.worldAmbienceBus = null;
    this.reverb = null;
    this.activeTheme = null;
    this.initialized = false;
    this.ready = null;
    this.musicVolume = .7;
    this.sfxVolume = .8;
    this.voiceBuffers = {};
    this.lastVoiceAt = 0;
    this.musicTimer = 0;
    this.ambientTimer = 0;
    this.musicStep = 0;
    this.nextMusicTime = 0;
    this.ambientWorld = 'villa';
    this.lastCreatureCallAt = 0;
  }
  async initialize() {
    if (this.initialized) {
      if (this.ready) await this.ready;
      if (this.context && this.context.state === 'suspended') await this.context.resume().catch(() => {});
      return;
    }
    this.initialized = true;
    let finishInitialization;
    this.ready = new Promise(resolve => { finishInitialization = resolve; });
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) { finishInitialization(); return; }
      this.context = new Context();
      const context = this.context;
      this.master = context.createGain();
      this.master.gain.value = .92;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -20;
      limiter.knee.value = 12;
      limiter.ratio.value = 4.5;
      limiter.attack.value = .004;
      limiter.release.value = .16;
      this.master.connect(limiter);
      limiter.connect(context.destination);
      this.effectsBus = context.createGain();
      this.effectsBus.gain.value = this.sfxVolume;
      this.effectsBus.connect(this.master);
      const impulseLength = Math.floor(context.sampleRate * 1.8);
      const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const samples = impulse.getChannelData(channel);
        for (let i = 0; i < impulseLength; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 3.2);
      }
      this.reverb = context.createConvolver();
      this.reverb.buffer = impulse;
      this.reverb.connect(this.master);
      this.musicBus = context.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.reverb);
      const droneOne = context.createOscillator();
      droneOne.type = 'sine'; droneOne.frequency.value = 220; droneOne.detune.value = -4;
      const droneOneGain = context.createGain(); droneOneGain.gain.value = .12;
      droneOne.connect(droneOneGain); droneOneGain.connect(this.musicBus); droneOne.start();
      const droneTwo = context.createOscillator();
      droneTwo.type = 'sine'; droneTwo.frequency.value = 330; droneTwo.detune.value = 4;
      const droneTwoGain = context.createGain(); droneTwoGain.gain.value = .07;
      droneTwo.connect(droneTwoGain); droneTwoGain.connect(this.musicBus); droneTwo.start();
      const lfo = context.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = .055;
      const lfoDepth = context.createGain(); lfoDepth.gain.value = .025;
      lfo.connect(lfoDepth); lfoDepth.connect(droneOneGain.gain); lfoDepth.connect(droneTwoGain.gain); lfo.start();
      this.createMusicTracks();
      this.loadMusicLoop('audio/ambience.wav', .42, this.gameBus);
      this.villaMusicBus = context.createGain();
      this.villaMusicBus.gain.value = 0;
      this.villaMusicBus.connect(this.reverb);
      this.villaMusicBus.connect(this.master);
      this.loadMusicLoop('audio/FONDO - VILLA WALPIRA.flac', 1, this.villaMusicBus);
      this.worldAmbienceBus = context.createGain();
      this.worldAmbienceBus.gain.value = 0;
      this.worldAmbienceBus.connect(this.reverb);
      this.createWorldAmbience();
      this.loadVoice('effort', 'audio/esfuerzo.wav');
      this.loadVoice('impact', 'audio/hero-hit.wav');
      this.loadVoice('slash', 'audio/simple-slash-attack.wav');
      this.loadVoice('knifeThrow', 'audio/knife-attack-slash.wav');
      this.loadVoice('jump', 'audio/salto.wav');
      await context.resume().catch(() => {});
      this.activeTheme = document.getElementById('screen-gameplay')?.classList.contains('active') ? 'gameplay' : 'menu';
      const now = context.currentTime;
      const activeBus = this.activeTheme === 'gameplay' ? this.gameBus : this.musicBus;
      activeBus.gain.setValueAtTime(0, now);
      activeBus.gain.linearRampToValueAtTime(.44 * this.musicVolume, now + 1.5);
      this.switchWorldAmbience(currentWorldId);
      this.startMusicSequencer();
      this.startAmbientSequencer();
      finishInitialization();
    } catch (error) {
      this.context = null;
      this.master = null;
      this.effectsBus = null;
      this.musicBus = null;
      this.reverb = null;
      finishInitialization();
    }
  }
  createMusicTracks() {
    const context = this.context;
    this.gameBus = context.createGain();
    this.gameBus.gain.value = 0;
    this.gameBus.connect(this.reverb);
    const addTone = (frequency, type, volume, bus, detune = 0) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency; oscillator.detune.value = detune;
      gain.gain.value = volume;
      oscillator.connect(gain); gain.connect(bus); oscillator.start();
      return gain;
    };
    addTone(165, 'sine', .12, this.gameBus, -2);
    addTone(220, 'triangle', .09, this.gameBus, 2);
    const bassGain = addTone(82.5, 'sine', .035, this.gameBus);
    const bassLfo = context.createOscillator(); bassLfo.type = 'sine'; bassLfo.frequency.value = .25;
    const bassDepth = context.createGain(); bassDepth.gain.value = .025;
    bassLfo.connect(bassDepth); bassDepth.connect(bassGain.gain); bassLfo.start();
  }
  startMusicSequencer() {
    if(this.musicTimer||!this.context)return;
    this.nextMusicTime=this.context.currentTime+.12;
    this.musicTimer=window.setInterval(()=>{
      if(!this.context||this.context.state!=='running'||this.musicVolume<=0)return;
      const now=this.context.currentTime,bus=this.activeTheme==='gameplay'?this.gameBus:this.musicBus;
      while(this.nextMusicTime<now+.12){
        const forest=this.ambientWorld==='forest';
        const notes=forest?[146.83,174.61,220,261.63,293.66,261.63,220,174.61]:[196,220,261.63,293.66,392,329.63,293.66,261.63];
        const step=this.musicStep%notes.length,at=this.nextMusicTime;
        if(step!==6)this.scheduleMusicTone(notes[step],forest?'sine':'triangle',forest?.024:.033,.46,at,bus);
        if(step%4===0)this.scheduleMusicTone(notes[step]/2,'sine',.018,1.55,at,bus);
        if(step%4===2)this.scheduleMusicTone(notes[(step+2)%notes.length]*.75,'triangle',.012,.85,at,bus);
        if(step%4===0)this.scheduleMusicTone(notes[(step+3)%notes.length]*2,'sine',forest?.007:.011,1.1,at,bus);
        if(forest&&step%4===0)this.scheduleForestDrum(72,.045,at,bus);
        if(forest&&step%4===2)this.scheduleForestDrum(118,.018,at,bus);
        this.musicStep++;this.nextMusicTime+=.48;
      }
    },70);
  }
  scheduleMusicTone(frequency,wave,volume,duration,start,bus) {
    if(!bus)return;
    const oscillator=this.context.createOscillator(),gain=this.context.createGain();
    oscillator.type=wave;oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.045);gain.gain.setTargetAtTime(.0001,start+.13,duration*.28);
    oscillator.connect(gain);gain.connect(bus);oscillator.start(start);oscillator.stop(start+duration);
  }
  scheduleForestDrum(frequency,volume,start,bus){
    const oscillator=this.context.createOscillator(),gain=this.context.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(frequency*.52,start+.13);
    gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+.24);
    oscillator.connect(gain);gain.connect(bus);oscillator.start(start);oscillator.stop(start+.26);
  }
  createWorldAmbience() {
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    source.buffer=this.createNoiseBuffer(4);source.loop=true;filter.type='lowpass';filter.frequency.value=760;filter.Q.value=.4;gain.gain.value=.06;
    source.connect(filter);filter.connect(gain);gain.connect(this.worldAmbienceBus);source.start();
  }
  startAmbientSequencer() {
    if(this.ambientTimer)return;
    this.ambientTimer=window.setInterval(()=>{
      if(!this.context||this.context.state!=='running'||this.activeTheme!=='gameplay')return;
      if(this.ambientWorld==='villa'){
        if(Math.random()<.52)this.playTownMurmur(.42);
        if(Math.random()<.38)this.playVillageBird();
        if(Math.random()<.07)this.playRuralBell();
      }else if(this.ambientWorld==='forest'&&Math.random()<.62)this.playForestBird();
    },5800);
  }
  playTownMurmur(volume=.24) {
    if(!this.context||!this.effectsBus)return;
    const now=this.context.currentTime,source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain(),pan=this.context.createStereoPanner();
    source.buffer=this.createNoiseBuffer(.72);filter.type='bandpass';filter.frequency.value=430+Math.random()*260;filter.Q.value=.65;pan.pan.value=(Math.random()-.5)*1.5;
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(volume*.12,now+.11);gain.gain.setTargetAtTime(.0001,now+.28,.12);
    source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.effectsBus);source.start(now);source.stop(now+.75);
  }
  playVillageBird() {
    if(!this.context||!this.effectsBus)return;
    const now=this.context.currentTime,oscillator=this.context.createOscillator(),gain=this.context.createGain(),pan=this.context.createStereoPanner();
    const start=1120+Math.random()*360;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(start,now);oscillator.frequency.exponentialRampToValueAtTime(start*1.32,now+.09);oscillator.frequency.exponentialRampToValueAtTime(start*.88,now+.24);
    pan.pan.value=(Math.random()-.5)*1.6;gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.025,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.27);
    oscillator.connect(gain);gain.connect(pan);pan.connect(this.effectsBus);oscillator.start(now);oscillator.stop(now+.29);
  }
  playRuralBell() {
    if(!this.context||!this.effectsBus)return;
    this.playTone(587.33,.7,'sine',.026);
    this.playTone(880,.54,'triangle',.012,.015);
  }
  playForestBird() {
    if(!this.context||!this.effectsBus)return;
    const now=this.context.currentTime,oscillator=this.context.createOscillator(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(1450+Math.random()*550,now);oscillator.frequency.exponentialRampToValueAtTime(2100+Math.random()*700,now+.12);oscillator.frequency.exponentialRampToValueAtTime(1250,now+.3);
    filter.type='lowpass';filter.frequency.value=2600;gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.022,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.31);
    oscillator.connect(filter);filter.connect(gain);gain.connect(this.effectsBus);oscillator.start(now);oscillator.stop(now+.32);
  }
  playCreatureCall(speciesId) {
    if(!this.context||!this.effectsBus)return;
    const now=this.context.currentTime;if(now-this.lastCreatureCallAt<.7)return;this.lastCreatureCallAt=now;
    const base=speciesId==='hollow_trunk'?92:speciesId==='thorn_spitter'?310:185;
    const oscillator=this.context.createOscillator(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    oscillator.type=speciesId==='lichen_goblin'?'sawtooth':'triangle';oscillator.frequency.setValueAtTime(base,now);oscillator.frequency.exponentialRampToValueAtTime(base*.62,now+.34);
    filter.type='lowpass';filter.frequency.value=speciesId==='hollow_trunk'?360:speciesId==='thorn_spitter'?1050:680;
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.038,now+.045);gain.gain.exponentialRampToValueAtTime(.0001,now+.36);
    oscillator.connect(filter);filter.connect(gain);gain.connect(this.effectsBus);oscillator.start(now);oscillator.stop(now+.38);
  }
  playNpcMurmur(){this.playTownMurmur(.8);}
  async loadMusicLoop(path, volume, outputBus = this.gameBus) {
    try {
      const response = await fetch(path);
      if (!response.ok || !this.context || !outputBus) return;
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer; source.loop = true;
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + 1.2);
      source.connect(gain); gain.connect(outputBus); source.start();
    } catch (error) {}
  }
  async loadVoice(name, path) {
    try {
      const response = await fetch(path);
      if (response.ok && this.context) this.voiceBuffers[name] = await this.context.decodeAudioData(await response.arrayBuffer());
    } catch (error) {}
  }
  playLoadedSfx(name, volume = .3, playbackRate = 1) {
    if (!this.context || !this.effectsBus) return;
    const buffer = this.voiceBuffers[name];
    if (!buffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    gain.gain.value = volume;
    source.connect(gain); gain.connect(this.effectsBus); source.start();
  }
  playHeroVoice(kind = 'effort') {
    if (!this.context || !this.effectsBus) return;
    const now = this.context.currentTime;
    if (now - this.lastVoiceAt < .34) return;
    const buffer = this.voiceBuffers[kind] || this.voiceBuffers.effort;
    if (!buffer) return;
    this.lastVoiceAt = now;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer; source.playbackRate.value = .92 + Math.random() * .16;
    gain.gain.value = kind === 'impact' ? .32 : .28;
    source.connect(gain); gain.connect(this.effectsBus); source.start();
  }
  switchTheme(theme) {
    if (!this.context || !this.musicBus || !this.gameBus || theme === this.activeTheme) return;
    const now = this.context.currentTime;
    const oldBus = this.activeTheme === 'gameplay' ? this.gameBus : this.musicBus;
    const newBus = theme === 'gameplay' ? this.gameBus : this.musicBus;
    [oldBus.gain, newBus.gain].forEach(param => param.cancelScheduledValues(now));
    oldBus.gain.setValueAtTime(oldBus.gain.value, now);
    newBus.gain.setValueAtTime(newBus.gain.value, now);
    oldBus.gain.linearRampToValueAtTime(0, now + 1.5);
    newBus.gain.linearRampToValueAtTime(.44 * this.musicVolume, now + 1.5);
    this.activeTheme = theme;
    this.switchWorldAmbience(currentWorldId);
  }
  switchWorldAmbience(worldId) {
    if (!this.context || !this.worldAmbienceBus || !this.villaMusicBus) return;
    this.ambientWorld=worldId;
    const shouldPlay = this.activeTheme === 'gameplay' && (worldId === 'villa' || worldId === 'forest');
    const now = this.context.currentTime;
    const gain = this.worldAmbienceBus.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.setTargetAtTime(shouldPlay ? .24 * this.musicVolume : 0, now, .55);
    const villaGain = this.villaMusicBus.gain;
    villaGain.cancelScheduledValues(now);
    villaGain.setValueAtTime(villaGain.value, now);
    villaGain.setTargetAtTime(this.activeTheme === 'gameplay' && worldId === 'villa' ? .85 * this.musicVolume : 0, now, .8);
    const gameGain = this.gameBus.gain;
    gameGain.cancelScheduledValues(now);
    gameGain.setValueAtTime(gameGain.value, now);
    gameGain.setTargetAtTime(this.activeTheme === 'gameplay' && worldId !== 'villa' ? .44 * this.musicVolume : 0, now, .8);
  }
  createNoiseBuffer(seconds) {
    if (!this.context) return null;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  playTone(frequency, duration, type = 'sine', volume = .12, delay = 0) {
    if (!this.context || !this.master) return;
    try {
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain); gain.connect(this.effectsBus || this.master);
      oscillator.start(now); oscillator.stop(now + duration + .02);
    } catch (error) {}
  }
  playClick() { this.playTone(210, .045, 'triangle', .032); this.playTone(145, .035, 'sine', .012, .012); }
  playFootstep(surface = 'grass') {
    if (!this.context || !this.master) return;
    const profiles = {
      grass: { low: 105, high: 360, tone: 68, volume: .085, toneVolume: .022, wave: 'sine' },
      water: { low: 75, high: 310, tone: 54, volume: .14, toneVolume: .032, wave: 'sine' },
      asphalt: { low: 220, high: 760, tone: 84, volume: .095, toneVolume: .024, wave: 'triangle' },
      stone: { low: 300, high: 1050, tone: 112, volume: .09, toneVolume: .026, wave: 'triangle' },
      wood: { low: 150, high: 600, tone: 78, volume: .10, toneVolume: .03, wave: 'sine' },
      dirt: { low: 120, high: 440, tone: 61, volume: .08, toneVolume: .02, wave: 'sine' }
    };
    const profile = profiles[surface] || profiles.grass;
    const now = this.context.currentTime;
    try {
      const source = this.context.createBufferSource();
      source.buffer = this.createNoiseBuffer(.11);
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(Math.sqrt(profile.low * profile.high), now);
      filter.Q.value = profile.low / (profile.high - profile.low);
      const noiseGain = this.context.createGain();
      noiseGain.gain.setValueAtTime(profile.volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(.0001, now + .09);
      source.connect(filter); filter.connect(noiseGain); noiseGain.connect(this.effectsBus || this.master);
      source.start(now); source.stop(now + .12);
      const oscillator = this.context.createOscillator();
      const toneGain = this.context.createGain();
      oscillator.type = profile.wave;
      oscillator.frequency.setValueAtTime(profile.tone * (.94 + Math.random() * .12), now);
      oscillator.frequency.exponentialRampToValueAtTime(profile.tone * .58, now + .075);
      toneGain.gain.setValueAtTime(profile.toneVolume, now);
      toneGain.gain.exponentialRampToValueAtTime(.0001, now + .085);
      oscillator.connect(toneGain); toneGain.connect(this.effectsBus || this.master);
      oscillator.start(now); oscillator.stop(now + .09);
      if (surface === 'water') {
        const splash = this.context.createBufferSource();
        const splashFilter = this.context.createBiquadFilter();
        const splashGain = this.context.createGain();
        splash.buffer = this.createNoiseBuffer(.12);
        splashFilter.type = 'bandpass';
        splashFilter.frequency.setValueAtTime(1250, now);
        splashFilter.frequency.exponentialRampToValueAtTime(480, now + .11);
        splashFilter.Q.value = .65;
        splashGain.gain.setValueAtTime(.0001, now);
        splashGain.gain.linearRampToValueAtTime(.16, now + .014);
        splashGain.gain.exponentialRampToValueAtTime(.0001, now + .11);
        splash.connect(splashFilter); splashFilter.connect(splashGain); splashGain.connect(this.effectsBus || this.master);
        splash.start(now); splash.stop(now + .13);
      }
    } catch (error) {}
  }
  playSwordSwing(pitch = 1) {
    if (!this.context || !this.master) return;
    this.playTone(90 * pitch, .13, 'triangle', .095);
    try {
      const source = this.context.createBufferSource();
      source.buffer = this.createNoiseBuffer(.18);
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400 * pitch, this.context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000 * pitch, this.context.currentTime + .15);
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(.0001, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(.24, this.context.currentTime + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, this.context.currentTime + .16);
      source.connect(filter); filter.connect(gain); gain.connect(this.effectsBus || this.master);
      source.start(); source.stop(this.context.currentTime + .18);
    } catch (error) {}
  }
  playBowShot() {
    if (!this.context || !this.effectsBus) return;
    const now = this.context.currentTime;
    this.playTone(660, .045, 'triangle', .045);
    this.playTone(245, .09, 'sine', .035, .025);
    try {
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = this.createNoiseBuffer(.12);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + .1);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(.11, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .11);
      source.connect(filter); filter.connect(gain); gain.connect(this.effectsBus);
      source.start(now); source.stop(now + .12);
    } catch (error) {}
  }
  playArrowImpact() {
    if (!this.context || !this.effectsBus) return;
    this.playTone(310, .07, 'triangle', .065);
    this.playTone(145, .11, 'sine', .035, .015);
  }
  playDash() {
    if (!this.context || !this.effectsBus) return;
    const now = this.context.currentTime;
    this.playTone(155, .2, 'triangle', .08);
    try {
      const source = this.context.createBufferSource();
      source.buffer = this.createNoiseBuffer(.28);
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.frequency.exponentialRampToValueAtTime(360, now + .26);
      filter.Q.value = .8;
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(.2, now + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .27);
      source.connect(filter); filter.connect(gain); gain.connect(this.effectsBus);
      source.start(now); source.stop(now + .28);
    } catch (error) {}
  }
  playSwordImpact(power = 1) {
    if (!this.context || !this.master) return;
    this.playTone(72 * power, .11, 'triangle', .18);
    this.playTone(220 * power, .055, 'sine', .055);
    try {
      const now = this.context.currentTime;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = this.createNoiseBuffer(.075);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(850, now); filter.frequency.exponentialRampToValueAtTime(180, now + .07);
      gain.gain.setValueAtTime(.13, now); gain.gain.exponentialRampToValueAtTime(.0001, now + .075);
      source.connect(filter); filter.connect(gain); gain.connect(this.effectsBus || this.master);
      source.start(now); source.stop(now + .08);
    } catch (error) {}
  }
  playForestImpact(power = 1) {
    if (!this.context || !this.effectsBus) return;
    const now = this.context.currentTime;
    const strength = THREE.MathUtils.clamp(power, .5, 1.8);
    this.playTone(52 / strength, .28, 'sine', .2);
    try {
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = this.createNoiseBuffer(.24);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680 * strength, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + .22);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(.22 * strength, now + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .23);
      source.connect(filter); filter.connect(gain); gain.connect(this.effectsBus);
      source.start(now); source.stop(now + .25);
    } catch (error) {}
  }
  playCombo() {
    this.playTone(392, .12, 'triangle', .12);
    this.playTone(587, .16, 'sine', .14, .07);
    this.playTone(784, .24, 'sine', .13, .16);
    this.playTone(1046, .22, 'triangle', .08, .24);
  }
  playTutorialChime() {
    this.playTone(660, .2, 'sine', .11, 0);
    this.playTone(880, .2, 'sine', .09, .2);
  }
  playVictory() {
    [523, 659, 784].forEach((frequency, index) => this.playTone(frequency, .15, 'sine', .12, index * .16));
  }
}

function tutorialWasCompleted() {
  try { return localStorage.getItem('walpira_tutorial_done_v4') === 'true'; }
  catch (error) { return false; }
}
function beginTutorial() {
  if (trainingMode) { tutorialActive = false; return; }
  if (rpgState?.story?.tutorialChoice) { tutorialActive = false; return; }
  if (tutorialWasCompleted()) { tutorialActive = false; return; }
  tutorialActive = true;
  tutorialStep = 0;
  tutorialOrigin = heroGroup.position.clone();
  tutorialDistance = 0;
  tutorialComboDone = false;
  tutorialWeaponWasThrown = false;
  showTutorialStep(0);
}
function showTutorialStep(index) {
  if (!tutorialActive) return;
  tutorialStep = index;
  const box = document.getElementById('tutorial-box');
  const joystick = document.getElementById('joystick-base');
  const action = document.getElementById('action-button');
  const moonSlash = document.querySelector('#skill-dock .quick-skill-slot[data-skill-id="moon_slash"]');
  const shield = document.getElementById('shield-button');
  const weapon = document.getElementById('weapon-button');
  joystick.classList.toggle('tutorial-glow', index === 0 || index === 2);
  action.classList.toggle('tutorial-glow', index === 1);
  moonSlash?.classList.toggle('tutorial-glow', index === 2);
  shield.classList.toggle('tutorial-glow', index === 3);
  weapon.classList.toggle('tutorial-glow', index === 4);
  box.classList.remove('gesture-step');
  box.classList.remove('visible');
  box.setAttribute('aria-hidden', 'false');
  const steps = [
    ['▶', 'Usa el joystick para moverte por Walpira.'],
    ['⚔', 'Combo normal: pulsa A tres veces seguidas para encadenar los golpes.'],
    ['☾', 'Pulsa MEDIA LUNA para ejecutar el corte ascendente contra el objetivo cercano.'],
    ['◈', 'Mantén ESCUDO o Shift/Control para cubrirte de frente. Pulsa justo antes del golpe para desviarlo y aturdir al rival.'],
    ['➤', 'Pulsa LANZAR o R para arrojar tu espada. Ve hasta donde cayó y pulsa RECOGER o R para volver a equiparla.'],
    ['◎', 'Pulsa Q para fijar el objetivo más cercano o toca dos veces a un actor. El panel muestra nombre, tipo y vida disponible.'],
    ['★', '¡Listo! Buena suerte, ' + (getSelectedProfile()?.name || 'viajero') + '!']
  ];
  const step = steps[index];
  if (!step) return;
  const icon = document.getElementById('tutorial-icon');
  const text = document.getElementById('tutorial-text');
  icon.textContent = step[0]; text.textContent = step[1];
  window.setTimeout(() => {
    if (!tutorialActive || tutorialStep !== index) return;
    box.classList.add('visible');
    if (index === 6) {
      audioManager.playVictory();
      window.setTimeout(finishTutorial, 3000);
    } else {
      audioManager.playTutorialChime();
    }
  }, 110);
}
function dismissTutorial() {
  if (!tutorialActive) return;
  tutorialActive = false;
  document.getElementById('joystick-base').classList.remove('tutorial-glow');
  document.getElementById('action-button').classList.remove('tutorial-glow');
  document.querySelector('#skill-dock .quick-skill-slot[data-skill-id="moon_slash"]')?.classList.remove('tutorial-glow');
  document.getElementById('jump-button').classList.remove('tutorial-glow');
  document.getElementById('shield-button').classList.remove('tutorial-glow');
  document.getElementById('weapon-button').classList.remove('tutorial-glow');
  document.getElementById('tutorial-box').classList.remove('visible');
  document.getElementById('tutorial-box').setAttribute('aria-hidden', 'true');
  try { localStorage.setItem('walpira_tutorial_done_v4', 'true'); } catch (error) {}
}
function finishTutorial() { if (!tutorialActive || tutorialStep !== 6) return; dismissTutorial(); }
document.getElementById('tutorial-dismiss').addEventListener('click', dismissTutorial);
function getSelectedProfile() { return profiles.find(profile => profile.id === selectedProfileId) || null; }

const RPG_ITEMS = {
  iron_sword: { name: 'Espada de hierro', kind: 'Arma principal', slot: 'weapon', icon: '⚔', level: 1, weight: 4, bonus: 'Ataque +5 · Fuerza +1', appearance:{color:'#b8c4c6',accent:'#c99c58',model:'sword'} },
  oak_shield: { name: 'Escudo de roble', kind: 'Secundaria', slot: 'offhand', icon: '◈', level: 1, weight: 5, bonus: 'Defensa +4 · Bloqueo +3%', appearance:{color:'#5b704e',accent:'#d0ae67',model:'oak-shield'} },
  leather_helm: { name: 'Yelmo de viajero', kind: 'Cabeza', slot: 'head', icon: '⌑', level: 1, weight: 2, bonus: 'Defensa +2', appearance:{color:'#69766e',accent:'#b99155',model:'traveler-helm'} },
  linen_tunic: { name: 'Túnica reforzada', kind: 'Pecho', slot: 'chest', icon: '♜', level: 1, weight: 3, bonus: 'Defensa +3', appearance:{color:'#637c67',accent:'#d2c18c',model:'linen-tunic'} },
  copper_ring: { name: 'Anillo de cobre', kind: 'Anillo', slot: 'ring1', icon: '◎', level: 1, weight: .2, bonus: 'Crítico +1%' },
  red_potion: { name: 'Poción menor', kind: 'Consumible', icon: '⚗', level: 1, weight: .5, bonus: 'Restaura 30 HP' },
  green_herb: { name: 'Hierba lunar', kind: 'Material', icon: '❧', level: 1, weight: .2, bonus: 'Ingrediente alquímico' },
  blue_charm: { name: 'Amuleto de bruma', kind: 'Amuleto', slot: 'amulet', icon: '✧', level: 2, weight: .3, bonus: 'Maná máximo +8' }
};
const ITEM_ICONS = { weapons:'⚔', armor:'⛨', jewelry:'✧', consumables:'⚗', materials:'◆' };
ITEM_CATALOG.forEach(item => { RPG_ITEMS[item.id] = { ...item, icon:ITEM_ICONS[item.category], bonus:item.bonus || '', kind:item.kind }; });
Object.values(RPG_ITEMS).forEach(item => { item.rarity ||= 'Común'; item.requirement ||= {level:item.level||1,str:0}; item.damageMin ||= 0; item.damageMax ||= 0; item.defense ||= 0; item.block ||= 0; item.attackSpeed ||= ''; item.critical ||= 0; item.gp ??= 25; item.weight ??= .2; item.compose ??= 0; item.crystals ||= []; item.enchants ||= []; });
const EQUIPMENT_SLOTS = [['head','Cabeza'],['chest','Pecho'],['shoulders','Hombreras'],['cape','Capa'],['gloves','Guantes'],['legs','Piernas'],['boots','Botas'],['weapon','Arma principal'],['offhand','Secundaria'],['ring1','Anillo I'],['ring2','Anillo II'],['amulet','Amuleto'],['belt','Cinturón']];
const ATTRIBUTE_INFO = { str:['STR','Fuerza','Ataque físico y peso máximo'], agi:['AGI','Agilidad','Velocidad de ataques, combos, crítico y bloqueo'], con:['CON','Constitución','Vida y defensa'], int:['INT','Inteligencia','Maná y regeneración'] };
const QUICK_SKILL_SLOT_COUNT = 4;
const SKILL_INFO = [
  {id:'sword',name:'Maestría en Espada',type:'passive',icon:'⚔',level:1,text:'Aumenta el ataque con espada.'},
  {id:'shield',name:'Maestro en Defensa',type:'passive',icon:'◈',level:1,text:'Aumenta la defensa con escudo.'},
  {id:'heroic',name:'Fuerza Heroica',type:'passive',icon:'✦',level:1,text:'Aumenta el peso máximo.'},
  {id:'moon_slash',name:'Media Luna',type:'active',icon:'☾',level:1,text:'Un corte ascendente veloz; se activa desde una casilla rápida.'},
  {id:'hurricane',name:'Giro de Espada',type:'active',icon:'⟳',level:1,text:'Un giro amplio que golpea alrededor.'},
  {id:'dragon_rise',name:'Ascenso del Dragón',type:'active',icon:'⤊',level:1,text:'Eleva y somete al rival; remátalo manteniendo ataque y abajo.'},
  {id:'dash',name:'Embestida',type:'active',icon:'➤',level:1,text:'Impulso evasivo para abrir distancia.'},
  {id:'charge',name:'Corte Cargado',type:'active',icon:'✧',level:3,text:'Concentra fuerza en un golpe pesado.'}
];
const WALPIRA_STORY_QUESTS = [
  { id:'c1_glemier', chapter:1, title:'La voz entre mareas', npc:'glemier', type:'talk', objective:'Habla con Glemier y registra lo que se sabe de la señal.', location:'villa', xp:20, gold:15 },
  { id:'c1_weapon', chapter:1, title:'Peso para la travesía', npc:'dohan', type:'equipWeapon', objective:'Compra y equipa un arma reparable para la expedición.', location:'villa', xp:35, gold:20, acceptGold:1500 },
  { id:'c1_forest', chapter:1, title:'La senda de la sal', type:'forestKills', count:3, objective:'Derrota 3 criaturas que bloquean la ruta del bosque.', location:'forest', xp:55, gold:65, itemReward:'piedra_de_condena' },
  { id:'c1_brujo_rescue', chapter:1, title:'El cautivo de la savia', type:'brujoRescue', objective:'Acércate al campamento del Pacto de la Savia y encuentra al cautivo.', location:'forest', xp:30, gold:0 },
  { id:'c1_brujo_trial', chapter:1, title:'Una chispa en la oscuridad', type:'brujoTrial', objective:'Como Brujo, acierta un Orbe Arcano contra una criatura del bosque.', location:'forest', xp:35, gold:0 },
  { id:'c1_forge', chapter:1, title:'Hierro contra la intemperie', npc:'barric', type:'forge', objective:'Refuerza un arma para que resista la humedad y el viaje.', location:'villa', xp:45, gold:30 },
  { id:'c1_report', chapter:1, title:'Lo que la señal no dice', npc:'glemier', type:'talk', objective:'Vuelve con Glemier y separa los hechos de tus sospechas.', location:'villa', xp:70, gold:40 },
  { id:'c2_mikel', chapter:2, title:'Muestras, no respuestas', npc:'mikel', type:'talk', objective:'Consulta a Mikel sobre qué puede concluirse de los rastros.', location:'villa', xp:25, gold:20 },
  { id:'c2_crystals', chapter:2, title:'Dos marcas de la marea', type:'forestMaterials', itemId:'cristal_de_escarcha', count:2, objective:'Recoge 2 muestras para compararlas con los registros de Walpira.', location:'forest', xp:60, gold:25 },
  { id:'c2_forest', chapter:2, title:'Abrir el paso', type:'forestKills', count:4, objective:'Derrota 4 criaturas y despeja la ruta hacia la costa.', location:'forest', xp:85, gold:40 },
  { id:'c2_report', chapter:2, title:'El primer rumbo', npc:'glemier', type:'talk', objective:'Informa a Glemier: la señal llega desde el Exterior.', location:'villa', xp:120, gold:75 }
];
const WALPIRA_CHAPTERS = {
  1: { title:'La señal que se apagó', copy:['Kaelen despierta junto a su madre en la choza familiar. La Piedra del Alma descansa sobre su pecho; no lleva armas ni armadura.','Durante la noche, el puesto de escucha recibió tres pulsos y una voz que no llegó a formar una frase. Nadie sabe quién transmitió ni qué ocurrió al otro lado.','Su madre le pide que escuche primero a Maela y a Glemier. Kaelen se ajusta la ropa de viaje y decide averiguar qué puede confirmar la señal.'], nairu:'Wai na sena mi.', nairuTranslation:'La señal llega con la marea.' },
  2: { title:'Muestras, no respuestas', copy:['Los rastros del bosque merecen estudiarse, pero no demuestran el origen de la Quietud. Mikel distingue lo observado de lo que todavía es una hipótesis.','Los registros confirman que la señal viene del Exterior. No dicen quién la envió ni si queda alguien con vida; la expedición costera empieza con esa pregunta.'] }
};
const WALPIRA_MISSION_GUIDES = {
  c1_glemier:{summary:'Iré con Glemier para registrar los fragmentos de la señal sin inventar el resto.',destination:'Residencia de Glemier · Villa Walpira',people:'Glemier',steps:['Me acerco a Glemier en la villa.','Escucho qué se recibió y qué datos todavía faltan.'],hint:'Si no aparece el encargo, vuelvo a hablar con Glemier.'},
  c1_weapon:{summary:'Prepararé una carga reparable para la expedición y equiparé el arma que compre.',destination:'Puesto de armas · Villa Walpira',people:'Dohan',steps:['Hablo con Dohan y acepto el adelanto de 1500 GP.','Compro una espada, hacha o daga disponible.','Abro la mochila y equipo exactamente el arma que compré.'],hint:'El arma inicial no cuenta: debo comprarla a Dohan y equipar el mismo artículo.'},
  c1_forest:{summary:'Abriré la ruta del bosque y registraré el terreno sin confundir criaturas con víctimas.',destination:'Bosque de los Lamentos · al norte de la villa',people:'Criaturas del bosque',steps:['Salgo de Villa Walpira por la Puerta Norte.','Derroto tres criaturas forestales que bloquean el camino.'],hint:'Sigo la flecha del minimapa hasta la salida o una criatura viva; solo cuento enemigos del bosque.'},
  c1_brujo_rescue:{summary:'Seguiré las voces hasta el campamento del Pacto y encontraré a la persona atada junto a la choza del joven guardián.',destination:'Campamento del Pacto de la Savia',people:'Pacto de la Savia',steps:['Me acerco al campamento tras despejar el primer tramo del bosque.','Observo cómo un miembro del Pacto reconoce la Piedra del Alma que guarda el joven en su choza.'],hint:'La flecha de misión señala el campamento en el extremo oriental del bosque; la choza del guardián está en el centro del asentamiento.'},
  c1_brujo_trial:{summary:'Por un momento viviré la fuga desde la perspectiva del cautivo y probaré su magia.',destination:'Campamento del Pacto de la Savia',people:'El Brujo',steps:['Continúo como el Brujo después de que lo sueltan.','Acierto un Orbe Arcano contra una criatura para abrir una salida.','Al terminar este tramo obligatorio, regreso al protagonista original.'],hint:'Apunto a una criatura cercana y uso Orbe Arcano desde las casillas de habilidad.'},
  c1_forge:{summary:'Reforzaré mi arma para que resista la humedad y el viaje.',destination:'Fragua · Villa Walpira',people:'Barric',steps:['Me acerco a Barric y abro la forja.','Coloco un arma en la ranura de trabajo.','Barric usa la Piedra del Alma como catalizador narrativo sin consumirla.','Confirmo el refuerzo +1 y pago 80 GP con una Piedra de Condena.'],hint:'La Piedra del Alma permanece en mi mochila; para el refuerzo se consume la Piedra de Condena.'},
  c1_report:{summary:'Volveré con Glemier y distinguiré lo que observé de lo que todavía no sé.',destination:'Residencia de Glemier · Villa Walpira',people:'Glemier',steps:['Vuelvo por la Puerta Norte.','Informo a Glemier sin presentar sospechas como hechos.'],hint:'Uso la salida sur del bosque y sigo el indicador de misión hasta Glemier.'},
  c2_mikel:{summary:'Preguntaré a Mikel qué se puede concluir de los rastros y qué sigue siendo hipótesis.',destination:'Puesto de alquimia · Villa Walpira',people:'Mikel',steps:['Hablo con Mikel en la villa.','Acepto comparar las muestras con los registros de Walpira.'],hint:'Busco el puesto de alquimia de Mikel entre los lugares marcados de la villa.'},
  c2_crystals:{summary:'Recogeré dos muestras para compararlas con los registros de Walpira.',destination:'Bosque de los Lamentos · campamento del Pacto de la Savia',people:'Escupidora de Espinas',steps:['Cruzo la Puerta Norte y busco una Escupidora viva.','La derroto mientras el encargo está activo.','Recojo la muestra y repito hasta reunir dos.'],hint:'El contador avanza al recoger el cristal; aunque la mochila esté llena, la pila permanece.'},
  c2_forest:{summary:'Abriré el paso hacia la costa despejando la ruta de criaturas territoriales.',destination:'Bosque de los Lamentos · arboleda',people:'Criaturas del bosque',steps:['Entro en el bosque y localizo criaturas vivas.','Derroto cuatro enemigos forestales adicionales.'],hint:'Cuento solo criaturas forestales, no rivales de entrenamiento ni enemigos de otra zona.'},
  c2_report:{summary:'Volveré con Glemier para registrar que la señal viene del Exterior.',destination:'Residencia de Glemier · Villa Walpira',people:'Glemier',steps:['Regreso a Villa Walpira.','Entrego a Glemier lo que las muestras y los registros sí confirman.','Dejo sin resolver el origen de la Quietud y la identidad de quien transmitió.'],hint:'Al aceptar mi informe final, queda registrada la primera ruta de expedición.'}
};
function createStoryState(tutorialChoice = null) { return { chapter:1, questId:WALPIRA_STORY_QUESTS[0].id, completed:[], progress:{}, accepted:{}, paidRewards:[], tutorialChoice, prologuePending:false, presentedChapters:[], journal:[] }; }
function resolveRpgItem(id) {
  if (typeof id !== 'string' || !id) return null;
  if(RPG_ITEMS[id])return RPG_ITEMS[id];
  const runeMarker=id.lastIndexOf('_rune_');
  if(runeMarker>=0){
    const base=resolveRpgItem(id.slice(0,runeMarker)),elements=id.slice(runeMarker+6).split('_'),recipe=ELEMENTAL_RECIPES[elements.sort().join('+')];
    if(!base||!recipe)return null;
    const item={...base,id,element:recipe.element,elementName:recipe.name,elementalDamage:base.category==='weapons'?recipe.damage:0,elementalDefense:base.category==='armor'?4:0,enchants:[...(base.enchants||[]),recipe.name],crystals:[...(base.crystals||[]),...elements.map(element=>Object.keys(GEM_ELEMENT_BY_ID).find(gem=>GEM_ELEMENT_BY_ID[gem]===element))],bonus:(base.bonus?base.bonus+' · ':'')+recipe.name+(base.category==='armor'?' · Resistencia elemental +4':' · Daño elemental +'+recipe.damage),appearance:{...base.appearance,accent:recipe.color}};
    RPG_ITEMS[id]=item;return item;
  }
  const marker=id.lastIndexOf('_plus_');if(marker<0)return null;
  const base=RPG_ITEMS[id.slice(0,marker)],rank=Number(id.slice(marker+6));if(!base||rank<1||rank>5)return null;
  let item={...base};for(let level=1;level<=rank;level++)item={...item,id,reinforce:level,damageMin:item.damageMin?item.damageMin+1:0,damageMax:item.damageMax?item.damageMax+2:0,defense:item.defense?item.defense+1:0,gp:item.gp+level*50};
  RPG_ITEMS[id]=item;return item;
}
function ensureRpgState(profile) {
  if (!profile.rpgData) profile.rpgData = {
    level: profile.lastSavedLevel || 1, xp: 0, xpNext: 100, attributePoints: 0, skillPoints: 0,
    attributes: { str:5, agi:5, con:5, int:5 },
    skills: Object.fromEntries(SKILL_INFO.map(skill => [skill.id, 0])),
    gold: 0, inventory: ['piedra_del_alma'],
    equipment: Object.fromEntries(EQUIPMENT_SLOTS.map(([slot]) => [slot, null])),
    settings: { music:70, sfx:80, viewDistance:20, resolution:50, shadows:false }
  };
  const data = profile.rpgData;
  data.forgeItems ||= [];
  data.story ||= createStoryState();
  if (!WALPIRA_STORY_QUESTS.some(quest => quest.id === data.story.questId) && data.story.questId !== 'complete') data.story = createStoryState(data.story.tutorialChoice || null);
  data.story.prologuePending = Boolean(data.story.prologuePending);
  data.story.completed ||= [];
  data.story.progress ||= {};
  data.story.accepted ||= {};
  data.story.paidRewards ||= [];
  data.story.presentedChapters ||= [];
  data.story.pendingItems ||= [];
  data.story.journal ||= [];
  data.attributes ||= { str:5, agi:5, con:5, int:5 };
  data.skills ||= Object.fromEntries(SKILL_INFO.map(skill => [skill.id, 0]));
  for (const skill of SKILL_INFO) data.skills[skill.id] = Math.max(0, Number(data.skills[skill.id]) || 0);
  data.equipment ||= Object.fromEntries(EQUIPMENT_SLOTS.map(([slot]) => [slot, null]));
  data.equipment.legs ??= null;
  data.equipment.cape ??= null;
  data.inventory ||= [];
  data.storage ||= [];
  data.inventoryStacks ||= {};
  data.storageStacks ||= {};
  normalizeArrowStack(data.inventory, data.inventoryStacks);
  normalizeArrowStack(data.storage, data.storageStacks);
  data.settings ||= { music:70, sfx:80 };
  data.settings.temples = Math.max(1, Math.min(2, Math.round(Number(data.settings.temples) || 2)));
  data.settings.viewDistance = Math.max(20, Math.min(80, Number(data.settings.viewDistance) || 20));
  data.settings.resolution = Math.max(40, Math.min(100, Number(data.settings.resolution) || 50));
  data.settings.shadows = Boolean(data.settings.shadows);
  data.factionState ||= { defeatedMembers:[], alertLevels:{} };
  data.factionState.defeatedMembers ||= [];
  data.factionState.alertLevels ||= {};
  const maxMana = 24 + data.attributes.int * 12;
  const maxStamina = 180 + Math.max(0, data.attributes.con - 5) * 4;
  data.mana = Math.max(0, Math.min(maxMana, Number(data.mana ?? maxMana) || 0));
  data.stamina = Math.max(0, Math.min(maxStamina, Number(data.stamina ?? maxStamina) || 0));
  const defaultQuickSkills = SKILL_INFO.filter(skill => skill.type === 'active' && data.skills[skill.id] > 0).map(skill => skill.id);
  const configuredQuickSkills = Array.isArray(data.quickSkills) ? data.quickSkills : defaultQuickSkills;
  const assignedQuickSkills = new Set();
  data.quickSkills = Array.from({ length: QUICK_SKILL_SLOT_COUNT }, (_, index) => {
    const id = configuredQuickSkills[index];
    if (!SKILL_INFO.some(skill => skill.id === id && skill.type === 'active') || !(data.skills[id] > 0) || assignedQuickSkills.has(id)) return null;
    assignedQuickSkills.add(id);
    return id;
  });
  [...data.inventory, ...data.storage, ...data.forgeItems, ...Object.values(data.equipment)].filter(Boolean).forEach(resolveRpgItem);
  data.level = Math.max(1, Number(data.level) || 1);
  data.xp = Math.max(0, Number(data.xp) || 0);
  data.xpNext = Math.max(1, Number(data.xpNext) || 100);
  data.attributePoints = Math.max(0, Number(data.attributePoints) || 0);
  data.skillPoints = Math.max(0, Number(data.skillPoints) || 0);
  data.gold = Math.max(0, Number(data.gold) || 0);
  data.characterProgress ||= {};
  const activeCharacter=profile.activeCharacter||'kaelen';
  if(!data.characterProgress[activeCharacter])data.characterProgress[activeCharacter]=captureCharacterProgress(data);
  return data;
}
function saveRpgProfile(){const profile=getSelectedProfile();if(!profile||!rpgState)return;profile.rpgData=rpgState;saveProfiles();}
function currentStoryQuest(){return rpgState?.story?.questId==='complete'?null:WALPIRA_STORY_QUESTS.find(quest=>quest.id===rpgState?.story?.questId)||null;}
function beginNewStory(tutorialChoice) {
  const profile = getSelectedProfile();
  if (!profile) return;
  if (currentWorldId === 'forest') returnToWalpiraNorthGate();
  profile.lastSavedLevel = 1;
  profile.lastSavedDate = 'Sin partidas';
  profile.saveSlots = [null, null, null, null];
  delete profile.rpgData;
  rpgState = ensureRpgState(profile);
  rpgState.level = 1;
  rpgState.xp = 0;
  rpgState.attributePoints = 0;
  rpgState.skillPoints = 0;
  rpgState.skills = Object.fromEntries(SKILL_INFO.map(skill => [skill.id, 0]));
  rpgState.skills.dash = 1;
  rpgState.quickSkills = Array(QUICK_SKILL_SLOT_COUNT).fill(null);
  rpgState.quickSkills[0] = 'dash';
  rpgState.gold = 0;
  rpgState.story = createStoryState(tutorialChoice);
  rpgState.story.prologuePending = true;
  rpgState.inventory = ['piedra_del_alma'];
  rpgState.equipment = Object.fromEntries(EQUIPMENT_SLOTS.map(([slot]) => [slot, null]));
  rpgState.characterLoadouts = { kaelen: { ...rpgState.equipment } };
  rpgState.characterProgress = { kaelen: captureCharacterProgress() };
  rpgState.stamina = 180;
  recordStoryJournal('Inicio mi historia principal · Capítulo I.');
  saveRpgProfile();
  renderMainQuestHud();
}
function resetStoryProgress(tutorialChoice){if(!rpgState)return;rpgState.story=createStoryState(tutorialChoice);saveRpgProfile();renderMainQuestHud();}
function renderMainQuestHud(){
  const hud=document.getElementById('main-quest-hud');if(!hud)return;
  hud.hidden=true;
}
function recordStoryJournal(text){if(!rpgState?.story)return;rpgState.story.journal ||= [];rpgState.story.journal.push({at:Date.now(),text});if(rpgState.story.journal.length>100)rpgState.story.journal.splice(0,rpgState.story.journal.length-100);saveRpgProfile();}
function renderStoryJournal(){
  if(!rpgState)return;
  const quest=currentStoryQuest(),chapter=document.getElementById('journal-chapter'),title=document.getElementById('journal-quest-title'),objective=document.getElementById('journal-quest-objective'),progressLabel=document.getElementById('journal-quest-progress');
  chapter.textContent=quest?'CAPÍTULO '+(quest.chapter===1?'I':'II')+' · EN CURSO':'CAPÍTULOS I–II · COMPLETADOS';
  title.textContent=quest?.title||'El primer rumbo';
  objective.textContent=quest?(WALPIRA_MISSION_GUIDES[quest.id]?.summary||quest.objective):'Ya completé la campaña de los capítulos I y II. La señal viene del Exterior; su origen y la Quietud siguen sin respuesta.';
  const progress=quest&&rpgState.story.progress[quest.id];
  progressLabel.textContent=quest&&(quest.type==='forestKills'||quest.type==='forestMaterials')?'Llevo '+(progress?.count||0)+' de '+quest.count+' objetivos.':'';
  const acceptedList=document.getElementById('accepted-missions');
  acceptedList.replaceChildren(...WALPIRA_STORY_QUESTS.map(entry=>{
    const complete=rpgState.story.completed.includes(entry.id),isCurrent=quest?.id===entry.id,progress=rpgState.story.progress[entry.id]||{},guide=WALPIRA_MISSION_GUIDES[entry.id],card=document.createElement('li');
    card.className='mission-record'+(complete?' complete':'')+(isCurrent?' current':'');
    const heading=document.createElement('div'),check=document.createElement('input'),name=document.createElement('b'),status=document.createElement('span'),summary=document.createElement('p'),meta=document.createElement('small'),steps=document.createElement('ol'),hint=document.createElement('p'),reward=document.createElement('small');
    check.type='checkbox';check.checked=complete;check.disabled=true;check.setAttribute('aria-label',entry.title+(complete?' · completada':' · pendiente'));
    heading.className='mission-record-heading';name.textContent=entry.title;status.textContent=complete?'COMPLETADA':isCurrent?'EN CURSO':'PENDIENTE';heading.append(check,name,status);
    summary.className='mission-record-summary';summary.textContent=guide?.summary||entry.objective;
    meta.className='mission-record-meta';meta.textContent='CAPÍTULO '+(entry.chapter===1?'I':'II')+' · '+(guide?.destination||entry.location)+' · '+(guide?.people||'Exploración');
    steps.className='mission-record-steps';steps.setAttribute('aria-label','Pasos de '+entry.title);(guide?.steps||[entry.objective]).forEach(text=>{const step=document.createElement('li');step.textContent=text;steps.append(step);});
    hint.className='mission-record-hint';hint.textContent='Pista: '+(guide?.hint||'Sigo el objetivo activo y reviso el mapa de la región.');
    const rewardParts=[];if(entry.xp)rewardParts.push(entry.xp+' XP');if(entry.acceptGold)rewardParts.push(entry.acceptGold+' GP de adelanto');else if(entry.gold)rewardParts.push(entry.gold+' GP');if(entry.itemReward)rewardParts.push(RPG_ITEMS[entry.itemReward]?.name||entry.itemReward);
    reward.className='mission-record-reward';reward.textContent='Recibiré: '+(rewardParts.join(' · ')||'recompensa registrada en la aventura');
    card.append(heading,summary,meta,steps,hint,reward);
    if(entry.type==='forestKills'||entry.type==='forestMaterials'){
      const count=document.createElement('small');count.className='mission-record-progress';count.textContent='Progreso: '+Math.min(progress.count||0,entry.count)+' / '+entry.count;card.append(count);
    }
    return card;
  }));
  const list=document.getElementById('mission-journal-list'),entries=[...(rpgState.story.journal||[])].reverse();
  list.replaceChildren(...entries.map(entry=>{const item=document.createElement('li'),time=document.createElement('time'),copy=document.createElement('span'),date=new Date(entry.at);time.textContent=Number.isNaN(date.getTime())?'Aventura':date.toLocaleString('es',{dateStyle:'short',timeStyle:'short'});copy.textContent=firstPersonStoryJournalEntry(entry.text);item.append(time,copy);return item;}));
}
function firstPersonStoryJournalEntry(text){
  const replacements=[
    [/^Comienza la historia principal · Capítulo I\.$/,'Inicio mi historia principal · Capítulo I.'],
    [/^Comienza el Capítulo ([IV]+) · (.+)\.$/,'Comienzo el Capítulo $1 · $2.'],
    [/^Misión completada: (.+)\.$/,'Completo la misión «$1».'],
    [/^Misión aceptada: (.+)\.$/,'Acepto la misión «$1».'],
    [/^Compraste (.+) a Dohan\.$/,'Compro $1 a Dohan.'],
    [/^Equipaste (.+)\.$/,'Equipo $1.'],
    [/^(.+) · (\d+) \/ (\d+)\.$/,'Llevo $2 de $3 objetivos en «$1».'],
    [/^Barric reforzó (.+)\.$/,'Veo cómo Barric refuerza mi arma «$1».']
  ];
  for(const [pattern,replacement] of replacements)if(pattern.test(text))return text.replace(pattern,replacement);
  return text;
}
function missionJournalVoice(quest,complete,progress){
  if(complete)return 'Ya cumplí esta tarea. Puedo seguir con lo que me espera en Walpira.';
  const count=Math.min(progress.count||0,quest.count||0);
  const messages={
    c1_glemier:'Debo hablar con Glemier y registrar los fragmentos de la señal exterior.',
    c1_weapon:'Acepté ayudar a Dohan. Tengo 1500 GP para comprar una espada, un hacha o una daga y debo equipar el arma que elija.',
    c1_forest:'Debo despejar la ruta del bosque y registrar lo que observo sin confundirlo con una explicación.',
    c1_brujo_rescue:'Debo llegar al campamento del Pacto de la Savia y descubrir quién está atado allí.',
    c1_brujo_trial:'El Brujo necesita acertar un Orbe Arcano para escapar. Después volveré al protagonista original.',
    c1_forge:'Debo llevar mi arma a Barric para reforzarla a +1. Necesitaré una Piedra de Condena y 80 GP.',
    c1_report:'Debo volver con Glemier y separar los hechos de mis sospechas.',
    c2_mikel:'Debo consultar a Mikel sobre lo que las muestras permiten afirmar.',
    c2_crystals:'Estoy reuniendo cristales de escarcha. Ya llevo '+count+' de '+quest.count+'.',
    c2_forest:'Debo despejar la arboleda. Ya he derrotado '+count+' de '+quest.count+' criaturas.',
    c2_report:'Debo informar a Glemier que los registros sitúan la señal en el Exterior.'
  };
  return messages[quest.id]||'Acepté esta misión. Mi siguiente paso es: '+quest.objective;
}
function dismissChapterIntro(){
  const overlay=document.getElementById('screen-chapter');
  if(!overlay?.classList.contains('active')||overlay.classList.contains('chapter-fading'))return;
  overlay.classList.add('chapter-fading');overlay.setAttribute('aria-hidden','true');
  window.setTimeout(()=>overlay.classList.remove('active','chapter-fading'),560);
}
function presentWalpiraChapter(chapter){
  const data=WALPIRA_CHAPTERS[chapter];if(!data)return;
  document.getElementById('chapter-kicker').textContent='CAPÍTULO '+(chapter===1?'I':'II');
  document.getElementById('chapter-title').textContent=data.title;
  const copy=document.getElementById('story-copy');copy.replaceChildren(...data.copy.map(text=>{const paragraph=document.createElement('p');paragraph.textContent=text;return paragraph;}));
  if(data.nairu){const native=document.createElement('div'),script=document.createElement('div'),subtitle=document.createElement('p');native.className='chapter-nairu';script.className='chapter-nairu-script';script.innerHTML=walpiraScriptSvg(data.nairu);subtitle.className='chapter-nairu-subtitle';subtitle.textContent=data.nairuTranslation||'';native.append(script,subtitle);copy.append(native);}
  document.getElementById('story-window').scrollTop=0;
  document.getElementById('begin-adventure').textContent='CONTINUAR';
  if(!rpgState.story.presentedChapters.includes(chapter)){rpgState.story.presentedChapters.push(chapter);recordStoryJournal('Comienzo el Capítulo '+(chapter===1?'I':'II')+' · '+data.title+'.');}if(chapter===1)rpgState.story.prologuePending=false;saveRpgProfile();
  const overlay=document.getElementById('screen-chapter');overlay.classList.remove('chapter-fading');overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');
}
const WALPIRA_OPENING_DIALOGUE=[
  {speaker:'Madre',nairu:'Sela-paku na meri.',translation:'El hogar guarda memoria.',scene:'Amanecer en la choza familiar. La marea golpea la empalizada; el puesto de escucha acaba de sonar.'},
  {speaker:'Kaelen',nairu:'Wai na sena mi.',translation:'La señal llega con la marea.',scene:'Tres pulsos y una voz incompleta llegaron durante la noche. Nadie sabe quién transmitió.'},
  {speaker:'Madre',nairu:'Ya hara na?',translation:'¿Tienes miedo?',scene:'La madre mira la Piedra del Alma y espera una respuesta sincera.'},
  {speaker:'Kaelen',nairu:'An mu kela ren.',translation:'No abandonaré la piedra.',scene:'Kaelen decide escuchar a Maela y Glemier antes de elegir su camino.'}
];
function renderOpeningCinematicLine(){
  const line=WALPIRA_OPENING_DIALOGUE[openingCinematicIndex];
  if(!line)return;
  document.getElementById('cinematic-title').textContent='La señal que se apagó';
  document.getElementById('cinematic-scene').textContent=line.scene;
  document.getElementById('cinematic-speaker').textContent=line.speaker;
  document.getElementById('cinematic-line').textContent=line.translation;
  document.getElementById('cinematic-native').innerHTML=walpiraScriptSvg(line.nairu);
  document.getElementById('cinematic-next').textContent=openingCinematicIndex===WALPIRA_OPENING_DIALOGUE.length-1?'CONTINUAR':'SIGUIENTE';
  updateOpeningCinematicCamera(0,true);
}
function startWalpiraOpeningCinematic(){
  if(!gameMode||!rpgState?.story?.prologuePending)return;
  openingCinematicIndex=0;openingCinematicActive=true;manualPaused=true;gameMenuOpen=false;
  document.body.classList.add('cinematic-playing');
  const overlay=document.getElementById('cinematic-overlay');overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
  renderOpeningCinematicLine();
}
function updateOpeningCinematicCamera(delta,cut=false){
  if(!openingCinematicActive||currentWorldId!=='forest')return;
  const mother=forestScene.campCharacters.find(character=>character.id==='kaelen_mother');
  const focus=openingCinematicIndex%2===0&&mother?mother.object.position:heroGroup.position;
  const side=openingCinematicIndex%2===0?1:-1;
  const goalPosition=new THREE.Vector3(focus.x+side*2.8,2.1,focus.z+5.2);
  const goalTarget=new THREE.Vector3(focus.x,1.35,focus.z);
  if(cut)camera.position.copy(goalPosition);else camera.position.lerp(goalPosition,Math.min(1,delta*2.4));
  cameraTarget.lerp(goalTarget,cut?1:Math.min(1,delta*2.4));
  camera.lookAt(cameraTarget);
}
function finishWalpiraOpeningCinematic(){
  if(!openingCinematicActive)return;
  openingCinematicActive=false;manualPaused=false;gameMenuOpen=false;
  document.body.classList.remove('cinematic-playing');
  const overlay=document.getElementById('cinematic-overlay');overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  if(rpgState?.story){rpgState.story.prologuePending=false;if(!rpgState.story.presentedChapters.includes(1)){rpgState.story.presentedChapters.push(1);recordStoryJournal('Comienzo el Capítulo I · La señal que se apagó.');}saveRpgProfile();}
  camera.position.set(heroGroup.position.x,5.8,heroGroup.position.z+8);cameraTarget.set(heroGroup.position.x,1.1,heroGroup.position.z);camera.lookAt(cameraTarget);
  beginTutorial();
}
function advanceWalpiraOpeningCinematic(){
  if(!openingCinematicActive)return;
  if(openingCinematicIndex>=WALPIRA_OPENING_DIALOGUE.length-1){finishWalpiraOpeningCinematic();return;}
  openingCinematicIndex++;renderOpeningCinematicLine();
}
function completeStoryQuest(){
  const quest=currentStoryQuest();if(!quest||!rpgState)return;
  recordStoryJournal('Completo la misión «'+quest.title+'».');
  const story=rpgState.story;story.completed.push(quest.id);story.progress[quest.id] ||= {};
  if(quest.itemReward){if(rpgState.inventory.length<BACKPACK_CAPACITY)rpgState.inventory.push(quest.itemReward);else story.pendingItems.push(quest.itemReward);}
  const weaponReward=quest.type==='equipWeapon'?resolveRpgItem(rpgState.story.progress[quest.id]?.purchased)?.gp:0;
  const alreadyPaid=story.paidRewards.includes(quest.id);
  const goldReward=alreadyPaid?0:Math.max(quest.gold||0,weaponReward||0);
  rpgState.gold+=goldReward;
  const previousChapter=quest.chapter;
  const next=WALPIRA_STORY_QUESTS[WALPIRA_STORY_QUESTS.findIndex(entry=>entry.id===quest.id)+1];
  if(next){story.questId=next.id;story.chapter=next.chapter;}else{story.questId='complete';story.chapter=2;}
  const profile=getSelectedProfile();
  let switchAfterCompletion=null;
  if(quest.id==='c1_brujo_rescue'&&profile){
    profile.unlockedCharacters ||= ['kaelen'];
    if(!profile.unlockedCharacters.includes('brujo'))profile.unlockedCharacters.push('brujo');
    profile.characterNames ||= {};
    profile.characterDesigns ||= {};
    updatePlayableCharacterMenu();
    switchAfterCompletion='brujo';
  }else if(quest.id==='c1_brujo_trial'&&profile){
    switchAfterCompletion='kaelen';
  }
  if(quest.xp)gainExperience(quest.xp);
  if(switchAfterCompletion)setActiveCharacter(switchAfterCompletion);
  saveRpgProfile();renderMainQuestHud();
  if(next&&next.chapter!==previousChapter)presentWalpiraChapter(next.chapter);
  else showToast(next?'Misión completada · '+goldReward+' GP':'Capítulos I y II completados · queda registrada la primera ruta al Exterior.');
}
function advanceStoryCount(quest,count=1){
  if(!quest||!rpgState)return;
  const progress=rpgState.story.progress[quest.id] ||= { count:0 };
  progress.count=Math.min(quest.count, (progress.count||0)+count);recordStoryJournal('Llevo '+progress.count+' de '+quest.count+' objetivos en «'+quest.title+'».');
  saveRpgProfile();renderMainQuestHud();
  if(progress.count>=quest.count)completeStoryQuest();
  else showToast('Progreso · '+progress.count+' / '+quest.count);
}
function recordStoryNpcInteraction(npcId){const quest=currentStoryQuest();if(!quest||!rpgState.story.accepted[quest.id])return;if(quest.type==='talk'&&quest.npc===npcId)completeStoryQuest();else if(quest.type==='forge'&&quest.npc===npcId)showToast('La Piedra del Alma servirá de catalizador y seguirá contigo. Para el refuerzo +1, Barric consume una Piedra de Condena y 80 GP.');}
function acceptStoryQuest(){
  const quest=currentStoryQuest();if(!quest||!rpgState||quest.npc!==currentNpcId)return;
  rpgState.story.accepted[quest.id]=true;
  if(quest.acceptGold&&!rpgState.story.paidRewards.includes(quest.id)){rpgState.gold+=quest.acceptGold;rpgState.story.paidRewards.push(quest.id);}
  recordStoryJournal('Acepto la misión «'+quest.title+'».');saveRpgProfile();
  if(quest.type==='talk')completeStoryQuest();else renderNpcPanel();
  if(quest.acceptGold)showToast('Misión aceptada · recibiste '+quest.acceptGold+' GP.');
  closeGamePanel();
}
function declineStoryQuest(){closeGamePanel();showToast('La misión queda pendiente. Puedes decidir más tarde.');}
function recordStoryWeaponPurchase(itemId,npcId){const quest=currentStoryQuest();if(quest?.type!=='equipWeapon'||npcId!=='dohan'||RPG_ITEMS[itemId]?.slot!=='weapon')return;(rpgState.story.progress[quest.id] ||= {}).purchased=itemId;recordStoryJournal('Compro '+RPG_ITEMS[itemId].name+' a Dohan.');saveRpgProfile();}
function recordStoryWeaponEquipped(itemId){const quest=currentStoryQuest(),progress=quest&&rpgState.story.progress[quest.id];if(quest?.type==='equipWeapon'&&progress?.purchased&&itemId===progress.purchased){recordStoryJournal('Equipo '+RPG_ITEMS[itemId].name+'.');completeStoryQuest();}}
function recordStoryForgeUpgrade(itemId){const quest=currentStoryQuest();if(quest?.type==='forge'&&currentNpcId==='barric'&&itemId.endsWith('_plus_1')){const hasSoulStone=rpgState.inventory.includes('piedra_del_alma');recordStoryJournal(hasSoulStone?'Barric usa la Piedra del Alma como catalizador; permanece en mi mochila mientras refuerza mi arma «'+RPG_ITEMS[itemId].name+'» a +1.':'Veo cómo Barric refuerza mi arma «'+RPG_ITEMS[itemId].name+'» a +1.');completeStoryQuest();}}
function recordStoryEnemyDefeated(enemy){
  const quest=currentStoryQuest();if(!quest||!enemy.userData.isForestCreature)return;
  if(quest.type==='forestKills')advanceStoryCount(quest);
}
function updateStoryCampQuest(){
  const quest=currentStoryQuest(),camp=forestScene?.camps?.[0];
  if(currentWorldId!=='forest'||quest?.type!=='brujoRescue'||!camp)return;
  if(Math.hypot(heroGroup.position.x-camp.x,heroGroup.position.z-camp.z)>5.5)return;
  recordStoryJournal('Encuentro al Brujo cautivo en el campamento y consigo que el Pacto de la Savia lo libere.');
  showToast('El cautivo queda libre. Debo aprender a usar su Orbe Arcano.');
  completeStoryQuest();
}
function updateStoryGuidance(time){
  const quest=currentStoryQuest(),active=Boolean(storyGuidanceArrow&&quest&&gameMode&&!manualPaused&&!trainingMode&&currentWorldId!=='arena');
  if(!active){if(storyGuidanceArrow)storyGuidanceArrow.hidden=true;return;}
  if(storyGuidanceQuestId!==quest.id){storyGuidanceQuestId=quest.id;storyGuidanceTarget=null;storyGuidanceRefresh=0;}
  storyGuidanceRefresh-=animationDelta;
  if(storyGuidanceRefresh<=0){
    storyGuidanceRefresh=.25;let target=null;
    if(quest.npc){if(currentWorldId==='villa'){const npc=townNpcs.find(entry=>entry.userData.npc.id===quest.npc);if(npc)target=npc.position;}else if(currentWorldId==='forest')target={x:0,y:0,z:21.5};}
    else if(quest.location==='forest'){
      if(currentWorldId==='villa')target={x:0,y:0,z:-70};
      else if(quest.type==='forestKills'||quest.type==='forestMaterials'){
        const enemy=enemyCombatants.find(entry=>entry.parent&&entry.userData.isForestCreature&&entry.userData.health>0&&(quest.type!=='forestMaterials'||entry.userData.speciesId==='thorn_spitter'));
        target=enemy?.position||forestScene.camps?.[0]?.entrance||{x:0,y:0,z:-35};
      }
    }
    storyGuidanceTarget=target;
  }
  const target=storyGuidanceTarget;
  if(!target||!renderer?.domElement||!camera){storyGuidanceArrow.hidden=true;return;}
  camera.updateMatrixWorld();
  const cameraPoint=new THREE.Vector3(target.x,target.y+1.25,target.z).applyMatrix4(camera.matrixWorldInverse);
  const projected=new THREE.Vector3(target.x,target.y+1.25,target.z).project(camera);
  const behind=cameraPoint.z>0;
  const rect=renderer.domElement.getBoundingClientRect(),worldRect=world.getBoundingClientRect();
  const width=rect.width,height=rect.height;
  if(!width||!height){storyGuidanceArrow.hidden=true;return;}
  const onScreen=!behind&&Math.abs(projected.x)<.88&&Math.abs(projected.y)<.82;
  let dx=onScreen?projected.x*width*.5:behind?cameraPoint.x*height*.5:projected.x*width*.5;
  let dy=onScreen?-projected.y*height*.5:behind?-cameraPoint.z*height*.5:-projected.y*height*.5;
  let x,y;
  if(onScreen){x=width*(projected.x+1)*.5;y=height*(1-projected.y)*.5;}
  else{
    if(Math.abs(dx)+Math.abs(dy)<1){dx=0;dy=1;}
    const scale=Math.min((width*.5-25)/Math.abs(dx||1),(height*.5-45)/Math.abs(dy||1));
    x=width*.5+dx*scale;y=height*.5+dy*scale;
  }
  const safeLeft = 156;
  const safeRight = width - 164;
  const safeTop = 100;
  const safeBottom = height - 170;
  x = THREE.MathUtils.clamp(x, safeLeft, safeRight);
  y = THREE.MathUtils.clamp(y, safeTop, safeBottom);
  if (x < 200 && y > safeBottom - 18) x = Math.max(x, 200);
  if (x > safeRight - 18 && y < safeTop + 28) y = Math.max(y, safeTop + 28);
  storyGuidanceArrow.hidden=false;
  storyGuidanceArrow.style.left=(rect.left-worldRect.left+x)+'px';
  storyGuidanceArrow.style.top=(rect.top-worldRect.top+y)+'px';
  storyGuidanceArrow.style.setProperty('--bearing',Math.atan2(dy,dx)+'rad');
  storyGuidanceArrow.classList.toggle('arriving',onScreen);
}
function createStoryGuidanceMarker(){
  storyGuidanceMarker=null;
  storyGuidanceArrow=document.createElement('div');
  storyGuidanceArrow.className='story-guidance-arrow';
  storyGuidanceArrow.setAttribute('role','img');
  storyGuidanceArrow.setAttribute('aria-label','Dirección del objetivo de misión');
  storyGuidanceArrow.hidden=true;
  world.append(storyGuidanceArrow);
}
function derivedCharacterStats(){const a=rpgState.attributes,s=rpgState.skills,e=rpgState.equipment,weapon=RPG_ITEMS[e.weapon],shield=RPG_ITEMS[e.offhand],items=Object.values(e).map(id=>RPG_ITEMS[id]).filter(Boolean),armor=items.reduce((sum,item)=>sum+(item.defense||0),0),crit=items.reduce((sum,item)=>sum+(item.critical||0),0),bonus=(s.sword||0)*2,elementalDamage=weapon?.elementalDamage||0;return {damageMin:(weapon?.damageMin?weapon.damageMin+Math.max(0,a.str-5)+bonus:4+a.str*2+(weapon?5:0)+bonus)+elementalDamage,damageMax:(weapon?.damageMax?weapon.damageMax+Math.max(0,a.str-5)+bonus:8+a.str*3+(weapon?5:0)+bonus)+elementalDamage,defense:a.con*2+armor+(shield?.bonus?.includes('Defensa +4')?4:0)+(s.shield||0)*3,block:Math.min(75,4+a.agi*.65+(shield?.block||(shield?3:0))),critical:Math.min(80,2+a.agi*.55+crit),attackSpeed:1+Math.min(.25,Math.max(0,a.agi-5)*.01),maxWeight:30+a.str*5+(s.heroic||0)*8,hp:70+a.con*15,sp:24+a.int*12,regen:(a.int*.15).toFixed(1)};}
function playerMaxHealth(){return rpgState?derivedCharacterStats().hp:100;}
function physicalAttackBonus(){const weapon=RPG_ITEMS[rpgState?.equipment?.weapon];return rpgState?Math.max(0,(rpgState.attributes.str-5)*2+(rpgState.skills.sword||0)*2+(weapon?5+Math.round(((weapon.damageMin||0)+(weapon.damageMax||0))*.2):0))+(weapon?.elementalDamage||0):0;}
function renderCharacterSheet(){if(!rpgState)return;const stats=derivedCharacterStats(),percent=Math.min(100,rpgState.xp/rpgState.xpNext*100);const attributes=Object.entries(ATTRIBUTE_INFO).map(([key,labels])=>'<div class="attribute-row"><span class="attribute-copy"><b>'+labels[0]+' · '+labels[1]+'</b><small>'+labels[2]+'</small></span><span class="attribute-value">'+rpgState.attributes[key]+'</span><button class="arpg-plus" type="button" data-attribute="'+key+'" aria-label="Asignar punto a '+labels[1]+'" '+(rpgState.attributePoints<1?'disabled':'')+'>+</button></div>').join('');document.getElementById('character-sheet').innerHTML='<div class="character-level"><strong>Nivel '+rpgState.level+'</strong><span class="character-xp">'+rpgState.xp+' / '+rpgState.xpNext+' XP</span></div><div class="xp-track"><span style="width:'+percent+'%"></span></div><div class="character-layout"><section><div class="attribute-points">Puntos de atributo disponibles <b>'+rpgState.attributePoints+'</b></div><div class="attribute-list">'+attributes+'</div></section><section class="general-stats"><h3>Estadísticas generales</h3><div><span>Daño mínimo - máximo</span><b>'+stats.damageMin+' - '+stats.damageMax+'</b></div><div><span>Defensa total</span><b>'+stats.defense+'</b></div><div><span>Rapidez de ataques</span><b>+'+Math.round((stats.attackSpeed-1)*100)+'%</b></div><div><span>Bloqueo con escudo</span><b>'+stats.block.toFixed(1)+'%</b></div><div><span>Probabilidad crítica</span><b>'+stats.critical.toFixed(1)+'%</b></div><div><span>Vida máxima</span><b>'+stats.hp+' HP</b></div><div><span>Maná máximo</span><b>'+stats.sp+' SP</b></div><div><span>Regeneración de maná</span><b>'+stats.regen+' / s</b></div><div><span>Peso máximo</span><b>'+stats.maxWeight+' kg</b></div></section></div>';}
function renderQuickSkills(){const dock=document.getElementById('skill-dock');if(!dock)return;dock.replaceChildren();for(let index=0;index<QUICK_SKILL_SLOT_COUNT;index++){const skillId=rpgState?.quickSkills?.[index],skill=SKILL_INFO.find(entry=>entry.id===skillId&&entry.type==='active'&&(rpgState?.skills[skillId]||0)>0),button=document.createElement('button');button.type='button';button.className='game-action quick-skill-slot'+(skill?'':' empty');button.dataset.skillId=skill?.id||'';button.setAttribute('aria-label',skill?'Usar '+skill.name:'Casilla de habilidad vacía');button.innerHTML=skill?'<span class="skill-slot-icon" aria-hidden="true">'+skill.icon+'</span><b>'+skill.name+'</b><span class="skill-cooldown" aria-hidden="true"></span>':'<span class="skill-slot-icon" aria-hidden="true">◇</span><b>VACÍO</b>';button.addEventListener('click',()=>{if(skill)activateQuickSkill(skill.id);else showToast('Casilla vacía. Asigna una habilidad desde el árbol.');});dock.append(button);}}
function renderSkillCards(type){const container=document.getElementById(type==='passive'?'passive-skills':'active-skills');container.replaceChildren();SKILL_INFO.filter(skill=>skill.type===type).forEach(skill=>{const rank=rpgState.skills[skill.id]||0,locked=rpgState.level<skill.level,card=document.createElement('article');card.className='skill-card'+(locked?' locked':'');const icon=document.createElement('span');icon.className='skill-icon';icon.textContent=skill.icon;const copy=document.createElement('div');copy.innerHTML='<h4>'+skill.name+'</h4><p>'+skill.text+'</p><small>Rango '+rank+' · Nivel requerido '+skill.level+'</small>';const add=document.createElement('button');add.className='arpg-plus';add.type='button';add.textContent='+';add.setAttribute('aria-label','Subir rango de '+skill.name);add.disabled=locked||rpgState.skillPoints<1||rank>=10;add.addEventListener('click',()=>{if(add.disabled)return;rpgState.skills[skill.id]=rank+1;rpgState.skillPoints--;saveRpgProfile();renderSkills();renderCharacterSheet();});card.append(icon,copy,add);if(type==='active'){const slotSelect=document.createElement('select');slotSelect.className='skill-slot-select';slotSelect.setAttribute('aria-label','Equipar '+skill.name+' en una casilla rápida');slotSelect.add(new Option('No equipada','none'));for(let slot=0;slot<QUICK_SKILL_SLOT_COUNT;slot++)slotSelect.add(new Option('Casilla '+(slot+1),String(slot)));const assigned=rpgState.quickSkills.indexOf(skill.id);slotSelect.value=assigned<0?'none':String(assigned);slotSelect.disabled=rank<1||locked;slotSelect.addEventListener('change',()=>{const next=[...rpgState.quickSkills];for(let slot=0;slot<next.length;slot++)if(next[slot]===skill.id)next[slot]=null;if(slotSelect.value!=='none')next[Number(slotSelect.value)]=skill.id;rpgState.quickSkills=next;saveRpgProfile();renderSkills();});card.append(slotSelect);}container.append(card);});}
function renderSkills(){if(!rpgState)return;document.getElementById('skill-points').textContent=rpgState.skillPoints;renderSkillCards('passive');renderSkillCards('active');renderQuickSkills();}
function nearbyNpc(limit=4.6){if(!heroGroup)return null;const candidates=currentWorldId==='forest'?forestNpcs:currentWorldId==='villa'?townNpcs:[];let found=null,nearest=limit;for(const npc of candidates){const d=Math.hypot(heroGroup.position.x-npc.position.x,heroGroup.position.z-npc.position.z);if(d<nearest){found=npc;nearest=d;}}return found;}
function updateGroundLoot(delta,time){
  nearbyGroundLoot=null;let nearest=2.6;
  for(const pile of groundLootPiles){
    const phase=time+pile.phase;pile.group.position.y=.035+Math.sin(phase*2)*.055;pile.group.rotation.y+=delta*.32;pile.halo.material.opacity=.48+Math.sin(phase*2.5)*.22;pile.light.intensity=.75+Math.sin(phase*3)*.3;
    if(pile.items.length&&heroRoot){const distance=Math.hypot(heroRoot.position.x-pile.group.position.x,heroRoot.position.z-pile.group.position.z);if(distance<nearest){nearest=distance;nearbyGroundLoot=pile;}}
  }
}
const GROUND_LOOT_SAFE_RADIUS=20;
let lootDangerToastAt=0;
function isGroundLootSafeToOpen(){
  if(!heroRoot)return false;
  return !enemyCombatants.some(enemy=>enemy?.parent&&enemy.userData?.isEnemy&&!enemy.userData.isFriendlyNpc&&enemy.userData.health>0&&!enemy.userData.ai?.dead&&!enemy.userData.ai?.worldDisabled&&Math.hypot(heroRoot.position.x-enemy.position.x,heroRoot.position.z-enemy.position.z)<GROUND_LOOT_SAFE_RADIUS);
}
function showGroundLootDanger(){
  const now=performance.now();
  if(now-lootDangerToastAt>1300){lootDangerToastAt=now;showToast('No puedes revisar el botín mientras haya enemigos a menos de 20 m.');}
}
function ensureGroundLootPanel(){
  let panel=document.getElementById('ground-loot-panel');if(panel)return panel;
  panel=document.createElement('section');panel.id='ground-loot-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','ground-loot-title');
  panel.innerHTML='<div class="ground-loot-window"><header><div><p class="window-kicker">BOTÍN ENCONTRADO</p><h2 id="ground-loot-title">Mochila del enemigo</h2></div><button type="button" id="ground-loot-close" aria-label="Cerrar">×</button></header><div id="ground-loot-items"></div><p id="ground-loot-status" role="status"></p><footer><button type="button" id="ground-loot-take-all" class="arpg-action-button primary">Recoger todo</button></footer></div>';
  document.getElementById('screen-gameplay').append(panel);
  panel.querySelector('#ground-loot-close').addEventListener('click',closeGroundLootPanel);
  panel.addEventListener('click',event=>{if(event.target===panel)closeGroundLootPanel();});
  panel.querySelector('#ground-loot-take-all').addEventListener('click',()=>{if(!activeLootPile)return;while(activeLootPile.items.length&&rpgState.inventory.length<BACKPACK_CAPACITY)takeGroundLootItem(0);});
  return panel;
}
let activeLootPile=null;
function openGroundLootPanel(pile=nearbyGroundLoot){if(!pile||!pile.items.length||!rpgState)return false;if(!isGroundLootSafeToOpen()){showGroundLootDanger();return false;}activeLootPile=pile;lootPausedBeforeOpen=manualPaused;manualPaused=true;const panel=ensureGroundLootPanel();panel.hidden=false;renderGroundLootItems();panel.querySelector('#ground-loot-close').focus({preventScroll:true});return true;}
function closeGroundLootPanel(){const panel=document.getElementById('ground-loot-panel');if(panel)panel.hidden=true;activeLootPile=null;manualPaused=lootPausedBeforeOpen;document.getElementById('interaction-prompt').focus({preventScroll:true});}
function renderGroundLootItems(){
  const panel=ensureGroundLootPanel(),list=panel.querySelector('#ground-loot-items'),status=panel.querySelector('#ground-loot-status');
  if(!activeLootPile){list.replaceChildren();return;}
  list.replaceChildren(...activeLootPile.items.map((id,index)=>{const item=RPG_ITEMS[id],row=document.createElement('div');row.className='ground-loot-item';const name=document.createElement('span');name.textContent=item?.name||id;const details=document.createElement('small');details.textContent=item?.bonus||item?.kind||'Material';const take=document.createElement('button');take.type='button';take.textContent='Tomar';take.addEventListener('click',()=>takeGroundLootItem(index));row.append(name,details,take);return row;}));
  status.textContent=rpgState.inventory.length>=BACKPACK_CAPACITY?'Mochila llena. Libera espacio para recoger objetos.':'';
  panel.querySelector('#ground-loot-take-all').disabled=!activeLootPile.items.length||rpgState.inventory.length>=BACKPACK_CAPACITY;
}
function takeGroundLootItem(index){
  if(!activeLootPile||!rpgState)return;
  const id=activeLootPile.items[index];if(!id||!addRpgItem(rpgState.inventory,rpgState.inventoryStacks,id,1,BACKPACK_CAPACITY)){renderGroundLootItems();return;}activeLootPile.items.splice(index,1);
  const quest=currentStoryQuest();if(quest?.type==='forestMaterials'&&quest.itemId===id)advanceStoryCount(quest);
  saveRpgProfile();
  if(!activeLootPile.items.length){const pile=activeLootPile;removeGroundLootPile(pile);closeGroundLootPanel();showToast('Recogiste '+(RPG_ITEMS[id]?.name||id)+'.');}
  else renderGroundLootItems();
}
function updateNpcPrompt(){
  const prompt=document.getElementById('interaction-prompt'),npc=gameMode&&!gameMenuOpen&&!manualPaused?nearbyNpc():null;
  const previousNpcId=nearestNpcId;
  nearestNpcId=npc?.userData.npc.id||null;
  if(npc&&nearestNpcId!==previousNpcId){audioManager?.playNpcMurmur();const data=npc.userData.npc;if(currentWorldId==='forest'&&data.nairu)showToast(data.name+': '+data.nairu+' · '+data.translation);}
  if(nearbyGroundLoot&&!manualPaused){const safe=isGroundLootSafeToOpen();prompt.hidden=false;prompt.disabled=!safe;prompt.textContent=safe?'E · Revisar botín ('+nearbyGroundLoot.items.length+')':'Botín bloqueado · despeja enemigos a 20 m';return;}
  prompt.disabled=false;prompt.hidden=!npc;if(npc)prompt.textContent='E · Hablar con '+npc.userData.npc.name;
}
function interactNpc(id=nearestNpcId){const candidates=currentWorldId==='forest'?forestNpcs:currentWorldId==='villa'?townNpcs:[],npc=candidates.find(entry=>entry.userData.npc.id===id);if(!npc)return;const data=npc.userData.npc;if(Math.hypot(heroGroup.position.x-npc.position.x,heroGroup.position.z-npc.position.z)>5.1){showToast('Acércate a '+data.name+' para hablar.');return;}audioManager?.playNpcMurmur();rpgState.story.npcTalkCounts ||= {};rpgState.story.npcTalkCounts[id]=(rpgState.story.npcTalkCounts[id]||0)+1;saveRpgProfile();const quest=currentStoryQuest();if(quest?.npc===id&&!rpgState.story.accepted[quest.id]){currentNpcId=id;openGamePanel('npc');renderNpcPanel();return;}recordStoryNpcInteraction(id);if(document.getElementById('screen-chapter').classList.contains('active'))return;currentNpcId=id;openGamePanel('npc');renderNpcPanel();}
function renderNpcGrid(container, gridId, ids, count, actionLabel = '') {
  renderItemGrid(container, gridId, ids, { getItem:id=>RPG_ITEMS[id], getQuantity:id=>id===ARROW_ITEM_ID&&(gridId==='storage'||gridId==='backpack')?getStackQuantity(gridId==='storage'?rpgState.storage:rpgState.inventory,gridId==='storage'?rpgState.storageStacks:rpgState.inventoryStacks,id):null, count, actionLabel, emptyLabel:'Casilla vacía' });
}
const GEM_ELEMENT_BY_ID = { gema_de_viento:'viento', gema_de_roca:'tierra', gema_de_fuego:'fuego', gema_de_agua:'agua', gema_de_escarcha:'escarcha' };
const ELEMENTAL_RECIPES = {
  'escarcha+agua':{name:'Marea glacial',element:'escarcha',damage:8,color:'#a8e9f2'},
  'escarcha+fuego':{name:'Llama blanca',element:'fuego',damage:9,color:'#ffd39a'},
  'escarcha+tierra':{name:'Raiz perenne',element:'tierra',damage:8,color:'#b6ce8a'},
  'escarcha+viento':{name:'Ventisca',element:'escarcha',damage:8,color:'#d3f7ff'},
  'agua+fuego':{name:'Vapor ardiente',element:'fuego',damage:8,color:'#ffad74'},
  'agua+tierra':{name:'Barro profundo',element:'tierra',damage:8,color:'#b99a68'},
  'agua+viento':{name:'Marea del cielo',element:'agua',damage:8,color:'#8edce6'},
  'fuego+tierra':{name:'Corazon de magma',element:'fuego',damage:10,color:'#ff824e'},
  'fuego+viento':{name:'Vendaval igneo',element:'fuego',damage:10,color:'#ffd076'},
  'tierra+viento':{name:'Tormenta de arena',element:'tierra',damage:9,color:'#ddc274'}
};
function renderElementalForge(workspace) {
  const bench=document.createElement('section');bench.className='elemental-forge';
  const title=document.createElement('h3');title.textContent='Forja elemental';
  const guide=document.createElement('p');guide.className='forge-guide';guide.textContent='La Piedra del Alma fija el arma. Combina dos gemas distintas para crear un encanto elemental; las armas ganan daño y las armaduras resistencia.';
  const cross=document.createElement('div');cross.className='forge-cross';
  const makeSlot=(className,label,id,kind)=>{const wrapper=document.createElement('label');wrapper.className='forge-part '+className;wrapper.textContent=label;const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',label);select.add(new Option('Seleccionar',''));wrapper.append(select);cross.append(wrapper);return select;};
  const soul=makeSlot('soul-slot','Piedra del Alma','forge-soul-select','material');
  const gemOne=makeSlot('gem-one-slot','Gema 1 · viento','forge-gem-one-select','gem');
  const weapon=makeSlot('weapon-slot','Arma o armadura','forge-item-select','item');
  const gemTwo=makeSlot('gem-two-slot','Gema 2 · tierra','forge-gem-two-select','gem');
  const preview=document.createElement('p');preview.className='forge-recipe-preview';preview.setAttribute('role','status');preview.textContent='Piedra del Alma + dos gemas compatibles';
  const forgeButton=document.createElement('button');forgeButton.type='button';forgeButton.className='arpg-action-button primary';forgeButton.textContent='Forjar encanto';
  const addInventoryOptions=(select,predicate)=>rpgState.inventory.forEach((id,index)=>{const item=RPG_ITEMS[id];if(item&&predicate(item,id))select.add(new Option(item.name+' · '+item.bonus,index));});
  addInventoryOptions(soul,(item,id)=>id==='piedra_del_alma');
  addInventoryOptions(gemOne,(item,id)=>item.kind==='Gema'&&id!=='piedra_del_alma');
  addInventoryOptions(gemTwo,(item,id)=>item.kind==='Gema'&&id!=='piedra_del_alma');
  (rpgState.forgeItems||[]).forEach((id,index)=>{const item=RPG_ITEMS[id];if(item?.slot)weapon.add(new Option(item.name,index));});
  const updatePreview=()=>{const left=GEM_ELEMENT_BY_ID[rpgState.inventory[Number(gemOne.value)]],right=GEM_ELEMENT_BY_ID[rpgState.inventory[Number(gemTwo.value)]],recipe=left&&right?ELEMENTAL_RECIPES[[left,right].sort().join('+')]:null;preview.textContent=recipe?'Receta: '+recipe.name+' · '+(RPG_ITEMS[rpgState.forgeItems[Number(weapon.value)]]?.category==='armor'?'Defensa elemental +4':'Daño elemental +'+recipe.damage):'Piedra del Alma + dos gemas distintas';};
  [soul,gemOne,gemTwo,weapon].forEach(select=>select.addEventListener('change',updatePreview));
  forgeButton.disabled=!soul.options.length||!gemOne.options.length||!gemTwo.options.length||!weapon.options.length;
  forgeButton.addEventListener('click',()=>{
    const indices=[Number(soul.value),Number(gemOne.value),Number(gemTwo.value)],weaponIndex=Number(weapon.value);
    if(indices.some(index=>!Number.isInteger(index)||index<0)||new Set(indices).size!==3){showToast('Elige una Piedra del Alma y dos gemas distintas.');return;}
    const weaponId=rpgState.forgeItems[weaponIndex],item=RPG_ITEMS[weaponId],leftId=rpgState.inventory[indices[1]],rightId=rpgState.inventory[indices[2]],left=GEM_ELEMENT_BY_ID[leftId],right=GEM_ELEMENT_BY_ID[rightId];
    if(!item?.slot||!left||!right){showToast('Falta el arma, la piedra del alma o una gema compatible.');return;}
    if(item.element){showToast('Este objeto ya tiene un encanto elemental.');return;}
    const recipe=ELEMENTAL_RECIPES[[left,right].sort().join('+')];if(!recipe){showToast('Esa mezcla no forma un encanto estable.');return;}
    const soulId=rpgState.inventory[indices[0]],newId=weaponId+'_rune_'+left+'_'+right;
    const infused={...item,id:newId,element:recipe.element,elementName:recipe.name,elementalDamage:item.category==='weapons'?recipe.damage:0,elementalDefense:item.category==='armor'?4:0,enchants:[...(item.enchants||[]),recipe.name],crystals:[...(item.crystals||[]),leftId,rightId],bonus:(item.bonus?item.bonus+' · ':'')+recipe.name+(item.category==='armor'?' · Resistencia elemental +4':' · Daño elemental +'+recipe.damage),appearance:{...item.appearance,accent:recipe.color}};
    RPG_ITEMS[newId]=infused;rpgState.forgeItems[weaponIndex]=newId;indices.sort((a,b)=>b-a).forEach(index=>rpgState.inventory.splice(index,1));
    audioManager?.playForgeSuccess();saveRpgProfile();renderNpcPanel();renderInventory();renderCharacterSheet();showToast(item.name+' recibe '+recipe.name+'.');
  });
  bench.append(title,guide,cross,preview,forgeButton);workspace.append(bench);
}
function npcIntro(npc) {
  const quest=currentStoryQuest(),accepted=quest?.npc===npc.id&&rpgState.story.accepted[quest.id];
  const talkIndex=Math.max(0,(rpgState.story.npcTalkCounts?.[npc.id]||1)-1);
  const offerLines={c1_glemier:'Te estaba esperando, Kaelen. Los guardias de la frontera han visto una luz extraña entre los árboles; necesito que averigües qué ocurre.',c1_weapon:'Kaelen, no quiero que cruces la frontera desarmado. Si aceptas el encargo, te adelanto 1500 GP para que elijas una espada, un hacha o una daga.',c1_forge:'Tu arma puede resistir más. Si aceptas, Barric la llevará a +1; hará falta una Piedra de Condena.',c1_report:'Has vuelto. Siéntate un momento y cuéntame qué encontraste.',c2_mikel:'Las muestras que trajiste confirman mis sospechas. Esa savia no pertenece a ningún árbol sano.',c2_report:'La señal de la montaña se ha vuelto más fuerte. ¿También la sentiste?'};
  const acceptedLines={c1_weapon:'Cumplo mi palabra: aquí tienes los 1500 GP. Elige tu arma y equípala antes de partir.',c1_forge:'Lleva el arma a Barric. Él te explicará cada paso antes de tocar el yunque.'};
  const ambientLines={elena:['¿Cómo va el camino, Kaelen? Si la mochila pesa, puedo guardarte provisiones.','La fuente suena distinta desde el amanecer. Espero que solo sea el viento.','No olvides tus pociones; el bosque nunca avisa antes de atacar.'],dohan:['¿Cómo responde el arma en tu mano? El equilibrio importa tanto como el filo.','He reparado tres espadas esta mañana. Ninguna volvió tan mellada como la tuya.','La frontera está inquieta. Revisa tu equipo antes de salir otra vez.'],glemier:['Me alegra verte, Kaelen. La villa necesita noticias que no vengan de las campanas.','Los guardias no han dormido. Algo se mueve más allá del camino norte.','A veces el silencio de la frontera preocupa más que cualquier alarma.'],mikel:['La savia oscura se extiende. Estoy buscando una forma de detenerla.','Descansa cuando puedas; hasta un héroe piensa peor con la cabeza agotada.','He preparado vendas y tónicos. Ojalá no tengamos que usarlos.'],barric:['El hierro recuerda cada golpe. Yo también.','No fuerces una hoja mellada; una herida espera menos que el yunque.','Cuando quieras reforzar el arma, te explicaré primero qué material consume.']};
  const dialogue=(quest?.npc===npc.id?(accepted?acceptedLines[quest.id]||'Gracias por volver, Kaelen. Mantén los ojos abiertos y cuida tu equipo.':offerLines[quest.id]||'Kaelen, necesito hablar contigo de algo que preocupa a Walpira.'):(ambientLines[npc.id]||[npc.dialogue])[talkIndex%(ambientLines[npc.id]?.length||1)]).replaceAll('Kaelen',getPlayerCharacterName());
  const portrait=npc.portrait?'<img src="'+npc.portrait+'" alt="Retrato de '+npc.name+'">':'';
  const native=npc.nairu?'<div class="npc-native"><span class="npc-native-script">'+walpiraScriptSvg(npc.nairu)+'</span><small>'+npc.translation+'</small></div>':'';
  return '<div class="npc-intro'+(portrait?'':' npc-intro-no-portrait')+'">'+portrait+'<div><b>'+npc.name+'</b>'+native+'<span class="npc-speech">“'+dialogue+'”</span></div></div>';
}
function renderNpcPanel() {
  const npc=NPC_DEFINITIONS.find(entry=>entry.id===currentNpcId);if(!npc)return;
  document.getElementById('npc-title').textContent=npc.name;document.getElementById('npc-kicker').textContent=npc.role;
  const content=document.getElementById('npc-content');
  content.innerHTML=npcIntro(npc)+'<div id="npc-workspace"></div><div class="npc-tooltip" id="npc-tooltip" hidden></div>';
  const activeQuest=currentStoryQuest();
  if(activeQuest&&!(activeQuest.npc===npc.id&&!rpgState.story.accepted[activeQuest.id])){const storyNote=document.createElement('p');storyNote.className='npc-note';storyNote.textContent='Historia principal · '+activeQuest.title+' · '+activeQuest.objective;content.insertBefore(storyNote,content.querySelector('#npc-workspace'));}
  const workspace=document.getElementById('npc-workspace');
  if(activeQuest?.npc===npc.id&&!rpgState.story.accepted[activeQuest.id]){
    workspace.innerHTML='<div class="mission-card mission-offer"><span class="skill-icon">✦</span><div><h3>'+activeQuest.title+'</h3><p>'+activeQuest.objective+'</p>'+(activeQuest.acceptGold?'<b class="mission-reward">Al aceptar: '+activeQuest.acceptGold+' GP</b>':'')+'<div class="mission-choice-actions"><button class="mission-accept" type="button">Aceptar misión</button><button class="mission-decline" type="button">No aceptar</button></div></div></div>';
    workspace.querySelector('.mission-accept').addEventListener('click',acceptStoryQuest);
    workspace.querySelector('.mission-decline').addEventListener('click',declineStoryQuest);
    return;
  }
  if(npc.shop==='storage') {
    workspace.innerHTML='<div class="storage-columns"><section><h3>Mochila</h3><div id="npc-backpack-grid" class="backpack-grid"></div></section><section><h3>Cofre de Elena</h3><div id="storage-grid" class="backpack-grid"></div></section></div>';
    renderNpcGrid(document.getElementById('npc-backpack-grid'),'backpack',rpgState.inventory,20,'Guardar');
    renderNpcGrid(document.getElementById('storage-grid'),'storage',rpgState.storage||[],Math.max(20,rpgState.storage?.length||0),'Retirar');
  } else if(npc.shop==='forge') {
    workspace.innerHTML='<p class="npc-note">Lleva un arma o armadura a la mesa para reforzarla de +1 a +5. El material se consume al confirmar.</p><div class="forge-columns"><section><h3>Yunque</h3><div id="forge-grid" class="backpack-grid"></div></section><section><h3>Mochila</h3><div id="npc-backpack-grid" class="backpack-grid"></div></section></div><section class="catalog-section"><h3>Materiales de Barric</h3><div id="forge-stock-grid" class="backpack-grid"></div></section><div class="shop-balance">Oro disponible <b>'+rpgState.gold+' GP</b></div>';
    renderNpcGrid(document.getElementById('forge-grid'),'forge',rpgState.forgeItems||[],6,'Reforzar');
    renderNpcGrid(document.getElementById('npc-backpack-grid'),'backpack',rpgState.inventory,20,item=>item?.slot?'Llevar':'');
    renderNpcGrid(document.getElementById('forge-stock-grid'),'forge-stock',NPC_CATALOGS.barric,10,'Comprar');
    renderElementalForge(workspace);
  } else if(npc.shop==='missions') {
    workspace.innerHTML='<div class="mission-card"><span class="skill-icon">✦</span><p>La costa recibió una señal incompleta. Registra cada dato y no conviertas una sospecha en respuesta.</p></div>';
  } else {
    const catalog=NPC_CATALOGS[npc.id]||[];
    workspace.innerHTML='<div class="shop-balance">Oro disponible <b>'+rpgState.gold+' GP</b></div><div class="shop-columns"><section><h3>Catálogo</h3><div id="shop-grid" class="backpack-grid"></div></section><section><h3>Mochila · arrastra aquí para vender</h3><div id="npc-backpack-grid" class="backpack-grid"></div></section></div>';
    renderNpcGrid(document.getElementById('shop-grid'),'shop',catalog,catalog.length,'Comprar');
    renderNpcGrid(document.getElementById('npc-backpack-grid'),'backpack',rpgState.inventory,20,'Vender');
  }
}
function buyCatalogItem(id) {
  const item=RPG_ITEMS[id];
  if(!item||!(NPC_CATALOGS[currentNpcId]||[]).includes(id))return;
  if(rpgState.gold<item.gp){showToast('No tienes suficiente oro.');return;}
  if(!addRpgItem(rpgState.inventory,rpgState.inventoryStacks,id,1,BACKPACK_CAPACITY)){showToast('La mochila está llena.');return;}
  rpgState.gold-=item.gp;recordStoryWeaponPurchase(id,currentNpcId);saveRpgProfile();renderNpcPanel();renderInventory();showToast('Compraste '+item.name+(id===ARROW_ITEM_ID?' · '+getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,id)+' en la pila':'')+'.');
}
function sellBackpackItem(index) {
  const id=rpgState.inventory[index],item=RPG_ITEMS[id];if(!item)return;
  const removed=removeRpgItem(rpgState.inventory,rpgState.inventoryStacks,index),quantity=removed?.quantity||1;
  const price=Math.max(1,Math.floor((item.gp||0)*.5))*quantity;rpgState.gold+=price;
  saveRpgProfile();renderInventory();if(activeGamePanel==='npc')renderNpcPanel();showToast('Vendiste '+item.name+(quantity>1?' ×'+quantity:'')+' por '+price+' GP.');
}
function useBackpackConsumable(index){
  const id=rpgState?.inventory[index],item=RPG_ITEMS[id],effects=item?.effects;
  if(!effects)return;
  const oldHealth=heroHealth,oldMana=rpgState.mana;
  heroHealth=Math.min(playerMaxHealth(),heroHealth+Math.max(0,effects.health||0));
  rpgState.mana=Math.min(derivedCharacterStats().sp,rpgState.mana+Math.max(0,effects.mana||0));
  if(heroHealth===oldHealth&&rpgState.mana===oldMana){showToast('No necesitas este remedio ahora.');return;}
  rpgState.inventory.splice(index,1);saveRpgProfile();updatePlayerHealthHud();updatePlayerResourcesHud();renderInventory();
  showToast('Usaste '+item.name+'.');
}
function upgradeForgeItem(index) {
  const id=rpgState.forgeItems[index],item=RPG_ITEMS[id];if(!item)return;
  const next=(item.reinforce||0)+1;if(next>5){showToast('Este objeto ya alcanzó +5.');return;}
  const stoneId=next<=3?'piedra_de_condena':'piedra_del_velo_sagrado',stoneIndex=rpgState.inventory.indexOf(stoneId),pendingStoneIndex=next===1&&currentStoryQuest()?.id==='c1_forge'?rpgState.story.pendingItems.indexOf(stoneId):-1,cost=next*80;
  if(stoneIndex<0&&pendingStoneIndex<0){showToast('Falta '+(RPG_ITEMS[stoneId]?.name||'el material de refuerzo')+'.');return;}
  if(rpgState.gold<cost){showToast('No tienes suficiente oro.');return;}
  const base=item.reinforce?id.slice(0,id.lastIndexOf('_plus_')):id,newId=base+'_plus_'+next;
  if(stoneIndex>=0)rpgState.inventory.splice(stoneIndex,1);else rpgState.story.pendingItems.splice(pendingStoneIndex,1);rpgState.gold-=cost;
  RPG_ITEMS[newId]={...item,id:newId,reinforce:next,damageMin:item.damageMin?item.damageMin+1:0,damageMax:item.damageMax?item.damageMax+2:0,defense:item.defense?item.defense+1:0,gp:item.gp+next*50};
  rpgState.forgeItems[index]=newId;recordStoryForgeUpgrade(newId);saveRpgProfile();renderNpcPanel();renderInventory();showToast(item.name+' reforzado a +'+next+'.');
}
function moveGridItem({fromGrid,fromIndex,toGrid,toIndex,toSlotKey}) {
  if(fromGrid===toGrid)return;
  if(fromGrid==='backpack'&&(toGrid==='shop'||toGrid==='forge-stock')){sellBackpackItem(fromIndex);return;}
  if((fromGrid==='shop'||fromGrid==='forge-stock')&&toGrid==='backpack'){buyCatalogItem((NPC_CATALOGS[currentNpcId]||[])[fromIndex]);return;}
  if(fromGrid==='equipment'&&toGrid==='backpack'){
    const slot=EQUIPMENT_SLOTS[fromIndex]?.[0],id=rpgState.equipment[slot];if(!id||rpgState.inventory.length>=BACKPACK_CAPACITY)return;
    rpgState.equipment[slot]=null;rpgState.inventory.push(id);saveRpgProfile();renderInventory();renderCharacterSheet();return;
  }
  if(fromGrid==='backpack'&&toGrid==='equipment'){
    const id=rpgState.inventory[fromIndex],item=RPG_ITEMS[id],slot=toSlotKey;
    if(!item||item.slot!==slot||item.level>rpgState.level){showToast('Ese objeto no encaja en esa ranura.');return;}
    const previous=rpgState.equipment[slot];rpgState.equipment[slot]=id;rpgState.inventory.splice(fromIndex,1);if(previous)rpgState.inventory.push(previous);
    saveRpgProfile();renderInventory();renderCharacterSheet();return;
  }
  const sources={backpack:rpgState.inventory,storage:rpgState.storage,forge:rpgState.forgeItems};
  const source=sources[fromGrid],destination=sources[toGrid];
  if(!source||!destination)return;
  const id=source[fromIndex],item=RPG_ITEMS[id];if(!id)return;
  if(id===ARROW_ITEM_ID&&(fromGrid==='backpack'||fromGrid==='storage')&&(toGrid==='backpack'||toGrid==='storage')){
    const sourceStacks=fromGrid==='backpack'?rpgState.inventoryStacks:rpgState.storageStacks,destinationStacks=toGrid==='backpack'?rpgState.inventoryStacks:rpgState.storageStacks;
    const occupying=destination[toIndex],hasDestinationStack=destination.includes(ARROW_ITEM_ID);
    if(occupying&&occupying!==ARROW_ITEM_ID){showToast('Suelta la pila de flechas en una casilla vacía.');return;}
    if(!hasDestinationStack&&destination.length>=(toGrid==='backpack'?20:Infinity)){showToast('La mochila está llena.');return;}
    const removed=removeRpgItem(source,sourceStacks,fromIndex);if(!removed)return;
    if(hasDestinationStack)destinationStacks[id]=(Number(destinationStacks[id])||0)+removed.quantity;
    else{destination.splice(Math.min(toIndex,destination.length),0,id);destinationStacks[id]=removed.quantity;}
    saveRpgProfile();renderInventory();if(activeGamePanel==='npc')renderNpcPanel();return;
  }
  if(toGrid==='forge'&&!item?.slot){showToast('Solo puedes llevar armas o armaduras al yunque.');return;}
  const capacity=toGrid==='backpack'?20:toGrid==='forge'?6:Infinity;
  const occupying=destination[toIndex];
  if(!occupying&&destination.length>=capacity){showToast(toGrid==='forge'?'El yunque está lleno.':'La mochila está llena.');return;}
  if(occupying){destination[toIndex]=id;source[fromIndex]=occupying;}
  else {source.splice(fromIndex,1);destination.splice(Math.min(toIndex,destination.length),0,id);}
  saveRpgProfile();renderInventory();if(activeGamePanel==='npc')renderNpcPanel();
}
function activateGridItem({gridId,index,itemId,slotKey,action}) {
  if(action==='Usar'&&gridId==='backpack'){useBackpackConsumable(index);return;}
  if(action==='Guardar'){moveGridItem({fromGrid:'backpack',fromIndex:index,toGrid:'storage',toIndex:(rpgState.storage||[]).length});return;}
  if(action==='Retirar'){moveGridItem({fromGrid:'storage',fromIndex:index,toGrid:'backpack',toIndex:rpgState.inventory.length});return;}
  if(action==='Comprar'){buyCatalogItem((NPC_CATALOGS[currentNpcId]||[])[index]);return;}
  if(action==='Vender'){sellBackpackItem(index);return;}
  if(action==='Llevar'){moveGridItem({fromGrid:'backpack',fromIndex:index,toGrid:'forge',toIndex:(rpgState.forgeItems||[]).length});return;}
  if(gridId==='forge'&&itemId){upgradeForgeItem(index);return;}
  if(gridId==='equipment'&&itemId){unequipSlot(slotKey);return;}
  if(gridId==='backpack'&&itemId&&activeGamePanel==='inventory'){equipBackpackItem(index);return;}
  if(gridId==='backpack'&&itemId)renderTooltip(itemId,'npc-tooltip');
}
function setupUnifiedItemGrid() {
  bindItemGrid(document.getElementById('arpg-backdrop'),{
    onActivate:activateGridItem,
    onDetails:(id,gridId)=>renderTooltip(id,activeGamePanel==='inventory'&&(gridId==='backpack'||gridId==='equipment')?'inventory-tooltip':'npc-tooltip'),
    onTransfer:moveGridItem
  });
}
function itemTooltipMarkup(item) {
  const req=item.requirement||{level:item.level||1,str:0},crystals=item.crystals?.length?item.crystals.join(', '):'Ninguno',enchants=item.enchants?.length?item.enchants.join(', '):'Ninguno';
  const stats=['<span>Daño '+(item.damageMin||0)+'-'+(item.damageMax||0)+'</span>','<span>Defensa '+(item.defense||0)+'</span>','<span>Bloqueo '+(item.block||0)+'%</span>','<span>Velocidad '+(item.attackSpeed||'—')+'</span>',item.elementalDamage?'<span>Daño elemental +'+item.elementalDamage+'</span>':'',item.elementalDefense?'<span>Resistencia elemental +'+item.elementalDefense+'</span>':'',item.critical?'<span>Crítico +'+item.critical+'%</span>':'',item.bonus?'<span>'+item.bonus+'</span>':''].filter(Boolean).join('');
  return '<b class="tooltip-name rarity-'+(item.rarity==='Épico'?'epic':item.rarity==='Mágico'?'magic':'common')+'">'+item.name+(item.reinforce?' +'+item.reinforce:' +0')+'</b><span>'+item.kind+' · Req. nivel '+req.level+(req.str?', STR '+req.str:'')+'</span><div class="tooltip-stats">'+stats+'</div><div class="tooltip-meta">Compose: '+(item.compose??0)+'/3 · Encantos elementales: '+enchants+' · Cristales: '+crystals+'</div><div class="tooltip-footer">'+(item.gp||0)+' GP · Peso '+item.weight+' kg</div>';
}
function renderTooltip(itemId,targetId){const id=targetId||(activeGamePanel==='npc'?'npc-tooltip':'inventory-tooltip'),tooltip=document.getElementById(id),item=RPG_ITEMS[itemId];if(!tooltip)return;if(!item){tooltip.hidden=true;return;}tooltip.dataset.rarity=item.rarity==='Épico'?'epic':item.rarity==='Mágico'?'magic':'common';tooltip.innerHTML=itemTooltipMarkup(item);tooltip.hidden=false;}

function totalCarryWeight(){return [...rpgState.inventory,...Object.values(rpgState.equipment)].filter(Boolean).reduce((total,id)=>total+(RPG_ITEMS[id]?.weight||0)*(id===ARROW_ITEM_ID?getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,id)||1:1),0);}
function syncEquippedVisuals() {
  const equipment = rpgState?.equipment || {};
  const isBrujo = getActiveCharacterId() === 'brujo';
  heroBaseLegParts.forEach(part => { part.visible = true; });
  if (hero.cape) hero.cape.visible = Boolean(equipment.cape) && !isBrujo;
  if (hero.shield) hero.shield.visible = Boolean(equipment.offhand) && !isBrujo;

  const slotGroups = [
    ['head', heroHelmetGroup],
    ['chest', heroChestEquipment],
    ['shoulders', heroShoulderEquipment],
    ['gloves', heroGloveEquipment],
    ['legs', heroLegEquipment],
    ['boots', heroBootEquipment]
  ];
  for (const [slot, groupOrList] of slotGroups) {
    const visible = Boolean(equipment[slot]) && !isBrujo;
    if (Array.isArray(groupOrList)) groupOrList.forEach(part => { if (part) part.visible = visible; });
    else if (groupOrList) groupOrList.visible = visible;
  }
  if (heroHeadEquipment) heroHeadEquipment.visible = false;

  const weapon = resolveRpgItem(equipment.weapon);
  const weaponEquipped = Boolean(weapon) && !weaponThrown;
  const weaponKind = weapon?.kind === 'Arma principal' ? (/hacha/i.test(weapon.name) ? 'Hacha' : /daga/i.test(weapon.name) ? 'Daga' : /cetro|bastón/i.test(weapon.name) ? 'Cetro' : /cimitarra/i.test(weapon.name) ? 'Cimitarra' : 'Espada') : weapon?.kind || '';
  const showSword = !isBrujo && weaponEquipped && ['Espada', 'Cimitarra'].includes(weaponKind);
  const showAxe = !isBrujo && weaponEquipped && weaponKind === 'Hacha';
  const showDagger = weaponEquipped && weaponKind === 'Daga';
  const showStaff = weaponEquipped && ['Cetro', 'Bastón', 'Staff'].includes(weaponKind);
  const showSpear = !isBrujo && weaponEquipped && weaponKind === 'Lanza';
  const showBow = !isBrujo && weaponEquipped && weaponKind === 'Arco';

  if (hero.sword) hero.sword.visible = weaponEquipped;
  if (hero.axe) hero.axe.visible = showAxe;
  if (hero.dagger) hero.dagger.visible = showDagger;
  if (hero.staff) hero.staff.visible = showStaff;
  if (spearGroup) spearGroup.visible = showSpear;
  if (bowGroup) bowGroup.visible = showBow;

  if (swordGroup) {
    for (const name of ['swordGrip', 'swordPommel', 'swordGuard', 'swordBlade', 'swordBladeCore', 'PointLight']) {
      const part = swordGroup.getObjectByName(name);
      if (part) part.visible = showSword;
    }
    if (bladeSparks) bladeSparks.visible = showSword;
  }
  if (hero.axe && hero.axe !== swordGroup) hero.axe.visible = showAxe;
  if (hero.dagger && hero.dagger !== swordGroup) hero.dagger.visible = showDagger;
  if (hero.staff && hero.staff !== swordGroup) hero.staff.visible = showStaff;

  const actionButton = document.getElementById('action-button');
  const actionLabel = actionButton?.querySelector('.action-button-label');
  if (actionLabel) actionLabel.textContent = showBow ? 'DISPARAR' : 'ATACAR';
  if (actionButton) actionButton.setAttribute('aria-label', showBow ? 'Disparar flecha' : 'Atacar');
  const shieldButton = document.getElementById('shield-button');
  if (shieldButton) shieldButton.disabled = isBrujo || !equipment.offhand;
  syncShieldBashButton();
  syncWeaponActionButton();
}
function startHeroWeaponTransition(armed) {
  heroRoot.attach(swordGroup);
  heroRoot.attach(hero.shield);
  heroWeaponTransition = {
    armed,
    elapsed: 0,
    duration: .52,
    swordFrom: { position: swordGroup.position.clone(), quaternion: swordGroup.quaternion.clone() },
    shieldFrom: { position: hero.shield.position.clone(), quaternion: hero.shield.quaternion.clone() }
  };
}
function getHeroHandPose(hand, localPosition, localRotation = [0, 0, 0]) {
  hand.updateWorldMatrix(true, false);
  heroRoot.updateWorldMatrix(true, false);
  const worldPosition = hand.localToWorld(new THREE.Vector3(...localPosition));
  const position = heroRoot.worldToLocal(worldPosition);
  const handRotation = hand.getWorldQuaternion(new THREE.Quaternion());
  const localQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...localRotation));
  const rootRotation = heroRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
  return { position, quaternion: rootRotation.multiply(handRotation.multiply(localQuaternion)) };
}
function updateHeroWeaponStance(delta) {
  if (!heroRoot || !swordGroup || !hero.shield) return;
  const armed = gameMode && !gameMenuOpen && !manualPaused && (currentWorldId !== 'villa' || !isInSafePlaza(heroRoot.position));
  if (!heroWeaponTransition && ((armed && heroWeaponStance !== 'armed') || (!armed && heroWeaponStance !== 'holstered'))) startHeroWeaponTransition(armed);
  if (!heroWeaponTransition) {
    heroWeaponBlend = heroWeaponStance === 'armed' ? 1 : 0;
    if (heroWeaponStance === 'armed' && !weaponThrown) {
      if (swordGroup.parent !== rightHandGrip) rightHandGrip.attach(swordGroup);
      swordGroup.position.set(0, 0, 0);
    }
    return;
  }
  const transition = heroWeaponTransition;
  transition.elapsed = Math.min(transition.duration, transition.elapsed + delta);
  const progress = easeInOut(transition.elapsed / transition.duration);
  heroWeaponBlend = transition.armed ? progress : 1 - progress;
  const swordTarget = transition.armed
    ? getHeroHandPose(rightHandGrip, [0, 0, 0], [0, 0, -.12])
    : { position: new THREE.Vector3(-.22, 1.12, -.27), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, .12)) };
  const shieldTarget = transition.armed
    ? getHeroHandPose(leftHand, [0, 0, .17])
    : { position: new THREE.Vector3(.22, 1.36, -.29), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)) };
  swordGroup.position.lerpVectors(transition.swordFrom.position, swordTarget.position, progress);
  swordGroup.quaternion.copy(transition.swordFrom.quaternion).slerp(swordTarget.quaternion, progress);
  hero.shield.position.lerpVectors(transition.shieldFrom.position, shieldTarget.position, progress);
  hero.shield.quaternion.copy(transition.shieldFrom.quaternion).slerp(shieldTarget.quaternion, progress);
  if (progress < 1) return;
  if (transition.armed) {
    if (swordGroup.parent !== rightHandGrip) rightHandGrip.attach(swordGroup);
    swordGroup.position.set(0, 0, 0);
    swordGroup.rotation.set(0, 0, -.12);
    if (hero.shield.parent !== leftHand) leftHand.attach(hero.shield);
    hero.shield.position.set(0, 0, .17);
    hero.shield.rotation.set(0, 0, 0);
  } else {
    if (swordGroup.parent !== heroRoot) heroRoot.attach(swordGroup);
    swordGroup.position.set(-.22, 1.12, -.27);
    swordGroup.rotation.set(0, Math.PI, .12);
    if (hero.shield.parent !== heroRoot) heroRoot.attach(hero.shield);
    hero.shield.position.set(.22, 1.36, -.29);
    hero.shield.rotation.set(0, Math.PI, 0);
  }
  heroWeaponStance = transition.armed ? 'armed' : 'holstered';
  heroWeaponTransition = null;
  heroWeaponBlend = transition.armed ? 1 : 0;
}
function hasEquippedCombatShield() {
  const shieldId = rpgState?.equipment?.offhand;
  const shieldItem = shieldId ? RPG_ITEMS[shieldId] : null;
  return Boolean(shieldItem?.slot === 'offhand' && hero.shield?.visible && !gameMenuOpen && !manualPaused);
}
function currentDashImpulse() {
  if (!dashInertia.active || !movementVelocity || dashInertia.elapsed > DASH_INERTIA_CONFIG.window) return 0;
  const speed = movementVelocity.length();
  if (speed < DASH_INERTIA_CONFIG.minSpeed) return 0;
  const alignment = Math.max(0, movementVelocity.dot(dashInertia.direction) / speed);
  const speedRatio = THREE.MathUtils.clamp(speed / DASH_INERTIA_CONFIG.maxDashSpeed, 0, 1);
  const freshness = THREE.MathUtils.clamp(1 - dashInertia.elapsed / DASH_INERTIA_CONFIG.window, 0, 1);
  return THREE.MathUtils.clamp(dashInertia.charge * speedRatio * alignment * freshness, 0, 1);
}
function consumeDashImpulse() {
  const power = currentDashImpulse();
  if (power <= 0) return 0;
  dashInertia.active = false;
  dashInertia.charge = 0;
  dashTimer = 0;
  movementVelocity.multiplyScalar(1 - power * .35);
  updateImpulseHud();
  return power;
}
function impulseDamageMultiplier(power, scale = 1) {
  return 1 + Math.min(.9, Math.max(0, power) * scale);
}
function syncShieldBashButton() {
  const button = document.getElementById('shield-bash-button');
  if (!button) return;
  const available = Boolean(rpgState?.equipment?.offhand && RPG_ITEMS[rpgState.equipment.offhand]?.slot === 'offhand' && hero.shield?.visible);
  button.classList.toggle('needs-shield', !available);
  button.setAttribute('aria-disabled', String(!available));
  button.title = available ? 'Escudazo de Impulso · V' : 'Equipa un escudo en la ranura secundaria para usar Escudazo de Impulso';
  if(!button.querySelector('.skill-cooldown'))button.insertAdjacentHTML('beforeend','<span class="skill-cooldown" aria-hidden="true"></span>');
}
function updateImpulseHud() {
  const meter = document.getElementById('impulse-meter');
  if (!meter) return;
  const power = currentDashImpulse();
  const percent = Math.round(power * 100);
  const fill = document.getElementById('impulse-fill');
  const value = document.getElementById('impulse-value');
  if (fill) fill.style.width = percent + '%';
  if (value) value.textContent = percent + '%';
  meter.setAttribute('aria-label', 'Impulso de movimiento: ' + percent + ' por ciento');
  meter.classList.toggle('ready', power >= .4);
  meter.classList.toggle('surge', power >= .55);
}
function requestShieldBash() {
  if (!gameMode || gameMenuOpen || manualPaused) return false;
  if (playerPowerCooldownRemaining('shield_bash') > 0) return false;
  if (!hasEquippedCombatShield()) {
    showToast('Equipa un escudo en la ranura secundaria para usar el Escudazo.');
    document.getElementById('shield-bash-button')?.classList.add('needs-shield-pulse');
    window.setTimeout(() => document.getElementById('shield-bash-button')?.classList.remove('needs-shield-pulse'), 650);
    return false;
  }
  if (shieldBash.phase !== 'IDLE' || comboState !== 'IDLE' || jumpActive || jumpPhase !== 'ground' || heroStunTimer > 0) return false;
  if (!canPayPlayerResources(8, 16, 'el Escudazo')) return false;
  spendMana(8, 'el Escudazo'); spendStamina(16, 'el Escudazo');
  startPlayerPowerCooldown('shield_bash');
  const speed = movementVelocity.length();
  const impulsePower = consumeDashImpulse();
  const direction = impulsePower > 0 ? dashInertia.direction.clone() : new THREE.Vector2(Math.sin(heroRoot.rotation.y), Math.cos(heroRoot.rotation.y));
  if (direction.lengthSq() < .001) direction.set(0, 1);
  direction.normalize();
  shieldBash = { phase: 'WINDUP', elapsed: 0, direction, speed: THREE.MathUtils.clamp(4.5 + speed * .32, 4.5, 8), power: impulsePower, hitTargets: new Set() };
  dashTimer = 0;
  dashInertia.active = false;
  dashBufferTimer = 0;
  shieldButtonHeld = false;
  if (dashWindTrail) beginSwordTrail(dashWindTrail, .2);
  audioManager?.playSwordSwing(1.15 + impulsePower * .7);
  audioManager?.playHeroVoice('effort');
  return true;
}
function advanceShieldBash(delta) {
  if (shieldBash.phase === 'IDLE') return;
  shieldBash.elapsed += delta;
  if (shieldBash.phase === 'WINDUP' && shieldBash.elapsed >= SHIELD_BASH_CONFIG.windup) {
    shieldBash.phase = 'ACTIVE';
    shieldBash.elapsed = 0;
  } else if (shieldBash.phase === 'ACTIVE' && shieldBash.elapsed >= SHIELD_BASH_CONFIG.active) {
    shieldBash.phase = 'RECOVERY';
    shieldBash.elapsed = 0;
  } else if (shieldBash.phase === 'RECOVERY' && shieldBash.elapsed >= SHIELD_BASH_CONFIG.recovery) {
    shieldBash = { phase: 'IDLE', elapsed: 0, direction: new THREE.Vector2(), speed: 0, power: 0, hitTargets: new Set() };
    movementVelocity.set(0, 0);
  }
}
function resolveShieldBashImpact() {
  const direction = new THREE.Vector3(shieldBash.direction.x, 0, shieldBash.direction.y);
  const candidates = [...new Set([...enemyCombatants, ...remotePlayers.values(), ...(trainingDummy ? [trainingDummy] : [])])];
  for (const target of candidates) {
    const data = target?.userData || {};
    const targetId = data.playerId || target?.uuid;
    if (!targetId || shieldBash.hitTargets.has(targetId) || !target.parent) continue;
    if (data.isPlayer ? !isLockTargetAlive(target) : data.isTrainingDummy ? false : (!data.isEnemy || data.health <= 0 || data.ai?.dead)) continue;
    const targetPosition = target.getWorldPosition(new THREE.Vector3());
    const toTarget = new THREE.Vector3(targetPosition.x - heroRoot.position.x, 0, targetPosition.z - heroRoot.position.z);
    const distance = toTarget.length();
    if (distance > SHIELD_BASH_CONFIG.impactRange || distance < .001 || toTarget.normalize().dot(direction) < .28) continue;
    shieldBash.hitTargets.add(targetId);
    const damage = Math.round(SHIELD_BASH_CONFIG.baseDamage + SHIELD_BASH_CONFIG.bonusDamage * shieldBash.power);
    if (data.isTrainingDummy) registerTrainingDummyHit(target, direction);
    else if (data.isPlayer) sendPlayerAttack(data.playerId);
    else if (typeof trainingMode !== 'undefined' && trainingMode && data.ai?.trainingMode && data.ai.blocking) {
      emitSwordClash(targetPosition);
      showCombatFeedback('BLOQUEADO · BUSCA UNA APERTURA', true);
      continue;
    } else damageEnemy(target, damage, direction, 2);
    if (data.ai && !data.ai.dead && data.health > 0) {
      const knockbackSpeed = SHIELD_BASH_CONFIG.knockbackSpeed + SHIELD_BASH_CONFIG.knockbackBonusSpeed * shieldBash.power;
      Object.assign(data.ai, { stunTimer: SHIELD_BASH_CONFIG.stunDuration, comboRemaining: 0, attackTimer: 0, dashTimer: 0, jumpTime: 0, launchTimer: 0, knockback: { x: direction.x * knockbackSpeed, z: direction.z * knockbackSpeed, duration: SHIELD_BASH_CONFIG.knockbackDuration }, shieldBashStun: true });
    }
    const shieldPosition = hero.shield.getWorldPosition(new THREE.Vector3());
    shieldPosition.y += .1;
    emitSwordClash(shieldPosition);
    registerCombatImpact(damage, false, 1.3 + shieldBash.power * .6);
    hitStopTimer = Math.max(hitStopTimer, .065);
    cameraShakeDuration = .2; cameraShakeTimer = cameraShakeDuration; cameraShakeStrength = .07 + shieldBash.power * .08;
    showCombatFeedback((shieldBash.power >= .4 ? 'ESCUDazo POTENTE' : 'ESCUDazo') + ' · ' + damage);
  }
}
function applyShieldBashPose() {
  if (shieldBash.phase === 'IDLE') return;
  const active = shieldBash.phase === 'ACTIVE';
  const windup = shieldBash.phase === 'WINDUP';
  const recoil = shieldBash.phase === 'RECOVERY';
  hips.position.y = smoothLerp(hips.position.y, windup ? .86 : active ? .91 : .95, .32);
  torso.rotation.x = smoothLerp(torso.rotation.x, windup ? -.2 : active ? -.46 : .08, .34);
  hips.rotation.x = smoothLerp(hips.rotation.x, windup ? .12 : active ? -.08 : 0, .3);
  leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, windup ? -.92 : active ? -1.38 : -.72, .42);
  leftShoulder.rotation.z = smoothLerp(leftShoulder.rotation.z, windup ? -.35 : active ? -.12 : .08, .36);
  leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, windup ? -1.02 : active ? -.28 : -.18, .4);
  leftWrist.rotation.x = smoothLerp(leftWrist.rotation.x, active ? -.18 : 0, .4);
  rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, windup ? -.38 : active ? -.7 : -.72, .32);
  rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, active ? -.45 : -.78, .32);
  cape.rotation.x = smoothLerp(cape.rotation.x, active ? .26 : windup ? -.08 : 0, .24);
  if (active && dashWindTrail?.active) pushSwordSample(dashWindTrail);
  if (recoil && shieldBash.elapsed >= SHIELD_BASH_CONFIG.recovery) return;
}
function setPlayerAimMode(active) {
  const weapon = resolveRpgItem(rpgState?.equipment?.weapon);
  const bowAiming = weapon?.kind === 'Arco';
  const supportedWeapon = ['Espada', 'Cimitarra'].includes(weapon?.kind) || bowAiming;
  if (active && (!supportedWeapon || weaponThrown || !gameMode || gameMenuOpen || manualPaused)) {
    showToast('Equipa un arco o una espada para apuntar.');
    active = false;
  }
  aimMode = active;
  if(bowAiming&&active&&bowGroup&&(getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,ARROW_ITEM_ID)||0)>0){
    if(!bowNockedArrow){bowNockedArrow=createBowArrow();bowNockedArrow.scale.setScalar(.72);bowGroup.add(bowNockedArrow);bowNockedArrow.position.set(0,0,.04);}
    bowNockedArrow.visible=true;
  }else if(bowNockedArrow)bowNockedArrow.visible=false;
  if (active) {
    aimCharge = 0;
    if (!aimTrajectoryLine) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(34 * 3);
      const attribute = new THREE.BufferAttribute(positions, 3);
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', attribute);
      aimTrajectoryLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#f1d18a', transparent: true, opacity: .85, depthTest: true }));
      aimTrajectoryLine.frustumCulled = false;
      scene.add(aimTrajectoryLine);
    }
  } else if (aimTrajectoryLine) {
    aimTrajectoryLine.visible = false;
  }
  const overlay = document.getElementById('aim-overlay');
  const button = document.getElementById('aim-button');
  if (overlay) { overlay.hidden = !active; overlay.setAttribute('aria-hidden', String(!active)); }
  if (button) button.setAttribute('aria-pressed', String(active));
}
function updateAimPreview(delta) {
  if (!aimMode || !aimTrajectoryLine || !camera) return;
  const bowAiming = resolveRpgItem(rpgState?.equipment?.weapon)?.kind === 'Arco';
  const source = bowAiming ? bowGroup : swordGroup;
  if (!source) return;
  aimCharge = Math.min(1.6, aimCharge + delta);
  const force = Math.round(aimCharge / 1.6 * 100);
  const forceLabel = document.getElementById('aim-force-label');
  if (forceLabel) forceLabel.textContent = 'POTENCIA ' + force + '%' + (bowAiming ? ' · FLECHAS ' + (getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,ARROW_ITEM_ID)||0) : '');
  if(bowNockedArrow)bowNockedArrow.visible=bowAiming&&(getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,ARROW_ITEM_ID)||0)>0;
  source.updateWorldMatrix(true, true);
  const start = source.getWorldPosition(new THREE.Vector3());
  const direction = camera.getWorldDirection(new THREE.Vector3()).normalize();
  if (bowAiming) {
    const aimYaw = Math.atan2(direction.x, direction.z);
    const yawDelta = Math.atan2(Math.sin(aimYaw - heroRoot.rotation.y), Math.cos(aimYaw - heroRoot.rotation.y));
    heroRoot.rotation.y += yawDelta * .22;
  }
  const velocity = direction.multiplyScalar(bowAiming ? 22 + force * .12 : 12 + force * .07);
  const gravity = bowAiming ? 9.8 : 6;
  if (bowAiming) {
    const draw = THREE.MathUtils.clamp(aimCharge / 1.2, 0, 1);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -1.08, .34);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.22, .34);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -.82 - draw * .28, .34);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, .16, .34);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.72 - draw * .3, .34);
    torso.rotation.y = smoothLerp(torso.rotation.y, -.08, .24);
  }
  const positions = aimTrajectoryLine.geometry.attributes.position;
  let visiblePoints = 1;
  positions.setXYZ(0, start.x, start.y, start.z);
  let previous = start;
  let blocked = false;
  for (let index = 1; index <= 33; index++) {
    const elapsed = index * .06;
    const point = new THREE.Vector3(
      start.x + velocity.x * elapsed,
      start.y + velocity.y * elapsed - .5 * gravity * elapsed * elapsed,
      start.z + velocity.z * elapsed
    );
    if (isProjectilePathBlocked(previous, point)) { blocked = true; break; }
    positions.setXYZ(index, point.x, point.y, point.z);
    visiblePoints++;
    previous = point;
    if (point.y <= .16) break;
  }
  positions.needsUpdate = true;
  aimTrajectoryLine.geometry.setDrawRange(0, visiblePoints);
  aimTrajectoryLine.material.color.set(blocked ? '#df8667' : '#f1d18a');
  aimTrajectoryLine.visible = true;
}
function createBowArrow() {
  const arrow = new THREE.Group();
  const shaftMaterial = new THREE.MeshStandardMaterial({ color:'#8b6944', roughness:.72, metalness:.08 });
  const headMaterial = new THREE.MeshStandardMaterial({ color:'#c7c8b8', roughness:.32, metalness:.68 });
  const featherMaterial = new THREE.MeshStandardMaterial({ color:'#d8bf79', roughness:.8, side:THREE.DoubleSide });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.014,.019,.78,6),shaftMaterial);
  shaft.rotation.x=Math.PI/2;shaft.position.z=-.02;arrow.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(.052,.17,5),headMaterial);
  head.rotation.x=Math.PI/2;head.position.z=.44;arrow.add(head);
  for(const side of [-1,1]){
    const feather=new THREE.Mesh(new THREE.ConeGeometry(.035,.18,4),featherMaterial);
    feather.rotation.set(Math.PI/2,0,side*.55);feather.position.set(side*.035,0,-.34);arrow.add(feather);
  }
  arrow.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  return arrow;
}
function spawnBowImpact(position) {
  audioManager?.playArrowImpact();
  for(let index=0;index<6;index++){
    const material=new THREE.MeshBasicMaterial({color:index%2?'#e8c76f':'#f0ead5',transparent:true,opacity:.95,toneMapped:false});
    const mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.035+Math.random()*.025),material);
    mesh.position.copy(position);scene.add(mesh);
    const angle=Math.random()*Math.PI*2,speed=1.2+Math.random()*2.2;
    bowImpactParticles.push({mesh,velocity:new THREE.Vector3(Math.cos(angle)*speed,.7+Math.random()*1.8,Math.sin(angle)*speed),life:.22+Math.random()*.16,maxLife:.38});
  }
}
function fireBowArrow() {
  if(!gameMode||gameMenuOpen||manualPaused||bowShotCooldown>0)return false;
  const weapon=resolveRpgItem(rpgState?.equipment?.weapon);
  if(weapon?.kind!=='Arco')return false;
  const arrowIndex=rpgState.inventory.indexOf(ARROW_ITEM_ID);
  if(arrowIndex<0){showToast('No tienes flechas de rafia.');return false;}
  bowGroup.updateWorldMatrix(true,true);
  const position=bowGroup.getWorldPosition(new THREE.Vector3());
  const direction=(aimMode?camera.getWorldDirection(new THREE.Vector3()):new THREE.Vector3(Math.sin(heroRoot.rotation.y),.08,Math.cos(heroRoot.rotation.y))).normalize();
  const force=aimMode?THREE.MathUtils.clamp(aimCharge/1.6,0,1):.35;
  const speed=aimMode?22+force*12:24;
  const arrow=createBowArrow();arrow.position.copy(position).addScaledVector(direction,.3);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);scene.add(arrow);
  const trailGeometry=new THREE.BufferGeometry().setFromPoints([arrow.position,arrow.position.clone().addScaledVector(direction,-.62)]);
  const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#ead39a',transparent:true,opacity:.68,depthWrite:false,toneMapped:false}));scene.add(trail);
  bowProjectiles.push({mesh:arrow,trail,velocity:direction.multiplyScalar(speed),life:2.4,damage:Math.round((weapon.damageMin+weapon.damageMax)*.5+Math.max(0,rpgState.attributes.str-5)*1.2+force*8)});
  removeRpgItem(rpgState.inventory,rpgState.inventoryStacks,arrowIndex,1);
  bowShotCooldown=.24;aimCharge=0;if(bowNockedArrow)bowNockedArrow.visible=aimMode&&(getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,ARROW_ITEM_ID)||0)>0;audioManager?.playBowShot();saveRpgProfile();
  if(activeGamePanel==='inventory')renderInventory();
  return true;
}
function removeBowProjectile(index) {
  const projectile=bowProjectiles[index];if(!projectile)return;
  scene.remove(projectile.mesh,projectile.trail);
  projectile.mesh.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose?.();});
  projectile.trail.geometry.dispose();projectile.trail.material.dispose();bowProjectiles.splice(index,1);
}
function updateBowProjectiles(delta) {
  bowShotCooldown=Math.max(0,bowShotCooldown-delta);
  for(let index=bowImpactParticles.length-1;index>=0;index--){
    const particle=bowImpactParticles[index];particle.life-=delta;particle.velocity.y-=5*delta;particle.mesh.position.addScaledVector(particle.velocity,delta);particle.mesh.material.opacity=Math.max(0,particle.life/particle.maxLife);
    if(particle.life<=0){scene.remove(particle.mesh);particle.mesh.geometry.dispose();particle.mesh.material.dispose();bowImpactParticles.splice(index,1);}
  }
  for(let index=bowProjectiles.length-1;index>=0;index--){
    const projectile=bowProjectiles[index];projectile.life-=delta;
    const previous=projectile.mesh.position.clone();projectile.velocity.y-=9.8*delta;
    const next=previous.clone().addScaledVector(projectile.velocity,delta);
    const segment=next.clone().sub(previous),segmentLengthSq=segment.lengthSq();let hit=null,hitDistance=Infinity;
    if(segmentLengthSq>.0001){
      for(const enemy of enemyCombatants){
        if(!enemy?.parent||!enemy.userData?.isEnemy||enemy.userData.health<=0||enemy.userData.isTrainingDummy||enemy.userData.ai?.worldDisabled)continue;
        enemy.getWorldPosition(aimPreviewPositions||(aimPreviewPositions=new THREE.Vector3()));
        const target=aimPreviewPositions.clone();target.y+=1.02;
        const amount=THREE.MathUtils.clamp(target.clone().sub(previous).dot(segment)/segmentLengthSq,0,1);
        const closest=previous.clone().addScaledVector(segment,amount),distance=target.distanceTo(closest);
        if(distance<.68&&amount<hitDistance){hit=enemy;hitDistance=amount;}
      }
    }
    const blocked=isProjectilePathBlocked(previous,next);
    if(hit&&!blocked){
      const direction=new THREE.Vector3(projectile.velocity.x,0,projectile.velocity.z).normalize();
      damageEnemy(hit,projectile.damage,direction,1.05);spawnBowImpact(next);showCombatFeedback('FLECHA · '+Math.round(projectile.damage));removeBowProjectile(index);continue;
    }
    projectile.mesh.position.copy(next);projectile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),projectile.velocity.clone().normalize());
    const trailPositions=projectile.trail.geometry.attributes.position;
    trailPositions.setXYZ(0,next.x,next.y,next.z);trailPositions.setXYZ(1,next.x-projectile.velocity.x*.065,next.y-projectile.velocity.y*.065,next.z-projectile.velocity.z*.065);trailPositions.needsUpdate=true;
    if(blocked||next.y<=.06){spawnBowImpact(next);removeBowProjectile(index);}
    else if(projectile.life<=0)removeBowProjectile(index);
  }
}
function syncWeaponActionButton() {
  const button = document.getElementById('weapon-button');
  const prompt = document.getElementById('weapon-prompt');
  if (!button) return;
  const bowEquipped=resolveRpgItem(rpgState?.equipment?.weapon)?.kind==='Arco';
  const distance = thrownWeapon ? Math.hypot(heroGroup.position.x - thrownWeapon.position.x, heroGroup.position.z - thrownWeapon.position.z) : Infinity;
  const label = bowEquipped?'ARCO':thrownWeaponReturning ? 'VOLVIENDO' : weaponThrown ? distance <= 1.65 ? 'RECOGER' : 'BUSCAR' : 'TIRAR';
  button.querySelector('.action-button-label').textContent = label;
  button.disabled = bowEquipped || thrownWeaponReturning || (!weaponThrown && !rpgState?.equipment?.weapon);
  button.setAttribute('aria-label', bowEquipped?'El arco dispara con el botón Atacar':thrownWeaponReturning ? 'La espada vuelve a tu mano' : weaponThrown ? distance <= 1.65 ? 'Recoger espada' : 'Buscar espada lanzada' : 'Lanzar espada equipada');
  if (prompt) {
    prompt.hidden = !weaponThrown;
    prompt.textContent = thrownWeaponReturning ? 'La espada vuelve a tu mano' : thrownWeaponEmbeddedTarget ? 'La espada quedó incrustada en el enemigo' : weaponThrown ? distance <= 1.65 ? 'Pulsa RECOGER para volver a equipar la espada' : 'Busca la espada · ' + distance.toFixed(1) + ' m' : '';
  }
}
function throwOrRecoverWeapon() {
  if (!gameMode || gameMenuOpen || manualPaused || shieldBash.phase !== 'IDLE') return;
  if(!weaponThrown&&resolveRpgItem(rpgState?.equipment?.weapon)?.kind==='Arco'){showToast('Pulsa A para disparar con el arco.');return;}
  if (weaponThrown) {
    if (thrownWeaponReturning || thrownWeaponEmbeddedTarget) return;
    const distance = thrownWeapon ? Math.hypot(heroGroup.position.x - thrownWeapon.position.x, heroGroup.position.z - thrownWeapon.position.z) : Infinity;
    if (!thrownWeapon || distance > 1.65) { showToast('Acércate a la espada para recogerla.'); return; }
    scene.remove(thrownWeapon);
    thrownWeapon = null;
    weaponThrown = false;
    thrownWeaponVelocity.set(0, 0, 0);
    syncEquippedVisuals();
    showToast('Espada recuperada y equipada.');
    recordTrainingAction('recover');
    if (tutorialActive && tutorialStep === 4 && tutorialWeaponWasThrown) showTutorialStep(5);
    return;
  }
  if (!rpgState?.equipment?.weapon || !swordGroup) { showToast('Equipa un arma antes de lanzarla.'); return; }
  swordGroup.updateWorldMatrix(true, true);
  const position = swordGroup.getWorldPosition(new THREE.Vector3());
  const rotation = swordGroup.getWorldQuaternion(new THREE.Quaternion());
  const scale = swordGroup.getWorldScale(new THREE.Vector3());
  thrownWeapon = swordGroup.clone(true);
  thrownWeapon.position.copy(position);
  thrownWeapon.quaternion.copy(rotation);
  thrownWeapon.scale.copy(scale);
  scene.add(thrownWeapon);
  const forward = aimMode ? camera.getWorldDirection(new THREE.Vector3()).normalize() : new THREE.Vector3(Math.sin(heroRoot.rotation.y), 0, Math.cos(heroRoot.rotation.y));
  const launchSpeed = aimMode ? 12 + Math.min(100, aimCharge / 1.6 * 100) * .07 : 12;
  thrownWeaponVelocity.set(forward.x * launchSpeed + movementVelocity.x * .55, aimMode ? forward.y * launchSpeed : 5.2, forward.z * launchSpeed + movementVelocity.y * .55);
  thrownWeaponTimer = 0;
  weaponThrown = true;
  thrownWeaponEmbeddedTarget = null;
  thrownWeaponEmbedTimer = 0;
  thrownWeaponReturning = false;
  if (aimMode) setPlayerAimMode(false);
  audioManager?.playLoadedSfx('knifeThrow', .44, .96 + Math.random() * .08);
  if (tutorialActive && tutorialStep === 4) tutorialWeaponWasThrown = true;
  syncEquippedVisuals();
  recordTrainingAction('throw');
  showToast('Espada lanzada. Ve hasta ella y pulsa RECOGER.');
}
function updateThrownWeapon(delta) {
  if (!weaponThrown || !thrownWeapon) return;
  if (thrownWeaponEmbeddedTarget) {
    thrownWeaponEmbedTimer -= delta;
    if (thrownWeaponEmbedTimer <= 0 || !thrownWeaponEmbeddedTarget.parent) {
      scene.attach(thrownWeapon);
      thrownWeaponEmbeddedTarget = null;
      thrownWeaponReturning = true;
    }
  }
  if (thrownWeaponReturning) {
    swordGroup.updateWorldMatrix(true, true);
    const handPosition = swordGroup.getWorldPosition(new THREE.Vector3());
    const toHand = handPosition.sub(thrownWeapon.position);
    const distanceToHand = toHand.length();
    if (distanceToHand <= .48) {
      scene.remove(thrownWeapon);
      thrownWeapon = null;
      weaponThrown = false;
      thrownWeaponReturning = false;
      thrownWeaponVelocity.set(0, 0, 0);
      syncEquippedVisuals();
      showToast('La espada vuelve a tu mano.');
      recordTrainingAction('recover');
      if (tutorialActive && tutorialStep === 4 && tutorialWeaponWasThrown) showTutorialStep(5);
      return;
    }
    thrownWeapon.position.addScaledVector(toHand.normalize(), Math.min(distanceToHand, delta * 17));
    thrownWeapon.quaternion.slerp(swordGroup.getWorldQuaternion(new THREE.Quaternion()), Math.min(1, delta * 8));
    syncWeaponActionButton();
    return;
  }
  if (thrownWeaponVelocity.lengthSq() > .01) {
    thrownWeaponTimer += delta;
    thrownWeaponVelocity.y -= 12 * delta;
    const nextPosition = thrownWeapon.position.clone().addScaledVector(thrownWeaponVelocity, delta);
    const blockedByWorld = isProjectilePathBlocked(thrownWeapon.position, nextPosition);
    const candidates = [...enemyCombatants, ...remotePlayers.values(), ...(trainingDummy ? [trainingDummy] : [])];
    const target = candidates.find(enemy => {
      if (!isLockTargetAlive(enemy) || (!enemy.userData.isTrainingDummy && isInSafePlaza(enemy.position))) return false;
      const targetPosition = enemy.getWorldPosition(new THREE.Vector3());
      targetPosition.y += .9;
      return targetPosition.distanceTo(nextPosition) < .82;
    });
    if (target && !blockedByWorld) {
      thrownWeapon.position.copy(nextPosition);
      const direction = thrownWeaponVelocity.clone().setY(0).normalize();
      if (target.userData.isTrainingDummy) registerTrainingDummyHit(target, direction);
      else if (target.userData.isPlayer) sendPlayerAttack(target.userData.playerId);
      else damageEnemy(target, 24 + physicalAttackBonus(), direction, .9);
      emitSwordClash(nextPosition);
      thrownWeaponVelocity.set(0, 0, 0);
      if (!target.userData.isTrainingDummy) {
        target.attach(thrownWeapon);
        thrownWeaponEmbeddedTarget = target;
        thrownWeaponEmbedTimer = .55;
      } else {
        thrownWeapon.position.y = .16;
      }
    } else if (blockedByWorld || thrownWeaponTimer > 2.2) {
      thrownWeaponVelocity.set(0, 0, 0);
      thrownWeapon.position.y = .16;
      thrownWeapon.rotation.x = 0;
      thrownWeapon.rotation.z = Math.PI / 2;
    } else {
      thrownWeapon.position.copy(nextPosition);
      thrownWeapon.rotation.x += delta * 12;
      thrownWeapon.rotation.z += delta * 8;
    }
    if (thrownWeapon.position.y < .16) {
      thrownWeapon.position.y = .16;
      thrownWeaponVelocity.set(0, 0, 0);
      thrownWeapon.rotation.x = 0;
      thrownWeapon.rotation.z = Math.PI / 2;
    }
  }
  syncWeaponActionButton();
}
function claimStoryPendingItems(){if(!rpgState?.story?.pendingItems)return;while(rpgState.story.pendingItems.length&&rpgState.inventory.length<BACKPACK_CAPACITY)rpgState.inventory.push(rpgState.story.pendingItems.shift());}
function renderInventory(){
  if(!rpgState)return;
  claimStoryPendingItems();
  syncEquippedVisuals();
  renderItemGrid(document.getElementById('equipment-grid'),'equipment',EQUIPMENT_SLOTS.map(([slot])=>rpgState.equipment[slot]),{getItem:id=>RPG_ITEMS[id],count:EQUIPMENT_SLOTS.length,slotKeys:EQUIPMENT_SLOTS.map(([slot])=>slot),emptyLabel:'Ranura vacía'});
  renderItemGrid(document.getElementById('backpack-grid'),'backpack',rpgState.inventory,{getItem:id=>RPG_ITEMS[id],getQuantity:id=>id===ARROW_ITEM_ID?getStackQuantity(rpgState.inventory,rpgState.inventoryStacks,id):null,count:BACKPACK_CAPACITY,emptyLabel:'Casilla vacía',actionLabel:item=>item?.effects?'Usar':''});
  const weight=totalCarryWeight(),max=derivedCharacterStats().maxWeight;document.getElementById('gold-value').textContent=rpgState.gold+' GP';document.getElementById('weight-value').textContent=weight.toFixed(1)+' / '+max+' kg';document.getElementById('weight-fill').style.width=Math.min(100,weight/max*100)+'%';document.getElementById('inventory-tooltip').hidden=true;
}
function equipBackpackItem(index){const id=rpgState.inventory[index],item=RPG_ITEMS[id];if(!item?.slot||item.level>rpgState.level)return;const previous=rpgState.equipment[item.slot];rpgState.equipment[item.slot]=id;rpgState.inventory.splice(index,1);if(previous)rpgState.inventory.splice(index,0,previous);recordStoryWeaponEquipped(id);saveRpgProfile();renderInventory();renderCharacterSheet();renderTooltip(id);}
function unequipSlot(slot){const id=rpgState.equipment[slot];if(!id||rpgState.inventory.length>=BACKPACK_CAPACITY)return;rpgState.inventory.push(id);rpgState.equipment[slot]=null;saveRpgProfile();renderInventory();renderCharacterSheet();}
function refreshRpgWindows(){renderCharacterSheet();renderSkills();renderInventory();renderStoryJournal();document.getElementById('pause-game-button').textContent=manualPaused?'Reanudar juego':'Pausar juego';const settings=rpgState.settings;document.getElementById('music-volume').value=settings.music;document.getElementById('sfx-volume').value=settings.sfx;document.getElementById('music-volume-value').textContent=settings.music+'%';document.getElementById('sfx-volume-value').textContent=settings.sfx+'%';document.getElementById('temple-count').value=settings.temples;document.getElementById('temple-count-value').textContent=settings.temples+' / 2';document.getElementById('view-distance').value=settings.viewDistance;document.getElementById('view-distance-value').textContent=settings.viewDistance+' m';document.getElementById('resolution-scale').value=settings.resolution;document.getElementById('resolution-scale-value').textContent=settings.resolution+'%';document.getElementById('shadows-toggle').checked=settings.shadows;}
function openGamePanel(name){if(!gameMode)return;setPlayerAimMode(false);quickMenuOpen=false;document.querySelector('.quick-menu').classList.remove('expanded');document.getElementById('quick-menu-toggle').setAttribute('aria-expanded','false');document.querySelectorAll('.arpg-window').forEach(panel=>{panel.hidden=panel.id!=='window-'+name;});const backdrop=document.getElementById('arpg-backdrop');backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false');document.getElementById('screen-gameplay').classList.add('menu-open');gameMenuOpen=true;activeGamePanel=name;window.gameKeys={};joystickVector.x=0;joystickVector.y=0;if(joystickPointer!==null){try{document.getElementById('joystick-base').releasePointerCapture(joystickPointer);}catch(error){}joystickPointer=null;}cameraDragPointer=null;cameraDragLast=null;document.querySelector('#joystick-base .joystick-thumb').style.transform='translate(0, 0)';refreshRpgWindows();document.querySelector('#window-'+name+' .window-close')?.focus({preventScroll:true});}
function closeGamePanel(){if(!activeGamePanel)return;document.getElementById('window-'+activeGamePanel).hidden=true;const backdrop=document.getElementById('arpg-backdrop');backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true');document.getElementById('screen-gameplay').classList.remove('menu-open');document.getElementById('inventory-tooltip').hidden=true;activeGamePanel=null;gameMenuOpen=false;document.getElementById('pause-overlay').hidden=!manualPaused;}
function toggleQuickMenu(){quickMenuOpen=!quickMenuOpen;document.querySelector('.quick-menu').classList.toggle('expanded',quickMenuOpen);document.getElementById('quick-menu-toggle').setAttribute('aria-expanded',String(quickMenuOpen));document.getElementById('quick-menu-toggle').setAttribute('aria-label',quickMenuOpen?'Cerrar menú':'Abrir menú');}
function handleGameMenuShortcut(event){if(!gameMode)return false;const key=event.key.toLowerCase(),panel=key==='i'||key==='b'?'inventory':key==='c'?'character':key==='k'?'skills':null;if(event.key==='Escape'){event.preventDefault();if(activeGamePanel)closeGamePanel();else openGamePanel('settings');return true;}if(panel){event.preventDefault();if(activeGamePanel===panel)closeGamePanel();else openGamePanel(panel);return true;}return false;}
function setMusicVolume(value){if(!audioManager)return;audioManager.musicVolume=value/100;if(!audioManager.context||!audioManager.musicBus||!audioManager.gameBus)return;const now=audioManager.context.currentTime,active=audioManager.activeTheme==='gameplay'?audioManager.gameBus:audioManager.musicBus;active.gain.cancelScheduledValues(now);active.gain.setTargetAtTime(.44*audioManager.musicVolume,now,.04);audioManager.switchWorldAmbience(currentWorldId);}
function setSfxVolume(value){if(!audioManager)return;audioManager.sfxVolume=value/100;if(audioManager.effectsBus&&audioManager.context)audioManager.effectsBus.gain.setTargetAtTime(audioManager.sfxVolume,audioManager.context.currentTime,.04);}
function applyProfileAudioSettings(){if(!rpgState)return;setMusicVolume(rpgState.settings.music);setSfxVolume(rpgState.settings.sfx);}
function requestedRenderPixelRatio(){const resolution=Math.max(.75,(rpgState?.settings?.resolution??75)/100);return graphicsMaxPixelRatio*resolution*renderQualityScale;}
function updateAdaptiveRenderQuality(delta){renderFrameTime+=delta;renderFrameCount++;if(renderFrameTime<1.5||!renderer)return;const average=renderFrameTime/renderFrameCount;const previous=renderQualityScale;if(average>.021)renderQualityScale=Math.max(.68,renderQualityScale*.88);else if(average<.017)renderQualityScale=Math.min(1,renderQualityScale+.05);renderFrameTime=0;renderFrameCount=0;if(Math.abs(previous-renderQualityScale)>.015)renderer.setPixelRatio(requestedRenderPixelRatio());}
function applyGraphicsSettings(){const settings=rpgState?.settings||{viewDistance:20,resolution:75,shadows:false};settings.shadows=false;if(rpgState?.settings)rpgState.settings.shadows=false;if(camera){camera.far=settings.viewDistance;camera.updateProjectionMatrix();}if(renderer){renderer.setPixelRatio(requestedRenderPixelRatio());renderer.shadowMap.enabled=false;resizeScene();}const shadowsToggle=document.getElementById('shadows-toggle');if(shadowsToggle){shadowsToggle.checked=false;shadowsToggle.disabled=true;}}
function saveGame(){if(trainingMode){showToast('La práctica no modifica ni guarda tu progreso.');return;}const profile=getSelectedProfile();if(!profile||!rpgState)return;const date=new Date().toLocaleDateString('es');profile.rpgData=rpgState;profile.lastSavedLevel=rpgState.level;profile.lastSavedDate=date;if(!Array.isArray(profile.saveSlots))profile.saveSlots=[null,null,null,null];profile.saveSlots[0]={level:rpgState.level,date,position:{x:heroGroup.position.x,z:heroGroup.position.z},cameraYaw,cameraPitch,rpgData:rpgState};saveProfiles();showToast('Partida guardada · '+date);}
function loadSavedGame(){const profile=getSelectedProfile(),saved=profile?.saveSlots?.find(Boolean);if(!saved)return;if(saved.rpgData)profile.rpgData=saved.rpgData;startAdventure(saved);}
function bindRpgUi(){
  document.getElementById('quick-menu-toggle').addEventListener('click',toggleQuickMenu);
  document.querySelectorAll('[data-character-switch]').forEach(button=>button.addEventListener('click',()=>setActiveCharacter(button.dataset.characterSwitch)));
  document.querySelectorAll('#quick-menu-items [data-panel]').forEach(button=>button.addEventListener('click',()=>openGamePanel(button.dataset.panel)));
  document.querySelectorAll('.window-close').forEach(button=>button.addEventListener('click',closeGamePanel));
  document.getElementById('arpg-backdrop').addEventListener('click',event=>{if(event.target.id==='arpg-backdrop')closeGamePanel();});
  document.getElementById('character-sheet').addEventListener('click',event=>{const button=event.target.closest('[data-attribute]');if(!button||!rpgState||rpgState.attributePoints<1)return;const key=button.dataset.attribute;rpgState.attributes[key]++;rpgState.attributePoints--;saveRpgProfile();renderCharacterSheet();renderInventory();});
  document.getElementById('music-volume').addEventListener('input',event=>{const value=Number(event.target.value);rpgState.settings.music=value;document.getElementById('music-volume-value').textContent=value+'%';setMusicVolume(value);saveRpgProfile();});
  document.getElementById('sfx-volume').addEventListener('input',event=>{const value=Number(event.target.value);rpgState.settings.sfx=value;document.getElementById('sfx-volume-value').textContent=value+'%';setSfxVolume(value);saveRpgProfile();});
  document.getElementById('temple-count').addEventListener('input',event=>{churchRenderLimit=Math.max(1,Math.min(2,Number(event.target.value)||1));rpgState.settings.temples=churchRenderLimit;document.getElementById('temple-count-value').textContent=churchRenderLimit+' / 2';updateTempleVisibility(0,true);saveRpgProfile();});
  document.getElementById('view-distance').addEventListener('input',event=>{const value=Math.max(20,Math.min(80,Number(event.target.value)||20));rpgState.settings.viewDistance=value;document.getElementById('view-distance-value').textContent=value+' m';applyGraphicsSettings();saveRpgProfile();});
  document.getElementById('resolution-scale').addEventListener('input',event=>{const value=Math.max(40,Math.min(100,Number(event.target.value)||50));rpgState.settings.resolution=value;document.getElementById('resolution-scale-value').textContent=value+'%';applyGraphicsSettings();saveRpgProfile();});
  document.getElementById('shadows-toggle').addEventListener('change',event=>{rpgState.settings.shadows=event.target.checked;applyGraphicsSettings();saveRpgProfile();});
  document.getElementById('pause-game-button').addEventListener('click',()=>{manualPaused=!manualPaused;if(trainingMode)trainingCourse.setPaused(manualPaused);closeGamePanel();if(!manualPaused)document.getElementById('pause-overlay').hidden=true;});
  document.getElementById('resume-game-button').addEventListener('click',()=>{manualPaused=false;if(trainingMode)trainingCourse.setPaused(false);document.getElementById('pause-overlay').hidden=true;});
  document.getElementById('save-game-button').addEventListener('click',saveGame);
  document.getElementById('return-to-main-menu-button').addEventListener('click',saveAndReturnToMainMenu);
  document.getElementById('leave-session-button').addEventListener('click',()=>leaveCurrentMultiplayerSession(false));
  document.getElementById('close-lobby-button').addEventListener('click',()=>leaveCurrentMultiplayerSession(true));
}
bindRpgUi();
setupUnifiedItemGrid();
function bindTrainingUi() {
  const lessonSelect = document.getElementById('training-lesson-select');
  COMBAT_TRAINING_LESSONS.forEach((lesson, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = lesson.title;
    lessonSelect.append(option);
  });
  document.getElementById('training-entry-button').addEventListener('click', startTrainingFromMenu);
  document.getElementById('training-start-button').addEventListener('click', () => {
    if (trainingMode) { trainingCourse.start(); closeGamePanel(); return; }
    startTrainingFromGameplay();
  });
  document.getElementById('training-exit-button').addEventListener('click', exitTrainingSession);
  document.getElementById('training-hud-exit-button').addEventListener('click', exitTrainingSession);
  document.getElementById('training-repeat-button').addEventListener('click', () => trainingCourse.repeat());
  document.getElementById('training-skip-button').addEventListener('click', () => trainingCourse.skip());
  document.getElementById('training-continue-button').addEventListener('click', () => {
    if (trainingCourse.continue()) showToast('Curso completado. Puedes salir o repetir una lección.');
  });
  document.getElementById('training-pause-button').addEventListener('click', () => {
    manualPaused = !manualPaused;
    trainingCourse.setPaused(manualPaused);
    document.getElementById('pause-overlay').hidden = !manualPaused;
  });
  document.getElementById('training-help-button').addEventListener('click', () => {
    trainingHelpVisible = !trainingHelpVisible;
    updateTrainingHud();
  });
  document.getElementById('training-help-toggle').addEventListener('change', event => {
    trainingHelpVisible = event.target.checked;
    updateTrainingHud();
  });
  document.getElementById('training-debug-toggle').addEventListener('change', event => {
    trainingDebugEnabled = event.target.checked;
    updateTrainingDebug();
  });
  document.getElementById('training-lesson-select').addEventListener('change', event => {
    trainingSelectedLesson = Number(event.target.value);
    if (trainingMode) {
      trainingCourse.select(trainingSelectedLesson);
      if (trainingCourse.index === COMBAT_TRAINING_LESSONS.length - 1) ensureTrainingGroup();
    }
  });
  document.getElementById('training-ai-mode').addEventListener('change', event => {
    trainingAiStyle = event.target.value;
    if (trainingEnemy?.userData.ai) trainingEnemy.userData.ai.trainingStyle = trainingAiStyle;
    for (const enemy of trainingExtraEnemies) if (enemy.userData.ai) enemy.userData.ai.trainingStyle = trainingAiStyle;
  });
}
bindTrainingUi();
document.getElementById('interaction-prompt').addEventListener('click',()=>{if(nearbyGroundLoot)openGroundLootPanel();else interactNpc();});
document.getElementById('cinematic-next').addEventListener('click',advanceWalpiraOpeningCinematic);
document.getElementById('cinematic-skip').addEventListener('click',finishWalpiraOpeningCinematic);

function getSafePlayerSpawn(savedPosition = null) {
  const fallback = { x: 0, y: 0, z: 7.4 };
  if (!savedPosition || !Number.isFinite(savedPosition.x) || !Number.isFinite(savedPosition.z)) return fallback;
  const candidate = { x: savedPosition.x, y: savedPosition.y ?? 0, z: savedPosition.z };
  if (!isTownPositionBlocked(candidate.x, candidate.z)) return candidate;
  return fallback;
}
function isGameFullscreen() {
  return document.fullscreenElement === document.documentElement || document.webkitFullscreenElement === document.documentElement;
}
function requestGameFullscreen() {
  if (window.matchMedia('(pointer: coarse)').matches && screen.orientation?.lock) {
    try { screen.orientation.lock('landscape').catch(() => {}); } catch (error) {}
  }
  if (!mobileLandscapeQuery.matches || isGameFullscreen()) return Promise.resolve(true);
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!request) return Promise.resolve(false);
  try { return Promise.resolve(request.call(root)).then(() => true, () => false); }
  catch (error) { return Promise.resolve(false); }
}
function syncGameFullscreen() {
  if (!gameMode) return;
  if (mobileLandscapeQuery.matches) {
    fullscreenRetryPending = true;
    requestGameFullscreen().then(success => { if (success) fullscreenRetryPending = false; });
    return;
  }
  fullscreenRetryPending = false;
  if (!isGameFullscreen()) return;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit) Promise.resolve(exit.call(document)).catch(() => {});
}
mobileLandscapeQuery.addEventListener?.('change', syncGameFullscreen);
if (!mobileLandscapeQuery.addEventListener) mobileLandscapeQuery.addListener(syncGameFullscreen);
document.addEventListener('pointerdown', () => {
  if (!gameMode || !fullscreenRetryPending || !mobileLandscapeQuery.matches) return;
  requestGameFullscreen().then(success => { if (success) fullscreenRetryPending = false; });
});
function enterGameplay(saved = null) {
  gameMode = true;
  gameMenuOpen = false; manualPaused = false; activeGamePanel = null;
  document.getElementById('arpg-backdrop').classList.remove('open');
  document.getElementById('pause-overlay').hidden = true;
  document.getElementById('screen-gameplay').classList.remove('menu-open');
  syncSettingsSessionButtons();
  const newGameHomePosition = !saved && rpgState?.story?.prologuePending ? WALPIRA_HOME_SPAWN : null;
  const forestStartPosition = !saved && currentWorldId === 'forest' && forestScene ? { x: forestScene.entry.x, y: forestScene.entry.y, z: forestScene.entry.z } : null;
  const savedPosition = gameSessionMode === 'multiplayer' && multiplayerSpawn ? multiplayerSpawn : saved?.position || newGameHomePosition || forestStartPosition;
  const safeSpawn = getSafePlayerSpawn(savedPosition);
  heroGroup.position.set(safeSpawn.x, safeSpawn.y, safeSpawn.z);
  heroGroup.rotation.y = Math.PI;
  comboStreak = 0; attackDidHit = false; activeAttackTarget = null;
  setLockedEnemy(null);
  refreshLockCandidates(true);
  updateComboStreakDisplay();
  hips.position.y = .95;
  comboState = 'IDLE'; comboHit = 0; comboQueued = false; heavyAttackActive = false;
  comboElapsed = 0; comboInputWindow = 0; comboRecoveryWindowStarted = false; attackStepApplied = 0; activeAttackPoses = null;
  hitStopTimer = 0;
  movementVelocity.set(0, 0);
  const profile = getSelectedProfile();
  rpgState = profile ? ensureRpgState(profile) : null;
  syncEquippedVisuals();
  renderMainQuestHud();
  heroHealth = playerMaxHealth(); if (gameSessionMode === 'solo') invulnerabilityExpiresAt = performance.now() + PLAYER_INVULNERABILITY_MS; heroStunTimer = 0; dashTimer = 0; dashCooldown = 0; playerPowerCooldowns = Object.create(null); dashInvulnerability = 0; dashBufferTimer = 0; jumpBufferTimer = 0; airDashAvailable = true; attackHeld = false; risingSlashGestureTimer = 0;
  dashInertia = { active: false, direction: new THREE.Vector2(), charge: 0, elapsed: 0 };
  shieldBash = { phase: 'IDLE', elapsed: 0, direction: new THREE.Vector2(), speed: 0, power: 0, hitTargets: new Set() };
  joystickGesture.active = false; joystickGesture.pointerId = null;
  risingSlash = { phase: 'IDLE', target: null, elapsed: 0, impactDone: false, trailStarted: false };
  cameraShakeTimer = 0; cameraShakeDuration = 0; cameraShakeStrength = 0;
  updatePlayerHealthHud();
  footstepTimer = 0;
  cameraDragPointer = null; cameraDragLast = null; pointerDownPosition = null; lastScreenTap = null;
  joystickVector.x = 0; joystickVector.y = 0;
  jumpActive = false; jumpElapsed = 0; jumpPhase = 'ground'; jumpLandTimer = 0; verticalVelocity = 0; jumpStartedWithForward = false;
  gaitWeight = 0; runWeight = 0; brakingWeight = 0; previousMovementSpeed = 0; leftFootPlant.planted = false; rightFootPlant.planted = false;
  joystickVector.x = 0; joystickVector.y = 0;
  cameraYawVelocity = 0; cameraPitchVelocity = 0;
  document.querySelector('#joystick-base .joystick-thumb').style.transform = 'translate(0, 0)';
  cameraYaw = 0; cameraPitch = 0;
  if (gameSessionMode === 'solo') setMultiplayerStatus('MODO SOLO · SIN CONEXIÓN');
  renderQuickSkills();
  if (thrownWeapon) scene.remove(thrownWeapon);
  thrownWeapon = null; weaponThrown = false; thrownWeaponTimer = 0; thrownWeaponVelocity.set(0, 0, 0);
  shieldButtonHeld = false; shieldParryTimer = 0;
  churchRenderLimit = rpgState?.settings.temples ?? 2;
  updateTempleVisibility(0, true);
  applyProfileAudioSettings();
  applyGraphicsSettings();
  document.getElementById('hud-profile').textContent = gameSessionMode === 'multiplayer' ? multiplayerName : getPlayerCharacterName();
  document.getElementById('hud-level').textContent = String(rpgState?.level || 1);
  cameraYaw = saved?.cameraYaw ?? 0; cameraPitch = saved?.cameraPitch ?? 0;
  const openingScene = !saved && rpgState?.story?.prologuePending && currentWorldId === 'forest';
  camera.position.set(heroGroup.position.x, openingScene ? 2 : 5.8, heroGroup.position.z + (openingScene ? 5.2 : 8));
  cameraTarget.set(heroGroup.position.x, openingScene ? 1.2 : 1.1, heroGroup.position.z);
  cameraFocusGoal.copy(cameraTarget);
  camera.lookAt(cameraTarget);
  showScreen('screen-gameplay');
  if (arenaPending) {
    activateArenaSession();
  } else if (trainingPending) {
    trainingPending = false;
    activateTrainingArena();
  } else if (!trainingMode) beginTutorial();
}
function startAdventure(saved = null) {
  if (gameSessionMode === 'multiplayer' && !multiplayerPlayerId) { showToast('Crea o únete a una partida para continuar.'); return; }
  if (!saved && rpgState?.story?.prologuePending && currentWorldId !== 'forest') {
    enterLamentForest();
  }
  if (window.matchMedia('(pointer: coarse)').matches) requestGameFullscreen();
  if (mobileLandscapeQuery.matches) {
    fullscreenRetryPending = true;
    requestGameFullscreen().then(success => { if (success) fullscreenRetryPending = false; });
  }
  applyPlayerCharacterDesign();
  if (!audioManager) audioManager = new AudioManager();
  audioManager.initialize();
  enterGameplay(saved);
}
function refreshLockCandidates(force = false) {
  if (!force && lockCandidateRefresh > 0) return;
  lockCandidateRefresh = .8;
  lockCandidates.length = 0;
  scene.traverseVisible(object => {
    if (isLockableTarget(object) && object.parent) lockCandidates.push(object);
  });
}
function isLockableTarget(object) {
  const data = object?.userData;
  return Boolean(data?.isLockTarget || data?.isEnemy || data?.isAnimal || data?.isPlayer || data?.npc);
}
function lockTargetKind(data) {
  if (data.isPlayer) return 'Jugador';
  if (data.isAnimal) return data.species || 'Animal';
  if (data.isEnemy) return data.isTrainingDummy ? 'Entrenamiento' : 'Enemigo';
  return 'NPC';
}
function isLockTargetAlive(enemy) {
  return Boolean(enemy?.parent && isLockableTarget(enemy) && (enemy.userData.health == null || enemy.userData.health > 0));
}
function enemyHasLineOfSight(enemy) {
  if (!cameraBlockers.length && currentWorldId !== 'forest') return true;
  heroRoot.getWorldPosition(lockPlayerPosition);
  lockPlayerPosition.y += 1.2;
  enemy.getWorldPosition(lockEnemyPosition);
  lockEnemyPosition.y += 1.05;
  lockRayDirection.subVectors(lockEnemyPosition, lockPlayerPosition);
  const distance = lockRayDirection.length();
  if (distance < .01) return true;
  lockRayDirection.normalize();
  if (!cameraBlockers.length) {
    const sampleCount = Math.ceil(distance / .35);
    for (let step = 1; step < sampleCount; step++) {
      const progress = step / sampleCount;
      const x = THREE.MathUtils.lerp(lockPlayerPosition.x, lockEnemyPosition.x, progress);
      const z = THREE.MathUtils.lerp(lockPlayerPosition.z, lockEnemyPosition.z, progress);
      if (isTownPositionBlocked(x, z)) return false;
    }
    return true;
  }
  cameraCollisionRaycaster.set(lockPlayerPosition, lockRayDirection);
  cameraCollisionRaycaster.far = distance;
  return !cameraCollisionRaycaster.intersectObjects(cameraBlockers, false).some(hit => hit.object.userData.enemyOwner !== enemy);
}
function targetInCameraView(enemy, margin = .06) {
  enemy.getWorldPosition(lockEnemyPosition);
  lockEnemyPosition.y += 1.15;
  lockScreenPoint.copy(lockEnemyPosition).project(camera);
  return lockScreenPoint.z > -1 && lockScreenPoint.z < 1 && Math.abs(lockScreenPoint.x) < 1 + margin && Math.abs(lockScreenPoint.y) < 1 + margin;
}
function isLockTargetValid(enemy) {
  if (!isLockTargetAlive(enemy)) return false;
  enemy.getWorldPosition(lockEnemyPosition);
  heroRoot.getWorldPosition(lockPlayerPosition);
  if (Math.hypot(lockEnemyPosition.x - lockPlayerPosition.x, lockEnemyPosition.z - lockPlayerPosition.z) > LOCK_ON_CONFIG.maxRange) return false;
  return enemyHasLineOfSight(enemy);
}
function chooseLockTarget(exclude = null) {
  if (!heroRoot) return null;
  refreshLockCandidates();
  camera.updateMatrixWorld();
  let bestTarget = null, bestScore = Infinity;
  for (const enemy of lockCandidates) {
    if (enemy === exclude || !isLockTargetValid(enemy)) continue;
    const distance = Math.hypot(lockEnemyPosition.x - lockPlayerPosition.x, lockEnemyPosition.z - lockPlayerPosition.z);
    const inView = targetInCameraView(enemy);
    const screenPenalty = inView ? Math.hypot(lockScreenPoint.x, lockScreenPoint.y) * .24 : .48;
    const score = distance / LOCK_ON_CONFIG.maxRange * .72 + screenPenalty;
    if (score < bestScore) { bestScore = score; bestTarget = enemy; }
  }
  return bestTarget;
}
function setLockedEnemy(enemy) {
  if (enemy && !isLockTargetValid(enemy)) {
    showToast('No puedes fijar un objetivo oculto o fuera de alcance.');
    return;
  }
  const previousTarget = lockedEnemy;
  const hadTarget = Boolean(previousTarget);
  lockedEnemy = enemy;
  if (trainingMode) {
    if (!enemy && previousTarget) recordTrainingAction('unlock');
    else if (enemy && !previousTarget) recordTrainingAction('lock');
    else if (enemy && previousTarget && previousTarget !== enemy) recordTrainingAction('retarget');
  }
  const lockButton = document.getElementById('lock-target-toggle');
  const lockLabel = document.getElementById('lock-target-label');
  lockButton?.classList.toggle('locked', Boolean(enemy));
  lockButton?.setAttribute('aria-pressed', String(Boolean(enemy)));
  lockButton?.setAttribute('aria-label', enemy ? 'Desfijar objetivo' : 'Fijar objetivo');
  if (lockLabel) lockLabel.textContent = enemy ? 'DESFIJAR' : 'FIJAR';
  lockVisibilityTimer = 0;
  lockCheckTimer = 0;
  refreshLockedEnemyHud();
  for (const combatant of enemyCombatants) {
    if (combatant.userData.healthBar?.sprite) combatant.userData.healthBar.sprite.visible = Boolean(enemy && combatant !== enemy && combatant.userData.health > 0);
  }
  if (!enemy) {
    lockCameraYawOffset = 0;
    if (lockIndicator) lockIndicator.visible = false;
    return;
  }
  if (lockIndicator) lockIndicator.visible = true;
  if (tutorialActive && tutorialStep === 5) showTutorialStep(6);
  enemy.getWorldPosition(lockEnemyPosition);
  const dx = heroRoot.position.x - lockEnemyPosition.x, dz = heroRoot.position.z - lockEnemyPosition.z;
  if (!hadTarget) {
    lockCameraYawOffset = 0;
    cameraYaw = Math.atan2(dx, dz);
  }
}
function toggleLockOn() {
  if (lockedEnemy) { setLockedEnemy(null); return; }
  const enemy = chooseLockTarget();
  if (enemy) setLockedEnemy(enemy);
  else showToast('No hay objetivos cercanos para fijar.');
}
function toggleLockOnAtScreen(x, y) {
  if (lockedEnemy) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    refreshLockCandidates(true);
    camera.updateMatrixWorld();
    npcRaycaster.setFromCamera(pointer, camera);
    const hit = npcRaycaster.intersectObjects(lockCandidates, true).find(entry => {
      let enemy = entry.object;
      while (enemy && !isLockableTarget(enemy)) enemy = enemy.parent;
      return enemy === lockedEnemy;
    });
    if (hit) { setLockedEnemy(null); return; }
  }
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
  refreshLockCandidates(true);
  camera.updateMatrixWorld();
  npcRaycaster.setFromCamera(pointer, camera);
  const hit = npcRaycaster.intersectObjects(lockCandidates, true).find(entry => {
    let enemy = entry.object;
    while (enemy && !isLockableTarget(enemy)) enemy = enemy.parent;
    return enemy && isLockTargetValid(enemy);
  });
  if (hit) {
    let enemy = hit.object;
    while (enemy && !isLockableTarget(enemy)) enemy = enemy.parent;
    if (enemy) { setLockedEnemy(enemy); return; }
  }
  toggleLockOn();
}
function changeLockTarget(side) {
  if (!lockedEnemy || gamepadSwitchCooldown > 0) return;
  refreshLockCandidates();
  lockedEnemy.getWorldPosition(lockEnemyPosition);
  const baseX = lockEnemyPosition.x - heroRoot.position.x, baseZ = lockEnemyPosition.z - heroRoot.position.z;
  const baseLength = Math.hypot(baseX, baseZ) || 1;
  const rightX = Math.cos(cameraYaw), rightZ = -Math.sin(cameraYaw);
  let bestTarget = null, bestScore = Infinity;
  for (const enemy of lockCandidates) {
    if (enemy === lockedEnemy || !isLockTargetValid(enemy)) continue;
    enemy.getWorldPosition(lockEnemyPosition);
    const dx = lockEnemyPosition.x - heroRoot.position.x, dz = lockEnemyPosition.z - heroRoot.position.z;
    const distance = Math.hypot(dx, dz);
    const sideAmount = ((dx * rightX + dz * rightZ) / Math.max(distance, .01)) * side;
    if (sideAmount < LOCK_ON_CONFIG.retargetSideBias) continue;
    const angularDifference = 1 - THREE.MathUtils.clamp((dx * baseX + dz * baseZ) / (distance * baseLength), -1, 1);
    const score = angularDifference + distance / LOCK_ON_CONFIG.maxRange * .18 - sideAmount * .12;
    if (score < bestScore) { bestScore = score; bestTarget = enemy; }
  }
  if (bestTarget) { setLockedEnemy(bestTarget); gamepadSwitchCooldown = .28; }
}
function updateLockOn(delta) {
  lockCandidateRefresh = Math.max(0, lockCandidateRefresh - delta);
  gamepadSwitchCooldown = Math.max(0, gamepadSwitchCooldown - delta);
  if (!lockedEnemy) return;
  if (!isLockTargetValid(lockedEnemy)) {
    const replacement = chooseLockTarget(lockedEnemy);
    setLockedEnemy(replacement);
    return;
  }
  lockCheckTimer -= delta;
  if (lockCheckTimer <= 0) {
    lockCheckTimer = .22;
    if (enemyHasLineOfSight(lockedEnemy)) lockVisibilityTimer = 0;
    else lockVisibilityTimer += .22;
    if (lockVisibilityTimer >= LOCK_ON_CONFIG.visibilityGrace) {
      const replacement = chooseLockTarget(lockedEnemy);
      setLockedEnemy(replacement);
      return;
    }
  }
  if (lockIndicator) {
    lockedEnemy.getWorldPosition(lockEnemyPosition);
    lockIndicator.position.set(lockEnemyPosition.x, .075, lockEnemyPosition.z);
  }
  refreshLockedEnemyHud();
}
function acquireCombatTarget(maxRange = 3.5) {
  if (lockedEnemy && isLockTargetValid(lockedEnemy)) return lockedEnemy;
  if (!heroRoot || isInSafePlaza(heroRoot.position)) return null;
  refreshLockCandidates();
  const forwardX = Math.sin(heroRoot.rotation.y), forwardZ = Math.cos(heroRoot.rotation.y);
  let bestTarget = null, bestScore = Infinity;
  for (const enemy of lockCandidates) {
    if (!isLockTargetAlive(enemy)) continue;
    enemy.getWorldPosition(lockEnemyPosition);
    const dx = lockEnemyPosition.x - heroRoot.position.x, dz = lockEnemyPosition.z - heroRoot.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .2 || distance > maxRange) continue;
    const facing = (dx * forwardX + dz * forwardZ) / distance;
    if (facing < .28) continue;
    const score = distance - facing * .45;
    if (score < bestScore) { bestScore = score; bestTarget = enemy; }
  }
  return bestTarget;
}
function updateComboStreakDisplay(missed = false) {
  const display = document.getElementById('combat-streak');
  document.getElementById('combo-streak-count').textContent = String(comboStreak);
  display.classList.remove('landed', 'missed');
  if (missed) display.classList.add('missed');
  else { void display.offsetWidth; display.classList.add('landed'); }
}
function showCombatFeedback(text, missed = false) {
  const feedback = document.getElementById('combat-hit-feedback');
  feedback.textContent = text;
  feedback.classList.toggle('miss', missed);
  feedback.classList.remove('show');
  void feedback.offsetWidth;
  feedback.classList.add('show');
}
function registerCombatImpact(damage, critical = false, impactPower = 1, showFeedback = true, hitStop = .075) {
  if (attackDidHit) return;
  attackDidHit = true;
  comboStreak++;
  updateComboStreakDisplay();
  if (showFeedback) showCombatFeedback((critical ? 'CRÍTICO' : 'IMPACTO') + ' · ' + Math.round(damage));
  audioManager?.playSwordImpact(critical ? Math.max(1.25, impactPower) : impactPower);
  audioManager?.playHeroVoice('impact');
  hitStopTimer = Math.max(hitStopTimer, hitStop);
}
function hasForwardCombatInput() {
  const keys = window.gameKeys || {};
  const gamepad = navigator.getGamepads?.()[0];
  return Boolean(keys.ArrowUp || keys.w || joystickVector.y > .48 || (gamepad?.axes?.[1] ?? 0) < -.48);
}
function isMediaLunaDownAttackInput() {
  const keys = window.gameKeys || {};
  const gamepadY = navigator.getGamepads?.()[0]?.axes?.[1] || 0;
  const guarding = Boolean(shieldButtonHeld || keys.Shift || keys.Control);
  const down = Boolean(keys.ArrowDown || keys.s || joystickVector.y < -MEDIA_LUNA_CONFIG.downThreshold || gamepadY > MEDIA_LUNA_CONFIG.downThreshold);
  return guarding && down;
}
function releaseMediaLunaTarget(target) {
  const ai = target?.userData?.ai;
  if (!ai?.mediaLunaHold) return;
  ai.mediaLunaHold = false;
  ai.mediaLunaAirY = null;
  ai.launchTimer = 0;
  ai.launchHeight = 0;
  ai.jumpTime = 0;
  ai.knockback = null;
  ai.stunTimer = Math.max(ai.stunTimer || 0, .45);
}
function beginMediaLunaRecovery() {
  finishSwordTrail(activeSlashTrail);
  risingSlash.phase = 'recovery';
  risingSlash.elapsed = 0;
  risingSlash.recoveryPlayerY = heroGroup.position.y;
  risingSlash.recoveryTargetY = risingSlash.target?.position.y || 0;
  releaseMediaLunaTarget(risingSlash.target);
}
function finishMediaLuna() {
  const target = risingSlash.target;
  releaseMediaLunaTarget(target);
  if (lockedEnemy === target) setLockedEnemy(risingSlash.previousLockedEnemy && isLockTargetValid(risingSlash.previousLockedEnemy) ? risingSlash.previousLockedEnemy : null);
  risingSlash.phase = 'IDLE';
  risingSlash.target = null;
  risingSlash.elapsed = 0;
  risingSlash.totalElapsed = 0;
  risingSlash.impactDone = false;
  risingSlash.trailStarted = false;
  risingSlash.airComboQueued = false;
  comboState = 'IDLE';
  comboElapsed = 0;
  jumpActive = false;
  jumpPhase = 'ground';
  jumpLandTimer = 0;
  verticalVelocity = 0;
  movementVelocity.set(0, 0);
  activeSlashTrail = null;
  leftFootPlant.planted = false;
  rightFootPlant.planted = false;
}
function startAirComboHit(heavy = false) {
  if (!isLockTargetAlive(risingSlash.target) || risingSlash.airComboHits >= MEDIA_LUNA_CONFIG.maxAirHits) return false;
  attackDidHit = false;
  risingSlash.phase = 'airCombo';
  risingSlash.elapsed = 0;
  risingSlash.airComboIndex = risingSlash.airComboHits++;
  risingSlash.airComboPlayerStartX = heroRoot.position.x;
  risingSlash.airComboPlayerStartZ = heroRoot.position.z;
  risingSlash.airComboImpactDone = false;
  risingSlash.airComboTrailStarted = false;
  risingSlash.airComboHeavy = heavy || Boolean(risingSlash.airComboHeavyQueued);
  risingSlash.airComboHeavyQueued = false;
  risingSlash.airComboQueued = false;
  risingSlash.airWindowRemaining = Math.min(MEDIA_LUNA_CONFIG.maxDecisionWindow, risingSlash.airWindowRemaining + .35);
  activeSlashTrail = slashTrails[risingSlash.airComboIndex === MEDIA_LUNA_CONFIG.maxAirHits - 1 ? 2 : risingSlash.airComboIndex % 2];
  audioManager?.playSwordSwing(risingSlash.airComboIndex === MEDIA_LUNA_CONFIG.maxAirHits - 1 ? 1.35 : 1.08 + risingSlash.airComboIndex * .08);
  audioManager?.playHeroVoice('effort');
  return true;
}
function requestMediaLunaAirRoute(intent = 'combo') {
  if (isMediaLunaDownAttackInput()) {
    risingSlash.airComboQueued = false;
    risingSlash.phase = 'groundSlam';
    risingSlash.elapsed = 0;
    risingSlash.slamImpactDone = false;
    risingSlash.slamTrailStarted = false;
    attackDidHit = false;
    risingSlash.slamPlayerY = heroGroup.position.y;
    risingSlash.slamPlayerX = heroRoot.position.x;
    risingSlash.slamPlayerZ = heroRoot.position.z;
    risingSlash.slamTargetY = risingSlash.target?.position.y || 0;
    risingSlash.slamX = risingSlash.target?.position.x ?? heroRoot.position.x;
    risingSlash.slamZ = risingSlash.target?.position.z ?? heroRoot.position.z;
    activeSlashTrail = slashTrails[(risingSlash.airComboHits + 2) % slashTrails.length];
    slashTrails.forEach(clearSwordTrail);
    audioManager?.playSwordSwing(1.4);
    audioManager?.playHeroVoice('effort');
    return;
  }
  if (intent === 'heavy') risingSlash.airComboHeavyQueued = true;
  if (risingSlash.phase === 'airborne') startAirComboHit(intent === 'heavy');
  else if (!risingSlash.airComboQueued && risingSlash.airComboHits < MEDIA_LUNA_CONFIG.maxAirHits) risingSlash.airComboQueued = true;
  risingSlash.airWindowRemaining = Math.min(MEDIA_LUNA_CONFIG.maxDecisionWindow, risingSlash.airWindowRemaining + .3);
}
function startRisingSlash(skillId = 'moon_slash') {
  if (playerPowerCooldownRemaining(skillId) > 0) return false;
  if (isInSafePlaza(heroRoot.position)) return false;
  const airborne = jumpActive || jumpPhase === 'rising' || jumpPhase === 'falling' || heroGroup.position.y > .02;
  if (airborne || comboState !== 'IDLE' || shieldBash.phase !== 'IDLE') return false;
    if (shieldBash.phase !== 'IDLE') return;
  sendPlayerSwing();
  const forwardX = Math.sin(heroRoot.rotation.y), forwardZ = Math.cos(heroRoot.rotation.y);
  let target = null;
  let bestScore = Infinity;
  const candidates = [...new Set([...(lockedEnemy && isLockTargetValid(lockedEnemy) ? [lockedEnemy] : []), ...enemyCombatants, ...remotePlayers.values(), ...(trainingDummy ? [trainingDummy] : [])])];
  for (const candidate of candidates) {
    if (candidate === target || (!candidate.userData?.ai && !candidate.userData?.isPlayer && !candidate.userData?.isTrainingDummy) || !isLockTargetAlive(candidate)) continue;
    const dx = candidate.position.x - heroRoot.position.x, dz = candidate.position.z - heroRoot.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .2 || distance > 4.4) continue;
    const facing = (dx * forwardX + dz * forwardZ) / distance;
    if (facing < .35) continue;
    const score = distance - facing * .5;
    if (score < bestScore) { bestScore = score; target = candidate; }
  }
  if (!target || !isLockTargetAlive(target)) return false;
  const distance = target ? Math.hypot(target.position.x - heroRoot.position.x, target.position.z - heroRoot.position.z) : 0;
  if (distance > 4.4) return false;
  if (!canPayPlayerResources(16, 14, 'Media Luna')) return false;
  spendMana(16, 'Media Luna'); spendStamina(14, 'Media Luna');
  risingSlash.previousLockedEnemy = lockedEnemy;
  setLockedEnemy(target);
  heroRoot.rotation.y = Math.atan2(forwardX, forwardZ);
  risingSlash.phase = 'lift';
  risingSlash.target = target;
  risingSlash.totalElapsed = 0;
  risingSlash.directionX = forwardX;
  risingSlash.directionZ = forwardZ;
  risingSlash.startX = heroRoot.position.x;
  risingSlash.startZ = heroRoot.position.z;
  risingSlash.targetStartDistance = distance;
  risingSlash.elapsed = 0;
  risingSlash.impactDone = false;
  risingSlash.trailStarted = false;
  risingSlash.airComboHits = 0;
  risingSlash.airComboQueued = false;
  risingSlash.airComboHeavyQueued = false;
  risingSlash.airComboHeavy = false;
  risingSlash.airComboImpactDone = false;
  risingSlash.airComboTrailStarted = false;
  risingSlash.slamImpactDone = false;
  risingSlash.slamTrailStarted = false;
  risingSlash.startY = heroGroup.position.y;
  if (target?.userData?.ai) {
    target.userData.ai.mediaLunaHold = true;
    target.userData.ai.mediaLunaAirY = target.position.y;
    target.userData.ai.mediaLunaX = target.position.x;
    target.userData.ai.mediaLunaZ = target.position.z;
    target.userData.ai.comboRemaining = 0;
    target.userData.ai.jumpTime = 0;
    target.userData.ai.launchTimer = 0;
    target.userData.ai.knockback = null;
    target.userData.ai.attackTimer = 0;
    target.userData.ai.attackPoses = null;
    target.userData.ai.attackPending = null;
    target.userData.ai.stunTimer = .65;
  }
  risingSlash.airComboHits = 0;
  risingSlash.airComboQueued = false;
  risingSlash.airWindowRemaining = 0;
  comboState = 'RISING_SLASH';
  comboElapsed = 0;
  jumpActive = false;
  jumpPhase = 'ground';
  jumpLandTimer = 0;
  verticalVelocity = 0;
  movementVelocity.set(0, 0);
  dashTimer = 0;
  leftFootPlant.planted = false;
  rightFootPlant.planted = false;
  slashTrails.forEach(clearSwordTrail);
  activeSlashTrail = slashTrails[2];
  activeAttackHitTargets.clear();
  attackDidHit = false;
  risingSlashGestureTimer = 0;
  triggerComboFlash();
  audioManager?.playSwordSwing(.78);
  audioManager?.playHeroVoice('effort');
  startPlayerPowerCooldown(skillId);
  return true;
}
function castArcaneOrb() {
  if(!gameMode||gameMenuOpen||manualPaused||getActiveCharacterId()!=='brujo')return false;
  if(currentWorldId!=='forest'){showToast('El Orbe Arcano solo puede lanzarse en el bosque.');return false;}
  if(arcaneOrbCooldown>0)return false;
  if(!canPayPlayerResources(8,0,'el Orbe Arcano'))return false;
  spendMana(8,'el Orbe Arcano');
  const candidates=enemyCombatants.filter(enemy=>enemy.parent&&enemy.userData.isForestCreature&&enemy.userData.health>0);
  const target=lockedEnemy&&candidates.includes(lockedEnemy)?lockedEnemy:candidates
    .map(enemy=>({enemy,distance:Math.hypot(enemy.position.x-heroGroup.position.x,enemy.position.z-heroGroup.position.z)}))
    .filter(entry=>entry.distance<20)
    .sort((a,b)=>a.distance-b.distance)[0]?.enemy;
  const direction=target
    ? new THREE.Vector3(target.position.x-heroGroup.position.x,0,target.position.z-heroGroup.position.z).normalize()
    : new THREE.Vector3(Math.sin(heroRoot.rotation.y),0,Math.cos(heroRoot.rotation.y));
  const mesh=new THREE.Group();
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,1),new THREE.MeshBasicMaterial({color:'#cba8ff',toneMapped:false}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.29,12,10),new THREE.MeshBasicMaterial({color:'#7d55ce',transparent:true,opacity:.42,toneMapped:false,depthWrite:false}));
  mesh.add(core,glow);
  mesh.position.set(heroGroup.position.x,heroGroup.position.y+1.2,heroGroup.position.z);
  scene.add(mesh);
  arcaneProjectiles.push({mesh,direction,life:2.2});
  arcaneOrbCooldown=.55;
  return true;
}
function updateArcaneProjectiles(delta){
  for(let index=arcaneProjectiles.length-1;index>=0;index--){
    const projectile=arcaneProjectiles[index];
    projectile.life-=delta;
    const previousPosition=projectile.mesh.position.clone();
    const nextPosition=previousPosition.clone().addScaledVector(projectile.direction,13*delta);
    const blockedByWorld=isProjectilePathBlocked(previousPosition,nextPosition);
    projectile.mesh.position.copy(nextPosition);
    projectile.mesh.rotation.x+=delta*4.5;
    projectile.mesh.rotation.y+=delta*6;
    const target=blockedByWorld?null:enemyCombatants.find(enemy=>enemy.parent&&enemy.userData.isForestCreature&&enemy.userData.health>0&&projectile.mesh.position.distanceTo(new THREE.Vector3(enemy.position.x,enemy.position.y+1,enemy.position.z))<.85);
    if(blockedByWorld)projectile.life=0;
    if(target){
      const damage=damageEnemy(target,34,projectile.direction,1.1);
      const quest=currentStoryQuest();
      if(damage>0&&quest?.type==='brujoTrial'&&getActiveCharacterId()==='brujo'){
        recordStoryJournal('Acierto un Orbe Arcano y consigo abrir la salida del bosque.');
        completeStoryQuest();
      }
      projectile.life=0;
    }
    if(projectile.life<=0){
      scene.remove(projectile.mesh);
      projectile.mesh.traverse(object=>{if(object.isMesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
      arcaneProjectiles.splice(index,1);
    }
  }
}
function requestComboHit() {
  if (!gameMode || gameMenuOpen || manualPaused || shieldBash.phase !== 'IDLE') return;
  const nearby = nearbyNpc();
  if (nearby) { interactNpc(nearby.userData.npc.id); return; }
  if(getActiveCharacterId()==='brujo'){castArcaneOrb();return;}
  if(resolveRpgItem(rpgState?.equipment?.weapon)?.kind==='Arco'){fireBowArrow();return;}
  if (comboState === 'RISING_SLASH') {
    if (risingSlash.phase === 'airborne' || risingSlash.phase === 'airCombo') requestMediaLunaAirRoute();
    return;
  }
  if (jumpActive || jumpPhase === 'rising' || jumpPhase === 'falling' || heroGroup.position.y > .02) {
    if (comboState !== 'IDLE') return;
    startComboHit(1);
    return;
  }
  if (comboState === 'IDLE') startComboHit(1);
  else if (comboHit > 0 && comboHit < 3 && !comboQueued) comboQueued = true;
}
function startHeavyAttack() {
  if (comboState === 'RISING_SLASH' && (risingSlash.phase === 'airborne' || risingSlash.phase === 'airCombo' || risingSlash.phase === 'airAscend')) {
    requestMediaLunaAirRoute('heavy');
    return;
  }
  if (!gameMode || gameMenuOpen || manualPaused || jumpActive || jumpPhase !== 'ground' || comboState !== 'IDLE' || shieldBash.phase !== 'IDLE' || playerPowerCooldownRemaining('charge') > 0) return false;
  heavyAttackActive = true;
  if (!startComboHit(3)) { heavyAttackActive = false; return false; }
  startPlayerPowerCooldown('charge');
  return true;
}
function captureCombatPose() {
  return {
    rsx: rightShoulder.rotation.x, rsy: rightShoulder.rotation.y, rsz: rightShoulder.rotation.z,
    rex: rightElbow.rotation.x, rez: rightElbow.rotation.z, rwx: rightWrist.rotation.x, rwy: rightWrist.rotation.y, rwz: rightWrist.rotation.z,
    hgx: rightHandGrip.rotation.x, hgy: rightHandGrip.rotation.y, hgz: rightHandGrip.rotation.z,
    lsx: leftShoulder.rotation.x, lsy: leftShoulder.rotation.y, lsz: leftShoulder.rotation.z,
    lex: leftElbow.rotation.x, lez: leftElbow.rotation.z,
    tx: torso.rotation.x, ty: torso.rotation.y, tz: torso.rotation.z, nx: neck.rotation.x, ny: neck.rotation.y, hdx: headGroup.rotation.x, hdy: headGroup.rotation.y,
    hy: hips.rotation.y, hz: hips.rotation.z, hpy: hips.position.y, lhx: leftHip.rotation.x, rhx: rightHip.rotation.x, lk: leftKnee.rotation.x, rk: rightKnee.rotation.x
  };
}
function startComboHit(hit) {
  const staminaCost = heavyAttackActive && hit === 3 ? 14 : 6;
  const manaCost = heavyAttackActive && hit === 3 ? 12 : 0;
  const chargedAttack = heavyAttackActive && hit === 3;
  if (chargedAttack && !canPayPlayerResources(manaCost, staminaCost, 'el golpe cargado')) return false;
  if (manaCost) spendMana(manaCost, 'el golpe cargado');
  if (chargedAttack) spendStamina(staminaCost, 'el golpe cargado');
  else if (rpgState) {
    rpgState.stamina = Math.max(0, rpgState.stamina - Math.min(staminaCost, rpgState.stamina));
    staminaRecoveryDelay = Math.max(staminaRecoveryDelay, .8);
    updatePlayerResourcesHud();
  }
  const pitches = { 1: 1, 2: 1.15, 3: .9 };
  const carryPose = captureCombatPose();
  comboHit = hit;
  sendPlayerSwing();
  comboState = hit === 1 ? 'HIT1' : hit === 2 ? 'HIT2' : 'HIT3';
  comboElapsed = 0;
  comboInputWindow = .20 + Math.min(.22, Math.max(0, rpgState?.attributes?.agi - 5) * .008);
  comboRecoveryWindowStarted = false;
  attackStepApplied = 0;
  attackStrikeStarted = false;
  attackDidHit = false;
  activeAttackTarget = acquireCombatTarget();
  activeAttackHitTargets.clear();
  leftFootPlant.planted = false;
  rightFootPlant.planted = false;
  activeAttackPoses = buildAttackPoses(chargedAttack ? 1 : hit);
  activeAttackPoses.swordStart = { x: swordGroup.rotation.x, y: swordGroup.rotation.y, z: swordGroup.rotation.z };
  const attackSpeedScale = 1 / derivedCharacterStats().attackSpeed;
  activeAttackPoses.timing.windup *= attackSpeedScale;
  activeAttackPoses.timing.strike *= attackSpeedScale;
  activeAttackPoses.timing.recovery *= attackSpeedScale;
  if (heavyAttackActive && hit === 3) {
    activeAttackPoses.timing.windup *= 1.18;
    activeAttackPoses.timing.strike *= 1.08;
    activeAttackPoses.timing.recovery *= 1.15;
    activeAttackPoses.timing.step = .72;
    activeAttackPoses.timing.damage = activeAttackPoses.timing.damage * 2 + physicalAttackBonus();
  }
  if (activeAttackTarget) {
    const timing = activeAttackPoses.timing;
    timing.lift *= .76; timing.windup *= .72; timing.strike *= .86; timing.recovery *= .76;
  }
  activeAttackPoses.neutral = { ...activeAttackPoses.neutral, ...carryPose };
  activeAttackPoses.lift = { ...activeAttackPoses.lift, ...carryPose };
  for (const poseName of ['neutral', 'lift', 'wind', 'strike', 'follow']) {
    activeAttackPoses[poseName].hgx = carryPose.hgx;
    activeAttackPoses[poseName].hgy = carryPose.hgy;
    activeAttackPoses[poseName].hgz = carryPose.hgz;
  }
  comboQueued = false;
  if (audioManager) {
    audioManager.playSwordSwing(pitches[hit]);
    audioManager.playLoadedSfx('slash', .34, pitches[hit]);
    audioManager.playHeroVoice('effort');
  }
  slashTrails.forEach(clearSwordTrail);
  activeSlashTrail = slashTrails[hit - 1];
  if (tutorialActive && tutorialStep === 1 && hit === 3) tutorialComboDone = true;
  return true;
}
function isInSafePlaza(position) {
  if (currentWorldId === 'villa') return Math.hypot(position.x, position.z) <= SAFE_PLAZA_RADIUS;
  return currentWorldId === 'forest' && (
    Math.hypot(position.x - WALPIRA_HOME_SPAWN.x, position.z - WALPIRA_HOME_SPAWN.z) <= WALPIRA_HOME_SAFE_RADIUS
    || Math.hypot(position.x - FOREST_GATE_RESPAWN.x, position.z - FOREST_GATE_RESPAWN.z) <= 6.5
  );
}
function registerTrainingDummyHit(dummy, direction) {
  const data = dummy.userData;
  data.hitCount++;
  data.health = 100;
  data.hitTimer = .46;
  data.hitSide = Math.sign(direction.x || direction.z || 1);
  data.hitDirectionX = direction.x;
  data.hitDirectionZ = direction.z;
  updateTrainingDummyLabel();
}
function updateTrainingDummy(delta, time) {
  if (!trainingDummy) return;
  const data = trainingDummy.userData;
  data.hitTimer = Math.max(0, data.hitTimer - delta);
  const recoil = data.hitTimer > 0 ? Math.sin((1 - data.hitTimer / .46) * Math.PI) : 0;
  data.animatedBody.rotation.z = Math.sin(time * 1.6) * .012 + recoil * data.hitSide * .28;
  data.animatedBody.rotation.x = Math.sin(time * 1.1) * .008 - recoil * .16;
  trainingDummy.position.x = data.baseX + data.hitDirectionX * recoil * .22;
  trainingDummy.position.z = data.baseZ + data.hitDirectionZ * recoil * .22;
  data.hitMaterial.emissiveIntensity = recoil * .9;
}
function createEnemyCombatant({ x = 0, z = 0, rotationY = Math.PI, tint = 0.04 } = {}) {
  if (!heroRoot) return null;
  const enemyName = ENEMY_COMBATANT_NAMES[enemyCombatantCount % ENEMY_COMBATANT_NAMES.length];
  enemyCombatantCount++;
  const enemy = heroRoot.clone(true);
  enemy.name = 'enemy-combatant';
  enemy.traverse(object => {
    if (!(object.isMesh || object.isLine)) return;
    if (object.material && object.material.clone) {
      const material = object.material.clone();
      if (material.color) {
        const hsl = material.color.clone().getHSL({ h: 0, s: 0, l: 0 });
        if (hsl.l > .72) material.color.setHSL((hsl.h + tint * .15) % 1, Math.min(.12, hsl.s), Math.min(.88, Math.max(.76, hsl.l)));
        else material.color.setHSL((hsl.h + tint + 0.04) % 1, Math.max(0.14, hsl.s * 0.9), Math.min(0.74, hsl.l * 0.72));
      }
      if (material.emissive) {
        const emissive = material.emissive.clone();
        emissive.offsetHSL(0.02, 0.12, -0.08);
        material.emissive = emissive;
      }
      object.material = material;
    }
    if (object.name === 'heroFaceDecal') {
      object.material = new THREE.MeshBasicMaterial({ map: createEnemyFaceDecal(false), transparent: true, depthWrite: false, toneMapped: false });
      object.visible = false;
    }
    if (object.name === 'heroRearBand') {
      object.material = new THREE.MeshBasicMaterial({ map: createEnemyFaceDecal(true), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    }
  });
  enemy.traverse(object => {
    if (object.name === 'shieldDisc') object.material = object.material.clone();
    if (object.name === 'shieldDisc' && object.material) {
      object.material.color = new THREE.Color('#e3dece');
      object.material.emissive = new THREE.Color('#8b7345');
      object.material.emissiveIntensity = 0.08;
    }
  });
  const enemySword = enemy.getObjectByName('sword');
  const enemyShield = enemy.getObjectByName('shield');
  if (enemySword && enemyShield) {
    enemy.attach(enemySword);
    enemySword.position.set(-.22, 1.12, -.27);
    enemySword.rotation.set(0, Math.PI, .12);
    enemySword.visible = true;
    enemy.attach(enemyShield);
    enemyShield.position.set(.22, 1.36, -.29);
    enemyShield.rotation.set(0, Math.PI, 0);
    enemyShield.visible = true;
  }
  enemy.position.set(x, 0, z);
  enemy.rotation.y = rotationY;
  const tongueShape = new THREE.Shape();
  tongueShape.moveTo(-.045, .02); tongueShape.quadraticCurveTo(0, .055, .045, .02); tongueShape.lineTo(.027, -.09); tongueShape.quadraticCurveTo(0, -.13, -.027, -.09); tongueShape.closePath();
  const tongue = new THREE.Mesh(new THREE.ShapeGeometry(tongueShape, 12), new THREE.MeshBasicMaterial({ color: '#b52f3b', side: THREE.DoubleSide, toneMapped: false }));
  tongue.name = 'enemyTongue'; tongue.position.set(0, -.108, .173); tongue.visible = false;
  enemy.getObjectByName('head')?.add(tongue);
  const healthBar = createEnemyHealthBar(enemy);
  enemy.userData = {
    isEnemy: true,
    health: 100,
    maxHealth: 100,
    name: enemyName,
    level: 3,
    combatant: true,
    healthBar,
    ai: { phase: Math.random() * Math.PI * 2, strafeDirection: Math.random() < .5 ? -1 : 1, attackCooldown: .65, attackTimer: 0, comboRemaining: 0, comboDelay: 0, comboStep: 0, dashCooldown: 1.0, dashTimer: 0, jumpCooldown: 1.4, jumpTime: 0, launchTimer: 0, launchDuration: .68, launchHeight: 0, stunTimer: 0, knockback: null, dead: false, deathTime: 0 },
    rig: {
      hips: enemy.getObjectByName('hips'),
      torso: enemy.getObjectByName('torso'),
      neck: enemy.getObjectByName('neck'),
      cape: enemy.getObjectByName('cape'),
      leftShoulder: enemy.getObjectByName('leftShoulder'),
      rightShoulder: enemy.getObjectByName('rightShoulder'),
      leftElbow: enemy.getObjectByName('leftElbow'),
      rightElbow: enemy.getObjectByName('rightElbow'),
      leftWrist: enemy.getObjectByName('leftWrist'),
      rightWrist: enemy.getObjectByName('rightWrist'),
      leftHip: enemy.getObjectByName('leftHip'),
      rightHip: enemy.getObjectByName('rightHip'),
      leftKnee: enemy.getObjectByName('leftKnee'),
      rightKnee: enemy.getObjectByName('rightKnee'),
      leftFoot: enemy.getObjectByName('leftFoot'),
      rightFoot: enemy.getObjectByName('rightFoot'),
      headGroup: enemy.getObjectByName('head'),
      rightHandGrip: enemy.getObjectByName('rightHandGrip'),
      leftHand: enemy.getObjectByName('leftHand'),
      swordGroup: enemySword,
      shieldGroup: enemyShield
    },
    baseX: x,
    baseZ: z
  };
  enemy.userData.rig.hips && (enemy.userData.rig.hips.position.y = .95);
  scene.add(enemy);
  enemyCombatants.push(enemy);
  window.enemyCombatants = enemyCombatants;
  return enemy;
}
function getEnemyWeaponPose(enemy, hand, localPosition, localRotation = [0, 0, 0]) {
  enemy.updateWorldMatrix(true, true);
  const worldPosition = hand.localToWorld(new THREE.Vector3(...localPosition));
  const worldRotation = hand.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...localRotation)));
  const rootRotation = enemy.getWorldQuaternion(new THREE.Quaternion()).invert();
  return { position: enemy.worldToLocal(worldPosition), quaternion: rootRotation.multiply(worldRotation) };
}
function updateEnemyWeaponStance(enemy, armed, delta) {
  const ai = enemy.userData.ai;
  const rig = enemy.userData.rig;
  if (!rig?.swordGroup || !rig.shieldGroup || !rig.rightHandGrip || !rig.leftHand) return;
  if (ai.weaponArmed !== armed && !ai.weaponTransition) {
    enemy.attach(rig.swordGroup);
    enemy.attach(rig.shieldGroup);
    ai.weaponTransition = {
      armed, elapsed: 0, duration: .52,
      swordPosition: rig.swordGroup.position.clone(), swordQuaternion: rig.swordGroup.quaternion.clone(),
      shieldPosition: rig.shieldGroup.position.clone(), shieldQuaternion: rig.shieldGroup.quaternion.clone()
    };
    if (armed) audioManager?.playSwordSwing(.7);
  }
  const transition = ai.weaponTransition;
  if (!transition) { ai.weaponStanceBlend = ai.weaponArmed ? 1 : 0; return; }
  transition.elapsed = Math.min(transition.duration, transition.elapsed + delta);
  const progress = easeInOut(transition.elapsed / transition.duration);
  ai.weaponStanceBlend = transition.armed ? progress : 1 - progress;
  const swordTarget = transition.armed
    ? getEnemyWeaponPose(enemy, rig.rightHandGrip, [0, 0, 0], [0, 0, Math.PI - .45])
    : { position: new THREE.Vector3(-.22, 1.12, -.27), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, .12)) };
  const shieldTarget = transition.armed
    ? getEnemyWeaponPose(enemy, rig.leftHand, [0, 0, .17])
    : { position: new THREE.Vector3(.22, 1.36, -.29), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)) };
  rig.swordGroup.position.lerpVectors(transition.swordPosition, swordTarget.position, progress);
  rig.swordGroup.quaternion.copy(transition.swordQuaternion).slerp(swordTarget.quaternion, progress);
  rig.shieldGroup.position.lerpVectors(transition.shieldPosition, shieldTarget.position, progress);
  rig.shieldGroup.quaternion.copy(transition.shieldQuaternion).slerp(shieldTarget.quaternion, progress);
  if (progress < 1) return;
  if (transition.armed) {
    rig.rightHandGrip.attach(rig.swordGroup);
    rig.swordGroup.position.set(0, 0, 0);
    rig.swordGroup.rotation.set(0, 0, Math.PI - .45);
    rig.leftHand.attach(rig.shieldGroup);
    rig.shieldGroup.position.set(0, 0, .17);
    rig.shieldGroup.rotation.set(0, 0, 0);
  } else {
    enemy.attach(rig.swordGroup);
    rig.swordGroup.position.set(-.22, 1.12, -.27);
    rig.swordGroup.rotation.set(0, Math.PI, .12);
    enemy.attach(rig.shieldGroup);
    rig.shieldGroup.position.set(.22, 1.36, -.29);
    rig.shieldGroup.rotation.set(0, Math.PI, 0);
  }
  ai.weaponArmed = transition.armed;
  ai.weaponStanceBlend = transition.armed ? 1 : 0;
  ai.weaponTransition = null;
}
function createForestCreatureCombatant({ species, x, z, level, rotationY = 0 }) {
  const enemy = new THREE.Group();
  enemy.name = 'forest-creature-' + species.id;
  const bark = new THREE.MeshStandardMaterial({ color: species.color, roughness: .94 });
  const dark = new THREE.MeshStandardMaterial({ color: '#30251d', roughness: .98 });
  const highlight = new THREE.MeshStandardMaterial({ color: species.id === 'thorn_spitter' ? '#d0c755' : '#b7a276', roughness: .8 });
  const eye = new THREE.MeshBasicMaterial({ color: '#f5cc72', toneMapped: false });
  const part = (name, geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    enemy.add(mesh);
    return mesh;
  };
  if (species.id === 'lichen_goblin') {
    part('goblin-body', new THREE.CapsuleGeometry(.28, .5, 4, 8), bark, [0, .86, 0]);
    part('goblin-cuirass', new THREE.BoxGeometry(.43, .42, .16), new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: .38, metalness: .62 }), [0, .94, .25]);
    part('goblin-sigil', new THREE.OctahedronGeometry(.075, 0), new THREE.MeshStandardMaterial({ color: '#c59c55', metalness: .62, roughness: .36 }), [0, .98, .35]);
    part('goblin-head', new THREE.SphereGeometry(.3, 12, 10), highlight, [0, 1.55, .04], [0, 0, 0], [1.12, .84, .9]);
    for (const side of [-1, 1]) {
      part('goblin-ear', new THREE.ConeGeometry(.105, .38, 5), bark, [side * .34, 1.67, 0], [0, 0, -side * .85]);
      part('goblin-eye', new THREE.SphereGeometry(.045, 8, 6), eye, [side * .12, 1.58, .26]);
      part('goblin-arm', new THREE.CapsuleGeometry(.09, .38, 3, 6), bark, [side * .38, 1.02, .03], [0, 0, side * .48]);
      part('goblin-pauldron', new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshStandardMaterial({ color: '#d9d2c1', roughness: .4, metalness: .66 }), [side * .38, 1.2, .02], [0, 0, 0], [1.12, .78, .92]);
      part('goblin-bracer', new THREE.CylinderGeometry(.105, .105, .16, 8), dark, [side * .53, .85, .04], [0, 0, side * .48]);
      part('goblin-leg', new THREE.CapsuleGeometry(.11, .34, 3, 6), dark, [side * .16, .31, 0]);
    }
    part('goblin-club', new THREE.CylinderGeometry(.06, .11, .62, 6), dark, [.48, .83, .25], [0, 0, -.58]);
    part('goblin-spine', new THREE.ConeGeometry(.08, .3, 5), highlight, [0, 1.04, -.25], [Math.PI / 2, 0, 0]);
  } else if (species.id === 'thorn_spitter') {
    part('thorn-bulb', new THREE.SphereGeometry(.46, 12, 10), bark, [0, .84, 0], [0, 0, 0], [1, .9, 1]);
    part('thorn-core', new THREE.SphereGeometry(.16, 10, 8), eye, [0, .91, .39]);
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      const x = Math.sin(angle) * .43, z = Math.cos(angle) * .43;
      part('thorn-leg', new THREE.CylinderGeometry(.045, .075, .66, 5), dark, [x * 1.48, .36, z * 1.48], [Math.cos(angle) * .9, 0, -Math.sin(angle) * .9]);
      part('thorn-spike', new THREE.ConeGeometry(.09, .38, 5), highlight, [Math.sin(angle) * .31, 1.23, Math.cos(angle) * .31], [Math.sin(angle) * .45, 0, Math.cos(angle) * .45]);
    }
  } else {
    part('trunk-body', new THREE.CylinderGeometry(.48, .61, 1.62, 9), bark, [0, 1.02, 0], [0, 0, .05]);
    part('trunk-hollow', new THREE.CircleGeometry(.29, 12), dark, [0, 1.14, .49]);
    part('trunk-core', new THREE.SphereGeometry(.115, 10, 8), eye, [0, 1.14, .51]);
    for (const side of [-1, 1]) {
      part('trunk-arm', new THREE.CylinderGeometry(.14, .22, .86, 7), bark, [side * .63, 1.12, .02], [0, 0, side * Math.PI / 2]);
      part('trunk-root', new THREE.CylinderGeometry(.07, .19, .8, 6), dark, [side * .27, .25, 0], [0, 0, side * .38]);
      part('trunk-spike', new THREE.ConeGeometry(.12, .4, 5), highlight, [side * .42, 1.55, .06], [0, 0, -side * .52]);
    }
    part('trunk-cap', new THREE.CylinderGeometry(.45, .48, .14, 9), highlight, [0, 1.87, 0]);
  }
  enemy.position.set(x, 0, z);
  enemy.rotation.y = rotationY;
  enemy.scale.setScalar(1 + (level - 1) * .035);
  const health = Math.round((species.health + (level - 1) * (species.id === 'hollow_trunk' ? 31 : 19)) * (1 + (level - 1) * .035));
  const healthBar = createEnemyHealthBar(enemy);
  healthBar.sprite.position.y = species.id === 'hollow_trunk' ? 2.65 : 2.2;
  enemy.userData = {
    isEnemy: true, isForestCreature: true, speciesId: species.id, species: species.name,
    bestiaryId: species.id, name: species.name, role: species.kind, level,
    health, maxHealth: health, defense: species.defense + (level - 1) * (species.id === 'hollow_trunk' ? 2.2 : .9),
    baseDamage: species.damage + (level - 1) * 1.7,
    experienceReward: species.xp + level * 7, combatant: true, healthBar,
    ai: {
      phase: Math.random() * Math.PI * 2, strafeDirection: Math.random() < .5 ? -1 : 1,
      attackCooldown: 1 + Math.random(), dashCooldown: 1.3, stunTimer: 0, knockback: null,
      dead: false, deathTime: 0, specialCooldown: 5 + Math.random() * 3, blocking: false,
      forestOpponent: true, arenaAggression: species.id === 'hollow_trunk' ? .78 : 1 + level * .035,
      arenaDamage: 1 + level * .035, baseX: x, baseZ: z
    },
    baseX: x, baseZ: z
  };
  enemy.userData.rig = {};
  scene.add(enemy);
  enemyCombatants.push(enemy);
  window.enemyCombatants = enemyCombatants;
  return enemy;
}
function createForestPlayerClone({ x, z, level, rotationY, tint }) {
  const enemy = createEnemyCombatant({ x, z, rotationY, tint });
  if (!enemy) return null;
  const armorColors = ['#eee8da', '#d3d2cd', '#f1eadb', '#c9d0d2', '#e0d5be'];
  const armorColor = armorColors[Math.floor(Math.random() * armorColors.length)];
  const armor = new THREE.MeshStandardMaterial({ color: armorColor, roughness: .42, metalness: .62 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.48, .42, .13), armor);
  plate.name = 'clone-random-breastplate';
  plate.position.set(0, 1.49, .19);
  enemy.add(plate);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.2, 9, 7), armor);
    shoulder.name = 'clone-random-pauldron';
    shoulder.position.set(side * .37, 1.82, .02);
    enemy.add(shoulder);
  }
  const levelScale = 1 + (level - 20) * .002;
  const health = 420 + level * 28;
  Object.assign(enemy.userData, {
    isForestClone: true, speciesId: 'player_clone', species: 'Eco del Jugador',
    name: 'Eco del Jugador', role: 'Élite · Armadura aleatoria', level,
    health, maxHealth: health, defense: 32 + level * 1.1,
    experienceReward: 90 + level * 12
  });
  enemy.scale.setScalar(levelScale);
  Object.assign(enemy.userData.ai, {
    forestOpponent: true, arenaOpponent: true,
    arenaAggression: 1.35 + (level - 20) * .025,
    arenaDamage: 1.65 + (level - 20) * .028,
    attackCooldown: .72, dashCooldown: .8
  });
  if (enemy.userData.healthBar) enemy.userData.healthBar.sprite.position.y = 3.05;
  return enemy;
}
function createInfernalBossCombatant({ x = 12.8, z = -14, rotationY = Math.PI } = {}) {
  const enemy = new THREE.Group();
  enemy.name = 'infernal-boss';
  const body = new THREE.MeshStandardMaterial({ color: '#43151a', roughness: .72, metalness: .12 });
  const armor = new THREE.MeshStandardMaterial({ color: '#211619', roughness: .48, metalness: .52 });
  const horn = new THREE.MeshStandardMaterial({ color: '#c5a477', roughness: .38, metalness: .55 });
  const flame = new THREE.MeshStandardMaterial({ color: '#ff6b23', emissive: '#e52a0b', emissiveIntensity: 1.8, roughness: .25 });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: '#58151b', emissive: '#4a090c', emissiveIntensity: .35, side: THREE.DoubleSide, roughness: .76 });
  const part = (name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    enemy.add(mesh);
    return mesh;
  };
  part('boss-torso', new THREE.OctahedronGeometry(.82, 1), body, [0, 1.42, 0], [.9, 1.15, .62]);
  part('boss-breastplate', new THREE.BoxGeometry(1.08, .88, .2), armor, [0, 1.52, .48], [1, 1, .8]);
  part('boss-heart', new THREE.SphereGeometry(.19, 10, 8), flame, [0, 1.52, .62]);
  part('boss-head', new THREE.SphereGeometry(.45, 12, 10), body, [0, 2.38, .08], [1, 1.12, .92]);
  part('boss-jaw', new THREE.ConeGeometry(.3, .42, 6), armor, [0, 2.08, .34], [1, .75, .75], [Math.PI, 0, 0]);
  for (const side of [-1, 1]) {
    part('boss-horn', new THREE.ConeGeometry(.16, .68, 6), horn, [side * .31, 2.78, .02], [1, 1, 1], [0, 0, -side * .4]);
    part('boss-eye', new THREE.SphereGeometry(.075, 8, 6), flame, [side * .18, 2.42, .47]);
    part('boss-shoulder', new THREE.IcosahedronGeometry(.42, 0), armor, [side * .83, 1.86, .02], [1.15, .9, 1]);
    part('boss-arm', new THREE.CylinderGeometry(.19, .27, .74, 7), body, [side * .98, 1.35, .12], [1, 1, 1], [0, 0, side * .13]);
    part('boss-claw', new THREE.ConeGeometry(.13, .44, 5), horn, [side * 1.01, .88, .24], [1, 1, 1], [Math.PI, 0, 0]);
    part('boss-leg', new THREE.CylinderGeometry(.2, .29, .72, 7), armor, [side * .34, .49, 0]);
    part('boss-foot', new THREE.BoxGeometry(.48, .2, .63), body, [side * .34, .13, .16]);
    part('boss-spine', new THREE.ConeGeometry(.16, .5, 5), horn, [side * .15, 1.85, -.46], [1, 1, 1], [Math.PI / 2, 0, side * .2]);
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(1.05, .62); wingShape.lineTo(1.72, .48); wingShape.lineTo(1.24, .08); wingShape.lineTo(1.55, -.48); wingShape.lineTo(.76, -.3); wingShape.lineTo(.36, -.72); wingShape.closePath();
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMaterial);
    wing.name = 'boss-wing'; wing.position.set(side * .42, 1.98, -.28); wing.scale.set(side * .72, .82, .8); wing.castShadow = true;
    enemy.add(wing);
  }
  part('boss-tail', new THREE.ConeGeometry(.22, 1.25, 7), body, [0, .48, -.76], [1, 1, 1], [Math.PI / 2.5, 0, 0]);
  enemy.position.set(x, 0, z);
  enemy.rotation.y = rotationY;
  const healthBar = createEnemyHealthBar(enemy);
  if (healthBar.sprite) healthBar.sprite.position.y = 4.15;
  enemy.userData = {
    isEnemy: true, infernalBoss: true, health: 620, maxHealth: 620,
    name: 'Azhkar, Coloso de Ceniza', level: 12, combatant: true, healthBar,
    ai: { phase: 0, strafeDirection: 1, attackCooldown: 1, attackTimer: 0, comboRemaining: 0, comboDelay: 0, comboStep: 0, dashCooldown: 1, dashTimer: 0, jumpCooldown: 1, jumpTime: 0, launchTimer: 0, launchDuration: .68, launchHeight: 0, stunTimer: 0, knockback: null, fireballCooldown: 2.4, novaCooldown: 4.5, dead: false, deathTime: 0 },
    rig: { torso: enemy.getObjectByName('boss-torso'), headGroup: enemy.getObjectByName('boss-head'), leftShoulder: enemy.children.find(part => part.name === 'boss-shoulder'), rightShoulder: enemy.children.filter(part => part.name === 'boss-shoulder')[1] },
    baseX: x, baseZ: z
  };
  scene.add(enemy);
  enemyCombatants.push(enemy);
  window.enemyCombatants = enemyCombatants;
  return enemy;
}
function launchInfernalFireball(enemy, dx, dz, distance) {
  const orb = new THREE.Group();
  orb.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 1), new THREE.MeshBasicMaterial({ color: '#ff5b1d', toneMapped: false })));
  orb.add(new THREE.Mesh(new THREE.SphereGeometry(.19, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff1a1', toneMapped: false })));
  const direction = new THREE.Vector3(dx / distance, 0, dz / distance);
  orb.position.set(enemy.position.x, enemy.position.y + 1.65, enemy.position.z);
  scene.add(orb);
  infernalProjectiles.push({ type: 'fireball', mesh: orb, velocity: direction.multiplyScalar(9.5), life: 2.3, owner: enemy });
}
function launchInfernalNova(enemy, target) {
  const marker = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.2, 28), new THREE.MeshBasicMaterial({ color: '#ff592b', transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(target.x, .07, target.z);
  scene.add(marker);
  infernalProjectiles.push({ type: 'warning', mesh: marker, x: target.x, z: target.z, life: .88, owner: enemy });
}
function removeInfernalProjectile(index) {
  const [projectile] = infernalProjectiles.splice(index, 1);
  scene.remove(projectile.mesh);
  projectile.mesh.traverse(object => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
  });
}
function updateInfernalProjectiles(delta) {
  if (!gameMode || gameMenuOpen || manualPaused || shieldBash.phase !== 'IDLE') return;
  for (let index = infernalProjectiles.length - 1; index >= 0; index--) {
    const projectile = infernalProjectiles[index];
    if (!projectile.owner.parent || projectile.owner.userData.health <= 0) { removeInfernalProjectile(index); continue; }
    projectile.life -= delta;
    if (projectile.type === 'fireball') {
      const previousPosition=projectile.mesh.position.clone();
      const nextPosition=previousPosition.clone().addScaledVector(projectile.velocity,delta);
      if(isProjectilePathBlocked(previousPosition,nextPosition)){removeInfernalProjectile(index);continue;}
      projectile.mesh.position.copy(nextPosition);
      projectile.mesh.rotation.y += delta * 5;
      if (projectile.mesh.position.distanceTo(heroRoot.position) < 1.05) {
        if (!isInSafePlaza(heroRoot.position)) damagePlayer(24, projectile.velocity.clone().setY(0).normalize(), .32, projectile.owner);
        removeInfernalProjectile(index);
        continue;
      }
    } else if (projectile.type === 'warning') {
      projectile.mesh.material.opacity = .35 + Math.abs(Math.sin(projectile.life * 18)) * .55;
      if (projectile.life <= 0) {
        const direction = new THREE.Vector3(heroRoot.position.x - projectile.x, 0, heroRoot.position.z - projectile.z);
        if (direction.length() < 3.2 && !isInSafePlaza(heroRoot.position)) damagePlayer(32, direction.normalize(), .44, projectile.owner);
        const burst = new THREE.Mesh(new THREE.RingGeometry(.24, .42, 24), new THREE.MeshBasicMaterial({ color: '#ff7728', transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
        burst.rotation.x = -Math.PI / 2; burst.position.set(projectile.x, .09, projectile.z); scene.add(burst);
        infernalProjectiles.push({ type: 'burst', mesh: burst, life: .36, owner: projectile.owner });
        removeInfernalProjectile(index);
        continue;
      }
    } else {
      const progress = 1 - Math.max(0, projectile.life) / .36;
      projectile.mesh.scale.setScalar(.5 + progress * 7);
      projectile.mesh.material.opacity = 1 - progress;
    }
    if (projectile.life <= 0) removeInfernalProjectile(index);
  }
}
function dropExperienceOrb(enemy) {
  const value = Math.max(0, Math.round(enemy.userData.experienceReward || 0));
  if (!value) return;
  const orb = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), new THREE.MeshStandardMaterial({ color: '#63bdff', emissive: '#197bd4', emissiveIntensity: 1.25, roughness: .28, metalness: .18 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.24, .025, 6, 20), new THREE.MeshBasicMaterial({ color: '#b7e5ff', toneMapped: false }));
  ring.rotation.x = Math.PI / 2;
  orb.add(core, ring);
  orb.position.set(enemy.position.x, .62, enemy.position.z);
  orb.userData = { value, phase: Math.random() * Math.PI * 2, age: 0 };
  scene.add(orb);
  experienceOrbs.push(orb);
}
function gainExperience(amount) {
  if (!rpgState || amount <= 0) return;
  rpgState.xp += amount;
  let levelsGained = 0;
  while (rpgState.xp >= rpgState.xpNext) {
    rpgState.xp -= rpgState.xpNext;
    rpgState.level++;
    rpgState.xpNext = Math.round(rpgState.xpNext * 1.22 + 35);
    rpgState.attributes.con++;
    rpgState.attributes.int++;
    rpgState.attributePoints++;
    rpgState.skillPoints++;
    levelsGained++;
  }
  if (levelsGained) {
    heroHealth = Math.min(playerMaxHealth(), heroHealth + levelsGained * 15);
    document.getElementById('hud-level').textContent = String(rpgState.level);
    showToast('¡Nivel ' + rpgState.level + '! +1 Aguante, +1 Inteligencia, +15 PV, +12 PM y puntos de atributo/habilidad.');
    audioManager?.playVictory();
  } else {
    showToast('Orbe de experiencia · +' + amount + ' XP');
  }
  updatePlayerHealthHud();
  saveRpgProfile();
}
function updateExperienceOrbs(delta, time) {
  for (let index = experienceOrbs.length - 1; index >= 0; index--) {
    const orb = experienceOrbs[index];
    const data = orb.userData;
    data.age += delta;
    const dx = heroGroup.position.x - orb.position.x;
    const dz = heroGroup.position.z - orb.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 4.5 && distance > .72) {
      const magnet = (1 - distance / 4.5) * 5.5;
      orb.position.x += dx / distance * magnet * delta;
      orb.position.z += dz / distance * magnet * delta;
    }
    orb.position.y = .55 + Math.sin(time * 3.2 + data.phase) * .14;
    orb.rotation.y += delta * 1.8;
    if (distance <= .82) {
      scene.remove(orb);
      orb.traverse(object => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
      experienceOrbs.splice(index, 1);
      gainExperience(data.value);
    }
  }
}
function spawnForestProjectile(owner, dx, dz, { speed = 8, damage, color = '#9bcf58', radius = .13 } = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  mesh.position.set(owner.position.x, .92, owner.position.z);
  scene.add(mesh);
  forestProjectiles.push({ mesh, velocity: new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(speed), damage, owner, life: 3.2 });
}
function spawnForestHazard(owner, x, z, { radius = 2, delay = .9, damage, color = '#9abc4b', stunDuration = 0, spines = false } = {}) {
  const mesh = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * .72, radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .075; mesh.add(ring);
  const spikes=[];
  if(spines){
    const material=new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.08,emissive:color,emissiveIntensity:.12});
    for(let index=0;index<7;index++){
      const angle=index*Math.PI*2/7,spike=new THREE.Mesh(new THREE.ConeGeometry(.13,.72,5),material);
      spike.position.set(Math.cos(angle)*radius*.55,-.28,Math.sin(angle)*radius*.55);spike.rotation.z=(index%2?-.18:.18);spike.castShadow=true;mesh.add(spike);spikes.push(spike);
    }
  }
  mesh.position.set(x,0,z);scene.add(mesh);
  forestHazards.push({ mesh, ring, spikes, owner, radius, timer: delay, delay, damage, stunDuration, triggered: false });
}
function spawnForestHitEffects(enemy, position, direction) {
  const trunkHit = enemy.userData.speciesId === 'hollow_trunk';
  const colors = trunkHit ? ['#92613b', '#bd8a55', '#d0a36b'] : ['#788f4c', '#a2ad61', '#c3ba73'];
  const count = trunkHit ? 7 : 4;
  for (let index = 0; index < count; index++) {
    const material = new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: .92, transparent: true, opacity: .95, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(.06 + Math.random() * .09), material);
    mesh.position.copy(position);
    mesh.position.y += .08 + Math.random() * .6;
    scene.add(mesh);
    const spread = (Math.random() - .5) * 1.4;
    mediaLunaDebris.push({
      mesh,
      velocity: new THREE.Vector3(direction.x * (1.1 + Math.random()) + spread, 1.1 + Math.random() * 1.4, direction.z * (1.1 + Math.random()) - spread),
      life: .32 + Math.random() * .16
    });
  }
}
function updateForestCombatEffects(delta) {
  for (let index = forestProjectiles.length - 1; index >= 0; index--) {
    const projectile = forestProjectiles[index];
    projectile.life -= delta;
    const previousPosition=projectile.mesh.position.clone();
    const nextPosition=previousPosition.clone().addScaledVector(projectile.velocity,delta);
    if(isProjectilePathBlocked(previousPosition,nextPosition))projectile.life=0;
    else {
      projectile.mesh.position.copy(nextPosition);
      const dx = heroRoot.position.x - projectile.mesh.position.x;
      const dz = heroRoot.position.z - projectile.mesh.position.z;
      if (Math.hypot(dx, dz) < .72 && heroHealth > 0) {
        const landed = damagePlayer(projectile.damage, new THREE.Vector3(-projectile.velocity.x, 0, -projectile.velocity.z).normalize(), .18, projectile.owner);
        if (landed) audioManager?.playForestImpact(.72);
        projectile.life = 0;
      }
    }
    if (projectile.life <= 0) {
      scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose(); projectile.mesh.material.dispose();
      forestProjectiles.splice(index, 1);
    }
  }
  for (let index = forestHazards.length - 1; index >= 0; index--) {
    const hazard = forestHazards[index];
    hazard.timer -= delta;
    const progress=THREE.MathUtils.clamp(1-Math.max(0,hazard.timer)/hazard.delay,0,1);
    hazard.ring.material.opacity = hazard.timer > 0 ? .38 + Math.sin(performance.now() * .018) * .22 : .85;
    hazard.mesh.scale.setScalar(hazard.timer > 0 ? 1 + Math.sin(performance.now() * .012) * .06 : 1.08);
    hazard.spikes.forEach((spike,index)=>{spike.position.y=-.28+progress*(index%2?.66:.5);spike.rotation.x=Math.sin(performance.now()*.01+index)*.08;});
    if (hazard.timer <= 0 && !hazard.triggered) {
      hazard.triggered = true;
      const dx = heroRoot.position.x - hazard.mesh.position.x;
      const dz = heroRoot.position.z - hazard.mesh.position.z;
      if (Math.hypot(dx, dz) <= hazard.radius) {
        const landed = damagePlayer(hazard.damage, new THREE.Vector3(-dx, 0, -dz).normalize(), .32, hazard.owner);
        if (landed && hazard.stunDuration) { heroStunTimer = Math.max(heroStunTimer, hazard.stunDuration); movementVelocity.set(0, 0); showCombatFeedback('ATRAPADO · ATURDIDO', true); }
        if (landed) audioManager?.playForestImpact(hazard.owner?.userData?.speciesId === 'hollow_trunk' ? 1.6 : .85);
      }
      hazard.timer = -.45;
    } else if (hazard.triggered && hazard.timer <= -.45) {
      scene.remove(hazard.mesh);
      hazard.mesh.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose?.();});
      forestHazards.splice(index, 1);
    }
  }
}
function spawnForestHealEffect(target) {
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.28,.045,6,18),new THREE.MeshBasicMaterial({color:'#9bdd79',transparent:true,opacity:.86,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(target.position.x,.12,target.position.z);scene.add(ring);
  audioManager?.playTone(660,.24,'sine',.045);
  window.setTimeout(()=>{scene.remove(ring);ring.geometry.dispose();ring.material.dispose();},650);
}
function updateForestCreatureCombat(enemy, delta, visible, distance, dx, dz) {
  const data = enemy.userData;
  const ai = data.ai;
  for (const key of ['specialCooldown', 'toxicCooldown', 'rainCooldown', 'stompCooldown', 'chargeCooldown', 'rootCooldown', 'spikeCooldown', 'biteCooldown', 'barkCooldown', 'trunkSpecialCooldown', 'healCooldown']) ai[key] = Math.max(0, (ai[key] || 0) - delta);
  ai.guardTimer = Math.max(0, (ai.guardTimer || 0) - delta);
  if (!ai.guardTimer) ai.blocking = false;
  if(data.speciesId==='thorn_spitter'){
    if(ai.healTargetId){
      const target=enemyCombatants.find(ally=>ally.uuid===ai.healTargetId);
      if(!target?.parent||target.userData.health<=0||target.userData.ai?.squadId!==ai.squadId||Math.hypot(target.position.x-enemy.position.x,target.position.z-enemy.position.z)>13){ai.healTargetId=null;ai.healCastTimer=0;}
      else{
        ai.healCastTimer=Math.max(0,(ai.healCastTimer||0)-delta);
        enemy.rotation.y=Math.atan2(target.position.x-enemy.position.x,target.position.z-enemy.position.z);
        if(ai.healCastTimer===0){target.userData.health=Math.min(target.userData.maxHealth,target.userData.health+target.userData.maxHealth*.24);if(target.userData.healthBar)target.userData.healthBar.lastHealth=-1;spawnForestHealEffect(target);if(target===enemy)refreshLockedEnemyHud();ai.healTargetId=null;}
      }
    }
    if(!ai.healTargetId&&ai.healCooldown<=0&&ai.stunTimer<=0&&ai.attackTimer<=0&&distance>6.5&&ai.squadId){
      const candidates=enemyCombatants.filter(ally=>ally.parent&&ally.userData.isForestCreature&&ally.userData.ai?.squadId===ai.squadId&&ally.userData.health>0&&Math.hypot(ally.position.x-enemy.position.x,ally.position.z-enemy.position.z)<=12).map(ally=>({ally,ratio:ally.userData.health/ally.userData.maxHealth,missing:ally.userData.maxHealth-ally.userData.health})).filter(entry=>entry.ratio<(entry.ally===enemy?.56:.68)&&entry.missing>=entry.ally.userData.maxHealth*.2).sort((a,b)=>a.ratio-b.ratio||b.missing-a.missing);
      const target=candidates[0]?.ally;
      if(target){ai.healTargetId=target.uuid;ai.healCastTimer=.9;ai.healCooldown=14;ai.attackTimer=.9;ai.attackCooldown=Math.max(ai.attackCooldown||0,1);}
    }
  }
  if (data.speciesId === 'hollow_trunk' && data.health / data.maxHealth <= .3 && !ai.enraged) {
    ai.enraged = true;
    ai.arenaAggression = 1.25;
    ai.arenaDamage *= 1.45;
    showCombatFeedback('TRONCO HUECO · MODO FURIA', true);
  }
  if (data.speciesId === 'hollow_trunk' && ai.trunkFallPhase) {
    ai.trunkFallTimer -= delta;
    if (ai.trunkFallPhase === 'windup') {
      enemy.rotation.x = smoothLerp(enemy.rotation.x, -.16, .18);
      if (ai.trunkFallTimer <= 0) { ai.trunkFallPhase = 'fall'; ai.trunkFallTimer = .28; }
    } else if (ai.trunkFallPhase === 'fall') {
      const progress = THREE.MathUtils.clamp(1 - ai.trunkFallTimer / .28, 0, 1);
      enemy.rotation.x = smoothLerp(enemy.rotation.x, 1.18, .34);
      enemy.position.y = .42 * Math.sin(progress * Math.PI);
      if (ai.trunkFallTimer <= 0) {
        ai.trunkFallPhase = 'recover';
        ai.trunkFallTimer = .52;
        audioManager?.playForestImpact(1.55);
      }
    } else {
      enemy.rotation.x = smoothLerp(enemy.rotation.x, 0, .16);
      enemy.position.y = THREE.MathUtils.lerp(enemy.position.y, 0, .18);
      if (ai.trunkFallTimer <= 0) { ai.trunkFallPhase = ''; enemy.rotation.x = 0; }
    }
    ai.attackTimer = Math.max(ai.attackTimer || 0, .12);
    return;
  }
  if (data.speciesId === 'lichen_goblin' && ai.attackTimer > 0) {
    const pose = Math.sin(THREE.MathUtils.clamp(1 - ai.attackTimer / (ai.attackDuration || .45), 0, 1) * Math.PI);
    enemy.rotation.z = (ai.forestAttack === 'bite' ? .16 : -.2) * pose;
  } else if (data.speciesId === 'lichen_goblin') enemy.rotation.z = THREE.MathUtils.lerp(enemy.rotation.z, 0, .22);
  if(data.speciesId==='thorn_spitter'){
    const pose=ai.attackTimer>0?Math.sin(THREE.MathUtils.clamp(1-ai.attackTimer/(ai.attackDuration||.45),0,1)*Math.PI):0;
    enemy.rotation.x=(ai.forestAttack==='needle'||ai.forestAttack==='spine-rain'?-.14:.1)*pose;
  }
  if (!visible || ai.stunTimer > 0 || ai.attackCooldown > 0) return;
  const damage = data.baseDamage * (ai.arenaDamage || 1);
  const escaping = dashTimer > 0 || movementVelocity.length() > 4.8;
  const direction = new THREE.Vector3(dx, 0, dz).normalize();
  const beginAttack = (name, duration, cooldown) => { ai.forestAttack = name; ai.attackDuration = duration; ai.attackTimer = duration; ai.attackCooldown = cooldown; audioManager?.playCreatureCall(data.speciesId); };
  const hurtPlayer = (amount, stun = .24) => damagePlayer(amount, direction.clone().negate(), stun, enemy);
  if (data.speciesId === 'lichen_goblin') {
    if (ai.specialCooldown <= 0 && distance < 7.5 && (escaping || distance < 3.7)) {
      const lead = escaping ? .7 : .15;
      spawnForestHazard(enemy, heroRoot.position.x + movementVelocity.x * lead, heroRoot.position.z + movementVelocity.y * lead, { radius:2.35, delay:escaping?1.05:.78, damage:damage*.8, color:'#8cbd4f', stunDuration:2, spines:true });
      ai.specialCooldown = 13; beginAttack('roots', .72, 2.1);
      showCombatFeedback('DUENDE · RAMA ATRAPAPIERNAS', true);
    } else if (distance < 1.9) {
      beginAttack('claw', .38, 1.05); hurtPlayer(damage*.82, .2);
    } else if (distance < 3.8 && ai.biteCooldown <= 0) {
      beginAttack('bite', .5, 1.05); ai.biteCooldown = 3.8;
      enemy.position.addScaledVector(direction, .62);
      if (distance < 3.35) hurtPlayer(damage*1.22, .3);
    } else if (distance < 7.2 && ai.spikeCooldown <= 0) {
      beginAttack('spines', .48, 1.25); ai.spikeCooldown = 5.4;
      spawnForestHazard(enemy, heroRoot.position.x, heroRoot.position.z, { radius:1.7, delay:.78, damage:damage*1.05, color:'#a5bf56', spines:true });
    } else if (distance < 8 && ai.chargeCooldown <= 0) {
      beginAttack('charge', .42, 1.2); ai.chargeCooldown = 4.7;
      enemy.position.addScaledVector(direction, .78);
      if (distance < 2.9) hurtPlayer(damage*1.15, .28);
    }
    return;
  }
  if (data.speciesId === 'thorn_spitter') {
    if (distance < 4.1 && ai.toxicCooldown <= 0) {
      beginAttack('toxic-cloud', .55, 1.1);
      spawnForestHazard(enemy, enemy.position.x, enemy.position.z, { radius:3.1, delay:.55, damage:damage*1.2, color:'#85c64e', stunDuration:.65 });
      ai.toxicCooldown = 10;
    } else if (distance < 3.2 && ai.rootCooldown <= 0) {
      beginAttack('bramble-whip', .42, 1.25); ai.rootCooldown = 4.3;
      spawnForestHazard(enemy, enemy.position.x, enemy.position.z, { radius:1.75, delay:.32, damage:damage*.95, color:'#97b84a', spines:true });
    } else if (distance > 7 && ai.rainCooldown <= 0) {
      beginAttack('spine-rain', .56, 1.1);
      spawnForestHazard(enemy, heroRoot.position.x, heroRoot.position.z, { radius: 2.15, delay: 1.15, damage: damage * 1.25, color: '#d4bc5b', spines:true });
      ai.rainCooldown = 8;
    } else if (distance < 14) {
      beginAttack('needle', .35, 1.05);
      const directionX = dx / Math.max(distance, .01), directionZ = dz / Math.max(distance, .01);
      spawnForestProjectile(enemy, directionX, directionZ, { speed: 9, damage, color: '#a8ce56' });
      if (ai.doubleShot) {
        const spread = .12;
        spawnForestProjectile(enemy, directionX * Math.cos(spread) - directionZ * Math.sin(spread), directionX * Math.sin(spread) + directionZ * Math.cos(spread), { speed: 9, damage: damage * .72, color: '#d0d960' });
      }
      ai.doubleShot = !ai.doubleShot;
    }
  } else if (data.speciesId === 'hollow_trunk') {
    if (distance < 9.5 && ai.stompCooldown <= 0 && ai.trunkSpecialCooldown <= 0 && (ai.enraged || escaping || distance < 5.2)) {
      const lead=escaping?.45:0;
      spawnForestHazard(enemy, heroRoot.position.x+movementVelocity.x*lead, heroRoot.position.z+movementVelocity.y*lead, { radius:ai.enraged?3.25:2.7, delay:.72, damage:damage*(ai.enraged?1.8:1.5), color:'#d08b45', stunDuration:ai.enraged?1.5:.8 });
      ai.stompCooldown = ai.enraged ? 4.2 : 5.8;
      ai.trunkSpecialCooldown = ai.enraged?7:9;
      beginAttack('falling-slam', .66, 1.1);
      ai.trunkFallPhase = 'windup';
      ai.trunkFallTimer = .36;
    } else if (distance < 2.7) {
      beginAttack('trunk-swipe', .5, 1.35);
      hurtPlayer(damage*1.05,.3);
    } else if (distance < 8.5 && ai.barkCooldown <= 0) {
      beginAttack('bark-shard', .52, 1.1); ai.barkCooldown=3.6;
      spawnForestProjectile(enemy, dx/Math.max(distance,.01), dz/Math.max(distance,.01), { speed:6.8, damage:damage*.9, color:'#bd8a55', radius:.2 });
    } else if (distance < 10 && ai.chargeCooldown <= 0) {
      beginAttack('root-charge', .45, 1.2); ai.chargeCooldown=5.5;
      enemy.position.addScaledVector(direction, .95);
      if(distance<3.5)hurtPlayer(damage*1.4,.4);
    } else {
      ai.blocking = distance < 6 && Math.random() < .58;
      ai.guardTimer = ai.blocking ? 1.1 : .35;
      if(ai.blocking)ai.attackCooldown=1.1;
    }
  }
}
function updateEnemyCombatants(delta, time) {
  if (!gameMode || gameMenuOpen || manualPaused || !heroRoot || !enemyCombatants.length) return;
  for (const enemy of enemyCombatants) {
    if (!enemy || !enemy.parent) continue;
    const data = enemy.userData || {};
    const ai = data.ai || {};
    if (data.isFriendlyNpc && (!ai.defending || (data.npc?.world || 'villa') !== currentWorldId)) continue;
    if (ai.worldDisabled) continue;
    if (ai.trainingDisabled) continue;
    if (currentWorldId === 'forest' && ai.forestOpponent && enemy !== lockedEnemy && !ai.alertTimer && Math.hypot(heroRoot.position.x - enemy.position.x, heroRoot.position.z - enemy.position.z) > ENEMY_PERCEPTION.hearingRunRange + 6) continue;
    const practiceEnemy = Boolean(trainingMode && ai.trainingMode);
    const rig = data.rig || {};
    if (ai.dead || data.health <= 0) {
      if (!ai.dead) beginEnemyDeath(enemy);
      ai.deathTime = (ai.deathTime || 0) + delta;
      enemy.position.y = THREE.MathUtils.lerp(enemy.position.y, .08, .08);
      enemy.rotation.x = smoothLerp(enemy.rotation.x, 1.42, .035);
      if (rig.headGroup) rig.headGroup.rotation.x = smoothLerp(rig.headGroup.rotation.x, -.18, .08);
      const tongue = enemy.getObjectByName('enemyTongue');
      if (tongue) tongue.rotation.z = Math.sin(ai.deathTime * 13) * .16;
      if(ai.deathTime>=ENEMY_CORPSE_SECONDS)removeExpiredCombatant(enemy);
      continue;
    }
    if (ai.mediaLunaHold) {
      ai.comboRemaining = 0;
      ai.attackTimer = 0;
      ai.attackPoses = null;
      ai.attackPending = null;
      ai.dashTimer = 0;
      ai.jumpTime = 0;
      ai.launchTimer = 0;
      ai.knockback = null;
      enemy.position.x = ai.mediaLunaX;
      enemy.position.z = ai.mediaLunaZ;
      if (Number.isFinite(ai.mediaLunaAirY)) enemy.position.y = ai.mediaLunaAirY;
      enemy.rotation.y = Math.atan2(heroRoot.position.x - enemy.position.x, heroRoot.position.z - enemy.position.z);
      if (rig.torso) rig.torso.rotation.x = Math.sin(time * 7) * .035;
      if (rig.headGroup) rig.headGroup.rotation.x = Math.sin(time * 5) * .035;
      if (rig.leftShoulder) rig.leftShoulder.rotation.x = -.78 + Math.sin(time * 8) * .04;
      if (rig.rightShoulder) rig.rightShoulder.rotation.x = -.62 - Math.sin(time * 8) * .04;
      const heldBar = data.healthBar;
      if (heldBar && heldBar.lastHealth !== data.health) {
        const ratio = THREE.MathUtils.clamp(data.health / data.maxHealth, 0, 1);
        const context = heldBar.context;
        context.clearRect(0, 0, heldBar.canvas.width, heldBar.canvas.height);
        context.fillStyle = '#171212'; context.fillRect(0, 0, 256, 32);
        context.fillStyle = '#5c2524'; context.fillRect(4, 4, 248, 24);
        context.fillStyle = ratio > .35 ? '#bf4738' : '#e09a3d'; context.fillRect(4, 4, 248 * ratio, 24);
        context.strokeStyle = '#e7cf9c'; context.lineWidth = 3; context.strokeRect(1.5, 1.5, 253, 29);
        heldBar.texture.needsUpdate = true;
        heldBar.lastHealth = data.health;
      }
      if (heldBar?.sprite) heldBar.sprite.visible = !lockedEnemy && data.health > 0;
      continue;
    }
    const playerDx = heroRoot.position.x - enemy.position.x;
    const playerDz = heroRoot.position.z - enemy.position.z;
    const playerDistance = Math.hypot(playerDx, playerDz) || .001;
    const facingDot = (playerDx * Math.sin(enemy.rotation.y) + playerDz * Math.cos(enemy.rotation.y)) / playerDistance;
    const sightRange=ai.factionRole==='watcher'?Math.max(ENEMY_PERCEPTION.sightRange,26):ENEMY_PERCEPTION.sightRange;
    ai.lineOfSightTimer = Math.max(0, (ai.lineOfSightTimer || 0) - delta);
    if (ai.lineOfSightTimer <= 0) {
      ai.lineOfSightTimer = .12;
      ai.hasPlayerLineOfSight = enemyHasLineOfSight(enemy);
    }
    const playerVisible = playerDistance <= sightRange && facingDot >= ENEMY_PERCEPTION.visionDot && ai.hasPlayerLineOfSight;
    const playerSpeed = movementVelocity.length();
    const makingActionNoise = jumpActive || dashTimer > 0 || comboState !== 'IDLE' || shieldBash.phase !== 'IDLE' || weaponThrown;
    const hearingRange = playerSpeed > 5.2 || dashTimer > 0 ? ENEMY_PERCEPTION.hearingRunRange : playerSpeed > 2.1 ? ENEMY_PERCEPTION.hearingWalkRange : makingActionNoise ? ENEMY_PERCEPTION.hearingActionRange : 0;
    const playerHeard = playerDistance <= hearingRange;
    if (data.isForestCreature && ai.squadId && (playerVisible || playerHeard)) {
      for (const ally of enemyCombatants) {
        const allyAi = ally.userData?.ai;
        if (ally === enemy || allyAi?.squadId !== ai.squadId || allyAi.dead || ally.userData.health <= 0) continue;
        allyAi.alertTimer = Math.max(allyAi.alertTimer || 0, ENEMY_PERCEPTION.memoryDuration);
        allyAi.lastKnownPlayerX = heroRoot.position.x;
        allyAi.lastKnownPlayerZ = heroRoot.position.z;
        allyAi.investigating = false;
      }
    }
    if(data.factionId&&(playerVisible||playerHeard)&&(ai.factionRole==='watcher'||ai.factionRole==='leader')){
      const state=rpgState?.factionState;
      if(state){state.alertLevels ||= {};const level=ai.factionRole==='leader'?2:1,previous=state.alertLevels[data.factionId]||0;if(level>previous){state.alertLevels[data.factionId]=level;saveRpgProfile();}}
      const alertDuration=ENEMY_PERCEPTION.memoryDuration+(ai.factionRole==='leader'?5:2);
      for(const ally of enemyCombatants){
        const allyAi=ally.userData?.ai;
        if(ally===enemy||allyAi?.factionId!==data.factionId||allyAi.dead||ally.userData.health<=0)continue;
        allyAi.alertTimer=Math.max(allyAi.alertTimer||0,alertDuration);allyAi.lastKnownPlayerX=heroRoot.position.x;allyAi.lastKnownPlayerZ=heroRoot.position.z;allyAi.investigating=false;
      }
    }
    ai.idleYaw ??= enemy.rotation.y;
    if (playerVisible) {
      ai.alertTimer = ENEMY_PERCEPTION.memoryDuration;
      ai.lastKnownPlayerX = heroRoot.position.x;
      ai.lastKnownPlayerZ = heroRoot.position.z;
      ai.investigating = false;
    } else if (playerHeard) {
      ai.alertTimer = Math.max(ai.alertTimer || 0, ENEMY_PERCEPTION.investigateDuration);
      ai.lastKnownPlayerX = heroRoot.position.x;
      ai.lastKnownPlayerZ = heroRoot.position.z;
      ai.investigating = true;
    } else {
      ai.alertTimer = Math.max(0, (ai.alertTimer || 0) - delta);
      if (ai.alertTimer <= 0) ai.investigating = false;
    }
    const enemyAware = playerVisible || playerHeard || ai.alertTimer > 0;
    const targetX = enemyAware ? ai.lastKnownPlayerX ?? heroRoot.position.x : ai.baseX ?? enemy.position.x;
    const targetZ = enemyAware ? ai.lastKnownPlayerZ ?? heroRoot.position.z : ai.baseZ ?? enemy.position.z;
    const dx = targetX - enemy.position.x;
    const dz = targetZ - enemy.position.z;
    const distance = Math.hypot(dx, dz) || .001;
    const wantsWeaponsDrawn = !data.isForestCreature && !data.infernalBoss && enemyAware && !isInSafePlaza(heroRoot.position) && !isInSafePlaza(enemy.position);
    if (data.infernalBoss && playerVisible && gameMode && !gameMenuOpen && !manualPaused && !isInSafePlaza(heroRoot.position)) {
      ai.fireballCooldown = Math.max(0, ai.fireballCooldown - delta);
      ai.novaCooldown = Math.max(0, ai.novaCooldown - delta);
      if (playerDistance > 4 && playerDistance < 13 && ai.fireballCooldown <= 0 && ai.stunTimer <= 0) {
        launchInfernalFireball(enemy, playerDx, playerDz, playerDistance);
        ai.fireballCooldown = 3.8;
      } else if (distance <= 3.8 && ai.novaCooldown <= 0 && ai.stunTimer <= 0) {
        launchInfernalNova(enemy, heroRoot.position);
        ai.novaCooldown = 7.2;
      }
    }
    const desiredYaw = enemyAware ? Math.atan2(dx, dz) : ai.idleYaw;
    const turn = Math.atan2(Math.sin(desiredYaw - enemy.rotation.y), Math.cos(desiredYaw - enemy.rotation.y));
    const arenaAggression = ai.arenaAggression || 1;
    ai.attackCooldown = Math.max(0, (ai.attackCooldown ?? 0) - delta * arenaAggression);
    ai.attackTimer = Math.max(0, (ai.attackTimer ?? 0) - delta);
    ai.comboDelay = Math.max(0, (ai.comboDelay ?? 0) - delta);
    ai.dashCooldown = Math.max(0, (ai.dashCooldown ?? 0) - delta);
    ai.jumpCooldown = Math.max(0, (ai.jumpCooldown ?? 0) - delta);
    ai.stunTimer = Math.max(0, (ai.stunTimer ?? 0) - delta);
    ai.exposedTimer = Math.max(0, (ai.exposedTimer ?? 0) - delta);
    if (ai.dashTimer > 0) ai.dashTimer = Math.max(0, ai.dashTimer - delta);
    if (ai.launchTimer > 0) {
      ai.launchTimer = Math.max(0, ai.launchTimer - delta);
      const progress = 1 - ai.launchTimer / ai.launchDuration;
      enemy.position.y = ai.launchHeight * Math.sin(Math.PI * THREE.MathUtils.clamp(progress, 0, 1));
    } else if (ai.jumpTime > 0) {
      ai.jumpTime = Math.max(0, ai.jumpTime - delta);
      enemy.position.y = Math.sin(THREE.MathUtils.clamp(1 - ai.jumpTime / .42, 0, 1) * Math.PI) * .78;
    } else {
      enemy.position.y = THREE.MathUtils.lerp(enemy.position.y, 0, .12);
    }
    const playerEvading = movementVelocity.length() > 3.8 || jumpActive;
    if (!playerVisible) ai.comboRemaining = 0;
    if (!enemyAware) { ai.comboRemaining = 0; ai.trainingStrikePending = false; ai.attackTimer = 0; ai.attackPoses = null; ai.attackPending = null; ai.dashTimer = 0; }
    if (!practiceEnemy && !data.isForestCreature && playerVisible && distance > 2.8 && distance < 10 && ai.dashCooldown <= 0 && ai.stunTimer <= 0 && (distance > 5 || Math.abs(turn) > .72 || playerEvading)) {
      ai.dashTimer = .36;
      ai.dashCooldown = 1.8 + Math.random() * .6;
    }
    if (!practiceEnemy && !data.isForestCreature && playerVisible && distance > 1.9 && distance < 4.2 && ai.jumpCooldown <= 0 && ai.stunTimer <= 0 && (playerEvading || distance < 2.8)) {
      ai.jumpCooldown = 2.2 + Math.random() * .5;
      ai.jumpTime = .52;
    }
    enemy.rotation.y += turn * (enemyAware ? .12 : .055);
    const dashActive = ai.dashTimer > 0;
    let chaseSpeed = !enemyAware ? 0 : dashActive ? 9.5 : distance > 2.05 ? 2.8 : distance < 1.45 ? -1.15 : 0;
    if (practiceEnemy) chaseSpeed = enemyAware ? distance > 3.1 ? 1.7 : distance < 1.9 ? -.35 : 0 : 0;
    if (data.isForestCreature && data.speciesId === 'thorn_spitter') chaseSpeed = !enemyAware ? 0 : distance > 9.5 ? 1.8 : distance < 7.4 ? -2.2 : 0;
    if (data.isForestCreature && data.speciesId === 'hollow_trunk') chaseSpeed = !enemyAware ? 0 : ai.trunkFallPhase === 'windup' ? 3.4 : ai.trunkFallPhase ? 0 : dashActive ? 5.2 : distance > 2.6 ? 1.35 : 0;
    if (data.isForestCreature && data.speciesId === 'lichen_goblin') chaseSpeed = !enemyAware ? 0 : dashActive ? 8.4 : distance > 1.7 ? 3.2 : 0;
    if (data.infernalBoss && !practiceEnemy) chaseSpeed = !enemyAware ? 0 : dashActive ? 13.5 : distance > 2.4 ? 3.4 : distance < 1.6 ? -1.2 : 0;
    if (ai.arenaOpponent) chaseSpeed *= arenaAggression;
    const strafeSpeed = practiceEnemy ? .32 : distance < 5.5 ? 1.1 : .28;
    const orbit = enemyAware ? ai.strafeDirection * strafeSpeed : 0;
    const moving = ai.stunTimer <= 0 && enemyAware && (chaseSpeed !== 0 || distance < 5.5 || dashActive);
    let stepX = 0;
    let stepZ = 0;
    if (ai.knockback?.duration > 0) {
      stepX += ai.knockback.x * delta;
      stepZ += ai.knockback.z * delta;
      ai.knockback.duration = Math.max(0, ai.knockback.duration - delta);
      ai.knockback.x *= .84;
      ai.knockback.z *= .84;
    }
    if (moving) {
      stepX += Math.sin(enemy.rotation.y) * chaseSpeed * delta + Math.cos(enemy.rotation.y) * orbit * delta;
      stepZ += Math.cos(enemy.rotation.y) * chaseSpeed * delta - Math.sin(enemy.rotation.y) * orbit * delta;
    } else if (ai.stunTimer <= 0) {
      stepX += Math.cos(enemy.rotation.y) * orbit * .2 * delta;
      stepZ += -Math.sin(enemy.rotation.y) * orbit * .2 * delta;
    }
    const nextX = enemy.position.x + stepX;
    const nextZ = enemy.position.z + stepZ;
    const xEntersSafeZone = isInSafePlaza({ x: nextX, z: enemy.position.z });
    const zEntersSafeZone = isInSafePlaza({ x: enemy.position.x, z: nextZ });
    if (!xEntersSafeZone && !isTownPositionBlocked(nextX, enemy.position.z) && !isCombatantPositionBlocked(nextX, enemy.position.z, enemy) && Math.hypot(nextX - heroRoot.position.x, enemy.position.z - heroRoot.position.z) >= .84) enemy.position.x = nextX;
    if (!zEntersSafeZone && !isTownPositionBlocked(enemy.position.x, nextZ) && !isCombatantPositionBlocked(enemy.position.x, nextZ, enemy) && Math.hypot(enemy.position.x - heroRoot.position.x, nextZ - heroRoot.position.z) >= .84) enemy.position.z = nextZ;
    if (data.isForestCreature) {
      updateForestCreatureCombat(enemy, delta, playerVisible, playerDistance, playerDx, playerDz);
    } else if (practiceEnemy) {
      const style = ai.trainingStyle || 'passive';
      const playerAttacking = comboState !== 'IDLE' && comboState !== 'RISING_SLASH';
      ai.blocking = (style === 'defensive' && playerAttacking && Math.sin(time * 1.7) > -.2) || (style === 'reactive' && playerAttacking && ai.stunTimer <= 0);
      if (style !== 'passive' && style !== 'defensive' && playerVisible && playerDistance <= 2.9 && ai.attackCooldown <= 0 && ai.stunTimer <= 0 && !ai.trainingStrikePending) {
        ai.trainingWindup = style === 'demonstration' ? .95 : .78;
        ai.trainingStrikePending = true;
        ai.attackCooldown = style === 'demonstration' ? 1.65 : 2.6;
      }
      if (ai.trainingStrikePending) {
        ai.trainingWindup = Math.max(0, ai.trainingWindup - delta);
        if (ai.trainingWindup <= 0) {
          ai.trainingStrikePending = false;
          startEnemyAttackAnimation(ai, rig, 1, { damage: 10, knockback: .12, range: 2.65 });
        }
      }
    } else {
      if (playerVisible && playerDistance <= 2.05 && ai.attackCooldown <= 0 && ai.comboRemaining <= 0 && ai.stunTimer <= 0 && !isInSafePlaza(heroRoot.position)) {
        ai.attackCooldown = 1.55 / arenaAggression;
        ai.comboRemaining = Math.random() < Math.min(.78, .28 + (arenaAggression - 1) * .45) ? 3 : 2;
        ai.comboStep = 0;
        ai.comboDelay = 0;
      }
      if (ai.comboRemaining > 0 && ai.comboDelay <= 0 && ai.stunTimer <= 0 && !isInSafePlaza(heroRoot.position)) {
        if (playerVisible && playerDistance <= 2.2) {
          const hit = (ai.comboStep % 3) + 1;
          const heavy = ai.comboStep === 1 && (ai.comboRemaining > 1 || Math.random() < .4);
          startEnemyAttackAnimation(ai, rig, hit, {
            damage: (data.infernalBoss ? (heavy ? 38 : 24) : (heavy ? 18 : 11)) * (ai.arenaDamage || 1),
            knockback: heavy ? .42 : .24
          });
          ai.comboRemaining--;
          ai.comboStep++;
          ai.comboDelay = (ai.attackDuration + .06) / arenaAggression;
        } else {
          ai.comboRemaining = 0;
        }
      }
    }
    if (ai.attackPoses && ai.attackElapsed < ai.attackDuration) {
      ai.attackElapsed = Math.min(ai.attackDuration, ai.attackElapsed + delta);
      const timing = ai.attackPoses.timing;
      if (ai.attackPending && ai.attackElapsed >= timing.windup + timing.strike * .5) {
        const impactDx = heroRoot.position.x - enemy.position.x;
        const impactDz = heroRoot.position.z - enemy.position.z;
        const impactDistance = Math.hypot(impactDx, impactDz) || .001;
        const pending = ai.attackPending;
        ai.attackPending = null;
        if (playerVisible && impactDistance <= (pending.range ?? 2.2)) {
          const impactDirection = new THREE.Vector3(impactDx / impactDistance, 0, impactDz / impactDistance);
          const landed = damagePlayer(pending.damage, impactDirection, pending.knockback, enemy);
          if (landed) audioManager?.playSwordImpact(pending.knockback > .3 ? 1.3 : 1.05);
        }
      }
    } else if (ai.attackPoses) {
      ai.attackPoses = null;
      ai.attackPending = null;
    }
    const bar = data.healthBar;
    if (bar && bar.lastHealth !== data.health) {
      const ratio = THREE.MathUtils.clamp(data.health / data.maxHealth, 0, 1);
      const context = bar.context;
      context.clearRect(0, 0, bar.canvas.width, bar.canvas.height);
      context.fillStyle = '#171212'; context.fillRect(0, 0, 256, 32);
      context.fillStyle = '#5c2524'; context.fillRect(4, 4, 248, 24);
      context.fillStyle = ratio > .35 ? '#bf4738' : '#e09a3d'; context.fillRect(4, 4, 248 * ratio, 24);
      context.strokeStyle = '#e7cf9c'; context.lineWidth = 3; context.strokeRect(1.5, 1.5, 253, 29);
      bar.texture.needsUpdate = true;
      bar.lastHealth = data.health;
    }
    if (bar?.sprite) bar.sprite.visible = data.isFriendlyNpc ? Boolean(ai.defending && !lockedEnemy && data.health > 0) : !lockedEnemy && data.health > 0;
    const phase = time * (moving ? 9.2 : 3.8) + ai.phase;
    const swing = Math.sin(phase) * .9;
    const pose = moving ? .38 : .12;
    const attackValue = (key, fallback) => ai.attackPoses?.neutral[key] !== undefined ? sampleAttackPose(ai.attackPoses, key, ai.attackElapsed) : fallback;
    const attackTiming = ai.attackPoses?.timing;
    const attackStriking = Boolean(attackTiming && ai.attackElapsed >= attackTiming.windup && ai.attackElapsed < attackTiming.windup + attackTiming.strike);
    const attackArmRate = attackTiming ? (attackStriking ? .72 : .42) : .18;
    const attackBodyRate = attackTiming ? (attackStriking ? .48 : .30) : .12;
    const attackJointRate = attackTiming ? (attackStriking ? .28 : .18) : .16;
    const attackPose = ai.attackPoses ? Math.sin(Math.PI * THREE.MathUtils.clamp(ai.attackElapsed / ai.attackDuration, 0, 1)) : ai.attackTimer > 0 ? Math.sin((1 - ai.attackTimer / (practiceEnemy ? .78 : .32)) * Math.PI) : 0;
    const dashPose = ai.dashTimer > 0 ? Math.sin((1 - ai.dashTimer / .36) * Math.PI) : 0;
    const stunned = ai.stunTimer > 0;
    if (rig.hips) {
      rig.hips.position.y = smoothLerp(rig.hips.position.y, attackValue('hpy', .95 + Math.abs(Math.sin(phase * 2)) * .025), attackTiming ? attackBodyRate : .24);
      rig.hips.rotation.y = smoothLerp(rig.hips.rotation.y, attackValue('hy', 0), attackTiming ? attackBodyRate : .24);
      rig.hips.rotation.z = smoothLerp(rig.hips.rotation.z, attackValue('hz', Math.sin(phase) * .04), attackTiming ? attackBodyRate : .18);
    }
    if (rig.torso) {
      rig.torso.rotation.x = smoothLerp(rig.torso.rotation.x, attackValue('tx', (stunned ? -.24 : .04 + pose * .12) + attackPose * .18 - dashPose * .2), attackTiming ? attackBodyRate : .12);
      rig.torso.rotation.y = smoothLerp(rig.torso.rotation.y, attackValue('ty', turn * .22 + (stunned ? .12 : 0)), attackTiming ? attackBodyRate : .12);
      rig.torso.rotation.z = smoothLerp(rig.torso.rotation.z, attackValue('tz', -Math.sin(phase) * .06), attackTiming ? attackBodyRate : .12);
    }
    if (rig.headGroup) {
      rig.headGroup.rotation.x = smoothLerp(rig.headGroup.rotation.x, attackValue('hdx', Math.sin(phase * 1.6) * .04), attackTiming ? attackBodyRate : .12);
      rig.headGroup.rotation.y = smoothLerp(rig.headGroup.rotation.y, attackValue('hdy', turn * .35 + Math.sin(phase) * .1 + attackPose * .18), attackTiming ? attackBodyRate : .12);
    }
    if (rig.neck) {
      rig.neck.rotation.x = smoothLerp(rig.neck.rotation.x, attackValue('nx', 0), attackTiming ? attackBodyRate : .12);
      rig.neck.rotation.y = smoothLerp(rig.neck.rotation.y, attackValue('ny', 0), attackTiming ? attackBodyRate : .12);
    }
    if (rig.leftShoulder) {
      rig.leftShoulder.rotation.x = smoothLerp(rig.leftShoulder.rotation.x, attackValue('lsx', -.28 - .64 * (ai.weaponStanceBlend || 0) + Math.sin(phase + Math.PI) * (moving ? .32 : .08) - attackPose * .22 + (ai.blocking ? -.58 : 0)), attackTiming ? attackArmRate : .18);
      rig.leftShoulder.rotation.y = smoothLerp(rig.leftShoulder.rotation.y, attackValue('lsy', 0), attackTiming ? attackArmRate : .18);
      rig.leftShoulder.rotation.z = smoothLerp(rig.leftShoulder.rotation.z, attackValue('lsz', .16), attackTiming ? attackArmRate : .18);
    }
    if (rig.rightShoulder) {
      rig.rightShoulder.rotation.x = smoothLerp(rig.rightShoulder.rotation.x, attackValue('rsx', -.22 - .76 * (ai.weaponStanceBlend || 0) + Math.sin(phase) * (moving ? .32 : .08) + attackPose * .92 - dashPose * .36 + (stunned ? -.55 : 0)), attackTiming ? attackArmRate : .18);
      rig.rightShoulder.rotation.y = smoothLerp(rig.rightShoulder.rotation.y, attackValue('rsy', 0), attackTiming ? attackArmRate : .18);
      rig.rightShoulder.rotation.z = smoothLerp(rig.rightShoulder.rotation.z, attackValue('rsz', -.14), attackTiming ? attackArmRate : .18);
    }
    if (rig.leftElbow) {
      rig.leftElbow.rotation.x = smoothLerp(rig.leftElbow.rotation.x, attackValue('lex', THREE.MathUtils.lerp(-.25, -.9, ai.weaponStanceBlend || 0) + Math.max(0, swing) * .2 - attackPose * .4), attackTiming ? attackArmRate : .2);
      rig.leftElbow.rotation.z = smoothLerp(rig.leftElbow.rotation.z, attackValue('lez', 0), attackTiming ? attackArmRate : .2);
    }
    if (rig.rightElbow) {
      rig.rightElbow.rotation.x = smoothLerp(rig.rightElbow.rotation.x, attackValue('rex', THREE.MathUtils.lerp(-.04, -1.1, ai.weaponStanceBlend || 0) + Math.max(0, -swing) * .2 + attackPose * 1.1), attackTiming ? attackArmRate : .2);
      rig.rightElbow.rotation.z = smoothLerp(rig.rightElbow.rotation.z, attackValue('rez', 0), attackTiming ? attackArmRate : .2);
    }
    if (rig.leftWrist) {
      rig.leftWrist.rotation.x = smoothLerp(rig.leftWrist.rotation.x, attackValue('lwx', 0), attackTiming ? attackArmRate : .22);
      rig.leftWrist.rotation.y = smoothLerp(rig.leftWrist.rotation.y, attackValue('lwy', 0), attackTiming ? attackArmRate : .22);
      rig.leftWrist.rotation.z = smoothLerp(rig.leftWrist.rotation.z, attackValue('lwz', 0), attackTiming ? attackArmRate : .22);
    }
    if (rig.rightWrist) {
      rig.rightWrist.rotation.x = smoothLerp(rig.rightWrist.rotation.x, attackValue('rwx', 0), attackTiming ? attackArmRate : .22);
      rig.rightWrist.rotation.y = smoothLerp(rig.rightWrist.rotation.y, attackValue('rwy', 0), attackTiming ? attackArmRate : .22);
      rig.rightWrist.rotation.z = smoothLerp(rig.rightWrist.rotation.z, attackValue('rwz', 0), attackTiming ? attackArmRate : .22);
    }
    if (rig.rightHandGrip) {
      rig.rightHandGrip.rotation.x = smoothLerp(rig.rightHandGrip.rotation.x, attackValue('hgx', ai.attackGrip?.x ?? -.34), attackTiming ? attackArmRate : .22);
      rig.rightHandGrip.rotation.y = smoothLerp(rig.rightHandGrip.rotation.y, attackValue('hgy', ai.attackGrip?.y ?? .2), attackTiming ? attackArmRate : .22);
      rig.rightHandGrip.rotation.z = smoothLerp(rig.rightHandGrip.rotation.z, attackValue('hgz', ai.attackGrip?.z ?? -.85), attackTiming ? attackArmRate : .22);
    }
    if (rig.leftHip) rig.leftHip.rotation.x = smoothLerp(rig.leftHip.rotation.x, attackValue('lhx', ai.jumpTime > 0 ? -.52 : moving ? -0.5 + Math.sin(phase) * .85 : 0), attackTiming ? attackJointRate : .16);
    if (rig.rightHip) rig.rightHip.rotation.x = smoothLerp(rig.rightHip.rotation.x, attackValue('rhx', ai.jumpTime > 0 ? -.35 : moving ? 0.5 + Math.sin(phase + Math.PI) * .85 : 0), attackTiming ? attackJointRate : .16);
    if (rig.leftKnee) rig.leftKnee.rotation.x = smoothLerp(rig.leftKnee.rotation.x, attackValue('lk', moving ? 0.62 + Math.sin(phase + Math.PI) * .35 : .2), attackTiming ? attackJointRate : .18);
    if (rig.rightKnee) rig.rightKnee.rotation.x = smoothLerp(rig.rightKnee.rotation.x, attackValue('rk', moving ? 0.62 + Math.sin(phase) * .35 : .2), attackTiming ? attackJointRate : .18);
    if (rig.cape) {
      rig.cape.rotation.x = smoothLerp(rig.cape.rotation.x, .08 + Math.sin(phase * 0.9) * .2 + attackPose * .25, .16);
      rig.cape.rotation.z = smoothLerp(rig.cape.rotation.z, -Math.sin(phase * 1.2) * .24, .18);
    }
    if (rig.rightHandGrip && !ai.attackPoses) {
      const weaponBlend = ai.weaponStanceBlend || 0;
      rig.rightHandGrip.rotation.x = smoothLerp(rig.rightHandGrip.rotation.x, weaponBlend * (-0.34 + Math.sin(phase + 1.1) * .12 + attackPose * .68), .18);
      rig.rightHandGrip.rotation.y = smoothLerp(rig.rightHandGrip.rotation.y, weaponBlend * (0.2 + Math.sin(phase) * .1), .18);
      rig.rightHandGrip.rotation.z = smoothLerp(rig.rightHandGrip.rotation.z, weaponBlend * (-0.85 + Math.sin(phase) * .14), .18);
    }
    if (rig.swordGroup) {
      if (ai.weaponArmed && !ai.weaponTransition) {
        rig.swordGroup.rotation.x = .22 + Math.sin(phase) * .12 + attackPose * 1.24;
        rig.swordGroup.rotation.z = Math.PI - .42 + Math.sin(phase * 0.7) * .08 - attackPose * 1.38;
      }
      if (ai.attackPoses && ai.attackSwordStart) {
        const timing = ai.attackPoses.timing;
        const strikeProgress = THREE.MathUtils.clamp((ai.attackElapsed - timing.windup) / timing.strike, 0, 1);
        const strikeEnd = timing.windup + timing.strike;
        const recoveryProgress = THREE.MathUtils.clamp((ai.attackElapsed - strikeEnd) / timing.recovery, 0, 1);
        const swordSwing = ai.attackElapsed < timing.windup ? 0 : ai.attackElapsed < strikeEnd ? easeOut(strikeProgress) : 1 - easeInOut(recoveryProgress);
        const swordSide = ai.attackHit === 2 ? -1 : 1;
        const swordWindup = ai.attackElapsed < timing.windup ? (1 - THREE.MathUtils.clamp(ai.attackElapsed / timing.windup, 0, 1)) * swordSide * .28 : 0;
        const start = ai.attackSwordStart;
        rig.swordGroup.rotation.x = start.x + swordWindup * .30 - (ai.attackHit === 3 ? .62 : .48) * swordSwing;
        rig.swordGroup.rotation.y = start.y + (ai.attackHit === 2 ? -.18 : .08) * swordSwing;
        rig.swordGroup.rotation.z = start.z + swordWindup * .30 - swordSide * .42 * swordSwing;
        if (ai.attackHit === 1 && rig.swordGroup.parent && swordSwing > 0) {
          enemy.updateWorldMatrix(true, true);
          const handRotation = rig.swordGroup.parent.getWorldQuaternion(new THREE.Quaternion());
          const forwardInHand = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(enemy.getWorldQuaternion(new THREE.Quaternion()))
            .applyQuaternion(handRotation.invert())
            .normalize();
          const forwardBladeRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forwardInHand);
          rig.swordGroup.quaternion.slerp(forwardBladeRotation, swordSwing);
        }
      }
    }
    updateEnemyWeaponStance(enemy, wantsWeaponsDrawn, delta);
  }
}
function triggerShockwave() {
  if (playerPowerCooldownRemaining('hurricane') > 0) return 0;
  if (!canPayPlayerResources(18, 12, 'Giro de Espada')) return 0;
  spendMana(18, 'Giro de Espada'); spendStamina(12, 'Giro de Espada');
  startPlayerPowerCooldown('hurricane');
  const origin = new THREE.Vector3(heroGroup.position.x, 0, heroGroup.position.z);
  shockwaveRing.position.set(origin.x, .045, origin.z);
  shockwaveRing.scale.setScalar(.001);
  shockwaveRing.material.opacity = .82;
  shockwaveRing.visible = true;
  shockwaveTimer = .4;
  const safeOrigin = isInSafePlaza(origin);
  let hits = 0;
  scene.traverse(enemy => {
    if (!enemy.userData?.isEnemy || safeOrigin || isInSafePlaza(enemy.position)) return;
    const enemyPosition = enemy.getWorldPosition(new THREE.Vector3());
    const direction = enemyPosition.clone().sub(origin);
    direction.y = 0;
    const distance = direction.length();
    if (distance > 3) return;
    if (distance > 0) direction.normalize();
    if (enemy.userData.isTrainingDummy) registerTrainingDummyHit(enemy, direction);
    else {
      damageEnemy(enemy, 35 + physicalAttackBonus(), direction, 1.35);
      enemy.position.x += direction.x * 1.2;
      enemy.position.z += direction.z * 1.2;
    }
    registerCombatImpact(35 + physicalAttackBonus());
    hits++;
  });
  return hits;
}
function createSwordTrail(width, opacity, name) {
  const capacity = 72;
  const vertexCapacity = (capacity - 1) * 2 + 1;
  const positions = new Float32Array(vertexCapacity * 2 * 3);
  const colors = new Float32Array(vertexCapacity * 2 * 4);
  const indices = [];
  for (let i = 0; i < vertexCapacity - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  geometry.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({ color: '#fff8e0', transparent: true, opacity, vertexColors: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, depthTest: false, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, width, opacity, samples: [], capacity, vertexCapacity, active: false, finished: false, fadeElapsed: 0, fadeDelay: 0 };
}
function clearSwordTrail(trail) {
  trail.samples.length = 0;
  trail.active = false;
  trail.finished = false;
  trail.fadeElapsed = 0;
  trail.mesh.visible = false;
  trail.mesh.geometry.setDrawRange(0, 0);
  if (trail.glow) clearSwordTrail(trail.glow);
}
function readSwordPoints() {
  swordGroup.updateWorldMatrix(true, true);
  return {
    guard: swordGuard.getWorldPosition(new THREE.Vector3()),
    midpoint: swordBlade.getWorldPosition(new THREE.Vector3()),
    tip: swordBlade.localToWorld(new THREE.Vector3(0, .26, 0))
  };
}
function pushSwordSample(trail) {
  const sample = readSwordPoints();
  const previous = trail.samples[trail.samples.length - 1];
  if (previous && previous.tip.distanceToSquared(sample.tip) < .000016) trail.samples[trail.samples.length - 1] = sample;
  else trail.samples.push(sample);
  if (trail.samples.length > trail.capacity) trail.samples.shift();
  if (trail.glow) {
    trail.glow.samples = trail.samples;
    trail.glow.active = trail.active;
    trail.glow.finished = trail.finished;
    trail.glow.fadeElapsed = trail.fadeElapsed;
    trail.glow.fadeDelay = trail.fadeDelay;
  }
}
function beginSwordTrail(trail, recovery) {
  clearSwordTrail(trail);
  trail.active = true;
  trail.fadeDelay = Math.max(0, recovery - .15);
  pushSwordSample(trail);
}
function finishSwordTrail(trail) {
  if (!trail?.active) return;
  trail.active = false;
  trail.finished = true;
  trail.fadeElapsed = 0;
  trail.fadeDelay = 0;
}
function updateSwordTrailGeometry(trail, opacity) {
  const samples = trail.samples;
  const count = samples.length;
  if (count < 2) {
    trail.mesh.visible = false;
    return;
  }
  const curve = new THREE.CatmullRomCurve3(samples.map(sample => sample.tip), false, 'centripetal');
  const pathPoints = curve.getPoints((count - 1) * 2);
  const pointCount = pathPoints.length;
  const positions = trail.mesh.geometry.attributes.position.array;
  const colors = trail.mesh.geometry.attributes.color.array;
  let previousSide = null;
  const cameraPosition = camera.position;
  for (let i = 0; i < pointCount; i++) {
    const current = pathPoints[i];
    const before = pathPoints[Math.max(0, i - 1)];
    const after = pathPoints[Math.min(pointCount - 1, i + 1)];
    const tangent = after.clone().sub(before).normalize();
    if (tangent.lengthSq() < .000001) tangent.set(0, 1, 0);
    const view = cameraPosition.clone().sub(current).normalize();
    const side = view.clone().cross(tangent).normalize();
    if (side.lengthSq() < .000001) side.set(1, 0, 0);
    if (previousSide && side.dot(previousSide) < 0) side.negate();
    previousSide = side;
    const u = pointCount < 2 ? 1 : i / (pointCount - 1);
    const taper = (.65 + .35 * Math.sin(u * Math.PI * .5)) * (1 - .9 * Math.pow(u, 6));
    const halfWidth = trail.width * taper * .5;
    const center = current.clone().addScaledVector(view, .025);
    const left = center.clone().addScaledVector(side, halfWidth);
    const right = center.clone().addScaledVector(side, -halfWidth);
    const offset = i * 6;
    positions[offset] = left.x; positions[offset + 1] = left.y; positions[offset + 2] = left.z;
    positions[offset + 3] = right.x; positions[offset + 4] = right.y; positions[offset + 5] = right.z;
    const alpha = (.12 + .88 * Math.pow(u, .7)) * opacity;
    const colorOffset = i * 8;
    for (let vertex = 0; vertex < 2; vertex++) {
      const colorIndex = colorOffset + vertex * 4;
      colors[colorIndex] = 1; colors[colorIndex + 1] = .84; colors[colorIndex + 2] = .48; colors[colorIndex + 3] = alpha;
    }
  }
  trail.mesh.geometry.attributes.position.needsUpdate = true;
  trail.mesh.geometry.attributes.color.needsUpdate = true;
  trail.mesh.geometry.setDrawRange(0, (pointCount - 1) * 6);
  trail.mesh.material.opacity = trail.opacity;
  trail.mesh.visible = opacity > 0;
  if (trail.glow) updateSwordTrailGeometry(trail.glow, opacity);
}
function updateSwordTrailEffects(delta) {
  slashTrails.forEach(trail => {
    if (trail.finished) trail.fadeElapsed += delta;
    const fade = trail.finished ? THREE.MathUtils.clamp(1 - Math.max(0, trail.fadeElapsed - trail.fadeDelay) / .15, 0, 1) : trail.active ? 1 : 0;
    if (trail.samples.length > 1) updateSwordTrailGeometry(trail, fade);
    if (trail.glow) {
      trail.glow.samples = trail.samples;
      trail.glow.finished = trail.finished;
      trail.glow.fadeElapsed = trail.fadeElapsed;
      trail.glow.fadeDelay = trail.fadeDelay;
    }
    if (trail.finished && fade === 0) clearSwordTrail(trail);
  });
}
function easeIn(progress) { return progress * progress; }
function easeOut(progress) { return 1 - (1 - progress) * (1 - progress); }
function easeInOut(progress) { return progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2; }
function smoothAlpha(rate, delta = animationDelta) { return 1 - Math.pow(1 - rate, delta * 60); }
function smoothLerp(current, target, rate) { return THREE.MathUtils.lerp(current, target, smoothAlpha(rate)); }
function buildAttackPoses(hit) {
  const neutral = {
    rsx: -.72, rsz: -.08, rsy: 0, rex: -.78, rez: 0, rwx: 0, rwy: 0, rwz: 0,
    tx: 0, ty: 0, tz: 0, nx: 0, ny: 0, hdx: 0, hdy: 0,
    hy: 0, hz: 0, hpy: .95, lhx: 0, rhx: 0,
    lsx: 0, lsy: 0, lsz: .08, lex: -.18, lez: 0, lk: 0, rk: 0
  };
  const pose = values => ({ ...neutral, ...values, rsx: (values.rsx ?? 0) - .72, rex: (values.rex ?? -.18) - .60 });
  const lift = pose({ rsx: -.18, rsz: -.18, rex: -.72, rez: .12, rwz: .08, tx: -.03 });
  let wind;
  let strike;
  let timing;
  if (hit === 1) {
    wind = pose({ rsx: .08, rsz: -.38, rsy: .18, rex: -1.02, rez: -.16, rwx: .06, rwy: .08, rwz: .20, ty: -.28, tx: -.24, tz: -.08, hy: -.24, hz: .06, hpy: .82, ny: -.18, hdy: .04, lk: .36, rk: .28, lhx: -.12, rhx: .10, lsx: -.28, lsy: -.08, lsz: .28, lex: -.56, lez: -.12 });
    strike = pose({ rsx: 1.25, rsz: .08, rsy: -.12, rex: .15, rez: .04, rwx: -.04, rwy: -.08, rwz: -.18, ty: .42, tx: .52, tz: .08, hy: .34, hz: -.05, hpy: .92, ny: .18, hdy: -.04, lk: .24, rk: .40, lhx: .24, rhx: -.18, lsx: .18, lsy: .10, lsz: -.34, lex: -.84, lez: .12 });
    timing = { lift: .09, windup: .27, strike: .16, recovery: .21, step: .34, arc: 135, damage: 25 };
  } else if (hit === 2) {
    wind = pose({ rsx: -.55, rsz: -.28, rsy: .22, rex: -1.28, rez: -.10, rwx: .08, rwy: .08, rwz: .18, ty: .22, tx: -.18, tz: -.06, hy: .16, hz: .07, hpy: .86, ny: .12, nx: -.18, hdy: .05, lk: .32, rk: .22, lhx: -.18, rhx: .12, lsx: -.26, lsy: -.08, lsz: .28, lex: -.5, lez: -.12 });
    strike = pose({ rsx: 1.4, rsz: .06, rsy: -.16, rex: .12, rez: .04, rwx: -.06, rwy: -.10, rwz: -.20, ty: -.30, tx: .40, tz: .08, hy: -.24, hz: -.06, hpy: .99, ny: -.14, nx: .22, hdy: -.05, lk: .18, rk: .42, lhx: .22, rhx: -.14, lsx: .14, lsy: .10, lsz: -.30, lex: -.78, lez: .14 });
    timing = { lift: .12, windup: .32, strike: .19, recovery: .26, step: .44, arc: 135, damage: 35 };
  } else {
    wind = pose({ rsx: .34, rsz: -.42, rsy: .24, rex: -1.42, rez: -.12, rwx: .12, rwy: .12, rwz: .22, ty: -.20, tx: .26, tz: .10, hpy: .83, hy: -.18, hz: .10, lk: .54, rk: .62, lhx: -.26, rhx: -.20, ny: .16, nx: .14, hdy: .06, lsx: -.34, lsy: -.12, lsz: .34, lex: -.62, lez: -.16 });
    strike = pose({ rsx: 1.55, rsz: .10, rsy: -.18, rex: .10, rez: .08, rwx: -.10, rwy: -.12, rwz: -.38, ty: .50, tx: -.20, tz: -.10, hpy: .99, hy: .34, hz: -.10, lk: .12, rk: .16, lhx: .24, rhx: .18, ny: -.18, nx: -.12, hdy: -.06, lsx: .28, lsy: .14, lsz: -.34, lex: -.82, lez: .16 });
    timing = { lift: .18, windup: .44, strike: .25, recovery: .39, step: .60, arc: 110, damage: 50 };
  }
  const follow = { ...strike };
  follow.ty += Math.sign(strike.ty || -1) * .08;
  follow.hy += Math.sign(strike.hy || -1) * .07;
  follow.tx += hit === 2 ? .06 : -.04;
  follow.rsz += hit === 1 ? -.10 : -.08;
  follow.rsx += hit === 2 ? .12 : -.08;
  follow.rex += hit === 3 ? .12 : -.06;
  follow.rwx += hit === 3 ? -.06 : .04;
  return { neutral, lift, wind, strike, follow, timing };
}
function startEnemyAttackAnimation(ai, rig, hit, pending) {
  const poses = buildAttackPoses(hit);
  ai.attackPoses = poses;
  ai.attackElapsed = 0;
  ai.attackDuration = poses.timing.windup + poses.timing.strike + poses.timing.recovery;
  ai.attackTimer = ai.attackDuration;
  ai.attackHit = hit;
  ai.attackSwordStart = rig.swordGroup ? { x: rig.swordGroup.rotation.x, y: rig.swordGroup.rotation.y, z: rig.swordGroup.rotation.z } : null;
  ai.attackGrip = rig.rightHandGrip ? { x: rig.rightHandGrip.rotation.x, y: rig.rightHandGrip.rotation.y, z: rig.rightHandGrip.rotation.z } : null;
  ai.attackPending = pending;
}
function sampleAttackPose(poses, key, elapsed) {
  const liftEnd = poses.timing.lift;
  const windup = poses.timing.windup;
  const strikeEnd = windup + poses.timing.strike;
  const followEnd = strikeEnd + .08;
  const total = strikeEnd + poses.timing.recovery;
  const start = poses.neutral[key];
  if (elapsed < liftEnd) return THREE.MathUtils.lerp(start, poses.lift[key], easeInOut(elapsed / liftEnd));
  if (elapsed < windup) return THREE.MathUtils.lerp(poses.lift[key], poses.wind[key], easeInOut((elapsed - liftEnd) / (windup - liftEnd)));
  if (elapsed < strikeEnd) return THREE.MathUtils.lerp(poses.wind[key], poses.strike[key], easeOut((elapsed - windup) / poses.timing.strike));
  if (elapsed < followEnd) return THREE.MathUtils.lerp(poses.strike[key], poses.follow[key], easeOut((elapsed - strikeEnd) / .08));
  if (elapsed < total) return poses.follow[key];
  return poses.follow[key];
}
function hitEnemiesInAttack(poses) {
  if (isInSafePlaza(heroRoot.position)) return 0;
  let hits = 0;
  const damage = poses.timing.damage + physicalAttackBonus();
  const criticalChance = rpgState ? derivedCharacterStats().critical : 0;
  const unarmed = weaponThrown || !rpgState?.equipment?.weapon;
  const swordPoints = unarmed ? null : readSwordPoints();
  const blade = swordPoints ? swordPoints.tip.clone().sub(swordPoints.guard) : null;
  const bladeLengthSq = blade?.lengthSq() || 1;
  scene.traverse(enemy => {
    if (!enemy.userData?.isEnemy || enemy.userData.health <= 0 || activeAttackHitTargets.has(enemy.uuid)) return;
    if (isInSafePlaza(enemy.position)) return;
    const enemyPosition = enemy.getWorldPosition(new THREE.Vector3());
    enemyPosition.y += .8;
    const fromPlayer = enemyPosition.clone().sub(heroGroup.position);
    const distance = Math.hypot(fromPlayer.x, fromPlayer.z);
    const lockedTarget = enemy === activeAttackTarget;
    const forestReach = enemy.userData.isForestCreature ? 2.65 : 1.9;
    if (!distance || distance > (unarmed ? 1.65 : lockedTarget ? 3.15 : forestReach)) return;
    if (unarmed) {
      const fist = rightHand.getWorldPosition(new THREE.Vector3());
      if (fist.distanceToSquared(enemyPosition) > .9 * .9) return;
    } else {
      const { guard } = swordPoints;
      const alongBlade = THREE.MathUtils.clamp(enemyPosition.clone().sub(guard).dot(blade) / bladeLengthSq, 0, 1);
      const closest = guard.clone().addScaledVector(blade, alongBlade);
      const directBodyHit = (lockedTarget && distance <= 3.15) || (enemy.userData.isForestCreature && distance <= 2.65);
      if (!directBodyHit && closest.distanceToSquared(enemyPosition) > .58 * .58) return;
    }
    const direction = new THREE.Vector3(fromPlayer.x, 0, fromPlayer.z).normalize();
    const criticalHit = Math.random() * 100 < criticalChance;
    const finalDamage = damage * (criticalHit ? 1.5 : 1);
    const enemyAi = enemy.userData.ai;
    if (enemyAi?.attackTimer > 0 || (enemy.userData.isPlayer && enemy.userData.attacking)) {
      const clashPoint = heroGroup.position.clone().add(enemy.position).multiplyScalar(.5);
      clashPoint.y += 1.1;
      emitSwordClash(clashPoint);
      if (enemyAi) {
        enemyAi.stunTimer = Math.max(enemyAi.stunTimer || 0, .28);
        enemyAi.comboRemaining = 0;
        enemyAi.attackTimer = 0;
        enemyAi.attackPoses = null;
        enemyAi.attackPending = null;
      }
    }
    const blocked = Boolean(trainingMode && enemyAi?.blocking);
    let actualDamage = finalDamage;
    if (enemy.userData.isTrainingDummy) registerTrainingDummyHit(enemy, direction);
    else actualDamage = damageEnemy(enemy, finalDamage, direction, poses.timing.damage / 18) ?? finalDamage;
    if (enemy.userData.isForestCreature && actualDamage > 0) {
      spawnForestHitEffects(enemy, enemyPosition, direction);
      audioManager?.playForestImpact(enemy.userData.speciesId === 'hollow_trunk' ? 1.15 : .78);
    }
    if (!blocked) {
      registerCombatImpact(actualDamage, criticalHit);
      if (trainingMode) {
        if (unarmed) recordTrainingAction('fistHit');
        else if (heavyAttackActive) recordTrainingAction('heavyHit');
        else if (comboHit === 3) recordTrainingAction('combo');
        else recordTrainingAction('lightHit');
      }
    }
    activeAttackHitTargets.add(enemy.uuid);
    hits++;
  });
  return hits;
}
function spawnMediaLunaGroundImpact(position) {
  shockwaveRing.position.set(position.x, .045, position.z);
  shockwaveRing.scale.setScalar(.001);
  shockwaveRing.material.opacity = .88;
  shockwaveRing.visible = true;
  shockwaveTimer = .46;
  for (let index = 0; index < 8; index++) {
    const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(.07 + Math.random() * .09), new THREE.MeshBasicMaterial({ color: index % 2 ? '#d1ad76' : '#a7654d', transparent: true, opacity: .95, depthWrite: false }));
    const angle = index / 8 * Math.PI * 2;
    mesh.position.set(position.x, .12, position.z);
    scene.add(mesh);
    mediaLunaDebris.push({ mesh, velocity: new THREE.Vector3(Math.cos(angle) * (1.1 + Math.random()), 1.5 + Math.random() * 1.8, Math.sin(angle) * (1.1 + Math.random())), life: .42 });
  }
}
function updateMediaLunaDebris(delta) {
  for (let index = mediaLunaDebris.length - 1; index >= 0; index--) {
    const debris = mediaLunaDebris[index];
    debris.life -= delta;
    debris.velocity.y -= 7 * delta;
    debris.mesh.position.addScaledVector(debris.velocity, delta);
    debris.mesh.rotation.x += delta * 7;
    debris.mesh.rotation.z += delta * 5;
    debris.mesh.material.opacity = Math.max(0, debris.life / .42);
    if (debris.life <= 0) {
      scene.remove(debris.mesh);
      debris.mesh.geometry.dispose();
      debris.mesh.material.dispose();
      mediaLunaDebris.splice(index, 1);
    }
  }
}
function prepareMediaLunaSlashEffects() {
  if (mediaLunaSlashResources) return;
  const outerSlash = new THREE.Shape();
  outerSlash.moveTo(-.48, -.7);
  outerSlash.quadraticCurveTo(-.3, -.16, .04, .24);
  outerSlash.quadraticCurveTo(.32, .58, .58, .82);
  outerSlash.quadraticCurveTo(.45, .44, .2, .04);
  outerSlash.quadraticCurveTo(-.08, -.39, -.48, -.7);
  const innerSlash = new THREE.Shape();
  innerSlash.moveTo(-.21, -.47);
  innerSlash.quadraticCurveTo(-.08, -.08, .16, .3);
  innerSlash.quadraticCurveTo(.31, .53, .48, .68);
  innerSlash.quadraticCurveTo(.36, .36, .13, -.03);
  innerSlash.quadraticCurveTo(-.04, -.31, -.21, -.47);
  const outerGeometry = new THREE.ShapeGeometry(outerSlash, 24);
  const innerGeometry = new THREE.ShapeGeometry(innerSlash, 24);
  const outerMaterial = new THREE.MeshBasicMaterial({ color: '#b9f1d5', transparent: true, opacity: .96, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false });
  const innerMaterial = new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: .92, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false });
  mediaLunaSlashResources = { outerGeometry, innerGeometry, outerMaterial, innerMaterial };
  const warmupScene = new THREE.Scene();
  const outer = new THREE.Mesh(outerGeometry, outerMaterial);
  outer.rotation.z = -.28;
  const inner = new THREE.Mesh(innerGeometry, innerMaterial);
  inner.rotation.z = .35;
  const warmup = new THREE.Group();
  warmup.add(outer, inner, new THREE.PointLight('#b9f1d5', 5.1, 8.7));
  warmupScene.add(warmup);
  renderer?.compile(warmupScene, camera);
}
function spawnMediaLunaSlashBurst(position, facingYaw, power = 1) {
  prepareMediaLunaSlashEffects();
  const group = new THREE.Group();
  const outer = new THREE.Mesh(mediaLunaSlashResources.outerGeometry, mediaLunaSlashResources.outerMaterial.clone());
  const inner = new THREE.Mesh(mediaLunaSlashResources.innerGeometry, mediaLunaSlashResources.innerMaterial.clone());
  outer.rotation.z = -.28;
  inner.rotation.z = .35;
  group.add(outer, inner);
  const light = new THREE.PointLight('#b9f1d5', 3.2 + power * 1.5, 5 + power * 1.7);
  group.add(light);
  group.position.copy(position);
  group.position.y += .92;
  group.rotation.y = facingYaw;
  group.scale.setScalar(.72);
  scene.add(group);
  mediaLunaSlashEffects.push({ group, elapsed: 0, duration: .36, meshes: [outer, inner], light, power });
}
function updateMediaLunaSlashEffects(delta) {
  for (let index = mediaLunaSlashEffects.length - 1; index >= 0; index--) {
    const effect = mediaLunaSlashEffects[index];
    effect.elapsed += delta;
    const progress = THREE.MathUtils.clamp(effect.elapsed / effect.duration, 0, 1);
    effect.group.scale.setScalar(.72 + easeOut(progress) * 1.3);
    effect.meshes.forEach((mesh, meshIndex) => { mesh.material.opacity = (1 - progress) * (meshIndex ? .84 : .96); });
    effect.light.intensity = (1 - progress) * (3.2 + effect.power * 1.5);
    if (progress < 1) continue;
    scene.remove(effect.group);
    effect.meshes.forEach(mesh => mesh.material.dispose());
    mediaLunaSlashEffects.splice(index, 1);
  }
}
function moveHeroForMediaLuna(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || isTownPositionBlocked(x, z)) return false;
  heroRoot.position.set(x, 0, z);
  return true;
}
function updateRisingSlash(delta) {
  const target = risingSlash.target;
  if (risingSlash.phase !== 'recovery' && (!target?.parent || !isLockTargetAlive(target))) beginMediaLunaRecovery();
  risingSlash.totalElapsed = (risingSlash.totalElapsed || 0) + delta;
  if (risingSlash.totalElapsed > 6.5 && risingSlash.phase !== 'recovery') beginMediaLunaRecovery();
  risingSlash.elapsed += delta;
  const elapsed = risingSlash.elapsed;
  const forwardX = risingSlash.directionX;
  const forwardZ = risingSlash.directionZ;
  if (risingSlash.phase === 'lift') {
    const progress = easeInOut(THREE.MathUtils.clamp(elapsed / MEDIA_LUNA_CONFIG.liftDuration, 0, 1));
    heroGroup.position.y = THREE.MathUtils.lerp(risingSlash.startY, .58, progress);
    torso.rotation.x = smoothLerp(torso.rotation.x, -.32, .24);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, .30 - progress * 1.9, .24);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.72 + progress * .4, .24);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -1.18 + progress * .94, .24);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, .28 - progress * .82, .26);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .72 - progress * 1.72, .25);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.72, .20);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.64, .22);
    leftKnee.rotation.x = smoothLerp(leftKnee.rotation.x, .38, .2);
    rightKnee.rotation.x = smoothLerp(rightKnee.rotation.x, .32, .2);
    cape.rotation.x = smoothLerp(cape.rotation.x, -.28, .18);
    if (elapsed >= MEDIA_LUNA_CONFIG.liftDuration) { risingSlash.phase = 'strike'; risingSlash.elapsed = 0; }
    return;
  }
  if (risingSlash.phase === 'strike') {
    const progress = easeOut(THREE.MathUtils.clamp(elapsed / MEDIA_LUNA_CONFIG.strikeDuration, 0, 1));
    const lunge = .58 * progress;
    const safeLunge = Math.min(lunge, Math.max(0, risingSlash.targetStartDistance - MEDIA_LUNA_GROUND_SPACING));
    moveHeroForMediaLuna(risingSlash.startX + forwardX * safeLunge, risingSlash.startZ + forwardZ * safeLunge);
    heroGroup.position.y = .58 + Math.sin(progress * Math.PI) * .12;
    torso.rotation.x = smoothLerp(torso.rotation.x, -.38, .25);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -1.6 - progress * .42, .32);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.24 + progress * .12, .25);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.24 - progress * .42, .30);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, -.48 + progress * .78, .3);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, -1.18 - progress * .35, .3);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -1.15, .25);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.52, .25);
    cape.rotation.x = smoothLerp(cape.rotation.x, .18, .20);
    if (!risingSlash.trailStarted) { risingSlash.trailStarted = true; beginSwordTrail(activeSlashTrail, .22); }
    else pushSwordSample(activeSlashTrail);
    if (elapsed >= .08 && !risingSlash.impactDone && target?.parent && isLockTargetAlive(target)) {
      risingSlash.impactDone = true;
      risingSlash.targetLiftStartY = target.position.y;
      spawnMediaLunaSlashBurst(target.position, heroRoot.rotation.y, 3);
      const damage = 48 + physicalAttackBonus();
      const direction = new THREE.Vector3(forwardX, 0, forwardZ);
      if (target.userData.isPlayer) sendPlayerAttack(target.userData.playerId, 'mediaLunaLaunch');
      else if (target.userData.isTrainingDummy) registerTrainingDummyHit(target, direction);
      else damageEnemy(target, damage, direction, 1.2);
      registerCombatImpact(damage, false, 1, false, 0);
      showCombatFeedback('CORTE ASCENDENTE');
      cameraShakeDuration = .18; cameraShakeTimer = cameraShakeDuration; cameraShakeStrength = .09;
      audioManager?.playSwordImpact(1.4);
      audioManager?.playSwordSwing(1.55);
      if (target.userData.ai) {
        target.userData.ai.mediaLunaHold = true;
        target.userData.ai.mediaLunaAirY = target.position.y;
        target.userData.ai.launchTimer = 0;
        target.userData.ai.jumpTime = 0;
        target.userData.ai.stunTimer = Math.max(target.userData.ai.stunTimer || 0, .9);
      }
    }
    if (risingSlash.impactDone && target?.parent) {
      const launchProgress = easeOut(THREE.MathUtils.clamp((elapsed - .08) / .16, 0, 1));
      target.position.y = THREE.MathUtils.lerp(risingSlash.targetLiftStartY || 0, .88, launchProgress);
      if (target.userData.ai) target.userData.ai.mediaLunaAirY = target.position.y;
    }
    if (elapsed >= MEDIA_LUNA_CONFIG.strikeDuration) {
      finishSwordTrail(activeSlashTrail);
      if (risingSlash.impactDone && isLockTargetAlive(target) && (target.userData.ai || target.userData.isTrainingDummy)) {
        risingSlash.phase = 'airAscend';
        risingSlash.elapsed = 0;
        risingSlash.airPlayerStartY = heroGroup.position.y;
        risingSlash.airPlayerStartX = heroRoot.position.x;
        risingSlash.airPlayerStartZ = heroRoot.position.z;
        risingSlash.airTargetStartY = target.position.y;
      } else beginMediaLunaRecovery();
    }
    return;
  }
  if (risingSlash.phase === 'airAscend') {
    const progress = easeInOut(THREE.MathUtils.clamp(elapsed / MEDIA_LUNA_CONFIG.ascentDuration, 0, 1));
    const followX = target.position.x - forwardX * .9;
    const followZ = target.position.z - forwardZ * .9;
    moveHeroForMediaLuna(THREE.MathUtils.lerp(risingSlash.airPlayerStartX, followX, progress), THREE.MathUtils.lerp(risingSlash.airPlayerStartZ, followZ, progress));
    heroRoot.rotation.y = Math.atan2(target.position.x - heroRoot.position.x, target.position.z - heroRoot.position.z);
    heroGroup.position.y = THREE.MathUtils.lerp(risingSlash.airPlayerStartY, MEDIA_LUNA_CONFIG.airHeight + MEDIA_LUNA_CONFIG.playerAirOffset, progress);
    target.position.y = THREE.MathUtils.lerp(risingSlash.airTargetStartY, MEDIA_LUNA_CONFIG.airHeight, progress);
    if (target.userData.ai) target.userData.ai.mediaLunaAirY = target.position.y;
    torso.rotation.x = smoothLerp(torso.rotation.x, -.16, .2);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -1.08, .2);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.18, .2);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.98, .2);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, .24, .2);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .08, .2);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.55, .2);
    cape.rotation.x = smoothLerp(cape.rotation.x, -.1, .2);
    if (elapsed >= MEDIA_LUNA_CONFIG.ascentDuration) {
      risingSlash.phase = 'airborne'; risingSlash.elapsed = 0;
      risingSlash.airWindowRemaining = MEDIA_LUNA_CONFIG.decisionWindow;
      risingSlash.airComboHits = 0;
      startAirComboHit();
    }
    return;
  }
  if (risingSlash.phase === 'airborne') {
    risingSlash.airWindowRemaining -= delta;
    heroGroup.position.y = MEDIA_LUNA_CONFIG.airHeight + MEDIA_LUNA_CONFIG.playerAirOffset + Math.sin(elapsed * 4) * .025;
    target.position.y = MEDIA_LUNA_CONFIG.airHeight + Math.sin(elapsed * 3.3) * .02;
    if (target.userData.ai) target.userData.ai.mediaLunaAirY = target.position.y;
    heroRoot.rotation.y = Math.atan2(target.position.x - heroRoot.position.x, target.position.z - heroRoot.position.z);
    torso.rotation.x = smoothLerp(torso.rotation.x, -.12, .16);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -1.02, .16);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.94, .16);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, .22, .16);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .08, .16);
    if (risingSlash.airWindowRemaining <= 0) beginMediaLunaRecovery();
    return;
  }
  if (risingSlash.phase === 'airCombo') {
    risingSlash.airWindowRemaining -= delta;
    const targetX = target.position.x, targetZ = target.position.z;
    const distance = Math.hypot(targetX - heroRoot.position.x, targetZ - heroRoot.position.z) || .001;
    const facingYaw = Math.atan2(targetX - heroRoot.position.x, targetZ - heroRoot.position.z);
    heroRoot.rotation.y = facingYaw;
    moveHeroForMediaLuna(
      THREE.MathUtils.lerp(heroRoot.position.x, targetX - Math.sin(facingYaw) * MEDIA_LUNA_GROUND_SPACING, .08),
      THREE.MathUtils.lerp(heroRoot.position.z, targetZ - Math.cos(facingYaw) * MEDIA_LUNA_GROUND_SPACING, .08)
    );
    heroGroup.position.y = MEDIA_LUNA_CONFIG.airHeight + MEDIA_LUNA_CONFIG.playerAirOffset;
    target.position.y = MEDIA_LUNA_CONFIG.airHeight;
    if (target.userData.ai) target.userData.ai.mediaLunaAirY = target.position.y;
    const finalAirHit = risingSlash.airComboIndex === MEDIA_LUNA_CONFIG.maxAirHits - 1;
    const strikeIndex = risingSlash.airComboIndex;
    const windupEnd = MEDIA_LUNA_CONFIG.airWindup;
    const strikeEnd = windupEnd + MEDIA_LUNA_CONFIG.airStrike;
    const total = strikeEnd + MEDIA_LUNA_CONFIG.airRecovery;
    const strikeProgress = easeInOut(THREE.MathUtils.clamp((elapsed - windupEnd) / MEDIA_LUNA_CONFIG.airStrike, 0, 1));
    const shoulderX = [-1.82, -.58, -1.28, -.18, -1.64, -.74, -1.38, -.32, -1.92][strikeIndex];
    const shoulderZ = [.52, -.48, .82, -.12, -.68, .64, -.34, .9, -.18][strikeIndex];
    torso.rotation.x = smoothLerp(torso.rotation.x, [.08, -.22, -.34, -.48, -.08, -.3, -.18, -.42, -.56][strikeIndex] + Math.sin(elapsed * 18) * .02, .24);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, elapsed < windupEnd ? -.24 : shoulderX + strikeProgress * .58, .32);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, elapsed < windupEnd ? -.72 : shoulderZ - strikeProgress * shoulderZ * 1.7, .32);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, elapsed < windupEnd ? -1.28 : [-.22, -1.62, -.44, -.08, -.92, -.38, -.76, -.16, -.12][strikeIndex], .3);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, elapsed < windupEnd ? .16 : [-.62, .42, -.78, -.12, .34, -.54, .18, -.72, -.82][strikeIndex], .32);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, elapsed < windupEnd ? .44 : [-1.24, .88, -1.62, -.18, .72, -1.38, .54, -1.72, -1.2][strikeIndex], .32);
    if (finalAirHit) {
      const forwardLunge = easeOut(THREE.MathUtils.clamp((elapsed - windupEnd) / MEDIA_LUNA_CONFIG.airStrike, 0, 1)) * .42;
      moveHeroForMediaLuna(risingSlash.airComboPlayerStartX + Math.sin(facingYaw) * forwardLunge, risingSlash.airComboPlayerStartZ + Math.cos(facingYaw) * forwardLunge);
    }
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.62 + strikeProgress * .2, .2);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.74, .2);
    if (elapsed >= windupEnd && elapsed <= strikeEnd && activeSlashTrail) {
      if (!risingSlash.airComboTrailStarted) { risingSlash.airComboTrailStarted = true; beginSwordTrail(activeSlashTrail, .19); }
      else pushSwordSample(activeSlashTrail);
    }
    if (!risingSlash.airComboImpactDone && elapsed >= windupEnd + .065 && elapsed <= strikeEnd && distance <= 2.5 && isLockTargetAlive(target)) {
      risingSlash.airComboImpactDone = true;
      const heavyAirHit = Boolean(risingSlash.airComboHeavy);
      const airHitDamage = Math.round((25 + physicalAttackBonus()) / MEDIA_LUNA_CONFIG.maxAirHits);
      const damage = heavyAirHit ? airHitDamage * 2 : finalAirHit ? Math.round(airHitDamage * 1.7) : airHitDamage;
      const direction = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw));
      risingSlash.airComboLaunchStartX = target.position.x;
      risingSlash.airComboLaunchStartZ = target.position.z;
      if (target.userData.isTrainingDummy) registerTrainingDummyHit(target, direction);
      else if (target.userData.isPlayer) sendPlayerAttack(target.userData.playerId, heavyAirHit ? 'mediaLunaHeavyAir' : 'mediaLunaAir');
      else damageEnemy(target, damage, direction, heavyAirHit ? 2.2 : finalAirHit ? 1.35 : .55);
      if (target.userData.ai) { target.userData.ai.mediaLunaAirY = MEDIA_LUNA_CONFIG.airHeight; target.userData.ai.stunTimer = Math.max(target.userData.ai.stunTimer || 0, .22); }
      registerCombatImpact(damage, false, finalAirHit ? 1.55 : 1.08);
      hitStopTimer = heavyAirHit ? .035 : finalAirHit ? .055 : .035;
      cameraShakeDuration = heavyAirHit ? .26 : finalAirHit ? .2 : .11; cameraShakeTimer = cameraShakeDuration; cameraShakeStrength = heavyAirHit ? .19 : finalAirHit ? .12 : .035;
      if (heavyAirHit) { audioManager?.playSwordSwing(1.75); showCombatFeedback('GOLPE FUERTE AÉREO · ' + Math.round(damage)); }
      else if (finalAirHit) showCombatFeedback('REMATE AÉREO · ' + Math.round(damage));
    }
    if ((finalAirHit || risingSlash.airComboHeavy) && risingSlash.airComboImpactDone && elapsed > windupEnd + .065) {
      const heavyAirHit = Boolean(risingSlash.airComboHeavy);
      const launchProgress = easeOut(THREE.MathUtils.clamp((elapsed - windupEnd - .065) / (heavyAirHit ? .48 : .25), 0, 1));
      const launchDistance = heavyAirHit ? 4.8 : 1.25;
      target.position.x = risingSlash.airComboLaunchStartX + Math.sin(facingYaw) * launchDistance * launchProgress;
      target.position.z = risingSlash.airComboLaunchStartZ + Math.cos(facingYaw) * launchDistance * launchProgress;
      target.position.y = MEDIA_LUNA_CONFIG.airHeight + Math.sin(launchProgress * Math.PI) * (heavyAirHit ? .72 : .3);
      if (target.userData.ai) {
        target.userData.ai.mediaLunaX = target.position.x;
        target.userData.ai.mediaLunaZ = target.position.z;
        target.userData.ai.mediaLunaAirY = target.position.y;
      }
    }
    if (elapsed >= total) {
      finishSwordTrail(activeSlashTrail);
      activeSlashTrail = null;
      if (risingSlash.airComboHits < MEDIA_LUNA_CONFIG.maxAirHits && risingSlash.airWindowRemaining > 0) {
        if (!startAirComboHit()) beginMediaLunaRecovery();
      } else beginMediaLunaRecovery();
    }
    return;
  }
  if (risingSlash.phase === 'groundSlam') {
    const total = MEDIA_LUNA_CONFIG.slamWindup + MEDIA_LUNA_CONFIG.slamDescent;
    const descent = THREE.MathUtils.clamp((elapsed - MEDIA_LUNA_CONFIG.slamWindup) / MEDIA_LUNA_CONFIG.slamDescent, 0, 1);
    const target = risingSlash.target;
    const facingYaw = Math.atan2(target.position.x - heroRoot.position.x, target.position.z - heroRoot.position.z);
    heroRoot.rotation.y = facingYaw;
    const landingX = risingSlash.slamX - Math.sin(facingYaw) * MEDIA_LUNA_GROUND_SPACING;
    const landingZ = risingSlash.slamZ - Math.cos(facingYaw) * MEDIA_LUNA_GROUND_SPACING;
    moveHeroForMediaLuna(THREE.MathUtils.lerp(risingSlash.slamPlayerX, landingX, easeInOut(descent)), THREE.MathUtils.lerp(risingSlash.slamPlayerZ, landingZ, easeInOut(descent)));
    heroGroup.position.y = THREE.MathUtils.lerp(risingSlash.slamPlayerY, .035, easeInOut(descent));
    target.position.y = THREE.MathUtils.lerp(risingSlash.slamTargetY, .035, easeInOut(descent));
    if (target.userData.ai) target.userData.ai.mediaLunaAirY = target.position.y;
    const slamPose = elapsed < MEDIA_LUNA_CONFIG.slamWindup ? 0 : easeOut(descent);
    torso.rotation.x = smoothLerp(torso.rotation.x, -.16 - slamPose * .72, .3);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -.42 - slamPose * 1.55, .34);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.3 + slamPose * .24, .3);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.85 - slamPose * .65, .3);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, -.1 - slamPose * .82, .3);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .3 + slamPose * 1.35, .34);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.8, .22);
    if (elapsed >= MEDIA_LUNA_CONFIG.slamWindup && activeSlashTrail) {
      if (!risingSlash.slamTrailStarted) { risingSlash.slamTrailStarted = true; beginSwordTrail(activeSlashTrail, .24); }
      else pushSwordSample(activeSlashTrail);
    }
    if (descent >= 1 && !risingSlash.slamImpactDone) {
      finishSwordTrail(activeSlashTrail);
      risingSlash.slamImpactDone = true;
      heroGroup.position.y = 0;
      target.position.y = 0;
      const damage = 96 + physicalAttackBonus();
      const direction = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw));
      if (target.userData.isTrainingDummy) registerTrainingDummyHit(target, direction);
      else if (target.userData.isPlayer) sendPlayerAttack(target.userData.playerId, 'mediaLunaSlam');
      else damageEnemy(target, damage, direction, 1.7);
      if (target.userData.ai) target.userData.ai.mediaLunaAirY = 0;
      registerCombatImpact(damage, false, 1.55);
      hitStopTimer = .075;
      cameraShakeDuration = .3; cameraShakeTimer = cameraShakeDuration; cameraShakeStrength = .2;
      spawnMediaLunaGroundImpact(target.position);
      showCombatFeedback('REMATE CONTRA EL SUELO');
      beginMediaLunaRecovery();
      return;
    }
    if (elapsed >= total) beginMediaLunaRecovery();
    return;
  }
  if (risingSlash.phase === 'recovery') {
    const progress = easeInOut(THREE.MathUtils.clamp(elapsed / MEDIA_LUNA_CONFIG.recoveryDuration, 0, 1));
    heroGroup.position.y = THREE.MathUtils.lerp(risingSlash.recoveryPlayerY || 0, 0, progress);
    if (target?.parent) target.position.y = THREE.MathUtils.lerp(risingSlash.recoveryTargetY || 0, 0, progress);
    torso.rotation.x = smoothLerp(torso.rotation.x, 0, .2);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.08, .2);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -.72, .2);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.78, .2);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, -.38, .2);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .18, .2);
    cape.rotation.x = smoothLerp(cape.rotation.x, 0, .18);
    if (elapsed >= MEDIA_LUNA_CONFIG.recoveryDuration) {
      const tutorialMoveLanded = risingSlash.impactDone;
      finishMediaLuna();
      if (tutorialActive && tutorialStep === 2 && tutorialMoveLanded) showTutorialStep(3);
    }
  }
}
function updateRisingSlashHud() {
  const meter = document.getElementById('aerial-combo-meter');
  if (!meter) return;
  const active = risingSlash.phase !== 'IDLE';
  meter.hidden = !active;
  if (!active) return;
  const label = document.getElementById('aerial-combo-label');
  const prompt = document.getElementById('aerial-combo-prompt');
  const fill = document.getElementById('aerial-combo-fill');
  const names = { lift: 'PREPARA EL CORTE', strike: 'CORTE ASCENDENTE', airAscend: 'SIGUE AL ENEMIGO', airborne: 'ENCUENTRO AÉREO', airCombo: 'COMBO AÉREO', groundSlam: 'REMATE DESCENDENTE', recovery: 'VOLVIENDO AL COMBATE' };
  label.textContent = risingSlash.phase === 'airCombo' ? 'COMBO AÉREO · ' + risingSlash.airComboHits + ' / ' + MEDIA_LUNA_CONFIG.maxAirHits : names[risingSlash.phase] || 'CORTE ASCENDENTE';
  prompt.textContent = risingSlash.phase === 'airborne' || risingSlash.phase === 'airCombo' || risingSlash.phase === 'airAscend' ? 'SECUENCIA AÉREA     G · GOLPE FUERTE     ESCUDO + ABAJO · AZOTAR' : risingSlash.phase === 'recovery' ? 'Recuperando el control…' : risingSlash.phase === 'groundSlam' ? 'AZOTE DESCENDENTE' : 'Pulsa MEDIA LUNA cerca de un enemigo';
  const progress = risingSlash.phase === 'lift' ? risingSlash.elapsed / .28 : risingSlash.phase === 'strike' ? risingSlash.elapsed / .24 : risingSlash.phase === 'airAscend' ? risingSlash.elapsed / MEDIA_LUNA_CONFIG.ascentDuration : risingSlash.phase === 'airborne' ? 1 - risingSlash.airWindowRemaining / MEDIA_LUNA_CONFIG.decisionWindow : risingSlash.phase === 'airCombo' ? risingSlash.elapsed / (MEDIA_LUNA_CONFIG.airWindup + MEDIA_LUNA_CONFIG.airStrike + MEDIA_LUNA_CONFIG.airRecovery) : risingSlash.phase === 'groundSlam' ? risingSlash.elapsed / (MEDIA_LUNA_CONFIG.slamWindup + MEDIA_LUNA_CONFIG.slamDescent) : risingSlash.elapsed / MEDIA_LUNA_CONFIG.recoveryDuration;
  fill.style.width = Math.round(THREE.MathUtils.clamp(progress, 0, 1) * 100) + '%';
}
function updateCombat(delta) {
  risingSlashGestureTimer = Math.max(0, risingSlashGestureTimer - delta);
  if (comboState === 'RISING_SLASH') { updateRisingSlash(delta); return; }
  if (comboState === 'IDLE') return;
  comboInputWindow = Math.max(0, comboInputWindow - delta);
  if (comboHit === 0) {
    comboElapsed += delta;
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -.72, .15);
    rightShoulder.rotation.y = smoothLerp(rightShoulder.rotation.y, 0, .15);
    rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.08, .24);
    rightShoulder.rotation.y = smoothLerp(rightShoulder.rotation.y, 0, .24);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, 0, .24);
    leftShoulder.rotation.y = smoothLerp(leftShoulder.rotation.y, 0, .24);
    leftShoulder.rotation.z = smoothLerp(leftShoulder.rotation.z, .08, .24);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.78, .32);
    rightElbow.rotation.z = smoothLerp(rightElbow.rotation.z, 0, .32);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.18, .32);
    leftElbow.rotation.z = smoothLerp(leftElbow.rotation.z, 0, .32);
    rightWrist.rotation.x = smoothLerp(rightWrist.rotation.x, 0, .38);
    rightWrist.rotation.y = smoothLerp(rightWrist.rotation.y, 0, .38);
    rightWrist.rotation.z = smoothLerp(rightWrist.rotation.z, 0, .38);
    leftWrist.rotation.x = smoothLerp(leftWrist.rotation.x, 0, .38);
    leftWrist.rotation.y = smoothLerp(leftWrist.rotation.y, 0, .38);
    leftWrist.rotation.z = smoothLerp(leftWrist.rotation.z, 0, .38);
    headGroup.rotation.x = smoothLerp(headGroup.rotation.x, 0, .20);
    headGroup.rotation.y = smoothLerp(headGroup.rotation.y, 0, .20);
    torso.rotation.x = smoothLerp(torso.rotation.x, 0, .15);
    torso.rotation.y = smoothLerp(torso.rotation.y, 0, .24);
    torso.rotation.z = smoothLerp(torso.rotation.z, 0, .24);
    neck.rotation.x = smoothLerp(neck.rotation.x, 0, .22);
    neck.rotation.y = smoothLerp(neck.rotation.y, 0, .22);
    hips.rotation.y = smoothLerp(hips.rotation.y, 0, .24);
    hips.rotation.z = smoothLerp(hips.rotation.z, 0, .24);
    hips.position.y = smoothLerp(hips.position.y, .95, .15);
    leftHip.rotation.x = smoothLerp(leftHip.rotation.x, 0, .15);
    rightHip.rotation.x = smoothLerp(rightHip.rotation.x, 0, .15);
    leftKnee.rotation.x = smoothLerp(leftKnee.rotation.x, 0, .15);
    rightKnee.rotation.x = smoothLerp(rightKnee.rotation.x, 0, .15);
    if (comboElapsed >= .6) {
      comboState = 'IDLE';
      comboElapsed = 0;
      comboQueued = false;
      activeAttackPoses = null;
      activeAttackTarget = null;
      if (tutorialActive && tutorialStep === 1 && tutorialComboDone) showTutorialStep(2);
    }
    return;
  }

  comboElapsed += delta;
  const poses = activeAttackPoses;
  const timing = poses.timing;
  const strikeStart = timing.windup;
  const strikeEnd = strikeStart + timing.strike;
  const totalDuration = strikeEnd + timing.recovery;
  const striking = comboElapsed >= strikeStart && comboElapsed < strikeEnd;
  const armRate = striking ? (activeAttackTarget ? .86 : .72) : activeAttackTarget ? .52 : .42;
  const bodyRate = striking ? .48 : activeAttackTarget ? .36 : .30;
  if (comboElapsed >= strikeEnd) comboState = 'RECOVERY';
  const value = (key, offset = 0) => sampleAttackPose(poses, key, comboElapsed + offset);
  hips.rotation.y = smoothLerp(hips.rotation.y, value('hy', .06), bodyRate);
  hips.rotation.z = smoothLerp(hips.rotation.z, value('hz', .06), bodyRate);
  hips.position.y = smoothLerp(hips.position.y, value('hpy', .06), bodyRate);
  leftHip.rotation.x = smoothLerp(leftHip.rotation.x, value('lhx', .035), .16);
  rightHip.rotation.x = smoothLerp(rightHip.rotation.x, value('rhx', .035), .16);
  torso.rotation.x = smoothLerp(torso.rotation.x, value('tx', .04), bodyRate);
  torso.rotation.y = smoothLerp(torso.rotation.y, value('ty', .04), bodyRate);
  torso.rotation.z = smoothLerp(torso.rotation.z, value('tz', .04), bodyRate);
  rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, value('rsx'), armRate);
  rightShoulder.rotation.y = smoothLerp(rightShoulder.rotation.y, value('rsy'), armRate);
  rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, value('rsz'), armRate);
  rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, value('rex', -.02), armRate);
  rightElbow.rotation.z = smoothLerp(rightElbow.rotation.z, value('rez', -.02), armRate);
  rightWrist.rotation.x = smoothLerp(rightWrist.rotation.x, value('rwx', -.04), armRate);
  rightWrist.rotation.y = smoothLerp(rightWrist.rotation.y, value('rwy', -.04), armRate);
  rightWrist.rotation.z = smoothLerp(rightWrist.rotation.z, value('rwz', -.04), armRate);
  rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, value('hgx', -.38), armRate);
  rightHandGrip.rotation.y = smoothLerp(rightHandGrip.rotation.y, value('hgy', .22), armRate);
  rightHandGrip.rotation.z = smoothLerp(rightHandGrip.rotation.z, value('hgz', -.82), armRate);
  const swordStrikeProgress = THREE.MathUtils.clamp((comboElapsed - strikeStart) / timing.strike, 0, 1);
  const swordRecoveryProgress = THREE.MathUtils.clamp((comboElapsed - strikeEnd) / timing.recovery, 0, 1);
  const swordSwing = comboElapsed < strikeStart ? 0 : comboElapsed < strikeEnd ? easeOut(swordStrikeProgress) : 1 - easeInOut(swordRecoveryProgress);
  const swordSide = comboHit === 2 ? -1 : 1;
  const swordWindup = comboElapsed < strikeStart ? (1 - THREE.MathUtils.clamp(comboElapsed / strikeStart, 0, 1)) * swordSide * .28 : 0;
  swordGroup.rotation.x = poses.swordStart.x + swordWindup * .30 - (comboHit === 3 ? .62 : .48) * swordSwing;
  swordGroup.rotation.y = poses.swordStart.y + (comboHit === 2 ? -.18 : .08) * swordSwing;
  swordGroup.rotation.z = poses.swordStart.z + swordWindup * .30 - swordSide * .42 * swordSwing;
  if (comboHit === 1 && swordGroup.parent) {
    heroGroup.updateWorldMatrix(true, true);
    const handRotation = swordGroup.parent.getWorldQuaternion(new THREE.Quaternion());
    const forwardInHand = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(heroGroup.getWorldQuaternion(new THREE.Quaternion()))
      .applyQuaternion(handRotation.invert())
      .normalize();
    const forwardBladeRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forwardInHand);
    swordGroup.quaternion.slerp(forwardBladeRotation, swordSwing);
  }
  neck.rotation.x = smoothLerp(neck.rotation.x, value('nx', -.02), .14);
  neck.rotation.y = smoothLerp(neck.rotation.y, value('ny', -.02), .14);
  headGroup.rotation.x = smoothLerp(headGroup.rotation.x, value('hdx', -.04), .12);
  headGroup.rotation.y = smoothLerp(headGroup.rotation.y, value('hdy', -.04), .12);
  leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, value('lsx', -.01), .22);
  leftShoulder.rotation.y = smoothLerp(leftShoulder.rotation.y, value('lsy', -.01), .22);
  leftShoulder.rotation.z = smoothLerp(leftShoulder.rotation.z, value('lsz', -.01), .22);
  leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, value('lex', -.02), .28);
  leftElbow.rotation.z = smoothLerp(leftElbow.rotation.z, value('lez', -.02), .28);
  leftKnee.rotation.x = smoothLerp(leftKnee.rotation.x, value('lk', .04), .27);
  rightKnee.rotation.x = smoothLerp(rightKnee.rotation.x, value('rk', .04), .27);

  if (comboElapsed >= strikeStart && comboElapsed < strikeEnd) {
    if (!attackStrikeStarted) {
      attackStrikeStarted = true;
      beginSwordTrail(activeSlashTrail, timing.recovery);
    } else {
      pushSwordSample(activeSlashTrail);
    }
    if (hitEnemiesInAttack(poses) > 0) hitStopTimer = Math.max(hitStopTimer, .055);
  } else if (attackStrikeStarted && activeSlashTrail.active) {
    activeSlashTrail.active = false;
    activeSlashTrail.finished = true;
    activeSlashTrail.fadeElapsed = 0;
    if (activeSlashTrail.glow) activeSlashTrail.glow.finished = true;
  }
  if (comboElapsed >= strikeStart) {
    const strikeProgress = THREE.MathUtils.clamp((comboElapsed - strikeStart) / timing.strike, 0, 1);
    const desiredStep = timing.step * easeOut(strikeProgress);
    const step = desiredStep - attackStepApplied;
    const stepX = heroRoot.position.x + Math.sin(heroRoot.rotation.y) * step;
    const stepZ = heroRoot.position.z + Math.cos(heroRoot.rotation.y) * step;
    if (!isTownPositionBlocked(stepX, heroRoot.position.z) && !isCombatantPositionBlocked(stepX, heroRoot.position.z)) heroRoot.position.x = stepX;
    if (!isTownPositionBlocked(heroRoot.position.x, stepZ) && !isCombatantPositionBlocked(heroRoot.position.x, stepZ)) heroRoot.position.z = stepZ;
    attackStepApplied = desiredStep;
  }
  if (comboElapsed >= totalDuration) {
    if (comboQueued && comboHit < 3) startComboHit(comboHit + 1);
    else if (!comboRecoveryWindowStarted) {
      comboRecoveryWindowStarted = true;
      comboInputWindow = .20;
    } else if (comboInputWindow <= 0) {
      comboState = 'RECOVERY';
      comboHit = 0;
      comboQueued = false;
      comboRecoveryWindowStarted = false;
      heavyAttackActive = false;
      activeAttackPoses = null;
      activeAttackTarget = null;
      comboElapsed = 0;
    }
  }
}
function animateLegToWorld(hip, knee, foot, targetWorld, state, rate = .38, toeFlex = 0) {
  const target = hips.worldToLocal(targetWorld.clone());
  const y = target.y - hip.position.y;
  const z = target.z - hip.position.z;
  const upperLength = .515;
  const lowerLength = .49;
  const distance = THREE.MathUtils.clamp(Math.hypot(y, z), Math.abs(upperLength - lowerLength) + .004, upperLength + lowerLength - .006);
  const bend = Math.acos(THREE.MathUtils.clamp((distance * distance - upperLength * upperLength - lowerLength * lowerLength) / (2 * upperLength * lowerLength), -1, 1));
  const kneeOffset = Math.atan2(lowerLength * Math.sin(bend), upperLength + lowerLength * Math.cos(bend));
  const upperAngle = Math.atan2(-z, -y) - kneeOffset;
  hip.rotation.x = smoothLerp(hip.rotation.x, upperAngle, rate);
  knee.rotation.x = smoothLerp(knee.rotation.x, bend, rate);
  foot.rotation.x = smoothLerp(foot.rotation.x, -upperAngle - bend + toeFlex, rate);
  if (state?.planted) {
    foot.parent.getWorldQuaternion(state.parentRotation || (state.parentRotation = new THREE.Quaternion()));
    foot.quaternion.copy(state.parentRotation.invert().multiply(state.rotation));
  }
}
function updateWalkingLeg(hip, knee, foot, state, cycle, stride, lift, runWeight) {
  const phase = cycle * Math.PI * 2;
  const swing = Math.sin(phase);
  const liftPhase = Math.max(0, swing);
  state.planted = false;
  hip.rotation.x = smoothLerp(hip.rotation.x, swing * stride, .38);
  knee.rotation.x = smoothLerp(knee.rotation.x, Math.max(0, Math.sin(phase + .8)) * THREE.MathUtils.lerp(.72, .98, runWeight), .38);
  foot.position.y = smoothLerp(foot.position.y, -.49 + liftPhase * lift, .38);
  foot.position.z = smoothLerp(foot.position.z, Math.cos(phase) * stride * .18, .38);
  foot.rotation.x = smoothLerp(foot.rotation.x, -liftPhase * .18, .38);
}
function updatePlayer(delta, time) {
  if (updateLocalMultiplayerHitReaction(delta)) return;
  arcaneOrbCooldown = Math.max(0, arcaneOrbCooldown - delta);
  const keys = window.gameKeys || {};
  updateHeroWeaponStance(delta);
  shieldParryTimer = Math.max(0, shieldParryTimer - delta);
  heroStunTimer = Math.max(0, heroStunTimer - delta);
  dashInvulnerability = Math.max(0, dashInvulnerability - delta);
  cameraShakeTimer = Math.max(0, cameraShakeTimer - delta);
  jumpBufferTimer = Math.max(0, jumpBufferTimer - delta);
  dashBufferTimer = Math.max(0, dashBufferTimer - delta);
  advanceShieldBash(delta);
  if (jumpBufferTimer > 0 && !jumpActive && jumpPhase !== 'landing' && comboState === 'IDLE') activatePlayerJump();
  const canAirDash = airDashAvailable && jumpActive && (jumpPhase === 'rising' || jumpPhase === 'falling');
  if (dashBufferTimer > 0 && comboState === 'IDLE' && ((!jumpActive && jumpPhase === 'ground') || canAirDash)) activatePlayerDash();
  if (jumpActive) {
    jumpElapsed += delta;
    if (jumpPhase === 'anticipation') {
      if (jumpElapsed >= .10) {
        jumpPhase = 'rising';
        verticalVelocity = 8;
      }
    } else {
      heroGroup.position.y += verticalVelocity * delta;
      verticalVelocity -= 13.333 * delta;
      if (verticalVelocity <= 0 && jumpPhase === 'rising') jumpPhase = 'falling';
      if (heroGroup.position.y <= 0 && verticalVelocity < 0) {
        heroGroup.position.y = 0;
        verticalVelocity = 0;
        jumpActive = false;
        jumpPhase = 'landing';
        recordTrainingAction('land');
        jumpLandTimer = .28;
        airDashAvailable = true;
        jumpStartedWithForward = false;
        leftFootPlant.planted = false;
        rightFootPlant.planted = false;
      }
    }
  } else if (jumpPhase === 'landing') {
    jumpLandTimer = Math.max(0, jumpLandTimer - delta);
    if (jumpLandTimer === 0) {
      jumpPhase = 'ground';
      leftFootPlant.planted = false;
      rightFootPlant.planted = false;
    }
  }
  if (!lockedEnemy) cameraYaw += cameraYawVelocity * delta;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + cameraPitchVelocity * delta, -1.1, .7);
  cameraYawVelocity = smoothLerp(cameraYawVelocity, 0, .10);
  cameraPitchVelocity = smoothLerp(cameraPitchVelocity, 0, .10);
  const gamepad = navigator.getGamepads?.()[0];
  const padX = gamepad?.axes?.[0] || 0, padY = gamepad?.axes?.[1] || 0;
  const leftTrigger = Boolean(gamepad?.buttons?.[LOCK_ON_CONFIG.lockButton]?.pressed);
  if (leftTrigger && !gamepadLockWasDown) toggleLockOn();
  gamepadLockWasDown = leftTrigger;
  const switchAxis = gamepad?.axes?.[2] || 0;
  if (Math.abs(switchAxis) < .3) gamepadSwitchLatch = 0;
  else if (Math.abs(switchAxis) > .65 && !gamepadSwitchLatch) { changeLockTarget(switchAxis < 0 ? -1 : 1); gamepadSwitchLatch = Math.sign(switchAxis); }
  let stickX = joystickVector.x + (Math.abs(padX) > .16 ? padX : 0) + (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  let stickY = joystickVector.y - (Math.abs(padY) > .16 ? padY : 0) + (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0);
  if (heroStunTimer > 0 || comboState === 'RISING_SLASH' || shieldBash.phase !== 'IDLE') { stickX = 0; stickY = 0; }
  const magnitude = Math.hypot(stickX, stickY);
  if (magnitude > 1) { stickX /= magnitude; stickY /= magnitude; }
  const hasInput = magnitude > .06;
  if(hasInput)dismissChapterIntro();
  let moveX = stickX * Math.cos(cameraYaw) - stickY * Math.sin(cameraYaw);
  let moveZ = -stickX * Math.sin(cameraYaw) - stickY * Math.cos(cameraYaw);
  if (dashCooldown > 0) dashCooldown = Math.max(0, dashCooldown - delta);
  updatePlayerPowerCooldowns(delta);
  
  
  const dashWasActive = dashTimer > 0;
  if (dashTimer > 0) dashTimer = Math.max(0, dashTimer - delta);
  if (dashInertia.active && dashWasActive && dashTimer === 0) dashInertia.elapsed = 0;
  else if (dashInertia.active && !dashWasActive) dashInertia.elapsed += delta;
  const sprintThreshold = .72;
  const sprinting = hasInput && magnitude > sprintThreshold && !jumpActive && comboState === 'IDLE' && dashTimer <= 0;
  const fatigueScale = rpgState?.stamina <= 0 ? .68 : rpgState?.stamina < 20 ? .84 : 1;
  const moveSpeed = (dashTimer > 0 ? 11.1 : sprinting ? 5.5 : 3.55) * fatigueScale;
  const desiredSpeed = dashTimer > 0 ? moveSpeed : hasInput ? moveSpeed * Math.min(magnitude, 1) : 0;
  const dashPose = dashTimer > 0 ? Math.sin((1 - dashTimer / .36) * Math.PI) : 0;
  if (dashTimer > 0) {
    moveX = dashDirection.x;
    moveZ = dashDirection.z;
  }
  const response = hasInput ? (jumpActive ? .075 : .19) : (jumpActive ? .04 : .12);
  if (shieldBash.phase === 'ACTIVE') movementVelocity.set(shieldBash.direction.x * shieldBash.speed, shieldBash.direction.y * shieldBash.speed);
  else if (shieldBash.phase === 'WINDUP') movementVelocity.multiplyScalar(Math.exp(-10 * delta));
  else if (shieldBash.phase === 'RECOVERY') movementVelocity.multiplyScalar(Math.exp(-18 * delta));
  else if (dashTimer > 0) movementVelocity.set(moveX * desiredSpeed, moveZ * desiredSpeed);
  else if (dashInertia.active && !hasInput && !jumpActive) {
    const speed = Math.max(0, movementVelocity.length() - DASH_INERTIA_CONFIG.deceleration * delta);
    if (speed > 0) movementVelocity.setLength(speed);
    else movementVelocity.set(0, 0);
  } else {
    movementVelocity.x = smoothLerp(movementVelocity.x, hasInput ? moveX * desiredSpeed : 0, response);
    movementVelocity.y = smoothLerp(movementVelocity.y, hasInput ? moveZ * desiredSpeed : 0, response);
  }
  const movementSpeed = movementVelocity.length();
  updatePlayerResources(delta, sprinting, movementSpeed > .08);
  const braking = delta > 0 ? THREE.MathUtils.clamp((previousMovementSpeed - movementSpeed) / (delta * 8), 0, 1) : 0;
  brakingWeight = smoothLerp(brakingWeight, hasInput ? 0 : braking, .22);
  previousMovementSpeed = movementSpeed;
  const isMoving = movementSpeed > .08;
  let moved = 0;
  let movementTurn = 0;
  if (movementSpeed > .001 && delta > 0) {
    const startX = heroGroup.position.x, startZ = heroGroup.position.z;
    const nextX = startX + movementVelocity.x * delta;
    const nextZ = startZ + movementVelocity.y * delta;
    if (!isTownPositionBlocked(nextX, startZ) && !isCombatantPositionBlocked(nextX, startZ)) heroGroup.position.x = nextX;
    else { movementVelocity.x = 0; if (dashTimer > 0) { dashTimer = 0; dashInertia.charge *= .5; } }
    if (!isTownPositionBlocked(heroGroup.position.x, nextZ) && !isCombatantPositionBlocked(heroGroup.position.x, nextZ)) heroGroup.position.z = nextZ;
    else { movementVelocity.y = 0; if (dashTimer > 0) { dashTimer = 0; dashInertia.charge *= .5; } }
    if (dashInertia.active && (movementVelocity.length() < DASH_INERTIA_CONFIG.minSpeed || dashInertia.elapsed >= DASH_INERTIA_CONFIG.window)) dashInertia.active = false;
    moved = Math.hypot(heroGroup.position.x - startX, heroGroup.position.z - startZ);
    const desiredYaw = Math.atan2(movementVelocity.x, movementVelocity.y);
    movementTurn = Math.atan2(Math.sin(desiredYaw - heroRoot.rotation.y), Math.cos(desiredYaw - heroRoot.rotation.y));
    const speedRatio = THREE.MathUtils.clamp(movementSpeed / 3.35, 0, 1);
    if (!lockedEnemy) heroRoot.rotation.y += movementTurn * smoothAlpha(.14 + speedRatio * .12);
    walkPhase += delta * Math.PI * THREE.MathUtils.lerp(3.3, 5.2, THREE.MathUtils.clamp(movementSpeed / 5.5, 0, 1));
    if (trainingMode) {
      if (stickY > .3) recordTrainingAction('moveForward');
      if (stickY < -.3) recordTrainingAction('moveBack');
      if (Math.abs(stickX) > .35) {
        recordTrainingAction('strafe');
        if (lockedEnemy) recordTrainingAction('orbit');
      }
      if (sprinting) recordTrainingAction('run');
      if (trainingExtraEnemies.length && Math.hypot(heroGroup.position.x - trainingLastPosition.x, heroGroup.position.z - trainingLastPosition.z) >= 3) {
        recordTrainingAction('reposition');
        trainingLastPosition.copy(heroGroup.position);
      }
    }
    if (tutorialActive) {
      tutorialDistance += moved;
      if (tutorialStep === 0 && tutorialOrigin && heroGroup.position.distanceTo(tutorialOrigin) >= 3) showTutorialStep(1);
    }
  }
  if (!jumpActive && jumpPhase === 'ground' && comboState !== 'RISING_SLASH') heroGroup.position.y = isOnWaterSurface(heroRoot.position.x, heroRoot.position.z) ? -.075 : 0;
  if (isMoving && !jumpActive && heroGroup.position.y <= .04 && delta > 0) {
    footstepTimer -= delta;
    if (footstepTimer <= 0) {
      footstepRaycaster.set(new THREE.Vector3(heroGroup.position.x, heroGroup.position.y + 2, heroGroup.position.z), new THREE.Vector3(0, -1, 0));
      const surfaceHit = footstepRaycaster.intersectObjects(walkSurfaces, false)[0];
      if (audioManager) audioManager.playFootstep(surfaceHit?.object.userData.walkSurface || 'grass');
      footstepTimer = THREE.MathUtils.lerp(.48, .32, Math.min(movementSpeed / 3.35, 1));
    }
  } else if (!isMoving || jumpActive) {
    footstepTimer = 0;
  }
  if (shieldBash.phase === 'ACTIVE') resolveShieldBashImpact();
  if (dashInertia.active && (movementVelocity.length() < DASH_INERTIA_CONFIG.minSpeed || dashInertia.elapsed >= DASH_INERTIA_CONFIG.window)) dashInertia.active = false;
  updateImpulseHud();
  const smoothing = .2;
  const phase = walkPhase;
  const speedRatio = THREE.MathUtils.clamp(movementSpeed / 3.35, 0, 1);
  const groundedMove = movementSpeed > .07 && !jumpActive && jumpPhase === 'ground';
  gaitWeight = smoothLerp(gaitWeight, groundedMove ? THREE.MathUtils.clamp(movementSpeed / .75, 0, 1) : 0, .16);
  runWeight = smoothLerp(runWeight, groundedMove && sprinting ? 1 : 0, groundedMove && sprinting ? .08 : .13);
  if (comboState === 'IDLE') {
    const guarding = Boolean(shieldButtonHeld || keys.Shift || keys.Control);
    if (groundedMove) {
      const stride = THREE.MathUtils.lerp(.42, .64, runWeight);
      const footLift = THREE.MathUtils.lerp(.075, .13, runWeight);
      hips.position.y = smoothLerp(hips.position.y, .95 + Math.abs(Math.sin(phase * 2)) * (.012 + speedRatio * .018), .18);
      hips.rotation.z = smoothLerp(hips.rotation.z, Math.sin(phase) * (.025 + speedRatio * .035), .18);
      hips.rotation.y = smoothLerp(hips.rotation.y, movementTurn * .10, .18);
      updateWalkingLeg(leftHip, leftKnee, leftFoot, leftFootPlant, (phase / (Math.PI * 2)) % 1, stride, footLift, runWeight);
      updateWalkingLeg(rightHip, rightKnee, rightFoot, rightFootPlant, (phase / (Math.PI * 2) + .5) % 1, stride, footLift, runWeight);
      const leftArmSwing = Math.sin(phase + Math.PI) * (.34 + speedRatio * .25) + brakingWeight * .10;
      const rightArmSwing = Math.sin(phase) * (.14 + speedRatio * .18) - brakingWeight * .09;
      leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, THREE.MathUtils.lerp(leftArmSwing, guarding ? -.72 : -.52, heroWeaponBlend), .18);
      rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, THREE.MathUtils.lerp(rightArmSwing, -.58, heroWeaponBlend), .18);
      leftShoulder.rotation.z = smoothLerp(leftShoulder.rotation.z, guarding ? -.22 : .08, .18);
      rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.08, .18);
      const armWave = Math.sin(phase * 2 + 1.1);
      leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, guarding ? -.85 : -1.02 + Math.max(0, armWave) * .26 + speedRatio * .12, .24);
      rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, THREE.MathUtils.lerp(-.02 + Math.max(0, -armWave) * .16, -.78 + Math.max(0, -armWave) * .12, heroWeaponBlend), .24);
      leftElbow.rotation.z = smoothLerp(leftElbow.rotation.z, 0, .24);
      rightElbow.rotation.z = smoothLerp(rightElbow.rotation.z, 0, .24);
      rightWrist.rotation.z = smoothLerp(rightWrist.rotation.z, -.04, .28);
      rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, heroWeaponBlend ? -0.38 + Math.sin(phase * 2.2 + 0.9) * .14 : 0, .18);
      rightHandGrip.rotation.y = smoothLerp(rightHandGrip.rotation.y, heroWeaponBlend ? 0.22 + Math.sin(phase + 1.25) * .08 : 0, .18);
      rightHandGrip.rotation.z = smoothLerp(rightHandGrip.rotation.z, heroWeaponBlend ? -0.82 + Math.sin(phase * 1.5) * .12 : 0, .18);
      if (heroWeaponStance === 'armed') {
        swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, 0.18 + Math.sin(phase * 1.5) * .12, .18);
        swordGroup.rotation.y = smoothLerp(swordGroup.rotation.y, -0.12 + Math.sin(phase * 1.1) * .08, .18);
        swordGroup.rotation.z = smoothLerp(swordGroup.rotation.z, Math.PI - .38 + Math.sin(phase * .8) * .08, .18);
      }
      torso.rotation.x = smoothLerp(torso.rotation.x, .035 + speedRatio * .075 - brakingWeight * .10, .16);
      torso.rotation.y = smoothLerp(torso.rotation.y, movementTurn * .12, .16);
      torso.rotation.z = smoothLerp(torso.rotation.z, -Math.sin(movementTurn) * .08, .16);
      neck.rotation.x = smoothLerp(neck.rotation.x, -.015 - speedRatio * .025, .16);
      neck.rotation.y = smoothLerp(neck.rotation.y, Math.sin(phase + Math.PI) * .018, .16);
      headGroup.rotation.x = smoothLerp(headGroup.rotation.x, Math.sin(phase * 2 + .8) * .018 + movementTurn * .08, .16);
      headGroup.rotation.y = smoothLerp(headGroup.rotation.y, Math.sin(phase + 1.4) * .09, .15);
      cape.rotation.z = smoothLerp(cape.rotation.z, -Math.sin(phase - .45) * (.035 + speedRatio * .07), .12);
      cape.rotation.x = smoothLerp(cape.rotation.x, .02 + speedRatio * .045 + Math.sin(phase * 1.3) * .04, .12);
      if (dashTimer > 0) {
        leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -1.08 + dashPose * .26, .28);
        rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -1.32 + dashPose * .48, .28);
        leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -1.18 + dashPose * .22, .28);
        rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -1.08 + dashPose * .52, .28);
        rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, .05 + dashPose * .35, .28);
        swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .18 + dashPose * .45, .28);
        torso.rotation.x = smoothLerp(torso.rotation.x, -.18 + dashPose * .16, .24);
        cape.rotation.x = smoothLerp(cape.rotation.x, .18 + dashPose * .24, .20);
      }
    } else {
      leftFootPlant.planted = false;
      rightFootPlant.planted = false;
      leftHip.rotation.x = smoothLerp(leftHip.rotation.x, 0, .18);
      rightHip.rotation.x = smoothLerp(rightHip.rotation.x, 0, .18);
      leftKnee.rotation.x = smoothLerp(leftKnee.rotation.x, 0, .20);
      rightKnee.rotation.x = smoothLerp(rightKnee.rotation.x, 0, .20);
      leftFoot.rotation.x = smoothLerp(leftFoot.rotation.x, 0, .22);
      rightFoot.rotation.x = smoothLerp(rightFoot.rotation.x, 0, .22);
      leftFoot.position.y = smoothLerp(leftFoot.position.y, 0, .22);
      rightFoot.position.y = smoothLerp(rightFoot.position.y, 0, .22);
      leftFoot.position.z = smoothLerp(leftFoot.position.z, 0, .22);
      rightFoot.position.z = smoothLerp(rightFoot.position.z, 0, .22);
      leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, guarding ? -.72 : -.06 * heroWeaponBlend + brakingWeight * .08, .18);
      rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -.58 * heroWeaponBlend - brakingWeight * .07, .18);
      leftShoulder.rotation.z = smoothLerp(leftShoulder.rotation.z, guarding ? -.22 : .08, .18);
      rightShoulder.rotation.z = smoothLerp(rightShoulder.rotation.z, -.08, .18);
      leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, guarding ? -.75 : -.12 - .52 * heroWeaponBlend, .22);
      rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.05 - .72 * heroWeaponBlend, .22);
      leftElbow.rotation.z = smoothLerp(leftElbow.rotation.z, 0, .22);
      rightElbow.rotation.z = smoothLerp(rightElbow.rotation.z, 0, .22);
      rightWrist.rotation.z = smoothLerp(rightWrist.rotation.z, 0, .25);
      hips.position.y = smoothLerp(hips.position.y, .95 + Math.sin(time * 1.35) * .008, .16);
      hips.rotation.y = smoothLerp(hips.rotation.y, 0, .16);
      hips.rotation.z = smoothLerp(hips.rotation.z, Math.sin(time * .58) * .007, .16);
      torso.rotation.x = smoothLerp(torso.rotation.x, -brakingWeight * .10 + Math.sin(time * 1.35) * .012, .15);
      torso.rotation.y = smoothLerp(torso.rotation.y, 0, .15);
      torso.rotation.z = smoothLerp(torso.rotation.z, 0, .15);
      neck.rotation.x = smoothLerp(neck.rotation.x, 0, .15);
      neck.rotation.y = smoothLerp(neck.rotation.y, 0, .15);
      headGroup.rotation.x = smoothLerp(headGroup.rotation.x, Math.sin(time * 1.35 + .8) * .008, .14);
      headGroup.rotation.y = smoothLerp(headGroup.rotation.y, Math.sin(time * .58 + 1.1) * .012, .14);
      cape.rotation.x = smoothLerp(cape.rotation.x, Math.sin(time * .68) * .012, .10);
      cape.rotation.z = smoothLerp(cape.rotation.z, 0, .10);
    }
  } else {
    leftFootPlant.planted = false;
    rightFootPlant.planted = false;
  }
  const jumpWeight = jumpPhase === 'anticipation' ? THREE.MathUtils.clamp(jumpElapsed / .10, 0, 1) : jumpPhase === 'landing' ? THREE.MathUtils.clamp(jumpLandTimer / .28, 0, 1) : 1;
  if (comboState === 'IDLE' && jumpPhase === 'anticipation') {
    for (const [foot, state] of [[leftFoot, leftFootPlant], [rightFoot, rightFootPlant]]) {
      if (!state.planted) {
        foot.getWorldPosition(state.anchor);
        foot.getWorldQuaternion(state.rotation);
        state.planted = true;
      }
    }
    hips.position.y = smoothLerp(hips.position.y, .89, .24);
    animateLegToWorld(leftHip, leftKnee, leftFoot, leftFootPlant.anchor, leftFootPlant, .42);
    animateLegToWorld(rightHip, rightKnee, rightFoot, rightFootPlant.anchor, rightFootPlant, .42);
    torso.rotation.x = smoothLerp(torso.rotation.x, -.12 * jumpWeight, .22);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.30, .20);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, .12, .20);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.42, .22);
  } else if (comboState === 'IDLE' && (jumpPhase === 'rising' || jumpPhase === 'falling')) {
    leftFootPlant.planted = false;
    rightFootPlant.planted = false;
    const falling = jumpPhase === 'falling';
    hips.position.y = smoothLerp(hips.position.y, .95, .18);
    leftHip.rotation.x = smoothLerp(leftHip.rotation.x, falling ? .08 : -.10, .20);
    rightHip.rotation.x = smoothLerp(rightHip.rotation.x, falling ? -.10 : .08, .20);
    leftKnee.rotation.x = smoothLerp(leftKnee.rotation.x, falling ? .52 : .34, .22);
    rightKnee.rotation.x = smoothLerp(rightKnee.rotation.x, falling ? .34 : .52, .22);
    leftFoot.rotation.x = smoothLerp(leftFoot.rotation.x, -.15, .22);
    rightFoot.rotation.x = smoothLerp(rightFoot.rotation.x, -.15, .22);
    torso.rotation.x = smoothLerp(torso.rotation.x, falling ? .035 : -.08, .18);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.12, .18);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, .08, .18);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.42, .20);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.28, .20);
    cape.rotation.x = smoothLerp(cape.rotation.x, -.08, .14);
  } else if (comboState === 'IDLE' && jumpPhase === 'landing') {
    for (const [foot, state] of [[leftFoot, leftFootPlant], [rightFoot, rightFootPlant]]) {
      if (!state.planted) {
        foot.getWorldPosition(state.anchor);
        state.anchor.y = heroRoot.position.y + .02;
        heroRoot.getWorldQuaternion(state.rotation);
        state.planted = true;
      }
    }
    hips.position.y = smoothLerp(hips.position.y, .95 - .065 * (1 - jumpWeight), .24);
    animateLegToWorld(leftHip, leftKnee, leftFoot, leftFootPlant.anchor, leftFootPlant, .42);
    animateLegToWorld(rightHip, rightKnee, rightFoot, rightFootPlant.anchor, rightFootPlant, .42);
    torso.rotation.x = smoothLerp(torso.rotation.x, .16 * (1 - jumpWeight), .22);
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -.16, .20);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, .14, .20);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -.32, .22);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -.26, .22);
    cape.rotation.x = smoothLerp(cape.rotation.x, .09 * (1 - jumpWeight), .16);
  }
  if (dashTimer > 0 && jumpActive) {
    leftShoulder.rotation.x = smoothLerp(leftShoulder.rotation.x, -1.08 + dashPose * .26, .28);
    rightShoulder.rotation.x = smoothLerp(rightShoulder.rotation.x, -1.32 + dashPose * .48, .28);
    leftElbow.rotation.x = smoothLerp(leftElbow.rotation.x, -1.18 + dashPose * .22, .28);
    rightElbow.rotation.x = smoothLerp(rightElbow.rotation.x, -1.08 + dashPose * .52, .28);
    rightHandGrip.rotation.x = smoothLerp(rightHandGrip.rotation.x, .05 + dashPose * .35, .28);
    swordGroup.rotation.x = smoothLerp(swordGroup.rotation.x, .18 + dashPose * .45, .28);
    torso.rotation.x = smoothLerp(torso.rotation.x, -.22, .24);
    cape.rotation.x = smoothLerp(cape.rotation.x, .20, .20);
  }
  applyShieldBashPose();
  const speedTrailActive = dashTimer > 0 || (dashInertia.active && currentDashImpulse() > .15) || shieldBash.phase === 'ACTIVE';
  if (speedTrailActive && dashWindTrail) {
    if (!dashWindTrail.active) beginSwordTrail(dashWindTrail, .1);
    else pushSwordSample(dashWindTrail);
  }
  else if (dashWindTrail?.active) {
    dashWindTrail.active = false;
    dashWindTrail.finished = true;
    dashWindTrail.fadeElapsed = 0;
    dashWindTrail.fadeDelay = 0;
  }
  const torsoBob = isMoving && jumpPhase === 'ground' ? Math.sin(phase * 2) * (.008 + speedRatio * .018) : jumpPhase === 'ground' && comboState === 'IDLE' ? Math.sin(time * 1.35) * .006 : 0;
  torso.position.y = smoothLerp(torso.position.y, torsoBob, smoothing);
  if (comboState === 'IDLE' && jumpPhase === 'ground') {
    hips.rotation.z = smoothLerp(hips.rotation.z, isMoving ? Math.sin(phase) * (.025 + speedRatio * .035) : 0, smoothing);
    torso.rotation.z = smoothLerp(torso.rotation.z, isMoving ? -Math.sin(movementTurn) * .08 : 0, .18);
  }
  hero.animationState = shieldBash.phase !== 'IDLE' ? 'SHIELD_BASH_' + shieldBash.phase : dashTimer > 0 ? 'dash' : jumpPhase !== 'ground' ? jumpPhase : comboState !== 'IDLE' ? comboState : gaitWeight > .7 ? 'run' : gaitWeight > .08 ? 'walk' : 'idle';
  hero.jumpPhase = jumpPhase;
  hero.comboState = comboState;
  hero.leftFootPlanted = leftFootPlant.planted;
  hero.rightFootPlanted = rightFootPlant.planted;
  hero.movementSpeed = movementSpeed;
  hero.gaitWeight = gaitWeight;
  const cameraEnemy = lockedEnemy;
  let horizontalOffset = LOCK_ON_CONFIG.exploreDistance;
  const playerFocusPoint = new THREE.Vector3(heroGroup.position.x, heroGroup.position.y + LOCK_ON_CONFIG.focusHeight, heroGroup.position.z);
  if (cameraEnemy) {
    cameraEnemy.getWorldPosition(lockEnemyPosition);
    const dx = lockEnemyPosition.x - heroGroup.position.x, dz = lockEnemyPosition.z - heroGroup.position.z;
    const separation = Math.hypot(dx, dz);
    if (lockedEnemy) {
      const desiredYaw = Math.atan2(-dx, -dz) + lockCameraYawOffset;
      const yawDifference = Math.atan2(Math.sin(desiredYaw - cameraYaw), Math.cos(desiredYaw - cameraYaw));
      cameraYaw += yawDifference * smoothAlpha(LOCK_ON_CONFIG.cameraTurn, delta);
      lockCameraYawOffset *= Math.max(0, 1 - LOCK_ON_CONFIG.recenterRate * delta);
    } else if (!targetInCameraView(cameraEnemy, .12)) {
      const desiredYaw = Math.atan2(-dx, -dz);
      const yawDifference = Math.atan2(Math.sin(desiredYaw - cameraYaw), Math.cos(desiredYaw - cameraYaw));
      cameraYaw += yawDifference * smoothAlpha(.045, delta);
    }
    const focusBlend = lockedEnemy ? LOCK_ON_CONFIG.focusBlend : .26;
    const focusPoint = new THREE.Vector3(
      heroGroup.position.x + dx * focusBlend,
      THREE.MathUtils.lerp(heroGroup.position.y + LOCK_ON_CONFIG.focusHeight, lockEnemyPosition.y + LOCK_ON_CONFIG.focusHeight, lockedEnemy ? .36 : .2),
      heroGroup.position.z + dz * focusBlend
    );
    const playerBias = lockedEnemy ? LOCK_ON_CONFIG.playerVisibilityBias : .48;
    cameraFocusGoal.set(
      THREE.MathUtils.lerp(playerFocusPoint.x, focusPoint.x, playerBias),
      THREE.MathUtils.lerp(playerFocusPoint.y, focusPoint.y, playerBias),
      THREE.MathUtils.lerp(playerFocusPoint.z, focusPoint.z, playerBias)
    );
    const advance = Math.min(Math.max(1.6, separation * (lockedEnemy ? .56 : .43)), lockedEnemy ? 3.6 : 3.1);
    const preferredDistance = lockedEnemy ? LOCK_ON_CONFIG.combatDistance : sprinting || dashTimer > 0 ? 5.4 : LOCK_ON_CONFIG.exploreDistance;
    horizontalOffset = THREE.MathUtils.clamp(preferredDistance + Math.max(0, separation - 5) * .24, LOCK_ON_CONFIG.minDistance, LOCK_ON_CONFIG.maxDistance);
    if (lockedEnemy) {
      const followBias = separation < 3.8 ? 1.2 : 1.0;
      cameraFocusGoal.x += (dx / Math.max(separation, .01)) * (advance * .32 * followBias);
      cameraFocusGoal.z += (dz / Math.max(separation, .01)) * (advance * .32 * followBias);
    }
  } else {
    cameraFocusGoal.copy(playerFocusPoint);
  }
  const aimingBow = aimMode && resolveRpgItem(rpgState?.equipment?.weapon)?.kind === 'Arco';
  horizontalOffset = THREE.MathUtils.clamp(horizontalOffset * cameraZoom * (aimingBow ? .72 : 1), LOCK_ON_CONFIG.minDistance, LOCK_ON_CONFIG.maxDistance);
  cameraTarget.lerp(cameraFocusGoal, smoothAlpha(lockedEnemy ? .34 : cameraEnemy ? .22 : .24, delta));
  const shoulderOffset = lockedEnemy ? .85 : aimingBow ? .62 : cameraEnemy ? .42 : 0;
  const baseCameraHeight = (aimingBow ? 2.05 : cameraEnemy ? 3.45 : sprinting || dashTimer > 0 ? 3.1 : 2.85) * cameraZoom;
  const baseCameraPitch = Math.atan2(baseCameraHeight, horizontalOffset);
  const orbitPitch = THREE.MathUtils.clamp(baseCameraPitch + cameraPitch, -.35, 1.25);
  const cameraArmLength = Math.hypot(horizontalOffset, baseCameraHeight);
  cameraGoal.set(
    cameraFocusGoal.x + Math.sin(cameraYaw) * cameraArmLength * Math.cos(orbitPitch) + Math.cos(cameraYaw) * shoulderOffset,
    Math.max(.5, cameraFocusGoal.y + Math.sin(orbitPitch) * cameraArmLength),
    cameraFocusGoal.z + Math.cos(cameraYaw) * cameraArmLength * Math.cos(orbitPitch) - Math.sin(cameraYaw) * shoulderOffset
  );
  cameraRayDirection.subVectors(cameraGoal, cameraTarget);
  const idealDistance = cameraRayDirection.length();
  cameraRayDirection.normalize();
  cameraCollisionRaycaster.set(cameraTarget, cameraRayDirection);
  cameraCollisionRaycaster.far = idealDistance;
  const obstruction = cameraCollisionRaycaster.intersectObjects(cameraBlockers, false)[0];
  if (obstruction && obstruction.distance < idealDistance) cameraGoal.copy(cameraTarget).addScaledVector(cameraRayDirection, Math.max(.6, obstruction.distance - .4));
  camera.position.lerp(cameraGoal, smoothAlpha(obstruction ? .42 : lockedEnemy ? LOCK_ON_CONFIG.cameraFollow : cameraEnemy ? .22 : .2, delta));
  if (obstruction) {
    const fromFocus = camera.position.distanceTo(cameraTarget);
    if (fromFocus > obstruction.distance - .32) camera.position.copy(cameraTarget).addScaledVector(cameraRayDirection, Math.max(.6, obstruction.distance - .4));
  }
  camera.position.y = Math.max(.5, camera.position.y);
  if (cameraShakeTimer > 0) {
    const shake = cameraShakeStrength * (cameraShakeTimer / Math.max(cameraShakeDuration, .001));
    camera.position.x += Math.sin(time * 83) * shake;
    camera.position.y += Math.cos(time * 71) * shake * .55;
  }
  const desiredFov = aimingBow ? 43 : lockedEnemy ? 43 : sprinting || dashTimer > 0 ? 50 : 47;
  const nextFov = THREE.MathUtils.lerp(camera.fov, desiredFov, smoothAlpha(.025, delta));
  if (Math.abs(nextFov - camera.fov) > .01) { camera.fov = nextFov; camera.updateProjectionMatrix(); }
  camera.lookAt(cameraTarget);
  if (lockedEnemy && comboState === 'IDLE' && !jumpActive) {
    const facingYaw = Math.atan2(lockEnemyPosition.x - heroGroup.position.x, lockEnemyPosition.z - heroGroup.position.z);
    const turn = Math.atan2(Math.sin(facingYaw - heroRoot.rotation.y), Math.cos(facingYaw - heroRoot.rotation.y));
    heroRoot.rotation.y += turn * smoothAlpha(LOCK_ON_CONFIG.heroTurn, delta);
  }
}

window.gameKeys = {};
function defaultPlayerName() { return getPlayerCharacterName(); }
function openCreateLobby() {
  const playerName = defaultPlayerName();
  document.getElementById('lobby-player-name').value = playerName;
  document.getElementById('lobby-name').value = 'Partida de ' + playerName;
  document.getElementById('lobby-form-error').textContent = '';
  showScreen('screen-create-lobby');
}
function openJoinLobbyList() {
  document.getElementById('join-player-name').value = defaultPlayerName();
  document.getElementById('lobby-search').value = '';
  renderLobbyList(availableLobbies);
  showScreen('screen-join-lobby');
  connectMultiplayer();
}
document.getElementById('new-game-button').addEventListener('click', () => showScreen('screen-mode-select'));
document.getElementById('forest-map-open').addEventListener('click', () => { document.getElementById('forest-map-overlay').hidden = false; drawForestMap(document.getElementById('forest-full-map'), false); });
document.getElementById('forest-map-close').addEventListener('click', () => { document.getElementById('forest-map-overlay').hidden = true; });
document.getElementById('forest-map-overlay').addEventListener('click', event => { if (event.target.id === 'forest-map-overlay') event.currentTarget.hidden = true; });
document.getElementById('villa-map-open').addEventListener('click', () => { document.getElementById('villa-map-overlay').hidden = false; drawVillaMap(document.getElementById('villa-full-map'), false); });
document.getElementById('villa-map-close').addEventListener('click', () => { document.getElementById('villa-map-overlay').hidden = true; });
document.getElementById('villa-map-overlay').addEventListener('click', event => { if (event.target.id === 'villa-map-overlay') event.currentTarget.hidden = true; });
document.getElementById('villa-map-zoom-in').addEventListener('click', () => setVillaMapZoom(1.25));
document.getElementById('villa-map-zoom-out').addEventListener('click', () => setVillaMapZoom(.8));
document.getElementById('villa-map-reset').addEventListener('click', resetVillaMapView);
const villaMapCanvas = document.getElementById('villa-full-map');
villaMapCanvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  villaMapView.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: villaMapView.panX, panY: villaMapView.panY, moved: false };
  villaMapCanvas.setPointerCapture(event.pointerId);
});
villaMapCanvas.addEventListener('pointermove', event => {
  const drag = villaMapView.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const rect = villaMapCanvas.getBoundingClientRect();
  const dx = (event.clientX - drag.x) * villaMapCanvas.width / rect.width;
  const dy = (event.clientY - drag.y) * villaMapCanvas.height / rect.height;
  if (Math.hypot(dx, dy) > 5) drag.moved = true;
  if (!drag.moved) return;
  villaMapView.panX = drag.panX + dx;
  villaMapView.panY = drag.panY + dy;
  drawVillaMap(villaMapCanvas, false);
});
villaMapCanvas.addEventListener('pointerup', event => {
  const drag = villaMapView.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  villaMapView.drag = null;
  if (drag.moved) return;
  const rect = villaMapCanvas.getBoundingClientRect();
  const screenX = (event.clientX - rect.left) * villaMapCanvas.width / rect.width;
  const screenY = (event.clientY - rect.top) * villaMapCanvas.height / rect.height;
  const mapX = (screenX - villaMapCanvas.width / 2 - villaMapView.panX) / villaMapView.zoom + villaMapCanvas.width / 2;
  const mapY = (screenY - villaMapCanvas.height / 2 - villaMapView.panY) / villaMapView.zoom + villaMapCanvas.height / 2;
  villaMapView.marker = { x: -90 + mapX / villaMapCanvas.width * 180, z: -90 + mapY / villaMapCanvas.height * 180 };
  drawVillaMap(villaMapCanvas, false);
});
villaMapCanvas.addEventListener('pointercancel', () => { villaMapView.drag = null; });
villaMapCanvas.addEventListener('wheel', event => {
  event.preventDefault();
  setVillaMapZoom(event.deltaY < 0 ? 1.15 : .87);
}, { passive: false });
document.getElementById('arena-button').addEventListener('click', startArenaFromMenu);
document.getElementById('arena-exit-button').addEventListener('click', saveAndReturnToMainMenu);
document.getElementById('solo-mode-button').addEventListener('click', () => {
  gameSessionMode = 'solo';
  startGameAfterJoin = false;
  pendingLobbyAction = null;
  activeLobbyId = null;
  activeLobbyName = '';
  multiplayerPlayerId = null;
  if (multiplayerSocket) { const socket = multiplayerSocket; multiplayerSocket = null; socket.close(); }
  showScreen('screen-tutorial-choice');
});
function openCharacterEditor(tutorialChoice) {
  const profile = getSelectedProfile();
  if (!profile) { renderProfiles(); showScreen('screen-profiles'); return; }
  const name = profile.characterName || profile.name;
  const frame = document.getElementById('character-editor-frame');
  frame.src = 'personaje-editor.html?embedded=1&choice=' + encodeURIComponent(tutorialChoice) + '&name=' + encodeURIComponent(name);
  showScreen('screen-character-editor');
}
document.getElementById('tutorial-choice-no').addEventListener('click', () => openCharacterEditor('skip'));
document.getElementById('tutorial-choice-yes').addEventListener('click', () => openCharacterEditor('trained'));
document.getElementById('tutorial-choice-back').addEventListener('click',()=>showScreen('screen-mode-select'));
document.getElementById('character-editor-back').addEventListener('click', () => showScreen('screen-tutorial-choice'));
window.addEventListener('message', event => {
  const frame = document.getElementById('character-editor-frame');
  if (event.source !== frame?.contentWindow || event.origin !== window.location.origin || event.data?.type !== 'walpira-character-confirm') return;
  const reply = (ok, message = '') => event.source.postMessage({ type: 'walpira-character-result', ok, message }, event.origin);
  const profile = getSelectedProfile();
  const design = event.data.design;
  const tutorialChoice = event.data.tutorialChoice;
  if (!profile || !design || !['skip', 'trained'].includes(tutorialChoice)) {
    reply(false, 'No se encontró el perfil o la opción de inicio. Vuelve al menú e inténtalo otra vez.');
    return;
  }
  try {
    profile.characterName = String(design.name || profile.name).trim().slice(0, 24) || profile.name;
    profile.characterDesign = design;
    saveProfiles();
    try {
      localStorage.setItem('walpira_character_name', profile.characterName);
      localStorage.setItem('walpira_character_design', JSON.stringify(design));
    } catch {}
    if (tutorialChoice === 'trained') {
      beginNewStory('trained');
      storyTrainingPending = true;
      startTrainingFromMenu();
    } else {
      beginNewStory('skip');
      startAdventure();
      startWalpiraOpeningCinematic();
    }
    reply(true);
  } catch (error) {
    console.error('No se pudo iniciar la partida desde el editor:', error);
    showScreen('screen-character-editor');
    reply(false, 'No se pudo iniciar la partida. El diseño se conservó; vuelve a intentarlo.');
  }
});
document.getElementById('multiplayer-mode-button').addEventListener('click', () => {
  gameSessionMode = 'multiplayer';
  showScreen('screen-multiplayer-menu');
});
document.getElementById('mode-back-button').addEventListener('click', () => showScreen('screen-main'));
document.getElementById('create-lobby-button').addEventListener('click', openCreateLobby);
document.getElementById('join-lobby-button').addEventListener('click', openJoinLobbyList);
document.getElementById('multiplayer-back-button').addEventListener('click', () => showScreen('screen-mode-select'));
document.getElementById('create-lobby-back-button').addEventListener('click', () => showScreen('screen-multiplayer-menu'));
document.getElementById('join-lobby-back-button').addEventListener('click', () => showScreen('screen-multiplayer-menu'));
document.getElementById('refresh-lobbies-button').addEventListener('click', () => sendMultiplayerMessage({ type: 'listLobbies' }));
document.getElementById('lobby-search').addEventListener('input', () => renderLobbyList(availableLobbies));
document.getElementById('create-lobby-form').addEventListener('submit', event => {
  event.preventDefault();
  const playerName = document.getElementById('lobby-player-name').value.trim();
  const lobbyName = document.getElementById('lobby-name').value.trim();
  if (!playerName || !lobbyName) { document.getElementById('lobby-form-error').textContent = 'Completa ambos nombres para crear la partida.'; return; }
  gameSessionMode = 'multiplayer';
  multiplayerName = playerName;
  startGameAfterJoin = true;
  pendingLobbyAction = { type: 'createLobby', name: playerName, lobbyName };
  connectMultiplayer();
});
document.getElementById('begin-adventure').addEventListener('click', dismissChapterIntro);
document.getElementById('continue-button').addEventListener('click', () => {
  if (document.getElementById('continue-button').disabled) return;
  gameSessionMode = 'solo';
  loadSavedGame();
});
function startJump() {
  if (!gameMode || gameMenuOpen || manualPaused || jumpActive) return;
  jumpStartedWithForward = hasForwardCombatInput();
  jumpBufferTimer = .34;
  if (jumpPhase !== 'landing' && comboState === 'IDLE') activatePlayerJump();
}
function activatePlayerJump() {
  if (jumpActive || jumpPhase === 'landing' || comboState !== 'IDLE' || shieldBash.phase !== 'IDLE') return false;
  jumpBufferTimer = 0;
  jumpActive = true;
  jumpElapsed = 0;
  jumpPhase = 'anticipation';
  audioManager?.playLoadedSfx('jump', .34, .96 + Math.random() * .08);
  jumpLandTimer = 0;
  verticalVelocity = 0;
  leftFootPlant.planted = false;
  rightFootPlant.planted = false;
  heroGroup.position.y = 0;
  recordTrainingAction('jump');
  return true;
}
function startDash() {
  if (!gameMode || gameMenuOpen || manualPaused) return;
  if (dashCooldown > 0) {
    if (dashCooldown <= .25) dashBufferTimer = Math.max(dashBufferTimer, dashCooldown + .08);
    return;
  }
  dashBufferTimer = .28;
  const canGroundDash = jumpPhase === 'ground' && !jumpActive;
  const canAirDash = airDashAvailable && jumpActive && (jumpPhase === 'rising' || jumpPhase === 'falling');
  if (comboState === 'IDLE' && (canGroundDash || canAirDash)) activatePlayerDash();
}
function activatePlayerDash() {
  const airborne = jumpActive && (jumpPhase === 'rising' || jumpPhase === 'falling');
  if (dashCooldown > 0 || playerPowerCooldownRemaining('dash') > 0 || comboState !== 'IDLE' || shieldBash.phase !== 'IDLE' || (airborne ? !airDashAvailable : jumpActive || jumpPhase !== 'ground')) return false;
  const keys = window.gameKeys || {};
  const gamepad = navigator.getGamepads?.()[0];
  const padX = gamepad?.axes?.[0] || 0;
  const padY = gamepad?.axes?.[1] || 0;
  const stickX = joystickVector.x + (Math.abs(padX) > .16 ? padX : 0) + (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const stickY = joystickVector.y - (Math.abs(padY) > .16 ? padY : 0) + (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0);
  const priorVelocity = movementVelocity.clone();
  const magnitude = Math.hypot(stickX, stickY);
  if (magnitude > 0.04) {
    const moveX = stickX * Math.cos(cameraYaw) - stickY * Math.sin(cameraYaw);
    const moveZ = -stickX * Math.sin(cameraYaw) - stickY * Math.cos(cameraYaw);
    dashDirection.set(moveX, 0, moveZ);
  } else {
    dashDirection.set(Math.sin(heroRoot.rotation.y), 0, Math.cos(heroRoot.rotation.y));
  }
  if (dashDirection.lengthSq() < 0.001) dashDirection.set(0, 0, 1);
  dashDirection.normalize();
  if (!canPayPlayerResources(8, 14, 'el Dash')) return false;
  spendMana(8, 'el Dash'); spendStamina(14, 'el Dash');
  const dashDirection2d = new THREE.Vector2(dashDirection.x, dashDirection.z);
  const carriedSpeed = Math.max(0, priorVelocity.dot(dashDirection2d));
  dashInertia.active = true;
  dashInertia.direction.copy(dashDirection2d);
  dashInertia.charge = THREE.MathUtils.clamp(DASH_INERTIA_CONFIG.baseCharge + Math.min(1, carriedSpeed / 5.2) * DASH_INERTIA_CONFIG.carryCharge, 0, DASH_INERTIA_CONFIG.maxCharge);
  dashInertia.elapsed = 0;
  if (trainingMode) {
    recordTrainingAction('dash');
    const forward = new THREE.Vector3(Math.sin(heroRoot.rotation.y), 0, Math.cos(heroRoot.rotation.y));
    const sideways = new THREE.Vector3(Math.cos(heroRoot.rotation.y), 0, -Math.sin(heroRoot.rotation.y));
    if (dashDirection.dot(forward) > .35) recordTrainingAction('dashForward');
    if (Math.abs(dashDirection.dot(sideways)) > .35) recordTrainingAction('dashSide');
  }
  dashBufferTimer = 0;
  if (airborne) airDashAvailable = false;
  dashTimer = .36;
  dashCooldown = 1.0;
  startPlayerPowerCooldown('dash');
  dashInvulnerability = .36;
  if (dashWindTrail) beginSwordTrail(dashWindTrail, .10);
  hero.animationState = 'dash';
  if (audioManager) {
    audioManager.playDash();
    audioManager.playHeroVoice('effort');
  }
  return true;
}
function joystickDirectionRelativeToHero(vector, facing = heroRoot.rotation.y, cameraFacing = cameraYaw) {
  const worldX = vector.x * Math.cos(cameraFacing) - vector.y * Math.sin(cameraFacing);
  const worldZ = -vector.x * Math.sin(cameraFacing) - vector.y * Math.cos(cameraFacing);
  return { x: worldX * Math.cos(facing) - worldZ * Math.sin(facing), y: worldX * Math.sin(facing) + worldZ * Math.cos(facing) };
}
function updateJoystickGestureGuide() {
  const guide = document.querySelector('#joystick-gesture-guide svg');
  if (!guide || !heroRoot) return;
  const facing = joystickGesture.active ? joystickGesture.facing : heroRoot.rotation.y;
  const cameraFacing = joystickGesture.active ? joystickGesture.cameraFacing : cameraYaw;
  const relative = cameraFacing - facing;
  const cosine = Math.cos(relative), sine = Math.sin(relative);
  guide.style.transformOrigin = '50% 50%';
  guide.style.transform = 'matrix(' + cosine + ',' + sine + ',' + sine + ',' + -cosine + ',0,0)';
}
function beginJoystickGesture(vector, pointerId) {
  const local = joystickDirectionRelativeToHero(vector);
  const magnitude = Math.hypot(local.x, local.y);
  joystickGesture = {
    active: magnitude >= .28 && local.x > .22 && local.y > -.72,
    pointerId,
    lastAngle: Math.atan2(local.y, local.x),
    sweep: 0,
    sawRightSide: local.x > .22,
    sawUpperSide: false,
    facing: heroRoot.rotation.y,
    cameraFacing: cameraYaw
  };
}
function trackJoystickGesture(vector, pointerId) {
  if (!joystickGesture.active || joystickGesture.pointerId !== pointerId) return;
  const local = joystickDirectionRelativeToHero(vector, joystickGesture.facing, joystickGesture.cameraFacing);
  const magnitude = Math.hypot(local.x, local.y);
  if (magnitude < .18 || local.x < -.92 || local.y < -.85) { joystickGesture.active = false; return; }
  const angle = Math.atan2(local.y, local.x);
  let delta = angle - joystickGesture.lastAngle;
  if (delta > Math.PI) delta -= Math.PI * 2;
  else if (delta < -Math.PI) delta += Math.PI * 2;
  if (delta < -1.15) { joystickGesture.active = false; return; }
  joystickGesture.sweep += Math.max(0, delta);
  joystickGesture.lastAngle = angle;
  if (local.x > .22) joystickGesture.sawRightSide = true;
  if (local.y > .16) joystickGesture.sawUpperSide = true;
  if (joystickGesture.sweep > 4.3) { joystickGesture.active = false; return; }
  if (joystickGesture.sweep >= 1.8 && local.x < -.08 && local.y > -.35 && joystickGesture.sawRightSide && joystickGesture.sawUpperSide) {
    joystickGesture.active = false;
    risingSlashGestureTimer = 2;
    document.getElementById('joystick-gesture-guide')?.classList.add('gesture-ready');
    window.setTimeout(() => document.getElementById('joystick-gesture-guide')?.classList.remove('gesture-ready'), 480);
  }
}
function bindJoystick(element, vector, pointerState) {
  const thumb = element.querySelector('.joystick-thumb');
  const update = event => {
    const rect = element.getBoundingClientRect();
    const radius = (rect.width - thumb.offsetWidth) / 2;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    vector.x = dx / radius;
    vector.y = -dy / radius;
    thumb.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
  };
  element.addEventListener('pointerdown', event => {
    if(element.id==='joystick-base')dismissChapterIntro();
    event.preventDefault();
    event.stopPropagation();
    if (pointerState.id !== null) return;
    pointerState.id = event.pointerId;
    try { element.setPointerCapture(event.pointerId); } catch (error) {}
    update(event);
  });
  document.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerState.id) return;
    update(event);
  });
  const release = event => {
    if (pointerState.id === null || event.pointerId !== pointerState.id) return;
    pointerState.id = null;
    vector.x = 0; vector.y = 0;
    thumb.style.transform = 'translate(0, 0)';
  };
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);
  element.addEventListener('lostpointercapture', release);
}
bindJoystick(document.getElementById('joystick-base'), joystickVector, { get id() { return joystickPointer; }, set id(value) { joystickPointer = value; } });
const gameplayScreen = document.getElementById('screen-gameplay');
gameplayScreen.addEventListener('wheel', event => {
  if (!gameMode || gameMenuOpen || manualPaused) return;
  if (event.target instanceof Element && event.target.closest('#joystick-base, #action-cluster, .game-hud, #forest-navigation, #forest-map-overlay, #villa-map-overlay, #arpg-ui, #arpg-backdrop, button, input, select, textarea')) return;
  event.preventDefault();
  cameraZoom = THREE.MathUtils.clamp(cameraZoom * Math.exp(event.deltaY * .001), .58, 1.8);
}, { passive: false });
document.addEventListener('pointerdown',event=>{
  if(document.getElementById('screen-gameplay').classList.contains('active'))dismissChapterIntro();
},true);
document.addEventListener('keydown',event=>{
  if(document.getElementById('screen-gameplay').classList.contains('active')&&['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(event.key.toLowerCase()))dismissChapterIntro();
},true);
gameplayScreen.addEventListener('pointerdown', event => {
  if (!gameMode) return;
  dismissChapterIntro();
  if (event.target.closest('#joystick-base, #action-cluster, .game-hud, #tutorial-box, #interaction-prompt, #training-hud, #forest-navigation, #forest-map-overlay, #arpg-ui, #arpg-backdrop, #cinematic-overlay')) return;
  if (!gameMenuOpen && groundLootPiles.length) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    npcRaycaster.setFromCamera(pointer, camera);
    const hit = npcRaycaster.intersectObjects(groundLootPiles.map(pile => pile.group), true)[0];
    let object = hit?.object;
    while (object && !object.userData.isGroundLootPile) object = object.parent;
    const pile = object && groundLootPiles.find(entry => entry.group === object);
    if (pile) { event.preventDefault(); if(!openGroundLootPanel(pile))showGroundLootDanger(); return; }
  }
  if (!gameMenuOpen && currentWorldId === 'villa' && townNpcs.length) {
    const rect=renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    npcRaycaster.setFromCamera(pointer,camera);const hit=npcRaycaster.intersectObjects(townNpcs,true).find(entry=>entry.object.userData.npcId);
    if(hit){event.preventDefault();const target=townNpcs.find(npc=>npc.userData.npc.id===hit.object.userData.npcId);if(target)setLockedEnemy(lockedEnemy===target?null:target);return;}
  }
  if (event.pointerType === 'touch') {
    cameraTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cameraTouchPointers.size >= 2) {
      const [first, second] = [...cameraTouchPointers.values()];
      cameraPinchActive = true;
      cameraPinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
      cameraDragPointer = null;
      cameraDragLast = null;
      pointerDownPosition = null;
      lastScreenTap = null;
      cameraYawVelocity = 0;
      cameraPitchVelocity = 0;
      for (const pointerId of cameraTouchPointers.keys()) {
        try { gameplayScreen.setPointerCapture(pointerId); } catch (error) {}
      }
      event.preventDefault();
      return;
    }
  }
  pointerDownPosition = { id: event.pointerId, x: event.clientX, y: event.clientY };
  cameraDragPointer = event.pointerId;
  cameraDragLast = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  cameraYawVelocity = 0; cameraPitchVelocity = 0;
  try { gameplayScreen.setPointerCapture(event.pointerId); } catch (error) {}
  event.preventDefault();
});
gameplayScreen.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' && cameraTouchPointers.has(event.pointerId)) {
    cameraTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cameraTouchPointers.size >= 2) {
      const [first, second] = [...cameraTouchPointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (cameraPinchDistance > 0 && distance > 0) cameraZoom = THREE.MathUtils.clamp(cameraZoom * cameraPinchDistance / distance, .58, 1.8);
      cameraPinchDistance = distance;
      cameraPinchActive = true;
      cameraDragPointer = null;
      cameraDragLast = null;
      pointerDownPosition = null;
      lastScreenTap = null;
      event.preventDefault();
      return;
    }
  }
  if (event.pointerId !== cameraDragPointer || !cameraDragLast) return;
  const elapsed = THREE.MathUtils.clamp((event.timeStamp - cameraDragLast.time) / 1000, 1 / 120, .05);
  const dx = event.clientX - cameraDragLast.x, dy = event.clientY - cameraDragLast.y;
  if (lockedEnemy) lockCameraYawOffset = THREE.MathUtils.clamp(lockCameraYawOffset - dx * .006, -1.25, 1.25);
  else cameraYawVelocity = THREE.MathUtils.clamp(-dx * .006 / elapsed, -7, 7);
  cameraPitchVelocity = THREE.MathUtils.clamp(dy * .0045 / elapsed, -4, 4);
  cameraDragLast = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  event.preventDefault();
});
const endCameraDrag = event => {
  if (event.pointerType === 'touch' && cameraTouchPointers.has(event.pointerId)) {
    cameraTouchPointers.delete(event.pointerId);
    if (cameraPinchActive) {
      cameraPinchDistance = 0;
      pointerDownPosition = null;
      lastScreenTap = null;
      if (cameraTouchPointers.size === 1) {
        const [pointerId, point] = cameraTouchPointers.entries().next().value;
        cameraPinchActive = false;
        cameraDragPointer = pointerId;
        cameraDragLast = { ...point, time: event.timeStamp };
      } else {
        cameraPinchActive = false;
        cameraDragPointer = null;
        cameraDragLast = null;
      }
      return;
    }
  }
  if (event.pointerId !== cameraDragPointer) return;
  if (event.type !== 'pointerup') {
    pointerDownPosition = null;
    cameraDragPointer = null; cameraDragLast = null;
    lastScreenTap = null;
    return;
  }
  const down = pointerDownPosition;
  pointerDownPosition = null;
  cameraDragPointer = null; cameraDragLast = null;
  if (!down || down.id !== event.pointerId || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 18) {
    lastScreenTap = null;
    return;
  }
  if (lastScreenTap && event.timeStamp - lastScreenTap.time <= 600 && Math.hypot(event.clientX - lastScreenTap.x, event.clientY - lastScreenTap.y) <= 44) {
    lastScreenTap = null;
    toggleLockOnAtScreen(event.clientX, event.clientY);
    return;
  }
  lastScreenTap = { x: event.clientX, y: event.clientY, time: event.timeStamp };
};
gameplayScreen.addEventListener('pointerup', endCameraDrag);
gameplayScreen.addEventListener('pointercancel', endCameraDrag);
gameplayScreen.addEventListener('lostpointercapture', endCameraDrag);
function playerPowerCooldownRemaining(skillId) { return Math.max(0, playerPowerCooldowns[skillId] || 0); }
function startPlayerPowerCooldown(skillId) { playerPowerCooldowns[skillId] = PLAYER_POWER_COOLDOWNS[skillId] || 0; }
function updatePlayerPowerCooldowns(delta) {
  for(const skillId of Object.keys(playerPowerCooldowns))playerPowerCooldowns[skillId]=Math.max(0,playerPowerCooldowns[skillId]-delta);
  document.querySelectorAll('#skill-dock .quick-skill-slot[data-skill-id]').forEach(button=>{
    const remaining=playerPowerCooldownRemaining(button.dataset.skillId),label=button.querySelector('.skill-cooldown');
    button.classList.toggle('cooling',remaining>0);button.disabled=remaining>0;
    if(label)label.textContent=remaining>0?remaining.toFixed(1):'';
    const skill=SKILL_INFO.find(entry=>entry.id===button.dataset.skillId);
    button.setAttribute('aria-label',skill?(remaining>0?skill.name+': '+remaining.toFixed(1)+' s de enfriamiento':'Usar '+skill.name):'Casilla de habilidad vacía');
  });
  const shieldButton=document.getElementById('shield-bash-button'),shieldRemaining=playerPowerCooldownRemaining('shield_bash');
  if(shieldButton){const label=shieldButton.querySelector('.skill-cooldown');shieldButton.classList.toggle('cooling',shieldRemaining>0);shieldButton.disabled=shieldRemaining>0;if(label)label.textContent=shieldRemaining>0?shieldRemaining.toFixed(1):'';shieldButton.setAttribute('aria-label',shieldRemaining>0?'Escudazo: '+shieldRemaining.toFixed(1)+' s de enfriamiento':'Escudazo de Impulso, requiere escudo equipado');}
}
function activateQuickSkill(skillId) {
  if (!gameMode || gameMenuOpen || manualPaused || !rpgState || !(rpgState.skills[skillId] > 0)) return;
  if (skillId === 'moon_slash' || skillId === 'dragon_rise') {
    if (!startRisingSlash(skillId)) showToast('Acércate al objetivo y usa esta técnica desde el suelo.');
  } else if (skillId === 'hurricane') {
    triggerShockwave();
  } else if (skillId === 'dash') {
    startDash();
  } else if (skillId === 'charge') {
    startHeavyAttack();
  }
}
function bindGameAction(button, action, trigger = 'click') {
  let releaseTimer;
  button.addEventListener('pointerdown', event => {
    button.classList.add('pressed');
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => button.classList.remove('pressed'), 150);
    if (button.id === 'action-button') {
      attackHeld = true;
      try { button.setPointerCapture(event.pointerId); } catch (error) {}
    }
    if (trigger === 'pointerdown') { event.preventDefault(); action(); }
  });
  if (button.id === 'action-button') {
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => { attackHeld = false; });
  }
  if (trigger !== 'pointerdown') button.addEventListener(trigger, action);
}
bindGameAction(document.getElementById('action-button'), () => {
  if (nearbyGroundLoot && isGroundLootSafeToOpen()) { openGroundLootPanel(); return; }
  requestComboHit();
}, 'pointerdown');
bindGameAction(document.getElementById('jump-button'), startJump, 'pointerdown');
bindGameAction(document.getElementById('dash-button'), startDash, 'pointerdown');
bindGameAction(document.getElementById('shield-bash-button'), requestShieldBash, 'pointerdown');
bindGameAction(document.getElementById('heavy-button'), startHeavyAttack, 'pointerdown');
const shieldButton = document.getElementById('shield-button');
shieldButton.addEventListener('pointerdown', event => {
  if (shieldButton.disabled) return;
  shieldButtonHeld = true;
  shieldParryTimer = .2;
  shieldButton.classList.add('pressed');
  if (tutorialActive && tutorialStep === 3) showTutorialStep(4);
  try { shieldButton.setPointerCapture(event.pointerId); } catch (error) {}
  event.preventDefault();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) shieldButton.addEventListener(type, () => {
  shieldButtonHeld = false;
  shieldButton.classList.remove('pressed');
});
document.getElementById('weapon-button').addEventListener('click', throwOrRecoverWeapon);
document.getElementById('aim-button').addEventListener('click', () => setPlayerAimMode(!aimMode));
document.getElementById('lock-target-toggle').addEventListener('click', toggleLockOn);
window.addEventListener('keydown', event => {
  if (handleGameMenuShortcut(event)) return;
  if(gameMode&&!gameMenuOpen&&!manualPaused&&['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(event.key.toLowerCase()))dismissChapterIntro();
  if (gameMode && !gameMenuOpen && !manualPaused && !event.repeat) {
    if (event.key === 'Shift' || event.key === 'Control') {
      shieldParryTimer = .2;
      if (tutorialActive && tutorialStep === 3) showTutorialStep(4);
    }
    if (event.code === 'KeyR') { event.preventDefault(); throwOrRecoverWeapon(); return; }
    if (event.code === 'KeyG') { event.preventDefault(); startHeavyAttack(); return; }
    if (event.code === 'KeyV') { event.preventDefault(); requestShieldBash(); return; }
    if (event.code === 'KeyF') { event.preventDefault(); startDash(); return; }
    if (event.code === 'KeyA') { event.preventDefault(); requestComboHit(); return; }
    if (event.key.toLowerCase() === LOCK_ON_CONFIG.toggleKey) { event.preventDefault(); toggleLockOn(); return; }
    if (event.key === LOCK_ON_CONFIG.previousTargetKey) { changeLockTarget(-1); return; }
    if (event.key === LOCK_ON_CONFIG.nextTargetKey) { changeLockTarget(1); return; }
  }
  if (gameMode && !gameMenuOpen && !manualPaused && event.key.toLowerCase()==='e' && nearbyGroundLoot) { event.preventDefault(); if(!openGroundLootPanel())showGroundLootDanger(); return; }
  if (gameMode && !gameMenuOpen && !manualPaused && event.key.toLowerCase()==='e' && nearbyNpc()) { event.preventDefault(); interactNpc(); return; }
  const editingSetting = event.target instanceof HTMLInputElement;
  if ((gameMenuOpen || manualPaused) && !(editingSetting && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))) { event.preventDefault(); return; }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key)) event.preventDefault();
  window.gameKeys[event.key] = true;
  if (event.code === 'Space' && !event.repeat) requestComboHit();
});
window.addEventListener('keyup', event => { window.gameKeys[event.key] = false; });

audioManager = new AudioManager();
window.audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  window.audioUnlocked = true;
  audioManager.initialize();
}
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
function startChapterScroll() {
  const story = document.getElementById('story-window');
  if (chapterScrollFrame) cancelAnimationFrame(chapterScrollFrame);
  story.scrollTop = 0;
  const advanceStory = () => {
    if (!document.getElementById('screen-chapter').classList.contains('active')) { chapterScrollFrame = 0; return; }
    const limit = story.scrollHeight - story.clientHeight;
    if (limit > 0) story.scrollTop = story.scrollTop >= limit ? 0 : story.scrollTop + .35;
    chapterScrollFrame = requestAnimationFrame(advanceStory);
  };
  chapterScrollFrame = requestAnimationFrame(advanceStory);
}
initScene();
renderProfiles();
showScreen('screen-home');
