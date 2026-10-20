const atlasPromises = new WeakMap();
const atlasRows = [
  [132, 223],
  [249, 342],
  [366, 459],
  [462, 555],
  [579, 674],
  [678, 773],
  [798, 889],
  [893, 982]
];

export function createRoundedBoxGeometry(THREE, width, height, depth, radius, segments = 3) {
  const geometry = new THREE.BoxGeometry(width, height, depth, segments, segments, segments);
  const position = geometry.attributes.position;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const bevel = Math.min(radius, halfWidth, halfHeight, halfDepth);

  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const innerX = THREE.MathUtils.clamp(x, -halfWidth + bevel, halfWidth - bevel);
    const innerY = THREE.MathUtils.clamp(y, -halfHeight + bevel, halfHeight - bevel);
    const innerZ = THREE.MathUtils.clamp(z, -halfDepth + bevel, halfDepth - bevel);
    const rounded = new THREE.Vector3(x - innerX, y - innerY, z - innerZ);
    if (rounded.lengthSq() === 0) continue;
    rounded.normalize().multiplyScalar(bevel);
    position.setXYZ(index, innerX + rounded.x, innerY + rounded.y, innerZ + rounded.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createAtlasTile(THREE, image, column, row, { face = false, hair = false, repeat = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const tileWidth = 100;
  const left = 112 + column * tileWidth + 10;
  const [rowTop, rowBottom] = atlasRows[row];
  const top = rowTop + 8;
  const width = 80;
  const height = rowBottom - rowTop - 16;
  const cropHeight = hair ? Math.floor(height * .68) : height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, left, top, width, cropHeight, 0, 0, canvas.width, canvas.height);

  if (face) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = pixels;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const nx = (x / canvas.width - .5) / .48;
        const ny = (y / canvas.height - .52) / .53;
        const edge = Math.sqrt(nx * nx + ny * ny);
        const alpha = Math.max(0, Math.min(1, (1.06 - edge) * 12));
        data[(y * canvas.width + x) * 4 + 3] *= alpha;
      }
    }
    context.putImageData(pixels, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.needsUpdate = true;
  return texture;
}

export function loadKaelenAtlasTextures(THREE) {
  if (atlasPromises.has(THREE)) return atlasPromises.get(THREE);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        face: createAtlasTile(THREE, image, 4, 0, { face: true }),
        skin: createAtlasTile(THREE, image, 0, 1),
        hair: createAtlasTile(THREE, image, 0, 2, { hair: true }),
        tunic: createAtlasTile(THREE, image, 0, 4, { repeat: [3, 3] }),
        loincloth: createAtlasTile(THREE, image, 0, 6, { repeat: [2, 2] })
      });
    };
    image.onerror = () => reject(new Error('No se pudo cargar img/pj1_tiles.jpeg.'));
    image.src = new URL('./img/pj1_tiles.jpeg', import.meta.url).href;
  });
  atlasPromises.set(THREE, promise);
  return promise;
}

export function applyKaelenAtlasToCharacter(THREE, root, textures, isKaelen, preserveTextureTint = false) {
  if (!root) return;
  root.traverse(object => {
    if (!object.isMesh) return;
    if (object.name === 'heroFaceDecal') {
      object.visible = false;
      return;
    }
    if (object.name === 'sculptedNose') object.visible = true;
  });
}
