/* ============================================
   IGNITE — E-commerce Landing Page
   JavaScript — Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Smooth Scroll (Lenis Removed for performance - Native Scroll Active)

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
    const PARTICLE_COUNT = 180; // Optimized from 350
    const PROP_COUNT = 9;   // x, y, vx, vy, life, ttl, speed, radius, hue
    const PROPS_LEN = PARTICLE_COUNT * PROP_COUNT;
    const RANGE_Y = 100;
    const BASE_TTL = 50;
    const RANGE_TTL = 150;
    const BASE_SPEED = 0.0;
    const RANGE_SPEED = 0.3; // Slightly slower for smoother feel
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
      const dpr = Math.min(window.devicePixelRatio, 1.5); // Cap DPR for performance
      w = canvas.width = canvas.parentElement.offsetWidth * dpr;
      h = canvas.height = canvas.parentElement.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      w = canvas.parentElement.offsetWidth;
      h = canvas.parentElement.offsetHeight;
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
      ctx.lineCap = 'round';
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeIO(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
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

    // Simplified glow: no expensive filters
    function drawGlowPass() {
      ctx.globalCompositeOperation = 'lighter';
    }

    function render() {
      tick++;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);
 
      ctx.globalCompositeOperation = 'lighter'; // Keep it for additive blending
      for (let i = 0; i < PROPS_LEN; i += PROP_COUNT) updateParticle(i);
 
      requestAnimationFrame(render);
    }

    resize();
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    const debouncedResize = debounce(resize, 150);
    window.addEventListener('resize', debouncedResize);
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
    const dotsContainer = document.getElementById('carouselDots');
    const btnPrev = document.getElementById('prevTestimonial');
    const btnNext = document.getElementById('nextTestimonial');

    if (!container || !track) return;

    const slides = Array.from(track.children);
    let currentIndex = 2; // Começa no 3º depoimento (Lucas Cavalcante)
    let autoPlayTimer = null;
    const AUTO_PLAY_DELAY = 5000;

    // Create dots
    if (dotsContainer) {
      dotsContainer.innerHTML = ''; // Clear if exists
      slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = `dot ${i === currentIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      });
    }

    const updateSlideStyles = () => {
      slides.forEach((slide, index) => {
        const distance = Math.abs(index - currentIndex);
        slide.classList.toggle('active', index === currentIndex);
        slide.style.zIndex = 10 - distance;

        // Dynamic opacity and scale based on distance
        if (index !== currentIndex) {
          slide.style.opacity = Math.max(0.3, 0.7 - (distance * 0.2));
          slide.style.transform = `scale(${Math.max(0.7, 0.9 - (distance * 0.05))})`;
        } else {
          slide.style.opacity = '1';
          slide.style.transform = 'scale(1) translateY(-15px)';
        }
      });

      // Note: Removed 'if (!list) return;' to allow sticky bar injection even on pages without a full sidebar list.
      if (dotsContainer) {
        Array.from(dotsContainer.children).forEach((dot, i) => {
          dot.classList.toggle('active', i === currentIndex);
        });
      }
    };

    const setPositionByIndex = () => {
      const isMobile = window.innerWidth <= 768;
      const containerWidth = container.clientWidth;
      const slideWidth = slides[0].offsetWidth;
      const gap = isMobile ? 24 : 40;

      const offsetToCenter = (containerWidth / 2) - (slideWidth / 2);
      const accumulatedOffset = currentIndex * (slideWidth + gap);
      const translateValue = offsetToCenter - accumulatedOffset;

      track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      track.style.transform = `translateX(${translateValue}px)`;
      updateSlideStyles();
    };

    const goToSlide = (index) => {
      currentIndex = index;
      setPositionByIndex();
      resetAutoPlay();
    };

    const nextSlide = () => {
      currentIndex = (currentIndex + 1) % slides.length;
      setPositionByIndex();
    };

    const prevSlide = () => {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      setPositionByIndex();
    };

    const startAutoPlay = () => {
      if (autoPlayTimer) return;
      autoPlayTimer = setInterval(nextSlide, AUTO_PLAY_DELAY);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    };

    const resetAutoPlay = () => {
      stopAutoPlay();
      startAutoPlay();
    };

    // Event Listeners
    if (btnPrev) btnPrev.addEventListener('click', () => { prevSlide(); resetAutoPlay(); });
    if (btnNext) btnNext.addEventListener('click', () => { nextSlide(); resetAutoPlay(); });

    container.addEventListener('mouseenter', stopAutoPlay);
    container.addEventListener('mouseleave', startAutoPlay);

    // Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoPlay();
    }, { passive: true });

    container.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
      startAutoPlay();
    }, { passive: true });

    const handleSwipe = () => {
      const swipeThreshold = 50;
      if (touchStartX - touchEndX > swipeThreshold) {
        nextSlide();
      } else if (touchEndX - touchStartX > swipeThreshold) {
        prevSlide();
      }
    };

    // Initial positioning
    setTimeout(() => {
      setPositionByIndex();
      startAutoPlay();
      window.addEventListener('resize', setPositionByIndex);
    }, 100);
  })();

  // =========================================
  // 0.5.8 IP Location Badge Logic
  // =========================================
  (async function initIPLocation() {
    const badge = document.getElementById('locationBadge');
    const text = document.getElementById('locationText');
    if (!badge || !text) return;

    try {
      const response = await fetch('/api/location');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      if (data.city && data.region_code) {
        text.textContent = `${data.city}-${data.region_code}`;
        badge.style.display = 'flex';
        // Delay slightly if needed to trigger the transition
        requestAnimationFrame(() => {
          badge.classList.add('animate-in');
        });
      }
    } catch (err) {
      console.warn('IP Location fetch failed:', err);
      // Keep hidden on error
    }
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
          // span.style.setProperty('--char-delay', `${charIndex * 0.04}s`); // Delay removed
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

  // Scroll Reveal Disabled for performance (content immediately visible)
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('animate-in'));

  // Typewriter Animation Disabled for performance
  document.querySelectorAll('.typewriter').forEach(el => {
    el.textContent = el.getAttribute('data-text') || '';
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
        : 'Varejo — Compre a partir de 2 peças';
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
      const totalItems = window.cart.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);

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
    // Select all instances of progress bars and messages
    const allFills = document.querySelectorAll('.upsell-progress-fill, #progressFill');
    const allMsgs = document.querySelectorAll('.upsell-message, #progressText, .upsell-progress-message');
    const allSavingsEls = document.querySelectorAll('#savingsValue, #savingsValueSticky, .sticky-savings-summary');
    const progressBar = document.querySelector('.minimum-progress-container');



    // Universal Update for all Progress Bars (Must run even if sidebar list is missing)
    let totalItemsValue = window.cart.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
    
    // Select bar elements again to ensure we catch dynamically injected ones
    const currentFills = document.querySelectorAll('.upsell-progress-fill, #progressFill');
    const currentMsgs = document.querySelectorAll('.upsell-message, #progressText, .upsell-progress-message');


    // Progress Visibility Logic (Always run)
    let stickyBar = document.getElementById('stickyUpsellBar');
    
    // Inject sticky bar if missing
    if (!stickyBar) {
      stickyBar = document.createElement('div');
      stickyBar.id = 'stickyUpsellBar';
      stickyBar.className = 'sticky-upsell-bar';
          stickyBar.innerHTML = `
        <div class="upsell-info">
          <div class="upsell-message upsell-progress-message" id="upsellMessage">...</div>
          <div class="upsell-progress-container">
            <div class="upsell-progress-fill" id="upsellProgressFill"></div>
            <div class="milestones-wrapper">
                    <div class="milestone-marker" style="left: 60%;" data-goal="30"><span class="milestone-icon">30</span></div>
                    <div class="milestone-marker" style="left: 80%;" data-goal="40"><span class="milestone-icon">40</span></div>
                    <div class="milestone-marker" style="left: 100%;" data-goal="50">
                        <span class="milestone-icon">50</span>
                        <div class="milestone-tooltip" style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #ff0b55; color: #fff; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-weight: 800;">50% OFF FRETE</div>
                    </div>
            </div>
          </div>

          <div id="stickySavingsBadge"></div>
        </div>
        <div class="upsell-actions">
          <button class="btn-view-cart" onclick="window.toggleCartSidebar(true)">Ver Carrinho</button>
        </div>
      `;
      document.body.appendChild(stickyBar);
    }

    // Meta Pixel: InitiateCheckout handler
    const sidebarCheckoutBtn = document.getElementById('sidebarCheckoutBtn');
    if (sidebarCheckoutBtn && !sidebarCheckoutBtn.dataset.pixelTracked) {
        sidebarCheckoutBtn.addEventListener('click', () => {
            if (window.fbq) fbq('track', 'InitiateCheckout');
        });
        sidebarCheckoutBtn.dataset.pixelTracked = 'true';
    }

    if (window.currentSaleType === 'retail') {
      if (progressBar) progressBar.style.display = 'none';
      if (checkoutBtn) checkoutBtn.classList.remove('disabled');
      if (stickyBar) stickyBar.classList.remove('active');
    } else {
      if (progressBar) progressBar.style.display = 'block';
    }


    list.innerHTML = '';

    if (window.cart.length === 0) {
      list.innerHTML = '<div class="empty-cart-msg">Seu carrinho está vazio.</div>';
      if (totalEl) totalEl.textContent = 'R$ 0,00';
      allFills.forEach(f => f.style.width = '0%');
      allMsgs.forEach(m => m.innerHTML = 'Adicione itens e ganhe <b class="text-red">recompensas!</b>');



      if (window.currentSaleType === 'wholesale') {
        if (checkoutBtn) checkoutBtn.classList.add('disabled');
      }
      return;
    }

    let subtotal = 0;
    let totalItems = 0;

    window.cart.forEach((item, index) => {
      const itemPrice = parseFloat(item.price);
      const itemQty = parseInt(item.quantity || 0);
      subtotal += itemPrice * itemQty;
      totalItems += itemQty;


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
              <input type="number" class="sidebar-qty-val" value="${item.quantity}" min="1" onchange="updateSidebarQty(${index}, 0, this.value)">
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

    if (totalEl) {
      const hasDiscount = (window.currentSaleType === 'wholesale' && totalItems >= 30);
      const discount = hasDiscount ? subtotal * 0.05 : 0;
      const finalSubtotal = subtotal - discount;

      if (hasDiscount) {
        totalEl.innerHTML = `
          <span style="text-decoration: line-through; color: #888; font-size: 0.8rem;">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
          <span style="color: var(--accent-primary); font-weight: 800;">R$ ${finalSubtotal.toFixed(2).replace('.', ',')}</span>
        `;
      } else {
        totalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
      }

    }


    // Wholesale specific progress bar updates
    if (window.currentSaleType === 'wholesale') {
      let fillPct = 0;
      // Linear Proportional Scale (Max at 50 units)
      fillPct = Math.min((totalItems / 50) * 100, 100);


      let stage = "1";

      let msg = '';
      
      // Determine stage and copy
      if (totalItems < 30) {
          stage = "1";
          msg = `Faltam <b>${30 - totalItems}</b> unidades para ativar <b>5% OFF</b>`;
      } else if (totalItems >= 30 && totalItems < 40) {
          stage = "2";
          msg = `<b>Desconto ativado!</b> Você ganhou 5% OFF`;
      } else if (totalItems >= 40 && totalItems < 50) {
          stage = "3";
          msg = `🔥 Meta batida! Você ganhou <b>2 PODS GRÁTIS!</b>`;
      } else if (totalItems >= 50) {
          stage = "4";
          msg = `🚚 <b>50% OFF Frete liberado!</b> (+ 2 PODS)`;
      }



      // Universal Update for all Progress Bars
      allFills.forEach(f => {
          f.style.width = `${fillPct}%`;
          f.setAttribute('data-stage', stage);
      });

      allMsgs.forEach(m => {
          m.innerHTML = msg;
          m.style.color = (totalItems >= 30) ? '#ff0b55' : ''; // Red when active
      });

      const totalSv = calculateTotalSavings(window.cart, totalItems);
      allSavingsEls.forEach(s => {
          s.textContent = `Você já economizou: R$ ${totalSv.toFixed(2).replace('.', ',')}`;
          s.style.display = (totalSv > 0) ? 'block' : 'none';
      });



      const updateMarkers = () => {
          const markers = document.querySelectorAll('.milestone-marker');
          
          markers.forEach(m => {
              const goal = parseInt(m.getAttribute('data-goal'));
              if (totalItems >= goal) {
                  if (!m.classList.contains('reached')) {
                      m.classList.add('reached', 'pop-hit');
                      setTimeout(() => m.classList.remove('pop-hit'), 400);
                  }
              } else {
                  m.classList.remove('reached');
              }
          });
      };
      
      updateMarkers();


      // Minimum qty for checkout
      if (totalItems < 10) {
        if (checkoutBtn) checkoutBtn.classList.add('disabled');
      } else {
        if (checkoutBtn) checkoutBtn.classList.remove('disabled');
      }

      // Savings Display
      const savings = calculateTotalSavings(window.cart, totalItems);
      const savingsDisplay = document.getElementById('savingsDisplay');
      const savingsValueEl = document.getElementById('savingsValue');
      if (savingsDisplay && savingsValueEl) {
          if (savings > 0) {
              savingsDisplay.style.display = 'block';
              savingsValueEl.textContent = `R$ ${savings.toFixed(2).replace('.', ',')}`;
          } else {
              savingsDisplay.style.display = 'none';
          }
      }

      // Sticky Up-sell Bar updates
      const stickyBar = document.getElementById('stickyUpsellBar');
      const stickyMsg = document.getElementById('upsellMessage');
      const stickyFill = document.getElementById('upsellProgressFill');
      const stickySavingsVal = document.getElementById('savingsValueSticky');
      
      if (stickyBar && totalItems > 0) {
          stickyBar.classList.add('active');
          if (stickyMsg) stickyMsg.innerHTML = msg;
          
          if (stickyFill) {
            stickyFill.style.width = `${fillPct}%`;
          }

          if (stickySavingsVal) {
            stickySavingsVal.textContent = `Você já economizou: R$ ${savings.toFixed(2).replace('.', ',')}`;
          }

          updateMarkers(stickyBar);


          // Full power celebration class
          if (totalItems >= 50) stickyBar.classList.add('limit-attained');
          else stickyBar.classList.remove('limit-attained');
      } else if (stickyBar) {
          stickyBar.classList.remove('active');
      }
    }
  }

  function calculateTotalSavings(cart, totalQty) {
      if (totalQty < 30 || !cart || cart.length === 0) return 0;
      
      let savings = 0;
      let subtotal = 0;
      
      cart.forEach(item => {
          subtotal += (parseFloat(item.price) || 0) * (item.quantity || 1);
      });
      
      // Tiered Exclusive Rewards (Retail Value Based)
      if (totalQty >= 30 && totalQty < 40) {
          // Tier 1: 5% Discount ONLY
          savings = subtotal * 0.05;
      } else if (totalQty >= 40) {
          // Tier 2: 2 Free Pods (Retail Value: R$ 300.00)
          savings = 300.00; 
          
          if (totalItems >= 50) {
              // Tier 3: Add 50% shipping discount value (avg R$ 30)
              savings += 30.00;
          }

      }

      
      return savings;
  }

  // Exposed globally for sidebar buttons
  window.updateSidebarQty = (index, delta, manualValue = null) => {
    if (manualValue !== null) {
      window.cart[index].quantity = Math.max(1, parseInt(manualValue) || 1);
    } else {
      window.cart[index].quantity += delta;
    }

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
      {
        "id": "elfbar-30k",
        "brand": "elfbar",
        "name": "Elfbar 30k",
        "flavors": [
          "Não tem muito 🚨",
          "Strawberry ice",
          "Strawberry watermelon ice",
          "Blueberry sour raspberry 10pc",
          "Green apple ice",
          "Miami mint"
        ],
        "price": "95.00",
        "retail_price": "145.00",
        "image": "assets/img/Elfbar_30k-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "elfbar-40k",
        "brand": "elfbar",
        "name": "Elfbar 40k",
        "flavors": [
          "Não tem muito 🚨🚨",
          "Strawberry watermelon",
          "Dragon strawnana",
          "Double apple ice",
          "Baja splash",
          "Summer splash",
          "Green apple ice",
          "Strawberry ice"
        ],
        "price": "100.00",
        "retail_price": "150.00",
        "image": "assets/img/Elfbar_40k-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "elfbar-40k-summer-edition",
        "brand": "elfbar",
        "name": "Elfbar 40k Summer Edition",
        "flavors": [
          "Tem 10 de cada 🚨🚨🚨🚨",
          "Raspberry watermelon",
          "La grape",
          "Sour strawberry dragon fruit",
          "Black mint",
          "Pomegranate blast",
          "Scary berry",
          "Cool menthol",
          "Strawberry orange lime",
          "Orange blast"
        ],
        "price": "100.00",
        "retail_price": "150.00",
        "image": "assets/img/Elfbar_40k_summer-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "elfbar-gh-23k",
        "brand": "elfbar",
        "name": "Elfbar GH 23k",
        "flavors": [
          "Watermelon ice",
          "Strawberry ice",
          "Peach mango watermelon",
          "Strawberries banana",
          "Miami mint",
          "Grape ice",
          "Ice mint",
          "Spring mint",
          "Sakura grape",
          "Baja splash",
          "Green apple ice",
          "Blueberry pear",
          "Blue razz ice cream",
          "Pineapple plums lime mint",
          "Lime grapefruit ice"
        ],
        "price": "95.00",
        "retail_price": "145.00",
        "image": "assets/img/Elfbar_23k-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v250",
        "brand": "ignite",
        "name": "Ignite V250",
        "flavors": [
          "Icy mint",
          "Menthol",
          "Grape ice",
          "Strawberry kiwi 25pc🚨",
          "Strawberry ice 25pc🚨",
          "Strawberry banana 25pc🚨",
          "Watermelon ice 25pc🚨"
        ],
        "price": "93.00",
        "retail_price": "140.00",
        "image": "assets/img/Ignite_v250-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v400-sweet",
        "brand": "ignite",
        "name": "Ignite V400 sweet",
        "flavors": [
          "Strawberry apple watermelon"
        ],
        "price": "95.00",
        "retail_price": "145.00",
        "image": "assets/img/Ignite_v400_sweet-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v400-mix",
        "brand": "ignite",
        "name": "Ignite V400 mix",
        "flavors": [
          "Orange - strawberry ice",
          "Pineapple mango - strawberry",
          "Watermelon grape - açaí ice",
          "Banana - strawberry ice",
          "Grape ice - strawberry",
          "Blueberry - raspberry blackberry",
          "Strawberry watermelon - aloe grape",
          "Mango ice - passion fruit guava",
          "Peach watermelon - mango ice",
          "Grape pop - peach ice",
          "Mighty melon - menthol",
          "Strawberry watermelon-apple",
          "Icy mint - peach grape",
          "Strawberry- grape",
          "Peach watermelon- mango ice",
          "Pineapple-passion fruit sour kiwi",
          "Banana- strawberry mango ice",
          "Cherry ice - watermelon ice",
          "Watermelon ice- grape ice"
        ],
        "price": "104.00",
        "retail_price": "160.00",
        "image": "assets/img/Ignite_v400_mix-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v400-ice",
        "brand": "ignite",
        "name": "Ignite V400 ice",
        "flavors": [
          "Strawberry banana ice",
          "Strawberry kiwi",
          "Sakura grape",
          "Strawberry apple watermelon",
          "Strawberry",
          "Strawberry watermelon",
          "Menthol",
          "Icy mint",
          "Grape peach",
          "Grape",
          "Watermelon",
          "Pineapple 15pc 🚨",
          "Pineapple kiwi dragon fruit 30pc"
        ],
        "price": "105.00",
        "retail_price": "160.00",
        "image": "assets/img/Ignite_v400_ice-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v300",
        "brand": "ignite",
        "name": "Ignite V300",
        "flavors": [
          "Sweet and sour pomegranate",
          "Green apple",
          "Watermelon mix",
          "Aloe grape ice",
          "Strawberry banana",
          "Strawberry ice",
          "Watermelon ice",
          "Strawberry kiwi",
          "Dragon fruit watermelon",
          "Banana ice"
        ],
        "price": "100.00",
        "retail_price": "150.00",
        "image": "assets/img/Ignite_v300-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v155",
        "brand": "ignite",
        "name": "Ignite V155",
        "flavors": [
          "Blueberry ice",
          "Kiwi passion fruit guava",
          "Strawberry ice",
          "Strawberry watermelon ice",
          "Banana ice 10pc"
        ],
        "price": "83.00",
        "retail_price": "125.00",
        "image": "assets/img/Ignite_v155-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "ignite-v80",
        "brand": "ignite",
        "name": "Ignite V80",
        "flavors": [
          "Frozen mint",
          "Arctic gum",
          "Spearmint gum",
          "Grape ice",
          "Strawberry kiwi",
          "Menthol",
          "Icy mint",
          "Blueberry lemon",
          "Frozen mint water",
          "Grapefruit mint",
          "Frozen cola",
          "Açaí ice",
          "Frozen apple",
          "Banana ice",
          "Apple mint",
          "Blueberry ice",
          "Frozen blueberry",
          "Passion fruit sour kiwi"
        ],
        "price": "77.00",
        "retail_price": "120.00",
        "image": "assets/img/Ignite_v80-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "v300-ultra-slim",
        "brand": "ignite",
        "name": "V300 ultra slim",
        "flavors": [
          "15 de cada sabor 🚨🚨🚨",
          "Minty melon",
          "Watermelon ice",
          "Cactus lime soda",
          "Blueberry ice",
          "Aloe grape ice",
          "Banana coconut water 10pc"
        ],
        "price": "105.00",
        "retail_price": "160.00",
        "image": "assets/img/Ignite_v300_ultra_thin-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "black-sheep-30k",
        "brand": "blacksheep",
        "name": "Black sheep 30k",
        "flavors": [
          "Grape - passion fruit 20pc🚨"
        ],
        "price": "93.00",
        "retail_price": "140.00",
        "image": "assets/img/Elfbar_30k-removebg-preview-2.png",
        "retail_available": true
      },
      {
        "id": "p100-kit",
        "brand": "ignite",
        "name": "P100 kit",
        "flavors": [
          "30pc 🚨🚨🚨",
          "Green apple",
          "Menthol"
        ],
        "price": "95.00",
        "retail_price": "145.00",
        "image": "assets/img/Ignite_p100_kit-removebg-preview.png",
        "retail_available": true
      },
      {
        "id": "cartucho-p100",
        "brand": "ignite",
        "name": "cartucho p100",
        "flavors": [
          "Watermelon ice",
          "Banana ice",
          "Grape ice",
          "Blueberry ice",
          "Strawberry kiwi"
        ],
        "price": "60.00",
        "retail_price": "90.00",
        "image": "assets/img/Cartucho_ignite_p100-removebg-preview.png",
        "retail_available": true
      }
    ];

    try {
      const response = await fetch('products.json?v=' + new Date().getTime());
      if (!response.ok) throw new Error();
      allProducts = await response.json();
      renderProducts('all');
    } catch (err) {
      console.warn('Usando dados de fallback (local test ou erro CORS).');
      allProducts = window.PRODUCTS_DATA || [];
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

      card.style.cursor = 'pointer';
      card.onclick = (e) => {
        // Prevent navigation if the wishlist button was clicked
        if (!e.target.closest('.product-wishlist')) {
          window.location.href = `product.html?id=${p.id}`;
        }
      };

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
              ${window.currentSaleType === 'retail' ? `<span class="original">R$ ${(p.retail_price ? parseFloat(p.retail_price) * 1.3 : parseFloat(p.price) * 1.8).toFixed(2).replace('.', ',')}</span>` : ''}
              <span class="current">R$ ${((window.currentSaleType === 'retail' ? (p.retail_price ? parseFloat(p.retail_price) : parseFloat(p.price) * 1.4) : parseFloat(p.price)).toFixed(2)).replace('.', ',')}</span>
            </div>
            <div class="product-action-pill">
              <span>COMPRAR</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
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
      const query = e.target.value;
      
      renderProducts(category, query);

      // Scroll to products when typing starts
      if (query.trim().length > 0) {
        const target = document.getElementById('produtos');
        if (target) {
          const headerHeight = document.getElementById('header')?.offsetHeight || 0;
          const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
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

    let orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    
    // Sanitize: Remove any potential mock/ghost orders that might have been left from development
    const MOCK_ORDER_IDS = ['54321', '12345'];
    orders = orders.filter(o => !MOCK_ORDER_IDS.includes(String(o.id)));
    
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

  async function checkAuthState() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const isLoggedIn = !!session;

    if (ordersBtn) {
      ordersBtn.style.display = isLoggedIn ? 'flex' : 'none';
    }

    if (accountBtn) {
      if (isLoggedIn) {
        accountBtn.setAttribute('title', `Logado como ${session.user.email}`);
        accountBtn.href = 'account.html'; // Redireciona para o painel se já logado
      } else {
        accountBtn.setAttribute('title', 'Minha Conta');
        accountBtn.href = 'login.html'; // Envia para login se deslogado
      }
    }

    localStorage.setItem('isLoggedIn', isLoggedIn ? 'true' : 'false');
    if (isLoggedIn) {
      localStorage.setItem('userEmail', session.user.email);
    }
  }

  // Listen for auth changes
  if (typeof supabaseClient !== 'undefined') {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event);
      checkAuthState();
    });
  }

  // Handle Orders Toggle
  ordersBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.toggleOrdersSidebar(true);
  });

  // Handle Account Btn explicitly for faster routing
  accountBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (localStorage.getItem('isLoggedIn') === 'true') {
      window.location.href = 'account.html';
    } else {
      window.location.href = 'login.html';
    }
  });

  document.getElementById('closeOrders')?.addEventListener('click', () => window.toggleOrdersSidebar(false));

  // Lista de Pedidos (vazia inicialmente a menos que exista fetch real do servidor)

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

  // ============================================
  // PRODUCT CAROUSEL (UP-SELL) FOR PRODUCT PAGE
  // ============================================
  window.initProductCarousel = async function(currentBrand = '') {
    const carousel = document.getElementById('product-upsell-carousel');
    const prevBtn = document.getElementById('prevBtnProduct');
    const nextBtn = document.getElementById('nextBtnProduct');
    
    if (!carousel) return;

    try {
      const response = await fetch('products.json?v=' + Date.now());
      if (!response.ok) throw new Error("Falha ao carregar produtos");
      const allProducts = await response.json();
      
      // Sort: Same brand first
      const sorted = [...allProducts].sort((a, b) => {
        const aMatch = (a.brand || '').toLowerCase() === currentBrand.toLowerCase();
        const bMatch = (b.brand || '').toLowerCase() === currentBrand.toLowerCase();
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      renderCarouselItems(carousel, sorted);

      // Update promo text and progress bar (mirror checkout behavior)
      const promoText = document.getElementById('productUpsellPromoText');
      const promoFill = document.getElementById('productUpsellProgressFill');
      const cartItems = JSON.parse(localStorage.getItem('ignite_cart')) || [];
      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      if (promoText && promoFill) {
        let fillWidth = 0;
        let promoMsg = '';
        if (totalItems >= 50) {
          promoMsg = '<strong>ECONOMIA MÁXIMA!</strong> Frete Grátis + Bônus + Desconto Ativados!';
          fillWidth = 100;
          promoFill.classList.add('glow');
        } else if (totalItems >= 40) {
          promoMsg = `<strong>Bônus Garantido!</strong> Faltam só <strong>${50 - totalItems}</strong> para <strong>FRETE GRÁTIS</strong>`;
          fillWidth = 80 + ((totalItems - 40) / 10) * 20;
          promoFill.classList.add('glow');
        } else if (totalItems >= 30) {
          promoMsg = `<strong>Desconto Ativado!</strong> Faltam <strong>${40 - totalItems}</strong> para o <strong>BÔNUS (+2 PODS GRÁTIS)</strong>`;
          fillWidth = 60 + ((totalItems - 30) / 10) * 20;
          promoFill.classList.add('glow');
        } else if (totalItems >= 10) {
          promoMsg = `<strong>Atacado Liberado!</strong> Faltam <strong>${30 - totalItems}</strong> para liberar um <strong>DESCONTO EXTRA</strong>`;
          fillWidth = 20 + ((totalItems - 10) / 20) * 40;
          promoFill.classList.remove('glow');
        } else if (totalItems > 0) {
          promoMsg = `Faltam apenas <strong>${10 - totalItems}</strong> unidades para liberar o <strong>ATACADO</strong>`;
          fillWidth = (totalItems / 10) * 20;
          promoFill.classList.remove('glow');
        } else {
          promoMsg = 'Desbloqueie <strong>recompensas exclusivas</strong> adicionando itens!';
          fillWidth = 0;
          promoFill.classList.remove('glow');
        }
        promoText.innerHTML = promoMsg;
        promoFill.style.width = `${fillWidth}%`;
        promoFill.style.transition = 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }
      
      // Setup Navigation
      if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
          carousel.scrollBy({ left: -carousel.offsetWidth, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
          carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
        });
      }
    } catch (error) {
      console.error("Erro no carrossel:", error);
      carousel.innerHTML = '<div style="text-align: center; color: #888; width: 100%;">Falha ao carregar sugestões.</div>';
    }
  };

  function renderCarouselItems(container, products) {
    container.innerHTML = '';
    const cartItems = JSON.parse(localStorage.getItem('ignite_cart')) || [];
    const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const hasDiscount = totalCount >= 30;

    products.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'product-card animate-in';
      card.style.animationDelay = `${idx * 0.05}s`;
      
      let imgSrc = p.image || 'assets/logo-ignite.png';
      if (imgSrc && !imgSrc.includes('/') && !imgSrc.startsWith('http')) {
          imgSrc = 'Images Pods/' + imgSrc;
      }

      const price = parseFloat(p.price);
      const discountPrice = price * 0.95;
      
      const priceHtml = hasDiscount 
          ? `<span class="original" style="text-decoration: line-through; color: #888; font-size: 0.8rem; margin-right: 5px;">R$ ${price.toFixed(2).replace('.', ',')}</span> <span class="current" style="color: #ff0b55;">R$ ${discountPrice.toFixed(2).replace('.', ',')}</span>`
          : `<span class="current">R$ ${price.toFixed(2).replace('.', ',')}</span>`;

      card.innerHTML = `
          <div class="product-image" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer;">
              <img src="${imgSrc}" alt="${p.name}" class="product-img-real" onerror="this.src='assets/logo-ignite.png'">
          </div>
          <div class="product-info">
              <div class="product-brand">${p.brand || 'Olimpo'}</div>
              <div class="product-name" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer;">${p.name}</div>
              <div class="product-footer">
                  <div class="product-price">
                      ${priceHtml}
                  </div>
                  <button class="add-cart-btn" onclick="window.location.href='product.html?id=${p.id}'">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 5v14M5 12h14"></path>
                      </svg>
                  </button>
              </div>
          </div>
      `;
      container.appendChild(card);
    });
  }

  giftModal?.addEventListener('click', (e) => {
    if (e.target === giftModal) window.toggleGiftModal(false);
  });
  
  // =========================================
  // 13. Age Verification Modal
  // =========================================
  const ageOverlay = document.getElementById('ageVerificationOverlay');
  const ageConfirmBtn = document.getElementById('ageConfirmBtn');
  const ageDenyBtn = document.getElementById('ageDenyBtn');

  if (ageOverlay) {
    const isVerified = localStorage.getItem('ignite_age_verified') === 'true';
    
    if (!isVerified) {
      // Small delay to allow initial render
      setTimeout(() => {
        ageOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
      }, 500);
    }

    if (ageConfirmBtn) {
      ageConfirmBtn.addEventListener('click', () => {
        localStorage.setItem('ignite_age_verified', 'true');
        ageOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Track age verification if pixel is active
        if (window.fbq) {
          fbq('trackCustom', 'AgeVerified');
        }
      });
    }

    if (ageDenyBtn) {
      ageDenyBtn.addEventListener('click', () => {
        // Redirect to a safe site or show a stark message
        document.body.innerHTML = `
          <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; text-align: center; padding: 20px;">
            <h1 style="color: #ff0b55; margin-bottom: 20px;">Acesso Negado</h1>
            <p>Este site é restrito para maiores de 18 anos.</p>
          </div>
        `;
      });
    }
  }
    // Global Initialization: Check cart and show rewards progress bars in all tabs
    if (typeof updateCartUI === 'function') {
        updateCartUI();
    }
});

