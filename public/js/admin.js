// Ganti seluruh isi file public/js/admin.js dengan ini
let currentEditId = null;
let currentEditType = null;
let selectedImportFile = null;
let products = [];
let categories = [];
let categorySearchTerm = '';
let categoryCurrentPage = 1;
let categoryPageSize = 10;
let searchTerm = '';
let currentPage = 1;
let pageSize = 25;
let users = [];
let userSearchTerm = '';
let userCurrentPage = 1;
let userPageSize = 10;
let roleFilter = '';
let statusFilter = '';
let transactions = [];
let transactionToVoidId = null;
let transactionSearchTerm = '';
let transactionCurrentPage = 1;
let transactionPageSize = 25;
let paymentMethodFilter = '';
let dateRangeFilter = '';
let customStartDate = '';
let customEndDate = '';

const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
const transactionDetailsModal = new bootstrap.Modal(document.getElementById('transactionDetailsModal'));
const dateRangeModal = new bootstrap.Modal(document.getElementById('dateRangeModal'));
const PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const MAX_FILE_SIZE = 1 * 1024 * 1024;

document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupLogout();
    setupForms();
    setupEventListeners();
    await loadInitialData();
});

async function validateCurrentUserPassword(password) {
    try {
        const res = await fetch('/api/validate-current-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const result = await res.json();
        return result.success;
    } catch (error) {
        console.error("Password validation failed:", error);
        return false;
    }
}

function setupNavigation() {
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.target.dataset.view;
            showView(view);
            document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            if (view === 'products') loadProducts();
            if (view === 'categories') loadCategories();
            if (view === 'transactions') loadTransactions();
            if (view === 'users') loadUsers();
            if (view === 'banners') loadBanner();
            if (view === 'qris') loadQris();
        });
    });
}

function showView(viewId) {
    document.querySelectorAll('.view-content').forEach(view => view.style.display = 'none');
    document.getElementById(`${viewId}-view`).style.display = 'block';
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });
}

async function loadInitialData() {
    try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to load categories');
        categories = await res.json();
        const productCategorySelect = document.getElementById('productCategory');
        if (productCategorySelect) {
            productCategorySelect.innerHTML = '<option value="">Pilih Kategori</option>' + 
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (error) {
        console.error("Failed to load initial data:", error);
    }
}

// --- Produk ---
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        products = await res.json();
        currentPage = 1; 
        renderProducts();
    } catch (error) {
        console.error("Failed to load products:", error);
        const tbody = document.getElementById('productTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat produk</td></tr>`;
        }
    }
}

function getFilteredProducts() {
    if (!searchTerm) return products;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return products.filter(product => {
        const productNameMatch = product.name && product.name.toLowerCase().includes(lowerCaseSearchTerm);
        const category = categories.find(c => c.id === product.categoryId);
        const categoryNameMatch = category && category.name && category.name.toLowerCase().includes(lowerCaseSearchTerm);
        return productNameMatch || categoryNameMatch;
    });
}

function getPaginatedProducts() {
    const filteredProducts = getFilteredProducts();
    if (pageSize === 'all') return filteredProducts;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProducts.slice(startIndex, endIndex);
}

function renderProducts() {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    const paginatedProducts = getPaginatedProducts();
    if (paginatedProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Tidak ada produk ditemukan.</td></tr>`;
        document.getElementById('paginationTop').innerHTML = '';
        document.getElementById('paginationBottom').innerHTML = '';
        return;
    }
    tbody.innerHTML = paginatedProducts.map(p => {
        const priceDisplay = (p.price != null && !isNaN(p.price)) 
            ? `Rp ${p.price.toLocaleString('id-ID')}` 
            : 'Harga tidak valid';
        return `
        <tr>
            <td>${p.id || ''}</td>
            <td>${p.sku || ''}</td>
            <td>${p.name || ''}</td>
            <td>${priceDisplay}</td>
            <td>${p.stock || 0}</td>
            <td>
                <span class="badge ${p.isTopProduct ? 'bg-warning' : 'bg-secondary'}">
                    ${p.isTopProduct ? 'Top' : 'Regular'}
                </span>
                <span class="badge ${p.isBestSeller ? 'bg-success' : 'bg-secondary'} ms-1">
                    ${p.isBestSeller ? 'Best Seller' : 'Regular'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="openEditModal('product', '${p.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteItem('products', '${p.id}')">Hapus</button>
            </td>
        </tr>`;
    }).join('');
    renderPagination();
}

function renderPagination() {
    const filteredProducts = getFilteredProducts();
    const totalItems = filteredProducts.length;
    const paginationTop = document.getElementById('paginationTop');
    const paginationBottom = document.getElementById('paginationBottom');
    if (pageSize === 'all' || totalItems <= pageSize) {
        paginationTop.innerHTML = '';
        paginationBottom.innerHTML = '';
        return;
    }
    const totalPages = Math.ceil(totalItems / pageSize);
    let paginationHTML = `<ul class="pagination mb-0">`;
    paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">Sebelumnya</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<li class="page-item ${currentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">Selanjutnya</a></li>`;
    paginationHTML += `</ul>`;
    paginationTop.innerHTML = paginationHTML;
    paginationBottom.innerHTML = paginationHTML;
}

// --- Kategori ---
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to load categories');
        const allCategories = await res.json();
        const products = await fetch('/api/products').then(res => res.json());
        categories = allCategories.map(category => {
            const productCount = products.filter(p => p.categoryId == category.id).length;
            return { ...category, productCount };
        });
        categoryCurrentPage = 1;
        renderCategories();
    } catch (error) {
        console.error("Failed to load categories:", error);
        const tbody = document.getElementById('categoryTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat kategori</td></tr>`;
        }
    }
}

function getFilteredCategories() {
    if (!categorySearchTerm) return categories;
    const lowerCaseSearchTerm = categorySearchTerm.toLowerCase();
    return categories.filter(category => {
        const nameMatch = category.name && category.name.toLowerCase().includes(lowerCaseSearchTerm);
        const descMatch = category.description && category.description.toLowerCase().includes(lowerCaseSearchTerm);
        return nameMatch || descMatch;
    });
}

function getPaginatedCategories() {
    const filtered = getFilteredCategories();
    if (categoryPageSize === 'all') return filtered;
    const start = (categoryCurrentPage - 1) * categoryPageSize;
    return filtered.slice(start, start + categoryPageSize);
}

function renderCategories() {
    const tbody = document.getElementById('categoryTableBody');
    if (!tbody) return;
    const paginated = getPaginatedCategories();
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Tidak ada kategori ditemukan.</td></tr>`;
        document.getElementById('categoryPaginationTop').innerHTML = '';
        document.getElementById('categoryPaginationBottom').innerHTML = '';
        return;
    }
    tbody.innerHTML = paginated.map(c => `
        <tr>
            <td>${c.id || ''}</td>
            <td>${c.name || ''}</td>
            <td>${c.description || '-'}</td>
            <td><span class="badge bg-info">${c.productCount || 0} Produk</span></td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="openEditModal('category', '${c.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteItem('categories', '${c.id}')" 
                    ${c.productCount > 0 ? 'disabled title="Kategori masih digunakan oleh produk"' : ''}>Hapus</button>
            </td>
        </tr>`).join('');
    renderCategoryPagination();
}

function renderCategoryPagination() {
    const filtered = getFilteredCategories();
    const total = filtered.length;
    const top = document.getElementById('categoryPaginationTop');
    const bottom = document.getElementById('categoryPaginationBottom');
    if (categoryPageSize === 'all' || total <= categoryPageSize) {
        top.innerHTML = '';
        bottom.innerHTML = '';
        return;
    }
    const pages = Math.ceil(total / categoryPageSize);
    let html = `<ul class="pagination mb-0">`;
    html += `<li class="page-item ${categoryCurrentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${categoryCurrentPage - 1}">Sebelumnya</a></li>`;
    for (let i = 1; i <= pages; i++) {
        html += `<li class="page-item ${categoryCurrentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${categoryCurrentPage === pages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${categoryCurrentPage + 1}">Selanjutnya</a></li>`;
    html += `</ul>`;
    top.innerHTML = html;
    bottom.innerHTML = html;
}

// --- Transaksi ---
async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions');
        if (!res.ok) throw new Error('Failed to load transactions');
        const allTransactions = await res.json();
        const usersRes = await fetch('/api/users');
        const allUsers = await usersRes.json();
        users = allUsers;
        transactions = allTransactions.map(t => {
            const user = users.find(u => u.id === t.userId);
            return {
                ...t,
                cashierName: user ? user.name : `User ID: ${t.userId}`,
                itemCount: t.items ? t.items.length : 0
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        transactionCurrentPage = 1;
        renderTransactions();
    } catch (error) {
        console.error("Failed to load transactions:", error);
        const tbody = document.getElementById('transactionTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Gagal memuat transaksi</td></tr>`;
        }
    }
}

function getFilteredTransactions() {
    let filtered = transactions;
    if (transactionSearchTerm) {
        const term = transactionSearchTerm.toLowerCase();
        filtered = filtered.filter(t => 
            (t.id && t.id.toLowerCase().includes(term)) ||
            (t.timestamp && new Date(t.timestamp).toLocaleString().toLowerCase().includes(term)) ||
            (t.cashierName && t.cashierName.toLowerCase().includes(term)) ||
            (t.totalAmount && t.totalAmount.toString().includes(term)) ||
            (t.paymentMethod && t.paymentMethod.toLowerCase().includes(term))
        );
    }
    if (paymentMethodFilter) {
        filtered = filtered.filter(t => t.paymentMethod === paymentMethodFilter);
    }
    if (dateRangeFilter) {
        const now = new Date();
        let start, end;
        switch(dateRangeFilter) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    start = new Date(customStartDate);
                    end = new Date(customEndDate + 'T23:59:59');
                }
                break;
        }
        if (start && end) {
            filtered = filtered.filter(t => {
                const d = new Date(t.timestamp);
                return d >= start && d <= end;
            });
        }
    }
    return filtered;
}

function getPaginatedTransactions() {
    const filtered = getFilteredTransactions();
    if (transactionPageSize === 'all') return filtered;
    const start = (transactionCurrentPage - 1) * transactionPageSize;
    return filtered.slice(start, start + transactionPageSize);
}

function renderTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;
    const paginated = getPaginatedTransactions();
    const filtered = getFilteredTransactions();
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Tidak ada transaksi ditemukan.</td></tr>`;
        document.getElementById('transactionPaginationTop').innerHTML = '';
        document.getElementById('transactionPaginationBottom').innerHTML = '';
        document.getElementById('transactionSummary').innerHTML = '';
        return;
    }
    tbody.innerHTML = paginated.map(t => {
        const methodClass = t.paymentMethod === 'cash' ? 'success' : 'info';
        const methodText = t.paymentMethod === 'cash' ? 'Tunai' : 'QRIS';
        return `
        <tr>
            <td><small>${t.id || ''}</small></td>
            <td><small>${t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID') : ''}</small></td>
            <td>${t.cashierName || ''}</td>
            <td><span class="badge bg-secondary">${t.itemCount || 0} Item</span></td>
            <td><strong>Rp ${(t.totalAmount || 0).toLocaleString('id-ID')}</strong></td>
            <td><span class="badge bg-${methodClass}">${methodText}</span></td>
            <td><span class="badge bg-success">Selesai</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showTransactionDetails('${t.id}')" title="Lihat Detail">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="voidTransaction('${t.id}')" title="Void Transaksi">
                    <i class="bi bi-x-circle"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
    updateTransactionSummary(filtered);
    renderTransactionPagination();
}

function updateTransactionSummary(filtered) {
    const el = document.getElementById('transactionSummary');
    if (!el) return;
    const total = filtered.length;
    const amount = filtered.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const cash = filtered.filter(t => t.paymentMethod === 'cash').length;
    const qris = filtered.filter(t => t.paymentMethod === 'qris').length;
    el.innerHTML = `<small>Total: ${total} transaksi | Nilai: Rp ${amount.toLocaleString('id-ID')} | Tunai: ${cash} | QRIS: ${qris}</small>`;
}

function renderTransactionPagination() {
    const filtered = getFilteredTransactions();
    const total = filtered.length;
    const top = document.getElementById('transactionPaginationTop');
    const bottom = document.getElementById('transactionPaginationBottom');
    if (transactionPageSize === 'all' || total <= transactionPageSize) {
        top.innerHTML = '';
        bottom.innerHTML = '';
        return;
    }
    const pages = Math.ceil(total / transactionPageSize);
    let html = `<ul class="pagination mb-0">`;
    html += `<li class="page-item ${transactionCurrentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${transactionCurrentPage - 1}">Sebelumnya</a></li>`;
    for (let i = 1; i <= pages; i++) {
        html += `<li class="page-item ${transactionCurrentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${transactionCurrentPage === pages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${transactionCurrentPage + 1}">Selanjutnya</a></li>`;
    html += `</ul>`;
    top.innerHTML = html;
    bottom.innerHTML = html;
}

function showTransactionDetails(id) {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    transactionToVoidId = id;
    const itemsHtml = t.items ? t.items.map(item => `
        <tr>
            <td>${item.name || ''}</td>
            <td class="text-end">Rp ${(item.price || 0).toLocaleString('id-ID')}</td>
            <td class="text-center">${item.qty || 0}</td>
            <td class="text-end">Rp ${((item.price || 0) * (item.qty || 0)).toLocaleString('id-ID')}</td>
        </tr>`).join('') : '';
    const content = document.getElementById('transactionDetailsContent');
    if (content) {
        const methodText = t.paymentMethod === 'cash' ? 'Tunai' : 'QRIS';
        content.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <p><strong>ID Transaksi:</strong> ${t.id || ''}</p>
                    <p><strong>Tanggal & Waktu:</strong> ${t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID') : ''}</p>
                    <p><strong>Kasir:</strong> ${t.cashierName || ''}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Metode Pembayaran:</strong> <span class="badge bg-${t.paymentMethod === 'cash' ? 'success' : 'info'}">${methodText}</span></p>
                    ${t.paymentMethod === 'cash' ? `
                        <p><strong>Jumlah Diterima:</strong> Rp ${(t.amountReceived || 0).toLocaleString('id-ID')}</p>
                        <p><strong>Kembalian:</strong> Rp ${(t.change || 0).toLocaleString('id-ID')}</p>
                    ` : ''}
                </div>
            </div>
            <hr>
            <h6>Detail Pembelian:</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead><tr><th>Produk</th><th class="text-end">Harga</th><th class="text-center">Qty</th><th class="text-end">Subtotal</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot><tr class="table-active"><th colspan="3">Total Pembayaran:</th><th class="text-end">Rp ${(t.totalAmount || 0).toLocaleString('id-ID')}</th></tr></tfoot>
                </table>
            </div>`;
        document.getElementById('printTransactionBtn')?.addEventListener('click', () => printTransaction(t));
        document.getElementById('voidTransactionBtn')?.addEventListener('click', () => voidTransaction(id));
        transactionDetailsModal.show();
    }
}

async function voidTransaction(id) {
    if (!confirm(`Apakah Anda yakin ingin membatalkan transaksi ${id}? Stok produk akan dikembalikan.`)) return;
    try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            alert(result.message);
            transactionDetailsModal.hide();
            await loadTransactions();
            await loadProducts();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        alert('Gagal membatalkan transaksi.');
    }
}

function printTransaction(t) {
    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html><html><head><title>Struk Transaksi</title>
        <style>body{font-family:'Courier New',monospace;padding:20px;}h1{text-align:center;}.details p{margin:5px 0;}table{width:100%;border-collapse:collapse;}th,td{border:1px dashed #000;padding:8px;}th{text-align:left;border-bottom:2px solid #000;}.text-end{text-align:right;}.text-center{text-align:center;}.total{border-top:2px solid #000;font-weight:bold;}.footer{margin-top:30px;text-align:center;font-size:0.9em;}@media print{body{padding:0;}}</style>
        </head><body>
        <h1>STRUK PENJUALAN</h1>
        <div class="details">
            <p><strong>ID Transaksi:</strong> ${t.id}</p>
            <p><strong>Tanggal:</strong> ${new Date(t.timestamp).toLocaleDateString('id-ID')}</p>
            <p><strong>Kasir:</strong> ${t.cashierName}</p>
        </div>
        <table>
            <thead><tr><th>Item</th><th class="text-end">Harga</th><th class="text-center">Qty</th><th class="text-end">Total</th></tr></thead>
            <tbody>${t.items.map(i => `<tr><td>${i.name}</td><td class="text-end">Rp ${i.price.toLocaleString('id-ID')}</td><td class="text-center">${i.qty}</td><td class="text-end">Rp ${(i.price * i.qty).toLocaleString('id-ID')}</td></tr>`).join('')}</tbody>
            <tfoot><tr class="total"><td colspan="3">TOTAL</td><td class="text-end">Rp ${t.totalAmount.toLocaleString('id-ID')}</td></tr></tfoot>
        </table>
        <div class="details">
            <p><strong>Metode Pembayaran:</strong> ${t.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}</p>
            ${t.paymentMethod === 'cash' ? `<p><strong>Jumlah Diterima:</strong> Rp ${t.amountReceived.toLocaleString('id-ID')}</p><p><strong>Kembalian:</strong> Rp ${t.change.toLocaleString('id-ID')}</p>` : ''}
        </div>
        <div class="footer"><p>Terima kasih atas pembelian Anda!</p></div>
        </body></html>`);
    win.document.close();
    win.print();
}

// --- Users ---
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to load users');
        users = (await res.json()).map(u => ({
            ...u,
            displayName: u.name || u.username,
            lastLoginFormatted: u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : 'Belum pernah login'
        }));
        userCurrentPage = 1;
        renderUsers();
    } catch (error) {
        console.error("Failed to load users:", error);
        const tbody = document.getElementById('userTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat user</td></tr>`;
        }
    }
}

function getFilteredUsers() {
    let filtered = users;
    if (userSearchTerm) {
        const term = userSearchTerm.toLowerCase();
        filtered = filtered.filter(u =>
            (u.username && u.username.includes(term)) ||
            (u.name && u.name.includes(term)) ||
            (u.role && u.role.includes(term))
        );
    }
    if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);
    if (statusFilter) {
        filtered = filtered.filter(u => statusFilter === 'active' ? u.status !== 'inactive' : u.status === 'inactive');
    }
    return filtered;
}

function getPaginatedUsers() {
    const filtered = getFilteredUsers();
    if (userPageSize === 'all') return filtered;
    const start = (userCurrentPage - 1) * userPageSize;
    return filtered.slice(start, start + userPageSize);
}

function renderUsers() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    const paginated = getPaginatedUsers();
    const filtered = getFilteredUsers();
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Tidak ada user ditemukan.</td></tr>`;
        document.getElementById('userPaginationTop').innerHTML = '';
        document.getElementById('userPaginationBottom').innerHTML = '';
        document.getElementById('userSummary').innerHTML = '';
        return;
    }
    tbody.innerHTML = paginated.map(u => {
        const roleClass = u.role === 'admin' ? 'danger' : 'primary';
        const statusClass = u.status === 'inactive' ? 'secondary' : 'success';
        const statusText = u.status === 'inactive' ? 'Tidak Aktif' : 'Aktif';
        return `
        <tr>
            <td>${u.id || ''}</td>
            <td>${u.username || ''}</td>
            <td>${u.displayName || ''}</td>
            <td><span class="badge bg-${roleClass}">${u.role || ''}</span></td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td><small>${u.lastLoginFormatted || ''}</small></td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="openEditModal('user', '${u.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-info" onclick="openResetPasswordModal('${u.id}', '${u.username}')" title="Reset Password"><i class="bi bi-key"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteItem('users', '${u.id}')" title="Hapus"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
    updateUserSummary(filtered);
    renderUserPagination();
}

function updateUserSummary(filtered) {
    const el = document.getElementById('userSummary');
    if (!el) return;
    const total = filtered.length;
    const active = filtered.filter(u => u.status !== 'inactive').length;
    const admin = filtered.filter(u => u.role === 'admin').length;
    const cashier = filtered.filter(u => u.role === 'cashier').length;
    el.innerHTML = `<small>Total: ${total} user | Aktif: ${active} | Admin: ${admin} | Kasir: ${cashier}</small>`;
}

function renderUserPagination() {
    const filtered = getFilteredUsers();
    const total = filtered.length;
    const top = document.getElementById('userPaginationTop');
    const bottom = document.getElementById('userPaginationBottom');
    if (userPageSize === 'all' || total <= userPageSize) {
        top.innerHTML = '';
        bottom.innerHTML = '';
        return;
    }
    const pages = Math.ceil(total / userPageSize);
    let html = `<ul class="pagination mb-0">`;
    html += `<li class="page-item ${userCurrentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${userCurrentPage - 1}">Sebelumnya</a></li>`;
    for (let i = 1; i <= pages; i++) {
        html += `<li class="page-item ${userCurrentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${userCurrentPage === pages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${userCurrentPage + 1}">Selanjutnya</a></li>`;
    html += `</ul>`;
    top.innerHTML = html;
    bottom.innerHTML = html;
}

// --- Banner & QRIS ---
async function loadBanner() {
    try {
        const res = await fetch('/api/banners');
        if (!res.ok) throw new Error('Failed to load banners');
        const banners = await res.json();
        if (banners.length > 0) {
            const b = banners[0];
            document.getElementById('bannerTitle').value = b.title || '';
            document.getElementById('bannerSubtitle').value = b.subtitle || '';
            document.getElementById('bannerImageBase64').value = b.imageBase64 || '';
            const preview = document.getElementById('bannerPreview');
            if (preview) {
                preview.src = b.imageBase64 || PLACEHOLDER_IMAGE;
                preview.style.display = 'block';
            }
            currentEditId = b.id;
        }
    } catch (error) {
        console.error("Failed to load banner:", error);
    }
}

async function loadQris() {
    try {
        const res = await fetch('/api/qris');
        if (!res.ok) throw new Error('Failed to load QRIS');
        const q = await res.json();
        if (q && q.id) {
            document.getElementById('qrisImageBase64').value = q.imageBase64 || '';
            const preview = document.getElementById('qrisPreview');
            if (preview) {
                preview.src = q.imageBase64 || PLACEHOLDER_IMAGE;
                preview.style.display = 'block';
            }
            currentEditId = q.id;
        }
    } catch (error) {
        console.error("Failed to load QRIS:", error);
    }
}

// --- Modal Edit ---
function openEditModal(type, id) {
    currentEditType = type;
    currentEditId = id;
    const modalEl = document.getElementById(`${type}Modal`);
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    const nameInput = document.getElementById(`${type}Name`);
    if (nameInput) {
        nameInput.classList.remove('is-invalid', 'is-valid');
        hideValidationMessage(nameInput);
    }

    if (type === 'user') {
        fetch('/api/users').then(r => r.json()).then(users => {
            const u = users.find(x => x.id == id);
            if (!u && id) return;
            document.getElementById('userId').value = u ? u.id : '';
            document.getElementById('userUsername').value = u ? u.username : '';
            document.getElementById('userNameField').value = u ? u.name : '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userRole').value = u ? u.role : '';
            document.getElementById('userStatus').value = u ? (u.status || 'active') : 'active';
            document.getElementById('passwordRequired').style.display = u ? 'none' : 'inline';
            document.getElementById('userPassword').placeholder = u ? 'Kosongkan jika tidak ingin mengubah password' : 'Password wajib diisi';
        }).catch(() => alert('Gagal memuat data user'));
    } else if (type === 'product') {
        fetch('/api/products').then(r => r.json()).then(products => {
            const p = products.find(x => x.id == id);
            if (!p) return;
            document.getElementById('productId').value = p.id || '';
            document.getElementById('productName').value = p.name || '';
            document.getElementById('productPrice').value = p.price || '';
            document.getElementById('productStock').value = p.stock || '';
            document.getElementById('productCategory').value = p.categoryId || '';
            document.getElementById('productImageBase64').value = p.imageBase64 || '';
            const preview = document.getElementById('productPreview');
            if (preview) {
                preview.src = p.imageBase64 || PLACEHOLDER_IMAGE;
                preview.style.display = 'block';
            }
            document.getElementById('productIsTop').checked = p.isTopProduct || false;
            document.getElementById('productIsBest').checked = p.isBestSeller || false;
        }).catch(() => alert('Gagal memuat data produk'));
    } else if (type === 'category') {
        fetch('/api/categories').then(r => r.json()).then(categories => {
            const c = categories.find(x => x.id == id);
            if (!c) return;
            document.getElementById('categoryId').value = c.id || '';
            document.getElementById('categoryName').value = c.name || '';
            document.getElementById('categoryDescription').value = c.description || '';
        }).catch(() => alert('Gagal memuat data kategori'));
    }
    modal.show();
}

// --- Form Setup ---
function setupForms() {
    // Product Form
    const saveProductBtn = document.getElementById('saveProductBtn');
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', async () => {
            const name = document.getElementById('productName').value.trim();
            const price = document.getElementById('productPrice').value;
            const stock = document.getElementById('productStock').value;
            if (!name) { alert('Nama produk wajib diisi!'); return; }
            if (!price || price <= 0) { alert('Harga harus valid!'); return; }
            if (!stock || stock < 0) { alert('Stok harus valid!'); return; }

            const data = {
                name,
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                categoryId: parseInt(document.getElementById('productCategory').value) || null,
                imageBase64: document.getElementById('productImageBase64').value,
                isTopProduct: document.getElementById('productIsTop').checked,
                isBestSeller: document.getElementById('productIsBest').checked,
            };

            saveProductBtn.disabled = true;
            saveProductBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
            try {
                const url = currentEditId ? `/api/products/${currentEditId}` : '/api/products';
                const res = await fetch(url, {
                    method: currentEditId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) {
                    alert(result.message || 'Gagal menyimpan produk');
                    return;
                }
                bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
                await loadProducts();
                alert(currentEditId ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
                document.getElementById('productForm').reset();
                document.getElementById('productPreview').style.display = 'none';
            } catch (error) {
                alert('Gagal menyimpan produk. Silakan coba lagi.');
            } finally {
                saveProductBtn.disabled = false;
                saveProductBtn.innerHTML = 'Simpan';
            }
        });
    }

    // Category Form
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', async () => {
            const name = document.getElementById('categoryName').value.trim();
            if (!name) { alert('Nama kategori wajib diisi!'); return; }
            const data = { name, description: document.getElementById('categoryDescription').value.trim() };
            saveCategoryBtn.disabled = true;
            saveCategoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
            try {
                const url = currentEditId ? `/api/categories/${currentEditId}` : '/api/categories';
                const res = await fetch(url, {
                    method: currentEditId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) {
                    alert(result.message || 'Gagal menyimpan kategori');
                    return;
                }
                bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                await loadCategories();
                await loadInitialData();
                alert(currentEditId ? 'Kategori berhasil diupdate!' : 'Kategori berhasil ditambahkan!');
                document.getElementById('categoryForm').reset();
            } catch (error) {
                alert('Gagal menyimpan kategori. Silakan coba lagi.');
            } finally {
                saveCategoryBtn.disabled = false;
                saveCategoryBtn.innerHTML = 'Simpan';
            }
        });
    }

    // User Form
    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', async () => {
            const username = document.getElementById('userUsername').value.trim();
            const name = document.getElementById('userNameField').value.trim();
            const password = document.getElementById('userPassword').value;
            const role = document.getElementById('userRole').value;
            const status = document.getElementById('userStatus').value;
            const userId = document.getElementById('userId').value;
            if (!username) { alert('Username wajib diisi!'); return; }
            if (!name) { alert('Nama lengkap wajib diisi!'); return; }
            if (!userId && !password) { alert('Password wajib diisi untuk user baru!'); return; }
            if (!role) { alert('Role wajib dipilih!'); return; }

            const data = { username, name, role, status };
            if (password) data.password = password;

            saveUserBtn.disabled = true;
            saveUserBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';
            try {
                const url = userId ? `/api/users/${userId}` : '/api/users';
                const res = await fetch(url, {
                    method: userId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) {
                    alert(result.message || 'Gagal menyimpan user');
                    return;
                }
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
                await loadUsers();
                alert(userId ? 'User berhasil diupdate!' : 'User berhasil ditambahkan!');
                document.getElementById('userForm').reset();
                document.getElementById('passwordRequired').style.display = 'inline';
            } catch (error) {
                alert('Gagal menyimpan user. Silakan coba lagi.');
            } finally {
                saveUserBtn.disabled = false;
                saveUserBtn.innerHTML = 'Simpan';
            }
        });
    }

    // Banner & QRIS Forms
    ['bannerForm', 'qrisForm'].forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const isBanner = formId === 'bannerForm';
                const data = isBanner
                    ? { title: document.getElementById('bannerTitle').value, subtitle: document.getElementById('bannerSubtitle').value, imageBase64: document.getElementById('bannerImageBase64').value }
                    : { imageBase64: document.getElementById('qrisImageBase64').value };
                try {
                    const res = await fetch(`/api/${isBanner ? 'banners' : 'qris'}/${currentEditId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (res.ok) {
                        alert(`${isBanner ? 'Banner' : 'QRIS'} berhasil diupdate!`);
                    } else {
                        alert(`Gagal mengupdate ${isBanner ? 'banner' : 'QRIS'}`);
                    }
                } catch (error) {
                    alert(`Gagal mengupdate ${isBanner ? 'banner' : 'QRIS'}`);
                }
            });
        }
    });

    // Image Upload
    ['product', 'banner', 'qris'].forEach(prefix => {
        const fileInput = document.getElementById(`${prefix}ImageFile`);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > MAX_FILE_SIZE) {
                    alert(`File terlalu besar! Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
                    e.target.value = '';
                    document.getElementById(`${prefix}ImageBase64`).value = '';
                    document.getElementById(`${prefix}Preview`).style.display = 'none';
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result;
                    document.getElementById(`${prefix}ImageBase64`).value = base64;
                    document.getElementById(`${prefix}Preview`).src = base64;
                    document.getElementById(`${prefix}Preview`).style.display = 'block';
                };
                reader.readAsDataURL(file);
            });
        }
    });
}

// --- Delete Item ---
async function deleteItem(type, id) {
    const names = { products: 'produk', categories: 'kategori', users: 'user' };
    const name = names[type] || 'item';
    if (!confirm(`Apakah Anda yakin ingin menghapus ${name} ini?`)) return;
    try {
        const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert(`${name.charAt(0).toUpperCase() + name.slice(1)} berhasil dihapus!`);
            if (type === 'products') await loadProducts();
            if (type === 'categories') { await loadCategories(); await loadInitialData(); }
            if (type === 'users') await loadUsers();
        } else {
            const err = await res.json();
            alert(`Error: ${err.message || 'Gagal menghapus item'}`);
        }
    } catch (error) {
        alert('Gagal menghapus item');
    }
}

// --- Export/Import ---
async function exportProductsToXlsx() {
    try {
        const res = await fetch('/api/products/export');
        if (!res.ok) throw new Error('Export gagal');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products_export.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Produk berhasil diekspor!');
    } catch (error) {
        alert(`Gagal mengekspor: ${error.message}`);
    }
}

async function downloadImportTemplate() {
    try {
        const res = await fetch('/api/products/template');
        if (!res.ok) throw new Error('Gagal mengunduh template');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Template berhasil diunduh!');
    } catch (error) {
        alert(`Gagal mengunduh template: ${error.message}`);
    }
}

function triggerFileSelection() {
    document.getElementById('importFileInput')?.click();
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    const span = document.getElementById('selectedFileName');
    const btn = document.getElementById('importFileBtn');
    if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext)) {
            alert('Pilih file Excel (.xlsx atau .xls)');
            event.target.value = '';
            return;
        }
        span.textContent = `Dipilih: ${file.name}`;
        btn.disabled = false;
    } else {
        span.textContent = 'Tidak ada file yang dipilih';
        btn.disabled = true;
    }
}

async function processImport() {
    if (!selectedImportFile) { alert('Pilih file dulu'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (json.length === 0) { alert('File kosong'); return; }
            const missing = ['Product Name', 'Price', 'Stock'].filter(c => !(c in json[0]));
            if (missing.length) throw new Error(`Kolom wajib tidak ada: ${missing.join(', ')}`);

            const btn = document.getElementById('importFileBtn');
            const original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengimport...';

            const res = await fetch('/api/products/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: json })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Server error');
            alert(result.message);
            await loadProducts();
        } catch (error) {
            alert(`Gagal mengimport: ${error.message}`);
        } finally {
            document.getElementById('importFileInput').value = '';
            document.getElementById('selectedFileName').textContent = 'Tidak ada file yang dipilih';
            selectedImportFile = null;
            const btn = document.getElementById('importFileBtn');
            if (btn) btn.disabled = false;
        }
    };
    reader.readAsArrayBuffer(selectedImportFile);
}

// Reset Password Modal
function openResetPasswordModal(userId, username) {
    document.getElementById('resetPasswordUsername').textContent = username;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('confirmResetPasswordBtn').onclick = async () => {
        const np = document.getElementById('newPassword').value;
        const cp = document.getElementById('confirmPassword').value;
        if (!np) { alert('Password baru wajib diisi!'); return; }
        if (np !== cp) { alert('Password tidak cocok!'); return; }
        if (np.length < 6) { alert('Password minimal 6 karakter!'); return; }
        try {
            const res = await fetch(`/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: np })
            });
            const result = await res.json();
            if (result.success) {
                alert(result.message);
                resetPasswordModal.hide();
            } else {
                alert(result.message || 'Gagal reset password');
            }
        } catch (error) {
            alert('Gagal reset password');
        }
    };
    resetPasswordModal.show();
}

function showValidationMessage(input, msg) {
    hideValidationMessage(input);
    const fb = document.createElement('div');
    fb.className = 'invalid-feedback';
    fb.textContent = msg;
    fb.style.display = 'block';
    input.parentNode.appendChild(fb);
}

function hideValidationMessage(input) {
    const fb = input.parentNode.querySelector('.invalid-feedback');
    if (fb) fb.remove();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Import
    document.getElementById('chooseFileBtn')?.addEventListener('click', triggerFileSelection);
    document.getElementById('importFileInput')?.addEventListener('change', handleFileSelection);
    document.getElementById('importFileBtn')?.addEventListener('click', processImport);

    // Real-time validation
    const setupValidation = (inputId, checkUrl, errorMsg) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        let timeout;
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            const val = input.value.trim();
            if (val.length < (inputId === 'userUsername' ? 3 : 2)) {
                input.classList.remove('is-invalid', 'is-valid');
                return;
            }
            timeout = setTimeout(async () => {
                try {
                    const id = document.getElementById(inputId.replace('Name', 'Id') || 'userId')?.value;
                    const url = id ? `${checkUrl}/${id}` : checkUrl;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(inputId === 'userUsername' ? { username: val } : { name: val })
                    });
                    const result = await res.json();
                    if (result.exists) {
                        input.classList.add('is-invalid');
                        input.classList.remove('is-valid');
                        showValidationMessage(input, errorMsg);
                    } else {
                        input.classList.add('is-valid');
                        input.classList.remove('is-invalid');
                        hideValidationMessage(input);
                    }
                } catch (error) {
                    console.error('Validation error:', error);
                }
            }, 500);
        });
        input.addEventListener('focus', () => {
            input.classList.remove('is-invalid', 'is-valid');
            hideValidationMessage(input);
        });
    };

    setupValidation('userUsername', '/api/users/check-username', 'Username sudah ada!');
    setupValidation('productName', '/api/products/check-name', 'Nama produk sudah ada!');
    setupValidation('categoryName', '/api/categories/check-name', 'Nama kategori sudah ada!');

    // ✅ Event delegation untuk pagination
    document.addEventListener('click', (e) => {
        if (e.target.matches('#paginationTop a.page-link, #paginationBottom a.page-link')) {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (!isNaN(page)) {
                currentPage = page;
                renderProducts();
            }
        }
        if (e.target.matches('#categoryPaginationTop a.page-link, #categoryPaginationBottom a.page-link')) {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (!isNaN(page)) {
                categoryCurrentPage = page;
                renderCategories();
            }
        }
        if (e.target.matches('#userPaginationTop a.page-link, #userPaginationBottom a.page-link')) {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (!isNaN(page)) {
                userCurrentPage = page;
                renderUsers();
            }
        }
        if (e.target.matches('#transactionPaginationTop a.page-link, #transactionPaginationBottom a.page-link')) {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (!isNaN(page)) {
                transactionCurrentPage = page;
                renderTransactions();
            }
        }
    });

    // User Filters
    document.getElementById('userSearchInput')?.addEventListener('input', (e) => {
        userSearchTerm = e.target.value;
        userCurrentPage = 1;
        renderUsers();
    });
    document.getElementById('clearUserSearchBtn')?.addEventListener('click', () => {
        userSearchTerm = '';
        document.getElementById('userSearchInput').value = '';
        userCurrentPage = 1;
        renderUsers();
    });
    document.getElementById('roleFilter')?.addEventListener('change', (e) => {
        roleFilter = e.target.value;
        userCurrentPage = 1;
        renderUsers();
    });
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        userCurrentPage = 1;
        renderUsers();
    });
    document.getElementById('userPageSizeSelect')?.addEventListener('change', (e) => {
        userPageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        userCurrentPage = 1;
        renderUsers();
    });
}