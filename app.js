// --- PWA INSTALL LOGIC ---
let deferredPrompt;
const installToast = document.getElementById('install-toast');
const installBtn = document.getElementById('install-btn');
const hasDismissedInstall = localStorage.getItem('ps_install_dismissed');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone && !hasDismissedInstall) {
        showInstallToast();
    }
});

function showInstallToast() {
    installToast.classList.remove('hidden');
    setTimeout(() => {
        installToast.classList.remove('-translate-y-[150%]', 'opacity-0', 'pointer-events-none');
        installToast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
    }, 100);
}

function hideInstallToast() {
    installToast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    installToast.classList.add('-translate-y-[150%]', 'opacity-0', 'pointer-events-none');
    setTimeout(() => { installToast.classList.add('hidden'); }, 500);
}

window.dismissInstall = () => {
    localStorage.setItem('ps_install_dismissed', 'true');
    hideInstallToast();
};

installBtn.addEventListener('click', async () => {
    hideInstallToast();
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    }
});

// --- CUSTOM UI DROPDOWN SYSTEM ---
function initCustomSelect(containerId, options, onSelect, initialValue = 'All') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const menu = container.querySelector('.select-menu');
    const optionsContainer = container.querySelector('.select-options');
    const icon = container.querySelector('svg');

    let currentOptions = options;
    let currentValue = initialValue;

    function render() {
        optionsContainer.innerHTML = currentOptions.map(opt => `
            <div class="px-3 py-2 text-sm font-bold rounded-lg cursor-pointer transition-colors ${opt.value === currentValue ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}" data-value="${opt.value}">${opt.label}</div>
        `).join('');

        const renderedLabel = currentOptions.find(o => o.value === currentValue)?.label || currentValue;
        label.textContent = renderedLabel;

        optionsContainer.querySelectorAll('div').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                currentValue = el.dataset.value;
                label.textContent = el.textContent;
                close();
                render();
                onSelect(currentValue);
            });
        });
    }

    function open() {
        document.querySelectorAll('.custom-select .select-menu').forEach(m => m.classList.add('hidden'));
        document.querySelectorAll('.custom-select svg').forEach(i => i.classList.remove('rotate-180'));

        menu.classList.remove('hidden');
        icon.classList.add('rotate-180');
        setTimeout(() => { menu.classList.remove('opacity-0', 'scale-95'); menu.classList.add('opacity-100', 'scale-100'); }, 10);
    }

    function close() {
        menu.classList.remove('opacity-100', 'scale-100');
        menu.classList.add('opacity-0', 'scale-95');
        icon.classList.remove('rotate-180');
        setTimeout(() => { menu.classList.add('hidden'); }, 200);
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.classList.contains('hidden')) open(); else close();
    });

    render();

    return {
        updateOptions: (newOptions, newValue) => {
            currentOptions = newOptions;
            currentValue = newValue;
            render();
        },
        setValue: (newValue) => {
            currentValue = newValue;
            render();
        },
        close: close
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select .select-menu:not(.hidden)').forEach(menu => {
        menu.classList.remove('opacity-100', 'scale-100');
        menu.classList.add('opacity-0', 'scale-95');
        const svg = menu.parentElement.querySelector('svg');
        if (svg) svg.classList.remove('rotate-180');
        setTimeout(() => { menu.classList.add('hidden'); }, 200);
    });
});

// --- DYNAMIC AGE GATE & CITY SELECTION ---
const supportedCities = [
    { id: 'winnipeg', name: 'Winnipeg, MB', age: 19 },
    { id: 'toronto', name: 'Toronto, ON', age: 19 },
    { id: 'vancouver', name: 'Vancouver, BC', age: 19 },
    { id: 'calgary', name: 'Calgary, AB', age: 18 },
    { id: 'edmonton', name: 'Edmonton, AB', age: 18 },
    { id: 'ottawa', name: 'Ottawa, ON', age: 19 },
    { id: 'hamilton', name: 'Hamilton, ON', age: 19 },
    { id: 'saskatoon', name: 'Saskatoon, SK', age: 19 }
];

const locationSelect = document.getElementById('province-select');
const ageQuestion = document.getElementById('age-question');
const ageYesBtn = document.getElementById('age-yes-btn');
const ageGate = document.getElementById('age-gate');
let requiredAge = 19;

if (locationSelect && locationSelect.previousElementSibling) {
    locationSelect.previousElementSibling.textContent = "Select your city";
}

if (locationSelect) {
    locationSelect.innerHTML = supportedCities.map(c => `<option value="${c.id}" data-age="${c.age}">${c.name}</option>`).join('');
    locationSelect.addEventListener('change', updateAgeUI);
}

function updateAgeUI() {
    const selectedOption = locationSelect.options[locationSelect.selectedIndex];
    requiredAge = parseInt(selectedOption.getAttribute('data-age')) || 19;
    ageQuestion.textContent = `Are you ${requiredAge} or older?`;
    ageYesBtn.textContent = `Yes, I am ${requiredAge}+`;
}

function checkAgeGate() {
    const isVerified = localStorage.getItem('priceScoutAgeVerified') === 'true';
    const savedCity = localStorage.getItem('ps_city');

    if (isVerified && savedCity) {
        ageGate.style.display = 'none';
        document.body.classList.remove('overflow-hidden');
        init(savedCity);
    } else {
        updateAgeUI();
    }
}

window.confirmAge = () => {
    const selectedCity = locationSelect.value;
    localStorage.setItem('priceScoutAgeVerified', 'true');
    localStorage.setItem('ps_city', selectedCity);

    ageGate.style.opacity = '0';
    setTimeout(() => {
        ageGate.style.display = 'none';
        document.body.classList.remove('overflow-hidden');
        init(selectedCity);
    }, 300);
};

window.denyAge = () => {
    alert(`You must be ${requiredAge}+ to access this platform. Redirecting...`);
    window.location.href = "https://www.google.com";
};

window.changeCity = () => {
    localStorage.removeItem('ps_city');
    localStorage.removeItem('priceScoutAgeVerified');
    window.location.reload();
};


// --- APP STATE & ROUTING ---
const state = {
    products: [], categories: ['All'], dispensaries: [],
    activeCategory: 'All', activeStore: 'All Stores',
    searchQuery: '', activeStrain: 'All', activeWeight: 'All',
    selectedProduct: null, selectedWeightIdx: 0,
    savedIds: JSON.parse(localStorage.getItem('ps_saved') || '[]'),
    userLocation: null
};

const els = {
    categoryContainer: document.getElementById('category-container'), productGrid: document.getElementById('product-grid'),
    searchInput: document.getElementById('search-input'),
    loading: document.getElementById('loading'), detailsView: document.getElementById('details-view'),
    detailsContent: document.getElementById('details-content'), detailNavTitle: document.getElementById('detail-nav-title'),
    aboutModal: document.getElementById('about-modal'), saveIcon: document.getElementById('save-icon'),
    savedGrid: document.getElementById('saved-grid'), savedEmpty: document.getElementById('saved-empty'),
    filterModal: document.getElementById('filter-modal'), filterBackdrop: document.getElementById('filter-backdrop'),
    filterDrawer: document.getElementById('filter-drawer'), filterIndicator: document.getElementById('filter-indicator'),
    legalModal: document.getElementById('legal-modal'), legalTitle: document.getElementById('legal-title'),
    legalContent: document.getElementById('legal-content'),
    views: {
        'home': document.getElementById('home-view'),
        'saved': document.getElementById('saved-view'),
        'smart': document.getElementById('smart-view'),
        'nearme': document.getElementById('nearme-view')
    },
    navs: {
        'home': document.getElementById('nav-home'),
        'saved': document.getElementById('nav-saved'),
        'smart': document.getElementById('nav-smart'),
        'nearme': document.getElementById('nav-nearme')
    }
};

let currentFiltered = [];
let displayedCount = 0;
const ITEMS_PER_PAGE = 20;
let storeDropdownCtrl, strainDropdownCtrl, weightDropdownCtrl;

const strainBaseOptions = [
    { label: 'All Strains', value: 'All' },
    { label: 'Indica', value: 'Indica' },
    { label: 'Sativa', value: 'Sativa' },
    { label: 'Hybrid', value: 'Hybrid' }
];

const generateId = (brand, name) => {
    return (brand + '-' + name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

// --- ROUTER LOGIC ---
window.addEventListener('hashchange', handleHash);

function handleHash() {
    const hash = window.location.hash.replace('#', '');

    if (hash.startsWith('product-')) {
        const id = hash.replace('product-', '');
        const product = state.products.find(p => p._id === id);
        if (product) {
            openProductModal(product);
            return;
        } else {
            window.location.hash = '';
            return;
        }
    } else {
        els.detailsView.classList.remove('active');
    }

    const viewName = hash || 'home';
    Object.values(els.views).forEach(el => el.classList.remove('active'));
    if (els.views[viewName]) els.views[viewName].classList.add('active');

    Object.values(els.navs).forEach(el => {
        el.classList.remove('text-green-600');
        el.classList.add('text-gray-400');
        el.querySelector('svg').setAttribute('fill', 'none');
        el.querySelector('svg').setAttribute('stroke', 'currentColor');
    });

    if (els.navs[viewName]) {
        els.navs[viewName].classList.remove('text-gray-400');
        els.navs[viewName].classList.add('text-green-600');
        els.navs[viewName].querySelector('svg').setAttribute('fill', 'currentColor');
        els.navs[viewName].querySelector('svg').removeAttribute('stroke');
    }

    if (viewName === 'saved') renderSaved();
    if (viewName === 'nearme' && state.userLocation) renderNearMe();
}

window.closeProduct = () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.hash = '';
    }
};

// --- MODALS ---
window.goHome = () => { window.location.hash = ''; };
window.toggleAboutModal = (show) => { els.aboutModal.classList.toggle('active', show); };

window.toggleLegalModal = (type) => {
    if (!type) {
        els.legalModal.classList.remove('active');
        return;
    }
    if (type === 'terms') {
        els.legalTitle.textContent = "Terms of Service";
        els.legalContent.innerHTML = `
            <p><strong>1. Informational Purposes Only:</strong> PriceScout is an independent data aggregator. We do not sell, distribute, or handle cannabis products. All data is scraped from publicly available dispensary menus.</p>
            <p><strong>2. Accuracy & Liability:</strong> Prices, inventory, and product descriptions are subject to change by the respective dispensaries at any time. PriceScout is not a retailer and takes no responsibility for pricing errors, out-of-stock items, or discrepancies at the physical retail level.</p>
            <p><strong>3. Legal Age Requirement:</strong> You must be of legal age to purchase cannabis in your respective province to use this application. By using this tool, you confirm that you meet the age requirements established by the Cannabis Act and your provincial regulator.</p>
        `;
    } else if (type === 'privacy') {
        els.legalTitle.textContent = "Privacy Policy";
        els.legalContent.innerHTML = `
            <p><strong>1. Data Collection:</strong> PriceScout is built with privacy in mind. We do not require you to create an account, and we do not ask for or collect personally identifiable information (PII) such as your name, email, or exact physical address.</p>
            <p><strong>2. Local Storage:</strong> User preferences, such as your "Saved Deals" and your age verification status, are stored locally on your device using browser \`localStorage\`. We do not upload this personal data to our servers.</p>
            <p><strong>3. Analytics:</strong> We may use lightweight, anonymized analytics (such as page views or general city-level location) to understand platform usage and improve the tool. We do not track individual user behavior across the web.</p>
        `;
    }
    els.legalModal.classList.add('active');
};

// --- FILTER DRAWER LOGIC ---
window.toggleFilterMenu = (show) => {
    if (show) {
        els.filterModal.classList.remove('hidden');
        setTimeout(() => {
            els.filterBackdrop.classList.remove('opacity-0');
            els.filterDrawer.classList.remove('translate-x-full');
        }, 10);
    } else {
        els.filterBackdrop.classList.add('opacity-0');
        els.filterDrawer.classList.add('translate-x-full');
        setTimeout(() => {
            els.filterModal.classList.add('hidden');
        }, 300);
    }
};

function populateWeightDropdown() {
    let validWeights = new Set();
    state.products.forEach(p => {
        if (state.activeCategory === 'All' || p._cat === state.activeCategory) {
            p.weights.forEach(w => {
                if (w.weight.toLowerCase() !== 'unknown' && w.offers.length > 0) {
                    validWeights.add(w.weight);
                }
            });
        }
    });

    let sortedWeights = Array.from(validWeights).sort((a, b) => {
        const numA = parseFloat(a.match(/[\d\.]+/) || [999]);
        const numB = parseFloat(b.match(/[\d\.]+/) || [999]);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    const options = [{ label: 'All Sizes', value: 'All' }].concat(
        sortedWeights.map(w => ({ label: w, value: w }))
    );

    if (!validWeights.has(state.activeWeight) && state.activeWeight !== 'All') {
        state.activeWeight = 'All';
    }

    weightDropdownCtrl.updateOptions(options, state.activeWeight);
}

// MODIFIED to also reset the newly placed Store dropdown
window.resetFilters = () => {
    state.activeStore = 'All Stores';
    state.activeStrain = 'All';
    state.activeWeight = 'All';
    if (storeDropdownCtrl) storeDropdownCtrl.setValue('All Stores');
    if (strainDropdownCtrl) strainDropdownCtrl.setValue('All');
    populateWeightDropdown();
    applyFilters();
    toggleFilterMenu(false);
};

// MODIFIED to trigger the red dot if a store is selected
function updateFilterIndicator() {
    if (state.activeStore !== 'All Stores' || state.activeStrain !== 'All' || state.activeWeight !== 'All') {
        els.filterIndicator.classList.remove('hidden');
    } else {
        els.filterIndicator.classList.add('hidden');
    }
}

// --- DATA INITIALIZATION ---
async function init(citySlug) {
    try {
        els.loading.style.display = 'flex';
        els.productGrid.innerHTML = '';
        state.products = [];
        state.categories = ['All'];
        state.dispensaries = [];

        const timestamp = new Date().getTime();
        const url = `https://dxyorssfzphzekzkbohq.supabase.co/storage/v1/object/public/city-data/${citySlug}/normalized_products.json?t=${timestamp}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();

        if (data.dispensaries) {
            state.dispensaries = data.dispensaries;
        }

        Object.keys(data.categories).forEach(cat => {
            state.categories.push(cat);
            data.categories[cat].forEach(p => {
                p._cat = cat;
                p._id = generateId(p.brand, p.canonical);
                p._savings = calculateSavings(p);
                p._searchStr = `${p.canonical} ${p.brand} ${p.strain}`.toLowerCase();
                state.products.push(p);
            });
        });

        state.products.sort((a, b) => b._savings - a._savings);
        els.loading.style.display = 'none';

        const storeOpts = [{ label: 'All Stores', value: 'All Stores' }].concat(
            state.dispensaries.map(d => ({ label: d, value: d }))
        );

        if (storeDropdownCtrl) storeDropdownCtrl.updateOptions(storeOpts, 'All Stores');
        else storeDropdownCtrl = initCustomSelect('custom-store-selector', storeOpts, (val) => { state.activeStore = val; applyFilters(); }, state.activeStore);

        if (strainDropdownCtrl) strainDropdownCtrl.updateOptions(strainBaseOptions, 'All');
        else strainDropdownCtrl = initCustomSelect('custom-strain-selector', strainBaseOptions, (val) => { state.activeStrain = val; applyFilters(); }, state.activeStrain);

        if (weightDropdownCtrl) weightDropdownCtrl.updateOptions([{ label: 'All Sizes', value: 'All' }], 'All');
        else weightDropdownCtrl = initCustomSelect('custom-weight-selector', [{ label: 'All Sizes', value: 'All' }], (val) => { state.activeWeight = val; applyFilters(); }, state.activeWeight);

        renderCategories();
        populateWeightDropdown();
        applyFilters();
        handleHash();

    } catch (err) {
        els.loading.innerHTML = `Error loading data for ${citySlug}. The server might still be updating.`;
        console.error(err);
    }
}

function calculateSavings(p) {
    let maxSave = 0;
    p.weights.forEach(w => {
        if (w.offers.length > 1) {
            const diff = w.offers[w.offers.length - 1].price - w.offers[0].price;
            if (diff > maxSave) maxSave = diff;
        }
    });
    return maxSave;
}

// --- SHARING AND SAVING ---
window.shareCurrentProduct = () => {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: `PriceScout: ${state.selectedProduct.canonical}`,
            text: `Check out this deal for ${state.selectedProduct.brand} on PriceScout.`,
            url: url
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
    }
};

window.toggleSaveCurrentProduct = () => {
    const id = state.selectedProduct._id;
    toggleSave(id);
    updateSaveIcon();
};

window.toggleSave = (id, e = null) => {
    if (e) e.stopPropagation();

    if (state.savedIds.includes(id)) {
        state.savedIds = state.savedIds.filter(savedId => savedId !== id);
    } else {
        state.savedIds.push(id);
    }
    localStorage.setItem('ps_saved', JSON.stringify(state.savedIds));

    if (window.location.hash === '#saved') renderSaved();
};

function updateSaveIcon() {
    if (!state.selectedProduct) return;
    const isSaved = state.savedIds.includes(state.selectedProduct._id);
    if (isSaved) {
        els.saveIcon.setAttribute('fill', 'currentColor');
        els.saveIcon.classList.add('text-green-500');
    } else {
        els.saveIcon.setAttribute('fill', 'none');
        els.saveIcon.classList.remove('text-green-500');
    }
}

// --- FILTERING & RENDER ENGINE ---
function renderCategories() {
    els.categoryContainer.innerHTML = state.categories.map(cat => `
        <button onclick="setCategory('${cat}')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${state.activeCategory === cat ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}">${cat}</button>
    `).join('');
}

window.setCategory = (cat) => {
    state.activeCategory = cat;
    populateWeightDropdown();
    applyFilters();
    renderCategories();
    els.views.home.scrollTop = 0;
};

els.searchInput.addEventListener('input', (e) => { state.searchQuery = e.target.value.toLowerCase(); applyFilters(); });

function applyFilters() {
    updateFilterIndicator();

    currentFiltered = state.products.filter(p => {
        const catMatch = state.activeCategory === 'All' || p._cat === state.activeCategory;
        const searchMatch = p._searchStr.includes(state.searchQuery);

        let storeMatch = true;
        if (state.activeStore !== 'All Stores') {
            storeMatch = p.weights.some(w => w.offers.some(o => o.dispensary === state.activeStore));
        }

        let strainMatch = true;
        if (state.activeStrain !== 'All') {
            strainMatch = p.strain && p.strain.toLowerCase() === state.activeStrain.toLowerCase();
        }

        let weightMatch = true;
        if (state.activeWeight !== 'All') {
            weightMatch = p.weights.some(w => w.weight === state.activeWeight && w.offers.length > 0);
        }

        return catMatch && searchMatch && storeMatch && strainMatch && weightMatch;
    });

    displayedCount = 0;
    els.productGrid.innerHTML = '';

    if (currentFiltered.length === 0) {
        els.productGrid.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-medium">No items found matching these filters.</div>`;
        return;
    }
    loadMore();
}

function getStrainBadge(strain, isDetails = false) {
    if (!strain) return '';
    const s = strain.toLowerCase();
    let colorClass = ''; let icon = ''; let matchedStrain = '';
    const iconSize = isDetails ? 'w-3.5 h-3.5 mr-1' : 'w-2.5 h-2.5 mr-0.5';

    if (s.includes('indica')) {
        colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        icon = `<svg class="${iconSize}" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>`;
        matchedStrain = 'Indica';
    } else if (s.includes('sativa')) {
        colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
        icon = `<svg class="${iconSize}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 4.22a1 1 0 011.415 0l.708.708a1 1 0 01-1.414 1.414l-.708-.708a1 1 0 010-1.414zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-4.22 4.22a1 1 0 010 1.415l-.708.708a1 1 0 01-1.414-1.414l.708.708a1 1 0 011.415 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-4.22a1 1 0 010-1.415l-.708-.708a1 1 0 01-1.414 1.414l.708.708a1 1 0 011.415 0zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM5.78 5.78a1 1 0 01-1.415 0l-.708-.708a1 1 0 011.414-1.414l.708.708a1 1 0 010 1.415z" clip-rule="evenodd"></path></svg>`;
        matchedStrain = 'Sativa';
    } else if (s.includes('hybrid')) {
        colorClass = 'bg-teal-50 text-teal-700 border-teal-200';
        icon = `<svg class="${iconSize}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a2 2 0 114 0 2 2 0 01-4 0zm0 6a2 2 0 114 0 2 2 0 01-4 0z"></path></svg>`;
        matchedStrain = 'Hybrid';
    } else { return ''; }

    const textSize = isDetails ? 'text-[11px] px-2 py-0.5' : 'text-[8px] px-1.5 py-0.5 leading-none';
    return `<div class="inline-flex items-center rounded border font-bold uppercase tracking-wider ${textSize} ${colorClass}">${icon}${matchedStrain}</div>`;
}

function generateProductCard(p) {
    const saveBadge = p._savings > 0 ? `<div class="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] font-black tracking-wide px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">Save $${p._savings.toFixed(2)}</div>` : '';
    const isSavedView = window.location.hash === '#saved';

    const isNearMeView = window.location.hash === '#nearme';
    const distBadge = (isNearMeView && p._dist) ? `<div class="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[8px] font-black tracking-wide px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">${p._dist.toFixed(1)} km</div>` : '';

    const unsaveBtn = isSavedView ? `
        <button onclick="toggleSave('${p._id}', event)" class="absolute top-1.5 left-1.5 z-20 bg-white/90 backdrop-blur text-red-500 p-1.5 rounded-full shadow-sm border border-red-100 hover:bg-red-50 transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
        </button>
    ` : '';

    return `
        <div onclick="window.location.hash='product-${p._id}'" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer relative z-0">
            ${unsaveBtn}
            ${distBadge}
            ${saveBadge}
            <div class="h-32 bg-gray-50 relative p-2 flex items-center justify-center">
                <img src="${p.image_url || `https://ui-avatars.com/api/?name=${p.brand || 'P'}&background=f3f4f6&color=9ca3af`}" class="max-h-full max-w-full object-contain mix-blend-multiply pointer-events-none" loading="lazy">
            </div>
            <div class="p-3 flex flex-col flex-1 pointer-events-none">
                <div class="flex justify-between items-start mb-1 gap-2">
                    <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 line-clamp-1">${p.brand || 'Unknown'}</div>
                    ${getStrainBadge(p.strain)}
                </div>
                <div class="font-bold text-sm leading-snug mb-2 line-clamp-2">${p.canonical}</div>
                <div class="mt-auto flex items-end justify-between">
                    <div><div class="text-[10px] text-gray-500">Starting at</div><div class="font-black text-green-600 text-lg">$${p.cheapest_price.toFixed(2)}</div></div>
                </div>
            </div>
        </div>
    `;
}

function loadMore() {
    const toShow = currentFiltered.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
    if (toShow.length === 0) return;

    const html = toShow.map(generateProductCard).join('');
    els.productGrid.insertAdjacentHTML('beforeend', html);
    displayedCount += toShow.length;
}

function renderSaved() {
    const savedProducts = state.products.filter(p => state.savedIds.includes(p._id));
    if (savedProducts.length === 0) {
        els.savedGrid.innerHTML = '';
        els.savedEmpty.classList.replace('hidden', 'flex');
    } else {
        els.savedEmpty.classList.replace('flex', 'hidden');
        els.savedGrid.innerHTML = savedProducts.map(generateProductCard).join('');
    }
}

els.views.home.addEventListener('scroll', () => {
    if (els.views.home.scrollTop + els.views.home.clientHeight >= els.views.home.scrollHeight - 200) { loadMore(); }
});

// --- NEAR ME / GPS LOGIC ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

window.requestLocation = () => {
    document.getElementById('nearme-prompt').classList.add('hidden');

    // FIX: Remove hidden, but ADD flex so it centers properly
    const loadingUI = document.getElementById('nearme-loading');
    loadingUI.classList.remove('hidden');
    loadingUI.classList.add('flex');

    document.getElementById('nearme-empty').classList.add('hidden');

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                state.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                renderNearMe();
            },
            (error) => {
                loadingUI.classList.add('hidden');
                loadingUI.classList.remove('flex');
                document.getElementById('nearme-empty').classList.remove('hidden');
                document.getElementById('nearme-empty-msg').textContent = "Location access denied. Please enable it in your browser settings to use this feature.";
            },
            { timeout: 10000 }
        );
    } else {
        loadingUI.classList.add('hidden');
        loadingUI.classList.remove('flex');
        document.getElementById('nearme-empty').classList.remove('hidden');
        document.getElementById('nearme-empty-msg').textContent = "Geolocation is not supported by your browser.";
    }
};

function renderNearMe() {
    const loadingUI = document.getElementById('nearme-loading');
    const resultsContainer = document.getElementById('nearme-results');
    const emptyContainer = document.getElementById('nearme-empty');

    loadingUI.classList.add('hidden');

    const SEARCH_RADIUS_KM = 5.0;

    const nearbyProducts = state.products.filter(p => {
        let closestDistance = Infinity;

        const hasNearby = p.weights.some(w => {
            return w.offers.some(o => {
                return o.locations.some(loc => {
                    if (loc.lat && loc.lng) {
                        const dist = calculateDistance(state.userLocation.lat, state.userLocation.lng, loc.lat, loc.lng);
                        if (dist < closestDistance) closestDistance = dist;
                        return dist <= SEARCH_RADIUS_KM;
                    }
                    return false;
                });
            });
        });

        if (hasNearby) {
            p._dist = closestDistance;
            return true;
        }
        return false;
    });

    if (nearbyProducts.length > 0) {
        nearbyProducts.sort((a, b) => a._dist - b._dist);
        resultsContainer.innerHTML = nearbyProducts.map(generateProductCard).join('');
        resultsContainer.classList.remove('hidden');
        emptyContainer.classList.add('hidden');
    } else {
        resultsContainer.classList.add('hidden');
        emptyContainer.classList.remove('hidden');
        document.getElementById('nearme-empty-msg').textContent = `No deals found within ${SEARCH_RADIUS_KM}km.`;
    }
}

// --- DETAILS RENDER ENGINE ---
window.openProductModal = (product) => {
    state.selectedProduct = product;

    let targetIdx = 0;
    if (state.activeWeight !== 'All') {
        targetIdx = product.weights.findIndex(w => w.weight === state.activeWeight && w.offers.length > 0);
    }
    if (targetIdx === -1) {
        targetIdx = product.weights.findIndex(w => w.weight.toLowerCase() !== 'unknown');
    }
    state.selectedWeightIdx = targetIdx !== -1 ? targetIdx : 0;

    updateSaveIcon();
    renderDetails();

    els.detailsView.classList.add('active');
    els.detailsView.scrollTop = 0;
};

window.setWeight = (idx) => { state.selectedWeightIdx = idx; renderDetails(); };

function renderDetails() {
    const p = state.selectedProduct;
    if (!p) return;
    els.detailNavTitle.textContent = p.brand || p._cat;

    const w = p.weights[state.selectedWeightIdx];
    const bestOffer = w.offers[0];
    const otherOffers = w.offers.slice(1);

    let priceHtml = `<div class="text-3xl font-black mt-1">$${bestOffer.price.toFixed(2)}</div>`;
    if (w.offers.length > 1) {
        const maxPrice = w.offers[w.offers.length - 1].price;
        const savings = maxPrice - bestOffer.price;
        if (savings > 0) {
            priceHtml = `
                <div class="flex flex-col items-end">
                    <div class="text-green-200 text-sm line-through leading-none opacity-80">$${maxPrice.toFixed(2)}</div>
                    <div class="text-3xl font-black mt-1 leading-none mb-1">$${bestOffer.price.toFixed(2)}</div>
                    <div class="text-[10px] font-bold uppercase bg-white text-green-700 px-2 py-0.5 rounded shadow-sm tracking-wide">Save $${savings.toFixed(2)}</div>
                </div>
            `;
        }
    }

    const hasVisibleWeights = p.weights.some(weightData => weightData.weight.toLowerCase() !== 'unknown');

    let unitPriceHtml = '';
    if (hasVisibleWeights && bestOffer) {
        const match = w.weight.match(/^([\d\.]+)\s*(g|ml|mg|-pack|pack)/i);
        if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2].toLowerCase().replace('-pack', 'ea').replace('pack', 'ea');
            if (amount > 0) {
                const ppu = (bestOffer.price / amount).toFixed(2);
                unitPriceHtml = `<div class="inline-flex items-center rounded bg-gray-100 text-gray-500 font-bold tracking-wider text-[11px] px-2 py-0.5 border border-gray-200">
                    $${ppu} / ${unit}
                </div>`;
            }
        }
    }

    const renderOffer = (offer, isWorst = false) => {
        const priceColor = isWorst ? 'text-red-500' : 'text-gray-900';

        if (offer.locations.length === 1) {
            const loc = offer.locations[0];
            return `
            <div class="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div class="flex-1 pr-3">
                    <div class="font-bold text-gray-800">${offer.dispensary}</div>
                    <div class="text-xs text-gray-400 mt-0.5">${loc.location || offer.dispensary}</div>
                </div>
                <div class="text-right">
                    <div class="font-black text-lg ${priceColor} mb-1">$${offer.price.toFixed(2)}</div>
                    <a href="${loc.url}" target="_blank" class="text-[10px] uppercase tracking-wide bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-bold transition-colors">View Deal</a>
                </div>
            </div>`;
        } else {
            return `
            <details class="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm group">
                <summary class="p-3 flex items-center justify-between cursor-pointer focus:outline-none">
                    <div class="flex-1 pr-3">
                        <div class="font-bold text-gray-800">${offer.dispensary}</div>
                        <div class="text-xs text-green-600 font-medium mt-0.5">${offer.locations.length} locations available <span class="text-gray-400 group-open:hidden">▾</span><span class="text-gray-400 hidden group-open:inline">▴</span></div>
                    </div>
                    <div class="text-right flex flex-col items-end">
                        <div class="font-black text-lg ${priceColor} mb-1">$${offer.price.toFixed(2)}</div>
                        <a href="${offer.locations[0].url}" target="_blank" onclick="event.stopPropagation()" class="text-[10px] uppercase tracking-wide bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-bold transition-colors">View Deal</a>
                    </div>
                </summary>
                <div class="bg-gray-50 border-t border-gray-100 p-2 space-y-2">
                    ${offer.locations.map(loc => `
                        <div class="flex items-center justify-between pl-2">
                            <div class="text-sm text-gray-600">${loc.location || offer.dispensary}</div>
                            <a href="${loc.url}" target="_blank" class="text-[10px] uppercase tracking-wide bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-bold transition-colors shadow-sm">View Deal</a>
                        </div>
                    `).join('')}
                </div>
            </details>`;
        }
    };

    let otherOptionsHtml = '';
    if (otherOffers.length > 0) {
        const worstOffer = otherOffers[otherOffers.length - 1];
        const middleOffers = otherOffers.slice(0, otherOffers.length - 1);

        otherOptionsHtml = `
        <div class="px-4">
            <div class="text-sm font-bold text-gray-900 mb-2">Other Options</div>
            <div class="space-y-2">
                ${middleOffers.length > 0 ? `
                <details class="group/accordion">
                    <summary class="cursor-pointer focus:outline-none block mb-2 group/btn">
                        <div class="relative group-open/accordion:hidden">
                            <div class="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-sm opacity-40 blur-[1px]">
                                <div class="flex-1 pr-3">
                                    <div class="h-4 bg-gray-400 rounded w-24 mb-1.5"></div>
                                    <div class="h-2 bg-gray-300 rounded w-16"></div>
                                </div>
                                <div class="text-right flex flex-col items-end">
                                    <div class="h-5 bg-gray-400 rounded w-12 mb-1"></div>
                                    <div class="h-5 bg-gray-300 rounded w-16"></div>
                                </div>
                            </div>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="flex items-center justify-center gap-1 bg-white/95 backdrop-blur shadow-sm border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-full transition-all group-hover/btn:text-green-600 group-hover/btn:border-green-300 group-hover/btn:scale-105">
                                    Reveal ${middleOffers.length} more stores ▾
                                </div>
                            </div>
                        </div>
                        <div class="hidden group-open/accordion:flex items-center justify-center w-full bg-gray-100 text-gray-500 text-xs font-bold py-2 rounded-xl hover:bg-gray-200 transition-colors">
                            Hide stores ▴
                        </div>
                    </summary>
                    <div class="space-y-2 mb-2">
                        ${middleOffers.map(o => renderOffer(o)).join('')}
                    </div>
                </details>
                
                <div class="flex flex-col items-center justify-center py-1 opacity-70">
                    <div class="w-px h-3 border-l-2 border-dashed border-gray-300"></div>
                    <div class="text-[9px] font-black uppercase tracking-widest text-gray-400 my-1">Highest Price</div>
                    <div class="w-px h-3 border-l-2 border-dashed border-gray-300"></div>
                </div>
                ` : ''}
                
                ${renderOffer(worstOffer, true)}
            </div>
        </div>`;
    }

    els.detailsContent.innerHTML = `
        <div class="bg-white p-5 flex flex-col items-center border-b border-gray-100">
            <img src="${p.image_url || `https://ui-avatars.com/api/?name=${p.brand || 'P'}&background=f3f4f6&color=9ca3af`}" class="h-48 w-48 object-contain mb-4 mix-blend-multiply">
            <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">${p.brand || 'Unknown'}</div>
            <h2 class="text-xl font-black text-center leading-tight text-gray-900">${p.canonical}</h2>
            
            <div class="flex items-center gap-2 mt-3">
                ${getStrainBadge(p.strain, true)} 
                ${unitPriceHtml}
            </div>
        </div>

        ${hasVisibleWeights ? `
        <div class="px-4 py-4">
            <div class="text-sm font-bold text-gray-900 mb-2">Select Size</div>
            <div class="flex flex-wrap gap-2">
                ${p.weights.map((weightData, i) => weightData.weight.toLowerCase() !== 'unknown' ? `
                    <button onclick="setWeight(${i})" class="px-4 py-2 rounded-xl text-sm font-bold border transition-all ${state.selectedWeightIdx === i ? 'border-green-600 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}">${weightData.weight}</button>
                ` : '').join('')}
            </div>
        </div>` : ''}

        ${(w.thc || w.cbd) ? `
        <div class="px-4 pb-4 flex gap-4 ${!hasVisibleWeights ? 'pt-4' : ''}">
            ${w.thc ? `<div class="flex-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center"><div class="text-xs text-gray-400 font-bold uppercase mb-1">THC</div><div class="font-black text-gray-800">${w.thc}</div></div>` : ''}
            ${w.cbd ? `<div class="flex-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center"><div class="text-xs text-gray-400 font-bold uppercase mb-1">CBD</div><div class="font-black text-gray-800">${w.cbd}</div></div>` : ''}
        </div>` : ''}

        <div class="px-4 mb-6 ${(!hasVisibleWeights && !w.thc && !w.cbd) ? 'pt-6' : ''}">
            <div class="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                Best Price
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4 shadow-md text-white">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="text-green-100 text-sm font-bold tracking-wide uppercase mb-1">${bestOffer.dispensary}</div>
                        <div class="text-xs text-green-200 opacity-90 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            ${bestOffer.locations[0].location || bestOffer.dispensary}
                        </div>
                    </div>
                    ${priceHtml}
                </div>
                
                <div class="flex mt-4">
                    <a href="${bestOffer.locations[0].url}" target="_blank" class="block w-full text-center bg-white text-green-700 font-bold py-2.5 rounded-xl hover:bg-green-50 transition-colors shadow-sm">
                        Shop Now
                    </a>
                </div>
                
                ${bestOffer.locations.length > 1 ? `
                    <details class="mt-4 group border-t border-green-500/50 pt-3">
                        <summary class="text-xs font-medium text-green-100 cursor-pointer flex justify-between items-center focus:outline-none px-1">
                            <span>Available at ${bestOffer.locations.length - 1} other location(s)</span>
                            <span class="group-open:rotate-180 transition-transform">▾</span>
                        </summary>
                        <div class="space-y-2 mt-3 mb-1">
                            ${bestOffer.locations.slice(1).map(loc => `
                                <a href="${loc.url}" target="_blank" class="flex justify-between items-center w-full bg-black/10 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-black/20 transition-colors">
                                    <span>${loc.location || bestOffer.dispensary}</span>
                                    <span class="font-bold text-[10px] uppercase bg-white/20 text-white px-2 py-1 rounded">Shop ↗</span>
                                </a>
                            `).join('')}
                        </div>
                    </details>
                ` : ''}
            </div>
        </div>

        ${otherOptionsHtml}
    `;
}

// Start the app
checkAgeGate();