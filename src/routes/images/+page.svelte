<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import type { ActionData, PageData } from './$types';

    export let data: PageData;
    export let form: ActionData;

    let selectedFile: File | null = null;
    let previewUrl: string | null = null;
    let loading = false;

    let images = data.images || [];

    // Reactive update when data.images changes
    $: if (data?.images) {
        images = data.images;
        console.log('Updated images:', images.length);
    }

    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB

    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) {
            selectedFile = null;
            previewUrl = null;
            return;
        }

        selectedFile = input.files[0];

        if (selectedFile.size > maxSizeInBytes) {
            alert('File is too large. Maximum size is 10MB.');
            input.value = '';
            return;
        }

        if (selectedFile && selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewUrl = (e.target?.result as string) || null;
            };
            reader.readAsDataURL(selectedFile);
        }
    }

    function resetForm() {
        selectedFile = null;
        previewUrl = null;
        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
</script>

<svelte:head>
    <title>Image Upload | AI Image Collection</title>
</svelte:head>

<main class="container mx-auto w-full p-4 bg-pink-100">
    <h1 class="text-black mb-6 text-center text-3xl font-bold">
        {#if data.searchPerformed}
            Search Results: "{data.searchQuery}"
        {:else}
            AI Image Collection
        {/if}
    </h1>

    <div class="mb-4 text-center">
        <a href="/search"
            class="bg-gray-700 text-white hover:bg-red-600 inline-block rounded-md px-4 py-2 transition border border-black">
            SEARCH IMAGES
        </a>
    </div>

    <div class="mb-8 rounded-lg bg-pink-100 p-6 shadow-lg border-8 border-black">
        <h2 class="mb-4 text-xl font-semibold">Upload a New Image</h2>

        <form
            method="POST"
            action="?/imageToBase64"
            enctype="multipart/form-data"
            use:enhance={() => {
                loading = true;
                return async ({ update }) => {
                    await update();
                    if (form?.success) {
                        resetForm();
                        await invalidateAll();
                    }
                    loading = false;
                };
            }}
            class="space-y-4"
        >
            <div>
                <label for="image-upload" class="mb-1 block text-sm font-medium text-gray-700">
                    Select Image
                </label>
                <input
                    type="file"
                    id="image-upload"
                    name="image"
                    accept="image/*"
                    required
                    on:change={handleFileSelect}
                    class="file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 block
                        text-sm text-gray-500
                        file:mr-4 file:rounded-md
                        file:border-0 file:px-4
                        file:py-2 file:text-sm
                        file:font-semibold"
                />
            </div>

            <div>
                <label for="title" class="mb-1 block text-sm font-medium text-gray-700">
                    Image Title
                </label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    placeholder="Enter a descriptive title"
                    required
                    class="focus:ring-primary-500 w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
                />
            </div>

            {#if previewUrl}
                <div class="mt-4">
                    <p class="mb-1 text-sm font-medium text-gray-700">Preview</p>
                    <div class="rounded-md border p-2">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            class="mx-auto max-h-60 max-w-full object-contain"
                        />
                    </div>
                </div>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="bg-rose-400 text-white w-full rounded-md px-4 py-2 font-bold transition duration-200 disabled:bg-gray-400"
            >
                {loading ? 'Uploading...' : 'Upload Image'}
            </button>

            {#if form}
                <div
                    class={`mt-4 rounded-md p-3 ${form.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                    {form.message}
                </div>
            {/if}
        </form>
    </div>

    {#if images.length > 0}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {#each images as image}
                <div class="rounded-sm border p-2 transition-shadow hover:shadow-md bg-gray-100">
                    {#if image.thumbnailUrl}
                        <img
                            src={image.thumbnailUrl}
                            alt={image.title}
                            class="h-40 w-full rounded-md object-cover"
                            loading="lazy"
                            on:error={() => console.error(`Failed to load thumbnail: ${image.thumbnailUrl}`)}
                            on:load={() => console.log('Thumbnail URL:', image.thumbnailUrl)}
                        />
                    {:else}
                        <div class="flex h-40 items-center justify-center rounded-md">
                            <div class="text-gray-500">[No thumbnail: {JSON.stringify(image)}]</div>
                        </div>
                    {/if}
                    <p class="mt-2 truncate text-center font-medium">{image.title}</p>
                </div>
            {/each}
        </div>
    {:else}
        <p class="text-gray-500">No images uploaded yet. Add your first image above!</p>
    {/if}
</main>