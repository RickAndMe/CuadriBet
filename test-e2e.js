#!/usr/bin/env node

/**
 * Script de testing end-to-end para BetApp
 * Ejecuta pruebas automatizadas de las principales funcionalidades
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';
let authToken = null;

console.log('🧪 BetApp - Testing End-to-End\n');

// Funciones auxiliares
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000
});

// Configurar interceptors para auth
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function test(name, fn) {
  try {
    console.log(`⏳ Testing: ${name}`);
    await fn();
    console.log(`✅ OK: ${name}\n`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
    return false;
  }
}

async function runTests() {
  const results = [];

  // Test 1: Health check
  results.push(await test('Health Check', async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    if (response.data.status !== 'OK') {
      throw new Error('Health check failed');
    }
  }));

  // Test 2: Registro de usuario
  results.push(await test('User Registration', async () => {
    const response = await api.post('/auth/register', {
      username: `testuser_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'test123'
    });
    if (!response.data.token) {
      throw new Error('Registration failed');
    }
    authToken = response.data.token;
  }));

  // Test 3: Login
  results.push(await test('User Login', async () => {
    const response = await api.post('/auth/login', {
      email: 'test@email.com',
      password: 'test123'
    });
    if (!response.data.token) {
      throw new Error('Login failed');
    }
    authToken = response.data.token;
  }));

  // Test 4: Perfil usuario
  results.push(await test('Get User Profile', async () => {
    const response = await api.get('/auth/profile');
    if (!response.data.user.username) {
      throw new Error('Profile fetch failed');
    }
  }));

  // Test 5: Crear grupo
  let groupId = null;
  results.push(await test('Create Group', async () => {
    const response = await api.post('/groups', {
      name: 'Grupo de Testing'
    });
    if (!response.data.group.id) {
      throw new Error('Group creation failed');
    }
    groupId = response.data.group.id;
  }));

  await sleep(1000);

  // Test 6: Lista de grupos
  results.push(await test('List Groups', async () => {
    const response = await api.get('/groups');
    if (!response.data.groups || !Array.isArray(response.data.groups)) {
      throw new Error('Groups list failed');
    }
  }));

  // Test 7: Detalles del grupo
  results.push(await test('Get Group Details', async () => {
    if (!groupId) throw new Error('No group ID');
    const response = await api.get(`/groups/${groupId}`);
    if (!response.data.group.name) {
      throw new Error('Group details failed');
    }
  }));

  // Test 8: Crear apuesta
  let betId = null;
  results.push(await test('Create Bet', async () => {
    if (!groupId) throw new Error('No group ID');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const response = await api.post('/bets', {
      groupId,
      description: 'Test bet - ¿Funcionará el registro?',
      deadline: tomorrow.toISOString().split('T')[0] + 'T12:00',
      stake: 'Una cerveza por cabeza'
    });
    if (!response.data.bet.id) {
      throw new Error('Bet creation failed');
    }
    betId = response.data.bet.id;
  }));

  await sleep(1000);

  // Test 9: Obtener apuestas del grupo
  results.push(await test('Get Group Bets', async () => {
    if (!groupId) throw new Error('No group ID');
    const response = await api.get(`/bets/group/${groupId}`);
    if (!response.data.bets || !Array.isArray(response.data.bets)) {
      throw new Error('Group bets failed');
    }
  }));

  // Test 10: Detalles de la apuesta
  results.push(await test('Get Bet Details', async () => {
    if (!betId) throw new Error('No bet ID');
    const response = await api.get(`/bets/${betId}`);
    if (!response.data.bet.description) {
      throw new Error('Bet details failed');
    }
  }));

  // Test 11: Votar en la apuesta
  results.push(await test('Vote on Bet', async () => {
    if (!betId) throw new Error('No bet ID');
    const response = await api.post(`/bets/${betId}/vote`, { vote: 'favor' });
    if (response.data.message !== 'Vote cast successfully') {
      throw new Error('Voting failed');
    }
  }));

  // Resultados finales
  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log('=' .repeat(50));
  console.log(`📊 Resultados del Testing:`);
  console.log(`✅ Pasaron: ${passed}/${total}`);
  console.log(`❌ Fallaron: ${total - passed}/${total}`);
  console.log('='.repeat(50));

  if (passed === total) {
    console.log('🎉 Todos los tests pasaron exitosamente!');
    console.log('\n🚀 BetApp está funcionando correctamente.');
    console.log('\n📱 Puedes abrir:');
    console.log('- Frontend: http://localhost:3001');
    console.log('- API Docs: http://localhost:8000/api/health');
  } else {
    console.log('⚠️  Algunos tests fallaron. Revisa los logs anteriores.');
    console.log('\n🐛 Para debugging:');
    console.log('- Backend logs en terminal');
    console.log('- Frontend console en F12');
  }

  process.exit(passed === total ? 0 : 1);
}

// Ejecutar tests
runTests().catch(error => {
  console.error('Error ejecutando tests:', error);
  process.exit(1);
});
