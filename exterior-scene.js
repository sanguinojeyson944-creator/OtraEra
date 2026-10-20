export function createExteriorScene(THREE) {
  const group = new THREE.Group();
  group.name = 'otra-era-exterior';
  const colliders = [];
  const walkSurfaces = [];
  const addMesh = (geometry, material, name, position, scale = null, rotation = null) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#969789', roughness: 1 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#707874', roughness: .95 });
  const crackedConcrete = new THREE.MeshStandardMaterial({ color: '#626966', roughness: .98 });
  const rust = new THREE.MeshStandardMaterial({ color: '#765344', roughness: .87, metalness: .12 });
  const fadedPaint = new THREE.MeshStandardMaterial({ color: '#aa9e77', roughness: .94 });
  const weeds = ['#58634b', '#68704e', '#414f44'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  const ground = addMesh(new THREE.PlaneGeometry(130, 150), groundMaterial, 'exterior-ground', [0, -.09, -42], null, [-Math.PI / 2, 0, 0]);
  ground.userData.walkSurface = 'stone';
  walkSurfaces.push(ground);
  const roadPoints = [
    new THREE.Vector3(0, .01, 26), new THREE.Vector3(-1, .01, 9), new THREE.Vector3(2, .01, -8),
    new THREE.Vector3(-5, .01, -25), new THREE.Vector3(-8, .01, -43), new THREE.Vector3(1, .01, -62),
    new THREE.Vector3(4, .01, -88), new THREE.Vector3(0, .01, -111)
  ];
  const roadCurve = new THREE.CatmullRomCurve3(roadPoints, false, 'centripetal', .36);
  const road = addMesh(new THREE.TubeGeometry(roadCurve, 150, 3.8, 10, false), concrete, 'exterior-road', [0, 0, 0]);
  road.userData.walkSurface = 'stone';
  walkSurfaces.push(road);
  const roadEdge = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.3, .015, -33), new THREE.Vector3(18, .015, -38),
    new THREE.Vector3(27, .015, -54), new THREE.Vector3(24, .015, -70)
  ]);
  addMesh(new THREE.TubeGeometry(roadEdge, 60, 1.5, 8, false), crackedConcrete, 'exterior-collapsed-road-edge', [0, 0, 0]);

  for (let index = 0; index < 44; index++) {
    const x = Math.sin(index * 19.13) * 48;
    const z = 14 - (index % 22) * 6.2 + Math.cos(index * 3.7) * 2.5;
    if (Math.abs(x) < 6.2 && z > -86) continue;
    const weed = addMesh(new THREE.ConeGeometry(.22 + (index % 3) * .08, .5 + (index % 4) * .12, 5), weeds[index % weeds.length], 'exterior-coastal-growth', [x, .22, z]);
    weed.rotation.z = Math.sin(index * 2.4) * .14;
  }

  const ruin = (x, z, width, height, depth, yaw = 0) => {
    addMesh(new THREE.BoxGeometry(width, height, depth), crackedConcrete, 'exterior-building-remnant', [x, height / 2, z], null, [0, yaw, Math.sin(z) * .025]);
    colliders.push({ x, z, halfWidth: width * .54, halfDepth: depth * .54, yaw });
  };
  ruin(-19, -38, 15, 4.1, 1.2, -.12);
  ruin(-25, -48, 1.2, 5.4, 14, -.12);
  ruin(20, -43, 17, 3.6, 1.1, .08);
  ruin(28, -54, 1.2, 4.6, 15, .08);
  ruin(-22, -68, 12, 2.3, 1, .16);
  for (let index = 0; index < 14; index++) {
    const x = Math.sin(index * 8.8) * 35;
    const z = -28 - (index % 7) * 10.5;
    if (Math.abs(x) < 7 && z > -76) continue;
    const slab = addMesh(new THREE.BoxGeometry(1.2 + (index % 3) * .9, .35, .8 + (index % 2) * .7), crackedConcrete, 'exterior-rubble', [x, .15, z], null, [0, index * .43, .08 * Math.sin(index)]);
    colliders.push({ x, z, halfWidth: slab.scale.x + .6, halfDepth: slab.scale.z + .5, yaw: 0 });
  }

  const signPole = addMesh(new THREE.CylinderGeometry(.045, .07, 2.5, 6), rust, 'evacuation-sign-pole', [-6.6, 1.2, -28]);
  signPole.rotation.z = -.09;
  const sign = addMesh(new THREE.BoxGeometry(1.65, .72, .08), fadedPaint, 'evacuation-sign', [-6.55, 2.15, -28], null, [0, .13, -.16]);
  const signMark = addMesh(new THREE.BoxGeometry(.94, .055, .015), rust, 'evacuation-sign-mark', [-6.55, 2.18, -27.94], null, [0, .13, -.16]);
  signMark.castShadow = false;
  colliders.push({ x: -6.6, z: -28, halfWidth: .25, halfDepth: .25, yaw: 0 });

  const bodyCloth = new THREE.MeshStandardMaterial({ color: '#39474a', roughness: .96 });
  const cityCoat = new THREE.MeshStandardMaterial({ color: '#706454', roughness: .92 });
  const skin = new THREE.MeshStandardMaterial({ color: '#9b806d', roughness: .94 });
  const makeStillPerson = (x, z, yaw, coat, scale = 1) => {
    const person = new THREE.Group();
    person.name = 'still-civilian-remains';
    person.position.set(x, .08, z);
    person.rotation.y = yaw;
    person.scale.setScalar(scale);
    group.add(person);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.15, .38, 3, 7), coat);
    torso.position.set(0, .19, 0);
    torso.rotation.z = Math.PI / 2;
    person.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.115, 10, 8), skin);
    head.position.set(.38, .2, .02);
    person.add(head);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.065, .3, 3, 6), bodyCloth);
      leg.position.set(-.28, .075, side * .1);
      leg.rotation.z = side * .16;
      person.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .24, 3, 6), coat);
      arm.position.set(.06, .23, side * .22);
      arm.rotation.z = side * -.7;
      person.add(arm);
    }
    person.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  };
  makeStillPerson(-3.8, -40, -.3, cityCoat, .94);
  makeStillPerson(5.4, -48, 2.7, bodyCloth, 1.04);
  makeStillPerson(-12.2, -56, .2, bodyCloth, .88);

  const companionNest = new THREE.Group();
  companionNest.name = 'coastal-nest';
  companionNest.position.set(-5, .08, -84);
  group.add(companionNest);
  const nestMaterial = new THREE.MeshStandardMaterial({ color: '#594a36', roughness: 1 });
  const eggMaterial = new THREE.MeshStandardMaterial({ color: '#c1a77c', roughness: .82, emissive: '#685034', emissiveIntensity: .12 });
  const nestRing = new THREE.Mesh(new THREE.TorusGeometry(.72, .14, 7, 18), nestMaterial);
  nestRing.rotation.x = Math.PI / 2;
  nestRing.position.y = .12;
  companionNest.add(nestRing);
  for (let index = 0; index < 8; index++) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(.025, .045, .9, 5), nestMaterial);
    twig.position.set(Math.sin(index * Math.PI / 4) * .42, .12, Math.cos(index * Math.PI / 4) * .42);
    twig.rotation.set(.15, index * Math.PI / 4, .16 * Math.cos(index));
    companionNest.add(twig);
  }
  const egg = new THREE.Mesh(new THREE.SphereGeometry(.38, 18, 14), eggMaterial);
  egg.name = 'unclaimed-drake-egg';
  egg.position.set(0, .46, 0);
  egg.scale.set(.78, 1.2, .78);
  companionNest.add(egg);
  const eggSeam = new THREE.Mesh(new THREE.TorusGeometry(.28, .018, 5, 16, Math.PI * 1.25), new THREE.MeshStandardMaterial({ color: '#6e5638', roughness: .92 }));
  eggSeam.position.set(.02, .5, .24);
  eggSeam.rotation.set(.5, .1, .38);
  companionNest.add(eggSeam);
  const nestGlow = new THREE.PointLight('#d3a668', .18, 3.5, 2);
  nestGlow.position.set(0, .8, 0);
  companionNest.add(nestGlow);

  const truck = new THREE.Group();
  truck.name = 'sealed-transport-vehicle';
  truck.position.set(10, 0, -75);
  truck.rotation.y = .12;
  group.add(truck);
  const vehicleBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.5, 2.6), rust);
  vehicleBody.position.y = 1.05;
  truck.add(vehicleBody);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.35, 2.45), concrete);
  cabin.position.set(-1.35, 2.25, 0);
  truck.add(cabin);
  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(.06, .82, 1.65), new THREE.MeshStandardMaterial({ color: '#303a3c', roughness: .42, metalness: .12 }));
  windscreen.position.set(-.48, 2.3, 0);
  truck.add(windscreen);
  for (const x of [-1.55, 1.55]) for (const z of [-1.38, 1.38]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .24, 12), new THREE.MeshStandardMaterial({ color: '#252727', roughness: 1 }));
    tire.rotation.x = Math.PI / 2;
    tire.position.set(x, .53, z);
    truck.add(tire);
  }
  const crateMaterial = new THREE.MeshStandardMaterial({ color: '#575d52', roughness: .88, metalness: .18 });
  const crateMark = new THREE.MeshStandardMaterial({ color: '#b7a16e', roughness: .7, metalness: .22 });
  for (let index = 0; index < 4; index++) {
    const x = 1.1 + (index % 2) * 1.18;
    const z = index < 2 ? -.58 : .58;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.05, .9, .95), crateMaterial);
    crate.name = 'sealed-unmarked-crate';
    crate.position.set(x, 2.25 + Math.floor(index / 2) * .92, z);
    truck.add(crate);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.07, .055, .05), crateMark);
    strap.position.copy(crate.position);
    strap.position.z += .49;
    truck.add(strap);
  }
  colliders.push({ x: 10, z: -75, halfWidth: 3.2, halfDepth: 2.1, yaw: .12 });
  const uniform = new THREE.MeshStandardMaterial({ color: '#4b554e', roughness: .9 });
  const vest = new THREE.MeshStandardMaterial({ color: '#74715f', roughness: .86 });
  const helmet = new THREE.MeshStandardMaterial({ color: '#39443e', roughness: .84, metalness: .08 });
  const visor = new THREE.MeshStandardMaterial({ color: '#202a2c', roughness: .4, metalness: .16 });
  [[7.2,-71.8,.3],[14.8,-72.8,2.7],[6.2,-77.3,-.4]].forEach(([x,z,yaw], index) => {
    const soldier = new THREE.Group();
    soldier.name = 'unidentified-military-personnel';
    soldier.position.set(x, 0, z);
    soldier.rotation.y = yaw;
    group.add(soldier);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.19, .47, 4, 8), uniform);
    torso.position.y = 1.05;
    soldier.add(torso);
    const chestRig = new THREE.Mesh(new THREE.BoxGeometry(.34, .27, .25), vest);
    chestRig.position.set(0, 1.16, .12);
    soldier.add(chestRig);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 9), skin);
    head.position.y = 1.63;
    soldier.add(head);
    const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * .56), helmet);
    helmetShell.position.y = 1.7;
    soldier.add(helmetShell);
    const eyeShield = new THREE.Mesh(new THREE.BoxGeometry(.24, .08, .025), visor);
    eyeShield.position.set(0, 1.64, .14);
    soldier.add(eyeShield);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .5, 3, 6), uniform);
      leg.position.set(side * .11, .39, 0);
      soldier.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .37, 3, 6), uniform);
      arm.position.set(side * .27, 1.02, .035);
      arm.rotation.z = side * -.13;
      soldier.add(arm);
    }
    soldier.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    colliders.push({ x, z, halfWidth: .42, halfDepth: .42, yaw });
  });

  const distantMist = new THREE.Mesh(new THREE.PlaneGeometry(105, 25), new THREE.MeshBasicMaterial({ color: '#a5a89a', transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide }));
  distantMist.position.set(0, 7, -105);
  group.add(distantMist);
  const keyLight = new THREE.DirectionalLight('#e6dfc8', .82);
  keyLight.position.set(-22, 28, 14);
  group.add(keyLight, new THREE.AmbientLight('#c9cbbd', .92));

  group.visible = false;
  return {
    group,
    colliders,
    walkSurfaces,
    fog: new THREE.FogExp2('#a0a397', .0027),
    entry: { x: 0, y: 0, z: 27 },
    returnTrigger: { x: 0, z: 31, radius: 8 },
    companionNest: { x: -5, z: -84, radius: 3.2, egg },
    map: { width: 108, depth: 142, centerX: 0, centerZ: -43, road: roadPoints },
    update(delta, time) {
      distantMist.material.opacity = .1 + Math.sin(time * .17) * .025;
      sign.rotation.z = -.16 + Math.sin(time * .7) * .025;
    }
  };
}
