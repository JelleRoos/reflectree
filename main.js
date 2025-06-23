// main.js

// 1) Simpele bare-import voor Three.js
import * as THREE from 'three';

// 2) Bare-import voor OrbitControls (via dezelfde map)
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 3) Basis setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 2, 6);

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('three-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// 4) OrbitControls instellen
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 5) Boomstam
const stam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 3, 32),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
);
scene.add(stam);

// 6) Bladerdak
const bladerdak = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
);
bladerdak.position.y = 2.5;
scene.add(bladerdak);

// 7) Licht
const licht = new THREE.DirectionalLight(0xffffff, 1);
licht.position.set(5, 10, 7.5);
scene.add(licht);

// 8) Render-loop
function animate() {
    requestAnimationFrame(animate);
    stam.rotation.y += 0.002;
    bladerdak.rotation.y += 0.002;
    controls.update();
    renderer.render(scene, camera);
}
animate();

// 9) Responsief bij resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
