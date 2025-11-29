import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Transformer, Line } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { ZoomIn, ZoomOut, Maximize, Scan } from 'lucide-react';
import { Button } from './ui/common';
import { EditorElement, ElementProps } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { getInterpolatedProps } from '../utils/animationUtils';

interface EditorCanvasProps {
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, newProps: Partial<ElementProps>) => void;
  currentTime: number;
  backgroundColor: string;
  stageRef: React.RefObject<any>;
}

// Helper component to load images
const URLImage = ({ src, ...props }: any) => {
  const [image] = useImage(src);
  return <KonvaImage image={image} {...props} />;
};

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  currentTime,
  backgroundColor,
  stageRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1); // Scale to fit screen
  const [zoom, setZoom] = useState(1); // User zoom multiplier (1 = 100% of fit)
  const trRef = useRef<any>(null);
  const [guides, setGuides] = useState<Array<{ points: number[], orientation: 'V' | 'H' }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const GUIDE_OFFSET = 5;
  const displayScale = autoScale * zoom; // Final visual scale

  // Responsive scaling (Calculate "Fit" scale)
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 64; // ample padding
      const availWidth = clientWidth - padding;
      const availHeight = clientHeight - padding;
      
      const scaleX = availWidth / CANVAS_WIDTH;
      const scaleY = availHeight / CANVAS_HEIGHT;
      const newScale = Math.min(scaleX, scaleY); 
      
      // Prevent crazy small or zero scales
      setAutoScale(Math.max(0.1, newScale)); 
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update selection transformer
  useEffect(() => {
    if (selectedId && trRef.current && stageRef.current) {
      const node = stageRef.current.findOne('.' + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, elements]);

  // --- Snapping Logic ---
  const getLineGuideStops = (skipShapeId: string) => {
    const stage = stageRef.current?.getStage();
    if (!stage) return { vertical: [], horizontal: [] };
    const vertical = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
    const horizontal = [0, CANVAS_HEIGHT / 2, CANVAS_HEIGHT];
    stage.find('.element').forEach((guideItem: Konva.Node) => {
      if (guideItem.id() === skipShapeId) return;
      const box = guideItem.getClientRect();
      vertical.push(box.x, box.x + box.width / 2, box.x + box.width);
      horizontal.push(box.y, box.y + box.height / 2, box.y + box.height);
    });
    return { vertical, horizontal };
  };

  const getObjectSnappingEdges = (node: Konva.Node) => {
    const box = node.getClientRect();
    const absPos = node.absolutePosition();
    return {
      vertical: [
        { guide: box.x, offset: box.x - absPos.x, snap: 'start' },
        { guide: box.x + box.width / 2, offset: box.x + box.width / 2 - absPos.x, snap: 'center' },
        { guide: box.x + box.width, offset: box.x + box.width - absPos.x, snap: 'end' },
      ],
      horizontal: [
        { guide: box.y, offset: box.y - absPos.y, snap: 'start' },
        { guide: box.y + box.height / 2, offset: box.y + box.height / 2 - absPos.y, snap: 'center' },
        { guide: box.y + box.height, offset: box.y + box.height - absPos.y, snap: 'end' },
      ],
    };
  };

  const getGuides = (lineGuideStops: any, itemBounds: any) => {
    const resultV: Array<{ lineGuide: number, diff: number, snap: string, offset: number }> = [];
    const resultH: Array<{ lineGuide: number, diff: number, snap: string, offset: number }> = [];
    lineGuideStops.vertical.forEach((lineGuide: number) => {
      itemBounds.vertical.forEach((itemBound: any) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < GUIDE_OFFSET) {
          resultV.push({ lineGuide, diff, snap: itemBound.snap, offset: itemBound.offset });
        }
      });
    });
    lineGuideStops.horizontal.forEach((lineGuide: number) => {
      itemBounds.horizontal.forEach((itemBound: any) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < GUIDE_OFFSET) {
          resultH.push({ lineGuide, diff, snap: itemBound.snap, offset: itemBound.offset });
        }
      });
    });
    const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
    const minH = resultH.sort((a, b) => a.diff - b.diff)[0];
    return { minV, minH };
  };

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setGuides([]);
    const lineGuideStops = getLineGuideStops(node.id());
    const itemBounds = getObjectSnappingEdges(node);
    const guides = getGuides(lineGuideStops, itemBounds);
    const newGuides = [];
    if (guides.minV) {
      node.x(guides.minV.lineGuide - guides.minV.offset);
      newGuides.push({ orientation: 'V' as const, points: [guides.minV.lineGuide, 0, guides.minV.lineGuide, CANVAS_HEIGHT] });
    }
    if (guides.minH) {
      node.y(guides.minH.lineGuide - guides.minH.offset);
      newGuides.push({ orientation: 'H' as const, points: [0, guides.minH.lineGuide, CANVAS_WIDTH, guides.minH.lineGuide] });
    }
    setGuides(newGuides);
  }, []);

  const handleDragEnd = (e: any, id: string) => {
    setGuides([]);
    onUpdateElement(id, {
      x: Math.round(e.target.x()),
      y: Math.round(e.target.y()),
    });
  };

  const handleTransformEnd = (e: any, id: string, type: string) => {
    const node = e.target;
    
    if (type === 'text') {
        // For text, width is the source of truth. Scale is always 1.
        onUpdateElement(id, {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: node.width(), // Save the new width
            scaleX: 1, 
            scaleY: 1
        });
        node.scaleX(1);
        node.scaleY(1);
    } else {
        onUpdateElement(id, {
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
        });
    }
  };

  // Callback ref to auto-resize textarea in editing mode
  const handleTextareaRef = (node: HTMLTextAreaElement | null) => {
    if (node) {
        node.style.height = 'auto';
        node.style.height = node.scrollHeight + 'px';
    }
  };

  const selectedElementType = elements.find(el => el.id === selectedId)?.type;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-slate-100 flex flex-col"
      style={{
          backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
      }}
    >
      {/* Scrollable Viewport */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 custom-scrollbar">
         {/* Sizer Div: Forces scrollbars based on scaled content size */}
         <div 
            style={{ 
                width: CANVAS_WIDTH * displayScale, 
                height: CANVAS_HEIGHT * displayScale,
                flexShrink: 0
            }}
         >
            {/* Transform Wrapper: Applies the scale to the stage content */}
            <div 
                className="relative shadow-2xl ring-1 ring-border bg-white origin-top-left"
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${displayScale})`,
                  backgroundColor: backgroundColor,
                }}
            >
                <Stage
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  ref={stageRef}
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage()) onSelect(null);
                  }}
                >
                  <Layer>
                    <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={backgroundColor} listening={false} />

                    {elements
                      .filter(el => currentTime >= el.startTime && currentTime <= (el.startTime + el.duration))
                      .sort((a, b) => a.props.zIndex - b.props.zIndex)
                      .map((el) => {
                        const currentProps = getInterpolatedProps(el, currentTime);
                        const isSelected = selectedId === el.id;
                        const isEditing = editingId === el.id;

                        const commonProps = {
                          key: el.id,
                          id: el.id,
                          name: `element ${el.id}`,
                          ...currentProps,
                          draggable: isSelected && !isEditing,
                          onClick: () => onSelect(el.id),
                          onTap: () => onSelect(el.id),
                          onDragMove: handleDragMove,
                          onDragEnd: (e: any) => handleDragEnd(e, el.id),
                          onTransformEnd: (e: any) => handleTransformEnd(e, el.id, el.type),
                        };

                        if (el.type === 'text') {
                            // CRITICAL: Remove height prop to allow Konva to auto-calculate height based on width & content
                            const { height, ...textProps } = commonProps;
                            
                            return (
                              <Text 
                                {...textProps}
                                text={isEditing ? '' : currentProps.text}
                                align={currentProps.align || 'left'} 
                                fontStyle={currentProps.fontStyle || 'normal'}
                                wrap="word" // Enables wrapping
                                onDblClick={() => setEditingId(el.id)}
                                onDblTap={() => setEditingId(el.id)}
                                onTransform={(e) => {
                                    const node = e.target;
                                    
                                    // Calculate new width based on scale
                                    const newWidth = Math.max(30, node.width() * node.scaleX());
                                    
                                    node.setAttrs({
                                        width: newWidth,
                                        scaleX: 1, // Reset scale to prevent distortion
                                        scaleY: 1
                                    });
                                }}
                              />
                            );
                        }
                        if (el.type === 'rect') return <Rect {...commonProps} cornerRadius={10} />;
                        if (el.type === 'circle') return <Circle {...commonProps} />;
                        if (el.type === 'image') return <URLImage src={el.props.src} {...commonProps} />;
                        return null;
                      })}

                    {guides.map((g, i) => (
                        <Line 
                            key={i} points={g.points} stroke="#ec4899" strokeWidth={1 / displayScale} dash={[4 / displayScale, 4 / displayScale]} listening={false}
                        />
                    ))}

                    {selectedId && !editingId && (
                      <Transformer
                        ref={trRef}
                        ignoreStroke={true}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < 20 || newBox.height < 20) return oldBox;
                          return newBox;
                        }}
                        anchorStroke="#10b981"
                        anchorStrokeWidth={2 / displayScale}
                        anchorFill="#FFFFFF"
                        anchorSize={20 / displayScale}
                        anchorCornerRadius={10 / displayScale}
                        borderStroke="#10b981"
                        borderStrokeWidth={2 / displayScale}
                        rotateAnchorOffset={30 / displayScale}
                        padding={6 / displayScale}
                        keepRatio={false}
                        // For text, ONLY enable side handles to force Width resizing.
                        // Disabling corner handles prevents scale/stretch confusion.
                        enabledAnchors={selectedElementType === 'text' 
                            ? ['middle-left', 'middle-right'] 
                            : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
                        }
                      />
                    )}
                  </Layer>
                </Stage>

                {editingId && (() => {
                  const el = elements.find(e => e.id === editingId);
                  if (el && el.type === 'text') {
                    const props = getInterpolatedProps(el, currentTime);
                    return (
                      <textarea
                        ref={handleTextareaRef}
                        value={el.props.text}
                        onChange={(e) => onUpdateElement(el.id, { text: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        style={{
                          position: 'absolute',
                          top: props.y,
                          left: props.x,
                          width: props.width,
                          // Min height prevents collapse, but actual height is controlled by content
                          minHeight: props.fontSize,
                          transform: `rotate(${props.rotation}deg) scale(${props.scaleX}, ${props.scaleY})`,
                          transformOrigin: 'top left',
                          fontSize: `${props.fontSize}px`,
                          fontFamily: props.fontFamily,
                          fontStyle: props.fontStyle?.includes('italic') ? 'italic' : 'normal',
                          fontWeight: props.fontStyle?.includes('bold') ? 'bold' : 'normal',
                          textAlign: props.align,
                          color: props.fill,
                          background: 'none',
                          border: 'none',
                          outline: '2px solid #10b981',
                          resize: 'none',
                          padding: 0,
                          lineHeight: 1.2,
                          zIndex: 50,
                          overflow: 'hidden'
                        }}
                      />
                    );
                  }
                  return null;
                })()}
            </div>
         </div>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white p-1.5 rounded-lg shadow-lg border border-border/60 z-20">
         <Button 
            variant="ghost" size="icon" className="h-7 w-7" 
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
            title="Zoom Out"
         >
             <ZoomOut size={14} />
         </Button>
         <span className="text-[10px] font-mono w-10 text-center select-none text-muted-foreground">
             {Math.round(zoom * 100)}%
         </span>
         <Button 
            variant="ghost" size="icon" className="h-7 w-7" 
            onClick={() => setZoom(z => Math.min(5, z + 0.1))}
            title="Zoom In"
         >
             <ZoomIn size={14} />
         </Button>
         <div className="w-px h-4 bg-border mx-1" />
         <Button 
            variant="ghost" size="icon" className="h-7 w-7" 
            onClick={() => setZoom(1)}
            title="Fit to Screen"
         >
             <Scan size={14} />
         </Button>
      </div>

    </div>
  );
};

export default EditorCanvas;