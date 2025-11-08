class CitiesViewer {
    constructor() {
        this.cities = [];
        this.filteredCities = [];
        this.currentCity = null;
        this.filters = {
            country: '',
            population: '',
            unesco: ''
        };
        this.currentSort = 'name';
        this.currentView = 'grid';
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadPhotos();
        await this.loadCities();
        this.setupEventListeners();
        this.populateFilters();
        this.updateStats();
        this.renderCities();
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

    async loadCities() {
        try {
            const indexResponse = await fetch('data/metadata/cities_index.json');
            const index = await indexResponse.json();
            
            const promises = index.items.map(item => 
                fetch(`data/miasta/${item.id.toLowerCase()}.json`)
                    .then(res => res.ok ? res.json() : null)
                    .catch(() => null)
            );
            
            const results = await Promise.all(promises);
            this.cities = results.filter(c => c !== null);
            this.filteredCities = [...this.cities];
            
        } catch (error) {
            console.error('Błąd ładowania miast:', error);
        }
    }

    getPhotosForCity(cityId) {
        if (!this.photos) return [];
        return this.photos.filter(photo => 
            photo.powiazania?.miasta_ids?.includes(cityId)
        );
    }

    setupEventListeners() {
        // Filtry
        document.getElementById('filterCountry').addEventListener('change', (e) => {
            this.filters.country = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filterPopulation').addEventListener('change', (e) => {
            this.filters.population = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filterUNESCO').addEventListener('change', (e) => {
            this.filters.unesco = e.target.value;
            this.applyFilters();
        });

        // Sortowanie
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortCities();
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
            this.searchCities(e.target.value);
        });

        // Powrót
        document.getElementById('backButton')?.addEventListener('click', () => {
            this.showCitiesList();
        });

        // URL
        window.addEventListener('popstate', () => this.handleURL());
    }

    populateFilters() {
        const countries = [...new Set(this.cities.map(c => c.lokalizacja?.kraj_id))].sort();
        const countrySelect = document.getElementById('filterCountry');
        
        countries.forEach(countryId => {
            const city = this.cities.find(c => c.lokalizacja?.kraj_id === countryId);
            if (city) {
                const option = document.createElement('option');
                option.value = countryId;
                option.textContent = this.getCountryName(countryId);
                countrySelect.appendChild(option);
            }
        });
    }

    getCountryName(countryId) {
        if (!countryId) return 'Nieznany';
        
        // Mapowanie ID krajów na nazwy
        const countryNames = {
            'wlochy': 'Włochy',
            'francja': 'Francja',
            'hiszpania': 'Hiszpania',
            'niemcy': 'Niemcy',
            'polska': 'Polska'
        };
        
        return countryNames[countryId.toLowerCase()] || countryId;
    }

    applyFilters() {
        this.filteredCities = this.cities.filter(city => {
            // Filtr kraju
            if (this.filters.country && city.lokalizacja?.kraj_id !== this.filters.country) {
                return false;
            }

            // Filtr populacji
            if (this.filters.population) {
                const pop = city.demografia?.populacja || 0;
                switch (this.filters.population) {
                    case 'mega':
                        if (pop < 10000000) return false;
                        break;
                    case 'large':
                        if (pop < 1000000 || pop >= 10000000) return false;
                        break;
                    case 'medium':
                        if (pop < 500000 || pop >= 1000000) return false;
                        break;
                    case 'small':
                        if (pop >= 500000) return false;
                        break;
                }
            }

            // Filtr UNESCO
            if (this.filters.unesco) {
                const hasUNESCO = city.turystyka?.obiekty_unesco > 0;
                if (this.filters.unesco === 'yes' && !hasUNESCO) return false;
                if (this.filters.unesco === 'no' && hasUNESCO) return false;
            }

            return true;
        });

        this.sortCities();
    }

    sortCities() {
        this.filteredCities.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return (a.podstawowe_informacje?.nazwa?.popularna || '').localeCompare(
                        b.podstawowe_informacje?.nazwa?.popularna || ''
                    );
                case 'population':
                    return (b.demografia?.populacja || 0) - (a.demografia?.populacja || 0);
                case 'tourists':
                    return (b.turystyka?.liczba_turystow_rocznie || 0) - (a.turystyka?.liczba_turystow_rocznie || 0);
                case 'unesco':
                    return (b.turystyka?.obiekty_unesco || 0) - (a.turystyka?.obiekty_unesco || 0);
                default:
                    return 0;
            }
        });
        this.renderCities();
    }

    searchCities(query) {
        if (!query || query.length < 2) {
            this.applyFilters();
            return;
        }

        const normalized = query.toLowerCase();
        this.filteredCities = this.cities.filter(city => {
            const name = city.podstawowe_informacje?.nazwa?.popularna?.toLowerCase() || '';
            const official = city.podstawowe_informacje?.nazwa?.oficjalna?.toLowerCase() || '';
            
            return name.includes(normalized) || official.includes(normalized);
        });
        
        this.renderCities();
    }

    renderCities() {
        const grid = document.getElementById('citiesGrid');
        
        if (this.filteredCities.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-city" style="font-size: 4rem; color: var(--gray-400);"></i>
                    <h3>Nie znaleziono miast</h3>
                    <p>Spróbuj zmienić kryteria wyszukiwania</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredCities.map(city => this.createCityCard(city)).join('');

        // Event listeners
        grid.querySelectorAll('.city-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.showCityDetail(this.filteredCities[index]);
            });
        });
    }

    createCityCard(city) {
        const info = city.podstawowe_informacje;
        const demo = city.demografia;
        const tourism = city.turystyka;

        return `
            <div class="city-card" data-id="${city.id}">
                <div class="city-image">
                    ${city.multimedia?.galeria_ids?.[0] ? 
                        `<img src="placeholder.jpg" alt="${info?.nazwa?.popularna}" loading="lazy">` :
                        `<div class="no-image"><i class="fas fa-city"></i></div>`
                    }
                    ${tourism?.obiekty_unesco ? `
                    <div class="unesco-badge">
                        <i class="fas fa-landmark"></i> UNESCO
                    </div>
                    ` : ''}
                </div>
                <div class="city-content">
                    <h3 class="city-name">${info?.nazwa?.popularna || info?.nazwa?.oficjalna}</h3>
                    <p class="city-country">
                        <i class="fas fa-map-marker-alt"></i>
                        ${this.getCountryName(city.lokalizacja?.kraj_id)}
                    </p>
                    
                    <div class="city-stats">
                        <div class="stat">
                            <i class="fas fa-users"></i>
                            <span>${this.formatNumber(demo?.populacja)}</span>
                        </div>
                        ${tourism?.liczba_turystow_rocznie ? `
                        <div class="stat">
                            <i class="fas fa-plane"></i>
                            <span>${this.formatNumber(tourism.liczba_turystow_rocznie)}</span>
                        </div>
                        ` : ''}
                        ${tourism?.obiekty_unesco ? `
                        <div class="stat">
                            <i class="fas fa-landmark"></i>
                            <span>${tourism.obiekty_unesco} UNESCO</span>
                        </div>
                        ` : ''}
                    </div>

                    ${tourism?.najwazniejsze_atrakcje_ids?.length ? `
                    <div class="city-highlights">
                        <i class="fas fa-star"></i>
                        ${tourism.najwazniejsze_atrakcje_ids.length}+ atrakcji
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showCityDetail(city) {
        this.currentCity = city;

        document.getElementById('citiesGrid').style.display = 'none';

        // Ukryj kontrolki listy
        const filtersBar = document.querySelector('.filters-bar');
        const statsBar = document.querySelector('.stats-bar');
        const controlsBar = document.querySelector('.controls-bar');
        if (filtersBar) filtersBar.style.display = 'none';
        if (statsBar) statsBar.style.display = 'none';
        if (controlsBar) controlsBar.style.display = 'none';

        const detailView = document.getElementById('cityDetail');
        const content = document.getElementById('cityContent');

        content.innerHTML = this.createCityDetailView(city);
        detailView.style.display = 'block';

        history.pushState({ cityId: city.id }, '', `?id=${city.id}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    createCityDetailView(city) {
        const info = city.podstawowe_informacje;
        const geo = city.geografia;
        const demo = city.demografia;
        const tourism = city.turystyka;

        return `
            <div class="detail-container-3col">
                <!-- Hero -->
                <div class="detail-hero-full">
                    <h1 class="detail-title">${info?.nazwa?.popularna || info?.nazwa?.oficjalna}</h1>
                    <p class="detail-subtitle">
                        <i class="fas fa-map-marker-alt"></i> ${this.getCountryName(city.lokalizacja?.kraj_id)}
                        ${info?.status ? ` | ${info.status}` : ''}
                    </p>
                </div>

                <!-- 3-kolumnowy układ -->
                <div class="detail-3col-layout">
                    <!-- Lewa kolumna - Dane -->
                    <aside class="detail-sidebar-left">
                        ${this.createCityStatsColumn(city)}
                    </aside>

                    <!-- Środkowa kolumna - Tekst -->
                    <main class="detail-content-center">
                        ${this.createCityTextContent(city)}
                    </main>

                    <!-- Prawa kolumna - Zdjęcia -->
                    <aside class="detail-sidebar-right">
                        ${this.createCityPhotosColumn(city)}
                    </aside>
                </div>
            </div>
        `;
    }

    createCityStatsColumn(city) {
        const info = city.podstawowe_informacje;
        const demo = city.demografia;
        const geo = city.geografia;
        const tourism = city.turystyka;
        const historia = city.historia;
        const transport = city.transport;
        const kultura = city.kultura;

        return `
            <div class="stats-column-compact">
                <h3 class="sidebar-title"><i class="fas fa-chart-bar"></i> Dane</h3>

                <!-- Podstawowe info - 1 kolumna -->
                ${info?.status ? `
                <div class="stat-group">
                    <div class="stat-item-compact full">
                        <i class="fas fa-crown"></i>
                        <div class="stat-info">
                            <span class="stat-label">Status</span>
                            <span class="stat-value">${info.status}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Demografia - 2 kolumny -->
                <div class="stat-group-title">Demografia</div>
                <div class="stat-group grid-2">
                    <div class="stat-item-compact">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <span class="stat-label">Populacja</span>
                            <span class="stat-value">${this.formatNumber(demo?.populacja)}</span>
                        </div>
                    </div>
                    ${demo?.aglomeracja ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-city"></i>
                        <div class="stat-info">
                            <span class="stat-label">Aglomeracja</span>
                            <span class="stat-value">${this.formatNumber(demo.aglomeracja)}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${demo?.gestosc_na_km2 ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-chart-area"></i>
                        <div class="stat-info">
                            <span class="stat-label">Gęstość</span>
                            <span class="stat-value">${demo.gestosc_na_km2} os/km²</span>
                        </div>
                    </div>
                    ` : ''}
                    ${demo?.jezyk_urzedowy ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-language"></i>
                        <div class="stat-info">
                            <span class="stat-label">Język</span>
                            <span class="stat-value">${demo.jezyk_urzedowy}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Geografia - 2 kolumny -->
                <div class="stat-group-title">Geografia</div>
                <div class="stat-group grid-2">
                    ${geo?.powierzchnia_km2 ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-map"></i>
                        <div class="stat-info">
                            <span class="stat-label">Powierzchnia</span>
                            <span class="stat-value">${geo.powierzchnia_km2} km²</span>
                        </div>
                    </div>
                    ` : ''}
                    ${geo?.wysokosc_npm ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-mountain"></i>
                        <div class="stat-info">
                            <span class="stat-label">Wysokość</span>
                            <span class="stat-value">${geo.wysokosc_npm} m</span>
                        </div>
                    </div>
                    ` : ''}
                    ${geo?.strefa_czasowa ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-clock"></i>
                        <div class="stat-info">
                            <span class="stat-label">Strefa</span>
                            <span class="stat-value">${geo.strefa_czasowa}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${geo?.klimat ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-cloud-sun"></i>
                        <div class="stat-info">
                            <span class="stat-label">Klimat</span>
                            <span class="stat-value">${geo.klimat}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Historia -->
                ${historia?.zalozone ? `
                <div class="stat-group-title">Historia</div>
                <div class="stat-group">
                    <div class="stat-item-compact full">
                        <i class="fas fa-history"></i>
                        <div class="stat-info">
                            <span class="stat-label">Założone</span>
                            <span class="stat-value">${historia.zalozone}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Turystyka - highlight -->
                ${(tourism?.obiekty_unesco || tourism?.liczba_turystow_rocznie || tourism?.najwazniejsze_atrakcje_ids?.length) ? `
                <div class="stat-group-title">Turystyka</div>
                <div class="stat-group highlight-group">
                    ${tourism?.liczba_turystow_rocznie ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-plane"></i>
                        <div class="stat-info">
                            <span class="stat-label">Turyści/rok</span>
                            <span class="stat-value">${this.formatNumber(tourism.liczba_turystow_rocznie)}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tourism?.obiekty_unesco ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-landmark"></i>
                        <div class="stat-info">
                            <span class="stat-label">UNESCO</span>
                            <span class="stat-value">${tourism.obiekty_unesco}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tourism?.najwazniejsze_atrakcje_ids?.length ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-star"></i>
                        <div class="stat-info">
                            <span class="stat-label">Top atrakcji</span>
                            <span class="stat-value">${tourism.najwazniejsze_atrakcje_ids.length}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${tourism?.sredni_czas_pobytu_dni ? `
                    <div class="stat-item-compact highlight">
                        <i class="fas fa-calendar"></i>
                        <div class="stat-info">
                            <span class="stat-label">Śr. pobyt</span>
                            <span class="stat-value">${tourism.sredni_czas_pobytu_dni} dni</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Transport - 2 kolumny -->
                ${(transport?.lotniska?.length || transport?.metro?.liczba_linii) ? `
                <div class="stat-group-title">Transport</div>
                <div class="stat-group grid-2">
                    ${transport?.lotniska?.[0] ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-plane-departure"></i>
                        <div class="stat-info">
                            <span class="stat-label">Lotnisko</span>
                            <span class="stat-value">${transport.lotniska[0].kod_IATA}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${transport?.metro?.liczba_linii ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-subway"></i>
                        <div class="stat-info">
                            <span class="stat-label">Linie metra</span>
                            <span class="stat-value">${transport.metro.liczba_linii}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${transport?.stacje_kolejowe ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-train"></i>
                        <div class="stat-info">
                            <span class="stat-label">Stacje kol.</span>
                            <span class="stat-value">${transport.stacje_kolejowe}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Kultura - 2 kolumny -->
                ${(kultura?.muzea?.liczba || kultura?.uniwersytety?.length || kultura?.teatry?.length) ? `
                <div class="stat-group-title">Kultura</div>
                <div class="stat-group grid-2">
                    ${kultura?.muzea?.liczba ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-building-columns"></i>
                        <div class="stat-info">
                            <span class="stat-label">Muzea</span>
                            <span class="stat-value">${kultura.muzea.liczba}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${kultura?.uniwersytety?.length ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-graduation-cap"></i>
                        <div class="stat-info">
                            <span class="stat-label">Uniwers.</span>
                            <span class="stat-value">${kultura.uniwersytety.length}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${kultura?.teatry?.length ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-masks-theater"></i>
                        <div class="stat-info">
                            <span class="stat-label">Teatry</span>
                            <span class="stat-value">${kultura.teatry.length}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${kultura?.galerie_sztuki ? `
                    <div class="stat-item-compact">
                        <i class="fas fa-palette"></i>
                        <div class="stat-info">
                            <span class="stat-label">Galerie</span>
                            <span class="stat-value">${kultura.galerie_sztuki}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }

    createCityTextContent(city) {
        const demo = city.demografia;
        const geo = city.geografia;
        const tourism = city.turystyka;

        return `
            <div class="text-content">
                <!-- Sekcje -->
                ${city.historia ? this.createHistorySection(city.historia) : ''}
                ${tourism ? this.createTourismSection(tourism) : ''}
${city.transport ? this.createTransportSection(city.transport) : ''}
                ${city.gastronomia ? this.createGastronomySection(city.gastronomia) : ''}
                ${city.zakwaterowanie ? this.createAccommodationSection(city.zakwaterowanie) : ''}
                ${city.kultura ? this.createCultureSection(city.kultura) : ''}
                ${city.praktyczne_informacje ? this.createPracticalInfoSection(city.praktyczne_informacje) : ''}

                <!-- Mapa -->
                ${geo?.wspolrzedne ? `
                <div class="section">
                    <h2 class="section-title"><i class="fas fa-map"></i> Lokalizacja</h2>
                    <div class="map-container">
                        <iframe 
                            width="100%" 
                            height="400" 
                            frameborder="0" 
                            scrolling="no" 
                            marginheight="0" 
                            marginwidth="0" 
                            src="https://www.openstreetmap.org/export/embed.html?bbox=${geo.wspolrzedne.lon-0.1},${geo.wspolrzedne.lat-0.1},${geo.wspolrzedne.lon+0.1},${geo.wspolrzedne.lat+0.1}&layer=mapnik&marker=${geo.wspolrzedne.lat},${geo.wspolrzedne.lon}"
                            style="border-radius: var(--radius-lg);">
                        </iframe>
                    </div>
                </div>
                ` : ''}

                <!-- Powiązane atrakcje -->
                ${city.atrakcje_glowne?.top_10_ids?.length ? `
                <div class="section">
                    <h2 class="section-title"><i class="fas fa-star"></i> Top Atrakcje</h2>
                    <a href="atrakcje.html?city=${city.id}" class="btn-explore-full">
                        <i class="fas fa-compass"></i>
                        Zobacz wszystkie atrakcje (${city.atrakcje_glowne.top_10_ids.length})
                    </a>
                </div>
                ` : ''}
            </div>
        `;
    }

    createHistorySection(history) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-history"></i> Historia</h2>
                ${history.zalozone ? `
                <div class="info-item">
                    <span class="label">Założone:</span>
                    <span class="value">${history.zalozone}</span>
                </div>
                ` : ''}
                ${history.opis_krotki ? `
                <p class="description">${history.opis_krotki}</p>
                ` : ''}
                ${history.wazne_wydarzenia?.length ? `
                <div class="timeline">
                    <h4>Ważne wydarzenia:</h4>
                    ${history.wazne_wydarzenia.slice(0, 5).map(event => `
                        <div class="timeline-item">
                            <span class="timeline-year">${event.rok}</span>
                            <span class="timeline-event">${event.wydarzenie}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }

    createTourismSection(tourism) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-suitcase"></i> Turystyka</h2>
                
                ${tourism.najlepszy_czas_wizyty ? `
                <div class="subsection">
                    <h3>Najlepszy czas wizyty</h3>
                    <p><strong>Miesiące:</strong> ${tourism.najlepszy_czas_wizyty.najlepsze_miesiace?.join(', ')}</p>
                    ${tourism.najlepszy_czas_wizyty.unikaj ? `
                    <p><strong>Unikaj:</strong> ${tourism.najlepszy_czas_wizyty.unikaj?.join(', ')}</p>
                    ` : ''}
                </div>
                ` : ''}

                ${tourism.sredni_czas_pobytu_dni ? `
                <div class="info-item">
                    <span class="label">Średni czas pobytu:</span>
                    <span class="value">${tourism.sredni_czas_pobytu_dni} dni</span>
                </div>
                ` : ''}

                ${tourism.sredni_koszt_pobytu_dzien_eur ? `
                <div class="budget-info">
                    <h4>Średni koszt pobytu (dzień):</h4>
                    <div class="budget-grid">
                        ${Object.entries(tourism.sredni_koszt_pobytu_dzien_eur).map(([type, cost]) => `
                            <div class="budget-item">
                                <span class="budget-label">${type}:</span>
                                <span class="budget-value">${cost} EUR</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createTransportSection(transport) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-bus"></i> Transport</h2>
                
                ${transport.lotniska?.length ? `
                <div class="subsection">
                    <h3><i class="fas fa-plane"></i> Lotniska</h3>
                    ${transport.lotniska.map(airport => `
                        <div class="transport-item">
                            <h4>${airport.nazwa} (${airport.kod_IATA})</h4>
                            <p><strong>Odległość:</strong> ${airport.odleglosc_od_centrum_km} km od centrum</p>
                            <p><strong>Połączenia:</strong> ${airport.polaczenia}</p>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${transport.metro ? `
                <div class="subsection">
                    <h3><i class="fas fa-subway"></i> Metro</h3>
                    <p><strong>Liczba linii:</strong> ${transport.metro.liczba_linii}</p>
                    <p><strong>Bilet:</strong> ${transport.metro.cena_biletu_eur} EUR (${transport.metro.czas_waznosci_min} min)</p>
                    ${transport.metro.linie?.length ? `
                    <div class="metro-lines">
                        ${transport.metro.linie.map(line => `
                            <div class="metro-line">
                                <span class="line-name" style="background: ${line.kolor};">${line.nazwa}</span>
                                <span class="line-stations">${line.stacje} stacji</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${transport.taxi ? `
                <div class="subsection">
                    <h3><i class="fas fa-taxi"></i> Taxi</h3>
                    <p><strong>Telefon:</strong> ${transport.taxi.numer_telefonu}</p>
                    <p><strong>Stawka startowa:</strong> ${transport.taxi.stawka_startowa_eur} EUR</p>
                    ${transport.taxi.aplikacje?.length ? `
                    <p><strong>Aplikacje:</strong> ${transport.taxi.aplikacje.join(', ')}</p>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }

    createGastronomySection(gastro) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-utensils"></i> Gastronomia</h2>
                
                ${gastro.specjalnosci_lokalne?.length ? `
                <div class="subsection">
                    <h3>Specjalności lokalne</h3>
                    <div class="dishes-list">
                        ${gastro.specjalnosci_lokalne.map(dish => `
                            <div class="dish-card">
                                <h4>${dish.nazwa}</h4>
                                <p>${dish.opis}</p>
                                <span class="price">${dish.cena_srednia_eur}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${gastro.rynki_spozywcze?.length ? `
                <div class="subsection">
                    <h3><i class="fas fa-shopping-basket"></i> Rynki spożywcze</h3>
                    ${gastro.rynki_spozywcze.map(market => `
                        <div class="market-item">
                            <h4>${market.nazwa}</h4>
                            <p><strong>Lokalizacja:</strong> ${market.lokalizacja}</p>
                            <p><strong>Godziny:</strong> ${market.godziny} (${market.dni})</p>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }

    createAccommodationSection(accommodation) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-hotel"></i> Zakwaterowanie</h2>
                
                ${accommodation.liczba_hoteli ? `
                <div class="info-item">
                    <span class="label">Liczba hoteli:</span>
                    <span class="value">${accommodation.liczba_hoteli}</span>
                </div>
                ` : ''}

                ${accommodation.dzielnice_popularne?.length ? `
                <div class="subsection">
                    <h3>Popularne dzielnice</h3>
                    <div class="districts-grid">
                        ${accommodation.dzielnice_popularne.map(district => `
                            <div class="district-card">
                                <h4>${district.nazwa}</h4>
                                <p>${district.opis}</p>
                                <div class="price-range">
                                    <i class="fas fa-tag"></i>
                                    ${district.cena_noc_srednia_eur}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createCultureSection(culture) {
        if (!culture) return '';
        
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-theater-masks"></i> Kultura</h2>
                
                ${culture.muzea ? `
                <div class="subsection">
                    <h3><i class="fas fa-building-columns"></i> Muzea</h3>
                    <p><strong>Liczba muzeów:</strong> ${culture.muzea.liczba}</p>
                </div>
                ` : ''}

                ${culture.teatry?.length ? `
                <div class="subsection">
                    <h3><i class="fas fa-masks-theater"></i> Teatry</h3>
                    ${culture.teatry.map(theater => `
                        <div class="venue-item">
                            <strong>${theater.nazwa}</strong> - ${theater.specjalizacja}
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${culture.uniwersytety?.length ? `
                <div class="subsection">
                    <h3><i class="fas fa-university"></i> Uniwersytety</h3>
                    ${culture.uniwersytety.map(uni => `
                        <div class="university-item">
                            <h4>${uni.nazwa}</h4>
                            ${uni.studenci ? `<p>${this.formatNumber(uni.studenci)} studentów</p>` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }

    createCityPhotosColumn(city) {
        const photos = this.getPhotosForCity(city.id);
        
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

    createPracticalInfoSection(info) {
        return `
            <div class="section">
                <h2 class="section-title"><i class="fas fa-info-circle"></i> Informacje praktyczne</h2>
                
                <div class="practical-grid">
                    ${info.strefa_czasowa ? `
                    <div class="practical-item">
                        <i class="fas fa-clock"></i>
                        <div>
                            <strong>Strefa czasowa:</strong>
                            <span>${info.strefa_czasowa}</span>
                        </div>
                    </div>
                    ` : ''}

                    ${info.napiecie_elektryczne ? `
                    <div class="practical-item">
                        <i class="fas fa-plug"></i>
                        <div>
                            <strong>Napięcie:</strong>
                            <span>${info.napiecie_elektryczne}</span>
                        </div>
                    </div>
                    ` : ''}

                    ${info.woda_z_kranu?.pitna !== undefined ? `
                    <div class="practical-item">
                        <i class="fas fa-tint"></i>
                        <div>
                            <strong>Woda z kranu:</strong>
                            <span>${info.woda_z_kranu.pitna ? '✓ Pitna' : '✗ Niepitna'}</span>
                            ${info.woda_z_kranu.opis ? `<p>${info.woda_z_kranu.opis}</p>` : ''}
                        </div>
                    </div>
                    ` : ''}

                    ${info.wifi?.dostepnosc ? `
                    <div class="practical-item">
                        <i class="fas fa-wifi"></i>
                        <div>
                            <strong>WiFi:</strong>
                            <span>${info.wifi.dostepnosc}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${info.karty_miejskie ? `
                <div class="city-cards">
                    <h4>Karty miejskie:</h4>
                    ${Object.entries(info.karty_miejskie).map(([name, card]) => `
                        <div class="city-card-item">
                            <h5>${name.replace(/_/g, ' ').toUpperCase()}</h5>
                            ${card.cena_48h_eur ? `<p>48h: ${card.cena_48h_eur} EUR</p>` : ''}
                            ${card.cena_72h_eur ? `<p>72h: ${card.cena_72h_eur} EUR</p>` : ''}
                            ${card.korzyści?.length ? `
                            <ul class="benefits-list">
                                ${card.korzyści.map(benefit => `<li>${benefit}</li>`).join('')}
                            </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }

    switchView() {
        const grid = document.getElementById('citiesGrid');
        if (this.currentView === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    showCitiesList() {
        document.getElementById('citiesGrid').style.display = 'grid';
        document.getElementById('cityDetail').style.display = 'none';

        // Pokaż kontrolki listy
        const filtersBar = document.querySelector('.filters-bar');
        const statsBar = document.querySelector('.stats-bar');
        const controlsBar = document.querySelector('.controls-bar');
        if (filtersBar) filtersBar.style.display = 'flex';
        if (statsBar) statsBar.style.display = 'flex';
        if (controlsBar) controlsBar.style.display = 'flex';

        history.pushState({}, '', 'miasta.html');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleURL() {
        const params = new URLSearchParams(window.location.search);
        const cityId = params.get('id');
        const countryId = params.get('country');
        
        if (cityId) {
            const city = this.cities.find(c => c.id === cityId);
            if (city) {
                this.showCityDetail(city);
            }
        } else if (countryId) {
            this.filters.country = countryId;
            document.getElementById('filterCountry').value = countryId;
            this.applyFilters();
        } else {
            this.showCitiesList();
        }
    }

    updateStats() {
        document.getElementById('totalCities').textContent = this.cities.length;
        
        const countries = new Set(this.cities.map(c => c.lokalizacja?.kraj_id));
        document.getElementById('totalCountriesWithCities').textContent = countries.size;
        
        const unescoCount = this.cities.filter(c => c.turystyka?.obiekty_unesco > 0).length;
        document.getElementById('unescoCount').textContent = unescoCount;
    }

    getCountryFlag(countryName) {
        return CountryFlags.getFlag(countryName);
    }

    formatNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + ' mln';
        if (num >= 1000) return (num / 1000).toFixed(1) + ' tys';
        return num.toString();
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    new CitiesViewer();
});
