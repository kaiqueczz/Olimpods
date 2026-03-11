/* ============================================
   IGNITE — E-commerce Landing Page
   JavaScript — Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // 0. Vortex Particle Background (Canvas)
  // =========================================
  (function initVortexBackground() {
    const canvas = document.getElementById('wavyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- Simplex Noise (built-in) ---
    const F3 = 1.0 / 3.0, G3 = 1.0 / 6.0;
    const grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    function noise3D(xin, yin, zin) {
      let n0, n1, n2, n3;
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const X0 = i - t, Y0 = j - t, Z0 = k - t;
      const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
      else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }
      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      n0 = t0 < 0 ? 0 : (t0 *= t0, t0 * t0 * dot3(grad3[perm[ii + perm[jj + perm[kk]]] % 12], x0, y0, z0));
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      n1 = t1 < 0 ? 0 : (t1 *= t1, t1 * t1 * dot3(grad3[perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12], x1, y1, z1));
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      n2 = t2 < 0 ? 0 : (t2 *= t2, t2 * t2 * dot3(grad3[perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12], x2, y2, z2));
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      n3 = t3 < 0 ? 0 : (t3 *= t3, t3 * t3 * dot3(grad3[perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12], x3, y3, z3));
      return 32 * (n0 + n1 + n2 + n3);
    }

    // --- Vortex Config ---
    const PARTICLE_COUNT = 700;
    const PROP_COUNT = 9;   // x, y, vx, vy, life, ttl, speed, radius, hue
    const PROPS_LEN = PARTICLE_COUNT * PROP_COUNT;
    const RANGE_Y = 100;
    const BASE_TTL = 50;
    const RANGE_TTL = 150;
    const BASE_SPEED = 0.0;
    const RANGE_SPEED = 1.5;
    const BASE_RADIUS = 1;
    const RANGE_RADIUS = 2;
    const BASE_HUE = 0;     // pure red
    const RANGE_HUE = 10;   // tight red range
    const NOISE_STEPS = 3;
    const X_OFF = 0.00125;
    const Y_OFF = 0.00125;
    const Z_OFF = 0.0005;
    const BG_COLOR = '#000000';
    const TAU = 2 * Math.PI;

    let w, h, tick = 0;
    let center = [0, 0];
    let particleProps = new Float32Array(PROPS_LEN);

    const rand = (n) => n * Math.random();
    const randR = (n) => n - rand(2 * n);
    const fadeIO = (t, m) => { const hm = 0.5 * m; return Math.abs(((t + hm) % m) - hm) / hm; };
    const lerp = (a, b, s) => (1 - s) * a + s * b;

    // --- Mouse Attraction ---
    const ATTRACT_RADIUS = 150;
    const ATTRACT_FORCE = 3;
    let mouse = { x: -9999, y: -9999 };
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }, { passive: true });
    canvas.addEventListener('pointerleave', () => {
      mouse.x = -9999; mouse.y = -9999;
    });

    function resize() {
      w = canvas.width = canvas.parentElement.offsetWidth;
      h = canvas.height = canvas.parentElement.offsetHeight;
      center = [0.5 * w, 0.35 * h];
    }

    function initParticle(i) {
      particleProps.set([
        rand(w),                          // x
        center[1] + randR(RANGE_Y),       // y
        0,                                // vx
        0,                                // vy
        0,                                // life
        BASE_TTL + rand(RANGE_TTL),       // ttl
        BASE_SPEED + rand(RANGE_SPEED),   // speed
        BASE_RADIUS + rand(RANGE_RADIUS), // radius
        BASE_HUE + rand(RANGE_HUE)       // hue
      ], i);
    }

    function initParticles() {
      for (let i = 0; i < PROPS_LEN; i += PROP_COUNT) initParticle(i);
    }

    function drawParticle(x, y, x2, y2, life, ttl, radius, hue) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeIO(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    }

    function updateParticle(i) {
      const i2 = 1 + i, i3 = 2 + i, i4 = 3 + i, i5 = 4 + i, i6 = 5 + i, i7 = 6 + i, i8 = 7 + i, i9 = 8 + i;
      const x = particleProps[i];
      const y = particleProps[i2];
      const n = noise3D(x * X_OFF, y * Y_OFF, tick * Z_OFF) * NOISE_STEPS * TAU;
      const vx = lerp(particleProps[i3], Math.cos(n), 0.5);
      const vy = lerp(particleProps[i4], Math.sin(n), 0.5);
      let life = particleProps[i5];
      const ttl = particleProps[i6];
      const spd = particleProps[i7];
      let fx = x + vx * spd;
      let fy = y + vy * spd;

      // Mouse attraction
      const mdx = mouse.x - fx;
      const mdy = mouse.y - fy;
      const md = Math.sqrt(mdx * mdx + mdy * mdy);
      if (md < ATTRACT_RADIUS && md > 0) {
        const force = (ATTRACT_RADIUS - md) / ATTRACT_RADIUS * ATTRACT_FORCE;
        fx += (mdx / md) * force;
        fy += (mdy / md) * force;
      }

      const rad = particleProps[i8];
      const hue = particleProps[i9];

      drawParticle(x, y, fx, fy, life, ttl, rad, hue);

      life++;
      particleProps[i] = fx;
      particleProps[i2] = fy;
      particleProps[i3] = vx;
      particleProps[i4] = vy;
      particleProps[i5] = life;

      if (fx > w || fx < 0 || fy > h || fy < 0 || life > ttl) initParticle(i);
    }

    function renderGlow() {
      ctx.save();
      ctx.filter = 'blur(8px) brightness(150%)';
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = 'blur(4px) brightness(150%)';
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    }

    function renderToScreen() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    }

    function render() {
      tick++;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < PROPS_LEN; i += PROP_COUNT) updateParticle(i);

      renderGlow();
      renderToScreen();
      requestAnimationFrame(render);
    }

    resize();
    window.addEventListener('resize', resize);
    initParticles();
    render();
  })();


  // =========================================
  // 0.5 Glowing Border Effect (Mouse Tracking)
  // =========================================
  (function initGlowCards() {
    const glowCards = document.querySelectorAll('.glow-card');
    const PROXIMITY = 64; // px — activation distance

    document.addEventListener('pointermove', (e) => {
      const mx = e.clientX;
      const my = e.clientY;

      glowCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const isNear =
          mx > rect.left - PROXIMITY &&
          mx < rect.right + PROXIMITY &&
          my > rect.top - PROXIMITY &&
          my < rect.bottom + PROXIMITY;

        if (isNear) {
          // Calculate % position relative to card
          const x = ((mx - rect.left) / rect.width) * 100;
          const y = ((my - rect.top) / rect.height) * 100;
          card.style.setProperty('--glow-x', `${x}%`);
          card.style.setProperty('--glow-y', `${y}%`);
          card.style.setProperty('--glow-opacity', '1');
        } else {
          card.style.setProperty('--glow-opacity', '0');
        }
      });
    }, { passive: true });
  })();

  // =========================================
  // 0.5.5 3D Perspective Testimonial Carousel
  // =========================================
  (function initTestimonialCarousel() {
    const container = document.querySelector('.carousel-container');
    const track = document.querySelector('.carousel-track');
    if (!container || !track) return;

    const slides = Array.from(track.children);
    let currentTranslate = 0;
    let currentIndex = 2; // Começa no 3º depoimento (Lucas Cavalcante)

    // Initial setup
    const updateSlideStyles = () => {
      slides.forEach((slide, index) => {
        if (index === currentIndex) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }

        const distance = Math.abs(index - currentIndex);
        slide.style.zIndex = 10 - distance;
      });
    };

    const setPositionByIndex = () => {
      const isMobile = window.innerWidth <= 768;
      const containerWidth = container.clientWidth; // Use clientWidth for more accuracy without borders
      const slideWidth = slides[0].offsetWidth;
      const gap = isMobile ? 24 : 40;

      // Center calculation: (Half Viewport) - (Half Slide) - (Previous Slides + Gaps)
      const offsetToCenter = (containerWidth / 2) - (slideWidth / 2);
      const accumulatedOffset = currentIndex * (slideWidth + gap);

      currentTranslate = offsetToCenter - accumulatedOffset;

      updateSlideStyles();
      track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      track.style.transform = `translateX(${currentTranslate}px)`;
    };

    const handleSwipe = () => {
      const swipeThreshold = 40; // More sensitive
      if (touchStartX - touchEndX > swipeThreshold) {
        if (currentIndex < slides.length - 1) {
          currentIndex++;
          setPositionByIndex();
        }
      } else if (touchEndX - touchStartX > swipeThreshold) {
        if (currentIndex > 0) {
          currentIndex--;
          setPositionByIndex();
        }
      }
    };

    // Initial position
    setTimeout(() => {
      setPositionByIndex();
      window.addEventListener('resize', setPositionByIndex);
    }, 100);

  })();

  // =========================================
  // 0.6 Gradual Spacing Animation
  // =========================================
  (function initGradualSpacing() {
    document.querySelectorAll('.gradual-spacing').forEach(el => {
      const text = el.getAttribute('data-text') || '';
      el.innerHTML = '';

      const accentWord = 'Olimpo!';
      const accentStart = text.indexOf(accentWord);
      const accentEnd = accentStart + accentWord.length;

      const words = text.split(' ');
      let charIndex = 0;

      words.forEach((word, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'gs-word';
        wordSpan.style.display = 'inline-flex';

        word.split('').forEach((char) => {
          const span = document.createElement('span');
          span.className = 'gs-char';
          if (accentStart !== -1 && charIndex >= accentStart && charIndex < accentEnd) {
            span.classList.add('gs-accent');
          }
          span.textContent = char;
          span.style.setProperty('--char-delay', `${charIndex * 0.04}s`);
          wordSpan.appendChild(span);
          charIndex++;
        });

        el.appendChild(wordSpan);
        charIndex++; // for the space

        if (wordIdx < words.length - 1) {
          const space = document.createElement('span');
          space.className = 'gs-space';
          el.appendChild(space);
        }
      });
    });
  })();

  // =========================================
  // 0.7 Brand Boxes Swoosh Delay
  // =========================================
  document.querySelectorAll('.brand-box').forEach(box => {
    const i = box.getAttribute('data-swoosh') || '0';
    box.style.setProperty('--swoosh-i', i);
  });

  // =========================================
  // 1. Scroll Reveal (Intersection Observer)
  // =========================================
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // =========================================
  // 1.5 Typewriter Animation
  // =========================================
  document.querySelectorAll('.typewriter').forEach(el => {
    const text = el.getAttribute('data-text') || '';
    el.textContent = '';
    const twObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          let i = 0;
          const interval = setInterval(() => {
            el.textContent += text[i];
            i++;
            if (i >= text.length) {
              clearInterval(interval);
            }
          }, 60);
          twObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    twObserver.observe(el);
  });


  // =========================================
  // 1.6 Counter Animation
  // =========================================
  const initCounters = () => {
    const counters = document.querySelectorAll('.counter');
    const DURATION = 2000; // 2 seconds

    const animateCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-target'));
      const decimals = parseInt(el.getAttribute('data-decimals') || '0');
      const startTime = performance.now();

      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / DURATION, 1);

        // "Fast start and decelerate" — Quartic Ease-Out
        // Reaches ~93% at progress 0.6 (1.2s / 2.0s)
        const easeOutProgress = 1 - Math.pow(1 - progress, 4);

        const currentVal = easeOutProgress * target;

        if (decimals > 0) {
          el.textContent = currentVal.toFixed(decimals);
        } else {
          el.textContent = Math.floor(currentVal).toLocaleString('pt-BR');
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          // Ensure it ends exactly at target
          if (decimals > 0) {
            el.textContent = target.toFixed(decimals);
          } else {
            el.textContent = target.toLocaleString('pt-BR');
          }
        }
      };

      requestAnimationFrame(update);
    };

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => counterObserver.observe(c));
  };

  initCounters();


  // =========================================
  // 2. Header Scroll Effect
  // =========================================
  const header = document.getElementById('header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (header) {
      if (currentScroll > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    lastScroll = currentScroll;
  }, { passive: true });


  // =========================================
  // 3. Dropdown Navigation
  // =========================================
  const navItems = document.querySelectorAll('.nav-item[data-dropdown]');

  navItems.forEach(item => {
    const toggleBtn = item.querySelector('.nav-link');

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = item.classList.contains('active');

      // Close all dropdowns
      navItems.forEach(i => i.classList.remove('active'));

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
  });

  // Prevent dropdown menu click from closing
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    if (menu) {
      menu.addEventListener('click', (e) => e.stopPropagation());
    }
  });


  // =========================================
  // 4. Premium Mobile Sidebar & Accordion
  // =========================================
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileSidebar = document.getElementById('mobileSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const closeSidebar = document.getElementById('closeSidebar');
  const accordionTrigger = document.querySelector('.accordion-trigger');
  const sidebarAccordion = document.getElementById('categoryAccordion');

  const toggleSidebar = (open = true) => {
    if (open) {
      mobileSidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      mobileSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => toggleSidebar(true));
  }

  if (closeSidebar) {
    closeSidebar.addEventListener('click', () => toggleSidebar(false));
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
  }

  // Accordion Logic
  if (accordionTrigger && sidebarAccordion) {
    accordionTrigger.addEventListener('click', () => {
      sidebarAccordion.classList.toggle('active');
    });
  }

  // Close sidebar and scroll to products when category is clicked
  document.querySelectorAll('.category-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const cat = link.getAttribute('data-cat');
      if (typeof renderProducts === 'function') {
        renderProducts(cat);
        // Update active tab button if exists
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.category === cat);
        });
      }
      toggleSidebar(false);
    });
  });


  // =========================================
  // 5. Dynamic Products & Category Filter
  // =========================================
  const productsGrid = document.getElementById('productsGrid');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const cartBtn = document.getElementById('cartBtn');
  let allProducts = [];

  // Cart State
  window.cart = JSON.parse(localStorage.getItem('ignite_cart')) || [];
  window.currentSaleType = localStorage.getItem('ignite_sale_type') || 'wholesale';

  window.toggleSaleType = (type) => {
    window.currentSaleType = type;
    localStorage.setItem('ignite_sale_type', type);

    // Update UI elements
    const toggle = document.getElementById('saleToggle');
    const infoText = document.getElementById('saleInfoText');
    const btns = document.querySelectorAll('.toggle-btn');

    if (toggle) toggle.setAttribute('data-active', type);
    if (infoText) {
      infoText.textContent = type === 'wholesale'
        ? 'Preços de Atacado (Mínimo 10 peças)'
        : 'A partir de 2 peças seu frete é grátis';
    }

    btns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Re-render only if we are on the page with the grid
    if (typeof renderProducts === 'function' && allProducts.length > 0) {
      renderProducts(document.querySelector('.tab-btn.active')?.dataset.category || 'all');
    }

    // Update cart items visibility/logic if needed
    updateCartUI();
  };

  // Attach toggle listeners
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleSaleType(btn.dataset.type));
  });

  window.updateCartUI = () => {
    localStorage.setItem('ignite_cart', JSON.stringify(window.cart));
    localStorage.setItem('ignite_sale_type', window.currentSaleType);
    updateCartBadge();
    renderSidebarCart();
  };

  window.quickAdd = (id, name, price, image) => {
    const saleType = window.currentSaleType || localStorage.getItem('ignite_sale_type') || 'wholesale';
    const basePrice = parseFloat(price);
    const finalPrice = (saleType === 'retail' ? basePrice * 1.4 : basePrice).toFixed(2);

    const existing = window.cart.find(item => item.id === id);
    if (existing) {
      existing.quantity += 1;
      existing.price = finalPrice;
    } else {
      window.cart.push({ id, name, price: finalPrice, image, quantity: 1, flavor: 'Mix Variado' });
    }
    updateCartUI();
    toggleCartSidebar(true);
  };

  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const totalItems = window.cart.reduce((sum, item) => sum + item.quantity, 0);
      const typeLabel = window.currentSaleType === 'wholesale' ? 'Atacado' : 'Varejo';
      badge.textContent = totalItems;
      badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
  }

  window.toggleCartSidebar = (open = true) => {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (!sidebar || !overlay) return;
    if (open) {
      sidebar.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderSidebarCart();
    } else {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  function renderSidebarCart() {
    const list = document.getElementById('sidebarCartItems');
    const totalEl = document.getElementById('sidebarTotal');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const checkoutBtn = document.getElementById('sidebarCheckoutBtn');
    const progressBar = document.querySelector('.minimum-progress-container');

    if (!list) return;

    // Progress Visibility Logic (Always run)
    if (window.currentSaleType === 'retail') {
      if (progressBar) progressBar.style.display = 'none';
      if (checkoutBtn) checkoutBtn.classList.remove('disabled');
    } else {
      if (progressBar) progressBar.style.display = 'block';
    }

    list.innerHTML = '';

    if (window.cart.length === 0) {
      list.innerHTML = '<div class="empty-cart-msg">Seu carrinho está vazio.</div>';
      if (totalEl) totalEl.textContent = 'R$ 0,00';
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.innerHTML = 'Faltam <b>10</b> itens para o mínimo';
      if (progressPercent) progressPercent.textContent = '0%';

      if (window.currentSaleType === 'wholesale') {
        if (checkoutBtn) checkoutBtn.classList.add('disabled');
      }
      return;
    }

    let subtotal = 0;
    let totalItems = 0;

    window.cart.forEach((item, index) => {
      const itemPrice = parseFloat(item.price);
      subtotal += itemPrice * item.quantity;
      totalItems += item.quantity;

      const itemCard = document.createElement('div');
      itemCard.className = 'cart-sidebar-item';
      itemCard.innerHTML = `
        <div class="sidebar-item-img">
          <img src="${item.image || 'assets/logo-ignite.png'}" alt="${item.name}">
        </div>
        <div class="sidebar-item-details">
          <span class="sidebar-item-name">${item.name}</span>
          <span class="sidebar-item-flavor">Sabor: ${item.flavor || 'N/A'}</span>
          <div class="sidebar-item-controls">
            <div class="sidebar-qty">
              <button class="sidebar-qty-btn" onclick="updateSidebarQty(${index}, -1)">-</button>
              <span class="sidebar-qty-val">${item.quantity}</span>
              <button class="sidebar-qty-btn" onclick="updateSidebarQty(${index}, 1)">+</button>
            </div>
            <span class="sidebar-item-price">R$ ${(itemPrice * item.quantity).toFixed(2).replace('.', ',')}</span>
            <button class="btn-remove-item" onclick="removeSidebarItem(${index})">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
      list.appendChild(itemCard);
    });

    if (totalEl) totalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    // Wholesale specific progress bar updates
    if (window.currentSaleType === 'wholesale') {
      const min = 10;
      const progress = Math.min((totalItems / min) * 100, 100);
      const remaining = Math.max(min - totalItems, 0);

      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressPercent) progressPercent.textContent = `${Math.floor(progress)}%`;

      if (remaining > 0) {
        if (progressText) progressText.innerHTML = `Faltam <b>${remaining}</b> itens para o mínimo`;
        if (checkoutBtn) checkoutBtn.classList.add('disabled');
      } else {
        if (progressText) progressText.innerHTML = `<span style="color: #00ff88;">✓ Mínimo atingido!</span>`;
        if (checkoutBtn) checkoutBtn.classList.remove('disabled');
      }
    }
  }

  // Exposed globally for sidebar buttons
  window.updateSidebarQty = (index, delta) => {
    window.cart[index].quantity += delta;
    if (window.cart[index].quantity < 1) {
      removeSidebarItem(index);
    } else {
      updateCartUI();
    }
  };

  window.removeSidebarItem = (index) => {
    window.cart.splice(index, 1);
    updateCartUI();
  };

  // Close handlers
  document.getElementById('closeCart')?.addEventListener('click', () => toggleCartSidebar(false));
  document.getElementById('cartOverlay')?.addEventListener('click', () => toggleCartSidebar(false));
  document.getElementById('cartBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCartSidebar(true);
  });

  function clearCart() {
    window.cart = [];
    updateCartUI();
  }

  async function loadProducts() {
    // Fallback data for local testing (CORS workaround)
    const fallbackProducts = [
      { "id": "ignite-v300-30000", "brand": "ignite", "name": "IGNITE V300 30.000 New Edition", "price": "98.00", "image": "Images Pods/Ignite_v250-removebg-preview.png" },
      { "id": "ignite-v250-25000", "brand": "ignite", "name": "IGNITE V250 25.000 Edition", "price": "90.00", "image": "Images Pods/Ignite_v250-removebg-preview.png" },
      { "id": "ignite-v55-5500", "brand": "ignite", "name": "IGNITE V55 5.500 SLIM EDITION", "price": "65.00", "image": "Images Pods/Ignite_v50-removebg-preview.png" },
      { "id": "lostmary-35000-edition", "brand": "lostmary", "name": "LOST MARY 35.000 EDITION", "price": "91.00", "retail_price": "123.00", "image": "Images Pods/Lost_35k-removebg-preview.png" },
      { "id": "elfbar-summer-40000", "brand": "elfbar", "name": "Elfbar Summer edition 40.000", "price": "111.00", "retail_price": "149.00", "image": "Images Pods/elfbar-summer-40k.png" },
      { "id": "elfbar-23000-edition", "brand": "elfbar", "name": "ELFBAR 23.000 EDITION", "price": "99.00", "retail_price": "133.00", "image": "Images Pods/elfbar-23k.png" }
    ];

    try {
      const response = await fetch('products.json');
      if (!response.ok) throw new Error();
      allProducts = await response.json();
      renderProducts('all');
    } catch (err) {
      console.warn('Usando dados de fallback (local test).');
      allProducts = fallbackProducts;
      renderProducts('all');
    }
  }

  // =========================================
  // 5.8 Newsletter Integration
  // =========================================
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = newsletterForm.querySelector('input[type="email"]');
      const submitBtn = newsletterForm.querySelector('button');
      const originalText = submitBtn.textContent;

      if (!emailInput.value) return;

      submitBtn.disabled = true;
      submitBtn.textContent = '...';

      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value })
        });

        const result = await response.json();

        if (result.status === 'success') {
          emailInput.value = '';
          submitBtn.style.backgroundColor = '#00ff88';
          submitBtn.textContent = '✓';
          alert(result.message);
          setTimeout(() => {
            submitBtn.style.backgroundColor = '';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          }, 3000);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        console.error('Erro na newsletter:', err);
        alert('Houve um erro ao se cadastrar. Tente novamente mais tarde.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  function renderProducts(category, query = '') {
    if (!productsGrid) return;
    productsGrid.innerHTML = '';

    const filtered = allProducts.filter(p => {
      const matchCategory = category === 'all' || p.brand.toLowerCase() === category.toLowerCase();
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.brand.toLowerCase().includes(query.toLowerCase());

      return matchCategory && matchQuery;
    });

    if (filtered.length === 0) {
      productsGrid.innerHTML = '<p class="no-results">Nenhum produto encontrado.</p>';
      return;
    }

    filtered.forEach((p, index) => {
      const card = document.createElement('div');
      card.className = `product-card glow-card animate-in`;
      card.dataset.category = p.brand;
      card.style.animationDelay = `${(index % 4) * 0.1}s`;
      if (index === 0) card.classList.add('active'); // First card active by default on mobile

      card.innerHTML = `
        <div class="product-image">
          <button class="product-wishlist" aria-label="Favoritar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-img-real" onerror="this.src='assets/logo-ignite.png'">` : `<div class="product-emoji">📦</div>`}
        </div>
        <div class="product-info">
          <div class="product-brand">${p.brand}</div>
          <h3 class="product-name">${p.name}</h3>
          <div class="product-footer">
            <div class="product-price">
              <span class="current">R$ ${((window.currentSaleType === 'retail' ? (p.retail_price ? parseFloat(p.retail_price) : parseFloat(p.price) * 1.4) : parseFloat(p.price)).toFixed(2)).replace('.', ',')}</span>
              ${window.currentSaleType === 'retail' ? `<span class="original">R$ ${(p.retail_price ? parseFloat(p.retail_price) * 1.3 : parseFloat(p.price) * 1.8).toFixed(2).replace('.', ',')}</span>` : ''}
            </div>
            <a href="product.html?id=${p.id}" class="buy-now-btn" aria-label="Ver mais">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      `;

      // Wishlist functionality for dynamic item
      const wishlistBtn = card.querySelector('.product-wishlist');
      wishlistBtn.addEventListener('click', (e) => {
        e.preventDefault();
        wishlistBtn.classList.toggle('active');
        const svg = wishlistBtn.querySelector('svg');
        if (wishlistBtn.classList.contains('active')) {
          svg.setAttribute('fill', 'var(--accent-primary)');
          svg.setAttribute('stroke', 'var(--accent-primary)');
        } else {
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
        }
      });

      productsGrid.appendChild(card);
    });

    // Re-init carousel on mobile after rendering
    if (window.innerWidth <= 768) {
      initProductCarousel();
    }
  }

  // =========================================
  // 5.5 Product Carousel Logic (Mobile)
  // =========================================
  function initProductCarousel() {
    const container = document.querySelector('.products-carousel-viewport');
    const track = document.querySelector('.products-grid');
    if (!container || !track || window.innerWidth > 768) return;

    const slides = Array.from(track.children);
    if (slides.length === 0) return;

    let currentIndex = 0;
    let currentTranslate = 0;
    let isDragging = false;
    let startX = 0;

    const updateSlideStyles = () => {
      slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentIndex);
      });
    };

    const setPositionByIndex = () => {
      const containerWidth = container.offsetWidth;
      const slideWidth = slides[0].offsetWidth;
      const gap = 20; // Corrected gap for products

      // Improved centering calculation
      const offsetToCenter = (containerWidth / 2) - (slideWidth / 2);
      const accumulatedOffset = currentIndex * (slideWidth + gap);

      currentTranslate = offsetToCenter - accumulatedOffset;

      track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      track.style.transform = `translateX(${currentTranslate}px)`;
      updateSlideStyles();
    };

    // Swipe Listeners
    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      track.style.transition = 'none';
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      const threshold = 40; // High sensitivity swoosh

      if (diff > threshold && currentIndex < slides.length - 1) {
        currentIndex++;
      } else if (diff < -threshold && currentIndex > 0) {
        currentIndex--;
      }

      setPositionByIndex();
    }, { passive: true });

    // Initial position
    setTimeout(setPositionByIndex, 50);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.category, searchBar.value);
    });
  });

  // =========================================
  // 6. Search Bar (Dynamic)
  // =========================================
  const searchBar = document.getElementById('searchBar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      const activeTab = document.querySelector('.tab-btn.active');
      const category = activeTab ? activeTab.dataset.category : 'all';
      renderProducts(category, e.target.value);
    });
  }

  loadProducts();


  // =========================================
  // 9. Smooth Scroll for Anchors
  // =========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const headerHeight = header.offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  // =========================================
  // 10. Footer Links & Actions
  // =========================================
  // =========================================
  // 10. Footer Links & Actions
  // =========================================
  document.getElementById('ordersLinkFooter')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (localStorage.getItem('isLoggedIn') === 'true') {
      window.toggleOrdersSidebar(true);
    } else {
      window.location.href = 'login.html';
    }
  });

  document.getElementById('cartLinkFooter')?.addEventListener('click', (e) => {
    e.preventDefault();
    cartBtn?.click();
  });

  document.getElementById('giftLinkFooter')?.addEventListener('click', (e) => {
    e.preventDefault();
    showGiftNotification();
  });

  document.getElementById('trackLinkFooter')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (localStorage.getItem('isLoggedIn') === 'true') {
      window.toggleOrdersSidebar(true);
    } else {
      window.location.href = 'login.html';
    }
  });



  // =========================================
  // 11. Action Buttons & Auth State
  // =========================================
  const ordersBtn = document.getElementById('ordersBtn');
  const accountBtn = document.getElementById('accountBtn');

  window.toggleOrdersSidebar = (open = true) => {
    const sidebar = document.getElementById('ordersSidebar');
    const overlay = document.getElementById('cartOverlay'); // Reuse cart overlay
    if (!sidebar || !overlay) return;

    if (open) {
      sidebar.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderOrders();
    } else {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  function renderOrders() {
    const list = document.getElementById('ordersContent');
    if (!list) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      list.innerHTML = `
        <div class="auth-required-msg">
          <p>Você precisa estar logado para ver seus pedidos.</p>
          <a href="login.html" class="btn-auth-redirect">Acessar Minha Conta</a>
        </div>
      `;
      return;
    }

    const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    if (orders.length === 0) {
      list.innerHTML = '<div class="empty-cart-msg">Você ainda não possui pedidos.</div>';
      return;
    }

    list.innerHTML = orders.map(order => `
      <a href="order-details.html?id=${order.id}" class="order-card-sidebar-wrapper">
        <div class="order-card-sidebar">
          <div class="order-header-sb">
            <span class="order-id">Pedido #${order.id}</span>
            <span class="order-date">${order.date}</span>
          </div>
          <div class="order-items-sb">
            ${order.items.map(item => `
              <div class="order-item-sb">
                <span>${item.qty}x ${item.name}</span>
                <span>R$ ${(item.price * item.qty).toFixed(2).replace('.', ',')}</span>
              </div>
            `).join('')}
          </div>
          <div class="order-total-sb">
            <span>Total</span>
            <span>R$ ${order.total.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="order-status-sb">Status: <span class="status-badge">${order.status || 'Em processamento'}</span></div>
          <div class="view-details-hint">Ver detalhes do pedido →</div>
        </div>
      </a>
    `).join('');
  }

  function checkAuthState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (ordersBtn) {
      ordersBtn.style.display = isLoggedIn ? 'flex' : 'none';
    }
    if (accountBtn) {
      // If logged in, maybe redirect to a profile or leave as is. 
      // User requested only the "Meus pedidos" visibility.
    }
  }

  // Handle Orders Toggle
  ordersBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.toggleOrdersSidebar(true);
  });

  document.getElementById('closeOrders')?.addEventListener('click', () => window.toggleOrdersSidebar(false));

  // Dummy Order Generation (Temporary for UI analysis)
  if (!localStorage.getItem('userOrders') || JSON.parse(localStorage.getItem('userOrders')).length === 0) {
    const dummyOrder = {
      id: 54321,
      date: new Date().toLocaleDateString('pt-BR'),
      customer: {
        name: "João Silva",
        email: "joao@exemplo.com",
        phone: "(11) 98888-7777"
      },
      shipping: {
        cep: "01001-000",
        address: "Praça da Sé",
        number: "100",
        neighborhood: "Sé",
        city: "São Paulo",
        state: "SP",
        cost: 0,
        method: "PAC (Grátis)"
      },
      items: [
        { name: "IGNITE V150 15.000", qty: 2, price: 85.00, flavor: "Watermelon Ice" },
        { name: "ELF BAR BC10000", qty: 1, price: 95.00, flavor: "Blue Razz Ice" }
      ],
      subtotal: 265.00,
      total: 265.00,
      status: 'Em processamento',
      agency: 'Agência Olimpo Pods - Centro'
    };
    localStorage.setItem('userOrders', JSON.stringify([dummyOrder]));
  }

  checkAuthState();
  // Ensure UI matches state on load
  setTimeout(() => {
    toggleSaleType(window.currentSaleType);
  }, 100);
  updateCartUI();

  // =========================================
  // 12. Premium Gift Modal System
  // =========================================
  const giftModal = document.getElementById('giftModal');
  const giftLinkFooter = document.getElementById('giftLinkFooter');
  const closeGiftModal = document.getElementById('closeGiftModal');

  window.toggleGiftModal = (show) => {
    if (show) giftModal?.classList.add('active');
    else giftModal?.classList.remove('active');
  };

  giftLinkFooter?.addEventListener('click', (e) => {
    e.preventDefault();
    window.toggleGiftModal(true);
  });

  closeGiftModal?.addEventListener('click', () => window.toggleGiftModal(false));

  // Close on overlay click
  giftModal?.addEventListener('click', (e) => {
    if (e.target === giftModal) window.toggleGiftModal(false);
  });
});
