/**
 * Script de mantenimiento automático para el sistema de auditoría
 * 
 * Este script debe ejecutarse periódicamente (ej: diariamente) para:
 * - Aplicar políticas de retención
 * - Archivar registros antiguos
 * - Optimizar índices
 * - Generar reportes de salud del sistema
 */

import mongoose from 'mongoose';
import auditService from '../services/auditService';

// Configuración por defecto
const DEFAULT_CONFIG = {
  retentionDays: 365,      // Mantener registros por 1 año
  archiveDays: 90,         // Archivar registros después de 3 meses
  optimizeIndexes: true,   // Optimizar índices
  generateReport: true     // Generar reporte de salud
};

/**
 * Conecta a la base de datos
 */
async function connectToDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bayres-panel';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

/**
 * Ejecuta mantenimiento de auditoría
 */
async function runAuditMaintenance(config = DEFAULT_CONFIG): Promise<void> {
  console.log('🔧 Iniciando mantenimiento de auditoría...');
  console.log('📋 Configuración:', config);
  
  try {
    // 1. Obtener estadísticas antes del mantenimiento
    if (config.generateReport) {
      console.log('\n📊 Obteniendo estadísticas de almacenamiento...');
      const statsBefore = await auditService.getStorageStats();
      console.log('📈 Estadísticas antes del mantenimiento:', {
        totalLogs: statsBefore.totalLogs,
        estimatedSizeMB: statsBefore.estimatedSizeMB,
        logsOlderThan365Days: statsBefore.logsOlderThan365Days
      });
    }

    // 2. Archivar registros antiguos
    console.log('\n📦 Archivando registros antiguos...');
    const archiveResult = await auditService.archiveOldLogs(config.archiveDays);
    console.log(`✅ ${archiveResult.archivedCount} registros archivados`);

    // 3. Aplicar política de retención
    console.log('\n🗑️ Aplicando política de retención...');
    const retentionResult = await auditService.applyRetentionPolicy(config.retentionDays);
    console.log(`✅ ${retentionResult.deletedCount} registros eliminados`);

    // 4. Optimizar índices
    if (config.optimizeIndexes) {
      console.log('\n⚡ Optimizando índices...');
      await auditService.optimizeIndexes();
      console.log('✅ Índices optimizados');
    }

    // 5. Obtener estadísticas después del mantenimiento
    if (config.generateReport) {
      console.log('\n📊 Obteniendo estadísticas finales...');
      const statsAfter = await auditService.getStorageStats();
      console.log('📈 Estadísticas después del mantenimiento:', {
        totalLogs: statsAfter.totalLogs,
        estimatedSizeMB: statsAfter.estimatedSizeMB,
        logsOlderThan365Days: statsAfter.logsOlderThan365Days
      });

      // Calcular reducción
      const totalReduction = archiveResult.archivedCount + retentionResult.deletedCount;
      console.log(`\n💾 Resumen del mantenimiento:`);
      console.log(`   - Registros procesados: ${totalReduction}`);
      console.log(`   - Archivados: ${archiveResult.archivedCount}`);
      console.log(`   - Eliminados: ${retentionResult.deletedCount}`);
    }

    console.log('\n✅ Mantenimiento de auditoría completado exitosamente');

  } catch (error) {
    console.error('❌ Error durante el mantenimiento:', error);
    throw error;
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  try {
    await connectToDatabase();
    
    // Leer configuración desde variables de entorno o usar valores por defecto
    const config = {
      retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365'),
      archiveDays: parseInt(process.env.AUDIT_ARCHIVE_DAYS || '90'),
      optimizeIndexes: process.env.AUDIT_OPTIMIZE_INDEXES !== 'false',
      generateReport: process.env.AUDIT_GENERATE_REPORT !== 'false'
    };

    await runAuditMaintenance(config);
    
  } catch (error) {
    console.error('❌ Error en el script de mantenimiento:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Función para verificar la salud del sistema de auditoría
async function checkAuditHealth(): Promise<void> {
  try {
    await connectToDatabase();
    
    console.log('🩺 Verificando salud del sistema de auditoría...');
    
    const stats = await auditService.getStorageStats();
    const recentActivities = await auditService.getRecentActivities(5);
    
    console.log('\n📊 Estado del sistema:');
    console.log(`   - Total de logs: ${stats.totalLogs.toLocaleString()}`);
    console.log(`   - Tamaño estimado: ${stats.estimatedSizeMB} MB`);
    console.log(`   - Logs últimos 30 días: ${stats.logsLast30Days.toLocaleString()}`);
    console.log(`   - Logs más antiguos a 1 año: ${stats.logsOlderThan365Days.toLocaleString()}`);
    
    // Verificar si hay actividad reciente
    if (recentActivities.length === 0) {
      console.warn('⚠️ No se encontraron actividades recientes');
    } else {
      console.log(`✅ Sistema activo - última actividad: ${recentActivities[0].timestamp}`);
    }
    
    // Recomendaciones
    console.log('\n💡 Recomendaciones:');
    if (stats.logsOlderThan365Days > 10000) {
      console.log('   - Considerar ejecutar política de retención');
    }
    if (stats.estimatedSizeMB > 100) {
      console.log('   - Considerar archivar registros antiguos');
    }
    if (stats.totalLogs > 100000) {
      console.log('   - Considerar optimizar índices');
    }
    
  } catch (error) {
    console.error('❌ Error verificando salud del sistema:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar según el argumento proporcionado
const command = process.argv[2];

if (command === 'health') {
  checkAuditHealth();
} else {
  main();
}

export { runAuditMaintenance, checkAuditHealth }; 