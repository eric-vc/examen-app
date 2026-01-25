import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function PanelProfesor() {
  const [acceso, setAcceso] = useState(false);
  const [clave, setClave] = useState('');
  
  const [examenes, setExamenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); 
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [limiteConfig, setLimiteConfig] = useState(0);

  // AHORA CON 4 OPCIONES
  const [pregunta, setPregunta] = useState({ 
    texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' 
  });

  const cargarDatos = async () => {
    const exSnap = await getDocs(collection(db, "examenes"));
    setExamenes(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const resQ = query(collection(db, "resultados"), orderBy("fecha", "desc"));
    const resSnap = await getDocs(resQ);
    setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { if (acceso) cargarDatos(); }, [acceso]);

  // Actualizar configuración de límite al cambiar examen
  useEffect(() => {
    if (examenSeleccionado) {
      const ex = examenes.find(e => e.id === examenSeleccionado);
      if (ex) setLimiteConfig(ex.limite || ex.preguntas?.length || 0);
    }
  }, [examenSeleccionado, examenes]);

  const crearExamen = async () => {
    if (!nuevoTitulo) return;
    try {
      await addDoc(collection(db, "examenes"), { titulo: nuevoTitulo, preguntas: [], limite: 0 });
      setNuevoTitulo('');
      cargarDatos();
      alert("Examen creado");
    } catch (e) { console.error(e); }
  };

  const agregarPregunta = async (e) => {
    e.preventDefault();
    if (!examenSeleccionado) return alert("Selecciona un examen");
    if (!pregunta.texto) return;

    const textoCorrecta = pregunta[pregunta.correcta];
    
    // Objeto con 4 opciones
    const nuevaPreguntaObj = {
      texto: pregunta.texto,
      opciones: [pregunta.op1, pregunta.op2, pregunta.op3, pregunta.op4],
      correcta: textoCorrecta
    };

    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, { preguntas: arrayUnion(nuevaPreguntaObj) });
      alert("Pregunta agregada (4 opciones)");
      setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });
      cargarDatos();
    } catch (error) { console.error(error); }
  };

  const actualizarLimite = async () => {
    if (!examenSeleccionado) return;
    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, { limite: parseInt(limiteConfig) });
      alert("Límite actualizado");
      cargarDatos();
    } catch (e) { console.error(e); }
  };

  if (!acceso) return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h3>Área de Profesor</h3>
      <input type="password" placeholder="Contraseña" onChange={e => setClave(e.target.value)} />
      <button onClick={() => clave === 'PROFE123' && setAcceso(true)}>Entrar</button>
    </div>
  );

  const infoExamen = examenes.find(e => e.id === examenSeleccionado);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Panel de Control ITS</h1>

      {/* CREAR EXAMEN */}
      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. Crear Nuevo Examen</h3>
        <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} placeholder="Ej: Programación Web" />
        <button onClick={crearExamen} style={{ marginLeft: '10px' }}>Crear</button>
      </div>

      {/* GESTIÓN DE PREGUNTAS */}
      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border:'1px solid #ddd' }}>
        <h3>2. Agregar Preguntas (4 Opciones)</h3>
        <select value={examenSeleccionado} onChange={e => setExamenSeleccionado(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
          <option value="">-- Selecciona Examen --</option>
          {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.titulo} ({ex.preguntas?.length || 0} pregs)</option>)}
        </select>

        {examenSeleccionado && infoExamen && (
          <>
            <div style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', marginBottom: '15px' }}>
              <label>Mostrar aleatoriamente: <input type="number" value={limiteConfig} onChange={e => setLimiteConfig(e.target.value)} style={{ width: '50px' }} /> preguntas.</label>
              <button onClick={actualizarLimite} style={{ marginLeft: '10px' }}>Guardar Config</button>
            </div>

            <form onSubmit={agregarPregunta} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <input type="text" placeholder="Enunciado de la pregunta" value={pregunta.texto} onChange={e => setPregunta({...pregunta, texto: e.target.value})} required style={{ padding: '8px' }} />
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="text" placeholder="Opción 1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} required />
                  <input type="text" placeholder="Opción 2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} required />
                  <input type="text" placeholder="Opción 3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} required />
                  <input type="text" placeholder="Opción 4" value={pregunta.op4} onChange={e => setPregunta({...pregunta, op4: e.target.value})} required />
               </div>
               
               <label>Respuesta Correcta: 
                 <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})} style={{ padding: '5px' }}>
                   <option value="op1">Opción 1</option>
                   <option value="op2">Opción 2</option>
                   <option value="op3">Opción 3</option>
                   <option value="op4">Opción 4</option>
                 </select>
               </label>
               <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px', cursor:'pointer' }}>Guardar Pregunta</button>
            </form>
          </>
        )}
      </div>

      {/* TABLA DE RESULTADOS ACTUALIZADA */}
      <h3>📊 Resultados de Alumnos</h3>
      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#333', color: 'white' }}>
              <th>Unidad</th>
              <th>Control</th>
              <th>Nombre</th>
              <th>Examen</th>
              <th>Nota</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map(r => (
              <tr key={r.id}>
                <td>{r.unidad || '-'}</td>
                <td>{r.numControl || '-'}</td>
                <td>{r.nombre}</td>
                <td>{r.examenTitulo}</td>
                <td style={{ fontWeight: 'bold', color: r.calificacion >= 7 ? 'green' : 'red' }}>
                  {r.calificacion.toFixed(1)}
                </td>
                <td>{new Date(r.fecha).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}