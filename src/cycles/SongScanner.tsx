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
  Message,
  MessageType,
  Sinks,
  Sources,
} from '../types';

import {
  InflexibleColumn,
  InflexibleRow,
} from '../snabstyle';

export type MIDILink = {
  url: string,
  label: string,
};

export default function SongScanner({ DOM, hostPage: midiLinks$, messages: message$ }: Sources<Array<MIDILink>>): Sinks {
  const selectedSongURL$ = DOM.select('.song-link').events('click').map(
    event => event.currentTarget.dataset.href
  );

  message$.subscribe(console.log);

  const vtree$ = midiLinks$.map(
    (midiLinks) => (
      <InflexibleColumn
        component = 'ul'
        className = 'mdc-list'
        minWidth = '100%'
      >
        {
          !midiLinks
            ? ''
            : midiLinks.length === 0
              ? 'No songs found.'
              : midiLinks.map(
                  ({ label, url }) => (
                    <InflexibleRow
                      component = 'li'
                      className = 'song-link mdc-list-item'
                      cursor = 'pointer'
                      attrs = {
                        {
                          'data-href': url,
                        }
                      }
                    >
                      <span className = 'material-icons mdc-list-item__start-detail'>
                        play_arrow
                      </span>

                      { label }
                    </InflexibleRow>
                  )
                )
        }
      </InflexibleColumn>
    )
  );

  return {
    DOM: vtree$,
    hostPage: Observable.of(
      `
        Array.from(document.getElementsByTagName('a')).filter(
          a => (a.getAttribute('href') || '').match(/\\.mid([^\\w]|$)/g)
        ).map(
          a => {
            const href = a.getAttribute('href');

            const url = href.startsWith('http')
              ? href
              : href.startsWith('/')
                ? location.origin + href
                : location.href.substring(0, location.href.lastIndexOf('/') + 1) + href;

            return {
              url,
              // If the url doesn't contain text, use the filename as the label
              label: a.innerText || url.substr(url.lastIndexOf('/') + 1)
            };
          }
        )
      `
    ),
    messages: selectedSongURL$.map(
      url => (
        {
          type: MessageType.PLAY_SONG,
          payload: url,
        }
      ),
    )
  };
}
