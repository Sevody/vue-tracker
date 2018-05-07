# vue-track

> A track point directive for [vue.js](https://github.com/vuejs/vue)

## Requirements

- vue: ^2.0.0

## Install

From npm:

``` sh
$ npm install vue-track --save
```

## Usage

### `v-track`

``` js
import * as track from 'vue-track';

track.init(fetchFunction)

export default {
  template: '<button v-track="{act:'click',data:{id:100}}">Save</button>',
};
```

### `mixin`

``` js
import * as track from 'vue-track';

track.init(fetchFunction)

export default {
  mixins: [ track.mixin ],
  template: '<button @click="track(arguments,handleClick)({id:200},true)">Leave</button>/>',
};
```

## API

```ts
// 1. ready: 进入指定页面时触发
// 2. click: 点击指定元素时触发
// 3. view: 指定区域眼球曝光时触发
// 4. unload: 离开指定页面时触发

param = {
  t?: Enum {bind|update|unbind}
  act: Enum {ready|click|view|unload}
  data: {
    id: eventId,
    p?: [p1?, p2?, ...]
  }
```

## License

[MIT](https://opensource.org/licenses/MIT)
