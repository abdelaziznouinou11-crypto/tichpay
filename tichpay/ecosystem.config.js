module.exports = {
  apps: [{
    name: 'tichpay',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Memory management
    max_memory_restart: '500M',
    
    // Watch (disabled in production)
    watch: false,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
