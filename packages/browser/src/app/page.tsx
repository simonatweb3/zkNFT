"use client"; // This is a client component

import { PompSdk } from '@pomp-eth/jssdk'
import { useEffect, useState } from 'react';
//import { useAccount, useBalance, useDisconnect, useSignMessage } from 'wagmi';
import { 
  WagmiConfig, 
  useConnect,
  useAccount,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  createConfig,
  configureChains,
  mainnet } from 'wagmi'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
//import { ethers } from "ethers";
import { useEthersSigner } from '../ethers'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [alchemyProvider({ apiKey: 'IT4BGzB6VZM_lq0ZTwEJQeswVYNf77zd' }), publicProvider()],
)
console.log("chains : ", chains)

const config = createConfig(
  {
    autoConnect: true,
    connectors: [
      new MetaMaskConnector({ chains }),
    ],
    publicClient,
    webSocketPublicClient,
  }
)

function Profile() {
  const { address, connector, isConnected } = useAccount()
  const { data: ensAvatar } = useEnsAvatar({ address })
  const { data: ensName } = useEnsName({ address })
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div>
        {/* <img src={ensAvatar} alt="ENS Avatar" /> */}
        <div>{ensName ? `${ensName} (${address})` : address}</div>
        {/* <div>Connected to {connector.name}</div> */}
        <div>Connected to metmask </div>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {!connector.ready && ' (unsupported)'}
          {isLoading &&
            connector.id === pendingConnector?.id &&
            ' (connecting)'}
        </button>
      ))}

      {error && <div>{error.message}</div>}
    </div>
  )
}

function SDK() {
  const [id, setId] = useState<string>();
  const signer = useEthersSigner()

  useEffect(() => {
    const fetchData = async () => {
      //setId("0x1234567")
      const sdk = await PompSdk.create(
          "0x8F8a52Ee35A15F29c789b7a635aA78bC10628B87", // TODO : Fake, To Be Changed
          signer,   // TODO, metamask signer
          "https://p0x-labs.s3.amazonaws.com/pomp/wasm/pomp.wasm",
          "https://p0x-labs.s3.amazonaws.com/pomp/zkey/pomp.zkey"
      )
      console.log("identity : ", sdk.identity.getCommitment())
      setId(sdk.identity.getCommitment().toString());
    };

    fetchData();
  }, []);

  return(
    <div> SDK identity : {id} </div>
  )
}

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <WagmiConfig config={config}>
        <SDK />
      </WagmiConfig>
  
      {/* <WagmiConfig config={config}>
        <Profile />
      </WagmiConfig> */}
    </main>
  )
}
