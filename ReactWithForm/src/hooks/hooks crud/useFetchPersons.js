import { useState, useCallback, useEffect } from 'react';
import { getPersons } from '../../Api/personsApi';

export const useFetchPersons = (db = 'mongodb') => {
    const [persons, setPersons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPersons = useCallback(async (dbArg = db) => {
        setIsLoading(true);
        setError(null);
        try {
        const data = await getPersons(dbArg);
        let normalized = data;
        if (dbArg === 'postgres') {
            normalized = data.map(row => ({
                ...row,
                _id: row.id !== undefined ? String(row.id) : row._id,
                fechaNacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento).toISOString() : row.fechaNacimiento || null,
            }));
        }
        setPersons(normalized);
        } catch (err) {
            console.error('Falló la carga de personas:', err);
            setError('No se pudieron cargar las personas.');
        } finally {
            setIsLoading(false);
        }
    }, [db]);


    useEffect(() => {
        fetchPersons(db);
    }, [fetchPersons, db]);

    return { persons, isLoading, error, fetchPersons };
};
