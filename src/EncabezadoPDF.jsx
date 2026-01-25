import React from 'react';

export default function EncabezadoPDF({ asignatura, unidad, tema, opcion, alumnoNombre, numControl, unidadAcademica, calificacion, fecha }) {
  
  const DOCENTE = "M.S.C. Eric Velazquez Cruz"; 
  const CARRERA = "Ingeniería en Sistemas Computacionales";
  
  // Formatear fecha (si existe)
  const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-MX') : "___/___/___";

  // Lógica para marcar la X en la opción correcta
  // Si no hay opción definida, se dejan todos vacíos o guiones bajos
  const isDiag = opcion === 'diagnostico' ? 'X' : '_';
  const is1ra = opcion === '1ra' ? 'X' : '_';
  const is2da = opcion === '2da' ? 'X' : '_';

  return (
    <div style={{ width: '100%', fontFamily: 'Arial, sans-serif', fontSize: '10pt', marginBottom: '20px' }}>
      
      {/* 1. LOGO Y TÍTULO */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', paddingBottom: '5px' }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Logo_TecNM.png" 
          alt="Logo TecNM" 
          style={{ height: '50px', marginRight: '15px' }} 
        />
        <div style={{ textAlign: 'center', flexGrow: 1 }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '14pt' }}>Instituto Tecnológico Superior de Zongolica</h3>
          {unidadAcademica && <p style={{ margin: 0, fontSize: '10pt' }}>Unidad Académica: <strong>{unidadAcademica}</strong></p>}
        </div>
      </div>

      {/* 2. TABLA OFICIAL TIPO FORMATO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
        <tbody>
          {/* Fila Asignatura */}
          <tr>
            <td colSpan="4" style={{ border: '1px solid black', padding: '4px', backgroundColor: '#f0f0f0' }}>
              <strong>Asignatura:</strong> {asignatura || "_________________________"}
            </td>
          </tr>

          {/* Fila Opción (Diagnostico / 1ra / 2da) */}
          <tr>
            <td colSpan="4" style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>
              <strong>Opción:</strong> &nbsp;
              Diagnóstico ( <strong>{isDiag}</strong> ) &nbsp;&nbsp;&nbsp; 
              1ª oportunidad ( <strong>{is1ra}</strong> ) &nbsp;&nbsp;&nbsp; 
              2ª oportunidad ( <strong>{is2da}</strong> )
            </td>
          </tr>

          {/* Fila Unidad y Tema */}
          <tr>
            <td colSpan="2" style={{ border: '1px solid black', padding: '4px', width: '50%' }}>
              <strong>Unidad:</strong> {unidad || "___________"}
            </td>
            <td colSpan="2" style={{ border: '1px solid black', padding: '4px', width: '50%' }}>
              <strong>Tema:</strong> {tema || "_______________________"}
            </td>
          </tr>

          {/* Fila Carrera y Docente */}
          <tr>
            <td colSpan="2" style={{ border: '1px solid black', padding: '4px' }}>
              <strong>Ingeniería:</strong> {CARRERA}
            </td>
            <td colSpan="2" style={{ border: '1px solid black', padding: '4px' }}>
              <strong>Docente:</strong> {DOCENTE}
            </td>
          </tr>

          {/* Encabezados Datos Alumno */}
          <tr style={{ textAlign: 'center', backgroundColor: '#e0e0e0', fontSize: '9pt' }}>
            <td style={{ border: '1px solid black', padding: '2px', width: '40%' }}><strong>Nombre del Alumno(a):</strong></td>
            <td style={{ border: '1px solid black', padding: '2px', width: '20%' }}><strong>No. De Control</strong></td>
            <td style={{ border: '1px solid black', padding: '2px', width: '20%' }}><strong>Fecha de aplicación:</strong></td>
            <td style={{ border: '1px solid black', padding: '2px', width: '20%' }}><strong>Calificación:</strong></td>
          </tr>

          {/* Datos Alumno Variables */}
          <tr style={{ textAlign: 'center', height: '35px' }}>
            <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>
              {alumnoNombre || ""}
            </td>
            <td style={{ border: '1px solid black', padding: '5px' }}>
              {numControl || ""}
            </td>
            <td style={{ border: '1px solid black', padding: '5px' }}>
              {fechaStr}
            </td>
            <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', fontSize: '12pt' }}>
              {calificacion !== undefined && calificacion !== null ? Number(calificacion).toFixed(1) : ""}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}