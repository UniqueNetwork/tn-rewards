import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SoulboundCollectionMinterModule = buildModule("SoulboundLevels", (m) => {
    const soulboundCollectionMinter = m.contract("SoulboundLevels", []);

    return { soulboundCollectionMinter };
});

export default SoulboundCollectionMinterModule;
