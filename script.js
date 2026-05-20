const SECTION_SELECTOR = ".story-section";
const ACTIVE_CLASS = "is-active";
const SMOOTHING = 0.075;
const DPR_LIMIT = 2;
const THREE_PARTICLE_COUNT = 520;
const THREE_CAMERA_BASE_Z = 8.5;
const THREE_CAMERA_TRAVEL = 3.2;
const SCENE_STATES = [
  {
    name: "origin",
    hue: 0.56,
    cameraX: -0.25,
    cameraY: 1.06,
    cameraZ: 8.8,
    rigX: -0.18,
    rigY: -0.18,
    rigZ: -1.0,
    rigScale: 0.94,
    coreOpacity: 0.3,
    edgeOpacity: 0.42,
    particleOpacity: 0.24,
    particleSpread: 0,
    gridOpacity: 0.1,
    lightIntensity: 2.6,
  },
  {
    name: "signal",
    hue: 0.52,
    cameraX: 0.32,
    cameraY: 1.28,
    cameraZ: 7.5,
    rigX: 0.2,
    rigY: 0.05,
    rigZ: -1.75,
    rigScale: 1.06,
    coreOpacity: 0.42,
    edgeOpacity: 0.72,
    particleOpacity: 0.48,
    particleSpread: 0.65,
    gridOpacity: 0.16,
    lightIntensity: 4.4,
  },
  {
    name: "method",
    hue: 0.62,
    cameraX: -0.48,
    cameraY: 0.92,
    cameraZ: 6.4,
    rigX: -0.1,
    rigY: 0.16,
    rigZ: -2.2,
    rigScale: 1.18,
    coreOpacity: 0.36,
    edgeOpacity: 0.62,
    particleOpacity: 0.36,
    particleSpread: 1,
    gridOpacity: 0.22,
    lightIntensity: 3.7,
  },
  {
    name: "future",
    hue: 0.68,
    cameraX: 0.22,
    cameraY: 1.5,
    cameraZ: 5.8,
    rigX: 0.08,
    rigY: 0.32,
    rigZ: -2.65,
    rigScale: 0.88,
    coreOpacity: 0.46,
    edgeOpacity: 0.82,
    particleOpacity: 0.58,
    particleSpread: 1.35,
    gridOpacity: 0.08,
    lightIntensity: 5.2,
  },
];
const HAS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sections = Array.from(document.querySelectorAll(SECTION_SELECTOR));
const navButtons = Array.from(document.querySelectorAll("[data-jump]"));
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const fallbackCanvas = document.getElementById("sceneCanvas");
const context = fallbackCanvas.getContext("2d");
const webglCanvas = document.getElementById("webglCanvas");

let targetScroll = window.scrollY;
let easedScroll = window.scrollY;
let activeIndex = 0;
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let particles = [];
let lenis = null;
let isGsapMode = false;
let threeScene = null;
window.__scrollDemoStatus = {
  background: "2d",
  sceneState: "fallback",
  lenis: false,
  gsap: false,
  three: false,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) {
    return outMin;
  }

  const progress = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * progress;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function interpolateSceneState(fromState, toState, amount) {
  return Object.keys(fromState).reduce((state, key) => {
    if (key === "name") {
      return { ...state, name: amount < 0.5 ? fromState.name : toState.name };
    }

    return {
      ...state,
      [key]: lerp(fromState[key], toState[key], amount),
    };
  }, {});
}

function getSceneState(index, chapterProgress) {
  const current = SCENE_STATES[index] || SCENE_STATES[0];
  const next = SCENE_STATES[index + 1] || current;
  const transitionAmount = smoothstep(0.66, 1, chapterProgress);

  return interpolateSceneState(current, next, transitionAmount);
}

function resizeCanvas() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;

  const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  fallbackCanvas.width = Math.floor(viewportWidth * dpr);
  fallbackCanvas.height = Math.floor(viewportHeight * dpr);
  fallbackCanvas.style.width = `${viewportWidth}px`;
  fallbackCanvas.style.height = `${viewportHeight}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  particles = Array.from({ length: viewportWidth < 760 ? 42 : 76 }, (_, index) => ({
    x: (index * 139) % viewportWidth,
    y: (index * 241) % viewportHeight,
    r: 0.8 + ((index * 17) % 18) / 10,
    drift: 0.35 + ((index * 11) % 12) / 20,
    alpha: 0.16 + ((index * 7) % 12) / 100,
  }));

  resizeThreeScene();
}

function splitHeadlines() {
  document.querySelectorAll(".chapter-card h2").forEach((headline) => {
    const text = headline.textContent || "";
    const fragment = document.createDocumentFragment();

    Array.from(text).forEach((letter) => {
      const span = document.createElement("span");
      span.className = letter === " " ? "char char-space" : "char";
      span.textContent = letter === " " ? "\u00a0" : letter;
      fragment.appendChild(span);
    });

    headline.replaceChildren(fragment);
  });
}

function getSectionProgress(section, scrollValue) {
  const rect = section.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const scrollable = section.offsetHeight - viewportHeight;
  return clamp((scrollValue - top) / scrollable, 0, 1);
}

function setActiveIndex(nextIndex) {
  activeIndex = nextIndex;
  navButtons.forEach((button, index) => {
    button.classList.toggle(ACTIVE_CLASS, index === activeIndex);
  });
}

function updateCards(scrollValue) {
  let closestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const progress = getSectionProgress(section, scrollValue);
    const enter = smoothstep(0.02, 0.24, progress);
    const exit = 1 - smoothstep(0.72, 0.96, progress);
    const visibility = enter * exit;
    const card = section.querySelector(".chapter-card");
    const meta = section.querySelector(".chapter-meta");
    const centerDistance = Math.abs(progress - 0.5);

    if (centerDistance < closestDistance && progress > 0 && progress < 1) {
      closestDistance = centerDistance;
      activeIndex = index;
    }

    section.style.setProperty("--section-progress", progress.toFixed(4));
    card.style.setProperty("--card-o", visibility.toFixed(4));
    card.style.setProperty("--card-y", `${mapRange(visibility, 0, 1, 4, 0).toFixed(3)}rem`);
    card.style.setProperty("--card-scale", mapRange(visibility, 0, 1, 0.965, 1).toFixed(4));
    meta.style.setProperty("--meta-o", mapRange(visibility, 0, 1, 0.24, 0.86).toFixed(4));
    meta.style.setProperty("--meta-y", `${mapRange(progress, 0, 1, 3, -3).toFixed(3)}rem`);
  });

  setActiveIndex(activeIndex);
}

function drawScene(scrollValue) {
  if (threeScene) {
    renderThreeScene(scrollValue);
    return;
  }

  const maxScroll = document.documentElement.scrollHeight - viewportHeight;
  const pageProgress = maxScroll > 0 ? clamp(scrollValue / maxScroll, 0, 1) : 0;
  const hueShift = pageProgress * 120;

  context.clearRect(0, 0, viewportWidth, viewportHeight);

  const gradient = context.createRadialGradient(
    viewportWidth * (0.62 + pageProgress * 0.12),
    viewportHeight * 0.28,
    40,
    viewportWidth * 0.6,
    viewportHeight * 0.35,
    viewportWidth * 0.85
  );
  gradient.addColorStop(0, `hsla(${205 + hueShift}, 94%, 64%, 0.22)`);
  gradient.addColorStop(0.5, "rgba(61, 112, 255, 0.08)");
  gradient.addColorStop(1, "rgba(2, 9, 22, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, viewportWidth, viewportHeight);

  drawGrid(pageProgress);
  drawMonolith(pageProgress);
  drawParticles(scrollValue, pageProgress);
}

function createParticlePositions() {
  const positions = new Float32Array(THREE_PARTICLE_COUNT * 3);
  const offsets = new Float32Array(THREE_PARTICLE_COUNT * 3);

  for (let index = 0; index < THREE_PARTICLE_COUNT; index += 1) {
    const stride = index * 3;
    const ring = (index % 37) / 37;
    const lane = Math.floor(index / 37);
    const radius = 3.2 + (lane % 9) * 0.38;
    const angle = ring * Math.PI * 2 + lane * 0.39;

    positions[stride] = Math.cos(angle) * radius;
    positions[stride + 1] = ((index * 19) % 140) / 14 - 5;
    positions[stride + 2] = Math.sin(angle) * radius - 5 - (lane % 6) * 0.35;

    offsets[stride] = Math.cos(angle * 1.7) * (0.6 + (lane % 5) * 0.18);
    offsets[stride + 1] = Math.sin(angle * 1.3) * (0.4 + (index % 9) * 0.05);
    offsets[stride + 2] = Math.sin(angle * 1.9) * (0.8 + (lane % 7) * 0.14);
  }

  return { positions, offsets };
}

function setupThreeScene() {
  if (!window.THREE || HAS_REDUCED_MOTION || !webglCanvas) {
    return null;
  }

  try {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({
      canvas: webglCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_LIMIT));
    renderer.setSize(viewportWidth, viewportHeight, false);
    renderer.setClearColor(0x020916, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06122a, 0.065);

    const camera = new THREE.PerspectiveCamera(42, viewportWidth / viewportHeight, 0.1, 80);
    camera.position.set(0, 1.1, THREE_CAMERA_BASE_Z);

    const rig = new THREE.Group();
    scene.add(rig);

    const coreGeometry = new THREE.BoxGeometry(2.2, 2.2, 2.2, 12, 12, 12);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x58a7ff,
      emissive: 0x062a66,
      metalness: 0.18,
      roughness: 0.38,
      transparent: true,
      opacity: 0.36,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    rig.add(core);

    const edgeGeometry = new THREE.EdgesGeometry(coreGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xdce7ff,
      transparent: true,
      opacity: 0.5,
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    rig.add(edges);

    const innerGeometry = new THREE.IcosahedronGeometry(0.82, 1);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x72d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.54,
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    rig.add(inner);

    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = createParticlePositions();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions.positions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xdce7ff,
      size: 0.025,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const particleField = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleField);

    const grid = new THREE.GridHelper(18, 28, 0x72d4ff, 0xdce7ff);
    grid.position.y = -2.35;
    grid.position.z = -4;
    grid.material.transparent = true;
    grid.material.opacity = 0.12;
    scene.add(grid);

    const ambient = new THREE.AmbientLight(0xdce7ff, 0.75);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x72d4ff, 3.2, 18);
    keyLight.position.set(2.8, 3.4, 3.2);
    scene.add(keyLight);

    document.body.classList.add("has-webgl-scene");
    window.__scrollDemoStatus.three = true;
    window.__scrollDemoStatus.background = "three";

    return {
      THREE,
      renderer,
      scene,
      camera,
      rig,
      core,
      coreMaterial,
      edgeMaterial,
      inner,
      particleField,
      particleGeometry,
      particleBasePositions: particlePositions.positions,
      particleOffsets: particlePositions.offsets,
      particleMaterial,
      grid,
      keyLight,
    };
  } catch (error) {
    document.body.classList.remove("has-webgl-scene");
    window.__scrollDemoStatus.three = false;
    window.__scrollDemoStatus.background = "2d";
    return null;
  }
}

function resizeThreeScene() {
  if (!threeScene) {
    return;
  }

  threeScene.camera.aspect = viewportWidth / viewportHeight;
  threeScene.camera.updateProjectionMatrix();
  threeScene.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_LIMIT));
  threeScene.renderer.setSize(viewportWidth, viewportHeight, false);
}

function renderThreeScene(scrollValue) {
  const maxScroll = document.documentElement.scrollHeight - viewportHeight;
  const progress = maxScroll > 0 ? clamp(scrollValue / maxScroll, 0, 1) : 0;
  const chapterProgress = sections[activeIndex]
    ? getSectionProgress(sections[activeIndex], scrollValue)
    : 0;
  const time = performance.now() * 0.001;
  const travel = smoothstep(0.02, 0.98, progress);
  const sceneState = getSceneState(activeIndex, chapterProgress);
  window.__scrollDemoStatus.sceneState = sceneState.name;

  threeScene.camera.position.x = sceneState.cameraX + Math.sin(progress * Math.PI * 2) * 0.16;
  threeScene.camera.position.y = sceneState.cameraY + Math.sin(progress * Math.PI) * 0.12;
  threeScene.camera.position.z = sceneState.cameraZ - travel * 0.45;
  threeScene.camera.lookAt(0, 0, -1.6);

  threeScene.rig.position.x = sceneState.rigX;
  threeScene.rig.position.y = sceneState.rigY + Math.sin(chapterProgress * Math.PI) * 0.18;
  threeScene.rig.position.z = sceneState.rigZ - travel * 0.28;
  threeScene.rig.scale.setScalar(sceneState.rigScale);
  threeScene.rig.rotation.x = progress * 0.72 + time * 0.05;
  threeScene.rig.rotation.y = progress * 1.45 + time * 0.08;
  threeScene.rig.rotation.z = Math.sin(progress * Math.PI * 2) * 0.18;

  threeScene.inner.rotation.x = -progress * 2.4 + time * 0.18;
  threeScene.inner.rotation.y = progress * 2.1 + time * 0.12;

  threeScene.particleField.rotation.y = progress * 0.4 + time * 0.015;
  threeScene.particleField.position.y = -progress * 0.9;

  updateThreeParticles(sceneState, time);

  threeScene.coreMaterial.color.setHSL(sceneState.hue, 0.84, 0.58);
  threeScene.coreMaterial.emissive.setHSL(sceneState.hue, 0.8, 0.16);
  threeScene.coreMaterial.opacity = sceneState.coreOpacity + Math.sin(chapterProgress * Math.PI) * 0.08;
  threeScene.edgeMaterial.opacity = sceneState.edgeOpacity;
  threeScene.particleMaterial.opacity = sceneState.particleOpacity;
  threeScene.grid.material.opacity = sceneState.gridOpacity;

  threeScene.keyLight.position.x = Math.sin(progress * Math.PI * 2) * 4;
  threeScene.keyLight.position.z = 3 - progress * 5;
  threeScene.keyLight.intensity = sceneState.lightIntensity;

  threeScene.renderer.render(threeScene.scene, threeScene.camera);
}

function updateThreeParticles(sceneState, time) {
  const positions = threeScene.particleGeometry.attributes.position.array;
  const base = threeScene.particleBasePositions;
  const offsets = threeScene.particleOffsets;

  for (let index = 0; index < THREE_PARTICLE_COUNT; index += 1) {
    const stride = index * 3;
    const pulse = Math.sin(time * 0.7 + index * 0.17) * 0.08;
    const spread = sceneState.particleSpread + pulse;

    positions[stride] = base[stride] + offsets[stride] * spread;
    positions[stride + 1] = base[stride + 1] + offsets[stride + 1] * spread;
    positions[stride + 2] = base[stride + 2] + offsets[stride + 2] * spread;
  }

  threeScene.particleGeometry.attributes.position.needsUpdate = true;
}

function drawGrid(progress) {
  const horizon = viewportHeight * (0.64 + progress * 0.08);
  const offset = (progress * 900) % 80;

  context.save();
  context.strokeStyle = "rgba(220, 231, 255, 0.075)";
  context.lineWidth = 1;

  for (let x = -viewportWidth; x < viewportWidth * 2; x += 80) {
    context.beginPath();
    context.moveTo(viewportWidth / 2, horizon);
    context.lineTo(x + offset, viewportHeight + 80);
    context.stroke();
  }

  for (let y = 0; y < 18; y += 1) {
    const eased = y / 18;
    const lineY = horizon + eased * eased * viewportHeight * 0.7;
    context.beginPath();
    context.moveTo(0, lineY);
    context.lineTo(viewportWidth, lineY);
    context.stroke();
  }

  context.restore();
}

function drawMonolith(progress) {
  const size = Math.min(viewportWidth, viewportHeight) * 0.34;
  const x = viewportWidth * (0.58 + Math.sin(progress * Math.PI * 2) * 0.045);
  const y = viewportHeight * (0.43 - progress * 0.05);
  const rotation = progress * 0.42;

  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.strokeStyle = "rgba(220, 231, 255, 0.26)";
  context.fillStyle = "rgba(220, 231, 255, 0.035)";
  context.lineWidth = 1;
  context.strokeRect(-size / 2, -size / 2, size, size);
  context.fillRect(-size / 2, -size / 2, size, size);

  context.strokeStyle = "rgba(114, 212, 255, 0.42)";
  context.strokeRect(-size * 0.31, -size * 0.31, size * 0.62, size * 0.62);

  context.fillStyle = "rgba(220, 231, 255, 0.84)";
  const dot = Math.max(4, size * 0.025);
  context.fillRect(-dot / 2, -dot / 2, dot, dot);
  context.restore();
}

function drawParticles(scrollValue, progress) {
  context.save();

  particles.forEach((particle, index) => {
    const x = (particle.x + Math.sin(progress * 8 + index) * 24) % viewportWidth;
    const y = (particle.y + scrollValue * particle.drift * 0.08) % viewportHeight;

    context.fillStyle = `rgba(220, 231, 255, ${particle.alpha})`;
    context.fillRect(x, y, particle.r, particle.r);
  });

  context.restore();
}

function updateProgress(scrollValue) {
  const maxScroll = document.documentElement.scrollHeight - viewportHeight;
  const pageProgress = maxScroll > 0 ? clamp(scrollValue / maxScroll, 0, 1) : 0;
  const percent = Math.round(pageProgress * 100);

  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
}

function setupLenis() {
  if (!window.Lenis || HAS_REDUCED_MOTION) {
    return null;
  }

  const instance = new window.Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.35,
  });
  window.__scrollDemoStatus.lenis = true;

  instance.on("scroll", () => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.update();
    }
  });

  return instance;
}

function setupScrollTimelines() {
  if (!window.gsap || !window.ScrollTrigger || HAS_REDUCED_MOTION) {
    window.__scrollDemoStatus.gsap = false;
    return false;
  }

  const { gsap } = window;
  gsap.registerPlugin(window.ScrollTrigger);

  sections.forEach((section, index) => {
    const card = section.querySelector(".chapter-card");
    const meta = section.querySelector(".chapter-meta");
    const label = section.querySelector(".mono-label");
    const body = section.querySelector(".chapter-card p:not(.mono-label)");
    const chars = section.querySelectorAll(".chapter-card h2 .char");

    gsap.set(card, {
      "--card-o": 0,
      "--card-y": "4rem",
      "--card-scale": 0.965,
    });
    gsap.set(meta, {
      "--meta-o": 0.24,
      "--meta-y": "3rem",
    });
    gsap.set(chars, {
      "--char-o": 0,
      "--char-y": "1.4rem",
    });
    gsap.set([label, body], {
      autoAlpha: 0,
      y: 24,
    });

    const timeline = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: {
        trigger: section,
        start: "top 72%",
        end: "bottom 28%",
        scrub: 0.55,
        onEnter: () => setActiveIndex(index),
        onEnterBack: () => setActiveIndex(index),
        onUpdate: (self) => {
          section.style.setProperty("--section-progress", self.progress.toFixed(4));
        },
      },
    });

    timeline
      .to(card, {
        "--card-o": 1,
        "--card-y": "0rem",
        "--card-scale": 1,
        duration: 0.22,
      }, 0.06)
      .to(meta, {
        "--meta-o": 0.9,
        "--meta-y": "0rem",
        duration: 0.18,
      }, 0.04)
      .to(label, {
        autoAlpha: 1,
        y: 0,
        duration: 0.16,
      }, 0.1)
      .to(chars, {
        "--char-o": 1,
        "--char-y": "0rem",
        duration: 0.28,
        stagger: {
          amount: 0.18,
          from: "random",
        },
      }, 0.13)
      .to(body, {
        autoAlpha: 1,
        y: 0,
        duration: 0.2,
      }, 0.22)
      .to({}, { duration: 0.36 })
      .to([label, body], {
        autoAlpha: 0,
        y: -24,
        duration: 0.18,
        ease: "power2.in",
      }, 0.76)
      .to(chars, {
        "--char-o": 0,
        "--char-y": "-1.1rem",
        duration: 0.2,
        stagger: {
          amount: 0.08,
          from: "end",
        },
        ease: "power2.in",
      }, 0.77)
      .to(card, {
        "--card-o": 0,
        "--card-y": "-3rem",
        "--card-scale": 0.985,
        duration: 0.2,
        ease: "power2.in",
      }, 0.78)
      .to(meta, {
        "--meta-o": 0.2,
        "--meta-y": "-3rem",
        duration: 0.18,
        ease: "power2.in",
      }, 0.8);
  });

  window.ScrollTrigger.refresh();
  window.__scrollDemoStatus.gsap = true;
  return true;
}

function tick() {
  targetScroll = window.scrollY;
  easedScroll += (targetScroll - easedScroll) * SMOOTHING;

  if (!isGsapMode) {
    updateCards(easedScroll);
  }

  updateProgress(easedScroll);
  drawScene(easedScroll);

  requestAnimationFrame(tick);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.jump);
    const section = sections[index];

    if (!section) {
      return;
    }

    if (lenis) {
      lenis.scrollTo(section, { offset: 0, duration: 1.2 });
      return;
    }

    section.scrollIntoView({ behavior: HAS_REDUCED_MOTION ? "auto" : "smooth", block: "start" });
  });
});

window.addEventListener("resize", resizeCanvas);
splitHeadlines();
resizeCanvas();
threeScene = setupThreeScene();
resizeThreeScene();
lenis = setupLenis();
isGsapMode = setupScrollTimelines();

if (lenis && window.gsap) {
  window.gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  window.gsap.ticker.lagSmoothing(0);
}

tick();
