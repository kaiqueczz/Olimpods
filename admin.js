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

    document.getElementById('refresh-orders').addEventListener('click', fetchData);
    document.getElementById('logout-btn').addEventListener('click', () => {
        alert("Logout não implementado - Adicione autenticação de backend.");
    });

    // --- Data Fetching ---
    async function fetchData() {
        console.log("Buscando dados...");
        document.getElementById('refresh-orders').textContent = "Atualizando...";
        try {
            const res = await fetch('/api/admin/data');
            const data = await res.json();
            
            if(data.status === 'success') {
                renderLeads(data.users || []);
                renderOrders(data.orders || []);
                renderFinance(data.orders || []);
                renderStock(data.products || [], data.orders || []);
                
                document.getElementById('total-users-count').textContent = (data.users || []).length;
                document.getElementById('total-orders-count').textContent = (data.orders || []).length;
            } else {
                showToast("Erro ao buscar dados do servidor.", true);
            }
        } catch(e) {
            console.error(e);
            showToast("Erro de conexão com a API /api/admin/data", true);
        } finally {
            document.getElementById('refresh-orders').textContent = "⟳ Atualizar";
        }
    }

    // --- Render Leads ---
    function renderLeads(users) {
        const tbody = document.getElementById('leads-tbody');
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color:#aaa;">Nenhum lead cadastrado ainda.</td></tr>';
            return;
        }

        // reverse to show newest first
        [...users].reverse().forEach(u => {
            const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Data Desconhecida';
            const badge = u.verified ? '<span class="verified-badge">Verificado</span>' : '<span class="unverified-badge">Pendente</span>';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${u.fullname || u.name || 'Sem Nome'}</strong></td>
                <td>${u.email}</td>
                <td>${u.phone || '---'}</td>
                <td>${badge}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Render Orders ---
    function renderOrders(orders) {
        const container = document.getElementById('orders-container');
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p style="color:#aaa; padding: 20px;">Nenhum pedido recebido ainda.</p>';
            return;
        }

        [...orders].reverse().forEach(order => {
            // Group items by brand securely
            const brandMap = {};
            (order.items || []).forEach(item => {
                let nameLower = item.name.toLowerCase();
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
                            ${items.map(i => `
                                <li>
                                    <span>${i.qty}x ${i.name} ${i.flavor ? '<span style="font-size:0.75rem; color:#888;">('+i.flavor+')</span>' : ''}</span>
                                    <span class="item-qty">${i.qty}</span>
                                </li>
                            `).join('')}
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
            card.innerHTML = `
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-date">${order.date || 'Recente'}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="order-body">
                    <div class="customer-info">
                        <p><strong>Cliente:</strong> ${order.customer?.name || 'Vazio'}</p>
                        <p><strong>Contato:</strong> ${order.customer?.phone || 'Vazio'} • ${order.customer?.email || ''}</p>
                        <p><strong>Entrega:</strong> ${order.shipping?.method || 'Padrão'} (${order.shipping?.cep})</p>
                        <p style="font-size:0.8rem; margin-top:5px; color:#888;">${order.shipping?.address}, ${order.shipping?.number} - ${order.shipping?.city}/${order.shipping?.state}</p>
                    </div>

                    <div class="packing-list">
                        ${packingHtml}
                    </div>
                </div>
                <div class="order-footer">
                    <span class="order-total">R$ ${(order.total || 0).toFixed(2).replace('.',',')}</span>
                    <button class="btn-ready" onclick="openTrackingModal('${order.id}', '${order.customer?.name}', '${order.customer?.email}')" ${isDispatched ? 'disabled' : ''}>
                        ${isDispatched ? '✔ E-mail Enviado' : 'Pedido Pronto'}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Modal & Dispatch ---
    const modal = document.getElementById('tracking-modal');
    const cancelBtn = document.getElementById('cancel-tracking');
    const confirmBtn = document.getElementById('confirm-tracking');
    const trackInput = document.getElementById('tracking-code-input');
    const nameDisplay = document.getElementById('customer-name-display');

    let currentOrderTarget = null;
    let currentEmailTarget = null;

    window.openTrackingModal = (orderId, customerName, customerEmail) => {
        currentOrderTarget = orderId;
        currentEmailTarget = customerEmail;
        nameDisplay.textContent = customerName;
        trackInput.value = '';
        modal.classList.add('active');
        trackInput.focus();
    };

    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    confirmBtn.addEventListener('click', async () => {
        const code = trackInput.value.trim();
        if(!code) {
            alert("Informe o código de rastreio para continuar.");
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Enviando E-mail...';

        try {
            const res = await fetch('/api/admin/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: currentOrderTarget,
                    trackingCode: code
                })
            });
            const result = await res.json();

            if (result.status === 'success') {
                showToast(`E-mail enviado! Pedido #${currentOrderTarget} marcado como Enviado.`);
                modal.classList.remove('active');
                fetchData(); // Reload table
            } else {
                alert("Erro ao disparar e-mail: " + result.message);
            }
        } catch(e) {
            alert("Erro de conexão ao acessar rota de disparo.");
            console.error(e);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Aprovar e Enviar E-mail';
        }
    });

    function showToast(msg, isError = false) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.style.background = isError ? '#ff0b55' : '#00ff88';
        t.style.color = isError ? '#fff' : '#000';
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3500);
    }

    // --- Render Finance ---
    function renderFinance(orders) {
        const tbody = document.getElementById('finance-tbody');
        tbody.innerHTML = '';

        let totalRevenue = 0;
        let pendingRevenue = 0;

        // reverse to show newest first in table
        [...orders].reverse().forEach(o => {
            const status = (o.status || 'Aguardando Pagamento').toLowerCase();
            const val = parseFloat(o.total || 0);

            if (status.includes('pago') || status.includes('aprovado') || status.includes('enviado') || status.includes('despachado')) {
                totalRevenue += val;
            } else {
                pendingRevenue += val;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${o.date || 'Recente'}</td>
                <td><strong>#${o.id}</strong></td>
                <td>${o.customer?.name || '---'}</td>
                <td style="color:#00ff88; font-weight:bold;">R$ ${val.toFixed(2).replace('.',',')}</td>
                <td><span class="status-badge ${status.includes('pago')||status.includes('enviado') ? 'status-paid' : 'status-pending'}">${o.status || 'Aguardando Pagamento'}</span></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('total-revenue').textContent = 'R$ ' + totalRevenue.toFixed(2).replace('.',',');
        document.getElementById('pending-revenue').textContent = 'R$ ' + pendingRevenue.toFixed(2).replace('.',',');
    }

    // --- Render Stock ---
    function renderStock(products, orders) {
        const container = document.getElementById('stock-container');
        container.innerHTML = '';

        // Calculate sold items
        const soldMap = {};
        orders.forEach(o => {
            const status = (o.status || 'Aguardando Pagamento').toLowerCase();
            if (status.includes('pago') || status.includes('aprovado') || status.includes('enviado') || status.includes('despachado')) {
                (o.items || []).forEach(item => {
                    const key = item.id + (item.flavor ? '-' + item.flavor : '');
                    soldMap[key] = (soldMap[key] || 0) + item.qty;
                });
            }
        });

        if (products.length === 0) {
            container.innerHTML = '<p style="color:#aaa;">Catálogo de produtos não encontrado.</p>';
            return;
        }

        products.forEach(p => {
            const flavorsHtml = (p.flavors || []).map(f => {
                const sold = soldMap[p.id + '-' + f] || 0;
                return `
                    <li style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.9rem; color:#ddd;">
                        <span>${f}</span>
                        <span class="item-qty" style="background: ${sold > 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)'}; color: ${sold > 0 ? '#00ff88' : '#fff'};">${sold} saídas</span>
                    </li>
                `;
            }).join('');

            const totalSoldProd = (p.flavors || []).reduce((sum, f) => sum + (soldMap[p.id + '-' + f] || 0), 0) + (p.flavors?.length ? 0 : (soldMap[p.id] || 0));

            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-header" style="background:rgba(255,11,85,0.05);">
                    <span class="order-id">${p.name}</span>
                    <span class="status-badge status-dispatched">Total Saídas: ${totalSoldProd}</span>
                </div>
                <div class="order-body">
                    <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                        <img src="${p.image}" style="width:50px; height:50px; object-fit:contain; background:rgba(255,255,255,0.05); border-radius:8px; padding:5px;">
                        <div>
                            <p style="font-weight:bold; color:var(--accent);">${p.brand || '---'}</p>
                            <p style="font-size:0.85rem; color:#aaa;">R$ ${p.price.toFixed(2).replace('.',',')} (Varejo)</p>
                        </div>
                    </div>
                    <ul class="brand-items" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; max-height: 180px; overflow-y: auto;">
                        ${p.flavors && p.flavors.length ? flavorsHtml : `
                        <li style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.9rem; color:#ddd;">
                            <span>Único</span>
                            <span class="item-qty" style="background: ${totalSoldProd > 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)'}; color: ${totalSoldProd > 0 ? '#00ff88' : '#fff'};">${totalSoldProd} saídas</span>
                        </li>
                        `}
                    </ul>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Initial load
    fetchData();

});
