# `snab-style` #

Snabbdom elements that accept styles as props

## Overview ##

`snab-style` is a conceptual port of [`jsxstyle`](https://github.com/smyte/jsxstyle/) to [Snabbdom](https://github.com/snabbdom/snabbdom/).  It exports a series of common elements like `Row` and `Column` with their styles baked-in.  Additionally, each element accepts additional styles as simple props; JSX is much easier to read when each node isn't littered with `style = {{ }}`.

Unlike `jsxstyle`, all styles are assigned inline (via `element.style`).  There's no sorcery to extract values into a stylesheet.

## Example ##

```typescript
<InflexibleRow
  backgroundColor = '#DADADA'
>
  This is some content
</InflexibleRow>
```

is equivalent to

```typescript
<div
  style = {
    {
      // Default styles for InflexibleRow
      display: 'flex',
      flexDirection: 'row',
      flex: 'none',

      // Assigned via props
      backgroundColor: '#DADADA'
    }
  }
>
  This is some content
</div>
```

## Elements ##

- `Block`
- `Flex`
- `Row`
- `Column`
- `InflexibleRow`
- `InflexibleColumn`
- `FlexibleRow`
- `FlexibleColumn`
- `CenteredRow`
- `CenteredColumn`
- `MaterialIcon`

To see an real extension written with these elements, check out the [midicast source code](https://github.com/appsforartists/midicast/tree/develop/packages/main/).

## Installation ##

```
yarn add snab-style
```

## License ##

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)
