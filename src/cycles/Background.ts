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
  Dict,
  Message,
  MessageType,
  PlaybackStatus,
  Sinks,
  Sources,
} from '../types';

export default function Background({ messages: message$, pianoConnection: pianoAvailability$ }: Sources<any>): Sinks {
  const songRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.PLAY_SONG
  ).pluck('payload');

  const changeStatusRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.CHANGE_PLAYBACK_STATUS
  );

  const updateStatusesRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.UPDATE_STATUSES
  );

  const playRequest$ = changeStatusRequest$.filter(
    (message: Message<PlaybackStatus>) => message.payload === PlaybackStatus.PLAYING
  );

  const stopRequest$ = changeStatusRequest$.filter(
    (message: Message<PlaybackStatus>) => message.payload === PlaybackStatus.STOPPED
  );

  const pianoIsOffline$ = pianoAvailability$.filter(
    isAvailable => isAvailable == false
  );

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

  const song$ = songRequest$.flatMap(
    (url: string) => Observable.fromPromise(
      fetch(url).then(
        (response: Response) => response.arrayBuffer()
      ).then(
        MIDIConvert.parse
      )
    // Prevent Promise errors from breaking the stream
    ).catch(
      error => {
        console.error(error);
        return Observable.empty();
      }
    ).takeUntil(
      pianoIsOffline$
    )
  ).do(console.log).map(
    (song: MIDIConvert.MIDI) => {
      const notesByTrackByTime:Dict<Dict<any>> = {};
      let duration = 0;

      song.tracks.forEach(
        (track, trackID) => track.notes.forEach(
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
      );

      notesByTrackByTime.length = Math.round(song.duration * 1000);
      return notesByTrackByTime;
    }
  ).publishReplay();

  // Streams that represent properties (as opposed to events) should be
  // memoized.  In xstream, you'd accomplish this with a MemoryStream.  The
  // equivalent in RxJS is a publishReplay() + connect().  connect returns a
  // subscription, so we have to do it on its own line.
  song$.connect();

  const playStartingTime$ = Observable.merge(playRequest$, song$).map(
    () => performance.now()
  );

  // takeUntil doesn't seem to be working as you'd expect it to.
  const playCurrentTime$$ = playStartingTime$.map(
    startingTime => Observable.interval(100).map(
      count => count * 100
    ).withLatestFrom(song$).takeWhile(
      ([ time, song ]) => song.length > time
    ).map(
      ([ time ]) => time
    ).takeUntil(
      Observable.merge(
        stopRequest$,
        pianoIsOffline$,
      )
    )
  );

  const songStopped$ = playCurrentTime$$.flatMap(
    interval$ => interval$.last()
  );

  const note$ = playCurrentTime$$.switch().withLatestFrom(song$).map(
    ([ time, song ]) => song[time]
  ).filter(
    value => value !== undefined
  ).flatMap(
    notesByTrack => Observable.of(
      ...[].concat(...Object.values(notesByTrack))
    )
  ).withLatestFrom(playStartingTime$).map(
    ([ note, startTime ]) => (
      {
        ...note,
        time: startTime + note.time,
      }
    )
  ).do(console.log);

  const currentPlaybackStatus$ = playStartingTime$.mapTo(PlaybackStatus.PLAYING).merge(
    songStopped$.mapTo(PlaybackStatus.STOPPED)
  ).startWith(PlaybackStatus.STOPPED);

  const pianoAvailabilityMessage$ = pianoAvailability$.map(
    isAvailable => (
      {
        type: MessageType.PIANO_AVAILABILITY_CHANGED,
        payload: isAvailable,
      }
    )
  );

  const playbackStatusMessage$ = currentPlaybackStatus$.map(
    status => (
      {
        type: MessageType.PLAYBACK_STATUS_CHANGED,
        payload: status,
      }
    )
  );

  return {
    messages: Observable.merge(
      pianoAvailabilityMessage$,
      playbackStatusMessage$,
      updateStatusesRequest$.withLatestFrom(
        pianoAvailabilityMessage$,
        playbackStatusMessage$,
      ).flatMap(
        ([, pianoAvailability, playbackStatus ]) => Observable.of(
          pianoAvailability,
          playbackStatus,
        )
      ),
    ),
    piano: note$,
    pianoConnection: Observable.merge(
      songRequest$,
      playRequest$,
    ).startWith(undefined)
  }
}
