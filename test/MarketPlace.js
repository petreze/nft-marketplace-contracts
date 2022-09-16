const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");

const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BN } = require('@openzeppelin/test-helpers');
const assert = require("assert");

  
  describe("MarketPlace", () => {

    async function accountsFixture() {
      const [owner, minter, buyer] = await ethers.getSigners();
  
      return { owner, minter, buyer };
    }

    let marketItemFactory;
    let marketItem;
    let marketPlaceFactory;
    let marketPlace;

    let LISTING_FEE = 0.00001;
    let tokenId = new BN(1);
    const PRICE = new BN(10);

    before(async () => {
      
      marketPlaceFactory = await ethers.getContractFactory("MarketPlace");
      marketPlace = await marketPlaceFactory.deploy();
      await marketPlace.deployed();

      marketItemFactory = await ethers.getContractFactory("MarketItem");
      marketItem = await marketItemFactory.deploy(marketPlace.address);
      await marketItem.deployed();
      
      console.log(`marketPlace: ${marketPlace.address}`);
      console.log(`marketItem: ${marketItem.address}`);

    });

    it('should check if the correct tokenURI is returned', async function ()  {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      
      return await marketItem.tokenURI(tokenId.toString()).then(uri => {
        assert.equal(uri, "uri", "URIs does not match the expected one")
      })
    
    });
    
    it('should check if the token is burnt', async function ()  {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      await marketItem.ownerOf(tokenId.toString()).then(owner => {
        assert.equal(owner, minter.address, "Before burn: Owner of ERC721 does not match")
      })

      await marketItem.connect(minter).burn(tokenId.toString());

      //ERC721 token with the following ID should not exist anymore
      expect(marketItem.ownerOf(tokenId.toString())).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
    
    });

    it('should get the proper listing fee before and after updating it', async function ()  {
      const { minter } = await loadFixture(accountsFixture);

      await marketPlace.getListingFee().then(fee => {
        assert.equal(ethers.utils.formatUnits(fee, "ether"), LISTING_FEE.toString(),
          "Listing fee should be 0.00001 ether"
        )
      });
      
      LISTING_FEE = 15000000000000;

      await marketPlace.updateListingFee(ethers.utils.formatUnits(LISTING_FEE.toString(), "wei"));
      
      await marketPlace.getListingFee().then(fee => {
        assert.equal(
          ethers.utils.formatUnits(fee, "ether"), 
          ethers.utils.formatUnits(LISTING_FEE.toString(), "ether"),
          "Listing fee should be 0.0025 ether"
        )
      });
    });

    it('should prevent listing an item with 0 price', async function ()  {
      const { minter } = await loadFixture(accountsFixture);

      expect(marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        0
      )).to.be.revertedWith('Price should be more than 0');
    });

    it('should prevent listing an item due to contract not approved', async function ()  {
      const { minter } = await loadFixture(accountsFixture);

      expect(marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString()
      )).to.be.revertedWith('ERC721: caller is not token owner nor approved');
    });

    it('should list item successfully', async function () {
      const { minter } = await loadFixture(accountsFixture);
      
      await marketItem.connect(minter).mint("uri");

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      await marketPlace.getListedItem(tokenId.toString()).then(item => {
        assert.equal(item.token, marketItem.address, "ERC721 token address does not match");
        assert.equal(item.seller, minter.address, "Seller address does not match");
        assert.equal(item.owner, marketPlace.address, "Owner address does not match");
        assert.equal(item.tokenId, tokenId.toString(), "Token ID does not match");
        assert.equal(item.price, PRICE.toString(), "Item price does not match");
        assert.equal(item.status, 0, "Status does not match");
      });
      
      return marketItem.ownerOf(tokenId.toString()).then(owner => {
        assert.equal(owner, marketPlace.address, 'MarketPlace should be the owner of the item')
      });

    });

    it('should prevent user to buy its own listed item', async function () {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      expect(marketPlace.connect(minter).buyItem(
        tokenId.toString(),
        )).to.be.revertedWith("Seller cannot buy its own item");
    });

    it('should revert because of unsufficient funds', async function () {
      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      expect(marketPlace.connect(buyer).buyItem(
        tokenId.toString(), { 
          value: 1
        }
        )).to.be.revertedWith("Buyer did not send enough funds to buy the item");
    });

    it('buyer should buy the item successfully', async function () {

      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      await marketPlace.connect(buyer).buyItem(
        tokenId.toString(), { 
        value: ethers.utils.parseUnits("0.0001", "ether")
      });

      return marketItem.ownerOf(tokenId.toString()).then(owner => {
        assert.equal(owner, buyer.address, 'Buyer should be the owner of the item')
      })
    });

    it('should prevent user to buy an item which is not listed', async function () {
      
      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      await marketPlace.connect(buyer).buyItem(
        tokenId.toString(), { 
        value: ethers.utils.parseUnits("0.0001", "ether")
      });
      
      expect(marketPlace.connect(buyer).buyItem(
        tokenId, { 
          value: ethers.utils.parseUnits("0.0001", "ether")
        }
      )).to.be.revertedWith("Listing is not active");
    });


    it('should prevent cancelling an item if not called from the seller', async function () {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      expect(marketPlace.cancelListedItem(
        tokenId.toString()
      )).to.be.revertedWith("Only the seller can cancel the listing of his item");
    });

    it('should execute cancellation', async () => {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      await marketPlace.connect(minter).cancelListedItem(
        tokenId.toString()
      );

      return marketItem.ownerOf(tokenId.toString()).then(owner => {
        assert.equal(owner, minter.address, 'Minter should be the owner of the item')
      });
    });

    it('should prevent cancellation - listing is not active', async () => {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");
      //await marketItem.connect(minter).approve(marketPlace.address, tokenId.toString());

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      await marketPlace.connect(minter).cancelListedItem(
        tokenId.toString()
      );
      
      expect(marketPlace.connect(minter).cancelListedItem(
        tokenId.toString()
      )).to.be.revertedWith("Listing is not active");
    });
    
    it('should prevent the caller to make an offer to its own item', async function() {
      const { minter } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");


      expect(marketPlace.connect(minter).makeAnOffer(
        1, marketItem.address, 15
        )).to.be.revertedWith("The caller cannot make an offer to his own item");
    });
    
    it('should prevent making an offer to an already listed item', async function() {
      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      expect(marketPlace.connect(buyer).makeAnOffer(
        1, marketItem.address, 15
        )).to.be.revertedWith("An offer can be made only to non active item");
    });

    it('should prevent caller to accept an offer because he is not the seller', async function() {
      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");


      await marketPlace.connect(buyer).makeAnOffer(1, marketItem.address, 15);
      
      expect(marketPlace.connect(buyer).acceptOffer(
        1, marketItem.address
        )).to.be.revertedWith("Caller should be the seller of the item");
    });

    it('should prevent the caller to accept an offer if the item is listed', async function() {
      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");

      await marketPlace.connect(buyer).makeAnOffer(1, marketItem.address, 15);
      
      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      expect(marketPlace.connect(minter).acceptOffer(
        1, marketItem.address
        )).to.be.revertedWith("An offer cannot be accepted if the item is listed");
    });

    it('the caller should accept an offer', async function() {
      const { minter, buyer } = await loadFixture(accountsFixture);

      await marketItem.connect(minter).mint("uri");

      await marketPlace.connect(buyer).makeAnOffer(1, marketItem.address, 15);      
      await marketPlace.connect(minter).acceptOffer(1, marketItem.address, {
        value: LISTING_FEE.toString()
      });

      return marketItem.ownerOf(tokenId.toString()).then(owner => {
        assert.equal(owner, buyer.address, 'Buyer should be the new owner of the item')
      });
    });

    it('should test `getItemsOf()`', async function() {
      const { minter, buyer} = await loadFixture(accountsFixture);
      
      await marketItem.connect(minter).mint("uri");

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        tokenId.toString(),
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );
      
      await marketItem.connect(minter).mint("uri2");

      await marketPlace.connect(minter).listItem(
        marketItem.address,
        2,
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      let [ item1, item2 ] = await marketPlace.getItemsOf(minter.address);

      //token 1
      assert.equal(item1.id, 1, "Listing id does not match");
      assert.equal(item1.token, marketItem.address, "ERC721 token address does not match");
      assert.equal(item1.seller, minter.address, "Seller of the item does not match");
      assert.equal(item1.owner, marketPlace.address, "Owner should be the marketplace after listing the item");
      assert.equal(item1.tokenId, 1, "TokenId does not match");
      assert.equal(item1.price, PRICE.toString(), "Price does not match");
      assert.equal(item1.status, 0, "Status does not match");
      
      //token 2
      assert.equal(item2.id, 2, "Listing id does not match");
      assert.equal(item2.token, marketItem.address, "ERC721 token address does not match");
      assert.equal(item2.seller, minter.address, "Seller of the item does not match");
      assert.equal(item2.owner, marketPlace.address, "Owner should be the marketplace after listing the item");
      assert.equal(item2.tokenId, 2, "Token id does not match");
      assert.equal(item2.price, PRICE.toString(), "Price does not match");
      assert.equal(item2.status, 0, "Status does not match");


      //minting 3rd token and testing `getAllItems()`
      //should return all listed items including the previous 2 plus the new one
      await marketItem.connect(buyer).mint("uri3");
      
      await marketPlace.connect(buyer).listItem(
        marketItem.address,
        3,
        PRICE.toString(), { 
          value: LISTING_FEE.toString()
        }
      );

      let [ item3, item4, item5 ] = await marketPlace.getAllItems();

      //token 1
      assert.equal(item3.id, 1, "Listing id does not match");
      assert.equal(item3.token, marketItem.address, "ERC721 token address does not match");
      assert.equal(item3.seller, minter.address, "Seller of the item does not match");
      assert.equal(item3.owner, marketPlace.address, "Owner should be the marketplace after listing the item");
      assert.equal(item3.tokenId, 1, "TokenId does not match");
      assert.equal(item3.price, PRICE.toString(), "Price does not match");
      assert.equal(item3.status, 0, "Status does not match");
      
      //token 2
      assert.equal(item4.id, 2, "Listing id does not match");
      assert.equal(item4.token, marketItem.address, "ERC721 token address does not match");
      assert.equal(item4.seller, minter.address, "Seller of the item does not match");
      assert.equal(item4.owner, marketPlace.address, "Owner should be the marketplace after listing the item");
      assert.equal(item4.tokenId, 2, "Token id does not match");
      assert.equal(item4.price, PRICE.toString(), "Price does not match");
      assert.equal(item4.status, 0, "Status does not match");
      
      //token 3
      assert.equal(item5.id, 3, "Listing id does not match");
      assert.equal(item5.token, marketItem.address, "ERC721 token address does not match");
      assert.equal(item5.seller, buyer.address, "Seller of the item does not match");
      assert.equal(item5.owner, marketPlace.address, "Owner should be the marketplace after listing the item");
      assert.equal(item5.tokenId, 3, "Token id does not match");
      assert.equal(item5.price, PRICE.toString(), "Price does not match");
      assert.equal(item5.status, 0, "Status does not match");
      
    });
});