import { useState, useRef } from 'react';
import './App.css';

interface ResponseItem {
  index: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOTAL_REQUESTS = 1000;

function App() {
  const [concurrency, setConcurrency] = useState<number>(10);
  const [isRunning, setIsRunning] = useState(false);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: TOTAL_REQUESTS });
  const [stats, setStats] = useState({ success: 0, errors: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Rate limiter: ensures max N requests per second
  class RateLimiter {
    private queue: Array<() => void> = [];
    private lastExecution: number = 0;
    private interval: number;

    constructor(requestsPerSecond: number) {
      this.interval = 1000 / requestsPerSecond;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        const executeTask = async () => {
          const now = Date.now();
          const timeSinceLastExecution = now - this.lastExecution;

          if (timeSinceLastExecution < this.interval) {
            await new Promise(r => setTimeout(r, this.interval - timeSinceLastExecution));
          }

          this.lastExecution = Date.now();
          
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }

          // Execute next task in queue
          if (this.queue.length > 0) {
            const nextTask = this.queue.shift();
            nextTask?.();
          }
        };

        this.queue.push(executeTask);
        
        // Start execution if this is the only task
        if (this.queue.length === 1) {
          executeTask();
        }
      });
    }
  }

  // Concurrency limiter: ensures max N concurrent requests
  class ConcurrencyLimiter {
    private running: number = 0;
    private queue: Array<() => void> = [];

    constructor(private maxConcurrency: number) {}

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      while (this.running >= this.maxConcurrency) {
        await new Promise<void>(resolve => this.queue.push(resolve));
      }

      this.running++;
      
      try {
        return await fn();
      } finally {
        this.running--;
        const resolve = this.queue.shift();
        if (resolve) resolve();
      }
    }
  }

  const sendRequest = async (index: number, signal: AbortSignal): Promise<ResponseItem> => {
    try {
      const response = await fetch(`${API_URL}/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          index,
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
          timestamp: Date.now(),
        };
      }

      const data = await response.json();
      return {
        index: data.index,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      return {
        index,
        success: false,
        error: error.message || 'Network error',
        timestamp: Date.now(),
      };
    }
  };

  const handleStart = async () => {
    if (concurrency < 1 || concurrency > 100) {
      alert('Concurrency must be between 1 and 100');
      return;
    }

    setIsRunning(true);
    setResponses([]);
    setProgress({ completed: 0, total: TOTAL_REQUESTS });
    setStats({ success: 0, errors: 0 });

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const rateLimiter = new RateLimiter(concurrency);
    const concurrencyLimiter = new ConcurrencyLimiter(concurrency);

    const requests = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i + 1);
    
    try {
      await Promise.all(
        requests.map(index =>
          rateLimiter.execute(() =>
            concurrencyLimiter.execute(async () => {
              const result = await sendRequest(index, signal);
              
              setResponses(prev => [...prev, result]);
              setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
              setStats(prev => ({
                success: prev.success + (result.success ? 1 : 0),
                errors: prev.errors + (result.success ? 0 : 1),
              }));

              return result;
            })
          )
        )
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error during execution:', error);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Rate-Limited Request Client</h1>
        
        <div className="control-panel">
          <div className="input-group">
            <label htmlFor="concurrency">
              Concurrency Limit (1-100):
            </label>
            <input
              id="concurrency"
              type="number"
              min="0"
              max="100"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              disabled={isRunning}
              required
            />
            <small>Controls both max concurrent requests and requests per second</small>
          </div>

          <div className="button-group">
            <button
              onClick={handleStart}
              disabled={isRunning || concurrency < 1 || concurrency > 100}
              className="btn btn-primary"
            >
              {isRunning ? 'Running...' : 'Start'}
            </button>
            
            {isRunning && (
              <button onClick={handleStop} className="btn btn-secondary">
                Stop
              </button>
            )}
          </div>
        </div>

        {(progress.completed > 0 || isRunning) && (
          <div className="stats-panel">
            <div className="stat-card">
              <span className="stat-label">Progress</span>
              <span className="stat-value">
                {progress.completed} / {progress.total}
              </span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="stat-card success">
              <span className="stat-label">Successful</span>
              <span className="stat-value">{stats.success}</span>
            </div>

            <div className="stat-card error">
              <span className="stat-label">Errors</span>
              <span className="stat-value">{stats.errors}</span>
            </div>
          </div>
        )}

        {responses.length > 0 && (
          <div className="results-panel">
            <h2>Response Indexes (Latest First)</h2>
            <div className="results-list">
              {[...responses].reverse().map((response, idx) => (
                <div
                  key={`${response.index}-${response.timestamp}-${idx}`}
                  className={`result-item ${response.success ? 'success' : 'error'}`}
                >
                  <span className="result-index">#{response.index}</span>
                  {!response.success && (
                    <span className="result-error">{response.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

