const http = require('http');

// Change this to a valid Product ID from your newly custom-seeded database!
const TARGET_PRODUCT_ID = '6a23c73c46993394ab022581'; 
const URL = `http://localhost:5000/api/products/${TARGET_PRODUCT_ID}`;
const TOTAL_REQUESTS = 50;

const makeRequest = () => {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    http.get(URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = performance.now() - start;
        resolve({
          statusCode: res.statusCode,
          duration: parseFloat(duration.toFixed(2)),
          source: data.includes('Redis Cache') ? 'Redis Cache (Hit)' : 'MongoDB Atlas (Miss)'
        });
      });
    }).on('error', (err) => reject(err));
  });
};

const runBenchmark = async () => {
  console.log(`Initializing Polyglot Data Layer Performance Benchmark Suite...`);
  console.log(`Target Endpoint: ${URL}\n`);

  const results = [];
  
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    try {
      const metric = await makeRequest();
      results.push(metric);
      
      // Print out the first few requests to show the transition from Miss to Hit
      if (i < 5 || i === TOTAL_REQUESTS - 1) {
        console.log(` Request #${i + 1}: ${metric.source} | Latency: ${metric.duration} ms`);
      }
      if (i === 4) console.log(' ... [Processing remaining structural iterations] ...');
    } catch (err) {
      console.error(`Request Failed: ${err.message}`);
    }
  }

  // Calculate Metrics
  const mongoRequests = results.filter(r => r.source.includes('MongoDB'));
  const redisRequests = results.filter(r => r.source.includes('Redis'));

  const mongoAvg = mongoRequests.reduce((sum, r) => sum + r.duration, 0) / (mongoRequests.length || 1);
  const redisAvg = redisRequests.reduce((sum, r) => sum + r.duration, 0) / (redisRequests.length || 1);

  console.log('\n==================================================');
  console.log('FINAL ARCHITECTURAL BENCHMARK REPORT');
  console.log('==================================================');
  console.log(`MongoDB Atlas Average Latency (Cache Miss): ${mongoAvg.toFixed(2)} ms`);
  console.log(`Redis In-Memory Average Latency (Cache Hit) : ${redisAvg.toFixed(2)} ms`);
  
  const speedup = mongoAvg / redisAvg;
  console.log(`Performance Multiplier: Redis is ${speedup.toFixed(1)}x FASTER than cloud persistence.`);
  console.log('==================================================\n');
};

// Simple delay helper to let things stabilize if needed
setTimeout(runBenchmark, 1000);