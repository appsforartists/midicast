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

import {
  Column,
  InflexibleRow,
  MaterialIcon,
  Row,
} from '../snabstyle';

import TabbedPane from './TabbedPane';
import SongScanner from './SongScanner';

export default function Popup({ DOM, messages: message$, ...sources }: Sources<any>): Sinks {
  const tabbedPane = TabbedPane({
    DOM,
    tabs: Observable.of(
      [
        {
          label: 'songs on this page',
          component: SongScanner,
        },
      ],
    ),
    messages: message$,
    ...sources,
  });
  const tabbedPaneDOM$ = tabbedPane.DOM;

  return {
    ...tabbedPane,
    DOM: tabbedPaneDOM$.map(
      tabbedPaneDOM => (
        <Column
          className = 'mdc-theme--background'
          width = { 600 }
          height = { 600 }
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
              color = 'var(--mdc-theme-background)'
            >
              <MaterialIcon>
                play_arrow
              </MaterialIcon>
            </InflexibleRow>
          </InflexibleRow>

          { tabbedPaneDOM }
        </Column>
      )
    ),
    messages: Observable.merge(
      message$,
      tabbedPane.messages,
    )
  }
}
