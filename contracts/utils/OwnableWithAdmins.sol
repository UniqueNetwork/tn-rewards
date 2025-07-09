// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract OwnableWithAdmins is Ownable {
    mapping(address => bool) private _adminList;

    constructor(address owner) Ownable(owner) {
        _adminList[owner] = true; // Owner is also an admin by default
    }

    modifier onlyAdmin() {
        require(_adminList[msg.sender], "not admin");
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || _adminList[msg.sender], "not owner or admin");
        _;
    }

    function isAdmin(address _admin) external view returns (bool) {
        return _adminList[_admin];
    }

    function addAdmin(address _admin) external onlyOwner {
        require(!_adminList[_admin], "already admin");
        _adminList[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(_adminList[_admin], "not admin");
        _adminList[_admin] = false;
    }
}
