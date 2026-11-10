export const FEEDBACK_TOOLS = ['analyzer', 'attributes', 'bestiary', 'blacksmith', 'build_planner', 'calendar', 'dungeon_break', 'dungeons', 'fortress', 'guilds', 'hellevator', 'hydra', 'idle', 'inventory', 'pets', 'raids', 'scrapbook', 'simulator', 'stats', 'underworld'] as const

export type FeedbackTool = (typeof FEEDBACK_TOOLS)[number]
