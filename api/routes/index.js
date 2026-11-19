const router = require('express').Router();
const {
    userRoutes,
    speechToText
} = require('./child_routes')

router.use('/api', userRoutes);
router.use('/api', speechToText);


module.exports = router;