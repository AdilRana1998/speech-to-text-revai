if (process.env.INVESTIGATION_EXTERNAL_DOC_AZURE_ENABLE === 'true') {
  const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");
  const credentials = new StorageSharedKeyCredential(process.env.INVESTIGATION_EXTERNAL_DOC_STORAGE_ACCOUNT, process.env.INVESTIGATION_EXTERNAL_DOC_STORAGE_KEY);
  const AZURE_STORAGE_CONNECTION_STRING = process.env.INVESTIGATION_EXTERNAL_DOC_STORAGE_CONNECTION_STRING || "no connection string";
  const CONTAINER_NAME = process.env.INVESTIGATION_EXTERNAL_DOC_CONTAINER;
  let azureExternalDocHealth = true
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.log("Azure Storage Connection string not found in env for the External Doc Health!");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const externalDocContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  (async () => {
    try {
      const exists = await externalDocContainerClient.exists();
      if (!exists) {
        console.log(`Azure container "${externalDocContainerClient.containerName}" does not exist for External Doc Health`);
      } else {
        azureExternalDocHealth = false
        console.log('Azure Blob Storage connected successfully as the storage for External Doc.');
        console.log(`Using container: ${externalDocContainerClient.containerName}`);
      }
    } catch (err) {
      azureExternalDocHealth = false
      console.log("Failed to connect to Azure Blob Storage for External Doc Health:", err);
    }
  })();

  module.exports = {
    blobServiceClient,
    externalDocContainerClient,
    azureExternalDocHealth,
    generateBlobSASQueryParameters,
    CONTAINER_NAME,
    BlobSASPermissions,
    credentials
  };
}