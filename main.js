import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';




// Stam‐parameters
const trunkHeight = 6;
const trunkRadiusTop = 0.8;
const trunkRadiusBottom = 1.0;

// Renderer & scene
const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
});
renderer.setClearColor(0x000000, 0);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// Voeg deze regel toe om de clear-kleur volledig transparant te maken
renderer.setClearColor(0x000000, 0);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = null;
renderer.setClearColor(0x000000, 0); // kleur negeert, alpha = 0

// Camera + controls
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// **Camera‐beperkingen**
controls.minPolarAngle = 0.1;        // niet volledig onder de horizon (rondkijken)
controls.maxPolarAngle = Math.PI / 2.01;  // maximaal horizontaal, nooit de grond in
controls.minDistance = 8;        // minimale afstand tot de boom
controls.maxDistance = 30;       // maximale zoom-uit afstand

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
scene.add(trunk);

// Wortels (4) vanuit hart stam
[0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(angle => {
    const length = 3.5;
    const radiusTop = trunkRadiusBottom * 0.9;
    const radiusBottom = 0.12;
    const inset = 0.6;

    // 1) Cylinder
    const geo = new THREE.CylinderGeometry(radiusBottom, radiusTop, length, 8);
    geo.translate(0, length / 2, 0);

    // 2) Mesh
    const mesh = new THREE.Mesh(geo, trunkMat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.rotation.z = -Math.PI / 2;

    // 3) Mesh gedeeltelijk uit stam schuiven
    mesh.position.x = trunkRadiusBottom - inset;

    // 4) Groep rotatie
    const group = new THREE.Group();
    group.add(mesh);
    group.rotation.y = angle;

    // 5) Voeg toe aan scene
    scene.add(group);
});

// ======= Takken (4) vanuit hart stam, schuin omhoog =======
// Doe hier je experiment met de offset-hoek:
const offsetAngle = Math.PI / 24;
const branchBaseRotation = Math.PI / 3; // 90° kwartslag

const baseAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
baseAngles.forEach((base, i) => {
    // Hier voegen we de offset toe:
    const theta = branchBaseRotation
        + base
        + (i % 2 === 0 ? +offsetAngle : -offsetAngle);


    // Tak‐parameters
    const length = 6;
    const wide = trunkRadiusTop * 0.9;
    const narrow = 0.15;
    const inset = 0.8;

    // Cylinder met brede kant onderaan
    const geo = new THREE.CylinderGeometry(narrow, wide, length, 12);
    geo.translate(0, length / 2, 0);

    // Mesh
    const mesh = new THREE.Mesh(geo, trunkMat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.x = trunkRadiusTop - inset;
    mesh.rotation.x = -Math.PI / 3; // 30° omhoog

    // Groep om de y‐rotatie te centreren
    const group = new THREE.Group();
    group.add(mesh);

    // **Belangrijk**: hier gebruik je θ
    group.rotation.y = theta;
    group.position.y = trunkHeight;

    group.renderOrder = 1;
    scene.add(group);
});

// ======= Lathe-gebaseerde, organische bladerbol met afgeronde top =======
{
    // Instellingen
    const maxR = 5.5;   // maximale radius van je bladerdek
    const height = 6.0;   // hoogte van je bladerdek
    const exp = 1.8;   // exponent <1 => sneller omhoog, >1 => langzamer
    const step = 0.2;   // stapgrootte in y

    // 1) Profiellijn met piecewise exponent en zachte apex
    const points = [];
    for (let y = 0; y <= height; y += step) {
        const t = y / height;
        let base = Math.sin(t * Math.PI);

        if (t > 1) {
            // Bovenste 15%: zachte sin-interpolatie naar 0
            const subT = (t - 1) / 0.15;              // van 0..1 over de top-zone
            base = Math.sin(subT * 0.5 * Math.PI) * base;
        } else {
            // Onderste 85%: scherpe exponent-kromming
            base = Math.pow(base, exp);
        }

        const r = base * maxR;
        points.push(new THREE.Vector2(r, y));
    }
    // Zorg dat de very top écht op 0 straal uitkomt
    points.push(new THREE.Vector2(0, height));

    // 2) LatheGeometry maken
    const geo = new THREE.LatheGeometry(points, 32);
    const mat = new THREE.MeshPhongMaterial({ color: 0x004d00 });
    const canopy = new THREE.Mesh(geo, mat);

    // 3) Positioneren op de stamtop
    canopy.position.set(0, trunkHeight, 0);
    canopy.castShadow = true;
    canopy.receiveShadow = true;

    scene.add(canopy);
}




// Grondvlak
const groundSize = 10000;
const groundColor = 0x044a01;
const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
const groundMat = new THREE.MeshPhongMaterial({ color: groundColor, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeo, groundMat);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Responsief & animatie
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
(function animate() {
    requestAnimationFrame(animate);
    controls.update();
    ground.position.x = camera.position.x;
    ground.position.z = camera.position.z;
    renderer.render(scene, camera);
})();

// Hemisferisch licht voor realistische sky-kleur
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x555555, 0.6);
scene.add(hemi);

// Fog voor dieptegevoel
scene.fog = new THREE.Fog(groundColor, 10, 200);

// === Kaartfunctionaliteit ===

// Unieke ID generator voor kaarten
let kaartCounter = 0;

// Referenties
const cardsOverlay = document.getElementById('cards-overlay');
const addCardBtn = document.getElementById('add-card-btn');

// Kaarten array (voor later: export/import)
const kaarten = [];

// Voeg nieuwe kaart toe als je op de knop drukt
addCardBtn.addEventListener('click', () => {
    typePopup.style.display = 'flex'; // Alleen popup openen, géén kaart aanmaken!
});

// Popup references
const typePopup = document.getElementById('card-type-popup');
const typeBtns = typePopup.querySelectorAll('.type-btn');

addCardBtn.addEventListener('click', () => {
    typePopup.style.display = 'flex'; // Toon popup
});

// Bij klikken op een type, maak kaart aan met juiste kleur en icoon
typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        typePopup.style.display = 'none';
        const kaartType = btn.getAttribute('data-type');
        const kleur = btn.getAttribute('data-color');
        const icoon = btn.getAttribute('data-icon');
        maakNieuweKaart({
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
            icon: icoon,
            text: 'Nieuwe notitie...',
            kleur: kleur,
            type: kaartType
        });
    });
});

// Popup sluiten bij klik buiten popup
typePopup.addEventListener('click', e => {
    if (e.target === typePopup) typePopup.style.display = 'none';
});


// Kaart toevoegen aan DOM en intern registeren
// Helper: check of een hexkleur donker is
function isDarkColor(hex) {
    if (!hex) return false;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 160;
}


function maakNieuweKaart({ x, y, icon, text, kleur = '#fffbea', type = 'lucht' }) {
    const id = 'kaart-' + (++kaartCounter);

    // Kaart-element maken
    const card = document.createElement('div');
    card.className = 'card';
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.background = kleur;
    card.setAttribute('data-id', id);
    card.setAttribute('data-type', type);

    // Verwijderknop
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-delete-btn';
    deleteBtn.innerHTML = '✖️';
    deleteBtn.title = 'Verwijderen';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Verwijder uit DOM
        card.remove();
        // Verwijder uit kaarten array (optioneel, voor export later)
        const idx = kaarten.findIndex(k => k.id === id);
        if (idx !== -1) kaarten.splice(idx, 1);
    });
    card.appendChild(deleteBtn);

    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'card-icon';
    iconDiv.textContent = icon;
    card.appendChild(iconDiv);

    // Tekst
    // Tekst
    const textDiv = document.createElement('div');
    textDiv.className = 'card-text';
    textDiv.textContent = text;

    // Voeg lichte tekst toe als nodig
    if (isDarkColor(kleur)) {
        textDiv.classList.add('light-text');
    }

    // Inline bewerken van de kaarttekst
    textDiv.addEventListener('click', function () {
        // Niet meer dan één textarea tegelijk
        if (card.querySelector('textarea')) return;

        // Maak de textarea aan
        const textarea = document.createElement('textarea');
        textarea.className = 'card-textarea';
        textarea.value = textDiv.textContent;
        textarea.rows = 3;
        textarea.style.width = '95%';

        // Achtergrondkleur van de kaart overnemen
        const kaartKleur = card.style.background;
        textarea.style.background = kaartKleur || "#fffbea";

        // Tekstkleur exact overnemen van de kaarttekst
        textarea.style.color = getComputedStyle(textDiv).color;

        // Vervang de div door de textarea
        card.replaceChild(textarea, textDiv);
        textarea.focus();

        // Functie om op te slaan en terug te wisselen
        function save() {
            const newText = textarea.value.trim() || '...';
            textDiv.textContent = newText;
            card.replaceChild(textDiv, textarea);
            // Update in je kaarten-array
            const kaartId = card.getAttribute('data-id');
            const kaartObj = kaarten.find(k => k.id === kaartId);
            if (kaartObj) kaartObj.text = newText;
        }

        // Opslaan bij blur of Enter (zonder shift)
        textarea.addEventListener('blur', save);
        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textarea.blur();
            }
        });
    });



    card.appendChild(textDiv);



    // Voeg toe aan overlay
    cardsOverlay.appendChild(card);

    // Sla kaart op in array
    kaarten.push({ id, x, y, icon, text, imgUrl: '', ytUrl: '' });

    // Maak versleepbaar
    maakKaartVersleepbaar(card);
}


// Drag & drop voor kaarten
function maakKaartVersleepbaar(card) {
    let isDragging = false, offsetX, offsetY;

    card.addEventListener('pointerdown', e => {
        isDragging = true;
        card.classList.add('selected');
        offsetX = e.clientX - card.offsetLeft;
        offsetY = e.clientY - card.offsetTop;
        // Zodat je niet tekst selecteert
        e.preventDefault();
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('pointermove', e => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        // Binnen venster houden
        x = Math.max(0, Math.min(window.innerWidth - card.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - card.offsetHeight, y));

        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
    });

    window.addEventListener('pointerup', () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('selected');
        document.body.style.userSelect = '';
        // (later: kaartpositie opslaan in kaarten array)
    });
}

// ===== BEWERK-POPUP =====
const editPopup = document.getElementById('card-edit-popup');
const editForm = document.getElementById('card-edit-form');
const editText = document.getElementById('edit-card-text');
const editImgUpload = document.getElementById('edit-card-img-upload');
const editYT = document.getElementById('edit-card-yt');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const removeImgBtn = document.getElementById('remove-card-img-btn');

let cardBeingEdited = null;
let uploadedImgData = null;

// Dubbelklik op kaart opent bewerk-popup
cardsOverlay.addEventListener('dblclick', function (e) {
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    openEditPopup(card);
});

function openEditPopup(card) {
    // Vind bijbehorende kaart-data
    const id = card.getAttribute('data-id');
    const kaart = kaarten.find(k => k.id === id);
    if (!kaart) return;
    cardBeingEdited = card;

    editText.value = kaart.text || '';
    editYT.value = kaart.ytUrl || '';
    editImgUpload.value = '';
    uploadedImgData = kaart.imgUrl && kaart.imgUrl.startsWith('data:') ? kaart.imgUrl : null;

    // Toon verwijderknop alleen als er een afbeelding is
    removeImgBtn.style.display = uploadedImgData ? "inline-block" : "none";

    editPopup.style.display = 'flex';
    setTimeout(() => editText.focus(), 10);
}

// Luister naar upload input
editImgUpload.addEventListener('change', function () {
    const file = editImgUpload.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            uploadedImgData = evt.target.result;
            removeImgBtn.style.display = "inline-block";
        };
        reader.readAsDataURL(file);
    }
});

// Afbeelding verwijderen knop
removeImgBtn.addEventListener('click', function () {
    uploadedImgData = null;
    editImgUpload.value = '';
    // Sla ook meteen visueel op bij het bewerken (optioneel, of bij opslaan)
    removeImgBtn.style.display = "none";
});

// Popup sluiten
editCancelBtn.onclick = () => {
    editPopup.style.display = 'none';
    cardBeingEdited = null;
    uploadedImgData = null;
    removeImgBtn.style.display = "none";
};

// Opslaan en toepassen
editForm.onsubmit = function (e) {
    e.preventDefault();
    if (!cardBeingEdited) return;
    const id = cardBeingEdited.getAttribute('data-id');
    const kaart = kaarten.find(k => k.id === id);
    if (!kaart) return;

    // Tekst updaten
    const newText = editText.value.trim();
    kaart.text = newText;
    cardBeingEdited.querySelector('.card-text').textContent = newText;

    // Alleen upload-afbeelding!
    kaart.imgUrl = uploadedImgData || '';
    updateCardImage(cardBeingEdited, kaart.imgUrl);

    // YouTube updaten
    const ytUrl = editYT.value.trim();
    kaart.ytUrl = ytUrl;
    updateCardYouTube(cardBeingEdited, ytUrl);

    editPopup.style.display = 'none';
    cardBeingEdited = null;
    uploadedImgData = null;
    removeImgBtn.style.display = "none";
};

// Kaart-UI helper: afbeelding tonen/verbergen
function updateCardImage(card, imgUrl) {
    let img = card.querySelector('.card-img');
    if (imgUrl) {
        if (!img) {
            img = document.createElement('img');
            img.className = 'card-img';
            img.style.maxWidth = '95%';
            img.style.maxHeight = '120px';
            img.style.display = 'block';
            img.style.margin = '7px auto 7px auto';
            card.insertBefore(img, card.querySelector('.card-text'));
        }
        img.src = imgUrl;
        img.style.display = '';
    } else if (img) {
        img.style.display = 'none';
    }
}

// Kaart-UI helper: YouTube tonen/verbergen
function updateCardYouTube(card, ytUrl) {
    let yt = card.querySelector('.card-yt');
    function getYTId(url) {
        const reg = /(?:youtu\.be\/|youtube\.com.*(?:v=|embed\/))([\w-]{11})/;
        const match = url.match(reg);
        return match ? match[1] : null;
    }
    const id = getYTId(ytUrl);

    if (id) {
        if (!yt) {
            yt = document.createElement('iframe');
            yt.className = 'card-yt';
            yt.width = "100%";
            yt.height = "180";
            yt.frameBorder = "0";
            yt.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            yt.allowFullscreen = true;
            const img = card.querySelector('.card-img');
            if (img && img.style.display !== 'none') {
                card.insertBefore(yt, img.nextSibling);
            } else {
                card.insertBefore(yt, card.querySelector('.card-text'));
            }
        }
        yt.src = `https://www.youtube.com/embed/${id}`;
        yt.style.display = '';
    } else if (yt) {
        yt.style.display = 'none';
    }
}

