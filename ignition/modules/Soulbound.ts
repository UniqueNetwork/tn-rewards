import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SoulboundCollectionMinterModule = buildModule("SoulboundCollectionMinter", (m) => {
    const soulboundCollectionMinter = m.contract("SoulboundCollectionMinter", []);

    return { soulboundCollectionMinter };
});

export default SoulboundCollectionMinterModule;
