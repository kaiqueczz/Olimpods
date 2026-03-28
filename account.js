/* ============================================
   IGNITE — E-commerce Landing Page
   JavaScript — User Dashboard Logic (account.html)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Verifica se Supabase está Inicializado
    if (typeof window.supabaseClient === 'undefined') {
        console.error('Supabase Client não encontrado.');
        window.location.href = 'login.html';
        return;
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();

    // 2. Proteção de Rota (Redireciona para Login se não houver sessão)
    if (!session || error) {
        window.location.href = 'login.html';
        return;
    }

    // 3. Saudação do Usuário
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const userGreeting = document.getElementById('userGreeting');
    
    const email = session.user.email;
    const namePart = email.split('@')[0];
    const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    
    if (userGreeting) userGreeting.textContent = `Olá, ${capitalizedName}`;
    if (userEmailDisplay) userEmailDisplay.textContent = email;

    // LIMPEZA DE CONTA TESTE (conceptsttw)
    if (email === 'conceptsttw@gmail.com') {
        localStorage.removeItem('userOrders');
        localStorage.removeItem('ignite_cart');
    }

    // 4. Carregar Pedidos Simulados (ou do LocalStorage)
    renderOrders();

    // 5. Botão de Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const originalText = logoutBtn.textContent;
            logoutBtn.textContent = 'Saindo...';
            logoutBtn.style.opacity = '0.5';
            logoutBtn.style.pointerEvents = 'none';

            const { error: signOutError } = await supabaseClient.auth.signOut();
            
            if (signOutError) {
                console.error('Erro ao deslogar:', signOutError);
                alert('Erro ao tentar sair da conta. Tente novamente.');
                logoutBtn.textContent = originalText;
                logoutBtn.style.opacity = '1';
                logoutBtn.style.pointerEvents = 'auto';
            } else {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html'; 
            }
        });
    }

    // 6. Carregar Barra de Upsell
    renderUpsellProducts();
});

// Função para renderizar a barra de produtos com carrossel horizontal premium
async function renderUpsellProducts() {
    const barContainer = document.getElementById('upsellProductsBar');
    const nextBtn = document.getElementById('nextBtnAccount');
    const prevBtn = document.getElementById('prevBtnAccount');
    if (!barContainer) return;

    try {
        const response = await fetch('products.json?v=' + Date.now());
        if (!response.ok) throw new Error();
        const allProducts = await response.json();
        
        // 1. Brand Prioritization
        let cart = [];
        try { cart = JSON.parse(localStorage.getItem('ignite_cart')) || []; } catch(e) {}
        const cartBrands = [...new Set(cart.map(item => item.brand || 'Olimpo'))];
        
        const sorted = allProducts.sort((a, b) => {
            const aMatch = cartBrands.includes(a.brand || 'Olimpo');
            const bMatch = cartBrands.includes(b.brand || 'Olimpo');
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });

        const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // 2. Update Progress Bar
        const progressFill = document.getElementById('accountProgressFill');
        const mainMsg = document.querySelector('.upsell-copy .main-msg');
        
        if (progressFill) {
            let finalProgress = 0;
            let msg = "";
            
            if (totalQty < 30) {
                finalProgress = (totalQty / 30) * 60;
                msg = `Faltam <b>${30 - totalQty}</b> itens para 5% de desconto`;
            } else if (totalQty < 50) {
                finalProgress = 60 + ((totalQty - 30) / 20) * 40;
                msg = `🎉 5% OFF Ativado! Faltam <b>${50 - totalQty}</b> para <b>Frete Grátis</b>`;
            } else {
                finalProgress = 100;
                msg = `<span style="color: #00ff88;">🔥 Frete Grátis e 5% OFF Ativados! Nível Máximo Alcançado.</span>`;
            }
            
            progressFill.style.width = `${finalProgress}%`;
            if (mainMsg) mainMsg.innerHTML = msg;
        }

        barContainer.innerHTML = '';

        sorted.forEach((product, index) => {
            const wholesalePrice = parseFloat(product.price);
            const discountPrice = wholesalePrice * 0.95;
            const finalPrice = totalQty >= 30 ? discountPrice : wholesalePrice;

            const card = document.createElement('div');
            card.className = `product-card glow-card animate-in`;
            card.style.animationDelay = `${index * 0.05}s`;

            card.innerHTML = `
                <div class="product-image">
                  <button class="product-wishlist" aria-label="Favoritar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  </button>
                  ${(() => {
                    let imgSrc = product.image || 'assets/logo-ignite.png';
                    if (imgSrc && !imgSrc.includes('/') && !imgSrc.startsWith('http')) {
                        imgSrc = 'Images Pods/' + imgSrc;
                    }
                    return `<img src="${imgSrc}" alt="${product.name}" class="product-img-real" onerror="this.src='assets/logo-ignite.png'">`;
                  })()}
                </div>
                <div class="product-info">
                  <div class="product-brand">${product.brand || 'Olimpo'}</div>
                  <h3 class="product-name">${product.name}</h3>
                  <div class="product-footer">
                    <div class="product-price">
                      <span class="current" style="color: ${totalQty >= 30 ? '#00ff88' : '#fff'}">R$ ${finalPrice.toFixed(2).replace('.', ',')}</span>
                      ${totalQty >= 30 ? `<span class="original" style="text-decoration: line-through; color: #666; font-size: 0.8rem;">R$ ${wholesalePrice.toFixed(2).replace('.', ',')}</span>` : ''}
                    </div>
                    <a href="product.html?id=${product.id}" class="buy-now-btn" aria-label="Ver mais">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                  </div>
                </div>
            `;
            barContainer.appendChild(card);
        });

        // 2. Carousel Advanced Controls
        const updateArrows = () => {
            const scrollLeft = barContainer.scrollLeft;
            const maxScroll = barContainer.scrollWidth - barContainer.clientWidth;
            
            if (prevBtn) {
                if (scrollLeft <= 10) prevBtn.classList.add('hidden');
                else prevBtn.classList.remove('hidden');
            }
            if (nextBtn) {
                if (scrollLeft >= maxScroll - 10) nextBtn.classList.add('hidden');
                else nextBtn.classList.remove('hidden');
            }
        };

        const getScrollAmount = () => {
            const firstCard = barContainer.querySelector('.product-card');
            if (!firstCard) return 300;
            const cardWidth = firstCard.offsetWidth;
            const style = window.getComputedStyle(barContainer);
            const gap = parseInt(style.gap) || 20;
            return cardWidth + gap;
        };

        if (nextBtn) {
            nextBtn.onclick = () => {
                const amount = getScrollAmount();
                barContainer.scrollBy({ left: amount, behavior: 'smooth' });
                // Usando active check para botões mais responsivos
                requestAnimationFrame(() => {
                    setTimeout(updateArrows, 500);
                });
            };
        }
        if (prevBtn) {
            prevBtn.onclick = () => {
                const amount = getScrollAmount();
                barContainer.scrollBy({ left: -amount, behavior: 'smooth' });
                requestAnimationFrame(() => {
                    setTimeout(updateArrows, 500);
                });
            };
        }

        let isScrolling;
        barContainer.addEventListener('scroll', () => {
            window.clearTimeout(isScrolling);
            isScrolling = setTimeout(updateArrows, 100);
        }, { passive: true });
        updateArrows(); 

    } catch (e) {
        console.error('Erro ao carregar produtos para upsell:', e);
        barContainer.innerHTML = '<p style="color: #666;">Não foi possível carregar as ofertas no momento.</p>';
    }
}

// Função para renderizar histórico de pedidos do usuário
function renderOrders() {
    const listContainer = document.getElementById('accountOrdersList');
    if (!listContainer) return;

    let userOrders = [];
    try {
        userOrders = JSON.parse(localStorage.getItem('userOrders')) || [];
    } catch(e) {
        userOrders = [];
    }

    const MOCK_ORDER_IDS = ['54321', '12345'];
    userOrders = userOrders.filter(o => !MOCK_ORDER_IDS.includes(String(o.id).replace('ORD-', '')));

    if (userOrders.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 40px 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom: 15px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                </svg>
                <p>Você ainda não possui nenhum pedido concluído na sua conta.</p>
                <a href="index.html#produtos" class="btn-auth" style="margin-top: 15px; text-decoration: none;">Comprar Agora</a>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = ''; 

    userOrders.forEach(order => {
        let statusColor = '#00ff88'; 
        if (order.status.toLowerCase().includes('produção') || order.status.toLowerCase().includes('processamento')) {
            statusColor = '#f39c12';
        }

        const orderHtml = `
            <div class="order-item">
                <div class="order-info">
                    <span class="order-id">Pedido #${order.id.replace('ORD-', '')}</span>
                    <span class="order-date">Realizado em ${order.date} • ${order.total}</span>
                </div>
                <div class="order-status" style="color: ${statusColor}; background: ${statusColor}1A; border-color: ${statusColor}33;">
                    ${order.status}
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', orderHtml);
    });
}
