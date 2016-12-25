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

import * as MIDIConvert from 'midiconvert';

import {
  MessageType,
  Sinks,
  Sources,
} from '../types';

export default function Background({ messages: message$, pianoConnection: pianoError$ }: Sources): Sinks {
  const requestedSongURL$ = message$.filter(
    message => message.type === MessageType.PLAY_SONG
  ).pluck('payload');

  // `song$` dispatches values in the shape:
  //
  //   {
  //     [time]: {
  //       [trackID]: note,
  //     },
  //   }
  //
  // so we can queue notes in decisecond increments and change which tracks are
  // included as the song is playing.

  const song$ = requestedSongURL$.flatMap(
    url => Observable.fromPromise(
      fetch(url).then(
        response => response.arrayBuffer()
      ).then(
        MIDIConvert.parse
      )
    // Prevent Promise errors from breaking the stream
    ).catch(
      error => {
        console.error(error);
        return Observable.empty();
      }
    )
  ).map(
    song => {
      const notesByTrackByTime = {};
      let duration = 0;

      song.tracks.forEach(
        (track, trackID) => {
          duration = Math.max(track.duration, duration);

          track.notes.forEach(
            note => {
              const time = note.time * 1000;
              const roundedTime = Math.floor(note.time * 10) * 100;

              if (!notesByTrackByTime[roundedTime]) {
                notesByTrackByTime[roundedTime] = {};
              }

              if (!notesByTrackByTime[roundedTime][trackID]) {
                notesByTrackByTime[roundedTime][trackID] = [];
              }

              notesByTrackByTime[roundedTime][trackID].push(
                {
                  note: note.midi,
                  duration: note.duration * 1000,
                  velocity: note.velocity,
                  time,
                }
              );
            }
          )
        }
      );

      notesByTrackByTime.length = Math.round(duration * 1000);
      return notesByTrackByTime;
    }
  ).publishReplay();

  // A MemoryStream in xstream is a publishReplay() + connect() in RxJS
  song$.connect();

  const playbackStartingTime$ = song$.map(
    () => performance.now()
  );

  // TODO: clean this up.
  const note$ = playbackStartingTime$.flatMap(
    startingTime => Observable.interval(100).map(
      count => count * 100
    ).withLatestFrom(song$).takeWhile(
      ([ time, song ]) => song.length > time
    ).map(
      ([ time, song ]) => song[time]
    ).filter(value => value !== undefined)
  ).flatMap(
    notesByTrack => Observable.of(
      ...[].concat(...Object.values(notesByTrack))
    )
  ).do(console.log);

  return {
    messages: pianoError$,
    piano: note$,
    pianoConnection: requestedSongURL$,
  }
}
