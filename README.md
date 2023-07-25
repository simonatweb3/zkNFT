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