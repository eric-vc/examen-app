import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Examen from './Examen';
import PanelProfesor from './PanelProfesor';

function App() {
  return (
    <BrowserRouter basename="/nombre-de-tu-repo"> {/* IMPORTANTE: Cambia esto por el nombre de tu repo en GitHub */}
      <Routes>
        <Route path="/" element={<Examen />} />
        <Route path="/admin" element={<PanelProfesor />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;