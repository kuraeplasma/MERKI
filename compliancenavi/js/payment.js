import { db, collection, addDoc, ORDERS_COLLECTION, getDoc, doc, PRODUCTS_COLLECTION, auth, analytics, logEvent } from './firebase-config.js?v=20260206_AnalyticsEnabled';

// Configuration
const PRODUCT_ID = 'xdraft_license'; // CRITICAL: This ID must exist in Firestore "products" collection

export function initPayment(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof paypal === 'undefined') {
        container.innerHTML = '<p style="color:red">PayPal SDK failed to load.</p>';
        return;
    }

    paypal.Buttons({
        createOrder: async function (data, actions) {
            try {
                // 1. Verify Price from Firestore
                const docRef = doc(db, PRODUCTS_COLLECTION, PRODUCT_ID);
                const snap = await getDoc(docRef);

                if (!snap.exists()) {
                    throw new Error(`Product not found: ${PRODUCT_ID}`);
                }

                const productData = snap.data();
                const priceStr = productData.price; // e.g., "¥1,000" or 1000
                const price = typeof priceStr === 'number' ? priceStr : parseInt(priceStr.replace(/[^\d]/g, ''), 10);

                if (!price || price <= 0) {
                    throw new Error('Invalid price data');
                }

                console.log(`Verified Price for ${PRODUCT_ID}: ${price}`);

                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: price,
                            currency_code: 'JPY'
                        },
                        description: `X Draft License (${PRODUCT_ID})`
                    }]
                });

            } catch (error) {
                console.error("Order Creation Error:", error);
                alert("お支払いの準備に失敗しました。管理者にお問い合わせください。");
                throw error;
            }
        },
        onApprove: async function (data, actions) {
            try {
                const details = await actions.order.capture();
                console.log("Payment Successful:", details);

                // Track Purchase Event
                try {
                    const paidAmount = details.purchase_units[0].amount.value;
                    logEvent(analytics, 'purchase', {
                        transaction_id: details.id,
                        value: paidAmount,
                        currency: 'JPY',
                        items: [{
                            item_id: PRODUCT_ID,
                            item_name: 'X Draft License',
                            price: paidAmount
                        }]
                    });
                } catch (e) {
                    console.error("Analytics Error:", e);
                }

                // Show processing UI
                container.innerHTML = '<p>Processing payment... checking license...</p>';

                await saveOrder(details);

                // Show Success / Download UI
                showDownloadUI(container);

            } catch (error) {
                console.error("Capture Error:", error);
                alert("支払いは完了しましたが、注文の保存に失敗しました。ID: " + data.orderID);
            }
        },
        onError: function (err) {
            console.error("PayPal Error:", err);
            alert("決済プロセスでエラーが発生しました。");
        }
    }).render('#' + containerId);
}

async function saveOrder(details) {
    const paidAmount = details.purchase_units[0].amount.value;
    const orderId = 'ORD-XD-' + details.id;
    let email = details.payer.email_address;

    if (auth.currentUser) {
        email = auth.currentUser.email;
    }

    // Prepare Order Data
    const orderData = {
        orderId: orderId,
        paypalOrderId: details.id,
        email: email,
        items: [{
            productId: PRODUCT_ID,
            title: 'X Draft License',
            price: paidAmount
        }],
        totalAmount: paidAmount,
        paymentMethod: 'paypal',
        createdAt: new Date(),
        status: 'completed',
        payer: details.payer || {}
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
    console.log("Order saved with ID:", docRef.id);
    return docRef.id;
}

async function showDownloadUI(container) {
    // Retrieve download URL from product (re-fetch to be safe or use cached)
    const docRef = doc(db, PRODUCTS_COLLECTION, PRODUCT_ID);
    const snap = await getDoc(docRef);
    let downloadUrl = "#";

    if (snap.exists()) {
        downloadUrl = snap.data().downloadUrl || "#";
    }

    container.innerHTML = `
        <div style="text-align:center; padding: 20px; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px;">
            <h3 style="color: #15803d; margin-bottom: 10px;">Thank you for your purchase!</h3>
            <p style="margin-bottom: 20px;">決済が完了しました。</p>
            <a href="${downloadUrl}" class="btn primary-btn" target="_blank" style="text-decoration:none;">
                ダウンロード開始
            </a>
            <p style="margin-top: 10px; font-size: 0.9em; color: #64748b;">
                ※ ダウンロードが開始されない場合は、<a href="${downloadUrl}" target="_blank">こちら</a>をクリックしてください。
            </p>
        </div>
    `;
}
