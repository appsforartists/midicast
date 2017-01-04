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

import * as MIDIConvert from 'midiconvert';

import {
  VNode,
  html,
} from 'snabbdom-jsx';

import {
  svg,
} from '@cycle/dom';

import {
  Block,
  CenteredColumn,
  FlexibleColumn,
  InflexibleRow,
  Row,
} from '../snabstyle';

import {
  Dict,
  MessageType,
  Song,
  Sources,
  Sinks,
} from '../types';

import {
  wrapWithMessage,
} from '../utils';

// TODO: Make this based on NamedMIDI to ensure `id` is included too.
type Tracks = Array<MIDIConvert.Track>;

export default function TrackSelector({ DOM, messages: message$, ...sources }: Sources<any>): Sinks {
  const currentTracks$: Observable<Tracks> = message$.filter(
    message => message.type === MessageType.SONG_CHANGED
  ).pluck('payload').pluck('tracks').map(
    (currentTracks: Tracks) => currentTracks.filter(
      track => track.notes.length
    )
  );

  const activeTrackIDs$: Observable<Array<number>> = message$.filter(
    message => message.type === MessageType.ACTIVE_TRACKS_CHANGED
  ).pluck('payload');

  const changeActiveTracksMessage$ = DOM.select('input').events('change').map(
    event => {
      const dataset = (event.target as any).parentNode.dataset;
      const payload: Dict<any> = {
        active: (event.target as HTMLInputElement).checked,
      };

      if (dataset.query) {
        payload['query'] = dataset.query;
      } else {
        payload['id'] = parseInt(dataset.index)
      }

      return {
        type: payload['query']
          ? MessageType.CHANGE_ACTIVE_TRACKS
          : MessageType.CHANGE_TRACK_ACTIVE_STATUS,
        payload
      }
    }
  );

  return {
    DOM: Observable.combineLatest(
      currentTracks$,
      activeTrackIDs$,
    ).map(
      ([
        currentTracks,
        activeTrackIDs,
      ]) => (
        <FlexibleColumn
          component = 'ul'
          className = 'mdc-list'
        >
          <TrackRow
            query = 'all'
            label = 'All instruments'
            checked = {
              currentTracks.map(track => track.id).every(
                id => activeTrackIDs.includes(id)
              )
            }
          />

          <TrackRow
            query = 'piano'
            label = 'Piano'
            checked = {
              currentTracks.filter(
                track => track.name.toLowerCase().includes('piano')
              ).map(track => track.id).every(
                id => activeTrackIDs.includes(id)
              )
            }
          />

          <li
            role = 'separator'
            class='mdc-list-divider'
          />

          {
            currentTracks.filter(
              track => track.notes.length
            ).map(
              track => (
                <TrackRow
                  index = { track.id }
                  label = { track.instrument || track.name || 'unknown' }
                  checked = { activeTrackIDs.includes(track.id) }
                />
              )
            )
          }
        </FlexibleColumn>
      )
    ).startWith(''),

    messages: Observable.merge(
      Observable.of(
        {
          type: MessageType.UPDATE_STATUSES,
        }
      ),
      changeActiveTracksMessage$,
    )
  }
}

function TrackRow({ index, query, label, checked, ...props }) {
  let component = 'label';

  if (typeof index !== 'number') {
    component = 'li';
  }

  let vtree = (
    <InflexibleRow
      component = { component }
      className = 'mdc-list-item'
    >
      <CenteredColumn className = 'mdc-list-item__start-detail'>
        <MDCCheckbox
          checked = { checked }
          attrs = {
            {
              'data-index': index,
              'data-query': query,
            }
          }
        />
      </CenteredColumn>

      <Block
        width = { 16 }
        marginRight = { 8 }
        textAlign = 'right'
        fontSize = '.8em'
        opacity = { .8 }
      >
        {
          index !== undefined
            ? index
            : ''
        }
      </Block>

      <Block
        cursor = 'pointer'
      >
        { label }
      </Block>
    </InflexibleRow>
  );

  if (component !== 'li') {
    vtree = (
      <li>
        { vtree }
      </li>
    );
  }

  return vtree;
}

function MDCCheckbox({ checked, ...props }) {
  return (
    <div
      { ...props }
      className = { 'mdc-checkbox ' + (props.className || '') }
    >
      <input
        type = 'checkbox'
        className = 'mdc-checkbox__native-control'
        checked = { checked }
      />

      <div className = 'mdc-checkbox__background'>
        {
          // snabbdom-jsx won't let us set the class on an SVG element, so we
          // must fall back to hyperscript.
          //
          // https://github.com/yelouafi/snabbdom-jsx/issues/20
          svg(
            {
              attrs:{
                class: 'mdc-checkbox__checkmark',
                'xmlns': 'http://www.w3.org/2000/svg',
                'xml:space': 'preserve',
                'version': '1.1',
                'viewBox': '0 0 24 24',
              }
            },
            [
              svg.path(
                {
                  attrs:{
                    class: 'mdc-checkbox__checkmark__path',
                    fill: 'none',
                    stroke: 'white',
                    d: 'M1.73,12.91 8.1,19.28 22.79,4.59',
                  }
                }
              )
            ]
          )
        }
        <div className = 'mdc-checkbox__mixedmark'></div>
      </div>
    </div>
  );
}
