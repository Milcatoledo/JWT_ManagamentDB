import { useState } from 'react';
import { updatePerson as updatePersonApi } from '../../Api/personsApi';

export const useUpdatePerson = (db = 'mongodb') => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updatePerson = async (id, personData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (db === 'postgres' && personData && personData.fechaNacimiento) {
        const parts = String(personData.fechaNacimiento).split('-').map(Number);
        if (parts.length === 3) {
          const [y, m, d] = parts;
          const inputDate = new Date(y, m - 1, d);
          const today = new Date();
          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (inputDate > todayDate) {
            const clientError = new Error('La fecha de nacimiento no puede ser una fecha futura.');
            clientError.isClientValidation = true;
            throw clientError;
          }
        }
      }
      await updatePersonApi(id, personData, db);
    } catch (err) {
      let errorMessage = 'Ocurrió un error inesperado al actualizar.';

      if (err.response && err.response.data) {
        if (err.response.data.errors) {
          const validationErrors = err.response.data.errors;
          errorMessage = Object.values(validationErrors)
            .map(error => error.message)
            .join(' ');
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }

      setError(errorMessage);
      throw err;
      
    } finally {
      setIsLoading(false);
    }
  };

  return { updatePerson, isLoading, error };
};
