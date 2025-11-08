// Wspólne mapowanie flag krajów dla całego portalu
const CountryFlags = {
    // Mapowanie nazw krajów na kody ISO
    countryCodes: {
        'Włochy': 'it',
        'Francja': 'fr',
        'Hiszpania': 'es',
        'Indie': 'in',
        'Grecja': 'gr',
        'Egipt': 'eg',
        'USA': 'us',
        'Stany Zjednoczone': 'us',
        'Wielka Brytania': 'gb',
        'Niemcy': 'de',
        'Polska': 'pl',
        'Chiny': 'cn',
        'Japonia': 'jp',
        'Brazylia': 'br',
        'Australia': 'au',
        'Kanada': 'ca',
        'Meksyk': 'mx',
        'Rosja': 'ru',
        'Turcja': 'tr',
        'Tajlandia': 'th',
        'Portugalia': 'pt',
        'Holandia': 'nl',
        'Belgia': 'be',
        'Szwajcaria': 'ch',
        'Austria': 'at',
        'Szwecja': 'se',
        'Norwegia': 'no',
        'Dania': 'dk',
        'Finlandia': 'fi',
        'Irlandia': 'ie',
        'Czechy': 'cz',
        'Węgry': 'hu',
        'Rumunia': 'ro',
        'Bułgaria': 'bg',
        'Chorwacja': 'hr',
        'Słowacja': 'sk',
        'Słowenia': 'si'
    },

    // Zwraca HTML z obrazkiem flagi
    getFlag(countryName, size = 20) {
        const code = this.countryCodes[countryName];
        if (!code) {
            return `<span class="flag-placeholder" style="display:inline-block;width:${size}px;height:${size}px;background:#ddd;border-radius:2px;"></span>`;
        }
        
        return `<img src="https://flagcdn.com/w40/${code}.png" 
                     alt="${countryName}" 
                     title="${countryName}"
                     class="country-flag-img" 
                     style="width:${size}px;height:auto;vertical-align:middle;border-radius:2px;"
                     loading="lazy">`;
    },

    // Zwraca tylko URL flagi (dla użycia w CSS background)
    getFlagUrl(countryName, size = 'w40') {
        const code = this.countryCodes[countryName];
        if (!code) return null;
        return `https://flagcdn.com/${size}/${code}.png`;
    }
};

// Eksport dla użycia w innych plikach
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CountryFlags;
}
