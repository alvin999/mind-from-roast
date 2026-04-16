export const themesConfig = {
    'zen': 'assets/video/bg_pingpong.mp4',
    'cafe': 'assets/video/bg2_pingpong.mp4'
};

export const CIRCLE_RADIUS = 140;
export const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const getModeConfig = () => ({
    FOCUS: { id: 'work-mode', textKey: 'focus_time', default: 25, options: [25, 45, 60] },
    SHORT_BREAK: { id: 'short-break-mode', textKey: 'short_break', default: 5, options: [5, 10, 15] },
    LONG_BREAK: { id: 'long-break-mode', textKey: 'long_break', default: 15, options: [15, 20, 30] }
});
