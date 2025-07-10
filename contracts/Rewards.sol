// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import { UniquePrecompiles } from "@unique-nft/contracts/UniquePrecompiles.sol";
import { CrossAddress, UniqueFungible } from "@unique-nft/solidity-interfaces/contracts/UniqueFungible.sol";

contract RewardManager is Ownable, Pausable, UniquePrecompiles {
    mapping(bytes3 => bool) private s_actualRewards;
    mapping(address => bool) private s_isAdmin;

    mapping(uint256 substratePublicKey => uint256) private s_totalRewardBalance;
    uint256 public s_minClaimAmount;

    event RewardAdded(bytes3 indexed rewardId, uint256 indexed substratePublicKey, string indexed gameLabel, uint256 amount);
    event RewardsClaimed(uint256 indexed substratePublicKey, uint256 amount);

    modifier onlyAdmin() {
        require(s_isAdmin[msg.sender], "not admin");
        _;
    }

    struct RewardInput {
        uint256 substratePublicKey;
        string gameLabel;
        uint256 amount;
    }

    constructor(uint256 _minClaimAmount) Ownable(msg.sender) {
        s_isAdmin[msg.sender] = true;
        s_minClaimAmount = _minClaimAmount;
    }

    receive() external payable {}

    function isAdmin(address _admin) external view returns (bool) {
        return s_isAdmin[_admin];
    }

    function isActualReward(bytes3 _rewardId) external view returns (bool) {
        return s_actualRewards[_rewardId];
    }

    function totalRewardBalance(uint256 _substratePublicKey) external view returns (uint256) {
        return s_totalRewardBalance[_substratePublicKey];
    }

    function minClaimAmount() external view returns (uint256) {
        return s_minClaimAmount;
    }

    function addAdmin(address _admin) external onlyOwner {
        require(!s_isAdmin[_admin], "already admin");
        s_isAdmin[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(s_isAdmin[_admin], "not admin");
        s_isAdmin[_admin] = false;
    }

    function addRewardType(bytes3 _rewardId) external onlyAdmin {
        require(!s_actualRewards[_rewardId], "exists");
        s_actualRewards[_rewardId] = true;
    }

    function removeRewardType(bytes3 _rewardId) external onlyAdmin {
        require(s_actualRewards[_rewardId], "not exists");
        s_actualRewards[_rewardId] = false;
    }

    function setMinClaimAmount(uint256 _amount) external onlyAdmin {
        s_minClaimAmount = _amount;
    }

    function addRewardBatch(RewardInput[] calldata _batches, bytes3 _rewardId ) external onlyAdmin whenNotPaused {
        require(s_actualRewards[_rewardId], "invalid reward");
        
        uint256 batchesLength = _batches.length;

        for (uint256 i = 0; i < batchesLength;) {
            RewardInput calldata r = _batches[i];

            s_totalRewardBalance[r.substratePublicKey] += r.amount;
            
            emit RewardAdded(_rewardId, r.substratePublicKey, r.gameLabel, r.amount);

            unchecked {
                ++i;
            }
        }
    }

    function claimRewardsAll(uint256 _substratePublicKey) external whenNotPaused {
        address collectionAddress = COLLECTION_HELPERS.collectionAddress(0);

        uint256 amount = s_totalRewardBalance[_substratePublicKey];
        require(amount >= s_minClaimAmount, "below minimum");

        s_totalRewardBalance[_substratePublicKey] = 0;

        CrossAddress memory userCross = CrossAddress(address(0), _substratePublicKey);

        (bool sent) = UniqueFungible(collectionAddress).transferCross(userCross, amount);
        require(sent, "Failed to claim rewards");

        emit RewardsClaimed(_substratePublicKey, amount);
    }

    function withdrawAll(address payable _to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "empty");
        (bool sent, ) = _to.call{value: balance}("");
        require(sent, "Failed to withdraw ALL");
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}