# Syntax Error Fix Instructions

## Problem
Line 5765 in index.html has a syntax error due to nested template literals in the `showTamilModal` function.

## The Issue
```javascript
const tamilContent = language === 'ta' ? `
  ...
  ${isAuthentic ? `...` : `...`}  // ← This nested template literal causes the error
  ...
` : `...`;
```

## Solution
Replace the nested template literals with string concatenation.

## Fixed Code
Replace lines 5804-5870 (approximately) with:

```javascript
// Build content without nested template literals
let tamilContent = '';

if (language === 'ta') {
  tamilContent = '<div style="margin-bottom: 20px;">';
  tamilContent += '<h3 style="color: #1e40af; margin-bottom: 12px; line-height: 1.4;">' + decodedTitle + '</h3>';
  
  if (isAuthentic) {
    tamilContent += '<div style="background: #dcfce7; border-left: 4px solid #059669; padding: 16px; margin-bottom: 16px; border-radius: 8px;">';
    tamilContent += '<h4 style="color: #059669; margin-bottom: 8px; font-size: 1rem;">✅ முழுமையான தமிழ் செய்தி</h4>';
    tamilContent += '<p style="line-height: 1.6; color: #374151; margin-bottom: 12px;">இது தமிழ் மூலங்களில் இருந்து வரும் முழுமையான தமிழ் செய்தி.</p>';
    tamilContent += '</div>';
  } else {
    tamilContent += '<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px; border-radius: 8px;">';
    tamilContent += '<h4 style="color: #d97706; margin-bottom: 8px; font-size: 1rem;">📰 மொழிபெயர்க்கப்பட்ட செய்தி</h4>';
    tamilContent += '<p style="line-height: 1.6; color: #374151; margin-bottom: 12px;">இந்த செய்தி ஆங்கில மூலத்திலிருந்து மொழிபெயர்க்கப்பட்டுள்ளது.</p>';
    tamilContent += '</div>';
  }
  
  tamilContent += '</div>';
} else {
  tamilContent = '<div style="margin-bottom: 20px;">';
  tamilContent += '<h3 style="color: #1e40af; margin-bottom: 12px; line-height: 1.4;">[' + t.name + '] ' + decodedTitle + '</h3>';
  tamilContent += '<p style="line-height: 1.6; margin-bottom: 16px; color: #374151;">இந்த கட்டுரை ' + t.name + ' மொழியில் கிடைக்கிறது.</p>';
  tamilContent += '</div>';
}
```

## Quick Test
Use the file `quick-syntax-fix.js` which contains a working version of the function.

## Status
- ❌ Current: Syntax error at line 5765
- ✅ Fix: Replace nested template literals with string concatenation
- 🔧 Action needed: Manual fix required in index.html