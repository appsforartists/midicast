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
  Subject,
} from 'rxjs';

export type Note = {
  note: number,
  velocity: number,
  duration: number,
  time: number,
};

export type InstrumentAndConnectionDriver = {
  connectionDriver(request$: Observable<any>): Observable<boolean>,
  instrumentDriver(note$: Observable<Note>): void,
};

export type InstrumentConnectionSource = {
  instrumentConnection: Observable<boolean>,
};

export type InstrumentConnectionSink = {
  instrumentConnection: Observable<any>,
};

export type InstrumentSink = {
  instrument: Observable<Note>,
};

// tslint:disable-next-line:variable-name
export const MIDICode = {
  UP: 0b10000000,
  DOWN: 0b10010000,
};

export default function makeInstrumentAndConnectionDriver(): InstrumentAndConnectionDriver {
  let instrument$: Subject<WebMidi.MIDIOutput> = new Subject();

  return {
    /**
     * Whenever it receives any request on the input stream, it will attempt to
     * connect to the first exposed WebMIDI instrument.  If the attempt
     * succeeds, it will dispatch `true` on the output stream.  If it fails, it
     * will dispatch `false` on the output stream.
     */
    connectionDriver(request$: Observable<any>): Observable<boolean> {
      return request$.flatMap(
        () => Observable.create(
          (instrumentAvailabilityObserver: Observer<boolean>) => {
            navigator.requestMIDIAccess().then(
              function onSuccess(midi) {
                if (midi.outputs.size) {
                  const instrument = midi.outputs.values().next().value;
                  instrument$.next(instrument);

                  instrumentAvailabilityObserver.next(true);
                  instrument.addEventListener(
                    'statechange',
                    (event: Event) => {
                      instrumentAvailabilityObserver.next(
                        instrument.state === 'connected'
                      );
                    }
                  );
                } else {
                  instrumentAvailabilityObserver.next(false);
                }
              },

              function onFailure() {
                instrumentAvailabilityObserver.next(false);
              }
            );
          }
        )
      ).distinctUntilChanged();
    },

    /**
     * Accepts a stream of Notes to send to the connected instrument.
     *
     * Maybe one day it will also return a stream of notes received from the
     * instrument, but it doesn't do that yet.
     */
    instrumentDriver(note$: Observable<Note>) {
      // If `instrument$` dispatched `null` when a MIDI connection was lost, we
      // could return an error stream here that would dispatch whenever
      // instrumentDriver received a note without a instrument to play it on.
      note$.withLatestFrom(instrument$).subscribe(
        ([ { note, duration, velocity, time }, instrument ]) => {
          const velocity128 = Math.round(128 * velocity);
          try {
            // MIDI down is 0x9 << 4 | channel, where channel is between 0x0 and
            // 0xF.  Since the instrument is on channel 0, we can ignore the
            // channel.
            //
            // https://www.midi.org/specifications/item/table-1-summary-of-midi-message
            instrument.send(
              [
                MIDICode.DOWN,
                note,
                velocity128,
              ],
              time
            );

            instrument.send(
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
  };
};
