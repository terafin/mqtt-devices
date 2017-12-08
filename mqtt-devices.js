// Requirements
const Redis = require('redis')
const logging = require('homeautomation-js-lib/logging.js')
const config = require('homeautomation-js-lib/config_loading.js')
const _ = require('lodash')

require('homeautomation-js-lib/devices.js')
require('homeautomation-js-lib/redis_helpers.js')

// Config
const configPath = process.env.CONFIG_PATH

if (_.isNil(configPath)) {
    logging.warn('CONFIG_PATH not set, not starting')
    process.abort()
}

const redis = Redis.setupClient(function() {
    config.load_path(configPath)

    config.on('config-loaded', () => {
        logging.info('config-loaded')
        redis.flushdb()

        config.deviceIterator(function(device_id, device) {
            redis.set(device.topic, device.name)
        })
    })
})