const { performance } = require('perf_hooks')
const { isPromise } = require('util').types

const map = {}

const ENABLED = process.env.TWXPARSE_PERFORMANCE_ENABLED === '1' || false

const finishExecution = (name, startTime) => {
  const endTime = performance.now()
  const duration = endTime - startTime
  map[name].push({
    startTime,
    endTime,
    duration
  })
}

const Performance = {
  makeMeasurable: (method, name) => {
    if (!ENABLED) {
      return method
    } else {
      if (!(name in map)) {
        map[name] = []
      }
      return function (...args) {
        const startTime = performance.now()
        const results = method.apply(this, args)
        if (isPromise(results)) {
          return results.then(value => {
            finishExecution(name, startTime)
            return value
          })
        } else {
          finishExecution(name, startTime)
          return results
        }
      }
    }
  },

  getMeasures: name => {
    return map[name]
  },

  getAverage: name => {
    if (name in map && map[name].length > 0) {
      return map[name].reduce((sum, next) => sum + next.duration, 0) / map[name].length
    } else {
      return 0
    }
  },

  listAll: () => {
    let entries = []
    for (const name in map) {
      entries.push({
        name,
        count: map[name].length,
        average: Performance.getAverage(name)
      })
    }
    entries = entries.sort((a, b) => (a.count * a.average) < (b.count * b.average) ? 1 : -1)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      console.log(`Entry ${entry.name} had ${entry.count} calls with an average of ${entry.average}ms per call.`)
    }
  }
}

module.exports = Performance
