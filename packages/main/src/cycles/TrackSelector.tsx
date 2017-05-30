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

import * as _ from 'lodash';
import * as MIDIConvert from 'midiconvert';

import {
  svg,
} from '@cycle/dom';

import {
  VNode,
  html,
} from 'snabbdom-jsx';

import {
  Block,
  CenteredColumn,
  FlexibleColumn,
  FlexibleRow,
  InflexibleColumn,
  InflexibleRow,
  Row,
} from 'snab-style';

import {
  DOMSink,
  DOMSource,
  Dict,
  MessageType,
  MessagesSink,
  MessagesSource,
  Song,
} from '../types';

type Tracks = Array<MIDIConvert.Track>;

export type Sources = DOMSource & MessagesSource;
export type Sinks = DOMSink & MessagesSink;

export default function TrackSelector({ DOM, messages: message$, ...sources }: Sources): Sinks {
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

      payload.query = dataset.query;
      payload.id = parseInt(dataset.id, 10);

      if (isNaN(payload.id)) {
        payload.id = dataset.id;
      }

      return {
        type: payload.query
          ? MessageType.CHANGE_ACTIVE_TRACKS
          : MessageType.CHANGE_TRACK_ACTIVE_STATUS,
        payload
      };
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
            title = 'All instruments'
            checked = {
              currentTracks.map(track => track.id).every(
                id => activeTrackIDs.includes(id)
              )
            }
          />

          <li
            role = 'separator'
            class ='mdc-list-divider'
          />

          {
            _.chain(currentTracks).groupBy(
              track => track.instrumentFamily || 'other'
            ).toPairs().map(
              ([ family, currentTracksInFamily ]) => {
                const currentTrackIDsInFamily = currentTracksInFamily.map(
                  track => track.id
                );

                const checked = currentTrackIDsInFamily.every(
                  id => activeTrackIDs.includes(id)
                );

                const indeterminate = !checked && currentTrackIDsInFamily.some(
                  id => activeTrackIDs.includes(id)
                );

                return (
                  <Block
                    component = 'li'
                    listStyle = 'none'
                  >
                    <TrackRow
                      query = 'family'
                      id = { family }
                      title = { family }
                      checked = { checked }
                      indeterminate = { indeterminate }
                    />
                    <Block
                      component = 'ul'
                      listStyle = 'none'
                      margin = { 0 }
                      padding = { 0 }
                    >
                      {
                        currentTracksInFamily.map(
                          track => (
                            <TrackRow
                              id = { track.id }
                              indent = { true }
                              title = { track.name }
                              subtitle = { track.instrument }
                              checked = { activeTrackIDs.includes(track.id) }
                            />
                          )
                        )
                      }
                    </Block>
                  </Block>
                );
              }
            ).value()
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
  };
}

function TrackRow({ id, query, title = '', subtitle = '', indent = false, checked, indeterminate, ...props }) {
  let component = 'label';

  if (typeof id !== 'number') {
    component = 'li';
  }

  let vtree = (
    <InflexibleRow
      component = { component }
      className = 'mdc-list-item'
      marginTop = { 8 }
      marginBottom = { 8 }
    >
      <CenteredColumn
        className = 'mdc-list-item__start-detail'
        alignItems = {
          // Eventually, the checkboxes should be in one line, and a disclosure
          // triangle should serve as the visual indicator for grouping, but for
          // now, this does the job.
          indent
            ? 'center'
            : 'flex-start'
        }
        marginRight = { 0 }
        width = { 56 }
      >
        <MDCCheckbox
          checked = { checked }
          indeterminate = { indeterminate }
          attrs = {
            {
              'data-id': id,
              'data-query': query,
            }
          }
        />
      </CenteredColumn>

      <FlexibleColumn
        alignItems = 'stretch'
      >
        <Block
          cursor = 'pointer'
        >
          { initialCase(title) }
        </Block>

        <Block
          fontSize = '.8em'
          opacity = { .8 }
        >
          { initialCase(subtitle) }
        </Block>
      </FlexibleColumn>
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

function MDCCheckbox({ checked, indeterminate, ...props }) {
  return (
    <div
      { ...props }
      className = { 'mdc-checkbox ' + (props.className || '') }
    >
      <input
        type = 'checkbox'
        className = 'mdc-checkbox__native-control'
        checked = { checked }
        indeterminate = { indeterminate }
        hook = {
          {
            insert: indeterminateCheckboxHook,
            update: indeterminateCheckboxHook,
          }
        }
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

function indeterminateCheckboxHook() {
  // The current VNode is the last argument to the hook, so manually destructure
  // it
  const {
    elm,
    data,
  } = arguments[arguments.length - 1];

  elm.indeterminate = data.props.indeterminate;
}

function initialCase(label: string = '') {
  return label.substr(0, 1).toUpperCase() + label.substr(1).toLowerCase();
}
