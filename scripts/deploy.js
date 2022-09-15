// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function deployNftMarketplaceContract() {
  await hre.run('compile');

  const marketPlaceFactory = await ethers.getContractFactory("MarketPlace");
  const marketPlace = await marketPlaceFactory.deploy();
  await marketPlace.deployed();

  const marketItemFactory = await ethers.getContractFactory("MarketItem");
  const marketItem = await marketItemFactory.deploy(marketPlace.address);
  await marketItem.deployed();

  await hre.run('print', { 
    marketPlaceAddress: marketPlace.address,
    marketItemAddress: marketItem.address
  });

  /* await hre.run("verify:verify", {
    address: marketPlace.address,
  }); */
}

module.exports = deployNftMarketplaceContract;