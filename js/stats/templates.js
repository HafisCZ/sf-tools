const PredefinedTemplates = {
    'Me Default': `# Show member list
members

# Global settings
statistics on # Show statistics below the table
difference on # Show difference

# Create new category
category General

# Create new header
header Level
difference off # Don't show difference for Level

header Album
color above or equal 90 @green # Color all values above 90 with green
color above or equal 75 @orange
color default @red # Color values in red by default

header Mount
color equal 4 @green
color above 0 @orange
color default @red

header Awards
hydra on # Show hydra
statistics off # Do not show statistics

category

header Potions
color equal 25 @green
color above 0 @orange
color default @red

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

header Fortress Honor`,
    'Players Default': `# Created by Acclamator

server 70 # Set server column width to 70px
name @normal # Set name column width to normal
indexed static # Show static index column on left side


category General

header UP # This column indicates how recent the player information is
expr now() - Timestamp # Calculate how long ago was the player captured
width 40 # Set column width to 40 pixels
flip on # Treat lower values as better
color above @21days darkred # Color the cell in dark red if the value is above 21 days
color above @7days red
color above @3days darkorange
color above @1day orange
color above @12hours yellow
color default @green
value default @empty # Column has no values

header Class
width @small
value equal 1 W # Show W if the cell has value of 1
value equal 2 M
value equal 3 S
value equal 4 A
value equal 5 BM
value equal 6 B
value equal 7 DH
value equal 8 D
color equal 1 1874CD
color equal 2 darkorchid
color equal 3 lawngreen
color equal 4 red
color equal 5 violet
color equal 6 orange
color equal 7 eb605e
color equal 8 13d159

header Gear # This column indicates what gear has the player equipped
expr (Rune Gold + Rune XP >= 50 ? "Q" : "F") # Add gold and xp runes and decide whether gear is for quests or not
width @small
color equal Q lightblue
color equal F orange

header Level
width @small

header Awards
width @small
hydra on # Show hydra


category Base

header Base Sum
expr Base + Base Constitution # Calculate total basis for primary attribute and constitution

header Ratio
expr ceil(Base / Base Constitution * 10) / 10 # Calculate the ratio between primary basis and constitution basis
format this + ':1' # Add :1 to the ratio

header Base
alias Main # Rename header to Main
header Base Constitution
alias Con


category Total

header Total Sum
expr Attribute + Constitution

header Ratio
expr ceil(Attribute / Constitution * 10) / 10
format this + ':1'

header Attribute
alias Main
header Constitution
alias Con


category Fortress

header Gem Mine
width @small

header Treasury
width @small

header Raid
expr Raid Wood + Raid Stone
color above 150000000 green
color above 100000000 yellow
color above 50000000 orange
color above 10000000 darkorange
color default red


category Activity

header Status # This column indicates what the player is doing right now
alias ATM
width 30
color equal 0 @red
color equal 1 @orange
color equal 2 @green
value equal 0 I
value equal 1 W
value equal 2 Q

header Mount
color equal 4 @green
color equal 3 @orange
color equal 2  darkorange
color equal 1  darkorange
color default @red

header Inactive Time # This column indicated how long ago was the player active (referenced against capture date)
alias Last Active
format datetime(Last Active)
color above @21days darkred
color above @7days red
color above @3days darkorange
color above @1day orange
color above @12hours yellow
color default @green`,
    'Guilds Default': `# Created by Acclamator

# Show member list
name @normal

# Global settings
statistics on # Show statistics below the table
difference on # Show difference
brackets on
indexed static


category
header UP
statistics off
expr now()-Timestamp
width 40
flip on
color above @21days darkred
color above @7days red
color above @3days darkorange
color above @1day orange
color above @12hours yellow
color default @green
value default @empty
difference off


category General

header Class
width @small
value equal 1 W
value equal 2 M
value equal 3 S
value equal 4 A
value equal 5 BM
value equal 6 B
value equal 7 DH
value equal 8 D
color equal 1 1874CD
color equal 2 darkorchid
color equal 3 lawngreen
color equal 4 red
color equal 5 violet
color equal 6 orange
color equal 7 eb605e
color equal 8 13d159

header Rank
width @small

header Level
width @small

header Awards
width @small
hydra on # Show hydra

header Album
color above 90 green
color above 80 yellow
color above 70 orange
color above 60 darkorange
color above 50 red
color default darkred


category Bonuses

header Treasure
width @small
alias Gold
header Instructor
width @small
alias EXP
header Knights
width @small
difference off
header Pet
width @small


category Fights

header Gear
expr (Rune Gold + Rune XP >= 50 ? "Q" : "F")
width @small
color equal Q lightblue
color equal F orange
difference off
statistics off

header Attribute
alias Main
difference off
header Constitution
alias Con
difference off

header Portal


category Potion
difference off

header Attribute Size
alias M
statistics off
color equal 25 @green
color equal 15 yellow
color default @red
value default @empty
width 10

header Constitution Size
alias C
statistics off
color equal 25 @green
color equal 15 yellow
color default @red
value default @empty
width 10

header Life Potion
alias E
statistics off
color equal 1 @green
color equal 0 @red
value default @empty
width 10


category Activity
difference off

header Status
alias ATM
width 30
color equal 0 @red
color equal 1 @orange
color equal 2 @green
value equal 0 I
value equal 1 W
value equal 2 Q

header Mount
color equal 4 @green
color equal 3 @orange
color equal 2  orange
color equal 1  darkorange
color default @red

header Inactive Time
alias Last Active
format datetime(Last Active)
color above @21days darkred
color above @7days red
color above @3days darkorange
color above @1day orange
color above @12hours yellow
color default @green
`, 'Tracker': `# Example Tracker Configuration

# Saves the date when the character reached level 100
# track Level100 when Level >= 100

# Saves the level at which the character was when reaching tower 100
# track LevelAtTower100 as Level when Tower == 100`,
'Actions': `# Example - Tag every player above level 600 with tag Legend:
# tag player as 'Legend' if Level > 600
# Example - Tag file as Legendary if it includes your own character:
# tag file as 'Legendary' if some(players, Own)`
};
