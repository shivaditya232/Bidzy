const express=require('express');
const router=express.Router();
const {createSet,reorderSets,getSets,updateSet,deleteSet}=require('../controllers/setController');
const {requireHost}=require('../middleware/roomMiddleware');

//mounted at /api/rooms/:roomId/sets
router.get('/',getSets);
router.post('/',requireHost,createSet);
router.patch('/reorder',requireHost,reorderSets);
router.patch('/:id',requireHost,updateSet);
router.delete('/:id',requireHost,deleteSet);

module.exports=router;
