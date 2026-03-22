/* ============================================
   IGNITE — Checkout Page Logic
   Smart Shipping & Payment Integration
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // Forced login check removed to allow automatic account creation during checkout
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
    // 2. Smart Shipping (CEP Lookup)
    // =========================================
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

        const options = [
            { group: "Correios", isGroupRecommended: false, name: "PAC", price: 140, deadline: "10 dias úteis", recommended: false },
            { group: "Correios", isGroupRecommended: false, name: "SEDEX", price: 150, deadline: "6 dias úteis", recommended: false },
            { group: "Transportadoras", isGroupRecommended: true, name: "Jadlog", price: 290, deadline: "12 dias úteis", recommended: false },
            { group: "Transportadoras", isGroupRecommended: true, name: "Loggi", price: 160, deadline: "15 dias úteis", recommended: false },
        ];

        let htmlContent = '';
        let currentGroup = '';

        options.forEach(opt => {
            if (opt.group !== currentGroup) {
                currentGroup = opt.group;
                const groupBadge = opt.isGroupRecommended ? `<span style="background: var(--accent-primary); color: #fff; font-size: 0.70rem; font-weight: bold; padding: 4px 8px; border-radius: 4px; margin-left: 10px; text-transform: uppercase; letter-spacing: 0.5px;">* MAIS INDICADO</span>` : '';
                htmlContent += `<div style="margin-top: 20px; margin-bottom: 12px; font-weight: 700; color: #fff; font-size: 1.15rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; display: flex; align-items: center;">${currentGroup} ${groupBadge}</div>`;
            }

            const recBadge = opt.recommended ? `<span style="background: var(--accent-primary); color: #fff; font-size: 0.65rem; font-weight: bold; padding: 3px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.5px;">* Mais indicado</span>` : '';
            
            htmlContent += `
                <label class="shipping-option" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:15px; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; margin-bottom: 10px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <input type="radio" name="shippingMethod" value="${opt.price}" data-name="${opt.name}" onchange="updateShippingSelection(this)" style="accent-color: var(--accent-primary); width: 20px; height: 20px; cursor: pointer;">
                        <div class="shipping-info" style="display:flex; flex-direction:column;">
                            <span class="shipping-name" style="font-weight:600; color:#fff; font-size:1.1rem; display: flex; align-items: center;">${opt.name} ${recBadge}</span>
                            <span class="shipping-deadline" style="font-size:0.85rem; color:#aaa; margin-top: 3px;">Entrega em até ${opt.deadline}</span>
                        </div>
                    </div>
                    <span class="shipping-price" style="font-weight:700; color:var(--accent-primary); font-size:1.15rem;">R$ ${opt.price.toFixed(2).replace('.', ',')}</span>
                </label>
            `;
        });

        list.innerHTML = htmlContent;

        // Limpa a seleção forçando o usuário a escolher
        window.selectedShippingCost = 0;
        window.selectedShippingMethod = '';
        if (typeof validateWholesale === 'function') validateWholesale();
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
    const summaryItems = document.getElementById('summary-items');
    const subtotalEl = document.getElementById('summary-subtotal');
    const totalEl = document.getElementById('summary-total');
    const submitBtn = document.getElementById('submit-purchase');

    let checkoutCart = JSON.parse(localStorage.getItem('ignite_cart')) || [];
    let currentSubtotal = 0; // Broader scope for validation

    window.updateCheckoutQty = (index, delta) => {
        checkoutCart[index].quantity += delta;
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

        checkoutCart.forEach((item, index) => {
            const price = parseFloat(item.price);
            currentSubtotal += price * item.quantity;

            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';

            // Ensure image path is correct
            let imgSrc = item.image || 'assets/logo-ignite.png';
            // If it's a simple filename like 'Ignite_v300-removebg-preview.png', prepend 'Images Pods/'
            if (imgSrc && !imgSrc.includes('/') && !imgSrc.startsWith('http')) {
                imgSrc = 'Images Pods/' + imgSrc;
            }

            itemEl.innerHTML = `
                <div class="item-img">
                    <img src="${imgSrc}" alt="${item.name}" onerror="this.src='assets/logo-ignite.png'">
                </div>
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-flavor">Sabor: ${item.flavor || 'N/A'}</span>
                    <div class="item-controls">
                        <div class="qty-stepper">
                            <button onclick="updateCheckoutQty(${index}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCheckoutQty(${index}, 1)">+</button>
                        </div>
                        <button class="btn-remove-checkout" onclick="removeCheckoutItem(${index})">Remover</button>
                    </div>
                </div>
                <div class="item-price">R$ ${(price * item.quantity).toFixed(2).replace('.', ',')}</div>
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
        const warningId = 'wholesale-warning';
        let warning = document.getElementById(warningId);

        if (saleType === 'retail') {
            if (warning) warning.remove();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }

            const shippingValEl = document.querySelector('.shipping-value');
            if (freeShippingNotice) {
                freeShippingNotice.style.display = 'block';
                if (totalItems >= 50) {
                    freeShippingNotice.textContent = "✓ Você ganhou frete grátis!";
                    freeShippingNotice.style.color = "#00ff88";
                } else {
                    freeShippingNotice.textContent = `Faltam ${50 - totalItems} peças para ganhar Frete Grátis`;
                    freeShippingNotice.style.color = "#888";
                }
            }

            if (totalItems >= 50) {
                if (shippingValEl) {
                    shippingValEl.textContent = window.addressIsComplete ? "Grátis" : "---";
                    shippingValEl.style.color = window.addressIsComplete ? "#00ff88" : "";
                }
            } else {
                if (shippingValEl) {
                    shippingValEl.textContent = window.addressIsComplete ? `R$ ${window.selectedShippingCost.toFixed(2).replace('.', ',')}` : "---";
                    shippingValEl.style.color = "";
                }
            }

            // Update Total with shipping
            const shippingCost = (window.addressIsComplete && totalItems < 50) ? window.selectedShippingCost : 0;
            const finalTotal = currentSubtotal + shippingCost;
            if (totalEl) totalEl.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

            return;
        }

        const freeShippingNotice = document.getElementById('free-shipping-notice');
        if (freeShippingNotice) {
            freeShippingNotice.style.display = 'block';
            if (totalItems >= 50) {
                freeShippingNotice.textContent = "✓ Você ganhou frete grátis!";
                freeShippingNotice.style.color = "#00ff88";
            } else {
                freeShippingNotice.textContent = `Faltam ${50 - totalItems} peças para ganhar Frete Grátis`;
                freeShippingNotice.style.color = "#888";
            }
        }

        const shippingValEl = document.querySelector('.shipping-value');
        if (totalItems >= 50) {
            if (shippingValEl) {
                shippingValEl.textContent = window.addressIsComplete ? "Grátis" : "---";
                shippingValEl.style.color = window.addressIsComplete ? "#00ff88" : "";
            }
        } else {
            if (shippingValEl) {
                shippingValEl.textContent = window.addressIsComplete ? `R$ ${window.selectedShippingCost.toFixed(2).replace('.', ',')}` : "---";
                shippingValEl.style.color = "";
            }
        }

        const shippingCost = (window.addressIsComplete && totalItems < 50) ? window.selectedShippingCost : 0;
        const finalTotal = currentSubtotal + shippingCost;
        if (totalEl) totalEl.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

        if (totalItems < 10) {
            if (!warning) {
                warning = document.createElement('div');
                warning.id = warningId;
                warning.style.color = '#ff0b55';
                warning.style.background = 'rgba(255, 11, 85, 0.1)';
                warning.style.padding = '15px';
                warning.style.borderRadius = '8px';
                warning.style.marginBottom = '20px';
                warning.style.fontSize = '0.9rem';
                warning.style.fontWeight = '600';
                warning.style.border = '1px solid rgba(255, 11, 85, 0.2)';
                const grid = document.querySelector('.checkout-grid');
                if (grid) grid.parentNode.insertBefore(warning, grid);
            }
            warning.innerHTML = `⚠️ <strong>Atenção:</strong> Pedidos somente acima de 10 peças. Você tem apenas ${totalItems}. <a href="index.html#produtos" style="color: var(--accent-primary); text-decoration: underline;">Adicione mais itens</a> para finalizar.`;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
            }
        } else {
            if (warning) warning.remove();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        }
    }

    // =========================================
    // 5. Submit Order (ZuckPay Integration)
    // =========================================
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (submitBtn.disabled) return;

            const required = ['email', 'name', 'phone', 'cpf', 'cep', 'address', 'number', 'password', 'confirm-password'];
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

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password.length < 6) {
                alert("A senha deve ter pelo menos 6 caracteres.");
                return;
            }

            if (password !== confirmPassword) {
                alert("As senhas não coincidem.");
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
            const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);

            // Calculate shipping before API call to ensure correct total in PIX
            const shippingEl = document.querySelector('.shipping-value');
            const isFreeShipping = shippingEl?.textContent.includes('Grátis');
            const shippingVal = isFreeShipping ? 0 : window.selectedShippingCost;
            const shippingMethod = isFreeShipping ? 'Grátis (Transportadora Padrão)' : (window.selectedShippingMethod || 'Padrão');
            const finalTotal = parseFloat((subtotal + shippingVal).toFixed(2));

            // PIX via servidor local (proxy para ZuckPay)
            const pixPayload = {
                nome: name,
                cpf: cpf.replace(/\D/g, ''),
                valor: finalTotal,
                urlnoty: 'https://olimpomods.com.br/webhook/zuckpay'
            };

            const MAX_RETRIES = 3;
            const RETRY_DELAY = 3000; // 3 seconds between retries

            async function attemptPixGeneration(attempt) {
                console.log(`🔄 PIX: Tentativa ${attempt}/${MAX_RETRIES}...`);

                try {
                    const res = await fetch('/api/pix/qrcode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pixPayload)
                    });

                    const data = await res.json();

                    // Check for success (ZuckPay real response uses payment_code or pix object)
                    if (data.status === 'success' || data.qrcode || data.pix_code || data.code || data.payment_code || data.pix) {
                        console.log("✅ PIX gerado com sucesso na tentativa", attempt);
                        return data;
                    }

                    // API returned an error
                    console.warn(`⚠️ PIX tentativa ${attempt} falhou:`, data);

                    // If we have retries left and the error is transient
                    if (attempt < MAX_RETRIES) {
                        const isTransient = res.status >= 500 || res.status === 404;
                        if (isTransient) {
                            console.log(`⏳ Aguardando ${RETRY_DELAY / 1000}s antes da próxima tentativa...`);
                            await new Promise(r => setTimeout(r, RETRY_DELAY));
                            return attemptPixGeneration(attempt + 1);
                        }
                    }

                    // Non-retryable or exhausted retries
                    throw new Error(data.message || "Erro na API ZuckPay");

                } catch (err) {
                    // Network-level fetch errors (server offline, etc.)
                    if (attempt < MAX_RETRIES) {
                        console.log(`⏳ Erro de rede, tentando novamente em ${RETRY_DELAY / 1000}s...`);
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

                    let userMsg;
                    if (err.message.includes('403')) {
                        userMsg = "⚠️ A API da ZuckPay bloqueou a requisição (erro 403).\n\nIsso pode significar que sua conta precisa de atenção. Entre em contato com o suporte da ZuckPay.";
                    } else if (err.message.includes('timed out') || err.message.includes('Conexão falhou')) {
                        userMsg = "⏳ O servidor da ZuckPay está demorando para responder.\n\nPor favor, tente novamente em alguns instantes.";
                    } else {
                        userMsg = "Erro ao gerar o PIX. Verifique sua conexão e tente novamente.\n\nDetalhes: " + err.message;
                    }

                    alert(userMsg);
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Finalizar Pedido";
                    modal.classList.remove('active');
                });

            function handlePixSuccess(data) {
                // Support multiple possible response structures from ZuckPay
                const rawCode = data.pix?.pix_qrcode_text || data.code || data.pix_code || data.qrcode;
                const isUrl = (data.qrcode && data.qrcode.startsWith('http')) || (data.qrcode_base64);

                // If it's a raw PIX code, generate a QR image for it
                if (!isUrl && rawCode) {
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rawCode)}`;
                } else {
                    qrImg.src = data.qrcode_base64 || data.qrcode;
                }

                pixInput.value = rawCode;

                modalLoader.classList.add('hidden');
                modalReady.classList.remove('hidden');

                const newOrder = {
                    id: data.external_id || data.id || Math.floor(Math.random() * 90000) + 10000,
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
                    subtotal: subtotal,
                    total: finalTotal,
                    status: 'Aguardando Pagamento',
                    agency: 'Olimpo Pods - Centro'
                };

                const userOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
                userOrders.push(newOrder);
                localStorage.setItem('userOrders', JSON.stringify(userOrders));

                // Send to backend Admin Dashboard globally
                fetch('/api/orders/new', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrder)
                }).catch(err => console.error("Admin sync error:", err));

                // Automatic Account Creation / Login
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', document.getElementById('email').value);
                localStorage.setItem('userName', name);

                localStorage.removeItem('ignite_cart');

                // Start countdown and handle confirmation
                startPixCountdown(newOrder, userOrders);
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
                        fetch('/api/pix/status/' + orderId, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
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
