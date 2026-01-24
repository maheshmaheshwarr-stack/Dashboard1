// Quick syntax fix for the Tamil modal function
// This replaces the problematic nested template literals with simple string concatenation

function showTamilModal(url, title, language) {
  const t = translations[language] || { name: 'Unknown' };
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

  const decodedTitle = decodeURIComponent(title);
  const isAuthentic = isTamilContent && isTamilContent(decodedTitle) || decodedTitle.includes('[தமிழ் மூலம்]');

  // Build content using simple string concatenation to avoid template literal issues
  let content = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      margin: 20px;
      position: relative;
      animation: slideIn 0.3s ease;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 16px;
      ">
        <h2 style="margin: 0; color: #1e40af; font-size: 1.25rem;">
          ${language === 'ta' ? '📰 தமிழ் செய்தி' : t.name + ' மொழிபெயர்ப்பு'}
        </h2>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">&times;</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1e40af; margin-bottom: 12px; line-height: 1.4;">
          ${decodedTitle}
        </h3>`;

  if (language === 'ta') {
    if (isAuthentic) {
      content += `
        <div style="background: #dcfce7; border-left: 4px solid #059669; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
          <h4 style="color: #059669; margin-bottom: 8px; font-size: 1rem;">✅ முழுமையான தமிழ் செய்தி</h4>
          <p style="line-height: 1.6; color: #374151; margin-bottom: 12px;">
            இது தமிழ் மூலங்களில் இருந்து வரும் முழுமையான தமிழ் செய்தி. நம்பகமான தமிழ் ஊடகங்களின் அசல் உள்ளடக்கம்.
          </p>
        </div>`;
    } else {
      content += `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
          <h4 style="color: #d97706; margin-bottom: 8px; font-size: 1rem;">📰 மொழிபெயர்க்கப்பட்ட செய்தி</h4>
          <p style="line-height: 1.6; color: #374151; margin-bottom: 12px;">
            இந்த செய்தி ஆங்கில மூலத்திலிருந்து தமிழுக்கு மொழிபெயர்க்கப்பட்டுள்ளது.
          </p>
        </div>`;
    }
  } else {
    content += `
      <p style="line-height: 1.6; margin-bottom: 16px; color: #374151;">
        இந்த கட்டுரை ${t.name} மொழியில் கிடைக்கிறது. முழு உள்ளடக்கத்தைப் பார்க்க கீழே உள்ள பொத்தானைக் கிளிக் செய்யவும்.
      </p>`;
  }

  content += `
      </div>
      
      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <button onclick="window.open('${url}', '_blank', 'noopener,noreferrer')" style="
          background: #1e40af;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          margin-right: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        " onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#1e40af'">
          ${language === 'ta' ? '📖 முழு செய்தியைப் படிக்க' : 'மூல கட்டுரையைப் பார்க்கவும்'}
        </button>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        " onmouseover="this.style.background='#4b5563'" onmouseout="this.style.background='#6b7280'">
          மூடு
        </button>
      </div>
    </div>
  `;

  modal.innerHTML = content;
  document.body.appendChild(modal);
  
  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close on Escape key
  const handleEscape = function(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Make function globally accessible
if (typeof window !== 'undefined') {
  window.showTamilModal = showTamilModal;
}

console.log('Tamil modal syntax fix loaded');