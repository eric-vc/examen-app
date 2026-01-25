import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const UNIDADES = ["Zongolica", "Tequila", "Nogales", "Acultzinapa", "Cuichapa", "Tezonapa", "Tehuipango"];

export default function Examen() {
  const { id } = useParams();
  
  // Fases: 'registro', 'cargando', 'examen', 'finalizado', 'bloqueado'
  const [fase, setFase] = useState('registro');
  
  // Datos Alumno
  const [nombre, setNombre] = useState('');
  const [numControl, setNumControl] = useState('');
  const [unidad, setUnidad] = useState('');
  const [errorControl, setErrorControl] = useState('');

  // Datos Examen
  const [examenInfo, setExamenInfo] = useState(null);
  const [preguntasAleatorias, setPreguntasAleatorias] = useState([]);
  const [intentosRealizados, setIntentosRealizados] = useState(0);

  // Ejecución
  const [respuestas, setRespuestas] = useState({});
  const [calificacion, setCalificacion] = useState(0);

  const regexControl = /^\d{4}[Ww]\d{4}$/;

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const docSnap = await getDoc(doc(db, "examenes", id));
        if (docSnap.exists()) {
          setExamenInfo(docSnap.data());
        }
      } catch (error) { console.error(error); }
    };
    cargarExamen();
  }, [id]);

  const validarControl = (valor) => {
    setNumControl(valor.toUpperCase());
    if (!regexControl.test(valor)) setErrorControl('Formato requerido: 4 dígitos + W + 4 dígitos');
    else setErrorControl('');
  };

  const iniciarExamen = async () => {
    if (!nombre || !numControl || !unidad || errorControl) return alert("Verifica tus datos");
    
    setFase('cargando');

    // 1. VERIFICAR INTENTOS EN FIREBASE
    try {
      const q = query(
        collection(db, "resultados"), 
        where("examenId", "==", id),
        where("numControl", "==", numControl.toUpperCase())
      );
      const querySnapshot = await getDocs(q);
      const intentosHechos = querySnapshot.size;
      setIntentosRealizados(intentosHechos);

      const maximos = examenInfo.intentosMaximos || 1; // Por defecto 1 si no está definido

      if (intentosHechos >= maximos) {
        setFase('bloqueado');
        return;
      }

      // 2. PREPARAR PREGUNTAS (Solo si tiene intentos)
      let banco = examenInfo.preguntas || [];
      const barajadas = [...banco].sort(() => 0.5 - Math.random());
      const limite = examenInfo.limite && examenInfo.limite > 0 ? examenInfo.limite : barajadas.length;
      setPreguntasAleatorias(barajadas.slice(0, limite));
      
      setFase('examen');

    } catch (error) {
      console.error("Error verificando intentos:", error);
      alert("Hubo un error de conexión, intenta de nuevo.");
      setFase('registro');
    }
  };

  const enviarExamen = async () => {
    let aciertos = 0;
    preguntasAleatorias.forEach((p) => {
      if (respuestas[p.texto] === p.correcta) aciertos++;
    });

    const notaFinal = preguntasAleatorias.length > 0 ? (aciertos / preguntasAleatorias.length) * 10 : 0;
    setCalificacion(notaFinal);

    try {
      await addDoc(collection(db, "resultados"), {
        examenId: id,
        examenTitulo: examenInfo.titulo,
        nombre: nombre,
        numControl: numControl,
        unidad: unidad,
        calificacion: notaFinal,
        fecha: new Date().toISOString()
      });
      setFase('finalizado');
    } catch (error) { console.error(error); }
  };

  if (!examenInfo) return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando examen...</div>;

  // --- VISTA: BLOQUEADO POR INTENTOS ---
  if (fase === 'bloqueado') return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', textAlign: 'center', border: '2px solid red', borderRadius: '10px' }}>
      <h2 style={{color: 'red'}}>🚫 Acceso Denegado</h2>
      <p>El número de control <strong>{numControl}</strong> ha agotado sus intentos.</p>
      <p>Intentos realizados: {intentosRealizados} / {examenInfo.intentosMaximos || 1}</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );

  // --- VISTA: FINALIZADO ---
  if (fase === 'finalizado') return (
    <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px' }}>
      <h1>¡Examen Entregado!</h1>
      <div style={{ fontSize: '4rem', color: '#007bff' }}>{calificacion.toFixed(1)}</div>
      <p>Calificación final</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );

  // --- VISTA: REGISTRO (INICIAL) ---
  if (fase === 'registro' || fase === 'cargando') return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>{examenInfo.titulo}</h1>
      <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #ffeeba' }}>
        ℹ️ Tienes <strong>{examenInfo.intentosMaximos || 1}</strong> intentos permitidos para este examen.
      </div>

      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>Paso 1: Tus Datos</h3>
        
        <label style={{display:'block', marginBottom:'5px'}}>Nombre Completo:</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{width:'100%', padding:'8px', marginBottom:'15px'}} />

        <label style={{display:'block', marginBottom:'5px'}}>No. Control (Ej: 2024W1041):</label>
        <input type="text" value={numControl} onChange={e => validarControl(e.target.value)} maxLength={9} style={{width:'100%', padding:'8px', border: errorControl ? '2px solid red' : '1px solid #ccc'}} />
        {errorControl && <small style={{color:'red'}}>{errorControl}</small>}

        <label style={{display:'block', marginTop:'15px', marginBottom:'5px'}}>Unidad:</label>
        <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{width:'100%', padding:'8px', marginBottom:'20px'}}>
          <option value="">-- Selecciona --</option>
          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <button 
          onClick={iniciarExamen} 
          disabled={!nombre || !numControl || !unidad || !!errorControl || fase === 'cargando'}
          style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontSize:'16px' }}
        >
          {fase === 'cargando' ? 'Verificando...' : 'Verificar y Comenzar Examen'}
        </button>
      </div>
    </div>
  );

  // --- VISTA: EXAMEN (PREGUNTAS) ---
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{margin:0}}>{examenInfo.titulo}</h2>
        <span style={{ background: '#eee', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8em' }}>
          Alumno: {numControl}
        </span>
      </div>

      {preguntasAleatorias.map((p, index) => (
        <div key={index} style={{ marginBottom: '25px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{index + 1}. {p.texto}</p>
          {p.opciones.map((opt, i) => (
            <label key={i} style={{ display: 'block', padding: '8px', cursor: 'pointer', background: respuestas[p.texto] === opt ? '#e7f1ff' : 'transparent' }}>
              <input 
                type="radio" 
                name={`pregunta-${p.texto}`} 
                value={opt} 
                onChange={() => setRespuestas({...respuestas, [p.texto]: opt})}
                style={{ marginRight: '10px' }}
              /> 
              {opt}
            </label>
          ))}
        </div>
      ))}
      
      <button 
        onClick={enviarExamen}
        style={{ width: '100%', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2em', cursor: 'pointer' }}
      >
        Finalizar Examen
      </button>
    </div>
  );
}