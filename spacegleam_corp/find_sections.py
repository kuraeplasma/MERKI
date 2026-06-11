with open('index_v2.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

products_start = -1
products_end = -1
works_start = -1
works_end = -1

for i, line in enumerate(lines):
    if '<section id="products"' in line:
        products_start = i
    if products_start != -1 and products_end == -1 and '</section>' in line and i > products_start:
        products_end = i
    if '<section id="works"' in line or 'works-section-v2' in line:
        works_start = i
    if works_start != -1 and works_end == -1 and '</section>' in line and i > works_start + 50:
        works_end = i

print(f'Products: {products_start} to {products_end}')
print(f'Works: {works_start} to {works_end}')
