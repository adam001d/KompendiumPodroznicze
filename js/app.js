// ===== GALERIA ATRAKCJI - ZREWIDOWANA WERSJA 2025 =====

class BuildingsViewer {
    constructor() {
        this.buildings = [];
        this.filteredBuildings = [];
        this.currentBuilding = null;
        this.currentBuildingIndex = -1;
        this.searchTerm = '';
        this.filterCategory = 'all';
        this.filterCountry = '';
        this.sortBy = 'name';
        this.currentView = 'grid';
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadPhotos();
        await this.loadBuildings();
        this.setupEventListeners();
        this.updateStats();
        this.renderBuildingsList();
        this.hideLoading();
        this.handleURL();
    }

    async loadPhotos() {
        try {
            const response = await fetch('data/zdjecia/photos.json');
            if (!response.ok) throw new Error('Nie udało się załadować galerii');
            const data = await response.json();
            this.photos = data.zdjecia || [];
            console.log(`Załadowano ${this.photos.length} zdjęć`);
        } catch (error) {
            console.warn('Błąd ładowania galerii:', error);
            this.photos = [];
        }
    }

    async loadBuildings() {
        try {
            // Ładuj bezpośrednio z folderu data/budynki/
            const files = [
                'koloseum.json',
                'sagradafamilia.json',
                'wieżaeifflea.json',
                'tadżmahal.json',
                'partenon.json',
                'bazylikarzym.json',
                'piramidacheopsa.json'
            ];
            
            const promises = files.map(file => 
                fetch(`data/atrakcje/budynki/${file}`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Nie udało się załadować ${file}`);
                        return res.json();
                    })
                    .then(data => ({...data, kategoria: 'budynki'}))
                    .catch(err => {
                        console.warn(`Pominięto ${file}:`, err.message);
                        return null;
                    })
            );
            
            const results = await Promise.all(promises);
            this.buildings = results.filter(b => b !== null);
            this.filteredBuildings = [...this.buildings];
            
            if (this.buildings.length === 0) {
                throw new Error('Nie znaleziono żadnych atrakcji');
            }
            
            console.log(`Załadowano ${this.buildings.length} atrakcji`);
        } catch (error) {
            console.error('Błąd ładowania danych:', error);
            this.showError('Błąd ładowania danych: ' + error.message);
        }
    }

    getPhotosForBuilding(buildingId) {
        if (!this.photos) return [];
        return this.photos.filter(photo => 
            photo.powiazania?.obiekty_ids?.includes(buildingId)
        );
    }

    setupEventListeners() {
        // Wyszukiwanie
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Filtry kategorii
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterCategory = e.currentTarget.dataset.category;
                this.applyFilters();
            });
        });

        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                this.filterCategory = e.target.value;
                this.applyFilters();
            });
        }

        // Filtr kraju
        const filterCountry = document.getElementById('filterCountry');
        if (filterCountry) {
            filterCountry.addEventListener('change', (e) => {
                this.filterCountry = e.target.value;
                this.applyFilters();
            });
        }

        // Sortowanie
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        // Widoki
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentView = e.currentTarget.dataset.view;
                this.switchView();
            });
        });

        // Nawigacja
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.showBuildingsList());
        }

        const prevBuilding = document.getElementById('prevBuilding');
        if (prevBuilding) {
            prevBuilding.addEventListener('click', () => this.navigateBuilding(-1));
        }

        const nextBuilding = document.getElementById('nextBuilding');
        if (nextBuilding) {
            nextBuilding.addEventListener('click', () => this.navigateBuilding(1));
        }

        // URL
        window.addEventListener('popstate', () => this.handleURL());
    }

    applyFilters() {
        this.filteredBuildings = this.buildings.filter(building => {
            // Wyszukiwanie
            if (this.searchTerm) {
                const searchableText = JSON.stringify(building).toLowerCase();
                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }

            // Kategoria
            if (this.filterCategory && this.filterCategory !== 'all') {
                if (building.kategoria !== this.filterCategory) {
                    return false;
                }
            }

            // Kraj
            if (this.filterCountry) {
                const kraj = building.lokalizacja?.adres?.kraj;
                if (kraj !== this.filterCountry) {
                    return false;
                }
            }

            return true;
        });

        this.sortBuildings();
    }

    sortBuildings() {
        this.filteredBuildings.sort((a, b) => {
            switch (this.sortBy) {
                case 'height':
                    const heightA = a.wymiary?.wysokość?.całkowita || 0;
                    const heightB = b.wymiary?.wysokość?.całkowita || 0;
                    return heightB - heightA;

                case 'year':
                    const yearA = a.budowa?.chronologia?.rozpoczęcie_budowy || 0;
                    const yearB = b.budowa?.chronologia?.rozpoczęcie_budowy || 0;
                    return yearB - yearA;

                case 'visitors':
                    const visA = a.funkcje?.turystyczne?.liczba_turystów?.rocznie || 0;
                    const visB = b.funkcje?.turystyczne?.liczba_turystów?.rocznie || 0;
                    return visB - visA;

                case 'name':
                default:
                    const nameA = (a.podstawowe_informacje?.nazwa?.potoczna || a.podstawowe_informacje?.nazwa?.oficjalna || '').toLowerCase();
                    const nameB = (b.podstawowe_informacje?.nazwa?.potoczna || b.podstawowe_informacje?.nazwa?.oficjalna || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'pl');
            }
        });

        this.renderBuildingsList();
    }

    renderBuildingsList() {
        const grid = document.getElementById('buildingsGrid');
        if (!grid) return;

        if (this.filteredBuildings.length === 0) {
            grid.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-search" style="font-size: 4rem; color: var(--gray-400); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--gray-600);">Nie znaleziono atrakcji</h3>
                    <p style="color: var(--gray-500);">Spróbuj zmienić kryteria wyszukiwania</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredBuildings.map(building => this.createBuildingCard(building)).join('');

        // Event listeners dla kart
        grid.querySelectorAll('.building-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.showBuildingDetail(this.filteredBuildings[index], index);
            });
        });
    }

    createBuildingCard(b) {
        const nazwa = b.podstawowe_informacje?.nazwa?.potoczna || b.podstawowe_informacje?.nazwa?.oficjalna || 'Brak nazwy';
        const miasto = b.lokalizacja?.adres?.miasto || 'Nieznane';
        const kraj = b.lokalizacja?.adres?.kraj || '';
        const wysokosc = b.wymiary?.wysokość?.całkowita || 'N/A';
        const rok = b.budowa?.chronologia?.rozpoczęcie_budowy || null;
        const unesco = b.podstawowe_informacje?.certyfikaty_oznaczenia?.UNESCO;
        const zdjecie = b.galeria_zdjęć?.[0]?.miniatura || '';

        return `
            <div class="building-card">
                <div class="building-thumbnail">
                    ${zdjecie ? `
                        <img src="${zdjecie}" alt="${nazwa}" loading="lazy">
                    ` : `
                        <div class="no-image"><i class="fas fa-building"></i></div>
                    `}
                    ${kraj ? `
                        <div class="country-flag-badge">${this.getCountryFlag(kraj)}</div>
                    ` : ''}
                    ${unesco ? `
                        <div class="thumbnail-badges">
                            <span class="mini-badge unesco"><i class="fas fa-landmark"></i> UNESCO</span>
                        </div>
                    ` : ''}
                </div>

                <div class="building-main-info">
                    <h3 class="building-title">${nazwa}</h3>
                    <div class="building-meta">
                        <span class="meta-item">
                            <i class="fas fa-map-marker-alt"></i> 
                            ${miasto}, ${kraj} ${this.getCountryFlag(kraj)}
                        </span>
                        ${rok ? `<span class="meta-item"><i class="fas fa-calendar"></i> ${rok}</span>` : ''}
                    </div>
                </div>

                <div class="building-stats-compact">
                    <div class="stat-compact">
                        <i class="fas fa-ruler-vertical"></i>
                        <div>
                            <div class="stat-compact-value">${wysokosc} m</div>
                            <div class="stat-compact-label">wysokość</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showBuildingDetail(building, index) {
        this.currentBuilding = building;
        this.currentBuildingIndex = index;

        const detailContent = document.getElementById('detailContent');
        if (detailContent) {
            detailContent.innerHTML = this.createDetailView(building);
        }

        const buildingsGrid = document.getElementById('buildingsGrid');
        const buildingDetail = document.getElementById('buildingDetail');
        const buildingNav = document.getElementById('buildingNav');

        if (buildingsGrid) buildingsGrid.style.display = 'none';
        if (buildingDetail) buildingDetail.style.display = 'block';
        if (buildingNav) buildingNav.style.display = 'flex';

        // Ukryj kontrolki listy
        const filtersBar = document.querySelector('.filters-bar');
        const statsBar = document.querySelector('.stats-bar');
        const controlsBar = document.querySelector('.controls-bar');
        if (filtersBar) filtersBar.style.display = 'none';
        if (statsBar) statsBar.style.display = 'none';
        if (controlsBar) controlsBar.style.display = 'none';

        this.updateNavigationButtons();
        history.pushState({ buildingId: building.id }, '', `?building=${building.id}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    createDetailView(b) {
        const nazwa = b.podstawowe_informacje?.nazwa?.potoczna || b.podstawowe_informacje?.nazwa?.oficjalna;
        const miasto = b.lokalizacja?.adres?.miasto;
        const kraj = b.lokalizacja?.adres?.kraj;

        return `
            <div class="detail-container-3col">
                <!-- Hero -->
                <div class="detail-hero-full">
                    <h1 class="detail-title">${nazwa}</h1>
                    <p class="detail-subtitle">
                        <i class="fas fa-map-marker-alt"></i> ${miasto}, ${kraj} ${this.getCountryFlag(kraj, 24)}
                    </p>
                </div>

                <!-- 3-kolumnowy układ -->
                <div class="detail-3col-layout">
                    <!-- Lewa kolumna - Dane i statystyki -->
                    <aside class="detail-sidebar-left">
                        ${this.createStatsColumn(b)}
                    </aside>

                    <!-- Środkowa kolumna - Tekst -->
                    <main class="detail-content-center">
                        ${this.createTextContent(b)}
                    </main>

                    <!-- Prawa kolumna - Zdjęcia -->
                    <aside class="detail-sidebar-right">
                        ${this.createPhotosColumn(b)}
                    </aside>
                </div>
            </div>
        `;
    }

    createStatsColumn(b) {
        const wym = b.wymiary;
        const bud = b.budowa;
        const tur = b.funkcje?.turystyczne;
        const unesco = b.podstawowe_informacje?.certyfikaty_oznaczenia?.UNESCO;
        const arch = b.architektura;
        const hist = b.kontekst_historyczny;

        return `
            <div class="stats-column-compact">
                <h3 class="sidebar-title"><i class="fas fa-chart-bar"></i> Dane</h3>

                <!-- Wymiary - 2 kolumny -->
                <div class="stat-group-title">Wymiary</div>
                <div class="stat-group grid-2">
                    ${wym?.wysokość?.całkowita ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-ruler-vertical"></i>
                        <div class="stat-info">
                            <span class="stat-label">Wysokość</span>
                            <span class="stat-value">${wym.wysokość.całkowita} m</span>
                        </div>
                    </div>
                    ` : ''}
                    ${wym?.długość?.zewnętrzna ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-arrows-alt-h"></i>
                        <div class="stat-info">
                            <span class="stat-label">Długość</span>
                            <span class="stat-value">${wym.długość.zewnętrzna} m</span>
                        </div>
                    </div>
                    ` : ''}
                    ${wym?.szerokość?.zewnętrzna ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-arrows-alt-h"></i>
                        <div class="stat-info">
                            <span class="stat-label">Szerokość</span>
                            <span class="stat-value">${wym.szerokość.zewnętrzna} m</span>
                        </div>
                    </div>
                    ` : ''}
                    ${wym?.powierzchnia?.całkowita ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-expand"></i>
                        <div class="stat-info">
                            <span class="stat-label">Powierzchnia</span>
                            <span class="stat-value">${this.formatNumber(wym.powierzchnia.całkowita)} m²</span>
                        </div>
                    </div>
                    ` : ''}
                    ${wym?.kondygnacje?.nadziemne ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-layer-group"></i>
                        <div class="stat-info">
                            <span class="stat-label">Kond. nadz.</span>
                            <span class="stat-value">${wym.kondygnacje.nadziemne}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${wym?.kondygnacje?.podziemne ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-layer-group"></i>
                        <div class="stat-info">
                            <span class="stat-label">Kond. podz.</span>
                            <span class="stat-value">${wym.kondygnacje.podziemne}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${wym?.objetosc?.calosc_m3 ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-cube"></i>
                        <div class="stat-info">
                            <span class="stat-label">Objętość</span>
                            <span class="stat-value">${this.formatNumber(wym.objetosc.calosc_m3)} m³</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Budowa - 2 kolumny -->
                ${(bud?.chronologia || bud?.czas_budowy_lat) ? `
                <div class="stat-group-title">Budowa</div>
                <div class="stat-group grid-2">
                    ${bud?.chronologia?.rozpoczęcie_budowy ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-calendar-plus"></i>
                        <div class="stat-info">
                            <span class="stat-label">Rozpoczęcie</span>
                            <span class="stat-value">${bud.chronologia.rozpoczęcie_budowy}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${bud?.chronologia?.zakończenie_budowy ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-calendar-check"></i>
                        <div class="stat-info">
                            <span class="stat-label">Zakończenie</span>
                            <span class="stat-value">${bud.chronologia.zakończenie_budowy}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${bud?.czas_budowy_lat ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-hourglass-half"></i>
                        <div class="stat-info">
                            <span class="stat-label">Czas budowy</span>
                            <span class="stat-value">${bud.czas_budowy_lat} lat</span>
                        </div>
                    </div>
                    ` : ''}
                    ${bud?.koszt?.szacowany_mln_usd ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-dollar-sign"></i>
                        <div class="stat-info">
                            <span class="stat-label">Koszt</span>
                            <span class="stat-value">${bud.koszt.szacowany_mln_usd} mln USD</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Architektura -->
                ${(arch?.styl_architektoniczny?.główny || arch?.architekci?.architekt_główny) ? `
                <div class="stat-group-title">Architektura</div>
                <div class="stat-group">
                    ${arch?.styl_architektoniczny?.główny ? `
                    <div class="stat-item-compact full">
                        <i class="fas fa-drafting-compass"></i>
                        <div class="stat-info">
                            <span class="stat-label">Styl</span>
                            <span class="stat-value">${arch.styl_architektoniczny.główny}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${arch?.architekci?.architekt_główny ? `
                    <div class="stat-item-compact full">
                        <i class="fas fa-user-tie"></i>
                        <div class="stat-info">
                            <span class="stat-label">Architekt</span>
                            <span class="stat-value">${this.formatArchitect(arch.architekci.architekt_główny)}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${arch?.materiały_konstrukcyjne?.główne?.length ? `
                    <div class="stat-item-compact full">
                        <i class="fas fa-hard-hat"></i>
                        <div class="stat-info">
                            <span class="stat-label">Materiały</span>
                            <span class="stat-value">${arch.materiały_konstrukcyjne.główne.slice(0, 3).join(', ')}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Historia -->
                ${hist?.epoka_historyczna ? `
                <div class="stat-group-title">Historia</div>
                <div class="stat-group">
                    <div class="stat-item-compact full">
                        <i class="fas fa-history"></i>
                        <div class="stat-info">
                            <span class="stat-label">Epoka</span>
                            <span class="stat-value">${hist.epoka_historyczna}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Turystyka - highlight -->
                ${(unesco || tur?.liczba_turystów?.rocznie || tur?.czas_zwiedzania_min) ? `
                <div class="stat-group-title">Turystyka</div>
                <div class="stat-group highlight-group">
                    ${unesco ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-landmark"></i>
                        <div class="stat-info">
                            <span class="stat-label">UNESCO</span>
                            <span class="stat-value">Dziedzictwo światowe</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tur?.liczba_turystów?.rocznie ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <span class="stat-label">Turyści/rok</span>
                            <span class="stat-value">${this.formatNumber(tur.liczba_turystów.rocznie)}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tur?.czas_zwiedzania_min ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-clock"></i>
                        <div class="stat-info">
                            <span class="stat-label">Czas zwiedz.</span>
                            <span class="stat-value">${tur.czas_zwiedzania_min} min</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tur?.bilety?.normalny ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-ticket-alt"></i>
                        <div class="stat-info">
                            <span class="stat-label">Bilet</span>
                            <span class="stat-value">${tur.bilety.normalny}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }

    createTextContent(b) {
        const desc = b.szczegółowy_opis;
        const arch = b.architektura;
        const hist = b.kontekst_historyczny;
        const tur = b.funkcje?.turystyczne;

        return `
            <div class="text-content">
                ${desc?.tekst_długi ? `
                <section class="content-section">
                    <h2><i class="fas fa-info-circle"></i> Opis</h2>
                    <p class="text-paragraph">${desc.tekst_długi}</p>
                </section>
                ` : ''}

                ${hist ? `
                <section class="content-section">
                    <h2><i class="fas fa-history"></i> Historia</h2>
                    ${hist.epoka_historyczna ? `<p class="text-paragraph"><strong>Epoka:</strong> ${hist.epoka_historyczna}</p>` : ''}
                    ${hist.kontekst_polityczny ? `<p class="text-paragraph">${hist.kontekst_polityczny}</p>` : ''}
                </section>
                ` : ''}

                ${arch ? `
                <section class="content-section">
                    <h2><i class="fas fa-drafting-compass"></i> Architektura</h2>
                    ${arch.styl_architektoniczny?.główny ? `<p class="text-paragraph"><strong>Styl:</strong> ${arch.styl_architektoniczny.główny}</p>` : ''}
                    ${arch.architekci?.architekt_główny ? `<p class="text-paragraph"><strong>Architekt:</strong> ${this.formatArchitect(arch.architekci.architekt_główny)}</p>` : ''}
                    ${arch.materiały_konstrukcyjne?.główne?.length ? `<p class="text-paragraph"><strong>Materiały:</strong> ${arch.materiały_konstrukcyjne.główne.join(', ')}</p>` : ''}
                </section>
                ` : ''}

                ${desc?.ciekawostki?.length ? `
                <section class="content-section">
                    <h2><i class="fas fa-lightbulb"></i> Ciekawostki</h2>
                    <ul class="curiosities-list">
                        ${desc.ciekawostki.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </section>
                ` : ''}

                ${tur ? `
                <section class="content-section">
                    <h2><i class="fas fa-ticket-alt"></i> Informacje dla turystów</h2>
                    ${tur.godziny_otwarcia ? `
                    <div class="info-grid">
                        <h4>Godziny otwarcia:</h4>
                        ${Object.entries(tur.godziny_otwarcia).map(([day, hours]) => `
                            <div class="info-row">
                                <span class="info-label">${this.formatKey(day)}:</span>
                                <span class="info-value">${hours}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ${tur.bilety ? `
                    <div class="info-grid">
                        <h4>Ceny biletów:</h4>
                        ${Object.entries(tur.bilety).map(([type, price]) => `
                            <div class="info-row">
                                <span class="info-label">${this.formatKey(type)}:</span>
                                <span class="info-value">${price}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </section>
                ` : ''}

                ${this.createLocationMap(b)}
            </div>
        `;
    }

    createPhotosColumn(b) {
        // Pobierz zdjęcia z photos.json dla tego obiektu
        const photos = this.getPhotosForBuilding(b.id);
        
        return `
            <div class="photos-column">
                <h3 class="sidebar-title"><i class="fas fa-images"></i> Galeria (${photos.length})</h3>
                <div class="photos-vertical">
                    ${photos.length > 0 ? photos.map((photo, index) => `
                        <div class="photo-item">
                            <img src="${photo.miniatura || photo.pelny_rozmiar || 'https://via.placeholder.com/300x200'}" 
                                 alt="${photo.tytul || 'Zdjęcie ' + (index + 1)}" 
                                 loading="lazy"
                                 title="${photo.tytul || ''}">
                            <p class="photo-caption">
                                <strong>${photo.tytul || ''}</strong><br>
                                ${photo.opis || ''}<br>
                                <small>📷 ${photo.autor || 'Nieznany'} | ${photo.data || ''}</small>
                            </p>
                        </div>
                    `).join('') : `
                        <div class="no-photos">
                            <i class="fas fa-camera"></i>
                            <p>Brak zdjęć w galerii</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    createKeyMetrics(b) {
        const metrics = [];
        
        if (b.wymiary?.wysokość?.całkowita) {
            metrics.push({
                icon: 'fa-ruler-vertical',
                label: 'Wysokość',
                value: `${b.wymiary.wysokość.całkowita} m`
            });
        }
        
        if (b.wymiary?.powierzchnia?.całkowita) {
            metrics.push({
                icon: 'fa-expand',
                label: 'Powierzchnia',
                value: `${this.formatNumber(b.wymiary.powierzchnia.całkowita)} m²`
            });
        }
        
        if (b.budowa?.chronologia?.rozpoczęcie_budowy) {
            metrics.push({
                icon: 'fa-calendar',
                label: 'Rok budowy',
                value: b.budowa.chronologia.rozpoczęcie_budowy
            });
        }

        if (metrics.length === 0) return '';

        return `
            <div class="section">
                <div class="metrics-grid">
                    ${metrics.map(m => `
                        <div class="metric-card">
                            <i class="fas ${m.icon}"></i>
                            <div class="metric-value">${m.value}</div>
                            <div class="metric-label">${m.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createDescriptionSection(b) {
        const desc = b.szczegółowy_opis;
        if (!desc) return '';

        return `
            <div class="section">
                <h2 class="section-title">Opis</h2>
                ${desc.tekst_długi ? `<p class="description-text">${desc.tekst_długi}</p>` : ''}
                
                ${desc.ciekawostki?.length ? `
                    <div style="margin-top: 2rem;">
                        <h3 style="font-size: 1.2rem; margin-bottom: 1rem;">Ciekawostki</h3>
                        <ul class="curiosities-list">
                            ${desc.ciekawostki.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createDimensionsSection(b) {
        const wym = b.wymiary;
        if (!wym) return '';

        const dimensions = [];
        
        if (wym.wysokość?.całkowita) dimensions.push(['Wysokość całkowita', `${wym.wysokość.całkowita} m`]);
        if (wym.długość?.zewnętrzna) dimensions.push(['Długość', `${wym.długość.zewnętrzna} m`]);
        if (wym.szerokość?.zewnętrzna) dimensions.push(['Szerokość', `${wym.szerokość.zewnętrzna} m`]);
        if (wym.powierzchnia?.całkowita) dimensions.push(['Powierzchnia', `${this.formatNumber(wym.powierzchnia.całkowita)} m²`]);
        if (wym.kondygnacje?.nadziemne) dimensions.push(['Kondygnacje', wym.kondygnacje.nadziemne]);

        if (dimensions.length === 0) return '';

        return `
            <div class="section">
                <h2 class="section-title">Wymiary</h2>
                <div class="data-grid">
                    ${dimensions.map(([label, value]) => `
                        <div class="data-item">
                            <div class="data-label">${label}</div>
                            <div class="data-value">${value}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createArchitectureSection(b) {
        const arch = b.architektura;
        if (!arch) return '';

        return `
            <div class="section">
                <h2 class="section-title">Architektura</h2>
                
                ${arch.styl_architektoniczny?.główny ? `
                    <div class="info-item">
                        <strong>Styl:</strong> ${arch.styl_architektoniczny.główny}
                    </div>
                ` : ''}
                
                ${arch.architekci?.architekt_główny ? `
                    <div class="info-item">
                        <strong>Architekt:</strong> ${this.formatArchitect(arch.architekci.architekt_główny)}
                    </div>
                ` : ''}
                
                ${arch.materiały_konstrukcyjne?.główne?.length ? `
                    <div class="info-item">
                        <strong>Materiały:</strong> ${arch.materiały_konstrukcyjne.główne.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    createHistorySection(b) {
        const hist = b.kontekst_historyczny;
        if (!hist) return '';

        return `
            <div class="section">
                <h2 class="section-title">Historia</h2>
                ${hist.epoka_historyczna ? `<p><strong>Epoka:</strong> ${hist.epoka_historyczna}</p>` : ''}
                ${hist.kontekst_polityczny ? `<p>${hist.kontekst_polityczny}</p>` : ''}
            </div>
        `;
    }

    createTourismSection(b) {
        const tourism = b.funkcje?.turystyczne;
        if (!tourism) return '';

        return `
            <div class="section">
                <h2 class="section-title">Informacje turystyczne</h2>
                
                ${tourism.liczba_turystów?.rocznie ? `
                    <div class="info-item">
                        <strong>Turyści rocznie:</strong> ${this.formatNumber(tourism.liczba_turystów.rocznie)}
                    </div>
                ` : ''}
                
                ${tourism.godziny_otwarcia ? `
                    <div class="subsection">
                        <h3>Godziny otwarcia</h3>
                        <div class="data-grid">
                            ${Object.entries(tourism.godziny_otwarcia).map(([day, hours]) => `
                                <div class="data-item">
                                    <div class="data-label">${this.formatKey(day)}</div>
                                    <div class="data-value">${hours}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${tourism.bilety ? `
                    <div class="subsection">
                        <h3>Bilety</h3>
                        <div class="data-grid">
                            ${Object.entries(tourism.bilety).map(([type, price]) => `
                                <div class="data-item">
                                    <div class="data-label">${this.formatKey(type)}</div>
                                    <div class="data-value">${price}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createLocationMap(b) {
        const coords = b.lokalizacja?.współrzędne;
        if (!coords) return '';

        const lat = coords.szerokość_geograficzna || 0;
        const lon = coords.długość_geograficzna || 0;

        return `
            <div class="section">
                <h2 class="section-title">Lokalizacja</h2>
                <div class="map-container">
                    <iframe 
                        width="100%" 
                        height="400" 
                        frameborder="0" 
                        scrolling="no" 
                        src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}"
                        style="border-radius: 8px;">
                    </iframe>
                </div>
            </div>
        `;
    }

    showBuildingsList() {
        const buildingsGrid = document.getElementById('buildingsGrid');
        const buildingDetail = document.getElementById('buildingDetail');
        const buildingNav = document.getElementById('buildingNav');

        if (buildingsGrid) buildingsGrid.style.display = 'grid';
        if (buildingDetail) buildingDetail.style.display = 'none';
        if (buildingNav) buildingNav.style.display = 'none';

        // Pokaż kontrolki listy
        const filtersBar = document.querySelector('.filters-bar');
        const statsBar = document.querySelector('.stats-bar');
        const controlsBar = document.querySelector('.controls-bar');
        if (filtersBar) filtersBar.style.display = 'flex';
        if (statsBar) statsBar.style.display = 'flex';
        if (controlsBar) controlsBar.style.display = 'flex';

        this.currentBuilding = null;
        history.pushState({}, '', window.location.pathname);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navigateBuilding(direction) {
        const newIndex = this.currentBuildingIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.filteredBuildings.length) {
            this.showBuildingDetail(this.filteredBuildings[newIndex], newIndex);
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBuilding');
        const nextBtn = document.getElementById('nextBuilding');
        
        if (prevBtn) prevBtn.disabled = this.currentBuildingIndex <= 0;
        if (nextBtn) nextBtn.disabled = this.currentBuildingIndex >= this.filteredBuildings.length - 1;
    }

    switchView() {
        const grid = document.getElementById('buildingsGrid');
        if (!grid) return;

        if (this.currentView === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    handleURL() {
        const params = new URLSearchParams(window.location.search);
        const buildingId = params.get('building');
        
        if (buildingId) {
            const building = this.buildings.find(b => b.id === buildingId);
            if (building) {
                const index = this.filteredBuildings.indexOf(building);
                this.showBuildingDetail(building, index >= 0 ? index : 0);
            }
        } else {
            this.showBuildingsList();
        }
    }

    updateStats() {
        const countries = new Set(this.buildings.map(b => b.lokalizacja?.adres?.kraj).filter(Boolean));
        const unescoCount = this.buildings.filter(b => b.podstawowe_informacje?.certyfikaty_oznaczenia?.UNESCO).length;

        // Aktualizuj elementy w stats-bar
        const totalAttractions = document.getElementById('totalAttractions');
        const totalCountriesWithAttractions = document.getElementById('totalCountriesWithAttractions');
        const unescoCountAttractions = document.getElementById('unescoCountAttractions');

        if (totalAttractions) totalAttractions.textContent = this.buildings.length;
        if (totalCountriesWithAttractions) totalCountriesWithAttractions.textContent = countries.size;
        if (unescoCountAttractions) unescoCountAttractions.textContent = unescoCount;
    }

    // Funkcje pomocnicze
    getCountryFlag(countryName) {
        return CountryFlags.getFlag(countryName);
    }

    formatNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + ' mln';
        if (num >= 1000) return (num / 1000).toFixed(1) + ' tys';
        return num.toLocaleString('pl-PL');
    }

    formatKey(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase());
    }

    formatArchitect(architect) {
        if (Array.isArray(architect)) {
            return architect.map(a => a.imię_i_nazwisko || a).join(', ');
        }
        return architect.imię_i_nazwisko || architect;
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'flex';
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorText) errorText.textContent = message;
        if (errorEl) errorEl.style.display = 'block';
        
        this.hideLoading();
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    new BuildingsViewer();
});
