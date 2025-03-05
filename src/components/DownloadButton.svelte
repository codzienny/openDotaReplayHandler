<script lang="ts">
    import { writable } from 'svelte/store';
    import { decompress } from '../bz2';

    const { 
        replayUrl = writable<URL | null>(),
    } = $props();

    const fileName = 'replay.dem.bz2';
    const downloadSteps = [
        "Downloading replay...",
        "Processing replay..."
    ];

    let isBusy = $state(false);
    let currentStep = $state(-1);
    let abortController: AbortController;
    let progress = $state(0.0);

    async function startDownloadProcess() {
        isBusy = true;
        await downloadFile();
    }

    async function downloadFile() {
        currentStep = 0;
        abortController = new AbortController();
        progress = 0;

        const signal = abortController.signal;
        let receivedLength = 0;
        let contentLength = 0;

        try {
            const response = await fetch(
                'https://corsproxy.io/' + $replayUrl,
                { signal }
            );
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            contentLength = +(response.headers.get('Content-Length') || 0);
            receivedLength = 0;
            const chunks = [];

            while(true) {
                const {done, value} = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
                receivedLength += value.length;

                progress = receivedLength / contentLength;
            }

            const downloadedFile = await new Blob(chunks).arrayBuffer();
            const compressedData = new Uint8Array(downloadedFile);
            const decompressedData = decompress(compressedData);
            const decompressedBlob = new Blob([decompressedData], { type: 'application/octet-stream' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(decompressedBlob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.log("Some error" + error);
            cleanDownloadState();
        }
    }

    function abortDownload() {
        currentStep = -1;
        abortController.abort();
        cleanDownloadState();
    }

    function cleanDownloadState() {
        progress = 0;
        isBusy = false;
    }

</script>

<style>
    progress {
        width: 15%;
        margin-bottom: 10px;
        height: 20px;
    }
</style>

<div>
    {#if currentStep >= 0}
        <p>{downloadSteps[currentStep]}</p>
    {/if}
    <progress max={1} value={progress}></progress>
    <br>
    <button onclick={isBusy ? abortDownload : startDownloadProcess}>
        {
            isBusy 
            ? 'Stop'
            : 'Download'
        }
    </button>
</div>