import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function PanelProfesor() {
  const [acceso, setAcceso] = useState(false);
  const [clave, setClave] = useState('');
  
  const [examenes, setExamenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); 
  
  // Nuevo Examen
  const [nuevoTitulo, setNuevoTitulo] = useState('');

  // Nueva Pregunta
  const [pregunta, setPregunta] = useState({ texto: '', op1: '', op2: '', op3: '', correcta: 'op1' });

  // NUEVO: Estado para el límite de preguntas
  const [limiteConfig, setLimiteConfig] = useState(0);

  const cargarDatos = async () => {
    const exSnap = await getDocs(collection(db, "examenes"));
    setExamenes(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const resQ = query(collection(db, "resultados"), orderBy("fecha", "desc"));
    const resSnap = await getDocs(resQ);
    setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { if (acceso) cargarDatos(); }, [acceso]);

  // Cuando cambia la selección del examen, actualizamos el input del límite
  useEffect(() => {
    if (examenSeleccionado) {
      const ex = examenes.find(e => e.id === examenSeleccionado);
      if (ex) setLimiteConfig(ex.limite || ex.preguntas?.length || 0);
    }
  }, [examenSeleccionado, examenes]);

  const crearExamen = async () => {
    if (!nuevoTitulo) return;
    try {
      await addDoc(collection(db, "examenes"), {
        titulo: nuevoTitulo,
        preguntas: [],
        limite: 0 // 0 significa "todas"
      });
      setNuevoTitulo('');
      cargarDatos();
      alert("Examen creado");
    } catch (e) { console.error(e); }
  };

  const agregarPregunta = async (e) => {
    e.preventDefault();
    if (!examenSeleccionado) return alert("Selecciona un examen primero");
    if (!pregunta.texto) return;

    const textoCorrecta = pregunta[pregunta.correcta];
    const nuevaPreguntaObj = {
      texto: pregunta.texto,
      opciones: [pregunta.op1, pregunta.op2, pregunta.op3],
      correcta: textoCorrecta
    };

    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, {
        preguntas: arrayUnion(nuevaPreguntaObj)
      });
      alert("Pregunta agregada al banco");
      setPregunta({ texto: '', op1: '', op2: '', op3: '', correcta: 'op1' });
      cargarDatos(); // Recargar para actualizar contadores
    } catch (error) { console.error(error); }
  };

  // NUEVO: Guardar configuración de límite
  const actualizarLimite = async () => {
    if (!examenSeleccionado) return;
    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, {
        limite: parseInt(limiteConfig)
      });
      alert("Configuración actualizada: Los alumnos verán " + limiteConfig + " preguntas aleatorias.");
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

  // Helper para mostrar info del examen seleccionado
  const infoExamen = examenes.find(e => e.id === examenSeleccionado);

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Panel de Control</h1>

      {/* 1. CREAR EXAMEN */}
      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. Crear Nuevo Examen</h3>
        <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} placeholder="Ej: Historia Universal" />
        <button onClick={crearExamen} style={{ marginLeft: '10px' }}>Crear</button>
      </div>

      {/* 2. GESTIÓN DE EXAMEN */}
      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border:'1px solid #ddd' }}>
        <h3>2. Gestión de Preguntas y Configuración</h3>
        <label>Selecciona el examen a editar: </label>
        <select value={examenSeleccionado} onChange={e => setExamenSeleccionado(e.target.value)} style={{ marginBottom: '10px', width: '100%', padding: '5px' }}>
          <option value="">-- Selecciona --</option>
          {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.titulo} ({ex.preguntas?.length || 0} pregs)</option>)}
        </select>

        {examenSeleccionado && infoExamen && (
          <>
            <div style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', marginBottom: '15px', borderRadius: '5px' }}>
              <h4>⚙️ Configuración de Aleatoriedad</h4>
              <p>Este examen tiene <strong>{infoExamen.preguntas?.length || 0}</strong> preguntas en el banco.</p>
              <label>
                Mostrar a los alumnos: 
                <input 
                  type="number" 
                  value={limiteConfig} 
                  onChange={e => setLimiteConfig(e.target.value)} 
                  style={{ width: '60px', marginLeft: '5px', marginRight: '5px' }} 
                />
                preguntas aleatorias.
              </label>
              <button onClick={actualizarLimite} style={{ background: '#007bff', color: 'white', border: 'none', padding: '5px 10px', marginLeft: '10px', cursor:'pointer' }}>Actualizar Configuración</button>
              <p style={{ fontSize: '12px', color: '#666' }}>* Si pones 0 o un número mayor al total, se mostrarán todas.</p>
            </div>

            <h4>➕ Agregar Nueva Pregunta al Banco</h4>
            <form onSubmit={agregarPregunta} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <input type="text" placeholder="Pregunta" value={pregunta.texto} onChange={e => setPregunta({...pregunta, texto: e.target.value})} required />
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                  <input type="text" placeholder="Opción 1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} required />
                  <input type="text" placeholder="Opción 2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} required />
                  <input type="text" placeholder="Opción 3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} required />
               </div>
               <label>Correcta: 
                 <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})}>
                   <option value="op1">Opción 1</option>
                   <option value="op2">Opción 2</option>
                   <option value="op3">Opción 3</option>
                 </select>
               </label>
               <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', padding: '8px', cursor: 'pointer' }}>Guardar en Banco</button>
            </form>
          </>
        )}
      </div>

      {/* 3. RESULTADOS */}
      <h3>📊 Resultados Recientes</h3>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th>Examen</th>
            <th>Alumno</th>
            <th>Nota</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {resultados.map(r => (
            <tr key={r.id}>
              <td>{r.examenTitulo || 'N/A'}</td>
              <td>{r.nombre}</td>
              <td>{r.calificacion.toFixed(1)}</td>
              <td>{new Date(r.fecha).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}