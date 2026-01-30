import { useEffect, useState, useMemo } from 'react';
import { db, auth } from './firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'; 
import { collection, getDocs, orderBy, query, addDoc, doc, updateDoc, arrayUnion, deleteDoc, getDoc, where } from 'firebase/firestore';
import EncabezadoPDF from './EncabezadoPDF';

const THEMES = {
  claro: { bg: '#ffffff', text: '#333333', card: '#f9f9f9', border: '#dddddd', accent: '#007bff', inputBg: '#fff' },
  oscuro: { bg: '#1e1e1e', text: '#e0e0e0', card: '#2d2d2d', border: '#444444', accent: '#4dabf7', inputBg: '#333' },
  calido: { bg: '#f5e6d3', text: '#4a3b2a', card: '#e8dcc5', border: '#d1c7b7', accent: '#a67c52', inputBg: '#fff8f0' }
};

const UNIDADES_ACADEMICAS = ["Zongolica", "Tequila", "Nogales", "Acultzinapa", "Cuichapa", "Tezonapa", "Tehuipango"];

export default function PanelProfesor() {
  // --- AUTENTICACIÓN ---
  const [usuario, setUsuario] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [esRegistro, setEsRegistro] = useState(false);

  // --- TEMA & VISTA ---
  const [temaActual, setTemaActual] = useState(() => localStorage.getItem('temaApp') || 'claro');
  const [vistaActual, setVistaActual] = useState('examenes');
  const styles = THEMES[temaActual];

  // --- DATOS ---
  const [examenes, setExamenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [docenteActual, setDocenteActual] = useState(null);

  // --- UI ---
  const [cargandoResultados, setCargandoResultados] = useState(false);

  // --- CREACIÓN EXAMEN (CAMPOS NUEVOS) ---
  const [nuevoNombreExamen, setNuevoNombreExamen] = useState('');
  const [nuevaAsignatura, setNuevaAsignatura] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [nuevoTema, setNuevoTema] = useState('');
  const [nuevaOpcion, setNuevaOpcion] = useState('1ra'); 
  const [nuevoIntentos, setNuevoIntentos] = useState(1);
  
  // --- GESTIÓN DOCENTES ---
  const [nuevoDocenteNombre, setNuevoDocenteNombre] = useState('');
  const [nuevoDocenteEmail, setNuevoDocenteEmail] = useState('');

  // --- GESTIÓN EXAMEN SELECCIONADO ---
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); 
  const [limiteConfig, setLimiteConfig] = useState(0); 
  const [intentosEdit, setIntentosEdit] = useState(1);
  const [permitirPrint, setPermitirPrint] = useState(false); 
  
  // --- PREGUNTAS ---
  const [pregunta, setPregunta] = useState({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });
  const [modoEdicion, setModoEdicion] = useState(false); 
  const [indiceEdicion, setIndiceEdicion] = useState(null); 
  const [paginaActual, setPaginaActual] = useState(1);
  const [preguntasPorPagina, setPreguntasPorPagina] = useState(5);

  // --- FILTROS ---
  const [filtros, setFiltros] = useState({ examenId: '', numControl: '', unidad: '', fechaInicio: '', fechaFin: '', estado: '' });
  
  // --- IMPRESIÓN ---
  const [modoImpresion, setModoImpresion] = useState(null);

  useEffect(() => localStorage.setItem('temaApp', temaActual), [temaActual]);

  // --- AUTH & CARGA ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuario(user);
        cargarExamenes();
        cargarDocentes(user.email);
      } else {
        setUsuario(null);
        setExamenes([]);
        setDocenteActual(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const cargarExamenes = async () => {
    const exSnap = await getDocs(collection(db, "examenes"));
    setExamenes(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarDocentes = async (emailLogueado) => {
    try {
        const docSnap = await getDocs(collection(db, "docentes"));
        const lista = docSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDocentes(lista);
        const yo = lista.find(d => d.email === emailLogueado);
        if (yo) setDocenteActual(yo);
    } catch (e) { console.error(e); }
  };

  const cargarResultados = async () => {
    setCargandoResultados(true);
    try {
      const resQ = query(collection(db, "resultados"), orderBy("fecha", "desc"));
      const resSnap = await getDocs(resQ);
      setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error(error); } 
    finally { setCargandoResultados(false); }
  };

  // --- LOGIN / REGISTRO CON LISTA BLANCA ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    try {
        if (esRegistro) {
            const q = query(collection(db, "docentes"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setErrorLogin("❌ Correo no autorizado. Pide al admin que te agregue.");
                return;
            }
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') setErrorLogin("Correo ya registrado.");
        else if (error.code === 'auth/invalid-credential') setErrorLogin("Credenciales incorrectas.");
        else setErrorLogin(error.message);
    }
  };

  const handleLogout = () => { signOut(auth); setVistaActual('examenes'); };

  // --- SINCRONIZACIÓN CONFIG ---
  useEffect(() => {
    if (examenSeleccionado) {
      const ex = examenes.find(e => e.id === examenSeleccionado);
      if (ex) {
        setLimiteConfig(ex.limite || ex.preguntas?.length || 0);
        setIntentosEdit(ex.intentosMaximos || 1);
        setPermitirPrint(ex.permitirImpresion || false);
        setPaginaActual(1);
        limpiarFormularioPregunta();
      }
    }
  }, [examenSeleccionado, examenes]);

  // --- CRUD EXAMENES ---
  const crearExamen = async () => {
    if (!nuevoNombreExamen || !nuevaAsignatura) return alert("Falta Nombre o Asignatura.");
    const nombreProfe = docenteActual ? docenteActual.nombre : "Sin Asignar";
    try {
      await addDoc(collection(db, "examenes"), { 
        nombreExamen: nuevoNombreExamen,
        asignatura: nuevaAsignatura,
        titulo: `${nuevoNombreExamen} - ${nuevaAsignatura}`, // Respaldo
        unidad: nuevaUnidad, 
        tema: nuevoTema, 
        opcion: nuevaOpcion,
        preguntas: [], 
        limite: 0, 
        intentosMaximos: parseInt(nuevoIntentos), 
        permitirImpresion: false,
        docenteNombre: nombreProfe,
        docenteEmail: usuario.email
      });
      setNuevoNombreExamen(''); setNuevaAsignatura(''); setNuevaUnidad(''); setNuevoTema(''); 
      cargarExamenes(); alert("Creado correctamente.");
    } catch (e) { console.error(e); }
  };

  // --- CRUD GENERICS ---
  const guardarDocente = async () => { if (!nuevoDocenteNombre || !nuevoDocenteEmail) return alert("Faltan datos"); try { await addDoc(collection(db, "docentes"), { nombre: nuevoDocenteNombre, email: nuevoDocenteEmail, fechaRegistro: new Date().toISOString() }); alert("Docente agregado"); setNuevoDocenteNombre(''); setNuevoDocenteEmail(''); cargarDocentes(usuario.email); } catch (e) { alert("Error"); } };
  const eliminarDocente = async (id) => { if(!confirm("¿Eliminar?")) return; try { await deleteDoc(doc(db, "docentes", id)); cargarDocentes(usuario.email); } catch(e) { alert("Error"); } };
  const limpiarFormularioPregunta = () => { setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' }); setModoEdicion(false); setIndiceEdicion(null); };
  const handleGuardarPregunta = async (e) => { e.preventDefault(); if (!examenSeleccionado) return; const pObj = { texto: pregunta.texto, opciones: [pregunta.op1, pregunta.op2, pregunta.op3, pregunta.op4], correcta: pregunta[pregunta.correcta] }; try { const ref = doc(db, "examenes", examenSeleccionado); if (modoEdicion && indiceEdicion !== null) { const s = await getDoc(ref); const d = s.data(); const np = [...d.preguntas]; np[indiceEdicion] = pObj; await updateDoc(ref, { preguntas: np }); alert("Actualizada"); } else { await updateDoc(ref, { preguntas: arrayUnion(pObj) }); alert("Agregada"); } limpiarFormularioPregunta(); cargarExamenes(); } catch (e) { alert("Error"); } };
  const seleccionarParaEditar = (p, idx) => { let k = 'op1'; if (p.correcta === p.opciones[1]) k='op2'; if (p.correcta === p.opciones[2]) k='op3'; if (p.correcta === p.opciones[3]) k='op4'; setPregunta({ texto: p.texto, op1: p.opciones[0], op2: p.opciones[1], op3: p.opciones[2], op4: p.opciones[3], correcta: k }); setModoEdicion(true); setIndiceEdicion(idx); window.scrollTo(0,0); };
  const eliminarPregunta = async (idx) => { if(!confirm("¿Eliminar?")) return; const ref = doc(db, "examenes", examenSeleccionado); const s = await getDoc(ref); const np = s.data().preguntas.filter((_, i) => i !== idx); await updateDoc(ref, { preguntas: np }); cargarExamenes(); };
  const actualizarConfiguracion = async () => { if (!examenSeleccionado) return; await updateDoc(doc(db, "examenes", examenSeleccionado), { limite: parseInt(limiteConfig), intentosMaximos: parseInt(intentosEdit), permitirImpresion: permitirPrint }); alert("Guardado"); cargarExamenes(); };
  const eliminarResultado = async (id) => { if(!confirm("¿Eliminar?")) return; await deleteDoc(doc(db, "resultados", id)); cargarResultados(); };
  const resultadosFiltrados = useMemo(() => { return resultados.filter(r => { if (filtros.examenId && r.examenId !== filtros.examenId) return false; if (filtros.numControl && !r.numControl.includes(filtros.numControl.toUpperCase())) return false; if (filtros.unidad && r.unidad !== filtros.unidad) return false; return true; }); }, [resultados, filtros]);
  
  // --- IMPORTAR / EXPORTAR CSV (RESTAURADO) ---
  const handleImportarCSV = (e) => {
    const file = e.target.files[0];
    if (!file || !examenSeleccionado) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const nuevasPreguntas = [];
      lines.forEach((line) => {
        if (!line.trim()) return;
        const cols = line.split(',');
        if (cols.length >= 6) {
          const texto = cols[0].trim();
          if (texto.toLowerCase() === 'pregunta') return;
          const op1 = cols[1].trim(); const op2 = cols[2].trim(); const op3 = cols[3].trim(); const op4 = cols[4].trim();
          const correctaIdx = parseInt(cols[5].trim());
          if (texto && op1 && op2 && op3 && op4 && correctaIdx >= 1 && correctaIdx <= 4) {
            const opciones = [op1, op2, op3, op4];
            nuevasPreguntas.push({ texto: texto, opciones: opciones, correcta: opciones[correctaIdx - 1] });
          }
        }
      });
      if (nuevasPreguntas.length > 0) {
        try {
          const ref = doc(db, "examenes", examenSeleccionado);
          await updateDoc(ref, { preguntas: arrayUnion(...nuevasPreguntas) });
          alert(`Se importaron ${nuevasPreguntas.length} preguntas.`);
          cargarExamenes();
        } catch (error) { alert("Error al subir a Firebase."); }
      } else { alert("Error en CSV. Revisa el formato."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleExportarCSV = () => {
    if (!examenSeleccionado) return;
    const ex = examenes.find(e => e.id === examenSeleccionado);
    if (!ex || !ex.preguntas || ex.preguntas.length === 0) return alert("Sin preguntas.");
    let csvContent = "data:text/csv;charset=utf-8,Pregunta,Op1,Op2,Op3,Op4,IndexCorrecta\n";
    ex.preguntas.forEach(p => {
      const clean = (txt) => `"${txt.replace(/"/g, '""')}"`;
      const idxCorrecta = p.opciones.indexOf(p.correcta) + 1;
      csvContent += [clean(p.texto), clean(p.opciones[0]), clean(p.opciones[1]), clean(p.opciones[2]), clean(p.opciones[3]), idxCorrecta].join(",") + "\n";
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${ex.nombreExamen || ex.titulo}_preguntas.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportarResultados = () => { if (resultadosFiltrados.length === 0) return alert("Sin datos"); let c = "data:text/csv;charset=utf-8,Control,Nombre,Unidad,Examen,Calificacion,Fecha\n"; resultadosFiltrados.forEach(r => { const cl = (t) => t ? `"${t.toString().replace(/"/g, '""')}"` : ""; c += [cl(r.numControl), cl(r.nombre), cl(r.unidad), cl(r.examenTitulo), r.calificacion.toFixed(2), new Date(r.fecha).toLocaleDateString()].join(",") + "\n"; }); const l = document.createElement("a"); l.href = encodeURI(c); l.download = "Reporte.csv"; document.body.appendChild(l); l.click(); document.body.removeChild(l); };
  const handleImprimirAdmin = (modo) => { setModoImpresion(modo); setTimeout(() => { window.print(); }, 500); };
  const obtenerPreguntasPaginadas = () => { const ex = examenes.find(e => e.id === examenSeleccionado); if (!ex || !ex.preguntas) return []; const iU = paginaActual * preguntasPorPagina; return ex.preguntas.slice(iU - preguntasPorPagina, iU); };
  const totalPreguntasActuales = () => { const ex = examenes.find(e => e.id === examenSeleccionado); return ex?.preguntas?.length || 0; }; const totalPaginas = Math.ceil(totalPreguntasActuales() / preguntasPorPagina);
  const inputStyle = { padding: '10px', borderRadius: '5px', border: `1px solid ${styles.border}`, background: styles.inputBg, color: styles.text };

  // --- VISTAS ---

  if (!usuario) return (
    <div style={{ width:'100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: styles.bg, color: styles.text, padding: '20px' }}>
      <div style={{ padding: '40px', background: styles.card, borderRadius: '15px', border: `1px solid ${styles.border}`, maxWidth:'400px', width:'100%', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h2 style={{textAlign:'center', marginBottom:'10px'}}>Acceso ITSZ</h2>
        <div style={{display:'flex', marginBottom:'20px', borderBottom:`1px solid ${styles.border}`}}>
            <button onClick={() => {setEsRegistro(false); setErrorLogin('')}} style={{flex:1, padding:'10px', background: !esRegistro ? styles.inputBg : 'transparent', border:'none', cursor:'pointer', fontWeight: !esRegistro?'bold':'normal', borderBottom: !esRegistro ? `2px solid ${styles.accent}` : 'none', color:styles.text}}>Login</button>
            <button onClick={() => {setEsRegistro(true); setErrorLogin('')}} style={{flex:1, padding:'10px', background: esRegistro ? styles.inputBg : 'transparent', border:'none', cursor:'pointer', fontWeight: esRegistro?'bold':'normal', borderBottom: esRegistro ? `2px solid ${styles.accent}` : 'none', color:styles.text}}>Registro</button>
        </div>
        <form onSubmit={handleAuth}>
            <input type="email" placeholder="Correo institucional" value={email} onChange={e => setEmail(e.target.value)} style={{...inputStyle, marginBottom:'15px', width:'100%'}} required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={{...inputStyle, marginBottom:'20px', width:'100%'}} required />
            {errorLogin && <p style={{color:'red', textAlign:'center', fontSize:'0.9em'}}>{errorLogin}</p>}
            <button type="submit" style={{width:'100%', padding:'12px', background: styles.accent, color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>{esRegistro ? 'Crear Cuenta' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );

  if (modoImpresion && examenSeleccionado) {
    const ex = examenes.find(e => e.id === examenSeleccionado);
    return (
      <div className="hoja-examen">
        <div className="no-print" style={{ position: 'fixed', top: 10, right: 10, background:'white', padding:'10px', border:'1px solid black', zIndex:9999 }}><button onClick={() => setModoImpresion(null)}>❌ Cerrar</button></div>
        <EncabezadoPDF asignatura={ex.asignatura || ex.titulo} unidad={ex.unidad} tema={ex.tema} opcion={ex.opcion} docenteNombre={ex.docenteNombre} />
        <h3 style={{ textAlign: 'center', marginTop: '20px' }}>{modoImpresion === 'respuestas' ? 'CLAVE DE RESPUESTAS' : 'CUESTIONARIO'}</h3>
        {ex.preguntas && ex.preguntas.map((p, idx) => (
          <div key={idx} style={{ marginBottom: '10px', padding:'5px', breakInside: 'avoid' }}>
            <p style={{ fontWeight: 'bold' }}>{idx + 1}. {p.texto}</p>
            {modoImpresion === 'vacio' && <div style={{ marginLeft: '20px' }}>{p.opciones.map((op, i) => <div key={i}>⭕ {op}</div>)}</div>}
            {modoImpresion === 'respuestas' && <div style={{ marginLeft: '20px' }}>✅ {p.correcta}</div>}
          </div>
        ))}
        <div style={{ marginTop: '50px', textAlign: 'center' }}><div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto' }}>Firma del Docente</div></div>
      </div>
    );
  }

  return (
    <div className="no-print" style={{ width: '100%', minHeight: '100vh', backgroundColor: styles.bg, color: styles.text, padding: '20px', boxSizing:'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Panel Admin ITSZ</h1>
            {docenteActual && <span style={{fontSize:'0.9em', color: styles.accent}}>Hola, {docenteActual.nombre}</span>}
        </div>
        <div style={{display:'flex', gap:'8px'}}>
            <button onClick={() => setTemaActual('claro')}>🌞</button>
            <button onClick={() => setTemaActual('oscuro')}>🌙</button>
            <button onClick={handleLogout} style={{background:'#dc3545', color:'white', border:'none', borderRadius:'4px', padding:'5px 15px'}}>Salir</button>
        </div>
      </div>

      <div style={{display:'flex', gap:'10px', marginBottom:'20px', borderBottom:`1px solid ${styles.border}`, paddingBottom:'10px'}}>
          <button onClick={() => setVistaActual('examenes')} style={{padding:'10px 20px', background: vistaActual==='examenes'?styles.accent:styles.card, color: vistaActual==='examenes'?'white':styles.text, border:'none', borderRadius:'5px', cursor:'pointer'}}>📝 Exámenes</button>
          <button onClick={() => { setVistaActual('resultados'); cargarResultados(); }} style={{padding:'10px 20px', background: vistaActual==='resultados'?styles.accent:styles.card, color: vistaActual==='resultados'?'white':styles.text, border:'none', borderRadius:'5px', cursor:'pointer'}}>📊 Resultados</button>
          <button onClick={() => setVistaActual('docentes')} style={{padding:'10px 20px', background: vistaActual==='docentes'?styles.accent:styles.card, color: vistaActual==='docentes'?'white':styles.text, border:'none', borderRadius:'5px', cursor:'pointer'}}>👥 Docentes</button>
      </div>

      {vistaActual === 'docentes' && (
          <div className="fade-in" style={{background: styles.card, padding:'20px', borderRadius:'8px', border:`1px solid ${styles.border}`}}>
              <h3>Directorio de Docentes</h3>
              <div style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'end', marginBottom:'20px'}}>
                  <div style={{flex:1}}><label style={{display:'block', fontSize:'0.8em'}}>Nombre:</label><input value={nuevoDocenteNombre} onChange={e => setNuevoDocenteNombre(e.target.value)} placeholder="Grado y Nombre" style={{...inputStyle, width:'100%'}} /></div>
                  <div style={{flex:1}}><label style={{display:'block', fontSize:'0.8em'}}>Correo:</label><input value={nuevoDocenteEmail} onChange={e => setNuevoDocenteEmail(e.target.value)} placeholder="email@login" style={{...inputStyle, width:'100%'}} /></div>
                  <button onClick={guardarDocente} style={{background:'#28a745', color:'white', border:'none', padding:'12px 20px', borderRadius:'5px', cursor:'pointer'}}>Guardar</button>
              </div>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead><tr style={{background:styles.accent, color:'white'}}><th style={{padding:'8px'}}>Nombre</th><th style={{padding:'8px'}}>Correo</th><th style={{padding:'8px'}}>Acción</th></tr></thead>
                  <tbody>{docentes.map(d => (<tr key={d.id} style={{borderBottom:`1px solid ${styles.border}`}}><td style={{padding:'8px'}}>{d.nombre}</td><td style={{padding:'8px'}}>{d.email}</td><td style={{padding:'8px'}}><button onClick={() => eliminarDocente(d.id)}>🗑️</button></td></tr>))}</tbody>
              </table>
          </div>
      )}

      {vistaActual === 'examenes' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 350px', background: styles.card, padding: '20px', borderRadius: '8px', border: `1px solid ${styles.border}`, minWidth: '300px' }}>
                <h3 style={{marginTop:0}}>1. Crear Examen</h3>
                {!docenteActual && <p style={{color:'red', fontSize:'0.8em'}}>⚠️ Configura tu perfil en "Docentes" primero.</p>}
                
                <label style={{fontSize:'0.9em', fontWeight:'bold'}}>Nombre del Examen:</label>
                <input value={nuevoNombreExamen} onChange={e => setNuevoNombreExamen(e.target.value)} placeholder="Ej: Diagnóstico" style={{...inputStyle, width:'100%', marginBottom:'10px'}} />

                <label style={{fontSize:'0.9em', fontWeight:'bold'}}>Asignatura:</label>
                <input value={nuevaAsignatura} onChange={e => setNuevaAsignatura(e.target.value)} placeholder="Ej: Matemáticas" style={{...inputStyle, width:'100%', marginBottom:'10px'}} />

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                    <div><label style={{fontSize:'0.9em'}}>Unidad:</label><input value={nuevaUnidad} onChange={e => setNuevaUnidad(e.target.value)} style={{...inputStyle, width:'100%'}} /></div>
                    <div><label style={{fontSize:'0.9em'}}>Tema:</label><input value={nuevoTema} onChange={e => setNuevoTema(e.target.value)} style={{...inputStyle, width:'100%'}} /></div>
                </div>
                <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                    <div style={{flexGrow:1}}><label style={{fontSize:'0.9em'}}>Opción:</label><select value={nuevaOpcion} onChange={e => setNuevaOpcion(e.target.value)} style={{...inputStyle, width:'100%'}}><option value="diagnostico">Diagnóstico</option><option value="1ra">1ª Op</option><option value="2da">2ª Op</option></select></div>
                    <div><label style={{fontSize:'0.9em'}}>Intentos:</label><input type="number" value={nuevoIntentos} onChange={e => setNuevoIntentos(e.target.value)} style={{...inputStyle, width:'60px'}} min="1"/></div>
                </div>
                <button onClick={crearExamen} style={{width:'100%', background:styles.accent, color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer'}}>Crear Examen</button>
                <hr style={{margin:'25px 0', borderColor: styles.border}}/>
                
                <h3 style={{marginTop:0}}>2. Gestionar</h3>
                <select value={examenSeleccionado} onChange={e => setExamenSeleccionado(e.target.value)} style={{...inputStyle, width:'100%', marginBottom:'15px'}}>
                    <option value="">-- Selecciona Examen --</option>
                    {examenes.map(ex => (
                        <option key={ex.id} value={ex.id}>
                            {ex.nombreExamen ? `${ex.nombreExamen} - ${ex.asignatura}` : ex.titulo}
                        </option>
                    ))}
                </select>
                {examenSeleccionado && (
                    <div className="fade-in">
                        <div style={{marginBottom:'15px', background: temaActual==='oscuro'?'#333':'#e9ecef', padding:'10px', borderRadius:'5px'}}>
                            <label style={{display:'block', fontWeight:'bold', fontSize:'0.9em'}}>Preguntas Aleatorias:</label>
                            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                <input type="number" value={limiteConfig} onChange={e => setLimiteConfig(e.target.value)} style={{...inputStyle, width:'80px', borderColor: styles.accent}} />
                                <span style={{fontSize:'0.8em', opacity:0.8}}>(0 = Todas)</span>
                            </div>
                        </div>
                        <div style={{display:'flex', gap:'15px', marginBottom:'15px', alignItems:'center'}}>
                            <div><label style={{fontSize:'0.9em'}}>Intentos:</label><input type="number" value={intentosEdit} onChange={e => setIntentosEdit(e.target.value)} style={{...inputStyle, width:'70px'}} /></div>
                            <label style={{fontSize:'0.9em', cursor:'pointer'}}><input type="checkbox" checked={permitirPrint} onChange={e => setPermitirPrint(e.target.checked)} /> Permitir PDF</label>
                        </div>
                        <button onClick={actualizarConfiguracion} style={{width:'100%', marginBottom:'10px', background:'#28a745', color:'white', border:'none', padding:'10px', borderRadius:'5px', cursor:'pointer'}}>💾 Guardar Config</button>
                        <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                            <button onClick={() => handleImprimirAdmin('vacio')} style={{flex:1, padding:'8px', cursor:'pointer'}}>🖨️ Vacío</button>
                            <button onClick={() => handleImprimirAdmin('respuestas')} style={{flex:1, padding:'8px', cursor:'pointer'}}>🔑 Clave</button>
                        </div>
                        
                        {/* --- SECCIÓN CSV RESTAURADA --- */}
                        <div style={{borderTop:`1px solid ${styles.border}`, paddingTop:'15px'}}>
                            <h4 style={{margin:'0 0 5px 0', fontSize:'0.9rem'}}>Carga Masiva (CSV)</h4>
                            <label style={{display:'block', marginBottom:'5px', cursor:'pointer', background:'#6c757d', color:'white', textAlign:'center', padding:'8px', borderRadius:'4px', fontSize:'0.9rem'}}>
                            📥 Importar CSV <input type="file" accept=".csv" onChange={handleImportarCSV} style={{display:'none'}} />
                            </label>
                            <button onClick={handleExportarCSV} style={{width:'100%', background:'#17a2b8', color:'white', border:'none', padding:'8px', borderRadius:'4px', cursor:'pointer', fontSize:'0.9rem'}}>📤 Descargar Preguntas</button>
                        </div>
                        {/* ----------------------------- */}
                        
                    </div>
                )}
            </div>

            <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '300px' }}>
                <div style={{ background: styles.card, padding: '20px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
                    <h3 style={{marginTop:0}}>{modoEdicion ? '✏️ Editar Pregunta' : '➕ Agregar Pregunta Manual'}</h3>
                    {examenSeleccionado ? (
                        <form onSubmit={handleGuardarPregunta}>
                            <textarea placeholder="Enunciado de la pregunta..." value={pregunta.texto} onChange={e => setPregunta({...pregunta, texto: e.target.value})} style={{...inputStyle, width:'100%', marginBottom:'10px', resize:'vertical', minHeight:'70px'}} required />
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'10px'}}>
                                <input placeholder="Opción 1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} style={inputStyle} required/>
                                <input placeholder="Opción 2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} style={inputStyle} required/>
                                <input placeholder="Opción 3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} style={inputStyle} required/>
                                <input placeholder="Opción 4" value={pregunta.op4} onChange={e => setPregunta({...pregunta, op4: e.target.value})} style={inputStyle} required/>
                            </div>
                            <div style={{display:'flex', alignItems:'center', marginTop:'15px', justifyContent:'space-between', flexWrap:'wrap', gap:'10px'}}>
                                <label>Respuesta Correcta: <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})} style={{...inputStyle, marginLeft:'5px', width:'120px'}}><option value="op1">Opción 1</option><option value="op2">Opción 2</option><option value="op3">Opción 3</option><option value="op4">Opción 4</option></select></label>
                                <div style={{display:'flex', gap:'10px'}}>
                                    {modoEdicion && <button type="button" onClick={limpiarFormularioPregunta} style={{padding:'10px 15px', background:'#6c757d', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>Cancelar</button>}
                                    <button type="submit" style={{padding:'10px 25px', background: modoEdicion ? '#ffc107' : styles.accent, color: modoEdicion ? 'black' : 'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>{modoEdicion ? 'Actualizar' : 'Agregar'}</button>
                                </div>
                            </div>
                        </form>
                    ) : <p style={{color:'#666'}}>⬅️ Selecciona un examen primero.</p>}
                </div>

                {examenSeleccionado && (
                    <div style={{ background: styles.card, padding: '20px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom:`1px solid ${styles.border}`, paddingBottom:'10px'}}>
                            <h4 style={{margin:0}}>Banco de Preguntas ({totalPreguntasActuales()})</h4>
                            <select value={preguntasPorPagina} onChange={e => {setPreguntasPorPagina(parseInt(e.target.value)); setPaginaActual(1);}} style={{padding:'5px', fontSize:'0.9em'}}>
                                <option value="5">Ver 5</option><option value="10">Ver 10</option><option value="20">Ver 20</option>
                            </select>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            {obtenerPreguntasPaginadas().map((p, idx) => {
                                const indexReal = ((paginaActual - 1) * preguntasPorPagina) + idx;
                                return (
                                    <div key={idx} style={{background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius:'5px', padding:'10px', position:'relative'}}>
                                        <div style={{position:'absolute', top:'10px', right:'10px', display:'flex', gap:'5px'}}>
                                            <button onClick={() => seleccionarParaEditar(p, indexReal)} title="Editar" style={{cursor:'pointer', border:'none', background:'transparent', fontSize:'1.2em'}}>✏️</button>
                                            <button onClick={() => eliminarPregunta(indexReal)} title="Eliminar" style={{cursor:'pointer', border:'none', background:'transparent', fontSize:'1.2em'}}>🗑️</button>
                                        </div>
                                        <p style={{fontWeight:'bold', margin:'0 0 10px 0', paddingRight:'70px'}}>#{indexReal + 1}. {p.texto}</p>
                                        <div style={{fontSize:'0.9em', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'5px'}}>
                                            {p.opciones.map((op, i) => <div key={i} style={{padding:'5px 10px', borderRadius:'3px', background: op === p.correcta ? (temaActual==='oscuro'?'#1e4620':'#d4edda') : 'transparent', border: op === p.correcta ? '1px solid #c3e6cb' : `1px solid ${styles.border}`, color: op === p.correcta ? (temaActual==='oscuro'?'#fff':'#155724') : styles.text}}>{op === p.correcta ? '✅ ' : '⚪ '} {op}</div>)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {totalPreguntasActuales() > 0 && <div style={{display:'flex', justifyContent:'center', gap:'10px', marginTop:'20px'}}><button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} style={{cursor:'pointer', padding:'5px 10px'}}>◀ Anterior</button><span style={{alignSelf:'center'}}>{paginaActual} / {totalPaginas}</span><button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} style={{cursor:'pointer', padding:'5px 10px'}}>Siguiente ▶</button></div>}
                    </div>
                )}
            </div>
        </div>
      )}

      {vistaActual === 'resultados' && (
        <div className="fade-in">
            <div style={{ background: styles.card, padding: '15px', borderRadius: '8px', border: `1px solid ${styles.border}`, marginBottom: '15px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems:'flex-end' }}>
                <div style={{flex:'1 1 150px'}}><label style={{fontSize:'0.8em'}}>Por Examen:</label><select value={filtros.examenId} onChange={e => setFiltros({...filtros, examenId: e.target.value})} style={{...inputStyle, width:'100%'}}><option value="">Todos</option>{examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.nombreExamen ? ex.nombreExamen : ex.titulo}</option>)}</select></div>
                <div style={{flex:'1 1 120px'}}><label style={{fontSize:'0.8em'}}>Control:</label><input type="text" placeholder="..." value={filtros.numControl} onChange={e => setFiltros({...filtros, numControl: e.target.value})} style={{...inputStyle, width:'100%'}} /></div>
                <div style={{flex:'1 1 120px'}}><label style={{fontSize:'0.8em'}}>Unidad:</label><select value={filtros.unidad} onChange={e => setFiltros({...filtros, unidad: e.target.value})} style={{...inputStyle, width:'100%'}}><option value="">Todas</option>{UNIDADES_ACADEMICAS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                <button onClick={() => setFiltros({examenId:'', numControl:'', unidad:'', fechaInicio:'', fechaFin:'', estado:''})} style={{padding:'10px 15px', background:'#6c757d', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', height:'42px'}}>Limpiar</button>
                <button onClick={handleExportarResultados} style={{padding:'10px 15px', background:'#17a2b8', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', height:'42px', fontWeight:'bold', marginLeft:'auto'}}>📥 Reporte CSV</button>
            </div>
            <div style={{overflowX:'auto', borderRadius:'8px', border:`1px solid ${styles.border}`}}>
                <table style={{width:'100%', borderCollapse:'collapse', background:styles.card, color:styles.text}}>
                <thead><tr style={{background:styles.accent, color:'white'}}><th style={{padding:'12px'}}>Control</th><th style={{padding:'12px'}}>Nombre</th><th style={{padding:'12px'}}>Examen</th><th style={{padding:'12px'}}>Nota</th></tr></thead>
                <tbody>
                    {resultadosFiltrados.length > 0 ? resultadosFiltrados.map(r => (
                    <tr key={r.id} style={{borderBottom:`1px solid ${styles.border}`}}>
                        <td style={{padding:'8px', textAlign:'center'}}>{r.numControl}</td>
                        <td style={{padding:'8px'}}>{r.nombre}</td>
                        <td style={{padding:'8px'}}>{r.examenTitulo}</td>
                        <td style={{padding:'8px', textAlign:'center', fontWeight:'bold', color: r.calificacion >= 7 ? '#28a745' : '#dc3545'}}>{r.calificacion.toFixed(1)}</td>
                    </tr>
                    )) : <tr><td colSpan="4" style={{padding:'20px', textAlign:'center'}}>Sin resultados.</td></tr>}
                </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}