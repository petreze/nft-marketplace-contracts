// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MarketPlace.sol";

contract MarketItem is ERC721, ERC721URIStorage, Ownable {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address marketplaceAddress;

    event Minted(uint256);

    constructor(address _marketplaceAddress) ERC721("Lime Collection", "LC") {
            marketplaceAddress = _marketplaceAddress;
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function mint(string memory _tokenURI) public returns(uint) {
        _tokenIds.increment();
        uint newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        approve(marketplaceAddress, newTokenId);

        MarketPlace marketPlace = MarketPlace(marketplaceAddress);
        marketPlace.initItem(newTokenId, address(this), msg.sender);

        emit Minted(newTokenId);

        return newTokenId;
    }
}