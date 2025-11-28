import { EditorProvider, useEditor } from './context/EditorContext'
import Editor from './components/Editor/Editor'
import Player from './components/Player/Player'
import './index.css'

const AppContent = () => {
  const { state } = useEditor();
  return (
    <div className="app-container">
      {state.isPlaying ? <Player /> : <Editor />}
    </div>
  );
};

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  )
}

export default App
