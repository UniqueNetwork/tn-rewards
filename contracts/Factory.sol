// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Factory {
    event Deployed(address addr, bytes32 salt);

    function deploy(bytes memory code, bytes32 salt) external returns (address addr) {
        assembly {
            addr := create2(0, add(code, 0x20), mload(code), salt)
            if iszero(extcodesize(addr)) { revert(0, 0) }
        }
        emit Deployed(addr, salt);
    }

    function computeAddress(bytes memory code, bytes32 salt) external view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(code)
            )
        );
        return address(uint160(uint256(hash)));
    }
}
