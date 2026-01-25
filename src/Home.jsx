import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const THEMES = {
  claro: { bg: '#ffffff', text: '#333333', card: '#f0f0f0', border: '#cccccc' },
  oscuro: { bg: '#121212', text: '#e0e0e0', card: '#1e1e1e', border: '#333333' },
  calido: { bg: '#f5e6d3', text: '#4a3b2a', card: '#e8dcc5', border: '#d1c7b7' }
};

export default function Home() {
  const [examenes, setExamenes] = useState([]);
  
  // Lógica de Tema con Persistencia
  const [temaActual, setTemaActual] = useState(() => localStorage.getItem('temaApp') || 'claro');
  const styles = THEMES[temaActual];

  useEffect(() => {
    localStorage.setItem('temaApp', temaActual);
  }, [temaActual]);

  useEffect(() => {
    const obtenerExamenes = async () => {
      const snap = await getDocs(collection(db, "examenes"));
      setExamenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    obtenerExamenes();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: styles.bg, color: styles.text, transition: 'all 0.3s', padding: '20px' }}>
      
      {/* Botones de Tema */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setTemaActual('claro')} style={{ cursor: 'pointer' }}>🌞</button>
        <button onClick={() => setTemaActual('oscuro')} style={{ cursor: 'pointer' }}>🌙</button>
        <button onClick={() => setTemaActual('calido')} style={{ cursor: 'pointer' }}>☕</button>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1>Selecciona un Examen</h1>
        <div style={{ display: 'grid', gap: '15px' }}>
          {examenes.map(ex => (
            <Link 
              key={ex.id} 
              to={`/examen/${ex.id}`}
              style={{ 
                padding: '20px', 
                background: styles.card, 
                textDecoration: 'none', 
                color: styles.text, 
                borderRadius: '8px',
                border: `1px solid ${styles.border}`
              }}
            >
              <h3>📄 {ex.titulo}</h3>
              <p>Click para comenzar</p>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: '50px' }}>
          <Link to="/admin" style={{ color: styles.text }}>Soy Profesor (Ir al Panel)</Link>
        </div>
      </div>
    </div>
  );
}