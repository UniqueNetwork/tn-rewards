// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract RewardManager is Ownable, Pausable {
    bytes3[] public actualRewardsList;
    mapping(bytes3 => bool) public actualRewards;
    mapping(address => bool) public admins;

    uint256 public minClaimAmount;


    //can store eth mirror address?
    mapping(address => uint256) public totalRewardBalance;
    mapping(address => mapping(bytes3 => uint256)) public rewardBalance;

    event RewardAdded(bytes3 indexed rewardId, address indexed user, string indexed gameLabel, uint256 indexed amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(admins[msg.sender], "not admin");
        _;
    }

    struct RewardInput {
        bytes3 rewardId;

        address user;
        string gameLabel;
        uint256 amount;
    }

    constructor(uint256 _minClaimAmount) {
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
        actualRewardsList.push(_rewardId);
    }

    function removeRewardType(bytes3 _rewardId) external onlyAdmin {
        require(actualRewards[_rewardId], "not exists");
        actualRewards[_rewardId] = false;
    }

    function setMinClaimAmount(uint256 _amount) external onlyAdmin {
        minClaimAmount = _amount;
    }

    function addRewardBatch(RewardInput[] calldata _batches) external onlyAdmin {
        for (uint256 i = 0; i < _batches.length; ++i) {
            RewardInput calldata r = _batches[i];
            require(actualRewards[r.rewardId], "invalid reward");
            totalRewardBalance[r.user] += r.amount;
            rewardBalance[r.user][r.rewardId] += r.amount;
            emit RewardAdded(r.rewardId, r.user, r.gameLabel, r.amount);
        }
    }

    function claimRewardsAll() external {
        uint256 amount = totalRewardBalance[msg.sender];
        require(amount >= minClaimAmount, "below minimum");

        // TO DO check need address convertation ?  
        totalRewardBalance[msg.sender] = 0;



        for (uint256 i = 0; i < actualRewardsList.length; ++i) {
            bytes3 id = actualRewardsList[i];
            rewardBalance[msg.sender][id] = 0;
        }
        payable(msg.sender).transfer(amount);
        emit RewardsClaimed(msg.sender, amount);
    }

    function withdrawAll(address payable _to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "empty");
        _to.transfer(balance);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
    receive() external payable {}
}

