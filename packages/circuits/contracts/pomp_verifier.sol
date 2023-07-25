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

contract PompVerifier {
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
    uint256 constant deltax1 = 12592573188225891079238174875525766704746214712528898000493236860612473579990;
    uint256 constant deltax2 = 17998505521064528672344159092367624831207706391290350931197381318576245711893;
    uint256 constant deltay1 = 4582371336282531842591891408497170730099221991261682814561666578362434167330;
    uint256 constant deltay2 = 19139534268973670516652267997127212405893031190855227789398036778323682321576;

    
    uint256 constant IC0x = 7771524244382879472366999971140149662558376257129898240544633672677332190954;
    uint256 constant IC0y = 5052903314893799122500643196081917117148346496233375436788040169965992697759;
    
    uint256 constant IC1x = 19714988209103323645997592701266482864509090506211376430974873677494967893019;
    uint256 constant IC1y = 9449823596746736642318480869242091345193795772255561078185229624218572286226;
    
    uint256 constant IC2x = 6560261111520217233624255694150070873975960048227589572298828759035402343928;
    uint256 constant IC2y = 20279227472533419933206616410788235729321453902457747171601303579667800743541;
    
    uint256 constant IC3x = 8418293899149352568360015068958545430172543597066725495581185579461715872066;
    uint256 constant IC3y = 9061670440649321846901859372171340141321035485529705754670773467585527916105;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPompPairing = 128;

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

            function checkPompPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPompPairing := add(pMem, pPompPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                

                // -A
                mstore(_pPompPairing, calldataload(pA))
                mstore(add(_pPompPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPompPairing, 64), calldataload(pB))
                mstore(add(_pPompPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPompPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPompPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPompPairing, 192), alphax)
                mstore(add(_pPompPairing, 224), alphay)

                // beta2
                mstore(add(_pPompPairing, 256), betax1)
                mstore(add(_pPompPairing, 288), betax2)
                mstore(add(_pPompPairing, 320), betay1)
                mstore(add(_pPompPairing, 352), betay2)

                // vk_x
                mstore(add(_pPompPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPompPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPompPairing, 448), gammax1)
                mstore(add(_pPompPairing, 480), gammax2)
                mstore(add(_pPompPairing, 512), gammay1)
                mstore(add(_pPompPairing, 544), gammay2)

                // C
                mstore(add(_pPompPairing, 576), calldataload(pC))
                mstore(add(_pPompPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPompPairing, 640), deltax1)
                mstore(add(_pPompPairing, 672), deltax2)
                mstore(add(_pPompPairing, 704), deltay1)
                mstore(add(_pPompPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPompPairing, 768, _pPompPairing, 0x20)

                isOk := and(success, mload(_pPompPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals.offset, 0)))
            
            checkField(calldataload(add(_pubSignals.offset, 32)))
            
            checkField(calldataload(add(_pubSignals.offset, 64)))
            
            checkField(calldataload(add(_pubSignals.offset, 96)))
            

            // Validate all evaluations
            let isValid := checkPompPairing(_pA, _pB, _pC, _pubSignals.offset, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
