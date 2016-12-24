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
  Sources,
  Sinks,
} from '../types';

const flexStyle = {
  display: 'flex',
};

const inflexableStyle = {
  flex: 'none',
};

const rowStyle = {
  ...flexStyle,
  flexDirection: 'row',
};

const columnStyle = {
  ...flexStyle,
  flexDirection: 'column',
};

const scrollStyle = {
  overflow: 'auto',
};

export type MIDILink = {
  link: string,
  label: string,
};

export default function SongScanner({ DOM, hostPage: midiLinks$ }: Sources<Array<MIDILink>>): Sinks {
  const scanClick$ = DOM.select('#scan-button').events('click');
  const selectedSongLink$ = DOM.select('.song-link').events('click').map(
    event => event.target.dataset.href
  );

  const vtree$ = midiLinks$.startWith(null).map(
    midiLinks => (
      <div
        style = {
          {
            ...columnStyle,
            alignItems: 'center',
            position: 'relative',
            width: '600px',
            height: '600px',
          }
        }
      >
        <div
          style = {
            {
              ...rowStyle,
              ...inflexableStyle,
              paddingTop: '8px',
              paddingBottom: '8px',
            }
          }
        >
          <button
            id = 'scan-button'
            className = 'mdc-button mdc-elevation--z1'
            style = {
              {
                backgroundColor: '#4285F4',
                color: '#FFFFFF',
              }
            }
          >
            Scan this page for songs
          </button>
        </div>

        <div
          style = {
            {
              ...scrollStyle,
              width: '100%',
            }
          }
        >
          <ul
            className = 'mdc-list'
          >
            {
              !midiLinks
                ? ''
                : midiLinks.length === 0
                  ? 'No songs found.'
                  : midiLinks.map(
                      ({ label, link }) => (
                        <li
                          className = 'song-link mdc-list-item'
                          style = { inflexableStyle }
                          attrs = {
                            {
                              'data-href': link,
                            }
                          }
                        >
                          <span className = 'material-icons mdc-list-item__start-detail'>
                            play_arrow
                          </span>
                          { label }
                        </li>
                      )
                    )
            }
          </ul>
        </div>
      </div>
    )
  );

  return {
    DOM: vtree$,
    hostPage: scanClick$.mapTo(
      `
        Array.from(document.getElementsByTagName('a')).filter(
          a => (a.getAttribute('href') || '').includes('.mid')
        ).map(
          a => {
            const href = a.getAttribute('href');

            const link = href.startsWith('http')
              ? href
              : href.startsWith('/')
                ? location.origin + href
                : location.href.substring(0, location.href.lastIndexOf('/') + 1) + href;

            return {
              link,
              // If the link doesn't contain text, use the filename as the
              // label
              label: a.innerText || link.substr(link.lastIndexOf('/') + 1)
            };
          }
        )
      `
    ),
  };
}
