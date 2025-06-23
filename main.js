// main.js als ES Module

// Importeer Three.js (ES module build)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js';

// 📦 Basis Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('three-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// 🎋 Boomstam (cilinder)
const stamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 32);
const stamMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
const stam = new THREE.Mesh(stamGeometry, stamMaterial);
scene.add(stam);

// 🍃 Bladerdak (bol)
const bladerdakGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const bladerdakMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
const bladerdak = new THREE.Mesh(bladerdakGeometry, bladerdakMaterial);
bladerdak.position.y = 2.5;
scene.add(bladerdak);

// 💡 Licht
const licht = new THREE.DirectionalLight(0xffffff, 1);
licht.position.set(5, 10, 7.5);
scene.add(licht);

// 🎥 Camera positie
camera.position.z = 6;

// 🔁 Animatie-loop
function animate() {
    requestAnimationFrame(animate);

    // Lichte rotatie
    stam.rotation.y += 0.005;
    bladerdak.rotation.y += 0.005;

    renderer.render(scene, camera);
}
animate();

// 📏 Responsief canvas
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
