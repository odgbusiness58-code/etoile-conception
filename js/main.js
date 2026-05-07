/* =====================================================
   ETOILE CONCEPTION — MAIN SCRIPT
   Three.js 3D Particles + GSAP Scroll Animations
   ===================================================== */

'use strict';

// ---- GSAP SCROLLTRIGGER REGISTRATION ----
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

/* ============================================================
   THREE.JS HERO SCENE
   ============================================================ */
(function initHeroScene() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.025);

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.offsetWidth / canvas.offsetHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.setClearColor(0x050505, 1);

  /* ---- PARTICLES ---- */
  const PARTICLE_COUNT = 1800;

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors    = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Spherical distribution
    const radius = 3 + Math.random() * 12;
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);

    positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    sizes[i] = 0.3 + Math.random() * 2.5;

    // 65% gold, 35% warm white
    if (Math.random() < 0.65) {
      colors[i * 3]     = 0.79;
      colors[i * 3 + 1] = 0.64;
      colors[i * 3 + 2] = 0.15;
    } else {
      colors[i * 3]     = 0.95;
      colors[i * 3 + 1] = 0.90;
      colors[i * 3 + 2] = 0.78;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3));
  geometry.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1));

  const vertexShader = `
    attribute vec3 aColor;
    attribute float aSize;
    varying vec3 vColor;

    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (280.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv);

      if (d > 0.5) discard;

      float glow = exp(-d * 5.0) * 0.7;
      float core = 1.0 - smoothstep(0.0, 0.25, d);
      float alpha = (glow + core * 0.3) * 0.9;

      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(geometry, particleMaterial);
  scene.add(particles);

  /* ---- TORUS RINGS ---- */
  const ringData = [
    { r: 4.0, tube: 0.012, pos: [0,  0.5, -2], rot: [0.4, 0.2, 0],   speed: 0.0015, opacity: 0.18 },
    { r: 6.5, tube: 0.008, pos: [1, -1.0, -4], rot: [0.7, 0.5, 0.3], speed: 0.0012, opacity: 0.10 },
    { r: 2.5, tube: 0.015, pos: [-2, 1.5, -1], rot: [1.2, 0.0, 0.8], speed: 0.0022, opacity: 0.14 },
    { r: 8.0, tube: 0.006, pos: [0, 0, -8],    rot: [0.1, 1.1, 0.4], speed: 0.0008, opacity: 0.07 },
  ];

  const rings = ringData.map(d => {
    const geo  = new THREE.TorusGeometry(d.r, d.tube, 32, 100);
    const mat  = new THREE.MeshBasicMaterial({ color: 0xc9a227, transparent: true, opacity: d.opacity });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...d.pos);
    mesh.rotation.set(...d.rot);
    mesh.userData.speed = d.speed;
    scene.add(mesh);
    return mesh;
  });

  /* ---- MOUSE TRACKING ---- */
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ---- SCROLL TRACKING ---- */
  let scrollY = 0;
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  });

  /* ---- ANIMATION LOOP ---- */
  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    frame++;

    // Smooth mouse lerp
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    // Camera follow mouse
    camera.position.x = targetX * 0.8;
    camera.position.y = -targetY * 0.5;

    // Camera pull back on scroll
    const heroHeight = window.innerHeight;
    const scrollRatio = Math.min(scrollY / heroHeight, 1);
    camera.position.z = 6 + scrollRatio * 3;

    // Rotate particles slowly + mouse influence
    particles.rotation.y += 0.0004 + targetX * 0.0002;
    particles.rotation.x += 0.0001 - targetY * 0.0001;

    // Rotate rings at different speeds
    rings.forEach((ring, i) => {
      ring.rotation.z += ring.userData.speed;
      ring.rotation.y += ring.userData.speed * 0.7;
      if (i % 2 === 0) ring.rotation.x += ring.userData.speed * 0.4;
    });

    renderer.render(scene, camera);
  }

  animate();

  /* ---- RESIZE HANDLER ---- */
  window.addEventListener('resize', () => {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();

/* ============================================================
   LOADER
   ============================================================ */
(function initLoader() {
  const loader   = document.getElementById('loader');
  const progress = document.querySelector('.loader-progress');
  if (!loader) return;

  let width = 0;
  const interval = setInterval(() => {
    width += Math.random() * 18 + 6;
    if (width >= 100) {
      width = 100;
      clearInterval(interval);
    }
    if (progress) progress.style.width = width + '%';
  }, 80);

  window.addEventListener('load', () => {
    clearInterval(interval);
    if (progress) progress.style.width = '100%';

    setTimeout(() => {
      if (!window.gsap) {
        loader.style.display = 'none';
        heroReveal();
        return;
      }
      gsap.to(loader, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          loader.style.display = 'none';
          heroReveal();
        }
      });
    }, 400);
  });
})();

/* ============================================================
   HERO REVEAL (GSAP)
   ============================================================ */
function heroReveal() {
  if (!window.gsap) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to('.hero-eyebrow', {
      opacity: 1,
      y: 0,
      duration: 1.0,
      from: { y: 20 }
    })
    .to('.hero-title .line', {
      opacity: 1,
      y: '0%',
      duration: 1.2,
      stagger: 0.18,
    }, '-=0.5')
    .to('.hero-subtitle', {
      opacity: 1,
      y: 0,
      duration: 1.0,
      from: { y: 20 }
    }, '-=0.7')
    .to('.hero-buttons', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      from: { y: 16 }
    }, '-=0.6')
    .to('.hero-side', {
      opacity: 1,
      x: 0,
      duration: 1.0,
      from: { x: 30 }
    }, '-=0.8');
}

/* ============================================================
   NAVBAR SCROLL STATE
   ============================================================ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
(function initCursor() {
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let dotX = 0, dotY = 0;
  let ringX = 0, ringY = 0;
  let mx = 0, my = 0;

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  function tickCursor() {
    dotX = mx;
    dotY = my;
    ringX += (mx - ringX) * 0.12;
    ringY += (my - ringY) * 0.12;

    dot.style.left  = dotX  + 'px';
    dot.style.top   = dotY  + 'px';
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';

    requestAnimationFrame(tickCursor);
  }
  tickCursor();

  document.querySelectorAll('a, button, [data-tilt], .gallery-item, .filter-btn').forEach(el => {
    el.addEventListener('mouseenter', () => {
      dot.style.transform  = 'translate(-50%, -50%) scale(1.8)';
      ring.style.transform = 'translate(-50%, -50%) scale(1.5)';
      ring.style.borderColor = 'var(--gold)';
    });
    el.addEventListener('mouseleave', () => {
      dot.style.transform  = 'translate(-50%, -50%) scale(1)';
      ring.style.transform = 'translate(-50%, -50%) scale(1)';
      ring.style.borderColor = 'rgba(201,162,39,0.5)';
    });
  });
})();

/* ============================================================
   GSAP SCROLL ANIMATIONS
   ============================================================ */
(function initScrollAnimations() {
  if (!window.gsap || !window.ScrollTrigger) return;

  /* Section eyebrows + titles */
  gsap.utils.toArray('.section-eyebrow').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out',
    });
  });

  gsap.utils.toArray('.section-title').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      opacity: 0,
      y: 40,
      rotateX: 12,
      transformOrigin: 'top center',
      duration: 1.1,
      ease: 'power3.out',
    });
  });

  /* Gallery items: 3D entrance */
  gsap.utils.toArray('.gallery-item').forEach((item, i) => {
    const dir = i % 2 === 0 ? 1 : -1;
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 90%' },
      opacity: 0,
      rotateY: dir * 15,
      scale: 0.92,
      z: -60,
      transformOrigin: 'center center',
      duration: 1.0,
      delay: (i % 3) * 0.1,
      ease: 'power3.out',
    });
  });

  /* About images */
  const aboutMain = document.querySelector('.about-img-main');
  if (aboutMain) {
    gsap.from(aboutMain, {
      scrollTrigger: { trigger: aboutMain, start: 'top 85%' },
      opacity: 0,
      x: -60,
      duration: 1.2,
      ease: 'power3.out',
    });
  }

  const aboutSec = document.querySelector('.about-img-secondary');
  if (aboutSec) {
    gsap.from(aboutSec, {
      scrollTrigger: { trigger: aboutSec, start: 'top 90%' },
      opacity: 0,
      x: 60,
      y: 40,
      duration: 1.2,
      delay: 0.2,
      ease: 'power3.out',
    });
  }

  const aboutBadge = document.querySelector('.about-badge');
  if (aboutBadge) {
    gsap.from(aboutBadge, {
      scrollTrigger: { trigger: aboutBadge, start: 'top 90%' },
      opacity: 0,
      scale: 0.7,
      duration: 0.8,
      delay: 0.4,
      ease: 'back.out(1.7)',
    });
  }

  const aboutContent = document.querySelector('.about-content');
  if (aboutContent) {
    gsap.from(aboutContent, {
      scrollTrigger: { trigger: aboutContent, start: 'top 85%' },
      opacity: 0,
      x: 60,
      duration: 1.2,
      ease: 'power3.out',
    });
  }

  /* Service cards: rotateX entrance */
  gsap.utils.toArray('.service-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 90%' },
      opacity: 0,
      y: 60,
      rotateX: 18,
      transformOrigin: 'top center',
      duration: 0.9,
      delay: i * 0.08,
      ease: 'power3.out',
    });
  });

  /* Testimonials: rotate in */
  gsap.utils.toArray('.testimonial-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 90%' },
      opacity: 0,
      y: 40,
      rotate: i % 2 === 0 ? -2 : 2,
      scale: 0.95,
      duration: 0.9,
      delay: i * 0.12,
      ease: 'power3.out',
    });
  });

  /* Contact: slide from sides */
  const contactInfo = document.querySelector('.contact-info');
  if (contactInfo) {
    gsap.from(contactInfo, {
      scrollTrigger: { trigger: contactInfo, start: 'top 85%' },
      opacity: 0,
      x: -60,
      duration: 1.1,
      ease: 'power3.out',
    });
  }

  const contactFormWrap = document.querySelector('.contact-form-wrap');
  if (contactFormWrap) {
    gsap.from(contactFormWrap, {
      scrollTrigger: { trigger: contactFormWrap, start: 'top 85%' },
      opacity: 0,
      x: 60,
      duration: 1.1,
      ease: 'power3.out',
    });
  }

  /* Reservation: slide */
  const resaInfo = document.querySelector('.resa-info');
  if (resaInfo) {
    gsap.from(resaInfo, {
      scrollTrigger: { trigger: resaInfo, start: 'top 85%' },
      opacity: 0,
      x: -50,
      duration: 1.0,
      ease: 'power3.out',
    });
  }

  const resaFormWrap = document.querySelector('.resa-form-wrap');
  if (resaFormWrap) {
    gsap.from(resaFormWrap, {
      scrollTrigger: { trigger: resaFormWrap, start: 'top 85%' },
      opacity: 0,
      x: 50,
      duration: 1.0,
      ease: 'power3.out',
    });
  }

  /* Reservation steps */
  gsap.utils.toArray('.resa-step').forEach((step, i) => {
    gsap.from(step, {
      scrollTrigger: { trigger: step, start: 'top 90%' },
      opacity: 0,
      x: -30,
      duration: 0.7,
      delay: i * 0.1,
      ease: 'power3.out',
    });
  });

  /* Footer stagger */
  gsap.from('.footer-inner > *', {
    scrollTrigger: { trigger: '.footer', start: 'top 95%' },
    opacity: 0,
    y: 30,
    stagger: 0.15,
    duration: 0.8,
    ease: 'power3.out',
  });

  gsap.from('.footer-bottom p', {
    scrollTrigger: { trigger: '.footer-bottom', start: 'top 98%' },
    opacity: 0,
    y: 10,
    duration: 0.6,
    ease: 'power2.out',
  });

})();

/* ============================================================
   STATS COUNTER
   ============================================================ */
(function initStatsCounter() {
  if (!window.ScrollTrigger) return;

  const counters = document.querySelectorAll('.astat-num[data-count]');
  counters.forEach(el => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = Math.floor(current);
        }, 25);
      }
    });
  });
})();

/* ============================================================
   3D TILT ON [data-tilt] ELEMENTS
   ============================================================ */
(function initTilt() {
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect   = el.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = (e.clientX - cx) / (rect.width  / 2);
      const dy     = (e.clientY - cy) / (rect.height / 2);
      const rotX   = -dy * 8;
      const rotY   = dx  * 8;

      el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
      el.style.transition = 'transform 0.1s ease';

      // update CSS vars for glow
      const px = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const py = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      el.style.setProperty('--mx', px);
      el.style.setProperty('--my', py);
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform  = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      el.style.transition = 'transform 0.6s ease';
    });
  });
})();

/* ============================================================
   GALLERY 3D TILT
   ============================================================ */
(function initGalleryTilt() {
  document.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
      const dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
      card.style.transform    = `perspective(600px) rotateX(${-dy * 5}deg) rotateY(${dx * 5}deg)`;
      card.style.transition   = 'transform 0.1s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = 'perspective(600px) rotateX(0) rotateY(0)';
      card.style.transition = 'transform 0.5s ease';
    });
  });
})();

/* ============================================================
   GALLERY PARALLAX
   ============================================================ */
(function initGalleryParallax() {
  document.querySelectorAll('.gallery-card').forEach(card => {
    const img = card.querySelector('img');
    if (!img) return;

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const dx   = (e.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2);
      const dy   = (e.clientY - rect.top   - rect.height / 2) / (rect.height / 2);
      img.style.transform = `scale(1.1) translate(${dx * -8}px, ${dy * -8}px)`;
    });

    card.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1) translate(0, 0)';
    });
  });
})();

/* ============================================================
   GALLERY FILTER
   ============================================================ */
(function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      galleryItems.forEach((item, i) => {
        const cat = item.getAttribute('data-category');
        const show = filter === 'all' || cat === filter;

        if (window.gsap) {
          if (show) {
            item.classList.remove('hidden');
            gsap.fromTo(item,
              { opacity: 0, scale: 0.92, y: 20 },
              { opacity: 1, scale: 1, y: 0, duration: 0.5, delay: (i % 4) * 0.06, ease: 'power3.out' }
            );
          } else {
            gsap.to(item, {
              opacity: 0,
              scale: 0.92,
              duration: 0.3,
              ease: 'power2.in',
              onComplete: () => item.classList.add('hidden'),
            });
          }
        } else {
          item.classList.toggle('hidden', !show);
        }
      });
    });
  });
})();

/* ============================================================
   LIGHTBOX
   ============================================================ */
(function initLightbox() {
  const lightbox    = document.getElementById('lightbox');
  const lbClose     = document.getElementById('lightboxClose');
  const lbPrev      = document.getElementById('lightboxPrev');
  const lbNext      = document.getElementById('lightboxNext');
  const lbImg       = document.getElementById('lightboxImg');
  const lbCat       = document.getElementById('lbCat');
  const lbTitle     = document.getElementById('lbTitle');
  const lbLoc       = document.getElementById('lbLoc');
  const lbDesc      = document.getElementById('lbDesc');
  const lbPrice     = document.getElementById('lbPrice');
  const lbWhatsApp  = document.getElementById('lbWhatsApp');

  if (!lightbox) return;

  const items = Array.from(document.querySelectorAll('.gallery-item[data-src]'));
  let currentIndex = -1;

  function openLightbox(index) {
    if (index < 0 || index >= items.length) return;
    currentIndex = index;

    const item = items[index];
    const src      = item.getAttribute('data-src')      || '';
    const title    = item.getAttribute('data-title')    || '';
    const cat      = item.getAttribute('data-cat-label')|| '';
    const loc      = item.getAttribute('data-loc')      || '';
    const desc     = item.getAttribute('data-desc')     || '';
    const price    = item.getAttribute('data-price')    || '';

    lbImg.src       = src;
    lbImg.alt       = title;
    lbCat.textContent   = cat;
    lbTitle.textContent = title;
    lbLoc.textContent   = '★ ' + loc;
    lbDesc.textContent  = desc;
    lbPrice.textContent = price;

    const waMsg = encodeURIComponent('Bonjour, je suis intéressé(e) par le service : ' + cat + ' — ' + title);
    lbWhatsApp.href = 'https://wa.me/22667233079?text=' + waMsg;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 400);
  }

  function prevItem() {
    const newIndex = (currentIndex - 1 + items.length) % items.length;
    openLightbox(newIndex);
  }

  function nextItem() {
    const newIndex = (currentIndex + 1) % items.length;
    openLightbox(newIndex);
  }

  // Open on gallery item click
  items.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
  });

  // Close button
  if (lbClose) lbClose.addEventListener('click', closeLightbox);

  // Prev / Next
  if (lbPrev) lbPrev.addEventListener('click', e => { e.stopPropagation(); prevItem(); });
  if (lbNext) lbNext.addEventListener('click', e => { e.stopPropagation(); nextItem(); });

  // Overlay click to close
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   prevItem();
    if (e.key === 'ArrowRight')  nextItem();
  });
})();

/* ============================================================
   MOBILE MENU
   ============================================================ */
(function initMobileMenu() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMenu);
  if (mobileClose) mobileClose.addEventListener('click', closeMenu);

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.querySelector('.mobile-wa')?.addEventListener('click', closeMenu);
})();

/* ============================================================
   SMOOTH SCROLL
   ============================================================ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (href === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
})();

/* ============================================================
   ACTIVE NAV SECTION (IntersectionObserver)
   ============================================================ */
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
})();

/* ============================================================
   SERVICE CARD GLOW (CSS VARS)
   ============================================================ */
(function initServiceGlow() {
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const my = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.setProperty('--mx', mx);
      card.style.setProperty('--my', my);
    });
  });
})();

/* ============================================================
   RESERVATION FORM
   ============================================================ */
(function initReservationForm() {
  const form = document.getElementById('reservationForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const nom      = form.querySelector('[name="nom"]')?.value?.trim()     || '';
    const tel      = form.querySelector('[name="tel"]')?.value?.trim()     || '';
    const service  = form.querySelector('[name="service"]')?.value         || '';
    const date     = form.querySelector('[name="date"]')?.value            || '';
    const heure    = form.querySelector('[name="heure"]')?.value           || '';
    const message  = form.querySelector('[name="message"]')?.value?.trim() || '';

    if (!nom || !tel || !service || !date) {
      alert('Veuillez remplir tous les champs obligatoires (*).');
      return;
    }

    const lines = [
      '★ Nouvelle réservation — Etoile Conception ★',
      '',
      'Nom : ' + nom,
      'Téléphone : ' + tel,
      'Service : ' + service,
      'Date souhaitée : ' + date,
      'Heure : ' + heure,
    ];
    if (message) lines.push('Message : ' + message);

    const waText  = encodeURIComponent(lines.join('\n'));
    const waURL   = 'https://wa.me/22667233079?text=' + waText;

    const btn = form.querySelector('.form-submit');
    const originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.textContent = '★ Envoi en cours...';
      btn.disabled = true;
    }

    setTimeout(() => {
      window.open(waURL, '_blank');
      if (btn) {
        btn.textContent = '✓ Réservation envoyée !';
        btn.style.background = '#25d366';
      }
      setTimeout(() => {
        form.reset();
        if (btn) {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }
      }, 4000);
    }, 600);
  });
})();

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
(function initFAQ() {
  const questions = document.querySelectorAll('.faq-question');
  if (!questions.length) return;

  questions.forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const answer = btn.nextElementSibling;

      questions.forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const a = b.nextElementSibling;
        if (a) a.classList.remove('open');
      });

      if (!expanded) {
        btn.setAttribute('aria-expanded', 'true');
        if (answer) answer.classList.add('open');
      }
    });
  });
})();

/* ============================================================
   NEW SECTIONS SCROLL ANIMATIONS
   ============================================================ */
(function initNewSectionAnimations() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.utils.toArray('.processus-step').forEach((step, i) => {
    gsap.from(step, {
      scrollTrigger: { trigger: step, start: 'top 88%' },
      opacity: 0,
      y: 50,
      duration: 0.8,
      delay: i * 0.12,
      ease: 'power3.out',
    });
  });

  gsap.utils.toArray('.tarif-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 88%' },
      opacity: 0,
      y: 60,
      scale: 0.95,
      duration: 0.9,
      delay: i * 0.15,
      ease: 'power3.out',
    });
  });

  gsap.utils.toArray('.faq-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 92%' },
      opacity: 0,
      x: -24,
      duration: 0.65,
      delay: i * 0.06,
      ease: 'power3.out',
    });
  });
})();

/* ============================================================
   CONTACT FORM
   ============================================================ */
(function initContactForm() {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('contactSuccess');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const nom     = form.querySelector('[name="nom"]')?.value?.trim()     || '';
    const tel     = form.querySelector('[name="tel"]')?.value?.trim()     || '';
    const message = form.querySelector('[name="message"]')?.value?.trim() || '';

    if (!nom || !tel || !message) {
      alert('Veuillez remplir les champs obligatoires (*).');
      return;
    }

    const btn = form.querySelector('.form-submit');
    if (btn) {
      btn.textContent = '★ Envoi...';
      btn.disabled = true;
    }

    setTimeout(() => {
      if (success) {
        success.style.display = 'block';
        if (window.gsap) {
          gsap.fromTo(success, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 });
        }
      }
      form.reset();
      if (btn) {
        btn.textContent = 'Envoyer le message';
        btn.disabled = false;
      }
      setTimeout(() => {
        if (success) {
          if (window.gsap) {
            gsap.to(success, { opacity: 0, duration: 0.4, onComplete: () => { success.style.display = 'none'; } });
          } else {
            success.style.display = 'none';
          }
        }
      }, 3500);
    }, 900);
  });
})();
