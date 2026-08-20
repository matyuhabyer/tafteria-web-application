function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function stripSourceBoilerplate(value) {
  return String(value || '')
    .replace(/,?\s*mapped by the OpenStreetMap community\.?\s*$/i, '.')
    .replace(/\.\.+$/, '.')
    .trim();
}

module.exports = { escapeRegex, safeJson, stripSourceBoilerplate };
