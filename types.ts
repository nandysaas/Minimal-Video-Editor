export type ElementType = 'text' | 'image' | 'rect' | 'circle';

export interface Keyframe {
  id: string;
  time: number; // relative to element start time, or global time? Let's use Global Time for simplicity in this demo
  props: Partial<ElementProps>;
}

export interface ElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  src?: string; // for images
  zIndex: number;
}

export interface EditorElement {
  id: string;
  type: ElementType;
  name: string;
  startTime: number;
  duration: number;
  props: ElementProps;
  keyframes: Keyframe[];
  animationPreset?: string;
  animationDuration?: number; // Duration in seconds
}

export interface ProjectState {
  elements: EditorElement[];
  duration: number; // Total video duration in seconds
  backgroundColor: string;
}

export type ToolType = 'select' | 'text' | 'rect' | 'circle';