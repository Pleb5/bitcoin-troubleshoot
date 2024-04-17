/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

import NDK from "@nostr-dev-kit/ndk";
import {
    NDKSubscription,
    type NDKSubscriptionOptions,
    type NDKFilter,
    NDKSubscriptionCacheUsage,
    NDKEvent,
    NDKRelay,
} from '@nostr-dev-kit/ndk';

import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";

import { BTCTroubleshootKind } from '../lib/events/kinds.ts';

const sw = self as unknown as ServiceWorkerGlobalScope;

const ASSETS = [
    ...build, // the app itself	
    ...files  // everything in `static`
];

console.log(sw)

let ndk: NDK;
const ndkSubOptions: NDKSubscriptionOptions = {
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    closeOnEose: false
};
let ndkSubscription: NDKSubscription;

let intervalID: NodeJS.Timeout | undefined;

sw.oninstall = () => {
    sw.skipWaiting();
}

sw.onactivate = (event: ExtendableEvent) => {
    event.waitUntil(sw.clients.claim());
    console.log('Service Worker activated')
}

sw.onmessage = async(m) => {
    console.log('message received in service worker', m)
    const filters: NDKFilter[] | undefined = m.data['filters'];
    const relays: string[] | undefined = m.data['relays'];
    if (filters && relays && filters.length > 0 && relays.length > 0) {
        console.log('filters in message', filters)
        console.log('relays in message', relays)

        if(!intervalID) {
            console.log('starting keepAlive loop...')
            intervalID = setInterval(keepAlive, 5000);
        }         

        ndk = new NDK({
            explicitRelayUrls: relays,
            cacheAdapter: new NDKCacheAdapterDexie({ dbName: 'bitcoin-troubleshoot-db' })
        });

        await ndk.connect();

        console.log('ndk in service worker connected')

        ndkSubscription = ndk.subscribe(filters, ndkSubOptions)   

        ndkSubscription.on("event", (event: NDKEvent, relay?: NDKRelay) => {
            console.log('event arrived in SW', event)
            const granted = Notification.permission === 'granted';
            if(granted && ndkSubscription.eventFirstSeen.get(event.id) !== 0) {

                console.log('new unique event arrived in SW', event)
                // event was NOT received from cache and is not a duplicate
                // so we Notify the user about a new _unique_ event reveived
                let title = '';
                const options = { 
                    icon: '/bitcoin-troubleshoot.svg',
                    badge: '/bitcoin-troubleshoot.svg',
                    body: '',
                    tag: '',
                }
                if (event.kind === BTCTroubleshootKind.Ticket) {
                    title = 'Offer update arrived!';
                    options.body = 'Check your Offers!';
                    options.tag = BTCTroubleshootKind.Ticket.toString();
                } else if(event.kind === BTCTroubleshootKind.Offer) {
                    title = 'Ticket update arrived!';
                    options.body = 'Check your Tickets!';
                    options.tag = BTCTroubleshootKind.Offer.toString();
                }

                sw.registration.showNotification(title, options);
            } else {
                console.log('Notification not permitted! Dont try to show updates!')
            }
        });
    } else if(m.data == 'stop') {
        console.log("Service Worker: I'm shutting down!");
        clearInterval(intervalID);
        intervalID = undefined;
    } else {
        console.log('Unexpected message in Service Worker: ', m);
    }
};

sw.onnotificationclick = async(event: NotificationEvent) => {
    const urlToVisit = '/my-tickets/';

    const ticketNotification = event.notification.tag === BTCTroubleshootKind.Ticket.toString();
    const offerNotification = event.notification.tag === BTCTroubleshootKind.Offer.toString();
    if(!ticketNotification && !offerNotification) {
        console.log('This type of notification is not implemented yet!')
        return;
    }

    let clientOpenWithUrl = false;

    const allClients = await sw.clients.matchAll({type: "window"});
    for(const client of allClients) {
        const url = new URL(client.url);
        if(url.pathname.includes('urlToVisit')) {
            client.focus();
            clientOpenWithUrl = true;
            break;
        }
    }

    if (!clientOpenWithUrl) {
        sw.clients.openWindow(urlToVisit);
    }
}

sw.onmessageerror = (me) => {
    console.log('Message error:', me);
};

sw.onerror = (e) => {
    console.log("Error happened in Service Worker:", e.message)
};

async function fetchTicketsAndOffers(filters: NDKFilter[]) {
    console.log('fetching events with filter: ', filters)
    if (ndk) {
        const events = await ndk.fetchEvents(filters, ndkSubOptions);
        console.log('fetchEvents resolved:', events)
    }
}

function keepAlive() {
    console.log("Service Worker: I'm stayin' alive!")
}
