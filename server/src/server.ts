import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from 'redis';

const app = express();
const PORT = process.env.PORT || 3001;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const MAX_REQUESTS_PER_SECOND = 50;

// Redis client
const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting function using Redis
async function checkRateLimit(): Promise<boolean> {
  const now = Date.now();
  const currentSecond = Math.floor(now / 1000);
  const key = `rate_limit:${currentSecond}`;

  try {
    // Increment the counter for this second
    const count = await redisClient.incr(key);
    
    // Set expiration of 2 seconds to clean up old keys
    if (count === 1) {
      await redisClient.expire(key, 2);
    }

    return count <= MAX_REQUESTS_PER_SECOND;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow request if Redis fails
    return true;
  }
}

// Random delay helper
function randomDelay(): Promise<void> {
  const delayMs = Math.floor(Math.random() * 1000) + 1; // 1ms to 1000ms
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

// API endpoint
app.post('/api', async (req: Request, res: Response) => {
  const { index } = req.body;

  // Check rate limit
  const isAllowed = await checkRateLimit();
  
  if (!isAllowed) {
    return res.status(429).json({ 
      error: 'Too Many Requests',
      message: 'Rate limit exceeded: maximum 50 requests per second'
    });
  }

  // Apply random delay
  await randomDelay();

  // Return the index
  res.json({ index });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start server
async function startServer() {
  try {
    await redisClient.connect();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Redis connected at ${REDIS_HOST}:${REDIS_PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

