# RewardManager Smart Contract

## Overview

This document describes the `RewardManager.sol` smart contract, designed for managing and distributing rewards on the Unique Network. The contract allows for a structured approach to reward distribution with clear roles, batch processing capabilities, and security features like pausability.

The source code can be found at: [UniqueNetwork/tn-rewards/contracts/Rewards.sol](https://github.com/UniqueNetwork/tn-rewards/blob/master/contracts/Rewards.sol)

## Key Features

*   **Dual-level Access Control**: A clear separation of privileges between the **Owner** and **Admins**.
*   **Accrued Balances**: Users accumulate rewards on an internal contract balance.
*   **Batch Reward Distribution**: Admins can add multiple rewards in a single transaction, saving gas costs.
*   **Reward Whitelisting**: The ability to create an allowlist of valid reward types to prevent errors.
*   **Minimum Claim Amount**: Protects against spam and the withdrawal of negligible amounts.
*   **Pausable Functionality**: The Owner can temporarily halt key contract functions (`addRewardBatch`, `claimRewardsAll`) if necessary.
*   **Fund Withdrawal**: The Owner has the ability to withdraw all funds from the contract in an emergency.

## Roles and Access Control

The contract implements three levels of access:

### Owner
*   A single address with complete control over the contract.
*   Can add and remove administrators.
*   Can pause and unpause the contract.
*   Can withdraw all funds from the contract balance (`withdrawAll`).
*   Upon deployment, `msg.sender` becomes the initial Owner and Admin.

### Admin
*   A trusted address appointed by the Owner.
*   Can distribute rewards to users (`addRewardBatch`).
*   Can manage the list of allowed reward types (`addRewardType`, `removeRewardType`).
*   Can change the minimum claim amount (`setMinClaimAmount`).

### User
*   Any address that has been awarded a reward.
*   Can claim their total accumulated rewards (`claimRewardsAll`) if the amount meets the minimum threshold.

## Workflow

1.  **Deployment**: The Owner deploys the contract, specifying the initial minimum claim amount (`_minClaimAmount`).
2.  **Setup**:
    *   The Owner adds other administrators (`addAdmin`).
    *   An Admin adds the allowed reward types (`addRewardType`).
3.  **Funding the Contract**: The Owner or anyone else sends **UNQ** to the contract's address. These funds will be used to pay out rewards.
4.  **Distributing Rewards**: An Admin calls the `addRewardBatch` function, passing an array of reward data (who, how much, for which game, etc.). The user's internal balance in the contract increases.
5.  **Claiming Rewards**: A user who has accumulated a sufficient amount calls `claimRewardsAll`. The contract verifies that the user's balance is not below `minClaimAmount`, resets their internal balance to zero, and sends them the corresponding amount in UNQ.
6.  **Administration**: The Owner and Admins can manage settings as needed. In an emergency, the Owner can pause the contract (`pause`) or withdraw all funds (`withdrawAll`).

## Function Descriptions

### Owner Functions

`addAdmin(address _admin)`
: Adds a new address to the list of administrators.

`removeAdmin(address _admin)`
: Removes an address from the list of administrators.

`withdrawAll(address payable _to)`
: Withdraws the entire UNQ balance from the contract to the specified `_to` address. Used for emergencies or migration.

`pause()`
: Pauses the `addRewardBatch` and `claimRewardsAll` functions.

`unpause()`
: Resumes contract functionality after it has been paused.

### Admin Functions

`addRewardType(bytes3 _rewardId)`
: Adds a new reward type to the `actualRewards` allowlist.

`removeRewardType(bytes3 _rewardId)`
: Removes an existing reward type from `actualRewards`. Rewards of this type can no longer be added.

`setMinClaimAmount(uint256 _amount)`
: Sets a new minimum amount for users to be able to claim their rewards.

`addRewardBatch(RewardInput[] calldata _batches)`
: Distributes rewards to a list of users. Accepts an array of `RewardInput` structs, each containing `rewardId`, `user` address, `gameLabel`, and `amount`.

### Public User Functions

`claimRewardsAll()`
: Allows a user (`msg.sender`) to withdraw all of their accumulated funds. The transaction will fail if the balance is less than `minClaimAmount`.

`receive() external payable {}`
: Allows the contract to receive direct UNQ transfers to fund the reward pool.

## Events

`RewardAdded(bytes3 indexed rewardId, address indexed user, string indexed gameLabel, uint256 amount)`
: Emitted on each successful reward addition via `addRewardBatch`. Useful for off-chain tracking of reward history.

`RewardsClaimed(address indexed user, uint256 amount)`
: Emitted when a user successfully claims their rewards.

## Deployment and Usage on Unique Network

### Prerequisites
*   A Solidity development environment (e.g., Hardhat).
*   A wallet with UNQ to pay for gas.

### Deployment

When deploying, you must pass one argument to the constructor:
*   `_minClaimAmount` (uint256): The initial minimum amount in the smallest unit (like wei) that a user must accumulate. For a token with 18 decimals, `100 UNQ` would be:
    ```
    100000000000000000000
    ```

After deployment, remember to fund the contract with UNQ, otherwise it will not be able to pay out rewards.

A sample deployment script using Hardhat can be found here:
*   [**deploy.ts**](https://github.com/UniqueNetwork/tn-rewards/blob/master/scripts/deploy.ts)

### Sponsoring Transactions

Unique Network allows sponsoring transactions, meaning a dApp can cover the gas fees for its users. This is particularly useful for the `claimRewardsAll` function to provide a gas-free experience.

*   **Sponsoring Setup Documentation**: [Contract Helpers - Choose Sponsoring Mode](https://docs.unique.network/build/evm/smart-contracts/contract-helpers.html#choose-sponsoring-mode)
*   **Example Implementation**: See how sponsoring is set up in [substrate_evm_call.ts#L40](https://github.com/UniqueNetwork/tn-rewards/blob/master/scripts/substrate_evm_call.ts#L40).

### Claiming Rewards via SDK (EVM Call)

Users can interact with the `claimRewardsAll` function through a client-side application using the `@unique-nft/sdk`.

*   **Example Implementation**: A script demonstrating how to call the `claimRewardsAll` function can be found at [substrate_evm_call.ts#L71](https://github.com/UniqueNetwork/tn-rewards/blob/master/scripts/substrate_evm_call.ts#L71).

## Benchmarks

=== FINAL SUMMARY FOR 1000 ACCOUNTS ===
Gas usage:
- Total gas used: 69,810,528
- Average gas per user (first batch): 26,299
- Average gas per user (second batch): 9,212
- Average gas per claim: 34,299

Owner spending breakdown:
- Total owner spending: 130.013895855558163392 ETH (130013895855558163392 wei)
- Deployment and setup transactions: 1.986582776687629146 ETH (1986582776687629146 wei)
- Sponsoring addRewardBatch transactions: 66.136043306587477392 ETH (66136043306587477392 wei)
  * First batch: 48.979020883506546708 ETH (48979020883506546708 wei)
  * Second batch: 17.157022423080930684 ETH (17157022423080930684 wei)
- Sponsoring claim transactions: 63.877852548970686 ETH (63877852548970686000 wei)
- Total rewards distributed: 2000 ETH (2000000000000000000000 wei)

Average cost per user:
- First batch sponsoring: 0.048979020883506546 ETH (48979020883506546 wei)
- Second batch sponsoring: 0.01715702242308093 ETH (17157022423080930 wei)
- Claim sponsoring: 0.063877852548970686 ETH (63877852548970686 wei)
- Total average cost per user: 0.130013895855558162 ETH (130013895855558162 wei)