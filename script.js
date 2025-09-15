// Firebase Configuration (Replace with your Firebase project config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const productsRef = db.collection('products');

// Sample products
const sampleProducts = [
    {
        id: "prod_1",
        name: "كتب دراسية ومراجع",
        price: 100,
        discount: 10,
        category: "books",
        description: "جميع المراحل الدراسية - طبعة حديثة",
        rating: 5,
        badge: "جديد"
    },
    // ... (include all 20 sample products from the original code with unique IDs)
];

// Robust input sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.replace(/[<>]/g, '');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Debounce search input
    const searchInput = document.getElementById('searchInput');
    let debounceTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(filterProducts, 300);
    });

    // Event listeners for modal and tabs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCodeModal();
            hideProductForm();
            hideNotification();
        }
    });

    document.getElementById('codeModal').addEventListener('click', (e) => {
        if (e.target === this) hideCodeModal();
    });

    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', () => switchCodeTab(tab.getAttribute('data-tab')));
    });
});

// Global variables
let currentCategoryFilter = 'all';
let currentSearchTerm = '';
let products = [];

// Load products from Firestore with real-time listener
function loadProducts() {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '<div class="loading">جارٍ التحميل...</div>';

    productsRef.onSnapshot((snapshot) => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredProducts = products.filter(product => {
            const matchesCategory = currentCategoryFilter === 'all' || product.category === currentCategoryFilter;
            const matchesSearch = product.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
                                product.description.toLowerCase().includes(currentSearchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filteredProducts.length === 0) {
            productsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>لا توجد منتجات حالياً</h3>
                    <p>لم يتم إضافة أي منتجات بعد. قم بإضافة منتجات جديدة لبدء إدارة متجرك.</p>
                    <button class="btn btn-primary" onclick="showProductForm()">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                </div>
            `;
            return;
        }

        productsList.innerHTML = filteredProducts.map(product => {
            const finalPrice = product.discount > 0
                ? product.price - (product.price * product.discount / 100)
                : product.price;

            return `
            <div class="product-card">
                ${product.badge ? `<span class="product-badge">${sanitizeInput(product.badge)}</span>` : ''}
                <div class="product-image">
                    ${product.image ? `<img src="${product.image}" alt="${sanitizeInput(product.name)}" loading="lazy">` : getCategoryIcon(product.category)}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${sanitizeInput(product.name)}</h3>
                    <div class="product-price">
                        ${product.discount > 0 ? `
                            <span class="discount-badge">خصم ${product.discount}%</span>
                            <span class="original-price">${product.price.toFixed(2)} جنيه</span>
                        ` : ''}
                        ${finalPrice.toFixed(2)} جنيه
                    </div>
                    <span class="product-category">${getCategoryName(product.category)}</span>
                    <div class="product-rating">
                        ${generateStarRating(product.rating)}
                        <span class="rating-text">(${product.rating.toFixed(1)})</span>
                    </div>
                    <p class="product-description">${sanitizeInput(product.description)}</p>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-sm" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }, (error) => {
        showNotification('خطأ في تحميل المنتجات: ' + error.message, 'error');
        console.error('Load products error:', error);
    });
}

// Generate star rating with fractional support
function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Show product form
function showProductForm() {
    const form = document.getElementById('productForm');
    form.classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDiscount').value = '0';
    document.getElementById('productCategory').value = 'books';
    document.getElementById('productDescription').value = '';
    document.getElementById('productRating').value = '4';
    document.getElementById('productBadge').value = '';
    document.getElementById('productImageData').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImage').src = '';
    form.scrollIntoView({ behavior: 'smooth' });
}

// Hide product form
function hideProductForm() {
    document.getElementById('productForm').classList.add('hidden');
}

// Handle image upload to Firebase Storage
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showNotification('حجم الصورة يجب أن يكون أقل من 5MB', 'error');
        event.target.value = '';
        return;
    }

    if (!file.type.match('image.*')) {
        showNotification('يرجى اختيار ملف صورة فقط', 'error');
        event.target.value = '';
        return;
    }

    const img = new Image();
    img.onload = async () => {
        if (img.width > 2000 || img.height > 2000) {
            showNotification('أبعاد الصورة كبيرة جدًا، يرجى اختيار صورة أصغر', 'error');
            event.target.value = '';
            return;
        }

        try {
            const storageRef = storage.ref(`product-images/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const imageUrl = await storageRef.getDownloadURL();
            document.getElementById('productImageData').value = imageUrl;
            document.getElementById('previewImage').src = imageUrl;
            document.getElementById('imagePreview').style.display = 'block';
        } catch (error) {
            showNotification('خطأ في رفع الصورة: ' + error.message, 'error');
            console.error('Image upload error:', error);
        }
    };
    img.onerror = () => {
        showNotification('تعذر تحميل الصورة', 'error');
        event.target.value = '';
    };
    img.src = URL.createObjectURL(file);
}

// Remove uploaded image
function removeImage() {
    document.getElementById('productImageData').value = '';
    document.getElementById('previewImage').src = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('productImage').value = '';
}

// Save product to Firestore
async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const name = sanitizeInput(document.getElementById('productName').value.trim());
    const price = parseFloat(document.getElementById('productPrice').value);
    const discount = parseInt(document.getElementById('productDiscount').value) || 0;
    const category = document.getElementById('productCategory').value;
    const description = sanitizeInput(document.getElementById('productDescription').value.trim());
    const rating = parseFloat(document.getElementById('productRating').value);
    const badge = sanitizeInput(document.getElementById('productBadge').value.trim());
    const image = document.getElementById('productImageData').value;

    // Detailed validation
    const errors = [];
    if (!name) errors.push('اسم المنتج مطلوب');
    if (isNaN(price)) errors.push('السعر الأصلي مطلوب');
    else if (price < 0) errors.push('السعر لا يمكن أن يكون سالباً');
    if (discount < 0 || discount > 100) errors.push('نسبة الخصم يجب أن تكون بين 0 و100');
    if (!category) errors.push('التصنيف مطلوب');
    if (!description) errors.push('الوصف مطلوب');
    if (isNaN(rating) || rating < 0 || rating > 5) errors.push('التقييم يجب أن يكون بين 0 و5');

    if (errors.length > 0) {
        showNotification(errors.join('<br>'), 'error');
        return;
    }

    try {
        const productData = { name, price, discount, category, description, rating, badge, image };
        if (productId) {
            if (!confirm('هل أنت متأكد من تعديل هذا المنتج؟')) return;
            await productsRef.doc(productId).update(productData);
            showNotification('تم تعديل المنتج بنجاح', 'success');
        } else {
            const existingProduct = (await productsRef.where('name', '==', name).get()).docs[0];
            if (existingProduct) {
                showNotification('اسم المنتج موجود بالفعل', 'error');
                return;
            }
            await productsRef.add(productData);
            showNotification('تم إضافة المنتج بنجاح', 'success');
        }
        hideProductForm();
    } catch (error) {
        showNotification('خطأ في حفظ المنتج: ' + error.message, 'error');
        console.error('Save product error:', error);
    }
}

// Edit product
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        document.getElementById('productForm').classList.remove('hidden');
        document.getElementById('formTitle').textContent = 'تعديل المنتج';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDiscount').value = product.discount || 0;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productRating').value = product.rating;
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('productImageData').value = product.image || '';
        if (product.image) {
            document.getElementById('previewImage').src = product.image;
            document.getElementById('imagePreview').style.display = 'block';
        } else {
            document.getElementById('imagePreview').style.display = 'none';
        }
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete product
async function deleteProduct(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            const product = products.find(p => p.id === id);
            if (product.image) {
                await storage.refFromURL(product.image).delete();
            }
            await productsRef.doc(id).delete();
            showNotification('تم حذف المنتج بنجاح', 'success');
        } catch (error) {
            showNotification('خطأ في حذف المنتج: ' + error.message, 'error');
            console.error('Delete product error:', error);
        }
    }
}

// Clear all products
async function clearAllProducts() {
    if (confirm('هل أنت متأكد من حذف جميع المنتجات؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            const snapshot = await productsRef.get();
            const deletePromises = snapshot.docs.map(async (doc) => {
                const product = doc.data();
                if (product.image) {
                    await storage.refFromURL(product.image).delete();
                }
                await doc.ref.delete();
            });
            await Promise.all(deletePromises);
            showNotification('تم حذف جميع المنتجات', 'success');
        } catch (error) {
            showNotification('خطأ في حذف المنتجات: ' + error.message, 'error');
            console.error('Clear products error:', error);
        }
    }
}

// Add sample products
async function addSampleProducts() {
    try {
        const snapshot = await productsRef.get();
        if (!snapshot.empty) {
            if (!confirm('يوجد منتجات حالية. هل تريد استبدالها بالمنتجات النموذجية؟')) return;
            await clearAllProducts();
        }

        const addPromises = sampleProducts.map(product =>
            productsRef.add({ ...product, id: undefined })
        );
        await Promise.all(addPromises);
        showNotification('تم إضافة 20 منتج نموذجي بنجاح', 'success');
    } catch (error) {
        showNotification('خطأ في إضافة المنتجات النموذجية: ' + error.message, 'error');
        console.error('Add sample products error:', error);
    }
}

// Export products
async function exportProducts() {
    try {
        const snapshot = await productsRef.get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (products.length === 0) {
            showNotification('لا توجد منتجات لتصديرها', 'error');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'products.json');
        downloadAnchor.click();
        showNotification('تم تصدير المنتجات بنجاح', 'success');
    } catch (error) {
        showNotification('خطأ في تصدير المنتجات: ' + error.message, 'error');
        console.error('Export products error:', error);
    }
}

// Import products
async function importProducts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            showNotification('يرجى اختيار ملف JSON', 'error');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedProducts = JSON.parse(e.target.result);
                    if (!Array.isArray(importedProducts)) {
                        showNotification('ملف المنتجات غير صالح', 'error');
                        return;
                    }

                    const snapshot = await productsRef.get();
                    if (!snapshot.empty) {
                        if (!confirm('يوجد منتجات حالية. هل تريد استبدالها؟')) return;
                        await clearAllProducts();
                    }

                    const addPromises = importedProducts.map(product =>
                        productsRef.add({
                            name: sanitizeInput(product.name || ''),
                            price: parseFloat(product.price) || 0,
                            discount: parseInt(product.discount) || 0,
                            category: product.category || 'books',
                            description: sanitizeInput(product.description || ''),
                            rating: parseFloat(product.rating) || 4,
                            badge: sanitizeInput(product.badge || ''),
                            image: product.image || ''
                        })
                    );
                    await Promise.all(addPromises);
                    showNotification('تم استيراد المنتجات بنجاح', 'success');
                } catch (error) {
                    showNotification('خطأ في استيراد المنتجات: ' + error.message, 'error');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            showNotification('خطأ في استيراد المنتجات: ' + error.message, 'error');
            console.error('Import error:', error);
        }
    };
    input.click();
}

// Mock sync with main page
async function syncWithMainPage() {
    try {
        // Simulate syncing by updating a "lastSync" timestamp in Firestore
        await db.collection('sync').doc('lastSync').set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        showNotification('تمت المزامنة بنجاح مع الصفحة الرئيسية', 'success');
    } catch (error) {
        showNotification('خطأ في المزامنة: ' + error.message, 'error');
        console.error('Sync error:', error);
    }
}

// Filter products
function filterProducts() {
    currentSearchTerm = document.getElementById('searchInput').value;
    loadProducts();
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentSearchTerm = '';
    loadProducts();
}

// Set category filter
function setCategoryFilter(category) {
    currentCategoryFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filter-btn[onclick="setCategoryFilter('${category}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
    loadProducts();
}

// Show code modal
async function showCodeModal() {
    try {
        const snapshot = await productsRef.get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (products.length === 0) {
            showNotification('لا توجد منتجات لإنشاء أكواد لها', 'error');
            return;
        }

        document.getElementById('jsCodeContent').textContent = generateJSCode(products);
        document.getElementById('htmlCodeContent').textContent = generateHTMLCode(products);
        document.getElementById('codeModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        showNotification('خطأ في إنشاء الأكواد: ' + error.message, 'error');
        console.error('Code modal error:', error);
    }
}

// Generate JavaScript code
function generateJSCode(products) {
    return `// نظام إدارة المنتجات - مكتبة الرواد
// الأكواد التالية جاهزة للنسخ واللصق في الصفحة الرئيسية

let products = ${JSON.stringify(products, null, 2)};

function getCategoryIcon(category) {
    const icons = {
        'books': '<i class="fas fa-book" style="font-size: 2.5rem; color: #1e3d59;"></i>',
        'stationery': '<i class="fas fa-pen" style="font-size: 2.5rem; color: #ff6b35;"></i>',
        'bags': '<i class="fas fa-briefcase" style="font-size: 2.5rem; color: #28a745;"></i>',
        'gifts': '<i class="fas fa-gift" style="font-size: 2.5rem; color: #ffc107;"></i>'
    };
    return icons[category] || '<i class="fas fa-box" style="font-size: 2.5rem; color: #a0aec0;"></i>';
}

function getCategoryName(category) {
    const names = {
        'books': 'الكتب الدراسية',
        'stationery': 'المستلزمات المكتبية',
        'bags': 'الحقائب المدرسية',
        'gifts': 'الهدايا'
    };
    return names[category] || category;
}

function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function loadProducts(category = 'all') {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    let filteredProducts = category === 'all' ? products : products.filter(p => p.category === category);

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #6c757d;"><i class="fas fa-box-open" style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.5;"></i><h3 style="color: #1e3d59; margin-bottom: 0.8rem;">لا توجد منتجات في هذا التصنيف حالياً</h3><p style="margin-bottom: 1.5rem;">سيتم إضافة منتجات جديدة قريباً</p><a href="https://wa.me/+201126630356?text=أريد الاستفسار عن المنتجات المتاحة" class="btn btn-primary" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> استفسر عن المنتجات</a></div>';
        return;
    }

    grid.innerHTML = filteredProducts.map(product => {
        const finalPrice = product.discount > 0 
            ? product.price - (product.price * product.discount / 100)
            : product.price;
            
        return \`
        <div class="product-card fade-in" data-category="\${product.category}">
            <div class="product-image">
                \${product.image ? \`<img src="\${product.image}" alt="\${product.name}" loading="lazy">\` : getCategoryIcon(product.category)}
                \${product.badge ? \`<span class="product-badge">\${product.badge}</span>\` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">\${product.name}</h3>
                <div class="product-price">
                    \${product.discount > 0 ? \`
                        <span class="discount-badge">خصم \${product.discount}%</span>
                        <span class="original-price">\${product.price.toFixed(2)} جنيه</span>
                    \` : ''}
                    \${finalPrice.toFixed(2)} جنيه
                </div>
                <div class="product-rating">
                    \${generateStarRating(product.rating)}
                    <span style="color: #6c757d; font-size: 0.9rem;">(\${product.rating.toFixed(1)})</span>
                </div>
                <p style="font-size: 0.9rem; color: #6c757d; margin-bottom: 1.2rem; line-height: 1.5;">\${product.description}</p>
                <div class="product-actions">
                    <button class="add-to-cart" onclick="addToCart('\${product.id}')">
                        <i class="fas fa-cart-plus"></i> أضف للسلة
                    </button>
                    <button class="wishlist-btn" onclick="toggleWishlist('\${product.id}')" title="إضافة للمفضلة">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
        \`;
    }).join('');

    updateFilterButtons(category);
    animateProductCards();
}

function filterProducts(category) {
    loadProducts(category);
}

function updateFilterButtons(activeCategory) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(\`.filter-btn[onclick="filterProducts('\${activeCategory}')"]\`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function animateProductCards() {
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'all 0.6s ease';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
    }, 100);
}

function addToCart(productId) {
    alert(\`تم إضافة المنتج رقم \${productId} إلى السلة\`);
}

function toggleWishlist(productId) {
    const btn = document.querySelector(\`.wishlist-btn[onclick="toggleWishlist('\${productId}')"]\`);
    btn.classList.toggle('active');
    btn.title = btn.classList.contains('active') ? 'إزالة من المفضلة' : 'إضافة للمفضلة';
    
    if (btn.classList.contains('active')) {
        alert(\`تم إضافة المنتج رقم \${productId} إلى المفضلة\`);
    } else {
        alert(\`تم إزالة المنتج رقم \${productId} من المفضلة\`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});`;
}

// Generate HTML code
function generateHTMLCode(products) {
    return `<!-- نظام إدارة المنتجات - مكتبة الرواد -->
<!-- هيكل HTML الخاص بقسم المنتجات -->

<section class="section" id="products">
    <div class="container">
        <h2 class="section-title">منتجاتنا المميزة</h2>
        
        <div class="products-filter">
            <button class="filter-btn active" onclick="filterProducts('all')">الكل</button>
            <button class="filter-btn" onclick="filterProducts('books')">الكتب</button>
            <button class="filter-btn" onclick="filterProducts('stationery')">المستلزمات</button>
            <button class="filter-btn" onclick="filterProducts('bags')">الحقائب</button>
            <button class="filter-btn" onclick="filterProducts('gifts')">الهدايا</button>
        </div>

        <div class="products-grid" id="productsGrid">
            ${products.map(product => {
                const finalPrice = product.discount > 0 
                    ? product.price - (product.price * product.discount / 100)
                    : product.price;
                    
                return `
            <div class="product-card fade-in" data-category="${product.category}">
                <div class="product-image">
                    ${product.image ? `<img src="${product.image}" alt="${sanitizeInput(product.name)}" loading="lazy">` : getCategoryIcon(product.category)}
                    ${product.badge ? `<span class="product-badge">${sanitizeInput(product.badge)}</span>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${sanitizeInput(product.name)}</h3>
                    <div class="product-price">
                        ${product.discount > 0 ? `
                            <span class="discount-badge">خصم ${product.discount}%</span>
                            <span class="original-price">${product.price.toFixed(2)} جنيه</span>
                        ` : ''}
                        ${finalPrice.toFixed(2)} جنيه
                    </div>
                    <div class="product-rating">
                        ${generateStarRating(product.rating)}
                        <span style="color: #6c757d; font-size: 0.9rem;">(${product.rating.toFixed(1)})</span>
                    </div>
                    <p style="font-size: 0.9rem; color: #6c757d; margin-bottom: 1.2rem; line-height: 1.5;">${sanitizeInput(product.description)}</p>
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="addToCart('${product.id}')">
                            <i class="fas fa-cart-plus"></i> أضف للسلة
                        </button>
                        <button class="wishlist-btn" onclick="toggleWishlist('${product.id}')" title="إضافة للمفضلة">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
                `;
            }).join('')}
        </div>
    </div>
</section>`;
}

// Hide code modal
function hideCodeModal() {
    document.getElementById('codeModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Copy code
function copyCode(elementId, btnElement) {
    const codeContent = document.getElementById(elementId);
    const textToCopy = codeContent.textContent;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('تم نسخ الأكواد بنجاح', 'success');
            btnElement.classList.add('copied');
            setTimeout(() => btnElement.classList.remove('copied'), 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopyText(textToCopy, btnElement);
        });
    } else {
        fallbackCopyText(textToCopy, btnElement);
    }
}

function fallbackCopyText(text, btnElement) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = 0;
    document.body.appendChild(textArea);

    try {
        textArea.select();
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification('تم نسخ الأكواد بنجاح', 'success');
            btnElement.classList.add('copied');
            setTimeout(() => btnElement.classList.remove('copied'), 2000);
        } else {
            showNotification('تعذر النسخ. يرجى نسخ النص يدويًا.', 'error');
        }
    } catch (err) {
        showNotification('تعذر النسخ: ' + err.message, 'error');
        console.error('Fallback copy error:', err);
    } finally {
        document.body.removeChild(textArea);
    }
}

// Switch code tabs
function switchCodeTab(tabId) {
    document.querySelectorAll('.code-section').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.code-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const activeTab = document.querySelector(`.code-tab[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const iconClass = type === 'success' ? 'fa-check-circle' :
                     type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span id="notificationMessage">${sanitizeInput(message)}</span>
        <button class="close-btn" onclick="hideNotification()">
            <i class="fas fa-times"></i>
        </button>
    `;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 5000);
}

// Hide notification
function hideNotification() {
    document.getElementById('notification').classList.remove('show');
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        'books': '<i class="fas fa-book" style="font-size: 2.5rem; color: #1e3d59;"></i>',
        'stationery': '<i class="fas fa-pen" style="font-size: 2.5rem; color: #ff6b35;"></i>',
        'bags': '<i class="fas fa-briefcase" style="font-size: 2.5rem; color: #28a745;"></i>',
        'gifts': '<i class="fas fa-gift" style="font-size: 2.5rem; color: #ffc107;"></i>'
    };
    return icons[category] || '<i class="fas fa-box" style="font-size: 2.5rem; color: #a0aec0;"></i>';
}

// Get category name
function getCategoryName(category) {
    const names = {
        'books': 'الكتب الدراسية',
        'stationery': 'المستلزمات المكتبية',
        'bags': 'الحقائب المدرسية',
        'gifts': 'الهدايا'
    };
    return names[category] || category;
}
