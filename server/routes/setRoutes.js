const express=require('express');
const router=express.Router();
const {createSet,reorderSets,getSets,updateSet,deleteSet}=require('../controllers/setController');
const {protect,authorize}=require('../middleware/authMiddleware');

router.get('/',protect,getSets);
router.post('/',protect,authorize('admin'),createSet);
router.patch('/reorder',protect,authorize('admin'),reorderSets);
router.patch('/:id',protect,authorize('admin'),updateSet);
router.delete('/:id',protect,authorize('admin'),deleteSet);

module.exports=router;