import re

file_path = "index_v2.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace MVP keywords
content = re.sub(r'MVP開発', 'AI業務システム開発', content)
content = re.sub(r'MVP構築', 'AI業務システム構築', content)
content = re.sub(r'MVP制作', 'AI業務システム開発', content)

# 2. Hero copy
hero_h1_old = r'<h1><span class="nowrap">アイデアを、</span><br class="pc-only"><span class="nowrap">最短距離で</span><span class="nowrap">事業にする。</span></h1>'
hero_h1_new = '<h1><span class="nowrap">AI業務システムを</span><br class="pc-only"><span class="nowrap">2〜8週間で開発</span></h1>'
content = content.replace(hero_h1_old, hero_h1_new)

hero_lead_old = r'<p class="hero-lead">\s*SPACE GLEAMは, AIを活用した.*?要件整理からプロトタイプ構築, 初期リリースまで伴走します。\s*</p>'
hero_lead_new = '<p class="hero-lead">チャットボット・管理画面・業務自動化・AI分析まで一貫対応<br><br><span style="font-size: 0.9em; opacity: 0.9; display: inline-block; margin-top: 10px;">企画・設計・開発・運用まで対応。<br>中小企業から新規事業まで、実運用を前提としたAIシステムを構築します。</span></p>'
content = re.sub(hero_lead_old, hero_lead_new, content, flags=re.DOTALL)

# 3. Add 自社開発プロダクト section before pricing
self_products_section = '''
        <section id="products" class="section products-section" style="background-color: #f9fafb; padding: 80px 0;">
            <div class="container products-container reveal">
                <div class="services-header" style="text-align: center; margin-bottom: 50px;">
                    <p class="eyebrow-accent">PRODUCTS</p>
                    <h2 class="services-title">自社開発プロダクト</h2>
                    <p class="services-lead">
                        SPACE GLEAMでは受託開発だけでなく、自社サービスの企画・開発・運営も行っています。
                    </p>
                </div>
                
                <div class="service-cards-v2" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; padding: 0 15px;">
                    <article class="service-card-v2" style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                        <img src="diffsense_logo_fixed.png" alt="DIFFsense" style="height: 32px; margin-bottom: 20px; object-fit: contain; width: auto; align-self: flex-start;">
                        <h3 style="font-size: 1.25rem; margin-bottom: 15px; font-weight: 700;">契約管理AI</h3>
                        <p class="service-card-desc" style="margin-bottom: 25px; flex-grow: 1; font-size: 0.95rem; line-height: 1.6; color: #4b5563;">
                            契約比較 / リスク分析 / 期限管理 / 電子署名対応
                        </p>
                        <a href="https://diffsense.spacegleam.co.jp/" target="_blank" rel="noopener" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 4px;">サービスを見る <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
                    </article>
                    
                    <article class="service-card-v2" style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                        <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 20px; line-height: 32px;">PATCHBLE</h3>
                        <h3 style="font-size: 1.25rem; margin-bottom: 15px; font-weight: 700;">経営改善実行OS</h3>
                        <p class="service-card-desc" style="margin-bottom: 25px; flex-grow: 1; font-size: 0.95rem; line-height: 1.6; color: #4b5563;">
                            経営課題診断 / 実行計画作成 / 日次タスク管理 / 経営レポート生成
                        </p>
                        <a href="https://patchble.com/" target="_blank" rel="noopener" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 4px;">サービスを見る <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
                    </article>

                    <article class="service-card-v2" style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                        <img src="merki_logo.png" alt="MERKI" style="height: 32px; margin-bottom: 20px; object-fit: contain; width: auto; align-self: flex-start;">
                        <h3 style="font-size: 1.25rem; margin-bottom: 15px; font-weight: 700;">契約期限管理システム</h3>
                        <p class="service-card-desc" style="margin-bottom: 25px; flex-grow: 1; font-size: 0.95rem; line-height: 1.6; color: #4b5563;">
                            契約更新通知 / 期限管理 / メール通知
                        </p>
                        <a href="https://merki.spacegleam.co.jp/" target="_blank" rel="noopener" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 4px;">サービスを見る <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
                    </article>

                    <article class="service-card-v2" style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                        <img src="xdraft_logo.png" alt="XDraft" style="height: 32px; margin-bottom: 20px; object-fit: contain; width: auto; align-self: flex-start;">
                        <h3 style="font-size: 1.25rem; margin-bottom: 15px; font-weight: 700;">SNS運用支援ツール</h3>
                        <p class="service-card-desc" style="margin-bottom: 25px; flex-grow: 1; font-size: 0.95rem; line-height: 1.6; color: #4b5563;">
                            投稿作成 / 予約管理 / 運用支援
                        </p>
                        <a href="https://xdraft.spacegleam.co.jp/" target="_blank" rel="noopener" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 4px;">サービスを見る <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
                    </article>
                </div>
            </div>
        </section>
'''

content = content.replace('<section id="pricing"', self_products_section + '\n        <section id="pricing"')

# 4. Modify Works Section Title
# The actual section title in works is "開発事例" or similar.
# Let's check index_v2.html lines around works. In the works section (which doesn't exist explicitly with <section id="works"> but there is works logic), wait, the works are on line 800+. Let's look for "開発事例" and replace with "開発・運営実績"
content = content.replace('開発事例', '開発・運営実績')

# 5. Fix titles for AI keywords
# "AI プロダクト開発" -> "AI業務システム開発"
content = re.sub(r'AI プロダクト開発', 'AI業務システム開発', content)
content = re.sub(r'AI MVP開発', 'AI業務システム開発', content) 

# Write back
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
