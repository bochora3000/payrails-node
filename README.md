# Card Tokenization Application

This application facilitates secure tokenization of card information by integrating with a payment service provider. It allows users to input card details and obtain a tokenized representation for secure transactions.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Installation

1. Clone this repository.
2. Install dependencies by running `npm install`.
3. Create a `.env` file and provide necessary environment variables (e.g., `CLIENT_ID`, `API_KEY`, `X_IDEMPOTENCY_KEY`).
4. Start the server with `npm start`.

## Usage

1. Open `index.html` in a web browser.
2. Fill in the payment information (card number, expiry, CVV, holder's name).
3. Click on "Tokenize Card" to initiate the tokenization process.
4. View the tokenization response displayed on the web page.

## API Endpoints

### GET `/client-configurations`

- **Purpose:** Fetches client configurations including access tokens and client settings.
- **Method:** GET
- **Endpoint:** `http://localhost:3000/client-configurations`
- **Response:** JSON object containing client configurations.

### POST `/tokenize`

- **Purpose:** Tokenizes card information received from the client.
- **Method:** POST
- **Endpoint:** `http://localhost:3000/tokenize`
- **Request Payload:** JSON object containing card data and public key.
- **Response:** JSON object with tokenized card details.

## Configuration

Ensure you have the following environment variables set in the `.env` file:

- `CLIENT_ID`: Your client ID for authentication.
- `API_KEY`: Your API key for authorization.
- `X_IDEMPOTENCY_KEY`: Key for ensuring idempotent requests.