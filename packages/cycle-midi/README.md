# `cycle-midi` #

Cycle.js drivers to send and receive notes using Web MIDI.

## Drivers ##

- [`connectionDriver`](#connectiondriver)
- [`instrumentDriver`](#instrumentdriver)

### `connectionDriver` ###

`connectionDriver` accepts a stream.  Whenever that stream dispatches, it tries to connect to the instrument over Web MIDI.  It returns a stream that dispatches `true` when the connection attempt succeeds and `false` when it fails.


### `instrumentDriver` ###

`instrumentDriver` accepts a stream of notes to send to the instrument.  It may eventually return a stream of notes played on the instrument, but it doesn't do that yet.

## Example ##

```javascript
function Background({ messages: message$, instrumentConnection: instrumentAvailability$ }) {
  const connectionRequest$ = message$.filter(
    message => message.type === 'connect_to_instrument'
  );

  const playRandomNote$ = message$.filter(
    message => message.type === 'play_random_note'
  );

  return {
    instrumentConnection: connectionRequest$,
    instrument: playRandomNote$.map(
      () => (
        {
          // the MIDI ID of the note, from 21 for A0 to 108 for C8
          note,

          // number of milliseconds to play a note for
          duration: 150,

          // 1 is very soft; 128 is very hard
          velocity: Math.random() * 128,

          // number of milliseconds since the instrument connection to wait
          // before playing this note
          time: 0,
        }
      )
    ),
    messages: instrumentAvailability$.map(
      isAvailable => (
        {
          type: 'instrument_availability_changed',
          payload: true,
        }
      )
    ),
  }
}
```

To see an real extension written with these drivers, check out the [midicast source code](https://github.com/appsforartists/midicast/tree/develop/packages/main/).

## Installation ##

```
yarn add cycle-midi
```

## Usage ##

Because the two drivers share a single connection to the instrument, you must instantiate them together with `makeInstrumentAndConnectionDriver()`:

```javascript
import {
  makeInstrumentAndConnectionDriver,
} from 'cycle-midi';

const {
  instrumentDriver,
  connectionDriver,
} = makeInstrumentAndConnectionDriver();

run(
  Background,
  {
    instrument: instrumentDriver,
    instrumentConnection: connectionDriver,
  }
);
```

## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)
