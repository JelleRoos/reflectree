import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ================================
// Functie om tak + groene bol te maken
// ================================
function createBranch(
    length = 5,
    radiusTop = 0.15,
    radiusBottom = 0.2,
    radialSegments = 8,
    tiltX = (Math.random() * Math.PI / 4) - Math.PI / 8,
    tiltZ = (Math.random() * Math.PI / 4) - Math.PI / 8
) {
    const group = new THREE.Group();

    // Tak (cilinder)
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radialSegments);
    const mat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = length / 2;
    mesh.rotation.x = tiltX;
    mesh.rotation.z = tiltZ;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);

    // Groene bol op uiteinde tak
    const sphGeo = new THREE.SphereGeometry(radiusTop * 1.5, 8, 8);
    const sphMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const sph = new THREE.Mesh(sphGeo, sphMat);
    sph.position.y = length;
    sph.castShadow = sph.receiveShadow = true;
    group.add(sph);

    return group;
}

// ================================
// Basis Three.js setup
// ================================
const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0f7fa);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 5, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ================================
// Boom-groep
// ================================
const tree = new THREE.Group();
scene.add(tree);

// ================================
// Grondvlak
// ================================
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.MeshPhongMaterial({ color: 0x88cc55, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ================================
// Lichten
// ================================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// ================================
// Boomstam
// ================================
(function createTrunk() {
    const geo = new THREE.CylinderGeometry(0.5, 0.4, 3, 12);
    const mat = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });
    const trunk = new THREE.Mesh(geo, mat);
    trunk.position.y = 1.5;
    trunk.castShadow = trunk.receiveShadow = true;
    tree.add(trunk);
})();

// ================================
// Grote bladerbol bovenop stam
// ================================
(function createCanopy() {
    const canopyGeo = new THREE.SphereGeometry(1, 16, 16);
    const canopyMat = new THREE.MeshPhongMaterial({ color: 0x00aa00 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 3.5, 0);
    canopy.castShadow = canopy.receiveShadow = true;
    tree.add(canopy);
})();

// ================================
// Wortels (4 stuks)
// ================================
const rootAngles = [Math.PI / 4, (3 * Math.PI) / 4, -(3 * Math.PI) / 4, -Math.PI / 4];
rootAngles.forEach(angle => {
    const root = createBranch(2, 0.1, 0.3, 6, -Math.PI / 4, 0);
    root.position.y = 0.2;
    root.position.x = Math.sin(angle) * 0.4;
    root.position.z = Math.cos(angle) * 0.4;
    tree.add(root);
});

// ================================
// Takken (3 stuks) met vaste hoeken
// ================================
[
    { x: Math.PI / 6, z: -Math.PI / 8 },
    { x: -Math.PI / 8, z: Math.PI / 5 },
    { x: Math.PI / 10, z: Math.PI / 10 }
].forEach((angles, i, arr) => {
    const branch = createBranch(4, 0.15, 0.2, 8, angles.x, angles.z);
    // rotatie rondom stam
    branch.rotation.y = (i / arr.length) * Math.PI * 2;
    // positie op top van stam
    branch.position.y = 3;
    // horizontale offset zodat tak uit stam komt
    branch.position.x = Math.sin(branch.rotation.y) * 0.4;
    branch.position.z = Math.cos(branch.rotation.y) * 0.4;
    tree.add(branch);
});

// ================================
// Kaart-sprites & Drag-and-Drop
// ================================
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

function createCardSprite(text) {
    const w = 256, h = 128;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000'; ctx.font = '20px Arial';
    wrapText(ctx, text, 10, 30, w - 20, 24);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 1, 1);
    sprite.castShadow = sprite.receiveShadow = true;
    return sprite;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dropPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

document.querySelectorAll('.toolbox-item').forEach(item => {
    item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', e.target.innerText);
    });
});

renderer.domElement.addEventListener('dragover', e => e.preventDefault());
renderer.domElement.addEventListener('drop', e => {
    e.preventDefault();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const pt = new THREE.Vector3();
    raycaster.ray.intersectPlane(dropPlane, pt);
    const text = e.dataTransfer.getData('text/plain');
    const sprite = createCardSprite(text);
    sprite.position.copy(pt);
    scene.add(sprite);
});

// ================================
// Responsieve canvas
// ================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================================
// Animatie loop
// ================================
(function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
})();
