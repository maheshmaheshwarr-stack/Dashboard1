#!/usr/bin/env python3
"""
Fix the syntax error in index.html by replacing nested template literals
with simple string concatenation.
"""

import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic section
# Look for the showTamilModal function and fix the nested template literals

old_pattern = r"const tamilContent = language === 'ta' \? `[\s\S]*?` : `[\s\S]*?`;"

new_code = """// Build content without nested template literals
      let tamilContent = '';
      
      if (language === 'ta') {
        tamilContent = '<div style="margin-bottom: 20px;">';
        tamilContent += '<h3 style="color: #1e40af; margin-bottom: 12px; line-height: 1.4;">' + decodedTitle + '</h3>';
        
        if (isAuthentic) {
          tamilContent += '<div style="background: #dcfce7; border-left: 4px solid #059669; padding: 16px; margin-bottom: 16px; border-radius: 8px;">';
          tamilContent += '<h4 style="color: #059669; margin-bottom: 8px; font-size: 1rem;">✅ முழுமையான தமிழ் செய்தி</h4>';
          tamilContent += '<p style="line-height: 1.6; color: #374151; margin-bottom: 12px;">இது தமிழ் மூலங்களில் இருந்து வரும் முழுமையான தமிழ் செய்தி. நம்பகமான தமிழ் ஊடகங்களின் அசல் உள்ளடக்கம்.</p>';
          tamilContent += '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">';
          tamilContent += '<span style="background: #dcfce7; color: #059669; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">🇮🇳 தமிழ் அசல்</span>';
          tamilContent += '<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">✅ நம்பகமான</span>';
          tamilContent += '</div></div>';
        } else {
          tamilContent += '<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px; border-radius: 8px;">';
          tamilContent += '<h4 style="color: #d97706; margin-bottom: 8px; font-size: 1rem;">📰 மொழிபெயர்க்கப்பட்ட செய்தி</h4>';
          tamilContent += '<p style="line-height: 1.6; color: #374151; margin-bottom: 12px;">இந்த செய்தி ஆங்கில மூலத்திலிருந்து தமிழுக்கு மொழிபெயர்க்கப்பட்டுள்ளது.</p>';
          tamilContent += '</div>';
        }
        
        tamilContent += '<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px;">';
        tamilContent += '<h4 style="color: #1e40af; margin-bottom: 8px; font-size: 0.9rem;">🔍 இந்த செய்தியில்:</h4>';
        tamilContent += '<ul style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-left: 16px;">';
        
        if (isAuthentic) {
          tamilContent += '<li>முழு செய்தி தமிழில் கிடைக்கும்</li>';
          tamilContent += '<li>நம்பகமான தமிழ் ஊடக மூலங்கள்</li>';
        } else {
          tamilContent += '<li>ஆங்கில மூலத்திலிருந்து மொழிபெயர்ப்பு</li>';
          tamilContent += '<li>சர்வதேச செய்தி தமிழில்</li>';
        }
        
        tamilContent += '</ul></div></div>';
      } else {
        tamilContent = '<div style="margin-bottom: 20px;">';
        tamilContent += '<h3 style="color: #1e40af; margin-bottom: 12px; line-height: 1.4;">[' + t.name + '] ' + decodedTitle + '</h3>';
        tamilContent += '<p style="line-height: 1.6; margin-bottom: 16px; color: #374151;">இந்த கட்டுரை ' + t.name + ' மொழியில் கிடைக்கிறது.</p>';
        tamilContent += '</div>';
      }"""

# Try to replace
try:
    new_content = re.sub(old_pattern, new_code, content, count=1)
    
    if new_content != content:
        # Write back
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("✅ Successfully fixed the syntax error!")
        print("The nested template literals have been replaced with string concatenation.")
    else:
        print("❌ Pattern not found. Manual fix required.")
        print("Please check SYNTAX_FIX_INSTRUCTIONS.md for manual fix instructions.")
except Exception as e:
    print(f"❌ Error: {e}")
    print("Manual fix required. See SYNTAX_FIX_INSTRUCTIONS.md")
