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
  ConnectableObservable,
  Observable,
  Subject,
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

export default function Background({ messages: message$, pianoConnection: pianoAvailability$ }: Sources<any>): Sinks {
  const songRequest$: Observable<Song> = message$.filter(
    (message: Message<any>) => message.type === MessageType.PLAY_SONG
  ).pluck('payload');

  const changeStatusRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.CHANGE_PLAYBACK_STATUS
  ).pluck('payload');

  const changeTrackActiveStatusRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.CHANGE_TRACK_ACTIVE_STATUS
  ).pluck('payload');

  const changeActiveTracksRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.CHANGE_ACTIVE_TRACKS
  ).pluck('payload');

  const updateStatusesRequest$ = message$.filter(
    (message: Message<any>) => message.type === MessageType.UPDATE_STATUSES
  ).pluck('payload');

  const playRequest$ = changeStatusRequest$.filter(
    (status: PlaybackStatus) => status === PlaybackStatus.PLAYING
  );

  const stopRequest$ = changeStatusRequest$.filter(
    (status: PlaybackStatus) => status === PlaybackStatus.STOPPED
  );

  const pianoIsOffline$ = pianoAvailability$.filter(
    isAvailable => isAvailable === false
  );

  const midiSong$: ConnectableObservable<MIDIConvert.MIDI> = songRequest$.flatMap(
    ({ url, label }) => Observable.fromPromise(
      fetch(url).then(
        (response: Response) => response.arrayBuffer()
      ).then(
        MIDIConvert.parse
      ).then(
        (midi: MIDIConvert.MIDI): MIDIConvert.MIDI => {
          // This is going to be JSON-serialized when it gets sent to the UI, so
          // use the same version here for consistency.
          midi = midi.toJSON();

          // `label` is introspected from the link name; if the file doesn't
          // give us a good name to show, hopefully the link will.
          if (!midi.header.name) {
            midi.header.name = label;
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

  const notesByTrackIDByTime$ = midiSong$.map(
    (namedMIDI: MIDIConvert.MIDI) => {
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
    ).pluck(0).takeUntil(
      Observable.merge(
        stopRequest$,
        pianoIsOffline$,
      )
    )
  );

  const songStopped$ = playCurrentTime$$.flatMap(
    interval$ => interval$.last()
  );

  const activeTrackIDProxy: Subject<Array<number>> = new Subject();

  const allTrackIDs$: Observable<Array<number>> = midiSong$.map(
    (song: MIDIConvert.MIDI) => song.tracks.map(track => track.id)
  );

  const activeTrackIDs$ = Observable.merge(
    allTrackIDs$,
    changeTrackActiveStatusRequest$.withLatestFrom(activeTrackIDProxy).map(
      ([ request, activeTrackIDs ]) => {
        if (request.active) {
          return [...activeTrackIDs, request.id];

        } else {
          return activeTrackIDs.filter(id => id !== request.id);
        }
      }
    ),
    changeActiveTracksRequest$.withLatestFrom(activeTrackIDProxy, midiSong$).map(
      ([ { query, active }, oldActiveTrackIDs, song ]) => {
        let activeTrackIDs: Array<number>;

        if (query === 'all') {
          if (active) {
            activeTrackIDs = song.tracks.map(
              track => track.id
            );
          } else {
            activeTrackIDs = [];
          }
        } else {
          const queryPieces:Array<string> = query.toLowerCase().split(',');

          if (active) {
            activeTrackIDs = song.tracks.filter(
              track => queryPieces.some(
                (queryPiece: string) => track.name.toLowerCase().includes(queryPiece)
              )
            ).map(
              track => track.id
            );

            oldActiveTrackIDs.forEach(
              id => {
                if (!activeTrackIDs.includes(id)) {
                  activeTrackIDs.push(id);
                }
              }
            );
          } else {
            activeTrackIDs = oldActiveTrackIDs.filter(
              id => !queryPieces.some(
                (queryPiece: string) => song.tracks[id].name.toLowerCase().includes(queryPiece)
              )
            );
          }
        }

        return activeTrackIDs;
      }
    )
  );

  activeTrackIDs$.subscribe(activeTrackIDProxy);

  const note$ = playCurrentTime$$.switch().withLatestFrom(notesByTrackIDByTime$).map(
    ([ time, notesByTrackIDByTime ]) => notesByTrackIDByTime[time]
  ).filter(
    value => value !== undefined
  ).withLatestFrom(activeTrackIDs$).flatMap(
    ([ notesByTrackID, activeTrackIDs ]) => Observable.of(
      ...[].concat(
        ...activeTrackIDs.map(trackID => notesByTrackID[trackID])
      )
    )
  ).filter(
    value => value !== undefined
  ).withLatestFrom(playStartingTime$).map(
    ([ note, startTime ]) => (
      {
        ...note,
        time: startTime + note.time,
      }
    )
  );

  const currentPlaybackStatus$ = playStartingTime$.mapTo(PlaybackStatus.PLAYING).merge(
    songStopped$.mapTo(PlaybackStatus.STOPPED)
  ).startWith(PlaybackStatus.STOPPED);

  const pianoAvailabilityChangedMessage$ = pianoAvailability$.map(
    wrapWithMessage(MessageType.PIANO_AVAILABILITY_CHANGED)
  );

  const playbackStatusChangedMessage$ = currentPlaybackStatus$.map(
    wrapWithMessage(MessageType.PLAYBACK_STATUS_CHANGED)
  );

  const songChangedMessage$ = midiSong$.map(
    wrapWithMessage(MessageType.SONG_CHANGED)
  );

  const activeTracksChangedMessage$ = activeTrackIDs$.map(
    wrapWithMessage(MessageType.ACTIVE_TRACKS_CHANGED)
  );

  return {
    // TODO: abstract this pattern into something less repetitive
    messages: Observable.merge(
      pianoAvailabilityChangedMessage$,
      playbackStatusChangedMessage$,
      songChangedMessage$,
      activeTracksChangedMessage$,
      updateStatusesRequest$.withLatestFrom(
        pianoAvailabilityChangedMessage$,
        playbackStatusChangedMessage$,
        songChangedMessage$,
        activeTracksChangedMessage$,
      ).flatMap(
        ([,
          pianoAvailabilityMessage,
          playbackStatusMessage,
          songChangedMessage,
          activeTracksChangedMessage,
        ]) => Observable.of(
          pianoAvailabilityMessage,
          playbackStatusMessage,
          songChangedMessage,
          activeTracksChangedMessage,
        )
      ),
    ),
    piano: note$,
    pianoConnection: Observable.merge(
      songRequest$,
      playRequest$,
    ).startWith(undefined)
  };
}

export function wrapWithMessage<T>(type: MessageType): (type: T) => Message<T> {
  return function (payload) {
    return {
      type,
      payload,
    };
  };
};

