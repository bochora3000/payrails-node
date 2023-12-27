require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jose = require("node-jose");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Function to format public key to PEM format
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

// Function to fetch client configurations
async function fetchClientConfigurations() {
  const CLIENT_ID = process.env.CLIENT_ID;
  const API_KEY = process.env.API_KEY;

  try {
    const url = `http://localhost:3001/auth/token/${CLIENT_ID}`;
    const headers = {
      accept: "application/json",
      "x-api-key": API_KEY,
    };

    const response = await axios.post(url, null, { headers });
    const access_token = response.data.access_token;

    const clientInitUrl = "http://localhost:3001/merchant/client/init";
    const clientHeaders = {
      accept: "application/json",
      "x-api-key": API_KEY,
      Authorization: `Bearer ${access_token}`,
    };

    const clientRequestBody = {
      type: "tokenization",
      holderReference: "some customer reference",
    };

    const clientResponse = await axios.post(clientInitUrl, clientRequestBody, {
      headers: clientHeaders,
    });

    const base64Data = clientResponse.data.data;
    const decodedData = Buffer.from(base64Data, "base64").toString("utf-8");
    const clientConfigurations = JSON.parse(decodedData);

    return clientConfigurations;
  } catch (error) {
    console.error("Error fetching client configurations:", error);
    throw new Error("Error fetching client configurations");
  }
}

// Function to tokenize card data
async function tokenizeCardData(cardData, publicKey, token) {
  try {
    const pemFormattedKey = formatPublicKeyToPEM(publicKey);

    const dataToEncrypt = {
      ...cardData,
      holderReference: cardData.holderReference,
    };

    const keystore = jose.JWK.createKeyStore();
    let key = await keystore.add(pemFormattedKey, "pem");

    const encrypted = await jose.JWE.createEncrypt(
      {
        format: "compact",
        fields: {
          alg: "RSA-OAEP-256",
          enc: "A256CBC-HS512",
        },
      },
      key
    )
      .update(JSON.stringify(dataToEncrypt))
      .final();

    const tokenizationPayload = {
      storeInstrument: true,
      holderReference: cardData.holderReference,
      encryptedInstrumentDetails: encrypted,
      futureUsage: "CardOnFile",
    };

    const tokenizationHeaders = {
      accept: "application/json",
      "x-idempotency-key": process.env.X_IDEMPOTENCY_KEY,
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const tokenizationUrl =
      "http://localhost:3001/public/payment/instruments/tokenize";

    const tokenizationResponse = await axios.post(
      tokenizationUrl,
      tokenizationPayload,
      {
        headers: tokenizationHeaders,
      }
    );

    const { id, createdAt, updatedAt, holderId, status } =
      tokenizationResponse.data;

    return { id, createdAt, updatedAt, holderId, status };
  } catch (error) {
    console.error("Error during tokenization:", error);
    throw new Error("Error during tokenization");
  }
}

// Routes

app.get("/client-configurations", async (req, res) => {
  try {
    const clientConfigurations = await fetchClientConfigurations();
    res.json(clientConfigurations);
  } catch (error) {
    console.error("Error fetching client configurations:", error);
    res.status(500).json({ error: "Error fetching configurations" });
  }
});

app.post("/tokenize", async (req, res) => {
  const { cardData, publicKey, token } = req.body;

  try {
    const tokenizationResult = await tokenizeCardData(
      cardData,
      publicKey,
      token
    );
    res.json(tokenizationResult);
  } catch (error) {
    console.error("Error during tokenization:", error);
    res.status(500).json({ error: "Tokenization failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
