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

  saveMetadataToFE(marketPlace, "MarketPlace");
  saveMetadataToFE(marketItem, "MarketItem");

  /* await hre.run("verify:verify", {
    address: marketPlace.address,
  }); */
}

function saveMetadataToFE(contract, name) {
  const fs = require("fs");
  //const contractsDir = __dirname + "/../fe/contracts";
  const contractsDir = __dirname + "/../../nft-marketplace-fe/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(contractArtifact.abi, null, 2)
  );
}

module.exports = deployNftMarketplaceContract;