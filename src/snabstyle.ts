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
  VNode,
  html,
} from 'snabbdom-jsx';

export interface Dict {
  [key: string]: any,
}

export interface Style extends Dict {
  display?: string,
};

export interface Props extends Dict {
  component?: string,
  style?: Dict,
};

export function Block(props: Props, children:Array<VNode>) {
  const component = props.component || 'div';
  const style: Style = props.style || {};
  const propsPassthrough: Dict = {};

  // Snabbdom has special handling for a bunch of prefixes, like data, on, and
  // attr.
  //
  // TODO: make sure keys that start with those values go into propsPassthrough
  Object.entries(props).forEach(
    ([key, value]: [string, any]) => {
      if (['key', 'children', 'id', 'className', 'attrs', 'dataset'].includes(key)) {
        propsPassthrough[key] = value;
      } else if (key !== 'component') {
        style[key] = value;
      }
    }
  );

  if (!style.display) {
    style.display = 'block';
  }

  sizeStyleKeys.forEach(
    key => {
      if (style[key] && typeof style[key] === 'number') {
        style[key] += 'px';
      }
    }
  );

  return html(
    component,
    {
      ...propsPassthrough,
      style,
    },
    children
  );
}

export function Flex(props: Props, children: Array<VNode>) {
  return Block(
    {
      display: 'flex',
      ...props,
    },
    children
  );
}

export function Row(props: Props, children: Array<VNode>) {
  return Flex(
    {
      flexDirection: 'row',
      ...props,
    },
    children
  );
}

export function Column(props: Props, children: Array<VNode>) {
  return Flex(
    {
      flexDirection: 'column',
      ...props,
    },
    children
  );
}

export function InflexibleRow(props: Props, children: Array<VNode>) {
  return Row(
    {
      flex: 'none',
      ...props,
    },
    children
  );
}

export function InflexibleColumn(props: Props, children: Array<VNode>) {
  return Column(
    {
      flex: 'none',
      ...props,
    },
    children
  );
}

export function FlexibleRow(props: Props, children: Array<VNode>) {
  return Row(
    {
      flex: 1,
      ...props,
    },
    children
  );
}

export function FlexibleColumn(props: Props, children: Array<VNode>) {
  return Column(
    {
      flex: 1,
      ...props,
    },
    children
  );
}

export function CenteredRow(props: Props, children: Array<VNode>) {
  return Row(
    {
      justifyContent: 'center',
      alignItems: 'center',
      ...props,
    },
    children
  );
}

export function CenteredColumn(props: Props, children: Array<VNode>) {
  return Column(
    {
      justifyContent: 'center',
      alignItems: 'center',
      ...props,
    },
    children
  );
}

export function MaterialIcon(props: Props, children: Array<VNode>) {
  return Block(
    {
      className: 'material-icons',
      ...props,
    },
    children
  );
}

const sizeStyleKeys = [
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'borderRadius',
  'margin',
  'padding',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'top',
  'bottom',
  'left',
  'right',
  'fontSize',
  'lineHeight',
];
