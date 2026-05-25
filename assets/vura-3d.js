/**
 * VURA 3D Product Explorer
 * Custom WebGL experience powered by Three.js & GSAP
 */

class Vura3DExplorer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.currentState = 'alum'; // 'alum', 'rose', 'aloe'
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.initScene();
    this.initLighting();
    this.createBottle();
    this.createParticles();
    this.initControls();
    this.initScrollTrigger();
    this.initListeners();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    
    // Add subtle ambient fog to blend with the forest green page background (#162D24)
    this.scene.fog = new THREE.FogExp2(0x162d24, 0.08);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 2.5, 6.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    // Ambient light - warm cream tint
    this.ambientLight = new THREE.AmbientLight(0xf4efe3, 0.55);
    this.scene.add(this.ambientLight);

    // Key Light - warm saffron spotlight/directional light
    this.keyLight = new THREE.DirectionalLight(0xffc03f, 1.4);
    this.keyLight.position.set(5, 5, 4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.001;
    this.scene.add(this.keyLight);

    // Fill Light - soft green bounce
    this.fillLight = new THREE.DirectionalLight(0x637746, 0.45);
    this.fillLight.position.set(-5, 2, -3);
    this.scene.add(this.fillLight);

    // Rim Light - intense backlight for glass edges
    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.rimLight.position.set(0, 3, -5);
    this.scene.add(this.rimLight);
  }

  createLabelTexture() {
    // Dynamically draw label inside 2D Canvas so it fits style tokens perfectly without HTTP delays
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    // Background - Warm Vura Cream/Ivory (#F4EFE3)
    ctx.fillStyle = '#F4EFE3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border - Dashed line in Vura Forest Green (#162D24)
    ctx.strokeStyle = '#162D24';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    // Draw grid headers
    ctx.fillStyle = '#162D24';
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 180);
    ctx.lineTo(canvas.width - 24, 180);
    ctx.moveTo(24, 600);
    ctx.lineTo(canvas.width - 24, 600);
    ctx.stroke();

    // Typography
    // Brand Heading
    ctx.textAlign = 'center';
    ctx.fillStyle = '#162D24';
    ctx.font = 'normal 700 84px "Roca One", Georgia, serif';
    ctx.fillText('V U R A', canvas.width / 2, 125);

    // Devanagari text
    ctx.font = 'normal 400 36px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('वूरा', canvas.width / 2, 165);

    // Middle Specimen block
    ctx.font = 'italic 500 24px "Inter", sans-serif';
    ctx.fillText('MINERAL ARCHIVE · SERIES 01', canvas.width / 2, 240);

    ctx.font = 'normal 700 48px "Roca One", serif';
    ctx.fillStyle = '#8D3B2D'; // Terracotta
    ctx.fillText('PHITKARI BLOCK', canvas.width / 2, 320);

    ctx.fillStyle = '#162D24';
    ctx.font = 'normal 400 22px "Inter", sans-serif';
    ctx.fillText('Pressed potassium alum crystal, infused in local copper-still rosewater', canvas.width / 2, 380);
    ctx.fillText('and wild cold-pressed aloe juice extracts.', canvas.width / 2, 415);

    // Specimen seal stamps
    ctx.font = 'normal 600 20px "Inter", sans-serif';
    ctx.fillText('BATCH: 01/C-26 | SPECIMEN: No. 104', canvas.width / 2, 480);
    ctx.fillText('INGREDIENTS: 5 ONLY | STRENGTH: ACTIVE', canvas.width / 2, 515);

    // Footer lines
    ctx.fillStyle = '#6E1F1A';
    ctx.font = 'normal 600 20px "Inter", sans-serif';
    ctx.fillText('MADE IN INDIA · APOTHECARY TRADITION', canvas.width / 2, 660);

    ctx.fillStyle = '#162D24';
    ctx.font = 'normal 400 16px "Inter", sans-serif';
    ctx.fillText('© VURA MINERALS LTD. WEST BENGAL / MAHARASHTRA / RAJASTHAN', canvas.width / 2, 700);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  createBottle() {
    this.bottleGroup = new THREE.Group();

    // 1. Core Materials Definition
    this.liquidColors = {
      alum: new THREE.Color(0xf6f6f2), // Milky/translucent pure clear alum
      rose: new THREE.Color(0x8d3b2d), // Deep terracotta/rosewater amber
      aloe: new THREE.Color(0x3e5e48)  // Translucent herbal sage green
    };

    this.liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: this.liquidColors.alum,
      transparent: true,
      opacity: 0.72,
      transmission: 0.75,
      roughness: 0.05,
      metalness: 0.0,
      ior: 1.333, // Water index of refraction
      depthWrite: false,
      clearcoat: 0.1
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      transmission: 0.94,
      roughness: 0.06,
      metalness: 0.05,
      ior: 1.52,
      thickness: 0.15,
      depthWrite: true,
      side: THREE.DoubleSide,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      attenuationColor: 0xffffff,
      attenuationDistance: 1
    });

    this.labelTexture = this.createLabelTexture();
    this.labelMaterial = new THREE.MeshStandardMaterial({
      map: this.labelTexture,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.capMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e2118, // Vura forest deep
      roughness: 0.75,
      metalness: 0.12
    });

    // 2. Load model from GLB URL if provided
    const modelUrl = window.Vura3DModelUrl || null;

    if (modelUrl && typeof THREE.GLTFLoader !== 'undefined') {
      const loader = new THREE.GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;

          // Compute size and auto-center/scale the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          model.position.x -= center.x;
          model.position.y -= center.y;
          model.position.z -= center.z;

          // Scale model to a standardized height of ~4.5 units
          const maxDim = Math.max(size.x, size.y, size.z);
          const scaleFactor = 4.5 / maxDim;
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);

          // Heuristic material mapping based on mesh names or custom material names
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              const name = child.name.toLowerCase();
              const matName = child.material && child.material.name ? child.material.name.toLowerCase() : '';

              if (name.includes('liquid') || name.includes('fluid') || name.includes('water') || matName.includes('liquid')) {
                child.material = this.liquidMaterial;
                this.liquidMesh = child;
              } else if (name.includes('glass') || name.includes('bottle') || name.includes('container') || matName.includes('glass') || child.material.transparent) {
                child.material = this.glassMaterial;
                this.glassMesh = child;
              } else if (name.includes('label') || name.includes('sticker') || name.includes('decal') || matName.includes('label')) {
                child.material = this.labelMaterial;
                this.labelMesh = child;
              } else if (name.includes('cap') || name.includes('lid') || name.includes('top') || name.includes('cork') || matName.includes('cap')) {
                child.material = this.capMaterial;
                this.capMesh = child;
              }
            }
          });

          this.bottleGroup.add(model);
          // Set model group height offset for the scene
          this.bottleGroup.position.y = -2.0;
        },
        undefined,
        (err) => {
          console.warn("Could not load GLB file, falling back to procedural bottle:", err);
          this.createProceduralBottle();
        }
      );
    } else {
      this.createProceduralBottle();
    }

    this.scene.add(this.bottleGroup);
  }

  createProceduralBottle() {
    // 1. Procedural glass lathe mesh
    const bottlePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.2, 0),
      new THREE.Vector2(1.25, 0.05),
      new THREE.Vector2(1.28, 0.15),
      new THREE.Vector2(1.3, 0.4),
      new THREE.Vector2(1.3, 3.2),
      new THREE.Vector2(1.26, 3.4),
      new THREE.Vector2(1.15, 3.7),
      new THREE.Vector2(0.85, 3.95),
      new THREE.Vector2(0.5, 4.15),
      new THREE.Vector2(0.48, 4.7),
      new THREE.Vector2(0.55, 4.75),
      new THREE.Vector2(0.55, 4.95),
      new THREE.Vector2(0.45, 5.0),
      new THREE.Vector2(0.43, 4.7),
      new THREE.Vector2(0.43, 4.15),
      new THREE.Vector2(0.78, 3.9),
      new THREE.Vector2(1.08, 3.65),
      new THREE.Vector2(1.2, 3.35),
      new THREE.Vector2(1.2, 0.4),
      new THREE.Vector2(1.18, 0.12),
      new THREE.Vector2(0, 0.12)
    ];

    const glassGeometry = new THREE.LatheGeometry(bottlePoints, 64);
    this.glassMesh = new THREE.Mesh(glassGeometry, this.glassMaterial);
    this.glassMesh.castShadow = true;
    this.glassMesh.receiveShadow = true;
    this.bottleGroup.add(this.glassMesh);

    // 2. Procedural liquid lathe mesh
    const liquidPoints = [
      new THREE.Vector2(0, 0.13),
      new THREE.Vector2(1.19, 0.13),
      new THREE.Vector2(1.19, 3.3),
      new THREE.Vector2(1.06, 3.6),
      new THREE.Vector2(0.76, 3.85),
      new THREE.Vector2(0.42, 4.1),
      new THREE.Vector2(0.42, 4.4),
      new THREE.Vector2(0, 4.4)
    ];

    const liquidGeometry = new THREE.LatheGeometry(liquidPoints, 64);
    this.liquidMesh = new THREE.Mesh(liquidGeometry, this.liquidMaterial);
    this.bottleGroup.add(this.liquidMesh);

    // 3. Procedural paper label cylinder
    const labelGeometry = new THREE.CylinderGeometry(1.306, 1.306, 2.2, 64, 1, true);
    this.labelMesh = new THREE.Mesh(labelGeometry, this.labelMaterial);
    this.labelMesh.position.y = 1.7;
    this.labelMesh.rotation.y = -Math.PI / 2;
    this.bottleGroup.add(this.labelMesh);

    // 4. Procedural wooden cap
    const capGeometry = new THREE.CylinderGeometry(0.48, 0.52, 0.75, 32);
    this.capMesh = new THREE.Mesh(capGeometry, this.capMaterial);
    this.capMesh.position.y = 5.25;
    this.capMesh.castShadow = true;
    this.bottleGroup.add(this.capMesh);

    // Lower the bottle group slightly so it centers around the camera origin
    this.bottleGroup.position.y = -2.3;
  }

  createParticles() {
    this.particleGroup = new THREE.Group();
    this.particles = [];
    this.particleCount = 75;

    this.particleColors = {
      alum: [0xffffff, 0xd9d2c2, 0xf4efe3],
      rose: [0xffc03f, 0x8d3b2d, 0x6e1f1a],
      aloe: [0x8dab6b, 0x1e3a2d, 0x637746]
    };

    const particleGeometries = [
      new THREE.DodecahedronGeometry(1, 0), // Mineral crystals
      new THREE.TetrahedronGeometry(1, 0), // Sharp shards
      new THREE.SphereGeometry(1, 6, 6)     // Organic droplets
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const geo = particleGeometries[Math.floor(Math.random() * particleGeometries.length)];
      const size = 0.04 + Math.random() * 0.09;
      
      const colors = this.particleColors[this.currentState];
      const selectedColor = colors[Math.floor(Math.random() * colors.length)];

      const mat = new THREE.MeshStandardMaterial({
        color: selectedColor,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.4
      });

      const mesh = new THREE.Mesh(geo, mat);
      
      // Position particles randomly in a volume surrounding the bottle
      mesh.position.set(
        (Math.random() - 0.5) * 5.5,
        (Math.random() - 0.5) * 5.0 + 0.5,
        (Math.random() - 0.5) * 4.5
      );

      mesh.scale.set(size, size, size);

      // Random rotational speeds
      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.012,
        rotSpeedY: (Math.random() - 0.5) * 0.012,
        floatSpeed: 0.003 + Math.random() * 0.005,
        floatRange: 0.2 + Math.random() * 0.3,
        baseY: mesh.position.y,
        time: Math.random() * 100
      };

      this.particleGroup.add(mesh);
      this.particles.push(mesh);
    }

    this.scene.add(this.particleGroup);
  }

  initControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = true;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 9.5;
    this.controls.enablePan = false;
    
    // Auto-rotate the bottle gently when idle
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.65;

    // Limit vertical rotation to look premium and avoid viewing bottle from weird top/bottom angles
    this.controls.minPolarAngle = Math.PI / 3; // 60 degrees
    this.controls.maxPolarAngle = Math.PI / 1.7; // ~105 degrees
  }

  initScrollTrigger() {
    if (typeof ScrollTrigger !== 'undefined' && typeof gsap !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      // Disable auto-rotate initially so the scroll animation controls it
      this.controls.autoRotate = false;

      // 1. Initial State (tilted, rotated, smaller)
      this.bottleGroup.rotation.y = -Math.PI * 2.5; // Multiple spins
      this.bottleGroup.rotation.x = 0.4;            // Tilted forward
      this.bottleGroup.scale.set(0.3, 0.3, 0.3);    // Zoomed out

      // 2. Scroll Animation timeline linked to ScrollTrigger
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#Vura3DExplorer",
          start: "top bottom",    // Starts when section top enters viewport bottom
          end: "center center",   // Ends when section center reaches viewport center
          scrub: 1.2,             // Smooth follow scroll with inertia
          onLeave: () => {
            // Once the scroll animation completes, enable subtle auto-rotation
            this.controls.autoRotate = true;
          },
          onEnterBack: () => {
            // Disable auto-rotation when scrolling back up
            this.controls.autoRotate = false;
          }
        }
      });

      // Animate scale, rotation, and tilt
      tl.to(this.bottleGroup.scale, { x: 1.0, y: 1.0, z: 1.0, ease: "power1.out" }, 0)
        .to(this.bottleGroup.rotation, { x: 0.0, y: -Math.PI / 2, ease: "power1.out" }, 0);

      // 3. Fade in text and details card
      gsap.from(".vura-3d-info-column", {
        opacity: 0,
        y: 40,
        duration: 1.0,
        scrollTrigger: {
          trigger: "#Vura3DExplorer",
          start: "top 75%",
          end: "top 40%",
          scrub: true
        }
      });
    }
  }

  transitionTo(ingredient) {
    if (this.currentState === ingredient) return;
    this.currentState = ingredient;

    // 1. Animate liquid color transition
    const targetColor = this.liquidColors[ingredient];
    gsap.to(this.liquidMaterial.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 1.2,
      ease: "power2.out"
    });

    // 2. Adjust liquid transmission and roughness based on ingredient attributes
    let targetTrans = 0.75;
    let targetRough = 0.05;
    if (ingredient === 'alum') { targetTrans = 0.85; targetRough = 0.04; }
    if (ingredient === 'rose') { targetTrans = 0.62; targetRough = 0.08; }
    if (ingredient === 'aloe') { targetTrans = 0.58; targetRough = 0.16; }

    gsap.to(this.liquidMaterial, {
      transmission: targetTrans,
      roughness: targetRough,
      duration: 1.2
    });

    // 3. Morph/re-color particles dynamically
    const colors = this.particleColors[ingredient];
    this.particles.forEach((p) => {
      const selectedColor = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      
      gsap.to(p.material.color, {
        r: selectedColor.r,
        g: selectedColor.g,
        b: selectedColor.b,
        duration: 1.0,
        ease: "power2.out"
      });

      // Scale pulse on transition
      const baseScale = p.scale.x;
      gsap.timeline()
        .to(p.scale, { x: baseScale * 1.5, y: baseScale * 1.5, z: baseScale * 1.5, duration: 0.4, ease: "back.out" })
        .to(p.scale, { x: baseScale, y: baseScale, z: baseScale, duration: 0.6, ease: "power2.out" });
    });

    // 4. Subtle shake of the liquid for kinetic feedback
    gsap.timeline()
      .to(this.liquidMesh.position, { y: 0.08, duration: 0.2, ease: "power1.inOut" })
      .to(this.liquidMesh.position, { y: -0.06, duration: 0.3, ease: "power1.inOut" })
      .to(this.liquidMesh.position, { y: 0.0, duration: 0.4, ease: "bounce.out" });
  }

  initListeners() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Mouse movement interactive light reflection
    this.mouseCoords = { x: 0, y: 0 };
    document.addEventListener('mousemove', (e) => {
      // Normalize between -1 and 1
      this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Move keylight slightly based on mouse
      this.keyLight.position.x = 5 + this.mouseCoords.x * 2.5;
      this.keyLight.position.y = 5 + this.mouseCoords.y * 2.5;

      // Rim light moves opposite to create a back-glisten effect
      this.rimLight.position.x = -this.mouseCoords.x * 4;
      this.rimLight.position.y = 3 - this.mouseCoords.y * 2;

      // Lean bottle group slightly
      if (this.bottleGroup && !this.controls.state === -1) {
        gsap.to(this.bottleGroup.rotation, {
          z: -this.mouseCoords.x * 0.07,
          x: this.mouseCoords.y * 0.05,
          duration: 0.8,
          ease: "power2.out"
        });
      }
    });

    // Pause auto-rotation when user actively drags model
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
    });

    // Resume auto-rotate with timer after dragging ends
    this.controls.addEventListener('end', () => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.controls.autoRotate = true;
      }, 5000);
    });
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update OrbitControls
    this.controls.update();

    // Rotate particles and animate floating wave
    this.particles.forEach((p) => {
      p.rotation.x += p.userData.rotSpeedX;
      p.rotation.y += p.userData.rotSpeedY;

      // Float particle upward
      p.position.y += p.userData.floatSpeed;
      p.userData.time += 0.01;
      p.position.x += Math.sin(p.userData.time) * 0.001;

      // Recycle particles that float out of frame
      if (p.position.y > 3.0) {
        p.position.y = -2.5;
        p.position.x = (Math.random() - 0.5) * 5.5;
        p.position.z = (Math.random() - 0.5) * 4.5;
      }
    });

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  const explorer = new Vura3DExplorer('vura-3d-canvas-container');
  window.Vura3D = explorer;

  // Bind UI buttons
  const buttons = document.querySelectorAll('.lab-control-tab');
  const details = document.querySelectorAll('.lab-detail-panel');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const activeIng = btn.getAttribute('data-ingredient');
      
      // Update button state
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Shift 3D liquid
      if (window.Vura3D) {
        window.Vura3D.transitionTo(activeIng);
      }

      // Update text detail panels with a smooth fade
      details.forEach((panel) => {
        if (panel.id === `detail-${activeIng}`) {
          panel.style.display = 'block';
          gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
        } else {
          panel.style.display = 'none';
        }
      });
    });
  });
});
