import {expect} from 'chai';
import {parseUnits} from 'viem';
import {viem as hardhatViem} from 'hardhat';
import config from '../utils/config';
import {logBalances} from '../utils/logBalances';
import type {GetContractReturnType} from '@nomicfoundation/hardhat-viem/types';
import {SoulboundLevels$Type} from '../artifacts/contracts/SoulboundLevels.sol/SoulboundLevels';
import {UniqueNFT$Type} from '../artifacts/@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol/UniqueNFT';
import {SchemaTools} from '@unique-nft/schemas';

const {owner, admin, other, user1, user2, user3} = config.accounts;

const {publicClient} = config;

let soulboundLevels: GetContractReturnType<SoulboundLevels$Type['abi']>
let collection: GetContractReturnType<UniqueNFT$Type['abi']>;

const waitTx = (txHash: `0x${string}`) => {
    return publicClient.waitForTransactionReceipt({hash: txHash, confirmations: 1});
}

const getDecodedToken = async (tokenId: bigint) => {
    const keys = ['tokenData', 'schemaName', 'schemaVersion'];
    const rawProperties = await collection.read.properties([tokenId, keys]);
    const properties = rawProperties.map((p) => ({key: p.key, valueHex: p.value}));

    return SchemaTools.decode.token(properties)
}

describe('SoulboundLevels', function () {
    before(async () => {
        await logBalances(owner, other, admin);

        soulboundLevels = await hardhatViem.deployContract('SoulboundLevels', [], {value: parseUnits('2', 18)});

        const collectionAddress = await soulboundLevels.read.collectionAddress();
        collection = await hardhatViem.getContractAt('UniqueNFT', collectionAddress);

        await soulboundLevels.write.addAdmin([admin.address]).then(waitTx);
    });

    it.skip('owner address can transfer collection ownership', async function () {
        expect(await soulboundLevels.read.owner(), 'contract owner is ok').to.equal(owner.address);

        const collectionOwner1 = await collection.read.collectionOwner();
        expect(collectionOwner1.eth, 'contract is collection owner').to.equal(soulboundLevels.address);

        await soulboundLevels.write.transferCollectionOwnership([{eth: owner.address, sub: 0n}]).then(waitTx);
        const collectionOwner2 = await collection.read.collectionOwner();
        expect(collectionOwner2.eth, 'collection ownership is transferred to owner').to.equal(owner.address);

        await collection.write.changeCollectionOwnerCross([{eth: other.address, sub: 0n}], {account: owner}).then(waitTx);
        const collectionOwner3 = await collection.read.collectionOwner();
        expect(collectionOwner3.eth, 'collection ownership is transferred to other').to.equal(other.address);
    });

    it('admin can mint token and level up it', async function () {
        const isAdmin = await soulboundLevels.read.isAdmin([admin.address]);
        expect(isAdmin, 'admin has admin role').to.be.true;

        await soulboundLevels.write.createSoulboundTokenCross([{eth: user1.address, sub: 0n}], {account: admin}).then(waitTx);

        const tokenId = await soulboundLevels.read.tokenIdByOwner([{eth: user1.address, sub: 0n}]);
        expect(!!tokenId, 'token is created').to.be.true;

        const initialToken = await getDecodedToken(tokenId);
        expect(initialToken.image).to.equal("https://picsum.photos/id/0/200/200");
        expect(initialToken.attributes).to.deep.equal([{trait_type: 'Level', value: "0"}]);

        await soulboundLevels.write.updateTokenLevel([{eth: user1.address, sub: 0n}], {account: admin}).then(waitTx);

        const levelUppedToken = await getDecodedToken(tokenId);
        expect(levelUppedToken.image).to.equal("https://picsum.photos/id/1/200/200");
        expect(levelUppedToken.attributes).to.deep.equal([{trait_type: 'Level', value: "1"}]);

        const ownerByTokenId = await soulboundLevels.read.ownerCrossByTokenId([tokenId]);
        expect(ownerByTokenId.eth, 'owner by token id is correct').to.equal(user1.address);

        const tokenByOwner = await soulboundLevels.read.tokenIdByOwner([{eth: user1.address, sub: 0n}]);
        expect(tokenByOwner, 'token by owner is correct').to.equal(tokenId);
    });

    it('non admin cannot mint token', async function () {
        const isAdmin = await soulboundLevels.read.isAdmin([other.address]);
        expect(isAdmin, 'other is not admin').to.be.false;

        const tx = soulboundLevels.write.createSoulboundTokenCross([{eth: user2.address, sub: 0n}], {account: other});

        await expect(tx).to.be.rejectedWith(/not admin/i);
    })

    it('non admin cannot level up token', async function () {
        const isAdmin = await soulboundLevels.read.isAdmin([admin.address]);
        expect(isAdmin, 'admin has admin role').to.be.true;

        await soulboundLevels.write.createSoulboundTokenCross([{eth: user2.address, sub: 0n}], {account: admin}).then(waitTx);

        const tokenId = await soulboundLevels.read.tokenIdByOwner([{eth: user2.address, sub: 0n}]);
        expect(!!tokenId, 'token is created').to.be.true;

        const tx = soulboundLevels.write.updateTokenLevel([{eth: user2.address, sub: 0n}], {account: other});
        await expect(tx).to.be.rejectedWith(/not admin/i);
    })

    it('user unable to get second token or transfer existing one', async function () {
        const isAdmin = await soulboundLevels.read.isAdmin([admin.address]);
        expect(isAdmin, 'admin has admin role').to.be.true;

        await soulboundLevels.write.createSoulboundTokenCross([{eth: other.address, sub: 0n}], {account: admin}).then(waitTx);
        const tokenId = await soulboundLevels.read.tokenIdByOwner([{eth: other.address, sub: 0n}]);

        expect(!!tokenId, 'token is created').to.be.true;

        const mintSecondTokenTx = soulboundLevels.write.createSoulboundTokenCross([{eth: other.address, sub: 0n}], {account: admin});
        await expect(mintSecondTokenTx, 'unable to mint second token').to.be.rejectedWith(/AccountTokenLimitExceeded/i);

        const transferTx = collection.write.transferFromCross([
            {eth: other.address, sub: 0n},
            {eth: user3.address, sub: 0n},
            tokenId,
        ], {account: other});
        await expect(transferTx, 'unable to transfer token').to.be.rejectedWith(/TransferNotAllowed/i);
    })
});
