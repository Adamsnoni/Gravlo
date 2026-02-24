export const EXCHANGE_RATES_USD = {
    NGN: 1500, // Nigerian Naira
    ZAR: 19,   // South African Rand
    KES: 135,  // Kenyan Shilling
    GHS: 13.5, // Ghanaian Cedi
    EGP: 48,   // Egyptian Pound
    UGX: 3800, // Ugandan Shilling
    TZS: 2550, // Tanzanian Shilling
    RWF: 1280, // Rwandan Franc
    XOF: 600,  // West African CFA Franc
    XAF: 600,  // Central African CFA
    MAD: 10,   // Moroccan Dirham
    DZD: 134,  // Algerian Dinar
    AOA: 830,  // Angolan Kwanza
    BWP: 13.5, // Botswana Pula
    ZMW: 26,   // Zambian Kwacha
};

// Base prices in USD
export const BASE_PRICES = {
    free: 0,
    pro: 7,
    business: 20
};

export const getSubscriptionPrices = (countryCode, currency) => {
    let multiplier = 1;
    let useExchangeRate = 1;

    // Premium pricing for US and UK (2x base rate)
    if (['US', 'GB'].includes(countryCode)) {
        multiplier = 2; // e.g., $14 for Pro, $40 for Business
    }
    // Conversion for African (or other) countries where we defined a static rate
    else if (EXCHANGE_RATES_USD[currency]) {
        useExchangeRate = EXCHANGE_RATES_USD[currency];
    }
    // For unsupported countries, we simply return the $7 / $20 base.

    return {
        free: 0,
        pro: BASE_PRICES.pro * multiplier * useExchangeRate,
        business: BASE_PRICES.business * multiplier * useExchangeRate
    };
};
