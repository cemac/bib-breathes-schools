/*
 https://gist.github.com/tscholl2/dc7dc15dc132ea70a98e8542fefffa28
 */

/**
 * Encodes a utf8 string as a byte array.
 * @param {String} str
 * @returns {Uint8Array}
 */
function str2buf(str) {
    return new TextEncoder("utf-8").encode(str);
}

/**
 * Decodes a byte array as a utf8 string.
 * @param {Uint8Array} buffer
 * @returns {String}
 */
function buf2str(buffer) {
    return new TextDecoder("utf-8").decode(buffer);
}

/**
 * Decodes a string of hex to a byte array.
 * @param {String} hexStr
 * @returns {Uint8Array}
 */
function hex2buf(hexStr) {
    return new Uint8Array(hexStr.match(/.{2}/g).map(h => parseInt(h, 16)));
}

/**
 * Encodes a byte array as a string of hex.
 * @param {Uint8Array} buffer
 * @returns {String}
 */
function buf2hex(buffer) {
    return Array.prototype.slice
        .call(new Uint8Array(buffer))
        .map(x => [x >> 4, x & 15])
        .map(ab => ab.map(x => x.toString(16)).join(""))
        .join("");
}

/**
 * Given a passphrase, this generates a crypto key
 * using `PBKDF2` with SHA256 and 1000 iterations.
 * If no salt is given, a new one is generated.
 * The return value is an array of `[key, salt]`.
 * @param {String} passphrase
 * @param {UInt8Array} salt [salt=random bytes]
 * @returns {Promise<[CryptoKey,UInt8Array]>}
 */
function deriveKey(passphrase, salt) {
    salt = salt || crypto.getRandomValues(new Uint8Array(8));
    return crypto.subtle
        .importKey("raw", str2buf(passphrase), "PBKDF2", false, ["deriveKey"])
        .then(key =>
            crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" },
                key, { name: "AES-GCM", length: 256 },
                false, ["encrypt", "decrypt"],
            ),
        )
        .then(key => [key, salt]);
}

/**
 * Given a key and ciphertext (in the form of a string) as given by `encrypt`,
 * this decrypts the ciphertext and returns the original plaintext
 * @param {String} passphrase
 * @param {String} saltIvCipherHex
 * @returns {Promise<String>}
 */
function decrypt(passphrase, saltIvCipherHex) {
    const [salt, iv, data] = saltIvCipherHex.split("-").map(hex2buf);
    return deriveKey(passphrase, salt)
        .then(([key]) => crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data))
        .catch(error => { v => ''; })
        .then(v => buf2str(new Uint8Array(v)));
}
