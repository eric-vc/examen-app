import { useEffect, useState, useMemo } from 'react';
import { db, auth } from './firebase'; // IMPORTAMOS AUTH
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'; // FUNCIONES DE AUTH
import { collection, getDocs, orderBy, query, addDoc, doc, updateDoc, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';
import EncabezadoPDF from './EncabezadoPDF';

const THEMES = {
  claro: { bg: '#ffffff', text: '#333333', card: '#f9f9f9', border: '#dddddd', accent: '#007bff', inputBg: '#fff' },
  oscuro: { bg: '#1e1e1e', text: '#e0e0e0', card: '#2d2d2d', border: '#444444', accent: '#4dabf7', inputBg: '#333' },
  calido: { bg: '#f5e6d3', text: '#4a3b2a', card: '#e8dcc5', border: '#d1c7b7', accent: '#a67c52', inputBg: '#fff8f0' }
};

const UNIDADES_ACADEMICAS = ["Zongolica", "Tequila", "Nogales", "Acultzinapa", "Cuichapa", "Tezonapa", "Tehuipango"];

export default function PanelProfesor() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [usuario, setUsuario] = useState(null); // Objeto usuario de Firebase
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  
  const [temaActual, setTemaActual] = useState(() => localStorage.getItem('temaApp') || 'claro');
  const styles = THEMES[temaActual];

  // Datos
  const [examenes, setExamenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  
  // Estados Visibilidad
  const [verResultados, setVerResultados] = useState(false);
  const [cargandoResultados, setCargandoResultados] = useState(false);

  // Estados Creación
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [nuevoTema, setNuevoTema] = useState('');
  const [nuevaOpcion, setNuevaOpcion] = useState('1ra'); 
  const [nuevoIntentos, setNuevoIntentos] = useState(1);
  
  // Estados Gestión
  const [examenSeleccionado, setExamenSeleccionado] = useState(''); 
  const [limiteConfig, setLimiteConfig] = useState(0); 
  const [intentosEdit, setIntentosEdit] = useState(1);
  const [permitirPrint, setPermitirPrint] = useState(false); 
  
  // Estados Pregunta
  const [pregunta, setPregunta] = useState({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });
  const [modoEdicion, setModoEdicion] = useState(false); 
  const [indiceEdicion, setIndiceEdicion] = useState(null); 
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [preguntasPorPagina, setPreguntasPorPagina] = useState(5);

  // Filtros
  const [filtros, setFiltros] = useState({ examenId: '', numControl: '', unidad: '', fechaInicio: '', fechaFin: '', estado: '' });
  
  // Impresión
  const [modoImpresion, setModoImpresion] = useState(null);

  useEffect(() => localStorage.setItem('temaApp', temaActual), [temaActual]);

  // --- EFECTO DE SESIÓN (PERSISTENCIA) ---
  useEffect(() => {
    // Esto revisa si ya estabas logueado al recargar la página
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuario(user);
        cargarExamenes(); // Cargar datos al detectar login
      } else {
        setUsuario(null);
        setExamenes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- LOGIN SEGURO CON FIREBASE ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // No necesitamos setUsuario aquí, el onAuthStateChanged lo hará
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setErrorLogin('Correo o contraseña incorrectos.');
      } else if (error.code === 'auth/too-many-requests') {
        setErrorLogin('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setErrorLogin('Error al iniciar sesión: ' + error.message);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setVerResultados(false);
  };

  // --- CARGAS DE DATOS ---
  const cargarExamenes = async () => {
    const exSnap = await getDocs(collection(db, "examenes"));
    setExamenes(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarResultados = async () => {
    setCargandoResultados(true);
    try {
      const resQ = query(collection(db, "resultados"), orderBy("fecha", "desc"));
      const resSnap = await getDocs(resQ);
      setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setVerResultados(true);
    } catch (error) { console.error(error); } 
    finally { setCargandoResultados(false); }
  };

  useEffect(() => {
    if (examenSeleccionado) {
      const ex = examenes.find(e => e.id === examenSeleccionado);
      if (ex) {
        setLimiteConfig(ex.limite || ex.preguntas?.length || 0);
        setIntentosEdit(ex.intentosMaximos || 1);
        setPermitirPrint(ex.permitirImpresion || false);
        setPaginaActual(1);
        setModoEdicion(false); setIndiceEdicion(null); setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });
      }
    }
  }, [examenSeleccionado, examenes]);

  // Filtros
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

  // --- LÓGICA DE PAGINACIÓN ---
  const obtenerPreguntasPaginadas = () => {
    const ex = examenes.find(e => e.id === examenSeleccionado);
    if (!ex || !ex.preguntas) return [];
    const indiceUltimo = paginaActual * preguntasPorPagina;
    const indicePrimero = indiceUltimo - preguntasPorPagina;
    return ex.preguntas.slice(indicePrimero, indiceUltimo);
  };

  const totalPreguntasActuales = () => {
    const ex = examenes.find(e => e.id === examenSeleccionado);
    return ex?.preguntas?.length || 0;
  };
  const totalPaginas = Math.ceil(totalPreguntasActuales() / preguntasPorPagina);

  // --- FUNCIONES GESTIÓN ---
  const crearExamen = async () => {
    if (!nuevoTitulo || !nuevaUnidad || !nuevoTema) return alert("Faltan datos");
    try {
      await addDoc(collection(db, "examenes"), { 
        titulo: nuevoTitulo, unidad: nuevaUnidad, tema: nuevoTema, opcion: nuevaOpcion,
        preguntas: [], limite: 0, intentosMaximos: parseInt(nuevoIntentos), permitirImpresion: false 
      });
      setNuevoTitulo(''); setNuevaUnidad(''); setNuevoTema(''); setNuevaOpcion('1ra'); setNuevoIntentos(1); 
      cargarExamenes(); alert("Examen creado");
    } catch (e) { console.error(e); }
  };

  const handleGuardarPregunta = async (e) => {
    e.preventDefault();
    if (!examenSeleccionado) return;
    const preguntaObj = { texto: pregunta.texto, opciones: [pregunta.op1, pregunta.op2, pregunta.op3, pregunta.op4], correcta: pregunta[pregunta.correcta] };
    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      if (modoEdicion && indiceEdicion !== null) {
        const exSnapshot = await getDoc(examenRef);
        const exData = exSnapshot.data();
        const nuevasPreguntas = [...exData.preguntas];
        nuevasPreguntas[indiceEdicion] = preguntaObj;
        await updateDoc(examenRef, { preguntas: nuevasPreguntas });
        alert("Actualizada");
      } else {
        await updateDoc(examenRef, { preguntas: arrayUnion(preguntaObj) });
        alert("Agregada");
      }
      setModoEdicion(false); setIndiceEdicion(null); setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });
      cargarExamenes();
    } catch (e) { console.error(e); alert("Error"); }
  };

  const seleccionarParaEditar = (p, indexReal) => {
    let correctaKey = 'op1';
    if (p.correcta === p.opciones[1]) correctaKey = 'op2';
    if (p.correcta === p.opciones[2]) correctaKey = 'op3';
    if (p.correcta === p.opciones[3]) correctaKey = 'op4';
    setPregunta({ texto: p.texto, op1: p.opciones[0], op2: p.opciones[1], op3: p.opciones[2], op4: p.opciones[3], correcta: correctaKey });
    setModoEdicion(true); setIndiceEdicion(indexReal); window.scrollTo(0,0);
  };

  const eliminarPregunta = async (indexReal) => {
    if(!window.confirm("¿Eliminar pregunta?")) return;
    try {
      const examenRef = doc(db, "examenes", examenSeleccionado);
      const exSnapshot = await getDoc(examenRef);
      const nuevas = exSnapshot.data().preguntas.filter((_, i) => i !== indexReal);
      await updateDoc(examenRef, { preguntas: nuevas });
      cargarExamenes();
    } catch(e) { console.error(e); }
  };

  const actualizarConfiguracion = async () => {
    if (!examenSeleccionado) return;
    try {
      const ref = doc(db, "examenes", examenSeleccionado);
      await updateDoc(ref, { limite: parseInt(limiteConfig), intentosMaximos: parseInt(intentosEdit), permitirImpresion: permitirPrint });
      alert("Guardado"); cargarExamenes();
    } catch (e) { console.error(e); }
  };

  const eliminarResultado = async (id) => {
    if(!window.confirm("¿Eliminar resultado?")) return;
    try { await deleteDoc(doc(db, "resultados", id)); cargarResultados(); } catch (e) { console.error(e); }
  };

  const handleImprimirAdmin = (modo) => { setModoImpresion(modo); setTimeout(() => { window.print(); }, 500); };

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
          alert(`Importadas: ${nuevasPreguntas.length}`);
          cargarExamenes();
        } catch (error) { alert("Error Firebase"); }
      } else { alert("Error CSV"); }
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
    link.setAttribute("download", `${ex.titulo}_preguntas.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportarResultados = () => {
    if (resultadosFiltrados.length === 0) return alert("No hay resultados.");
    let csvContent = "data:text/csv;charset=utf-8,Control,Nombre,Unidad,Examen,Calificacion,Fecha\n";
    resultadosFiltrados.forEach(r => {
      const clean = (txt) => txt ? `"${txt.toString().replace(/"/g, '""')}"` : "";
      csvContent += [clean(r.numControl), clean(r.nombre), clean(r.unidad), clean(r.examenTitulo), r.calificacion.toFixed(2), new Date(r.fecha).toLocaleDateString()].join(",") + "\n";
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Reporte_Calificaciones.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // VISTA IMPRESIÓN
  if (modoImpresion && examenSeleccionado) {
    const ex = examenes.find(e => e.id === examenSeleccionado);
    return (
      <div className="hoja-examen">
        <div className="no-print" style={{ position: 'fixed', top: 10, right: 10, background:'white', padding:'10px', border:'1px solid black', zIndex:9999 }}>
          <button onClick={() => setModoImpresion(null)} style={{cursor:'pointer'}}>❌ Cerrar</button>
        </div>
        <EncabezadoPDF asignatura={ex.titulo} unidad={ex.unidad} tema={ex.tema} opcion={ex.opcion} alumnoNombre={null} numControl={null} unidadAcademica={null} calificacion={null} fecha={null} />
        <h3 style={{ textAlign: 'center', marginTop: '20px', textTransform: 'uppercase' }}>{modoImpresion === 'respuestas' ? 'CLAVE DE RESPUESTAS' : 'CUESTIONARIO'}</h3>
        {ex.preguntas && ex.preguntas.map((p, idx) => (
          <div key={idx} style={{ marginBottom: '10px', padding:'5px', breakInside: 'avoid' }}>
            <p style={{ fontWeight: 'bold', margin:'5px 0' }}>{idx + 1}. {p.texto}</p>
            {modoImpresion === 'vacio' && <div style={{ marginLeft: '20px' }}>{p.opciones.map((op, i) => <div key={i}>⭕ {op}</div>)}</div>}
            {modoImpresion === 'respuestas' && <div style={{ marginLeft: '20px', fontWeight: 'bold' }}>✅ {p.correcta}</div>}
          </div>
        ))}
        <div style={{ marginTop: '50px', textAlign: 'center', width: '100%' }}><div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>Firma del Docente</div></div>
      </div>
    );
  }

  const inputStyle = { padding: '8px', borderRadius: '4px', border: `1px solid ${styles.border}`, background: styles.inputBg, color: styles.text };

  // --- VISTA LOGIN (NUEVA CON FIREBASE AUTH) ---
  if (!usuario) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: styles.bg, color: styles.text }}>
      <div style={{ padding: '40px', background: styles.card, borderRadius: '10px', border: `1px solid ${styles.border}`, maxWidth:'350px', width:'100%' }}>
        <h2 style={{textAlign:'center'}}>Acceso ITSZ</h2>
        <p style={{textAlign:'center', fontSize:'0.9em', color:'#666', marginBottom:'20px'}}>Ingresa tus credenciales institucionales</p>
        
        <form onSubmit={handleLogin}>
            <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                style={{...inputStyle, marginBottom:'10px', width:'100%'}} 
                required
            />
            <input 
                type="password" 
                placeholder="Contraseña" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                style={{...inputStyle, marginBottom:'15px', width:'100%'}} 
                required
            />
            
            {errorLogin && <p style={{color:'red', fontSize:'0.8em', textAlign:'center', marginBottom:'10px'}}>{errorLogin}</p>}
            
            <button type="submit" style={{width:'100%', padding:'10px', background: styles.accent, color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                Iniciar Sesión
            </button>
        </form>
      </div>
    </div>
  );

  // VISTA PRINCIPAL
  return (
    <div className="no-print" style={{ minHeight: '100vh', backgroundColor: styles.bg, color: styles.text, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Panel Admin ITSZ</h1>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setTemaActual('claro')}>🌞</button>
            <button onClick={() => setTemaActual('oscuro')}>🌙</button>
            {/* BOTÓN SALIR */}
            <button onClick={handleLogout} style={{background:'#dc3545', color:'white', border:'none', borderRadius:'4px', padding:'0 15px', cursor:'pointer'}}>Salir</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        
        {/* COL IZQUIERDA */}
        <div style={{ background: styles.card, padding: '15px', borderRadius: '8px', border: `1px solid ${styles.border}`, alignSelf: 'start' }}>
           <h3>1. Crear Examen</h3>
           <label style={{fontSize:'0.9em'}}>Asignatura:</label>
           <input value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} style={{...inputStyle, width:'100%', marginBottom:'5px'}} />
           <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', marginBottom:'5px'}}>
             <div><label style={{fontSize:'0.9em'}}>Unidad:</label><input value={nuevaUnidad} onChange={e => setNuevaUnidad(e.target.value)} style={{...inputStyle, width:'100%'}} /></div>
             <div><label style={{fontSize:'0.9em'}}>Tema:</label><input value={nuevoTema} onChange={e => setNuevoTema(e.target.value)} style={{...inputStyle, width:'100%'}} /></div>
           </div>
           <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
             <div style={{flexGrow:1}}><label style={{fontSize:'0.9em'}}>Opción:</label><select value={nuevaOpcion} onChange={e => setNuevaOpcion(e.target.value)} style={{...inputStyle, width:'100%'}}><option value="diagnostico">Diagnóstico</option><option value="1ra">1ª Oportunidad</option><option value="2da">2ª Oportunidad</option></select></div>
             <div><label style={{fontSize:'0.9em'}}>Intentos:</label><input type="number" value={nuevoIntentos} onChange={e => setNuevoIntentos(e.target.value)} style={{...inputStyle, width:'60px'}} min="1"/></div>
           </div>
           <button onClick={crearExamen} style={{width:'100%', background:styles.accent, color:'white', border:'none', padding:'8px', borderRadius:'4px'}}>Crear</button>
           <hr style={{margin:'20px 0'}}/>
           <h3>2. Configurar</h3>
           <select value={examenSeleccionado} onChange={e => setExamenSeleccionado(e.target.value)} style={{...inputStyle, width:'100%', marginBottom:'10px'}}>
             <option value="">-- Selecciona Examen --</option>{examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.titulo}</option>)}
           </select>
           {examenSeleccionado && (
             <div style={{animation: 'fadeIn 0.5s'}}>
               <div style={{marginBottom:'10px', background:'#e9ecef', padding:'10px', borderRadius:'5px'}}>
                 <label style={{display:'block', fontWeight:'bold', fontSize:'0.9em', color:'#333'}}>Preguntas Aleatorias:</label>
                 <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                    <input type="number" value={limiteConfig} onChange={e => setLimiteConfig(e.target.value)} style={{...inputStyle, width:'70px', borderColor:'#007bff'}} />
                    <span style={{fontSize:'0.8em', color:'#666'}}>(0 = Todas)</span>
                 </div>
               </div>
               <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                 <div><label style={{fontSize:'0.9em'}}>Intentos:</label><input type="number" value={intentosEdit} onChange={e => setIntentosEdit(e.target.value)} style={{...inputStyle, width:'100%'}} /></div>
                 <div style={{display:'flex', alignItems:'end'}}><label style={{fontSize:'0.9em', cursor:'pointer'}}><input type="checkbox" checked={permitirPrint} onChange={e => setPermitirPrint(e.target.checked)} /> Permitir PDF</label></div>
               </div>
               <button onClick={actualizarConfiguracion} style={{width:'100%', margin:'5px 0', background:'#28a745', color:'white', border:'none', padding:'8px'}}>💾 Guardar</button>
               <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                 <button onClick={() => handleImprimirAdmin('vacio')} style={{width:'50%'}}>🖨️ Vacío</button>
                 <button onClick={() => handleImprimirAdmin('respuestas')} style={{width:'50%'}}>🔑 Clave</button>
               </div>
               <div style={{borderTop:`1px solid ${styles.border}`, paddingTop:'10px', marginTop:'10px'}}>
                 <h4 style={{margin:'0 0 5px 0'}}>CSV</h4>
                 <label style={{display:'block', marginBottom:'5px', cursor:'pointer', background:'#6c757d', color:'white', textAlign:'center', padding:'5px', borderRadius:'4px'}}>
                   📥 Importar CSV <input type="file" accept=".csv" onChange={handleImportarCSV} style={{display:'none'}} />
                 </label>
                 <button onClick={handleExportarCSV} style={{width:'100%', background:'#17a2b8', color:'white', border:'none', padding:'5px', borderRadius:'4px'}}>📤 Descargar CSV</button>
               </div>
             </div>
           )}
        </div>

        {/* COL DERECHA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: styles.card, padding: '15px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
            <h3>{modoEdicion ? '✏️ Editar Pregunta' : '➕ Agregar Pregunta Manual'}</h3>
            {examenSeleccionado ? (
                <form onSubmit={handleGuardarPregunta}>
                <textarea placeholder="Enunciado..." value={pregunta.texto} onChange={e => setPregunta({...pregunta, texto: e.target.value})} style={{...inputStyle, width:'100%', marginBottom:'5px', resize:'vertical', minHeight:'60px'}} required />
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                    <input placeholder="Opción 1" value={pregunta.op1} onChange={e => setPregunta({...pregunta, op1: e.target.value})} style={inputStyle} required/>
                    <input placeholder="Opción 2" value={pregunta.op2} onChange={e => setPregunta({...pregunta, op2: e.target.value})} style={inputStyle} required/>
                    <input placeholder="Opción 3" value={pregunta.op3} onChange={e => setPregunta({...pregunta, op3: e.target.value})} style={inputStyle} required/>
                    <input placeholder="Opción 4" value={pregunta.op4} onChange={e => setPregunta({...pregunta, op4: e.target.value})} style={inputStyle} required/>
                </div>
                <div style={{display:'flex', alignItems:'center', marginTop:'10px', justifyContent:'space-between'}}>
                    <label>Correcta: <select value={pregunta.correcta} onChange={e => setPregunta({...pregunta, correcta: e.target.value})} style={{...inputStyle, marginLeft:'5px', width:'100px'}}><option value="op1">Op1</option><option value="op2">Op2</option><option value="op3">Op3</option><option value="op4">Op4</option></select></label>
                    <div>
                        {modoEdicion && <button type="button" onClick={() => {setModoEdicion(false); setIndiceEdicion(null); setPregunta({ texto: '', op1: '', op2: '', op3: '', op4: '', correcta: 'op1' });}} style={{marginRight:'10px'}}>Cancelar</button>}
                        <button type="submit" style={{padding:'8px 25px', background: modoEdicion ? '#ffc107' : '#28a745', color: modoEdicion ? 'black' : 'white', border:'none', borderRadius:'4px', fontWeight:'bold'}}>{modoEdicion ? 'Actualizar' : 'Agregar'}</button>
                    </div>
                </div>
                </form>
            ) : <p style={{color:'#666'}}>⬅️ Selecciona un examen.</p>}
            </div>

            {examenSeleccionado && (
                <div style={{ background: styles.card, padding: '15px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', borderBottom:`1px solid ${styles.border}`, paddingBottom:'10px'}}>
                        <h4 style={{margin:0}}>Preguntas ({totalPreguntasActuales()})</h4>
                        <select value={preguntasPorPagina} onChange={e => {setPreguntasPorPagina(parseInt(e.target.value)); setPaginaActual(1);}} style={{padding:'2px', fontSize:'0.8em'}}>
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
                                    <p style={{fontWeight:'bold', margin:'0 0 5px 0', paddingRight:'60px'}}>#{indexReal + 1}. {p.texto}</p>
                                    <div style={{fontSize:'0.9em', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                                        {p.opciones.map((op, i) => <div key={i} style={{padding:'3px 8px', borderRadius:'3px', background: op === p.correcta ? '#d4edda' : '#f8f9fa', border: op === p.correcta ? '1px solid #c3e6cb' : '1px solid #eee', color: op === p.correcta ? '#155724' : '#666'}}>{op === p.correcta ? '✅ ' : '⚪ '} {op}</div>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {totalPreguntasActuales() > 0 && <div style={{display:'flex', justifyContent:'center', gap:'10px', marginTop:'15px'}}><button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>◀</button><span>{paginaActual} / {totalPaginas}</span><button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>▶</button></div>}
                </div>
            )}
        </div>
      </div>

      <h3 style={{marginTop:'30px', borderBottom:`2px solid ${styles.accent}`}}>Resultados</h3>
      <div style={{ margin: '20px 0' }}>
        {!verResultados ? (
            <button onClick={cargarResultados} disabled={cargandoResultados} style={{ padding: '15px 30px', fontSize: '1.2em', background: styles.accent, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {cargandoResultados ? '⏳ Cargando...' : '👁️ Mostrar Resultados'}
            </button>
        ) : (
            <button onClick={() => { setVerResultados(false); setResultados([]); }} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>❌ Cerrar</button>
        )}
      </div>

      {verResultados && (
        <div className="fade-in">
            {/* --- FILTROS Y EXPORTACIÓN --- */}
            <div style={{ background: styles.card, padding: '15px', borderRadius: '8px', border: `1px solid ${styles.border}`, marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems:'flex-end' }}>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.8em'}}>Por Examen:</label>
                    <select value={filtros.examenId} onChange={e => setFiltros({...filtros, examenId: e.target.value})} style={inputStyle}>
                        <option value="">Todos</option>{examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.titulo}</option>)}
                    </select>
                </div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:'0.8em'}}>Control:</label><input type="text" placeholder="Buscar..." value={filtros.numControl} onChange={e => setFiltros({...filtros, numControl: e.target.value})} style={inputStyle} /></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:'0.8em'}}>Unidad:</label><select value={filtros.unidad} onChange={e => setFiltros({...filtros, unidad: e.target.value})} style={inputStyle}><option value="">Todas</option>{UNIDADES_ACADEMICAS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:'0.8em'}}>Desde:</label><input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} style={inputStyle} /></div>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.8em'}}>Estado:</label>
                    <select value={filtros.estado} onChange={e => setFiltros({...filtros, estado: e.target.value})} style={inputStyle}>
                        <option value="">Todos</option><option value="aprobado">Aprobados</option><option value="reprobado">Reprobados</option>
                    </select>
                </div>
                <button onClick={() => setFiltros({examenId:'', numControl:'', unidad:'', fechaInicio:'', fechaFin:'', estado:''})} style={{padding:'8px', background:'#6c757d', color:'white', border:'none', borderRadius:'4px', height:'40px'}}>Limpiar</button>
                
                {/* BOTÓN DESCARGAR REPORTE */}
                <button onClick={handleExportarResultados} style={{padding:'8px 15px', background:'#17a2b8', color:'white', border:'none', borderRadius:'4px', height:'40px', fontWeight:'bold', marginLeft:'auto'}}>
                    📥 Descargar Reporte
                </button>
            </div>

            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', background:styles.card, color:styles.text}}>
                <thead><tr style={{background:styles.accent, color:'white'}}><th style={{padding:'5px'}}>#</th><th>Control</th><th>Nombre</th><th>Unidad</th><th>Examen</th><th>Nota</th><th>Fecha</th></tr></thead>
                <tbody>
                    {resultadosFiltrados.length > 0 ? resultadosFiltrados.map((r, i) => (
                    <tr key={r.id} style={{borderBottom:`1px solid ${styles.border}`}}>
                        <td style={{textAlign:'center'}}>{i+1}</td>
                        <td style={{padding:'5px'}}>{r.numControl}</td>
                        <td style={{padding:'5px'}}>{r.nombre}</td>
                        <td style={{padding:'5px'}}>{r.unidad}</td>
                        <td style={{padding:'5px'}}>{r.examenTitulo}</td>
                        <td style={{padding:'5px', fontWeight:'bold', color: r.calificacion >= 7 ? 'green' : 'red'}}>{r.calificacion.toFixed(1)}</td>
                        <td style={{padding:'5px', fontSize:'0.9em'}}>{new Date(r.fecha).toLocaleDateString()}</td>
                    </tr>
                    )) : <tr><td colSpan="7" style={{padding:'20px', textAlign:'center'}}>Sin resultados.</td></tr>}
                </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}