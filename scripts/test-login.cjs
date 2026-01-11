
async function testLogin() {
  const API_URL = 'http://localhost:5001/api/auth/login';

  try {
    // 1. Try to register first to ensure user exists
    console.log('Registering test user...');
    const regRes = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: `test_${Date.now()}@example.com`,
            password: 'password123',
            firstName: 'Test',
            lastName: 'User'
        })
    });
    
    const regData = await regRes.json();
    console.log('Registration:', regRes.status, regData);
    
    if (regRes.ok) {
        // 2. Try to login
        console.log('Logging in...');
        const email = regData.user.email;
        const loginRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        
        const loginData = await loginRes.json();
        console.log('Login:', loginRes.status, loginData);

        if (loginRes.ok) {
            // 3. Verify token
            console.log('Verifying token...');
            const verifyRes = await fetch('http://localhost:5001/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${loginData.token}` }
            });
            const verifyData = await verifyRes.json();
            console.log('Verify:', verifyRes.status, verifyData);
        }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogin();
