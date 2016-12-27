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

import * as WebMIDI from 'webmidi';

import {
  Observable,
  Observer,
  Subject,
} from 'rxjs';

import {
  ErrorPayload,
  ErrorType,
  Message,
  MessageType,
  Note,
} from './types';

export type PianoAndConnectionDriver = {
  pianoConnectionDriver(request$: Observable<any>): Observable<Message<ErrorPayload>>,
  pianoDriver(note$: Observable<Note>),
}

export default function makePianoAndConnectionDriver(): PianoAndConnectionDriver {
  let piano$ = new Subject();

  return {
    pianoConnectionDriver(request$) {
      return request$.flatMap(
        () => Observable.create(
          (pianoAvailabilityObserver: Observer) => {
            if (WebMIDI.enabled) {
              pianoAvailabilityObserver.next(true);

            } else {
              WebMIDI.enable(
                (error: Error) => {
                  if (error) {
                    console.error(error);
                    pianoAvailabilityObserver.next(false);
                  } else {
                    // TODO:
                    // - Add a listener here to dispatch a not_connected_error
                    //   whenever the piano becomes unavailable.
                    // - If that doesn't work, check the piano's state in
                    //   noteAndPiano$ and forward a message to the error stream if
                    //   it's unavailable.
                    const piano = WebMIDI.outputs[0];

                    if (piano) {
                      piano$.next(piano);
                      pianoAvailabilityObserver.next(true);

                    } else {
                      pianoAvailabilityObserver.next(false);
                      WebMIDI.disable();
                    }
                  }
                  pianoAvailabilityObserver.complete();
                }
              );
            }
            pianoAvailabilityObserver.complete();
          }
        )
      ).distinctUntilChanged();
    },

    pianoDriver(note$) {
      // If `piano$` dispatched `null` when a MIDI connection was lost, we could
      // return an error stream here that would dispatch whenever pianoDriver
      // received a note without a piano to play it on.
      note$.withLatestFrom(piano$).subscribe(
        ([ { note, duration, velocity }, piano ]) => {
          piano.playNote(
            note,
            'all',
            {
              duration,
              velocity,
            }
          );
        }
      );
    }
  }
};
