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
    // Redirect to Purchase Completion Page for Ad Conversion Tracking
    console.log("Redirecting to purchase_completed.html...");
    window.location.href = 'purchase_completed.html';
}
