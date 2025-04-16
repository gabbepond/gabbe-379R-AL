import OpenAI from 'openai'
import type { MessageBody } from '$lib/types/MessageBody'
import weaviate, { type WeaviateClient } from 'weaviate-client'
import type { ChunkObject } from '$lib/types/ChunkObject'

const openai = new OpenAI({
	baseURL: 'http://localhost:11434/v1',
	apiKey: 'ollama' // required but unused
})

let client: WeaviateClient

async function connectToWeaviate(): Promise<WeaviateClient> {
	const clientPromise = weaviate.connectToCustom({
		httpHost: 'localhost',
		httpPort: 8080,
		grpcHost: 'localhost',
		grpcPort: 50051,
		headers: {
			'x-openai-api-key': String(process.env.OPENAI_API_KEY || '')
		}
	})
	return clientPromise
}

const helpfulAssistant = `You are a helpful assistant. Do not assume the student has any prior knowledge. Be friendly! You may use emojis.`
const emojiPirate = `You are a pirate! Speak like a pirate. Relate answers to pirate life. Be helpful and friendly. Use emojis!`
const rubberDuckPrompt = `As an experienced Web Development mentor...` // truncated for brevity
const physicsTutorPrompt = `# Base Persona: You are an AI physics tutor...` // truncated for brevity

const SYSTEM_PROMPTS = {
	'Helpful Assistant': helpfulAssistant,
	'Emoji Pirate': emojiPirate,
	'Web Development Instructor': rubberDuckPrompt,
	'Physics Tutor': physicsTutorPrompt
} as const

type SystemPromptKey = keyof typeof SYSTEM_PROMPTS

export const POST = async ({ request }) => {
	try {
		client = await connectToWeaviate()
		const body: MessageBody = await request.json()
		const { chats, systemPrompt, deepSeek, fileNames } = body

		if (!chats || !Array.isArray(chats)) {
			return new Response('Invalid chat history', { status: 400 })
		}

		if (fileNames && Array.isArray(fileNames) && fileNames.length > 0) {
			const chunksCollection = client.collections.get<ChunkObject>('Chunks')

			const generatePrompt = `You are a knowledgeable assistant analyzing document content.
Instructions:
- Use the provided text to answer questions accurately
- If specific data points are mentioned, ensure they match exactly
- Quote relevant passages when appropriate
- If information isn't in the documents, say so
- Maintain conversation context
Current question: "${chats[chats.length - 1].content}"
Previous context: "${chats.slice(-2, -1).map((chat) => chat.content).join('\n')}"`

			const currentQuery = chats[chats.length - 1].content

			try {
				const result = await chunksCollection.generate.nearText(
					currentQuery,
					{ groupedTask: generatePrompt },
					{ limit: 3 }
				)

				if (!result.generated) {
					return new Response(
						"I couldn't find specific information matching your query. Could you rephrase or be more specific?",
						{ status: 200 }
					)
				}

				return new Response(result.generated, { status: 200 })
			} catch (error) {
				return new Response('Something went wrong', { status: 500 })
			}
		} else {
			const selectedPrompt =
				SYSTEM_PROMPTS[systemPrompt as SystemPromptKey] ?? SYSTEM_PROMPTS['Helpful Assistant']

			const stream = await openai.chat.completions.create({
				model: deepSeek ? 'deepseek-r1:8b' : 'llama3.2',
				messages: [{ role: 'system', content: selectedPrompt }, ...body.chats],
				stream: true
			})

			const readableStream = new ReadableStream({
				async start(controller) {
					for await (const chunk of stream) {
						const text = chunk.choices[0]?.delta?.content || ''
						controller.enqueue(text)
					}
					controller.close()
				}
			})

			// ✅ FIXED: Correct content type for streaming text
			return new Response(readableStream, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8'
				}
			})
		}
	} catch (error) {
		return new Response('Something went wrong', { status: 500 })
	}
}
