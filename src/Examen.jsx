import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Importamos useParams
import { db } from './firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

export default function Examen() {
  const { id } = useParams(); // Obtenemos el ID de la URL (ej: 'parcial-1')
  const [nombre, setNombre] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [examenData, setExamenData] = useState(null); // Guardamos todo el objeto del examen
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const docRef = doc(db, "examenes", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setExamenData(docSnap.data());
        } else {
          setExamenData(null);
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
    if (!examenData) return;
    
    let aciertos = 0;
    const preguntas = examenData.preguntas || [];
    
    preguntas.forEach((p, index) => {
      // Usamos el index como ID temporal ya que las preguntas están en un array
      if (respuestas[index] === p.correcta) aciertos++;
    });

    const notaFinal = preguntas.length > 0 ? (aciertos / preguntas.length) * 10 : 0;
    setCalificacion(notaFinal);

    try {
      await addDoc(collection(db, "resultados"), {
        examenId: id, // Guardamos a qué examen pertenece esta nota
        examenTitulo: examenData.titulo,
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
  if (!examenData) return <div style={{textAlign: 'center', marginTop: '50px'}}>Examen no encontrado 😢 <br/><Link to="/">Volver</Link></div>;

  if (enviado) return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>¡Examen enviado!</h2>
      <h3>Tu calificación: {calificacion.toFixed(1)} / 10</h3>
      <Link to="/">Volver al inicio</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>{examenData.titulo}</h1>
      <input 
        type="text" 
        placeholder="Escribe tu nombre completo" 
        value={nombre} 
        onChange={(e) => setNombre(e.target.value)} 
        style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
        required
      />
      
      {examenData.preguntas && examenData.preguntas.map((p, index) => (
        <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
          <p><strong>{p.texto}</strong></p>
          {p.opciones.map((opt, i) => (
            <label key={i} style={{ display: 'block', margin: '5px 0' }}>
              <input 
                type="radio" 
                name={`p-${index}`} 
                value={opt} 
                onChange={() => setRespuestas({...respuestas, [index]: opt})}
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