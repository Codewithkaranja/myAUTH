const express = require('express');
const authRoutes = require('./routes/auth');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
};
