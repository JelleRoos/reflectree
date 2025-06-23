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
const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });
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
