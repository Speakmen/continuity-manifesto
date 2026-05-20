// 通用代理脚本 - 在GitHub Actions美国节点执行
// 用法: node proxy-action.js <url> [method] [headers_json] [body]

const url = process.argv[2];
const method = (process.argv[3] || 'GET').toUpperCase();
const headers = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const body = process.argv[5] || null;

async function main() {
  if (!url) {
    console.error('Usage: node proxy-action.js <url> [method] [headers_json] [body]');
    process.exit(1);
  }

  const fetchOptions = {
    method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers
    }
  };

  if (body && method !== 'GET') {
    fetchOptions.body = body;
  }

  console.log(`Fetching: ${method} ${url}`);
  
  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${contentType}`);
    
    let result;
    if (contentType.includes('json') || contentType.includes('javascript')) {
      result = await response.text();
    } else if (contentType.includes('html') || contentType.includes('text')) {
      result = await response.text();
    } else {
      result = await response.text();
    }

    // Save result
    const fs = require('fs');
    const output = {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: result.substring(0, 500000), // 500KB limit
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('proxy-result.json', JSON.stringify(output, null, 2));
    console.log('Result saved to proxy-result.json');
    
    // Also save raw body
    fs.writeFileSync('proxy-result.raw', result);
    console.log(`Raw body saved (${result.length} bytes)`);

  } catch (err) {
    console.error('Fetch failed:', err.message);
    const fs = require('fs');
    fs.writeFileSync('proxy-result.json', JSON.stringify({ error: err.message, url, method }));
    process.exit(1);
  }
}

main();
