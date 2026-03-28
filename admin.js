document.addEventListener('DOMContentLoaded', () => {

    // --- Navigation ---
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    document.getElementById('refresh-orders')?.addEventListener('click', fetchData);
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('olimpo_admin_pass');
        window.location.reload();
    });

    let currentData = { users: [], orders: [], products: [] };
    let orderFilter = 'all'; // 'all' or 'paid'
    let orderSearchQuery = '';

    // --- Data Fetching ---
    async function fetchData() {
        let adminPass = localStorage.getItem('olimpo_admin_pass') || 'olimpo2026';
        
        const refreshBtn = document.getElementById('refresh-orders');
        if (refreshBtn) refreshBtn.textContent = "Atualizando...";

        try {
            const res = await fetch('/api/admin/data', {
                headers: { 'x-admin-password': adminPass }
            });
            
            if(res.status === 401) {
                const newPass = prompt("Senha administrativa incorreta. Por favor, insira a senha correta:");
                if (newPass) {
                    localStorage.setItem('olimpo_admin_pass', newPass);
                    fetchData();
                }
                return;
            }

            const data = await res.json();
            if(data.status === 'success') {
                currentData = data;
                applyFiltersAndRender();
                
                document.getElementById('total-users-count').textContent = (data.users || []).length;
                document.getElementById('total-orders-count').textContent = (data.orders || []).length;
            }
        } catch(e) {
            console.warn("Soft fetch error:", e);
            if (currentData.orders.length === 0) {
                showToast("Erro de conexão com o servidor.", true);
            }
        } finally {
            if (refreshBtn) refreshBtn.textContent = "⟳ Atualizar";
        }
    }

    function applyFiltersAndRender() {
        let filteredOrders = currentData.orders || [];
        
        // Apply Status Filter
        if (orderFilter === 'paid') {
            filteredOrders = filteredOrders.filter(o => {
                const s = (o.status || '').toLowerCase();
                return s.includes('pago') || s.includes('aprovado') || s.includes('enviado');
            });
        }

        // Apply Search Filter (Location, Name, ID)
        if (orderSearchQuery) {
            const q = orderSearchQuery.toLowerCase();
            filteredOrders = filteredOrders.filter(o => {
                const name = (o.customer?.name || '').toLowerCase();
                const email = (o.customer?.email || '').toLowerCase();
                const address = (o.shipping?.address || '').toLowerCase();
                const neighborhood = (o.shipping?.neighborhood || '').toLowerCase();
                const city = (o.shipping?.city || '').toLowerCase();
                const cep = (o.shipping?.cep || '').toLowerCase();
                const agency = (o.agency || '').toLowerCase();
                const id = (o.id || '').toLowerCase();

                return name.includes(q) || 
                       email.includes(q) ||
                       address.includes(q) || 
                       neighborhood.includes(q) || 
                       city.includes(q) || 
                       cep.includes(q) ||
                       agency.includes(q) ||
                       id.includes(q);
            });
        }

        renderUsers(currentData.users || []);
        renderOrders(filteredOrders);
        renderFinance(currentData.orders || [], currentData.products || []);
        renderStock(currentData.products || [], currentData.orders || []);
    }

    // Search Input Listener
    document.getElementById('order-search-input')?.addEventListener('input', (e) => {
        orderSearchQuery = e.target.value;
        applyFiltersAndRender();
    });

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            orderFilter = btn.getAttribute('data-filter');
            applyFiltersAndRender();
        });
    });

    // --- Render Users (Leads) ---
    function renderUsers(users) {
        const container = document.getElementById('users-table-body');
        if (!container) return;
        container.innerHTML = '';

        if (users.length === 0) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#8b949e;">Nenhum lead cadastrado ainda.</td></tr>';
            return;
        }

        [...users].reverse().forEach(u => {
            const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '---';
            const statusClass = u.verified ? 'verified-badge' : 'unverified-badge';
            const statusText = u.verified ? 'Verificado' : 'Pendente';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${date}</td>
                <td><strong style="color:white;">${u.fullname || u.name || '---'}</strong></td>
                <td>${u.email}</td>
                <td>${u.phone || '---'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            `;
            container.appendChild(tr);
        });
    }

    // --- Render Orders ---
    function renderOrders(orders) {
        const container = document.getElementById('orders-container');
        if (!container) return;
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p style="color:#8b949e; padding: 20px;">Nenhum pedido encontrado.</p>';
            return;
        }

        [...orders].reverse().forEach(order => {
            const brandMap = {};
            (order.items || []).forEach(item => {
                let nameLower = (item.name || '').toLowerCase();
                let brand = "OUTROS";
                if(nameLower.includes("ignite")) brand = "IGNITE";
                else if(nameLower.includes("elfbar") || nameLower.includes("elf bar")) brand = "ELFBAR";
                else if(nameLower.includes("oxbar")) brand = "OXBAR";
                else if(nameLower.includes("nikbar")) brand = "NIKBAR";
                else if(nameLower.includes("blacksheep") || nameLower.includes("black sheep")) brand = "BLACKSHEEP";
                else if(nameLower.includes("lost")) brand = "LOST MARY";
                else if(nameLower.includes("waka")) brand = "WAKA";

                if(!brandMap[brand]) brandMap[brand] = [];
                brandMap[brand].push(item);
            });

            let packingHtml = '';
            for (const [brand, items] of Object.entries(brandMap)) {
                packingHtml += `
                    <div class="brand-group">
                        <div class="brand-name">${brand}</div>
                        <ul class="brand-items">
                            ${items.map(i => {
                                const qty = i.qty || i.quantity || 0;
                                return `
                                    <li>
                                        <span>${qty}x ${i.name} ${i.flavor ? '<span style="font-size:0.75rem; color:#8b949e;">('+i.flavor+')</span>' : ''}</span>
                                        <span class="item-qty">${qty}</span>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }

            let statusClass = "status-pending";
            let statusText = order.status || "Aguardando Pagamento";
            const lowerStatus = statusText.toLowerCase();
            if(lowerStatus.includes('pago') || lowerStatus.includes('aprovado')) statusClass = "status-paid";
            if(lowerStatus.includes('enviado') || lowerStatus.includes('despachado')) statusClass = "status-dispatched";

            const isDispatched = lowerStatus.includes('enviado') || lowerStatus.includes('despachado');

            const card = document.createElement('div');
            card.className = 'order-card';
            const shortId = order.id.length > 8 ? order.id.substring(0, 8) + '...' : order.id;
            
            // Format Address for Search
            const addr = order.shipping;
            const searchField = addr 
                ? `${addr.address || ''} ${addr.neighborhood || ''} ${addr.city || ''} ${addr.cep || ''}`
                : '';

            card.innerHTML = `
                <div class="order-header">
                    <span class="order-id" title="${order.id}">#${shortId}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="order-date">${order.date || 'Recente'}</span>
                </div>
                <div class="order-body">
                    <div class="info-grid">
                        <div class="info-col">
                            <p><strong>Cliente:</strong> ${order.customer?.name || '---'}</p>
                            <p><strong>Número:</strong> ${order.customer?.phone || '---'}</p>
                            <p><strong>Email:</strong> ${order.customer?.email || '---'}</p>
                        </div>
                        <div class="info-col delivery-col">
                            <p><strong>CEP:</strong> ${addr?.cep || '---'}</p>
                            <p><strong>Bairro:</strong> ${addr?.neighborhood || '---'}</p>
                            <p><strong>Cidade; Número:</strong> ${addr?.city || '---'}; ${addr?.number || '---'}</p>
                        </div>
                    </div>
                    <div class="packing-list">${packingHtml}</div>
                </div>
                <div class="order-footer">
                    <span class="order-total">R$ ${(order.total || 0).toFixed(2).replace('.',',')}</span>
                    <div class="footer-actions">
                        ${order.status === 'Pago' 
                            ? `<a href="/api/orders/${order.id}/pdf?t=${Date.now()}" target="_blank" class="btn-pdf" title="Ver PDF">PDF</a>`
                            : `<a href="/api/orders/${order.id}/pdf?t=${Date.now()}" target="_blank" class="btn-pdf" title="Gerar PDF">PDF</a>`
                        }
                        <button class="btn-ready" onclick="openTrackingModal('${order.id}', '${order.customer?.name || ''}', '${order.customer?.email || ''}')" ${isDispatched ? 'disabled' : ''}>
                            ${isDispatched ? 'Enviado' : 'Confirmar pedido'}
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Render Finance ---
    function renderFinance(orders, products = []) {
        const tbody = document.getElementById('finance-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalRev = 0, pendingRev = 0, totalCost = 0;
        let approvedCount = 0, pendingCount = 0;

        const productCosts = {};
        products.forEach(p => productCosts[p.id] = parseFloat(p.cost || 0));

        [...orders].reverse().forEach(o => {
            const val = parseFloat(o.total || 0);
            const status = (o.status || '').toLowerCase();
            const isApproved = status.includes('pago') || status.includes('aprovado') || status.includes('enviado');

            if (isApproved) {
                totalRev += val; approvedCount++;
                (o.items || []).forEach(item => {
                    const cost = productCosts[item.id] || 0;
                    const qty = item.qty || item.quantity || 0;
                    totalCost += cost * qty;
                });
            } else {
                pendingRev += val; pendingCount++;
            }

            const tr = document.createElement('tr');
            const shortId = o.id.length > 8 ? o.id.substring(0, 8) + '...' : o.id;
            tr.innerHTML = `
                <td>${o.date || '---'}</td>
                <td title="${o.id}"><strong>#${shortId}</strong></td>
                <td>${o.customer?.name || '---'}</td>
                <td style="color:#00ff88; font-weight:700;">R$ ${val.toFixed(2).replace('.',',')}</td>
                <td><span class="status-badge ${isApproved ? 'status-paid' : 'status-pending'}">${o.status}</span></td>
            `;
            tbody.appendChild(tr);
        });

        const netProfit = totalRev - totalCost;
        const margin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

        document.getElementById('total-revenue').textContent = 'R$ ' + totalRev.toFixed(2).replace('.',',');
        document.getElementById('pending-revenue').textContent = 'R$ ' + pendingRev.toFixed(2).replace('.',',');
        document.getElementById('net-profit').textContent = 'R$ ' + netProfit.toFixed(2).replace('.',',');
        document.getElementById('approved-count').textContent = `Aprovados: ${approvedCount}`;
        document.getElementById('pending-count').textContent = `Aguardando: ${pendingCount}`;
        document.getElementById('margin-label').textContent = `Margem: ${margin.toFixed(1)}%`;
    }

    // --- Render Stock ---
    function renderStock(products, orders) {
        const container = document.getElementById('stock-container');
        if (!container) return;
        container.innerHTML = '';

        const soldMap = {};
        orders.forEach(o => {
            const status = (o.status || '').toLowerCase();
            if (status.includes('pago') || status.includes('aprovado') || status.includes('enviado')) {
                (o.items || []).forEach(item => {
                    soldMap[item.id] = (soldMap[item.id] || 0) + (item.qty || item.quantity || 0);
                });
            }
        });

        products.forEach(p => {
            const sold = soldMap[p.id] || 0;
            const currentStock = p.stock || 0;
            
            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-header" style="background:rgba(255,11,85,0.05);">
                    <span class="order-id">${p.name}</span>
                    <span class="status-badge status-dispatched">Estoque: ${currentStock}</span>
                </div>
                <div class="order-body">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                        <img src="${p.image}" style="width:40px; height:40px; object-fit:contain; border-radius:6px; background:rgba(255,255,255,0.05);">
                        <div>
                            <p style="font-weight:700; color:var(--accent);">${p.brand || '---'}</p>
                            <p style="font-size:12px; color:var(--text-muted);">Varejo: R$ ${parseFloat(p.price || 0).toFixed(2).replace('.',',')}</p>
                        </div>
                    </div>
                    <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; font-size:13px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span>Total Saídas:</span>
                            <span style="color:#00ff88; font-weight:700;">${sold}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Disponível:</span>
                            <span style="color:${currentStock < 10 ? '#ffb90b' : '#fff'}; font-weight:700;">${currentStock} un</span>
                        </div>
                    </div>
                </div>
                <div class="order-footer">
                    <button class="refresh-btn" style="width:100%;" onclick="openStockModal('${p.id}', '${p.name}', ${currentStock})">
                        Alterar Estoque
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Modals Logic ---
    const trackModal = document.getElementById('tracking-modal');
    const stockModal = document.getElementById('stock-modal');
    const newStockInput = document.getElementById('new-stock-value');
    
    let currentOrderTarget = null;
    let currentStockTargetId = null;

    window.openTrackingModal = (id, name, email) => {
        currentOrderTarget = id;
        document.getElementById('customer-name-display').textContent = name;
        document.getElementById('tracking-code-input').value = '';
        trackModal.classList.add('active');
    };

    window.openStockModal = (id, name, current) => {
        currentStockTargetId = id;
        document.getElementById('stock-modal-product-name').textContent = name;
        newStockInput.value = current;
        stockModal.classList.add('active');
    };

    window.closeTrackingModal = () => trackModal.classList.remove('active');
    window.closeStockModal = () => stockModal.classList.remove('active');

    document.getElementById('confirm-tracking')?.addEventListener('click', async () => {
        const code = document.getElementById('tracking-code-input').value.trim();
        if(!code) return alert("Informe o código.");
        
        try {
            const res = await fetch('/api/admin/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: currentOrderTarget, trackingCode: code })
            });
            if((await res.json()).status === 'success') {
                showToast("Pedido despachado!");
                closeTrackingModal();
                fetchData();
            }
        } catch(e) { alert("Erro ao despachar."); }
    });

    document.getElementById('cancel-tracking')?.addEventListener('click', closeTrackingModal);

    document.getElementById('save-stock-btn')?.addEventListener('click', async () => {
        const val = newStockInput.value;
        try {
            const res = await fetch('/api/admin/products/stock', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('olimpo_admin_pass')
                },
                body: JSON.stringify({ productId: currentStockTargetId, stock: val })
            });
            if((await res.json()).status === 'success') {
                showToast("Estoque atualizado!");
                closeStockModal();
                fetchData();
            }
        } catch(e) { alert("Erro ao salvar estoque."); }
    });

    function showToast(msg, isError = false) {
        const t = document.getElementById('toast');
        if(!t) return;
        t.textContent = msg;
        t.className = `toast ${isError ? 'error' : ''} show`;
        setTimeout(() => t.classList.remove('show'), 3500);
    }

    fetchData();
    setInterval(fetchData, 20000);
});
