import { createRoundedBoxGeometry } from './kaelen-atlas.js';

export function createGrassTileTexture(THREE, fallbackColor = '#52604a') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = fallbackColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  const image = new Image();
  image.onload = () => {
    const gridLeft = 328, gridTop = 20, tileWidth = 94, tileHeight = 90.5, inset = 4;
    const grassTiles = [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[7,1],[0,2],[1,2],[3,2],[0,3],[1,3],[3,3],[5,3],[1,4],[2,4],[4,4],[5,4],[0,5],[1,5],[2,5],[7,5],[0,6],[3,6],[0,7],[1,7],[2,7],[7,7]];
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        const [sourceColumn, sourceRow] = grassTiles[(row * 11 + column * 7) % grassTiles.length];
        context.drawImage(image,
          gridLeft + sourceColumn * tileWidth + inset,
          gridTop + sourceRow * tileHeight + inset,
          tileWidth - inset * 2,
          tileHeight - inset * 2,
          column * 32, row * 32, 32, 32);
      }
    }
    texture.needsUpdate = true;
  };
  image.src = 'img/cedped_tiles.jpeg';
  return texture;
}

const terrainTileTextureCache = new Map();
let terrainAtlasImage = null;
let terrainAtlasLoadStarted = false;
const terrainAtlasCallbacks = [];

export function createTerrainTileTexture(THREE, column, row, fallbackColor = '#66553e', repeatX = 1, repeatY = 1) {
  const key = [column, row, fallbackColor, repeatX, repeatY].join(':');
  if (terrainTileTextureCache.has(key)) return terrainTileTextureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d');
  context.fillStyle = fallbackColor;
  context.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  terrainTileTextureCache.set(key, texture);
  const paintTile = () => {
    const gridLeft = 102, gridTop = 92, cellWidth = 102.5, cellHeight = 103.75, inset = 4;
    context.drawImage(terrainAtlasImage,
      gridLeft + column * cellWidth + inset,
      gridTop + row * cellHeight + inset,
      cellWidth - inset * 2,
      cellHeight - inset * 2,
      0, 0, 32, 32);
    texture.needsUpdate = true;
  };
  if (terrainAtlasImage?.complete && terrainAtlasImage.naturalWidth) paintTile();
  else {
    terrainAtlasCallbacks.push(paintTile);
    if (!terrainAtlasLoadStarted) {
      terrainAtlasLoadStarted = true;
      terrainAtlasImage = new Image();
      terrainAtlasImage.onload = () => terrainAtlasCallbacks.splice(0).forEach(callback => callback());
      terrainAtlasImage.src = 'img/materiales1_tiles.jpeg';
    }
  }
  return texture;
}

export function createLamentForest(THREE) {
  const group = new THREE.Group();
  group.name = 'bosque-de-los-lamentos';
  const colliders = [];
  const walkSurfaces = [];
  const wildlife = [];
  const fireflies = [];
  const dummy = new THREE.Object3D();
  const groundMaterial = new THREE.MeshStandardMaterial({ map: createGrassTileTexture(THREE, '#a2b85a'), color: '#dce6cf', roughness: 1 });
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 4, 1, '#96714b', 1, 6), color: '#ffffff', roughness: .98 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#614332', roughness: .96 });
  const rootMaterial = new THREE.MeshStandardMaterial({ color: '#735039', roughness: 1 });
  const leafMaterials = ['#47784a', '#6b9c52', '#9cb65e'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .94 }));
  const addSurface = (geometry, material, name, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const ground = addSurface(new THREE.PlaneGeometry(168, 172), groundMaterial, 'lament-forest-ground', [0, -.08, -44], [-Math.PI / 2, 0, 0]);
  ground.userData.walkSurface = 'grass';
  walkSurfaces.push(ground);
  const trailPoints = [
    new THREE.Vector3(0, .015, 22), new THREE.Vector3(2, .015, 9), new THREE.Vector3(-5, .015, -5),
    new THREE.Vector3(-1, .015, -19), new THREE.Vector3(9, .015, -32), new THREE.Vector3(8, .015, -48),
    new THREE.Vector3(-5, .015, -62), new THREE.Vector3(-8, .015, -78), new THREE.Vector3(3, .015, -94)
  ];
  const trailCurve = new THREE.CatmullRomCurve3(trailPoints, false, 'catmullrom', .42);
  const trail = addSurface(new THREE.TubeGeometry(trailCurve, 180, 3.05, 9, false), dirtMaterial, 'lament-forest-trail', [0, 0, 0]);
  trail.userData.walkSurface = 'dirt';
  walkSurfaces.push(trail);
  const sidePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2, .018, -18), new THREE.Vector3(-18, .018, -26), new THREE.Vector3(-29, .018, -42), new THREE.Vector3(-25, .018, -59)
  ]);
  const branch = addSurface(new THREE.TubeGeometry(sidePath, 64, 1.7, 8, false), dirtMaterial, 'lament-forest-side-trail', [0, 0, 0]);
  branch.userData.walkSurface = 'dirt';
  walkSurfaces.push(branch);

  const factionCamp = { id:'savia_oscura', name:'Pacto de la Savia', x:18, z:-18, maxMembers:20 };
  const campDistance = (x,z) => Math.hypot(x-factionCamp.x,z-factionCamp.z);
  const populationRoles = [
    { id: 'guardian', count: 24 },
    { id: 'hunter', count: 16 },
    { id: 'gatherer', count: 22 },
    { id: 'cultivator', count: 18 },
    { id: 'builder', count: 18 },
    { id: 'artisan', count: 14 },
    { id: 'merchant', count: 8 },
    { id: 'healer', count: 8 },
    { id: 'cook', count: 8 },
    { id: 'elder', count: 6 },
    { id: 'apprentice', count: 8 }
  ];
  const roleSlots = populationRoles.flatMap(role => Array(role.count).fill(role.id));
  const householdSites = [
    { district: 'heart', x: 11, z: -16 }, { district: 'heart', x: 25, z: -15 },
    { district: 'heart', x: 18, z: -25 }, { district: 'heart', x: 7, z: -21.5 },
    { district: 'heart', x: 29, z: -20.3 }, { district: 'heart', x: 5, z: -29 },
    { district: 'heart', x: 31, z: -29 },
    { district: 'west', x: -5, z: -11 }, { district: 'west', x: -13, z: -11 },
    { district: 'west', x: -5, z: -19 }, { district: 'west', x: -13, z: -19 },
    { district: 'west', x: -5, z: -27 }, { district: 'west', x: -13, z: -27 },
    { district: 'east', x: 41, z: -11 }, { district: 'east', x: 49, z: -11 },
    { district: 'east', x: 41, z: -19 }, { district: 'east', x: 49, z: -19 },
    { district: 'east', x: 41, z: -27 }, { district: 'east', x: 49, z: -27 },
    { district: 'north', x: 55, z: -39 }, { district: 'north', x: 63, z: -39 },
    { district: 'north', x: 71, z: -39 }, { district: 'north', x: 55, z: -47 },
    { district: 'north', x: 63, z: -47 }, { district: 'north', x: 71, z: -47 }
  ];
  const households = householdSites.map((site, index) => ({
    id: 'savia_household_' + String(index + 1).padStart(2, '0'),
    ...site,
    capacity: 6
  }));
  const residents = Array.from({ length: 150 }, (_, index) => {
    const role = roleSlots[(index * 37) % roleSlots.length];
    return {
      id: 'savia_resident_' + String(index + 1).padStart(3, '0'),
      householdId: households[Math.floor(index / 6)].id,
      role,
      ageGroup: role === 'apprentice' ? 'youth' : role === 'elder' ? 'elder' : 'adult',
      simulation: 'offscreen'
    };
  });
  const settlement = {
    id: factionCamp.id,
    name: factionCamp.name,
    center: { x: factionCamp.x, z: factionCamp.z },
    population: residents,
    households,
    populationRoles,
    facilities: [
      { id: 'council_hall', role: 'communal', x: 18, z: -34, width: 9.5, depth: 6.5 },
      { id: 'smokehouse', role: 'food', x: -21, z: -19, width: 6.2, depth: 5.2 },
      { id: 'granary', role: 'storage', x: -21, z: -29, width: 6.2, depth: 5.2 },
      { id: 'bamboo_workshop', role: 'construction', x: 51, z: -18, width: 7, depth: 5.6 },
      { id: 'weaving_shed', role: 'craft', x: 51, z: -29, width: 6.4, depth: 5.4 }
    ]
  };
  const trailSamples = trailCurve.getPoints(110);
  const nearTrail = (x, z, clearance) => trailSamples.some(point => Math.hypot(point.x - x, point.z - z) < clearance);
  const trees = [];
  for (let row = 0; row < 15; row++) {
    for (let column = 0; column < 19; column++) {
      const seed = row * 137 + column * 71 + 19;
      const x = -76 + column * 8.4 + Math.sin(seed * 12.9898) * 2.8;
      const z = 15 - row * 7.7 + Math.cos(seed * 7.233) * 2.6;
      if ((Math.abs(x) < 7.5 && z > 4) || nearTrail(x, z, 5.2) || campDistance(x,z)<44 || Math.abs(x) > 78 || z < -98) continue;
      trees.push({ x, z, scale: .78 + (seed % 9) / 10, yaw: (seed % 13) * .31 });
    }
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .43, 1, 7), trunkMaterial, trees.length);
  const crownA = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), leafMaterials[0], trees.length);
  const crownB = new THREE.InstancedMesh(new THREE.ConeGeometry(.8, 1, 7), leafMaterials[1], trees.length);
  const crownC = new THREE.InstancedMesh(new THREE.ConeGeometry(.57, 1, 7), leafMaterials[2], trees.length);
  const roots = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .16, 1, 5), rootMaterial, trees.length * 2);
  trees.forEach((tree, index) => {
    dummy.position.set(tree.x, 2.05 * tree.scale, tree.z);
    dummy.rotation.set(0, tree.yaw, 0);
    dummy.scale.set(tree.scale, 4.1 * tree.scale, tree.scale);
    dummy.updateMatrix(); trunk.setMatrixAt(index, dummy.matrix);
    [[crownA, 4.5, 2.15, 3.1], [crownB, 6.5, 1.7, 2.7], [crownC, 8.25, 1.2, 2.35]].forEach(([mesh, y, radius, height]) => {
      dummy.position.set(tree.x, y * tree.scale, tree.z);
      dummy.scale.set(radius * tree.scale, height * tree.scale, radius * tree.scale);
      dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
    });
    for (let rootIndex = 0; rootIndex < 2; rootIndex++) {
      const angle = tree.yaw + rootIndex * Math.PI;
      dummy.position.set(tree.x + Math.sin(angle) * .42 * tree.scale, .16, tree.z + Math.cos(angle) * .42 * tree.scale);
      dummy.rotation.set(Math.cos(angle) * .28, angle, Math.sin(angle) * .28);
      dummy.scale.set(tree.scale, 2.1 * tree.scale, tree.scale);
      dummy.updateMatrix(); roots.setMatrixAt(index * 2 + rootIndex, dummy.matrix);
    }
    colliders.push({ x: tree.x, z: tree.z, halfWidth: .56 * tree.scale, halfDepth: .56 * tree.scale, yaw: 0 });
  });
  [trunk, roots, crownA, crownB, crownC].forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); });

  const bushMaterial = new THREE.MeshStandardMaterial({ color: '#344638', roughness: .98 });
  const bushPositions = [];
  for (let index = 0; index < 150; index++) {
    const x = Math.sin(index * 18.17) * 70;
    const z = 12 - (index % 25) * 4.15 + Math.cos(index * 2.4) * 2;
    if (!nearTrail(x, z, 4.3) && campDistance(x,z)>44) bushPositions.push({ x, z, scale: .5 + (index % 5) * .11, yaw: index * .73 });
  }
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.7, 1), bushMaterial, bushPositions.length);
  bushPositions.forEach((bush, index) => {
    dummy.position.set(bush.x, .38 * bush.scale, bush.z);
    dummy.rotation.set(.1, bush.yaw, .08);
    dummy.scale.set(1.25 * bush.scale, .72 * bush.scale, .95 * bush.scale);
    dummy.updateMatrix(); bushes.setMatrixAt(index, dummy.matrix);
    colliders.push({ x: bush.x, z: bush.z, halfWidth: .38 * bush.scale, halfDepth: .38 * bush.scale, yaw: 0 });
  });
  bushes.castShadow = true;
  group.add(bushes);
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#c0cf62', roughness: 1, side: THREE.DoubleSide });
  const grassPositions = [];
  for (let index = 0; index < 1900; index++) {
    const x = Math.sin(index * 17.17) * 78;
    const z = 13 - (index % 53) * 2.05 + Math.cos(index * 4.2) * 2.4;
    if (nearTrail(x, z, 3.6) || campDistance(x, z) < 44) continue;
    grassPositions.push({ x, z, yaw: index * 2.399, scale: .55 + (index % 7) * .11 });
  }
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(.055, .52, 3), grassMaterial, grassPositions.length);
  grassPositions.forEach((blade, index) => {
    dummy.position.set(blade.x, .23 * blade.scale, blade.z);
    dummy.rotation.set(.08 * Math.sin(blade.yaw), blade.yaw, .08 * Math.cos(blade.yaw));
    dummy.scale.set(1, blade.scale, 1);
    dummy.updateMatrix(); grass.setMatrixAt(index, dummy.matrix);
  });
  grass.castShadow = false;
  grass.receiveShadow = false;
  group.add(grass);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#59645a', roughness: .95 });
  for (let index = 0; index < 36; index++) {
    const x = Math.sin(index * 4.37) * 67;
    const z = -7 - (index % 12) * 7.2 + Math.cos(index * 2.3) * 2.4;
    if (nearTrail(x, z, 4.2) || campDistance(x,z)<44) continue;
    const rock = addSurface(new THREE.DodecahedronGeometry(.6 + (index % 4) * .2, 0), stoneMaterial, 'lament-forest-stone', [x, .38, z]);
    rock.scale.set(1.35, .75 + (index % 3) * .12, 1.05);
    colliders.push({ x, z, halfWidth: .68, halfDepth: .56, yaw: 0 });
  }

  const blossomMaterials = ['#efb4c7', '#f7cbd5', '#f3d8d0'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .86 }));
  const blossomTrunk = new THREE.MeshStandardMaterial({ color: '#73503e', roughness: .96 });
  const blossomTrees = [[-35,-18],[43,-27],[-48,-40],[53,-58],[-39,-77],[38,-87]];
  blossomTrees.forEach(([x,z], index) => {
    if (nearTrail(x, z, 5.5) || campDistance(x, z) < 44) return;
    const height = 5.2 + (index % 3) * .55;
    const trunk = addSurface(new THREE.CylinderGeometry(.2, .43, height, 7), blossomTrunk, 'sakura-trunk', [x, height / 2, z]);
    trunk.rotation.z = (index % 2 ? 1 : -1) * .08;
    for (const branchSide of [-1, 1]) {
      const branch = addSurface(new THREE.CylinderGeometry(.07, .15, 2.2, 6), blossomTrunk, 'sakura-branch', [x + branchSide * .62, height * .69, z]);
      branch.rotation.z = branchSide * -.54;
    }
    for (let cluster = 0; cluster < 7; cluster++) {
      const angle = cluster * 2.4 + index;
      const crown = addSurface(new THREE.IcosahedronGeometry(1.05 + (cluster % 3) * .18, 1), blossomMaterials[(cluster + index) % blossomMaterials.length], 'sakura-blossom-crown', [x + Math.cos(angle) * 1.25, height + Math.sin(angle * 1.7) * .65, z + Math.sin(angle) * 1.15]);
      crown.scale.set(1.25, .8, 1.05);
    }
    colliders.push({ x, z, halfWidth: .68, halfDepth: .68, yaw: 0 });
  });

  const mountainMaterials = ['#78969a', '#829da0', '#91a9a8'].map(color => new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 5, 5, color, 2, 2), color: '#d1d4d0', roughness: 1, flatShading: true }));
  const snowMaterial = new THREE.MeshStandardMaterial({ color: '#e8eee2', roughness: .9, flatShading: true });
  [[-51,-112,37,47],[50,-117,42,55],[0,-128,48,62]].forEach(([x,z,radius,height], index) => {
    addSurface(new THREE.ConeGeometry(radius, height, 7), mountainMaterials[index % mountainMaterials.length], 'distant-mountain', [x, height / 2 - 2, z]);
    addSurface(new THREE.ConeGeometry(radius * .37, height * .3, 7), snowMaterial, 'distant-snow-cap', [x - radius * .1, height * .79, z + .2]);
  });
  const cliffShape = new THREE.Shape();
  cliffShape.moveTo(-25, 0);
  cliffShape.lineTo(-23, 17);
  cliffShape.lineTo(-18, 28);
  cliffShape.lineTo(-11, 35);
  cliffShape.lineTo(-4, 32);
  cliffShape.lineTo(4, 36);
  cliffShape.lineTo(12, 32);
  cliffShape.lineTo(19, 26);
  cliffShape.lineTo(24, 13);
  cliffShape.lineTo(25, 0);
  cliffShape.closePath();
  const passageHole = new THREE.Path();
  passageHole.moveTo(-2.8, 0);
  passageHole.lineTo(2.8, 0);
  passageHole.lineTo(2.8, 2.9);
  passageHole.quadraticCurveTo(2.8, 4.5, 0, 4.5);
  passageHole.quadraticCurveTo(-2.8, 4.5, -2.8, 2.9);
  passageHole.closePath();
  cliffShape.holes.push(passageHole);
  addSurface(new THREE.ExtrudeGeometry(cliffShape, { depth: 33.6, bevelEnabled: false }), new THREE.MeshStandardMaterial({ map: createTerrainTileTexture(THREE, 6, 5, '#77715f', 3, 4), color: '#d1d1ca', roughness: 1, flatShading: true }), 'castle-rocky-cliff', [0, 0, -117.8]);
  const passageFloor = addSurface(new THREE.BoxGeometry(5.6, .12, 33.4), dirtMaterial, 'castle-cliff-passage-floor', [0, -.02, -101]);
  passageFloor.userData.walkSurface = 'dirt';
  walkSurfaces.push(passageFloor);
  for (const side of [-1, 1]) {
    colliders.push({ x: side * 12.75, z: -101, halfWidth: 10.35, halfDepth: 16.8, yaw: 0 });
  }
  const castleStone = new THREE.MeshStandardMaterial({ color: '#e5d9bd', roughness: .88 });
  const castleRoof = new THREE.MeshStandardMaterial({ color: '#a95550', roughness: .84, flatShading: true });
  addSurface(new THREE.BoxGeometry(15, 7, 8), castleStone, 'cliff-castle-keep', [0, 34, -101]);
  addSurface(new THREE.BoxGeometry(23, 5, 2.2), castleStone, 'cliff-castle-wall', [0, 33, -105]);
  for (const towerX of [-9, 9]) {
    addSurface(new THREE.CylinderGeometry(2.15, 2.5, 10, 8), castleStone, 'cliff-castle-tower', [towerX, 35, -103]);
    addSurface(new THREE.ConeGeometry(2.7, 5, 8), castleRoof, 'cliff-castle-tower-roof', [towerX, 42.2, -103]);
  }
  addSurface(new THREE.ConeGeometry(5, 7, 8), castleRoof, 'cliff-castle-keep-roof', [0, 41, -101]);
  const waterfallMaterial = new THREE.MeshBasicMaterial({ color: '#9de7ef', transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false });
  const waterfallFoam = new THREE.MeshBasicMaterial({ color: '#edf7e8', transparent: true, opacity: .66, side: THREE.DoubleSide, depthWrite: false });
  for (const [x,z,height] of [[-13,-99,18],[13,-99,17]]) {
    addSurface(new THREE.PlaneGeometry(3.6, height), waterfallMaterial, 'cliff-waterfall', [x, height / 2 + 4, z]);
    addSurface(new THREE.PlaneGeometry(.42, height * .92), waterfallFoam, 'cliff-waterfall-foam', [x - .7, height / 2 + 4, z + .05]);
  }
  const moonShape = new THREE.Shape();
  moonShape.moveTo(1.2, 2.1);
  moonShape.quadraticCurveTo(-1.8, 2.1, -2, 0);
  moonShape.quadraticCurveTo(-1.8, -2.1, 1.2, -2.1);
  moonShape.quadraticCurveTo(-.1, 0, 1.2, 2.1);
  const crescent = new THREE.Mesh(new THREE.ShapeGeometry(moonShape, 20), new THREE.MeshBasicMaterial({ color: '#fff0bd', side: THREE.DoubleSide, transparent: true, opacity: .78, depthWrite: false }));
  crescent.name = 'subtle-crescent-moon';
  crescent.position.set(24, 34, -93);
  group.add(crescent);
  for (let index = 0; index < 4; index++) {
    const rayGeometry = new THREE.BufferGeometry();
    rayGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0,-2.4,-19,0,2.4,-19,0], 3));
    rayGeometry.setIndex([0,1,2]);
    rayGeometry.computeVertexNormals();
    const ray = new THREE.Mesh(rayGeometry, new THREE.MeshBasicMaterial({ color: '#fff0c9', transparent: true, opacity: .055, side: THREE.DoubleSide, depthWrite: false }));
    ray.position.set(-19 + index * 12, 29, -72);
    group.add(ray);
  }

  const campWood=new THREE.MeshStandardMaterial({color:'#594332',roughness:.96});
  const campDarkWood=new THREE.MeshStandardMaterial({color:'#352b25',roughness:.98});
  const campRoof=new THREE.MeshStandardMaterial({color:'#6b4932',roughness:.94});
  const campHide=new THREE.MeshStandardMaterial({color:'#81734c',roughness:1,side:THREE.DoubleSide});
  const campBannerMaterial=new THREE.MeshStandardMaterial({color:'#718348',roughness:.88,side:THREE.DoubleSide});
  const campStoneMaterial=new THREE.MeshStandardMaterial({color:'#6f6258',roughness:.94});
  const campWickerMaterial=new THREE.MeshStandardMaterial({color:'#7d8b62',roughness:1,side:THREE.DoubleSide});
  const campAncientRoof=new THREE.MeshStandardMaterial({color:'#6e4028',roughness:.94});
  let homeRoof = null;
  const dwellingRoofs = [];
  const hut=(x,z,width,depth,variant='standard')=>{
    const wallHeight = variant === 'ancient' ? 2.6 : variant === 'dwelling' ? 2.45 : 2.8;
    const roofBase = variant === 'ancient' ? 1.7 : 1.8;
    if (variant === 'home' || variant === 'dwelling') {
      const wallDepth = .22;
      const doorwayWidth = variant === 'home' ? Math.min(3.4, width * .28) : 1.35;
      const frontWallWidth = (width - doorwayWidth) / 2;
      const floor = addSurface(new THREE.BoxGeometry(width - .3, .12, depth - .3), campDarkWood, 'faction-camp-' + variant + '-floor', [x, .08, z]);
      floor.userData.walkSurface = 'wood';
      walkSurfaces.push(floor);
      addSurface(new THREE.BoxGeometry(width, wallHeight, wallDepth), campWood, 'faction-camp-home-wall-back', [x, wallHeight / 2, z - depth / 2]);
      for (const side of [-1, 1]) {
        addSurface(new THREE.BoxGeometry(wallDepth, wallHeight, depth), campWood, 'faction-camp-home-wall-side', [x + side * width / 2, wallHeight / 2, z]);
        addSurface(new THREE.BoxGeometry(frontWallWidth, wallHeight, wallDepth), campWood, 'faction-camp-home-wall-front', [x + side * (doorwayWidth / 2 + frontWallWidth / 2), wallHeight / 2, z + depth / 2]);
        colliders.push({ x: x + side * width / 2, z, halfWidth: wallDepth / 2, halfDepth: depth / 2, yaw: 0 });
        colliders.push({ x: x + side * (doorwayWidth / 2 + frontWallWidth / 2), z: z + depth / 2, halfWidth: frontWallWidth / 2, halfDepth: wallDepth / 2, yaw: 0 });
      }
      colliders.push({ x, z: z - depth / 2, halfWidth: width / 2, halfDepth: wallDepth / 2, yaw: 0 });
      addSurface(new THREE.BoxGeometry(doorwayWidth + .6, .3, wallDepth), campDarkWood, 'faction-camp-home-door-beam', [x, wallHeight + .15, z + depth / 2]);
      if (variant === 'home') {
        addSurface(new THREE.BoxGeometry(1.8, .04, 2.2), campHide, 'faction-camp-home-sleeping-mat', [x, .16, z - .45]);
      } else {
        addSurface(new THREE.BoxGeometry(.48, .48, .44), campDarkWood, 'faction-camp-dwelling-storage-chest', [x - width * .27, .36, z - depth * .3]);
        addSurface(new THREE.BoxGeometry(1.25, .1, 1.75), campHide, 'faction-camp-dwelling-sleeping-mat', [x + width * .22, .18, z - depth * .24]);
        addSurface(new THREE.CylinderGeometry(.35, .42, .16, 10), campStoneMaterial, 'faction-camp-dwelling-hearth', [x - width * .24, .17, z + depth * .22]);
      }
    } else {
      addSurface(new THREE.BoxGeometry(width, wallHeight, depth), variant === 'ancient' ? campDarkWood : campWood, 'faction-camp-hut', [x, wallHeight / 2, z]);
    }
    if (variant === 'home' || variant === 'dwelling') {
      const roof = new THREE.Group();
      roof.name = variant === 'home' ? 'faction-camp-home-gabled-roof' : 'faction-camp-dwelling-gabled-roof';
      group.add(roof);
      const rise = 2.45;
      const halfRun = width / 2 + .55;
      const panelLength = Math.hypot(halfRun, rise);
      const panelAngle = Math.atan2(rise, halfRun);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(panelLength, .2, depth + .9), campRoof);
        panel.position.set(x + side * halfRun / 2, wallHeight + .35 + rise / 2, z);
        panel.rotation.z = -side * panelAngle;
        panel.castShadow = true;
        panel.receiveShadow = true;
        roof.add(panel);
        for (let rib = 0; rib <= 4; rib++) {
          const rafter = new THREE.Mesh(new THREE.BoxGeometry(panelLength, .13, .16), campDarkWood);
          rafter.position.set(panel.position.x, panel.position.y + .11, z - depth * .42 + depth * .21 * rib);
          rafter.rotation.z = -side * panelAngle;
          rafter.castShadow = true;
          roof.add(rafter);
        }
      }
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.15, .18, depth + 1.1, 8), campDarkWood);
      ridge.position.set(x, wallHeight + rise + .35, z);
      ridge.rotation.x = Math.PI / 2;
      ridge.castShadow = true;
      roof.add(ridge);
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-width / 2, 0);
      gableShape.lineTo(0, rise);
      gableShape.lineTo(width / 2, 0);
      gableShape.closePath();
      const gableGeometry = new THREE.ShapeGeometry(gableShape);
      const gableMaterial = new THREE.MeshStandardMaterial({ color: '#716044', roughness: .96, side: THREE.DoubleSide });
      for (const end of [-1, 1]) {
        const gable = new THREE.Mesh(gableGeometry, gableMaterial);
        gable.position.set(x, wallHeight + .33, z + end * (depth / 2 - .12));
        gable.castShadow = true;
        roof.add(gable);
        for (const side of [-1, 1]) {
          const brace = new THREE.Mesh(new THREE.BoxGeometry(.14, panelLength, .14), campDarkWood);
          brace.position.set(x + side * halfRun / 2, wallHeight + .35 + rise / 2, z + end * (depth / 2 - .2));
          brace.rotation.z = -side * panelAngle;
          brace.castShadow = true;
          roof.add(brace);
        }
      }
      if (variant === 'home') homeRoof = roof;
      else dwellingRoofs.push({ roof, x, z });
    } else {
      addSurface(new THREE.ConeGeometry(Math.max(width, depth) * .78, roofBase, 4), variant === 'ancient' ? campAncientRoof : campRoof, 'faction-camp-hut-roof', [x, wallHeight + 0.9, z], [0, Math.PI / 4, 0]);
    }
    addSurface(new THREE.BoxGeometry(width + .25, .18, depth + .25), campDarkWood, 'faction-camp-hut-step', [x, .12, z]);
    if (variant === 'ancient') {
      addSurface(new THREE.BoxGeometry(width * .9, .2, depth * .9), campStoneMaterial, 'faction-camp-hut-foundation', [x, .2, z]);
      addSurface(new THREE.BoxGeometry(width * 1.12, .18, .18), campDarkWood, 'faction-camp-hut-threshold', [x, .6, z + depth * .44]);
      addSurface(new THREE.BoxGeometry(.18, 1.4, depth * .88), campDarkWood, 'faction-camp-hut-beam-left', [x - width * .3, 1.15, z]);
      addSurface(new THREE.BoxGeometry(.18, 1.4, depth * .88), campDarkWood, 'faction-camp-hut-beam-right', [x + width * .3, 1.15, z]);
      addSurface(new THREE.BoxGeometry(width * .78, 1.0, .18), campStoneMaterial, 'faction-camp-hut-arch', [x, .95, z + depth * .4]);
      const wicker = addSurface(new THREE.PlaneGeometry(width * .78, wallHeight * 1.25), campWickerMaterial, 'faction-camp-hut-wicker', [x, wallHeight * .58, z + depth * .52], [0, 0, 0]);
      wicker.rotation.y = Math.PI;
      const leftBrace = addSurface(new THREE.BoxGeometry(.12, 1.1, depth * .7), campDarkWood, 'faction-camp-hut-brace-left', [x - width * .36, 1.2, z + .2]);
      const rightBrace = addSurface(new THREE.BoxGeometry(.12, 1.1, depth * .7), campDarkWood, 'faction-camp-hut-brace-right', [x + width * .36, 1.2, z + .2]);
      leftBrace.rotation.y = .12;
      rightBrace.rotation.y = -.12;
    }
    if (variant !== 'home' && variant !== 'dwelling') colliders.push({x,z,halfWidth:width*.56,halfDepth:depth*.56,yaw:0});
  };
  const mudMaterial=new THREE.MeshStandardMaterial({color:'#70503b',roughness:1});
  const wornMudMaterial=new THREE.MeshStandardMaterial({color:'#806044',roughness:1});
  const campMudShape=new THREE.Shape();
  campMudShape.moveTo(-2.7,-17);campMudShape.quadraticCurveTo(-3.1,-12,-2.4,-8);campMudShape.lineTo(-3.2,-3);campMudShape.quadraticCurveTo(-3.5,0,-2.1,2);campMudShape.lineTo(2.1,2);campMudShape.quadraticCurveTo(3.2,-1,2.5,-5);campMudShape.lineTo(3.1,-11);campMudShape.quadraticCurveTo(3.5,-15,2.7,-17);campMudShape.closePath();
  addSurface(new THREE.ShapeGeometry(campMudShape,12),mudMaterial,'pacto-camp-mud-ground',[factionCamp.x,.004,factionCamp.z],[-Math.PI/2,0,0]);
  for(const [x,z,scale] of [[-4,-5,.65],[4,-5,.65],[-4,1,.55],[4,1,.55]]){
    const patch=new THREE.Mesh(new THREE.CircleGeometry(1.8,12),wornMudMaterial);
    patch.name='pacto-camp-worn-mud';patch.position.set(factionCamp.x+x,.012,factionCamp.z+z);patch.rotation.x=-Math.PI/2;patch.scale.set(scale*1.4,scale,1);group.add(patch);
  }
  const campLeft=factionCamp.x-16,campRight=factionCamp.x+16,campTop=factionCamp.z-16,campBottom=factionCamp.z+16;
  const post=(x,z)=>{
    addSurface(new THREE.CylinderGeometry(.16,.22,2.35,6),campWood,'faction-camp-palisade',[x,1.18,z]);
    colliders.push({x,z,halfWidth:.31,halfDepth:.31,yaw:0,minY:0,maxY:2.35});
  };
  for(let index=0;index<=11;index++){
    const x=campLeft+index*(campRight-campLeft)/11;
    if(x<factionCamp.x-3.2||x>factionCamp.x+3.2)post(x,campTop);
    if(x<factionCamp.x-3.2||x>factionCamp.x+3.2)post(x,campBottom);
  }
  for(let index=1;index<11;index++){
    const z=campTop+index*(campBottom-campTop)/11;
    post(campLeft,z);post(campRight,z);
  }
  const panel=(x,z,width,depth)=>addSurface(new THREE.BoxGeometry(width,1.35,depth),campWood,'faction-camp-palisade-solid-panel',[x,.88,z]);
  const rail=(x,z,width,depth)=>addSurface(new THREE.BoxGeometry(width,.18,depth),campDarkWood,'faction-camp-palisade-rail',[x,1.72,z]);
  panel(campLeft+(campRight-campLeft-6.4)/4,campTop,(campRight-campLeft-6.4)/2,.18);
  panel(campRight-(campRight-campLeft-6.4)/4,campTop,(campRight-campLeft-6.4)/2,.18);
  rail(campLeft+(campRight-campLeft-6.4)/4,campTop,(campRight-campLeft-6.4)/2,.18);
  rail(campRight-(campRight-campLeft-6.4)/4,campTop,(campRight-campLeft-6.4)/2,.18);
  panel(campLeft+(campRight-campLeft-6.4)/4,campBottom,(campRight-campLeft-6.4)/2,.18);
  panel(campRight-(campRight-campLeft-6.4)/4,campBottom,(campRight-campLeft-6.4)/2,.18);
  rail(campLeft+(campRight-campLeft-6.4)/4,campBottom,(campRight-campLeft-6.4)/2,.18);
  rail(campRight-(campRight-campLeft-6.4)/4,campBottom,(campRight-campLeft-6.4)/2,.18);
  panel(campLeft,factionCamp.z,.18,campBottom-campTop);
  panel(campRight,factionCamp.z,.18,campBottom-campTop);
  rail(campLeft,factionCamp.z,.18,campBottom-campTop);
  rail(campRight,factionCamp.z,.18,campBottom-campTop);
  for(const side of [-1,1])colliders.push({x:factionCamp.x+side*(3.2+6.4),z:campTop,halfWidth:6.4,halfDepth:.42,yaw:0,minY:0,maxY:2.35});
  colliders.push({x:campLeft,z:factionCamp.z,halfWidth:.42,halfDepth:14,yaw:0});
  colliders.push({x:campRight,z:factionCamp.z,halfWidth:.42,halfDepth:14,yaw:0});
  colliders.push({x:campLeft+(factionCamp.x-campLeft-3.2)/2,z:campBottom,halfWidth:(factionCamp.x-campLeft-3.2)/2,halfDepth:.42,yaw:0});
  colliders.push({x:factionCamp.x+3.2+(campRight-factionCamp.x-3.2)/2,z:campBottom,halfWidth:(campRight-factionCamp.x-3.2)/2,halfDepth:.42,yaw:0});
  const gateTunnelStart = campBottom + 9;
  const gateTunnelEnd = campBottom - 9;
  const gateTunnelLength = gateTunnelStart - gateTunnelEnd;
  const gateTunnelCenter = (gateTunnelStart + gateTunnelEnd) / 2;
  const gateTunnelWidth = 5.6;
  const gateTunnelFloor = addSurface(new THREE.BoxGeometry(gateTunnelWidth, .12, gateTunnelLength), dirtMaterial, 'pacto-gate-tunnel-floor', [factionCamp.x, -.025, gateTunnelCenter]);
  gateTunnelFloor.userData.walkSurface = 'dirt';
  walkSurfaces.push(gateTunnelFloor);
  for (const side of [-1, 1]) {
    const wallX = factionCamp.x + side * (gateTunnelWidth / 2 - .34);
    addSurface(new THREE.BoxGeometry(.68, 4.5, gateTunnelLength), campDarkWood, 'pacto-gate-tunnel-solid-wall', [wallX, 2.25, gateTunnelCenter]);
    colliders.push({ x: wallX, z: gateTunnelCenter, halfWidth: .34, halfDepth: gateTunnelLength / 2, yaw: 0 });
    for (let level = 0; level < 5; level++) {
      addSurface(new THREE.CylinderGeometry(.15, .17, gateTunnelLength + .15, 7), level % 2 ? campWood : campDarkWood, 'pacto-gate-tunnel-wall-log', [wallX - side * .04, .48 + level * .78, gateTunnelCenter], [Math.PI / 2, 0, 0]);
    }
    for (let rib = 0; rib <= 6; rib++) {
      const z = gateTunnelStart - gateTunnelLength * rib / 6;
      addSurface(new THREE.BoxGeometry(.44, 4.9, .44), campWood, 'pacto-gate-tunnel-rib-post', [wallX, 2.35, z]);
    }
  }
  addSurface(new THREE.BoxGeometry(gateTunnelWidth + 1.1, .32, gateTunnelLength), campRoof, 'pacto-gate-tunnel-roof', [factionCamp.x, 4.72, gateTunnelCenter]);
  for (let rib = 0; rib <= 6; rib++) {
    const z = gateTunnelStart - gateTunnelLength * rib / 6;
    addSurface(new THREE.BoxGeometry(gateTunnelWidth + 1.4, .28, .36), campDarkWood, 'pacto-gate-tunnel-crossbeam', [factionCamp.x, 4.48, z]);
  }
  for (const [z, end] of [[gateTunnelStart, 'entry'], [gateTunnelEnd, 'exit']]) {
    for (const side of [-1, 1]) {
      const x = factionCamp.x + side * (gateTunnelWidth / 2 + .18);
      addSurface(new THREE.CylinderGeometry(.25, .31, 5.1, 7), campWood, 'pacto-gate-tunnel-' + end + '-pillar', [x, 2.55, z]);
      colliders.push({ x, z, halfWidth: .25, halfDepth: .25, yaw: 0 });
    }
    addSurface(new THREE.BoxGeometry(gateTunnelWidth + 1.1, .5, .46), campDarkWood, 'pacto-gate-tunnel-' + end + '-lintel', [factionCamp.x, 5.05, z]);
  }
  hut(factionCamp.x-9,factionCamp.z+6,5.4,5.1);
  hut(factionCamp.x+9,factionCamp.z+6,5.2,4.8);
  hut(factionCamp.x,factionCamp.z-7,12,8.5,'home');
  hut(factionCamp.x-11,factionCamp.z-3.5,4.9,4.7,'ancient');
  hut(factionCamp.x+11,factionCamp.z-2.3,4.8,4.6,'ancient');
  households.slice(5).forEach(household => hut(household.x, household.z, 5.2, 4.7, 'dwelling'));
  settlement.facilities.forEach(facility => {
    hut(facility.x, facility.z, facility.width, facility.depth, 'dwelling');
    const addFixture = (geometry, material, localX, y, localZ, collider = false) => {
      addSurface(geometry, material, 'tribal-' + facility.id + '-fixture', [facility.x + localX, y, facility.z + localZ]);
      if (collider) colliders.push({ x: facility.x + localX, z: facility.z + localZ, halfWidth: .42, halfDepth: .42, yaw: 0 });
    };
    if (facility.id === 'council_hall') {
      for (const side of [-1, 1]) {
        addFixture(new THREE.BoxGeometry(2.6, .32, .48), campDarkWood, side * 2.6, .42, -.5, true);
        addFixture(new THREE.BoxGeometry(2.6, .32, .48), campDarkWood, side * 2.6, .42, 1.05, true);
      }
      addFixture(new THREE.CylinderGeometry(.52, .62, .18, 12), campStoneMaterial, 0, .18, .45, true);
    } else if (facility.id === 'smokehouse') {
      for (let level = 0; level < 3; level++) {
        addFixture(new THREE.BoxGeometry(3.8, .12, .12), campDarkWood, 0, 1.1 + level * .48, -1.1);
        for (let hook = -2; hook <= 2; hook++) addFixture(new THREE.CapsuleGeometry(.045, .28, 3, 5), campHide, hook * .55, 1.3 + level * .48, -1.1);
      }
      addFixture(new THREE.CylinderGeometry(.48, .58, .25, 10), campStoneMaterial, 0, .18, 1.25, true);
    } else if (facility.id === 'granary') {
      for (let row = 0; row < 2; row++) for (let bin = 0; bin < 3; bin++) {
        const localX = (bin - 1) * 1.25;
        const localZ = row ? 1.15 : -1.25;
        addFixture(new THREE.BoxGeometry(.82, .78, .78), campWood, localX, .48, localZ, true);
        addFixture(new THREE.BoxGeometry(.86, .08, .82), campDarkWood, localX, .91, localZ);
      }
    } else if (facility.id === 'bamboo_workshop') {
      for (let stack = 0; stack < 3; stack++) {
        const pole = addSurface(new THREE.CylinderGeometry(.08, .1, 4.5, 7), campWood, 'tribal-bamboo-workshop-pole', [facility.x - 1.5 + stack * .48, .72 + stack * .15, facility.z - .85]);
        pole.rotation.z = Math.PI / 2;
        const rack = addSurface(new THREE.BoxGeometry(4.8, .12, .12), campDarkWood, 'tribal-bamboo-workshop-rack', [facility.x, .35 + stack * .38, facility.z - .85]);
        rack.userData.walkSurface = 'wood';
      }
    } else {
      for (let loom = 0; loom < 2; loom++) {
        const localX = loom ? 1.45 : -1.45;
        addFixture(new THREE.BoxGeometry(.12, 1.6, .12), campDarkWood, localX, .92, -.85);
        addFixture(new THREE.BoxGeometry(.12, 1.6, .12), campDarkWood, localX, .92, .85);
        addFixture(new THREE.BoxGeometry(.14, .14, 1.9), campWood, localX, 1.6, 0);
        addFixture(new THREE.PlaneGeometry(1.2, 1.15), campHide, localX, 1.04, .08);
      }
    }
  });
  const watchtower=(x,z)=>{
    addSurface(new THREE.CylinderGeometry(.22,.3,5.6,6),campDarkWood,'faction-camp-watchtower-pole',[x,2.8,z]);
    addSurface(new THREE.BoxGeometry(2.5,.25,2.5),campWood,'faction-camp-watchtower-platform',[x,4.5,z]);
    addSurface(new THREE.ConeGeometry(1.75,1.5,4),campRoof,'faction-camp-watchtower-roof',[x,5.45,z],[0,Math.PI/4,0]);
    colliders.push({x,z,halfWidth:.55,halfDepth:.55,yaw:0});
  };
  watchtower(campLeft+1,campTop+1);watchtower(campRight-1,campTop+1);
  const bannerPole=addSurface(new THREE.CylinderGeometry(.07,.1,5.8,6),campDarkWood,'faction-camp-banner-pole',[factionCamp.x,2.9,campBottom-1]);
  const banner=addSurface(new THREE.PlaneGeometry(1.7,1.05),campBannerMaterial,'faction-camp-banner',[factionCamp.x+.88,4.75,campBottom-1]);
  banner.rotation.y=Math.PI/2;
  addSurface(new THREE.TorusGeometry(3.8,.08,5,28),new THREE.MeshStandardMaterial({color:'#8d7549',roughness:.9}),'faction-camp-fire-ring',[factionCamp.x, .12,factionCamp.z+1],[Math.PI/2,0,0]);
  const campFire=new THREE.PointLight('#d78b42',1.25,10,2);campFire.position.set(factionCamp.x,.8,factionCamp.z+1);group.add(campFire);
  addSurface(new THREE.SphereGeometry(.2,8,6),new THREE.MeshBasicMaterial({color:'#df9851'}),'faction-camp-fire',[factionCamp.x,.65,factionCamp.z+1]);

  const soulStoneMaterial = new THREE.MeshStandardMaterial({ color: '#9af0dd', emissive: '#57d9ba', emissiveIntensity: .9, roughness: .28, metalness: .1 });
  const soulStoneRingMaterial = new THREE.MeshStandardMaterial({ color: '#dffaf3', emissive: '#65d9bb', emissiveIntensity: .7, roughness: .45, metalness: .12 });
  const createYoungIslander = (x, z, yaw = 0, appearance = {}) => {
    const figure = new THREE.Group();
    figure.position.set(x, 0, z);
    figure.rotation.y = yaw;

    const skin = new THREE.MeshStandardMaterial({ color: appearance.skin || '#caa07c', roughness: .88 });
    const cloth = new THREE.MeshStandardMaterial({ color: appearance.cloth || '#314c3e', roughness: .96 });
    const trim = new THREE.MeshStandardMaterial({ color: appearance.trim || '#8a9b6d', roughness: .9 });
    const hide = new THREE.MeshStandardMaterial({ color: appearance.hide || '#4d3829', roughness: 1 });

    const torso = new THREE.Mesh(createRoundedBoxGeometry(THREE, .58, .72, .34, .085), cloth);
    torso.position.y = 1.4;
    figure.add(torso);
    const waist = new THREE.Mesh(createRoundedBoxGeometry(THREE, .44, .28, .30, .05), trim);
    waist.position.y = .98;
    figure.add(waist);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .14, 8), skin);
    neck.position.y = 1.86;
    figure.add(neck);
    const head = new THREE.Group();
    head.position.y = 2.12;
    figure.add(head);
    const headMesh = new THREE.Mesh(createRoundedBoxGeometry(THREE, .34, .38, .30, .045), skin);
    head.add(headMesh);
    const eyeWhite = new THREE.MeshStandardMaterial({ color: '#f5f0e3', roughness: .55 });
    const eyePupil = new THREE.MeshStandardMaterial({ color: '#302721', roughness: .5 });
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), eyeWhite);
      white.position.set(side * .071, .025, .148);
      head.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(.011, 8, 6), eyePupil);
      pupil.position.set(side * .071, .025, .158);
      head.add(pupil);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), skin);
      ear.position.set(side * .16, -.005, -.01);
      ear.scale.set(.68, 1.1, .8);
      head.add(ear);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.032, 8, 6), skin);
    nose.position.set(0, -.025, .179);
    nose.scale.set(.78, 1.15, 1.6);
    head.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(.055, .008, .009), eyePupil);
    mouth.position.set(0, -.065, .147);
    head.add(mouth);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(.195, 14, 10), new THREE.MeshStandardMaterial({ color: appearance.isMother ? '#30251f' : '#211c1a', roughness: .94 }));
    hair.position.set(0, .25, -.015);
    hair.scale.set(1, .55, 1);
    head.add(hair);

    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * .32, 1.63, 0);
      figure.add(shoulder);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .15, 3, 7), cloth);
      sleeve.position.y = -.08;
      shoulder.add(sleeve);
      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(.067, .2, 3, 7), skin);
      upperArm.position.set(0, -.25, .005);
      shoulder.add(upperArm);
      const elbow = new THREE.Group();
      elbow.position.y = -.36;
      shoulder.add(elbow);
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .21, 3, 7), skin);
      forearm.position.set(0, -.13, .01);
      elbow.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.063, 8, 6), skin);
      hand.position.set(0, -.29, .02);
      hand.scale.set(.9, .85, .8);
      elbow.add(hand);
    }
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * .115, .84, 0);
      figure.add(hip);
      const thigh = new THREE.Mesh(createRoundedBoxGeometry(THREE, .19, .47, .18, .04), hide);
      thigh.position.y = -.25;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -.49;
      hip.add(knee);
      const shin = new THREE.Mesh(createRoundedBoxGeometry(THREE, .16, .41, .16, .035), hide);
      shin.position.y = -.24;
      knee.add(shin);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(.095, 10, 8), skin);
      foot.position.set(0, -.46, .06);
      foot.scale.set(1, .62, 1.45);
      knee.add(foot);
    }

    if (appearance.isMother) {
      const braid = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .42, 5, 8), hair.material);
      braid.position.set(0, 2.03, -.27);
      braid.rotation.x = -.25;
      figure.add(braid);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.34, .48, .62, 8), hide);
      skirt.position.y = .56;
      figure.add(skirt);
      const sash = new THREE.Mesh(new THREE.BoxGeometry(.72, .12, .42), trim);
      sash.position.set(0, .83, 0);
      figure.add(sash);
    }

    const amulet = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.OctahedronGeometry(.14, 1), soulStoneMaterial);
    stone.position.y = .42;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 8, 18), soulStoneRingMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = .42;
    const glow = new THREE.PointLight('#69e7d0', .8, 5, 2);
    glow.position.set(0, .42, 0);
    amulet.add(stone, halo, glow);
    amulet.position.set(0, 1.2, .29);
    figure.add(amulet);

    const backWrap = new THREE.Mesh(new THREE.BoxGeometry(.46, .82, .14), trim);
    backWrap.position.set(0, 1.12, -.3);
    backWrap.rotation.x = .12;
    figure.add(backWrap);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.48, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .2 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .03;
    figure.add(shadow);

    figure.userData.storyRole = 'islander-soul-keeper';
    figure.userData.visualName = appearance.isMother ? 'Madre de Kaelen' : 'Joven de la choza';
    return figure;
  };

  const youngCampGuardian = createYoungIslander(factionCamp.x + 1.25, factionCamp.z - 6.8, -Math.PI / 2);
  youngCampGuardian.position.y = 0.1;
  group.add(youngCampGuardian);
  const campMother = createYoungIslander(factionCamp.x - 1.25, factionCamp.z - 6.8, 0, {
    skin: '#b8825f', cloth: '#674b35', trim: '#ad8b54', hide: '#45372d', isMother: true
  });
  campMother.position.y = 0.1;
  campMother.userData.storyRole = 'kaelen-mother';
  group.add(campMother);

  const campWanderers = [];
  const addCampWanderer = (x, z, phase, clothColor) => {
    const figure = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: clothColor, roughness: .94 });
    const skin = new THREE.MeshStandardMaterial({ color: '#b98769', roughness: .92 });
    const hide = new THREE.MeshStandardMaterial({ color: '#49392e', roughness: .98 });
    const hair = new THREE.MeshStandardMaterial({ color: '#302822', roughness: .96 });
    const addPart = (geometry, material, position, parent = figure) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    addPart(new THREE.CapsuleGeometry(.25, .56, 4, 8), cloth, [0, 1.02, 0]);
    addPart(new THREE.BoxGeometry(.43, .12, .34), campHide, [0, .72, 0]);
    addPart(new THREE.SphereGeometry(.2, 12, 10), skin, [0, 1.55, 0]);
    addPart(new THREE.SphereGeometry(.205, 10, 8), hair, [0, 1.65, -.025]).scale.set(1, .48, 1);
    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    leftArm.position.set(-.29, 1.25, 0);
    rightArm.position.set(.29, 1.25, 0);
    addPart(new THREE.CapsuleGeometry(.07, .34, 3, 6), skin, [0, -.17, 0], leftArm);
    addPart(new THREE.CapsuleGeometry(.07, .34, 3, 6), skin, [0, -.17, 0], rightArm);
    figure.add(leftArm, rightArm);
    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    leftLeg.position.set(-.12, .58, 0);
    rightLeg.position.set(.12, .58, 0);
    addPart(new THREE.CapsuleGeometry(.085, .34, 3, 6), hide, [0, -.22, 0], leftLeg);
    addPart(new THREE.CapsuleGeometry(.085, .34, 3, 6), hide, [0, -.22, 0], rightLeg);
    figure.add(leftLeg, rightLeg);
    figure.position.set(x, 0, z);
    figure.userData.storyRole = 'tribal-camp-wanderer';
    group.add(figure);
    campWanderers.push({ figure, leftArm, rightArm, leftLeg, rightLeg, x, z, phase, pace: .46 + phase * .015 });
  };
  addCampWanderer(7, factionCamp.z + 12, .4, '#58724a');
  addCampWanderer(18, factionCamp.z + 11.7, 1.8, '#73543a');
  addCampWanderer(29, factionCamp.z + 12, 3.2, '#536c65');

  const shrineBase = addSurface(new THREE.CylinderGeometry(2.2, 2.5, .22, 18), campStoneMaterial, 'faction-camp-soul-shrine-base', [factionCamp.x, .12, factionCamp.z - 6.1]);
  shrineBase.rotation.y = Math.PI / 2;
  const shrineRing = addSurface(new THREE.TorusGeometry(1.55, .08, 8, 22), soulStoneRingMaterial, 'faction-camp-soul-shrine-ring', [factionCamp.x, .28, factionCamp.z - 6.1], [Math.PI / 2, 0, 0]);
  shrineRing.scale.set(1.12, 1, 1.12);
  const shrineLight = new THREE.PointLight('#6fe9d5', 1.2, 8, 2);
  shrineLight.position.set(factionCamp.x, 1.2, factionCamp.z - 6.1);
  group.add(shrineLight);

  const gateMaterial = new THREE.MeshStandardMaterial({ color: '#68776a', roughness: .88, metalness: .08 });
  for (const x of [-3.1, 3.1]) {
    addSurface(new THREE.CylinderGeometry(.32, .42, 5.4, 8), gateMaterial, 'lament-forest-return-post', [x, 2.7, 21.5]);
    colliders.push({ x, z: 21.5, halfWidth: .48, halfDepth: .5, yaw: 0 });
  }
  const arch = addSurface(new THREE.TorusGeometry(3.1, .32, 8, 24, Math.PI), gateMaterial, 'lament-forest-return-arch', [0, 5.4, 21.5]);
  arch.rotation.z = Math.PI;
  const keystoneMaterial = new THREE.MeshStandardMaterial({ color: '#c5a46c', roughness: .55, metalness: .22, emissive: '#8a6733', emissiveIntensity: .2 });
  addSurface(new THREE.BoxGeometry(1.1, .75, .16), keystoneMaterial, 'lament-forest-return-keystone', [0, 5.45, 21.35]);
  const gateGlow = new THREE.PointLight('#e3c58c', 1.4, 15, 2);
  gateGlow.position.set(0, 3.5, 20.5);
  group.add(gateGlow);

  group.add(new THREE.AmbientLight('#b6c3ad', .95));
  const moon = new THREE.DirectionalLight('#d0dec4', .7);
  moon.position.set(-24, 34, 18);
  const warm = new THREE.DirectionalLight('#e2c496', .46);
  warm.position.set(18, 16, -36);
  group.add(moon, warm);
  for (let index = 0; index < 14; index++) {
    const x = Math.sin(index * 9.7) * 58;
    const z = 6 - (index % 7) * 13.2;
    const light = new THREE.PointLight(index % 2 ? '#d6c68c' : '#9ebc9a', .7, 11, 2);
    light.position.set(x, 1.2 + (index % 3) * .6, z);
    group.add(light);
    const mote = new THREE.Mesh(new THREE.SphereGeometry(.07, 7, 6), new THREE.MeshBasicMaterial({ color: index % 2 ? '#f4d99a' : '#c1e2b7', toneMapped: false }));
    mote.position.copy(light.position);
    group.add(mote);
    fireflies.push({ light, mote, phase: index * 1.83, baseY: light.position.y });
  }

  const birdBodyMaterial = new THREE.MeshStandardMaterial({ color: '#2b2726', roughness: .9 });
  const birdWingMaterial = new THREE.MeshStandardMaterial({ color: '#534b3c', roughness: .95, side: THREE.DoubleSide });
  for (let index = 0; index < 6; index++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(.13, 7, 6), birdBodyMaterial);
    body.scale.set(1.5, .7, .7);
    bird.add(body);
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(.35, .35, .72, .02); wingShape.quadraticCurveTo(.32, .11, 0, 0);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), birdWingMaterial);
      wing.position.z = side * .08;
      wing.scale.z = side;
      bird.add(wing);
    }
    bird.position.set(-24 + index * 9, 8 + (index % 3) * 2, -18 - (index % 4) * 15);
    group.add(bird);
    wildlife.push({ bird, phase: index * 1.1, originX: bird.position.x, originY: bird.position.y, originZ: bird.position.z, wings: bird.children.slice(1) });
  }

  const colliderCellSize=8,colliderGrid=new Map();
  colliders.forEach((collider,index)=>{
    const extent=Math.hypot(collider.halfWidth,collider.halfDepth),minX=Math.floor((collider.x-extent)/colliderCellSize),maxX=Math.floor((collider.x+extent)/colliderCellSize),minZ=Math.floor((collider.z-extent)/colliderCellSize),maxZ=Math.floor((collider.z+extent)/colliderCellSize);
    for(let cellX=minX;cellX<=maxX;cellX++)for(let cellZ=minZ;cellZ<=maxZ;cellZ++){const key=cellX+':'+cellZ;let entries=colliderGrid.get(key);if(!entries){entries=[];colliderGrid.set(key,entries);}entries.push(index);}
  });
  const collidersNear=(x,z,margin=.5)=>{
    const minX=Math.floor((x-margin)/colliderCellSize),maxX=Math.floor((x+margin)/colliderCellSize),minZ=Math.floor((z-margin)/colliderCellSize),maxZ=Math.floor((z+margin)/colliderCellSize),indices=new Set();
    for(let cellX=minX;cellX<=maxX;cellX++)for(let cellZ=minZ;cellZ<=maxZ;cellZ++)for(const index of colliderGrid.get(cellX+':'+cellZ)||[])indices.add(index);
    return [...indices].map(index=>colliders[index]);
  };

  group.visible = false;
  return {
    group,
    homeRoof,
    dwellingRoofs,
    colliders,
    collidersNear,
    walkSurfaces,
    campCharacters: [
      { id: 'young_soul_keeper', name: 'Joven de la choza', x: factionCamp.x + 1.25, y: 0.1, z: factionCamp.z - 6.8, description: 'Sin armas; porta la Piedra del Alma como símbolo de memoria y vínculo con la isla.', object: youngCampGuardian },
      { id: 'kaelen_mother', name: 'Madre de Kaelen', x: factionCamp.x - 1.25, y: 0.1, z: factionCamp.z - 6.8, description: 'Espera a Kaelen dentro de la choza familiar.', object: campMother }
    ],
    fog: new THREE.FogExp2('#b8d9d8', .00155),
    entry: { x: 16.8, y: 0, z: -19.5 },
    returnTrigger: { x: 0, z: 24, radius: 5 },
    camps:[{...factionCamp, entrance:{x:factionCamp.x,z:campBottom+2}, bounds:{left:campLeft,right:campRight,top:campTop,bottom:campBottom}}],
    settlement,
    map: { width: 168, depth: 126, centerX: 0, centerZ: -36, trails: [trailPoints], gate: { x: 0, z: 21.5 } },
    update(delta, time, playerPosition) {
      dwellingRoofs.forEach(({ roof, x, z }) => {
        roof.visible = !playerPosition || Math.hypot(playerPosition.x - x, playerPosition.z - z) > 5.2;
      });
      fireflies.forEach(item => {
        item.light.position.y = item.baseY + Math.sin(time * 1.6 + item.phase) * .34;
        item.mote.position.copy(item.light.position);
        item.light.intensity = .45 + Math.sin(time * 2.1 + item.phase) * .2;
      });
      wildlife.forEach(item => {
        const flight = time * .8 + item.phase;
        item.bird.position.x = item.originX + Math.sin(flight) * 3.8;
        item.bird.position.y = item.originY + Math.sin(flight * 2.1) * .7;
        item.bird.position.z = item.originZ + Math.cos(flight * .8) * 2.2;
        const flap = Math.sin(time * 14 + item.phase) * .36;
        item.wings[0].rotation.y = flap;
        item.wings[1].rotation.y = -flap;
      });
      banner.rotation.z=Math.sin(time*1.4)*.045;
      campFire.intensity=1.05+Math.sin(time*8)*.2;
      campWanderers.forEach(wanderer => {
        const walk = time * wanderer.pace + wanderer.phase;
        wanderer.figure.position.x = wanderer.x + Math.sin(walk) * (wanderer.x === 18 ? 1.1 : 2.1);
        wanderer.figure.position.z = wanderer.z + Math.sin(walk * 2) * .42;
        wanderer.figure.rotation.y = Math.atan2(Math.cos(walk), 2 * Math.cos(walk * 2));
        const stride = Math.sin(walk * 5) * .32;
        wanderer.leftLeg.rotation.x = stride;
        wanderer.rightLeg.rotation.x = -stride;
        wanderer.leftArm.rotation.x = -stride * .72;
        wanderer.rightArm.rotation.x = stride * .72;
        wanderer.figure.position.y = Math.max(0, Math.cos(walk * 10)) * .025;
      });
    }
  };
}
