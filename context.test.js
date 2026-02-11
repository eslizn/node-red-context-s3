require('dotenv').config();
const context = require('./context');

// Mock AWS S3 client
jest.mock('@aws-sdk/client-s3', () => {
    return {
        S3: jest.fn().mockImplementation(() => ({
            getObject: jest.fn(),
            putObject: jest.fn(),
            deleteObject: jest.fn(),
        })),
    };
});

const { S3 } = require('@aws-sdk/client-s3');

describe('S3 Context Storage', () => {
    let s3Context;
    let mockS3Client;
    
    beforeEach(() => {
        mockS3Client = {
            getObject: jest.fn(),
            putObject: jest.fn(),
            deleteObject: jest.fn(),
        };
        S3.mockImplementation(() => mockS3Client);
        
        s3Context = context({
            bucket: 'test-bucket',
            prefix: 'test-prefix',
            flushInterval: 5,
        });
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    test('should throw error when bucket name is not provided', () => {
        expect(() => context({})).toThrow('S3 bucket name is required');
    });
    
    test('should initialize with default settings', () => {
        const ctx = context({ bucket: 'test-bucket' });
        expect(ctx.settings.bucket).toBe('test-bucket');
        expect(ctx.settings.prefix).toBe('');
        expect(ctx.settings.flushInterval).toBe(5);
    });
    
    test('should get values from scope', async () => {
        const mockData = { key1: 'value1', key2: 'value2' };
        mockS3Client.getObject.mockResolvedValue({
            Body: {
                transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
            },
        });
        
        const callback = jest.fn();
        await s3Context.get('test-scope', ['key1', 'key2'], callback);
        
        expect(callback).toHaveBeenCalledWith(null, 'value1', 'value2');
        expect(mockS3Client.getObject).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'test-prefix/context/test-scope.json',
        });
    });
    
    test('should handle missing scope gracefully', async () => {
        const error = new Error('NoSuchKey');
        error.name = 'NoSuchKey';
        mockS3Client.getObject.mockRejectedValue(error);
        
        const callback = jest.fn();
        await s3Context.get('non-existent-scope', ['key1'], callback);
        
        expect(callback).toHaveBeenCalledWith(null, undefined);
    });
    
    test('should set values to scope', async () => {
        const callback = jest.fn();
        await s3Context.set('test-scope', 'key1', 'value1', callback);
        
        expect(callback).toHaveBeenCalledWith(null);
        expect(mockS3Client.putObject).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'test-prefix/context/test-scope.json',
            Body: JSON.stringify({ key1: 'value1' }),
            ContentType: 'application/json',
        });
    });
    
    test('should handle array keys and values', async () => {
        const callback = jest.fn();
        await s3Context.set('test-scope', ['key1', 'key2'], ['value1', 'value2'], callback);
        
        expect(callback).toHaveBeenCalledWith(null);
        expect(mockS3Client.putObject).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'test-prefix/context/test-scope.json',
            Body: JSON.stringify({ key1: 'value1', key2: 'value2' }),
            ContentType: 'application/json',
        });
    });
    
    test('should validate keys and values array length', async () => {
        const callback = jest.fn();
        await expect(
            s3Context.set('test-scope', ['key1', 'key2'], ['value1'], callback)
        ).rejects.toThrow('Keys and values arrays must have the same length');
    });
    
    test('should list keys from scope', async () => {
        const mockData = { key1: 'value1', key2: 'value2' };
        mockS3Client.getObject.mockResolvedValue({
            Body: {
                transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
            },
        });
        
        const callback = jest.fn();
        await s3Context.keys('test-scope', callback);
        
        expect(callback).toHaveBeenCalledWith(null, ['key1', 'key2']);
    });
    
    test('should delete scope', async () => {
        await s3Context.delete('test-scope');
        
        expect(mockS3Client.deleteObject).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'test-prefix/context/test-scope.json',
        });
    });
    
    test('should handle deletion of non-existent scope', async () => {
        const error = new Error('NoSuchKey');
        error.name = 'NoSuchKey';
        mockS3Client.deleteObject.mockRejectedValue(error);
        
        await expect(s3Context.delete('non-existent-scope')).resolves.not.toThrow();
    });
    
    test('should clean multiple scopes', async () => {
        await s3Context.clean(['scope1', 'scope2']);
        
        expect(mockS3Client.deleteObject).toHaveBeenCalledTimes(2);
    });
    
    test('should clear cache', () => {
        s3Context.data = { scope1: { key: 'value' } };
        s3Context.cache.set('scope1', true);
        
        s3Context.clearCache();
        
        expect(s3Context.data).toEqual({});
        expect(s3Context.cache.size).toBe(0);
    });
});
