  
module.exports = function (api) {

    // Cache the returned value forever and don't call this function again.
    api.cache(true);

    return {
        presets: [
            ['@babel/preset-env', {
                modules: false
            }]
        ],
        plugins: [
            '@babel/plugin-syntax-dynamic-import'
        ]
    };
}
