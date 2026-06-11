import re

with open('index_v2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find products section (starts with <section id="products" and ends with </section>)
products_match = re.search(r'<section id="products".*?</section>', content, flags=re.DOTALL)
products_str = products_match.group(0)

# Find works section
works_match = re.search(r'<section id="works".*?</section>', content, flags=re.DOTALL)
works_str = works_match.group(0)

# Remove the original works section from its place
content = content.replace(works_str, '')

# We will replace the products section with the works section
# But first we need to inject PATCHBLE into the works section

patchble_html = '''                            <!-- PATCHBLE -->
                            <div class="works-product-row-v2">
                                <a href="https://patchble.com/" target="_blank" rel="noopener noreferrer" class="works-logo-link-v2">
                                    <div class="works-product-logo-v2" style="font-weight: 800; font-size: 13px; letter-spacing: -0.5px; display: flex; align-items: center; justify-content: center; height: 100%; color: #111;">
                                        PATCHBLE
                                    </div>
                                </a>
                                <div class="works-product-info-v2">
                                    <h3><a href="https://patchble.com/" target="_blank" rel="noopener noreferrer" class="works-title-link-v2">PATCHBLE<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="external-icon-v2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></h3>
                                    <p>経営課題診断から日次タスクまで一貫して支援する経営改善実行OS。</p>
                                </div>
                                <div class="works-product-meta-v2 meta-misc">
                                    <span class="works-meta-label-v2">新規開発</span>
                                    <div class="works-meta-value-badge-v2">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7V12L15 15"/></svg>
                                        <span class="works-meta-value-v2">約 4 週間</span>
                                    </div>
                                </div>
                            </div>
'''

# Insert patchble after DIFFsense
works_str_modified = works_str.replace('<!-- MERKI -->', patchble_html + '                            <!-- MERKI -->')

# Replace "WORKS" eyebrow with "PRODUCTS & WORKS" or "自社開発プロダクト"
works_str_modified = works_str_modified.replace('<p class="works-eyebrow-v2">WORKS</p>', '<p class="works-eyebrow-v2">PRODUCTS & WORKS</p>')

# Now replace the products section with the updated works section
content = content.replace(products_str, works_str_modified)

with open('index_v2.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Merged successfully!")
