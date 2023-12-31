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
    yarn deploy --netwowrk xxx
```

5. Contract Upgrade
```shell
    yarn upgrade --network xxx
```


# Design Trade-off

1. merkle tree depth
    - 16 : build 60s, zkey 1.9M, prove time 2s, mint gas < 1M
    - 20 : build 66s, zkey 3.7M, prove time 2s, mint gas 
    - 32 : build 95s, zkey 5.0M, prove time 2s, mint gas < 3M