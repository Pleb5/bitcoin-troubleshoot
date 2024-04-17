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
    NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk';

const sw = self as unknown as ServiceWorkerGlobalScope;

const ASSETS = [
    ...build, // the app itself	
    ...files  // everything in `static`
];

console.log(sw)

let fetcherNDK: NDK;
const ndkSubOptions: NDKSubscriptionOptions = {
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    closeOnEose: true
};
// let ndkSubscription: NDKSubscription;

let intervalID: NodeJS.Timeout;

sw.oninstall = () => {
    sw.skipWaiting();
}

sw.onactivate = async(event: ExtendableEvent) => {
    event.waitUntil(sw.clients.claim());
    console.log('Service Worker activated')

    const clients = await sw.clients.matchAll();
    clients.forEach((client: Client) => {
        // client.postMssage('a');
    });
}

sw.onmessage = async(m) => {
    console.log('message received in service worker', m)
    const filters: NDKFilter[] | undefined = m.data['filters'];
    const relays: string[] | undefined = m.data['relays'];
    if (filters && relays && filters.length > 0 && relays.length > 0) {
        console.log('filters in message', filters)
        console.log('relays in message', relays)

        fetcherNDK = new NDK({
            explicitRelayUrls: relays,
        });

        await fetcherNDK.connect();

        console.log('ndk in service worker connected')

        if(!intervalID) {
            intervalID = setInterval(fetchTicketsAndOffers, 5000, filters);
        } else {
            clearInterval(intervalID);
            console.log('restarting fetcher...')
            intervalID = setInterval(fetchTicketsAndOffers, 5000, filters);
        }
        
    } else if(m.data == 'stop') {
        clearInterval(intervalID);
    } else {
        console.log('Unexpected message in Service Worker: ', m);
    }
};

sw.onmessageerror = (me) => {
    console.log('Message error:', me);
};

sw.onerror = (e) => {
    console.log("Error happened in Service Worker:", e.message)
};

async function fetchTicketsAndOffers(filters: NDKFilter[]) {
    console.log('fetching events with filter: ', filters)
    if (fetcherNDK) {
        const events = await fetcherNDK.fetchEvents(filters, ndkSubOptions);
        console.log('fetchEvents resolved:', events)
    }
}
