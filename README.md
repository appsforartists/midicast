# Midicast #

a web extension that streams songs from a web page to a MIDI instrument

<img
  src = './screenshots/song-scanner.png?raw=true'
  width = '540'
  height = '612'
/>

## How does it work? ##

Midicast scans the page you're on for MIDI links.  Whatever it finds will show up in a list in the extension.  Click one of the songs in the extension to start playing it.  Midicast should work with any instrument that accepts MIDI input, such as a Yamaha Disklavier® player piano.

## Installation ##

[Midicast is available on the Chrome Web Store.](https://chrome.google.com/webstore/detail/fjnaegdodddmdifncleeakgdblhdoapg/)

## Troubleshooting ##

Your MIDI instrument must be connected to your computer.  If you are using a Mac and your instrument supports Bluetooth®, open the Audio MIDI Setup app and click Bluetooth:

<img
  src = './screenshots/audio-midi-home.png?raw=true'
  width = '805'
  height = '565'
/>

In the dialog that opens, click Connect next to your instrument:

<img
  src = './screenshots/audio-midi-bt-config.png?raw=true'
  width = '503'
  height = '402'
/>

## Architecture ##

Midicast uses [Cycle.js](https://cycle.js.org/) to model dataflow.  Each _"cycle"_ receives a collection of input streams and transforms them into output streams, which are captured by _"drivers"_ to draw UI or play notes.

Most of the logic lives in [`Background.ts`](./packages/main/src/cycles/Background.ts).  That cycle receives a stream of messages from the UI and outputs a stream of notes to send to the instrument.

[`Popup.tsx`](./packages/main/src/cycles/Popup.tsx) draws the UI when the user [clicks the toolbar icon](https://developer.chrome.com/extensions/pageAction).  It displays playback controls, along with a [tabbed pane](./packages/main/src/cycles/TabbedPane.tsx) where the user may select a song, or change [which instruments are being played](./packages/main/src/cycles/TrackSelector.tsx).  Every time the popup opens, it requests the current state (such as which song is currently playing) from the background page.

[`SongScanner.tsx`](./packages/main/src/cycles/SongScanner.tsx) is a tab in the popup.  It uses the [`hostPageDriver`](./packages/cycle-extensions/src/index.ts) to search the currently-active tab for links that end in `.mid`, displaying them in a list.  When the user clicks one of the list items, it sends this message to the background page:

```javascript
{
  type: MessageType.PLAY_SONG,
  payload: {
    label: 'A Song Title',
    url: 'https://example.com/song.mid',
  },
}
```

The background page fetches the requested MIDI file.  MIDI files contain _"tracks,"_ each representing the notes for a single instrument.  Every 100ms, the background page dispatches the next pulse of notes.  If the user has used the [Instruments tab](./packages/main/src/cycles/TrackSelector.tsx) to filter tracks, only notes from those tracks will be included.  Sending the notes one-pulse-at-a-time allows the user to filter tracks while the song is playing.

[`cycle-midi`](./packages/cycle-midi/src/index.ts) listens for notes and forwards them to the instrument with [Web MIDI](https://www.w3.org/TR/webmidi/).

[`cycle-extensions`](./packages/cycle-extensions/src/index.ts) connects the [cycles](./packages/main/src/cycles/) to the web extensions APIs, which pass messages between the cycles, or between a cycle and the host page.

[`snab-style`](./packages/snab-style/src/index.ts) is a conceptual port of [`jsxstyle`](https://github.com/smyte/jsxstyle/).  It provides JSX elements like `<Row>`, `<Column>`, and `<MaterialIcon>` that expose their style attributes as props, making nodes easier to style.

## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)

_Note:_ This is not an official Google product.
