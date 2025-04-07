import weaviate from 'weaviate-client';
import type { WeaviateClient } from 'weaviate-client';

// Singleton client instance
let client: WeaviateClient | null = null;

/**
 * Connect to Weaviate and return a client instance
 * Maintains a singleton pattern to avoid multiple connections
 */
export async function connectToWeaviate(): Promise<WeaviateClient> {
  if (client) {
    return client;
  }

  const clientPromise = weaviate.connectToCustom({
    httpHost: 'localhost',
    httpPort: 8080,
    grpcHost: 'localhost',
    grpcPort: 50051,
    headers: {
      'x-openai-api-key': String(process.env.OPENAI_API_KEY || '')
    }
  });

  client = await clientPromise;
  return client;
}

/**
 * Reset the client connection (useful for testing)
 */
export function resetWeaviateConnection(): void {
  if (client) {
    client.close();
    client = null;
  }
}

/**
 * Check if Weaviate is ready
 */
export async function isWeaviateReady(): Promise<boolean> {
  const weaviateClient = await connectToWeaviate();
  return weaviateClient.isReady();
}