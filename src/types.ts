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

import { DOMSource } from '@cycle/dom/rxjs-typings';
import { VNode } from '@cycle/dom';

import {
  Observable,
} from 'rxjs';

// When the next version of TS comes out, we can change these back to enums
export const PlaybackStatus = {
  STOPPED: 'stopped',
  PAUSED: 'paused',
  PLAYING: 'playing',
};

export const MessageType = {
  ERROR: 'error',
  PLAY_SONG: 'play_song',
  CHANGE_PLAYBACK_STATUS: 'change_playback_status',
  CHANGE_TRACK_ACTIVE_STATUS: 'change_track_active_status',
  CHANGE_ACTIVE_TRACKS: 'change_active_tracks',
  SONG_CHANGED: 'song_changed',
  PLAYBACK_STATUS_CHANGED: 'playback_status_changed',
  ACTIVE_TRACKS_CHANGED: 'active_tracks_changed',
  PIANO_AVAILABILITY_CHANGED: 'piano_availability_changed',
  UPDATE_STATUSES: 'update_statuses',
};

export type Message<T> = {
  type: string, // this becomes MessageType again when string enums come out
  payload: T
};

export type Note = {
  note: number,
  velocity: number,
  duration: number,
  time: number,
};

export type Song = {
  label: string,
  url: string,
};

export type Tabs = {
  label: string,
  component(sources: Sources<any>): Sinks,
};

export type Sources<T> = {
  DOM: DOMSource,
  hostPage: Observable<T>,
  messages: Observable<Message<any>>,
  pianoConnection: Observable<boolean>,
};

export type Sinks = {
  DOM: Observable<VNode>,
  hostPage: Observable<string>,
  messages: Observable<Message<any>>,
  piano: Observable<Note>,
  pianoConnection: Observable<any>,
};

export type Dict<T> = {
  [key: string]: T,
};
