"use client"; // This is a client component

import { PompSdk } from '@pomp-eth/jssdk'
import { useEffect, useState } from 'react';

export default function Home() {
  const [id, setId] = useState<string>();

  useEffect(() => {
    const fetchData = async () => {
      const keys = {
        trapdoor: '0x1eccc2f94bc8cbfa15f28139cf405aa5',
        nullifier: '0x63282aa64ff35e16b70ee14085b52da8'
      }
      const sdk = new PompSdk();
      const _id = sdk.generateIdentity(JSON.stringify(keys))
      console.log("_id : ", _id)
      setId(_id.toString());
    };

    fetchData();
  }, []);


  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div> pomp id : {id} </div>
    </main>
  )
}
