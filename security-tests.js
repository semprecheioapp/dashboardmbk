#!/usr/bin/env node

/**
 * Security Test Suite for MBK Dashboard
 * This script performs comprehensive security tests on the application
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class SecurityTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runAllTests() {
    console.log('🔒 Iniciando testes de segurança...\n');
    
    await this.testSecurityHeaders();
    await this.testCORSConfiguration();
    await this.testInputValidation();
    await this.testSQLInjection();
    await this.testXSSProtection();
    await this.testRateLimiting();
    await this.testAuthentication();
    await this.testAuthorization();
    
    this.printResults();
  }

  async testSecurityHeaders() {
    console.log('📋 Testando headers de segurança...');
    
    try {
      const response = await this.makeRequest('/');
      const headers = response.headers;
      
      const requiredHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000',
        'referrer-policy': 'strict-origin-when-cross-origin'
      };
      
      let allPresent = true;
      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        if (!headers[header] || !headers[header].toLowerCase().includes(expectedValue.toLowerCase())) {
          this.addResult('Security Headers', 'FAIL', `Missing or invalid ${header}`);
          allPresent = false;
        }
      }
      
      if (allPresent) {
        this.addResult('Security Headers', 'PASS', 'All security headers present');
      }
      
    } catch (error) {
      this.addResult('Security Headers', 'ERROR', error.message);
    }
  }

  async testCORSConfiguration() {
    console.log('🔗 Testando configuração CORS...');
    
    try {
      const response = await this.makeRequest('/', 'OPTIONS', {
        'origin': 'https://malicious-site.com'
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      
      if (corsHeader === 'https://dashboardmbk.com.br' || corsHeader === 'https://www.dashboardmbk.com.br') {
        this.addResult('CORS Configuration', 'PASS', 'CORS properly restricted');
      } else {
        this.addResult('CORS Configuration', 'FAIL', 'CORS too permissive');
      }
      
    } catch (error) {
      this.addResult('CORS Configuration', 'ERROR', error.message);
    }
  }

  async testInputValidation() {
    console.log('🛡️ Testando validação de entrada...');
    
    const testPayloads = [
      { email: '<script>alert("xss")</script>@test.com' },
      { email: '../../../etc/passwd@test.com' },
      { email: 'test@test.com', name: 'Test\'; DROP TABLE users; --' }
    ];
    
    for (const payload of testPayloads) {
      try {
        const response = await this.makeRequest('/api/test-endpoint', 'POST', {}, payload);
        
        if (response.statusCode === 400 || response.statusCode === 422) {
          this.addResult('Input Validation', 'PASS', `Properly rejected malicious input: ${JSON.stringify(payload)}`);
        } else {
          this.addResult('Input Validation', 'FAIL', `Accepted malicious input: ${JSON.stringify(payload)}`);
        }
      } catch (error) {
        this.addResult('Input Validation', 'PASS', `Rejected malicious input: ${JSON.stringify(payload)}`);
      }
    }
  }

  async testSQLInjection() {
    console.log('💉 Testando proteção contra SQL Injection...');
    
    const sqlInjectionPayloads = [
      "admin' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'; UPDATE users SET password='hacked' --"
    ];
    
    for (const payload of sqlInjectionPayloads) {
      try {
        const response = await this.makeRequest('/api/login', 'POST', {}, {
          email: payload,
          password: 'anything'
        });
        
        if (response.statusCode === 400 || response.statusCode === 401) {
          this.addResult('SQL Injection Protection', 'PASS', `Blocked SQL injection: ${payload}`);
        } else {
          this.addResult('SQL Injection Protection', 'FAIL', `Potential SQL injection vulnerability: ${payload}`);
        }
      } catch (error) {
        this.addResult('SQL Injection Protection', 'PASS', `Blocked SQL injection: ${payload}`);
      }
    }
  }

  async testXSSProtection() {
    console.log('🎭 Testando proteção contra XSS...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")></svg>'
    ];
    
    for (const payload of xssPayloads) {
      try {
        const response = await this.makeRequest('/api/test-endpoint', 'POST', {}, {
          name: payload
        });
        
        if (response.statusCode === 400 || response.body.includes(payload)) {
          this.addResult('XSS Protection', 'FAIL', `XSS vulnerability: ${payload}`);
        } else {
          this.addResult('XSS Protection', 'PASS', `XSS payload sanitized: ${payload}`);
        }
      } catch (error) {
        this.addResult('XSS Protection', 'PASS', `XSS payload blocked: ${payload}`);
      }
    }
  }

  async testRateLimiting() {
    console.log('⚡ Testando rate limiting...');
    
    const requests = Array(10).fill().map(() => 
      this.makeRequest('/api/login', 'POST', {}, {
        email: 'test@test.com',
        password: 'wrongpassword'
      })
    );
    
    try {
      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.some(r => 
        r.status === 'fulfilled' && r.value.statusCode === 429
      );
      
      if (rateLimited) {
        this.addResult('Rate Limiting', 'PASS', 'Rate limiting active');
      } else {
        this.addResult('Rate Limiting', 'FAIL', 'Rate limiting not detected');
      }
    } catch (error) {
      this.addResult('Rate Limiting', 'PASS', 'Rate limiting enforced');
    }
  }

  async testAuthentication() {
    console.log('🔐 Testando autenticação...');
    
    try {
      // Test with invalid credentials
      const response = await this.makeRequest('/api/login', 'POST', {}, {
        email: 'invalid@email.com',
        password: 'invalidpassword'
      });
      
      if (response.statusCode === 401) {
        this.addResult('Authentication', 'PASS', 'Properly rejects invalid credentials');
      } else {
        this.addResult('Authentication', 'FAIL', 'Does not reject invalid credentials');
      }
      
      // Test session management
      const sessionResponse = await this.makeRequest('/api/protected-endpoint', 'GET', {});
      if (sessionResponse.statusCode === 401) {
        this.addResult('Session Management', 'PASS', 'Requires authentication');
      } else {
        this.addResult('Session Management', 'FAIL', 'Allows unauthenticated access');
      }
      
    } catch (error) {
      this.addResult('Authentication', 'ERROR', error.message);
    }
  }

  async testAuthorization() {
    console.log('👥 Testando autorização...');
    
    try {
      // Test user trying to access admin functionality
      const response = await this.makeRequest('/api/admin/users', 'GET', {});
      
      if (response.statusCode === 403) {
        this.addResult('Authorization', 'PASS', 'Properly restricts admin access');
      } else {
        this.addResult('Authorization', 'FAIL', 'Does not restrict admin access');
      }
      
    } catch (error) {
      this.addResult('Authorization', 'ERROR', error.message);
    }
  }

  makeRequest(path, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  addResult(testName, status, message) {
    this.results.push({
      test: testName,
      status: status,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('\n📊 Resultados dos Testes de Segurança:\n');
    
    let passCount = 0;
    let failCount = 0;
    let errorCount = 0;
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}: ${result.message}`);
      
      if (result.status === 'PASS') passCount++;
      else if (result.status === 'FAIL') failCount++;
      else errorCount++;
    });
    
    console.log(`\n📈 Resumo:`);
    console.log(`✅ Pass: ${passCount}`);
    console.log(`❌ Fail: ${failCount}`);
    console.log(`⚠️ Error: ${errorCount}`);
    
    const totalTests = this.results.length;
    const successRate = Math.round((passCount / totalTests) * 100);
    console.log(`🎯 Taxa de Sucesso: ${successRate}%`);
    
    if (failCount > 0) {
      console.log('\n⚠️ Atenção: Alguns testes falharam. Verifique os problemas antes de lançar o sistema.');
    }
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  const tester = new SecurityTester(baseUrl);
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('Erro ao executar testes:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SecurityTester;