import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

const UNIDADES = [
  "Zongolica", "Tequila", "Nogales", "Acultzinapa", 
  "Cuichapa", "Tezonapa", "Tehuipango"
];

export default function Examen() {
  const { id } = useParams();
  
  // Datos del Alumno
  const [nombre, setNombre] = useState('');
  const [numControl, setNumControl] = useState('');
  const [unidad, setUnidad] = useState('');
  
  // Estado del Examen
  const [respuestas, setRespuestas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [examenInfo, setExamenInfo] = useState(null);
  const [preguntasAleatorias, setPreguntasAleatorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Validación de error visual
  const [errorControl, setErrorControl] = useState('');

  // Regex: 3 digitos, W (mayus/minus), 4 digitos. Ej: 2025W1041
  const regexControl = /^\d{3}[Ww]\d{4}$/;

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const docRef = doc(db, "examenes", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExamenInfo(data);
          let bancoPreguntas = data.preguntas || [];
          const barajadas = [...bancoPreguntas].sort(() => 0.5 - Math.random());
          const limite = data.limite && data.limite > 0 ? data.limite : barajadas.length;
          setPreguntasAleatorias(barajadas.slice(0, limite));
        }
      } catch (error) { console.error("Error:", error); } 
      finally { setCargando(false); }
    };
    cargarExamen();
  }, [id]);

  const validarControl = (valor) => {
    setNumControl(valor.toUpperCase()); // Forzar mayúsculas
    if (!regexControl.test(valor)) {
      setErrorControl('Formato requerido: 3 dígitos + W + 4 dígitos (Ej: 216W1041)');
    } else {
      setErrorControl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (errorControl || !numControl || !unidad || !nombre) return alert("Por favor verifica tus datos");

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
        numControl: numControl, // Guardamos el control
        unidad: unidad,         // Guardamos la unidad
        calificacion: notaFinal,
        fecha: new Date().toISOString()
      });
      setEnviado(true);
    } catch (error) { console.error("Error al guardar:", error); }
  };

  if (cargando) return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando examen...</div>;
  if (!examenInfo) return <div style={{textAlign: 'center', marginTop: '50px'}}>Examen no encontrado.</div>;

  if (enviado) return (
    <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px' }}>
      <h1>¡Examen Finalizado!</h1>
      <div style={{ fontSize: '4rem', color: '#007bff' }}>{calificacion.toFixed(1)}</div>
      <p>Calificación final</p>
      <Link to="/" style={{ textDecoration: 'underline', color: '#666' }}>Volver al inicio</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <div style={{ borderBottom: '2px solid #007bff', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>{examenInfo.titulo}</h1>
        <p style={{ margin: 0, color: '#666' }}>Responde correctamente las {preguntasAleatorias.length} preguntas.</p>
      </div>

      {/* --- SECCIÓN DATOS DEL ALUMNO --- */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e9ecef' }}>
        <h3 style={{ marginTop: 0 }}>Datos del Estudiante</h3>
        
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre Completo:</label>
        <input 
          type="text" 
          value={nombre} 
          onChange={(e) => setNombre(e.target.value)} 
          style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ced4da' }}
          placeholder="Tu nombre aquí"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>No. Control:</label>
            <input 
              type="text" 
              value={numControl} 
              onChange={(e) => validarControl(e.target.value)} 
              maxLength={9}
              placeholder="Ej: 2024W1041"
              style={{ 
                width: '100%', padding: '10px', borderRadius: '4px', 
                border: errorControl ? '2px solid red' : '1px solid #ced4da',
                outline: 'none'
              }}
            />
            {errorControl && <small style={{ color: 'red' }}>{errorControl}</small>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Unidad Académica:</label>
            <select 
              value={unidad} 
              onChange={(e) => setUnidad(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', background: 'white' }}
            >
              <option value="">-- Selecciona --</option>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      {/* --- PREGUNTAS --- */}
      {preguntasAleatorias.map((p, index) => (
        <div key={index} style={{ marginBottom: '25px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{index + 1}. {p.texto}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {p.opciones.map((opt, i) => (
              <label key={i} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '4px', cursor: 'pointer', background: respuestas[p.texto] === opt ? '#e7f1ff' : 'white' }}>
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
        </div>
      ))}
      
      <button 
        onClick={handleSubmit}
        disabled={!nombre || !numControl || !unidad || !!errorControl}
        style={{ 
          width: '100%', padding: '15px', 
          backgroundColor: (!nombre || !numControl || !unidad || !!errorControl) ? '#ccc' : '#007bff', 
          color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2em', cursor: 'pointer' 
        }}
      >
        {(!nombre || !numControl || !unidad) ? 'Completa tus datos para enviar' : 'Finalizar Examen'}
      </button>
    </div>
  );
}