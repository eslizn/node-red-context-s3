const S3 = require("@aws-sdk/client-s3").S3;

function Context(settings) {
    this.settings = Object.assign({
        bucket: '',
        prefix: '',
        flushInterval: 5,
    }, settings);
    
    if (!this.settings.bucket) {
        throw new Error('S3 bucket name is required');
    }
    
    this.client = new S3(this.settings);
    this.data = {};
    this.cache = new Map(); // Use Map for better performance with string keys
}

Context.prototype.open = async function () {
    // Implementation can be added later if needed
}

Context.prototype.close = async function () {
    // Implementation can be added later if needed
}

Context.prototype.get = async function (scope, keys, callback) {
    if (typeof callback !== 'function') {
        callback = () => {};
    }
    
    try {
        if (!this.cache.has(scope)) {
            try {
                const object = await this.client.getObject({
                    Bucket: this.settings.bucket,
                    Key: `${this.settings.prefix}/context/${scope}.json`,
                });
                this.data[scope] = JSON.parse(await object.Body.transformToString()) || {};
                this.cache.set(scope, true);
            } catch (error) {
                if (error.name && error.name.indexOf('NoSuch') === 0) {
                    console.warn(`Scope ${scope} not found in S3:`, error.message);
                    this.data[scope] = {};
                    this.cache.set(scope, true);
                } else {
                    throw error;
                }
            }
        }
        
        const keysArray = Array.isArray(keys) ? keys : [keys];
        const values = keysArray.map(key => this.data[scope][key]);
        
        callback(null, ...values);
    } catch (error) {
        callback(error);
    }
}

Context.prototype.set = async function (scope, keys, values, callback) {
    if (typeof callback !== 'function') {
        callback = () => {};
    }
    
    try {
        if (!this.data[scope] || typeof this.data[scope] !== 'object') {
            this.data[scope] = {};
        }
        
        const keysArray = Array.isArray(keys) ? keys : [keys];
        const valuesArray = Array.isArray(values) ? values : [values];
        
        if (keysArray.length !== valuesArray.length) {
            throw new Error('Keys and values arrays must have the same length');
        }
        
        for (let i = 0; i < keysArray.length; i++) {
            this.data[scope][keysArray[i]] = valuesArray[i];
        }
        
        await this.client.putObject({
            Bucket: this.settings.bucket,
            Key: `${this.settings.prefix}/context/${scope}.json`,
            Body: JSON.stringify(this.data[scope]),
            ContentType: 'application/json',
        });
        
        // Invalidate cache after successful write
        this.cache.delete(scope);
        
        callback(null);
    } catch (error) {
        callback(error);
    }
}

Context.prototype.keys = async function (scope, callback) {
    if (typeof callback !== 'function') {
        callback = () => {};
    }
    
    try {
        if (!this.cache.has(scope)) {
            await this.get(scope, []);
        }
        
        const keys = Object.keys(this.data[scope] || {});
        callback(null, keys);
    } catch (error) {
        callback(error);
    }
}

Context.prototype.delete = async function (scope) {
    try {
        await this.client.deleteObject({
            Bucket: this.settings.bucket,
            Key: `${this.settings.prefix}/context/${scope}.json`,
        });
        
        // Clean up local cache
        delete this.data[scope];
        this.cache.delete(scope);
    } catch (error) {
        if (error.name && error.name.indexOf('NoSuch') === 0) {
            console.warn(`Scope ${scope} not found during deletion:`, error.message);
        } else {
            throw error;
        }
    }
}

Context.prototype.clean = async function (scopes) {
    if (!Array.isArray(scopes)) {
        scopes = [scopes];
    }
    
    for (const scope of scopes) {
        await this.delete(scope);
    }
}

// Add a method to clear all cached data
Context.prototype.clearCache = function () {
    this.data = {};
    this.cache.clear();
};

module.exports = function (settings) {
    return new Context(settings);
};
