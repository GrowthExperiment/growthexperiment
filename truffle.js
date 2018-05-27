//require('zeppelin-solidity');
require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity)/
});
//require('babel-register');
require('babel-polyfill');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      gas: 6500000,
      network_id: "*"
    }
  }
};
