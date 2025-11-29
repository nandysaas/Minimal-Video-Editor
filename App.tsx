import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import EditorCanvas from './components/EditorCanvas';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import { ProjectState, EditorElement, ElementProps } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FPS } from './constants';
import { getInterpolatedProps } from './utils/animationUtils';

// Whitelist of keys that belong inside element.props
const ELEMENT_PROPS_WHITELIST: (keyof ElementProps)[] = [
  'x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY', 'opacity', 
  'fill', 'stroke', 'strokeWidth', 'text', 'fontSize', 'fontFamily', 
  'fontStyle', 'align', 'src', 'zIndex'
];

const App: React.FC = () => {
  // --- State ---
  const [project, setProject] = useState<ProjectState>({
    elements: [],
    duration: 10,
    backgroundColor: '#FFFFFF',
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const stageRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);

  // --- Actions ---
  const addElement = (type: EditorElement['type'], extraProps: Partial<ElementProps> = {}) => {
    const id = uuidv4();
    const newElement: EditorElement = {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${project.elements.length + 1}`,
      startTime: 0,
      duration: 5,
      animationDuration: 1.0, // Default 1s animation speed
      keyframes: [],
      props: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        width: 200,
        height: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: project.elements.length,
        fill: '#A7F3D0', // Pastel Green default
        ...extraProps,
      },
    };
    
    // Adjust logic
    if (type === 'text') {
        newElement.props.text = 'Add a heading';
        newElement.props.fontSize = 60;
        newElement.props.fontFamily = 'Inter';
        newElement.props.fontStyle = 'normal';
        newElement.props.align = 'left';
        newElement.props.fill = '#1a1a1a';
        newElement.props.width = 400;
        // Set height relative to font size to avoid huge bottom padding
        newElement.props.height = newElement.props.fontSize * 1.2; 
        newElement.props.x -= 200;
        newElement.props.y -= 30;
    } else if (type === 'rect' || type === 'image') {
        newElement.props.x -= 100;
        newElement.props.y -= 100;
    }

    setProject(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
    setSelectedId(id);
  };

  const updateElement = (id: string, update: Partial<EditorElement> | Partial<ElementProps>) => {
    setProject(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (el.id !== id) return el;

        // Check if any key in the update object belongs to ElementProps
        const updateKeys = Object.keys(update);
        const isPropUpdate = updateKeys.some(k => ELEMENT_PROPS_WHITELIST.includes(k as keyof ElementProps));

        if (isPropUpdate) {
            return { ...el, props: { ...el.props, ...update } };
        }
        return { ...el, ...update };
      })
    }));
  };

  const deleteElement = (id: string) => {
    setProject(prev => ({ ...prev, elements: prev.elements.filter(e => e.id !== id) }));
    setSelectedId(null);
  };

  const addKeyframe = (id: string, propKey: keyof ElementProps) => {
      setProject(prev => ({
          ...prev,
          elements: prev.elements.map(el => {
              if (el.id !== id) return el;
              
              const currentVal = getInterpolatedProps(el, currentTime)[propKey];
              const newKeyframe = {
                  id: uuidv4(),
                  time: currentTime,
                  props: { [propKey]: currentVal }
              };
              
              const filteredKeyframes = el.keyframes.filter(k => 
                Math.abs(k.time - currentTime) > 0.05 || !k.props.hasOwnProperty(propKey)
              );

              return {
                  ...el,
                  keyframes: [...filteredKeyframes, newKeyframe]
              };
          })
      }));
  };

  // --- Playback Loop ---
  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    if (isPlaying) {
      setCurrentTime(prev => {
        const next = prev + deltaTime;
        if (next >= project.duration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, project.duration]);

  // --- Export Logic ---
  const handleExport = async () => {
    if (isExporting || !stageRef.current) return;
    setIsExporting(true);
    setIsPlaying(false);
    setSelectedId(null); // Deselect to hide transformer

    // Wait a bit for the deselection to render
    await new Promise(resolve => setTimeout(resolve, 100));

    // CRITICAL FIX: Select the actual DOM canvas from Konva, not a snapshot
    const stageNode = stageRef.current.getStage();
    const canvas = stageNode.content.querySelector('canvas');
    
    if (!canvas) {
        console.error("Canvas not found");
        setIsExporting(false);
        return;
    }

    const stream = canvas.captureStream(FPS);
    
    // Feature detect mime type
    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264') 
        ? 'video/mp4;codecs=h264' 
        : 'video/webm;codecs=vp9';
        
    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pastel-cut-export-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setCurrentTime(0);
    };

    mediaRecorder.start();

    // Playback loop for recording
    const dt = 1 / FPS;
    let t = 0;
    
    const recordLoop = () => {
       if (t > project.duration) {
           mediaRecorder.stop();
           return;
       }
       setCurrentTime(t);
       t += dt;
       
       // Call next frame with delay to match FPS
       setTimeout(recordLoop, 1000 / FPS); 
    };

    recordLoop();
  };

  const selectedElement = project.elements.find(e => e.id === selectedId);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-secondary/30 text-foreground font-sans">
      
      {/* Fixed Top Toolbar */}
      <Toolbar 
        onAddText={() => addElement('text')}
        onAddRect={() => addElement('rect')}
        onAddCircle={() => addElement('circle')}
        onAddImage={(src) => addElement('image', { src })}
        onExport={handleExport}
        isExporting={isExporting}
        selectedElement={selectedElement}
        onUpdateElement={updateElement}
        onDeleteElement={deleteElement}
        onAddKeyframe={addKeyframe}
        currentTime={currentTime}
        backgroundColor={project.backgroundColor}
        onUpdateBackgroundColor={(color) => setProject(prev => ({ ...prev, backgroundColor: color }))}
        duration={project.duration}
        onUpdateDuration={(duration) => setProject(prev => ({ ...prev, duration }))}
      />

      {/* Main Workspace: Canvas + Timeline */}
      <div className="flex-1 flex flex-col min-h-0 relative">
          <div className="flex-1 min-h-0 bg-background/50">
             <EditorCanvas 
                elements={project.elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdateElement={updateElement}
                currentTime={currentTime}
                backgroundColor={project.backgroundColor}
                stageRef={stageRef}
             />
          </div>
          <Timeline 
             elements={project.elements}
             duration={project.duration}
             currentTime={currentTime}
             onTimeChange={setCurrentTime}
             onElementUpdate={updateElement}
             selectedId={selectedId}
             onSelect={setSelectedId}
             isPlaying={isPlaying}
             onTogglePlay={() => setIsPlaying(!isPlaying)}
          />
      </div>

      {/* Export Overlay */}
      {isExporting && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center flex-col">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-semibold text-foreground">Rendering Video...</h2>
              <p className="text-muted-foreground text-sm">Do not close this tab.</p>
          </div>
      )}
    </div>
  );
};

export default App;