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
import * as MIDIConvert from 'midiconvert';

WebMidi.enable(
  (error) => {
    if (error) {
      console.error(error);
    } else {
      let piano = WebMidi.outputs[0];

      fetch('http://midkar.com/jazz/embraceable_you_bg.mid').then(
        response => response.arrayBuffer()
      ).then(
        arrayBuffer => {
          const parsed = MIDIConvert.parse(arrayBuffer);

          const notes = parsed.tracks[1].notes;

          notes.forEach(
            ({ midi, time, velocity, duration }) => {
              piano.playNote(
                midi,
                "all",
                {
                  time: time,
                  velocity: velocity,
                  duration: duration,
                }
              );
            }
          }
        }
      );
    }
  }
);


if (module.hot) {
  module.hot.accept(
    () => {
      location.reload();
    }
  );
}
