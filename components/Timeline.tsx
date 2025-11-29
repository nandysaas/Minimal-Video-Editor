import React, { useRef, useEffect } from 'react';
import { EditorElement } from '../types';
import { Play, Pause, SkipBack, GripVertical } from 'lucide-react';
import { Button } from './ui/common';

interface TimelineProps {
  elements: EditorElement[];
  duration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onElementUpdate: (id: string, update: Partial<EditorElement>) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  elements,
  duration,
  currentTime,
  onTimeChange,
  onElementUpdate,
  selectedId,
  onSelect,
  isPlaying,
  onTogglePlay
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ZOOM = 100; // Pixels per second

  const handleScrub = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    // Calculation: x position relative to container + scroll offset - sidebar width
    const x = e.clientX - rect.left + scrollLeft - 240; 
    const newTime = Math.max(0, Math.min(duration, x / ZOOM));
    onTimeChange(newTime);
  };

  useEffect(() => {
    if (isPlaying && containerRef.current) {
        const playheadPos = (currentTime * ZOOM) + 240;
        const currentScroll = containerRef.current.scrollLeft;
        const width = containerRef.current.clientWidth;
        
        if (playheadPos > currentScroll + width - 50 || playheadPos < currentScroll) {
            containerRef.current.scrollLeft = playheadPos - 240;
        }
    }
  }, [currentTime, isPlaying]);

  const handleResize = (e: React.MouseEvent, el: EditorElement, edge: 'left' | 'right') => {
      e.stopPropagation();
      e.preventDefault();
      
      const startX = e.pageX;
      const initialStartTime = el.startTime;
      const initialDuration = el.duration;

      const handleMouseMove = (moveEvent: MouseEvent) => {
          const diff = moveEvent.pageX - startX;
          const diffSeconds = diff / ZOOM;

          if (edge === 'right') {
              // Adjust duration only
              const newDuration = Math.max(0.1, initialDuration + diffSeconds);
              onElementUpdate(el.id, { duration: newDuration });
          } else {
              // Adjust start time AND duration
              let newStartTime = initialStartTime + diffSeconds;
              let newDuration = initialDuration - diffSeconds;

              // Constrain start time to 0
              if (newStartTime < 0) {
                  newStartTime = 0;
                  newDuration = initialStartTime + initialDuration; // Maintain end point
              }

              // Constrain min duration
              if (newDuration < 0.1) {
                  newDuration = 0.1;
                  newStartTime = initialStartTime + initialDuration - 0.1; // Maintain end point
              }

              onElementUpdate(el.id, { startTime: newStartTime, duration: newDuration });
          }
      };

      const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex flex-col h-72 bg-background border-t border-border select-none z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
      {/* Controls Bar */}
      <div className="h-14 flex items-center px-4 border-b border-border justify-between bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onTogglePlay}>
             {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onTimeChange(0)}>
            <SkipBack size={18} />
          </Button>
          <div className="ml-4 flex flex-col">
              <span className="text-sm font-medium font-mono text-foreground">
                {currentTime.toFixed(2)}s
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                / {duration.toFixed(2)}s
              </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-full">
             Timeline
        </div>
      </div>

      {/* Tracks Area */}
      <div 
        className="flex-1 overflow-x-auto relative custom-scrollbar bg-muted/10" 
        ref={containerRef} 
        onMouseDown={(e) => {
             // Scrub if clicked on header area
             if (e.nativeEvent.offsetY < 28) handleScrub(e);
        }}
      >
         <div 
            className="relative min-w-full" 
            style={{ width: `${(duration * ZOOM) + 240 + 100}px` }}
         >
            {/* Ruler */}
            <div className="h-7 bg-background border-b border-border sticky top-0 z-10 flex cursor-pointer group">
               <div className="w-[240px] flex-shrink-0 bg-background border-r border-border sticky left-0 z-20" />
               
               {/* Seconds markers */}
               {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                 <div key={i} className="absolute top-0 bottom-0 border-l border-border/60 pl-1.5 flex flex-col justify-end pb-1" style={{ left: 240 + (i * ZOOM) }}>
                    <span className="text-[10px] text-muted-foreground font-medium select-none">{i}s</span>
                 </div>
               ))}
               
               {/* Sub-second markers (aesthetic) */}
               {Array.from({ length: Math.ceil(duration) * 4 }).map((_, i) => (
                 <div key={`sub-${i}`} className="absolute bottom-0 h-1.5 border-l border-border/40" style={{ left: 240 + (i * (ZOOM/4)) }}></div>
               ))}
            </div>

             {/* Playhead */}
             <div 
                className="absolute top-0 bottom-0 w-px bg-primary z-30 pointer-events-none"
                style={{ left: 240 + (currentTime * ZOOM) }}
             >
                 <div className="w-3 h-3 bg-primary rounded-full -ml-[5.5px] -mt-[1.5px] shadow-sm" />
             </div>

            {/* Element Tracks */}
            <div className="py-4 space-y-1">
              {elements.map((el) => (
                <div key={el.id} className="flex relative h-9 items-center group/track">
                  {/* Track Sidebar */}
                  <div 
                    className={`w-[240px] sticky left-0 z-10 bg-background px-4 flex items-center border-r border-border h-full transition-colors ${selectedId === el.id ? 'bg-muted/30' : ''}`}
                    onClick={() => onSelect(el.id)}
                  >
                     <div className="flex items-center gap-2 overflow-hidden">
                        <GripVertical size={12} className="text-muted-foreground/30 flex-shrink-0" />
                        <span className={`text-xs font-medium truncate ${selectedId === el.id ? 'text-primary' : 'text-foreground'}`}>
                          {el.name}
                        </span>
                     </div>
                  </div>

                  {/* Track Lane Background */}
                  <div className="absolute left-[240px] right-0 h-px bg-border/20 top-1/2 -z-10" />

                  {/* Clip */}
                  <div 
                    className={`absolute h-7 rounded-[4px] border flex items-center px-2 overflow-visible transition-all shadow-sm cursor-move group
                        ${selectedId === el.id 
                            ? 'bg-primary/20 border-primary/50 text-primary-foreground' 
                            : 'bg-white border-border hover:border-primary/30 text-foreground'
                        }
                    `}
                    style={{
                        left: 240 + (el.startTime * ZOOM),
                        width: Math.max(2, el.duration * ZOOM) // Ensure minimal visibility
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation(); 
                        onSelect(el.id);
                        const startX = e.pageX;
                        const originalStartTime = el.startTime;
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            const diff = moveEvent.pageX - startX;
                            const newStartTime = Math.max(0, originalStartTime + (diff / ZOOM));
                            onElementUpdate(el.id, { startTime: newStartTime });
                        };
                        const handleMouseUp = () => {
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                        };
                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                     <span className={`text-[10px] font-medium select-none pointer-events-none truncate ${selectedId === el.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {el.type}
                     </span>

                     {/* Resize Handle Left */}
                     <div 
                        className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity ${selectedId === el.id ? 'opacity-100' : ''}`}
                        onMouseDown={(e) => handleResize(e, el, 'left')}
                     >
                        <div className="w-1 h-3 bg-foreground/20 rounded-full" />
                     </div>

                     {/* Resize Handle Right */}
                     <div 
                        className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity ${selectedId === el.id ? 'opacity-100' : ''}`}
                        onMouseDown={(e) => handleResize(e, el, 'right')}
                     >
                        <div className="w-1 h-3 bg-foreground/20 rounded-full" />
                     </div>

                  </div>
                </div>
              ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Timeline;