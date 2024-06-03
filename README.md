## Dependencies

Install ts-node

```sh
npm i -g ts-node
```

Install dependencies

```sh
yarn
```


## Usage

The commands to use will depend on which chain and graph node the subgraph is for. 

For apothem on a local graph node, we can use the following commands:



Prepare the subgraph

```sh
yarn prep:apothem:{env} where env can be either dev or demo.
```

Create the subgraph on a local graph node

```sh
yarn create:local
```

Deploy the subgraph on a local graph node

```sh
yarn deploy:local
```

Remove the subgraph on a local graph node

```sh
yarn remove:local
```
