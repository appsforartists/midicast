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

import { html } from 'snabbdom-jsx';

import * as WebMIDI from 'webmidi';

import {
  Column,
} from '../snabstyle';

import {
  Sources,
  Sinks,
} from '../types';

export default function PianoTester({ DOM }: Sources<any>): Sinks {
  const midi$ = DOM.select('document').events('keydown').map(
    event => (
      {
        state: 'down',
        code: midiCodesByKey[event.key]
      }
    )
  ).merge(
    DOM.select('document').events('keyup').map(
      event => (
        {
          state: 'up',
          code: midiCodesByKey[event.key]
        }
      )
    )
  );

  const activeMIDICodes$ = midi$.scan(
    (active, { state, code }) => {
      if (state === 'down') {
        active.add(code);

      } else {
        active.delete(code);
      }

      return active;
    },
    new Set()
  ).startWith(new Set())

  // Cheating and doing this imperatively because I don't want to write a driver
  // for a tester

  let piano;

  WebMIDI.enable(
    error => {
      if (WebMIDI.outputs[0]) {
        console.log('piano connected');
        piano = WebMIDI.outputs[0];
      }
    }
  );

  midi$.subscribe(
    ({ code, state }) => {
      console.log('trying to send ', code);
      if (piano) {
        piano.playNote(
          code,
          'all',
          {
            velocity: state === 'down'
              ? .2
              : 0,
          }
        )
      }
    }
  )

  return {
    DOM: activeMIDICodes$.map(
      activeMIDICodes => (
        <Column
          className = 'mdc-theme--background'
          width = { 600 }
          height = { 600 }
          color = 'var(--mdc-theme-accent)'
          fontSize = { 24 }
          padding = { 16 }
        >
          Last pressed: { Array.from(activeMIDICodes.values()).join(', ') }
        </Column>
      )
    ),
  }
}

const midiCodesByKey = {};
`\`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./ `.split('').forEach(
  (key, number) => midiCodesByKey[key] = number + 30
);
