import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function Home() {
  const [examenes, setExamenes] = useState([]);

  useEffect(() => {
    const obtenerExamenes = async () => {
      const snap = await getDocs(collection(db, "examenes"));
      setExamenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    obtenerExamenes();
  }, []);

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
      <h1>Selecciona un Examen</h1>
      <div style={{ display: 'grid', gap: '15px' }}>
        {examenes.map(ex => (
          <Link 
            key={ex.id} 
            to={`/examen/${ex.id}`}
            style={{ 
              padding: '20px', 
              background: '#f0f0f0', 
              textDecoration: 'none', 
              color: '#333', 
              borderRadius: '8px',
              border: '1px solid #ccc'
            }}
          >
            <h3>📄 {ex.titulo}</h3>
            <p>Click para comenzar</p>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: '50px' }}>
        <Link to="/admin">Soy Profesor (Ir al Panel)</Link>
      </div>
    </div>
  );
}