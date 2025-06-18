// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract RewardManager is Ownable, Pausable {
    mapping(bytes3 => bool) public actualRewards;
    mapping(address => bool) public admins;

    mapping(address => uint256) public totalRewardBalance;
    uint256 public minClaimAmount;

    event RewardAdded(bytes3 indexed rewardId, address indexed user, string indexed gameLabel, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(admins[msg.sender], "not admin");
        _;
    }

    struct RewardInput {
        address user;
        string gameLabel;
        uint256 amount;
    }

    constructor(uint256 _minClaimAmount) Ownable(msg.sender) {
        admins[msg.sender] = true;
        minClaimAmount = _minClaimAmount;
    }

    function addAdmin(address _admin) external onlyOwner {
        require(!admins[_admin], "already admin");
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(admins[_admin], "not admin");
        admins[_admin] = false;
    }

    function addRewardType(bytes3 _rewardId) external onlyAdmin {
        require(!actualRewards[_rewardId], "exists");
        actualRewards[_rewardId] = true;
    }

    function removeRewardType(bytes3 _rewardId) external onlyAdmin {
        require(actualRewards[_rewardId], "not exists");
        actualRewards[_rewardId] = false;
    }

    function setMinClaimAmount(uint256 _amount) external onlyAdmin {
        minClaimAmount = _amount;
    }

    function addRewardBatch(RewardInput[] calldata _batches, bytes3 _rewardId ) external onlyAdmin whenNotPaused {

        require(actualRewards[_rewardId], "invalid reward");
        for (uint256 i = 0; i < _batches.length; ++i) {
            RewardInput calldata r = _batches[i];

            totalRewardBalance[r.user] += r.amount;
            
            emit RewardAdded(_rewardId, r.user, r.gameLabel, r.amount);
        }
    }

    function claimRewardsAll() external whenNotPaused {
        uint256 amount = totalRewardBalance[msg.sender];
        require(amount >= minClaimAmount, "below minimum");

        totalRewardBalance[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to claim rewards");

        emit RewardsClaimed(msg.sender, amount);
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
    receive() external payable {}
}