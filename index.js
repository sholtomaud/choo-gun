const mutate = require('xtend/mutable')
const cherrypick = require('cherrypick')
const Gun = require('gun')
require('gun/lib/unset')

const arrayToObject = (arr, keyField) =>
  Object.assign({}, ...arr.map(item => ({[item[keyField]]: item})))

module.exports = persist

function persist (opts) {
  opts = opts || {}

  let gun = Gun(opts.URL);

  var name = opts.name || 'choo-persist'
  var filter = opts.filter

  return function (state, bus) {
    gun.get(name).get('state').on(value => {
      mutate(state, value);
    })

    bus.on('*', listener)

    bus.on('clear', function () {
      bus.removeListener('*', listener)
      try {
        gun.unset(name)
      } catch (e) {
        bus.emit('log:warn', 'Could not wipe localStorage ' + name)
      }
      bus.emit('log:warn', 'Wiping localStorage ' + name)
    })

    function listener (eventName, data) {
      console.log('eventN',eventName);
      console.log('data',data);
      var savedState = filter ? filter(state) : state
      var cherryState = cherrypick(savedState, true, '_ events href params query route _handler');
      try {
        Object.entries(cherryState).forEach(([key, value]) => {
          ( cherryState[key].constructor === Array ) ?
            gun.get(name).get('state').get(key).put( arrayToObject(cherryState[key],'_id') )
          : gun.get(name).get('state').get(key).put(cherryState[key])
        })
      } catch (e) {
        bus.removeListener('*', listener)
        bus.emit('log:warn', 'Could not set item to localStorage ' + name)
      }
    }
  }
}
