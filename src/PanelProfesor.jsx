import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function PanelProfesor() {
  const [datos, setDatos] = useState([]);
  const [clave, setClave] = useState('');
  const [acceso, setAcceso] = useState(false);

  const cargarDatos = async () => {
    const q = query(collection(db, "resultados"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDatos(lista);
  };

  useEffect(() => {
    if (acceso) cargarDatos();
  }, [acceso]);

  if (!acceso) return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h3>Área de Profesor</h3>
      <input type="password" placeholder="Contraseña" onChange={e => setClave(e.target.value)} />
      <button onClick={() => clave === 'PROFE123' && setAcceso(true)}>Entrar</button>
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>Resultados de Alumnos</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Nombre</th>
            <th>Calificación</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {datos.map(d => (
            <tr key={d.id}>
              <td>{d.nombre}</td>
              <td>{d.calificacion.toFixed(1)}</td>
              <td>{new Date(d.fecha).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}