import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import CoursesView from './components/Home/CoursesViewNew';
import DiscoverView from './components/Home/DiscoverView';
import SettingsView from './components/Home/SettingsView';
import { EditorWrapper, PlayerWrapper } from './components/Wrappers';
import './index.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<CoursesView />} />
            <Route path="discover" element={<DiscoverView />} />
            <Route path="settings" element={<SettingsView />} />
          </Route>
          <Route path="/lesson/:lessonId" element={<PlayerWrapper />} />
          <Route path="/editor/:lessonId" element={<EditorWrapper />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
// Force update
