const Set = require('../models/Set');

const seedDefaultSets = async () => {
    try {
        const defaultSets = ['Marquee', 'Batsman Set 1', 'Allrounder Set 1', 'Bowler Set 1', 'Wicketkeeper Set 1'];

        for (let i = 0; i < defaultSets.length; i++) {
            const existing = await Set.findOne({ name: defaultSets[i] });
            if (!existing) {
                const lastSet = await Set.findOne().sort({ sequence: -1 });
                const nextSequence = lastSet ? lastSet.sequence + 1 : 1;
                await Set.create({ name: defaultSets[i], sequence: nextSequence });
                console.log(`Created default set: ${defaultSets[i]}`);
            }
        }
    } catch (error) {
        console.error('Seeding default sets failed', error.message);
    }
};

module.exports = seedDefaultSets;
