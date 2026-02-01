const express = require('express');
const path = require('path');

const router = express.Router();
const clientIndex = path.join(__dirname, '../../client/index.html');

router.get('/', (req, res) => {
  return res.sendFile(clientIndex);
});

router.get('/endpoint/:id', (req, res) => {
  return res.sendFile(clientIndex);
});

module.exports = router;
