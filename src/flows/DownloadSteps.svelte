<script lang="ts">
    import { writable, type Writable } from 'svelte/store';
    import DownloadButton from "../components/DownloadButton.svelte";
    import ReplayIdInput from "../components/ReplayId.svelte";

    let steps = $derived(() => 
        [
            { text: "Enter your match id" },

            $replayUrl == null
            ? null
            : { text: "Let it process and download" },

            $startedDownload == null
            ? null
            :{ text: "Paste it to your Dota 2 replay directory, e.g.: \`C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\dota\\replays\\`" },

            $startedDownload == null
            ? null
            : { text: "Run game and find your replay in \`watch\` > \`replays\' > \`saved to watch later`\ > \`downloads\`" },
        ].filter(step => step != null)
    );

    let matchId: Writable<Number> = writable();
    let replayUrl: Writable<URL | null> = writable(null);
    let startedDownload = writable<false>();

    function getStepComponent(index: number) {
        return [
            ReplayIdInput,
            DownloadButton
        ][index];
    }

    function copyToClipboard(value: Number) {
        navigator.clipboard.writeText(value.toString());
    }
</script>

<ol>
    <div style="display: flex; align-items: center;">
        <!-- <div>
            <p style="margin-right: 10px;">Example parsed match id: <input id="example-url-parsed" type="text" value='8184808084' readonly /></p>
            <button onclick={() => copyToClipboard(8184808084)}>Copy example id</button>
        </div>
        <div>
            <p style="margin-right: 10px;">Example NOT parsed match id: <input id="example-url-not-parsed" type="text" value='8193365624' readonly /></p>
            <button onclick={() => copyToClipboard(8193365624)}>Copy example id</button>
        </div> -->
    </div>

    {#each steps() as step, index}
        <li>
            <p>{step.text}</p>
            {#await Promise.resolve(getStepComponent(index)) then Component}
                {#if Component}
                    <Component
                        {matchId}
                        {replayUrl}
                        {startedDownload}
                    />
                {/if}
            {/await}
        </li>
    {/each}
</ol>