// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract IdentityVerifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 14378794661994809316668936077887579852844330409586136188493910229510707683568;
    uint256 constant alphay  = 19007180918058273234125706522281291487787880146734549337345180962710738215208;
    uint256 constant betax1  = 5920706861016946300912146506670818945013737603659177373891149557636543490740;
    uint256 constant betax2  = 12055325713222300848813253111985210672218263044214498326157766255150057128762;
    uint256 constant betay1  = 9700420230412290932994502491200547761155381189822684608735830492099336040170;
    uint256 constant betay2  = 14277278647337675353039880797101698215986155900184787257566473040310971051502;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 5859630830086352961863576169139625804982553081583447395952194048776848605159;
    uint256 constant deltax2 = 14263212850330251603213978311347880415476689884563485173822865525894233150354;
    uint256 constant deltay1 = 18039292543395300470788745137393494908732252170100291832641501072987176185589;
    uint256 constant deltay2 = 20581817387151526410448882579223137255591152126803278534313774880207428709374;

    
    uint256 constant IC0x = 3106107338407940906526716807866776149918769870845695837645044169662996492414;
    uint256 constant IC0y = 9111772716879342048022693105670258819939821334181512589025065857842326617586;
    
    uint256 constant IC1x = 16116751284074532266253759040786962482690786197024757624301436705393806304210;
    uint256 constant IC1y = 5309286225076956305060834149236634574776569736939618146431627391042951769181;
    
    uint256 constant IC2x = 16376671817503088568256459781538765365992568211836108141316986585021178986059;
    uint256 constant IC2y = 9870597273224960312934904877952262176008228183434954187070595588954939157542;
    
    uint256 constant IC3x = 4414086711398963283698793417677365780277821874058511687210569883731310935644;
    uint256 constant IC3y = 11366568847321791494913134353563360965091071378623743202182483439208572210440;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pIdentityPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, q)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkIdentityPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pIdentityPairing := add(pMem, pIdentityPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                

                // -A
                mstore(_pIdentityPairing, calldataload(pA))
                mstore(add(_pIdentityPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pIdentityPairing, 64), calldataload(pB))
                mstore(add(_pIdentityPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pIdentityPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pIdentityPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pIdentityPairing, 192), alphax)
                mstore(add(_pIdentityPairing, 224), alphay)

                // beta2
                mstore(add(_pIdentityPairing, 256), betax1)
                mstore(add(_pIdentityPairing, 288), betax2)
                mstore(add(_pIdentityPairing, 320), betay1)
                mstore(add(_pIdentityPairing, 352), betay2)

                // vk_x
                mstore(add(_pIdentityPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pIdentityPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pIdentityPairing, 448), gammax1)
                mstore(add(_pIdentityPairing, 480), gammax2)
                mstore(add(_pIdentityPairing, 512), gammay1)
                mstore(add(_pIdentityPairing, 544), gammay2)

                // C
                mstore(add(_pIdentityPairing, 576), calldataload(pC))
                mstore(add(_pIdentityPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pIdentityPairing, 640), deltax1)
                mstore(add(_pIdentityPairing, 672), deltax2)
                mstore(add(_pIdentityPairing, 704), deltay1)
                mstore(add(_pIdentityPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pIdentityPairing, 768, _pIdentityPairing, 0x20)

                isOk := and(success, mload(_pIdentityPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals.offset, 0)))
            
            checkField(calldataload(add(_pubSignals.offset, 32)))
            
            checkField(calldataload(add(_pubSignals.offset, 64)))
            
            checkField(calldataload(add(_pubSignals.offset, 96)))
            

            // Validate all evaluations
            let isValid := checkIdentityPairing(_pA, _pB, _pC, _pubSignals.offset, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
