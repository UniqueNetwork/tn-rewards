// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract RewardManager is Ownable, Pausable {
    mapping(bytes3 => bool) private s_actualRewards;
    mapping(address => bool) private s_isAdmin;

    mapping(address => uint256) private s_totalRewardBalance;
    uint256 public s_minClaimAmount;

    event RewardAdded(bytes3 indexed rewardId, address indexed user, string indexed gameLabel, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(s_isAdmin[msg.sender], "not admin");
        _;
    }

    struct RewardInput {
        address user;
        string gameLabel;
        uint256 amount;
    }

    constructor(uint256 _minClaimAmount) Ownable(msg.sender) {
        s_isAdmin[msg.sender] = true;
        s_minClaimAmount = _minClaimAmount;
    }

    function isAdmin(address _admin) external view returns (bool) {
        return s_isAdmin[_admin];
    }

    function isActualReward(bytes3 _rewardId) external view returns (bool) {
        return s_actualRewards[_rewardId];
    }

    function totalRewardBalance(address _user) external view returns (uint256) {
        return s_totalRewardBalance[_user];
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
        for (uint256 i = 0; i < _batches.length; ++i) {
            RewardInput calldata r = _batches[i];

            s_totalRewardBalance[r.user] += r.amount;
            
            emit RewardAdded(_rewardId, r.user, r.gameLabel, r.amount);
        }
    }

    function claimRewardsAll() external whenNotPaused {
        uint256 amount = s_totalRewardBalance[msg.sender];
        require(amount >= s_minClaimAmount, "below minimum");

        s_totalRewardBalance[msg.sender] = 0;

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