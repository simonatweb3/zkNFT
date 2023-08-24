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
    uint256 constant deltax1 = 19242022507178515022530449990547182053534042614162704361305650822418053880199;
    uint256 constant deltax2 = 9754292090309922252658172750377078502266969458363648946359057058596332129695;
    uint256 constant deltay1 = 21379227192048088730546575844469868255978899411843492600432882574230834178672;
    uint256 constant deltay2 = 10228968816659207949394728541012714644213165922055811268900222049991135063242;

    
    uint256 constant IC0x = 18143803865173905597805845545029057581700587248799331831249934806093940964196;
    uint256 constant IC0y = 19485909459769089318123798620494994193082200070152280803046041445582252036740;
    
    uint256 constant IC1x = 48461874976923766792167904505448167919389144734618675841132661345259310065;
    uint256 constant IC1y = 21508179733432428726054552626752383326298782016312551612206911896302012954014;
    
    uint256 constant IC2x = 1935671099575496853577522995251671004967087316502777505582786571520861636213;
    uint256 constant IC2y = 19947259729749884729426409084948516933850064264626781344980739156642092086839;
    
    uint256 constant IC3x = 9784691613030050154649265195192567905078283093309327536909824530303711470938;
    uint256 constant IC3y = 18123309083298087035462300907187277126441950848699461629690495209441506050227;
    
 
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
            

            // Validate all evaluations
            let isValid := checkZksbtPairing(_pA, _pB, _pC, _pubSignals.offset, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
