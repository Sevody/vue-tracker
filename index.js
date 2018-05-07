import Vue from 'vue'
import _ from 'underscore'
import moment from 'moment'

export const version = '1.1.0';

const compatible = (/^2\./).test(Vue.version);
if (!compatible) {
  Vue.util.warn('Tracker ' + version + ' only supports Vue 2.x, and does not support Vue ' + Vue.version);
}

let tracker = (params) => {
  console.log('tracking data: ', params)  
}

// 注册触发埋点时要调用的方法
export const init = (fn) => {
  tracker = fn
}

/************
 * 埋点触发时机有3种:
 *
 * 1.ready: 进入指定页面时触发
 * 2.click: 点击指定元素时触发
 * 3.view: 指定区域眼球曝光时触发
 * 4.unload: 离开指定页面时触发
 *
 * 指令参数格式: @param
 * param = {
 *  t?: enum {bind|update|unbind}
 *  act: enum {ready|click|view}
 *  data: {
 *    id: eventId,
 *    p?: [p1, p2, ...]
 *  }
 *
 * }
************/

// 进入页面处理函数
const readyFun = (el, binding) => {
  const occurTime = +el.dataset.enterTime
  const params = getParams(el, binding, occurTime)
  tracker(params)
}

// 点击处理函数
const clickFun = (el, binding) => {
  const occurTime = moment().unix()
  const params = getParams(el, binding, occurTime)
  tracker(params)
  el.removeEventListener('click', FunCollection[el.dataset.clickFun])
}

// 眼球曝光处理函数
const viewFun = _.throttle((el, binding) => {
  if (isInView(el)) {
    const occurTime = moment().unix()
    const params = getParams(el, binding, occurTime)
    tracker(params)
    window.removeEventListener('scroll', FunCollection[el.dataset.viewFun])
  }
}, 100)

// 离开页面处理函数
const unloadFun = (el, binding) => {
  const occurTime = +el.dataset.enterTime
  el.dataset.leaveTime = moment().unix()
  const params = getParams(el, binding, occurTime)
  tracker(params)
  window.removeEventListener('beforeunload', FunCollection[el.dataset.unloadFun])
}

const getParams = (el, binding, occurTime) => {
  const serviceParam = {}

  // a little hard code for easy use
  if (binding.value.act === 'ready' || binding.value.act === 'unload') {
    serviceParam.p1 = el.dataset.enterTime || ""
    serviceParam.p2 = el.dataset.leaveTime || ""
  }

  let data = binding.value.data
  if (data.p) {
    for (const p of data.p) {
      let px = `p${Object.keys(serviceParam).length + 1}`
      serviceParam[px] = `${p}`
    }
  }

  const params = {
      eventId: data.id,
      occurTime,
      serviceParam,
  }
  return params
}

// 生成随机函数名
const createFunName = () => {
  return `track_f_${(Math.random() * 1000000 + '').split('.')[0]}`
}

// 判断当前元素是否在可视区域
const isInView = (el) => {
  var rect = el.getBoundingClientRect();
  var elemTop = rect.top;
  var elemBottom = rect.bottom;

  // 元素全部出现在视窗
  var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);

  // 元素部分出现在视窗
  //isVisible = elemTop < window.innerHeight && elemBottom >= 0;

  return isVisible;

}

// 已绑定的事件处理函数集合
const FunCollection = {}

// 埋点事件逻辑
const track = (el, binding, forceRun = false) => {
  const type = binding.value.act
  if (type === 'ready') {
    readyFun(el, binding)
  }
  if (type === 'click') {
    const cf = el.dataset.clickFun
    if (cf && FunCollection[cf]) {
      el.removeEventListener('click', FunCollection[cf])
      delete FunCollection[cf]
    }
    const fs = createFunName()
    FunCollection[fs] = clickFun.bind(null, el, binding)
    el.dataset.clickFun = fs
    el.addEventListener('click', FunCollection[fs])
  }
  if (type === 'view') {
    const vf = el.dataset.viewFun
    if (vf && FunCollection[vf]) {
      window.removeEventListener('scroll', FunCollection[vf])
      delete FunCollection[vf]
    }
    const fs = createFunName()
    FunCollection[fs] = viewFun.bind(null, el, binding)
    el.dataset.viewFun = fs
    window.addEventListener('scroll', FunCollection[fs])
    FunCollection[fs](el, binding)
  }
  if (type === 'unload') {
    if (forceRun) {
      return unloadFun(el, binding)
    }
    const uf = el.dataset.unloadFun
    if (uf && FunCollection[uf]) {
      window.removeEventListener('beforeunload', FunCollection[uf])
      delete FunCollection[uf]
    }
    const fs = createFunName()
    FunCollection[fs] = unloadFun.bind(null, el, binding)
    el.dataset.unloadFun = fs
    window.addEventListener('beforeunload', FunCollection[fs])
  }
}

// 注册全局指令
Vue.directive('track', {
  bind: function (el, binding) {
    el.dataset.enterTime = moment().unix()
    if((typeof binding.value.t === 'undefined') || binding.value.t === 'bind') {
      track(el, binding)
    }
  },
  update: function (el, binding) {
    if(binding.value.t === 'update' || binding.value.act === 'unload') {
      track(el, binding)
    }
  },
  unbind: function (el, binding) {
    el.dataset.leaveTime = moment().unix()
    if (binding.value.act === 'unload') {

      // 如果unbind时还没有unload则强制调用unload处理函数
      track(el, binding, true)
    } else if (binding.value.t === 'unbind') {
      track(el, binding)
    }

    // 移除未触发的事件
    const type = binding.value.act
    if (type === 'click') {
      const cf = el.dataset.clickFun
      if (cf && FunCollection[cf]) {
        el.removeEventListener('click', FunCollection[cf])
        delete FunCollection[cf]
      }
    }
    if (type === 'view') {
      const vf = el.dataset.viewFun
      if (vf && FunCollection[vf]) {
        window.removeEventListener('scroll', FunCollection[vf])
        delete FunCollection[vf]
      }
    }
  }
})

// 如果指令无法满足需求，可以考虑使用该 mixin
export const mixin = {
  methods: {
    track(args, hf) {
      let self = this
      return function(data, isDelay = false) {
        const serviceParam = {}
        if (data.p) {
          for (const p of data.p) {
            let px = `p${Object.keys(serviceParam).length + 1}`
            serviceParam[px] = `${p}`
          }
        }
        const params = {
            eventId: data.id,
            occurTime: moment().unix(),
            serviceParam,
        }
        tracker(params)
        if (isDelay) {

          // 设置延时是为了跳转到其他页面前顺利发送对应的埋点数据
          setTimeout(function() {
            hf.apply(self, args)
          }, 500)
        } else {
          hf.apply(self, args)
        }
      }
    }
  }
}
