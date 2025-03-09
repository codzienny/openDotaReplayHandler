<script lang="ts">
    import { writable } from 'svelte/store';
    import { asyncDecompress } from '../decompression/asyncDecompress';

    const {
        matchId = writable<Number>(),
        replayUrl = writable<URL | null>(),
        startedDownload = writable<boolean>(),
    } = $props();

    const fileNameExtension = '.dem';
    const downloadSteps = [
        "Downloading replay...",
        "Processing replay...",
        "Finished",
    ];

    let isBusy = $state(false);
    let currentStep = $state(-1);
    let abortController: AbortController;
    let progress = $state(0.0);

    async function startDownloadProcess() {
        isBusy = true;
        $startedDownload = true;
        
        try {
            currentStep = 0;
            const downloadedFile = await downloadFile();
            currentStep = 1;
            const decompressedBlob = await decompressFile(downloadedFile);
            currentStep = 2;
            saveFile(decompressedBlob);
            cleanDownloadState();
        } catch {
            cleanDownloadState();
            currentStep = -1;
        }
    }

    async function downloadFile(): Promise<ArrayBuffer> {
        abortController = new AbortController();
        progress = 0;

        let receivedLength = 0;
        let contentLength = 0;

        const response = await fetch(
            'https://corsproxy.io/' + $replayUrl,
            { signal: abortController.signal }
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

        return await new Blob(chunks).arrayBuffer();
    }

    async function decompressFile(
        downloadedFile: ArrayBuffer
    ): Promise<Blob> {
        const compressedData = new Uint8Array(downloadedFile);
        const decompressedData = await asyncDecompress(
            compressedData,
            (percent: number) => {
                progress = percent;
            }
        )
        
        return new Blob(
            [decompressedData],
            { type: 'application/octet-stream' }
        );
    }

    function saveFile(
        fileBlob: Blob
    ) {
        const link = document.createElement('a');
            link.href = URL.createObjectURL(fileBlob);
            link.download = $matchId + fileNameExtension;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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