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
const editCardIconSelect = document.getElementById('edit-card-icon'); // Haal de icon-select op
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

const isMobile = /Mobi|Android/i.test(navigator.userAgent);

controls.enableDamping = true;
controls.dampingFactor = isMobile ? 0.08 : 0.05;

controls.enablePan = true;
controls.screenSpacePanning = true;

controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI / 2.01;

controls.zoomSpeed = isMobile ? 1.2 : 0.25;

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
    // Bij het aanmaken van een nieuwe kaart, stel de initiële userData in
    pending3DCard = {
        text: '',
        icon: btn.dataset.icon,
        color: btn.dataset.color,
        imgData: null,
        locked: false   // nieuw: standaard niet vastgezet
    };

}));
typePopup.addEventListener('click', e => { if (e.target === typePopup) typePopup.style.display = 'none'; });

/**
 * Genereert de 2D-canvas texture voor een 3D-kaart.
 * Deze functie bepaalt de inhoud en de afmetingen van het canvas op basis van tekst, icoon en afbeelding.
 *
 * @param {object} options
 * @param {string} options.text - De tekst op de kaart.
 * @param {string} options.icon - Het emoji-icoon voor de kaart.
 * @param {string} options.color - De achtergrondkleur van de kaart (hex).
 * @param {string|null} options.imgData - Base64 string van een afbeelding, indien aanwezig.
 * @param {number} [options.width=256] - De breedte van het 2D canvas in pixels.
 * @returns {HTMLCanvasElement} Het gegenereerde HTMLCanvasElement.
 */
async function makeCardTexture({ text, icon, color, imgData, width = 256 }) {
    const padding = 12;
    const baseItemSize = 24; // Base size for text elements and small icons
    const iconImageSize = 24; // Size for the top-left icon/image if it were an image
    const DPR = window.devicePixelRatio || 1;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${baseItemSize}px Quicksand`;

    // Calculate lines for text
    const textLines = wrapText(tempCtx, text, width - (2 * padding));
    const numTextLines = textLines.length;
    const textLineHeight = baseItemSize * 1.2;
    const textBlockHeight = numTextLines * textLineHeight;


    const canvas2D = document.createElement('canvas');
    const ctx = canvas2D.getContext('2d');

    let canvasHeight;

    // --- Case 1: Afbeelding aanwezig (vult binnen de padding, tekst erboven, icoon linksboven) ---
    if (imgData) {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = imgData; });

        // Hoogte van het gebied bovenaan (icoon + padding + tekstblok)
        const topContentHeight = padding + iconImageSize + (numTextLines > 0 ? padding : 0) + textBlockHeight;

        // Beschikbare breedte voor de afbeelding (binnen padding)
        const imgDisplayWidth = width - (2 * padding);
        const imgAspectRatio = img.width / img.height;
        const calculatedImgHeight = imgDisplayWidth / imgAspectRatio;

        // Totale canvas hoogte: top content + padding + afbeelding + padding
        canvasHeight = topContentHeight + padding + calculatedImgHeight + padding;

        canvas2D.width = width * DPR;
        canvas2D.height = canvasHeight * DPR;
        ctx.scale(DPR, DPR);

        // Achtergrondkleur voor de randen van de kaart
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, canvasHeight);

        // 1. Teken het ICOON linksboven
        ctx.font = `${baseItemSize}px Quicksand`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = getComputedTextColor(color); // Tekstkleur gebaseerd op achtergrond
        ctx.fillText(icon, padding, padding);

        // 2. Teken de TEKST (onder het icoon, gecentreerd)
        if (numTextLines > 0) {
            ctx.font = `${baseItemSize}px Quicksand`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = getComputedTextColor(color); // Tekstkleur gebaseerd op achtergrond

            const textStartX = width / 2;
            const textStartY = padding + iconImageSize + padding; // Start Y na het icoongebied + padding

            textLines.forEach((line, i) => {
                ctx.fillText(line, textStartX, textStartY + i * textLineHeight);
            });
        }

        // 3. Teken de AFBEELDING (onder de tekst, binnen padding)
        const imageStartY = topContentHeight + padding; // Afbeelding begint onder de top content + padding
        ctx.drawImage(img, padding, imageStartY, imgDisplayWidth, calculatedImgHeight);

    } else { // --- Case 2: Geen afbeelding (icoon + tekst, of groot icoon voor lege kaart) ---
        let currentIconSize = baseItemSize;

        // Bepaal hoogte voor "lege" kaart (geen tekst, geen afbeelding)
        if (numTextLines === 0) {
            currentIconSize = width * 0.5; // Zeer groot icoon voor lege kaarten
            canvasHeight = width; // Maak lege kaartjes vierkant
        } else {
            // Reguliere kaart (klein icoon + tekst eronder)
            const headerHeight = baseItemSize + padding * 2; // Hoogte van het gebied voor het kleine icoon
            canvasHeight = headerHeight + textBlockHeight + padding;
        }

        canvas2D.width = width * DPR;
        canvas2D.height = canvasHeight * DPR;
        ctx.scale(DPR, DPR);

        // Achtergrond
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, canvasHeight);

        // Teken het icoon
        ctx.font = `${currentIconSize}px Quicksand`;
        ctx.fillStyle = getComputedTextColor(color);

        if (numTextLines === 0) {
            // Groot icoon gecentreerd in het vierkante lege kaartje
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, width / 2, canvasHeight / 2); // Centreer in vierkant canvas
        } else {
            // Klein icoon linksboven
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(icon, padding, padding);
        }

        // Teken de tekst (indien aanwezig)
        if (numTextLines > 0) {
            ctx.font = `${baseItemSize}px Quicksand`;
            ctx.fillStyle = getComputedTextColor(color);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const textStartX = width / 2;
            // Tekst start onder het icoongebied bij kleine iconen
            const textStartY = (baseItemSize + padding * 2);

            textLines.forEach((line, i) => {
                ctx.fillText(line, textStartX, textStartY + i * textLineHeight);
            });
        }
    }

    return canvas2D; // Retourneer het canvas zelf
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

function makeCardMesh(texture, backColor, w, h) {
    const geo = new THREE.PlaneGeometry(w, h);
    const matFront = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide });
    const matBack = new THREE.MeshBasicMaterial({ color: backColor, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, matFront);
    mesh.add(new THREE.Mesh(geo, matBack));
    return mesh;
}

/**
 * Maakt een 3D-kaart mesh en voegt deze toe aan de scene.
 * De afmetingen van de kaart worden dynamisch berekend op basis van de inhoud.
 *
 * @param {object} options
 * @param {THREE.Vector3} options.position - De positie van de kaart.
 * @param {THREE.Vector3} options.normal - De normaal van het oppervlak waarop de kaart geplaatst wordt.
 * @param {string} options.text - De tekst voor de kaart.
 * @param {string} options.icon - Het icoon voor de kaart.
 * @param {string} options.color - De kleur van de kaart.
 * @param {string|null} options.imgData - Base64 string van een afbeelding, indien aanwezig.
 * @param {string} options.surface - Het type oppervlak waarop de kaart geplaatst wordt ('ground', 'trunk', etc.).
 * @returns {THREE.Mesh} De gemaakte 3D-kaart mesh.
 */
/**
 * Maakt een 3D-kaart mesh en voegt deze toe aan de scene.
 * Zorgt dat kaartjes op ‘ground’ of ‘rivier’ nooit door de grond zakken.
 */
async function create3DCard({ position, normal, text, icon, color, imgData, surface, locked }) {
    // 1) Texture genereren
    const textureCanvas = await makeCardTexture({ text, icon, color, imgData, width: 256 });
    const tex = new THREE.CanvasTexture(textureCanvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    // 2) Afmetingen berekenen
    const displayWidth = 1.5;
    const displayHeight = (textureCanvas.height / textureCanvas.width) * displayWidth;
    const halfHeight = displayHeight / 2;
    const minMargin = 0.05; // 5cm boven oppervlak

    // 3) Mesh aanmaken
    const mesh = makeCardMesh(tex, color, displayWidth, displayHeight);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { text, icon, color, imgData, displayWidth, displayHeight, locked };

    // 4) Positie & oriëntatie
    if (surface === 'ground' || surface === 'rivier') {
        // XZ precies op hit, Y zo dat onderkant minstens minMargin boven grond zit
        mesh.position.set(
            position.x,
            position.y + halfHeight + minMargin,
            position.z
        );
        mesh.rotation.set(0, 0, 0);
        // billboard naar camera
        mesh.lookAt(new THREE.Vector3(
            camera.position.x,
            mesh.position.y,
            camera.position.z
        ));
    } else {
        // klein offsetje op andere oppervlakken
        const base = position.clone().add(normal.clone().multiplyScalar(0.01));
        mesh.position.set(base.x, base.y + halfHeight + minMargin, base.z);

        // horizontale vlakken → billboard; anders tegen normale richten
        if (Math.abs(normal.y) > 0.9) {
            mesh.up.set(0, 1, 0);
            mesh.lookAt(new THREE.Vector3(camera.position.x, mesh.position.y, camera.position.z));
        } else {
            mesh.lookAt(position.clone().add(normal));
        }
    }

    // 5) Toevoegen & animaties
    scene.add(mesh);
    popAnimations.push(mesh);

    const glowGeo = new THREE.RingGeometry(displayWidth * 0.6, displayWidth * 1.1, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.copy(mesh.position);
    glowMesh.lookAt(camera.position);
    glowMesh.userData.glowStart = performance.now();
    glowAnimations.push(glowMesh);
    scene.add(glowMesh);

    return mesh;
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
            surface: hit.object.userData.surface,
            ...pending3DCard
        });
        pending3DCard = null;
        return;
    }

    const hitDrag = raycaster.intersectObjects(scene.children, true)
        .find(i => typeof i.object.userData.text === 'string');
    if (hitDrag) {
        // nieuw: als kaart vastgezet, niet slepen
        if (hitDrag.object.userData.locked) {
            return;
        }
        draggingMesh = hitDrag.object;
        dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), draggingMesh.position);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersect);
        dragOffset.copy(intersect).sub(draggingMesh.position);
    }
});
// Pointer-move handler met ground-clipping fix
window.addEventListener('pointermove', e => {
    if (!draggingMesh) return;

    // update pointer & raycaster
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects(scene.children, true)
        .find(i => ['trunk', 'root', 'canopy', 'ground', 'rivier']
            .includes(i.object.userData.surface));
    if (!hit) return;

    const surface = hit.object.userData.surface;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const newPos = hit.point.clone().add(normal.clone().multiplyScalar(0.01));
    const halfH = draggingMesh.userData.displayHeight / 2;
    const margin = 0.05; // 5cm

    if (surface === 'ground' || surface === 'rivier') {
        // Y zo instellen dat kaart nooit onder grond komt
        const y = hit.point.y + normal.y * 0.01 + halfH + margin;
        draggingMesh.position.set(newPos.x, y, newPos.z);
        draggingMesh.rotation.set(0, 0, 0);
        draggingMesh.lookAt(new THREE.Vector3(camera.position.x, y, camera.position.z));
    } else {
        // bestaande logica voor stam/takken/bladeren
        if (Math.abs(normal.y) > 0.9) {
            draggingMesh.up.set(0, 1, 0);
            draggingMesh.lookAt(new THREE.Vector3(camera.position.x, newPos.y, camera.position.z));
        } else {
            draggingMesh.lookAt(newPos.clone().add(normal));
        }
        draggingMesh.position.copy(newPos);
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
    editCardIconSelect.value = meshBeingEdited.userData.icon; // Stel de waarde van de icon dropdown in
    document.getElementById('edit-card-locked').checked =
        meshBeingEdited.userData.locked;
    editImgUpload.value = ''; // Leeg de file input
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
            editCardIconSelect.value = meshBeingEdited.userData.icon; // Stel de waarde van de icon dropdown in
            document.getElementById('edit-card-locked').checked =
                meshBeingEdited.userData.locked;
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
    if (!meshBeingEdited) return; // Veiligheidscheck

    // Update tekst en icoon uit de dropdown
    meshBeingEdited.userData.text = editText.value.trim();
    meshBeingEdited.userData.icon = editCardIconSelect.value;

    // nieuw: update de lock-status uit de checkbox
    const lockedCheckbox = document.getElementById('edit-card-locked');
    meshBeingEdited.userData.locked = lockedCheckbox.checked;


    // Update afbeelding als er een file is geselecteerd
    if (editImgUpload.files[0]) {
        meshBeingEdited.userData.imgData = await getUploadedImgData(editImgUpload.files[0]);
    }

    // Genereer het nieuwe 2D canvas en de texture
    const newTextureCanvas = await makeCardTexture({
        text: meshBeingEdited.userData.text,
        icon: meshBeingEdited.userData.icon,
        color: meshBeingEdited.userData.color,
        imgData: meshBeingEdited.userData.imgData,
        width: 256
    });

    const newTex = new THREE.CanvasTexture(newTextureCanvas);
    newTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    newTex.generateMipmaps = false;
    newTex.minFilter = THREE.LinearFilter;
    newTex.magFilter = THREE.LinearFilter;
    newTex.needsUpdate = true;

    // Gooi de oude texture weg om geheugenlekken te voorkomen
    if (meshBeingEdited.material.map) {
        meshBeingEdited.material.map.dispose();
    }
    // Pas de nieuwe texture toe
    meshBeingEdited.material.map = newTex;
    meshBeingEdited.material.needsUpdate = true;

    // Bereken de nieuwe 3D hoogte op basis van de nieuwe canvas afmetingen
    const newDisplayHeight = (newTextureCanvas.height / newTextureCanvas.width) * meshBeingEdited.userData.displayWidth;

    // Update de geometrie van de mesh als de hoogte significant verandert
    // Een kleine tolerantie om onnodige updates te voorkomen
    if (Math.abs(newDisplayHeight - meshBeingEdited.userData.displayHeight) > 0.001) {
        // Gooi de oude geometrie weg en maak een nieuwe aan
        meshBeingEdited.geometry.dispose();
        meshBeingEdited.geometry = new THREE.PlaneGeometry(meshBeingEdited.userData.displayWidth, newDisplayHeight);

        // Update ook de geometrie van de achterkant van de kaart (indien aanwezig als kindmesh)
        if (meshBeingEdited.children[0] && meshBeingEdited.children[0].isMesh) {
            meshBeingEdited.children[0].geometry.dispose();
            meshBeingEdited.children[0].geometry = new THREE.PlaneGeometry(meshBeingEdited.userData.displayWidth, newDisplayHeight);
        }
        // Update de opgeslagen displayHeight in userData
        meshBeingEdited.userData.displayHeight = newDisplayHeight;
    }

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
    editImgUpload.value = ''; // Leeg de file input zodat er geen "vorige" afbeelding staat
    removeImgBtn.style.display = 'none';

    // Genereer de texture opnieuw zonder afbeelding om de wijziging direct te tonen
    // (de submit-handler doet dit ook, maar dit is voor direct visuele feedback)
    editForm.dispatchEvent(new Event('submit', { cancelable: true })); // Trigger form submit
});


(function animate() {
    requestAnimationFrame(animate);

    // ─── 1. Dynamic Sky Gradient ───
    const time = performance.now() * 0.001;
    const skyT = (Math.sin(time * 0.05) + 1) / 2;
    const topColor = `hsl(${200 + skyT * 40}, 70%, 60%)`;
    const botColor = `hsl(${180 + skyT * 20}, 60%, 50%)`;
    document.body.style.background = `linear-gradient(to bottom, ${topColor}, ${botColor})`;

    // ─── 2. Pop-in animatie (subtieler) ───
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
                // Exporteer de berekende breedte en hoogte
                displayWidth: obj.userData.displayWidth,
                displayHeight: obj.userData.displayHeight,
                locked: obj.userData.locked
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
        console.error('Ongeldig JSON-bestand ingeladen.');
        return;
    }

    // alle bestaande kaarten verwijderen
    const cardsToRemove = [];
    scene.traverse(obj => {
        if (obj.userData && typeof obj.userData.text === 'string') {
            cardsToRemove.push(obj);
        }
    });
    cardsToRemove.forEach(obj => scene.remove(obj));

    await document.fonts.ready;

    // opnieuw aanmaken, mét locked
    for (const card of cards) {
        // 1) destructure wél keurig locked
        const {
            text,
            icon,
            color,
            imgData,
            position,
            quaternion,
            displayWidth,
            displayHeight,
            locked    // ← hier lees je ‘locked’ uit het JSON-object
        } = card;

        // 2) maak de texture en mesh (ongeveer zoals je had)
        const textureCanvas = await makeCardTexture({ text, icon, color, imgData, width: 256 });
        const tex = new THREE.CanvasTexture(textureCanvas);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        const mesh = makeCardMesh(tex, color, displayWidth, displayHeight);
        mesh.castShadow = mesh.receiveShadow = true;

        // herstel positie en oriëntering
        mesh.position.fromArray(position);
        mesh.quaternion.fromArray(quaternion);

        // 3) *gebruik* die locked-waarde hier in userData
        mesh.userData = {
            text,
            icon,
            color,
            imgData,
            displayWidth,
            displayHeight,
            locked    // ← én hier gebruik je ‘locked’ weer
        };

        scene.add(mesh);

        // (rest: popAnimations, glowAnimations, etc.)
        mesh.scale.set(0.001, 0.001, 0.001);
        mesh.userData.popStart = performance.now();
        popAnimations.push(mesh);

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
    document.getElementById('import-input').click();
    optionsModal.style.display = 'none';
});



// Help-panel open/sluit
const helpToggle = document.getElementById('help-toggle');
const helpPanel = document.getElementById('help-panel');
const helpClose = document.getElementById('help-close');

helpToggle.addEventListener('click', () => {
    helpPanel.style.display = helpPanel.style.display === 'none' ? 'block' : 'none';
});
helpClose.addEventListener('click', () => {
    helpPanel.style.display = 'none';
});



// Expose globals (voor debugging)
window.THREE = THREE;
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.create3DCard = create3DCard;
