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

import * as MIDIConvert from 'midiconvert';

import {
  Observable,
} from 'rxjs';

import {
  DOMSource as CycleDOMSource,
} from '@cycle/dom/rxjs-typings';

import {
  VNode,
} from '@cycle/dom';

import {
  MessagesSink as GenericMessagesSink,
  MessagesSource as GenericMessagesSource,
} from 'cycle-extensions';

import {
  Note,
} from 'cycle-midi';

export enum PlaybackStatus {
  STOPPED = 'stopped',
  PAUSED = 'paused',
  PLAYING = 'playing',
};

export enum MessageType {
  ERROR = 'error',
  PLAY_SONG = 'play_song',
  CHANGE_PLAYBACK_STATUS = 'change_playback_status',
  CHANGE_TRACK_ACTIVE_STATUS = 'change_track_active_status',
  CHANGE_ACTIVE_TRACKS = 'change_active_tracks',
  SONG_CHANGED = 'song_changed',
  PLAYBACK_STATUS_CHANGED = 'playback_status_changed',
  ACTIVE_TRACKS_CHANGED = 'active_tracks_changed',
  INSTRUMENT_AVAILABILITY_CHANGED = 'instrument_availability_changed',
  UPDATE_STATUSES = 'update_statuses',
};

export type Message<T> = {
  type: MessageType,
  payload: T
};

export type Song = {
  label: string,
  url: string,
};

export type Messages = {
  type: MessageType.ERROR,
  payload: string
} | {
  type: MessageType.PLAY_SONG,
  payload: Song,
} | {
  type: MessageType.CHANGE_PLAYBACK_STATUS,
  payload: PlaybackStatus,
} | {
} | {
  type: MessageType.CHANGE_ACTIVE_TRACKS,
  payload: {
    query: string,
    active: boolean,
    id: number | string,
  },
} | {
  type: MessageType.CHANGE_TRACK_ACTIVE_STATUS,
  payload: {
    active: boolean,
    id: number,
  }
} | {
  type: MessageType.SONG_CHANGED,
  payload: MIDIConvert.MIDI
} | {
  type: MessageType.PLAYBACK_STATUS_CHANGED,
  payload: PlaybackStatus,
} | {
  type: MessageType.ACTIVE_TRACKS_CHANGED,
  payload: Array<number>,
} | {
  type: MessageType.INSTRUMENT_AVAILABILITY_CHANGED,
  payload: boolean,
} | {
  type: MessageType.UPDATE_STATUSES,
  payload: undefined,
};

export type Tab = {
  label: string,
  component(sources: DOMSource): DOMSink,
};

export type DOMSource = {
  DOM: CycleDOMSource,
};

export type DOMSink = {
  DOM: Observable<VNode>,
};

export type MessagesSource = {
  messages: Observable<Messages>,
};

export type MessagesSink = {
  messages: Observable<Messages>,
};

export {
  HostPageSink,
  HostPageSource,
} from 'cycle-extensions';

export {
  InstrumentConnectionSink,
  InstrumentConnectionSource,
  InstrumentSink,
} from 'cycle-midi';

export type Dict<T> = {
  [key: string]: T,
};
