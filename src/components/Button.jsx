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

export default function Button({
  children,
  onClick ,
  backgroundColor = '#4285F4',
  color = '#FFFFFF',
  elevation = 1,
  ...otherStyles,
}) {
  return (
    <button
      onClick = { onClick }
      className = { `mdc-button mdc-elevation--z${ elevation }` }
      style = {
        {
          ...otherStyles,
          backgroundColor,
          color,
        }
      }
    >
      { children }
    </button>
  );
}
export Button;
