/* ============================================
   IGNITE — Checkout Page Logic
   Smart Shipping & Payment Integration
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // 0. API Config
    // =========================================
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isNodePort = window.location.port === '3000';
    const API_BASE = (isLocalhost && !isNodePort) ? 'http://localhost:3000' : '';

    // DOM Elements - Initialized early to avoid ReferenceErrors
    const summaryItems = document.getElementById('summary-items');
    const subtotalEl = document.getElementById('summary-subtotal');
    const totalEl = document.getElementById('summary-total');
    const submitBtn = document.getElementById('submit-purchase');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    // const checkoutWrapper = document.getElementById('checkout-wrapper'); 
    // ^ Variable kept if needed later, but auth-shield is gone.

    // =========================================
    // 1. Masking Inputs (Phone, CEP)
    // =========================================
    const phoneInput = document.getElementById('phone');
    const cepInput = document.getElementById('cep');

    const mask = (input, pattern) => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, "");
            let masked = "";
            let i = 0;

            for (let char of pattern) {
                if (i >= val.length) break;
                if (char === "0") {
                    masked += val[i];
                    i++;
                } else {
                    masked += char;
                }
            }
            e.target.value = masked;
        });

        // Ensure strictly numbers-only on blur/form cleanup
        input.addEventListener('blur', (e) => {
            if (input.id === 'phone' && e.target.value.replace(/\D/g, "").length < 10) {
                // Potential validation feedback could go here
            }
        });
    };

    if (phoneInput) mask(phoneInput, "(00) 00000-0000");
    if (cepInput) mask(cepInput, "00000-000");

    const cpfInput = document.getElementById('cpf');
    if (cpfInput) mask(cpfInput, "000.000.000-00");


    // =========================================
    // 0. Checkout Store Logic (Up-sell & Sync)
    // =========================================
    let checkoutCart = [];
    let currentSubtotal = 0;

    const syncCartFromStorage = () => {
        const stored = localStorage.getItem('ignite_cart');
        try {
            checkoutCart = stored ? JSON.parse(stored) : [];
            if (typeof renderCart === 'function') renderCart();
        } catch (e) {
            console.error("Cart sync error:", e);
            checkoutCart = [];
        }
    };

    // Initial load
    syncCartFromStorage();

    // Emergency sync if cart is empty on start (prevents race conditions)
    if (checkoutCart.length === 0) {
        setTimeout(syncCartFromStorage, 300);
    }

    // Listen for storage changes (multi-tab sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'ignite_cart') {
            syncCartFromStorage();
        }
    });

    // Meta Pixel: InitiateCheckout (on land)
    if (window.fbq) fbq('track', 'InitiateCheckout');

    const checkoutUpsellGrid = document.getElementById('checkout-upsell-products');
    const nextBtn = document.getElementById('nextBtnCheckout');

    const prevBtn = document.getElementById('prevBtnCheckout');

    async function loadCheckoutUpsellProducts() {
        if (!checkoutUpsellGrid) return;
        try {
            const response = await fetch('products.json?v=' + Date.now());
            if (!response.ok) throw new Error("Falha ao carregar products.json");
            const allProducts = await response.json();
            
            updateCheckoutUpsell(allProducts || []);
        } catch (error) {
            console.error("Erro ao carregar sugestões, usando fallback:", error);
            updateCheckoutUpsell(window.PRODUCTS_DATA || []);
        }
    }

    function updateCheckoutUpsell(allProducts) {
        if (!checkoutUpsellGrid) return;
        const cartBrands = [...new Set(checkoutCart.map(item => item.brand || 'Olimpo'))];
        const sorted = [...allProducts].sort((a, b) => {
            const aMatch = cartBrands.includes(a.brand || 'Olimpo');
            const bMatch = cartBrands.includes(b.brand || 'Olimpo');
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });
        renderCheckoutUpsellProducts(sorted);
    }

    function renderCheckoutUpsellProducts(products) {
        if (!checkoutUpsellGrid) return;
        checkoutUpsellGrid.innerHTML = '';
        const totalItemsCount = checkoutCart.reduce((sum, item) => sum + item.quantity, 0);
        const hasDiscount = (totalItemsCount >= 30);

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
                <div class="product-image">
                    <img src="${imgSrc}" alt="${p.name}" class="product-img-real" onerror="this.src='assets/logo-ignite.png'">
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.brand || 'Olimpo'}</div>
                    <div class="product-name">${p.name}</div>
                    <div class="product-footer">
                        <div class="product-price">
                            ${priceHtml}
                        </div>
                        <button class="add-cart-btn" onclick="addToCartFromCheckout('${p.id}', '${p.name}', ${parseFloat(p.price)}, '${p.image || ''}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                </div>
            `;
            checkoutUpsellGrid.appendChild(card);
        });
        updateArrows();
    }

    const updateArrows = () => {
        if (prevBtn) {
            if (checkoutUpsellGrid.scrollLeft <= 5) prevBtn.classList.add('hidden');
            else prevBtn.classList.remove('hidden');
        }
        if (nextBtn) {
            if (checkoutUpsellGrid.scrollLeft + checkoutUpsellGrid.clientWidth >= checkoutUpsellGrid.scrollWidth - 5) nextBtn.classList.add('hidden');
            else nextBtn.classList.remove('hidden');
        }
    };

    if (nextBtn) {
        nextBtn.onclick = () => {
            checkoutUpsellGrid.scrollBy({ left: 305, behavior: 'smooth' });
            setTimeout(updateArrows, 400);
        };
    }
    if (prevBtn) {
        prevBtn.onclick = () => {
            checkoutUpsellGrid.scrollBy({ left: -305, behavior: 'smooth' });
            setTimeout(updateArrows, 400);
        };
    }


    checkoutUpsellGrid.addEventListener('scroll', updateArrows);
    
    // Initial Catalog Load
    async function initCheckoutCatalogs() {
        try {
            const response = await fetch('products.json?v=' + Date.now());
            if (!response.ok) throw new Error("Falha ao carregar produtos");
            const allProducts = await response.json();
            
            // 1. Horizontal Carousel (existing)
            updateCheckoutUpsell(allProducts);
            
            // 2. Bottom Grid Catalog (new)
            renderFavoritesCarouselCheckout(allProducts);
            renderFullCatalogCheckout(allProducts);
            
        } catch (error) {
            console.error("Erro ao inicializar catálogos:", error);
        }
    }

    function renderFavoritesCarouselCheckout(allProducts) {
        const container = document.getElementById('favoritesContentCheckout');
        if (!container) return;

        const favorites = allProducts.slice(0, 4);
        const saleType = localStorage.getItem('ignite_sale_type') || 'wholesale';
        
        container.innerHTML = `
            <div class="section-header-pill">🔥 Recomendações Premium</div>
            <h2 class="catalog-title">Escolhidos por clientes:</h2>
            <div class="p-grid-catalog">
                ${favorites.map(p => {
                    const price = parseFloat(p.price);
                    const isRetail = saleType === 'retail';
                    const finalPrice = isRetail ? (parseFloat(p.retail_price) || price * 1.4) : price;
                    return `
                        <div class="p-card-mini" onclick="addToCartFromCheckout('${p.id}', '${p.name}', ${finalPrice}, '${p.image || ''}')">
                            <img src="${p.image && !p.image.includes('/') ? 'Images Pods/' + p.image : p.image || 'assets/logo-ignite.png'}" alt="${p.name}" class="p-mini-img" onerror="this.src='assets/logo-ignite.png'">
                            <div class="p-mini-info">
                                <span class="p-mini-name">${p.name}</span>
                                <span class="p-mini-price">R$ ${finalPrice.toFixed(2).replace('.', ',')}</span>
                                <span style="font-size: 0.65rem; color: #ff0b55; font-weight: 700;">+ ADICIONAR</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderFullCatalogCheckout(allProducts) {
        const container = document.getElementById('fullCatalogContentCheckout');
        if (!container) return;

        const brands = {};
        allProducts.forEach(p => {
            const b = p.brand || 'outros';
            if (!brands[b]) brands[b] = [];
            brands[b].push(p);
        });

        const saleType = localStorage.getItem('ignite_sale_type') || 'wholesale';
        let html = `
            <div class="section-header-pill" style="margin-top: 40px;">🛍️ Explore tudo</div>
            <h2 class="catalog-title">Confira outros produtos</h2>
        `;

        for (const brand in brands) {
            const brandProducts = brands[brand];
            html += `
                <div class="brand-sub-divider">
                    <h3>${brand}</h3>
                </div>

                <div class="p-grid-catalog">
                    ${brandProducts.map(p => {
                        const price = parseFloat(p.price);
                        const isRetail = saleType === 'retail';
                        const finalPrice = isRetail ? (parseFloat(p.retail_price) || price * 1.4) : price;
                        return `
                            <div class="p-card-mini" onclick="addToCartFromCheckout('${p.id}', '${p.name}', ${finalPrice}, '${p.image || ''}')">
                                <img src="${p.image && !p.image.includes('/') ? 'Images Pods/' + p.image : p.image || 'assets/logo-ignite.png'}" alt="${p.name}" class="p-mini-img" onerror="this.src='assets/logo-ignite.png'">
                                <div class="p-mini-info">
                                    <span class="p-mini-name">${p.name}</span>
                                    <span class="p-mini-price">R$ ${finalPrice.toFixed(2).replace('.', ',')}</span>
                                    <span style="font-size: 0.65rem; color: #ff0b55; font-weight: 700;">+ ADICIONAR</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        container.innerHTML = html;
    }

    initCheckoutCatalogs();





    const addressFields = document.getElementById('address-fields');

    const cepLoading = document.querySelector('.cep-loading');

    const fields = {
        address: document.getElementById('address'),
        neighborhood: document.getElementById('neighborhood'),
        city: document.getElementById('city'),
        state: document.getElementById('state')
    };

    window.selectedShippingCost = 0;
    window.selectedShippingMethod = '';

    if (cepInput) {
        let currentCepFetched = "";
        cepInput.addEventListener('input', async (e) => {
            let val = e.target.value.replace(/\D/g, "");
            if (val.length > 8) val = val.slice(0, 8);

            if (val.length === 8 && val !== currentCepFetched) {
                currentCepFetched = val;
                cepLoading.style.display = 'block';
                addressFields.classList.add('loading-opacity');

                try {
                    // Try ViaCEP direct first (it supports CORS for 대부분의 cases)
                    const response = await fetch(`https://viacep.com.br/ws/${val}/json/`);

                    if (!response.ok) throw new Error("ViaCEP direct failed");
                    const data = await response.json();

                    if (!data.erro) {
                        fields.address.value = data.logradouro || "";
                        fields.neighborhood.value = data.bairro || "";
                        fields.city.value = data.localidade || "";
                        fields.state.value = data.uf || "";

                        showAddressFields();
                        fetchShippingOptions(val);

                        // Focus on number field for better UX
                        const numInput = document.getElementById('number');
                        if (numInput) setTimeout(() => numInput.focus(), 150);
                    } else {
                        console.warn("CEP não encontrado:", val);
                        showAddressFields(); // Still show for manual entry
                    }
                } catch (error) {
                    console.error("Erro ao buscar CEP:", error);
                    showAddressFields(); // Show fields for manual entry
                } finally {
                    cepLoading.style.display = 'none';
                    addressFields.classList.remove('loading-opacity');
                }
            } else if (val.length < 8 && val.length > 0) {
                // Keep visible if user is typing but not complete yet?
                // Actually, let's only hide if empty
            } else if (val.length === 0) {
                currentCepFetched = "";
                hideAddressFields();
            }
        });
    }

    function showAddressFields() {
        if (!addressFields) return;
        addressFields.classList.remove('hidden');
        addressFields.style.maxHeight = '1200px';
        addressFields.style.opacity = '1';
        addressFields.style.marginTop = '20px';
        addressFields.classList.remove('loading-opacity');

        // Ensure shipping is calculated
        window.addressIsComplete = true;
        if (typeof validateWholesale === 'function') {
            validateWholesale();
        }
    }

    function hideAddressFields() {
        if (!addressFields) return;
        addressFields.classList.add('hidden');
        addressFields.style.maxHeight = '0';
        addressFields.style.opacity = '0';
        addressFields.style.marginTop = '0';
        document.getElementById('shipping-options-container')?.classList.add('hidden');
    }

    async function fetchShippingOptions(cep) {
        const container = document.getElementById('shipping-options-container');
        const list = document.getElementById('shipping-methods-list');
        if (!container || !list) return;

        container.classList.remove('hidden');
        list.innerHTML = '<p style="color: #888; padding: 10px; text-align:center;">Calculando frete realista...</p>';

        try {
            const totalItems = checkoutCart.reduce((sum, item) => sum + item.quantity, 0);
            
            // Use NEW Advanced Local logic instead of unstable API
            const options = ShippingCalculator.calculate(cep, totalItems);
            
            if (options && options.length > 0) {
                renderShippingList(options);
                window.currentCepCalculated = cep;
            } else {
                throw new Error("Local calculation failed to return options");
            }
        } catch (error) {
            console.error("Erro ao carregar frete:", error);
            // Internal logic is robust, but kept as safety
            list.innerHTML = '<p style="color: #ff0b55; padding: 20px; text-align:center;">Erro ao calcular frete. Verifique o CEP ou tente novamente.</p>';
        }

        // Reset previous selection
        window.selectedShippingCost = 0;
        window.selectedShippingMethod = '';
        if (typeof validateWholesale === 'function') validateWholesale();
    }

    function renderShippingList(options) {
        const list = document.getElementById('shipping-methods-list');
        const totalItems = checkoutCart.reduce((sum, item) => sum + item.quantity, 0);
        const saleType = localStorage.getItem('ignite_sale_type') || 'wholesale';
        const isFreeShipping = (saleType === 'wholesale' && totalItems >= 50);

        let htmlContent = '';
        
        htmlContent += `<div style="margin-top: 20px; margin-bottom: 20px; font-weight: 700; color: #fff; font-size: 1.15rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
            Escolha como Deseja Receber
            <span style="font-weight: 400; font-size: 0.8rem; color: #888;">Simulado em tempo real</span>
        </div>`;

        options.forEach(opt => {
            const isPac = opt.id === 'PAC';
            const currentPrice = (isFreeShipping && isPac) ? 0 : opt.price;
            const displayName = `${opt.carrier} - ${opt.type}`;
            const displayPrice = currentPrice === 0 ? 'GRÁTIS' : `R$ ${currentPrice.toFixed(2).replace('.', ',')}`;
            
            // Auto-select if it's the only one or if it was re-calculated
            const isSelected = window.selectedShippingMethod === displayName || (options.length === 1);

            htmlContent += `
                <label class="shipping-option ${currentPrice === 0 ? 'promo-option' : ''}" style="display:flex; justify-content:space-between; align-items:center; background:${currentPrice === 0 ? 'rgba(255,11,85,0.08)' : 'rgba(255,255,255,0.03)'}; padding:15px; border-radius:8px; cursor:pointer; border:1px solid ${currentPrice === 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}; transition: all 0.3s ease; margin-bottom: 10px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <input type="radio" name="shippingMethod" value="${currentPrice}" data-name="${displayName}" onchange="updateShippingSelection(this)" ${isSelected ? 'checked' : ''} style="accent-color: var(--accent-primary); width: 20px; height: 20px; cursor: pointer;">
                        <div class="shipping-info" style="display:flex; flex-direction:column;">
                            <span class="shipping-name" style="font-weight:600; color:#fff; font-size:1.1rem; display: flex; align-items: center;">
                                ${displayName}
                                ${currentPrice === 0 ? ' <span style="background:var(--accent-primary); color:white; font-size:0.6rem; padding:2px 5px; border-radius:4px; margin-left:8px;">LIBERADO</span>' : ''}
                            </span>
                            <span class="shipping-deadline" style="font-size:0.85rem; color:#aaa; margin-top: 3px;">Prazo: ${opt.deadlineDays}</span>
                            <span class="shipping-dates" style="font-size:0.75rem; color:var(--accent-primary); font-style:italic; margin-top: 2px;">📅 Est: ${opt.deadlineDate}</span>
                        </div>
                    </div>
                    <span class="shipping-price" style="font-weight:800; color:${currentPrice === 0 ? 'var(--accent-primary)' : '#fff'}; font-size:1.15rem;">${displayPrice}</span>
                </label>
            `;

            if (isSelected) {
                window.selectedShippingCost = currentPrice;
                window.selectedShippingMethod = displayName;
            }
        });

        list.innerHTML = htmlContent;
    }

    window.updateShippingSelection = (radio) => {
        window.selectedShippingCost = parseFloat(radio.value);
        window.selectedShippingMethod = radio.getAttribute('data-name');
        if (typeof validateWholesale === 'function') validateWholesale();
    };


    // =========================================
    // 3. Payment Selection Logic
    // =========================================
    const paymentOptions = document.querySelectorAll('.payment-option');

    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            const radio = option.querySelector('input');
            if (radio) radio.checked = true;
        });
    });


    // =========================================
    // 4. Cart Rendering & Validation
    // =========================================
    // Elements already initialized at the top to prevent ReferenceErrors

    // checkoutCart already managed by syncCartFromStorage()
    // currentSubtotal already declared at top level

    window.updateCheckoutQty = (index, delta, manualValue = null) => {
        if (manualValue !== null) {
            checkoutCart[index].quantity = Math.max(1, parseInt(manualValue) || 1);
        } else {
            checkoutCart[index].quantity += delta;
        }

        if (checkoutCart[index].quantity < 1) {
            window.removeCheckoutItem(index);
        } else {
            saveAndRender();
        }
    };

    window.removeCheckoutItem = (index) => {
        checkoutCart.splice(index, 1);
        saveAndRender();
        if (checkoutCart.length === 0) {
            window.location.href = 'index.html';
        }
    };

    function saveAndRender() {
        localStorage.setItem('ignite_cart', JSON.stringify(checkoutCart));
        renderCart();
    }

    function renderCart() {
        if (!summaryItems) return;
        summaryItems.innerHTML = '';
        currentSubtotal = 0;

        const totalItemsCount = checkoutCart.reduce((sum, item) => sum + item.quantity, 0);
        const saleType = localStorage.getItem('ignite_sale_type') || 'wholesale';
        const hasDiscount = (saleType === 'wholesale' && totalItemsCount === 30);

        checkoutCart.forEach((item, index) => {
            const price = parseFloat(item.price);
            const itemTotal = price * item.quantity;
            currentSubtotal += itemTotal;

            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';

            let imgSrc = item.image || 'assets/logo-ignite.png';
            if (imgSrc && !imgSrc.includes('/') && !imgSrc.startsWith('http')) {
                imgSrc = 'Images Pods/' + imgSrc;
            }

            const unitPriceHtml = hasDiscount 
                ? `<span style="text-decoration: line-through; color: #888; font-size: 0.75rem;">R$ ${price.toFixed(2).replace('.', ',')}</span> <span style="color: #ff0b55;">R$ ${(price * 0.95).toFixed(2).replace('.', ',')}</span>`
                : `R$ ${price.toFixed(2).replace('.', ',')}`;

            const totalItemPriceHtml = hasDiscount
                ? `R$ ${(itemTotal * 0.95).toFixed(2).replace('.', ',')}`
                : `R$ ${itemTotal.toFixed(2).replace('.', ',')}`;

            itemEl.innerHTML = `
                <div class="item-img">
                    <img src="${imgSrc}" alt="${item.name}" onerror="this.src='assets/logo-ignite.png'">
                </div>
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-flavor">Sabor: ${item.flavor || 'N/A'}</span>
                    <div class="item-price-unit" style="font-size: 0.8rem; margin-top: 4px; color: #888;">
                        ${unitPriceHtml}
                    </div>
                    <div class="item-controls">
                        <div class="qty-stepper">
                            <button onclick="updateCheckoutQty(${index}, -1)" type="button">−</button>
                            <input type="number" class="qty-stepper-val" value="${item.quantity}" min="1" onchange="updateCheckoutQty(${index}, 0, this.value)">
                            <button onclick="updateCheckoutQty(${index}, 1)" type="button">+</button>
                        </div>
                        <button class="btn-remove-checkout" onclick="removeCheckoutItem(${index})" type="button">Remover</button>
                    </div>
                </div>
                <div class="item-price" style="font-weight: 800; color: #fff; font-size: 1rem; text-align: right;">
                    ${totalItemPriceHtml}
                </div>
            `;

            summaryItems.appendChild(itemEl);
        });


        if (subtotalEl) subtotalEl.textContent = `R$ ${currentSubtotal.toFixed(2).replace('.', ',')}`;
        if (totalEl) totalEl.textContent = `R$ ${currentSubtotal.toFixed(2).replace('.', ',')}`;

        validateWholesale();
    }
    window.addressIsComplete = false;

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function validateWholesale() {
        const saleType = localStorage.getItem('ignite_sale_type') || 'wholesale';
        const totalItems = checkoutCart.reduce((sum, item) => sum + item.quantity, 0);
        const freeShippingNotice = document.getElementById('free-shipping-notice');

        // Rewards Logic (Standardized - Exclusive Tiers)
        let discount = 0;
        let isFreeShipping = false;
        let finalProgress = 0;
        
        // Progress Calculation (Staggered scale: 10=20%, 30=50%, 40=75%, 50=100%)
        // Linear Proportional Scale (Fixed at 50 units range)
        finalProgress = Math.min((totalItems / 50) * 100, 100);



        let msg = "";
        let stage = "1";

        if (saleType === 'wholesale') {
            // New Exclusive Scaling Logic
            if (totalItems >= 30 && totalItems < 40) {
                discount = currentSubtotal * 0.05; // Tier 1: 5% Discount (30-39)
            }

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
        }


        const calculateDisplaySavings = () => {
            if (totalItems < 30) return 0;
            if (totalItems >= 30 && totalItems < 40) return currentSubtotal * 0.05;
            if (totalItems >= 40 && totalItems < 50) return 300.00; // 2 x Retail Price (R$ 150)
            if (totalItems >= 50) {
                const shippingSaving = window.selectedShippingCost ? (window.selectedShippingCost * 0.5) : 30.00; // 50% discount
                return 300.00 + shippingSaving;
            }
            return 0;
        };


        const totalSavedText = `Você já economizou: R$ ${calculateDisplaySavings().toFixed(2).replace('.', ',')}`;


        // UI Element Updates
        const stickyBar = document.getElementById('stickyCheckoutBar');
        const stickyFill = document.getElementById('upsellProgressFillSticky');
        const stickyMsg = document.getElementById('upsellMessageSticky');
        const stickySavings = document.getElementById('stickySavingsText');
        const upsellProgressFill = document.getElementById('upsellProgressFillCheckout');
        const staticProgressFill = document.getElementById('staticProgressFill');
        const staticMessage = document.getElementById('staticMessage');

        const allMarkers = document.querySelectorAll('.milestone-marker');


        if (staticProgressFill) {
            staticProgressFill.style.width = `${finalProgress}%`;
            staticProgressFill.setAttribute('data-stage', stage);
            if (staticMessage) staticMessage.innerHTML = `${msg} <br> <span class="promo-savings-value" style="font-size: 0.9rem; margin-top: 5px; display: inline-block;">${totalSavedText}</span>`;
        }

        if (upsellProgressFill) {
            upsellProgressFill.style.width = `${finalProgress}%`;
        }

        // --- Sticky Bar Update ---
        if (stickyBar) {
            if (totalItems > 0) stickyBar.classList.add('active');
            else stickyBar.classList.remove('active');

            if (stickyFill) stickyFill.style.width = `${finalProgress}%`;
            if (stickyMsg) stickyMsg.innerHTML = msg;
            if (stickySavings) stickySavings.textContent = totalSavedText;
        }

        allMarkers.forEach(m => {
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

        // --- Recalculate Totals & Update UI ---
        const shippingEl = document.querySelector('.shipping-value');
        let rawShippingVal = window.addressIsComplete ? (window.selectedShippingCost || 0) : 0;
        let shippingVal = rawShippingVal;
        
        const isShippingDiscount = (saleType === 'wholesale' && totalItems >= 50);
        
        if (isShippingDiscount && window.addressIsComplete) {
            shippingVal = rawShippingVal * 0.5; // 50% Discount
            if (shippingEl) {
                shippingEl.innerHTML = `
                    <span style="text-decoration: line-through; color: #888; font-size: 0.8rem;">R$ ${rawShippingVal.toFixed(2).replace('.', ',')}</span>
                    <span style="color: #ff0b55; font-weight: 800;">R$ ${shippingVal.toFixed(2).replace('.', ',')}</span>
                    <div style="font-size: 0.75rem; color: #ff0b55;">⚡ 50% OFF Ativado</div>
                `;
            }
        } else if (shippingEl) {
            shippingEl.textContent = window.addressIsComplete ? `R$ ${shippingVal.toFixed(2).replace('.', ',')}` : "Calculando...";
            shippingEl.style.color = "";
        }


        const discountedSubtotal = currentSubtotal - discount;
        const finalTotal = discountedSubtotal + shippingVal;

        if (subtotalEl) {
            if (discount > 0) {
                subtotalEl.innerHTML = `
                    <span style="text-decoration: line-through; color: #888; font-size: 0.8rem;">R$ ${currentSubtotal.toFixed(2).replace('.', ',')}</span>
                    <span style="color: #ff0b55;">R$ ${discountedSubtotal.toFixed(2).replace('.', ',')}</span>
                    <div style="font-size: 0.7rem; color: #ff0b55;">Economia de R$ ${discount.toFixed(2).replace('.', ',')} (Desconto Ativado)</div>
                `;
            } else {
                subtotalEl.textContent = `R$ ${currentSubtotal.toFixed(2).replace('.', ',')}`;
            }
        }

        if (totalEl) totalEl.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

        if (window.currentCepCalculated && !window.isCalculatingShipping) {
            window.isCalculatingShipping = true;
            fetchShippingOptions(window.currentCepCalculated).finally(() => {
                window.isCalculatingShipping = false;
            });
        }
    }

    function calculateCheckoutSavings(cart, totalQty) {
        if (totalQty < 30 || !cart || cart.length === 0) return 0;
        
        let savings = 0;
        let subtotal = 0;
        let avgPrice = 0;

        cart.forEach(item => {
            subtotal += (parseFloat(item.price) || 0) * (item.quantity || 1);
        });
        
        if (totalQty > 0) avgPrice = subtotal / totalQty;
        
        if (totalQty >= 30) {
            savings += subtotal * 0.05;
        }
        if (totalQty >= 40) {
            savings += (avgPrice * 2);
        }
        if (totalQty >= 50) {
            savings += 50; 
        }

        return savings;
    }


    // =========================================
    // 5. Submit Order (ZuckPay Integration)
    // =========================================
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (submitBtn.disabled) return;

            const required = ['email', 'name', 'phone', 'cpf', 'cep', 'address', 'number'];
            let hasError = false;

            required.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value) {
                    el.style.borderColor = '#ff0b55';
                    hasError = true;
                } else if (el) {
                    el.style.borderColor = '';
                }
            });

            const emailEl = document.getElementById('email');
            if (emailEl && !validateEmail(emailEl.value)) {
                emailEl.style.borderColor = '#ff0b55';
                alert("Por favor, insira um e-mail válido.");
                return;
            }

            if (hasError) {
                alert("Por favor, preencha todos os campos obrigatórios.");
                return;
            }

            const totalItems = checkoutCart.reduce((sum, item) => sum + item.quantity, 0);
            if (!window.selectedShippingMethod && totalItems < 50 && localStorage.getItem('ignite_sale_type') !== 'retail') {
                alert("Por favor, selecione uma opção de entrega antes de finalizar o pedido.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Processando...";

            const modal = document.getElementById('pix-modal');
            const modalLoader = document.getElementById('modal-loader');
            const modalReady = document.getElementById('modal-ready');
            const qrImg = document.getElementById('pix-qr');
            const pixInput = document.getElementById('pix-code');
            const closeBtn = document.getElementById('close-modal');
            const copyBtn = document.getElementById('btn-copy-pix');

            modal.classList.add('active');
            modalLoader.classList.remove('hidden');
            modalReady.classList.add('hidden');

            const name = document.getElementById('name').value;
            const cpf = document.getElementById('cpf').value;
            const items = checkoutCart;
            
            // Re-calcular total com base na nova lógica de escala exclusiva
            const baseSubtotal = items.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);
            const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
            let discount = 0;
            
            // 5% ONLY between 30 and 39
            if (totalItemsCount >= 30 && totalItemsCount < 40) {
                discount = baseSubtotal * 0.05;
            }
            const discountedSubtotal = baseSubtotal - discount;


            // Calculate shipping
            const shippingEl = document.querySelector('.shipping-value');
            const isFreeShipping = shippingEl?.textContent.includes('Grátis');
            const shippingVal = isFreeShipping ? 0 : window.selectedShippingCost;
            const shippingMethod = isFreeShipping ? 'Grátis (Transportadora Padrão)' : (window.selectedShippingMethod || 'Padrão');
            const finalTotal = parseFloat((discountedSubtotal + shippingVal).toFixed(2));

            // PIX via servidor local (proxy para ZuckPay)
            const pixPayload = {
                nome: name,
                cpf: cpf.replace(/\D/g, ''),
                email: document.getElementById('email').value,
                telefone: document.getElementById('phone').value.replace(/\D/g, ''),
                valor: finalTotal,
                urlnoty: 'https://olimpoods.digital/webhook/zuckpay'
            };

            const MAX_RETRIES = 3;
            const RETRY_DELAY = 3000;

            async function attemptPixGeneration(attempt) {
                console.log(`🔄 PIX: Tentativa ${attempt}/${MAX_RETRIES}...`);

                try {
                    let apiUrl = `/api/pix`;
                    let fetchOptions = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pixPayload)
                    };

                    const res = await fetch(apiUrl, fetchOptions);

                    // Robust Check: If not JSON or not OK, inspect body
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await res.text();
                        console.error("❌ Resposta não-JSON:", text);
                        throw new Error(`Erro no servidor (não-JSON). Status: ${res.status}`);
                    }

                    const data = await res.json();

                    if (data.transactionId || data.status === 'PENDING' || data.status === 'success' || data.qrcode || data.pix_code) {
                        console.log("✅ PIX gerado com sucesso. Transaction:", data.transactionId);
                        return data;
                    }

                    if (attempt < MAX_RETRIES && (res.status >= 500 || res.status === 404)) {
                        console.log(`⏳ Tentando novamente em ${RETRY_DELAY/1000}s...`);
                        await new Promise(r => setTimeout(r, RETRY_DELAY));
                        return attemptPixGeneration(attempt + 1);
                    }

                    throw new Error(data.message || 'Erro na API ZuckPay: resposta inesperada');

                } catch (err) {
                    if (attempt < MAX_RETRIES && !err.message.includes('não-JSON')) {
                        await new Promise(r => setTimeout(r, RETRY_DELAY));
                        return attemptPixGeneration(attempt + 1);
                    }
                    throw err;
                }
            }

            attemptPixGeneration(1)
                .then(data => handlePixSuccess(data))
                .catch(err => {
                    console.error("❌ Falha definitiva na geração do PIX:", err);

                    modal.classList.remove('active'); // Destrava o loader
                    
                    let userMsg;
                    if (err.message.includes('403')) {
                        userMsg = "⚠️ A API da ZuckPay bloqueou a requisição (erro 403).\n\nIsso pode significar que sua conta precisa de atenção. Entre em contato com o suporte da ZuckPay.";
                    } else if (err.message.includes('timed out') || err.message.includes('Conexão falhou')) {
                        userMsg = "⏳ O servidor da ZuckPay está demorando para responder.\n\nPor favor, tente novamente em alguns instantes.";
                    } else {
                        userMsg = "Erro ao gerar o PIX. Verifique sua conexão e tente novamente.\n\nDetalhes: " + err.message;
                    }

                    console.warn("⚠️ Pix falhou, mas salvando pedido como lead/pendente no Admin...");
                    
                    // Fallback: Save order even if PIX fails
                    const fallbackOrder = createOrderObject({ id: 'ERR-' + Math.floor(Math.random() * 9000) + 1000 });
                    syncOrderToAdmin(fallbackOrder);

                    alert(userMsg);
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Finalizar Pedido";
                    modal.classList.remove('active');
                });

            function createOrderObject(apiData = {}) {
                return {
                    id: apiData.external_id || apiData.id || Math.floor(Math.random() * 90000) + 10000,
                    date: new Date().toLocaleDateString('pt-BR'),
                    customer: {
                        name: name,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value
                    },
                    shipping: {
                        cep: document.getElementById('cep').value,
                        address: document.getElementById('address').value,
                        number: document.getElementById('number').value,
                        complement: document.getElementById('complement').value,
                        neighborhood: document.getElementById('neighborhood').value,
                        city: document.getElementById('city').value,
                        state: document.getElementById('state').value,
                        cost: shippingVal,
                        method: shippingMethod
                    },
                    items: items.map(i => ({
                        name: i.name,
                        qty: i.quantity,
                        price: parseFloat(i.price),
                        image: i.image,
                        flavor: i.flavor
                    })),
                    subtotal: discountedSubtotal,
                    total: finalTotal,
                    status: apiData.id ? 'Aguardando Pagamento' : 'Erro no Pagamento / Pendente',
                    agency: 'Olimpo Pods - Centro'
                };
            }

            function syncOrderToAdmin(order) {
                // Save locally first
                const userOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
                if (!userOrders.find(o => o.id === order.id)) {
                    userOrders.push(order);
                    localStorage.setItem('userOrders', JSON.stringify(userOrders));
                }

                // Push to Backend
                let apiUrl = `/api/orders/new`;
                let fetchOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(order)
                };

                fetch(apiUrl, fetchOptions).catch(err => console.error("Admin sync error:", err));
            }

            function handlePixSuccess(data) {
                // ZuckPay response format: { transactionId, qrcode, pix_code, qrcode_image, checkout_url, status }
                const rawCode = data.pix_code || data.qrcode || data.pix?.pix_qrcode_text || data.code || '';
                const qrImageUrl = data.qrcode_image || '';

                // Use direct QR image URL from ZuckPay if available, otherwise generate via external API
                if (qrImageUrl) {
                    qrImg.src = qrImageUrl;
                } else if (rawCode) {
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rawCode)}`;
                }

                pixInput.value = rawCode;
                modalLoader.classList.add('hidden');
                modalReady.classList.remove('hidden');

                // Use transactionId as the order ID
                const orderData = {
                    ...data,
                    id: data.transactionId || data.external_id || data.id || Math.floor(Math.random() * 90000) + 10000
                };

                const newOrder = createOrderObject(orderData);
                syncOrderToAdmin(newOrder);

                // Automatic Account Creation / Login
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', document.getElementById('email').value);
                localStorage.setItem('userName', name);
                
                // Meta Pixel: Purchase
                if (window.fbq) {
                    const totalValue = parseFloat(document.getElementById('final-total')?.textContent.replace('R$ ', '').replace(',', '.')) || 0;
                    fbq('track', 'Purchase', {
                        value: totalValue,
                        currency: 'BRL',
                        content_ids: checkoutCart.map(item => item.id),
                        content_type: 'product'
                    });
                }

                localStorage.removeItem('ignite_cart');

                startPixCountdown(newOrder);
            }


            function startPixCountdown(orderObj, ordersList) {
                const timerEl = document.getElementById('pix-countdown');
                const statusTitle = document.getElementById('payment-status-title');
                let timeLeft = 600; // 10 minutes
                let pollInterval;
                const simulateBtn = document.getElementById('btn-simulate-pay');
                const paymentDetails = document.getElementById('pix-payment-details');

                // If in Simulation Mode, show manual control button
                if (orderObj.id.toString().startsWith('SIM-')) {
                    if (simulateBtn) {
                        simulateBtn.classList.remove('hidden');
                        simulateBtn.onclick = () => {
                            simulateBtn.textContent = "Validando...";
                            setTimeout(() => confirmPayment(), 1200);
                        };
                    }
                } else {
                    if (simulateBtn) simulateBtn.classList.add('hidden');
                    // Active Polling for Real Payment Status (via local proxy)
                    pollInterval = setInterval(() => {
                        const orderId = orderObj.id;
                        const statusUrl = `${API_BASE}/api/pix/status/` + orderId;
                    fetch(statusUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_id: orderId })
                        })
                            .then(res => res.json())
                            .then(data => {
                                const status = (data.status || '').toLowerCase();
                                if (status === 'pago' || status === 'approved' || status === 'paid' || status === 'success') {
                                    confirmPayment();
                                }
                            })
                            .catch(err => console.warn("Polling error (silent):", err));

                    }, 8000); // Poll every 8 seconds
                }

                function confirmPayment() {
                    clearInterval(timerInterval);
                    if (pollInterval) clearInterval(pollInterval);

                    statusTitle.textContent = "PAGAMENTO CONFIRMADO!";
                    statusTitle.classList.add('confirmed');
                    statusTitle.style.color = "#00ff88";

                    if (timerEl) timerEl.style.display = "none";
                    if (paymentDetails) paymentDetails.classList.add('hidden');

                    orderObj.status = "Pago & Aprovado";
                    localStorage.setItem('userOrders', JSON.stringify(ordersList));
                    
                    // Trigger PDF generation on server
                    const payUrl = `${API_BASE}/api/orders/${orderObj.id}/pay`;
                fetch(payUrl, { method: 'POST' })
                    .then(() => {
                    })
                        .catch(err => console.warn("Erro ao notificar servidor sobre pagamento:", err));

                    const readyMsg = document.querySelector('.modal-subtitle');
                    if (readyMsg) {
                        readyMsg.innerHTML = "<strong>Tudo certo!</strong><br>Seu pedido já está em processamento.";
                        readyMsg.style.color = "#00ff88";
                    }

                    // Trigger the Prize Wheel
                    setTimeout(() => {
                        window.initPrizeWheel();
                    }, 2000);
                }

                const timerInterval = setInterval(() => {
                    timeLeft--;
                    const minutes = Math.floor(timeLeft / 60);
                    const seconds = timeLeft % 60;
                    if (timerEl) {
                        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    }

                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        if (pollInterval) clearInterval(pollInterval);

                        statusTitle.textContent = "PIX Expirado";
                        statusTitle.style.color = "#ff0b55";
                        if (timerEl) timerEl.textContent = "00:00";

                        if (paymentDetails) {
                            paymentDetails.innerHTML = `<p style="color: #ff4444; margin: 20px 0;">O tempo para pagamento expirou. Por favor, reinicie o checkout.</p>`;
                        }
                    }
                }, 1000);
            }

            closeBtn.onclick = () => {
                modal.classList.remove('active');
                window.location.href = "index.html?order=pending";
            };

            copyBtn.onclick = () => {
                pixInput.select();
                document.execCommand('copy');
                copyBtn.textContent = "Copiado!";
                setTimeout(() => copyBtn.textContent = "Copiar", 2000);
            };
        });
    }

    // =========================================
    // 6. Prize Wheel Logic
    // =========================================
    window.initPrizeWheel = () => {
        const wheelModal = document.getElementById('wheelModal');
        const wheelContainer = document.querySelector('.wheel-container');
        const wheel = document.getElementById('prizeWheel');
        const spinBtn = document.getElementById('spinBtn');
        const result = document.getElementById('prizeResult');
        const closeWheel = document.getElementById('closeWheelModal');

        if (!wheelModal || !wheel) return;

        const prizes = [
            "5% de desconto",
            "Ignite V80",
            "Ignite V150",
            "10% de desconto",
            "Ignite V50",
            "Ignite V40",
            "Ignite v400 mix",
            "Blacksheep 30k",
            "Elfbar 40k",
            "Lostmary 20k",            "Waka 12k"
        ];

        // 1. Inject Bulbs around the container
        if (wheelContainer) {
            // Remove existing bulbs if any
            wheelContainer.querySelectorAll('.wheel-bulb').forEach(b => b.remove());
            const bulbCount = 12;
            for (let i = 0; i < bulbCount; i++) {
                const bulb = document.createElement('div');
                bulb.className = 'wheel-bulb';
                const angle = (i * (360 / bulbCount)) - 90;
                const radius = 210; // Half of 420px width
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                bulb.style.left = `calc(50% + ${x}px - 6px)`;
                bulb.style.top = `calc(50% + ${y}px - 6px)`;
                bulb.style.animationDelay = `${i * 0.1}s`;
                wheelContainer.appendChild(bulb);
            }
        }

        // 2. Render 12 Segments
        wheel.innerHTML = `
            <div class="wheel-center-cap"></div>
            ${prizes.map((p, i) => {
            const angle = i * 30;
            return `
                <div class="wheel-segment" style="transform: rotate(${angle}deg)">
                    <span style="transform: rotate(15deg)">${p}</span>
                </div>
            `}).join('')}
        `;

        wheelModal.classList.add('active');

        let isSpinning = false;

        spinBtn.onclick = () => {
            if (isSpinning) return;
            isSpinning = true;
            result.textContent = "";

            // Each spin should land precisely in the middle of a 30deg segment
            // 30deg/slice. Offset by 15deg to land center-slice.
            const fullSpins = 5 + Math.floor(Math.random() * 5);
            const randomSlice = Math.floor(Math.random() * 12);
            // rotation = full circles + (slice target)
            // Note: pointer is at top (0deg). Slices rotate clockwise.
            // Prize at index 0 is at 0-30deg. 
            // Result is calculated as (360 - actualRotation % 360)
            const finalRotation = (fullSpins * 360) + (randomSlice * 30);

            wheel.style.transform = `rotate(${finalRotation}deg)`;

            setTimeout(() => {
                isSpinning = false;
                const actualRotation = finalRotation % 360;
                // Index 0 is at 0-30. If rotation is 0, pointer is at segment 0.
                const prizeIndex = (12 - Math.floor((actualRotation % 360) / 30)) % 12;

                result.textContent = `Você ganhou: ${prizes[prizeIndex]}! 🎉`;
                localStorage.setItem('lastPrize', prizes[prizeIndex]);
            }, 6000); // Match CSS transition
        };

        closeWheel.onclick = () => wheelModal.classList.remove('active');
    };

    renderCart();
});
