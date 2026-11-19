async function parseIfJson(input) {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) return true;
    } catch (error) {
      return false;
    }
  }
  return input;
}

module.exports = { parseIfJson };

