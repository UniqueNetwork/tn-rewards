// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {CrossAddress} from "@unique-nft/solidity-interfaces/contracts/types.sol";
import {UniqueNFT} from "@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol";
import {TokenMinter, Attribute} from "@unique-nft/contracts/TokenMinter.sol";
import {TokenManager} from "@unique-nft/contracts/TokenManager.sol";
import {Converter} from "@unique-nft/contracts/libraries/Converter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {CollectionNestingAndPermission, Property, TokenPropertyPermission} from "@unique-nft/solidity-interfaces/contracts/CollectionHelpers.sol";

contract SoulboundTokenMinter is Ownable, TokenMinter, TokenManager {
    event SoulboundTokenCreated(address indexed owner, uint indexed tokenId);

    mapping(address => bool) private _adminList;

    mapping(address => uint256) public _ethTokenOwners;
    mapping(uint => uint256) public _substrateTokenOwners;
    mapping(uint => uint) public _tokenIdToLevel;

    mapping(uint => string) public _imageUriByLevel;

    uint public maxLevel;
    string[] public levelUris;

    address public collection;

    constructor(address _collection, string[] memory _imageUris, address _owner) Ownable(_owner) {
        collection = _collection;
        maxLevel = _imageUris.length;
        for (uint i = 0; i < _imageUris.length; i++) {
            _imageUriByLevel[i] = _imageUris[i];
        }
    }

    modifier onlyAdmin() {
        require(_adminList[msg.sender], "not admin");
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || _adminList[msg.sender], "not owner or admin");
        _;
    }

    function isAdmin(address _admin) external view returns (bool) {
        return _adminList[_admin];
    }

    function addAdmin(address _admin) external onlyOwner {
        require(!_adminList[_admin], "already admin");
        UniqueNFT(collection).addCollectionAdminCross(CrossAddress({
            eth: _admin,
            sub: 0
        }));
        _adminList[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(_adminList[_admin], "not admin");
        UniqueNFT(collection).removeCollectionAdminCross(CrossAddress({
            eth: _admin,
            sub: 0
        }));
        _adminList[_admin] = false;
    }

    function tokenIdByOwner(CrossAddress memory ownerCross) external view returns (uint256) {
        if (ownerCross.sub == 0) {
            return _ethTokenOwners[ownerCross.eth];
        }

        return _substrateTokenOwners[ownerCross.sub];
    }

    function createSoulboundTokenCross(
        CrossAddress memory to
    ) external payable onlyOwner returns (uint256) {
        Attribute[] memory attributes = new Attribute[](1);
        attributes[0] = Attribute({trait_type: "Level", value: "0"});

        uint256 tokenId = _createToken(
            collection,
            _imageUriByLevel[0],
            "",
            "",
            attributes,
            to
        );

        if (to.sub == 0) {
            _ethTokenOwners[to.eth] = tokenId;
        } else {
            _substrateTokenOwners[to.sub] = tokenId;
        }

        _tokenIdToLevel[tokenId] = 0;

        emit SoulboundTokenCreated(msg.sender, tokenId);

        return tokenId;
    }

    function updateTokenLevel(
        CrossAddress memory ownerCross
    ) external onlyOwnerOrAdmin {
        uint tokenId = _ethTokenOwners[ownerCross.eth];

        if (ownerCross.sub != 0) {
            tokenId = _substrateTokenOwners[ownerCross.sub];
        }

        require(tokenId != 0, "address has no token");

        uint nextLevel = _tokenIdToLevel[tokenId] + 1;
        require(nextLevel < maxLevel, "invalid level");

        string memory imageUri = _imageUriByLevel[nextLevel];
        _setTrait(collection, tokenId, "Level", Converter.uint2bytes(nextLevel));
        _setImage(collection, tokenId, bytes(imageUri));

        _tokenIdToLevel[tokenId] = nextLevel;
    }
}
