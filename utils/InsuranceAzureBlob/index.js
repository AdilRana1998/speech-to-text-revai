if (process.env.INSURANCE_AZURE_ENABLE === 'true') {
  const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");
  const credentials = new StorageSharedKeyCredential(process.env.INSURANCE_AZURE_STORAGE_ACCOUNT, process.env.INSURANCE_AZURE_STORAGE_KEY);
  const AZURE_STORAGE_CONNECTION_STRING = process.env.INSURANCE_AZURE_STORAGE_CONNECTION_STRING || "no connection string";
  const CONTAINER_NAME = process.env.INSURANCE_AZURE_CONTAINER;
  let azureInsuranceHealth = true
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.log("Azure Storage Connection string not found in env for the insurance!");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  (async () => {
    try {
      const exists = await containerClient.exists();
      if (!exists) {
        console.log(`Azure container "${containerClient.containerName}" does not exist for Insurance`);
      } else {
        azureInsuranceHealth = false
        console.log('Azure Blob Storage connected successfully as the storage for Insurance.');
        console.log(`Using container: ${containerClient.containerName}`);
      }
    } catch (err) {
      azureInsuranceHealth = false
      console.log("Failed to connect to Azure Blob Storage for Insurance:", err);
    }
  })();

  module.exports = {
    blobServiceClient,
    containerClient,
    azureInsuranceHealth,
    generateBlobSASQueryParameters,
    CONTAINER_NAME,
    BlobSASPermissions,
    credentials
  };
}