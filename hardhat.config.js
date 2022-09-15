require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");


/* const config: HardhatUserConfig = {
  solidity: "0.8.0",
};

export default config; */

module.exports = {
  solidity: {
    version: "0.8.1",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/cbd7a030c41f474ead18fed833b6acab",
      accounts: ['b8d0a4e0592db1c3e01de62ffc39915de38acc4d41b2e2331dcd4eb733d4973f']
    }
  },
  etherscan: {
    apiKey: "ZP5RNZM5HNIMDKYX2QYAAXS8CSU3644CPK"
  },  
};

task("deploy", "Deploys contract on a provided network")
    .setAction(async () => {
        const deployNftMarketplaceContract = require("./scripts/deploy");
        await deployNftMarketplaceContract();
});

subtask("print", "Prints useful information after deployment")
    .addParam("marketPlaceAddress", "The address of the MarketPlace contract after deployment")
    .addParam("marketItemAddress", "The address of the MarketItem contract after deployment")
    .setAction(async (taskArgs) => {
      console.log(`MarketPlace address: ${taskArgs.marketPlaceAddress}`);
      console.log(`MarketItem address: ${taskArgs.marketItemAddress}`);
      console.log('Deployment successfull!');
    });