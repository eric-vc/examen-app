import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, addDoc, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

export default function PanelProfesor() {
  const [acceso, setAcceso] = useState(false);
  const [clave, setClave] = useState('');
  
  const [examenes, setExamenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); 
  
  // Nuevo Examen
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  // NUEVO: Intentos
  const [nuevoIntentos, setNuevoIntentos] = useState(1);

  // Edición
  const [limiteConfig, setLimiteConfig] = useState(0);
  const [intentosEdit, setIntentosEdit] = useState(1); // Para editar intentos de un examen existente

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

  // Actualizar configuración al seleccionar examen
  useEffect(() => {
    if (examenSeleccionado) {
      const ex = examenes.find(e => e.id === examenSeleccionado);
      if (ex) {
        setLimiteConfig(ex.limite || ex.preguntas?.length || 0);
        setIntentosEdit(ex.intentosMaximos || 1);
      }
    }
  }, [examenSeleccionado, examenes]);

  const crearExamen = async () => {
    if (!nuevoTitulo) return;
    try {
      await addDoc(collection(db, "examenes"), { 
        titulo: nuevoTitulo, 
        preguntas: [], 
        limite: 0,
        intentosMaximos: parseInt(nuevoIntentos) // Guardamos intentos permitidos
      });
      setNuevoTitulo('');
      setNuevoIntentos(1);
      cargarDatos();
      alert("Examen creado");
    } catch (e) { console.error(e); }
  };

  const agregarPregunta = async (e) => {
    e.preventDefault();
    if (!examenSeleccionado) return alert("Selecciona un examen");
    
    const nuevaPreguntaObj = {
      texto: pregunta.texto,
      opciones: [pregunta.op1, pregunta.op2, pregunta.op3, pregunta.op4],
      correcta: pregunta[pregunta.correcta]
    };

    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, { preguntas: arrayUnion(nuevaPreguntaObj) });
      alert("Pregunta agregada");
      setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });
      cargarDatos();
    } catch (error) { console.error(error); }
  };

  const actualizarConfiguracion = async () => {
    if (!examenSeleccionado) return;
    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, { 
        limite: parseInt(limiteConfig),
        intentosMaximos: parseInt(intentosEdit)
      });
      alert("Configuración actualizada");
      cargarDatos();
    } catch (e) { console.error(e); }
  };

  // NUEVO: Eliminar resultado
  const eliminarResultado = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este resultado?")) return;
    try {
      await deleteDoc(doc(db, "resultados", id));
      cargarDatos(); // Recargar tabla
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

      {/* 1. CREAR EXAMEN */}
      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. Crear Nuevo Examen</h3>
        <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} placeholder="Título del Examen" style={{marginRight: '10px'}}/>
        <label>Intentos permitidos: </label>
        <input type="number" value={nuevoIntentos} onChange={e => setNuevoIntentos(e.target.value)} style={{width: '50px', marginRight: '10px'}} min="1" />
        <button onClick={crearExamen}>Crear</button>
      </div>

      {/* 2. GESTIÓN Y VISUALIZACIÓN */}
      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border:'1px solid #ddd' }}>
        <h3>2. Gestión de Examen</h3>
        <select value={examenSeleccionado} onChange={e => setExamenSeleccionado(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
          <option value="">-- Selecciona Examen para ver detalles --</option>
          {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.titulo}</option>)}
        </select>

        {examenSeleccionado && infoExamen && (
          <>
            {/* CONFIGURACIÓN */}
            <div style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', marginBottom: '15px' }}>
              <h4>⚙️ Configuración</h4>
              <div style={{ marginBottom: '10px' }}>
                <label>Preguntas aleatorias a mostrar: </label>
                <input type="number" value={limiteConfig} onChange={e => setLimiteConfig(e.target.value)} style={{ width: '50px' }} />
              </div>
              <div>
                <label>Intentos Máximos por Alumno: </label>
                <input type="number" value={intentosEdit} onChange={e => setIntentosEdit(e.target.value)} style={{ width: '50px' }} />
                <button onClick={actualizarConfiguracion} style={{ marginLeft: '10px', background: '#007bff', color: 'white', border:'none', padding:'5px' }}>Guardar Cambios</button>
              </div>
            </div>

            {/* VISUALIZADOR DE PREGUNTAS */}
            <div style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', marginBottom: '15px', maxHeight: '200px', overflowY: 'auto' }}>
              <h4>👁️ Preguntas en este examen ({infoExamen.preguntas?.length || 0})</h4>
              <ul style={{ paddingLeft: '20px', fontSize: '0.9em' }}>
                {infoExamen.preguntas?.map((p, idx) => (
                  <li key={idx} style={{ marginBottom: '5px' }}>
                    <strong>{p.texto}</strong> <br/>
                    <span style={{color: 'green'}}>Correcta: {p.correcta}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AGREGAR PREGUNTA */}
            <h4>➕ Agregar Nueva Pregunta</h4>
            <form onSubmit={agregarPregunta} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <input type="text" placeholder="Enunciado" value={pregunta.texto} onChange={e => setPregunta({...pregunta, texto: e.target.value})} required />
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  <input type="text" placeholder="Op 1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} required />
                  <input type="text" placeholder="Op 2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} required />
                  <input type="text" placeholder="Op 3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} required />
                  <input type="text" placeholder="Op 4" value={pregunta.op4} onChange={e => setPregunta({...pregunta, op4: e.target.value})} required />
               </div>
               <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})}>
                 <option value="op1">Opción 1 es correcta</option>
                 <option value="op2">Opción 2 es correcta</option>
                 <option value="op3">Opción 3 es correcta</option>
                 <option value="op4">Opción 4 es correcta</option>
               </select>
               <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', padding: '8px' }}>Guardar Pregunta</button>
            </form>
          </>
        )}
      </div>

      {/* 3. RESULTADOS CON ELIMINACIÓN */}
      <h3>📊 Resultados</h3>
      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#333', color: 'white' }}>
              <th>Acción</th>
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
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => eliminarResultado(r.id)}
                    style={{ background: 'red', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                    title="Eliminar este resultado"
                  >
                    🗑️
                  </button>
                </td>
                <td>{r.numControl}</td>
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