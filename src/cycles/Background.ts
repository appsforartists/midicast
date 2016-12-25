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

import {
  MessageType,
  Sinks,
  Sources,
} from '../types';

export default function Background({ messages: message$, pianoConnection: pianoError$ }: Sources): Sinks {
  const requestedSong$ = message$.filter(
    message => message.type === MessageType.PLAY_SONG
  ).pluck('payload');

  return {
    messages: pianoError$,
    piano: Observable.empty(),
    pianoConnection: requestedSong$,
  }
}
