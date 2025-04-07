import type { Actions } from './$types';
import { Readable } from 'stream';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf';
import type { WeaviateClient } from 'weaviate-client';
import weaviate from 'weaviate-client';
import type { ChunkObject } from '$lib/types/ChunkObject';

const OPTIMAL_CHUNK_SIZE = 400;  // tokens
const CHUNK_OVERLAP = 50;
const CHARS_PER_TOKEN = 4; // Average for Llama-friendly models

let client: WeaviateClient;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadPath = process.env.NODE_ENV === 'production' 
    ? '/uploads' 
    : path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
// await fsPromises.mkdir(uploadPath, { recursive: true });

// ✅ Connect to Weaviate
async function connectToWeaviate(): Promise<WeaviateClient> {
    try {
        const clientPromise = weaviate.connectToCustom({
            httpHost: 'localhost',
            httpPort: 8080,
            grpcHost: 'localhost',
            grpcPort: 50051,
            headers: {
                'X-OpenAI-Api-Key': String(process.env.OPENAI_API_KEY || '')
            }
        });

        return clientPromise;
    } catch (error) {
        console.error('Weaviate connection failed:', error);
        throw new Error('Could not connect to Weaviate');
    }
}

// ✅ Load file chunks
export async function load() {
    client = await connectToWeaviate();

    if (!client) {
        return {
            status: 500,
            error: 'Failed to connect to Weaviate'
        };
    }

    const fileChunkCollection = client.collections.get<ChunkObject>('Chunks');

    if (fileChunkCollection) {
        const uniqueFileNames = new Set<string>();
        let count = 0;

        return {
            status: 200,
            count,
            fileNames: Array.from(uniqueFileNames)
        };
    } else {
        return {
            status: 404,
            error: 'No collections found'
        };
    }
}

// ✅ File upload action
export const actions = {
    uploadFile: async ({ request }) => {
        try {
            const formData = await request.formData();
            console.log('Received form data:', [...formData.entries()]);

            // const uploadedFile = formData?.get('file');
            const uploadedFile = formData?.get('file') as unknown as File | undefined
            if (!uploadedFile || typeof uploadedFile.name !== 'string') {
                console.error('Invalid file received:', uploadedFile);
                return { status: 400, body: { error: 'Invalid file uploaded' } };
            }

            const fileBuffer = await uploadedFile.arrayBuffer();
            const readableStream = Readable.from(Buffer.from(fileBuffer));

            // Clear upload directory
            const files = await fsPromises.readdir(uploadPath);
            for (const file of files) {
                await fsPromises.unlink(path.join(uploadPath, file));
            }

            // Save uploaded file
            const uploadedFilePath = path.join(uploadPath, uploadedFile.name);
            await pipeline(readableStream, fs.createWriteStream(uploadedFilePath));
            console.log('File uploaded successfully:', uploadedFilePath);

            const addedFileData = await createFileDataObject(uploadedFilePath);

            return { status: 200, success: 'File uploaded and processed successfully.', data: addedFileData };
        } catch (error) {
            console.error('File upload failed:', error);
            return { status: 500, body: { error: 'Failed to upload file' } };
        }
    }
} as Actions;

// ✅ Process uploaded PDF file
async function createFileDataObject(uploadedFilePath: string) {
    try {
        console.log('Processing file:', uploadedFilePath);
        
        //const loader = new WebPDFLoader(uploadedFilePath, { splitPages: true });
        const fileBuffer = await fsPromises.readFile(uploadedFilePath);
        const fileBlob = new Blob([fileBuffer]);
        const loader = new WebPDFLoader(fileBlob, { splitPages: true });
        const docs = await loader.load();
        const chunks = [];

        for (const doc of docs) {
            const pageContent = doc.pageContent;

            let startPos = 0;
            while (startPos < pageContent.length) {
                const chunk = pageContent.slice(startPos, startPos + (OPTIMAL_CHUNK_SIZE * CHARS_PER_TOKEN));

                chunks.push({
                    chunk_text: chunk,
                    file_name: path.basename(uploadedFilePath),
                    metadata: {
                        totalPages: docs.length,
                        pageNumberLocation: doc.metadata?.loc?.pageNumber,
                        chunkIndex: chunks.length,
                    }
                });

                startPos += ((OPTIMAL_CHUNK_SIZE - CHUNK_OVERLAP) * CHARS_PER_TOKEN);
            }
        }

        console.log(`Extracted ${chunks.length} chunks from file.`);
        await importFileChunks(chunks);

        return { success: true };
    } catch (error) {
        console.error('Error processing file:', error);
        throw new Error('Failed to process file');
    }
}

// ✅ Import file chunks into Weaviate
async function importFileChunks(chunks: any[]) {
    try {
        client = await connectToWeaviate();
        const fileChunkCollection = client.collections.get<ChunkObject>('Chunks');

        if (!fileChunkCollection) {
            throw new Error('Weaviate collection not found');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logPath = path.join(uploadPath, `chunks-log-${timestamp}.json`);

        await fsPromises.writeFile(logPath, JSON.stringify({ totalChunks: chunks.length, timestamp, chunks }, null, 2));
        console.log(`Chunk log written to: ${logPath}`);

        const BATCH_SIZE = 100;
        const batches = [];

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            batches.push(chunks.slice(i, i + BATCH_SIZE));
        }

        let totalInserted = 0;
        for (const [index, batch] of batches.entries()) {
            await fileChunkCollection.data.insertMany(batch);
            totalInserted += batch.length;
            console.log(`Progress: ${totalInserted} / ${chunks.length} chunks inserted`);
        }

        console.log('All chunks inserted successfully.');
    } catch (error) {
        console.error('Error importing chunks:', error);
        throw new Error('Failed to import chunks into Weaviate');
    }
}
