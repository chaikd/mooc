import { createClient, RedisClientType } from 'redis'

export class RedisRequest {
  redisClient: RedisClientType | null = null
  
  constructor() {
    this.redisClient = createClient()
    this.connect()
  }

  async connect() {
    if(this.redisClient) {
      await this.redisClient.connect()
    }
  }

  async set(type: string, data: Object) {
    if(!this.redisClient) return
    const key = `${type}`;
    const flatData = flatten(data);
    await this.redisClient.hSet(key, flatData);
  }

  async get(type: string) {
    if(!this.redisClient) return
    const key = `${type}`;
    const hash = await this.redisClient.hGetAll(key);
    if (Object.keys(hash).length === 0) return null;
    return parseHash(hash);
  }

  async del(type: string) {
    if(!this.redisClient) return
    const key = `${type}`;
    return await this.redisClient.del(key);
  }

  async setField(type: string, field: string, value: any) {
    if(!this.redisClient) return
    const key = `${type}`;
    const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await this.redisClient.hSet(key, field, strValue);
  }

  async getField(type: string, field: string) {
    if(!this.redisClient) return
    const key = `${type}`;
    const val: any = await this.redisClient.hGet(key, field);
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }

  async delField(type: string, field: string) {
    if(!this.redisClient) return
    const key = `${type}`;
    return await this.redisClient.hDel(key, field);
  }

  // 是否存在
  async exists(type: string) {
    if(!this.redisClient) return
    const key = `${type}`;
    return await this.redisClient.exists(key);
  }

  // 设置过期时间
  async expire(type: string, ttlSeconds: number) {
    if(!this.redisClient) return
    const key = `${type}`;
    return await this.redisClient.expire(key, ttlSeconds);
  }

  async getAll(type: string) {
    if(!this.redisClient) return
    const key = type
    return this.redisClient?.hGetAll(key)
  }

}

// 扁平化对象以适应 Redis Hash
function flatten(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, string> = {}
  for (const key in obj) {
    const value = obj[key];
    result[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  return result;
}

// 还原对象字段
function parseHash(hash: Record<string, string>) {
  const result: Record<string, any> = {};
  for (const key in hash) {
    try {
      result[key] = JSON.parse(hash[key]);
    } catch {
      result[key] = hash[key];
    }
  }
  return result;
}

const redisRequest: RedisRequest = new RedisRequest()
export default redisRequest