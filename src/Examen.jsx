import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const preguntas = [
  { id: 1, texto: "¿Cuál es la capital de Francia?", opciones: ["Madrid", "París", "Londres"], correcta: "París" },
  { id: 2, texto: "¿Cuánto es 2 + 2?", opciones: ["3", "4", "5"], correcta: "4" },
];

export default function Examen() {
  const [nombre, setNombre] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [calificacion, setCalificacion] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let aciertos = 0;
    
    preguntas.forEach(p => {
      if (respuestas[p.id] === p.correcta) aciertos++;
    });

    const notaFinal = (aciertos / preguntas.length) * 10;
    setCalificacion(notaFinal);

    // Guardar en Firebase
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
          {p.opciones.map(opt => (
            <label key={opt} style={{ display: 'block', margin: '5px 0' }}>
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