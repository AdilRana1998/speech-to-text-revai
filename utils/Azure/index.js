if (process.env.AZURE_ENABLE === 'true') {
  const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING_RECALL_VIDEO || "no connection string";
  const CONTAINER_NAME = process.env.AZURE_CONTAINER_RECALL_VIDEO;
  let azureRecallHealth = true
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.log("Azure Storage Connection string not found in env for the recall!");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  (async () => {
    try {
      const exists = await containerClient.exists();
      if (!exists) {
        console.log(`Azure container "${containerClient.containerName}" does not exist`);
      } else {
        azureRecallHealth = false
        console.log('Azure Blob Storage connected successfully as the storage for recall videos.');
        console.log(`Using container: ${containerClient.containerName}`);
      }
    } catch (err) {
      azureRecallHealth = false
      console.log("Failed to connect to Azure Blob Storage:", err);
    }
  })();

  module.exports = {
    blobServiceClient,
    containerClient,
    azureRecallHealth,
    generateBlobSASQueryParameters,
    CONTAINER_NAME,
    BlobSASPermissions
  };
}


