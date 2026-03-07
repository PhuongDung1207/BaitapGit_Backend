function getEnv() {
  return {
    port: Number(process.env.PORT) || 3000
  };
}

module.exports = {
  getEnv
};
