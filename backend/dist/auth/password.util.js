"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateSessionToken = generateSessionToken;
exports.hashSessionToken = hashSessionToken;
const node_crypto_1 = require("node:crypto");
function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString('hex');
    const hash = (0, node_crypto_1.scryptSync)(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, storedValue) {
    const [salt, storedHash] = storedValue.split(':');
    if (!salt || !storedHash) {
        return false;
    }
    const derivedHash = (0, node_crypto_1.scryptSync)(password, salt, 64);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    return (derivedHash.length === storedHashBuffer.length &&
        (0, node_crypto_1.timingSafeEqual)(derivedHash, storedHashBuffer));
}
function generateSessionToken() {
    return (0, node_crypto_1.randomBytes)(32).toString('hex');
}
function hashSessionToken(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
}
//# sourceMappingURL=password.util.js.map