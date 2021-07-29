const readline = require('readline');
const axios = require('axios');

const readUserInput = query => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

const fetchAssetsPrices = async () => {
    let json;
    await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,dai,usd-coin,augur,basic-attention-token,0x,wrapped-bitcoin&vs_currencies=usd'
        ).then(
            resp => {
                json = resp.data;
            }
        );
    return json;
}


const getLiqPrice = async () => {
    let assets = ['eth', 'dai', 'usdc', 'bat', 'rep', 'zrx', 'wbtc'];
    let selectedAssets_s = await readUserInput("Which asset do you want to supply?('eth', 'dai', 'usdc', 'bat', 'rep', 'zrx', 'wbtc') : ");
    
    // getSupply()
    let supplyq = parseFloat(await readUserInput("How much do you want to supply? : "));
    
    // fetch assets prices
    let assets_prices = {};
    let json = await fetchAssetsPrices();
    assets_prices["eth"] = json.ethereum.usd;
    assets_prices["dai"] = json.dai.usd;
    assets_prices["usdc"] = json["usd-coin"].usd;
    assets_prices["bat"] = json["basic-attention-token"].usd;
    assets_prices["rep"] = json.augur.usd;
    assets_prices["zrx"] = json["0x"].usd;
    assets_prices["wbtc"] = json["wrapped-bitcoin"].usd;
    
    // getSupplyPrice()
    let supply_price = assets_prices[selectedAssets_s];

    // getBorrowPrice()
    let selectedAssets_b = await readUserInput("Which asset do you want to borrow?('eth', 'dai', 'usdc', 'bat', 'rep', 'zrx', 'wbtc') : ");
    let borrow_price = assets_prices[selectedAssets_b];
    
    // getBorrow()
    let borrowq = parseFloat(await readUserInput("How much do you want to borrow? : "));

    let collateral_ratio = ((supplyq * supply_price) * 1) / (borrowq * borrow_price);

    // getColfFactor()
    let cf;
    if (selectedAssets_s === "eth" || "usdc" || "dai") {
        cf = 0.75;
    } else if (selectedAssets_s === "bat" || "zrx") {
        cf = 0.6;
    } else if (selectedAssets_s === "rep") {
        cf = 0.5;
    } else if (selectedAssets_s === "wbtc") {
        cf = 0;
    }

    let liq_ratio = 1 / cf;
    let liq_value = ((supplyq * supply_price) * liq_ratio) / collateral_ratio;
    let liqprice = liq_value / supplyq;

    if (liqprice < supply_price) {
        console.log(`Your current collateral ratio is ${(collateral_ratio * 100).toFixed(2)}%`);
        console.log(`"Your loan will be liquidated if ${selectedAssets_s.toUpperCase()} falls below $${liqprice.toFixed(3)} (Collateral value < $${liq_value.toFixed(0)})`);
    } else {
        console.log('Your loan is under collateralized.');
        console.log(`Your current collateral ratio is ${(collateral_ratio * 100).toFixed(2)}`);
    }
}

getLiqPrice();