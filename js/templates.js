const PredefinedTemplates = {
    'Default': `# Show member list
members on

# Global settings
statistics on # Show statistics below the table
difference on # Show difference

# Create new category
category General

# Create new header
header Level
difference off # Don't show difference for Level

header Album
percentage on # Show album as percentage
color above or equal 90 @green # Color all values above 90 with green
color above or equal 75 @orange
color default @red # Color values in red by default

header Mount
percentage on
color equal 4 @green
color above 0 @orange
color default @red

header Awards
hydra on # Show hydra
statistics off # Do not show statistics

category Potions
color equal 25 @green
color above 0 @orange
color default @red
visible off # Don't show numbers

category Guild

header Treasure
statistics off

header Instructor
statistics off

header Pet
color above or equal 335 @green
color above or equal 235 @orange
color default @red

header Knights
maximum on # Show fortress next to knights
color above or equal 17 @green
color above or equal 15 @orange
color default @red

category Fortress

header Fortress Honor`
};
