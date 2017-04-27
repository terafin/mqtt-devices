// Requirements
const Redis = require('redis')
const logging = require('./homeautomation-js-lib/logging.js')
const config = require('./homeautomation-js-lib/config_loading.js')
require('./homeautomation-js-lib/devices.js')


// Config
const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT
const redisDB = process.env.REDIS_DATABASE
const config_path = process.env.TRANSFORM_CONFIG_PATH

const syslogHost = process.env.SYSLOG_HOST
const syslogPort = process.env.SYSLOG_PORT

// Set up Logging
logging.set_enabled(true)
logging.setRemoteHost(syslogHost, syslogPort)

const redis = Redis.createClient({
    host: redisHost,
    port: redisPort,
    db: redisDB,
    retry_strategy: function(options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted')
        }
        if (options.times_connected > 10) {
            // End reconnecting with built in error
            return undefined
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000)
    }
})

// redis callbacks

redis.on('error', function(err) {
    logging.log('redis error ' + err)
})

redis.on('connect', function() {
    logging.log('redis connected')
    config.load_path(config_path)
})

config.on('config-loaded', () => {
    logging.log('config-loaded!')
    redis.flushdb()

    config.deviceIterator(function(device_id, device) {
        redis.set(device.topic, device.name)
    })
})