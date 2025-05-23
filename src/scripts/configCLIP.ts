import weaviate, { type WeaviateClient, type Collection } from 'weaviate-client'

let client: WeaviateClient


async function connectToWeaviate() : Promise<WeaviateClient> {
    const clientPromise = weaviate.connectToCustom({
		httpHost: 'localhost',
		httpPort: 8080,
		grpcHost: 'localhost',
		grpcPort: 50051
	});
	return clientPromise;
}

const clipSchema = {
    name: 'ImageCollection',
    description: 'Collection of images',
    properties: [
        {
            name: 'title',
            dataType: 'text' as const,
        },
        { 
            name: 'thumbnailPath',
            dataType: 'text' as const,
        },
        {
           name: 'poster',
           dataType: 'blob' as const,
        },
    ],
    vectorizers: [
        weaviate.configure.vectorizer.multi2VecClip({
            name: 'title_vector',
            imageFields: [
                {
                    name: 'poster',
                    weight: 0.9
                }
            ],
            textFields: [
                {
                    name: 'title',
                    weight: 0.1
                }
            ]
        })
    ]
}

async function addCollection() {
    try {
        await client.collections.create(clipSchema)
        console.log('Added the ImageCollection collection')
    } catch (err) {
        console.error('Failed to add the ImageCollection collection', err)
    }
}

async function getCollectionCount(collectionName: string) {
    try {
        const collection: Collection = client.collections.get(collectionName)
        let count = 0
        for await (const _ of collection.iterator()) {
            count++
        }
        console.log(`The ${collectionName} collection has ${count} items`)
    } catch (err) {
        console.error(`Failed to get the ${collectionName} collection`)
    }
}


async function run() {
    const startTime: Date = new Date()
    console.log('Starting user embedded file schema creation...')

    client = await connectToWeaviate()
    await addCollection() //comment out for delete
    //await client.collections.delete('ImageCollection') //un-comment when deleteing, comment out line above and below "add and get"
    await getCollectionCount('ImageCollection') //comment out for delete 
     // npm run localDockerRestart
    // npm run configCLIP
   

    const endTime: Date = new Date()
    const elapsedTime: number = endTime.getTime() - startTime.getTime();
	const elapsedTimeSeconds: number = elapsedTime / 1000;
	const elapsedTimeMinutes: number = elapsedTimeSeconds / 60;

	console.log(
		`Total running time: ${elapsedTimeSeconds} seconds or ${elapsedTimeMinutes} minutes.`
	);
}

await run()