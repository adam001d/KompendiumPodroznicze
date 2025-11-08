// Theme Toggle - Dark Mode with LocalStorage
(function() {
    const THEME_KEY = 'kompendium-theme';

    // Initialize theme on page load
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
    }

    // Toggle theme
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        // Add transition class for smooth switching
        document.documentElement.classList.add('theme-transition');

        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        updateThemeButton(newTheme);

        // Remove transition class after animation
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 300);
    }

    // Update button appearance
    function updateThemeButton(theme) {
        const button = document.getElementById('themeToggle');
        if (!button) return;

        const sunIcon = button.querySelector('.sun-icon');
        const moonIcon = button.querySelector('.moon-icon');

        if (theme === 'dark') {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
            button.setAttribute('aria-label', 'Przełącz na tryb jasny');
        } else {
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
            button.setAttribute('aria-label', 'Przełącz na tryb ciemny');
        }
    }

    // Setup event listener
    function setupThemeToggle() {
        const button = document.getElementById('themeToggle');
        if (button) {
            button.addEventListener('click', toggleTheme);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            setupThemeToggle();
        });
    } else {
        initTheme();
        setupThemeToggle();
    }
})();
