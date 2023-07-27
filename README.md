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
    cd packages/contracts; yarn deploy --network manta;
```

PT3 :  0x93367d611e548F23F2E48eD2553661c69176d303
IBT :  0xB0398a9C0e0c6F66aFFD78058Fd82F88eb805F33
V :  0xfb43eDACf79340cD4744004bae3a4F40e8F776C2
POMP :  0x08C1B3d605Bd4105d999e06D1A378faaE5d34626