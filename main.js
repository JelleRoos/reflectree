import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ====== Basis Scene Setup ======
const trunkHeight = 8;
const trunkRadiusTop = 0.8;
const trunkRadiusBottom = 1.0;
const popAnimations = [];
const glowAnimations = [];

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
camera.position.set(5, 12, 18);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI / 2.01;
controls.zoomSpeed = 0.15;

controls.target.set(0, trunkHeight / 2, 0);
controls.update();

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


// 🍃 BOMERIGE BLADERKROON MET GESLOTEN ONDERKANT 🍃
{
    const canopyColor = 0x004d00;
    const canopyMat = new THREE.MeshPhongMaterial({
        color: canopyColor,
        side: THREE.DoubleSide,
        shininess: 60
    });

    // Lagen van groot naar klein: radius en verticale offset
    const layers = [
        { radius: 6.0, offsetY: trunkHeight },       // onderste grote bol
        { radius: 4.2, offsetY: trunkHeight + 2 },   // middelste bol
        { radius: 3.0, offsetY: trunkHeight + 4 }    // bovenste kleine bol
    ];

    layers.forEach(({ radius, offsetY }) => {
        // 1) Halve bol
        const hemiGeo = new THREE.SphereGeometry(
            radius, 32, 16,
            0, Math.PI * 2,
            0, Math.PI / 2
        );
        hemiGeo.translate(0, offsetY, 0);
        const hemiMesh = new THREE.Mesh(hemiGeo, canopyMat);
        hemiMesh.castShadow = hemiMesh.receiveShadow = true;
        hemiMesh.userData.surface = 'canopy';

        // 2) Cap om de onderkant te dichten
        const capGeo = new THREE.CircleGeometry(radius, 32);
        capGeo.rotateX(-Math.PI / 2);
        capGeo.translate(0, offsetY, 0);
        const capMesh = new THREE.Mesh(capGeo, canopyMat);
        capMesh.castShadow = capMesh.receiveShadow = true;
        capMesh.userData.surface = 'canopy';

        // 3) Voeg beide toe
        scene.add(hemiMesh);
        scene.add(capMesh);
    });
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

// === RIVIER: LANGE S-BOCHT VER VOOR DE BOOM LANGS, VAN LINKS NAAR RECHTS ===

// 1. Groot rivierpad tekenen: alle punten ver buiten (0,0)
//    y-waarden < -8 = altijd vóór de boom (boom staat op y = 0)
const riverShape = new THREE.Shape();
riverShape.moveTo(-60, -35); // ver buiten beeld links onderaan

// Eerste bocht naar voren (nog steeds ver onder de boom)
riverShape.bezierCurveTo(-400, -32, -25, -24, -15, -16);

// Grote S-bocht (helemaal vóór de boom)
riverShape.bezierCurveTo(-5, -12, 5, -12, 15, -17);

// Bocht naar rechts ver buiten beeld
riverShape.bezierCurveTo(35, -22, 500, -28, 60, -30); // ver buiten beeld rechts

// 2. Maak een vlak van de shape
const riverSettings = { depth: 0.11, bevelEnabled: false, steps: 1 };
const riverGeometry = new THREE.ExtrudeGeometry(riverShape, riverSettings);

// 3. Breder maken in y-richting (= breedte rivier), plat maken
riverGeometry.scale(1, 0.27, 0.11);  // y bepaalt breedte, z dikte
riverGeometry.rotateX(-Math.PI / 2); // vlak leggen
riverGeometry.translate(0, 0.04, 0); // net boven het gras

// 4. Materiaal: lichtblauw, glans, doorschijnend
const riverMaterial = new THREE.MeshPhongMaterial({
    color: 0x67cbfa,
    shininess: 130,
    transparent: true,
    opacity: 0.81
});

// 5. Mesh aanmaken en toevoegen aan de scene
const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
riverMesh.position.y = 0.07; // een fractie boven de grond, waarde kun je finetunen (0.03–0.10)
riverMesh.userData.surface = 'rivier';
riverMesh.receiveShadow = true;
scene.add(riverMesh);




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

async function makeCardTexture({ text, icon, color, imgData, width = 256 }) {
    // ─── 1) ICON-ONLY CASE: géén tekst, géén afbeelding ───
    if (!text && !imgData) {
        const SIZE = width;
        const canvas2D = document.createElement('canvas');
        canvas2D.width = SIZE;
        canvas2D.height = SIZE;
        const ctx = canvas2D.getContext('2d');

        // achtergrond
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // groot icoon (bijv. 60% van de kaart)
        const fontSize = SIZE * 0.6;
        ctx.font = `${fontSize}px Quicksand`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = getComputedTextColor(color);
        ctx.fillText(icon, SIZE / 2, SIZE / 2);

        const texture = new THREE.CanvasTexture(canvas2D);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }

    // ─── 2) GENERAL CASE: wél tekst en/of afbeelding ───
    const padding = 12;
    const iconSize = 24;

    // 2a) Tekst meten
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${iconSize}px Quicksand`;
    const lines = wrapText(tempCtx, text, width - 2 * padding);
    const numLines = Math.max(lines.length, 1);

    // 2b) Hoogte berekenen
    const textBlockHeight = iconSize + numLines * iconSize * 1.2;
    let imgHeight = 0;
    if (imgData) {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = imgData; });
        imgHeight = (width - 2 * padding) / (img.width / img.height);
    }
    const height = padding + textBlockHeight + (imgData ? imgHeight + padding : padding);

    // 2c) High-DPI canvas
    const DPR = window.devicePixelRatio || 1;
    const canvas2D = document.createElement('canvas');
    canvas2D.width = width * DPR;
    canvas2D.height = height * DPR;
    const ctx = canvas2D.getContext('2d');
    ctx.scale(DPR, DPR);

    // 2d) Achtergrond
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // **LET OP: géén icoon tekenen!**

    // 2e) Tekstregels tekenen
    // 2e) Tekstregels gecentreerd, bovenaan beginnen
    ctx.font = `${iconSize}px Quicksand`;
    ctx.fillStyle = getComputedTextColor(color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const x = width / 2;
    const lineHeight = iconSize * 1.2;

    lines.forEach((line, i) => {
        ctx.fillText(
            line,
            x,
            padding + i * lineHeight
        );
    });


    // 2f) Afbeelding tekenen (optioneel)
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

    // 2g) Texture aanmaken
    const texture = new THREE.CanvasTexture(canvas2D);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
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

async function create3DCard({ position, normal, text, icon, color, imgData, surface }) {
    // ─── 1. Texture maken ───
    const tex = await makeCardTexture({ text, icon, color, imgData, width: 256 });

    // ─── 2. Breedte/hoogte bepalen ───
    const displayWidth = 1.5;
    let displayHeight;
    if (!text && !imgData) {
        displayHeight = displayWidth;
    } else if (imgData) {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = imgData; });
        const aspect = img.width / img.height;
        displayHeight = 0.6 + (displayWidth / aspect);
    } else {
        displayHeight = 0.8;
    }

    // ─── 3. Mesh maken ───
    const mesh = makeCardMesh(tex, color, displayWidth, displayHeight);
    mesh.castShadow = mesh.receiveShadow = true;

    // ─── 4. Positioneren en oriënteren ───
    mesh.position.copy(position).add(normal.clone().multiplyScalar(0.01));
    if (surface === 'ground' || surface === 'rivier') {
        mesh.rotation.set(0, 0, 0);
        mesh.position.y += 0.2;
        // Billboard naar camera
        const target = new THREE.Vector3(
            camera.position.x,
            mesh.position.y,
            camera.position.z
        );
        mesh.lookAt(target);
    } else {
        mesh.lookAt(position.clone().add(normal));
    }

    // ─── 5. Data opslaan ───
    mesh.userData = { text, icon, color, imgData };

    // ─── 6. Pop-in animatie initialiseren ───
    mesh.scale.set(0.001, 0.001, 0.001);
    mesh.userData.popStart = performance.now();
    popAnimations.push(mesh);

    // ─── 7. Mesh toevoegen ───
    scene.add(mesh);

    // ─── 8. Glow-outline toevoegen ───
    const glowGeo = new THREE.RingGeometry(displayWidth * 0.6, displayWidth * 1.1, 32);
    const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.copy(mesh.position);
    glowMesh.lookAt(camera.position);
    glowMesh.userData.glowStart = performance.now();
    glowAnimations.push(glowMesh);
    scene.add(glowMesh);

}





// Pointer events
canvas.addEventListener('pointerdown', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    if (pending3DCard) {
        const hit = raycaster.intersectObjects(scene.children, true)
            .find(i => ['trunk', 'root', 'canopy', 'ground', 'rivier']
                .includes(i.object.userData.surface));
        if (!hit) return;

        create3DCard({
            position: hit.point,
            normal: hit.face.normal.clone()
                .transformDirection(hit.object.matrixWorld),
            surface: hit.object.userData.surface,  // ← meegeven
            ...pending3DCard
        });
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

    // update pointer en raycaster
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // raycast tegen oppervlakken
    const hit = raycaster.intersectObjects(scene.children, true)
        .find(i => ['trunk', 'root', 'canopy', 'ground', 'rivier']
            .includes(i.object.userData.surface));
    if (!hit) return;

    const surface = hit.object.userData.surface;
    const norm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const newPos = hit.point.clone().add(norm.clone().multiplyScalar(0.01));

    if (surface === 'ground' || surface === 'rivier') {
        // rechtop en iets omhoog
        draggingMesh.rotation.set(0, 0, 0);
        newPos.y += 0.2;

        // billboard naar camera
        const camTarget = new THREE.Vector3(
            camera.position.x,
            newPos.y,
            camera.position.z
        );
        draggingMesh.lookAt(camTarget);

    } else {
        // bestaande orientatie op stam/tak/etc.
        if (Math.abs(norm.y) > 0.9) {
            draggingMesh.up.set(0, 1, 0);
            draggingMesh.lookAt(
                new THREE.Vector3(camera.position.x, newPos.y, camera.position.z)
            );
        } else {
            draggingMesh.lookAt(newPos.clone().add(norm));
        }
    }

    draggingMesh.position.copy(newPos);
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

// === MOBILE: Double-tap voor kaart-bewerken op touch devices ===

let lastTapTime = 0;
let lastTapX = 0, lastTapY = 0;
const DOUBLE_TAP_TIME = 350; // ms

canvas.addEventListener('touchend', function (e) {
    if (e.touches.length > 0) return; // ignore multi-touch
    const now = Date.now();
    const tapX = e.changedTouches[0].clientX;
    const tapY = e.changedTouches[0].clientY;

    // optioneel: alleen als tap dicht bij vorige tap (<40px)
    const dist = Math.hypot(tapX - lastTapX, tapY - lastTapY);

    if (now - lastTapTime < DOUBLE_TAP_TIME && dist < 40) {
        // Dit is een double-tap!
        pointer.x = (tapX / window.innerWidth) * 2 - 1;
        pointer.y = -(tapY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hitEdit = raycaster.intersectObjects(scene.children, true)
            .find(i => typeof i.object.userData.text === 'string');
        if (hitEdit) {
            meshBeingEdited = hitEdit.object;
            editText.value = meshBeingEdited.userData.text;
            editImgUpload.value = '';
            removeImgBtn.style.display = meshBeingEdited.userData.imgData ? 'inline-block' : 'none';
            editPopup.style.display = 'flex';
        }
        lastTapTime = 0; // reset
    } else {
        lastTapTime = now;
        lastTapX = tapX;
        lastTapY = tapY;
    }
}, { passive: true });


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

(function animate() {
    requestAnimationFrame(animate);

    // ─── 1. Dynamic Sky Gradient ───
    const time = performance.now() * 0.001;
    const skyT = (Math.sin(time * 0.05) + 1) / 2;
    const topColor = `hsl(${200 + skyT * 40}, 70%, 60%)`;
    const botColor = `hsl(${180 + skyT * 20}, 60%, 50%)`;
    document.body.style.background = `linear-gradient(to bottom, ${topColor}, ${botColor})`;

    // ─── 2. Pop-in animatie ───
    // ─── Pop-in animatie verwerken (subtieler) ───
    const now = performance.now();
    const popDuration = 400;      // duur in ms
    const initialScale = 0.6;     // start­schaal

    for (let i = popAnimations.length - 1; i >= 0; i--) {
        const m = popAnimations[i];
        // genormaliseerde tijd [0,1]
        const t = (now - m.userData.popStart) / popDuration;

        if (t < 1) {
            // ease-out quadratisch
            const eased = 1 - Math.pow(1 - t, 2);
            // schaal tussen initialScale → 1
            const s = THREE.MathUtils.lerp(initialScale, 1, eased);
            m.scale.set(s, s, s);
        } else {
            m.scale.set(1, 1, 1);
            popAnimations.splice(i, 1);
        }
    }


    // ─── 3. Glow-outline animatie ───
    for (let i = glowAnimations.length - 1; i >= 0; i--) {
        const g = glowAnimations[i];
        const t2 = (now - g.userData.glowStart) / 300; // 300 ms
        if (t2 < 1) {
            const sc = THREE.MathUtils.lerp(1, 1.5, t2);
            g.scale.set(sc, sc, sc);
            g.material.opacity = THREE.MathUtils.lerp(0.6, 0, t2);
        } else {
            scene.remove(g);
            glowAnimations.splice(i, 1);
        }
    }

    controls.update();
    renderer.render(scene, camera);
})();


// EXPORT: maak JSON en download als bestand
document.getElementById('export-btn').addEventListener('click', () => {
    const cards = [];
    // loop door alle meshes in scene
    scene.traverse(obj => {
        if (obj.userData && typeof obj.userData.text === 'string') {
            cards.push({
                text: obj.userData.text,
                icon: obj.userData.icon,
                color: obj.userData.color,
                imgData: obj.userData.imgData,
                position: obj.position.toArray(),
                quaternion: obj.quaternion.toArray(),
                // optioneel: breedte/hoogte van je kaartvlak:
                width: obj.geometry.parameters.width,
                height: obj.geometry.parameters.height
            });
        }
    });

    const json = JSON.stringify(cards, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reflectree-cards.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Voeg dit ergens onderin je main.js toe, óf direct na de export-handler:
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-input').click();
});

// IMPORT: lees JSON en maak kaarten opnieuw
document.getElementById('import-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    let cards;
    try {
        cards = JSON.parse(text);
    } catch {
        return alert('Ongeldig JSON-bestand');
    }

    // eerst alle bestaande kaarten verwijderen
    scene.traverse(obj => {
        if (obj.userData && typeof obj.userData.text === 'string') {
            scene.remove(obj);
        }
    });

    // daarna opnieuw aanmaken
    for (const card of cards) {
        const { text, icon, color, imgData, position, quaternion, width, height } = card;
        // maak texture & mesh zoals normaal, geef width/height door
        const tex = await makeCardTexture({ text, icon, color, imgData, width: 256 });
        const mesh = makeCardMesh(tex, color, width, height);
        mesh.castShadow = mesh.receiveShadow = true;

        // positie en oriëntatie herstellen
        mesh.position.fromArray(position);
        mesh.quaternion.fromArray(quaternion);

        mesh.userData = { text, icon, color, imgData };
        scene.add(mesh);
    }
});

function maakAchtergrondBoom3D({
    x, z,
    schaal = 0.95,
    extraHoogte = 0,
    kleurStam = 0x61402a,
    kleurBlad = 0x257c3a
}) {
    // Bereken stamlengte en maak stam
    const stamLengte = 5.6 * schaal + extraHoogte;
    const stamGeo = new THREE.CylinderGeometry(0.15 * schaal, 0.23 * schaal, stamLengte, 10);
    stamGeo.translate(0, stamLengte / 2, 0);
    const stamMat = new THREE.MeshPhongMaterial({ color: kleurStam });
    const stam = new THREE.Mesh(stamGeo, stamMat);

    // Bladbol: halve bol direct op de stamtop
    const bladRadius = 2.7 * schaal;
    const bladGeo = new THREE.SphereGeometry(
        bladRadius,
        20,
        13,
        0, Math.PI * 2,
        0, Math.PI / 2    // thetaLength = π/2 voor halve bol
    );
    // Zet de halve bol precies op stamLengte
    bladGeo.translate(0, stamLengte, 0);
    const bladMat = new THREE.MeshPhongMaterial({
        color: kleurBlad,
        shininess: 55,
        side: THREE.DoubleSide
    });
    const blad = new THREE.Mesh(bladGeo, bladMat);

    // Groepeer en plaats op de grond
    const boom = new THREE.Group();
    boom.add(stam);
    boom.add(blad);
    boom.position.set(x, 0, z);
    boom.castShadow = false;
    boom.receiveShadow = false;
    scene.add(boom);
}


const aantalBomen = 700;
for (let i = 0; i < aantalBomen; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 100;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (z > 0 && Math.random() > 0.25) continue;

    const schaal = 0.63 + Math.random() * 0.47;
    const groeneVariatie = 0x217932 + Math.floor(Math.random() * 0x002600);

    // Nu: max 4 units extra hoogte, meeste bomen 0-2
    let extraHoogte = 0;
    if (Math.random() < 0.23) {
        extraHoogte = 0.5 + Math.random() * 3.5; // tussen 0.5 en 4
    }

    maakAchtergrondBoom3D({
        x,
        z,
        schaal,
        extraHoogte,
        kleurBlad: groeneVariatie
    });
}

// Pas ook hier op: dit loopt pas als element bestaat
const optionsBtn = document.getElementById('options-btn');
const optionsModal = document.getElementById('options-modal');
const optionsClose = document.getElementById('options-close-btn');

optionsBtn.addEventListener('click', () => optionsModal.style.display = 'flex');
optionsClose.addEventListener('click', () => optionsModal.style.display = 'none');

// Koppel modal-knoppen
document.getElementById('export-btn-modal').addEventListener('click', () => {
    document.getElementById('export-btn').click();
    optionsModal.style.display = 'none';
});
document.getElementById('import-btn-modal').addEventListener('click', () => {
    document.getElementById('import-btn').click();
    optionsModal.style.display = 'none';
});






// Expose globals
window.THREE = THREE;
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.create3DCard = create3DCard;
