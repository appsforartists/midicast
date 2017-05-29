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
  CenteredColumn,
  CenteredRow,
} from '../snabstyle';

import {
  MessageType,
  Sinks,
  Song,
  Sources,
} from '../types';

export default function EnterURL({ DOM, messages: message$, ...sources }: Sources<any>): Sinks {
  const input$: Observable<string> = DOM.select('#url').events('keyup').map(
    (event) => (event.target as HTMLInputElement).value
  );

  const requestSong$: Observable<Song> = Observable.combineLatest(
    Observable.merge(
      DOM.select('#play-url').events('click'),
      DOM.select('#url').events('keyup').filter(
        (event: KeyboardEvent) => event.key === 'Enter'
      )
    ),
    input$
  ).pluck(1).filter(
    url => url.length
  ).map(
    url => (
      {
        type: MessageType.PLAY_SONG,
        payload: {
          url,
          label: url,
        }
      }
    )
  );

  return {
    DOM: input$.startWith('').map(
      input => (
        <CenteredColumn
          padding = { 32 }
          width = '100%'
          minHeight = { 200 }
          alignItems = 'stretch'
        >
          <CenteredRow
            className = 'mdc-textfield'
          >
            <input
              autofocus
              id = 'url'
              className = 'mdc-textfield__input'
              placeholder = 'Paste the .mid URL here'
              style = {
                {
                  flex: 1,
                }
              }
            />
          </CenteredRow>

          <button
            id = 'play-url'
            className = 'mdc-button mdc-button--raised mdc-button--primary'
            disabled = { input.length === 0 }
            style = {
              {
                width: '150px',
                alignSelf: 'center',
                fontWeight: 'bold',
              }
            }
          >
            Play song
          </button>
        </CenteredColumn>
      )
    ),

    messages: Observable.merge(
      requestSong$,
    )
  };
}
