const app = require("./app");
const { getEnv } = require("./config/env");

const env = getEnv();

app.listen(env.port, () => {
  console.log(`Storage Management API listening on port ${env.port}`);
});
