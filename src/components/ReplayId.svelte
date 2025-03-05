<script lang="ts">
    import { writable } from 'svelte/store';

    const { 
        matchId = writable<Number>(),
        replayUrl = writable<URL | null>(),
    } = $props();
    
    let isValid = $state(true);
    let isConfirmed = $state(false);
    let isBusy = $state(false);
    let hasError = $state(false);
    let isButtonEnabled = $derived(() => (isValid && isConfirmed) && !isBusy);
    let checkedForReplay = $state(false);
    let shouldShowGenerationLink = $state(false);
    let parseLink = $state('');

    function validateMatchId() {
        isConfirmed = true;
        isValid = $matchId != null && /^[0-9]+$/.test($matchId.toString());

        parseLink = isValid
        ? `https://www.opendota.com/request#${$matchId}`
        : '';
    }

    async function checkForReplay() {
        if (isBusy) {
            return;
        };

        hasError = false;
        isBusy = true;

        try {
            const response = await fetch(
                'https://api.opendota.com/api/matches/' + $matchId,
            );

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            if (!response.body) {
                throw new Error('Response body is null');
            }

            const data = await response.json();
            const url = data.hasOwnProperty('replay_url') 
            ? data['replay_url'] 
            : null;

            $replayUrl = url == null ? null : new URL(url);
            shouldShowGenerationLink = $replayUrl == null;

            isBusy = false;
            checkedForReplay = true;
        } catch {
            isBusy = false;
            hasError = true;
        }
    }
</script>

<style>
    .invalid {
        border-color: red;
    }
</style>

<div>
    <input
        type="number"
        bind:value={$matchId}
        oninput={validateMatchId}
        class:invalid={!isValid}
        placeholder="Paste your match id here"
    />
    <button onclick={checkForReplay} disabled={!isButtonEnabled()}>
        {
            hasError
            ? 'Try again'
            : 'Confirm'
        }
    </button>

    {#if checkedForReplay}
        {#if shouldShowGenerationLink}
            <div>
                It seems that replay is not processed to download yet
                <br/>
                Open generated link below and wait on opendota site until it finishes processing it
                <br/>
                <a href={parseLink} target="_blank" rel="noopener noreferrer">{parseLink}</a>
                <br/>
                Press again "Confirm" after opendota finishes processing
            </div>
        {/if}
        {#if !shouldShowGenerationLink}
            <div style="color: green;">
                Replay is ready for next step
            </div>
        {/if}
    {/if}

    {#if !isValid}
        <p style="color: red;">Invalid match id</p>
    {/if}
</div>