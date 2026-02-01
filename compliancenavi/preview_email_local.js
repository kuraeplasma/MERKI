const DASHBOARD_URL = 'https://merki.spacegleam.co.jp/dashboard.html';

const EMAIL_TEMPLATES = {
    30: {
        subject: '【MERKI】法人税申告の期限まで、あと30日です',
        body: `SpaceGleam株式会社様

MERKIからのご連絡です。

法人税申告の期限が、約30日後に近づいています。

■ 制度名：法人税申告
■ 期限日：2026年3月3日

現時点で対応いただく必要はありませんが、
この時期に一度ご確認いただくことで、
今後の予定が立てやすくなります。

必要な対応がある場合は、
ご自身のタイミングでご準備ください。

▼ ダッシュボードはこちらから
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp`
    },
    7: {
        subject: '【MERKI】法人税申告の期限まで、あと7日です',
        body: `SpaceGleam株式会社様

MERKIからのご連絡です。

法人税申告の期限が、1週間後に迫っています。

■ 制度名：法人税申告
■ 期限日：2026年2月9日

対応が必要な制度の場合は、
このタイミングで準備状況をご確認ください。

期限直前にも、あらためてお知らせいたします。

▼ ダッシュボードはこちらから
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp`
    },
    1: {
        subject: '【MERKI】法人税申告の期限は明日です',
        body: `SpaceGleam株式会社様

MERKIからのご連絡です。

法人税申告の期限は、明日となっています。

■ 制度名：法人税申告
■ 期限日：2026年2月3日

すでに対応済みの場合は、
本メールは読み流していただいて問題ありません。

未対応の場合は、
お時間の許す範囲でご確認ください。

▼ ダッシュボードはこちらから
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp`
    }
};

function preview(days) {
    const template = EMAIL_TEMPLATES[days];
    console.log(`\n========================================`);
    console.log(`【${days}日前通知 プレビュー】`);
    console.log(`FROM: merki@spacegleam.co.jp`);
    console.log(`SUBJECT: ${template.subject}`);
    console.log(`----------------------------------------`);
    console.log(template.body);

    // HTMLシミュレート
    console.log(`\n--- HTML表示時のリンクイメージ ---`);
    const bodyHtml = template.body
        .replace(DASHBOARD_URL, `[${DASHBOARD_URL}]`)
        .replace('https://merki.spacegleam.co.jp', `[https://merki.spacegleam.co.jp]`);
    console.log(`(長いURLはクリック可能なテキストとして表示されます)`);
    console.log(`========================================\n`);
}

const type = process.argv[2] || 30;
preview(parseInt(type));
