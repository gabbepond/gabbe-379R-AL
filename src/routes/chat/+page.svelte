<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import TypingIndicator from '$lib/utils/typingIndicator.svelte';
	import { readableStreamStore } from '$lib/readableStreamStore.svelte';
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import DOMPurify from 'dompurify';
	import ChatAppBar from '$lib/components/ChatAppBar.svelte';
	import FileUploadAside from '$lib/components/FileUploadAside.svelte';
	import { CircleX } from 'lucide-svelte';

	import BotIcon from 'lucide-svelte/icons/bot';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import Image from 'lucide-svelte/icons/image';
	import Home from 'lucide-svelte/icons/home';

	import hljs from 'highlight.js';
	import javascript from 'highlight.js/lib/languages/javascript';
	import typescript from 'highlight.js/lib/languages/typescript';
	import css from 'highlight.js/lib/languages/css';

	hljs.registerLanguage('javascript', javascript);
	hljs.registerLanguage('typescript', typescript);
	hljs.registerLanguage('css', css);

	const marked = new Marked(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight: (code, lang) => {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	interface PageData {
		fileNames?: string[];
	}

	let { data } = $props<{ data: PageData }>();

	let systemPrompt = $state('');
	let examplePrompt = $state('');
	let deepSeek = $state(false);
	let fileNames = $state([] as string[]);

	let chatHistory = $state(
		typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('chatHistory') || '[]') : []
	);
	$effect(() => {
		if (data?.fileNames) {
			fileNames = [...data.fileNames];
			console.log("File names loaded from page data:", fileNames);
		}
	});

	$effect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
		}
	});

	const response = readableStreamStore();
	let responseText = $state('');

	function stripThinkTags(text: string): string {
		const thinkRegex = /<think>[\s\S]*?<\/think>/g;
		return text.replace(thinkRegex, '');
	}

	$effect(() => {
		if (response.text !== '') {
			(async () => {
				const parsedText = await marked.parse(response.text);
				responseText = DOMPurify.sanitize(parsedText)
					.replace(/<script>/g, '&lt;script&gt;')
					.replace(/<\/script>/g, '&lt;/script&gt;');
			})();
		}
	});

	async function handleSubmit(this: HTMLFormElement, event: Event) {
		event?.preventDefault();
		if (response.loading) return;

		const formData: FormData = new FormData(this);
		const message = formData.get('message');

		if (!message) return;

		chatHistory = [...chatHistory, { role: 'user', content: message as string }];

		try {
			const answer = response.request(
				new Request('/api/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ chats: chatHistory, systemPrompt, deepSeek, fileNames })
				})
			);

			this.reset();
			const answerText = (await answer) as string;
			const parsedAnswer = await marked.parse(answerText);
			const purifiedText = DOMPurify.sanitize(parsedAnswer)
				.replace(/<script>/g, '&lt;script&gt;')
				.replace(/<\/script>/g, '&lt;/script&gt;');

			chatHistory = [...chatHistory, { role: 'assistant', content: purifiedText }];
			console.log(answerText);
		} catch (error) {
			console.error(error);
		}
	}

	function deleteAllChats() {
		console.log('Deleting all chats');
		chatHistory = [];
	}

	function deleteFileName(fileName: string) {
		fileNames = fileNames.filter((name) => name !== fileName);
	}
</script>

<!-- TOP AI-THEMED NAVIGATION BAR -->
<header class="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md shadow-md border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
		<!-- Brand -->
		<div class="flex items-center space-x-3">
			<BotIcon class="h-8 w-8 text-indigo-600" />
			<span class="text-xl font-bold text-gray-800 tracking-tight">AI ChatBot</span>
		</div>
		<!-- Nav Links -->
		<nav class="flex space-x-6 text-gray-600 font-medium">
			<a href="/" class="hover:text-indigo-600 transition flex items-center space-x-1">
				<Home class="w-5 h-5" />
				<span>Home</span>
			</a>
			<a href="/chat" class="hover:text-indigo-600 transition flex items-center space-x-1">
				<MessageSquare class="w-5 h-5" />
				<span>Chat</span>
			</a>
			<a href="/images" class="hover:text-indigo-600 transition flex items-center space-x-1">
				<Image class="w-5 h-5" />
				<span>Images</span>
			</a>
		</nav>
	</div>
</header>

<!-- MAIN CHAT CONTENT -->
<main class="flex min-h-screen w-screen flex-col items-center bg-pink-100">
	<ChatAppBar bind:selectedSystemPrompt={systemPrompt} bind:selectedExamplePrompt={examplePrompt} bind:deepSeek />

	<div class="flex w-full">
		<FileUploadAside />
		<form onsubmit={handleSubmit} class="m-4 flex flex-col rounded-xxl border-2 border-black p-2">
			<div class="space-y-4">
				<div class="flex space-x-2">
					<Avatar name="Teacher image" src="/gabbe-avatar2.webp" />
					<div class="assistant-chat">Hello! How can I help you?</div>
				</div>

				{#each chatHistory as chat, i}
					{#if chat.role === 'user'}
						<div class="mr-auto flex justify-end">
							<Avatar name="Teacher image" src="/dodger-avatar2.webp" />
							<div class="user-chat">{chat.content}</div>
						</div>
					{:else}
						<div class="mr-auto flex">
							<Avatar name="Teacher image" src="/gabbe-avatar2.webp" />
							<div class="assistant-chat">{@html chat.content}</div>
						</div>
					{/if}
				{/each}

				{#if response.loading}
					{#await new Promise((res) => setTimeout(res, 400)) then _}
						<div class="flex space-x-2">
							<Avatar name="gabbe avatar image" src="/gabbe-avatar2.webp" />
							<div class="assistant-chat">
								{#if response.text === ''}
									<TypingIndicator />
								{:else}
									{@html responseText}
								{/if}
							</div>
						</div>
					{/await}
				{/if}

				<hr />
				<div class="flex space-x-4">
					<textarea
						class="textarea p-5"
						required
						placeholder="Type your message..."
						name="message"
						rows="3"
						bind:value={examplePrompt}
					></textarea>
					<div class="flex flex-col justify-between">
						<button type="submit" class="bg-cyan-600 text-white p-2 rounded-lg border-gray-800 border-2">
							Send
						</button>
						<button
							type="button"
							class="bg-red-600 text-white rounded-lg border-gray-800 border-2 mt-2"
							onclick={deleteAllChats}
						>
							Clear Chats
						</button>
					</div>
				</div>
			</div>

			<div class="flex w-full flex-col items-center">
				<p class="text-center text-sm text-surface-500 m-4">
					⬅️ You Can Upload Content by Selecting Files.
				</p>

				{#if fileNames.length > 0}
					<div class="flex items-center gap-4">
						{#each fileNames as fileName}
							<div class="flex items-center gap-2">
								<button type="button" class="btn preset-filled-primary-500">
									<span>{fileName}</span>
									<CircleX onclick={() => deleteFileName(fileName)} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</form>
	</div>
</main>

<style lang="postcss">
	.assistant-chat {
		@apply rounded-lg bg-primary-100 p-2;
	}
	.user-chat {
		@apply rounded-lg bg-surface-200 p-2;
	}
	.assistant-chat :global {
		ol {
			@apply ml-4 list-inside list-decimal;
		}
		ul {
			@apply ml-4 list-inside list-disc;
		}
		h1 {
			@apply mb-4 text-2xl font-bold;
		}
		h2 {
			@apply mb-3 text-xl font-bold;
		}
		h3 {
			@apply mb-2 text-lg font-bold;
		}
		a {
			@apply text-primary-500 hover:underline;
		}
		blockquote {
			@apply border-l-4 border-surface-500 pl-4 italic;
		}
	}
</style>
