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
} from 'rxjs';

import {
  VNode,
  html
} from 'snabbdom-jsx';

import {
  Column,
  InflexibleColumn,
  InflexibleRow,
  MaterialIcon,
  Row,
} from 'snab-style';

import {
  DOMSink,
  DOMSource,
  MessageType,
  MessagesSink,
  MessagesSource,
  PlaybackStatus,
  Song,
} from '../types';

import EnterURL from './EnterURL';
import SongScanner from './SongScanner';
import TabbedPane from './TabbedPane';
import TrackSelector from './TrackSelector';

export type Sources = DOMSource & MessagesSource;
export type Sinks = DOMSink & MessagesSink;

export default function Popup({ DOM, messages: message$, ...sources }: Sources): Sinks {
  // TODO: find a way to make this get the current status from the background
  // page when the popup reopens
  const currentPlaybackStatus$: Observable<string> = message$.filter(
    message => message.type === MessageType.PLAYBACK_STATUS_CHANGED
  ).pluck('payload').startWith(PlaybackStatus.STOPPED);

  const currentSongName$: Observable<Song> = message$.filter(
    message => message.type === MessageType.SONG_CHANGED
  ).pluck('payload').pluck('header').pluck('name');

  const buttonAction$ = currentPlaybackStatus$.map(
    currentPlaybackStatus => {
      if (currentPlaybackStatus === PlaybackStatus.PLAYING) {
        return PlaybackStatus.STOPPED;
      } else {
        return PlaybackStatus.PLAYING;
      }
    }
  );

  const changePlaybackStatus$ = DOM.select('#play-button').events('click').withLatestFrom(
    buttonAction$,
    currentSongName$, // Don't send unless there's a song to play
  ).map(([, action]) => action).map(
    (requestedStatus) => (
      {
        type: MessageType.CHANGE_PLAYBACK_STATUS,
        payload: requestedStatus,
      }
    )
  );

  const buttonIcon$ = buttonAction$.map(
    status => (
      {
        [PlaybackStatus.PLAYING]: 'play_arrow',
        [PlaybackStatus.STOPPED]: 'stop',
      }[status]
    )
  );

  const tabbedPane = TabbedPane({
    DOM,
    tabs: Observable.of(
      [
        {
          label: 'songs on this page',
          component: SongScanner,
        },
        {
          label: 'enter song by url',
          component: EnterURL,
        },
        {
          label: 'instruments',
          component: TrackSelector,
        },
      ],
    ),
    messages: message$,
    ...sources,
  });
  const tabbedPaneDOM$: Observable<VNode> = tabbedPane.DOM;

  const playbackControlsDOM$ = Observable.combineLatest(
    currentSongName$,
    buttonIcon$
  ).map(
    ([
      currentSongName,
      buttonIcon,
    ]) => (
      <InflexibleColumn
        backgroundColor = 'var(--mdc-theme-primary)'
      >
        <InflexibleRow
          alignItems = 'center'
          justifyContent = 'center'
          height = { 72 }
        >
          <InflexibleRow
            id = 'play-button'
            className = { `mdc-elevation--z1` }
            alignItems = 'center'
            justifyContent = 'center'
            width = { 56 }
            height = { 56 }
            borderRadius = { 48 }
            backgroundColor = 'var(--mdc-theme-accent)'
            color = 'var(--mdc-theme-primary)'
            cursor = 'pointer'
          >
            <MaterialIcon>
              { buttonIcon }
            </MaterialIcon>
          </InflexibleRow>
        </InflexibleRow>
        <InflexibleRow
          color = 'var(--mdc-theme-accent)'
          justifyContent = 'center'
          fontSize = { 16 }
          marginBottom = { 16 }
        >
          { currentSongName }
        </InflexibleRow>
      </InflexibleColumn>
    )
  );

  return {
    ...tabbedPane,

    DOM: Observable.combineLatest(
      tabbedPaneDOM$,
      playbackControlsDOM$.startWith(''),
    ).map(
      ([
        tabbedPaneDOM,
        playbackControlsDOM,
      ]) => (
        <Column
          className = 'mdc-theme--background'
          width = { 528 }
          height = { 600 }
        >
          { playbackControlsDOM }
          { tabbedPaneDOM }
        </Column>
      )
    ),

    messages: Observable.merge(
      tabbedPane.messages,
      changePlaybackStatus$,
      Observable.of(
        {
          type: MessageType.UPDATE_STATUSES,
        }
      )
    )
  };
}
