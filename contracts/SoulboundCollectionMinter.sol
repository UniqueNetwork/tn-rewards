// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {CollectionMinter} from "@unique-nft/contracts/CollectionMinter.sol";
import {SoulboundTokenMinter} from "./SoulboundTokenMinter.sol";
import {CollectionHelpers, CreateCollectionData, CollectionMode, CollectionLimitValue, CollectionLimitField, CollectionNestingAndPermission, Property, TokenPropertyPermission, PropertyPermission, TokenPermissionField} from "@unique-nft/solidity-interfaces/contracts/CollectionHelpers.sol";


contract SoulboundCollectionMinter is CollectionMinter {
    event SoulboundCollectionCreated(address indexed owner, address indexed collection, address indexed minter);

    constructor()
    CollectionMinter(
    /* _mutable= */ true,
    /* _admin= */ true,
    /* _tokenOwner= */ false
    )
    {}

    function createSoulboundCollection(
        string memory name,
        string memory description,
        string memory symbol,
        string memory collectionCover,
        string[] memory levelUris
    ) external payable returns (address) {
        CollectionLimitValue [] memory limits = new CollectionLimitValue[](1);
        limits[0] = CollectionLimitValue({
            field: CollectionLimitField.TransferEnabled,
            value: 0
        });

        address collection = _createCollection(
            name,
            description,
            symbol,
            collectionCover,
            CollectionNestingAndPermission({
                token_owner: true,
                collection_admin: true,
                restricted: new address[](0)
            }),
            limits,
            new Property[](0),
            new TokenPropertyPermission[](0)
        );

        SoulboundTokenMinter tokenMinter = new SoulboundTokenMinter(
            collection,
            levelUris,
            msg.sender
        );
        address minter = address(tokenMinter);

//        emit SoulboundCollectionCreated(msg.sender, collection, collection);
        emit SoulboundCollectionCreated(msg.sender, collection, minter);

        return collection;
    }
}
