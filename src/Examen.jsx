import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import EncabezadoPDF from './EncabezadoPDF';

const UNIDADES_ACADEMICAS = ["Zongolica", "Tequila", "Nogales", "Acultzinapa", "Cuichapa", "Tezonapa", "Tehuipango"];

const THEMES = {
  claro: { bg: '#ffffff', text: '#333333', card: '#f8f9fa', border: '#ddd', inputBg: '#fff' },
  oscuro: { bg: '#121212', text: '#e0e0e0', card: '#1e1e1e', border: '#444', inputBg: '#2d2d2d' },
  calido: { bg: '#f5e6d3', text: '#4a3b2a', card: '#e8dcc5', border: '#d1c7b7', inputBg: '#fff8f0' }
};

export default function Examen() {
  const { id } = useParams();
  
  // Tema persistente
  const [temaActual, setTemaActual] = useState(() => localStorage.getItem('temaApp') || 'claro');
  const styles = THEMES[temaActual];
  useEffect(() => localStorage.setItem('temaApp', temaActual), [temaActual]);

  // Estados
  const [fase, setFase] = useState('registro');
  const [nombre, setNombre] = useState('');
  const [numControl, setNumControl] = useState('');
  const [unidad, setUnidad] = useState('');
  const [examenInfo, setExamenInfo] = useState(null);
  const [preguntasAleatorias, setPreguntasAleatorias] = useState([]);
  const [intentosRealizados, setIntentosRealizados] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [calificacion, setCalificacion] = useState(0);
  const [errorControl, setErrorControl] = useState('');

  // Regex estricto: 3 digitos + W + 4 digitos
  const regexControl = /^\d{3}[Ww]\d{4}$/;

  useEffect(() => {
    const cargar = async () => {
      try {
        const d = await getDoc(doc(db, "examenes", id));
        if(d.exists()) setExamenInfo(d.data());
      } catch (e) { console.error(e); }
    };
    cargar();
  }, [id]);

  const validarControl = (v) => {
    setNumControl(v.toUpperCase());
    setErrorControl(!regexControl.test(v) ? 'Formato inválido (Ej: 123W1041)' : '');
  };

  const iniciarExamen = async () => {
    if (!nombre || !numControl || !unidad || errorControl) return alert("Revisa datos");
    setFase('cargando');
    try {
      const q = query(collection(db, "resultados"), where("examenId", "==", id), where("numControl", "==", numControl.toUpperCase()));
      const snap = await getDocs(q);
      const intentos = snap.size;
      const maximos = examenInfo.intentosMaximos || 1;

      if (intentos >= maximos) { 
        setFase('bloqueado'); 
        setIntentosRealizados(intentos); 
        return; 
      }
      
      let banco = examenInfo.preguntas || [];
      const barajadas = [...banco].sort(() => 0.5 - Math.random());
      const limite = examenInfo.limite && examenInfo.limite > 0 ? examenInfo.limite : barajadas.length;
      setPreguntasAleatorias(barajadas.slice(0, limite));
      setFase('examen');
    } catch (e) { console.error(e); setFase('registro'); }
  };

  const enviarExamen = async () => {
    let aciertos = 0;
    preguntasAleatorias.forEach(p => { if (respuestas[p.texto] === p.correcta) aciertos++; });
    const nota = preguntasAleatorias.length > 0 ? (aciertos / preguntasAleatorias.length) * 10 : 0;
    setCalificacion(nota);
    
    try {
      await addDoc(collection(db, "resultados"), { 
        examenId: id, 
        examenTitulo: examenInfo.titulo, 
        nombre, 
        numControl, 
        unidad, 
        calificacion: nota, 
        fecha: new Date().toISOString() 
      });
      setFase('finalizado');
    } catch (e) { console.error(e); }
  };

  if (!examenInfo) return <div style={{padding:'20px'}}>Cargando...</div>;

  // --- VISTA FINALIZADO ---
  if (fase === 'finalizado') return (
    <div style={{ minHeight: '100vh', background: styles.bg, color: styles.text }}>
      
      {/* PANTALLA NO PRINT */}
      <div className="no-print" style={{ textAlign: 'center', padding: '50px' }}>
        <h1>¡Examen Enviado!</h1>
        <div style={{ fontSize: '4rem', color: styles.accent }}>{calificacion.toFixed(1)}</div>
        <p>Calificación Final</p>
        
        {examenInfo.permitirImpresion ? (
          <button 
            onClick={() => window.print()}
            style={{ padding: '15px 30px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2em', cursor: 'pointer', marginTop: '20px' }}
          >
            📄 Descargar/Imprimir PDF
          </button>
        ) : (
          <p style={{fontStyle:'italic', color:'#888'}}>La impresión de resultados está desactivada.</p>
        )}
        <br/><br/>
        <Link to="/" style={{ color: styles.text }}>Volver al Inicio</Link>
      </div>

      {/* HOJA IMPRESION (PDF) */}
      <div className="hoja-examen">
        <EncabezadoPDF 
          // Pasamos los datos del examen
          asignatura={examenInfo.titulo} 
          unidad={examenInfo.unidad}
          tema={examenInfo.tema}
          opcion={examenInfo.opcion}
          // Pasamos los datos del alumno
          alumnoNombre={nombre} 
          numControl={numControl} 
          unidadAcademica={unidad} 
          calificacion={calificacion}
          fecha={new Date().toISOString()} 
        />
        
        <h3>Detalle de Resultados:</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ textAlign: 'left', padding: '5px', border:'1px solid black' }}>#</th>
              <th style={{ textAlign: 'left', padding: '5px', border:'1px solid black' }}>Pregunta</th>
              <th style={{ textAlign: 'left', padding: '5px', border:'1px solid black' }}>Tu Respuesta</th>
              <th style={{ textAlign: 'left', padding: '5px', border:'1px solid black' }}>Correcta</th>
            </tr>
          </thead>
          <tbody>
            {preguntasAleatorias.map((p, idx) => {
              const esCorrecta = respuestas[p.texto] === p.correcta;
              return (
                <tr key={idx}>
                  <td style={{ padding: '5px', border:'1px solid black' }}>{idx + 1}</td>
                  <td style={{ padding: '5px', border:'1px solid black' }}>{p.texto}</td>
                  <td style={{ padding: '5px', border:'1px solid black', color: esCorrecta ? 'black' : 'red', fontWeight: esCorrecta ? 'normal' : 'bold' }}>
                    {respuestas[p.texto] || '(Sin responder)'}
                  </td>
                  <td style={{ padding: '5px', border:'1px solid black' }}>{p.correcta}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ marginTop: '60px', textAlign: 'center', width: '100%' }}>
          <div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>
            Firma del Alumno
          </div>
        </div>
      </div>
    </div>
  );

  // VISTAS NORMALES
  if(fase === 'bloqueado') return (
    <div style={{padding:'50px', textAlign:'center', color:'red'}}>
      <h2>Acceso Denegado</h2>
      <p>Intentos agotados.</p>
      <Link to="/">Volver</Link>
    </div>
  );
  
  const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: `1px solid ${styles.border}`, background: styles.inputBg, color: styles.text };

  if(fase === 'examen') return (
    <div className="no-print" style={{ background: styles.bg, color: styles.text, minHeight:'100vh', padding:'20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth:'800px', margin:'0 auto' }}>
        <h2>{examenInfo.titulo}</h2>
        <span>{numControl}</span>
      </div>
      <div style={{ maxWidth:'800px', margin:'0 auto' }}>
       {preguntasAleatorias.map((p,i) => (
         <div key={i} style={{marginBottom:'15px', padding:'15px', background:styles.card, border:`1px solid ${styles.border}`, borderRadius:'8px'}}>
           <p><strong>{i+1}. {p.texto}</strong></p>
           {p.opciones.map((op, idx) => (
             <label key={idx} style={{display:'block', padding:'8px', cursor:'pointer', background: respuestas[p.texto] === op ? (temaActual==='oscuro'?'#333':'#e7f1ff') : 'transparent'}}>
               <input type="radio" name={p.texto} onChange={() => setRespuestas({...respuestas, [p.texto]:op})} style={{marginRight:'10px'}}/> {op}
             </label>
           ))}
         </div>
       ))}
       <button onClick={enviarExamen} style={{width:'100%', padding:'15px', background:'#28a745', color:'white', border:'none', fontSize:'1.1em', borderRadius:'5px', cursor:'pointer'}}>Finalizar y Enviar</button>
      </div>
    </div>
  );

  // VISTA REGISTRO
  return (
    <div className="no-print" style={{padding:'40px', background:styles.bg, color:styles.text, minHeight:'100vh', display:'flex', justifyContent:'center'}}>
       <div style={{width:'100%', maxWidth:'500px'}}>
         <h1 style={{textAlign:'center'}}>{examenInfo.titulo}</h1>
         <div style={{background:styles.card, padding:'25px', border:`1px solid ${styles.border}`, borderRadius:'10px'}}>
           <label>Nombre:</label>
           <input value={nombre} onChange={e=>setNombre(e.target.value)} style={inputStyle}/>
           <label>No. Control:</label>
           <input value={numControl} maxLength={8} placeholder="Ej: 123W1041" onChange={e=>validarControl(e.target.value)} style={{...inputStyle, border: errorControl ? '2px solid red' : inputStyle.border}}/>
           {errorControl && <small style={{color:'red', display:'block', marginTop:'-10px', marginBottom:'10px'}}>{errorControl}</small>}
           <label>Unidad Académica:</label>
           <select value={unidad} onChange={e=>setUnidad(e.target.value)} style={inputStyle}>
             <option value="">-- Selecciona --</option>{UNIDADES_ACADEMICAS.map(u=><option key={u} value={u}>{u}</option>)}
           </select>
           <button onClick={iniciarExamen} disabled={!nombre || !unidad || !!errorControl || fase==='cargando'} style={{width:'100%', padding:'12px', background:'#007bff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', marginTop:'10px'}}>
             {fase==='cargando' ? 'Verificando...' : 'Comenzar'}
           </button>
         </div>
         <div style={{textAlign:'center', marginTop:'20px'}}>
            <Link to="/" style={{color:styles.text}}>Cancelar</Link>
         </div>
       </div>
    </div>
  );
}