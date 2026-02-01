
import os

def read_file(path):
    encodings = ['utf-8', 'utf-8-sig', 'cp932', 'shift_jis', 'latin-1']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                return f.read(), f.readlines(), enc
        except Exception:
            continue
    return None, None, None

def fix_style_css():
    path = r'd:\AG\compliancenavi\style.css'
    content, lines, enc = read_file(path)
    if not lines:
        print(f'Failed to read style.css with any known encoding')
        return
    
    start_index = -1
    for i, line in enumerate(lines):
        if '/* Pro Features Additions - Refined & Branded */' in line or '/* Pro Features Additions - Minimalist & Brand Aligned */' in line:
            start_index = i
            break
    
    if start_index != -1:
        new_lines = lines[:start_index]
        new_content = """/* Pro Features Additions - Minimalist & Brand Aligned */
.pro-badge {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    vertical-align: middle;
}

/* Minimalist Switch Toggle UI */
.switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    vertical-align: middle;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e2e8f0;
    transition: all 0.3s ease;
    border-radius: 34px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: all 0.3s ease;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input:checked + .slider {
    background: var(--primary-gradient);
}

input:checked + .slider:before {
    transform: translateX(18px);
}

/* Standard Simple Edit Button */
.edit-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.edit-btn:hover {
    background: white;
    border-color: #667eea;
    color: var(--text-primary);
}

.edit-btn svg {
    width: 12px;
    height: 12px;
}

/* Simplified Team Management */
.team-member-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-color);
}

.member-avatar {
    width: 36px;
    height: 36px;
    background: var(--primary-gradient);
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
}

/* Edit Modal Alignment - Clean Brand Theme */
.edit-modal-content {
    max-width: 480px !important;
    padding: 3rem !important;
    text-align: left;
}

.edit-modal-content h2 {
    color: var(--text-primary);
    margin-bottom: 2rem;
    font-size: 1.5rem;
    font-weight: 800;
}

.form-group-pro {
    margin-bottom: 1.5rem;
}

.label-pro-fixed {
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 700;
}

.textarea-pro {
    width: 100%;
    min-height: 120px;
    padding: 1rem;
    border-radius: 12px;
    border: 2px solid var(--border-color);
    font-family: inherit;
    font-size: 0.95rem;
    background-color: #f8fafc;
    color: var(--text-primary);
    transition: all 0.2s;
    resize: none;
}

.textarea-pro:focus {
    outline: none;
    border-color: #667eea;
    background-color: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.btn-group-pro {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
}
"""
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
            f.write(new_content)
        print('Successfully updated style.css')
    else:
        print('Marker not found in style.css')

def fix_dashboard_html():
    path = r'd:\AG\compliancenavi\dashboard.html'
    content, lines, enc = read_file(path)
    if not content:
        print(f'Failed to read dashboard.html')
        return
    
    # Target the duplicated block after the closed modal
    # We look for the second occurrence of 🔔 通知内容の編集
    search_str = '🔔 通知内容の編集'
    occ1 = content.find(search_str)
    occ2 = content.find(search_str, occ1 + 1)
    if occ2 != -1:
         # Find the h2 that contains this second occurrence
         h2_start = content.rfind('<h2', 0, occ2)
         script_start = content.find('<script>', occ2)
         if h2_start != -1 and script_start != -1:
             new_content = content[:h2_start] + "    " + content[script_start:]
             with open(path, 'w', encoding='utf-8') as f:
                 f.write(new_content)
             print('Successfully cleaned up dashboard.html (alt method)')
         else:
             print('Failed to locate h2 or script in dashboard.html')
    else:
        print('Duplicate marker not found in dashboard.html')

if __name__ == '__main__':
    fix_style_css()
    fix_dashboard_html()
