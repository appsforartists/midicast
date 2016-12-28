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
  FlexibleRow,
  Row,
} from '../snabstyle';

import {
  Sources,
  Sinks,
  Tabs,
} from '../types';

// TODO: make Sources and Sinks interfaces rather than types so we can extend
// them with thinks like tabs: Observable<Tab>
export default function TabbedPane({ DOM, tabs: tabs$, ...sources }: Sources<any>): Sinks {
  const activeTabID$ = DOM.select('.tab').events('click').map(
    event => parseInt(event.target.dataset.id)
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
    event => Number(event.target.scrollTop !== 0)
  ).startWith(0);

  // Introspect sources to infer sink names, and pass the sinks through
  const sinks = {};

  Object.keys(sources).forEach(
    driverName => sinks[driverName] = activeTab$.flatMap(
      tabSink => tabSink[driverName] || Observable.empty()
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
                    alignItems = 'flex-end'
                    justifyContent = 'center'
                    textTransform = 'uppercase'
                    maxWidth = { 264 }
                    height = { 48 }
                    paddingLeft = { 12 }
                    paddingRight = { 12 }
                    paddingBottom = { 20 }
                    fontSize = { 14 }
                    color = 'var(--mdc-theme-text-primary-on-dark)'
                    opacity = {
                      i === activeTabID
                        ? 1
                        : .7
                    }
                    borderBottom = {
                      i === activeTabID
                        ? '2px solid var(--mdc-theme-accent)'
                        : ''
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
            backgroundColor = 'var(--mdc-theme-background)'
            color = 'var(--mdc-theme-text-primary-on-background)'
          >
            { activeTab }
          </FlexibleRow>
        </Column>
      )
    ),
    ...sinks,
  }
}
