// Requirements
const Redis = require('redis')
const logging = require('homeautomation-js-lib/logging.js')
const config = require('homeautomation-js-lib/config_loading.js')
const _ = require('lodash')

// Config
const configPath = process.env.CONFIG_PATH

if (_.isNil(configPath)) {
    logging.warn('CONFIG_PATH not set, not starting')
    process.abort()
}

const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT
const redisDB = process.env.REDIS_DATABASE

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
    logging.error('redis error ' + err)
})

redis.on('connect', function() {
    logging.info('redis connected')
    config.load_path(configPath)

    config.on('config-loaded', () => {
        logging.info('config-loaded')
        redis.flushdb()

        config.deviceIterator(function(device_id, device) {
            redis.set(device.topic, device.name)
        })
    })
})

redis.on('reconnect', function() {
    logging.info('redis disconnected')
})