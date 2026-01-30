exports.handler = async function (event, context) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Adjust for production if needed
        },
        body: JSON.stringify({
            clientId: process.env.PAYPAL_CLIENT_ID || 'sb', // Default to sandbox if missing
            planId: process.env.PAYPAL_PLAN_ID || 'P-MOCK_PLAN_ID'
        })
    };
};
