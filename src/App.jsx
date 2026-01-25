import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Examen from './Examen';
import PanelProfesor from './PanelProfesor';
import Home from './Home';

function App() {
  return (
    <BrowserRouter basename="/examen-app"> {/* IMPORTANTE: Cambia esto por el nombre de tu repo en GitHub */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/examen/:id" element={<Examen />} />
        <Route path="/admin" element={<PanelProfesor />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;