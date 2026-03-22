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

    // 4. Carregar Pedidos Simulados (ou do LocalStorage)
    renderOrders();

    // 5. Botão de Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            
            // Estado de carregamento visual no botão
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
                window.location.href = 'index.html'; // Volta pra home após deslogar
            }
        });
    }
    // 6. Atualizar Banner de Upsell
    updateUpsellBanner();

});

// Função para dinamicamente alterar o texto do upsell com base no carrinho
function updateUpsellBanner() {
    const upsellText = document.getElementById('dynamicUpsellText');
    if (!upsellText) return;

    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('ignite_cart')) || [];
    } catch (e) {
        cart = [];
    }

    const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Regra provisória de exemplo (meta de peças baseada no feedback do usuário)
    // Se não tiver nada, incentiva a adicionar. Se tiver algo, calcula o que falta.
    if (totalQty === 0) {
        upsellText.innerHTML = 'Somente se você comprar agora será válida a promoção. Adicione produtos ao carrinho e aproveite a oferta oficial.';
    } else {
        // Exemplo: se tem peças, calcular falta para um bônus fantasma (ou usar a variação sugerida +15)
        // Para simular a fala "Se ele tiver colocado 50 peças, a mensagem deve aparecer 'Adicione mais 15 peças'"
        const bonusTarget = totalQty + 15; // Placeholder lógico (sempre +15 pra simular a oferta da tela do mockup)
        
        upsellText.innerHTML = `Você já tem <strong>${totalQty} peças</strong>. Adicione mais <strong>15 peças</strong> e aproveite a oferta exclusiva oficial!`;
    }
}

// Função para renderizar histórico de pedidos do usuário
function renderOrders() {
    const listContainer = document.getElementById('accountOrdersList');
    if (!listContainer) return;

    // Tentar puxar do armazenamento local (se o site salvar pedidos lá)
    let userOrders = [];
    try {
        userOrders = JSON.parse(localStorage.getItem('userOrders')) || [];
    } catch(e) {
        userOrders = [];
    }

    // Se não houver nenhum pedido salvo, mostramos UI vazia corretamente
    if (userOrders.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 40px 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom: 15px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                </svg>
                <p>Você ainda não possui nenhum pedido concluído na sua conta.</p>
                <a href="index.html#produtos" class="btn-auth" style="display:inline-block; margin-top: 15px; padding: 10px 20px; text-decoration: none;">Comprar Agora</a>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = ''; // Limpa o "Carregando..."

    userOrders.forEach(order => {
        let statusColor = '#00ff88'; // Verde para Entregue por padrão (vamos usar o vermelho se quiser mas verde remete a check)
        
        if (order.status.toLowerCase().includes('produção') || order.status.toLowerCase().includes('processamento')) {
            statusColor = '#f39c12'; // Laranja
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
