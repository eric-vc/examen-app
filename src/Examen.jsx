import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const UNIDADES = ["Zongolica", "Tequila", "Nogales", "Acultzinapa", "Cuichapa", "Tezonapa", "Tehuipango"];

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

  const [fase, setFase] = useState('registro');
  const [nombre, setNombre] = useState('');
  const [numControl, setNumControl] = useState('');
  const [unidad, setUnidad] = useState('');
  const [errorControl, setErrorControl] = useState('');

  const [examenInfo, setExamenInfo] = useState(null);
  const [preguntasAleatorias, setPreguntasAleatorias] = useState([]);
  const [intentosRealizados, setIntentosRealizados] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [calificacion, setCalificacion] = useState(0);

  // --- NUEVO REGEX: 3 dígitos + W + 4 dígitos ---
  const regexControl = /^\d{3}[Ww]\d{4}$/;

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const docSnap = await getDoc(doc(db, "examenes", id));
        if (docSnap.exists()) setExamenInfo(docSnap.data());
      } catch (error) { console.error(error); }
    };
    cargarExamen();
  }, [id]);

  const validarControl = (valor) => {
    setNumControl(valor.toUpperCase());
    if (!regexControl.test(valor)) setErrorControl('Formato requerido: 3 dígitos + W + 4 dígitos (Ej: 123W1041)');
    else setErrorControl('');
  };

  const iniciarExamen = async () => {
    if (!nombre || !numControl || !unidad || errorControl) return alert("Verifica tus datos");
    setFase('cargando');
    try {
      const q = query(collection(db, "resultados"), where("examenId", "==", id), where("numControl", "==", numControl.toUpperCase()));
      const snap = await getDocs(q);
      const intentosHechos = snap.size;
      setIntentosRealizados(intentosHechos);
      const maximos = examenInfo.intentosMaximos || 1;

      if (intentosHechos >= maximos) {
        setFase('bloqueado');
        return;
      }
      let banco = examenInfo.preguntas || [];
      const barajadas = [...banco].sort(() => 0.5 - Math.random());
      const limite = examenInfo.limite && examenInfo.limite > 0 ? examenInfo.limite : barajadas.length;
      setPreguntasAleatorias(barajadas.slice(0, limite));
      setFase('examen');
    } catch (error) {
      console.error(error);
      setFase('registro');
    }
  };

  const enviarExamen = async () => {
    let aciertos = 0;
    preguntasAleatorias.forEach((p) => { if (respuestas[p.texto] === p.correcta) aciertos++; });
    const notaFinal = preguntasAleatorias.length > 0 ? (aciertos / preguntasAleatorias.length) * 10 : 0;
    setCalificacion(notaFinal);
    try {
      await addDoc(collection(db, "resultados"), {
        examenId: id, examenTitulo: examenInfo.titulo, nombre, numControl, unidad, calificacion: notaFinal, fecha: new Date().toISOString()
      });
      setFase('finalizado');
    } catch (error) { console.error(error); }
  };

  if (!examenInfo) return <div style={{textAlign: 'center', marginTop: '50px', color: styles.text}}>Cargando...</div>;

  // Renderizado Común para Inputs
  const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: `1px solid ${styles.border}`, background: styles.inputBg, color: styles.text };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: styles.bg, color: styles.text, transition: 'all 0.3s', padding: '20px' }}>
      
      {/* Selector de Tema Flotante */}
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '5px' }}>
        <button onClick={() => setTemaActual('claro')}>🌞</button>
        <button onClick={() => setTemaActual('oscuro')}>🌙</button>
        <button onClick={() => setTemaActual('calido')}>☕</button>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '40px' }}>
        
        {fase === 'bloqueado' && (
          <div style={{ textAlign: 'center', border: '2px solid red', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{color: 'red'}}>🚫 Acceso Denegado</h2>
            <p>Has agotado tus {examenInfo.intentosMaximos || 1} intentos.</p>
            <Link to="/" style={{color: styles.text}}>Volver</Link>
          </div>
        )}

        {fase === 'finalizado' && (
          <div style={{ textAlign: 'center' }}>
            <h1>¡Examen Entregado!</h1>
            <div style={{ fontSize: '4rem', color: '#007bff' }}>{calificacion.toFixed(1)}</div>
            <Link to="/" style={{color: styles.text}}>Volver al inicio</Link>
          </div>
        )}

        {(fase === 'registro' || fase === 'cargando') && (
          <>
            <h1>{examenInfo.titulo}</h1>
            <div style={{ background: styles.card, padding: '20px', borderRadius: '8px', border: `1px solid ${styles.border}` }}>
              <h3>Datos del Estudiante</h3>
              <input type="text" placeholder="Nombre Completo" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
              <input type="text" placeholder="No. Control (Ej: 123W1041)" value={numControl} onChange={e => validarControl(e.target.value)} maxLength={8} style={{...inputStyle, border: errorControl ? '2px solid red' : inputStyle.border}} />
              {errorControl && <small style={{color:'red', display:'block', marginBottom:'10px'}}>{errorControl}</small>}
              <select value={unidad} onChange={e => setUnidad(e.target.value)} style={inputStyle}>
                <option value="">-- Unidad Académica --</option>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button onClick={iniciarExamen} disabled={!nombre || !numControl || !unidad || !!errorControl || fase==='cargando'} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                {fase === 'cargando' ? 'Cargando...' : 'Comenzar Examen'}
              </button>
            </div>
          </>
        )}

        {fase === 'examen' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>{examenInfo.titulo}</h2>
              <span>{numControl}</span>
            </div>
            {preguntasAleatorias.map((p, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '20px', background: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px' }}>
                <p><strong>{index + 1}. {p.texto}</strong></p>
                {p.opciones.map((opt, i) => (
                  <label key={i} style={{ display: 'block', padding: '8px', cursor: 'pointer', background: respuestas[p.texto] === opt ? (temaActual === 'oscuro' ? '#333' : '#e7f1ff') : 'transparent' }}>
                    <input type="radio" name={`p-${p.texto}`} value={opt} onChange={() => setRespuestas({...respuestas, [p.texto]: opt})} style={{ marginRight: '10px' }} /> 
                    {opt}
                  </label>
                ))}
              </div>
            ))}
            <button onClick={enviarExamen} style={{ width: '100%', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2em', cursor: 'pointer' }}>Finalizar</button>
          </>
        )}
      </div>
    </div>
  );
}