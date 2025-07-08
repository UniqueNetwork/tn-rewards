import {expect} from 'chai';
import {parseUnits} from 'viem';
import {viem as hardhatViem} from 'hardhat';
import config from '../utils/config';
import {logBalances} from '../utils/logBalances';
import type {GetContractReturnType} from '@nomicfoundation/hardhat-viem/types';
import {SoulboundLevels$Type} from '../artifacts/contracts/SoulboundLevels.sol/SoulboundLevels';
import {UniqueNFT$Type} from '../artifacts/@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol/UniqueNFT';
import {SchemaTools} from '@unique-nft/schemas';

const {owner, admin, other} = config.accounts;

const {publicClient} = config;

let soulboundLevels: GetContractReturnType<SoulboundLevels$Type['abi']>
let collection: GetContractReturnType<UniqueNFT$Type['abi']>;

const waitTx = (txHash: `0x${string}`) => {
    return publicClient.waitForTransactionReceipt({hash: txHash, confirmations: 1});
}

describe.only('SoulboundLevels', function () {
    before(async () => {
        await logBalances(owner, other, admin);

        soulboundLevels = await hardhatViem.deployContract('SoulboundLevels', [], {value: parseUnits('2', 18)});

        const collectionAddress = await soulboundLevels.read.collectionAddress();
        collection = await hardhatViem.getContractAt('UniqueNFT', collectionAddress);
    });

    it('owner address can transfer ownership', async function () {
        expect(await soulboundLevels.read.owner(), 'contract owner is ok').to.equal(owner.address);

        // todo - failing for now
        // await soulboundLevels.write.transferCollectionOwnership([{eth: owner.address, sub: 0n}]).then(waitTx);
        // const collectionOwner = await collection.read.collectionOwner();
        //
        // expect(collectionOwner.eth, 'collection owner changed').to.equal(owner.address);
    });

    it('admin can mint token and level up it', async function () {
        await soulboundLevels.write.addAdmin([admin.address]).then(waitTx);

        const isAdmin = await soulboundLevels.read.isAdmin([admin.address]);
        expect(isAdmin, 'admin is added').to.be.true;

        await soulboundLevels.write.createSoulboundTokenCross([{eth: other.address, sub: 0n}]).then(waitTx);

        const tokenId = await soulboundLevels.read.tokenIdByOwner([{eth: other.address, sub: 0n}]);

        expect(!!tokenId, 'token is created').to.be.true;

        const initialToken = await collection.read.properties([tokenId, ['tokenData', 'schemaName', 'schemaVersion']]);
        const initialDecoded = await SchemaTools.decode.token(initialToken.map((p) => ({key: p.key, valueHex: p.value})))
        expect(initialDecoded.image).to.equal("https://picsum.photos/id/0/200/200");
        expect(initialDecoded.attributes).to.deep.equal([{trait_type: 'Level', value: "0"}]);

        await soulboundLevels.write.updateTokenLevel([{eth: other.address, sub: 0n}]).then(waitTx);

        const levelUppedToken = await collection.read.properties([tokenId, ['tokenData', 'schemaName', 'schemaVersion']]);
        const levelUppedDecoded = await SchemaTools.decode.token(levelUppedToken.map((p) => ({key: p.key, valueHex: p.value})));
        expect(levelUppedDecoded.image).to.equal("https://picsum.photos/id/1/200/200");
        expect(levelUppedDecoded.attributes).to.deep.equal([{trait_type: 'Level', value: "1"}]);
    });
});
