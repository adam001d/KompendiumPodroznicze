class HomePage {
  constructor() {
    this.init();
  }
  
  async init() {
    await this.loadRealStats();
    await this.loadPopularDestinations();
    this.setupContinentMap();
    this.initWorldMapAnimation();
  }
  
  // Załaduj rzeczywiste statystyki z danych
  async loadRealStats() {
    try {
      // Załaduj kraje
      const countriesResponse = await fetch('data/metadata/countries_index.json');
      const countriesData = await countriesResponse.json();
      const countriesCount = countriesData.items.length;

      // Policz obiekty UNESCO
      let unescoCount = 0;
      for (const item of countriesData.items) {
        try {
          const countryResponse = await fetch(`data/kraje/${item.id.toLowerCase()}.json`);
          if (countryResponse.ok) {
            const countryData = await countryResponse.json();
            unescoCount += countryData.turystyka?.obiekty_unesco || 0;
          }
        } catch (err) {
          // Ignoruj błędy
        }
      }

      // Załaduj miasta
      const citiesResponse = await fetch('data/metadata/cities_index.json');
      const citiesData = await citiesResponse.json();
      const citiesCount = citiesData.items.length;

      // Policz atrakcje ze wszystkich kategorii
      const categories = ['budynki', 'muzea', 'parki', 'pomniki', 'mosty', 'place'];
      let attractionsCount = 0;

      for (const category of categories) {
        try {
          const response = await fetch(`data/atrakcje/${category}/index.json`);
          if (response.ok) {
            const data = await response.json();
            attractionsCount += data.files?.length || 0;
          }
        } catch (err) {
          console.warn(`Brak kategorii: ${category}`);
        }
      }

      // Policz zdjęcia
      let photosCount = 0;
      try {
        const photosResponse = await fetch('data/zdjecia/photos.json');
        if (photosResponse.ok) {
          const photosData = await photosResponse.json();
          photosCount = photosData.zdjecia?.length || 0;
        }
      } catch (err) {
        console.warn('Brak danych o zdjęciach');
      }

      // Ustaw wartości i animuj w kartach
      this.animateCardStats({
        countries: countriesCount,
        unesco: unescoCount,
        cities: citiesCount,
        attractions: attractionsCount,
        photos: photosCount
      });

      // Załaduj liczniki kategorii
      this.loadCategoryCounts(categories);

    } catch (error) {
      console.error('Błąd ładowania statystyk:', error);
    }
  }
  
  animateCardStats(values) {
    const stats = [
      { id: 'countriesCount', value: values.countries },
      { id: 'unescoCount', value: values.unesco },
      { id: 'citiesCount', value: values.cities },
      { id: 'attractionsCount', value: values.attractions },
      { id: 'photosCount', value: values.photos }
    ];

    stats.forEach(stat => {
      const element = document.getElementById(stat.id);
      if (element) {
        this.animateValue(element, 0, stat.value, 2000);
      }
    });
  }
  
  async loadCategoryCounts(categories) {
    const categoryMapping = {
      'budynki': 'count-budynki',
      'parki': 'count-parki',
      'muzea': 'count-muzea'
    };
    
    for (const category of categories) {
      try {
        const response = await fetch(`data/atrakcje/${category}/index.json`);
        if (response.ok) {
          const data = await response.json();
          const elementId = categoryMapping[category];
          if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
              element.textContent = data.files.length;
            }
          }
        }
      } catch (err) {
        console.warn(`Nie można załadować licznika dla: ${category}`);
      }
    }
  }
  animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current).toLocaleString('pl-PL');
    }, 16);
  }
  
  // Ładowanie wyróżnionych miejsc
  async loadFeaturedPlaces() {
    try {
      const response = await fetch('data/metadata/featured.json');
      const data = await response.json();
      
      const carousel = document.getElementById('featuredCarousel');
      if (!carousel) return;
      
      carousel.innerHTML = data.items.map(item => this.createFeaturedCard(item)).join('');
      
      // Inicjalizacja karuzeli
      this.initCarousel(carousel);
      
    } catch (error) {
      console.error('Błąd ładowania wyróżnionych miejsc:', error);
    }
  }
  
  createFeaturedCard(item) {
    return `
      <div class="featured-card">
        <div class="featured-image">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
        </div>
        <div class="featured-content">
          <span class="featured-badge">${item.badge}</span>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <a href="${item.url}" class="featured-link">
            Dowiedz się więcej →
          </a>
        </div>
      </div>
    `;
  }
  
  initCarousel(carousel) {
    // Nie używamy karuzeli - pokazujemy wszystkie karty jednocześnie
    const cards = carousel.querySelectorAll('.featured-card');
    cards.forEach(card => {
      card.style.opacity = '1';
      card.style.display = 'flex';
    });
  }
  
  // Ładowanie popularnych miejsc
  async loadPopularDestinations() {
    try {
      const countriesResponse = await fetch('data/metadata/countries_index.json');
      const countriesData = await countriesResponse.json();
      const citiesResponse = await fetch('data/metadata/cities_index.json');
      const citiesData = await citiesResponse.json();

      const popularPlaces = [];

      // Pobierz najpopularniejsze kraje
      for (const item of countriesData.items.slice(0, 8)) {
        try {
          const countryResponse = await fetch(`data/kraje/${item.id.toLowerCase()}.json`);
          if (countryResponse.ok) {
            const country = await countryResponse.json();
            if (country.turystyka?.liczba_turystow_rocznie) {
              popularPlaces.push({
                type: 'country',
                name: country.podstawowe?.nazwa_pelna || item.name,
                flag: country.podstawowe?.flaga || '🌍',
                tourists: country.turystyka.liczba_turystow_rocznie,
                unesco: country.turystyka.obiekty_unesco || 0,
                continent: item.continent || 'Świat',
                image: country.podstawowe?.zdjecie_glowne || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
                url: `kraje.html?id=${item.id}`
              });
            }
          }
        } catch (err) {
          // Ignoruj błędy
        }
      }

      // Sortuj po liczbie turystów
      popularPlaces.sort((a, b) => {
        const getNumber = (str) => {
          if (!str) return 0;
          const match = str.match(/[\d,]+/);
          return match ? parseInt(match[0].replace(/,/g, '')) : 0;
        };
        return getNumber(b.tourists) - getNumber(a.tourists);
      });

      const container = document.getElementById('popularDestinations');
      if (!container) return;

      container.innerHTML = popularPlaces.slice(0, 6).map((place, index) =>
        this.createPopularCard(place, index + 1)
      ).join('');

    } catch (error) {
      console.error('Błąd ładowania popularnych miejsc:', error);
    }
  }

  createPopularCard(place, rank) {
    return `
      <a href="${place.url}" class="popular-card">
        <div class="popular-rank">#${rank}</div>
        <div class="popular-image">
          <img src="${place.image}" alt="${place.name}" loading="lazy">
          <div class="popular-gradient"></div>
        </div>
        <div class="popular-content">
          <div class="popular-header">
            <span class="popular-flag">${place.flag}</span>
            <h3>${place.name}</h3>
          </div>
          <div class="popular-meta">
            <span class="popular-continent">${place.continent}</span>
          </div>
          <div class="popular-stats">
            <div class="stat-item">
              <span class="stat-icon">✈️</span>
              <span class="stat-value">${place.tourists}</span>
              <span class="stat-label">turystów rocznie</span>
            </div>
            ${place.unesco > 0 ? `
              <div class="stat-item">
                <span class="stat-icon">🏛️</span>
                <span class="stat-value">${place.unesco}</span>
                <span class="stat-label">obiektów UNESCO</span>
              </div>
            ` : ''}
          </div>
        </div>
      </a>
    `;
  }
  
  // Mapa kontynentów
  setupContinentMap() {
    const continentButtons = document.querySelectorAll('.continent-btn');
    
    continentButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const continent = btn.dataset.continent;
        // Przekieruj do strony krajów z filtrem kontynentu
        window.location.href = `kraje.html?continent=${continent}`;
      });
    });
    
    console.log(`Znaleziono ${continentButtons.length} przycisków kontynentów`);
  }
  
  // Animacja mapy świata w tle hero
  initWorldMapAnimation() {
    const canvas = document.getElementById('worldMap');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Proste punkty na mapie
    const points = [];
    for (let i = 0; i < 50; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rysuj połączenia
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      // Rysuj punkty
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fill();

        // Aktualizuj pozycję
        point.x += point.vx;
        point.y += point.vy;

        // Odbicie od krawędzi
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1;
      });

      requestAnimationFrame(animate);
    }

    animate();

    // Resize
    window.addEventListener('resize', () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
  }

  // Załaduj szczegółowe statystyki do dashboardu
  async loadDashboardStats() {
    try {
      // Załaduj kraje z podziałem na kontynenty
      const countriesResponse = await fetch('data/metadata/countries_index.json');
      const countriesData = await countriesResponse.json();

      const continentCount = {};
      for (const country of countriesData.items) {
        const continent = country.continent || 'Inne';
        continentCount[continent] = (continentCount[continent] || 0) + 1;
      }

      // Załaduj miasta
      const citiesResponse = await fetch('data/metadata/cities_index.json');
      const citiesData = await citiesResponse.json();

      // Policz atrakcje z podziałem na kategorie
      const categories = ['budynki', 'muzea', 'parki', 'pomniki', 'mosty', 'place'];
      const categoryCount = {};
      let totalAttractions = 0;

      for (const category of categories) {
        try {
          const response = await fetch(`data/atrakcje/${category}/index.json`);
          if (response.ok) {
            const data = await response.json();
            const count = data.files?.length || 0;
            categoryCount[category] = count;
            totalAttractions += count;
          }
        } catch (err) {
          categoryCount[category] = 0;
        }
      }

      // Policz obiekty UNESCO
      let unescoCount = 0;
      for (const country of countriesData.items) {
        try {
          const countryResponse = await fetch(`data/kraje/${country.id.toLowerCase()}.json`);
          if (countryResponse.ok) {
            const countryData = await countryResponse.json();
            unescoCount += countryData.turystyka?.obiekty_unesco || 0;
          }
        } catch (err) {
          // Ignoruj błędy
        }
      }

      // Wypełnij dashboard
      const totalCountriesEl = document.getElementById('totalCountries');
      const continentBreakdownEl = document.getElementById('continentBreakdown');
      if (totalCountriesEl) this.animateValue(totalCountriesEl, 0, countriesData.items.length, 2000);
      if (continentBreakdownEl) {
        const breakdownText = Object.entries(continentCount)
          .map(([continent, count]) => `${continent}: ${count}`)
          .join(' • ');
        continentBreakdownEl.textContent = breakdownText;
      }

      const totalCitiesEl = document.getElementById('totalCities');
      if (totalCitiesEl) this.animateValue(totalCitiesEl, 0, citiesData.items.length, 2000);

      const totalAttractionsEl = document.getElementById('totalAttractions');
      const categoryBreakdownEl = document.getElementById('categoryBreakdown');
      if (totalAttractionsEl) this.animateValue(totalAttractionsEl, 0, totalAttractions, 2000);
      if (categoryBreakdownEl) {
        const categoryNames = {
          'budynki': 'Budynki',
          'muzea': 'Muzea',
          'parki': 'Parki',
          'pomniki': 'Pomniki',
          'mosty': 'Mosty',
          'place': 'Place'
        };
        const breakdownText = Object.entries(categoryCount)
          .filter(([_, count]) => count > 0)
          .map(([cat, count]) => `${categoryNames[cat]}: ${count}`)
          .join(' • ');
        categoryBreakdownEl.textContent = breakdownText;
      }

      const totalUNESCOEl = document.getElementById('totalUNESCO');
      if (totalUNESCOEl) this.animateValue(totalUNESCOEl, 0, unescoCount, 2000);

    } catch (error) {
      console.error('Błąd ładowania statystyk dashboardu:', error);
    }
  }

  // Załaduj obiekty UNESCO
  async loadUNESCOSites() {
    try {
      const unescoSites = [];

      // Sprawdź budynki z UNESCO
      const buildingsResponse = await fetch('data/atrakcje/budynki/index.json');
      if (buildingsResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        for (const file of buildingsData.files.slice(0, 6)) {
          try {
            const buildingResponse = await fetch(`data/atrakcje/budynki/${file}`);
            if (buildingResponse.ok) {
              const building = await buildingResponse.json();
              if (building.unesco || building.dziedzictwo_unesco) {
                unescoSites.push({
                  name: building.nazwa,
                  location: `${building.miasto}, ${building.kraj}`,
                  image: building.zdjecia?.[0] || 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
                  year: building.rok_budowy,
                  type: 'Budynek'
                });
              }
            }
          } catch (err) {
            // Ignoruj błędy
          }
          if (unescoSites.length >= 6) break;
        }
      }

      const unescoGrid = document.getElementById('unescoGrid');
      if (!unescoGrid) return;

      if (unescoSites.length > 0) {
        unescoGrid.innerHTML = unescoSites.map(site => `
          <div class="unesco-card">
            <div class="unesco-image">
              <img src="${site.image}" alt="${site.name}" loading="lazy">
              <span class="unesco-badge">UNESCO</span>
            </div>
            <div class="unesco-info">
              <h4>${site.name}</h4>
              <p>${site.location}</p>
              ${site.year ? `<span class="unesco-year">${site.year}</span>` : ''}
            </div>
          </div>
        `).join('');
      } else {
        unescoGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Wkrótce...</p>';
      }

    } catch (error) {
      console.error('Błąd ładowania obiektów UNESCO:', error);
    }
  }

  // Załaduj top destynacje
  async loadTopDestinations() {
    try {
      const countriesResponse = await fetch('data/metadata/countries_index.json');
      const countriesData = await countriesResponse.json();

      const topCountries = [];
      for (const item of countriesData.items.slice(0, 10)) {
        try {
          const countryResponse = await fetch(`data/kraje/${item.id.toLowerCase()}.json`);
          if (countryResponse.ok) {
            const country = await countryResponse.json();
            if (country.turystyka?.liczba_turystow_rocznie) {
              topCountries.push({
                name: country.podstawowe?.nazwa_pelna || item.name,
                flag: country.podstawowe?.flaga,
                tourists: country.turystyka.liczba_turystow_rocznie,
                unesco: country.turystyka.obiekty_unesco || 0,
                url: `kraje.html?id=${item.id}`
              });
            }
          }
        } catch (err) {
          // Ignoruj błędy
        }
      }

      // Sortuj po liczbie turystów
      topCountries.sort((a, b) => {
        const getNumber = (str) => {
          if (!str) return 0;
          const match = str.match(/[\d,]+/);
          return match ? parseInt(match[0].replace(/,/g, '')) : 0;
        };
        return getNumber(b.tourists) - getNumber(a.tourists);
      });

      const topDestinations = document.getElementById('topDestinations');
      if (!topDestinations) return;

      topDestinations.innerHTML = topCountries.slice(0, 6).map((country, index) => `
        <a href="${country.url}" class="destination-card">
          <div class="destination-rank">#${index + 1}</div>
          <div class="destination-flag">${country.flag || '🏳️'}</div>
          <h4>${country.name}</h4>
          <div class="destination-stats">
            <span class="destination-stat">👥 ${country.tourists}</span>
            ${country.unesco > 0 ? `<span class="destination-stat">🏛️ ${country.unesco} UNESCO</span>` : ''}
          </div>
        </a>
      `).join('');

    } catch (error) {
      console.error('Błąd ładowania top destynacji:', error);
    }
  }

  // Załaduj karty kontynentów
  async loadContinentCards() {
    try {
      const countriesResponse = await fetch('data/metadata/countries_index.json');
      const countriesData = await countriesResponse.json();

      const citiesResponse = await fetch('data/metadata/cities_index.json');
      const citiesData = await citiesResponse.json();

      // Grupuj dane po kontynentach
      const continents = {};

      for (const country of countriesData.items) {
        const continent = country.continent || 'Inne';
        if (!continents[continent]) {
          continents[continent] = {
            name: continent,
            countries: 0,
            cities: 0,
            attractions: 0,
            unesco: 0
          };
        }
        continents[continent].countries++;
      }

      // Policz miasta per kontynent
      for (const city of citiesData.items) {
        const country = countriesData.items.find(c => c.id === city.country_id);
        if (country) {
          const continent = country.continent || 'Inne';
          if (continents[continent]) {
            continents[continent].cities++;
          }
        }
      }

      const continentCards = document.getElementById('continentCards');
      if (!continentCards) return;

      const continentIcons = {
        'Europa': '🇪🇺',
        'Azja': '🌏',
        'Afryka': '🌍',
        'Ameryka Północna': '🌎',
        'Ameryka Południowa': '🌎',
        'Oceania': '🌏',
        'Antarktyda': '🇦🇶'
      };

      continentCards.innerHTML = Object.values(continents).map(continent => `
        <a href="kraje.html?continent=${encodeURIComponent(continent.name)}" class="continent-card">
          <div class="continent-icon">${continentIcons[continent.name] || '🌐'}</div>
          <h3>${continent.name}</h3>
          <div class="continent-stats-grid">
            <div class="continent-stat">
              <strong>${continent.countries}</strong>
              <span>Krajów</span>
            </div>
            <div class="continent-stat">
              <strong>${continent.cities}</strong>
              <span>Miast</span>
            </div>
          </div>
          <div class="continent-explore">Eksploruj →</div>
        </a>
      `).join('');

    } catch (error) {
      console.error('Błąd ładowania kart kontynentów:', error);
    }
  }

  // Załaduj ostatnio dodane treści
  async loadRecentContent() {
    try {
      const recentItems = [];

      // Pobierz ostatnie kraje (symulacja - w rzeczywistości mogłyby mieć timestamp)
      const countriesResponse = await fetch('data/metadata/countries_index.json');
      if (countriesResponse.ok) {
        const countriesData = await countriesResponse.json();
        const recentCountries = countriesData.items.slice(0, 2);
        for (const country of recentCountries) {
          recentItems.push({
            type: 'Kraj',
            title: country.name,
            url: `kraje.html?id=${country.id}`,
            date: 'Niedawno'
          });
        }
      }

      // Pobierz ostatnie miasta
      const citiesResponse = await fetch('data/metadata/cities_index.json');
      if (citiesResponse.ok) {
        const citiesData = await citiesResponse.json();
        const recentCities = citiesData.items.slice(0, 2);
        for (const city of recentCities) {
          recentItems.push({
            type: 'Miasto',
            title: city.name,
            url: `miasta.html?id=${city.id}`,
            date: 'Niedawno'
          });
        }
      }

      // Pobierz ostatnie atrakcje
      const buildingsResponse = await fetch('data/atrakcje/budynki/index.json');
      if (buildingsResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        const recentBuilding = buildingsData.files[0];
        if (recentBuilding) {
          const buildingResponse = await fetch(`data/atrakcje/budynki/${recentBuilding}`);
          if (buildingResponse.ok) {
            const building = await buildingResponse.json();
            recentItems.push({
              type: 'Budynek',
              title: building.nazwa,
              url: `atrakcje.html?category=budynki&id=${recentBuilding.replace('.json', '')}`,
              date: 'Niedawno'
            });
          }
        }
      }

      const recentGrid = document.getElementById('recentGrid');
      if (!recentGrid) return;

      if (recentItems.length > 0) {
        recentGrid.innerHTML = recentItems.map(item => `
          <a href="${item.url}" class="recent-card">
            <span class="recent-type">${item.type}</span>
            <h4 class="recent-title">${item.title}</h4>
            <div class="recent-meta">
              <span>📅 ${item.date}</span>
            </div>
          </a>
        `).join('');
      } else {
        recentGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Brak ostatnich treści</p>';
      }

    } catch (error) {
      console.error('Błąd ładowania ostatnich treści:', error);
    }
  }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  new HomePage();
});
