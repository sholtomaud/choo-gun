const mutate = require('xtend/mutable')
const cherrypick = require('cherrypick')
const Gun = require('gun')
require('gun/lib/unset')
const gun = Gun()

module.exports = persist

function persist (opts) {
  opts = opts || {}

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
      var savedState = filter ? filter(state) : state
      var cherryState = cherrypick(savedState, true, '_ events href params query route _handler');
      try {
        ( cherryState.constructor === Array ) ?
          cherryState.forEach(function(item){
            gun.get(name).get('state').set(item)
          })
        : gun.get(name).get('state').put(cherryState)
      } catch (e) {
        bus.removeListener('*', listener)
        bus.emit('log:warn', 'Could not set item to localStorage ' + name)
      }
    }
  }
}
