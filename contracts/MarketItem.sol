// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
contract MarketItem is IERC721, Ownable {

    constructor(string memory _name, string memory symbol) {

    }
   
    function balanceOf(address owner) public view override returns (uint256 balance) {
        
    }

    function ownerOf(uint256 tokenId) public view override returns (address owner) {
        
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) public override {

    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {

    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {

    }

    function approve(address to, uint256 tokenId) public override {

    }

    function setApprovalForAll(address operator, bool _approved) public override {

    }

    function getApproved(uint256 tokenId) public view override returns (address operator) {

    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {

    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {

    }
}