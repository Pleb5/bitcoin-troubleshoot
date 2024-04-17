import type { NDK, NDKSigner } from '@nostr-dev-kit/ndk';

import { loggedIn } from '../stores/login';
import currentUser from '../stores/login';

import { 
    myTicketFilter, myOfferFilter, myTickets, myOffers
} from "$lib/stores/troubleshoot-eventstores";

export async function initializeUser(ndk: NDK) {
    const user = await (ndk.signer as NDKSigner).user();
    if (user.npub) {
        loggedIn.set(true);
    } else return;

    currentUser.set(user);

    myTicketFilter.authors?.push(user.pubkey);
    myOfferFilter.authors?.push(user.pubkey);
    myTickets.startSubscription();
    myOffers.startSubscription();

    await user.fetchProfile();
    currentUser.set(user);
}

export async function getActiveServiceWorker(): Promise<ServiceWorker|null> {
    if ('serviceWorker' in navigator) {
        let registeredSW = await navigator.serviceWorker.getRegistration();
        if (!registeredSW) {
            console.log('No registered Service Worker for this page!');
            console.log('Trying to register one...');
            // Try to register new service worker here
            registeredSW = await navigator.serviceWorker.register(
                '/service-worker.js',
                {	type: dev ? 'module' : 'classic'}
            );

            if(!registeredSW) return null;
        }

        const activeSW = registeredSW.active;
        if(activeSW) {
            return activeSW;
        } else {
            console.log('No active Service Worker, wait for it...')
            console.log(navigator.serviceWorker.getRegistrations())

            let pendingSW;
            if(registeredSW.installing) {
                pendingSW = registeredSW.installing;
            } else if(registeredSW.waiting) {
                pendingSW = registeredSW.waiting;
            }

            if(pendingSW) {
                pendingSW.onstatechange = (event: Event) => {
                    if(registeredSW!.active) {
                        console.log('service worker activated, update notification params...')
                    }
                };
            }
        }
    } else {
        console.log('service worker not supported')
        return null;
    }

    return null;
}
