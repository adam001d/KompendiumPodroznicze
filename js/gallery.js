class GalleryViewer {
    constructor() {
        this.photos = [];
        this.filteredPhotos = [];
        this.currentFilter = 'all';
        this.currentCountryFilter = '';
        this.currentSort = 'recent';
        this.currentPhotoIndex = 0;
        this.photosPerPage = 30;
        this.currentPage = 1;
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadPhotos();
        this.setupEventListeners();
        this.populateFilters();
        this.updateStats();
        this.renderPhotos();
        this.hideLoading();
    }

    async loadPhotos() {
        try {
            const response = await fetch('data/zdjecia/photos.json');
            const data = await response.json();
            this.photos = data.zdjecia || [];
            this.filteredPhotos = [...this.photos];
        } catch (error) {
            console.error('Błąd ładowania zdjęć:', error);
        }
    }

    setupEventListeners() {
        // Filtry kategorii
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFilter = e.currentTarget.dataset.filter;
                this.applyFilters();
            });
        });

        // Filtr kraju
        document.getElementById('filterCountry').addEventListener('change', (e) => {
            this.currentCountryFilter = e.target.value;
            this.applyFilters();
        });

        // Sortowanie
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortPhotos();
        });

        // Wyszukiwanie
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchPhotos(e.target.value);
        });

        // Load More
        document.getElementById('loadMore').addEventListener('click', () => {
            this.currentPage++;
            this.renderPhotos(true);
        });

        // Lightbox
        document.getElementById('lightboxClose').addEventListener('click', () => this.closeLightbox());
        document.getElementById('lightboxPrev').addEventListener('click', () => this.navigateLightbox(-1));
        document.getElementById('lightboxNext').addEventListener('click', () => this.navigateLightbox(1));
        
        document.getElementById('lightboxGallery').addEventListener('click', (e) => {
            if (e.target.classList.contains('lightbox-overlay')) {
                this.closeLightbox();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            const lightbox = document.getElementById('lightboxGallery');
            if (lightbox.style.display === 'flex') {
                if (e.key === 'Escape') this.closeLightbox();
                if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
                if (e.key === 'ArrowRight') this.navigateLightbox(1);
            }
        });
    }

    populateFilters() {
        const countries = new Set();
        this.photos.forEach(photo => {
            photo.powiazania?.kraje_ids?.forEach(id => countries.add(id));
        });

        const select = document.getElementById('filterCountry');
        Array.from(countries).sort().forEach(countryId => {
            const option = document.createElement('option');
            option.value = countryId;
            option.textContent = this.getCountryName(countryId);
            select.appendChild(option);
        });
    }

    getCountryName(countryId) {
        return countryId.replace('KRAJ-', '').replace('-001', '');
    }

    applyFilters() {
        this.filteredPhotos = this.photos.filter(photo => {
            // Filtr kategorii
            if (this.currentFilter !== 'all') {
                const hasCategory = 
                    (this.currentFilter === 'kraje' && photo.powiazania?.kraje_ids?.length) ||
                    (this.currentFilter === 'miasta' && photo.powiazania?.miasta_ids?.length) ||
                    (this.currentFilter === 'atrakcje' && photo.powiazania?.obiekty_ids?.length);
                
                if (!hasCategory) return false;
            }

            // Filtr kraju
            if (this.currentCountryFilter) {
                if (!photo.powiazania?.kraje_ids?.includes(this.currentCountryFilter)) {
                    return false;
                }
            }

            return true;
        });

        this.currentPage = 1;
        this.sortPhotos();
    }

    sortPhotos() {
        this.filteredPhotos.sort((a, b) => {
            switch (this.currentSort) {
                case 'recent':
                    return new Date(b.data) - new Date(a.data);
                case 'popular':
                    // Można dodać pole popularności w przyszłości
                    return 0;
                case 'name':
                    return (a.tytul || '').localeCompare(b.tytul || '');
                default:
                    return 0;
            }
        });
        this.renderPhotos();
    }

    searchPhotos(query) {
        if (!query || query.length < 2) {
            this.applyFilters();
            return;
        }

        const normalized = query.toLowerCase();
        this.filteredPhotos = this.photos.filter(photo => {
            return (
                photo.tytul?.toLowerCase().includes(normalized) ||
                photo.opis?.toLowerCase().includes(normalized) ||
                photo.tagi?.some(tag => tag.toLowerCase().includes(normalized)) ||
                photo.autor?.toLowerCase().includes(normalized)
            );
        });

        this.currentPage = 1;
        this.renderPhotos();
    }

    renderPhotos(append = false) {
        const grid = document.getElementById('photosGrid');
        const startIndex = (this.currentPage - 1) * this.photosPerPage;
        const endIndex = startIndex + this.photosPerPage;
        const photosToShow = this.filteredPhotos.slice(0, endIndex);

        if (!append) {
            grid.innerHTML = '';
        }

        if (photosToShow.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-images" style="font-size: 4rem; color: var(--gray-400);"></i>
                    <h3>Nie znaleziono zdjęć</h3>
                    <p>Spróbuj zmienić kryteria wyszukiwania</p>
                </div>
            `;
            document.getElementById('loadMore').style.display = 'none';
            return;
        }

const newPhotos = this.filteredPhotos.slice(startIndex, endIndex);
        
        newPhotos.forEach((photo, index) => {
            const photoElement = this.createPhotoCard(photo, startIndex + index);
            grid.appendChild(photoElement);
        });

        // Pokaż/ukryj przycisk Load More
        const loadMoreBtn = document.getElementById('loadMore');
        if (endIndex >= this.filteredPhotos.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }

        // Event listeners dla nowych zdjęć
        grid.querySelectorAll('.photo-card:not(.has-listener)').forEach((card, index) => {
            card.classList.add('has-listener');
            card.addEventListener('click', () => {
                const photoIndex = parseInt(card.dataset.index);
                this.openLightbox(photoIndex);
            });
        });
    }

    createPhotoCard(photo, index) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.index = index;
        
        card.innerHTML = `
            <div class="photo-image">
                <img src="${photo.miniatura}" alt="${photo.tytul}" loading="lazy">
                <div class="photo-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <div class="photo-info">
                <h4 class="photo-title">${photo.tytul}</h4>
                <p class="photo-author">
                    <i class="fas fa-camera"></i>
                    ${photo.autor}
                </p>
                ${photo.tagi?.length ? `
                <div class="photo-tags">
                    ${photo.tagi.slice(0, 3).map(tag => `
                        <span class="photo-tag">${tag}</span>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    openLightbox(index) {
        this.currentPhotoIndex = index;
        const photo = this.filteredPhotos[index];
        
        const lightbox = document.getElementById('lightboxGallery');
        document.getElementById('lightboxImage').src = photo.pelny_rozmiar;
        document.getElementById('lightboxTitle').textContent = photo.tytul;
        document.getElementById('lightboxDescription').textContent = photo.opis || '';
        document.getElementById('lightboxAuthor').innerHTML = `<i class="fas fa-camera"></i> ${photo.autor}`;
        document.getElementById('lightboxDate').innerHTML = `<i class="fas fa-calendar"></i> ${photo.data}`;
        
        // Tagi
        const tagsContainer = document.getElementById('lightboxTags');
        if (photo.tagi?.length) {
            tagsContainer.innerHTML = photo.tagi.map(tag => 
                `<span class="lightbox-tag">${tag}</span>`
            ).join('');
        } else {
            tagsContainer.innerHTML = '';
        }

        // Linki do powiązanych obiektów
        const linksContainer = document.getElementById('lightboxLinks');
        linksContainer.innerHTML = this.createPhotoLinks(photo);

        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    createPhotoLinks(photo) {
        const links = [];
        
        if (photo.powiazania?.obiekty_ids?.length) {
            links.push(`
                <div class="link-group">
                    <strong>Atrakcje:</strong>
                    ${photo.powiazania.obiekty_ids.map(id => 
                        `<a href="atrakcje.html?id=${id}" class="photo-link">
                            <i class="fas fa-landmark"></i> Zobacz
                        </a>`
                    ).join('')}
                </div>
            `);
        }

        if (photo.powiazania?.miasta_ids?.length) {
            links.push(`
                <div class="link-group">
                    <strong>Miasta:</strong>
                    ${photo.powiazania.miasta_ids.map(id => 
                        `<a href="miasta.html?id=${id}" class="photo-link">
                            <i class="fas fa-city"></i> Zobacz
                        </a>`
                    ).join('')}
                </div>
            `);
        }

        if (photo.powiazania?.kraje_ids?.length) {
            links.push(`
                <div class="link-group">
                    <strong>Kraje:</strong>
                    ${photo.powiazania.kraje_ids.map(id => 
                        `<a href="kraje.html?id=${id}" class="photo-link">
                            <i class="fas fa-flag"></i> Zobacz
                        </a>`
                    ).join('')}
                </div>
            `);
        }

        return links.join('');
    }

    closeLightbox() {
        document.getElementById('lightboxGallery').style.display = 'none';
        document.body.style.overflow = '';
    }

    navigateLightbox(direction) {
        this.currentPhotoIndex += direction;
        
        if (this.currentPhotoIndex < 0) {
            this.currentPhotoIndex = this.filteredPhotos.length - 1;
        } else if (this.currentPhotoIndex >= this.filteredPhotos.length) {
            this.currentPhotoIndex = 0;
        }

        this.openLightbox(this.currentPhotoIndex);
    }

    updateStats() {
        document.getElementById('totalPhotos').textContent = this.photos.length;
        
        const photographers = new Set(this.photos.map(p => p.autor));
        document.getElementById('totalPhotographers').textContent = photographers.size;
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
    new GalleryViewer();
});