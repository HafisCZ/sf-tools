var Enum = {
    Mount: {
        1: '10%',
        2: '20%',
        3: '30%',
        4: '50%'
    },

    Potion: {
        1: 'Strength',
        2: 'Dexterity',
        3: 'Intelligence',
        4: 'Constitution',
        5: 'Luck',
        6: 'Life'
    },

    Role: {
        1: 'Owner',
        2: 'Officer',
        3: 'Member',
        4: 'Invited'
    }
};

const Raids = [
    'The Wading Pool',
    'The 6 1/2 Seas',
    'The Shallows Of The Deep Sea',
    'Community Garden Colony',
    'The Preschool Of Horror',
    'Realm Of The Dark Dwarves',
    'The Glass Castle',
    'Downtown Brooklyn',
    'The Bat Cave',
    'The Gobbot Land',
    'Realm Of The Magic Lantern',
    'The East Pole',
    'Realm Of The Titans',
    'Absurdistan',
    'The Bone Castle',
    'Myths And Mysteries',
    'Ancawatri Dromedary',
    'Barbaria',
    'Extraterra IV',
    'Path To Hell',
    'Hellish Hell',
    'The Petting Zoo Of Death',
    'In The Dragon\'s Den',
    'Blackwater Moor',
    'Monster Kindergarten',
    'The Cabinet Of Horrors',
    'Wild Monster Party',
    'Cave Of The Graverobbers',
    'Crypt Of The Undead',
    'The Emperor\'s Fighting Guard',
    'The Topsy-Turvy World ',
    'Harbingers Of The Dead',
    'The Predators\' Feast',
    'Monkey Business',
    'The Booger Population',
    'Dodging The Blade',
    'In The Dark Of The Night',
    'Asocial Combustion Point',
    'The Old Cemetery',
    'Primodial Beasts',
    'The Black Magic Mountain',
    'Gragosh\'s Dread',
    'Ragorth The Bandit',
    'Slobba The Mudd',
    'Xanthippopothamia',
    'In The Vegetable Garden',
    'The Premature End',
    'Debugging',
    'Error In The System',
    'At The Big Boss\'s Place'
];

Raids.get = function (id) {
    return this[id % 50];
}
