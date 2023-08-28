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

contract ZksbtVerifier {
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
    uint256 constant deltax1 = 18282113066553575244666479598601028062428498987663091105797018388887931044298;
    uint256 constant deltax2 = 3551420850372222801452676800552420320222946814953912735427963983427548240361;
    uint256 constant deltay1 = 4219177350785469262347468923237380130482424404752454905562760874993225319529;
    uint256 constant deltay2 = 8335244111334155904328989516898694895167566058925699412418105938849001305654;

    
    uint256 constant IC0x = 21395952608701361542718582395351632409033364179852294978692817732752706835329;
    uint256 constant IC0y = 7898897467711487885866241476442742288153698611662762212842981991737500683531;
    
    uint256 constant IC1x = 1142415034454024712653058560595829528662460176461872613550144836332060487629;
    uint256 constant IC1y = 666315987268853042226068879070277408972596851373277989667300541665893126521;
    
    uint256 constant IC2x = 7528351975877371545856936856656858126906786156252388330744702104776509319763;
    uint256 constant IC2y = 16769589414351232316709281668605142234845463800944417246583234535867113297187;
    
    uint256 constant IC3x = 16837702664153103996647504089223709137140816305779406429280325465484831641001;
    uint256 constant IC3y = 7736501729115921989779022149628645606893075515053943318112234125542068454314;
    
    uint256 constant IC4x = 5459341346523797853443692164488070501652905116659663407018839915724752343878;
    uint256 constant IC4y = 21680871203392256056454530430301006674795255268747906183961763215773009664653;
    
    uint256 constant IC5x = 5316989216500468449917172161501356043510121644937283394340304472585508237573;
    uint256 constant IC5y = 18178682860618981915703697824466530157718499068937227355257370243825589427482;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pZksbtPairing = 128;

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

            function checkZksbtPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pZksbtPairing := add(pMem, pZksbtPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                

                // -A
                mstore(_pZksbtPairing, calldataload(pA))
                mstore(add(_pZksbtPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pZksbtPairing, 64), calldataload(pB))
                mstore(add(_pZksbtPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pZksbtPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pZksbtPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pZksbtPairing, 192), alphax)
                mstore(add(_pZksbtPairing, 224), alphay)

                // beta2
                mstore(add(_pZksbtPairing, 256), betax1)
                mstore(add(_pZksbtPairing, 288), betax2)
                mstore(add(_pZksbtPairing, 320), betay1)
                mstore(add(_pZksbtPairing, 352), betay2)

                // vk_x
                mstore(add(_pZksbtPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pZksbtPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pZksbtPairing, 448), gammax1)
                mstore(add(_pZksbtPairing, 480), gammax2)
                mstore(add(_pZksbtPairing, 512), gammay1)
                mstore(add(_pZksbtPairing, 544), gammay2)

                // C
                mstore(add(_pZksbtPairing, 576), calldataload(pC))
                mstore(add(_pZksbtPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pZksbtPairing, 640), deltax1)
                mstore(add(_pZksbtPairing, 672), deltax2)
                mstore(add(_pZksbtPairing, 704), deltay1)
                mstore(add(_pZksbtPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pZksbtPairing, 768, _pZksbtPairing, 0x20)

                isOk := and(success, mload(_pZksbtPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals.offset, 0)))
            
            checkField(calldataload(add(_pubSignals.offset, 32)))
            
            checkField(calldataload(add(_pubSignals.offset, 64)))
            
            checkField(calldataload(add(_pubSignals.offset, 96)))
            
            checkField(calldataload(add(_pubSignals.offset, 128)))
            
            checkField(calldataload(add(_pubSignals.offset, 160)))
            

            // Validate all evaluations
            let isValid := checkZksbtPairing(_pA, _pB, _pC, _pubSignals.offset, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
