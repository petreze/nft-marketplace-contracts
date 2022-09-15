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
        Cancelled
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
    Counters.Counter private _listingsIds;
    Counters.Counter private _soldItems;

    mapping(uint => Listing) private _listings;
    mapping(address => uint16) private _ownerToItemsCount;
    mapping(address => mapping(uint => uint)) private _userToItemOffer;

    address payable private owner;

    uint FEE = 0.00001 ether;

    constructor() {
        owner = payable(msg.sender);
    }

    function updateListingFee(uint _fee) public {
      require(owner == msg.sender, "Only owner can update the listing fee");
      FEE = _fee;
    }

    function getListingFee() public view returns (uint256) {
      return FEE;
    }

    function getListedItem(uint listingId) public view returns (Listing memory) {
        return _listings[listingId];
    }

    function listItem(address token, uint tokenId, uint price) public payable nonReentrant {
        require(price > 0, "Price should be more than 0");
        require(msg.value >= FEE, "Not enough funds to cover the listing fee");

        IERC721(token).transferFrom(msg.sender, address(this), tokenId);

        _listingsIds.increment();
        uint256 id = _listingsIds.current();

        _ownerToItemsCount[msg.sender]++;
        
        _listings[tokenId] = Listing(
            id,
            token,
            msg.sender,
            address(this),
            tokenId,
            price,
            Status.Active
        );

        emit Listed(
            id,
			tokenId,
			msg.sender,
			address(this),
			token,
			price
		);
    }

    function buyItem(uint listingId) public payable nonReentrant {
        
        Listing storage listing = _listings[listingId];

        require(msg.sender != listing.seller, "Seller cannot buy its own item");
        require(listing.status == Status.Active, "Listing is not active");
        require(msg.value >= listing.price, "Buyer did not send enough funds to buy the item");

        IERC721(listing.token).transferFrom(address(this), msg.sender, listing.tokenId);
        payable(listing.seller).transfer(listing.price);
        owner.transfer(FEE);

        listing.owner = msg.sender;
        listing.status = Status.Sold;
        
        _ownerToItemsCount[listing.seller]--;
        
        _soldItems.increment();

        emit Sold(
            listing.id,
            listing.tokenId,
            listing.seller,
            listing.owner,
            listing.token,
            listing.price
        );
    }

    function cancelListedItem(uint listingId) public nonReentrant {
        Listing storage listing = _listings[listingId];

        require(listing.seller == msg.sender, "Only the seller can cancel the listing of his item");
        require(listing.status == Status.Active, "Listing is not active");

        IERC721(listing.token).transferFrom(address(this), msg.sender, listing.tokenId);

        listing.status = Status.Cancelled;
        listing.owner = msg.sender;
        _ownerToItemsCount[msg.sender]--;

        emit Cancelled(
            listingId,
            msg.sender,
            address(this)
        );
    }

    //could be used for the caller => (itemsOwner == msg.sender)
    function getListedItemsOf(address itemsOwner) public view returns (Listing[] memory) {
        uint16 ownerItemsCount = _ownerToItemsCount[itemsOwner];

        Listing[] memory items = new Listing[](ownerItemsCount);
        uint itemsCount = 0;
        for (uint i = 0; i < _listingsIds.current(); i++) {
            // try other than storage
            Listing storage currentListing = _listings[i + 1];

            if (currentListing.seller == itemsOwner && currentListing.status == Status.Active) {
                    items[itemsCount] = currentListing;
                    itemsCount++;
                }
        }
        return items;
    }

    function getNotListedItems() public view returns (Listing[] memory) {
    
        uint listingsCount = _listingsIds.current();
        uint notListedCount = 0;
        for (uint i = 0; i < listingsCount; i++) {
            if (_listings[i + 1].status != Status.Active) {
                notListedCount++;
            }
        }

        Listing[] memory items = new Listing[](notListedCount);
        uint itemsCount = 0;
        for (uint i = 0; i < listingsCount; i++) {
            if (_listings[i + 1].status != Status.Active) {
                items[itemsCount] = _listings[i + 1];
                itemsCount++;
            }
        }
        return items;
    }

    function makeAnOffer(uint listingId, uint offerAmount) public {
        Listing storage listing = _listings[listingId];

        require(listing.status != Status.Active, "An offer can be made only to non active item");
        require(listing.owner != msg.sender, "The caller should not be the owner of the item");
                
        _userToItemOffer[msg.sender][listingId] = offerAmount;
    }
}