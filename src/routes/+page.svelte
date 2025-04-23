<script lang="ts">
	import { onMount } from 'svelte';
	import BrainCircuit from 'lucide-svelte/icons/brain-circuit';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import Image from 'lucide-svelte/icons/image';
	import Home from 'lucide-svelte/icons/home';
	import Settings from 'lucide-svelte/icons/settings';
</script>

<div class="flex min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-200 text-gray-800 font-sans">

	<!-- Sidebar Navigation -->
	<aside class="w-64 bg-white shadow-xl border-r border-gray-200 flex flex-col justify-between">
		<div>
			<div class="p-6 text-center">
				<BrainCircuit class="mx-auto mb-2 h-10 w-10 text-purple-600" />
				<h2 class="text-2xl font-bold text-gray-800 tracking-tight">AI Navigator</h2>
				<p class="text-sm text-gray-500">Your AI-powered assistant</p>
			</div>
			<nav class="mt-8 flex flex-col space-y-2 px-6">
				<a href="/" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-100 transition">
					<Home class="w-5 h-5 text-purple-600" />
					<span>Home</span>
				</a>
				<a href="/chat" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-100 transition">
					<MessageSquare class="w-5 h-5 text-purple-600" />
					<span>Chat</span>
				</a>
				<a href="/images" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-100 transition">
					<Image class="w-5 h-5 text-purple-600" />
					<span>Images</span>
				</a>
			</nav>
		</div>
		<div class="p-6 text-center text-xs text-gray-400">© 2025 Gab's AI Lab</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 p-10">
		<h1 class="text-4xl font-extrabold text-purple-700 mb-4">Welcome to Gab's Full Stack SvelteKit App!</h1>
		<p class="text-gray-700 text-lg mb-6">
			Explore your AI journey with a clean, responsive layout. Visit 
			<a href="https://svelte.dev/docs/kit" target="_blank" class="text-purple-600 underline hover:text-purple-800">SvelteKit Docs</a> 
			to learn more.
		</p>

		<!-- Add more content blocks below -->
		<div class="rounded-xl bg-white shadow p-6 border border-gray-200">
			<h2 class="text-2xl font-semibold text-gray-800 mb-2">💡 Tip of the Day</h2>
			<p class="text-gray-600">Use environment variables securely with `.env` and access them via `import.meta.env` in SvelteKit.</p>
		</div>
	</main>
</div>
