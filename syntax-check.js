// Extract and test the main JavaScript functions from index.html

// Test the problematic functions
function handleReadMore(url, title, language, category, sourceKey) {
  console.log('handleReadMore called');
  trackArticleRead(url, category, sourceKey);
  
  if (language === 'en') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    showTamilModal(url, title, language);
  }
}

function showTamilModal(url, title, language) {
  console.log('showTamilModal called');
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;
  
  document.body.appendChild(modal);
}

// Test window assignments
window.handleReadMore = handleReadMore;
window.showTamilModal = showTamilModal;

console.log('Syntax check passed');