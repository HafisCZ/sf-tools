const CHANGELOG = {
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
