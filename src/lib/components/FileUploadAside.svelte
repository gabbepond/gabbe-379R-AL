<script lang="ts">

    let isSubmitted = false

    function handleSubmit() {
        isSubmitted = true
        console.log('Submitting form...')
    }

</script>

<div class="flex flex-col items-center justify-start m-4 border-2 border-cyan-600 rounded-lg p-4">
    <form class="flex flex-col gap-4 " method="POST" action="/chat?/uploadFile" enctype="multipart/form-data" onsubmit={handleSubmit}>
        <h2>Choose The Data File (in PDF format) You Would Like To Upload</h2>
        <label class="label ">
            <span class="label-text text-cyan-600">Select a file</span>
            <input class="input" type="file" accept=".pdf" name="file" />
        </label>
        <button class="btn bg-cyan-600 text-white" type="submit">Upload Chosen File</button>
    </form>
</div>
 <!-- gabbe -->