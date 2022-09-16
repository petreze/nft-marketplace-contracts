// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract MarketPlace is ReentrancyGuard {

    enum Status {
        Active,
        Sold,
        Cancelled,
        None
    }

    struct Listing {
        uint id;
        address token;
        address seller;
        address owner;
        uint tokenId;
        uint price;
        Status status;
    }

    struct Offer {
        uint offerId;
        uint listingId;
        address token;
        uint tokenId;
        address offerMadeBy;
        uint offerAmount;
    }

	event Listed(
		uint indexed id,
		uint indexed tokenId,
		address seller,
		address owner,
		address token,
		uint price
	);

	event Sold(
		uint indexed id,
		uint indexed tokenId,
		address seller,
		address owner,
		address token,
		uint price
	);

	event Cancelled(
        uint indexed id,
		address seller,
        address owner
	);

    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _offerIds;

    mapping(uint => Listing) private _listings;
    mapping(uint => Offer) private _listingToOffer;
    mapping(uint => mapping(address => Listing)) private _tokenIdToListing;

    address payable private immutable owner;

    uint FEE = 0.00001 ether;

    constructor() {
        owner = payable(msg.sender);
    }

    function updateListingFee(uint _fee) public {
      require(owner == msg.sender, "Only owner can update the listing fee");
      FEE = _fee;
    }

    function getListingFee() external view returns (uint256) {
      return FEE;
    }

    function getListedItem(uint listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function initItem(uint tokenId, address token, address tokenOwner) external {
        require(msg.sender == token, "Caller should be the owner of the marketplace");
        
        _itemIds.increment();
        uint id = _itemIds.current();

        _tokenIdToListing[tokenId][token] = Listing(
            id,
            token,
            address(0),
            tokenOwner,
            tokenId,
            0,
            Status.None
        );
    }

    function listItem(address token, uint tokenId, uint price) external payable nonReentrant {
        require(price > 0, "Price should be more than 0");
        require(msg.value >= FEE, "Not enough funds to cover the listing fee");

        IERC721(token).transferFrom(msg.sender, address(this), tokenId);

        Listing storage listing = _tokenIdToListing[tokenId][token];
        listing.seller = msg.sender;
        listing.owner = address(this);
        listing.price = price;
        listing.status = Status.Active;


        _listings[listing.id] = Listing(
            listing.id,
            listing.token,
            listing.seller,
            listing.owner,
            listing.tokenId,
            listing.price,
            listing.status
        );

        emit Listed(
            listing.id,
			listing.tokenId,
			listing.seller,
			listing.owner,
			listing.token,
			listing.price
		);
    }

    function buyItem(uint listingId) external payable nonReentrant {
        
        Listing storage listing = _listings[listingId];

        require(msg.sender != listing.seller, "Seller cannot buy its own item");
        require(listing.status == Status.Active, "Listing is not active");
        require(msg.value >= listing.price, "Buyer did not send enough funds to buy the item");

        IERC721(listing.token).transferFrom(address(this), msg.sender, listing.tokenId);
        payable(listing.seller).transfer(listing.price);
        owner.transfer(FEE);

        listing.owner = msg.sender;
        listing.status = Status.Sold;
        
        emit Sold(
            listing.id,
            listing.tokenId,
            listing.seller,
            listing.owner,
            listing.token,
            listing.price
        );
    }

    function cancelListedItem(uint listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];

        require(listing.seller == msg.sender, "Only the seller can cancel the listing of his item");
        require(listing.status == Status.Active, "Listing is not active");

        IERC721(listing.token).transferFrom(address(this), msg.sender, listing.tokenId);

        listing.status = Status.Cancelled;
        listing.owner = msg.sender;

        emit Cancelled(
            listingId,
            msg.sender,
            address(this)
        );
    }

    function getAllItems() external view returns (Listing[] memory) {
        uint itemsCount = _itemIds.current();
        Listing[] memory items = new Listing[](itemsCount);
        uint currentIndex = 0;

        for(uint i = 0; i < itemsCount; i++) {
            Listing storage currentItem = _listings[i + 1];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }

    //could be used for the caller => (itemsOwner == msg.sender)
    function getItemsOf(address itemsOwner) external view returns (Listing[] memory) {

        uint totalItemsCount = _itemIds.current();
        uint itemCount = 0;

        //Important to get a count of all the NFTs that belong to the user before we can make an array for them
        for(uint i = 0; i < totalItemsCount; i++) {
            Listing storage currentListing = _listings[i + 1];
            
            if(currentListing.owner == itemsOwner || currentListing.seller == itemsOwner){
                itemCount += 1;
            }
        }

        //Once you have the count of relevant NFTs, create an array then store all the NFTs in it
        Listing[] memory items = new Listing[](itemCount);
        uint currentIndex = 0;
        
        for(uint i=0; i < totalItemsCount; i++) {
            Listing storage currentListing = _listings[i + 1];

            if (currentListing.seller == itemsOwner || currentListing.owner == itemsOwner) {
                items[currentIndex] = currentListing;
                currentIndex++;
            }

        }
        return items;
    }

    function makeAnOffer(uint tokenId, address token, uint offerAmount) external {

        Listing storage listing = _tokenIdToListing[tokenId][token];

        require(listing.status != Status.Active, "An offer can be made only to non active item");
        require(listing.owner != msg.sender, "The caller cannot make an offer to his own item");

        _offerIds.increment();
        uint id = _offerIds.current();

        _listingToOffer[listing.id] = Offer(
            id,
            listing.id,
            listing.token,
            listing.tokenId,
            msg.sender,
            offerAmount
        );
    }

    function acceptOffer(uint tokenId, address token) external payable nonReentrant {
        Listing storage listing = _tokenIdToListing[tokenId][token];
        Offer storage offer = _listingToOffer[listing.id];
        
        require(listing.owner == msg.sender, "Caller should be the seller of the item");
        require(listing.status != Status.Active, "An offer cannot be accepted if the item is listed");

        IERC721(listing.token).transferFrom(listing.owner, offer.offerMadeBy, listing.tokenId);
        payable(listing.owner).transfer(offer.offerAmount);
        owner.transfer(FEE);

        emit Sold(
            listing.id,
            listing.tokenId,
            listing.seller,
            listing.owner,
            listing.token,
            listing.price
        );
    }
}