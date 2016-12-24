/** @license
 *  Copyright 2016 - present The Material Motion Authors. All Rights Reserved.
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
} from 'rxjs';

import '@types/chrome';

/**
 * Accepts a stream of code snippets to execute on the active tab and returns a
 * stream of responses.
 */
export function activeTabDriver(snippet$: Observable<string>): Observable<any> {
  return Observable.create(
    observer => {
      const subscription = snippet$.subscribe(
        snippet => {
          chrome.tabs.executeScript(
            {
              code: snippet,
              allFrames: true,
            },
            ([ response ]) => observer.next(response)
          );
        }
      );

      return subscription.unsubscribe();
    }
  );
}

/**
 * Creates a Cycle.js driver to send and receive messages in a WebExtension.
 */
export function createMessageDriver(channelName: string): MessageDriver {
  const channel = chrome.runtime.connect({ name: channelName });

  /**
   * Accepts a stream of messages to send on the channel and returns a stream of
   * responses received on the channel.
   */
  return function messageDriver(outgoingMessage$: Observable<any>): Observable<any> {
    outgoingMessage$.subscribe(channel.postMessage);

    return Observable.create(
      observer => {
        function forwardMessage(incomingMessage) {
          observer.next(incomingMessage);
        }

        channel.onMessage.addListener(forwardMessage);

        return () => {
          channel.onMessage.removeListener(forwardMessage);
        }
      }
    );
  }
}

export type MessageDriver = (message$: Observable<any>) => Observable<any>;
