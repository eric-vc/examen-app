import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export default function Examen() {
  const [nombre, setNombre] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  
  // Estado para guardar las preguntas que vienen de Firebase
  const [preguntas, setPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 1. Cargar las preguntas al iniciar
  useEffect(() => {
    const obtenerPreguntas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "preguntas"));
        const listaPreguntas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPreguntas(listaPreguntas);
        setCargando(false);
      } catch (error) {
        console.error("Error cargando preguntas:", error);
        setCargando(false);
      }
    };
    obtenerPreguntas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let aciertos = 0;
    
    preguntas.forEach(p => {
      if (respuestas[p.id] === p.correcta) aciertos++;
    });

    const notaFinal = preguntas.length > 0 ? (aciertos / preguntas.length) * 10 : 0;
    setCalificacion(notaFinal);

    try {
      await addDoc(collection(db, "resultados"), {
        nombre: nombre,
        calificacion: notaFinal,
        fecha: new Date().toISOString()
      });
      setEnviado(true);
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  if (cargando) return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando examen...</div>;
  
  if (preguntas.length === 0) return <div style={{textAlign: 'center', marginTop: '50px'}}>Aún no hay preguntas disponibles.</div>;

  if (enviado) return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>¡Examen enviado!</h2>
      <h3>Tu calificación: {calificacion.toFixed(1)} / 10</h3>
    </div>
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Examen de Curso</h1>
      <input 
        type="text" 
        placeholder="Escribe tu nombre completo" 
        value={nombre} 
        onChange={(e) => setNombre(e.target.value)} 
        style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
        required
      />
      
      {preguntas.map(p => (
        <div key={p.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
          <p><strong>{p.texto}</strong></p>
          {p.opciones.map((opt, index) => (
            <label key={index} style={{ display: 'block', margin: '5px 0' }}>
              <input 
                type="radio" 
                name={`p-${p.id}`} 
                value={opt} 
                onChange={() => setRespuestas({...respuestas, [p.id]: opt})}
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