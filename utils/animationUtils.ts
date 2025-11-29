import { EditorElement, ElementProps, Keyframe } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

// Linear interpolation
const lerp = (start: number, end: number, t: number) => {
  return start + (end - start) * Math.min(1, Math.max(0, t));
};

export const getInterpolatedProps = (
  element: EditorElement,
  currentTime: number
): ElementProps => {
  let props = { ...element.props };

  // 1. Apply Keyframes
  // Sort keyframes by time
  const sortedKeyframes = [...element.keyframes].sort((a, b) => a.time - b.time);

  // Find surrounding keyframes
  const prevKeyframe = sortedKeyframes.filter(k => k.time <= currentTime).pop();
  const nextKeyframe = sortedKeyframes.find(k => k.time > currentTime);

  if (prevKeyframe && nextKeyframe) {
    const timeDiff = nextKeyframe.time - prevKeyframe.time;
    const progress = (currentTime - prevKeyframe.time) / timeDiff;

    Object.keys(nextKeyframe.props).forEach((key) => {
      const k = key as keyof ElementProps;
      const startVal = prevKeyframe.props[k];
      const endVal = nextKeyframe.props[k];

      if (typeof startVal === 'number' && typeof endVal === 'number') {
        (props as any)[k] = lerp(startVal, endVal, progress);
      } else {
        // Non-interpolatable values snap
        (props as any)[k] = startVal;
      }
    });
  } else if (prevKeyframe) {
    // Stick to last keyframe
    props = { ...props, ...prevKeyframe.props };
  } else if (nextKeyframe) {
      // Haven't reached first keyframe yet, stay at initial or first keyframe
       props = { ...props, ...nextKeyframe.props };
  }

  // 2. Apply Presets (Procedural overrides)
  if (element.animationPreset && element.animationPreset !== 'none') {
    const relativeTime = currentTime - element.startTime;
    const duration = element.animationDuration || 1.0; 

    switch (element.animationPreset) {
      case 'fadeIn':
        if (relativeTime < duration) {
           props.opacity = lerp(0, props.opacity, relativeTime / duration);
        }
        break;
      case 'fadeOut':
        const endDiff = (element.startTime + element.duration) - currentTime;
        if (endDiff < duration && endDiff > 0) {
            props.opacity = lerp(0, props.opacity, endDiff / duration);
        }
        break;
      case 'slideInLeft':
        if (relativeTime < duration) {
          const startX = -props.width - 100;
          const targetX = props.x;
          // Simple ease out
          const t = relativeTime / duration;
          const easeOut = 1 - Math.pow(1 - t, 3);
          props.x = lerp(startX, targetX, easeOut);
        }
        break;
      case 'slideInRight':
        if (relativeTime < duration) {
          const startX = CANVAS_WIDTH + 100;
          const targetX = props.x;
          const t = relativeTime / duration;
          const easeOut = 1 - Math.pow(1 - t, 3);
          props.x = lerp(startX, targetX, easeOut);
        }
        break;
      case 'pop':
        if (relativeTime < (duration * 0.5)) {
          const t = relativeTime / (duration * 0.5);
          // BackOut easing
          const c1 = 1.70158;
          const c3 = c1 + 1;
          const easeBack = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
          
          props.scaleX = lerp(0, props.scaleX, Math.min(1, easeBack));
          props.scaleY = lerp(0, props.scaleY, Math.min(1, easeBack));
        }
        break;
      case 'pulse':
          const pulseSpeed = 2 / duration; // Hz adjusted by duration (slower duration = slower pulse)
          const scaleAmp = 0.05;
          const sineWave = Math.sin(relativeTime * Math.PI * pulseSpeed) * scaleAmp;
          props.scaleX += sineWave;
          props.scaleY += sineWave;
          break;
    }
  }

  return props;
};