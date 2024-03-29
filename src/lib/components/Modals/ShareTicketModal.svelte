<script lang="ts">
	import { onMount, type SvelteComponent, tick } from 'svelte';
    import ndk from '$lib/stores/ndk';
    import { NDKEvent, NDKKind, type NDKTag } from '@nostr-dev-kit/ndk';
    
    import { ProgressRadial } from '@skeletonlabs/skeleton';
    import { clipboard } from '@skeletonlabs/skeleton';
	import { getModalStore } from '@skeletonlabs/skeleton';
    import type { ToastSettings } from '@skeletonlabs/skeleton';
    import { getToastStore } from '@skeletonlabs/skeleton';
    import type { TicketEvent } from '$lib/events/TicketEvent';

    const modalStore = getModalStore();
    const toastStore = getToastStore();

	// Props
	/** Exposes parent props to this component. */
	export let parent: SvelteComponent;

    export let ticket: TicketEvent;
    const shareURL = `https://bitcointroubleshoot.com/${ticket.encode()}`;

    let message: string = '';
    let posting = false;

    async function postTicket() {
        posting = true;
        await tick();

        $ndk.enableOutboxModel = true;
        $ndk.outboxRelayUrls = ["wss://purplepag.es"];
        const kind1Event = new NDKEvent($ndk);
        kind1Event.kind = NDKKind.Text;

        kind1Event.content = message;
        kind1Event.generateTags();

        try {

            let relays = await kind1Event.publish();
            console.log(relays)
            posting = false;
            const t: ToastSettings = {
                message: 'Ticket Posted as Text Note!',
                timeout: 7000,
                background: 'bg-success-300-600-token',
            };
            toastStore.trigger(t);

            modalStore.close();
            $ndk.enableOutboxModel = false;
        } catch(e) {
            posting = false;
            const t: ToastSettings = {
                message: 'Error happened while publishing note!',
                timeout: 5000,
                background: 'bg-error-300-600-token',
            };
            toastStore.trigger(t);

            modalStore.close();
            $ndk.enableOutboxModel = false;
        }
    }

    onMount(()=>{
        if (ticket) {
            // Set default text
            message = `Hey Nostr,\nPlease help me with this #bitcoin issue and I can pay sats for your time:\n\n`;
            message += `${ticket.title}\n\n`;
            message += `${ticket.description}\n\n`;
            message += `Make an offer on this URL:\n\n`;
            message += `${shareURL}\n\n`;
            message += `#bitcointroubleshoot #asknostr`;
            ticket.tTags.forEach((tag: NDKTag)=>{
                message += ` #${(tag as string[])[1]}`;
            });
        }
    });

    let copied = false;
    function onCopyURL(): void {
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 1000);
    }

</script>

{#if $modalStore[0]}
    {#if ticket}
        <div class="card p-4 bg-primary-300-600-token">
            <div class="flex justify-center mb-2">
                <button 
                    class="btn btn-md w-40 bg-tertiary-200-700-token font-bold "
                    use:clipboard={shareURL}
                    on:click={onCopyURL}
                >
                    {copied ? 'Copied!' : 'Copy Ticket URL'}
                </button>
            </div>
            <h4 class="h4 text-center mb-2">{'Post Ticket as Text Note'}</h4>
            <form on:submit|preventDefault={ postTicket }>
                <div class="flex flex-col justify-center gap-y-4">
                    <textarea 
                        rows="10"
                        class="textarea"
                        bind:value={message}
                    />
                    <button
                        type="submit"
                        class="btn btn-lg bg-success-300-600-token"
                        disabled={posting}
                    >
                        {#if posting}
                            <span>
                                <ProgressRadial value={undefined} stroke={60} meter="stroke-tertiary-500"
                                    track="stroke-tertiary-500/30" strokeLinecap="round" width="w-8" />
                            </span>
                        {:else}
                            <span>Post</span>
                        {/if}
                        
                    </button>
                </div>
            </form>
        </div>
    {:else}
        <h2 class="h2 font-bold text-center text-error-300-600-token">
            Error: Ticket is missing!
        </h2>
    {/if}
{/if}
