# Get Started

1. upgrade yarn to support workspace
```shell
    yarn set version 3.5.0
```

2. install depandency
```shell
    yarn
```

3. Test

- JSSDK
    ```shell
        cd packages/jssdk
        yarn build; yarn test
    ```

- Contract
    ```shell
        cd packages/jssdk; yarn build; cd -;
        cd packages/contracts
        yarn build; yarn test
    ```

- Circuit
    ```shell
        cd packages/circuits
        yarn build; yarn test
    ```

- Browser
    ```shell
        cd packages/jssdk; yarn build; cd -;
        cd packages/browser
        yarn build; yarn test
    ```

4. Contract Deploy/Upgrade

```shell
    cd packages/contracts;
    cp testnet.env .env
    yarn deploy --network manta;
```

VERIFIER = 0x97B41d3F0b78f5Ae22e02bcECBaEf680878009CA
SBT = 0x2deE1b91f02C5F94FfBE62C427A1dB828E314153
ZKSBT = 0x41dB82dCa42363e8C88797eFf77e1279Ef3D5AAA

5. Contract Upgrade
```shell
    yarn upgrade --network manta
```