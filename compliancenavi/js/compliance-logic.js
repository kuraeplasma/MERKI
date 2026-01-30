// 制度判定・期限計算ロジック（MVP版）

/**
 * MVP対応制度一覧
 * 1. 法人税申告（決算月+2ヶ月）
 * 2. 消費税申告（決算月+2ヶ月）
 * 3. 源泉所得税（毎月10日）
 * 4. 年末調整（12月）
 * 5. 労働保険 年度更新（6月）
 * 6. 算定基礎届（7月）
 */

// 制度マスタデータ（拡張版）
export const COMPLIANCE_ITEMS = [
    // === 税務系 ===
    {
        id: 'corporate_tax',
        category: 'tax',
        title: '法人税申告',
        description: '法人の所得に対する税金の申告',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+2',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'consumption_tax',
        category: 'tax',
        title: '消費税申告',
        description: '消費税の申告（課税/免税判定は行いません）',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+2',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'withholding_tax',
        category: 'tax',
        title: '源泉所得税納付',
        description: '従業員の給与から源泉徴収した税金の納付',
        deadline_type: 'monthly',
        deadline_rule: '10',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'year_end_adjustment',
        category: 'tax',
        title: '年末調整',
        description: '従業員の年間所得税の精算',
        deadline_type: 'yearly',
        deadline_rule: '12',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'fixed_asset_tax',
        category: 'tax',
        title: '固定資産税（償却資産）申告',
        description: '事業用の償却資産に対する固定資産税の申告',
        deadline_type: 'yearly',
        deadline_rule: '1',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'corporate_interim_tax',
        category: 'tax',
        title: '法人税中間申告',
        description: '前年度の法人税額に基づく中間納付',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+8',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'consumption_interim_tax',
        category: 'tax',
        title: '消費税中間申告',
        description: '前年度の消費税額に基づく中間納付',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+8',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'resident_tax',
        category: 'tax',
        title: '法人住民税・事業税申告',
        description: '地方自治体への法人税の申告',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+2',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },

    // === 労務系 ===
    {
        id: 'labor_insurance',
        category: 'labor',
        title: '労働保険 年度更新',
        description: '労働保険料の年度更新手続き',
        deadline_type: 'yearly',
        deadline_rule: '6',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'pension_report',
        category: 'labor',
        title: '算定基礎届',
        description: '社会保険料の算定基礎となる報酬月額の届出',
        deadline_type: 'yearly',
        deadline_rule: '7',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'bonus_payment_report',
        category: 'labor',
        title: '賞与支払届',
        description: '賞与を支払った際の社会保険料の届出',
        deadline_type: 'event_based',
        deadline_rule: '5days',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'health_checkup',
        category: 'labor',
        title: '定期健康診断実施',
        description: '従業員の定期健康診断の実施義務',
        deadline_type: 'yearly',
        deadline_rule: '9',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'stress_check',
        category: 'labor',
        title: 'ストレスチェック実施',
        description: '従業員50名以上の事業所でのストレスチェック',
        deadline_type: 'yearly',
        deadline_rule: '11',
        company_type: 'corporation',
        industry: null,
        employee_condition: '50+'
    },
    {
        id: 'employment_insurance_report',
        category: 'labor',
        title: '雇用保険料申告',
        description: '雇用保険料の申告・納付',
        deadline_type: 'yearly',
        deadline_rule: '6',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },

    // === 社会保険・労働関連 ===
    {
        id: 'social_insurance_payment',
        category: 'labor',
        title: '社会保険料納付',
        description: '健康保険・厚生年金保険料の納付',
        deadline_type: 'monthly',
        deadline_rule: '末日',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: '36_agreement',
        category: 'labor',
        title: '36協定届出',
        description: '時間外労働・休日労働に関する協定の届出',
        deadline_type: 'yearly',
        deadline_rule: '3',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },

    // === その他重要な届出 ===
    {
        id: 'corporate_registration',
        category: 'other',
        title: '法人登記事項変更',
        description: '会社の登記事項に変更があった場合の届出',
        deadline_type: 'event_based',
        deadline_rule: '2weeks',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'financial_statement',
        category: 'other',
        title: '決算公告',
        description: '株式会社の決算公告義務',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+3',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'tax_payment_report',
        category: 'tax',
        title: '法定調書合計表提出',
        description: '給与・報酬等の支払調書の提出',
        deadline_type: 'yearly',
        deadline_rule: '1',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'withholding_slip',
        category: 'tax',
        title: '源泉徴収票交付',
        description: '従業員への源泉徴収票の交付',
        deadline_type: 'yearly',
        deadline_rule: '1',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'residence_tax_payment',
        category: 'tax',
        title: '住民税特別徴収納付',
        description: '従業員の住民税の納付',
        deadline_type: 'monthly',
        deadline_rule: '10',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'business_tax',
        category: 'tax',
        title: '事業所税申告',
        description: '一定規模以上の事業所に課される税金',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+2',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'annual_report',
        category: 'other',
        title: '事業報告書提出',
        description: '株主総会後の事業報告書の提出',
        deadline_type: 'relative',
        deadline_rule: 'fiscal_month+3',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },
    {
        id: 'corporate_number_notification',
        category: 'other',
        title: '法人番号変更届',
        description: '法人番号に関する変更の届出',
        deadline_type: 'event_based',
        deadline_rule: '速やかに',
        company_type: 'corporation',
        industry: null,
        employee_condition: null
    },

    // === 個人事業主・フリーランス向け ===
    {
        id: 'income_tax_return',
        category: 'tax',
        title: '所得税確定申告',
        description: '1年間の所得に対する税金の申告',
        deadline_type: 'yearly_range',
        deadline_rule: '2/16-3/15',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'consumption_tax_sole',
        category: 'tax',
        title: '消費税確定申告（個人）',
        description: '個人事業主の消費税申告',
        deadline_type: 'yearly',
        deadline_rule: '3/31',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'individual_enterprise_tax_1',
        category: 'tax',
        title: '個人事業税（第1期）',
        description: '都道府県に納める事業税（第1期）',
        deadline_type: 'yearly',
        deadline_rule: '8/31',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'individual_enterprise_tax_2',
        category: 'tax',
        title: '個人事業税（第2期）',
        description: '都道府県に納める事業税（第2期）',
        deadline_type: 'yearly',
        deadline_rule: '11/30',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'resident_tax_sole_1',
        category: 'tax',
        title: '住民税（普通徴収・第1期）',
        description: '市区町村民税・都道府県民税（第1期）',
        deadline_type: 'yearly',
        deadline_rule: '6/30',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'resident_tax_sole_2',
        category: 'tax',
        title: '住民税（普通徴収・第2期）',
        description: '市区町村民税・都道府県民税（第2期）',
        deadline_type: 'yearly',
        deadline_rule: '8/31',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'resident_tax_sole_3',
        category: 'tax',
        title: '住民税（普通徴収・第3期）',
        description: '市区町村民税・都道府県民税（第3期）',
        deadline_type: 'yearly',
        deadline_rule: '10/31',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    },
    {
        id: 'resident_tax_sole_4',
        category: 'tax',
        title: '住民税（普通徴収・第4期）',
        description: '市区町村民税・都道府県民税（第4期）',
        deadline_type: 'yearly',
        deadline_rule: '1/31',
        company_type: 'sole',
        industry: null,
        employee_condition: null
    }
];

/**
 * 制度判定ロジック
 * @param {Object} userData - ユーザー情報
 * @returns {Array} - 該当する制度の配列
 */
export function getApplicableCompliances(userData) {
    const { company_type, industry, employee_size } = userData;

    let items = COMPLIANCE_ITEMS.filter(item => {
        // 会社種別チェック
        if (item.company_type && item.company_type !== company_type) {
            return false;
        }

        // 業種チェック（nullの場合は全業種対象）
        if (item.industry && item.industry !== industry) {
            return false;
        }

        // 従業員数チェック（nullの場合は全規模対象）
        if (item.employee_condition && item.employee_condition !== employee_size) {
            return false;
        }

        return true;
    });

    // --- 追加ロジック: 消費税免税判定 ---
    // 設立年月日があり、かつ設立から2年（24ヶ月）以内の場合、消費税関連を除外
    if (userData.incorporation_date) {
        const incDate = userData.incorporation_date instanceof Date
            ? userData.incorporation_date
            : userData.incorporation_date.toDate(); // Firestone Timestamp check

        const now = new Date();
        const monthsSinceInc = (now.getFullYear() - incDate.getFullYear()) * 12 + (now.getMonth() - incDate.getMonth());

        // 簡易判定: 設立後24ヶ月以内なら免税とみなす
        // ※実際は事業年度単位ですが、MVPとして期間で判定
        if (monthsSinceInc < 24) {
            return items.filter(item =>
                item.id !== 'consumption_tax' &&
                item.id !== 'consumption_interim_tax'
            );
        }
    }

    return items;
}

/**
 * 期限計算ロジック
 * @param {Object} item - 制度アイテム
 * @param {Object} userData - ユーザー情報
 * @returns {Date} - 次回期限日
 */
export function calculateDeadline(item, userData) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (item.deadline_type === 'relative') {
        // 決算月ベース（例：決算月+2ヶ月）
        const fiscalMonth = userData.fiscal_month || 3; // デフォルト3月決算
        const offset = parseInt(item.deadline_rule.split('+')[1]);

        let deadlineMonth = fiscalMonth + offset;
        let deadlineYear = currentYear;

        // 12月を超える場合の調整
        if (deadlineMonth > 12) {
            deadlineMonth -= 12;
            deadlineYear += 1;
        }

        const deadline = new Date(deadlineYear, deadlineMonth - 1, 1);

        // 過去の日付の場合は翌年
        if (deadline < now) {
            deadline.setFullYear(deadlineYear + 1);
        }

        return deadline;

    } else if (item.deadline_type === 'monthly') {
        // 毎月指定日（例：毎月10日）または月末
        if (item.deadline_rule === '末日') {
            // 月末の場合
            let deadline = new Date(currentYear, currentMonth, 0); // 当月末日
            if (deadline < now) {
                deadline = new Date(currentYear, currentMonth + 1, 0); // 翌月末日
            }
            return deadline;
        } else {
            const day = parseInt(item.deadline_rule);
            let deadline = new Date(currentYear, currentMonth - 1, day);

            // 過去の日付の場合は翌月
            if (deadline < now) {
                deadline = new Date(currentYear, currentMonth, day);
            }

            return deadline;
        }

    } else if (item.deadline_type === 'yearly') {
        // 毎年指定月（例：毎年6月）
        const month = parseInt(item.deadline_rule);
        let deadline = new Date(currentYear, month - 1, 1);

        // 過去の日付の場合は翌年
        if (deadline < now) {
            deadline.setFullYear(currentYear + 1);
        }

        return deadline;

    } else if (item.deadline_type === 'event_based') {
        // イベントベース（参考情報として表示）
        // 実際の期限は個別に判断が必要
        return new Date(currentYear, currentMonth, 1);
    }

    return new Date();
}

/**
 * 通知が必要かチェック
 * @param {Date} deadline - 期限日
 * @param {number} daysBefore - 何日前か
 * @returns {boolean} - 通知が必要ならtrue
 */
export function shouldNotify(deadline, daysBefore) {
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    return daysUntil === daysBefore;
}

/**
 * 免責事項テキスト
 */
export const DISCLAIMER_TEXT = `
本サービスは、一般的な制度情報をもとに
期限を通知するリマインドサービスです。
正確な対応内容や最終判断は、
利用者ご自身または専門家にご確認ください。
`.trim();
