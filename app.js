// Load env variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jose = require("node-jose");

const app = express();
app.use(cors());
app.use(express.json());

const axios = require("axios");

// When client hits this route, I get access token, initialize the client and send data back to client
app.get("/client-configurations", async (req, res) => {
  const CLIENT_ID = process.env.CLIENT_ID; // Fetching client_id from .env
  const API_KEY = process.env.API_KEY; // Fetching api_key from .env

  try {
    // Here i start fetching access token
    const url = `http://localhost:3001/auth/token/${CLIENT_ID}`;
    const headers = {
      accept: "application/json",
      "x-api-key": API_KEY,
    };

    const response = await axios.post(url, null, { headers });
    const access_token = response.data.access_token;

    // Here i fetch client configuration
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

    // I receive base64 data and I decode it and then parse to JSON
    const base64Data = clientResponse.data.data;
    const decodedData = Buffer.from(base64Data, "base64").toString("utf-8");
    const clientConfigurations = JSON.parse(decodedData);

    // Sending configuration back to frontend
    res.json(clientConfigurations);
  } catch (error) {
    console.error("Error fetching client configurations:", error);
    res.status(500).json({ error: "Error fetching configurations" });
  }
});

// When client hits this route, I get prepare data for proper encoding, encode and tokenize. Lastly i send back tokenization result to client.
app.post("/tokenize", async (req, res) => {
  const { cardData, publicKey } = req.body;
  console.log(cardData);
  console.log(publicKey);

  // Function to convert raw public key received from Payrails to proper PEM key
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

  try {
    // Converting publicKey and storing in variable
    const pemFormattedKey = formatPublicKeyToPEM(publicKey);

    // Prepare payment details as one object with all needed data including holderReference
    const dataToEncrypt = {
      cardNumber: cardData.cardNumber,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      securityCode: cardData.securityCode,
      holderName: cardData.holderName,
      holderReference: cardData.holderReference,
    };

    // Create an empty key store to manage cryptographic keys
    const keystore = jose.JWK.createKeyStore();
    // Add a public key in PEM format to the key store
    // pemFormattedKey: The public key in PEM format to be added
    // "pem": Indicates the format of the key being added (in this case, PEM)
    let key = await keystore.add(pemFormattedKey, "pem");

    // Simulate export & re-import of key to ensure proper serialization
    // I do this as a workaround because i had trouble with serialiation an my code was throwing errors. This solved an issue.
    key = await jose.JWK.asKey(JSON.parse(JSON.stringify(key.toJSON(true))));

    // Finally calling encryption and storing in encrypted
    const encrypted = await jose.JWE.createEncrypt(key)
      .update(JSON.stringify(dataToEncrypt))
      .final();

    // I am preparing tokenization payload. I built this based on provided documentation
    const tokenizationPayload = {
      storeInstrument: true, //
      holderReference: cardData.holderReference,
      encryptedInstrumentDetails: encrypted,
      futureUsage: "CardOnFile",
    };

    // I am preparing a header here. I read that "x-idempotency-key" can be anything. i took it from documentation
    const tokenizationHeaders = {
      accept: "application/json",
      "x-idempotency-key": process.env.X_IDEMPOTENCY_KEY,
      "content-type": "application/json",
    };

    const tokenizationUrl =
      "http://localhost:3001/public/payment/instruments/tokenize";

    // Making a POST request to tokenization endpoint with url, payload and header
    const tokenizationResponse = await axios.post(
      tokenizationUrl,
      tokenizationPayload,
      {
        headers: tokenizationHeaders,
      }
    );

    // Destructuring data that i receive from tokenization enpoint
    const { id, createdAt, updatedAt, holderId, status } =
      tokenizationResponse.data;

    // Sending it back to client
    res.json({ id, createdAt, updatedAt, holderId, status });
  } catch (error) {
    console.error("Error during tokenization:", error);
    res.status(500).json({ error: "Tokenization failed" });
  }
});

// My express server is running on port 3000
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
