import { useEffect, useState, useMemo } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, addDoc, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

const THEMES = {
  claro: { bg: '#ffffff', text: '#333333', card: '#f9f9f9', border: '#dddddd', accent: '#007bff', inputBg: '#fff' },
  oscuro: { bg: '#1e1e1e', text: '#e0e0e0', card: '#2d2d2d', border: '#444444', accent: '#4dabf7', inputBg: '#333' },
  calido: { bg: '#f5e6d3', text: '#4a3b2a', card: '#e8dcc5', border: '#d1c7b7', accent: '#a67c52', inputBg: '#fff8f0' }
};

const UNIDADES = ["Zongolica", "Tequila", "Nogales", "Acultzinapa", "Cuichapa", "Tezonapa", "Tehuipango"];

export default function PanelProfesor() {
  const [acceso, setAcceso] = useState(false);
  const [clave, setClave] = useState('');
  
  // Tema con Persistencia
  const [temaActual, setTemaActual] = useState(() => localStorage.getItem('temaApp') || 'claro');
  const styles = THEMES[temaActual];

  useEffect(() => {
    localStorage.setItem('temaApp', temaActual);
  }, [temaActual]);

  const [examenes, setExamenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  
  // Estados de gestión
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); 
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoIntentos, setNuevoIntentos] = useState(1);
  const [limiteConfig, setLimiteConfig] = useState(0);
  const [intentosEdit, setIntentosEdit] = useState(1);
  const [pregunta, setPregunta] = useState({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });

  // Filtros
  const [filtros, setFiltros] = useState({ examenId: '', numControl: '', unidad: '', fechaInicio: '', fechaFin: '', estado: '' });

  const cargarDatos = async () => {
    const exSnap = await getDocs(collection(db, "examenes"));
    setExamenes(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const resQ = query(collection(db, "resultados"), orderBy("fecha", "desc"));
    const resSnap = await getDocs(resQ);
    setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { if (acceso) cargarDatos(); }, [acceso]);

  useEffect(() => {
    if (examenSeleccionado) {
      const ex = examenes.find(e => e.id === examenSeleccionado);
      if (ex) {
        setLimiteConfig(ex.limite || ex.preguntas?.length || 0);
        setIntentosEdit(ex.intentosMaximos || 1);
      }
    }
  }, [examenSeleccionado, examenes]);

  const resultadosFiltrados = useMemo(() => {
    return resultados.filter(r => {
      if (filtros.examenId && r.examenId !== filtros.examenId) return false;
      if (filtros.numControl && !r.numControl.includes(filtros.numControl.toUpperCase())) return false;
      if (filtros.unidad && r.unidad !== filtros.unidad) return false;
      const fechaR = new Date(r.fecha);
      if (filtros.fechaInicio && fechaR < new Date(filtros.fechaInicio)) return false;
      if (filtros.fechaFin) {
        const fin = new Date(filtros.fechaFin);
        fin.setHours(23, 59, 59);
        if (fechaR > fin) return false;
      }
      if (filtros.estado === 'aprobado' && r.calificacion < 7) return false;
      if (filtros.estado === 'reprobado' && r.calificacion >= 7) return false;
      return true;
    });
  }, [resultados, filtros]);

  const crearExamen = async () => {
    if (!nuevoTitulo) return;
    try {
      await addDoc(collection(db, "examenes"), { titulo: nuevoTitulo, preguntas: [], limite: 0, intentosMaximos: parseInt(nuevoIntentos) });
      setNuevoTitulo(''); setNuevoIntentos(1); cargarDatos(); alert("Examen creado");
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
      alert("Pregunta agregada"); setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' }); cargarDatos();
    } catch (error) { console.error(error); }
  };

  const actualizarConfiguracion = async () => {
    if (!examenSeleccionado) return;
    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      await updateDoc(examenRef, { limite: parseInt(limiteConfig), intentosMaximos: parseInt(intentosEdit) });
      alert("Configuración actualizada"); cargarDatos();
    } catch (e) { console.error(e); }
  };

  const eliminarResultado = async (id) => {
    if(!window.confirm("¿Eliminar este resultado permanentemente?")) return;
    try { await deleteDoc(doc(db, "resultados", id)); cargarDatos(); } catch (e) { console.error(e); }
  };

  const inputStyle = { padding: '8px', borderRadius: '4px', border: `1px solid ${styles.border}`, background: styles.inputBg, color: styles.text };

  if (!acceso) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: styles.bg, color: styles.text }}>
      <div style={{ padding: '40px', background: styles.card, borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', border: `1px solid ${styles.border}` }}>
        <h2 style={{ marginBottom: '20px' }}>Acceso Docente</h2>
        <input type="password" placeholder="Contraseña" onChange={e => setClave(e.target.value)} style={{...inputStyle, marginBottom:'15px'}} />
        <br/><button onClick={() => clave === 'PROFE123' && setAcceso(true)} style={{ padding: '10px 30px', background: styles.accent, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Entrar</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: styles.bg, color: styles.text, transition: 'all 0.3s ease' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${styles.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Panel de Control ITS</h1>
        <div>
          <button onClick={() => setTemaActual('claro')} style={{ marginRight:'5px' }}>🌞</button>
          <button onClick={() => setTemaActual('oscuro')} style={{ marginRight:'5px' }}>🌙</button>
          <button onClick={() => setTemaActual('calido')}>☕</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Formularios de Gestión (Simplificados visualmente para caber) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: styles.card, padding: '20px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
            <h3>📝 Crear Examen</h3>
            <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} placeholder="Título..." style={{ ...inputStyle, width: '100%', marginBottom: '10px' }} />
            <input type="number" value={nuevoIntentos} onChange={e => setNuevoIntentos(e.target.value)} style={{ ...inputStyle, width: '60px' }} min="1" />
            <button onClick={crearExamen} style={{ marginLeft:'10px', padding: '8px', background: styles.accent, color: 'white', border: 'none', borderRadius: '4px' }}>Crear</button>
          </div>

          <div style={{ backgroundColor: styles.card, padding: '20px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
            <h3>⚙️ Gestión</h3>
            <select value={examenSeleccionado} onChange={e => setExamenSeleccionado(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '10px' }}>
              <option value="">-- Selecciona Examen --</option>
              {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.titulo}</option>)}
            </select>
            {examenSeleccionado && (
              <div style={{display:'flex', gap:'10px', flexDirection:'column'}}>
                 <div>
                    <label>Visible: <input type="number" value={limiteConfig} onChange={e => setLimiteConfig(e.target.value)} style={{...inputStyle, width:'50px'}} /></label>
                    <label style={{marginLeft:'10px'}}>Intentos: <input type="number" value={intentosEdit} onChange={e => setIntentosEdit(e.target.value)} style={{...inputStyle, width:'50px'}} /></label>
                    <button onClick={actualizarConfiguracion} style={{marginLeft:'10px'}}>Guardar Config</button>
                 </div>
                 <form onSubmit={agregarPregunta} style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                    <input type="text" placeholder="Pregunta" value={pregunta.texto} onChange={e => setPregunta({...pregunta, texto: e.target.value})} style={{...inputStyle, flexGrow:1}} required/>
                    <div style={{display:'flex', gap:'2px'}}>
                       <input type="text" placeholder="Op1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} style={{...inputStyle, width:'60px'}} required/>
                       <input type="text" placeholder="Op2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} style={{...inputStyle, width:'60px'}} required/>
                       <input type="text" placeholder="Op3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} style={{...inputStyle, width:'60px'}} required/>
                       <input type="text" placeholder="Op4" value={pregunta.op4} onChange={e => setPregunta({...pregunta, op4: e.target.value})} style={{...inputStyle, width:'60px'}} required/>
                    </div>
                    <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})} style={inputStyle}>
                      <option value="op1">Op1</option><option value="op2">Op2</option><option value="op3">Op3</option><option value="op4">Op4</option>
                    </select>
                    <button type="submit" style={{background:'#28a745', color:'white', border:'none', padding:'5px'}}>Add</button>
                 </form>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ backgroundColor: styles.card, padding: '15px', borderRadius: '8px', border: `1px solid ${styles.border}`, marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Buscar Control..." value={filtros.numControl} onChange={e => setFiltros({...filtros, numControl: e.target.value})} style={inputStyle} />
            <select value={filtros.unidad} onChange={e => setFiltros({...filtros, unidad: e.target.value})} style={inputStyle}>
                <option value="">Todas Unidades</option>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={filtros.estado} onChange={e => setFiltros({...filtros, estado: e.target.value})} style={inputStyle}>
                <option value="">Todos Estados</option><option value="aprobado">Aprobados</option><option value="reprobado">Reprobados</option>
            </select>
            <button onClick={() => setFiltros({examenId:'', numControl:'', unidad:'', fechaInicio:'', fechaFin:'', estado:''})} style={{padding:'5px'}}>Limpiar</button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: styles.card, color: styles.text }}>
            <thead>
              <tr style={{ backgroundColor: styles.accent, color: 'white' }}>
                <th style={{padding:'10px'}}>Acción</th><th style={{padding:'10px'}}>Control</th><th style={{padding:'10px'}}>Nombre</th><th style={{padding:'10px'}}>Unidad</th><th style={{padding:'10px'}}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {resultadosFiltrados.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <td style={{textAlign:'center'}}><button onClick={() => eliminarResultado(r.id)} style={{background:'red', color:'white', border:'none'}}>🗑️</button></td>
                  <td style={{padding:'10px'}}>{r.numControl}</td>
                  <td style={{padding:'10px'}}>{r.nombre}</td>
                  <td style={{padding:'10px'}}>{r.unidad}</td>
                  <td style={{padding:'10px', fontWeight:'bold', color: r.calificacion >= 7 ? '#28a745' : '#dc3545'}}>{r.calificacion.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}