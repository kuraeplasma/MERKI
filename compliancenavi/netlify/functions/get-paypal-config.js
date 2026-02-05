exports.handler = async function (event, context) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Adjust for production if needed
        },
        body: JSON.stringify({
            clientId: process.env.PAYPAL_CLIENT_ID || 'sb',
            planIdPro: process.env.PAYPAL_PLAN_ID_PRO || process.env.PAYPAL_PLAN_ID || 'P-PRO-TEST',
            planIdStandard: process.env.PAYPAL_PLAN_ID_STANDARD || 'P-STANDARD-TEST',
            planIdLite: process.env.PAYPAL_PLAN_ID_LITE || 'P-LITE-TEST'
        })
    };
};
