import weaviate from 'weaviate-client'
import type { WeaviateClient } from 'weaviate-client'
import type { PageServerLoad } from './$types'

let client: WeaviateClient

// Ensure the client is initialized properly
async function connectToWeaviate() : Promise<WeaviateClient> {
    const clientPromise = weaviate.connectToCustom({
		httpHost: 'localhost',
		httpPort: 8080,
		grpcHost: 'localhost',
		grpcPort: 50051
	});
	return clientPromise;
}

export const load: PageServerLoad = async () => {
    
    client = await connectToWeaviate()
   
    //client = await weaviate.connectToLocal()

    const clientReadiness = await client.isReady()

    console.log('Client is ready:', clientReadiness) // should return true

    client.close()

    return {
        ready: clientReadiness
    }
}