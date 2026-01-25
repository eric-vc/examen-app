import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, addDoc } from 'firebase/firestore';

export default function PanelProfesor() {
  // Estados para autenticación y lista de alumnos
  const [datos, setDatos] = useState([]);
  const [clave, setClave] = useState('');
  const [acceso, setAcceso] = useState(false);

  // Estados para nueva pregunta
  const [pregunta, setPregunta] = useState({
    texto: '',
    op1: '',
    op2: '',
    op3: '',
    correcta: 'op1' // Por defecto la correcta es la opción 1
  });

  const cargarDatos = async () => {
    // Cargar resultados de alumnos
    const q = query(collection(db, "resultados"), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    setDatos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    if (acceso) cargarDatos();
  }, [acceso]);

  const guardarPregunta = async (e) => {
    e.preventDefault();
    if(!pregunta.texto || !pregunta.op1 || !pregunta.op2 || !pregunta.op3) return alert("Llena todos los campos");

    // Determinar cuál es el texto de la respuesta correcta basado en la selección
    const textoCorrecta = pregunta[pregunta.correcta]; 

    try {
      await addDoc(collection(db, "preguntas"), {
        texto: pregunta.texto,
        opciones: [pregunta.op1, pregunta.op2, pregunta.op3],
        correcta: textoCorrecta
      });
      alert("Pregunta agregada con éxito");
      setPregunta({ texto: '', op1: '', op2: '', op3: '', correcta: 'op1' }); // Limpiar form
    } catch (error) {
      console.error("Error al guardar pregunta:", error);
    }
  };

  if (!acceso) return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h3>Área de Profesor</h3>
      <input type="password" placeholder="Contraseña" onChange={e => setClave(e.target.value)} />
      <button onClick={() => clave === 'PROFE123' && setAcceso(true)}>Entrar</button>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Panel de Administración</h1>

      {/* --- SECCIÓN AGREGAR PREGUNTAS --- */}
      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ddd' }}>
        <h3>➕ Agregar Nueva Pregunta</h3>
        <form onSubmit={guardarPregunta} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="text" placeholder="¿Cuál es la pregunta?" 
            value={pregunta.texto} 
            onChange={e => setPregunta({...pregunta, texto: e.target.value})}
            required
            style={{ padding: '8px' }}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <input type="text" placeholder="Opción 1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} required />
            <input type="text" placeholder="Opción 2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} required />
            <input type="text" placeholder="Opción 3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} required />
          </div>

          <label>
            ¿Cuál es la correcta? 
            <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})} style={{ marginLeft: '10px', padding: '5px' }}>
              <option value="op1">Opción 1</option>
              <option value="op2">Opción 2</option>
              <option value="op3">Opción 3</option>
            </select>
          </label>

          <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}>Guardar Pregunta</button>
        </form>
      </div>

      {/* --- SECCIÓN RESULTADOS ALUMNOS --- */}
      <h3>📊 Resultados de Alumnos</h3>
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