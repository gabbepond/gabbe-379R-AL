<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, PageData } from './$types'
	import type { ActionResult } from '@sveltejs/kit'
	import SearchIcon from 'lucide-svelte/icons/search';
	import Image from 'lucide-svelte/icons/image';

	type ImageResult = {
		id: string
		thumbnailUrl: string
		title: string
		[key: string]: any
	}

	const props = $props<{ data: PageData; form: ActionData }>()

	let searchPerformed = $state(false)
	let searchQuery = $state('')
	let results = $state<ImageResult[]>([])

	function processSubmit() {
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success' && result.data) {
				searchPerformed = true
				searchQuery = result.data.searchQuery || ''

				if (Array.isArray(result.data.images)) {
					results = result.data.images.map((img: any) => ({
						id: img.id || '',
						title: img.title || 'Untitled',
						thumbnailUrl: img.thumbnailUrl || '',
						...img
					}))
				} else {
					results = []
				}
			}
		}
	}
</script>

<svelte:head>
	<title>AI Search | AL Image Intelligence</title>
</svelte:head>

<main class="container mx-auto max-w-4xl p-6 bg-gradient-to-b from-zinc-100 to-pink-100 rounded-xl shadow-xl min-h-screen">

	<!-- AL-themed Page Header -->
	<div class="text-center mb-10">
		<div class="flex items-center justify-center space-x-3 mb-2">
			<SearchIcon class="h-8 w-8 text-rose-500" />
			<h1 class="text-4xl font-extrabold text-gray-800">AL Image Search</h1>
		</div>
		<p class="text-sm text-gray-600 italic">Discover the future of visual data matching</p>
	</div>

	<!-- Back Link -->
	<div class="mb-6 text-center">
		<a href="/images" class="text-indigo-600 hover:underline flex items-center justify-center space-x-2">
			<Image class="w-4 h-4" />
			<span>Back to Image Collection</span>
		</a>
	</div>

	<!-- Glassmorphic Search Box -->
	<div class="mb-10 p-6 rounded-xl border border-gray-200 bg-white/80 shadow-lg backdrop-blur">
		<h2 class="mb-3 text-xl font-semibold text-gray-800">Search Images</h2>
		<form
			method="POST"
			action="?/imageSearch"
			use:enhance={processSubmit}
			class="flex flex-col sm:flex-row items-stretch gap-3"
		>
			<input
				type="text"
				name="query"
				placeholder="Type something like 'desert horse' or 'neural chip'"
				class="flex-grow rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
			/>
			<button type="submit" class="bg-rose-500 hover:bg-rose-600 transition text-white px-4 py-2 rounded-md font-semibold shadow-sm">
				Search
			</button>
		</form>
	</div>

	<!-- Search Results -->
	{#if results.length > 0}
		<div class="space-y-6">
			{#each results as result, i}
				<div class="flex items-start space-x-6 rounded-lg p-4 bg-white shadow border-l-4 border-rose-400 hover:shadow-md transition">
					<!-- Badge -->
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-rose-400 text-white font-bold">
						{i + 1}
					</div>

					<!-- Thumbnail & Info -->
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
						<div class="flex items-center space-x-4">
							<img src={result.thumbnailUrl} alt={result.title} class="h-28 w-28 object-cover rounded-lg border" />
							<div>
								<p class="text-lg font-semibold text-gray-800">{result.title}</p>
								<p class="text-sm text-gray-500">Match Score: {result.matchScore}</p>
								<p class="text-sm text-gray-500">Distance: {result.distance}</p>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if searchPerformed}
		<p class="text-center text-gray-500 italic mt-6">No results found for "{searchQuery}". Try a different keyword!</p>
	{/if}
</main>
