const jose = require('node-jose');

// Function to convert raw key to PEM format
function formatPublicKeyToPEM(publicKey) {
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";

  const chunks = [];
  for (let i = 0; i < publicKey.length; i += 64) {
    chunks.push(publicKey.substr(i, 64));
  }

  const pemContent = chunks.join("\n");
  const pemKey = `${pemHeader}\n${pemContent}\n${pemFooter}`;

  return pemKey;
}

// Your provided public key
const rawPublicKey =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3kOM8fTXa7oMdYxGCa9u8Z6ym2Ldczt2x7kAmHKV9jT8YG7PaGxv4E5nRjZnT9OU0fZZAGUGng1RDrRaCFwcZpOD5m56sG1LaYQ8dkaxSG2M1BynLeK9XRiZEmx1JhD0Pk4mm5sIFIg3Oa486CWMVrjgCpsF1VIgT7yGoNOk8tdOqPZ206ATXd+5BxArQ3aup9ziD0nsk66CRchXVCgF7Gc/ySEsc+B3GhF4qqFSvZbAJ4hG1uc1/8G2XbKoJIdpgc4QavnvtADATJBmqyHio70ds76gQJAMs8uMpgN9FOqYqj5XSEX9K/WbHQBnqjBoprZPngq8hzHukbx8XhqrfQIDAQAB";

// Convert raw key to PEM format
const pemFormattedKey = formatPublicKeyToPEM(rawPublicKey);

// Data you want to encrypt
const dataToEncrypt = {
  cardNumber: "4111111111111111",
  expiryMonth: "03",
  expiryYear: "30",
  securityCode: "737",
  holderName: "John Doe",
  holderReference: "customer123",
};

async function encryptData() {
  try {
    const keystore = jose.JWK.createKeyStore();
    let key = await keystore.add(pemFormattedKey, "pem");

    // Simulate export & re-import of key to ensure proper serialization
    key = await jose.JWK.asKey(JSON.parse(JSON.stringify(key.toJSON(true))));

    const encrypted = await jose.JWE.createEncrypt(key)
      .update(JSON.stringify(dataToEncrypt))
      .final();

    console.log("Encrypted data:", encrypted);
  } catch (error) {
    console.error("Encryption failed:", error);
  }
}

encryptData();
