import mongoose from 'mongoose';

/**
 * Valida si una cadena es un ObjectId válido de MongoDB
 * @param id Cadena a validar
 * @returns true si es un ObjectId válido, false en caso contrario
 */
export const validateObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Valida si un objeto contiene todas las propiedades requeridas
 * @param obj Objeto a validar
 * @param requiredProps Array de propiedades requeridas
 * @returns true si contiene todas las propiedades requeridas, false en caso contrario
 */
export const validateRequiredFields = (obj: any, requiredProps: string[]): boolean => {
  return requiredProps.every(prop => 
    obj.hasOwnProperty(prop) && obj[prop] !== null && obj[prop] !== undefined);
};

/**
 * Valida si una dirección de correo electrónico tiene un formato válido
 * @param email Correo electrónico a validar
 * @returns true si el formato es válido, false en caso contrario
 */
export const validateEmail = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
};

/**
 * Valida si una URL tiene un formato válido
 * @param url URL a validar
 * @returns true si el formato es válido, false en caso contrario
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}; 