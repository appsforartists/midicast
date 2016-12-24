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

import * as WebMidi from 'webmidi';

import {
  Observable,
} from 'rxjs';

/**
 * It will attempt to play every note received on `note$` on the first MIDI
 * output.
 *
 * It attempts to connect to that output whenever it receives input from
 * `connectionRequest$`.
 *
 * Returns a stream of connection errors.
 */
export default function pianoDriver({ connectionRequest$, note$ }) {
  const pianoOrError$ = connectionRequest$.flatMap(
    () => Observable.create(
      observer => {
        WebMidi.enable(
          (error) => {
            if (error) {
              console.error(error);
              observer.next({
                type: 'error',
                message: error,
              });
            } else {
              // TODO:
              // - Add a listener here to dispatch a not_connected_error
              //   whenever the piano becomes unavailable.
              // - If that doesn't work, check the piano's state in
              //   noteAndPiano$ and forward a message to the error stream if
              //   it's unavailable.
              const piano = WebMidi.outputs[0];

              if (piano) {
                observer.next(piano);
              } else {
                observer.next({
                  type: 'not_connected_error',
                  message: `No MIDI devices found.`,
                });
              }
            }
            observer.complete();
          }
        )
      }
    )
  );

  const [piano$, connectionError$] = pianoOrError$.partition(
    pianoOrError => pianoOrError.playNote
  );

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

  return connectionError$;
}
