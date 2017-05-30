/** @license
 *  Copyright 2016 - present The Midicast Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not
 *  use this file except in compliance with the License. You may obtain a copy
 *  of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions and limitations
 *  under the License.
 */

import {
  Observable,
  Observer,
  Subscription,
} from 'rxjs';

const browser: typeof chrome = (window as any).browser || chrome;

/**
 * Accepts a stream of code snippets to execute on the active tab and returns a
 * stream of responses.
 */
export function hostPageDriver<I>(snippet$: Observable<string>): Observable<I> {
  return Observable.create(
    (observer: Observer<I>) => {
      const subscription = snippet$.subscribe(
        snippet => {
          browser.tabs.executeScript(
            {
              code: snippet,
              allFrames: true,
            },
            ([ response ]: Array<I>) => observer.next(response)
          );
        }
      );

      return subscription.unsubscribe;
    }
  );
}

/**
 * Creates a Cycle.js driver to send and receive messages in a WebExtension.
 *
 * The WebExtension messaging API is asymmetric: the long-running background
 * page awaits connections while ephemeral popup and content scripts initiate
 * them.  Thus, set `shouldInitiate` to `true` unless `messagesDriver` is for a
 * background page.
 */
export function makeMessagesDriver<O, I>({ shouldInitiate }: { shouldInitiate: boolean }): MessagesDriver<O, I> {
  /**
   * Accepts a stream of messages to send on the channel and returns a stream of
   * responses received on the channel.
   */
  return function messagesDriver(outgoingMessage$: Observable<O>): Observable<I> {
    return Observable.create(
      (observer: Observer<I>) => {
        let channel: chrome.runtime.Port;
        let outgoingSubscription: Subscription;
        let connected = false;

        if (shouldInitiate) {
          connectToChannel(
            browser.runtime.connect()
          );
        } else {
          browser.runtime.onConnect.addListener(connectToChannel);
        }

        function forwardMessage(incomingMessage: I) {
          console.log('Received:', incomingMessage);
          observer.next(incomingMessage);
        }

        function connectToChannel(newChannel: chrome.runtime.Port) {
          if (connected) {
            return;
          }

          channel = newChannel;
          channel.onMessage.addListener(forwardMessage);
          channel.onDisconnect.addListener(
            () => {
              outgoingSubscription.unsubscribe();
              channel.onMessage.removeListener(forwardMessage);
              connected = false;
            }
          );

          outgoingSubscription = outgoingMessage$.subscribe(
            (outgoingMessage: O) => {
              try {
                console.log('Sending:', outgoingMessage);
                channel.postMessage(outgoingMessage);
              } catch(error) {
                console.warn('Failed to send message', outgoingMessage);
              }
            }
          );

          connected = true;
        }

        return () => {
          outgoingSubscription.unsubscribe();

          if (channel) {
            channel.disconnect();
          }
        };
      }
    ).publish().refCount();
  };
}

export type MessagesDriver<O, I> = (message$: Observable<O>) => Observable<I>;
