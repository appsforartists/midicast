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
  ConnectableObservable,
  Observable,
} from 'rxjs';

import * as MIDIConvert from 'midiconvert';

import {
  Dict,
  Message,
  MessageType,
  PlaybackStatus,
  Sinks,
  Song,
  Sources,
} from '../types';

type NamedMIDI = MIDIConvert.MIDI & { name: string };

export default function Background({ messages: message$, pianoConnection: pianoAvailability$ }: Sources<any>): Sinks {
  const songRequest$: Observable<Song> = message$.filter(
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

  const midiSong$: ConnectableObservable<NamedMIDI> = songRequest$.flatMap(
    ({ url, label }) => Observable.fromPromise(
      fetch(url).then(
        (response: Response) => response.arrayBuffer()
      ).then(
        MIDIConvert.parse
      ).then(
        (midi: NamedMIDI) => {
          if (midi.tracks[0].name && !midi.tracks[0].notes.length) {
            midi.name = midi.tracks[0].name;
          } else {
            midi.name = label;
          }

          return midi;
        }
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
  ).publishReplay();

  // Streams that represent properties (as opposed to events) should be
  // memoized.  In xstream, you'd accomplish this with a MemoryStream.  The
  // equivalent in RxJS is a publishReplay() + connect().  connect returns a
  // subscription, so we have to do it on its own line.
  midiSong$.connect();

  // `notesByTrackIDByTime$` dispatches values in the shape:
  //
  //   {
  //     [time]: {
  //       [trackID]: note,
  //     },
  //   }
  //
  // so we can queue notes in decisecond increments and change which tracks are
  // included as the song is playing.

  const notesByTrackIDByTime$ = midiSong$.do(console.log).map(
    (namedMIDI: NamedMIDI) => {
      const notesByTrackIDByTime:Dict<Dict<any>> = {};
      let duration = 0;

      namedMIDI.tracks.forEach(
        (track, trackID) => track.notes.forEach(
          note => {
            const time = note.time * 1000;
            const roundedTime = Math.floor(note.time * 10) * 100;

            if (!notesByTrackIDByTime[roundedTime]) {
              notesByTrackIDByTime[roundedTime] = {};
            }

            if (!notesByTrackIDByTime[roundedTime][trackID]) {
              notesByTrackIDByTime[roundedTime][trackID] = [];
            }

            notesByTrackIDByTime[roundedTime][trackID].push(
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

      return notesByTrackIDByTime;
    }
  );

  const playStartingTime$ = Observable.merge(playRequest$, notesByTrackIDByTime$).map(
    () => performance.now()
  );

  const playCurrentTime$$ = playStartingTime$.map(
    startingTime => Observable.interval(100).map(
      count => count * 100
    ).withLatestFrom(midiSong$).takeWhile(
      ([ time, midiSong ]) => midiSong.duration * 1000 > time
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

  const note$ = playCurrentTime$$.switch().withLatestFrom(notesByTrackIDByTime$).map(
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
    wrapWithMessage(MessageType.PIANO_AVAILABILITY_CHANGED)
  );

  const playbackStatusMessage$ = currentPlaybackStatus$.map(
    wrapWithMessage(MessageType.PLAYBACK_STATUS_CHANGED)
  );

  const songChangedMessage$ = midiSong$.map(
    wrapWithMessage(MessageType.SONG_CHANGED)
  );

  return {
    messages: Observable.merge(
      pianoAvailabilityMessage$,
      playbackStatusMessage$,
      songChangedMessage$,
      updateStatusesRequest$.withLatestFrom(
        pianoAvailabilityMessage$,
        playbackStatusMessage$,
        songChangedMessage$,
      ).flatMap(
        ([,
          pianoAvailabilityMessage,
          playbackStatusMessage,
          songChangedMessage,
        ]) => Observable.of(
          pianoAvailabilityMessage,
          playbackStatusMessage,
          songChangedMessage,
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

function wrapWithMessage<T>(type: MessageType): (type: T) => Message<T> {
  return function (payload) {
    return {
      type,
      payload
    };
  }
};
