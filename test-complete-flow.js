#!/usr/bin/env node

/**
 * Script completo de prueba del flujo end-to-end de BetApp
 * Ejecuta registro, creación de grupo y creación de apuesta paso a paso
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';
let authToken = null;
let groupId = null;

console.log('🧪 BetApp - Flujo End-to-End Completo\n');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Configurar interceptors para auth
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function testStep(stepName, stepFunction) {
  try {
    console.log(`⏳ Paso ${stepName}...`);
    const result = await stepFunction();
    console.log(`✅ ${stepName}: OK`);
    return result;
  } catch (error) {
    console.log(`❌ ${stepName}: ERROR`);
    console.log(`   ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function runCompleteFlow() {
  try {
    // Paso 1: Registrar usuario fresco
    const username = `testuser_${Date.now()}`;
    const email = `${username}@example.com`;

    await testStep('Registro de Usuario', async () => {
      const response = await api.post('/auth/register', {
        username: username,
        email: email,
        password: 'test12345'
      });
      console.log(`   👤 Usuario: ${username} (ID: ${response.data.user.id})`);
      authToken = response.data.token;
      return response.data;
    });

    // Paso 2: Crear Grupo
    const groupName = 'Grupo Test ' + Date.now();
    await testStep('Creación de Grupo', async () => {
      const response = await api.post('/groups', {
        name: groupName
      });
      console.log(`   👥 Grupo: "${groupName}" (ID: ${response.data.group.id})`);
      console.log(`   📧 Código: ${response.data.group.invite_code}`);
      groupId = response.data.group.id;
      return response.data;
    });

    // Paso 3: Verificar lista de grupos
    await testStep('Lista de Grupos del Usuario', async () => {
      const response = await api.get('/groups');
      const groups = response.data.groups;
      console.log(`   👥 Total de grupos: ${groups.length}`);
      console.log(`   📋 Grupos: ${groups.map(g => g.name).join(', ')}`);
      return response.data;
    });

    // Paso 4: Ver detalles del grupo
    await testStep('Detalles del Grupo', async () => {
      const response = await api.get(`/groups/${groupId}`);
      const group = response.data.group;
      console.log(`   👥 Grupo: "${group.name}"`);
      console.log(`   👤 Miembros: ${group.members.length}`);
      console.log(`   🔄 Creador: ${group.is_owner ? 'Sí' : 'No'}`);
      return response.data;
    });

    // Paso 5: Crear Apuesta
    await testStep('Crear Apuesta', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const deadlineStr = tomorrow.toISOString().split('T')[0] + 'T12:00:00.000Z';

      const response = await api.post('/bets', {
        groupId: groupId,
        description: 'Test bet - ¿Funcionarán los emojis?',
        deadline: deadlineStr,
        stake: 'Una ronda de cervezas',
        emoji: '🎯'
      });

      console.log(`   🎯 Apuesta: "${response.data.bet.description}" (ID: ${response.data.bet.id})`);
      return response.data;
    });

    // Paso 6: Ver apuestas del grupo
    await testStep('Lista de Apuestas del Grupo', async () => {
      const response = await api.get(`/bets/group/${groupId}`);
      const bets = response.data.bets;
      console.log(`   🎯 Total de apuestas: ${bets.length}`);
      bets.forEach(bet => {
        console.log(`   📝 "${bet.description}" - ${bet.total_votes}/${bet.potential_voters} votos`);
      });
      return response.data;
    });

    // Paso 7: Votar en la apuesta (aquí se debería encontrar la apuesta correcta)
    await testStep('Votar en Apuesta', async () => {
      // Primero obtenemos las apuestas del grupo para encontrar el ID correcto
      const betsResponse = await api.get(`/bets/group/${groupId}`);
      const bets = betsResponse.data.bets;

      if (bets.length === 0) {
        throw new Error('No se encontró ninguna apuesta en el grupo');
      }

      const betToVote = bets[bets.length - 1]; // Tomamos la última apuesta creada

      const response = await api.post(`/bets/${betToVote.id}/vote`, { vote: 'favor' });
      console.log(`   🗳️ Voto registrado: ${response.data.vote} en apuesta "${betToVote.description}"`);
      return response.data;
    });

    // Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ¡FLUJO END-TO-END COMPLETADO EXITOSAMENTE!');
    console.log('='.repeat(60));
    console.log('\n✅ Funcionalidades verificadas:');
    console.log('   • Registro de usuarios');
    console.log('   • Autenticación JWT');
    console.log('   • Creación de grupos');
    console.log('   • Gestión de miembros');
    console.log('   • Creación de apuestas');
    console.log('   • Sistema de votación');
    console.log('\n🚀 BetApp está funcionando perfectamente!');
    console.log('\n📱 Ahora puedes:');
    console.log('   • Abrir http://localhost:3001');
    console.log('   • Registrarte con email/password');
    console.log('   • Crear grupos y apuestas');
    console.log('   • Disfrutar de la experiencia completa');

    return true;

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ ERROR EN EL FLUJO END-TO-END');
    console.log('='.repeat(60));
    console.log('💡 Solución: Verifica que el backend esté corriendo en http://localhost:8000');

    return false;
  }
}

// Ejecutar el flujo completo
runCompleteFlow().catch(console.error);
