import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import LeadStageCategory from '../models/LeadStageCategory';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// IDs de las etapas del sistema
const SYSTEM_STAGE_IDS = [
  '68408ba54e2d0d5a984704c3', // Nuevo
  '6840952e2478fa93ba7e00a1', // Lead nuevo pendiente de contacto
  '684095502478fa93ba7e0129', // Contactado
  '6840955d2478fa93ba7e014e', // Pendiente Seguimiento
  '6841e3eb7c0b59a265b89d2d', // Agenda Pendiente
  '6841e7c47c0b59a265b8a4ea', // Agenda Confirmada
  '6841e84e7c0b59a265b8a5e7'  // Consideracion
];

async function main() {
  try {
    console.log('Conectando a MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://root:wNbSKJw096Jnz2tSioZdr8wOztNOFNU1i14LTC5zinXzTYJdjSnamupFikv8nPVG@147.93.36.93:27017/bayres-panel?directConnection=true';
    await mongoose.connect(mongoUri);
    console.log('Conexión a MongoDB establecida correctamente');
    
    console.log('Marcando etapas del sistema...');
    
    // Actualizar cada etapa para marcarla como del sistema
    const updatePromises = SYSTEM_STAGE_IDS.map(async (id) => {
      try {
        const stage = await LeadStageCategory.findByIdAndUpdate(
          id,
          { isSystem: true },
          { new: true }
        );
        
        if (stage) {
          console.log(`Etapa "${stage.name}" (${id}) marcada como etapa del sistema`);
          return true;
        } else {
          console.log(`No se encontró la etapa con ID ${id}`);
          return false;
        }
      } catch (error) {
        console.error(`Error al actualizar la etapa ${id}:`, error);
        return false;
      }
    });
    
    // Esperar a que todas las actualizaciones terminen
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(result => result).length;
    
    console.log(`\nProceso completado: ${successCount} de ${SYSTEM_STAGE_IDS.length} etapas actualizadas correctamente`);
    
    await mongoose.disconnect();
    console.log('Conexión a MongoDB cerrada');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Conexión a MongoDB cerrada');
    }
    process.exit(1);
  }
}

// Ejecutar la función principal
main(); 