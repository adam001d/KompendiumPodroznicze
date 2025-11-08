class CountriesViewer {
    constructor() {
        this.countries = [];
        this.filteredCountries = [];
        this.currentContinent = 'all';
        this.currentSort = 'name';
        this.currentView = 'grid';
        this.currentCountry = null;
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadPhotos();
        await this.loadCountries();
        this.setupEventListeners();
        this.updateStats();
        this.renderCountries();
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

    async loadCountries() {
        try {
            // Załaduj index krajów
            const indexResponse = await fetch('data/metadata/countries_index.json');
            const index = await indexResponse.json();

            // Załaduj pełne dane dla każdego kraju (można zoptymalizować lazy loading)
            const promises = index.items.map(item =>
                fetch(`data/kraje/${item.id.toLowerCase()}.json`)
                    .then(res => res.ok ? res.json() : null)
                    .catch(() => null)
            );

            const results = await Promise.all(promises);
            this.countries = results.filter(c => c !== null);
            this.filteredCountries = [...this.countries];

            // Załaduj indeksy miast i atrakcji dla powiązań
            await this.loadCitiesIndex();
            await this.loadAttractionsIndex();

        } catch (error) {
            console.error('Błąd ładowania krajów:', error);
            this.showError('Nie udało się załadować krajów');
        }
    }

    async loadCitiesIndex() {
        try {
            const response = await fetch('data/metadata/cities_index.json');
            if (!response.ok) throw new Error('Nie udało się załadować indeksu miast');
            const data = await response.json();
            this.citiesIndex = data.items || [];
        } catch (error) {
            console.warn('Błąd ładowania indeksu miast:', error);
            this.citiesIndex = [];
        }
    }

    async loadAttractionsIndex() {
        try {
            const response = await fetch('data/metadata/buildings_index.json');
            if (!response.ok) throw new Error('Nie udało się załadować indeksu atrakcji');
            const data = await response.json();
            this.attractionsIndex = data.items || [];
        } catch (error) {
            console.warn('Błąd ładowania indeksu atrakcji:', error);
            this.attractionsIndex = [];
        }
    }

    getPhotosForCountry(countryId) {
        if (!this.photos) return [];
        return this.photos.filter(photo => 
            photo.powiazania?.kraje_ids?.includes(countryId)
        );
    }

    setupEventListeners() {
        // Filtr kontynentu
        const filterContinent = document.getElementById('filterContinent');
        if (filterContinent) {
            filterContinent.addEventListener('change', (e) => {
                this.currentContinent = e.target.value || 'all';
                this.filterCountries();
            });
        }

        // Sortowanie
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortCountries();
        });

        // Widoki
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentView = e.currentTarget.dataset.view;
                this.switchView();
            });
        });

        // Wyszukiwanie
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchCountries(e.target.value);
        });

        // Powrót
        document.getElementById('backButton')?.addEventListener('click', () => {
            this.showCountriesList();
        });

        // URL
        window.addEventListener('popstate', () => this.handleURL());
    }

    filterCountries() {
        if (this.currentContinent === 'all') {
            this.filteredCountries = [...this.countries];
        } else {
            this.filteredCountries = this.countries.filter(c => 
                c.geografia?.kontynent?.toLowerCase().includes(this.currentContinent) ||
                c.geografia?.region?.toLowerCase().includes(this.currentContinent)
            );
        }
        this.sortCountries();
    }

    sortCountries() {
        this.filteredCountries.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return (a.podstawowe_informacje?.nazwa?.oficjalna || '').localeCompare(
                        b.podstawowe_informacje?.nazwa?.oficjalna || ''
                    );
                case 'population':
                    return (b.demografia?.populacja?.liczba || 0) - (a.demografia?.populacja?.liczba || 0);
                case 'area':
                    return (b.geografia?.powierzchnia?.calkowita_km2 || 0) - (a.geografia?.powierzchnia?.calkowita_km2 || 0);
                case 'unesco':
                    return (b.turystyka?.obiekty_unesco || 0) - (a.turystyka?.obiekty_unesco || 0);
                case 'tourists':
                    return (b.turystyka?.liczba_turystow_rocznie || 0) - (a.turystyka?.liczba_turystow_rocznie || 0);
                default:
                    return 0;
            }
        });
        this.renderCountries();
    }

    searchCountries(query) {
        if (!query || query.length < 2) {
            this.filterCountries();
            return;
        }

        const normalized = query.toLowerCase();
        this.filteredCountries = this.countries.filter(country => {
            const name = country.podstawowe_informacje?.nazwa?.oficjalna?.toLowerCase() || '';
            const local = country.podstawowe_informacje?.nazwa?.lokalna?.toLowerCase() || '';
            const popular = country.podstawowe_informacje?.nazwa?.popularna?.toLowerCase() || '';
            
            return name.includes(normalized) || 
                   local.includes(normalized) || 
                   popular.includes(normalized);
        });
        
        this.renderCountries();
    }

    renderCountries() {
        const grid = document.getElementById('countriesGrid');
        
        if (this.filteredCountries.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search" style="font-size: 4rem; color: var(--gray-400); margin-bottom: var(--space-lg);"></i>
                    <h3>Nie znaleziono krajów</h3>
                    <p>Spróbuj zmienić kryteria wyszukiwania</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredCountries.map(country => this.createCountryCard(country)).join('');

        // Event listeners
        grid.querySelectorAll('.country-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.showCountryDetail(this.filteredCountries[index]);
            });
        });
    }

    createCountryCard(country) {
        const info = country.podstawowe_informacje;
        const geo = country.geografia;
        const demo = country.demografia;
        const tourism = country.turystyka;

        return `
            <div class="country-card" data-id="${country.id}">
                <div class="country-flag-large">
                    ${info?.flaga?.emoji || '🏳️'}
                </div>
                <div class="country-content">
                    <h3 class="country-name">${info?.nazwa?.popularna || info?.nazwa?.oficjalna}</h3>
                    <p class="country-official-name">${info?.nazwa?.oficjalna}</p>
                    
                    <div class="country-stats">
                        <div class="stat">
                            <i class="fas fa-map"></i>
                            <span>${this.formatNumber(geo?.powierzchnia?.calkowita_km2)} km²</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-users"></i>
                            <span>${this.formatNumber(demo?.populacja?.liczba)}</span>
                        </div>
                        ${tourism?.obiekty_unesco ? `
                        <div class="stat">
                            <i class="fas fa-landmark"></i>
                            <span>${tourism.obiekty_unesco} UNESCO</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="country-info">
                        <div class="info-item">
                            <span class="label">Stolica:</span>
                            <span>${info?.stolica?.nazwa || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Region:</span>
                            <span>${geo?.region || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Waluta:</span>
                            <span>${country.ekonomia?.waluta?.kod || 'N/A'} ${country.ekonomia?.waluta?.symbol || ''}</span>
                        </div>
                    </div>

                    ${tourism?.najwazniejsze_atrakcje_ids?.length ? `
                    <div class="country-highlights">
                        <i class="fas fa-star"></i>
                        ${tourism.najwazniejsze_atrakcje_ids.length}+ atrakcji
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showCountryDetail(country) {
        this.currentCountry = country;

        // Ukryj listę
        document.getElementById('countriesGrid').style.display = 'none';

        // Ukryj kontrolki listy
        const filtersBar = document.querySelector('.filters-bar');
        const statsBar = document.querySelector('.stats-bar');
        const controlsBar = document.querySelector('.controls-bar');
        if (filtersBar) filtersBar.style.display = 'none';
        if (statsBar) statsBar.style.display = 'none';
        if (controlsBar) controlsBar.style.display = 'none';

        // Pokaż szczegóły
        const detailView = document.getElementById('countryDetail');
        const content = document.getElementById('countryContent');

        content.innerHTML = this.createCountryDetailView(country);
        detailView.style.display = 'block';

        // Update URL
        history.pushState({ countryId: country.id }, '', `?id=${country.id}`);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    createCountryDetailView(c) {
        const info = c.podstawowe_informacje;
        const geo = c.geografia;
        const demo = c.demografia;
        const pol = c.polityka;
        const eco = c.ekonomia;
        const tourism = c.turystyka;
        const culture = c.kultura;

        return `
            <div class="detail-container-3col">
                <!-- Hero -->
                <div class="detail-hero-full">
                    <h1 class="detail-title">${info?.nazwa?.popularna || info?.nazwa?.oficjalna} ${this.getCountryFlag(info?.nazwa?.popularna || info?.nazwa?.oficjalna, 48)}</h1>
                    <p class="detail-subtitle">
                        <i class="fas fa-map-marker-alt"></i> ${geo?.region} | ${geo?.kontynent}
                    </p>
                </div>

                <!-- 3-kolumnowy układ -->
                <div class="detail-3col-layout">
                    <!-- Lewa kolumna - Dane -->
                    <aside class="detail-sidebar-left">
                        ${this.createCountryStatsColumn(c)}
                    </aside>

                    <!-- Środkowa kolumna - Tekst -->
                    <main class="detail-content-center">
                        ${this.createCountryTextContent(c)}
                    </main>

                    <!-- Prawa kolumna - Zdjęcia -->
                    <aside class="detail-sidebar-right">
                        ${this.createCountryPhotosColumn(c)}
                    </aside>
                </div>
            </div>
        `;
    }

    createCountryStatsColumn(c) {
        const info = c.podstawowe_informacje;
        const geo = c.geografia;
        const demo = c.demografia;
        const eco = c.ekonomia;
        const tourism = c.turystyka;
        const pol = c.polityka;

        return `
            <div class="stats-column-compact">
                <h3 class="sidebar-title"><i class="fas fa-chart-bar"></i> Dane</h3>

                <!-- Podstawowe info - 1 kolumna -->
                <div class="stat-group">
                    <div class="stat-item-compact full">
                        <i class="fas fa-flag"></i>
                        <div class="stat-info">
                            <span class="stat-label">Stolica</span>
                            <span class="stat-value">${info?.stolica?.nazwa || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <!-- Demografia - 2 kolumny -->
                <div class="stat-group-title">Demografia</div>
                <div class="stat-group grid-2">
                    <div class="stat-item-compact">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <span class="stat-label">Populacja</span>
                            <span class="stat-value">${this.formatNumber(demo?.populacja?.liczba)}</span>
                        </div>
                    </div>
                    ${demo?.gestosc_na_km2 ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-chart-area"></i>
                        <div class="stat-info">
                            <span class="stat-label">Gęstość</span>
                            <span class="stat-value">${demo.gestosc_na_km2} os/km²</span>
                        </div>
                    </div>
                    ` : ''}
                    ${demo?.mediana_wieku ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-birthday-cake"></i>
                        <div class="stat-info">
                            <span class="stat-label">Mediana wieku</span>
                            <span class="stat-value">${demo.mediana_wieku} lat</span>
                        </div>
                    </div>
                    ` : ''}
                    ${demo?.urbanizacja_procent ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-city"></i>
                        <div class="stat-info">
                            <span class="stat-label">Urbanizacja</span>
                            <span class="stat-value">${demo.urbanizacja_procent}%</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Geografia - 2 kolumny -->
                <div class="stat-group-title">Geografia</div>
                <div class="stat-group grid-2">
                    <div class="stat-item-compact">
                        <i class="fas fa-map"></i>
                        <div class="stat-info">
                            <span class="stat-label">Powierzchnia</span>
                            <span class="stat-value">${this.formatNumber(geo?.powierzchnia?.calkowita_km2)} km²</span>
                        </div>
                    </div>
                    ${geo?.linia_brzegowa_km ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-water"></i>
                        <div class="stat-info">
                            <span class="stat-label">Linia brzeg.</span>
                            <span class="stat-value">${this.formatNumber(geo.linia_brzegowa_km)} km</span>
                        </div>
                    </div>
                    ` : ''}
                    ${geo?.teren?.najwyzszy_punkt?.wysokosc_npm ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-mountain"></i>
                        <div class="stat-info">
                            <span class="stat-label">Najw. punkt</span>
                            <span class="stat-value">${geo.teren.najwyzszy_punkt.wysokosc_npm} m</span>
                        </div>
                    </div>
                    ` : ''}
                    ${geo?.klimat?.typ ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-cloud-sun"></i>
                        <div class="stat-info">
                            <span class="stat-label">Klimat</span>
                            <span class="stat-value">${geo.klimat.typ}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Ekonomia - 2 kolumny -->
                ${eco ? `
                <div class="stat-group-title">Ekonomia</div>
                <div class="stat-group grid-2">
                    ${eco?.PKB?.nominal_USD ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-dollar-sign"></i>
                        <div class="stat-info">
                            <span class="stat-label">PKB</span>
                            <span class="stat-value">${this.formatNumber(eco.PKB.nominal_USD)}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${eco?.PKB?.na_osobe_USD ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-hand-holding-usd"></i>
                        <div class="stat-info">
                            <span class="stat-label">PKB/osoba</span>
                            <span class="stat-value">${this.formatNumber(eco.PKB.na_osobe_USD)}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${eco?.waluta ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="stat-info">
                            <span class="stat-label">Waluta</span>
                            <span class="stat-value">${eco.waluta.kod} ${eco.waluta.symbol}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Turystyka - highlight -->
                ${(tourism?.obiekty_unesco || tourism?.liczba_turystow_rocznie) ? `
                <div class="stat-group-title">Turystyka</div>
                <div class="stat-group highlight-group">
                    ${tourism?.obiekty_unesco ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-landmark"></i>
                        <div class="stat-info">
                            <span class="stat-label">UNESCO</span>
                            <span class="stat-value">${tourism.obiekty_unesco}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tourism?.liczba_turystow_rocznie ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-plane"></i>
                        <div class="stat-info">
                            <span class="stat-label">Turyści/rok</span>
                            <span class="stat-value">${this.formatNumber(tourism.liczba_turystow_rocznie)}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Polityka i kultura - 2 kolumny -->
                <div class="stat-group-title">Polityka i kultura</div>
                <div class="stat-group grid-2">
                    ${pol?.system ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-university"></i>
                        <div class="stat-info">
                            <span class="stat-label">System</span>
                            <span class="stat-value">${pol.system}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${demo?.jezyki?.[0] ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-language"></i>
                        <div class="stat-info">
                            <span class="stat-label">Język</span>
                            <span class="stat-value">${demo.jezyki[0].nazwa}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${demo?.religie?.[0] ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-church"></i>
                        <div class="stat-info">
                            <span class="stat-label">Religia</span>
                            <span class="stat-value">${demo.religie[0].nazwa}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${pol?.niepodleglosc?.data ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-calendar-day"></i>
                        <div class="stat-info">
                            <span class="stat-label">Niepodl.</span>
                            <span class="stat-value">${pol.niepodleglosc.data}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createCountryTextContent(c) {
        const info = c.podstawowe_informacje;
        const geo = c.geografia;
        const demo = c.demografia;
        const pol = c.polityka;
        const eco = c.ekonomia;
        const tourism = c.turystyka;
        const culture = c.kultura;

        return `
            <div class="text-content">
                ${this.createGeographySection(geo)}
                ${this.createDemographySection(demo)}
                ${this.createPoliticsSection(pol)}
                ${this.createEconomySection(eco)}
                ${this.createTourismSection(tourism)}
                ${this.createCultureSection(culture)}
                ${c.praktyczne_informacje ? this.createPracticalInfoSection(c.praktyczne_informacje) : ''}

                ${geo?.wspolrzedne ? `
                <section class="content-section">
                    <h2><i class="fas fa-map-marker-alt"></i> Lokalizacja</h2>
                    <div class="map-container">
                        <iframe
                            width="100%"
                            height="400"
                            frameborder="0"
                            scrolling="no"
                            marginheight="0"
                            marginwidth="0"
                            src="https://www.openstreetmap.org/export/embed.html?bbox=${geo.wspolrzedne.geograficzne_centrum.lon-5},${geo.wspolrzedne.geograficzne_centrum.lat-5},${geo.wspolrzedne.geograficzne_centrum.lon+5},${geo.wspolrzedne.geograficzne_centrum.lat+5}&layer=mapnik"
                            style="border-radius: var(--radius-lg);">
                        </iframe>
                    </div>
                </section>
                ` : ''}

                ${c.powiazania ? this.createRelationsSection(c.powiazania) : ''}
            </div>
        `;
    }

    createGeographySection(geo) {
        if (!geo) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-mountain"></i> Geografia</h2>
                <div class="info-grid">
                    ${geo.powierzchnia ? `
                    <div class="info-item">
                        <span class="label">Powierzchnia całkowita:</span>
                        <span class="value">${this.formatNumber(geo.powierzchnia.calkowita_km2)} km²</span>
                    </div>
                    ` : ''}
                    ${geo.linia_brzegowa_km ? `
                    <div class="info-item">
                        <span class="label">Linia brzegowa:</span>
                        <span class="value">${this.formatNumber(geo.linia_brzegowa_km)} km</span>
                    </div>
                    ` : ''}
                    ${geo.teren?.najwyzszy_punkt ? `
                    <div class="info-item">
                        <span class="label">Najwyższy punkt:</span>
                        <span class="value">${geo.teren.najwyzszy_punkt.nazwa} (${geo.teren.najwyzszy_punkt.wysokosc_npm}m n.p.m.)</span>
                    </div>
                    ` : ''}
                    ${geo.klimat?.typ ? `
                    <div class="info-item">
                        <span class="label">Klimat:</span>
                        <span class="value">${geo.klimat.typ}</span>
                    </div>
                    ` : ''}
                </div>
                ${geo.granice?.kraje_sasiadujace ? `
                <div class="neighbors">
                    <h4>Kraje sąsiadujące:</h4>
                    <div class="neighbors-list">
                        ${geo.granice.kraje_sasiadujace.map(n => `
                            <a href="?id=${n.id}" class="neighbor-link">
                                ${n.kraj} (${n.dlugosc_granicy_km} km)
                            </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createDemographySection(demo) {
        if (!demo) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-users"></i> Demografia</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">Populacja:</span>
                        <span class="value">${this.formatNumber(demo.populacja?.liczba)} (${demo.populacja?.rok})</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Gęstość:</span>
                        <span class="value">${demo.gestosc_na_km2} os/km²</span>
                    </div>
                    ${demo.mediana_wieku ? `
                    <div class="info-item">
                        <span class="label">Mediana wieku:</span>
                        <span class="value">${demo.mediana_wieku} lat</span>
                    </div>
                    ` : ''}
                    ${demo.urbanizacja_procent ? `
                    <div class="info-item">
                        <span class="label">Urbanizacja:</span>
                        <span class="value">${demo.urbanizacja_procent}%</span>
                    </div>
                    ` : ''}
                </div>
                ${demo.najwieksze_miasta ? `
                <div class="cities-list">
                    <h4>Największe miasta:</h4>
                    <div class="cities-grid">
                        ${demo.najwieksze_miasta.slice(0, 5).map(city => `
                            <a href="miasta.html?id=${city.id}" class="city-chip">
                                <i class="fas fa-city"></i>
                                ${city.nazwa} (${this.formatNumber(city.populacja)})
                            </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                ${demo.jezyki ? `
                <div class="languages">
                    <h4>Języki:</h4>
                    ${demo.jezyki.map(lang => `
                        <div class="language-item">
                            <span class="lang-name">${lang.nazwa}</span>
                            <span class="lang-percent">${lang.procent}%</span>
                            ${lang.oficjalny ? '<span class="official-badge">oficjalny</span>' : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }

    createPoliticsSection(pol) {
        if (!pol) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-landmark"></i> Polityka</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">System:</span>
                        <span class="value">${pol.system}</span>
                    </div>
                    ${pol.prezydent ? `
                    <div class="info-item">
                        <span class="label">Prezydent:</span>
                        <span class="value">${pol.prezydent}</span>
                    </div>
                    ` : ''}
                    ${pol.premier ? `
                    <div class="info-item">
                        <span class="label">Premier:</span>
                        <span class="value">${pol.premier}</span>
                    </div>
                    ` : ''}
                    ${pol.niepodleglosc ? `
                    <div class="info-item">
                        <span class="label">Niepodległość:</span>
                        <span class="value">${pol.niepodleglosc.data} - ${pol.niepodleglosc.opis}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createEconomySection(eco) {
        if (!eco) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-chart-line"></i> Ekonomia</h2>
                <div class="info-grid">
                    ${eco.PKB ? `
                    <div class="info-item">
                        <span class="label">PKB:</span>
                        <span class="value">${this.formatNumber(eco.PKB.nominal_USD)} USD</span>
                    </div>
                    <div class="info-item">
                        <span class="label">PKB per capita:</span>
                        <span class="value">${this.formatNumber(eco.PKB.na_osobe_USD)} USD</span>
                    </div>
                    ` : ''}
                    ${eco.waluta ? `
                    <div class="info-item">
                        <span class="label">Waluta:</span>
                        <span class="value">${eco.waluta.nazwa} (${eco.waluta.kod}) ${eco.waluta.symbol}</span>
                    </div>
                    ` : ''}
                </div>
                ${eco.glowne_bransze ? `
                <div class="industries">
                    <h4>Główne branże:</h4>
                    <div class="tags-cloud">
                        ${eco.glowne_bransze.map(b => `<span class="tag">${b}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createTourismSection(tourism) {
        if (!tourism) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-plane"></i> Turystyka</h2>
                <div class="info-grid">
                    ${tourism.liczba_turystow_rocznie ? `
                    <div class="info-item highlight">
                        <span class="label">Turyści rocznie:</span>
                        <span class="value">${this.formatNumber(tourism.liczba_turystow_rocznie)}</span>
                    </div>
                    ` : ''}
                    ${tourism.obiekty_unesco ? `
                    <div class="info-item highlight">
                        <span class="label">Obiekty UNESCO:</span>
                        <span class="value">${tourism.obiekty_unesco}</span>
                    </div>
                    ` : ''}
                </div>
                ${tourism.najlepszy_czas_wizyty ? `
                <div class="best-time">
                    <h4>Najlepszy czas wizyty:</h4>
                    <p><strong>Okresy:</strong> ${tourism.najlepszy_czas_wizyty.okresy?.join(', ')}</p>
                    <p>${tourism.najlepszy_czas_wizyty.opis}</p>
                </div>
                ` : ''}
                ${tourism.najwazniejsze_atrakcje_ids?.length ? `
                <div class="attractions-preview">
                    <h4>Najważniejsze atrakcje:</h4>
                    <a href="atrakcje.html?country=${this.currentCountry.id}" class="btn-explore">
                        <i class="fas fa-compass"></i>
Zobacz ${tourism.najwazniejsze_atrakcje_ids.length}+ atrakcji
                    </a>
                </div>
                ` : ''}
            </div>
        `;
    }

    createCultureSection(culture) {
        if (!culture) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-palette"></i> Kultura</h2>
                
                ${culture.kuchnia ? `
                <div class="subsection">
                    <h3><i class="fas fa-utensils"></i> Kuchnia</h3>
                    <p>${culture.kuchnia.opis}</p>
                    ${culture.kuchnia.znane_dania ? `
                    <div class="dishes-grid">
                        ${culture.kuchnia.znane_dania.map(dish => `
                            <div class="dish-chip">
                                <i class="fas fa-drumstick-bite"></i>
                                ${dish}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ${culture.kuchnia.regionalne_specjalnosci ? `
                    <div class="regional-cuisine">
                        <h4>Specjalności regionalne:</h4>
                        ${Object.entries(culture.kuchnia.regionalne_specjalnosci).map(([region, dishes]) => `
                            <div class="region-item">
                                <strong>${region}:</strong> ${dishes}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${culture.dziedzictwo ? `
                <div class="subsection">
                    <h3><i class="fas fa-landmark"></i> Dziedzictwo kulturowe</h3>
                    ${culture.dziedzictwo.znani_artysci ? `
                    <div class="heritage-category">
                        <h4>Znani artyści:</h4>
                        <div class="tags-cloud">
                            ${culture.dziedzictwo.znani_artysci.map(a => `<span class="tag">${a}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    ${culture.dziedzictwo.literatura ? `
                    <div class="heritage-category">
                        <h4>Literatura:</h4>
                        <div class="tags-cloud">
                            ${culture.dziedzictwo.literatura.map(l => `<span class="tag">${l}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${culture.swięta_narodowe ? `
                <div class="subsection">
                    <h3><i class="fas fa-calendar-alt"></i> Święta narodowe</h3>
                    <div class="holidays-list">
                        ${culture.swięta_narodowe.map(holiday => `
                            <div class="holiday-item">
                                <span class="holiday-date">${holiday.data}</span>
                                <span class="holiday-name">${holiday.nazwa}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createPracticalInfoSection(info) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-info-circle"></i> Informacje praktyczne</h2>
                
                <div class="practical-grid">
                    ${info.bezpieczenstwo ? `
                    <div class="practical-card">
                        <h4><i class="fas fa-shield-alt"></i> Bezpieczeństwo</h4>
                        <div class="rating">
                            ${'★'.repeat(info.bezpieczenstwo.ogolna_ocena)}${'☆'.repeat(5-info.bezpieczenstwo.ogolna_ocena)}
                        </div>
                        <p>${info.bezpieczenstwo.uwagi}</p>
                    </div>
                    ` : ''}

                    ${info.sluzba_zdrowia ? `
                    <div class="practical-card">
                        <h4><i class="fas fa-hospital"></i> Służba zdrowia</h4>
                        <p><strong>Numer alarmowy:</strong> ${info.sluzba_zdrowia.numer_alarmowy}</p>
                        <p>${info.sluzba_zdrowia.ubezpieczenie}</p>
                    </div>
                    ` : ''}

                    ${info.transport ? `
                    <div class="practical-card">
                        <h4><i class="fas fa-bus"></i> Transport</h4>
                        <p>${info.transport.komunikacja_publiczna}</p>
                        ${info.transport.koleje ? `<p><strong>Koleje:</strong> ${info.transport.koleje}</p>` : ''}
                    </div>
                    ` : ''}

                    ${info.internet ? `
                    <div class="practical-card">
                        <h4><i class="fas fa-wifi"></i> Internet</h4>
                        <p>${info.internet.wifi_publiczne}</p>
                    </div>
                    ` : ''}

                    ${info.napiwki ? `
                    <div class="practical-card">
                        <h4><i class="fas fa-hand-holding-usd"></i> Napiwki</h4>
                        <p><strong>Zwyczaj:</strong> ${info.napiwki.zwyczaj}</p>
                        <p>${info.napiwki.zalecenia}</p>
                    </div>
                    ` : ''}
                </div>

                ${info.zakazywanie_hoteli ? `
                <div class="accommodation-prices">
                    <h4>Średnie ceny noclegów:</h4>
                    <div class="price-grid">
                        ${Object.entries(info.zakazywanie_hoteli.ceny_srednie_noc).map(([type, price]) => `
                            <div class="price-item">
                                <span class="price-label">${this.formatKey(type)}:</span>
                                <span class="price-value">${price}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createRelationsSection(relations) {
        // Pobierz nazwy miast z indeksu
        const cities = relations.miasta_ids?.map(id => {
            const city = this.citiesIndex?.find(c => c.id === id);
            return city ? { id, name: city.name } : null;
        }).filter(Boolean) || [];

        // Pobierz nazwy atrakcji z indeksu
        const attractions = relations.atrakcje_ids?.map(id => {
            const attr = this.attractionsIndex?.find(a => a.id === id);
            return attr ? { id, name: attr.name } : null;
        }).filter(Boolean) || [];

        // Pobierz nazwy krajów sąsiadujących
        const neighbors = relations.sasiedzi_ids?.map(id => {
            const country = this.countries.find(c => c.id === id);
            return country ? {
                id,
                name: country.podstawowe_informacje?.nazwa?.popularna || country.podstawowe_informacje?.nazwa?.oficjalna
            } : null;
        }).filter(Boolean) || [];

        return `
            <section class="content-section">
                <h2><i class="fas fa-link"></i> Powiązane</h2>

                ${cities.length > 0 ? `
                <div class="relations-subsection">
                    <h3><i class="fas fa-city"></i> Miasta (${cities.length})</h3>
                    <div class="relations-chips">
                        ${cities.map(city => `
                            <a href="miasta.html?id=${city.id}" class="relation-chip city-chip">
                                ${city.name}
                            </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${attractions.length > 0 ? `
                <div class="relations-subsection">
                    <h3><i class="fas fa-landmark"></i> Atrakcje (${attractions.length})</h3>
                    <div class="relations-chips">
                        ${attractions.map(attr => `
                            <a href="atrakcje.html?building=${attr.id}" class="relation-chip attraction-chip">
                                ${attr.name}
                            </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${neighbors.length > 0 ? `
                <div class="relations-subsection">
                    <h3><i class="fas fa-globe"></i> Kraje sąsiadujące (${neighbors.length})</h3>
                    <div class="relations-chips">
                        ${neighbors.map(neighbor => `
                            <a href="?id=${neighbor.id}" class="relation-chip neighbor-chip">
                                ${neighbor.name} ${this.getCountryFlag(neighbor.name)}
                            </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </section>
        `;
    }

    createCountryPhotosColumn(c) {
        const photos = this.getPhotosForCountry(c.id);
        
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

    switchView() {
        const grid = document.getElementById('countriesGrid');

        if (this.currentView === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    showCountriesList() {
        document.getElementById('countriesGrid').style.display = 'grid';
        document.getElementById('countryDetail').style.display = 'none';

        // Pokaż kontrolki listy
        const filtersBar = document.querySelector('.filters-bar');
        const statsBar = document.querySelector('.stats-bar');
        const controlsBar = document.querySelector('.controls-bar');
        if (filtersBar) filtersBar.style.display = 'flex';
        if (statsBar) statsBar.style.display = 'flex';
        if (controlsBar) controlsBar.style.display = 'flex';

        history.pushState({}, '', 'kraje.html');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleURL() {
        const params = new URLSearchParams(window.location.search);
        const countryId = params.get('id');
        const continent = params.get('continent');

        if (countryId) {
            const country = this.countries.find(c => c.id === countryId);
            if (country) {
                this.showCountryDetail(country);
            }
        } else {
            // Jeśli jest parametr kontynentu, ustaw filtr
            if (continent && continent !== 'all') {
                this.currentContinent = continent;
                const filterContinent = document.getElementById('filterContinent');
                if (filterContinent) {
                    filterContinent.value = continent;
                }
                this.filterCountries();
            }
            this.showCountriesList();
        }
    }

    updateStats() {
        document.getElementById('totalCountries').textContent = this.countries.length;
        
        const totalPopulation = this.countries.reduce((sum, c) => 
            sum + (c.demografia?.populacja?.liczba || 0), 0);
        document.getElementById('totalPopulation').textContent = this.formatNumber(totalPopulation);
        
        const totalUNESCO = this.countries.reduce((sum, c) => 
            sum + (c.turystyka?.obiekty_unesco || 0), 0);
        document.getElementById('totalUNESCO').textContent = totalUNESCO;
    }

    getCountryFlag(countryName) {
        return CountryFlags.getFlag(countryName);
    }

    formatNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + ' mld';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + ' mln';
        if (num >= 1000) return (num / 1000).toFixed(1) + ' tys';
        return num.toString();
    }

    formatKey(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showError(message) {
        alert(message); // Można zastąpić lepszym UI
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    new CountriesViewer();
});
