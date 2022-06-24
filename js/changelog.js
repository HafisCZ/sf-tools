const CHANGELOG = {
    'v5.XXXX': {
        'Statistics': [
            'Marked headers as private (due to new BE)'
        ],
        'Dungeon Simulator': [
            'Added option to save image of Simulate All results',
            'Added class swap to cheat menu'
        ],
        'Fight Simulator': [
            'Added option to save image of fight results'
        ],
        'Pet Simulator': [
            'Reworked UI',
            'Fixed missing input for pets between 150 - 199',
            'Fixed position of New BE checkbox for small screens',
        ],
        'All Simulators': [
            'Reworked Bard simulation',
            'Fixed Druid damage reduction when having no mask'
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
