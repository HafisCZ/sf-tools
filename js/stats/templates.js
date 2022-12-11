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
    'Players Default': `# Color scheme
const green d3e4cd
const orange ffd3b5
const red DF6A6A
const purple bfa2db
const yellow ffffc1
const blue b0deff
const air e1f2fb
const pink ffcfdf
const navy 6886C5
const darkgreen 889e81
const beige E2C2B9

background @air
font 95%
name 200

category

  header Class # Compact class header
  alias @empty
  width @tiny
  format this == @druid ? [ 'D', 'BD', 'CD' ][Mask] : (this == @bard ? [ 'RH', 'RG', 'RF' ][Instrument] : [ '', 'W', 'M', 'S', 'A', 'BM', 'B', 'DH' ][this])
  expc this == @druid ? dualcolor(50, [ @navy, @blue, @darkgreen ][Mask], @navy) : [ '', @blue, @green, @darkgreen, @yellow, @pink, @orange, @purple, @navy, @beige ][this]
  border right

  header Level
  expc gradient({ 0: @red, 100: @orange, 200: @yellow, 300: @green, 400: @pink, 500: @purple, 600: @blue, 700: @navy }, this)
  difference on
  width 100

  header Album
  # Adjustable album min & ok values
  const album_warning 0.75
  const album_ok 0.85
  expc gradient({ 0: @red, @album_warning: @orange, @album_ok: @yellow, 1: @green }, this / 100)
  expf fixed(this, 2) + ' %'
  width 100

  header Mount
  color equal @mount50 @green
  color equal @mount30 @yellow
  color equal @mount20 @orange
  color default @red

category Basis
  width 100

  header Base
  alias Main
  format fnumber

  header Base Constitution
  alias Con
  format fnumber

category Total
  width 100

  header Attribute
  alias Main
  format fnumber

  header Constitution
  alias Con
  format fnumber

category

  header Ratio
  expr trunc(100 * Attribute / (Attribute + Constitution))
  expf format('{0}/{1}', this, 100 - this)
  order by -max(0, abs(this - 55))

category Fortress

  header Gem Mine
  alias Mine
  width 80

  header Treasury
  width 80

  header Fortress Honor
  alias Honor
  format fnumber
  width 100

category Guild
  difference on

  not defined value @empty
  not defined color @air

  header Pet
  expc dualcolor(10, Hydra Dead ? @air: @blue, @air)
  width 80

  header Knights
  alias HOK
  width 80
  # Adjustable knights min & ok values
  const knights_warning 15
  const knights_ok 18
  expc gradient({ 0: @red, @knights_warning: @orange, @knights_ok: @yellow, 20: @green }, this)
  difference on

  header Last Active
  width 160
  difference off
  expr Last Active < 0 ? undefined : Inactive Time
  expf datetime(Last Active)
  order by Last Active < 0 ? undefined : -(Inactive Time)
  color above @21days @red
  color above @7days @beige
  color above @3days @orange
  color above @1day @yellow
  color above @12hours @green
  color default @blue`,
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
`,
  'Actions': `# Example - Tag every player above level 600 with tag Legend:
# tag player as 'Legend' if Level > 600

# Example - Tag file as Legendary if it includes your own character:
# tag file as 'Legendary' if some(players, Own)

# Example - Remove players from import that are not from Int 30:
# remove player if Prefix != 'W30 .NET'

# Tracker Example - Saves the date when the character reached level 100
# track Level100 when Level >= 100

# Tracker Example - Saves the level at which the character was when reaching tower 100
# track LevelAtTower100 as Level when Tower == 100`
};
