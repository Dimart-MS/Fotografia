import { useContext } from 'react';
import { StudioContext } from '../contexts/StudioContext';

// ==============================|| HOOK DE ACCESO AL CONTEXTO DEL ESTUDIO ||============================== //

export default function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio debe utilizarse dentro de un StudioProvider');
  }
  return context;
}
