// Quick syntax fix for Dashboard1
console.log('Syntax fix script loaded');

// Ensure language selector works
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - applying syntax fixes');
    
    // Force language selector setup
    setTimeout(function() {
        const languageBtn = document.getElementById('language-btn');
        const languageDropdown = document.getElementById('language-dropdown');
        
        if (languageBtn && languageDropdown) {
            console.log('Language elements found, setting up manually');
            
            languageBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                languageDropdown.classList.toggle('show');
                console.log('Language dropdown toggled');
            });
            
            // Add language options
            const options = languageDropdown.querySelectorAll('.language-option');
            options.forEach(function(option) {
                option.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const lang = option.getAttribute('data-lang');
                    const flag = option.getAttribute('data-flag');
                    
                    // Update display
                    const flagEl = document.getElementById('current-language-flag');
                    const textEl = document.getElementById('current-language-text');
                    
                    if (flagEl && textEl) {
                        flagEl.textContent = flag;
                        textEl.textContent = option.textContent.trim();
                    }
                    
                    // Update active state
                    options.forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    
                    languageDropdown.classList.remove('show');
                    console.log('Language changed to:', lang);
                });
            });
            
            console.log('Language selector manually configured');
        } else {
            console.error('Language elements not found');
        }
    }, 2000);
});