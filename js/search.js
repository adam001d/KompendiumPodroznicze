class GlobalSearch {
    constructor() {
        this.searchInput = document.getElementById('globalSearch');
        this.searchResults = document.getElementById('searchResults');
        this.filterChips = document.querySelectorAll('.filter-chip');
        this.currentFilter = 'all';
        this.debounceTimer = null;
        
        if (this.searchInput && this.searchResults) {
            this.init();
        }
    }

    init() {
        // Wyszukiwanie z debounce
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });

        // Filtry
        this.filterChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                this.filterChips.forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFilter = e.currentTarget.dataset.filter;
                this.performSearch(this.searchInput.value);
            });
        });

        // Zamknij dropdown po kliknięciu poza nim
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.global-search')) {
                this.hideResults();
            }
        });

        // Focus na input
        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.length >= 2) {
                this.performSearch(this.searchInput.value);
            }
        });
    }

    async performSearch(query) {
        if (!query || query.length < 2) {
            this.hideResults();
            return;
        }

        const normalized = query.toLowerCase();
        const results = await this.searchAllData(normalized);
        this.displayResults(results);
    }

    async searchAllData(query) {
        const results = {
            countries: [],
            cities: [],
            attractions: []
        };

        try {
            // Wyszukaj w krajach
            if (this.currentFilter === 'all' || this.currentFilter === 'country') {
                const countriesIndex = await fetch('data/metadata/countries_index.json').then(r => r.json());
                results.countries = countriesIndex.items
                    .filter(item => 
                        (item.nazwa || item.name || '').toLowerCase().includes(query) ||
                        (item.nazwa_oficjalna || item.official_name || '').toLowerCase().includes(query)
                    )
                    .slice(0, 5)
                    .map(item => ({
                        type: 'country',
                        id: item.id,
                        name: item.nazwa || item.name,
                        description: item.nazwa_oficjalna || item.official_name,
                        url: `kraje.html?id=${item.id}`,
                        icon: item.flaga || item.flag || '🏳️'
                    }));
            }

            // Wyszukaj w miastach
            if (this.currentFilter === 'all' || this.currentFilter === 'city') {
                const citiesIndex = await fetch('data/metadata/cities_index.json').then(r => r.json());
                results.cities = citiesIndex.items
                    .filter(item => 
                        (item.nazwa || item.name || '').toLowerCase().includes(query)
                    )
                    .slice(0, 5)
                    .map(item => ({
                        type: 'city',
                        id: item.id,
                        name: item.nazwa || item.name,
                        description: item.kraj || item.country,
                        url: `miasta.html?id=${item.id}`,
                        icon: '🏙️'
                    }));
            }

            // Wyszukaj w atrakcjach
            if (this.currentFilter === 'all' || this.currentFilter === 'attraction') {
                const attractionsIndex = await fetch('data/metadata/attractions_index.json').then(r => r.json());
                results.attractions = attractionsIndex.items
                    .filter(item => 
                        (item.nazwa || item.name || '').toLowerCase().includes(query)
                    )
                    .slice(0, 5)
                    .map(item => ({
                        type: 'attraction',
                        id: item.id,
                        name: item.nazwa || item.name,
                        description: `${item.kategoria || item.category} - ${item.lokalizacja || item.location}`,
                        url: `atrakcje.html?building=${item.id}`,
                        icon: this.getCategoryIcon(item.kategoria || item.category)
                    }));
            }

        } catch (error) {
            console.error('Błąd wyszukiwania:', error);
        }

        return results;
    }

    displayResults(results) {
        const container = this.searchResults.querySelector('.results-container');
        const allResults = [
            ...results.countries,
            ...results.cities,
            ...results.attractions
        ];

        if (allResults.length === 0) {
            container.innerHTML = `
                <div class="no-results" style="padding: var(--space-xl); text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: var(--space-md); opacity: 0.5;"></i>
                    <p>Nie znaleziono wyników</p>
                </div>
            `;
            this.showResults();
            return;
        }

        container.innerHTML = allResults.map(result => this.createResultItem(result)).join('');
        this.showResults();

        // Dodaj event listeners do wyników
        container.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                window.location.href = item.dataset.url;
            });
        });
    }

    createResultItem(result) {
        const typeLabels = {
            country: 'Kraj',
            city: 'Miasto',
            attraction: 'Atrakcja'
        };

        const typeColors = {
            country: 'var(--primary-600)',
            city: 'var(--accent-cyan)',
            attraction: 'var(--accent-emerald)'
        };

        return `
            <div class="result-item" data-url="${result.url}">
                <div class="result-icon" style="font-size: 2rem; flex-shrink: 0;">
                    ${result.icon}
                </div>
                <div class="result-content">
                    <span class="result-type" style="background: ${typeColors[result.type]}20; color: ${typeColors[result.type]};">
                        ${typeLabels[result.type]}
                    </span>
                    <div class="result-title">${result.name}</div>
                    <div class="result-description">${result.description}</div>
                </div>
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            'budynki': '🏛️',
            'muzea': '🎨',
            'parki': '🌳',
            'pomniki': '🗿',
            'mosty': '🌉',
            'place': '🏛️'
        };
        return icons[category] || '📍';
    }

    showResults() {
        this.searchResults.style.display = 'block';
    }

    hideResults() {
        this.searchResults.style.display = 'none';
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    new GlobalSearch();
});
