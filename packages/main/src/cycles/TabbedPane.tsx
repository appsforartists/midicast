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

import { html } from 'snabbdom-jsx';

import {
  Column,
  FlexibleRow,
  InflexibleRow,
  Row,
} from 'snab-style';

import {
  DOMSink,
  DOMSource,
  Dict,
  Tab,
} from '../types';

export type Sources = DOMSource & {
  tabs: Observable<Array<Tab>>
};

export type Sinks = DOMSink;

export default function TabbedPane({ DOM, tabs: tabs$, ...sources }: Sources): Sinks {
  const activeTabID$ = DOM.select('.tab').events('click').map(
    event => parseInt((event.target as HTMLElement).dataset.id!, 10)
  ).startWith(0);

  const activeTab$ = activeTabID$.withLatestFrom(tabs$).map(
    ([ activeTabID, tabs ]) => tabs[activeTabID].component({ DOM, ...sources })
  );

  const tabLabels$ = tabs$.map(
    tabs => tabs.map(
      tab => tab.label
    )
  );

  const appBarElevation$ = DOM.select('#scroll-pane').events('scroll').map(
    event => Number((event.target as HTMLElement).scrollTop !== 0)
  ).startWith(0);

  // Introspect sources to infer sink names, and pass the sinks through
  const sinks: Dict<Observable<any>> = {};

  Object.keys(sources).forEach(
    driverName => sinks[driverName] = activeTab$.flatMap(
      (tabSink: Dict<Observable<any>>) => tabSink[driverName] || Observable.empty()
    )
  );

  return {
    DOM: Observable.combineLatest(
      appBarElevation$,
      tabLabels$,
      activeTab$.map(tabSink => tabSink.DOM).switch(),
      activeTabID$,
    ).map(
      ([
        appBarElevation,
        tabLabels,
        activeTab,
        activeTabID,
      ]) => (
        <Column>
          <InflexibleRow
            className = { `mdc-elevation--z${ appBarElevation }` }
            justifyContent = 'flex-start'
            alignItems = 'stretch'
            backgroundColor = 'var(--mdc-theme-primary)'
          >
            {
              tabLabels.map(
                (tabLabel, i) => (
                  <FlexibleRow
                    className = 'tab'
                    alignItems = 'center'
                    justifyContent = 'center'
                    textTransform = 'uppercase'
                    maxWidth = { 264 }
                    height = { 48 }
                    paddingLeft = { 12 }
                    paddingRight = { 12 }
                    fontSize = { 13 }
                    color = 'var(--mdc-theme-text-primary-on-dark)'
                    opacity = {
                      i === activeTabID
                        ? 1
                        : .7
                    }
                    borderBottom = {
                      i === activeTabID
                        ? '2px solid var(--mdc-theme-accent)'
                        : '2px solid var(--mdc-theme-primary)'
                    }
                    cursor = 'pointer'
                    attrs = {
                      {
                        'data-id': i,
                      }
                    }
                  >
                    { tabLabel }
                  </FlexibleRow>
                )
              )
            }
          </InflexibleRow>
          <FlexibleRow
            id = 'scroll-pane'
            overflow = 'auto'
          >
            { activeTab }
          </FlexibleRow>
        </Column>
      )
    ),
    ...sinks,
  };
}
