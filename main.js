import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Stam‐parameters
const trunkHeight = 6;
const trunkRadiusTop = 0.8;
const trunkRadiusBottom = 1.0;

// Renderer & scene
const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0f7fa);

// Camera + controls
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

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



// Grondvlak
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshPhongMaterial({ color: 0x99cc77, side: THREE.DoubleSide })
);
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
    renderer.render(scene, camera);
})();
