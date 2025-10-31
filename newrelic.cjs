'use strict';

/** @type {import('newrelic').AgentConfig} */
module.exports = {

    license_key: process.env.NEW_RELIC_LICENSE_KEY,
    app_name: process.env.NEW_RELIC_APP_NAME,
    /**
     * Enable distributed tracing (for microservices).
     */
    distributed_tracing: {
        enabled: true
    },
    logging: {
        level: 'info',
    },

    /**
     * Controls whether the agent uses the async_hooks API.
     * Enable for better performance in async-heavy apps.
     */
    use_async_hooks: true,
    error_collector: {
        enabled: true,
        /**
         * Ignores specific error classes (e.g., validation errors).
         */
        ignore_status_codes: [404, 400] // Ignore 404s
    },

    /**
     * Transaction tracer settings.
     */
    transaction_tracer: {
        enabled: true,
        transaction_threshold: process.env.NODE_ENV === 'production' ? 500 : 0,
        record_sql: 'obfuscated',
        explain_threshold: 500
    },

    /**
     * Slow SQL queries threshold (in ms).
     */
    slow_sql: {
        enabled: true,
        max_samples_per_minute: 1000
    },
    application_logging: {
        enabled: true, // Capture console logs (e.g., errors from Express)
        forwarding: {
            enabled: true, // Send logs to New Relic for correlation
        },
    },
};