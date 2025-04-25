<script lang="ts">
    import { Avatar } from '@skeletonlabs/skeleton-svelte'
    import TypingIndicator from '$lib/utils/typingIndicator.svelte'
    import { readableStreamStore } from '$lib/readableStreamStore.svelte'
    import { Marked } from 'marked'
    import { markedHighlight } from 'marked-highlight'
    import DOMPurify from 'dompurify'
    import ChatAppBar from '$lib/components/ChatAppBar.svelte'
    import FileUploadAside from '$lib/components/FileUploadAside.svelte'
    import { CircleX } from 'lucide-svelte'
    import BotIcon from 'lucide-svelte/icons/bot';
    import MessageSquare from 'lucide-svelte/icons/message-square';
    import Image from 'lucide-svelte/icons/image';
    import Home from 'lucide-svelte/icons/home';

    import hljs from 'highlight.js'
    import javascript from 'highlight.js/lib/languages/javascript'
    import typescript from 'highlight.js/lib/languages/typescript'
    import css from 'highlight.js/lib/languages/css'
    hljs.registerLanguage('javascript', javascript)
    hljs.registerLanguage('typescript', typescript)
    hljs.registerLanguage('css', css)

    const marked = new Marked(
        markedHighlight({
            langPrefix: 'hljs language-',
            highlight: (code, lang) => {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext'
                return hljs.highlight(code, { language }).value
            }
        })
    )

    interface PageData {
        fileNames?: string[]
    }

    let { data } = $props<{ data: PageData }>()
	console.log('data in +page.svelte', data)
    //console.log('data', data)
    let systemPrompt = $state('')
    let examplePrompt = $state('')
    let deepSeek = $state(false)
    let fileNames = $state([] as string[])

    let chatHistory = $state(
        typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('chatHistory') || '[]') : []
    )

    $effect(() => {
        console.log('filenames', data.fileNames)
        if (data?.fileNames && JSON.stringify(fileNames) !== JSON.stringify(data.fileNames)) {
            fileNames = [...data.fileNames]
        }
    })

    $effect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory))
        }
    })

    const response = readableStreamStore()

    let responseText = $state('')

    
    // Add this helper function
    function stripThinkTags(text: string): string {
        const thinkRegex = /<think>[\s\S]*?<\/think>/g
        return text.replace(thinkRegex, '')
    }

    $effect(() => {
        if (response.text !== '') {
            ;(async () => {
                // Strip <think> tags from the response text
                //const cleanedText = stripThinkTags(response.text);
                const parsedText = await marked.parse(response.text)
                responseText = DOMPurify.sanitize(parsedText)
                    .replace(/<script>/g, '&lt;script&gt;')
                    .replace(/<\/script>/g, '&lt;/script&gt;')
            })()
        }
    })

    async function handleSubmit(this: HTMLFormElement, event: Event) {
        event?.preventDefault()
        if (response.loading) return // prevent request while waiting for response

        const formData: FormData = new FormData(this)
        const message = formData.get('message')

        if (!message) {
            return
        }

        chatHistory = [...chatHistory, { role: 'user', content: message as string }]

        try {
            console.log({
                chats: chatHistory,
                systemPrompt,
                deepSeek,
                fileNames
            })
            //yoyo getting on error on following line
            const answer = response.request(
                new Request('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chats: [...chatHistory],
                        systemPrompt: `${systemPrompt}`,
                        deepSeek: !!deepSeek,
                        fileNames: [...fileNames]
                    })
                })
            )

            this.reset() // clear the form

            const answerText = (await answer) as string

            const parsedAnswer = await marked.parse(answerText)
            const purifiedText = DOMPurify.sanitize(parsedAnswer)
                .replace(/<script>/g, '&lt;script&gt;')
                .replace(/<\/script>/g, '&lt;/script&gt;')

            chatHistory = [...chatHistory, { role: 'assistant', content: purifiedText }]

            console.log(answerText)
        } catch (error) {
            console.error(error)
        }
    }

    function deleteAllChats() {
        chatHistory = []
    }

    function deleteFileName(fileName: string) {
        // Update the local state instead of the prop
        fileNames = fileNames.filter((name) => name !== fileName)
    }
</script>
<!-- TOP AI NAVIGATION BAR -->
<header class="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md shadow-md border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-3">
            <BotIcon class="h-8 w-8 text-indigo-600" />
            <span class="text-xl font-bold text-gray-800 tracking-tight">AI Image Lab</span>
        </div>
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
<main class="flex min-h-screen w-screen flex-col items-center bg-white">
    <!-- The app bar for this page -->
    <ChatAppBar
        bind:selectedSystemPrompt={systemPrompt}
        bind:selectedExamplePrompt={examplePrompt}
        bind:deepSeek />

    <div class="flex w-full">
        <FileUploadAside on:filesUploaded={(e) => (fileNames = e.detail)} />
        <form
            onsubmit={handleSubmit}
            class="m-4 flex flex-col rounded-md border-2 border-purple-500 p-2">
            <div class="space-y-4">
                <div class="flex space-x-2">
                    <Avatar src="/gabbe-avatar2.webp" name="Tutor girl image" />
                    <div class="rounded-lg bg-purple-200 p-2">Hello! How can I help you?</div>
                </div>
                <!-- Need to display each chat item here -->
                {#each chatHistory as chat, i}
                    {#if chat.role === 'user'}
                        <div class="flex items-start justify-end">
                            <div class="flex items-start">
                                <div class="mr-3 shrink-0">
                                    <Avatar src="/jammin.png" name="User image" />
                                </div>
                                <div class="rounded-lg bg-surface-200 p-2">
                                    {chat.content}
                                </div>
                            </div>
                        </div>
                        <!-- this else handles the assistant role chat display -->
                    {:else}
                        <div class="mr-auto flex items-start">
                            <div class="mr-3 shrink-0">
                                <Avatar src="/gabbe-avatar2.webp" name="Tutor girl image" />
                            </div>
                            <div class="rounded-lg bg-purple-200 p-2">
                                {@html chat.content}
                            </div>
                        </div>
                    {/if}
                {/each}

                {#if response.loading}
                    {#await new Promise((res) => setTimeout(res, 400)) then _}
                        <div class="flex items-start">
                            <div class="mr-3 shrink-0">
                                <Avatar name="tutor girl image" src={'/gabbe-avatar2.webp'} />
                            </div>
                            <div class="rounded-lg bg-gray-100 p-2">
                                {#if response.text === ''}
                                    <TypingIndicator />
                                {:else}
                                    {@html responseText}
                                {/if}
                            </div>
                        </div>
                    {/await}
                {/if}
                <div class="space-y-4">
                    <hr />
                    <div class="flex space-x-4">
                        <textarea
                            class="textarea pl-6"
                            required
                            placeholder="Type your message..."
                            name="message"
                            rows="3"
                            bind:value={examplePrompt}></textarea>
                        <div class="flex flex-col justify-between">
                            <button type="submit" class="btn bg-purple-500 text-white hover:bg-blue-700">Send</button>
                            <button type="button" class="btn bg-pink-400 text-white hover:bg-red-600" onclick={deleteAllChats}
                                >Clear Chats</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex w-full flex-col items-center">
                <p class="m-4 text-center text-sm text-surface-500">
                    ⬅️ You Can Upload Content by Selecting Files.
                </p>

                {#if fileNames.length > 0}
                    <div class="flex flex-wrap items-center gap-4">
                        {#each fileNames as fileName}
                            <div class="flex items-center gap-2">
                                <button type="button" class="btn bg-cyan-500 text-white">
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

