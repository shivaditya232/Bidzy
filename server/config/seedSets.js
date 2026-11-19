const Set = require('../models/Set');

const DEFAULT_SETS = ['Marquee', 'Batsman Set 1', 'Allrounder Set 1', 'Bowler Set 1', 'Wicketkeeper Set 1'];

//every new room starts with the default sets. called from createRoom (used to run once at server start).
const seedDefaultSets = async (roomId) => {
    try {
        for (let i = 0; i < DEFAULT_SETS.length; i++) {
            const existing = await Set.findOne({ room: roomId, name: DEFAULT_SETS[i] });
            if (!existing) {
                const lastSet = await Set.findOne({ room: roomId }).sort({ sequence: -1 });
                const nextSequence = lastSet ? lastSet.sequence + 1 : 1;
                await Set.create({ room: roomId, name: DEFAULT_SETS[i], sequence: nextSequence });
            }
        }
    } catch (error) {
        console.error('Seeding default sets failed', error.message);
    }
};

module.exports = seedDefaultSets;
