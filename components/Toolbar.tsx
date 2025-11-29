import React, { useState, useRef } from 'react';
import { 
    Type, Square, Circle as CircleIcon, Image as ImageIcon, Download, 
    Trash2, Bold, Italic, Sparkles, Grid3X3, AlignLeft, AlignCenter, AlignRight,
    Clock, Save, FolderOpen
} from 'lucide-react';
import { Button, Input, Separator, Popover, Label, Slider, Select, Badge } from './ui/common';
import { EditorElement, ElementProps } from '../types';
import { PASTEL_PALETTE, ANIMATION_PRESETS } from '../constants';

interface ToolbarProps {
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddImage: (url: string) => void;
  onExport: () => void;
  isExporting: boolean;
  
  // Context Props
  selectedElement: EditorElement | undefined;
  onUpdateElement: (id: string, update: Partial<EditorElement> | Partial<ElementProps>) => void;
  onDeleteElement: (id: string) => void;
  onAddKeyframe: (id: string, propKey: keyof ElementProps) => void;
  currentTime: number;

  // Background Props
  backgroundColor: string;
  onUpdateBackgroundColor: (color: string) => void;

  // Project Props
  duration: number;
  onUpdateDuration: (duration: number) => void;
  
  // File Ops
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddText, 
  onAddRect, 
  onAddCircle, 
  onAddImage, 
  onExport,
  isExporting,
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onAddKeyframe,
  currentTime,
  backgroundColor,
  onUpdateBackgroundColor,
  duration,
  onUpdateDuration,
  onSaveProject,
  onLoadProject
}) => {
  const [animateOpen, setAnimateOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onAddImage(url);
    }
  };
  
  const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          onLoadProject(file);
          e.target.value = ''; // Reset input
      }
  };

  const updateProp = (key: keyof ElementProps, value: any) => {
    if (selectedElement) {
        onUpdateElement(selectedElement.id, { [key]: value });
    }
  };

  // Helper for Bold/Italic Toggle
  const toggleFontStyle = (style: 'bold' | 'italic') => {
    if (!selectedElement) return;
    
    // Get current style, default to 'normal' if undefined
    let current = selectedElement.props.fontStyle || 'normal';
    
    // Split into parts (e.g., "bold italic" -> ["bold", "italic"])
    // Filter out "normal" because we will reconstruct the string
    let parts = current.split(' ').filter(p => p && p !== 'normal');
    
    if (parts.includes(style)) {
        // Remove style
        parts = parts.filter(p => p !== style);
    } else {
        // Add style
        parts.push(style);
    }
    
    // Reconstruct string. If empty, go back to 'normal'
    const newStyle = parts.length > 0 ? parts.join(' ') : 'normal';
    
    updateProp('fontStyle', newStyle);
  };

  const cycleAlign = () => {
      if (!selectedElement) return;
      const current = selectedElement.props.align || 'left';
      const map: Record<string, 'left' | 'center' | 'right'> = {
          'left': 'center',
          'center': 'right',
          'right': 'left'
      };
      updateProp('align', map[current]);
  };

  const AlignIcon = () => {
      const align = selectedElement?.props.align || 'left';
      if (align === 'center') return <AlignCenter size={15} />;
      if (align === 'right') return <AlignRight size={15} />;
      return <AlignLeft size={15} />;
  }

  // Derived state for button styles
  const isBold = selectedElement?.props.fontStyle?.includes('bold') ?? false;
  const isItalic = selectedElement?.props.fontStyle?.includes('italic') ?? false;

  return (
    <div className="h-14 bg-white border-b border-border flex items-center px-4 justify-between gap-4 shadow-sm z-30 shrink-0 font-sans">
        
        {/* Left: Insert Tools */}
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 mr-4">
                 <div className="w-8 h-8 bg-gradient-to-br from-primary to-emerald-300 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    P
                 </div>
            </div>
            
            <div className="flex items-center gap-1 text-muted-foreground/80">
                <Button variant="ghost" size="icon" onClick={onAddText} title="Add Text" className="h-9 w-9">
                    <Type size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={onAddRect} title="Add Rectangle" className="h-9 w-9">
                    <Square size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={onAddCircle} title="Add Circle" className="h-9 w-9">
                    <CircleIcon size={18} />
                </Button>
                <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        onChange={handleImageUpload}
                        disabled={isExporting}
                        title="Upload Image"
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ImageIcon size={18} />
                    </Button>
                </div>
            </div>
        </div>

        {/* Middle: Properties Bar */}
        {selectedElement ? (
             <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto no-scrollbar mask-fade px-4">
                <Separator orientation="vertical" className="h-6" />
                
                {/* Text Content Input */}
                {selectedElement.type === 'text' && (
                    <>
                        <Input 
                            value={selectedElement.props.text || ''}
                            onChange={(e) => updateProp('text', e.target.value)}
                            className="w-32 h-8 text-xs bg-muted/10 border-transparent hover:border-border transition-colors rounded"
                            placeholder="Type here..."
                        />
                        <Separator orientation="vertical" className="h-6" />
                    </>
                )}

                {/* Font Family */}
                {selectedElement.type === 'text' && (
                    <Select 
                        value={selectedElement.props.fontFamily || 'Inter'}
                        onChange={(e) => updateProp('fontFamily', e.target.value)}
                        className="w-32 h-8 text-xs bg-muted/10 border-transparent hover:border-border transition-colors rounded"
                    >
                        <option value="Inter">Inter</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Lobster">Lobster</option>
                        <option value="Playfair Display">Playfair</option>
                        <option value="Oswald">Oswald</option>
                    </Select>
                )}

                {/* Font Size */}
                {selectedElement.type === 'text' && (
                    <div className="flex items-center border rounded-md h-8 bg-white shadow-sm">
                        <Button variant="ghost" size="sm" className="h-full px-2 hover:bg-muted" onClick={() => updateProp('fontSize', (selectedElement.props.fontSize || 20) - 1)}>-</Button>
                        <Input 
                            type="number" 
                            className="w-10 h-full border-none text-center bg-transparent p-0 focus-visible:ring-0 text-xs font-medium appearance-none" 
                            value={selectedElement.props.fontSize} 
                            onChange={(e) => updateProp('fontSize', Number(e.target.value))}
                        />
                        <Button variant="ghost" size="sm" className="h-full px-2 hover:bg-muted" onClick={() => updateProp('fontSize', (selectedElement.props.fontSize || 20) + 1)}>+</Button>
                    </div>
                )}
                
                {(selectedElement.type === 'text' || selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
                     <Separator orientation="vertical" className="h-6" />
                )}

                {/* Color */}
                <Popover 
                    isOpen={colorOpen}
                    onOpenChange={setColorOpen}
                    trigger={
                        <button 
                            className="w-8 h-8 rounded hover:bg-muted flex flex-col items-center justify-center gap-0.5 group"
                            title="Color"
                        >
                            <span className="font-bold text-sm text-foreground group-hover:scale-105 transition-transform">A</span>
                            <div 
                                className="w-4 h-1 rounded-full" 
                                style={{ 
                                    backgroundColor: selectedElement.props.fill,
                                    backgroundImage: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1))' 
                                }}
                            />
                        </button>
                    }
                    content={
                        <div className="p-1 w-52">
                            <Label className="mb-2 block text-xs font-semibold">Document Colors</Label>
                            <div className="grid grid-cols-6 gap-2">
                                {['#000000', '#ffffff', '#333333', '#666666', ...PASTEL_PALETTE].map(c => (
                                    <button 
                                        key={c}
                                        className="w-6 h-6 rounded-full border border-border/50 hover:scale-110 transition-transform shadow-sm"
                                        style={{ backgroundColor: c }}
                                        onClick={() => { updateProp('fill', c); setColorOpen(false); }}
                                    />
                                ))}
                            </div>
                        </div>
                    }
                />

                {/* Text Styles */}
                {selectedElement.type === 'text' && (
                    <>
                        <Button 
                            variant={isBold ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className={`h-8 w-8 rounded ${isBold ? 'text-primary' : 'text-foreground'}`}
                            onClick={() => toggleFontStyle('bold')}
                        >
                            <Bold size={15} />
                        </Button>
                        <Button 
                            variant={isItalic ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className={`h-8 w-8 rounded ${isItalic ? 'text-primary' : 'text-foreground'}`}
                            onClick={() => toggleFontStyle('italic')}
                        >
                            <Italic size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded text-foreground" onClick={cycleAlign}>
                            <AlignIcon />
                        </Button>
                    </>
                )}

                <Separator orientation="vertical" className="h-6" />

                {/* Transparency */}
                <Popover 
                    isOpen={transparencyOpen}
                    onOpenChange={setTransparencyOpen}
                    trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/80" title="Transparency">
                            <Grid3X3 size={18} className="opacity-60" />
                        </Button>
                    }
                    content={
                         <div className="p-2 space-y-2 w-48">
                            <div className="flex justify-between">
                                <Label className="text-xs">Transparency</Label>
                                <span className="text-xs text-muted-foreground">{Math.round((selectedElement.props.opacity || 1) * 100)}%</span>
                            </div>
                            <Slider 
                                min="0" max="1" step="0.01" 
                                value={selectedElement.props.opacity} 
                                onChange={(e) => updateProp('opacity', Number(e.target.value))}
                            />
                         </div>
                    }
                />
                
                <Separator orientation="vertical" className="h-6" />

                {/* Animation */}
                <Popover 
                    isOpen={animateOpen}
                    onOpenChange={setAnimateOpen}
                    trigger={
                        <Button variant="ghost" className="h-8 text-xs font-medium px-3 text-foreground/80 hover:bg-muted rounded-md gap-1.5">
                            <Sparkles size={14} />
                            Animate
                        </Button>
                    }
                    content={
                        <div className="space-y-4 w-60">
                            <div className="space-y-2">
                                <Label>Preset Animations</Label>
                                <div className="grid grid-cols-2 gap-1">
                                    {ANIMATION_PRESETS.map(p => (
                                        <button 
                                            key={p.id} 
                                            className={`text-xs p-2 rounded text-left transition-colors ${selectedElement.animationPreset === p.id ? 'bg-primary/20 text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                                            onClick={() => onUpdateElement(selectedElement.id, { animationPreset: p.id } as any)}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {selectedElement.animationPreset && selectedElement.animationPreset !== 'none' && (
                                <div className="pt-2 border-t">
                                    <div className="flex justify-between mb-2">
                                        <Label className="text-xs">Duration</Label>
                                        <span className="text-xs text-muted-foreground">{selectedElement.animationDuration?.toFixed(1) || 1.0}s</span>
                                    </div>
                                    <Slider 
                                        min="0.1" 
                                        max="3.0" 
                                        step="0.1" 
                                        value={selectedElement.animationDuration || 1.0} 
                                        onChange={(e) => onUpdateElement(selectedElement.id, { animationDuration: Number(e.target.value) } as any)}
                                    />
                                </div>
                            )}
                        </div>
                    }
                />

                {/* Position */}
                <Popover 
                    isOpen={positionOpen}
                    onOpenChange={setPositionOpen}
                    trigger={
                        <Button variant="ghost" className="h-8 text-xs font-medium px-3 text-foreground/80 hover:bg-muted rounded-md">
                            Position
                        </Button>
                    }
                    content={
                        <div className="space-y-4 w-64 p-1">
                             <div className="space-y-2">
                                <Label className="text-xs font-semibold">Arrange</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button size="sm" variant="outline" className="text-xs justify-start" onClick={() => updateProp('zIndex', selectedElement.props.zIndex + 1)}>Bring Forward</Button>
                                    <Button size="sm" variant="outline" className="text-xs justify-start" onClick={() => updateProp('zIndex', Math.max(0, selectedElement.props.zIndex - 1))}>Send Backward</Button>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">Keyframes</Label>
                                    <Badge variant="outline" className="text-[10px] h-5">{currentTime.toFixed(1)}s</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {['x', 'y', 'scaleX', 'rotation', 'opacity'].map(prop => (
                                        <Button 
                                            key={prop} 
                                            variant="secondary" 
                                            size="sm" 
                                            className="justify-between text-xs h-7"
                                            onClick={() => onAddKeyframe(selectedElement.id, prop as keyof ElementProps)}
                                        >
                                            <span className="capitalize">{prop === 'scaleX' ? 'Scale' : prop}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    }
                />

                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-1" onClick={() => onDeleteElement(selectedElement.id)}>
                    <Trash2 size={16} />
                </Button>

             </div>
        ) : (
            <div className="flex-1 flex items-center justify-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                    <Label className="text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => setBgColorOpen(true)}>Background</Label>
                    <Popover 
                        isOpen={bgColorOpen}
                        onOpenChange={setBgColorOpen}
                        trigger={
                            <button 
                                className="w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                                style={{ backgroundColor: backgroundColor }}
                                title="Change Background Color"
                            />
                        }
                        content={
                            <div className="p-1 w-52">
                                <Label className="mb-2 block text-xs font-semibold">Canvas Color</Label>
                                <div className="grid grid-cols-6 gap-2">
                                    {['#FFFFFF', '#000000', '#F8FAFC', '#F0F9FF', ...PASTEL_PALETTE].map(c => (
                                        <button 
                                            key={c}
                                            className="w-6 h-6 rounded-full border border-border/50 hover:scale-110 transition-transform shadow-sm"
                                            style={{ backgroundColor: c }}
                                            onClick={() => { onUpdateBackgroundColor(c); setBgColorOpen(false); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        }
                    />
                 </div>

                 <Separator orientation="vertical" className="h-4" />

                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Duration</Label>
                    <div className="flex items-center gap-1 bg-muted/20 rounded px-2 py-1 border border-transparent hover:border-border transition-colors">
                        <Clock size={12} className="text-muted-foreground" />
                        <input 
                            type="number" 
                            min="1" 
                            max="300" 
                            value={duration} 
                            onChange={(e) => onUpdateDuration(Math.max(1, Number(e.target.value)))}
                            className="w-8 bg-transparent text-xs font-mono text-center focus:outline-none appearance-none m-0"
                            style={{ MozAppearance: 'textfield' }}
                        />
                        <span className="text-xs text-muted-foreground">s</span>
                    </div>
                 </div>
            </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-muted-foreground/80">
                 <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleProjectLoad}
                />
                <Button variant="ghost" size="icon" onClick={onSaveProject} title="Save Project" className="h-9 w-9">
                    <Save size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Open Project" className="h-9 w-9">
                    <FolderOpen size={18} />
                </Button>
            </div>
            
            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button 
                onClick={onExport} 
                disabled={isExporting} 
                size="sm"
                className="gap-2 bg-primary text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all rounded-md px-4"
            >
                <Download size={16} />
                <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
            </Button>
        </div>
    </div>
  );
};

export default Toolbar;