function isTrue(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function isProductionRuntime() {
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();

  return vercelEnv === 'production' || nodeEnv === 'production';
}

module.exports = {
  isTrue,
  isProductionRuntime,
};
