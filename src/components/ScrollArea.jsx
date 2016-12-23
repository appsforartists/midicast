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

export default class ScrollArea extends React.Component {
  onScroll = (event) => {
    if (this.props.onScroll) {
      this.props.onScroll(event);
    }
  }

  attachScrollListener = (element) => {
    if (element) {
      element.addEventListener('scroll', this.onScroll);
      this.ref = element;

    } else {
      this.ref.removeEventListener('scroll', this.onScroll);
    }
  }

  render() {
    const {
      children,
      className,
      ...style,
    } = this.props;

    return (
      <div
        ref = { this.attachScrollListener }
        className = { className }
        style = {
          {
            overflow: 'auto',
            ...style
          }
        }
      >
        { children }
      </div>
    );
  }
}
