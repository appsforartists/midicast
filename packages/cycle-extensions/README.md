# `cycle-extensions` #

Cycle.js drivers to use in Chrome extensions and WebExtensions.

## Drivers ##

- [`hostPageDriver`](#hostpagedriver)
- [`messagesDriver`](#messagesdriver)

### `hostPageDriver` ###

`hostPageDriver` accepts a stream of JavaScript snippets to execute in the active tab, and returns a stream of the results of those snippets.

For example, here's a popup that displays a list of all the links in the active tab:

```javascript
import {
  hostPageDriver,
} from 'cycle-extensions';

run(
  Popup,
  {
    DOM: makeDOMDriver('#root'),
    hostPage: hostPageDriver,
  }
);

function Popup({ hostPage: links$ }) {
  return {
    hostPage: Observable.of(
      `
        Array.from(document.getElementsByTagName('a')).map(
          link => (
            {
              url: link.getAttribute('href'),
              label: link.innerText,
            }
          )
        )
      `
    ),
    DOM: links$.map(
      links => (
        <ul>
          {
            links.map(
              link => (
                <li>
                  <a href = { link.url }>
                    { link.label }
                  </a>
                </li>
              )
            )
          }
        </ul>
      )
    )
  }
}
```


### `messagesDriver` ###

In the Web Extension architecture, logic and state both live in a long-running background page.  The user interface lives in a separate page called a popup.  The two pages communicate by passing messages between each other.  The background page awaits connections; the popup initiates them.

`messagesDriver` accepts a stream of messages to send to the other page and returns a stream of messages received from the other page.

`makeMessagesDriver` takes a single named argument, `shouldInitiate`.  Set it to `false` in the background page and `true` in any other pages.

Here's an example of a simple counter.  Notice that when the popup opens, it sends a request for the current state to the background page.  The response it receives creates the first frame of DOM.

```javascript
// In your background script

import {
  makeMessagesDriver,
} from 'cycle-extensions';

run(
  Background,
  {
    messages: makeMessagesDriver({ shouldInitiate: false }),
  }
);

function Background({ messages: messages$ }) {
  const initialState = {
    count: 0,
  };

  const state$ = messages$.scan(
    (state, message) => {
      if (message.type === 'increment') {
        return {
          ...state,
          count: state.count + 1
        }
      } else if (message.type === 'decrement') {
        return {
          ...state,
          count: state.count - 1
        }
      } else {
        return state;
      }
    },
    initialState
  ).startWith(initialState);

  return {
    messages: state$.map(
      state => (
        {
          type: 'state_changed',
          payload: state,
        }
      )
    ).merge(
      messages$.filter(
        message => message.type === 'current_state_requested'
      ).withLatestFrom(state$).map(
        ([, state]) => (
          {
            type: 'state_changed',
            payload: state,
          }
        )
      )
    ),
  }
}

// and in your popup script
import {
  makeMessagesDriver,
} from 'cycle-extensions';

run(
  Popup,
  {
    DOM: makeDOMDriver('#root'),
    messages: makeMessagesDriver({ shouldInitiate: true }),
  }
);

function Popup({ DOM, messages: messages$ }) {
  const count$ = messages$.filter(
    message => message.type === 'state_changed'
  ).pluck('payload').pluck('count');

  return {
    messages: DOM.select('.increment').events('click').mapTo({
      type: 'increment',
    }).merge(
      DOM.select('.decrement').events('click').mapTo({
        type: 'decrement',
      })
    ).startWith({
      type: 'current_state_requested',
    }),

    DOM: count$.map(
      count => (
        <div>
          The count is now { count }.

          <div>
            <button className = 'decrement'>
              -1
            </button>

            <button className = 'increment'>
              +1
            </button>
          </div>
        </div>
      )
    ),
  }
}
```

To see an real extension written with these drivers, check out the [midicast source code](https://github.com/appsforartists/midicast/tree/develop/packages/main/).

## Installation ##

```
yarn add cycle-extensions
```

## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)
