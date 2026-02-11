# Node-RED S3 Context Storage

A Node-RED context storage implementation that uses AWS S3 as the backend storage for persistent context data.

## Overview

This module provides a context storage implementation for Node-RED that stores context data in AWS S3 buckets. It implements the Node-RED context API and allows you to persist context data across Node-RED restarts using Amazon S3 as the storage backend.

## Features

- **Persistent Storage**: Context data is stored in AWS S3, ensuring data persistence
- **Scope Support**: Supports different context scopes (global, flow, node)
- **JSON Storage**: Data is stored as JSON objects in S3
- **AWS SDK Integration**: Uses the official AWS SDK for JavaScript v3
- **Error Handling**: Proper error handling for S3 operations

## Installation

```bash
npm install node-red-context-s3
```

## Configuration

To use this context storage in your Node-RED application, add the following to your `settings.js` file:

```javascript
module.exports = {
    // ... other settings ...
    
    contextStorage: {
        s3: {
            module: "node-red-context-s3",
            config: {
                bucket: "your-s3-bucket-name",
                prefix: "node-red", // optional prefix for S3 keys
                flushInterval: 5,    // optional flush interval in seconds
                // AWS credentials configuration
                region: "us-east-1",
                credentials: {
                    accessKeyId: "your-access-key",
                    secretAccessKey: "your-secret-key"
                }
            }
        }
    },
    
    // Set S3 as the default context storage
    defaultContextStorage: "s3"
};
```

### AWS Credentials

The module uses the AWS SDK for JavaScript v3. You can provide credentials in several ways:

1. **Direct configuration** (as shown above)
2. **Environment variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
3. **AWS credentials file**: `~/.aws/credentials`
4. **IAM roles** (when running on EC2 or ECS)

## API Methods

This module implements the standard Node-RED context API:

### `get(scope, keys, callback)`
Retrieves context values for the specified scope and keys.

### `set(scope, keys, values, callback)`
Sets context values for the specified scope and keys.

### `keys(scope, callback)`
Returns all keys available in the specified scope.

### `delete(scope)`
Deletes all context data for the specified scope.

### `clean(scopes)`
Cleans context data for multiple scopes.

## S3 Storage Structure

Context data is stored in S3 with the following key structure:

```
{prefix}/context/{scope}.json
```

Example:
- `node-red/context/global.json`
- `node-red/context/flow:abc123.json`
- `node-red/context/node:xyz789.json`

Each scope is stored as a separate JSON object in the S3 bucket.

## Testing

To run the tests:

```bash
npm test
```

Make sure to set up your AWS credentials and configure a test S3 bucket before running tests.

## Dependencies

- `@aws-sdk/client-s3`: AWS SDK for S3 operations
- `jest`: Testing framework
- `dotenv`: Environment variable management for tests

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
