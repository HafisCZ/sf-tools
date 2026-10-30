export const FEEDBACK_TOOLS = ['analyzer', 'attributes', 'blacksmith', 'calendar', 'dungeons', 'fortress', 'guilds', 'hellevator', 'hydra', 'idle', 'inventory', 'pets', 'raids', 'scrapbook', 'simulator', 'stats', 'underworld'] as const

export type FeedbackTool = (typeof FEEDBACK_TOOLS)[number]
