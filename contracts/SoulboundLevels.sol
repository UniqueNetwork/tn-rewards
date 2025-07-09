// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {CrossAddress} from "@unique-nft/solidity-interfaces/contracts/types.sol";
import {CrossAddress} from "@unique-nft/solidity-interfaces/contracts/ContractHelpers.sol";
import {UniqueNFT} from "@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol";
import {TokenMinter, Attribute} from "@unique-nft/contracts/TokenMinter.sol";
import {CollectionMinter} from "@unique-nft/contracts/CollectionMinter.sol";
import {TokenManager} from "@unique-nft/contracts/TokenManager.sol";
import {Converter} from "@unique-nft/contracts/libraries/Converter.sol";
import {OwnableWithAdmins} from "./utils/OwnableWithAdmins.sol";
import {CollectionHelpers, CollectionNestingAndPermission, Property, TokenPropertyPermission, CollectionLimitField, CollectionLimitValue} from "@unique-nft/solidity-interfaces/contracts/CollectionHelpers.sol";


contract SoulboundLevels is OwnableWithAdmins, CollectionMinter, TokenMinter, TokenManager {
    event SoulboundTokenCreated(address indexed owner, uint indexed tokenId);
    event SoulboundTokenLevelUpdated(address indexed owner, uint indexed tokenId, uint newLevel);

    // immutable variables
    address public immutable collectionAddress;
    uint public immutable maxLevel = 10;
    string public constant levelTraitType = "Level";

    // mutable variables, mappings
    mapping(uint => string) public levelToImageUrl;
    mapping(address => bool) private _adminList;
    mapping(address => uint256) public ethTokenOwners;
    mapping(uint => uint256) public substrateTokenOwners;
    mapping(uint => uint) public tokenIdToLevel;

    constructor() payable
    OwnableWithAdmins(msg.sender)
    CollectionMinter(true, true, false) // (mutable, admin, tokenOwner)
    {
        CollectionLimitValue [] memory collectionLimits = new CollectionLimitValue[](2);
        collectionLimits[0] = CollectionLimitValue({
            field: CollectionLimitField.TransferEnabled,
            value: 0
        });
        collectionLimits[1] = CollectionLimitValue({
            field: CollectionLimitField.AccountTokenOwnership,
            value: 1
        });

        levelToImageUrl[0] = "https://picsum.photos/id/0/200/200";
        levelToImageUrl[1] = "https://picsum.photos/id/1/200/200";
        levelToImageUrl[5] = "https://picsum.photos/id/5/200/200";
        levelToImageUrl[9] = "https://picsum.photos/id/9/200/200";
        levelToImageUrl[10] = "https://picsum.photos/id/10/200/200";

        require(bytes(levelToImageUrl[0]).length != 0, "image for level 0 (initial) must be set");

        collectionAddress = _createCollection(
            "Soulbound Levels", // name
            "This is a soulbound collection with levels and different images for some of them.", // description
            "SBLV", // symbol
            "https://picsum.photos/id/20/200/200", // collectionCover
            CollectionNestingAndPermission({
                token_owner: true,
                collection_admin: true,
                restricted: new address[](0)
            }),
            collectionLimits,
            new Property[](0),
            new TokenPropertyPermission[](0)
        );

        UniqueNFT collection = UniqueNFT(collectionAddress);
        collection.addCollectionAdminCross(CrossAddress(address(this), 0));
    }

    function transferCollectionOwnership(CrossAddress memory newOwner) external onlyOwner {
        UniqueNFT collection = UniqueNFT(collectionAddress);
        collection.changeCollectionOwnerCross(newOwner);
    }

    function tokenIdByOwner(CrossAddress memory ownerCross) external view returns (uint256) {
        if (ownerCross.sub == 0) {
            return ethTokenOwners[ownerCross.eth];
        }

        return substrateTokenOwners[ownerCross.sub];
    }

    function ownerCrossByTokenId(uint256 tokenId) external view returns (CrossAddress memory) {
        UniqueNFT collection = UniqueNFT(collectionAddress);
        return collection.ownerOfCross(tokenId);
    }

    function createSoulboundTokenCross(
        CrossAddress memory to
    ) external payable onlyAdmin returns (uint256) {
        Attribute[] memory attributes = new Attribute[](1);
        attributes[0] = Attribute({trait_type: levelTraitType, value: "0"});

        uint256 tokenId = _createToken(
            collectionAddress,
            levelToImageUrl[0],
            "",
            "",
            attributes,
            to
        );

        if (to.sub == 0) {
            ethTokenOwners[to.eth] = tokenId;
        } else {
            substrateTokenOwners[to.sub] = tokenId;
        }

        tokenIdToLevel[tokenId] = 0;

        emit SoulboundTokenCreated(msg.sender, tokenId);

        return tokenId;
    }

    function updateTokenLevel(
        CrossAddress memory ownerCross
    ) external onlyAdmin {
        uint tokenId = ethTokenOwners[ownerCross.eth];

        if (ownerCross.sub != 0) {
            tokenId = substrateTokenOwners[ownerCross.sub];
        }

        require(tokenId != 0, "address has no token");

        uint nextLevel = tokenIdToLevel[tokenId] + 1;
        require(nextLevel <= maxLevel, "max level reached");

        _setTrait(collectionAddress, tokenId, bytes(levelTraitType), Converter.uint2bytes(nextLevel));

        string memory imageUri = levelToImageUrl[nextLevel];

        if (bytes(imageUri).length != 0) {
            _setImage(collectionAddress, tokenId, bytes(imageUri));
        }

        tokenIdToLevel[tokenId] = nextLevel;
        emit SoulboundTokenLevelUpdated(ownerCross.eth, tokenId, nextLevel);
    }
}
