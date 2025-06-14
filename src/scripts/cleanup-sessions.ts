import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { SessionCleanupService } from '../services/session-cleanup.service';

// Configurar variables de entorno
const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });

if (!process.env.MONGODB_URI) {
  dotenv.config();
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está configurado');
  process.exit(1);
}

async function cleanupSessions() {
  try {
    console.log('🧹 Iniciando limpieza manual de sesiones expiradas...');
    console.log(`📡 Conectando a MongoDB: ${MONGODB_URI!.includes('@') ? MONGODB_URI!.split('@')[0].substring(0, 15) + '...' : MONGODB_URI!.substring(0, 25) + '...'}`);
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Conectado a MongoDB');

    // Obtener estadísticas antes de la limpieza
    const statsBefore = await SessionCleanupService.getSessionStats();
    console.log('📊 Estadísticas ANTES de la limpieza:', statsBefore);

    // Ejecutar limpieza
    const deletedCount = await SessionCleanupService.cleanupExpiredSessions();
    console.log(`🗑️  Sesiones eliminadas: ${deletedCount}`);

    // Obtener estadísticas después de la limpieza
    const statsAfter = await SessionCleanupService.getSessionStats();
    console.log('📊 Estadísticas DESPUÉS de la limpieza:', statsAfter);

    // Mostrar resumen
    console.log('\n📋 RESUMEN DE LA LIMPIEZA:');
    console.log(`   • Sesiones eliminadas: ${deletedCount}`);
    console.log(`   • Sesiones activas restantes: ${statsAfter.active}`);
    console.log(`   • Sesiones expiradas restantes: ${statsAfter.expired}`);
    console.log(`   • Sesiones inactivas restantes: ${statsAfter.inactive}`);
    console.log(`   • Total de sesiones restantes: ${statsAfter.total}`);

    if (deletedCount > 0) {
      console.log('\n✅ Limpieza completada exitosamente!');
    } else {
      console.log('\n✨ No había sesiones expiradas para limpiar');
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza de sesiones:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión a MongoDB
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar la limpieza
cleanupSessions(); 