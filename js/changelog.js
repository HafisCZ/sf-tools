const ANNOUNCEMENTS = [
    {
        id: '17-11-2024',
        title: 'Hellevator Themes & Google situation',
        content: `
            <b>Hellevator Themes</b><br>
            After going through all of your feedback I have decided to reintroduce Hellevator themes back. You will not be able to select which theme you want to simulate but it will now always use the latest available theme.<br><br>
            <b>Google</b><br>
            As you might have noticed, SF Tools pretty much disappeared from Google search. In the beginning of this month it suddenly got deindexed by Google and it refuses to let it go back. I hope that it will get resolved soon but until then it relies on you, to spread the word.<br><br>
            And do not forget, if you want to support SF Tools then use the code <code class="text-orange" style="font-family: arial;">SFTOOLS</code> when buying mushrooms. 
        `
    },
    {
        id: '11-07-2024',
        for: ['hellevator', 'raids'],
        title: 'Hellevator & Raid Simulator',
        disabled: true,
        content: `
            As you might quickly notice, Hellevator themes are no longer available for you to select in the simulator.<br>
            This is because of the constant need to keep them up to date for upcoming Hellevators which is quite inpractical or impossible (for Hellevator Raids).<br>
            Due to this I have decided to remove themes completely in favor of Min, Avg and Max win chances.<br>
            These are calculated by simulating fights against all 9 combinations of monsters (3 classes and 3 runes) and showing the lowest, average and highest chances to beat them.
        `
    },
    {
        id: '10-07-2024',
        title: 'WebShop Code',
        content: `
            I am happy to announce that SF Tools was granted its very own WebShop code.<br><br>If you want to support the website development via your normal shroom purchases, simply introduce the code <code class="text-orange" style="font-family: arial;">SFTOOLS</code> at checkout.
        `
    },
    {
        id: '09-07-2024',
        title: 'The age of Templates is over!',
        disabled: true,
        content: `
            It took long enough but we are finally here, templates are no more.<br>
            Now welcome new scripts, which is just like templates, but much much better! Here are some of the benefits:<br><br>
            <div style="margin-inline: 2em;">
                &bullet; One script can be applied to multiple tables. Previously a script would be duplicated for each table leading to a management nightmare.<br><br>
                &bullet; Scripts can have a name and description, unlike templates which allowed only name. When publishing a script you will now also be required to specify your name so online scripts won't appear without author.<br><br>
                &bullet; When using online script, you will be able to see if the author published a new version as well as see how many times the script was used.<br><br>
                &bullet; You can easily duplicate existing scripts or create new ones from scratch.
            </div>
            <br>
            Sound like a lot? Don't worry! <b class="text-orange">Your existing scripts and templates will all be safe and converted to the new system!</b> However you might need to clean your converted library a bit :).
        `
    }
]

const CHANGELOG = {
    'v7.4811': {
        'Statistics': [
            'Added character and guild links to backup file',
            'Added header for Sandstorm dungeon',
            'Added support for Gladiator being read from player data',
            'Added support for daily tasks being read from player data',
            'Added command to control sticky headers',
            'Fixed rune amount approximation not using total resistance runes'
        ],
        'Hellevator Simulator': [
            'Added support for Snacks / Treats'
        ],
        'Raid Simulator': [
            'Added first 50 normal raids',
            'Added hellevator raids'
        ],
        'Dungeon Simulator': [
            'Added new Sandstorm dungeon',
            'Fixed mirror enemy class being incorrectly set when simulating more than once',
            'Fixed pasting of copied companions',
        ],
        'Fight Analyzer': [
            'Added support for Fightstring v2',
            'Added option to assume maximum armor'
        ],
        'Endpoint': [
            'Added support for rate-limiting'
        ],
        'All Tools': [
            'Added support for Necromancer',
            'Added support for reworked Druid',
            'Adjusted fist damage calculations for all classes'
        ]
    },
    'v7.4638': {
        'Statistics': [
            'Added new script visibility & verification system (you can now request script to be made public/private)',
            'Added <code>border color</code> command for custom border colors',
            'Added <code>includes</code> and <code>excludes</code> array functions',
            'Added tags for groups',
            'Added support for groups to <code>select</code> and <code>reject</code> actions',
            'Added <code>discard reference</code> command to discard player compare data',
            'Added periodic backup reminders',
            'Replaced table preload dropdown with plain input',
            'Fixed legendary scrapbook items not being detected',
            'Fixed comparison data not loaded correctly',
            'Fixed file counter not resetting when reopening the tab',
            'Fixed empty script not being able to be selected',
            'Fixed <code>outdated</code> command not working',
            'Fixed labels appearing split on files',
            'Fixed player & group counter counting slowly'
        ],
        'Fight Analyzer': [
            'Fixed simulator shortcut'
        ],
        'Hellevator Simulator': [
            'Added new hellevator theme',
            'Fixed prefill for characters without any hellevator progress'
        ],
        'Guild Simulator': [
            'Added support for debugging tools'
        ],
        'Pet Calendar': [
            'Updated pet locations'
        ],
        'Dungeon Simulator': [
            'Reordered enemies in first 10 dungeons',
            'Improved accuracy of Nordic Gods & Olympus dungeons',
            'Added confirmation when hiding characters via statistics integration'
        ],
        'Gold & Experience': [
            'Added enchantments to Quests calculations',
            'Added Expeditions calculations'
        ],
        'All Simulators': [
            'Fixed switch to Warrior via cheat menu',
            'Fixed Assassin unarmed damage',
            'Fixed custom preset dialog',
            'Fixed configuration dialog growing beyond the window'
        ],
        'All Tools': [
            'Added new optimized dialog system',
            'Added separate translations for items and monsters',
            'Added lazy loading system for separate translations',
            'Added feedback form'
        ]
    },
    'v7.4528': {
        'Statistics': [
            'Added support for manual character/guild merging',
            'Added support for multiple tags per player',
            'Added support for capturing player descriptions',
            'Added support for capturing guild descriptions',
            'Added <code>select</code> and <code>reject</code> actions for better player filtering',
            'Added multiple performance optimizations',
            'Added <code>Attribute type</code> header',
            'Added display value for legacy fox mount',
            'Removed 10th item slot from classes which do not use it',
            'Fixed quick swap in guild table',
            'Fixed broken items when exporting only public data',
            'Fixed companion gem bonus applying twice',
            'Fixed error when pressing ESC in script editor with no table set',
            'Fixed advanced file list not acessible with guild named None'
        ],
        'Dungeon Simulator': [
            'Fixed mirror enemy health for shadow variant',
            'Fixed mirror enemy class image not appearing',
            'Fixed broken enemy dropdown',
            'Fixed berserker dungeon enemy auto armor calculation'
        ],
        'Guild Simulator': [
            'Fixed inactivity health reduction',
            'Fixed displayed inactivity duration'
        ],
        'Gold & Experience': [
            'Fixed Mage Tower upgrade prices'
        ],
        'Endpoint': [
            'Added button to select all characters in Capture selected characters mode',
            'Fixed login with passwords above 40 characters',
            'Fixed hidden character list not persisting across reloads'
        ]
    },
    'v7.4394': {
        'Statistics': [
            'Added new browse table for guilds',
            'Added checkbox to create new script out of online code immediately',
            'Added support for capturing of daily and event tasks',
            'Added support for capturing Hellevator data for players and guilds',
            'Added <code>get_day</code> function',
            'Added size limit to script archive',
            'Added new guild-only headers',
            'Removed script assignments when opening statistics in temporary mode',
            'Fixed <code>Power</code> header to account for no weapon equipped',
            'Fixed multiline script descriptions',
            'Fixed copy for fight simulator',
            'Fixed script editor crashing when adding brackets to end of script',
            'Fixed drag and drop inside the editor',
            'Fixed guild table image export with fixed layout',
            'Fixed highlighting for files filter'
        ],
        'Fight Simulator': [
            'Removed gladiator and glove enchantments from debug presets'
        ],
        'Hellevator Simulator': [
            'Added new hellevator theme',
            'Fixed first round loss counting as win against all floors'
        ],
        'Endpoint': [
            'Updated to Unity 2023'
        ]
    },
    'v7.4306': {
        'Statistics': [
            'Reworked Scripts & Templates',
            'Added author name and description to published scripts',
            'Added indicator for when new version of published scripts is found',
            'Added usage count for published scripts',
            'Added filter by type to script archive'
        ],
        'Fight Analyzer': [
            'Added option to open prefilled player simulator for a selected group'
        ],
        'Fight Simulator': [
            'Added debug option to generate custom characters'
        ],
        'All Tools': [
            'Added support for Necromancer'
        ]
    },
    'v6.4154': {
        'Statistics': [
            'Added new setting to make table headers sticky',
            'Added autocompletion to script editor (<code>Ctrl + Space</code>)',
            'Added <code>Official Discord</code>, <code>Twitch Frame</code>, <code>Health Multiplier</code>, <code>Weapon Damage Multiplier</code>, <code>Maximum Damage Resistance</code>, <code>Power</code> and <code>Gold</code> headers',
            'Added <code>indexed custom header</code> to use first column as custom index column',
            'Added new berserker icon',
            'Added <code>this</code> as a function',
            'Added new <code>repeat</code> keyword to mark header as repeated',
            'Added deprecated status to <code>header as group of</code>, <code>padding</code>, <code>brackets</code>, <code>set with all</code>, <code>breakline</code>, <code>extra</code>, and <code>mset</code> keywords',
            'Added <code>display before</code> and <code>display after</code> keywords to display additional text in cell',
            'Added <code>difference brackets</code> command to wrap difference in brackets',
            'Added <code>difference position</code> command to place difference below the value',
            'Added <code>table set</code> and <code>global set</code> variable commands',
            'Added expression as a value to <code>statistics color</code>',
            'Added list of keywords to the manual',
            'Added limit of 200 entries to script archive',
            'Added new button to each archive entry to copy its content',
            'Added missing legendary item names and images',
            'Added <code>~</code> operator that can test a string against a regexp string',
            'Added support for <code>Ctrl + S</code> and <code>Ctrl + Shift + S</code> in the editor',
            'Added support for <code>Ctrl + Shift + X</code> to comment/uncomment content in the editor',
            'Fixed dropdowns not updating on browse tab',
            'Fixed scoped functions breaking editor when called without arguments',
            'Fixed <code>show as</code> not appearing as deprecated',
            'Fixed table timestamps not working in <code>discard</code>',
            'Fixed expressions not highlighting inside conditions',
            'Fixed localization with arguments',
            'Removed obfuscation setting'
        ],
        'Hellevator Simulator': [
            'Added support for logging',
            'Added new hellevator theme'
        ],
        'Pet Simulator': [
            'Fixed pet health not increasing properly when using generate',
            'Fixed pet selection'
        ],
        'Dungeon Simulator': [
            'Added 10th enemy of The Pyramids of Madness'
        ],
        'All Simulators': [
            'Added option to select best rune automatically based on the current enemy',
            'Added more debugging variables',
            'Fixed shield value when morphing into warrior'
        ],
        'All Tools': [
            'Added <code>SFTOOLS</code> content creator code to the main page',
            'Added new link to community-made tool on the main page'
        ]
    },
    'v6.3875': {
        'Statistics': [
            'Added button to import & export a script as a file',
            'Added <code>width policy strict</code> to lock columns to exact <code>width</code>',
            'Added visible script version next to script name',
            'Added ctrl click action to script archive to recover previous script version if present',
            'Added option to disable strict sizing with <code>width policy relaxed</code>',
            'Added new <code>limit</code> keyword to replace <code>performance</code>',
            'Added deprecated status to <code>performance</code> and <code>format</code> keywords',
            'Added <code>Calendar Type</code> and <code>Calendar Day</code> headers',
            'Added <code>Guild Raids</code> header as header <code>Raids</code> returns only raid you participated in',
            'Added new optimized implementation of timestamp dropdowns',
            'Fixed grouped headers ignoring maximum count',
            'Fixed resolving of <code>now</code> and <code>random</code> functions',
            'Fixed <code>row height</code> keyword'
        ],
        'All Simulators': [
            'Added many performance improvements',
            'Added new implementation for toggle buttons',
            'Replaced percentage configuration values with decimals'
        ],
        'Hellevator Simulator': [
            'Added new hellevator theme'
        ],
        'Endpoint': [
            'Added EU4 to whitelist'
        ],
        'All Tools': [
            'Added support for other websites to request character data from SFTools',
            'Added new link to community-made tool on the main page',
        ]
    },
    'v6.3736': {
        'Statistics': [
            'Added option to save table as CSV file',
            'Added many performance improvements',
            'Added line numbers to script editor',
            'Added alternative <code>row</code> keyword for <code>show</code>',
            'Fixed script editor losing focus when switching tabs',
            'Removed insecure table check'
        ],
        'Dungeon Simulator': [
            'Added new button for simulator threshold settings',
            'Fixed debug copy'
        ],
        'All Simulators': [
            'Added debug preset with maximum weapon damage ranges',
            'Added new notice system'
        ],
        'Endpoint': [
            'Updated to newer Unity version',
            'Fixed close button not clickable in specific cases',
            'Fixed interruption errors not recognized properly'
        ],
        'All Tools': [
            'Added new link to community-made tool on the main page',
            'Fixed scrollbar not properly visible in dialogs'
        ]
    },
    'v6.3586': {
        'Statistics': [
            'Improved performance of table rendering',
            'Added missing player resources',
            'Added all valid css colors as constants',
            'Added new battlemage icon',
            'Fixed manual dialog not closable via close button',
            'Fixed sorting',
            'Fixed undefined text when table block is not available',
            'Fixed missing table row end tag'
        ],
        'Pet Simulator': [
            'Fixed display of gladiator % damage'
        ],
        'Endpoint': [
            'Added support for S&F Accounts',
            'Reworked communication'
        ]
    },
    'v6.3469': {
        'Statistics': [
            'Added new file export dialog',
            'Added new in-tool manual as a replacement for old manual page',
            'Added missing images of legendary items',
            'Added <code>tab</code> url query to directly open specified tab',
            'Added new custom context menu',
            'Added performance optimizations',
            'Replaced <code>Slot</code> item field',
            'Replaced <code>Position</code> item field with <code>SlotType</code> and <code>SlotIndex</code> fields',
            'Removed <code>Item Slot</code> header',
            'Fixed scrapbook count enum',
            'Fixed player detail displaying missing data',
            'Fixed secondary player & group profile filters',
            'Fixed tooltip alignment'
        ],
        'Dungeon Simulator': [
            'Fixed Twister experience display'
        ],
        'Hellevator Simulator': [
            'Added theme selector',
            'Added monster damage ranges'
        ],
        'Fight Analyzer': [
            'Added customizable group sorting'
        ],
        'All Simulators': [
            'Added reworked battlemage',
            'Added reworked critical damage calculation',
            'Added more accurate berserker'
        ]
    },
    'v6.3394': {
        'Statistics': [
            'Added <code>Pet Rank</code> and <code>Pet Honor</code> headers',
            'Added discarded scripts to script archive',
            'Added return action to script tab when opened from any table',
            'Added show-on-hover to Webshop ID inside player detail',
            'Fixed loading of old characters with legacy 3-stat items',
            'Fixed players picked inconsistently for comparison'
        ],
        'Fight Simulator': [
            'Removed debug simulator'
        ],
        'Pet Simulator': [
            'Added dependency on player simulator in order to accommodate possible future reworks',
            'Added support for logging'
        ],
        'Pet Calendar': [
            'Reworked tool',
            'Added support for translations'
        ],
        'Fight Analyzer': [
            'Added option to copy player data as a table',
            'Added decimal, percentage and fractional options for enrage counter',
            'Added customizable base damage error margin',
            'Added new custom state display for Bards and Druids',
            'Added new damage range sidebar',
            'Added missing health field',
            'Added statistical analysis tool',
            'Added gladiator reduction mode',
            'Fixed catapult attack',
            'Fixed grouped fights not sorted by fight count'
        ],
        'All Simulators': [
            'Improved performance',
            'Improved accuracy'
        ],
        'All Tools': [
            'Fixed scrolling when a dialog is visible',
            'Fixed statistics integration displaying other players when imported via integration'
        ]
    },
    'v6.3263': {
        'Statistics': [
            'Added <code>Race</code> header',
            'Added translated values to headers and enums',
            'Added member counters next to group timestamps if any members are missing from capture',
            'Added <code>text</code> expression for text color (use <code>text auto</code> to make select automatically)',
            'Added <code>theme dark|light</code> setting for table themes',
            'Added <code>theme text:color background:color</code> setting for custom table themes',
            'Added new dialogs for browsing scripts and managing templates',
            'Added new script &amp; template archive system to replace script history',
            'Added Webshop ID to player detail and as a private header',
            'Added <code>Official Creator</code>, <code>Gold Frame</code> and <code>GT Background</code> headers',
            'Added improved public export',
            'Added missing header formatting and translations',
            'Added translations to enums',
            'Fixed guild deletion via advanced file list',
            'Fixed counting of present guild members',
            'Fixed scrapbook size',
            'Fixed private export not including own characters'
        ],
        'Fight Analyzer': [
            'Added new tool that serves as a replacement for Fight Viewer and Boss Viewer',
            'Added missing enemy names'
        ],
        'Hydra Simulator': [
            'Fixed maximum hydra level after import'
        ],
        'Fight Simulator': [
            'Currently selected player will be marked as target when switching to 1 v All or All v 1 modes',
            'Currently selected simulator mode will now be persistent'
        ],
        'Fortress Simulator': [
            'Replaced fortifications input with a dropdown'
        ],
        'Hellevator Simulator': [
            'Added prototype simulator'
        ],
        'Endpoint': [
            'Added proper error messages when login or data capture fails'
        ],
        'All Tools': [
            'Added dark theme',
            'Added new terms &amp; conditions that must be accepted before using Endpoint',
            'Added links to community-made tools on the main page',
            'Added updated Druid',
            'Added updated Bard',
            'Updated styling of all dialogs',
            'Removed fight viewer tool',
            'Removed boss viewer tool'
        ]
    },
    'v5.2897': {
        'Statistics': [
            'Added guild tournament headers <code>GT Tokens</code>, <code>GT Floor</code> and <code>GT Maximum Floor</code>',
            'Added un/loading of hidden data without requiring page reload',
            'Added missing notification when database is being updated',
            'Added search bar to guild list',
            'Added new toggle buttons to replace old checkboxes in bottom right of the page',
            'Added guilds to advanced file list (you may now manage them separately from players)',
            'Added timestamps to players & groups in deletion confirmation dialog',
            'Fixed file tag button not removing tag filter when clicked when active',
            'Fixed file merging with duplicate players / groups',
            'Fixed file and script sharing no longer available',
            'Fixed players duplicating when using uppercase server url',
            'Fixed scrapbook size',
            'Merged tracker configuration into actions script',
            'Removed profile and origin fields from files',
            'Removed embedded simulator and related headers'
        ],
        'Fortress Simulator': [
            'Redesigned simulator to allow for multiple battles to be simulated at once'
        ],
        'Fight Simulator': [
            'Added option to disable attribute reduction',
            'Added option to freely configure certain class behaviors',
            'Redesigned tournament mode'
        ],
        'Guild Simulator': [
            'Fixed gladiator being reduced'
        ],
        'Dungeon Simulator': [
            'Added progress bar to loader',
            'Added option to freely configure certain class behaviors',
            'Added maximum value to threshold simulation',
            'Added split dungeons when simulating remaining dungeon floors',
            'Fixed cheats',
            'Fixed experience displaying for Tower',
            'Fixed total experience displaying with 0 possible experience'
        ],
        'Pet Simulator': [
            'Added editable thread and iteration counts (including separate iteration count for pet maps)'
        ],
        'Arena Manager': [
            'Reworked tool'
        ],
        'Endpoint': [
            'Added option to save first 50 characters in Hall of Fame'
        ],
        'Gold & Experience': [
            'Updated gold pit capacity formula',
            'Added dark theme'
        ],
        'Blacksmith': [
            'Added dark theme'
        ],
        'All Simulators': [
            'Added progress bar to simulations',
            'Added hiding of players & guilds and other options in statistics integration'
        ],
        'All Tools': [
            'Updated to new version of FUI',
            'Added support for Hungarian language',
            'Added support for player level 701 - 800',
            'Removed loading of english language file when different language is selected'
        ]
    },
    'v5.2675': {
        'Statistics': [
            'Added option to export & import recovery files',
            'Added item pictures',
            'Added new dungeons',
            'Added new achievements',
            'Added mushroom price to items',
            'Added new dialog for deleting players, groups and files',
            'Fixed background color in custom rows',
            'Fixed crash when displaying lone empty guild',
            'Fixed scrapbook count',
            'Fixed endpoint not fetching player groups',
            'Fixed crash when importing files without server urls',
            'Removed separation between private & public dungeon headers'
        ],
        'Pet Simulator': [
            'Removed beta backend switch'
        ],
        'Fight Simulator': [
            'Added option to enable fireball fix against certain classes',
            'Added <code>?debug</code> parameter for simulation debugging'
        ],
        'Arena Manager': [
            'Fixed runes not rounding down to 20 (as per new backend)'
        ],
        'Dungeon Simulator': [
            'Added option to simulate all open dungeons until certain win threshold',
            'Added floor numbers to result screen',
            'Added display of boss experience to mass simulations',
            'Added display of total experience gainable to mass simulations',
            'Added console method for export current boss and dungeon to fight simulator',
            'Fixed dungeons not ordered properly',
            'Fixed dungeons not selecting correct floor when duplicate enemies exist'
        ],
        'All Simulators': [
            'Added support for reworked Druid',
            'Fixed low performance when starting All & More simulation modes',
            'Fixed undefined gladiator value when using integration',
            'Fixed logging for Demon Hunter and Druid'
        ],
        'Pet Calendar': [
            'Fixed location descriptions'
        ],
        'Gold & Experience': [
            'Added support for translations'
        ],
        'Blacksmith Upgrades': [
            'Added support for translations',
            'Reworked UI using new editor'
        ],
        'Boss Viewer': [
            'Added option to export current data into usable sftools format'
        ],
        'All Tools': [
            'Fixed content appearing only after page is fully loaded'
        ]
    },
    'v5.2469': {
        'Statistics': [
            'Reworked player list',
            'Added translations',
            'Added database slots to profiles',
            'Added <code>time</code> format function',
            'Added <code>$$</code> prefix for unfiltered table variables',
            'Added toast message when import via Endpoint fails',
            'Added <code>Stashed Wood</code> and <code>Stashed Stone</code> headers for secret stash',
            'Added new dialog for saving templates',
            'Fixed selection screen appearing for players and guilds when only one exists',
            'Fixed gladiator for built-in simulator',
            'Fixed low performance in files tab with too many files/players',
            'Fixed template delete button staying active with no templates',
            'Fixed low performance in players tab'
        ],
        'Pet Simulator': [
            'Added best pets for each class to simulate all',
            'Added translations'
        ],
        'Dungeon Simulator': [
            'Added option to simulate all remaining enemies in a dungeon',
            'Adjusted values of several dungeons'
        ],
        'Fight Simulator': [
            'Added inverse of One vs. All mode',
            'Set adding new players to be at the top of the player list'
        ],
        'Guild Simulator': [
            'Reworked simulator'
        ],
        'All Simulators': [
            'Added translations',
            'Added support for drag & drop of HAR files',
            'Added new class graphics',
            'Fixed Bard simulation'
        ],
        'Gold & Experience': [
            'Moved gold table into separate tab'
        ],
        'Fight Viewer': [
            'Added support for Bard'
        ],
        'Boss Viewer': [
            'Added support for character data deltas'
        ]
    },
    'v5.2250': {
        'Statistics': [
            'Added toast message when database is being updated',
            'Fixed visibility of some headers (due to new BE)',
            'Fixed Bard missing instrument in player detail'
        ],
        'Underworld Simulator': [
            'Added new simulator'
        ],
        'Dungeon Simulator': [
            'Added option to save image of Simulate All results',
            'Added class swap to cheat menu',
            'Fixed armor calculation for Battlemage bosses'
        ],
        'Fight Simulator': [
            'Added new toast messages informing user about simulation progress',
            'Added option to save image of fight results',
            'Added new <code>log</code> query argument',
            'Added option to poll saved characters',
            'Split IHOF button into two IHOF & force gladiator 15 buttons',
            'Fixed Tournamed mode freezing UI when starting simulation',
            'Fixed drag & drop'
        ],
        'Pet Simulator': [
            'Reworked UI',
            'Fixed missing input for pets between 150 - 199',
            'Fixed position of New BE checkbox for small screens',
        ],
        'Hydra Simulator': [
            'Fixed thirteen-headed hydra',
            'Fixed poor performance when using Poll',
            'Fixed drag & drop'
        ],
        'All Simulators': [
            'Reworked Bard simulation',
            'Reworked major parts of the UI',
            'Added smart class changer (scales all values automatically)',
            'Added warning when importing incompatible HAR file',
            'Fixed paste target appearing in mobile view',
            'Fixed Druid damage reduction when having no mask',
            'Fixed attribute fields allowing zeroes',
            'Removed 2 billion HP limit'
        ],
        'All Tools': [
            'Removed <code>Go back</code> buttons'
        ]
    },
    'v5.2134': {
        'Statistics': [
            'Added support for Bard class',
            'Added <code>Hydra</code> field to groups',
            'Reworked several dialogs',
            'Fixed tracking of deleted players',
            'Fixed counting of present guild members',
            'Fixed crash when trying to format non-string value'
        ],
        'Inventory Manager': [
            'Added support for Bard class'
        ],
        'All Simulators': [
            'Added support for Bard class',
            'Added support for reworked Demon Hunter class',
            'Added editable block chance for warriors (please adjust your saved presets)',
            'Reworked UI & simulator code'
        ],
        'Hydra Simulator': [
            'Added Endpoint integration'
        ],
        'Pet Simulator': [
            'Fixed Sim All button showing when no dungeons are left'
        ]
    },
    'v5.2000': {
        'Statistics': [
            'Added auto tagging action',
            'Added embedded tables',
            'Added default tab setting',
            'Added tag filter to advanced file list',
            'Added shortcut function <code>img</code> for images',
            'Added popup for adding templates via url',
            'Added <code>constexpr</code> constants that use expressions',
            'Added backslash escape for # comments',
            'Added new default player template (@dracs)',
            'Fixed constants inside macros',
            'Fixed spaces in share codes',
            'Fixed compatibility issues',
            'Fixed missing item translations',
            'Fixed select all for simple file list',
            'Fixed negative named numbers',
            'Fixed broken achievements',
            'Fixed script editor default font size',
            'Fixed loops without ending tags'
        ],
        'Endpoint': [
            'Added option to save friend characters'
        ],
        'All Simulators': [
            'Berserkers now have chance to evade first attack'
        ],
        'Dungeon Simulator': [
            'Adjusted weapon damages for berserker enemies'
        ],
        'Fight Simulator': [
            'Added option to drag & drop file instead of copy & pasting',
            'Fixed undefined prefix when switching to IHOF mode',
            'Fixed assassin\'s second attack missing from debug logs'
        ],
        'Gold & Experience': [
            'Added fortress tab',
            'Added underworld tab'
        ]
    },
    'v5.1922': {
        'Statistics': [
            'Improved file metadata',
            'Added missing loaders',
            'Added inventory slot information to items',
            'Added option to hide files where all players were hidden individually',
            'Added <code>hsl(a)</code> function',
            'Added calendar data',
            'Added error if database did not load properly',
            'Added <code>table_array</code> and <code>table_array_unfiltered</code> variables',
            'Fixed underworld upgrades when player has yet to unlock underworld',
            'Fixed custom order',
            'Fixed issue when removing all files',
            'Fixed discarded players appearing in table variables',
            'Fixed endpoint player picker'
        ],
        'Dungeon Simulator': [
            'Added health chart into sim-all results',
            'Added missing loaders'
        ],
        'Pet Simulator': [
            'Added missing loaders'
        ],
        'Boss Viewer': [
            'Fixed loading of HAR files for chrome'
        ],
        'Gold & Experience': [
            'Added MajkG\'s souls curve'
        ]
    },
    'v5.1856': {
        'Statistics': [
            'Added filters for guilds to profiles',
            'Added proper hiding for files',
            'Added prefix to duplicate player names in advanced settings',
            'Added option to show empty guilds',
            'Added separate tab for site options',
            'Added current tab highlighting',
            'Added fallback for missing last active time',
            'Added <code>loop_array</code> variable to loop functions',
            'Added player, reference and properties as scope objects',
            'Added default values to <code>each</code> function',
            'Added short table variable syntax',
            'Added pow operator (<code>^</code>)',
            'Added <code>exp</code> function',
            'Fixed player requirement for some headers',
            'Fixed guild member count',
            'Fixed direct sharing for guilds',
            'Fixed copy for browse table',
            'Fixed guild lookup for nonexisting players',
            'Fixed achievements not importing for beta',
            'Fixed compatibility issues',
            'Fixed copy for older timestamps',
            'Fixed share code not trimmed',
            'Fixed incomplete arrays and objects in expressions'
        ],
        'Dungeons Simulator': [
            'Fixed Twister quick selection'
        ],
        'Pet Simulator': [
            'Changed armor toggle to include message about beta backend',
            'Removed save & load feature'
        ],
        'Gold & Experience': [
            'Added Enza\'s real gold pit values'
        ]
    },
    'v5.1785': {
        'Statistics': [
            'Added proper profiles & profile management',
            'Added file tags',
            'Added option to hide players / timestamps',
            'Added option to change file timestamps',
            'Added option to select multiple files by using shift-click',
            'Added notice for player list longer than allowed',
            'Fixed handling of local storage when not available',
            'Fixed timestamp sorting in advanced file mode',
            'Fixed filtering by non-ascii characters',
            'Fixed several issues when using translation tools',
            'Fixed compatibility issues',
            'Fixed empty guilds appearing',
            'Fixed swapped pet origins'
        ],
        'Dungeon Simulator': [
            'Available boss selection is now linked to dungeon & boss selections'
        ],
        'Pet Simulator': [
            'Fixed generate not working for 20th pet'
        ]
    },
    'v5.1716': {
        'Statistics': [
            'Reworked database & file handling and loading improved speed',
            'Reworked response parser',
            'Added many performance optimizations',
            'Added advanced & simple modes for file management',
            'Added origin value to players (how they were added into the tool)',
            'Added several group headers',
            'Added item names',
            'Added Summer event and other misc data',
            'Added simple tool profiles',
            'Added new version of html2canvas library',
            'Fixed settings bug when using Safari on iOS',
            'Fixed custom rows without players in Me',
            'Fixed cacheable detection for expressions',
            'Fixed headers for misordered dungeons',
            'Fixed scrapbook decoding',
            'Fixed extensive loading time of Files tab',
            'Removed option to disable lazy loading'
        ],
        'Dungeon Simulator': [
            'Added standalone endpoint & HAR integration',
            'Added Tavern of the Dark Doppelgangers',
            'Adjusted several armor values for Shadow World opponents'
        ],
        'Pet Simulator': [
            'Added standalone endpoint & HAR integration',
            'Added simulate all option',
            'Fixed mage check for whether fight is possible'
        ],
        'Boss Viewer': [
            'Added support for companion data'
        ],
        'Inventory Manager': [
            'Added Mannequin',
            'Fixed shop items not appearing'
        ],
        'All tools': [
            'Added new Terms of Service and Changlog pop-ups',
            'Added partial support for multiple languages',
            'Added Sentry for error tracking',
            'Added new gem look'
        ]
    },
    'v4.1443': [
        'Added default sorting order.',
        'Added macro-able variables and fuctions.',
        'Added access to site options to macros.',
        'Added <code>t</code> filter option.',
        'Added <code>table_reference</code> and <code>table_timestamp</code> timestamps to settings.',
        'Added drag & drop to settings.',
        'Added <code>discard</code> to player table.',
        'Added statistic rows to Me tab.',
        'Added access to scrapbook data.',
        'Added progress bar to endpoint.',
        'Fixed infinite recursion in variables.',
        'Fixed script list when not available.',
        'Fixed achievement names.',
        'Removed private flags.',
        'Disabled unity cache for endpoint.'
    ],
    'v4.1346': [
        'Reworked macros.',
        'Reworked expression scopes',
        'Added nested loops.',
        'Added <code>else if</code> macro.',
        'Added tab handling to the setting editor.',
        'Added <code>pow</code> function.',
        'Improved performance for large settings.',
        'Fixed images missing from download.',
        'Fixed <code>makesequence</code> function.',
        'Fixed missing difference for Me tables.',
        'Fixed modulo operator priority.',
        'Fixed clipping for long rows in settings.',
        'Fixed bold style in tables.',
        'Fixed bracket handling in expressions.',
        'Removed bundled settings.'
    ],
    'v4.1257': [
        'Added new macro-style variables to loops.<br/>Please note that old style <code>var</code> variables will be removed at some point (this refers to vars generated by the loop and not to all <code>var</code>).',
        'Added expressions into macro conditions.',
        'Added new templating syntax for strings.',
        'Added sub expressions.',
        'Added <code>$!</code> local embedded variables.',
        'Added <code>Mount Expire</code>, <code>Coins</code>.',
        'Added <code>Dummy</code> for Mannequin.',
        'Added more optimizations for variables.',
        'Added <code>qc</code> filter option to show only selected categories.',
        'Added <code>entries</code> for access to player database entries.',
        'Added missing <code>expf</code> shortcut for <code>format</code> expression.',
        'Added save & apply button to templates.',
        'Added <code>breakline</code> keyword to disable line breaks.',
        'Added <code>sqrt</code> function.',
        'Set share function to be public.',
        'Set endpoint to be public with a checkbox.',
        'Fixed scope for loops with several headers.',
        'Fixed character status.',
        'Fixed operator order for expressions.',
        'Fixed berserker class bonus.',
        'Fixed multi-select for custom left category.',
        'Fixed scrapbook maximum.',
        'Fixed averaged resistance calculation.',
        'Fixed too high loading times when saving a picture.',
        'Removed server selection from endpoint login.',
        'Removed developer view.'
    ],
    'v4.1100': [
        'Added trackers. You can now save any data from milestones you want to track.<br/>Check the <a href="https://github.com/HafisCZ/sf-tools/wiki/6.-Trackers">wiki</a> to learn how they work and what you can do with them.',
        'Reworked template saving. To save a template click on the Save button and write a name / select existing template and click Save again.',
        'Reworked members keyword to be more compact.',
        'Added <code>makesequence</code> function.',
        'Added <code>average</code> function',
        'Added <code>makearray</code> function',
        'Added custom row height using the <code>row height</code> keyword.',
        'Added title alignment to the <code>align</code> keyword.',
        'Added macro loops to settings.',
        'Added <code>left category</code> category for custom left columns in the tables.',
        'Added <code>action show</code> keyword that opens player detail when cell is clicked.',
        'Added header variables accessible using the <code>var</code> keyword.',
        'Added <code>expa</code> expressions for custom aliases.',
        'Improved performance when using lazy loading.',
        'Fixed images not clickable when used in header titles.',
        'Fixed settings area not working properly on smaller screens.',
        'Fixed custom styles.',
        'Fixed width of grouped headers.',
        'Fixed table issues when using Chrome-type browsers.',
        'Fixed duplicated names when using Endpoint.'
    ],
    'v4.1007': [
        'Completely reworked settings and table generator',
        '<code>members</code>, <code>outdated</code>, <code>opaque</code>, <code>large rows</code> no longer accept an argument. Use just them to enable the functionality.',
        'Undefined values are now always on the bottom when sorting.',
        'Added fallback to value and color rules if expressions return undefined.',
        'Added <code>align title</code> keyword that aligns all titles to the bottom.',
        'Added expression cache to improve performance.',
        'Added <code>indexof</code> and <code>distinct</code> functions.',
        'Added <code>discard</code> expression to the Me table that can ignore files.',
        'Added <code>row_index</code> variable',
        'Added <code>Scroll Finish</code>, <code>Toilet Fill</code>, <code>Building Start</code> and <code>Underworld Building Start</code> headers',
        'Added embedded table variables that you can use in the expression directly with:<br/><code>${ expression }</code><br/><code>$ variableName { expression }</code>',
        'Reworked <code>layout</code> option. Use two spaces to create a space or <code>|</code> to create a divider.',
        'Division operator now returns 0 when dividing by 0.',
        'Removed keyword abbreviations.',
        'Removed itemized headers.'
    ],
    'v3.943': [
        'Added template management (delete, update, share).',
        'Added website icon.',
        'Added file groups based on the file label.',
        'Added option to hide/unhide whole file group.',
        'Added <code>expneeded</code> function that returns xp needed for said level.',
        'Added toggle that allows extra inventory headers to work (backpack, chest, companions).',
        'Added new <code>import</code> keyword that can import another template into existing one.',
        'Added more debug information in console.',
        'Added option to change file timestamp in beta mode.',
        'Added table controller.',
        'Fixed copying players for fight simulator.',
        'Fixed history order.'
    ],
    'v3.910': [
        'Reworked settings screen.',
        'Reworked modal for importing shared files.',
        'Added colors to file entries.',
        'Added toggle to show/hide hidden files.',
        'Added template links.',
        'Added template quick swap (Right click the cog icon above the table).',
        'Added indexes to grouped headers.',
        'Added register date to player detail.',
        'Added <code>statsum</code> and <code>statcost</code> functions.',
        'Added <code>q</code> search term to show specified headers only.',
        'Fixed bracket handling in expressions.',
        'Fixed templates not sorted property.',
        'Fixed AM handling (You can just reimport the files without deleting them to fill missing AM info).',
        'Fixed Next button not becoming disabled in Endpoint.'
    ],
    'v3.881': [
        'Added headers for pet food, found pets and pet levels.',
        'Added sharing function for players, guilds and files.',
        'Added public scripts & way to import private scripts via simple code.',
        'Added file information with the guilds and players stored within.',
        'Added timestamps to exported files.',
        'Copying table for fight simulator now uses simulator model instead of copying all the data.',
        'Fixed bottom row being cut off for guild table images.',
        'Fixed rare bug that overwrote pet data under specific circumstances.',
        'Fixed mirror shard counter.'
    ],
    'v3.840': [
        'Added full support for Druid class.',
        'Added multiple selection for Players tab. You can hold CTRL and click to select several players at once. Use right click apply action to them.<br/>Letting go of CTRL will clear the selection!',
        'You can now hold CTRL during sorting to clear all column sorting via a right click or select only single column with left click.',
        'Tab options (show other, show hidden) are now sticky and do not disappear when reloading the page.',
        '<code>Gladiator</code> header now works only for own characters.',
        'You no longer need a special key to use the Endpoint feature',
        'Added experimental share function to guild tables.',
        'Performance improvements when using lazy loading.'
    ],
    'v3.797': [
        'Removed predefined categories. Category <code>Potions</code> was replaced by grouped header <code>Potions</code> with similar effect.<br/>You can look at an example <a href="https://pastebin.com/raw/xGdqzgBa">here</a>.',
        'Added grouped headers. These act like single header but accept array as an expression. Colors and formats apply to individual columns while other settings apply only to the whole header.',
        'Added <code>style</code> keyword that sets any css value of a cell.',
        'Added <code>lingradient</code> function that returns css linear gradient.',
        'Added options for color & value when cell value is not defined.',
        'Added <code>dualcolor</code> function that returns background with two colors.',
        'Added wipe button that clears all stored player data.',
        'Added color name support to gradient functions.',
        'Changed all cell widths into css style.'
    ],
    'v3.781': [
        'Added link to a wiki that will slowly replace the current manual page.',
        'Added base attributes to player detail.',
        'Added difference for several values to player detail.',
        'Added <code>format statistics</code> keyword that changes the formatting of the statistics.',
        'Usage terms are now available in Changelog tab and can be denied.'
    ],
    'v3.768': [
        'Added error text to guild tables when data is missing for any members.',
        'Added option to hide files.'
    ],
    'v3.748': [
        'Updated expression evaluator & removed all beta related content. The old evaluator is from now on not present in the tool.<br/><br/>Some of your expressions might not work if you did not use beta mode before. You\'ll need to correct them if that\'s the case.',
        'Updated Files screen. You can now add description and set the version of the file if needed.',
        'Added <code>difference</code> function that returns difference between current and reference values. You can look at example <a href="https://github.com/HafisCZ/sf-tools/wiki/2.-Basic-Expressions">here</a>',
        'Added <code>Raid Honor</code> header that shows fortress honor gained only from raids.',
        'Added <code>Name</code> header with player name.',
        'Added missing simple format options.',
        'Added <code>sr</code> filter option to Players that sorts the table.',
        'Added <code>sort</code> and <code>at</code> functions for arrays.',
        'Added <code>background</code> to left columns when set globally.',
        'Added copy option to guild context menu.',
        'Fixed <code>expr</code> not ignoring predefined options.',
        'Fixed filter expression in Players not data to compare.'
    ],
    'v3.726': [
        'Reworked player detail screen.',
        'Added category and header definitions. You can now create a group of options and extend any category or header with it.<br/>You can look at an example <a href="https://pastebin.com/raw/Zes71ez0">here</a>.',
        'Many fixes and improvements for new expression evaluator.'
    ],
    'v3.715': [
        'Added new expression evaluator.<br/><br/>You can use <code>ast beta</code> on top of your settings or select \'Force use of new expression evaluator\' in Files tab to apply it to everything.<br/><br/>It is recommended that you try to run all your settings using this evaluator since it will later replace the main one.<br/>Please note that some expressions might stop working or behave differently.'
    ],
    'v3.711': [
        'Tables are now blocked from displaying if they contain <code>script</code> or <code>iframe</code> HTML tags.',
        'Fixed future players selected when using timestamp where they do not exist.',
        'Fixed several bugs caused by <code>undefined</code> value in expressions.',
        'Added <code>if</code>, <code>else</code>, <code>endif</code> keywords that will ignore parts of settings depending on the type of the table',
        'Added wiki link to settings with all headers and their default options',
        'Added multiple enums.',
        'Added lambda functions.'
    ],
    'v3.693': [
        'Added <code>background</code> keyword that allows you to specify default color for header, category or the whole table.',
        'Added simulator target & source that allows you to run 1v1 simulations instead of 1vAll directly in the table.',
        'Added <code>gradient</code> multi-color variant that accepts objects with any amount of colors.',
        'Added <code>o:</code> filtering option that shows you only your own characters.',
        'Added <code>random</code> function.'
    ],
    'v3.682': [
        'You can now use <code>show as</code> everywhere. In Players tab it will be always shown on top of the table.',
        '<code>set with all</code> no longer requires a parameter and uses <code>this</code> keyword instead. You can look at an example <a href="https://pastebin.com/raw/Bb6w6pTp">here</a>.',
        'Functions <code>rgb</code> and <code>rgba</code> now return hex color values instead of css color string.',
        'Added <code>gradient</code> function that returns color at a specific point between two colors.',
        'Added <code>stringify</code> function that converts anything to a string.',
        'Added <code>log</code> function that prints value into console and returns it. <br/>It should be used only for debugging purposes.',
        'Added highlighting to custom variables and functions.',
        'Added short keywords for expressions (<code>e:</code>, <code>f:</code> and <code>c:</code>).'
    ],
    'v3.669': [
        'You can now enable/disable lazy loading permanently in Files tab.',
        'Fixed filter not working with custom expressions.',
        'Fixed filter not working with custom sessions within Me tab.',
        'Added info pupup to filter with all available options.'
    ],
    'v3.649': [
        'Added experimental lazy loading that can be enabled by using the following url: <a href="https://sftools.mar21.eu/stats?lazy">https://sftools.mar21.eu/stats?lazy</a>'
    ],
    'v3.630': [
        'Fixed a bug that caused settings to be invisible / froze the tool.',
        'Added <code>const</code> keyword that allows you to set your own constants.',
        'Keyword <code>show as</code> can now also be used in Me tab.',
        'You can now separate stored data into different slots via url <code>https://sftools.mar21.eu/stats?slot=1</code>.<br/>The default slot number is 0 and it can be any positive number.<br/>Please note that they share settings and any changes will affect all other slots.'
    ],
    'v3.616': [
        '<code>Last Active</code> header no longer works as before.<br/>To use colors like before, you\'ll need to modify the header in <a href="res/update0.png">this way</a>.'
    ],
    'v3.610': [
        'Migrated <code>Album</code>, <code>Mount</code> and few other headers over to the new header system.',
        'Removed <code>percentage</code> option. <code>Mount</code> and <code>Album</code> are now always in percent. Use <code>Album Items</code> to get amount of items in the album.',
        'Added <code>decimal</code> option that decides whether statistics should be rounded or not.',
        'Added <code>clean hard</code> option that strips everything except expression from the header.',
        'Added <code>rgb</code>, <code>rgba</code> and <code>range</code> functions.',
        '<code>Last Active</code> now only shows last active time. For inactive duration use <code>Inactive Time</code>.',
        'Added several predefined enums.'
    ],
    'v3.606': [
        'Reworked dot object access.',
        'Some unary operators can now be stacked infinitely.'
    ],
    'v3.594': [
        'You can now use header names with <code>player</code> and <code>reference</code> objects as arguments.<br/>You can look at an example <a href="https://pastebin.com/raw/5MVYXF2n">here</a>.',
        'Option <code>clean</code> no longer requires you to disable invisibility.',
        'Fixed incorrect sorting on several headers.'
    ],
    'v3.589': [
        'Templates are now available also in temporary sessions.',
        'Added headers for item base attributes and pet bonus percentages.',
        'Added <code>round</code> and <code>fixed</code> functions for custom expressions.',
        'Fixed own raidable wood and stone.'
    ],
    'v3.575': [
        'Weapon damage and elemental damage runes are now shown properly for Assassins within the detail screen.',
        'Added headers for weapon damage and separated elemental damage headers.'
    ],
    'v3.559': [
        'Added <code>clean</code> keyword that forces header to ignore all shared options.<br/>You can look at an example <a href="https://pastebin.com/raw/WaFSAsRc">here</a>.'
    ],
    'v3.551': [
        'You are now required to use <code>player</code> object to access player data.<br/>You can look at an example <a href="https://pastebin.com/raw/mZmT0hh8">here</a>.'
    ],
    'v3.549': [
        'Added ability to sort columns by anything using <code>order by</code> keyword including <code>difference</code> variable to sort by difference.',
        'Added way to access compared object with <code>reference</code> variable.'
    ]
};
