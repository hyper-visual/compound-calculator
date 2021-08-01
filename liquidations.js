import readline from "readline";
// const axios = require("axios");
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import "isomorphic-fetch";

const readUserInput = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

const thegraph_url =
  "https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2";

const Query = `
	  query {
	    markets(where: {symbol_in: ["cETH", "cDAI", "cUSDC", "cBAT", "cREP", "cZRX", "cWBTC"]}, orderBy: symbol) {
        symbol
        accrualBlockNumber
        collateralFactor
        underlyingPrice
        underlyingSymbol
      }
	  }
	`;

const setPrice = (data, assetPrice) => {
  const marketArray = data.data.markets;
  for (let i = 0; i < marketArray.length; i++) {
    // 같은 symbol에 대해 결과가 여러 개 들어있을 수 있어서 query날릴 때 orderby: symbol로 설정하여 같은 symbol들의 결과 붙어있게 정렬
    // 붙어있는 같은 symbol의 결과들 중에서 가장 최신의 underlying price를 저장
    if (
      i === 0 ||
      marketArray[i].symbol !== marketArray[i - 1].symbol ||
      marketArray[i].accurateBlockNumber >
        marketArray[i - 1].accurateBlockNumber
    ) {
      assetPrice[`${marketArray[i].underlyingSymbol.toLowerCase()}`] =
        parseFloat(marketArray[i].underlyingPrice);
    }
  }
  return assetPrice;
};

const getLiqPrice = async () => {
  let selectedAssets_s = await readUserInput(
    "Which asset do you want to supply?('eth', 'dai', 'usdc', 'bat', 'rep', 'zrx', 'wbtc') : "
  );

  // getSupply()
  let supplyq = parseFloat(
    await readUserInput("How much do you want to supply? : ")
  );

  // fetch assets prices
  let assets_prices = {};

  const client = new ApolloClient({
    uri: thegraph_url,
    cache: new InMemoryCache(),
  });

  client
    .query({
      query: gql(Query),
    })
    .then((data) => {
      assets_prices = setPrice(data, assets_prices);
    })
    .catch((err) => {
      console.log("Error fetching data: ", err);
    });

  // getBorrowPrice()
  let selectedAssets_b = await readUserInput(
    "Which asset do you want to borrow?('eth', 'dai', 'usdc', 'bat', 'rep', 'zrx', 'wbtc') : "
  );

  // getBorrow()
  let borrowq = parseFloat(
    await readUserInput("How much do you want to borrow? : ")
  );

  // getSupplyPrice()
  let supply_price = assets_prices[selectedAssets_s];
  let borrow_price = assets_prices[selectedAssets_b];

  let collateral_ratio =
    (supplyq * supply_price * 1) / (borrowq * borrow_price);

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
  let liq_value = (supplyq * supply_price * liq_ratio) / collateral_ratio;
  let liqprice = liq_value / supplyq;

  if (liqprice < supply_price) {
    console.log(
      `Your current collateral ratio is ${(collateral_ratio * 100).toFixed(2)}%`
    );
    console.log(
      `"Your loan will be liquidated if ${selectedAssets_s.toUpperCase()} falls below $${liqprice.toFixed(
        3
      )} (Collateral value < $${liq_value.toFixed(0)})`
    );
  } else {
    console.log("Your loan is under collateralized.");
    console.log(
      `Your current collateral ratio is ${(collateral_ratio * 100).toFixed(2)}`
    );
  }
};

getLiqPrice();
