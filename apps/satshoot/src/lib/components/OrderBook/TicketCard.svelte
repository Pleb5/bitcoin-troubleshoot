<script lang="ts">
    import currentUser from '$lib/stores/user';
    import { OfferEvent } from "$lib/events/OfferEvent";
    import { TicketStatus, TicketEvent, } from "$lib/events/TicketEvent";
    import { allOffers, wotFilteredOffers } from '$lib/stores/troubleshoot-eventstores';

    import { nip19 } from "nostr-tools";

    import { popup } from '@skeletonlabs/skeleton';
    import type { PopupSettings } from '@skeletonlabs/skeleton';
    import { getModalStore } from '@skeletonlabs/skeleton';
    import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';

    import { ticketToEdit } from "$lib/stores/ticket-to-edit";
    import ShareTicketModal from "../Modals/ShareTicketModal.svelte";
    import CloseTicketModal from '$lib/components/Modals/CloseTicketModal.svelte';

    import Reputation from "./Reputation.svelte";
    import { ReviewType } from "$lib/events/ReviewEvent";

    import { goto } from "$app/navigation";

    const modalStore = getModalStore();
			
    
    export let ticket: TicketEvent | null = null;
    // Can disable chat from outside manually
    export let showChat = true;
    let ticketChat = false;
    export let titleSize: string = 'xl';
    export let titleLink: boolean = true;
    export let shortenDescription = true;
    let generatedDescription = '';
    export let countAllOffers: boolean = false;
    export let tagCallback: ((tag:string) => void) | null = null;

    let bech32ID = '';
    let npub: string;
    let timeSincePosted: string; 
    let ticketStatus: string;

    let offerStore = allOffers;
    let offers: OfferEvent[] = [];
    let offerCount: string = '?';
    let offersAlreadyColor: string = 'text-primary-400-500-token';

    // For context menu: Edit ticket, close ticket, share ticket
    const popupHover: PopupSettings = {
        event: 'click',
        target: `popupHover_${ticket?.id}`,
        placement: 'bottom'
    };

    let statusColor: string = '';

    $: if ($currentUser) {
        offerStore = wotFilteredOffers;
    }

    $: if ($currentUser && showChat) {
        ticketChat = true;
    } else ticketChat = false;

    $: if (ticket) {
        bech32ID = ticket.encode()
        npub = nip19.npubEncode(ticket.pubkey);
        popupHover.target = 'popupHover_' + ticket.id;


        if (ticket?.description) {
            if (shortenDescription && ticket.description.length > 80) {
                generatedDescription =  ticket.description.substring(0, 80) + '...';
            } else {
                generatedDescription = ticket.description;
            }

            const words = generatedDescription.split(' ');
            let needProcessing = false;
            for (let i = 0; i < words.length; i++) {
                if (words[i].length > 25) {
                    needProcessing = true;
                    words[i] = words[i].substring(0,24) + ' - ' + words[i].substring(25, words[i].length - 1);
                }
            }
            if (needProcessing) {
                generatedDescription = words.join(' ')
            }
        } else {
            generatedDescription = 'No description!';
        }

        if (ticket.created_at) {
            // Created_at is in Unix time seconds
            let seconds = Math.floor(Date.now() / 1000 - ticket.created_at);
            let minutes = Math.floor(seconds / 60);
            let hours = Math.floor(minutes / 60);
            let days = Math.floor(hours / 24);
            if (days >= 1) {
                timeSincePosted = days.toString() + ' day(s) ago';
            } else if(hours >= 1) {
                timeSincePosted = hours.toString() + ' hour(s) ago';
            } else if(minutes >= 1) {
                timeSincePosted = minutes.toString() + ' minute(s) ago';
            } else if(seconds >= 20) {
                timeSincePosted = seconds.toString() + ' second(s) ago';
            } else {
                timeSincePosted = 'just now';
            }
        }

        if (ticket.status >= 0) {
            if (ticket.status === TicketStatus.New) {
                ticketStatus = 'New';
                statusColor = 'text-primary-400-500-token'
            } else if (ticket.status === TicketStatus.InProgress) {
                ticketStatus = 'In Progress';
                statusColor = 'text-success-500';
            } else if (ticket.status === TicketStatus.Resolved) {
                ticketStatus = 'Resolved';
                statusColor = 'text-tertiary-500';
            } else if (ticket.status === TicketStatus.Failed) {
                ticketStatus = 'Failed';
                statusColor = 'text-error-500';
            }

        }
        // console.log('new tickets address: ', ticket.ticketAddress)
    }

    $: if (countAllOffers && ticket && $offerStore) {
        offers = [];
        $offerStore.forEach((offer: OfferEvent) => {
            if (ticket.dTag === offer.referencedTicketDTag) {
                offers.push(offer);
                offerCount = offers.length.toString();
                offersAlreadyColor = 'text-tertiary-400-500-token';
            }
        });
    }

    function shareTicket() {
        if (ticket) {
            const modalComponent: ModalComponent = {
                ref: ShareTicketModal,
                props: {ticket: ticket},
            };

            const modal: ModalSettings = {
                type: 'component',
                component: modalComponent,
            };
            modalStore.trigger(modal);

        }
    }

    function editTicket() {
        if (ticket) {
            $ticketToEdit = ticket;

            goto('/post-ticket')
        }
    }

    async function closeTicket() {
        if (ticket) {
            const modalComponent: ModalComponent = {
                ref: CloseTicketModal,
                props: {ticket: ticket},
            };

            const modal: ModalSettings = {
                type: 'component',
                component: modalComponent,
            };
            modalStore.trigger(modal);

        }
    }

</script>


<div class="card bg-surface-200-700-token sm:max-w-[70vw] lg:max-w-[60vw] flex-grow text-wrap">
    {#if ticket}
        <header class="card-header grid grid-cols-[15%_1fr_15%] items-start">
            {#if ticketChat}
                <a
                    href={"/messages/" + bech32ID + ":" + ticket.title}
                    class="btn btn-icon btn-sm md:btn-md justify-self-start"
                >
                    <i class="fa-solid fa-comment text-2xl md:text-3xl"></i>
                </a>
                
            {/if}
            <div class="justify-self-center text-center justify-center text-wrap col-start-2">
                {#if titleLink}
                    <a 
                        class="anchor justify-self-center text-{titleSize}" 
                        href={"/" + bech32ID }>{ticket.title ?? 'No title'}
                    </a>
                {:else}
                    <div class="text-{titleSize} text-wrap ">
                        {ticket.title ?? 'No title'}
                    </div>
                {/if}
            </div>
            {#if $currentUser
                && ticket.pubkey === $currentUser.pubkey
            }
                <div class="justify-self-end ">
                    <button
                        type="button"
                        class="btn btn-icon w-8 h-8 bg-primary-400-500-token"
                        use:popup={popupHover}
                    >
                        <i class="fa text-sm fa-ellipsis-v"></i>
                    </button>
                    <div data-popup="popupHover_{ticket.id}">
                        <div class="card p-2 bg-primary-300-600-token shadow-xl z-50 ">
                            <ul class="list space-y-4">
                                <!-- Share Ticket -->
                                <li>
                                    <button class="" on:click={shareTicket}>
                                        <span><i class="fa-solid fa-share-nodes"/></span>
                                        <span class="flex-auto">Share</span>
                                    </button>
                                </li>
                                <!-- Edit Ticket -->
                                {#if ticket.status === TicketStatus.New}
                                    <li>
                                        <button class="" on:click={editTicket}>
                                            <span><i class="fa-solid fa-pen-to-square"/></span>
                                            <span class="flex-auto">Edit</span>
                                        </button>
                                    </li>
                                {/if}
                                <!-- Close Ticket -->
                                {#if ticket.status === TicketStatus.InProgress
                                    || ticket.status === TicketStatus.New
                                }
                                    <li>
                                        <button class="" on:click={closeTicket}>
                                            <span><i class="fa-solid fa-lock"/></span>
                                            <span class="flex-auto">Close</span>
                                        </button>
                                    </li>
                                {/if}
                            </ul>
                        </div>
                    </div>
                </div> 
            {/if }
        </header>

        <section class="p-4">
            <div class="text-center text-base md:text-lg">
                { generatedDescription }
            </div>

            <hr class="my-4" />
             
            {#if $currentUser && ticket.pubkey !== $currentUser.pubkey}
                <Reputation type={ReviewType.Client} user={ticket.pubkey}/>
                <hr class="my-4" />
            {/if}


            <div class="">
                <span class="pr-1">Status: </span>
                <span class="font-bold {statusColor}">{ticketStatus}</span>
            </div>
            <div class="">
                <span class="">Posted by: </span>
                <span>
                    <a class="anchor" href={'/' + npub}>{npub.slice(0, 10) + '...'}</a>
                </span>
            </div>
            <div class="">{timeSincePosted}</div>
        {#if countAllOffers}
                <div 
                    class="text-md font-bold {offersAlreadyColor} mt-2"
                >
                    {'Offers on ticket: ' + offerCount}
                </div>
        {/if}
        </section>
        <footer class="card-footer">
            <div class="flex justify-between">
                <div class="items-center flex flex-wrap gap-y-1">
                    {#each ticket.tTags as tag }
                        <div class="pr-3 rounded-token">
                            <button
                                type="button"
                                class="badge variant-filled-surface"
                                on:click={()=> {
                                    if (tagCallback) tagCallback(tag[1])
                                }}
                            >
                                <span class="">{ tag[1] }</span>
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        </footer>
    {:else}
        <section class="w-full">
            <div class="p-4 space-y-4">
                <div class="placeholder animate-pulse" />
                <div class="grid grid-cols-3 gap-8">
                    <div class="placeholder animate-pulse" />
                    <div class="placeholder animate-pulse" />
                    <div class="placeholder animate-pulse" />
                </div>
                <div class="grid grid-cols-4 gap-4">
                    <div class="placeholder animate-pulse" />
                    <div class="placeholder animate-pulse" />
                    <div class="placeholder animate-pulse" />
                    <div class="placeholder animate-pulse" />
                </div>
            </div>
        </section>
    {/if}
</div>

