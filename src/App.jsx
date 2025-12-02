import { EditorProvider, useEditor } from './context/EditorContext'
import Editor from './components/Editor/Editor';
import Player from './components/Player/Player';
import SlidesPage from './components/Editor/SlidesPage';
import LessonsPage from './components/Home/LessonsPage';
import Dashboard from './components/Home/Dashboard';
import './index.css'

const AppContent = () => {
  const { state } = useEditor();

  if (state.view === 'dashboard') return <Dashboard />;
  if (state.view === 'slides') return <SlidesPage />;
  if (state.view === 'lessons') return <LessonsPage />;
  if (state.view === 'player') return <Player />;

  return <Editor />;
};

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  )
}

export default App
