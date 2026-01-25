import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

export default function Examen() {
  const { id } = useParams();
  const [nombre, setNombre] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  
  const [examenInfo, setExamenInfo] = useState(null); // Info general (titulo)
  const [preguntasAleatorias, setPreguntasAleatorias] = useState([]); // Las preguntas ya filtradas
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const docRef = doc(db, "examenes", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExamenInfo(data);

          // LÓGICA DE ALEATORIEDAD
          let bancoPreguntas = data.preguntas || [];
          
          // 1. Barajar (Shuffle) usando algoritmo Fisher-Yates simple o sort random
          const barajadas = [...bancoPreguntas].sort(() => 0.5 - Math.random());
          
          // 2. Aplicar límite si existe y es mayor a 0
          const limite = data.limite && data.limite > 0 ? data.limite : barajadas.length;
          const seleccionadas = barajadas.slice(0, limite);

          setPreguntasAleatorias(seleccionadas);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarExamen();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let aciertos = 0;
    // Comparamos contra el array de preguntas ALEATORIAS que vio el usuario
    preguntasAleatorias.forEach((p, index) => {
      // Usamos el texto de la pregunta como clave única para las respuestas
      // porque el index cambia en cada render aleatorio
      if (respuestas[p.texto] === p.correcta) aciertos++;
    });

    const notaFinal = preguntasAleatorias.length > 0 ? (aciertos / preguntasAleatorias.length) * 10 : 0;
    setCalificacion(notaFinal);

    try {
      await addDoc(collection(db, "resultados"), {
        examenId: id,
        examenTitulo: examenInfo.titulo,
        nombre: nombre,
        calificacion: notaFinal,
        fecha: new Date().toISOString()
      });
      setEnviado(true);
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  if (cargando) return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando...</div>;
  if (!examenInfo) return <div style={{textAlign: 'center', marginTop: '50px'}}>Examen no encontrado.</div>;

  if (enviado) return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>¡Examen enviado!</h2>
      <h3>Tu calificación: {calificacion.toFixed(1)} / 10</h3>
      <Link to="/">Volver al inicio</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>{examenInfo.titulo}</h1>
      <p style={{color: '#666', marginBottom: '20px'}}>
        Responde las siguientes {preguntasAleatorias.length} preguntas.
      </p>

      <input 
        type="text" 
        placeholder="Escribe tu nombre completo" 
        value={nombre} 
        onChange={(e) => setNombre(e.target.value)} 
        style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
        required
      />
      
      {preguntasAleatorias.map((p, index) => (
        <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
          <p><strong>{index + 1}. {p.texto}</strong></p>
          {p.opciones.map((opt, i) => (
            <label key={i} style={{ display: 'block', margin: '5px 0' }}>
              <input 
                type="radio" 
                // IMPORTANTE: Usamos p.texto para identificar la respuesta única
                name={`pregunta-${p.texto}`} 
                value={opt} 
                onChange={() => setRespuestas({...respuestas, [p.texto]: opt})}
              /> {opt}
            </label>
          ))}
        </div>
      ))}
      
      <button 
        onClick={handleSubmit}
        disabled={!nombre}
        style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Terminar y Enviar
      </button>
    </div>
  );
}