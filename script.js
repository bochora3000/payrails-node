// Listen for the form submission event
document
  .getElementById("cardForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      // Fetch configurations from the server
      const configResponse = await fetch(
        "http://localhost:3000/client-configurations"
      );

      // Check if configuration response is successful
      if (!configResponse.ok) {
        throw new Error("Failed to fetch configurations");
      }

      // Extract configuration data from the response
      const configData = await configResponse.json();

      // Gather card data from the form and retrieved configuration
      const cardData = {
        cardNumber: document.getElementById("cardNumber").value,
        expiryMonth: document.getElementById("expiryMonth").value,
        expiryYear: document.getElementById("expiryYear").value,
        securityCode: document.getElementById("securityCode").value,
        holderName: document.getElementById("holderName").value,
        holderReference: configData.holderReference,
      };

      // Retrieve the public key for tokenization
      const publicKey = configData.tokenization.publicKey;

      // Send card data and public key for tokenization
      const tokenizeResponse = await fetch("http://localhost:3000/tokenize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardData,
          publicKey,
        }),
      });

      // Check if tokenization response is successful
      if (!tokenizeResponse.ok) {
        throw new Error("Network response was not ok");
      }

      // Extract tokenization data from the response
      const tokenizationData = await tokenizeResponse.json();

      // Create HTML content with tokenization response data
      const tokenizationResponseHtml = `
      <p>ID: ${tokenizationData.id}</p>
      <p>Created At: ${tokenizationData.createdAt}</p>
      <p>Updated At: ${tokenizationData.updatedAt}</p>
      <p>Holder ID: ${tokenizationData.holderId}</p>
      <p>Status: ${tokenizationData.status}</p>
    `;

      // Update the HTML container with tokenization response
      const responseContainer = document.getElementById("tokenizationResponse");
      responseContainer.innerHTML = tokenizationResponseHtml;
    } catch (error) {
      console.error("Error fetching configurations:", error);
    }
  });
