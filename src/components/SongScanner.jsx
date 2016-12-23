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

import * as React from 'react';

import {
  Col,
  Row,
} from 'jsxstyle';

import Button from './Button';
import ScrollArea from './ScrollArea';

import {
  PlayButton,
  PauseButton,
} from './mediaButtons';

export default class Main extends React.Component {
  state = {
    songs: [],
    scrolling: false,
    songsMissing: false,
  };

  scan = () => {
    chrome.tabs.executeScript(
      {
        code: `
          Array.from(document.getElementsByTagName('a')).filter(
            a => (a.getAttribute('href') || '').includes('.mid')
          ).map(
            a => {
              link = a.getAttribute('href');

              return {
                link,
                // If the link doesn't contain text, use the filename as the
                // label
                label: a.innerText || link.substr(link.lastIndexOf('/') + 1)
              };
            }
          )
        `,
        allFrames: true,
      },
      ([ songs ]) => {
        if (songs.length) {
          this.setState({
            songs: [
              ...songs,
              ...this.state.songs,
            ],
          });
        } else {
          this.setState({
            songsMissing: true,
          });
        }
      }
    );
  }

  onScroll = (event) => {
    const {
      scrolling: wasScrolling,
    } = this.state;

    const scrolling = event.target.scrollTop !== 0;

    if (scrolling !== wasScrolling) {
      this.setState({
        scrolling,
      });
    }
  }

  render() {
    const {
      songs,
      scrolling,
      songsMissing,
    } = this.state;

    return (
      <Col
        width = { 600 }
        height = { 600 }
        alignItems = 'center'
        position = 'relative'
      >
        <Row
          alignItems = 'center'
          justifyContent = 'center'
          flex = 'none'
          paddingTop = { 8 }
          paddingBottom = { 8 }
          width = '100%'
          className = { `mdc-elevation--z${ Number(scrolling) }` }
        >
          <Button
            onClick = { this.scan }
            width = { 250 }
          >
            Scan this page for songs
          </Button>
        </Row>

        <ScrollArea
          onScroll = { this.onScroll }
          width = '100%'
        >
          <Col
            ref = { this.attachScrollListener }
            component = 'ul'
            className = 'mdc-list'
            overflow = 'scroll'

            width = '100%'
          >
            {
              songsMissing
                ? "No songs found."
                : songs.map(
                    ({ label }) => (
                      <Row
                        component = 'li'
                        className = 'mdc-list-item'
                        flex = 'none'
                      >
                        <span className = "mdc-list-item__start-detail">
                          <PlayButton />
                        </span>

                        { label }
                      </Row>
                    )
                  )
            }
          </Col>
        </ScrollArea>
      </Col>
    );
  }
}
