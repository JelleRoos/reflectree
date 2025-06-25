import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ====== Basis Scene Setup ======
const trunkHeight = 8;
const trunkRadiusTop = 0.8;
const trunkRadiusBottom = 1.0;

const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);

// OrbitControls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI / 2.01;
// Removed zoom distance limits to allow free zooming
controls.zoomSpeed = 0.15;  // verlaag zoomsnelheid voor rustigere bediening


// Licht
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Stam
const trunkGeo = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 16);
trunkGeo.translate(0, trunkHeight / 2, 0);
const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4d2f14 });
const trunk = new THREE.Mesh(trunkGeo, trunkMat);
trunk.castShadow = trunk.receiveShadow = true;
trunk.userData.surface = 'trunk';
scene.add(trunk);

// Wortels
[0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(angle => {
    const length = 3.5;
    const geo = new THREE.CylinderGeometry(0.12, trunkRadiusBottom * 0.9, length, 8);
    geo.translate(0, length / 2, 0);
    const mesh = new THREE.Mesh(geo, trunkMat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.rotation.z = -Math.PI / 2;
    mesh.position.x = trunkRadiusBottom - 0.6;
    mesh.userData.surface = 'root';
    const group = new THREE.Group();
    group.add(mesh);
    group.rotation.y = angle;
    scene.add(group);
});

// Bladerbol (halve bol + sluitende kap)
{
    const radius = 5.5;
    const segments = 32;
    // Halve bol
    const hemiGeo = new THREE.SphereGeometry(
        radius, segments, segments / 2,
        0, Math.PI * 2,
        0, Math.PI / 2
    );
    const hemiMat = new THREE.MeshPhongMaterial({ color: 0x004d00, side: THREE.DoubleSide });
    const hemisphere = new THREE.Mesh(hemiGeo, hemiMat);
    hemisphere.castShadow = hemisphere.receiveShadow = true;
    hemisphere.userData.surface = 'canopy';
    hemisphere.position.set(0, trunkHeight, 0);
    scene.add(hemisphere);

    // Platte cirkel voor sluiting
    const capGeo = new THREE.CircleGeometry(radius, segments);
    const capMat = new THREE.MeshPhongMaterial({ color: 0x004d00, side: THREE.DoubleSide });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.castShadow = cap.receiveShadow = true;
    cap.userData.surface = 'canopy';
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0, trunkHeight, 0);
    scene.add(cap);
}

// Grondvlak
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshPhongMaterial({ color: 0x044a01, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
ground.userData.surface = 'ground';

// Fog & Hemisferisch licht
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x555555, 0.6));
scene.fog = new THREE.Fog(0x044a01, 10, 200);

// Responsief & animatie
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== Interactie =====
let pending3DCard = null;
let draggingMesh = null;
const dragPlane = new THREE.Plane();
const dragOffset = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const editPopup = document.getElementById('card-edit-popup');
const editForm = document.getElementById('card-edit-form');
const editText = document.getElementById('edit-card-text');
const editCancelBtn = document.getElementById('edit-cancel-btn');
let meshBeingEdited = null;

const typePopup = document.getElementById('card-type-popup');
const typeBtns = typePopup.querySelectorAll('.type-btn');
document.getElementById('add-card-btn').addEventListener('click', () => typePopup.style.display = 'flex');
typeBtns.forEach(btn => btn.addEventListener('click', () => {
    typePopup.style.display = 'none';
    pending3DCard = { text: 'Nieuwe kaart', icon: btn.dataset.icon, color: btn.dataset.color };
}));
typePopup.addEventListener('click', e => { if (e.target === typePopup) typePopup.style.display = 'none'; });

function makeCardTexture({ text, icon, color, width, height }) {
    const canvas2D = document.createElement('canvas');
    canvas2D.width = width;
    canvas2D.height = height;
    const ctx = canvas2D.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.font = '24px Quicksand';
    ctx.fillStyle = getComputedTextColor(color);
    ctx.fillText(icon, 12, 12);
    ctx.font = '16px Quicksand';
    wrapText(ctx, text, width - 24).forEach((line, i) => ctx.fillText(line, 12, 48 + i * 20));
    const tex = new THREE.CanvasTexture(canvas2D);
    tex.needsUpdate = true;
    return tex;
}
function makeCardMesh(texture, backColor, w = 1.5, h = 0.8) {
    const geo = new THREE.PlaneGeometry(w, h);
    const matFront = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide });
    const matBack = new THREE.MeshBasicMaterial({ color: backColor, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, matFront);
    mesh.add(new THREE.Mesh(geo, matBack));
    return mesh;
}
function getComputedTextColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const [r, g, b] = [hex.substr(0, 2), hex.substr(2, 2), hex.substr(4, 2)].map(h => parseInt(h, 16));
    return ((r * 299 + g * 587 + b * 114) / 1000) < 160 ? '#fffbea' : '#333';
}
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach(w => {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = w;
        } else line = test;
    });
    if (line) lines.push(line);
    return lines;
}

canvas.addEventListener('pointerdown', event => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    if (pending3DCard) {
        const hit = raycaster.intersectObjects(scene.children, true)
            .find(i => ['trunk', 'root', 'canopy', 'ground'].includes(i.object.userData.surface));
        if (!hit) return;
        create3DCard({
            position: hit.point,
            normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld),
            ...pending3DCard
        });
        pending3DCard = null;
        return;
    }

    const hitDrag = raycaster.intersectObjects(scene.children, true)
        .find(i => typeof i.object.userData.text === 'string');
    if (hitDrag) {
        draggingMesh = hitDrag.object;
        dragPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()).negate(),
            draggingMesh.position
        );
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersection);
        dragOffset.copy(intersection).sub(draggingMesh.position);
    }
});

window.addEventListener('pointermove', event => {
    if (!draggingMesh) return;
    // update pointer
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    // intersect only valid surfaces
    const hit = raycaster.intersectObjects(scene.children, true)
        .find(i => ['trunk', 'root', 'canopy', 'ground'].includes(i.object.userData.surface));
    if (hit) {
        // position slightly above surface
        const normWorld = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        const newPos = hit.point.clone().add(normWorld.multiplyScalar(0.01));
        draggingMesh.position.copy(newPos);
        // orient according to surface normal
        if (Math.abs(normWorld.y) > 0.9) {
            // ground-like surface: card upright
            draggingMesh.up.set(0, 1, 0);
            const target = new THREE.Vector3(camera.position.x, newPos.y, camera.position.z);
            draggingMesh.lookAt(target);
        } else {
            // tree surface: follow normal
            draggingMesh.lookAt(newPos.clone().add(normWorld));
        }
    }
});

canvas.addEventListener('pointerup', () => { draggingMesh = null; });

canvas.addEventListener('dblclick', event => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hitEdit = raycaster.intersectObjects(scene.children, true)
        .find(i => typeof i.object.userData.text === 'string');
    if (hitEdit) {
        meshBeingEdited = hitEdit.object;
        editText.value = meshBeingEdited.userData.text;
        editPopup.style.display = 'flex';
    }
});

editCancelBtn.addEventListener('click', () => { editPopup.style.display = 'none'; meshBeingEdited = null; });
editForm.addEventListener('submit', event => {
    event.preventDefault();
    const newText = editText.value.trim() || meshBeingEdited.userData.text;
    meshBeingEdited.userData.text = newText;
    const newTex = makeCardTexture({ text: newText, icon: meshBeingEdited.userData.icon, color: meshBeingEdited.userData.color, width: 256, height: 128 });
    meshBeingEdited.material.map = newTex;
    meshBeingEdited.material.needsUpdate = true;
    editPopup.style.display = 'none';
    meshBeingEdited = null;
});

function create3DCard({ position, normal, text, icon, color, width = 1.5, height = 0.8 }) {
    const tex = makeCardTexture({ text, icon, color, width: 256, height: 128 });
    const mesh = makeCardMesh(tex, color, width, height);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.copy(position).add(normal.clone().multiplyScalar(0.01));
    mesh.lookAt(position.clone().add(normal));
    mesh.userData = { text, icon, color };
    scene.add(mesh);
}

// Animatie loop
(function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
})();

// Expose globals
window.THREE = THREE;
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.create3DCard = create3DCard;
