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
  Message,
  MessageType,
  Note,
} from './types';

export type PianoAndConnectionDriver = {
  pianoConnectionDriver(request$: Observable<any>): Observable<boolean>,
  pianoDriver(note$: Observable<Note>): void,
}

export const MIDICode = {
  UP: 0b10000000,
  DOWN: 0b10010000,
}

export default function makePianoAndConnectionDriver(): PianoAndConnectionDriver {
  let piano$: Subject<WebMidi.MIDIOutput> = new Subject();

  return {
    pianoConnectionDriver(request$) {
      return request$.flatMap(
        () => Observable.create(
          (pianoAvailabilityObserver: Observer<any>) => {
            navigator.requestMIDIAccess().then(
              function onSuccess(midi) {
                if (midi.outputs.size) {
                  const piano = midi.outputs.values().next().value;
                  piano$.next(piano);

                  pianoAvailabilityObserver.next(true);
                  piano.addEventListener(
                    'statechange',
                    (event: Event) => {
                      pianoAvailabilityObserver.next(
                        piano.state === 'connected'
                      );
                    }
                  );
                } else {
                  pianoAvailabilityObserver.next(false);
                }
              },

              function onFailure() {
                pianoAvailabilityObserver.next(false);
              }
            );
          }
        )
      ).distinctUntilChanged();
    },

    pianoDriver(note$) {
      // If `piano$` dispatched `null` when a MIDI connection was lost, we could
      // return an error stream here that would dispatch whenever pianoDriver
      // received a note without a piano to play it on.
      note$.withLatestFrom(piano$).subscribe(
        ([ { note, duration, velocity, time }, piano ]) => {
          const velocity128 = Math.round(128 * velocity);
          try {
            // MIDI down is 0x9 << 4 | channel, where channel is between 0x0 and
            // 0xF.  Since the piano is on channel 0, we can ignore the channel.
            //
            // https://www.midi.org/specifications/item/table-1-summary-of-midi-message
            piano.send(
              [
                MIDICode.DOWN,
                note,
                velocity128,
              ],
              time
            );

            piano.send(
              [
                MIDICode.UP,
                note,
                0,
              ],
              time + duration
            );
          } catch (error) {
            console.error(error, note, time);
          }
        }
      );
    }
  }
};
