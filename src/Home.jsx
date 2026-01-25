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
  const [temaActual, setTemaActual] = useState(() => localStorage.getItem('temaApp') || 'claro');
  const styles = THEMES[temaActual];

  useEffect(() => localStorage.setItem('temaApp', temaActual), [temaActual]);

  useEffect(() => {
    const obtenerExamenes = async () => {
      const snap = await getDocs(collection(db, "examenes"));
      setExamenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    obtenerExamenes();
  }, []);

  return (
    // CONTENEDOR PRINCIPAL: Ocupa 100% ancho y alto mínimo
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: styles.bg, color: styles.text, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Botones de Tema */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setTemaActual('claro')} style={{ cursor: 'pointer', fontSize: '1.2em' }}>🌞</button>
        <button onClick={() => setTemaActual('oscuro')} style={{ cursor: 'pointer', fontSize: '1.2em' }}>🌙</button>
        <button onClick={() => setTemaActual('calido')} style={{ cursor: 'pointer', fontSize: '1.2em' }}>☕</button>
      </div>

      <div style={{ width: '100%', maxWidth: '1000px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: '30px' }}>Selecciona un Examen</h1>
        
        {/* GRID RESPONSIVO: Se adapta automáticamente */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', // Mágia responsiva
          gap: '20px',
          width: '100%'
        }}>
          {examenes.map(ex => (
            <Link 
              key={ex.id} 
              to={`/examen/${ex.id}`}
              style={{ 
                padding: '30px', 
                background: styles.card, 
                textDecoration: 'none', 
                color: styles.text, 
                borderRadius: '12px',
                border: `1px solid ${styles.border}`,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '150px'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>📄 {ex.titulo}</h3>
              <p style={{ margin: 0, opacity: 0.8 }}>Click para comenzar</p>
            </Link>
          ))}
        </div>

        {examenes.length === 0 && <p>Cargando exámenes disponibles...</p>}

        <div style={{ marginTop: '60px' }}>
          <Link to="/admin" style={{ color: styles.text, textDecoration: 'underline' }}>Soy Profesor (Ir al Panel)</Link>
        </div>
      </div>
    </div>
  );
}