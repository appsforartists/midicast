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

if (location.href.includes('background')) {
  WebMidi.enable(
    (error) => {
      if (error) {
        console.error(error);
      } else {
        let piano = WebMidi.outputs[0];

        if (!piano) {
          alert("Can't find your piano.  Make sure it's connected in the Audio MIDI Setup app.");
          return;
        }

        fetch('http://www.steelydan.nl/sounds/AjaByShino.mid').then(
          response => response.arrayBuffer()
        ).then(
          arrayBuffer => {
            const {
              tracks,
            } = MIDIConvert.parse(arrayBuffer);

            const pianoNotes = tracks.filter(
              ({ instrument, name }) => (instrument || name).toLowerCase().includes('piano')
            ).reduce(
              (notes, track) => [...notes, ...track.notes],
              []
            );

  //           // const notesByTime = pianoNotes.reduce(
  //           const notesByTime = tracks[2].notes.reduce(
  //             (aggregate, {time, midi, velocity, duration}) => (
  //               {
  //                 ...aggregate,
  //                 [time]: [...(aggregate[time] || []), { midi, velocity, duration }],
  //               }
  //             ),
  //             {}
  //           );
  // console.log(notesByTime);
            const startTime = performance.now();

  //           Object.entries(notesByTime).forEach(
  //             ([time, notes]) => {
  //               piano.playNote(
  //                 notes.map(note => note.midi),
  //                 "all",
  //                 {
  //                   time: startTime + (1000 * time),
  //                   velocity: notes[0].velocity / 5,
  //                   duration: 1000 * notes[0].duration,
  //                 }
  //             }
  //           );

  window.piano = piano;

            // // tracks.forEach(
            // //   track => track.notes.forEach(
              pianoNotes.forEach(
                ({ midi, time, velocity, duration }) => {
                  piano.playNote(
                    midi,
                    "all",
                    {
                      time: startTime + (1000 * time),
                      velocity: velocity / 10,
                      duration: 1000 * duration,
                    }
                  );
                }
              // )
            );
          }
        );
      }
    }
  );
}
