import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ====== Basis Scene Setup ======
const trunkHeight = 8;
const trunkRadiusTop = 0.8;
const trunkRadiusBottom = 1.0;

// DOM-elementen
const canvas = document.querySelector('#three-canvas');
const editImgUpload = document.getElementById('edit-card-img-upload');
const removeImgBtn = document.getElementById('remove-card-img-btn');
const editPopup = document.getElementById('card-edit-popup');
const editForm = document.getElementById('card-edit-form');
const editText = document.getElementById('edit-card-text');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const deleteBtn = document.getElementById('delete-card-btn');
const typePopup = document.getElementById('card-type-popup');
const typeBtns = typePopup.querySelectorAll('.type-btn');

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x000000, 0);

// Scene en camera
const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI / 2.01;
controls.zoomSpeed = 0.15;

// Licht
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x555555, 0.6));
scene.fog = new THREE.Fog(0x044a01, 10, 200);

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
    const hemiGeo = new THREE.SphereGeometry(radius, segments, segments / 2, 0, Math.PI * 2, 0, Math.PI / 2);
    const hemiMat = new THREE.MeshPhongMaterial({ color: 0x004d00, side: THREE.DoubleSide });
    const hemisphere = new THREE.Mesh(hemiGeo, hemiMat);
    hemisphere.castShadow = hemisphere.receiveShadow = true;
    hemisphere.userData.surface = 'canopy';
    hemisphere.position.set(0, trunkHeight, 0);
    scene.add(hemisphere);
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
ground.userData.surface = 'ground';
scene.add(ground);

// Responsief
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// State
let pending3DCard = null;
let draggingMesh = null;
let meshBeingEdited = null;
const dragPlane = new THREE.Plane();
const dragOffset = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Kaarttype-popup
const addCardBtn = document.getElementById('add-card-btn');
addCardBtn.addEventListener('click', () => typePopup.style.display = 'flex');
typeBtns.forEach(btn => btn.addEventListener('click', () => {
    typePopup.style.display = 'none';
    pending3DCard = { text: '', icon: btn.dataset.icon, color: btn.dataset.color };
}));
typePopup.addEventListener('click', e => { if (e.target === typePopup) typePopup.style.display = 'none'; });

// Dynamic texture generator
async function makeCardTexture({ text, icon, color, imgData, width = 256 }) {
    const padding = 12;
    const iconSize = 24;
    const lineHeight = 20;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${iconSize}px Quicksand`;
    const lines = wrapText(tempCtx, text, width - 2 * padding);
    const textBlockHeight = iconSize + lines.length * lineHeight;
    let imgHeight = 0;
    if (imgData) {
        const img = new Image();
        await new Promise(resolve => { img.onload = resolve; img.src = imgData; });
        imgHeight = (width - 2 * padding) / (img.width / img.height);
    }
    const canvas2D = document.createElement('canvas');
    const height = padding + textBlockHeight + (imgData ? imgHeight + padding : padding);
    canvas2D.width = width;
    canvas2D.height = height;
    const ctx = canvas2D.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${iconSize}px Quicksand`;
    ctx.fillStyle = getComputedTextColor(color);
    ctx.fillText(icon, padding, padding + iconSize);
    ctx.font = `16px Quicksand`;
    ctx.fillStyle = getComputedTextColor(color);
    lines.forEach((line, i) => ctx.fillText(line, padding, padding + iconSize + (i + 1) * lineHeight));
    if (imgData) {
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
            const imgW = width - 2 * padding;
            const imgH = imgW / (img.width / img.height);
            ctx.drawImage(img, padding, padding + textBlockHeight + padding, imgW, imgH);
            texture.needsUpdate = true;
        };
    }
    const texture = new THREE.CanvasTexture(canvas2D);
    texture.needsUpdate = true;
    return texture;
}

// Helpers
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach(word => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = word;
        } else line = test;
    });
    if (line) lines.push(line);
    return lines;
}

function getComputedTextColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
    const [r, g, b] = [hex.substr(0, 2), hex.substr(2, 2), hex.substr(4, 2)].map(h => parseInt(h, 16));
    return ((r * 299 + g * 587 + b * 114) / 1000) < 160 ? '#fffbea' : '#333';
}

function makeCardMesh(texture, backColor, w = 1.5, h = 0.8) {
    const geo = new THREE.PlaneGeometry(w, h);
    const matFront = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide });
    const matBack = new THREE.MeshBasicMaterial({ color: backColor, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, matFront);
    mesh.add(new THREE.Mesh(geo, matBack));
    return mesh;
}

async function create3DCard({ position, normal, text, icon, color, imgData }) {
    // 1. Texture maken (zoals voorheen)
    const tex = await makeCardTexture({ text, icon, color, imgData, width: 256 });

    // 2. Bepaal display-breedte (world-units)
    const displayWidth = 1.5;
    let displayHeight;

    // 3. Wanneer er écht niets in staat behalve het icoon:
    if (!text && !imgData) {
        // vierkant houden, zodat het icoon niet vervormt
        displayHeight = displayWidth;

    } else if (imgData) {
        // jouw bestaande image-+text-logica:
        // - eerst de raw image laden om de aspect ratio te bepalen
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = imgData; });
        const imgAspect = img.width / img.height;
        const imageDisplayHeight = displayWidth / imgAspect;
        const textHeight = 0.6; // tunen naar jouw font-hoogte in world-units
        displayHeight = textHeight + imageDisplayHeight;

    } else {
        // alleen tekst (geen afbeelding): bepaal op basis van aantal regels
        // stel bijvoorbeeld een vaste text-blok hoogte in:
        displayHeight = 0.8;
    }

    // 4. Mesh aanmaken met de berekende verhouding
    const mesh = makeCardMesh(tex, color, displayWidth, displayHeight);

    // 5. Positioneren en toevoegen zoals voorheen
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.copy(position).add(normal.clone().multiplyScalar(0.01));
    mesh.lookAt(position.clone().add(normal));
    mesh.userData = { text, icon, color, imgData };
    scene.add(mesh);
}


// Pointer events
canvas.addEventListener('pointerdown', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    if (pending3DCard) {
        const hit = raycaster.intersectObjects(scene.children, true)
            .find(i => ['trunk', 'root', 'canopy', 'ground'].includes(i.object.userData.surface));
        if (!hit) return;
        create3DCard({ position: hit.point, normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld), ...pending3DCard });
        pending3DCard = null;
        return;
    }
    const hitDrag = raycaster.intersectObjects(scene.children, true)
        .find(i => typeof i.object.userData.text === 'string');
    if (hitDrag) {
        draggingMesh = hitDrag.object;
        dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), draggingMesh.position);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersect);
        dragOffset.copy(intersect).sub(draggingMesh.position);
    }
});
window.addEventListener('pointermove', e => {
    if (!draggingMesh) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, true)
        .find(i => ['trunk', 'root', 'canopy', 'ground'].includes(i.object.userData.surface));
    if (hit) {
        const norm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        const newPos = hit.point.clone().add(norm.multiplyScalar(0.01));
        draggingMesh.position.copy(newPos);
        if (Math.abs(norm.y) > 0.9) {
            draggingMesh.up.set(0, 1, 0);
            draggingMesh.lookAt(new THREE.Vector3(camera.position.x, newPos.y, camera.position.z));
        } else {
            draggingMesh.lookAt(newPos.clone().add(norm));
        }
    }
});
canvas.addEventListener('pointerup', () => draggingMesh = null);
canvas.addEventListener('dblclick', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hitEdit = raycaster.intersectObjects(scene.children, true)
        .find(i => typeof i.object.userData.text === 'string');
    if (!hitEdit) return;
    meshBeingEdited = hitEdit.object;
    editText.value = meshBeingEdited.userData.text;
    editImgUpload.value = '';
    removeImgBtn.style.display = meshBeingEdited.userData.imgData ? 'inline-block' : 'none';
    editPopup.style.display = 'flex';
});

// File to base64
function getUploadedImgData(file) {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
    });
}

// Edit handlers
editCancelBtn.addEventListener('click', () => { editPopup.style.display = 'none'; meshBeingEdited = null; });
editForm.addEventListener('submit', async event => {
    event.preventDefault();
    // Update tekst
    meshBeingEdited.userData.text = editText.value.trim();

    // Update plaatje als er een file is geselecteerd
    if (editImgUpload.files[0]) {
        meshBeingEdited.userData.imgData = await getUploadedImgData(editImgUpload.files[0]);
    }

    // Nieuwe texture genereren en toepassen
    const newTex = await makeCardTexture({
        text: meshBeingEdited.userData.text,
        icon: meshBeingEdited.userData.icon,
        color: meshBeingEdited.userData.color,
        imgData: meshBeingEdited.userData.imgData,
        width: 256
    });
    meshBeingEdited.material.map = newTex;
    meshBeingEdited.material.needsUpdate = true;

    // Popup sluiten
    editPopup.style.display = 'none';
    meshBeingEdited = null;
});


deleteBtn.addEventListener('click', () => {
    if (!meshBeingEdited) return;
    scene.remove(meshBeingEdited);
    meshBeingEdited = null;
    editPopup.style.display = 'none';
});

// Remove image btn
removeImgBtn.addEventListener('click', () => {
    if (!meshBeingEdited) return;
    meshBeingEdited.userData.imgData = null;
    editImgUpload.value = '';
    removeImgBtn.style.display = 'none';
});

// Animate loop
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
